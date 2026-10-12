package com.volthub.reservation.infrastructure.persistence;

import com.volthub.reservation.application.port.ProcessedEvents;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JdbcProcessedEvents implements ProcessedEvents {

    private final JdbcTemplate jdbc;

    public JdbcProcessedEvents(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean firstTime(String eventId, String consumer) {
        return jdbc.update("INSERT INTO processed_events (event_id, consumer) VALUES (?, ?) ON CONFLICT DO NOTHING",
                eventId, consumer) == 1;
    }
}
