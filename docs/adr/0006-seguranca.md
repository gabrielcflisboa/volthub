# ADR 0006 — Segurança: Keycloak, PKCE, JWT no BFF e M2M entre serviços

**Status:** aceita

## Decisão
| Quem | Fluxo OAuth2 | Por quê |
|---|---|---|
| App web (SPA) | Authorization Code **+ PKCE (S256)**, client público sem secret | O código do navegador é público; PKCE torna inútil um `code` interceptado |
| BFF | Resource server: valida JWT (JWKS, `iss`, `exp`, `aud=bff-web`) | Nenhuma chamada interna acontece com token inválido |
| Serviços de domínio | Revalidam o mesmo token (defesa em profundidade) e aplicam papéis | `driver`, `operator`, `service` |
| billing → station, reservation → station | **Client Credentials** (M2M), `aud=station-service`, papel `service` | Chamada de máquina não usa token de usuário |
| Carregadores | MQTT anônimo **só no laboratório** | Em produção: TLS + certificado por carregador + ACL por tópico |

- 401 = token ausente/inválido/expirado; 403 = token válido sem o papel exigido.
- Secrets dos clients confidenciais vêm de variável de ambiente (no Kubernetes, `Secret`), nunca do código.
- Banco: um usuário por schema; nenhum serviço consegue ler o schema do outro.

## Compliance (LGPD)
- Dados pessoais ficam só no Keycloak (nome, e-mail). Os serviços guardam apenas o `sub` (id opaco).
- Faturas guardam `driverId`, energia e valor: o mínimo para cobrança (princípio da necessidade).
- Logs não registram token nem e-mail.

## Antipadrões evitados
Password grant no app (só nos scripts de laboratório), token sem expiração (15 min), secret no front-end.
