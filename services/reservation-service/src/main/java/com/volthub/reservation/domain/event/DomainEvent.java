package com.volthub.reservation.domain.event;

import com.volthub.reservation.domain.model.ReservationId;

import java.time.Instant;

/** Domain Event: um fato do passado. Nome no particípio; nunca é alterado depois de criado. */
public sealed interface DomainEvent permits ReservationConfirmed, ChargingStartRequested, ReservationInProgress,
        ReservationCompleted, ReservationCancelled, ReservationExpired {
    ReservationId reservationId();
    Instant occurredAt();
}
