-- Guarda o contexto do trace (W3C traceparent) de quem gerou o evento,
-- para o trace continuar do HTTP → banco → relay → Kafka → consumidores.
ALTER TABLE outbox ADD COLUMN traceparent VARCHAR(64);
