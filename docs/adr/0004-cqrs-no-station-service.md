# ADR 0004 — CQRS no station-service

**Status:** aceita

## Contexto
A tela mais acessada é o mapa de disponibilidade. Ela combina dados de três origens: cadastro (estação,
potência, preço), status físico (MQTT) e reservas ativas (reservation-service).

## Decisão
- **Modelo de escrita** normalizado (`stations`, `chargers`), alterado só pelo operador.
- **Modelo de leitura** desnormalizado (`charger_availability`), atualizado por eventos Kafka.
  A consulta não faz JOIN e não chama outros serviços.
- Status efetivo = status físico tem prioridade (FAULTED/OFFLINE/CHARGING); senão RESERVED se houver reserva.

## Consequências
Leitura O(1) e independente da disponibilidade do `reservation-service`. Eventos fora de ordem são
tratados com `last_status_at` (o mais antigo é descartado).
