-- Enriquecimento de metadados visuais das estações
ALTER TABLE stations ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE stations ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1) DEFAULT 4.8;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS open_hours VARCHAR(60) DEFAULT '24 horas';
ALTER TABLE stations ADD COLUMN IF NOT EXISTS amenities VARCHAR(200) DEFAULT 'WIFI,PARKING';

-- Atualiza dados das 3 estações do seed inicial
UPDATE stations
   SET image_url = 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80',
       rating = 4.9,
       open_hours = '24 horas',
       amenities = 'WIFI,CAFE,RESTROOM,PARKING'
 WHERE id = 'volthub-savassi';

UPDATE stations
   SET image_url = 'https://images.unsplash.com/photo-1558441719-79a615717cb4?auto=format&fit=crop&w=800&q=80',
       rating = 4.7,
       open_hours = '06:00 - 23:00',
       amenities = 'LAKE_VIEW,PARKING,CAFE'
 WHERE id = 'volthub-pampulha';

UPDATE stations
   SET image_url = 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
       rating = 4.8,
       open_hours = '07:00 - 22:30',
       amenities = 'WIFI,RESTROOM,SECURITY,PARKING'
 WHERE id = 'volthub-puc';

-- Novas estações espalhadas por Belo Horizonte e região metropolitana
INSERT INTO stations (id, name, address, latitude, longitude, price_per_kwh, image_url, rating, open_hours, amenities) VALUES
 ('volthub-lourdes',      'VoltHub Diamond Lourdes',       'Av. Olegário Maciel, 1600 - Lourdes',         -19.9285, -43.9460, 2.29, 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80', 4.9, '10:00 - 22:00', 'SHOPPING,FOOD_COURT,WIFI,RESTROOM'),
 ('volthub-belvedere',    'VoltHub BH Shopping Belvedere', 'Rodovia BR-356, 3049 - Belvedere',            -19.9745, -43.9452, 2.39, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80', 5.0, '24 horas',      'FAST_CHARGER,SHOPPING,CAFE,RESTROOM'),
 ('volthub-mangabeiras',  'VoltHub Praça do Papa',         'Praça Israel Pinheiro, s/n - Mangabeiras',    -19.9558, -43.9142, 1.99, 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=800&q=80', 4.6, '06:00 - 22:00', 'SCENIC_VIEW,PARKING,FOOD_TRUCKS'),
 ('volthub-confins',      'VoltHub Aeroporto Confins',     'Rodovia LMG-800, Km 7,9 - Confins',           -19.6339, -43.9686, 2.49, 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f8?auto=format&fit=crop&w=800&q=80', 4.8, '24 horas',      'FAST_CHARGER,AIRPORT,CAFE,RESTROOM,WIFI'),
 ('volthub-cidade-nova',  'VoltHub Cristiano Machado',     'Av. Cristiano Machado, 1180 - Cidade Nova',   -19.8980, -43.9280, 1.79, 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80', 4.5, '24 horas',      'CONVENIENCE,RESTROOM,AIR_WATER'),
 ('volthub-buritis',      'VoltHub Buritis Paragem',       'Av. Professor Mário Werneck, 1360 - Buritis', -19.9678, -43.9745, 1.95, 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80', 4.7, '08:00 - 23:00', 'SHOPPING,WIFI,RESTROOM,PHARMACY'),
 ('volthub-floresta',     'VoltHub Sapucaí Floresta',      'Rua Sapucaí, 320 - Floresta',                 -19.9160, -43.9310, 1.85, 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80', 4.8, '11:00 - 00:00', 'RESTAURANTS,BARS,WIFI,CULTURE')
ON CONFLICT (id) DO NOTHING;

-- Carregadores adicionais
INSERT INTO chargers (id, station_id, connector, power_kw) VALUES
 ('BH-LOU-01', 'volthub-lourdes',     'CCS2',    150),
 ('BH-LOU-02', 'volthub-lourdes',     'TYPE2',    22),
 ('BH-BEL-01', 'volthub-belvedere',   'CCS2',    150),
 ('BH-BEL-02', 'volthub-belvedere',   'CHADEMO',  50),
 ('BH-BEL-03', 'volthub-belvedere',   'TYPE2',    22),
 ('BH-MAN-01', 'volthub-mangabeiras', 'CCS2',     60),
 ('BH-MAN-02', 'volthub-mangabeiras', 'TYPE2',    22),
 ('BH-CNF-01', 'volthub-confins',     'CCS2',    180),
 ('BH-CNF-02', 'volthub-confins',     'CCS2',    120),
 ('BH-CNF-03', 'volthub-confins',     'TYPE2',    22),
 ('BH-NOV-01', 'volthub-cidade-nova', 'CCS2',     50),
 ('BH-NOV-02', 'volthub-cidade-nova', 'TYPE2',    11),
 ('BH-BUR-01', 'volthub-buritis',     'CCS2',     60),
 ('BH-BUR-02', 'volthub-buritis',     'TYPE2',    22),
 ('BH-FLO-01', 'volthub-floresta',    'CCS2',     50),
 ('BH-FLO-02', 'volthub-floresta',    'TYPE2',    22)
ON CONFLICT (id) DO NOTHING;

-- Read model: insere disponibilidade inicial dos novos carregadores como AVAILABLE
INSERT INTO charger_availability (charger_id, station_id, station_name, connector, power_kw, price_per_kwh, physical_status, status)
SELECT c.id, s.id, s.name, c.connector, c.power_kw, s.price_per_kwh, 'AVAILABLE', 'AVAILABLE'
FROM chargers c
JOIN stations s ON s.id = c.station_id
WHERE c.id NOT IN (SELECT charger_id FROM charger_availability)
ON CONFLICT (charger_id) DO NOTHING;
