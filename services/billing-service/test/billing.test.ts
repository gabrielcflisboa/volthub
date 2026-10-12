import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMeterReading, closeSession, MINIMUM_CHARGE, type OpenSession } from '../src/domain/billing.js';

const session: OpenSession = {
  sessionId: 's1', chargerId: 'BH-SAV-01', stationId: 'volthub-savassi',
  reservationId: 'r1', driverId: 'ana', pricePerKwh: 2.19, energyKwh: 0,
};

test('leitura do medidor é cumulativa e ignora leitura atrasada', () => {
  const a = applyMeterReading(session, 5.5);
  const b = applyMeterReading(a, 4.0);
  assert.equal(b.energyKwh, 5.5);
});

test('fatura = energia × preço congelado no início', () => {
  const inv = closeSession({ ...session, energyKwh: 20 }, 20.123, 'inv-1');
  assert.equal(inv.energyKwh, 20.123);
  assert.equal(inv.amount, 44.07);
});

test('cobrança mínima por sessão', () => {
  const inv = closeSession(session, 0.1, 'inv-2');
  assert.equal(inv.amount, MINIMUM_CHARGE);
});
