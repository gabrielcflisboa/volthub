/*
 * Modelo C4 do VoltHub (Structurizr DSL).
 * Visualizar: colar o conteúdo em https://playground.structurizr.com
 */
workspace "VoltHub" "Plataforma de recarga de veículos elétricos" {

    model {
        motorista = person "Motorista" "Encontra carregador livre, reserva, recarrega e paga."
        operador = person "Operador da rede" "Acompanha a rede, receita e falhas dos carregadores."
        carregador = softwareSystem "Carregador (eletroposto)" "Equipamento IoT na rua. Fala MQTT." "Externo"
        keycloak = softwareSystem "Keycloak" "Identity Provider (OAuth2/OIDC)." "Externo"

        volthub = softwareSystem "VoltHub" "Reservas, recarga, faturamento e monitoramento da rede." {
            spa = container "App Web (SPA)" "Telas do motorista e do operador." "JavaScript, navegador" "Browser"
            bff = container "bff-web" "Porta única do app: valida JWT, agrega, tempo real via WebSocket." "Node 22 / TypeScript / Fastify"
            station = container "station-service" "Cadastro de estações e mapa de disponibilidade (read model)." "Java 21 / Spring Boot · Hexagonal + CQRS"
            reservation = container "reservation-service" "Reservas e ciclo da recarga." "Java 21 / Spring Boot · Clean + DDD + Outbox + Saga" {
                reservationApi = component "ReservationController" "API REST /v1/reservations" "Spring MVC"
                reservationApp = component "Casos de uso" "ReservationCommands, ReservationQueries, ChargingSagaHandler, ExpireReservations" "Java puro"
                reservationDomain = component "Domínio" "Aggregate Reservation, VOs, Domain Events, BookingPolicy" "Java puro"
                reservationRepo = component "JpaReservationRepository" "Implementa a porta ReservationRepository" "JPA"
                outbox = component "OutboxRelay" "Lê a tabela outbox e publica no Kafka" "Spring Kafka"
                listener = component "IntegrationEventsListener" "Consome status e sessões (idempotente)" "Spring Kafka"
                catalog = component "StationCatalogClient" "Consulta o station-service (M2M, Circuit Breaker, Retry)" "RestClient + Resilience4j"
            }
            billing = container "billing-service" "Mede energia e emite faturas." "Node 22 / TypeScript"
            gateway = container "iot-gateway" "Traduz MQTT ↔ Kafka (Anti-Corruption Layer, DLQ)." "Java 21 / Spring Boot"
            kafka = container "Apache Kafka" "Barramento de eventos entre serviços." "Kafka 3.9 (KRaft)" "Fila"
            mosquitto = container "Mosquitto" "Broker MQTT dos carregadores." "MQTT 3.1.1/5" "Fila"
            db = container "PostgreSQL" "Um schema e um usuário por serviço." "Postgres 16" "Banco"
            otel = container "Observabilidade" "Coleta traces, métricas e logs." "OpenTelemetry + Grafana (Tempo, Prometheus, Loki)"
        }

        motorista -> spa "Usa"
        operador -> spa "Usa"
        spa -> keycloak "Login (Authorization Code + PKCE)"
        spa -> bff "HTTPS/JSON e WebSocket" "Bearer JWT"
        bff -> station "REST" "JWT do usuário"
        bff -> reservation "REST" "JWT do usuário"
        bff -> billing "REST" "JWT do usuário"
        bff -> kafka "Consome eventos para o tempo real"
        reservation -> station "Consulta carregador e tarifa" "REST + client_credentials"
        billing -> station "Consulta tarifa" "REST + client_credentials"
        reservation -> kafka "Publica fatos e comandos (Outbox)"
        station -> kafka "Consome status e reservas"
        billing -> kafka "Consome medições, publica faturas"
        gateway -> kafka "Publica telemetria, consome comandos"
        gateway -> mosquitto "Assina telemetria, publica comandos" "MQTT QoS 1"
        carregador -> mosquitto "Status, sessão, medidor" "MQTT QoS 1 + Last Will"
        station -> db "JDBC"
        reservation -> db "JPA"
        billing -> db "pg"
        bff -> keycloak "Valida JWT (JWKS)"
        station -> keycloak "Valida JWT (JWKS)"
        reservation -> keycloak "Valida JWT e obtém token M2M"
        billing -> keycloak "Obtém token M2M"
        bff -> otel "OTLP"
        station -> otel "OTLP"
        reservation -> otel "OTLP"
        billing -> otel "OTLP"
        gateway -> otel "OTLP"

        bff -> reservationApi "REST"
        reservationApi -> reservationApp "Chama"
        reservationApp -> reservationDomain "Orquestra"
        reservationApp -> reservationRepo "Porta de saída"
        reservationApp -> catalog "Porta de saída ChargerCatalog"
        reservationRepo -> db "Salva reserva + outbox na mesma transação"
        outbox -> db "SELECT … FOR UPDATE SKIP LOCKED"
        outbox -> kafka "Publica"
        kafka -> listener "Entrega eventos"
        listener -> reservationApp "ChargingSagaHandler"
        catalog -> station "GET /v1/chargers/{id}"
    }

    views {
        systemContext volthub "Contexto" {
            include *
            autoLayout lr
        }
        container volthub "Containers" {
            include *
            exclude "* -> otel"
            autoLayout lr
        }
        component reservation "Componentes-reservation" {
            include *
            autoLayout lr
        }
        styles {
            element "Person" {
                shape Person
                background #0b7a44
                color #ffffff
            }
            element "Software System" {
                background #0f9d58
                color #ffffff
            }
            element "Externo" {
                background #8a96a8
                color #ffffff
            }
            element "Container" {
                background #2ec27e
                color #ffffff
            }
            element "Browser" {
                shape WebBrowser
            }
            element "Fila" {
                shape Pipe
            }
            element "Banco" {
                shape Cylinder
            }
            element "Component" {
                background #b9ecd2
                color #17202a
            }
        }
    }
}
