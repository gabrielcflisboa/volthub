package com.volthub.reservation.application.usecase;

import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.domain.model.DriverId;
import com.volthub.reservation.domain.model.Reservation;
import com.volthub.reservation.domain.model.ReservationId;

import java.util.List;

/** Lado de CONSULTA: só lê. Sem regra de negócio e sem publicar eventos. */
public class ReservationQueries {

    private final ReservationRepository reservations;

    public ReservationQueries(ReservationRepository reservations) {
        this.reservations = reservations;
    }

    public Reservation get(String reservationId, String driverId, boolean isOperator) {
        Reservation r = reservations.findById(new ReservationId(reservationId))
                .orElseThrow(() -> new NotFoundException("Reserva não encontrada: " + reservationId));
        if (!isOperator && !r.driver().value().equals(driverId)) throw new Reservation.NotOwnerException();
        return r;
    }

    public List<Reservation> mine(String driverId) {
        return reservations.findByDriver(new DriverId(driverId));
    }
}
