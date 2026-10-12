#!/usr/bin/env bash
# Demo — Compensação da saga: o carregador quebra com uma reserva confirmada.
# Esperado: reserva CANCELADA (motivo CHARGER_FAULT), comando RELEASE enviado, carregador FAULTED no mapa.
set -euo pipefail
cd "$(dirname "$0")/.."
BFF=http://localhost:3000
T=$(./scripts/token.sh motorista@volthub.com motorista123)
O=$(./scripts/token.sh operador@volthub.com operador123)
H=(-H "Authorization: Bearer $T" -H 'content-type: application/json')
j() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }
CHARGER=${1:-$(curl -sf $BFF/api/v1/stations "${H[@]}" | j "next(c['chargerId'] for s in d for c in s['chargers'] if c['status']=='AVAILABLE')")}

echo "▶ 1. Motorista reserva $CHARGER"
RES=$(curl -s -X POST $BFF/api/v1/reservations "${H[@]}" -d "{\"chargerId\":\"$CHARGER\"}")
RID=$(echo "$RES" | j "d.get('id') or ''")
[[ -n "$RID" ]] || { echo "   reserva recusada: $RES"; exit 1; }
echo "   reserva $RID"
sleep 2
echo "▶ 2. O carregador apresenta defeito (MQTT status=FAULTED)"
curl -sf -X POST $BFF/api/v1/admin/chargers/$CHARGER/fault -H "Authorization: Bearer $O" > /dev/null
until curl -sf $BFF/api/v1/dashboard "${H[@]}" | grep -q '"activeReservation":null'; do sleep 1; done
curl -sf $BFF/api/v1/dashboard "${H[@]}" | j "'   reserva: %s (motivo %s)' % next((r['status'], r['cancelReason']) for r in d['recentReservations'] if r['id']=='$RID')"
curl -sf $BFF/api/v1/stations "${H[@]}" | j "'   carregador no mapa: ' + [c['status'] for s in d for c in s['chargers'] if c['chargerId']=='$CHARGER'][0]"
echo "▶ 3. Reparando o carregador"
curl -sf -X POST $BFF/api/v1/admin/chargers/$CHARGER/repair -H "Authorization: Bearer $O" > /dev/null
sleep 2
curl -sf $BFF/api/v1/stations "${H[@]}" | j "'   carregador no mapa: ' + [c['status'] for s in d for c in s['chargers'] if c['chargerId']=='$CHARGER'][0]"
