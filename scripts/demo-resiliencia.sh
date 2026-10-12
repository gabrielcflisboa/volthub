#!/usr/bin/env bash
# Demo — Circuit Breaker no BFF: derruba o billing-service e observa o circuito abrir,
# a tela continuar abrindo (degradação graciosa) e o circuito fechar sozinho quando o serviço volta.
set -euo pipefail
cd "$(dirname "$0")/.."
BFF=http://localhost:3000
T=$(./scripts/token.sh motorista@volthub.com motorista123)
state() { curl -s $BFF/api/v1/resilience | python3 -c "import json,sys; print(next(r['state'] for r in json.load(sys.stdin) if r['service']=='billing-service'))"; }
dash() { curl -s -o /tmp/dash.json -w "%{http_code} em %{time_total}s" $BFF/api/v1/dashboard -H "Authorization: Bearer $T"; }

echo "▶ Circuito do billing-service: $(state)"
echo "▶ Derrubando o billing-service (docker compose stop)"
docker compose stop billing-service > /dev/null 2>&1
for i in 1 2 3 4 5 6 7; do
  echo "   dashboard #$i → $(dash) · degradado: $(python3 -c "import json; print(json.load(open('/tmp/dash.json'))['degraded'])") · circuito: $(state)"
done
echo "▶ Religando o billing-service"
docker compose start billing-service > /dev/null 2>&1
echo "   (o circuito fica ABERTO por 15 s e depois testa de novo — HALF_OPEN → CLOSED)"
sleep 20
until curl -sf http://localhost:8004/health > /dev/null; do sleep 2; done
for i in 1 2; do echo "   dashboard → $(dash) · circuito: $(state)"; sleep 1; done
