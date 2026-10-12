# ADR 0002 — MQTT na borda (carregadores), Kafka no núcleo (serviços)

**Status:** aceita

## Contexto
Carregadores ficam em estacionamentos com rede 4G instável e hardware limitado. Os serviços precisam de
durabilidade, replay e vários consumidores independentes para o mesmo evento.

## Decisão
- Carregadores falam **MQTT** (QoS 1, mensagens retidas para status, *Last Will* para avisar queda).
- Serviços falam **Kafka** (tópicos particionados por `chargerId`, consumer groups, retenção).
- O **iot-gateway** é a ponte nos dois sentidos e funciona como *Anti-Corruption Layer*: valida o payload
  do dispositivo, traduz para o evento de integração e manda o que for inválido para a **DLQ**.

## Alternativas descartadas
- *Carregador publicando direto no Kafka*: cliente Kafka é pesado para firmware e exige conexão estável.
- *Só MQTT para tudo*: sem replay, sem consumer groups, difícil reprocessar faturamento.

## Consequências
Mais um componente para operar (o gateway), mas o formato do hardware nunca vaza para os serviços.
