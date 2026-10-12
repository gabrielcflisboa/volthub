CREATE TABLE reservations (
    id               VARCHAR(36) PRIMARY KEY,
    driver_id        VARCHAR(64) NOT NULL,
    charger_id       VARCHAR(40) NOT NULL,
    station_id       VARCHAR(80) NOT NULL,
    status           VARCHAR(20) NOT NULL,
    starts_at        TIMESTAMPTZ NOT NULL,
    expires_at       TIMESTAMPTZ NOT NULL,
    start_requested  BOOLEAN NOT NULL DEFAULT FALSE,
    session_id       VARCHAR(64),
    energy_kwh       NUMERIC(10,3) NOT NULL DEFAULT 0,
    cancel_reason    VARCHAR(30),
    updated_at       TIMESTAMPTZ NOT NULL,
    version          BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_reservations_driver ON reservations(driver_id);

-- Invariantes garantidas também pelo banco (última linha de defesa contra corrida entre duas requisições):
-- no máximo UMA reserva ativa por carregador e por motorista.
CREATE UNIQUE INDEX ux_active_by_charger ON reservations(charger_id) WHERE status IN ('CONFIRMED','IN_PROGRESS');
CREATE UNIQUE INDEX ux_active_by_driver  ON reservations(driver_id)  WHERE status IN ('CONFIRMED','IN_PROGRESS');

-- Transactional Outbox: o evento é gravado na MESMA transação do agregado
-- e publicado no Kafka depois, por um relay. Nunca há "salvou mas não publicou".
CREATE TABLE outbox (
    id            UUID PRIMARY KEY,
    topic         VARCHAR(100) NOT NULL,
    message_key   VARCHAR(100) NOT NULL,
    event_type    VARCHAR(60) NOT NULL,
    payload       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at  TIMESTAMPTZ
);
CREATE INDEX idx_outbox_pending ON outbox(created_at) WHERE published_at IS NULL;

-- Idempotent Consumer
CREATE TABLE processed_events (
    event_id     VARCHAR(64) NOT NULL,
    consumer     VARCHAR(60) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, consumer)
);
