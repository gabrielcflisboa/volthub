#!/bin/bash
# Cria os tópicos do VoltHub (auto-create está desligado de propósito:
# tópico é contrato, e contrato não nasce por acidente).
set -e
BS=kafka:9092
K=/opt/kafka/bin/kafka-topics.sh
for t in \
  volthub.charger.status:3 \
  volthub.charger.commands:3 \
  volthub.charging.sessions:3 \
  volthub.charging.meter:3 \
  volthub.reservations:3 \
  volthub.invoices:3 \
  volthub.telemetry.dlq:1
do
  name=${t%%:*}; parts=${t##*:}
  $K --bootstrap-server $BS --create --if-not-exists --topic "$name" --partitions "$parts" --replication-factor 1
done
$K --bootstrap-server $BS --list
