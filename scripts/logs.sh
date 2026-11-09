#!/usr/bin/env bash
# Logs ao vivo do VoltHub (stack de dev).
#   ./scripts/logs.sh                    → core do BFF, seguindo
#   ./scripts/logs.sh bff-web            → um serviço só
#   ./scripts/logs.sh --tail reservation-service
#   ./scripts/logs.sh --grep error       → filtra
set -euo pipefail
cd "$(dirname "$0")/.."
DC=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)
CORE=(bff-web reservation-service station-service billing-service iot-gateway charger-simulator keycloak)
tail=20; follow=1; grep_pat=""; services=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tail) tail="$2"; shift 2 ;;
    --no-follow) follow=0; shift ;;
    --grep) grep_pat="$2"; shift 2 ;;
    *) services+=("$1"); shift ;;
  esac
done
[[ ${#services[@]} -eq 0 ]] && services=("${CORE[@]}")
args=(--tail="$tail"); [[ $follow -eq 1 ]] && args+=(-f)
if [[ -n "$grep_pat" ]]; then
  "${DC[@]}" logs "${args[@]}" "${services[@]}" | grep --line-buffered -iE "$grep_pat"
else
  "${DC[@]}" logs "${args[@]}" "${services[@]}"
fi
