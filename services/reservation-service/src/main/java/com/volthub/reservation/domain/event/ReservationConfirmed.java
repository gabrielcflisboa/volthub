package com.volthub.reservation.domain.event;

import com.volthub.reservation.domain.model.*;

import java.time.Instant;

public record ReservationConfirmed(ReservationId reservationId, DriverId driver, ChargerRef charger, Instant expiresAt, Instant occurredAt) implements DomainEvent {}
