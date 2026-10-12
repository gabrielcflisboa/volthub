# VoltHub no Kubernetes

O `docker-compose.yml` é o ambiente da demonstração completa. Esta pasta mostra o **mesmo container**
do `station-service` rodando num cluster Kubernetes, para demonstrar o que o Compose não faz:
self-healing, rolling update sem downtime, escala horizontal e separação de configuração e segredo.

| Arquivo | O que tem |
|---|---|
| `00-namespace.yaml` | Namespace `volthub` |
| `10-postgres.yaml` | Secret, ConfigMap com o script de init, StatefulSet com volume persistente, Service |
| `20-station-service.yaml` | ConfigMap, Deployment com 2 réplicas e probes, Service, HPA (2–5 réplicas, CPU 70%), PodDisruptionBudget |
| `deploy.sh` | Build da imagem, carga no minikube ou kind e `kubectl apply` |

Kafka e Keycloak ficam fora do cluster nesta demo. O serviço sobe sem eles: o consumidor Kafka
fica tentando reconectar e o JWKS só é buscado na primeira requisição autenticada.

## Subir

```bash
minikube start          # ou: tenha o kind instalado (o script cria o cluster "volthub")
./k8s/deploy.sh
```

## Roteiro de demonstração (≈ 1 min)

```bash
# 1. Duas réplicas prontas
kubectl -n volthub get pods -l app=station-service

# 2. Self-healing: mata um pod e o Deployment recria outro sozinho
kubectl -n volthub delete $(kubectl -n volthub get pod -l app=station-service -o name | head -1) --wait=false
kubectl -n volthub get pods -l app=station-service -w     # Ctrl+C quando voltar a 2/2

# 3. Escala manual (o HPA faz isso sozinho pela CPU)
kubectl -n volthub scale deployment/station-service --replicas=3

# 4. Rolling update sem downtime (maxUnavailable: 0)
kubectl -n volthub rollout restart deployment/station-service
kubectl -n volthub rollout status deployment/station-service

# 5. Acessar o serviço
kubectl -n volthub port-forward svc/station-service 8001:80
curl localhost:8001/actuator/health
```

## Pontos para explicar na apresentação

- **startupProbe** dá tempo para a JVM subir sem que o liveness mate o pod antes da hora.
- **livenessProbe** falhou → o kubelet reinicia o container. **readinessProbe** falhou → o pod sai do Service, mas não é reiniciado.
- **Secret** guarda a senha; **ConfigMap** guarda o resto. A imagem é a mesma em todos os ambientes.
- **requests/limits** permitem ao scheduler alocar o pod e ao HPA calcular a utilização.
- **PodDisruptionBudget** garante 1 réplica no ar durante manutenção do nó.

Limpar: `kubectl delete namespace volthub` (e `kind delete cluster --name volthub`, se usou kind).
