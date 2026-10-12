import Fastify from 'fastify';
import { context, trace, ROOT_CONTEXT, TraceFlags } from '@opentelemetry/api';
import { randomBytes } from 'node:crypto';
import { config } from './infrastructure/config.js';
import { createPool, PgSessionStore } from './infrastructure/db.js';
import { createKafka, KafkaInvoicePublisher, startConsumer } from './infrastructure/kafka.js';
import { StationTariffClient } from './infrastructure/station-client.js';
import { jwtGuard } from './infrastructure/auth.js';
import { otelBillingMetrics } from './infrastructure/metrics.js';
import { BillingHandler } from './application/billing-handler.js';

const app = Fastify({ logger: { level: 'info' } });

const pool = await createPool(config.databaseUrl);
const store = new PgSessionStore(pool);
const kafka = createKafka(config.kafkaBrokers);
const producer = kafka.producer({ idempotent: true, maxInFlightRequests: 1 });
await producer.connect();

const handler = new BillingHandler(
  store,
  new StationTariffClient(config.stationServiceUrl, config.oidc.tokenUri, config.oidc.clientId, config.oidc.clientSecret),
  new KafkaInvoicePublisher(producer),
  otelBillingMetrics,
);
const consumer = await startConsumer(kafka, handler, app.log);

// Relay do outbox simplificado: publica faturas que ficaram para trás
// Roda num contexto NÃO amostrado: o SELECT a cada 5 s não vira um trace novo no Tempo.
const quiet = () =>
  trace.setSpanContext(ROOT_CONTEXT, { traceId: randomBytes(16).toString('hex'), spanId: randomBytes(8).toString('hex'), traceFlags: TraceFlags.NONE });
const relay = setInterval(
  () => context.with(quiet(), () => handler.publishPendingInvoices().catch((err) => app.log.warn({ err }, 'relay falhou'))),
  5000,
);

const auth = jwtGuard({ jwksUri: config.oidc.jwksUri, issuer: config.oidc.issuer, audience: config.oidc.audience });

app.get('/health', async () => ({ status: 'UP' }));

app.get('/v1/invoices/me', { preHandler: auth('driver') }, async (req) => store.invoicesOf(req.principal!.sub));

app.get('/v1/invoices', { preHandler: auth('operator') }, async () => store.allInvoices());

app.get('/v1/reports/stations', { preHandler: auth('operator') }, async () => store.summary());

app.get<{ Params: { id: string } }>('/v1/sessions/:id', { preHandler: auth() }, async (req, reply) => {
  const s = await store.session(req.params.id);
  if (!s) return reply.code(404).send({ title: 'Sessão não encontrada' });
  if (!req.principal!.roles.includes('operator') && s.driver_id !== req.principal!.sub)
    return reply.code(403).send({ title: 'Sessão de outro motorista' });
  return s;
});

const shutdown = async () => {
  clearInterval(relay);
  await consumer.disconnect();
  await producer.disconnect();
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: config.port, host: '0.0.0.0' });
