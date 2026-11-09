#!/usr/bin/env bash
# VoltHub — modo dev. Um comando pra tudo.
#
#   ./scripts/dev.sh up            → sobe o core (8 containers) e mostra o status
#   ./scripts/dev.sh logs          → logs ao vivo do core (prefixo do serviço)
#   ./scripts/dev.sh logs bff-web → logs ao vivo de um serviço
#   ./scripts/dev.sh watch         → terminal 2: rebuild do Java quando você salva
#   ./scripts/dev.sh full          → sobe TUDO (Grafana, Kafka UI, simulador, IoT)
#   ./scripts/dev.sh down          → derruba tudo
set -euo pipefail
cd "$(dirname "$0")/.."
DC=(docker compose -f docker-compose.yml -f docker-compose.dev.yml)
CORE=(bff-web station-service reservation-service billing-service keycloak postgres kafka)

cmd="${1:-up}"; shift || true
case "$cmd" in
  up)
    "${DC[@]}" up -d "$@"
    echo; echo "▶ Console (Ctrl+C sai, o stack continua):"; echo
    "${DC[@]}" logs -f --tail=5 "${CORE[@]}"
    ;;
  logs)   "${DC[@]}" logs -f --tail=50 "$@" ;;
  watch)  "${DC[@]}" watch ;;
  full)   "${DC[@]}" --profile full up -d "$@" ;;
  ps)     "${DC[@]}" ps ;;
  down)   "${DC[@]}" down ;;
  *) echo "uso: $0 {up|logs|watch|full|ps|down} [serviços...]"; exit 1 ;;
esac
