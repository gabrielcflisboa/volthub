package com.volthub.reservation.infrastructure.persistence;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

/** Modelo de persistência (JPA). Fica separado do agregado para o domínio não depender do Hibernate. */
@Entity
@Table(name = "reservations")
public class ReservationEntity {
    @Id public String id;
    @Column(name = "driver_id") public String driverId;
    @Column(name = "charger_id") public String chargerId;
    @Column(name = "station_id") public String stationId;
    public String status;
    @Column(name = "starts_at") public Instant startsAt;
    @Column(name = "expires_at") public Instant expiresAt;
    @Column(name = "start_requested") public boolean startRequested;
    @Column(name = "session_id") public String sessionId;
    @Column(name = "energy_kwh") public BigDecimal energyKwh;
    @Column(name = "cancel_reason") public String cancelReason;
    @Column(name = "updated_at") public Instant updatedAt;
    @Version public long version;
}
