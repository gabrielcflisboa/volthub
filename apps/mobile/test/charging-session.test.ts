import test from 'node:test';
import assert from 'node:assert/strict';
import { Result } from '../src/core/types/Result';
import { NetworkError } from '../src/core/errors/AppError';
import { ActiveReservation, IReservationRepository } from '../src/domain/repositories/IReservationRepository';
import { OpenChargingSessionUseCase } from '../src/application/use-cases/OpenChargingSessionUseCase';

class FakeReservationRepository implements IReservationRepository {
  calls: string[] = [];
  createResults: Result<{ id: string }>[] = [Result.ok({ id: 'resv-1' })];
  active: ActiveReservation | null = null;
  /** Executado após cada chamada, para simular o motorista tocando em "parar" no meio do fluxo. */
  afterCall: (name: string) => void = () => {};

  async create(chargerId: string) {
    this.calls.push(`create:${chargerId}`);
    const res = this.createResults.shift() ?? Result.ok({ id: 'resv-x' });
    this.afterCall('create');
    return res;
  }

  async findActive() {
    this.calls.push('findActive');
    this.afterCall('findActive');
    return Result.ok(this.active);
  }

  async cancel(id: string) {
    this.calls.push(`cancel:${id}`);
    this.afterCall('cancel');
    return Result.ok(undefined);
  }

  async start(id: string) {
    this.calls.push(`start:${id}`);
    this.afterCall('start');
    return Result.ok(undefined);
  }
}

test('OpenChargingSession cria e inicia a reserva', async () => {
  const repo = new FakeReservationRepository();
  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn');

  assert.equal(id, 'resv-1');
  assert.deepEqual(repo.calls, ['create:BH-LOU-01', 'start:resv-1']);
});

test('OpenChargingSession cancela a reserva criada se a recarga foi parada durante o create', async () => {
  const repo = new FakeReservationRepository();
  let stopped = false;
  repo.afterCall = (name) => {
    if (name === 'create') stopped = true;
  };

  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn', () => stopped);

  assert.equal(id, null);
  assert.deepEqual(repo.calls, ['create:BH-LOU-01', 'cancel:resv-1']);
});

test('OpenChargingSession cancela a reserva se a recarga foi parada durante o start', async () => {
  const repo = new FakeReservationRepository();
  let stopped = false;
  repo.afterCall = (name) => {
    if (name === 'start') stopped = true;
  };

  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn', () => stopped);

  assert.equal(id, null);
  assert.deepEqual(repo.calls, ['create:BH-LOU-01', 'start:resv-1', 'cancel:resv-1']);
});

test('OpenChargingSession reaproveita reserva ativa do mesmo carregador após 409', async () => {
  const repo = new FakeReservationRepository();
  repo.createResults = [Result.err(new NetworkError('409'))];
  repo.active = { id: 'resv-old', chargerId: 'BH-LOU-01', status: 'CONFIRMED' };

  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn');

  assert.equal(id, 'resv-old');
  assert.deepEqual(repo.calls, ['create:BH-LOU-01', 'findActive', 'start:resv-old']);
});

test('OpenChargingSession troca reserva CONFIRMED de outro carregador após 409', async () => {
  const repo = new FakeReservationRepository();
  repo.createResults = [Result.err(new NetworkError('409')), Result.ok({ id: 'resv-new' })];
  repo.active = { id: 'resv-old', chargerId: 'BH-SAV-01', status: 'CONFIRMED' };

  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn');

  assert.equal(id, 'resv-new');
  assert.deepEqual(repo.calls, [
    'create:BH-LOU-01',
    'findActive',
    'cancel:resv-old',
    'create:BH-LOU-01',
    'start:resv-new',
  ]);
});

test('OpenChargingSession retorna null sem reserva quando a API falha', async () => {
  const repo = new FakeReservationRepository();
  repo.createResults = [Result.err(new NetworkError('offline'))];

  const id = await new OpenChargingSessionUseCase(repo).execute('BH-LOU-01', 'tkn');

  assert.equal(id, null);
  assert.deepEqual(repo.calls, ['create:BH-LOU-01', 'findActive']);
});
