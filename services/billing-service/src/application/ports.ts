import type { Invoice, OpenSession } from '../domain/billing.js';

/** Ports (interfaces) que a aplicação usa; a infraestrutura implementa. */
export interface SessionStore {
  /** Executa o trabalho numa transação; se o eventId já foi processado, não executa (consumidor idempotente). */
  once(eventId: string, work: (tx: SessionTx) => Promise<void>): Promise<boolean>;
  /** Faturas gravadas e ainda não publicadas no Kafka (outbox simplificado). */
  unpublishedInvoices(): Promise<Invoice[]>;
  markPublished(invoiceId: string): Promise<void>;
}

export interface SessionTx {
  openSession(s: OpenSession, startedAt: string): Promise<void>;
  findOpen(sessionId: string): Promise<OpenSession | null>;
  updateEnergy(sessionId: string, energyKwh: number): Promise<void>;
  closeAndInvoice(invoice: Invoice, endedAt: string): Promise<void>;
}

export interface TariffProvider {
  tariffFor(chargerId: string): Promise<{ stationId: string; pricePerKwh: number }>;
}

export interface InvoicePublisher {
  invoiceIssued(invoice: Invoice): Promise<void>;
}

export interface BillingMetrics {
  energyDelivered(kwh: number, stationId: string): void;
  revenue(amount: number, stationId: string): void;
}
