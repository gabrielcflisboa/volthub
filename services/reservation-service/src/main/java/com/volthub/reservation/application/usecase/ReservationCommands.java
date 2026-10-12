package com.volthub.reservation.application.usecase;

import com.volthub.reservation.application.port.ChargerCatalog;
import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.application.port.UnitOfWork;
import com.volthub.reservation.domain.model.*;
import com.volthub.reservation.domain.service.BookingPolicy;

import java.time.Clock;
import java.time.Duration;

/** Lado de COMANDO: valida, aplica regra de negócio, persiste e (via outbox) publica eventos. */
public class ReservationCommands {

    public record CreateReservation(String driverId, String chargerId) {}

    private final ReservationRepository reservations;
    private final ChargerCatalog catalog;
    private final BookingPolicy policy;
    private final UnitOfWork uow;
    private final Clock clock;
    private final Duration hold;

    public ReservationCommands(ReservationRepository reservations, ChargerCatalog catalog, BookingPolicy policy,
                               UnitOfWork uow, Clock clock, Duration hold) {
        this.reservations = reservations;
        this.catalog = catalog;
        this.policy = policy;
        this.uow = uow;
        this.clock = clock;
        this.hold = hold;
    }

    public Reservation create(CreateReservation cmd) {
        DriverId driver = new DriverId(cmd.driverId());
        // Chamada síncrona FORA da transação: não segurar conexão do banco esperando a rede.
        ChargerCatalog.ChargerInfo info = catalog.find(cmd.chargerId())
                .orElseThrow(() -> new NotFoundException("Carregador não encontrado: " + cmd.chargerId()));
        ChargerRef charger = new ChargerRef(info.chargerId(), info.stationId());

        return uow.inTransaction(() -> {
            var facts = new BookingPolicy.Facts(info.isAvailable(),
                    reservations.driverHasActive(driver), reservations.chargerHasActive(charger.chargerId()));
            Reservation r = policy.book(driver, charger, facts, clock.instant(), hold);
            reservations.save(r);
            return r;
        });
    }

    public Reservation start(String reservationId, String driverId) {
        return uow.inTransaction(() -> {
            Reservation r = load(reservationId);
            r.requestStart(new DriverId(driverId), clock.instant());
            reservations.save(r);
            return r;
        });
    }

    public Reservation cancel(String reservationId, String driverId) {
        return uow.inTransaction(() -> {
            Reservation r = load(reservationId);
            r.cancelByDriver(new DriverId(driverId), clock.instant());
            reservations.save(r);
            return r;
        });
    }

    private Reservation load(String id) {
        return reservations.findById(new ReservationId(id))
                .orElseThrow(() -> new NotFoundException("Reserva não encontrada: " + id));
    }
}
