#!/usr/bin/env bash
# Para o VoltHub. Com --limpar, apaga também os volumes (banco, Kafka, Grafana).
set -euo pipefail
cd "$(dirname "$0")"
if [[ "${1:-}" == "--limpar" ]]; then
  docker compose down -v --remove-orphans
  echo "🧹 Containers e dados removidos."
else
  docker compose down --remove-orphans
  echo "⏹  Containers parados (dados mantidos)."
fi
