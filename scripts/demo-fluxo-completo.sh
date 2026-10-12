#!/usr/bin/env bash
# Demo 1 — Saga completa: reserva → comando ao carregador (Kafka→MQTT) → recarga → fatura.
set -euo pipefail
cd "$(dirname "$0")/.."
BFF=http://localhost:3000
T=$(./scripts/token.sh motorista2@volthub.com motorista123)
H=(-H "Authorization: Bearer $T" -H 'content-type: application/json')
j() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
# Sem argumento, usa o primeiro carregador livre
CHARGER=${1:-$(curl -sf $BFF/api/v1/stations "${H[@]}" | j "next(c['chargerId'] for s in d for c in s['chargers'] if c['status']=='AVAILABLE')")}

echo "▶ 1. Reservando $CHARGER"
RES=$(curl -s -X POST $BFF/api/v1/reservations "${H[@]}" -d "{\"chargerId\":\"$CHARGER\"}")
RID=$(echo "$RES" | j "d.get('id') or ''")
[[ -n "$RID" ]] || { echo "   reserva recusada: $RES"; exit 1; }
echo "   reserva $RID confirmada"
sleep 2
echo "▶ 2. Status do carregador no read model (deve estar RESERVED)"
curl -sf $BFF/api/v1/stations "${H[@]}" | j "[c['status'] for s in d for c in s['chargers'] if c['chargerId']=='$CHARGER'][0]"

echo "▶ 3. Motorista chegou: iniciando recarga"
curl -sf -X POST $BFF/api/v1/reservations/$RID/start "${H[@]}" > /dev/null
until curl -sf $BFF/api/v1/dashboard "${H[@]}" | grep -q '"status":"IN_PROGRESS"'; do sleep 1; done
SID=$(curl -sf $BFF/api/v1/dashboard "${H[@]}" | j "d['activeReservation']['sessionId']")
echo "   sessão $SID em andamento (o carregador confirmou via MQTT)"

echo "▶ 4. Aguardando o fim da sessão e a fatura…"
until curl -sf $BFF/api/v1/dashboard "${H[@]}" | grep -q "\"sessionId\":\"$SID\",\"driverId\""; do sleep 3; done
curl -sf $BFF/api/v1/dashboard "${H[@]}" | j "'   fatura: %s kWh x R\$ %s = R\$ %s' % next((i['energyKwh'], i['pricePerKwh'], i['amount']) for i in d['invoices'] if i['sessionId']=='$SID')"
echo "✔ Fluxo completo. Veja o trace no Grafana: http://localhost:3001 (Explore → Tempo)"
