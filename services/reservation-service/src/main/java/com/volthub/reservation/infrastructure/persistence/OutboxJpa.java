package com.volthub.reservation.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface OutboxJpa extends JpaRepository<OutboxEntity, UUID> {

    /** SKIP LOCKED: se houver duas réplicas do serviço, cada uma pega um lote diferente. */
    @Query(value = "SELECT * FROM outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED",
           nativeQuery = true)
    List<OutboxEntity> lockPendingBatch();
}
