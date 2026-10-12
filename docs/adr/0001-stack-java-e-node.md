# ADR 0001 — Duas stacks: Java (Spring Boot) e Node.js (TypeScript)

**Status:** aceita

## Contexto
O sistema precisa ser multiplataforma. O time tem fluência em Java e em TypeScript, e o prazo é curto.
Adicionar uma terceira linguagem (Go, Python) aumentaria o custo de manutenção sem resolver nenhuma dor real.

## Decisão
- **Java 21 + Spring Boot** onde há regra de negócio rica e transação: `reservation-service` (DDD, Outbox),
  `station-service` (hexagonal + CQRS) e `iot-gateway` (Paho MQTT + Kafka, alto volume de mensagens).
- **Node.js 22 + TypeScript** onde o trabalho é I/O e borda: `bff-web` (agregação, WebSocket),
  `billing-service` (consumidor de eventos) e o simulador de carregadores.

## Consequências
- O "multi" da plataforma está em três eixos: **linguagem/runtime** (JVM e V8), **protocolo**
  (MQTT, Kafka, REST, WebSocket) e **ambiente de execução** (dispositivo IoT, containers, navegador).
- Os serviços só compartilham **contratos** (OpenAPI e AsyncAPI), nunca código: não existe biblioteca comum.
- Observabilidade precisa funcionar igual nas duas stacks → OpenTelemetry (agente Java e SDK Node).
