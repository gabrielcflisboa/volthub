package com.volthub.reservation.infrastructure.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.reservation.application.usecase.ChargingSagaHandler;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/** Adapter de entrada: eventos de outros contextos (vindos do iot-gateway) acionam a saga. */
@Component
public class IntegrationEventsListener {

    private final ChargingSagaHandler saga;
    private final ObjectMapper mapper;

    public IntegrationEventsListener(ChargingSagaHandler saga, ObjectMapper mapper) {
        this.saga = saga;
        this.mapper = mapper;
    }

    @KafkaListener(topics = "volthub.charging.sessions", groupId = "reservation-service")
    public void onSession(String message) throws Exception {
        JsonNode e = mapper.readTree(message);
        JsonNode d = e.path("data");
        String eventId = e.path("eventId").asText();
        switch (e.path("eventType").asText()) {
            case "charging.session-started" ->
                    saga.onSessionStarted(eventId, d.path("reservationId").asText(null), d.path("sessionId").asText());
            case "charging.session-ended" ->
                    saga.onSessionEnded(eventId, d.path("reservationId").asText(null), d.path("energyKwh").decimalValue());
            default -> { }
        }
    }

    @KafkaListener(topics = "volthub.charger.status", groupId = "reservation-service")
    public void onChargerStatus(String message) throws Exception {
        JsonNode e = mapper.readTree(message);
        JsonNode d = e.path("data");
        saga.onChargerStatus(e.path("eventId").asText(), d.path("chargerId").asText(), d.path("status").asText());
    }
}
