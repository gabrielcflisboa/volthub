package com.volthub.reservation.domain.event;

import com.volthub.reservation.domain.model.*;

import java.time.Instant;

public record ReservationCompleted(ReservationId reservationId, DriverId driver, ChargerRef charger, Energy energy, Instant occurredAt) implements DomainEvent {}
