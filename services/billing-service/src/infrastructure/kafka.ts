import { Kafka, logLevel, type Producer } from 'kafkajs';
import type { Invoice } from '../domain/billing.js';
import type { InvoicePublisher } from '../application/ports.js';
import type { BillingHandler, IntegrationEvent } from '../application/billing-handler.js';
import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger as Logger } from 'fastify';

export function createKafka(brokers: string[]) {
  return new Kafka({ clientId: 'billing-service', brokers, logLevel: logLevel.WARN, retry: { retries: 10 } });
}

export class KafkaInvoicePublisher implements InvoicePublisher {
  constructor(private readonly producer: Producer) {}

  async invoiceIssued(invoice: Invoice): Promise<void> {
    const envelope = {
      eventId: randomUUID(),
      eventType: 'invoice.issued',
      occurredAt: new Date().toISOString(),
      source: 'billing-service',
      data: invoice,
    };
    await this.producer.send({
      topic: 'volthub.invoices',
      messages: [{ key: invoice.driverId ?? invoice.chargerId, value: JSON.stringify(envelope) }],
    });
  }
}

export async function startConsumer(kafka: Kafka, handler: BillingHandler, log: Logger) {
  const consumer = kafka.consumer({ groupId: 'billing-service' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['volthub.charging.sessions', 'volthub.charging.meter'], fromBeginning: true });
  await consumer.run({
    // O offset só é confirmado depois que o handler termina: falhou → a mensagem volta (at-least-once).
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;
      const event = JSON.parse(message.value.toString()) as IntegrationEvent;
      try {
        await handler.handle(event);
        if (event.eventType !== 'charging.meter-values') log.info({ topic, eventType: event.eventType }, 'evento processado');
      } catch (err) {
        log.error({ err, eventType: event.eventType }, 'falha ao processar evento, será reentregue');
        throw err;
      }
    },
  });
  return consumer;
}
