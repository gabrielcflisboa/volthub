// Domínio de faturamento: funções puras, sem Kafka, sem Postgres, sem HTTP.

export class BillingRuleError extends Error {}

export interface OpenSession {
  sessionId: string;
  chargerId: string;
  stationId: string;
  reservationId: string | null;
  driverId: string | null;
  /** Preço "congelado" no início da sessão: mudar a tarifa no meio não muda o que o motorista já contratou. */
  pricePerKwh: number;
  energyKwh: number;
}

export interface Invoice {
  invoiceId: string;
  sessionId: string;
  driverId: string | null;
  chargerId: string;
  stationId: string;
  energyKwh: number;
  pricePerKwh: number;
  amount: number;
  currency: 'BRL';
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round3 = (n: number) => Math.round((n + Number.EPSILON) * 1000) / 1000;

/** Medidor é cumulativo: leitura menor que a anterior (pacote atrasado) é ignorada. */
export function applyMeterReading(session: OpenSession, energyKwh: number): OpenSession {
  if (energyKwh < 0) throw new BillingRuleError('Energia não pode ser negativa');
  return energyKwh > session.energyKwh ? { ...session, energyKwh: round3(energyKwh) } : session;
}

/** Tarifa mínima de R$ 1,00 por sessão iniciada (cobre a taxa da maquininha). */
export const MINIMUM_CHARGE = 1.0;

export function closeSession(session: OpenSession, finalEnergyKwh: number, invoiceId: string): Invoice {
  const energy = round3(Math.max(session.energyKwh, finalEnergyKwh));
  const amount = round2(Math.max(MINIMUM_CHARGE, energy * session.pricePerKwh));
  return {
    invoiceId,
    sessionId: session.sessionId,
    driverId: session.driverId,
    chargerId: session.chargerId,
    stationId: session.stationId,
    energyKwh: energy,
    pricePerKwh: session.pricePerKwh,
    amount,
    currency: 'BRL',
  };
}
