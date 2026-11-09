#!/usr/bin/env bash
# Sobe o VoltHub inteiro (infra + serviços) e espera o app responder.
set -euo pipefail
cd "$(dirname "$0")"

echo "▶ Compilando e subindo os containers (a 1ª vez demora: baixa imagens e compila Java/Node)..."
docker compose up -d --build

echo "▶ Aguardando o app em http://localhost:3000 ..."
for i in $(seq 1 120); do
  if curl -fs http://localhost:3000/health >/dev/null 2>&1; then break; fi
  sleep 3
done

echo "▶ Aguardando os serviços de backend..."
for port in 8001 8002 8003; do
  for i in $(seq 1 60); do
    curl -fs "http://localhost:$port/actuator/health" >/dev/null 2>&1 && break
    sleep 3
  done
done

docker compose ps --format 'table {{.Name}}\t{{.Status}}'
cat <<'TXT'

✅ VoltHub no ar
   App ............ http://localhost:3000   (motorista@volthub.com / motorista123 · operador@volthub.com / operador123)
   Grafana ........ http://localhost:3001/d/volthub
   Kafka UI ....... http://localhost:8090
   Keycloak ....... http://localhost:8081   (admin / admin)
   Swagger ........ http://localhost:8001/swagger-ui.html · http://localhost:8002/swagger-ui.html

   Demos: ls scripts/   ·   Parar: ./stop.sh   ·   Zerar dados: ./stop.sh --limpar
TXT
