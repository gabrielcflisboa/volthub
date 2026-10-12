package com.volthub.reservation.infrastructure.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReservationJpa extends JpaRepository<ReservationEntity, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ReservationEntity r where r.id = :id")
    Optional<ReservationEntity> findForUpdate(String id);

    List<ReservationEntity> findByDriverIdOrderByStartsAtDesc(String driverId);

    boolean existsByDriverIdAndStatusIn(String driverId, Collection<String> statuses);

    boolean existsByChargerIdAndStatusIn(String chargerId, Collection<String> statuses);

    List<ReservationEntity> findByChargerIdAndStatusIn(String chargerId, Collection<String> statuses);

    List<ReservationEntity> findByStatusAndExpiresAtLessThanEqual(String status, Instant now);
}
