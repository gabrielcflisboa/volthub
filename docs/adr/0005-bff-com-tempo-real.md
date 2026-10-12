# ADR 0005 — BFF único para o app web, com WebSocket

**Status:** aceita

## Contexto
Sem BFF, o navegador teria que conhecer quatro serviços, quatro URLs, e repassar o token para cada um.

## Decisão
O `bff-web` é a única porta de entrada do app:
- valida o JWT (assinatura via JWKS, `iss`, `exp`, `aud=bff-web`) e devolve 401/403;
- **agrega** estações + reserva ativa + faturas numa chamada (`/api/v1/dashboard`), com degradação
  graciosa se um serviço cair;
- protege cada serviço com **timeout, retry só em GET e circuit breaker**;
- empurra eventos em **tempo real** via WebSocket (cada réplica com consumer group próprio).

## Quando não valeria a pena
Se o app falasse com um único serviço ou se as respostas já viessem no formato da tela, o BFF seria só
um proxy a mais na rede.
