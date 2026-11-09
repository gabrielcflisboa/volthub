#!/usr/bin/env bash
# Gera tráfego realista por N minutos (padrão 10): dois motoristas reservando e carregando,
# consultas ao mapa e, de vez em quando, uma falha de carregador e uma telemetria inválida.
# Uso: ./scripts/gerar-trafego.sh [minutos]
set -uo pipefail
cd "$(dirname "$0")/.."
BFF=http://localhost:3000
END=$(( $(date +%s) + ${1:-10} * 60 ))
O=$(./scripts/token.sh operador@volthub.com operador123)

driver_loop() {
  local user=$1
  while [ "$(date +%s)" -lt "$END" ]; do
    local T; T=$(./scripts/token.sh "$user" motorista123)
    local H=(-H "Authorization: Bearer $T" -H 'content-type: application/json')
    local free; free=$(curl -s $BFF/api/v1/stations "${H[@]}" | python3 -c "
import json,sys,random
c=[c['chargerId'] for s in json.load(sys.stdin) for c in s['chargers'] if c['status']=='AVAILABLE']
print(random.choice(c) if c else '')" 2>/dev/null)
    if [ -n "$free" ]; then
      local rid; rid=$(curl -s -X POST $BFF/api/v1/reservations "${H[@]}" -d "{\"chargerId\":\"$free\"}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))" 2>/dev/null)
      if [ -n "$rid" ]; then
        echo "[$user] reservou $free"
        sleep $(( RANDOM % 5 + 2 ))
        curl -s -X POST $BFF/api/v1/reservations/$rid/start "${H[@]}" > /dev/null
        for _ in $(seq 1 25); do curl -s $BFF/api/v1/dashboard "${H[@]}" > /dev/null; sleep 2; done
      fi
    fi
    sleep 3
  done
}

chaos_loop() {
  while [ "$(date +%s)" -lt "$END" ]; do
    sleep 75
    curl -s -X POST http://localhost:8005/chargers/BH-PUC-01/garbage > /dev/null && echo "[caos] telemetria inválida → DLQ"
    curl -s -X POST $BFF/api/v1/admin/chargers/BH-PAM-02/fault -H "Authorization: Bearer $O" > /dev/null && echo "[caos] BH-PAM-02 com falha"
    sleep 20
    curl -s -X POST $BFF/api/v1/admin/chargers/BH-PAM-02/repair -H "Authorization: Bearer $O" > /dev/null && echo "[caos] BH-PAM-02 reparado"
  done
}

driver_loop motorista@volthub.com &
driver_loop motorista2@volthub.com &
chaos_loop &
wait
