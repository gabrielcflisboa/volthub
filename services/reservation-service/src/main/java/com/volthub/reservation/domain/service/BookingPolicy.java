package com.volthub.reservation.domain.service;

import com.volthub.reservation.domain.model.ChargerRef;
import com.volthub.reservation.domain.model.DomainException;
import com.volthub.reservation.domain.model.DriverId;
import com.volthub.reservation.domain.model.Reservation;

import java.time.Duration;
import java.time.Instant;

/**
 * Domain Service: a regra "posso reservar?" envolve mais de um agregado (as reservas do motorista
 * e as reservas do carregador), então não pertence a uma Reservation sozinha.
 */
public class BookingPolicy {

    public record Facts(boolean chargerAvailable, boolean driverHasActiveReservation, boolean chargerHasActiveReservation) {}

    public Reservation book(DriverId driver, ChargerRef charger, Facts facts, Instant now, Duration hold) {
        if (facts.driverHasActiveReservation()) throw new DomainException("Você já tem uma reserva ativa");
        if (facts.chargerHasActiveReservation() || !facts.chargerAvailable())
            throw new DomainException("Carregador indisponível no momento");
        return Reservation.confirm(driver, charger, now, hold);
    }
}
