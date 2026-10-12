package com.volthub.reservation.domain.event;

import com.volthub.reservation.domain.model.*;

import java.time.Instant;

public record ReservationInProgress(ReservationId reservationId, ChargerRef charger, String sessionId, Instant occurredAt) implements DomainEvent {}
