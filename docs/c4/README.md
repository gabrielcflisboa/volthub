# Diagramas C4

O modelo completo está em [`workspace.dsl`](workspace.dsl) (Structurizr). As versões abaixo usam
Mermaid e aparecem desenhadas direto no GitHub. Nos slides, os mesmos diagramas estão feitos com
formas editáveis.

## Nível 1 — Contexto

```mermaid
flowchart LR
    M([Motorista]):::person --> V
    O([Operador]):::person --> V
    V[VoltHub<br/><small>reservas, recarga, faturas</small>]:::system
    V -- "OAuth2 / OIDC" --> K[Keycloak]:::ext
    C[Carregadores IoT]:::ext -- "MQTT" --> V
    V -- "comandos MQTT" --> C
    classDef person fill:#0b7a44,color:#fff,stroke:#0b7a44
    classDef system fill:#0f9d58,color:#fff,stroke:#0f9d58
    classDef ext fill:#8a96a8,color:#fff,stroke:#8a96a8
```

## Nível 2 — Containers

```mermaid
flowchart LR
    SPA[App Web SPA<br/><small>JS · PKCE</small>] -- "HTTPS + WS<br/>Bearer JWT" --> BFF[bff-web<br/><small>Node/TS</small>]
    BFF -- REST --> ST[station-service<br/><small>Java · Hexagonal + CQRS</small>]
    BFF -- REST --> RS[reservation-service<br/><small>Java · DDD + Outbox + Saga</small>]
    BFF -- REST --> BL[billing-service<br/><small>Node/TS</small>]
    RS -- "REST M2M" --> ST
    BL -- "REST M2M" --> ST
    RS -- "fatos e comandos" --> KF[(Kafka)]
    KF --> ST
    KF --> BL
    KF --> BFF
    GW[iot-gateway<br/><small>Java · ACL + DLQ</small>] <--> KF
    GW <-- "MQTT QoS 1" --> MQ[(Mosquitto)]
    CH[Carregadores] <-- MQTT --> MQ
    ST & RS & BL --> DB[(Postgres<br/><small>schema por serviço</small>)]
    SPA -. login PKCE .-> KC[Keycloak]
```

## Nível 3 — Componentes do reservation-service

```mermaid
flowchart LR
    API[ReservationController] --> UC[Casos de uso<br/><small>Commands · Queries · SagaHandler</small>]
    UC --> DOM[Domínio<br/><small>Reservation · VOs · Domain Events · BookingPolicy</small>]
    UC --> REPO[JpaReservationRepository]
    UC --> CAT[StationCatalogClient<br/><small>Circuit Breaker + Retry</small>]
    REPO --> DB[(reservation.reservations<br/>reservation.outbox)]
    RELAY[OutboxRelay] --> DB
    RELAY --> KF[(Kafka)]
    KF --> LIS[IntegrationEventsListener<br/><small>idempotente</small>] --> UC
    CAT --> ST[station-service]
```

A dependência sempre aponta para dentro: o domínio não conhece Spring, JPA nem Kafka.
