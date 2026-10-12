package com.volthub.reservation.application.usecase;

import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.application.port.UnitOfWork;
import com.volthub.reservation.domain.model.Reservation;

import java.time.Clock;

/** Motorista não apareceu dentro do prazo → a reserva expira e o carregador volta a ficar livre. */
public class ExpireReservations {

    private final ReservationRepository reservations;
    private final UnitOfWork uow;
    private final Clock clock;

    public ExpireReservations(ReservationRepository reservations, UnitOfWork uow, Clock clock) {
        this.reservations = reservations;
        this.uow = uow;
        this.clock = clock;
    }

    public int run() {
        return uow.inTransaction(() -> {
            int n = 0;
            for (Reservation r : reservations.findOverdue(clock.instant())) {
                if (r.expireIfOverdue(clock.instant())) {
                    reservations.save(r);
                    n++;
                }
            }
            return n;
        });
    }
}
