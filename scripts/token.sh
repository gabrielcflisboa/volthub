#!/usr/bin/env bash
# Obtém um access_token para scripts de demo (Direct Access Grant).
# ATENÇÃO: password grant é só para automação de laboratório. O app web usa Authorization Code + PKCE.
# uso: TOKEN=$(./scripts/token.sh motorista@volthub.com motorista123)
set -euo pipefail
USER=${1:-motorista@volthub.com}
PASS=${2:-motorista123}
curl -s -X POST "http://localhost:8081/realms/volthub/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=volthub-web -d "username=$USER" -d "password=$PASS" -d scope=openid \
  | sed -E 's/.*"access_token":"([^"]+)".*/\1/'
