#!/usr/bin/env bash
# Demo — Segurança: 401 (sem token / token adulterado), 403 (papel errado), 200 (ok) e token M2M.
set -euo pipefail
cd "$(dirname "$0")/.."
BFF=http://localhost:3000
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "▶ Sem token                         → $(code $BFF/api/v1/stations)   (esperado 401)"
T=$(./scripts/token.sh motorista@volthub.com motorista123)
FAKE="${T%.*}.assinatura-falsa"
echo "▶ Token com assinatura adulterada   → $(code $BFF/api/v1/stations -H "Authorization: Bearer $FAKE")   (esperado 401)"
echo "▶ Motorista lista estações          → $(code $BFF/api/v1/stations -H "Authorization: Bearer $T")   (esperado 200)"
echo "▶ Motorista tenta área do operador  → $(code $BFF/api/v1/admin/overview -H "Authorization: Bearer $T")   (esperado 403)"
O=$(./scripts/token.sh operador@volthub.com operador123)
echo "▶ Operador na área do operador      → $(code $BFF/api/v1/admin/overview -H "Authorization: Bearer $O")   (esperado 200)"

echo
echo "▶ Claims do token do motorista (payload do JWT, Base64URL):"
P=$(echo "$T" | cut -d. -f2 | tr '_-' '/+'); while [ $(( ${#P} % 4 )) -ne 0 ]; do P="$P="; done
echo "$P" | base64 -d 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps({k: d[k] for k in ['iss','aud','sub','azp','exp','realm_access'] if k in d}, indent=2))"

echo
echo "▶ Token M2M (client_credentials) do billing-service — sem usuário, papel 'service':"
M=$(curl -s -X POST http://localhost:8081/realms/volthub/protocol/openid-connect/token \
  -d grant_type=client_credentials -d client_id=billing-service -d client_secret=billing-service-secret \
  | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
echo "   station-service /tariff com token M2M → $(code http://localhost:8001/v1/stations/volthub-savassi/tariff -H "Authorization: Bearer $M")   (esperado 200)"
echo "   station-service /tariff com token do motorista → $(code http://localhost:8001/v1/stations/volthub-savassi/tariff -H "Authorization: Bearer $T")   (esperado 403)"
