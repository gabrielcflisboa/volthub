import { Money } from '../value-objects/Money';

export interface InvoiceProps {
  id: string;
  sessionId: string;
  chargerId: string;
  energyKwh: number;
  pricePerKwh: Money;
  amount: Money;
  issuedAt: string;
}

export class Invoice {
  readonly id: string;
  readonly sessionId: string;
  readonly chargerId: string;
  readonly energyKwh: number;
  readonly pricePerKwh: Money;
  readonly amount: Money;
  readonly issuedAt: string;

  constructor(props: InvoiceProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.chargerId = props.chargerId;
    this.energyKwh = props.energyKwh;
    this.pricePerKwh = props.pricePerKwh;
    this.amount = props.amount;
    this.issuedAt = props.issuedAt;
  }

  get formattedTime(): string {
    try {
      const d = new Date(this.issuedAt);
      if (isNaN(d.getTime())) return this.issuedAt;
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return this.issuedAt;
    }
  }
}
