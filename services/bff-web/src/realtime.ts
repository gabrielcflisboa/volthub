import { Kafka, logLevel } from 'kafkajs';
import { hostname } from 'node:os';
import type { WebSocket } from 'ws';
import type { FastifyBaseLogger } from 'fastify';

interface Envelope {
  eventId: string;
  eventType: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

interface Client {
  socket: WebSocket;
  sub: string;
  roles: string[];
}

/**
 * Tempo real: o BFF consome eventos do Kafka e empurra para o navegador via WebSocket.
 * Cada réplica do BFF usa um groupId PRÓPRIO, porque cada uma precisa receber TODOS os eventos
 * (são os seus clientes conectados que importam) — o oposto de um serviço de negócio,
 * em que réplicas dividem as partições do mesmo grupo.
 */
export class RealtimeHub {
  private readonly clients = new Set<Client>();
  private readonly sessionOwner = new Map<string, string>(); // sessionId → driverId

  constructor(private readonly log: FastifyBaseLogger) {}

  add(socket: WebSocket, sub: string, roles: string[]) {
    const client = { socket, sub, roles };
    this.clients.add(client);
    socket.on('close', () => this.clients.delete(client));
    socket.send(JSON.stringify({ type: 'hello', clients: this.clients.size }));
  }

  get connected() {
    return this.clients.size;
  }

  async start(brokers: string[]) {
    const kafka = new Kafka({ clientId: 'bff-web', brokers, logLevel: logLevel.WARN, retry: { retries: 10 } });
    const consumer = kafka.consumer({ groupId: `bff-web-${hostname()}` });
    await consumer.connect();
    await consumer.subscribe({
      topics: ['volthub.charger.status', 'volthub.reservations', 'volthub.charging.sessions', 'volthub.charging.meter', 'volthub.invoices'],
      fromBeginning: false,
    });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        this.route(JSON.parse(message.value.toString()) as Envelope);
      },
    });
    return consumer;
  }

  private route(e: Envelope) {
    const d = e.data;
    switch (e.eventType) {
      case 'charger.status-changed':
        return this.broadcast({ type: 'charger', chargerId: d.chargerId, physicalStatus: d.status, at: e.occurredAt });
      case 'charging.session-started':
        if (d.driverId) this.sessionOwner.set(String(d.sessionId), String(d.driverId));
        return this.toDriver(d.driverId, { type: 'session-started', ...d });
      case 'charging.meter-values': {
        const owner = this.sessionOwner.get(String(d.sessionId));
        this.toDriver(owner, { type: 'meter', ...d });
        return this.toOperators({ type: 'meter', ...d });
      }
      case 'charging.session-ended': {
        const owner = this.sessionOwner.get(String(d.sessionId)) ?? d.driverId;
        this.sessionOwner.delete(String(d.sessionId));
        return this.toDriver(owner, { type: 'session-ended', ...d });
      }
      case 'invoice.issued':
        this.toOperators({ type: 'invoice', ...d });
        return this.toDriver(d.driverId, { type: 'invoice', ...d });
      default:
        if (e.eventType.startsWith('reservation.')) {
          this.broadcast({ type: 'availability-changed', chargerId: d.chargerId });
          return this.toDriver(d.driverId, { type: 'reservation', event: e.eventType, ...d });
        }
    }
  }

  private send(c: Client, payload: unknown) {
    if (c.socket.readyState === c.socket.OPEN) c.socket.send(JSON.stringify(payload));
  }

  private broadcast(payload: unknown) {
    for (const c of this.clients) this.send(c, payload);
  }

  private toDriver(driverId: unknown, payload: unknown) {
    if (!driverId) return;
    for (const c of this.clients) if (c.sub === driverId) this.send(c, payload);
  }

  private toOperators(payload: unknown) {
    for (const c of this.clients) if (c.roles.includes('operator')) this.send(c, payload);
  }
}
