import Fastify, { type FastifyReply } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { createAuth } from './auth.js';
import { Downstream, ServiceUnavailableError, UpstreamError } from './downstream.js';
import { RealtimeHub } from './realtime.js';

const app = Fastify({ logger: { level: 'info' } });
const here = dirname(fileURLToPath(import.meta.url));

const stations = new Downstream('station-service', config.services.station);
const reservations = new Downstream('reservation-service', config.services.reservation);
console. log('stations baseUrl= ', config.services.station);
const billing = new Downstream('billing-service', config.services.billing);
const simulator = new Downstream('charger-simulator', config.services.simulator);
const downstreams = [stations, reservations, billing];

const { verify, guard, optionalGuard } = createAuth(config.oidc);
const hub = new RealtimeHub(app.log);

// POST sem corpo (ex.: /start) é válido mesmo com content-type JSON
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  try {
    done(null, body ? JSON.parse(body as string) : {});
  } catch (err) {
    (err as { statusCode?: number }).statusCode = 400;
    done(err as Error, undefined);
  }
});

await app.register(fastifyCors, { origin: true, credentials: true });
await app.register(fastifyWebsocket);
await app.register(fastifyStatic, { root: join(here, '..', 'public') });

/** Traduz falhas de serviços internos para respostas HTTP coerentes para o app. */
function relay(reply: FastifyReply, err: unknown) {
  if (err instanceof UpstreamError) return reply.code(err.status).send(err.body);
  if (err instanceof ServiceUnavailableError) return reply.code(503).send({ title: err.message });
  throw err;
}

// ───────── Config pública do SPA (o front não tem nada "hardcoded") ─────────
app.get('/config.json', async () => ({
  keycloakUrl: config.oidc.publicUrl,
  realm: config.oidc.realm,
  clientId: config.oidc.clientId,
}));

app.get('/health', async () => ({ status: 'UP', websocketClients: hub.connected }));

app.get('/api/v1/resilience', async () => downstreams.map((d) => d.state()));

// ───────── Autenticação (Mobile / SPA Direct Grants) ─────────
app.post<{ Body: { email?: string; password?: string } }>('/api/v1/auth/login', async (req, reply) => {
  const email = req.body?.email ?? 'motorista@volthub.com';
  const password = req.body?.password ?? 'motorista123';
  try {
    const tokenRes = await fetch(config.oidc.tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'password',
        client_id: config.oidc.clientId,
        username: email,
        password,
        scope: 'openid',
      }),
    });
    const data = (await tokenRes.json()) as Record<string, unknown>;
    if (!tokenRes.ok) {
      return reply.code(tokenRes.status).send(data);
    }
    const principal = await verify(data.access_token as string);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      user: {
        sub: principal.sub,
        name: principal.name,
        roles: principal.roles,
      },
    };
  } catch (err) {
    req.log.error(err, 'Falha ao autenticar via Keycloak');
    return reply.code(502).send({ title: 'Serviço de autenticação indisponível' });
  }
});

// ───────── Catálogo de Estações (Acesso Público ou com Token Opcional) ─────────
app.get<{ Querystring: Record<string, string | undefined> }>('/api/v1/stations', { preHandler: optionalGuard() }, async (req, reply) => {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== '') params.set(k, v);
    }
    const qs = params.toString();
    const path = qs ? `/v1/stations?${qs}` : '/v1/stations';
    return await stations.call({ path, token: req.principal?.token });
  } catch (err) {
    return relay(reply, err);
  }
});

app.get<{ Params: { id: string } }>('/api/v1/stations/:id', { preHandler: optionalGuard() }, async (req, reply) => {
  try {
    console.log('req.params.id= ', req.params.id);
    return await stations.call({ path: `/v1/stations/${encodeURIComponent(req.params.id)}`, token: req.principal?.token });
  } catch (err) {
    console.log('Error fetching station: ', err);
    return relay(reply, err);
  }
});

// ───────── Motorista ─────────

/**
 * Agregação: UMA chamada do app → TRÊS serviços em paralelo, numa resposta pensada para a tela.
 * Degradação graciosa: se um serviço cair, a tela ainda abre com o que deu certo.
 */
app.get('/api/v1/dashboard', { preHandler: guard('driver') }, async (req) => {
  const token = req.principal!.token;
  const [st, rs, inv] = await Promise.allSettled([
    stations.call<unknown[]>({ path: '/v1/stations', token }),
    reservations.call<{ status: string }[]>({ path: '/v1/reservations/me', token }),
    billing.call<unknown[]>({ path: '/v1/invoices/me', token }),
  ]);
  const value = <T>(r: PromiseSettledResult<T>, fallback: T) => (r.status === 'fulfilled' ? r.value : fallback);
  const myReservations = value(rs, []);
  return {
    user: { name: req.principal!.name, roles: req.principal!.roles },
    stations: value(st, []),
    activeReservation: myReservations.find((r) => r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') ?? null,
    recentReservations: myReservations.slice(0, 5),
    invoices: value(inv, []),
    degraded: [
      ...(st.status === 'rejected' ? ['station-service'] : []),
      ...(rs.status === 'rejected' ? ['reservation-service'] : []),
      ...(inv.status === 'rejected' ? ['billing-service'] : []),
    ],
  };
});

app.post<{ Body: { chargerId: string } }>('/api/v1/reservations', { preHandler: guard('driver') }, async (req, reply) => {
  try {
    console.log("req principal= ", req.principal);
    console.log("req body= ", req.body);
    const r = await reservations.call({ method: 'POST', path: '/v1/reservations', token: req.principal!.token, body: { chargerId: req.body?.chargerId } });
    return reply.code(201).send(r);
  } catch (err) {
    console.log(err);
    return relay(reply, err);
  }
});

for (const action of ['start', 'cancel'] as const) {
  app.post<{ Params: { id: string } }>(`/api/v1/reservations/:id/${action}`, { preHandler: guard('driver') }, async (req, reply) => {
    try {
      return await reservations.call({ method: 'POST', path: `/v1/reservations/${encodeURIComponent(req.params.id)}/${action}`, token: req.principal!.token });
    } catch (err) {
      return relay(reply, err);
    }
  });
}

// ───────── Operador ─────────
app.get('/api/v1/admin/overview', { preHandler: guard('operator') }, async (req) => {
  const token = req.principal!.token;
  const [st, inv, rep] = await Promise.allSettled([
    stations.call<unknown[]>({ path: '/v1/stations', token }),
    billing.call<unknown[]>({ path: '/v1/invoices', token }),
    billing.call<unknown[]>({ path: '/v1/reports/stations', token }),
  ]);
  return {
    stations: st.status === 'fulfilled' ? st.value : [],
    invoices: inv.status === 'fulfilled' ? inv.value : [],
    report: rep.status === 'fulfilled' ? rep.value : [],
    resilience: downstreams.map((d) => d.state()),
    degraded: [st, inv, rep].some((r) => r.status === 'rejected'),
  };
});

/** Demonstração da compensação da saga: o operador "quebra" e "conserta" um carregador simulado. */
app.post<{ Params: { id: string; action: 'fault' | 'repair' } }>('/api/v1/admin/chargers/:id/:action', { preHandler: guard('operator') }, async (req, reply) => {
  if (!['fault', 'repair'].includes(req.params.action)) return reply.code(404).send();
  try {
    return await simulator.call({ method: 'POST', path: `/chargers/${encodeURIComponent(req.params.id)}/${req.params.action}` });
  } catch (err) {
    return relay(reply, err);
  }
});

// ───────── Tempo real ─────────
app.get('/ws', { websocket: true }, (socket, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('access_token') ?? '';
  verify(token)
    .then((p) => hub.add(socket, p.sub, p.roles))
    .catch(() => socket.close(4401, 'token inválido'));
});

const consumer = await hub.start(config.kafkaBrokers);

const shutdown = async () => {
  await consumer.disconnect();
  await app.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: config.port, host: '0.0.0.0' });
