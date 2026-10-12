package com.volthub.reservation.domain.event;

import com.volthub.reservation.domain.model.*;

import java.time.Instant;

public record ChargingStartRequested(ReservationId reservationId, DriverId driver, ChargerRef charger, Instant occurredAt) implements DomainEvent {}
