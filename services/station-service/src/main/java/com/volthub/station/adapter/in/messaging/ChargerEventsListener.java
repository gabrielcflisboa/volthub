package com.volthub.station.adapter.in.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.station.application.port.in.ProjectAvailabilityUseCase;
import com.volthub.station.domain.ChargerStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Adapter de entrada orientado a eventos. Os eventos chegam no envelope padrão do VoltHub:
 * { eventId, eventType, occurredAt, source, data: {...} }  (ver docs/asyncapi.yaml)
 */
@Component
public class ChargerEventsListener {

    private static final Logger log = LoggerFactory.getLogger(ChargerEventsListener.class);
    private final ProjectAvailabilityUseCase projection;
    private final ObjectMapper mapper;

    public ChargerEventsListener(ProjectAvailabilityUseCase projection, ObjectMapper mapper) {
        this.projection = projection;
        this.mapper = mapper;
    }

    @KafkaListener(topics = "volthub.charger.status", groupId = "station-service")
    public void onChargerStatus(String message) throws Exception {
        JsonNode event = mapper.readTree(message);
        JsonNode data = event.path("data");
        String chargerId = data.path("chargerId").asText();
        ChargerStatus status = ChargerStatus.valueOf(data.path("status").asText());
        Instant occurredAt = Instant.parse(event.path("occurredAt").asText());
        log.info("Status físico {} -> {}", chargerId, status);
        projection.onPhysicalStatus(chargerId, status, occurredAt);
    }

    @KafkaListener(topics = "volthub.reservations", groupId = "station-service")
    public void onReservation(String message) throws Exception {
        JsonNode event = mapper.readTree(message);
        JsonNode data = event.path("data");
        String chargerId = data.path("chargerId").asText();
        String reservationId = data.path("reservationId").asText();
        switch (event.path("eventType").asText()) {
            case "reservation.confirmed" -> projection.onReservationActive(chargerId, reservationId);
            case "reservation.cancelled", "reservation.expired", "reservation.completed" ->
                    projection.onReservationClosed(chargerId, reservationId);
            default -> { /* outros eventos não afetam a disponibilidade */ }
        }
    }
}
