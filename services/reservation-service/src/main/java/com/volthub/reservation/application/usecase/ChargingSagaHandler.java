package com.volthub.reservation.application.usecase;

import com.volthub.reservation.application.port.ProcessedEvents;
import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.application.port.UnitOfWork;
import com.volthub.reservation.domain.model.Energy;
import com.volthub.reservation.domain.model.Reservation;
import com.volthub.reservation.domain.model.ReservationId;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.logging.Logger;

/**
 * Participante da SAGA COREOGRAFADA da recarga. Não existe orquestrador: cada serviço reage aos eventos
 * dos outros e publica os seus.
 *
 *   reserva confirmada → carregador reservado → sessão iniciada → sessão encerrada → fatura emitida
 *   compensação: carregador com FALHA antes de começar → reserva CANCELADA (e o carregador é liberado)
 */
public class ChargingSagaHandler {

    private static final Logger log = Logger.getLogger(ChargingSagaHandler.class.getName());
    private static final String CONSUMER = "reservation-service";

    private final ReservationRepository reservations;
    private final ProcessedEvents processed;
    private final UnitOfWork uow;
    private final Clock clock;

    public ChargingSagaHandler(ReservationRepository reservations, ProcessedEvents processed, UnitOfWork uow, Clock clock) {
        this.reservations = reservations;
        this.processed = processed;
        this.uow = uow;
        this.clock = clock;
    }

    public void onSessionStarted(String eventId, String reservationId, String sessionId) {
        if (reservationId == null || reservationId.isBlank()) return; // recarga avulsa, sem reserva
        uow.inTransaction(() -> {
            if (!processed.firstTime(eventId, CONSUMER)) return;
            reservations.findById(new ReservationId(reservationId)).ifPresentOrElse(r -> {
                r.markInProgress(sessionId, clock.instant());
                reservations.save(r);
            }, () -> log.warning("session-started para reserva desconhecida " + reservationId));
        });
    }

    public void onSessionEnded(String eventId, String reservationId, BigDecimal energyKwh) {
        if (reservationId == null || reservationId.isBlank()) return;
        uow.inTransaction(() -> {
            if (!processed.firstTime(eventId, CONSUMER)) return;
            reservations.findById(new ReservationId(reservationId)).ifPresent(r -> {
                r.complete(new Energy(energyKwh), clock.instant());
                reservations.save(r);
            });
        });
    }

    public void onChargerStatus(String eventId, String chargerId, String status) {
        if (!"FAULTED".equals(status) && !"OFFLINE".equals(status)) return;
        uow.inTransaction(() -> {
            if (!processed.firstTime(eventId, CONSUMER)) return;
            for (Reservation r : reservations.findActiveByCharger(chargerId)) {
                if (r.cancelDueToChargerFault(clock.instant())) {
                    log.info("Compensação: reserva " + r.id() + " cancelada por falha no carregador " + chargerId);
                    reservations.save(r);
                }
            }
        });
    }
}
