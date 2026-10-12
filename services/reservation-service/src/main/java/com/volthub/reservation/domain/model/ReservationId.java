package com.volthub.reservation.domain.model;

import java.util.Objects;
import java.util.UUID;

/** Value Object: identidade da reserva. Imutável e comparado por valor. */
public record ReservationId(String value) {
    public ReservationId {
        Objects.requireNonNull(value);
        UUID.fromString(value); // valida formato
    }
    public static ReservationId newId() { return new ReservationId(UUID.randomUUID().toString()); }
    @Override public String toString() { return value; }
}
