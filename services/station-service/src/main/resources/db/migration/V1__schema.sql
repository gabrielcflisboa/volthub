-- Modelo de ESCRITA (normalizado)
CREATE TABLE stations (
    id            VARCHAR(80) PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    address       VARCHAR(200),
    latitude      DOUBLE PRECISION NOT NULL,
    longitude     DOUBLE PRECISION NOT NULL,
    price_per_kwh NUMERIC(8,2) NOT NULL
);

CREATE TABLE chargers (
    id         VARCHAR(40) PRIMARY KEY,
    station_id VARCHAR(80) NOT NULL REFERENCES stations(id),
    connector  VARCHAR(20) NOT NULL,
    power_kw   INT NOT NULL
);

-- Modelo de LEITURA (CQRS): desnormalizado, alimentado por eventos do Kafka
CREATE TABLE charger_availability (
    charger_id            VARCHAR(40) PRIMARY KEY,
    station_id            VARCHAR(80) NOT NULL,
    station_name          VARCHAR(120) NOT NULL,
    connector             VARCHAR(20) NOT NULL,
    power_kw              INT NOT NULL,
    price_per_kwh         NUMERIC(8,2) NOT NULL,
    physical_status       VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    active_reservation_id VARCHAR(40),
    status                VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    last_status_at        TIMESTAMPTZ,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_availability_station ON charger_availability(station_id);
