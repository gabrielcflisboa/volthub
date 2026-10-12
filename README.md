# ⚡ VoltHub — rede de recarga de veículos elétricos

Trabalho final da disciplina **Arquitetura de Software Multiplataforma** (PUC Minas).

O VoltHub é uma plataforma para uma rede de eletropostos. O motorista encontra um carregador livre,
reserva, chega, libera a recarga pelo app e acompanha os kWh em tempo real. No fim, recebe a fatura.
Os carregadores são equipamentos IoT que falam **MQTT**. Os serviços conversam por **Kafka** e **REST**,
e o navegador recebe atualizações por **WebSocket**.

## Arquitetura

```mermaid
flowchart TB
    Browser(["🧑 Navegador (SPA)"])

    subgraph ID["🔐 Identidade"]
        Keycloak["Keycloak<br/>OAuth2 / OIDC"]
    end

    subgraph EDGE["Borda"]
        BFF["bff-web — Node/TS<br/>BFF · JWT · agregação<br/>Circuit Breaker · Retry · WebSocket"]
    end

    subgraph DOMAIN["Serviços de domínio"]
        Station["station-service — Java<br/>Hexagonal + CQRS"]
        Reservation["reservation-service — Java<br/>Clean Arch · DDD · Outbox · Saga"]
        Billing["billing-service — Node/TS<br/>Idempotent Consumer"]
    end

    subgraph IOT["IoT"]
        Gateway["iot-gateway — Java<br/>Anti-Corruption Layer + DLQ"]
        Mosquitto[["Mosquitto<br/>MQTT broker"]]
        Simulator["charger-simulator<br/>6 carregadores virtuais"]
    end

    Kafka{{"Apache Kafka<br/>charger.status · charger.commands<br/>charging.sessions · charging.meter<br/>reservations · invoices · telemetry.dlq"}}

    Postgres[("Postgres<br/>1 schema + 1 usuário por serviço")]

    Grafana["Grafana LGTM<br/>Tempo · Prometheus · Loki"]

    Browser -->|HTTPS / WebSocket| BFF
    Browser -.->|PKCE| Keycloak
    BFF -.->|JWKS| Keycloak
    Reservation -.->|client_credentials| Keycloak
    Billing -.->|client_credentials| Keycloak

    BFF -->|REST| Station
    BFF -->|REST| Reservation
    BFF -->|REST| Billing
    BFF -->|REST admin| Simulator

    Reservation -->|REST| Station
    Billing -->|REST| Station

    Station <-.->|eventos| Kafka
    Reservation <-.->|eventos| Kafka
    Billing <-.->|eventos| Kafka
    BFF <-.->|tempo real| Kafka
    Gateway <-.->|eventos| Kafka

    Gateway <-->|MQTT| Mosquitto
    Simulator <-->|MQTT| Mosquitto

    Station -->|JDBC| Postgres
    Reservation -->|JDBC| Postgres
    Billing -->|SQL| Postgres

    Station -.->|OTel| Grafana
    Reservation -.->|OTel| Grafana
    Billing -.->|OTel| Grafana
    BFF -.->|OTel| Grafana
    Gateway -.->|OTel| Grafana

    classDef java fill:#f4a460,stroke:#7a4a1f,color:#000;
    classDef node fill:#8ec9e8,stroke:#1f5a7a,color:#000;
    classDef infra fill:#d9d9d9,stroke:#555,color:#000;

    class Station,Reservation,Gateway java
    class BFF,Billing,Simulator node
    class Kafka,Mosquitto,Postgres,Keycloak,Grafana infra
```

Fluxo: o motorista encontra um carregador livre, reserva, chega, libera a recarga pelo app e acompanha
os kWh em tempo real; no fim, recebe a fatura. Linhas sólidas são chamadas síncronas (REST/JDBC),
linhas tracejadas são comunicação assíncrona/observabilidade (Kafka, OTel, OIDC) e as setas duplas em
`iot-gateway ↔ Mosquitto` são a ponte **MQTT**. Laranja = serviços Java, azul = serviços Node/TypeScript,
cinza = infraestrutura.

## Serviços

| Serviço | Stack | Porta | Responsabilidade | Patterns principais |
|---|---|---|---|---|
| `bff-web` | Node 22 / TypeScript / Fastify | 3000 | Porta única do app: JWT, agregação, tempo real, serve o SPA | BFF, Circuit Breaker, Retry, Timeout, degradação graciosa |
| `station-service` | Java 21 / Spring Boot | 8001 | Cadastro de estações e mapa de disponibilidade | Arquitetura Hexagonal, CQRS (read model por eventos) |
| `reservation-service` | Java 21 / Spring Boot | 8002 | Reservas e ciclo da recarga | Clean Architecture, DDD tático, Transactional Outbox, Saga coreografada, Idempotent Consumer |
| `iot-gateway` | Java 21 / Spring Boot | 8003 | Ponte MQTT ↔ Kafka | Protocol Gateway, Anti-Corruption Layer, Dead Letter Queue |
| `billing-service` | Node 22 / TypeScript | 8004 | Faturamento das sessões | Idempotent Consumer, Outbox simplificado, OAuth2 Client Credentials |
| `charger-simulator` | Node 22 / TypeScript | 8005 | 6 carregadores virtuais (MQTT) | Last Will and Testament, QoS 1, mensagens retidas |

Infraestrutura: Kafka 3.9 (KRaft) + Kafka UI, Mosquitto 2, Keycloak 26, Postgres 16, Grafana LGTM (OpenTelemetry Collector, Tempo, Prometheus, Loki).

### `bff-web` — porta de entrada do app

Único serviço que o navegador enxerga. Fica em [`services/bff-web/src`](services/bff-web/src):

- `main.ts` — bootstrap do Fastify e registro das rotas `/api/v1/*`.
- `auth.ts` — valida o JWT (JWKS do Keycloak) em toda requisição; o PKCE em si é feito "na unha" em `public/app.js`, sem biblioteca.
- `downstream.ts` — chamadas REST para `station-service`, `reservation-service`, `billing-service` e `charger-simulator`, cada uma com **Circuit Breaker + Retry + Timeout** próprios; o estado dos circuitos é exposto em `/api/v1/resilience`.
- `realtime.ts` — consome os tópicos Kafka e empurra atualizações para o navegador por **WebSocket** (padrão Observer), alimentando o dashboard em tempo real sem polling.
- `public/` — o SPA (HTML/CSS/JS puro) servido estaticamente pelo próprio serviço.

Quando um downstream cai, o circuito abre e o BFF responde com dado parcial (`degraded: true`) em vez de propagar o erro — é a degradação graciosa demonstrada em `demo-resiliencia.sh`.

### `station-service` — estações e disponibilidade (Hexagonal + CQRS)

Java 21/Spring Boot em [`services/station-service/src/main/java/com/volthub/station`](services/station-service/src/main/java/com/volthub/station):

- `adapter/in/web` — `StationController` (API REST) e `ApiExceptionHandler`.
- `adapter/in/messaging` — consumidor Kafka que escuta `charger.status` e atualiza o read model.
- `adapter/out/persistence` — repositórios JPA (porta de saída implementada).
- `application/port/{in,out}` — as portas da arquitetura hexagonal (casos de uso de um lado, infraestrutura do outro).
- `application/service` — implementação dos casos de uso.
- `domain` — modelo de estação/carregador, sem dependência de framework.

O **CQRS** aparece na tabela `charger_availability`: um read model mantido só por eventos de status (lado da escrita é o cadastro de estações), o que permite ao mapa responder rápido mesmo sob rajada de telemetria.

### `reservation-service` — reservas e ciclo da recarga (Clean Architecture + DDD)

Java 21/Spring Boot em [`services/reservation-service/src/main/java/com/volthub/reservation`](services/reservation-service/src/main/java/com/volthub/reservation):

- `domain/model` — agregado `Reservation` e Value Objects táticos: `HoldPeriod`, `Energy`, `DriverId`, `ChargerRef`, `CancelReason`.
- `domain/event` e `domain/service` — eventos de domínio e políticas (ex.: `BookingPolicy`).
- `application/usecase` — `ReservationCommands`/`ReservationQueries` (CQRS de aplicação), `ExpireReservations` (job que expira holds vencidos) e `ChargingSagaHandler`, que reage a `charger.status = FAULTED` **cancelando a reserva e enviando o comando de liberação** — a saga coreografada de compensação.
- `infrastructure/messaging` — `OutboxMessageFactory` + `OutboxRelay` (Transactional Outbox: o evento é gravado na mesma transação da reserva e publicado depois, sem perder mensagens) e `IntegrationEventsListener` (Idempotent Consumer dos eventos de telemetria/sessão).
- `infrastructure/{config,http,persistence,web}` — Resilience4j, clientes REST, JPA e controllers.

### `iot-gateway` — ponte MQTT ↔ Kafka

Java 21/Spring Boot em [`services/iot-gateway/src/main/java/com/volthub/gateway`](services/iot-gateway/src/main/java/com/volthub/gateway):

- `mqtt/MqttBridge` — assina os tópicos MQTT dos carregadores e publica comandos recebidos do Kafka de volta para eles.
- `kafka/ChargerCommandListener` — consome `charger.commands` e traduz para mensagens MQTT.
- `telemetry/TelemetryTranslator` — **Anti-Corruption Layer**: converte o payload "cru" do carregador no evento de domínio Kafka; payloads inválidos vão para `telemetry.dlq` em vez de derrubar o pipeline (ver `demo-dlq.sh`).

### `billing-service` — faturamento das sessões

Node 22/TS em [`services/billing-service/src`](services/billing-service/src):

- `domain/billing.ts` — regra pura de cálculo (kWh × tarifa), sem dependências de infraestrutura.
- `application/billing-handler.ts` + `ports.ts` — orquestra o caso de uso a partir dos eventos recebidos.
- `infrastructure/{kafka,db,station-client,auth,config,metrics}.ts` — consumidor idempotente de `charging.sessions`/`charging.meter`, busca a tarifa no `station-service` autenticando via **OAuth2 Client Credentials**, persiste a fatura e publica o evento `invoices` (outbox simplificado).

### `charger-simulator` — carregadores virtuais

Node 22/TS em [`simulator/src/main.ts`](simulator/src/main.ts): simula 6 carregadores publicando telemetria por MQTT com **QoS 1**, mensagens retidas (o status mais recente fica disponível a quem assina depois) e **Last Will and Testament** (anuncia `OFFLINE` automaticamente se a conexão cair). Expõe uma API HTTP simples (`/chargers`, `/chargers/:id/garbage` para telemetria corrompida, além dos endpoints de fault/repair usados pelas demos).

## Como subir

**Pré-requisitos:** Docker Desktop com **8 GB de RAM** disponíveis para os containers.

- **Windows com backend WSL2 (recomendado):** a RAM é definida em `%UserProfile%\.wslconfig`
  (`[wsl2]` e na linha seguinte `memory=8GB`; depois `wsl --shutdown`). Rode os comandos no terminal do
  **Ubuntu (WSL2)**, com a pasta copiada para dentro do Linux (ex.: `~/volthub`).
- **Windows com backend Hyper-V:** a RAM é definida em Settings → Resources. Rode os scripts no
  **Git Bash**; os scripts de demo precisam de `python3` instalado.
- **Linux/macOS:** basta o Docker com 8 GB.

```bash
chmod +x start.sh stop.sh scripts/*.sh
./start.sh          # 1ª vez: 5 a 10 min (baixa imagens e compila os serviços)
```

| O quê | Endereço | Login |
|---|---|---|
| **App VoltHub** | http://localhost:3000 | `motorista@volthub.com` / `motorista123` · `operador@volthub.com` / `operador123` |
| Grafana (dashboard "VoltHub") | http://localhost:3001 | acesso anônimo |
| Kafka UI | http://localhost:8090 | — |
| Keycloak | http://localhost:8081 | `admin` / `admin` |
| Swagger (OpenAPI) | http://localhost:8001/swagger-ui.html · http://localhost:8002/swagger-ui.html | — |
| API do simulador | http://localhost:8005/chargers | — |

Parar: `./stop.sh` (mantém dados) ou `./stop.sh --limpar` (apaga tudo).

## Roteiro da demonstração

| # | O que mostrar | Como |
|---|---|---|
| 1 | Login com PKCE, 401 e 403 | `./scripts/demo-seguranca.sh` e login no app |
| 2 | Saga completa: reserva → recarga ao vivo → fatura | No app (motorista) ou `./scripts/demo-fluxo-completo.sh` |
| 3 | Compensação: carregador quebra com reserva ativa | App do operador → "Simular falha", ou `./scripts/demo-compensacao.sh` |
| 4 | DLQ: telemetria corrompida não trava o fluxo | `./scripts/demo-dlq.sh` |
| 5 | Circuit breaker abrindo e fechando | `./scripts/demo-resiliencia.sh` |
| 6 | Trace atravessando HTTP → Outbox → Kafka → MQTT | Grafana → Explore → Tempo |
| 7 | Kubernetes: self-healing | `k8s/README.md` |

Todos os scripts estão em [`scripts/`](scripts) e usam a API do `bff-web` (`http://localhost:3000`) autenticada
com um token real do Keycloak — nada é mockado. São idempotentes o suficiente para rodar de novo caso algo falhe.

| Script | O que faz |
|---|---|
| `token.sh [email] [senha]` | Obtém um `access_token` via Direct Access Grant (usuário/senha). É usado pelos outros scripts para montar o header `Authorization`; **só serve para automação de laboratório** — o app web de verdade usa Authorization Code + PKCE. |
| `demo-fluxo-completo.sh [chargerId]` | Reserva um carregador livre, confirma que o mapa mostra `RESERVED`, inicia a recarga, espera a sessão aparecer como `IN_PROGRESS` no dashboard (confirmação chegando por MQTT → Kafka → WebSocket) e, ao final, imprime a fatura gerada (kWh × tarifa × valor). |
| `demo-compensacao.sh [chargerId]` | Reserva um carregador e, em seguida, simula uma falha nele (`POST /admin/chargers/:id/fault`). Mostra a reserva sendo **cancelada automaticamente** com motivo `CHARGER_FAULT` e o comando de liberação sendo enviado — a saga coreografada de compensação — e depois repara o carregador. |
| `demo-dlq.sh` | Envia telemetria corrompida de um carregador (`POST /chargers/BH-PUC-01/garbage`) e lê as últimas mensagens do tópico `volthub.telemetry.dlq` no Kafka, provando que o `iot-gateway` isola a mensagem inválida sem travar o restante do fluxo. |
| `demo-resiliencia.sh` | Derruba o `billing-service` (`docker compose stop`), faz várias chamadas ao dashboard mostrando o circuito do BFF abrindo e a resposta continuando a funcionar em modo degradado, religa o serviço e acompanha o circuito fechar sozinho (`HALF_OPEN → CLOSED`). |
| `demo-seguranca.sh` | Encadeia chamadas sem token (401), com token adulterado (401), com papel errado (403) e com papel correto (200); ao final, imprime os claims do JWT e obtém um token M2M via `client_credentials` para mostrar a diferença entre papel de usuário e papel de serviço. |
| `gerar-trafego.sh [minutos]` | Gera carga realista em background por N minutos (padrão 10): dois motoristas reservando/carregando em loop, consultas ao mapa e, periodicamente, uma telemetria inválida e uma falha de carregador — útil para povoar o Grafana com traces e métricas antes de uma demonstração ao vivo. |

A validação de contratos (`validar-asyncapi.mjs`) não é uma demo interativa: roda dentro do CI (ver abaixo) para
garantir que `docs/asyncapi.yaml` continua um AsyncAPI válido a cada push.

## Onde está cada conceito da disciplina

| Aula | Conceito | Onde no código |
|---|---|---|
| 1 | C4 (contexto, container, componente) | `docs/c4/` e slides |
| 1 | Contratos | `docs/asyncapi.yaml` (eventos) · OpenAPI gerado do código: http://localhost:8001/swagger-ui.html e :8002 |
| 2 | OAuth2/OIDC, JWT, roles, 401/403 | `infra/keycloak/volthub-realm.json`, `bff-web/src/auth.ts`, `*/SecurityConfig.java` |
| 2 | Clean Architecture | `reservation-service/.../{domain,application,infrastructure}` |
| 2 | DDD: Aggregate, VO, Domain Event, Domain Service, Repository | `reservation-service/.../domain/` (`Reservation`, `HoldPeriod`, `BookingPolicy`…) |
| 2 | Database per Service | `infra/postgres/init.sql` (schema + usuário por serviço) |
| 3 | CQRS | `station-service` (`charger_availability` = read model) e Commands/Queries no `reservation-service` |
| 3 | Kafka: tópicos, partições, chaves, consumer groups | `infra/kafka/create-topics.sh`, listeners de cada serviço |
| 3 | Observer | Kafka consumer groups; WebSocket no `bff-web/src/realtime.ts` |
| 3 | PKCE | `bff-web/public/app.js` (feito "na unha", sem biblioteca) |
| 3 | Hexagonal | `station-service/.../{application/port,adapter}` |
| 4 | OpenTelemetry, Grafana, Tempo, Prometheus, Loki | `docker-compose.yml` (lgtm), `infra/grafana/`, `TraceContext.java`, `telemetry.ts` |
| 4 | Docker multi-stage, Kubernetes | `services/*/Dockerfile`, `k8s/` |
| 4 | CI/CD | `.github/workflows/ci.yml` |
| 5 | BFF, Circuit Breaker, Retry, Timeout | `bff-web/src/downstream.ts`, Resilience4j em `reservation-service` |
| 5 | Versionamento de API | prefixo `/v1` em todos os serviços |
| 5 | AsyncAPI | `docs/asyncapi.yaml` |
| extra | IoT/MQTT, Saga, Outbox, DLQ, Idempotência | `iot-gateway`, `OutboxRelay.java`, `ChargingSagaHandler.java` |

Decisões de arquitetura registradas em `docs/adr/`.

## Testes

```bash
# Java (domínio puro, sem Spring nem banco)
cd services/reservation-service && mvn test
cd services/station-service && mvn test
cd services/iot-gateway && mvn test
# Node
cd services/billing-service && npm ci && npm test
cd services/bff-web && npm ci && npm test   # retry, circuit breaker
```

## CI/CD

O pipeline [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda no GitHub Actions a cada `push` em `main`
e a cada Pull Request, com quatro jobs independentes (os três primeiros rodam em paralelo):

| Job | Estratégia | O que faz |
|---|---|---|
| `java` | matrix `[station-service, reservation-service, iot-gateway]`, `fail-fast: false` | Para cada serviço, configura JDK 21 (Temurin) com cache do Maven e roda `mvn verify` — os mesmos testes de domínio que rodam localmente, sem subir Spring, banco ou Kafka. |
| `node` | matrix `[billing-service, bff-web, simulator]` | Configura Node 22 com cache do npm, roda `npm ci` + `npm run build` (type-check) em todos, e `npm test` só em `billing-service`/`bff-web` (o `simulator` só precisa compilar). |
| `contracts` | — | Instala o `@asyncapi/parser` e roda `validar-asyncapi.mjs` contra `docs/asyncapi.yaml` (falha o build se houver erro de schema); baixa o `kubeconform` e valida todos os manifests em `k8s/*.yaml` contra o schema oficial do Kubernetes. |
| `images` | depende de `java` + `node` | Só roda se os testes passarem; builda **todas** as imagens Docker (multi-stage) com `docker compose build`, garantindo que os `Dockerfile` de cada serviço continuam funcionando. A publicação no GHCR está comentada no arquivo, pronta para habilitar quando o repositório for para produção. |

`fail-fast: false` nas matrizes garante que a falha de um serviço não cancela os testes dos demais — útil para ver,
num único run, todos os serviços que quebraram. Cada matriz usa cache de dependências (Maven/npm) por serviço,
chaveado no respectivo `pom.xml`/`package-lock.json`, para acelerar runs subsequentes.

## Estrutura

```
volthub/
├── docker-compose.yml        ← sobe tudo
├── start.sh / stop.sh
├── infra/                    ← Keycloak (realm), Postgres, Kafka (tópicos), Mosquitto, Grafana
├── services/
│   ├── station-service/      ← Java · hexagonal + CQRS
│   ├── reservation-service/  ← Java · Clean + DDD + Outbox + Saga
│   ├── iot-gateway/          ← Java · MQTT ↔ Kafka
│   ├── billing-service/      ← Node/TS · faturamento
│   └── bff-web/              ← Node/TS · BFF + SPA (public/)
├── simulator/                ← Node/TS · carregadores MQTT
├── k8s/                      ← manifests Kubernetes
├── docs/                     ← AsyncAPI, ADRs, diagramas C4
├── scripts/                  ← demos, geração de tráfego, token de auth e validação de contratos
└── .github/workflows/        ← CI (Java, Node, contratos, imagens Docker)
```
