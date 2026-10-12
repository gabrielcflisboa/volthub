import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { FastifyReply, FastifyRequest } from 'fastify';

export interface Principal {
  sub: string;
  name: string;
  roles: string[];
  token: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    principal?: Principal;
  }
}

/**
 * O BFF é a porta de entrada: valida o JWT ANTES de qualquer chamada interna.
 * 401 = sem token / token inválido; 403 = token válido sem o papel exigido.
 */
export function createAuth(opts: { jwksUri: string; issuer: string; audience: string }) {
  const jwks = createRemoteJWKSet(new URL(opts.jwksUri));

  async function verify(token: string): Promise<Principal> {
    const { payload } = await jwtVerify(token, jwks, { issuer: opts.issuer, audience: opts.audience });
    const p = payload as typeof payload & { realm_access?: { roles?: string[] }; name?: string; email?: string };
    return { sub: String(p.sub), name: p.name ?? p.email ?? 'usuário', roles: p.realm_access?.roles ?? [], token };
  }

  const guard = (role?: string) => async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return reply.code(401).send({ title: 'Token ausente' });
    try {
      req.principal = await verify(header.slice(7));
    } catch {
      return reply.code(401).send({ title: 'Token inválido ou expirado' });
    }
    if (role && !req.principal.roles.includes(role)) return reply.code(403).send({ title: `Requer o papel ${role}` });
  };

  return { verify, guard };
}
