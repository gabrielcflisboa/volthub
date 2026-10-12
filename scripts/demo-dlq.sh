#!/usr/bin/env bash
# Demo — Dead Letter Queue: um carregador manda telemetria corrompida.
# Esperado: o iot-gateway rejeita, publica em volthub.telemetry.dlq e o resto do fluxo segue normal.
set -euo pipefail
cd "$(dirname "$0")/.."
echo "▶ Enviando payload inválido pelo carregador BH-PUC-01"
curl -s -X POST http://localhost:8005/chargers/BH-PUC-01/garbage; echo
sleep 2
echo "▶ Últimas mensagens na DLQ:"
docker compose exec -T kafka /opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic volthub.telemetry.dlq --from-beginning --timeout-ms 4000 2>/dev/null | tail -3
echo "▶ Também visível no Kafka UI: http://localhost:8090 → Topics → volthub.telemetry.dlq"
