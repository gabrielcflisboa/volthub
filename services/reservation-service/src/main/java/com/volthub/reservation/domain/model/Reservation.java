package com.volthub.reservation.domain.model;

import com.volthub.reservation.domain.event.*;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Aggregate Root. Único ponto de mudança de estado da reserva: ninguém altera "status" de fora.
 * Cada transição valida a invariante e registra um Domain Event (publicado depois de salvar, via Outbox).
 */
public class Reservation {

    private final ReservationId id;
    private final DriverId driver;
    private final ChargerRef charger;
    private final HoldPeriod hold;
    private ReservationStatus status;
    private boolean startRequested;
    private String sessionId;
    private Energy energy;
    private CancelReason cancelReason;
    private Instant updatedAt;
    private final long version;

    private final List<DomainEvent> events = new ArrayList<>();

    private Reservation(ReservationId id, DriverId driver, ChargerRef charger, HoldPeriod hold, ReservationStatus status,
                        boolean startRequested, String sessionId, Energy energy, CancelReason cancelReason,
                        Instant updatedAt, long version) {
        this.id = id;
        this.driver = driver;
        this.charger = charger;
        this.hold = hold;
        this.status = status;
        this.startRequested = startRequested;
        this.sessionId = sessionId;
        this.energy = energy;
        this.cancelReason = cancelReason;
        this.updatedAt = updatedAt;
        this.version = version;
    }

    /** Fábrica: a reserva já nasce confirmada (a disponibilidade foi checada pelo Domain Service). */
    public static Reservation confirm(DriverId driver, ChargerRef charger, Instant now, Duration holdFor) {
        Reservation r = new Reservation(ReservationId.newId(), driver, charger, HoldPeriod.of(now, holdFor),
                ReservationStatus.CONFIRMED, false, null, Energy.ZERO, null, now, 0);
        r.events.add(new ReservationConfirmed(r.id, driver, charger, r.hold.expiresAt(), now));
        return r;
    }

    /** Reconstrói a partir da persistência, sem disparar eventos. */
    public static Reservation rehydrate(ReservationId id, DriverId driver, ChargerRef charger, HoldPeriod hold,
                                        ReservationStatus status, boolean startRequested, String sessionId, Energy energy,
                                        CancelReason cancelReason, Instant updatedAt, long version) {
        return new Reservation(id, driver, charger, hold, status, startRequested, sessionId, energy, cancelReason, updatedAt, version);
    }

    /** Motorista chegou e pede para liberar o carregador. */
    public void requestStart(DriverId requester, Instant now) {
        ensureOwner(requester);
        if (status != ReservationStatus.CONFIRMED) throw new DomainException("Só é possível iniciar uma reserva confirmada (atual: " + status + ")");
        if (hold.isOver(now)) throw new DomainException("A reserva já expirou");
        if (startRequested) return; // idempotente: clicar duas vezes não manda dois comandos
        startRequested = true;
        touch(now);
        events.add(new ChargingStartRequested(id, driver, charger, now));
    }

    /** O carregador confirmou (via MQTT → Kafka) que a sessão começou. */
    public void markInProgress(String sessionId, Instant now) {
        if (status == ReservationStatus.IN_PROGRESS && sessionId.equals(this.sessionId)) return; // evento repetido
        if (status != ReservationStatus.CONFIRMED) throw new DomainException("Sessão iniciada para reserva em estado " + status);
        this.status = ReservationStatus.IN_PROGRESS;
        this.sessionId = sessionId;
        touch(now);
        events.add(new ReservationInProgress(id, charger, sessionId, now));
    }

    public void complete(Energy delivered, Instant now) {
        if (status == ReservationStatus.COMPLETED) return;
        if (status != ReservationStatus.IN_PROGRESS) throw new DomainException("Só é possível concluir uma reserva em andamento");
        this.status = ReservationStatus.COMPLETED;
        this.energy = delivered;
        touch(now);
        events.add(new ReservationCompleted(id, driver, charger, delivered, now));
    }

    public void cancelByDriver(DriverId requester, Instant now) {
        ensureOwner(requester);
        if (status != ReservationStatus.CONFIRMED) throw new DomainException("Só é possível cancelar uma reserva confirmada (atual: " + status + ")");
        cancel(CancelReason.DRIVER_REQUEST, now);
    }

    /** Compensação da saga: o carregador quebrou antes de o motorista começar a recarga. */
    public boolean cancelDueToChargerFault(Instant now) {
        if (status != ReservationStatus.CONFIRMED) return false;
        cancel(CancelReason.CHARGER_FAULT, now);
        return true;
    }

    public boolean expireIfOverdue(Instant now) {
        if (status != ReservationStatus.CONFIRMED || !hold.isOver(now)) return false;
        this.status = ReservationStatus.EXPIRED;
        touch(now);
        events.add(new ReservationExpired(id, driver, charger, now));
        return true;
    }

    private void cancel(CancelReason reason, Instant now) {
        this.status = ReservationStatus.CANCELLED;
        this.cancelReason = reason;
        touch(now);
        events.add(new ReservationCancelled(id, driver, charger, reason, now));
    }

    private void ensureOwner(DriverId requester) {
        if (!driver.equals(requester)) throw new NotOwnerException();
    }

    private void touch(Instant now) { this.updatedAt = now; }

    public List<DomainEvent> pullEvents() {
        List<DomainEvent> copy = List.copyOf(events);
        events.clear();
        return copy;
    }

    public List<DomainEvent> pendingEvents() { return Collections.unmodifiableList(events); }

    public ReservationId id() { return id; }
    public DriverId driver() { return driver; }
    public ChargerRef charger() { return charger; }
    public HoldPeriod hold() { return hold; }
    public ReservationStatus status() { return status; }
    public boolean startRequested() { return startRequested; }
    public String sessionId() { return sessionId; }
    public Energy energy() { return energy; }
    public CancelReason cancelReason() { return cancelReason; }
    public Instant updatedAt() { return updatedAt; }
    public long version() { return version; }

    public static class NotOwnerException extends DomainException {
        public NotOwnerException() { super("A reserva pertence a outro motorista"); }
    }
}
