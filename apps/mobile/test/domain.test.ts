import test from 'node:test';
import assert from 'node:assert/strict';
import { Coordinates } from '../src/domain/value-objects/Coordinates';
import { Money } from '../src/domain/value-objects/Money';
import { ConnectorType } from '../src/domain/value-objects/ConnectorType';
import { ChargerStatus } from '../src/domain/value-objects/ChargerStatus';
import { Station } from '../src/domain/entities/Station';
import { Charger } from '../src/domain/entities/Charger';
import { FilterStationsUseCase } from '../src/application/use-cases/FilterStationsUseCase';

test('Coordinates calcula distância com fórmula de Haversine', () => {
  // Savassi (-19.9389, -43.9346) até Praça do Papa (-19.9558, -43.9142)
  const savassi = new Coordinates(-19.9389, -43.9346);
  const pracaDoPapa = new Coordinates(-19.9558, -43.9142);

  const distance = savassi.distanceTo(pracaDoPapa);
  assert.ok(distance > 2 && distance < 4, `Distância calculada ${distance} km deve estar entre 2 e 4 km`);
  assert.match(savassi.formatDistanceTo(pracaDoPapa), /^[0-9.]+ km$/);
});

test('Money formata valores em BRL corretamente', () => {
  const price = new Money(2.19);
  assert.equal(price.amount, 2.19);
  assert.match(price.format(), /2,19/);
  assert.match(price.formatPerKwh(), /2,19.*kWh/);
});

test('Station calcula carregadores livres e busca por texto (Feature 3)', () => {
  const station = new Station({
    id: 'volthub-savassi',
    name: 'VoltHub Savassi',
    address: 'Praça Diogo de Vasconcelos, Savassi',
    coordinates: new Coordinates(-19.9389, -43.9346),
    pricePerKwh: new Money(2.19),
    imageUrl: 'https://example.com/photo.jpg',
    rating: 4.9,
    openHours: '24 horas',
    amenities: ['WIFI', 'CAFE'],
    chargers: [
      new Charger({
        id: 'BH-SAV-01',
        stationId: 'volthub-savassi',
        stationName: 'VoltHub Savassi',
        connector: new ConnectorType('CCS2'),
        powerKw: 60,
        pricePerKwh: new Money(2.19),
        status: new ChargerStatus('AVAILABLE'),
      }),
      new Charger({
        id: 'BH-SAV-02',
        stationId: 'volthub-savassi',
        stationName: 'VoltHub Savassi',
        connector: new ConnectorType('TYPE2'),
        powerKw: 22,
        pricePerKwh: new Money(2.19),
        status: new ChargerStatus('CHARGING'),
      }),
    ],
  });

  assert.equal(station.totalChargers, 2);
  assert.equal(station.availableChargersCount, 1);
  assert.equal(station.hasAvailableChargers, true);
  assert.equal(station.hasFastCharger, true);
  assert.equal(station.maxPowerKw, 60);

  // Busca textual (Feature 3)
  assert.equal(station.matchesSearch('savassi'), true);
  assert.equal(station.matchesSearch('vasconcelos'), true);
  assert.equal(station.matchesSearch('cafe'), true);
  assert.equal(station.matchesSearch('aeroporto'), false);
});

test('FilterStationsUseCase aplica filtros estruturados (Feature 4)', () => {
  const s1 = new Station({
    id: 's1',
    name: 'Posto Savassi',
    address: 'Savassi',
    coordinates: new Coordinates(-19.93, -43.93),
    pricePerKwh: new Money(2.0),
    imageUrl: '',
    rating: 5,
    openHours: '24h',
    amenities: ['WIFI'],
    chargers: [
      new Charger({
        id: 'c1',
        stationId: 's1',
        stationName: 's1',
        connector: new ConnectorType('CCS2'),
        powerKw: 150,
        pricePerKwh: new Money(2.0),
        status: new ChargerStatus('AVAILABLE'),
      }),
    ],
  });

  const s2 = new Station({
    id: 's2',
    name: 'Posto Pampulha',
    address: 'Pampulha',
    coordinates: new Coordinates(-19.85, -43.97),
    pricePerKwh: new Money(1.8),
    imageUrl: '',
    rating: 4,
    openHours: '24h',
    amenities: [],
    chargers: [
      new Charger({
        id: 'c2',
        stationId: 's2',
        stationName: 's2',
        connector: new ConnectorType('TYPE2'),
        powerKw: 22,
        pricePerKwh: new Money(1.8),
        status: new ChargerStatus('CHARGING'), // ocupado
      }),
    ],
  });

  const useCase = new FilterStationsUseCase();

  // Filtrar apenas com vagas livres
  const onlyAvailable = useCase.execute([s1, s2], { onlyAvailable: true });
  assert.equal(onlyAvailable.length, 1);
  assert.equal(onlyAvailable[0].id, 's1');

  // Filtrar por conector CCS2
  const onlyCCS2 = useCase.execute([s1, s2], { connector: 'CCS2' });
  assert.equal(onlyCCS2.length, 1);
  assert.equal(onlyCCS2[0].id, 's1');

  // Filtrar por carregador rápido
  const onlyFast = useCase.execute([s1, s2], { onlyFast: true });
  assert.equal(onlyFast.length, 1);
  assert.equal(onlyFast[0].id, 's1');

  // Filtrar por favoritos
  const favs = useCase.execute([s1, s2], { onlyFavorites: true, favoriteIds: new Set(['s2']) });
  assert.equal(favs.length, 1);
  assert.equal(favs[0].id, 's2');
});
