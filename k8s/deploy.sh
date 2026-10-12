#!/usr/bin/env bash
# Publica o station-service + Postgres num cluster local (minikube ou kind).
# uso: ./k8s/deploy.sh            (detecta minikube; senão usa kind com cluster "volthub")
set -euo pipefail
cd "$(dirname "$0")/.."
IMAGE=volthub/station-service:1.0.0

echo "▶ Build da imagem $IMAGE"
docker build -t "$IMAGE" services/station-service

if command -v minikube >/dev/null && minikube status >/dev/null 2>&1; then
  echo "▶ Carregando imagem no minikube"
  minikube image load "$IMAGE"
else
  command -v kind >/dev/null || { echo "Instale minikube ou kind"; exit 1; }
  kind get clusters | grep -qx volthub || kind create cluster --name volthub
  echo "▶ Carregando imagem no kind"
  kind load docker-image "$IMAGE" --name volthub
fi

kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/10-postgres.yaml -f k8s/20-station-service.yaml
kubectl -n volthub rollout status statefulset/postgres --timeout=180s
kubectl -n volthub rollout status deployment/station-service --timeout=300s
kubectl -n volthub get pods -o wide
