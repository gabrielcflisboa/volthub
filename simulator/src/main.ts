import mqtt, { type MqttClient } from 'mqtt';
import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';

/**
 * Simulador dos carregadores físicos. Cada carregador é um CLIENTE MQTT independente, como seria
 * um equipamento de verdade em campo:
 *  - publica status (retained) e, ao cair, o broker publica OFFLINE por ele (Last Will and Testament);
 *  - recebe comandos em volthub/chargers/{id}/commands (RESERVE, START, RELEASE);
 *  - durante a recarga publica o medidor (kWh acumulado) a cada 2 s.
 */
const MQTT_URL = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
const SESSION_SECONDS = Number(process.env.SESSION_SECONDS ?? 40);
const SPEEDUP = Number(process.env.SPEEDUP ?? 60); // 1 s simulado = 1 min de recarga
const TICK_MS = 2000;

type Physical = 'AVAILABLE' | 'CHARGING' | 'FAULTED' | 'OFFLINE';

interface Charger {
  id: string;
  powerKw: number;
  status: Physical;
  reservationId: string | null;
  driverId: string | null;
  session: { id: string; energyKwh: number; startedAt: number; timer: NodeJS.Timeout } | null;
  client?: MqttClient;
}

const chargers: Charger[] = [
  ['BH-SAV-01', 60], ['BH-SAV-02', 22], ['BH-PAM-01', 120], ['BH-PAM-02', 22], ['BH-PUC-01', 11], ['BH-PUC-02', 50],
].map(([id, powerKw]) => ({ id: String(id), powerKw: Number(powerKw), status: 'AVAILABLE', reservationId: null, driverId: null, session: null }));

const topic = (c: Charger, channel: string) => `volthub/chargers/${c.id}/${channel}`;
const now = () => new Date().toISOString();

function publish(c: Charger, channel: string, body: object, retain = false) {
  c.client?.publish(topic(c, channel), JSON.stringify({ ...body, ts: now() }), { qos: 1, retain });
}

function setStatus(c: Charger, status: Physical) {
  c.status = status;
  publish(c, 'status', { status }, true);
  console.log(`[${c.id}] status → ${status}`);
}

function startSession(c: Charger) {
  if (c.status !== 'AVAILABLE' || c.session) return;
  const id = `sess-${randomUUID().slice(0, 8)}`;
  setStatus(c, 'CHARGING');
  publish(c, 'session', { type: 'STARTED', sessionId: id, reservationId: c.reservationId, driverId: c.driverId });
  const session = { id, energyKwh: 0, startedAt: Date.now(), timer: setInterval(() => tick(c), TICK_MS) };
  c.session = session;
}

function tick(c: Charger) {
  if (!c.session) return;
  const elapsed = (Date.now() - c.session.startedAt) / 1000;
  // Curva de carga simplificada: potência cai depois de 80% do tempo (bateria quase cheia)
  const factor = elapsed / SESSION_SECONDS > 0.8 ? 0.4 : 0.95 + Math.random() * 0.05;
  const powerKw = +(c.powerKw * factor).toFixed(1);
  c.session.energyKwh = +(c.session.energyKwh + (powerKw * (TICK_MS / 1000) * SPEEDUP) / 3600).toFixed(3);
  publish(c, 'meter', { sessionId: c.session.id, energyKwh: c.session.energyKwh, powerKw });
  if (elapsed >= SESSION_SECONDS) endSession(c, 'COMPLETED');
}

function endSession(c: Charger, reason: 'COMPLETED' | 'FAULT') {
  if (!c.session) return;
  clearInterval(c.session.timer);
  publish(c, 'session', {
    type: 'ENDED', sessionId: c.session.id, reservationId: c.reservationId, driverId: c.driverId,
    energyKwh: c.session.energyKwh, reason,
  });
  console.log(`[${c.id}] sessão ${c.session.id} encerrada (${reason}) com ${c.session.energyKwh} kWh`);
  c.session = null;
  c.reservationId = null;
  c.driverId = null;
  // Recarga concluída: o cabo é desconectado e o carregador volta a ficar livre.
  // Em falha, quem chama define FAULTED.
  if (reason === 'COMPLETED') setStatus(c, 'AVAILABLE');
}

function onCommand(c: Charger, raw: Buffer) {
  const cmd = JSON.parse(raw.toString()) as { command: string; reservationId?: string; driverId?: string };
  console.log(`[${c.id}] comando ${cmd.command} (reserva ${cmd.reservationId ?? '-'})`);
  switch (cmd.command) {
    case 'RESERVE':
      c.reservationId = cmd.reservationId ?? null;
      c.driverId = cmd.driverId ?? null;
      break;
    case 'START':
      if (cmd.reservationId && cmd.reservationId !== c.reservationId) {
        c.reservationId = cmd.reservationId;
        c.driverId = cmd.driverId ?? null;
      }
      startSession(c);
      break;
    case 'RELEASE':
      if (!c.session && c.reservationId === cmd.reservationId) {
        c.reservationId = null;
        c.driverId = null;
      }
      break;
  }
}

for (const c of chargers) {
  c.client = mqtt.connect(MQTT_URL, {
    clientId: `charger-${c.id}`,
    clean: true,
    reconnectPeriod: 2000,
    will: { topic: topic(c, 'status'), payload: Buffer.from(JSON.stringify({ status: 'OFFLINE' })), qos: 1, retain: true },
  });
  c.client.on('connect', () => {
    c.client!.subscribe(topic(c, 'commands'), { qos: 1 });
    setStatus(c, c.status === 'FAULTED' ? 'FAULTED' : c.session ? 'CHARGING' : 'AVAILABLE');
  });
  c.client.on('message', (_t, payload) => {
    try {
      onCommand(c, payload);
    } catch (e) {
      console.error(`[${c.id}] comando inválido`, e);
    }
  });
}

// ───────── API de controle (usada na demo) ─────────
const app = Fastify();
const find = (id: string) => chargers.find((c) => c.id === id);

app.get('/chargers', async () =>
  chargers.map(({ id, powerKw, status, reservationId, session }) => ({ id, powerKw, status, reservationId, session: session && { id: session.id, energyKwh: session.energyKwh } })),
);

app.post<{ Params: { id: string } }>('/chargers/:id/fault', async (req, reply) => {
  const c = find(req.params.id);
  if (!c) return reply.code(404).send({ title: 'carregador desconhecido' });
  endSession(c, 'FAULT');
  setStatus(c, 'FAULTED');
  return { id: c.id, status: c.status };
});

app.post<{ Params: { id: string } }>('/chargers/:id/repair', async (req, reply) => {
  const c = find(req.params.id);
  if (!c) return reply.code(404).send({ title: 'carregador desconhecido' });
  setStatus(c, 'AVAILABLE');
  return { id: c.id, status: c.status };
});

/** Manda um pacote corrompido: o iot-gateway deve desviá-lo para a DLQ sem travar nada. */
app.post<{ Params: { id: string } }>('/chargers/:id/garbage', async (req, reply) => {
  const c = find(req.params.id);
  if (!c) return reply.code(404).send({ title: 'carregador desconhecido' });
  c.client?.publish(topic(c, 'meter'), '{"sessionId": null, "energyKwh": -5}', { qos: 1 });
  return { sent: 'payload inválido', topic: topic(c, 'meter') };
});

/** Desliga o carregador "na tomada": a conexão cai sem aviso e o broker publica o Last Will (OFFLINE). */
app.post<{ Params: { id: string } }>('/chargers/:id/unplug', async (req, reply) => {
  const c = find(req.params.id);
  if (!c?.client) return reply.code(404).send({ title: 'carregador desconhecido' });
  c.client.stream.destroy();
  return { id: c.id, note: 'conexão derrubada; o broker vai publicar OFFLINE (LWT)' };
});

await app.listen({ port: Number(process.env.PORT ?? 8080), host: '0.0.0.0' });
console.log(`Simulador com ${chargers.length} carregadores conectando em ${MQTT_URL}`);
