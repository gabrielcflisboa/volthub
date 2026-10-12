import { metrics } from '@opentelemetry/api';
import type { BillingMetrics } from '../application/ports.js';

const meter = metrics.getMeter('volthub.billing-service');
const energy = meter.createCounter('volthub.energy.delivered', { unit: 'kWh', description: 'Energia faturada' });
const revenue = meter.createCounter('volthub.revenue', { unit: 'BRL', description: 'Receita faturada' });

export const otelBillingMetrics: BillingMetrics = {
  energyDelivered: (kwh, stationId) => energy.add(kwh, { station: stationId }),
  revenue: (amount, stationId) => revenue.add(amount, { station: stationId }),
};
