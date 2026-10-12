import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface Principal {
  sub: string;
  roles: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}

/** Resource server: valida assinatura (JWKS do Keycloak), emissor, validade e audience do JWT. */
export function jwtGuard(opts: { jwksUri: string; issuer: string; audience: string }) {
  const jwks = createRemoteJWKSet(new URL(opts.jwksUri));
  return (requiredRole?: string) => async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return reply.code(401).send({ title: 'Token ausente' });
    let payload: JWTPayload & { realm_access?: { roles?: string[] } };
    try {
      ({ payload } = await jwtVerify(header.slice(7), jwks, { issuer: opts.issuer, audience: opts.audience }));
    } catch {
      return reply.code(401).send({ title: 'Token inválido ou expirado' });
    }
    const roles = payload.realm_access?.roles ?? [];
    if (requiredRole && !roles.includes(requiredRole)) return reply.code(403).send({ title: `Requer o papel ${requiredRole}` });
    req.principal = { sub: String(payload.sub), roles };
  };
}
