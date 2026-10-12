-- Rede inicial em Belo Horizonte
INSERT INTO stations VALUES
 ('volthub-savassi',  'VoltHub Savassi',               'Praça Diogo de Vasconcelos, Savassi',     -19.9389, -43.9346, 2.19),
 ('volthub-pampulha', 'VoltHub Pampulha',              'Av. Otacílio Negrão de Lima, Pampulha',  -19.8519, -43.9716, 1.89),
 ('volthub-puc',      'VoltHub PUC Coração Eucarístico','Rua Dom José Gaspar, 500',               -19.9227, -43.9925, 1.59);

INSERT INTO chargers VALUES
 ('BH-SAV-01', 'volthub-savassi',  'CCS2',  60),
 ('BH-SAV-02', 'volthub-savassi',  'TYPE2', 22),
 ('BH-PAM-01', 'volthub-pampulha', 'CCS2',  120),
 ('BH-PAM-02', 'volthub-pampulha', 'TYPE2', 22),
 ('BH-PUC-01', 'volthub-puc',      'TYPE2', 11),
 ('BH-PUC-02', 'volthub-puc',      'CCS2',  50);

INSERT INTO charger_availability (charger_id, station_id, station_name, connector, power_kw, price_per_kwh)
SELECT c.id, s.id, s.name, c.connector, c.power_kw, s.price_per_kwh
FROM chargers c JOIN stations s ON s.id = c.station_id;
