import { randomUUID } from 'node:crypto';
import { applyMeterReading, closeSession, type Invoice } from '../domain/billing.js';
import type { BillingMetrics, InvoicePublisher, SessionStore, TariffProvider } from './ports.js';

export interface IntegrationEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  source: string;
  data: T;
}

interface SessionData {
  sessionId: string;
  chargerId: string;
  reservationId?: string | null;
  driverId?: string | null;
  energyKwh?: number;
}

/** Caso de uso: reage aos eventos de sessão de recarga (participante da saga coreografada). */
export class BillingHandler {
  constructor(
    private readonly store: SessionStore,
    private readonly tariffs: TariffProvider,
    private readonly publisher: InvoicePublisher,
    private readonly metrics: BillingMetrics,
  ) {}

  async handle(event: IntegrationEvent): Promise<void> {
    const d = event.data as unknown as SessionData;
    switch (event.eventType) {
      case 'charging.session-started': {
        // Chamada de rede fora da transação: não seguramos conexão do banco esperando outro serviço.
        const tariff = await this.tariffs.tariffFor(d.chargerId);
        await this.store.once(event.eventId, (tx) =>
          tx.openSession(
            {
              sessionId: d.sessionId,
              chargerId: d.chargerId,
              stationId: tariff.stationId,
              reservationId: d.reservationId ?? null,
              driverId: d.driverId ?? null,
              pricePerKwh: tariff.pricePerKwh,
              energyKwh: 0,
            },
            event.occurredAt,
          ),
        );
        return;
      }
      case 'charging.meter-values': {
        await this.store.once(event.eventId, async (tx) => {
          const open = await tx.findOpen(d.sessionId);
          if (!open) return;
          const updated = applyMeterReading(open, d.energyKwh ?? 0);
          if (updated !== open) await tx.updateEnergy(d.sessionId, updated.energyKwh);
        });
        return;
      }
      case 'charging.session-ended': {
        await this.store.once(event.eventId, async (tx) => {
          const open = await tx.findOpen(d.sessionId);
          if (!open) return;
          const invoice = closeSession(open, d.energyKwh ?? 0, randomUUID());
          await tx.closeAndInvoice(invoice, event.occurredAt);
          this.metrics.energyDelivered(invoice.energyKwh, invoice.stationId);
          this.metrics.revenue(invoice.amount, invoice.stationId);
        });
        // A fatura foi gravada na mesma transação do fechamento; agora (e também num timer) ela é publicada.
        // Se o processo cair entre o COMMIT e a publicação, o timer publica depois: nada se perde.
        await this.publishPendingInvoices();
        return;
      }
      default:
        return;
    }
  }

  async publishPendingInvoices(): Promise<number> {
    const pending: Invoice[] = await this.store.unpublishedInvoices();
    for (const invoice of pending) {
      await this.publisher.invoiceIssued(invoice);
      await this.store.markPublished(invoice.invoiceId);
    }
    return pending.length;
  }
}
