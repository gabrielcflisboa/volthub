package com.volthub.reservation.application.port;

import com.volthub.reservation.domain.model.DriverId;
import com.volthub.reservation.domain.model.Reservation;
import com.volthub.reservation.domain.model.ReservationId;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Port do Aggregate Root. save() persiste o agregado E os eventos pendentes dele na tabela de outbox,
 * na mesma transação (Transactional Outbox).
 */
public interface ReservationRepository {
    void save(Reservation reservation);
    Optional<Reservation> findById(ReservationId id);
    List<Reservation> findByDriver(DriverId driver);
    boolean driverHasActive(DriverId driver);
    boolean chargerHasActive(String chargerId);
    List<Reservation> findActiveByCharger(String chargerId);
    List<Reservation> findOverdue(Instant now);
}
