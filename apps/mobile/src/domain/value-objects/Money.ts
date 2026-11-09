import { DomainValidationError } from '@/core/errors/AppError';

export class Money {
  readonly amount: number;

  constructor(amount: number) {
    if (isNaN(amount) || amount < 0) {
      throw new DomainValidationError(`Valor monetário inválido: ${amount}`);
    }
    this.amount = Number(amount.toFixed(2));
  }

  format(currency: string = 'BRL'): string {
    return this.amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency,
    });
  }

  formatPerKwh(): string {
    return `${this.format()}/kWh`;
  }
}
