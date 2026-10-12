package com.volthub.reservation.application.port;

/** Idempotent Consumer: Kafka entrega "pelo menos uma vez", então o mesmo evento pode chegar duas vezes. */
public interface ProcessedEvents {
    /** @return true se é a primeira vez que este eventId é visto (e já o registra). */
    boolean firstTime(String eventId, String consumer);
}
