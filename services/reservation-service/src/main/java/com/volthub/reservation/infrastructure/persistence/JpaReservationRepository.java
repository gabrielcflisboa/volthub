package com.volthub.reservation.infrastructure.persistence;

import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.domain.event.DomainEvent;
import com.volthub.reservation.domain.model.*;
import com.volthub.reservation.infrastructure.messaging.OutboxMessageFactory;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/** Adapter do port ReservationRepository: mapeia agregado ↔ entidade e grava os eventos no outbox. */
@Repository
public class JpaReservationRepository implements ReservationRepository {

    private static final Set<String> ACTIVE = Set.of(ReservationStatus.CONFIRMED.name(), ReservationStatus.IN_PROGRESS.name());

    private final ReservationJpa jpa;
    private final OutboxJpa outbox;
    private final OutboxMessageFactory messages;

    public JpaReservationRepository(ReservationJpa jpa, OutboxJpa outbox, OutboxMessageFactory messages) {
        this.jpa = jpa;
        this.outbox = outbox;
        this.messages = messages;
    }

    @Override
    public void save(Reservation r) {
        ReservationEntity e = jpa.findById(r.id().value()).orElseGet(ReservationEntity::new);
        e.id = r.id().value();
        e.driverId = r.driver().value();
        e.chargerId = r.charger().chargerId();
        e.stationId = r.charger().stationId();
        e.status = r.status().name();
        e.startsAt = r.hold().startsAt();
        e.expiresAt = r.hold().expiresAt();
        e.startRequested = r.startRequested();
        e.sessionId = r.sessionId();
        e.energyKwh = r.energy().kwh();
        e.cancelReason = r.cancelReason() == null ? null : r.cancelReason().name();
        e.updatedAt = r.updatedAt();
        jpa.saveAndFlush(e);

        for (DomainEvent event : r.pullEvents()) {
            outbox.saveAll(messages.toOutbox(event));
        }
    }

    @Override
    public Optional<Reservation> findById(ReservationId id) {
        return jpa.findForUpdate(id.value()).map(JpaReservationRepository::toDomain);
    }

    @Override
    public List<Reservation> findByDriver(DriverId driver) {
        return jpa.findByDriverIdOrderByStartsAtDesc(driver.value()).stream().map(JpaReservationRepository::toDomain).toList();
    }

    @Override
    public boolean driverHasActive(DriverId driver) {
        return jpa.existsByDriverIdAndStatusIn(driver.value(), ACTIVE);
    }

    @Override
    public boolean chargerHasActive(String chargerId) {
        return jpa.existsByChargerIdAndStatusIn(chargerId, ACTIVE);
    }

    @Override
    public List<Reservation> findActiveByCharger(String chargerId) {
        return jpa.findByChargerIdAndStatusIn(chargerId, ACTIVE).stream().map(JpaReservationRepository::toDomain).toList();
    }

    @Override
    public List<Reservation> findOverdue(Instant now) {
        return jpa.findByStatusAndExpiresAtLessThanEqual(ReservationStatus.CONFIRMED.name(), now).stream()
                .map(JpaReservationRepository::toDomain).toList();
    }

    static Reservation toDomain(ReservationEntity e) {
        return Reservation.rehydrate(
                new ReservationId(e.id), new DriverId(e.driverId), new ChargerRef(e.chargerId, e.stationId),
                new HoldPeriod(e.startsAt, e.expiresAt), ReservationStatus.valueOf(e.status), e.startRequested,
                e.sessionId, new Energy(e.energyKwh), e.cancelReason == null ? null : CancelReason.valueOf(e.cancelReason),
                e.updatedAt, e.version);
    }
}
