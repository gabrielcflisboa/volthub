package com.volthub.station.adapter.out.persistence;

import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.domain.Charger;
import com.volthub.station.domain.ChargerAvailability;
import com.volthub.station.domain.ChargerStatus;
import com.volthub.station.domain.ConnectorType;
import com.volthub.station.domain.Station;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcAvailabilityReadModel implements AvailabilityReadModel {

    private static final RowMapper<ChargerAvailability> ROW = (rs, i) -> new ChargerAvailability(
            rs.getString("charger_id"), rs.getString("station_id"), rs.getString("station_name"),
            ConnectorType.valueOf(rs.getString("connector")), rs.getInt("power_kw"), rs.getBigDecimal("price_per_kwh"),
            ChargerStatus.valueOf(rs.getString("physical_status")), rs.getString("active_reservation_id"),
            ChargerStatus.valueOf(rs.getString("status")), rs.getTimestamp("updated_at").toInstant());

    private final JdbcTemplate jdbc;

    public JdbcAvailabilityReadModel(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void upsertCharger(Station s, Charger c) {
        jdbc.update("""
                INSERT INTO charger_availability (charger_id, station_id, station_name, connector, power_kw, price_per_kwh)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (charger_id) DO NOTHING
                """, c.id(), s.id(), s.name(), c.connector().name(), c.powerKw(), s.pricePerKwh());
    }

    @Override
    public void refreshStation(Station s) {
        jdbc.update("UPDATE charger_availability SET station_name = ?, price_per_kwh = ?, updated_at = now() WHERE station_id = ?",
                s.name(), s.pricePerKwh(), s.id());
    }

    @Override
    @Transactional
    public boolean applyPhysicalStatus(String chargerId, ChargerStatus status, Instant occurredAt) {
        Optional<ChargerAvailability> current = findForUpdate(chargerId);
        if (current.isEmpty()) return false;
        int updated = jdbc.update("""
                UPDATE charger_availability
                   SET physical_status = ?, last_status_at = ?, updated_at = now()
                 WHERE charger_id = ? AND (last_status_at IS NULL OR last_status_at <= ?)
                """, status.name(), Timestamp.from(occurredAt), chargerId, Timestamp.from(occurredAt));
        recompute(chargerId);
        return updated > 0;
    }

    @Override
    @Transactional
    public void setActiveReservation(String chargerId, String reservationId) {
        jdbc.update("UPDATE charger_availability SET active_reservation_id = ?, updated_at = now() WHERE charger_id = ?",
                reservationId, chargerId);
        recompute(chargerId);
    }

    @Override
    @Transactional
    public void clearActiveReservation(String chargerId, String reservationId) {
        // Só limpa se a reserva que encerrou é a que está marcada (idempotente e seguro contra eventos fora de ordem)
        jdbc.update("""
                UPDATE charger_availability SET active_reservation_id = NULL, updated_at = now()
                 WHERE charger_id = ? AND active_reservation_id = ?
                """, chargerId, reservationId);
        recompute(chargerId);
    }

    private void recompute(String chargerId) {
        findForUpdate(chargerId).ifPresent(a -> {
            ChargerStatus effective = ChargerStatus.effective(a.physicalStatus(), a.activeReservationId() != null);
            jdbc.update("UPDATE charger_availability SET status = ? WHERE charger_id = ?", effective.name(), chargerId);
        });
    }

    private Optional<ChargerAvailability> findForUpdate(String chargerId) {
        return jdbc.query("SELECT * FROM charger_availability WHERE charger_id = ? FOR UPDATE", ROW, chargerId)
                .stream().findFirst();
    }

    @Override
    public Optional<ChargerAvailability> find(String chargerId) {
        return jdbc.query("SELECT * FROM charger_availability WHERE charger_id = ?", ROW, chargerId).stream().findFirst();
    }

    @Override
    public List<ChargerAvailability> findByStation(String stationId) {
        return jdbc.query("SELECT * FROM charger_availability WHERE station_id = ? ORDER BY charger_id", ROW, stationId);
    }
}
