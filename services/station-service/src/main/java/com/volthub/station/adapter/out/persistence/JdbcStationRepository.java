package com.volthub.station.adapter.out.persistence;

import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.domain.Charger;
import com.volthub.station.domain.Station;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/** Adapter de saída (driven): implementa o port com JDBC puro. */
@Repository
public class JdbcStationRepository implements StationRepository {

    private static final RowMapper<Station> STATION = (rs, i) -> {
        String imageUrl = null;
        BigDecimal rating = null;
        String openHours = null;
        String amenities = null;
        try { imageUrl = rs.getString("image_url"); } catch (Exception ignored) {}
        try { rating = rs.getBigDecimal("rating"); } catch (Exception ignored) {}
        try { openHours = rs.getString("open_hours"); } catch (Exception ignored) {}
        try { amenities = rs.getString("amenities"); } catch (Exception ignored) {}
        return new Station(
                rs.getString("id"), rs.getString("name"), rs.getString("address"),
                rs.getDouble("latitude"), rs.getDouble("longitude"), rs.getBigDecimal("price_per_kwh"),
                imageUrl, rating, openHours, amenities);
    };

    private final JdbcTemplate jdbc;

    public JdbcStationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Station save(Station s) {
        jdbc.update("""
                INSERT INTO stations (id, name, address, latitude, longitude, price_per_kwh, image_url, rating, open_hours, amenities)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address,
                  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, price_per_kwh = EXCLUDED.price_per_kwh,
                  image_url = EXCLUDED.image_url, rating = EXCLUDED.rating, open_hours = EXCLUDED.open_hours,
                  amenities = EXCLUDED.amenities
                """, s.id(), s.name(), s.address(), s.latitude(), s.longitude(), s.pricePerKwh(),
                s.imageUrl(), s.rating(), s.openHours(), s.amenities());
        return s;
    }

    @Override
    public Optional<Station> findById(String id) {
        return jdbc.query("SELECT * FROM stations WHERE id = ?", STATION, id).stream().findFirst();
    }

    @Override
    public List<Station> findAll() {
        return jdbc.query("SELECT * FROM stations ORDER BY name", STATION);
    }

    @Override
    public Charger saveCharger(Charger c) {
        jdbc.update("INSERT INTO chargers (id, station_id, connector, power_kw) VALUES (?, ?, ?, ?)",
                c.id(), c.stationId(), c.connector().name(), c.powerKw());
        return c;
    }

    @Override
    public boolean chargerExists(String chargerId) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM chargers WHERE id = ?", Integer.class, chargerId);
        return n != null && n > 0;
    }

}
