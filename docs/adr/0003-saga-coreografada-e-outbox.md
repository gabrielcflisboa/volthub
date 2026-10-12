# ADR 0003 — Saga coreografada + Transactional Outbox para a recarga

**Status:** aceita

## Contexto
Uma recarga atravessa quatro serviços (reserva → carregador → sessão → fatura). Não existe transação
distribuída: cada serviço tem seu próprio banco (Database per Service).

## Decisão
- **Saga coreografada**: cada serviço reage a eventos e publica os seus; não há orquestrador central.
  Compensação: carregador com falha antes do início → reserva cancelada e carregador liberado.
- **Transactional Outbox** no `reservation-service`: o evento é gravado na mesma transação do agregado e
  publicado por um *relay*. Elimina o "salvou no banco mas não publicou no Kafka" (dual write).
  O `billing-service` usa uma versão simplificada (fatura com `published_at`).
- **Consumidor idempotente** em todos os serviços: tabela `processed_events` com o `eventId`.

## Alternativas descartadas
- *Saga orquestrada*: com 4 passos e 1 compensação, um orquestrador adicionaria acoplamento sem ganho.
- *Two-phase commit*: não suportado entre Postgres e Kafka, e bloqueia recursos.

## Consequências
Consistência eventual: por ~1 s o mapa pode mostrar um carregador "livre" que acabou de ser reservado.
A invariante real ("uma reserva ativa por carregador") é garantida pelo índice único parcial do banco.
