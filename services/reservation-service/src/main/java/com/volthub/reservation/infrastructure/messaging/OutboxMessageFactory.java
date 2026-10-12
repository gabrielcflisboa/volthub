package com.volthub.reservation.infrastructure.messaging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.reservation.domain.event.*;
import com.volthub.reservation.infrastructure.persistence.OutboxEntity;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Traduz Domain Events em mensagens de integração (contrato público em docs/asyncapi.yaml).
 * Um evento de domínio pode gerar mais de uma mensagem: o fato (volthub.reservations)
 * e o comando para o carregador (volthub.charger.commands).
 */
@Component
public class OutboxMessageFactory {

    public static final String RESERVATIONS = "volthub.reservations";
    public static final String COMMANDS = "volthub.charger.commands";

    private final ObjectMapper mapper;
    /** Métrica de negócio: quantas reservas entraram em cada estado (confirmed, cancelled, expired…). */
    private final LongCounter lifecycle = GlobalOpenTelemetry.getMeter("volthub.reservation-service")
            .counterBuilder("volthub.reservations").setDescription("Eventos do ciclo de vida das reservas").build();

    public OutboxMessageFactory(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public List<OutboxEntity> toOutbox(DomainEvent event) {
        List<OutboxEntity> out = new ArrayList<>();
        String rid = event.reservationId().value();
        switch (event) {
            case ReservationConfirmed e -> {
                out.add(fact("reservation.confirmed", rid, e.occurredAt(), data(
                        "reservationId", rid, "driverId", e.driver().value(), "chargerId", e.charger().chargerId(),
                        "stationId", e.charger().stationId(), "expiresAt", e.expiresAt().toString())));
                out.add(command(e.charger().chargerId(), "RESERVE", rid, e.driver().value(), e.occurredAt()));
            }
            case ChargingStartRequested e -> {
                out.add(fact("reservation.start-requested", rid, e.occurredAt(), data(
                        "reservationId", rid, "driverId", e.driver().value(), "chargerId", e.charger().chargerId())));
                out.add(command(e.charger().chargerId(), "START", rid, e.driver().value(), e.occurredAt()));
            }
            case ReservationInProgress e -> out.add(fact("reservation.in-progress", rid, e.occurredAt(), data(
                    "reservationId", rid, "chargerId", e.charger().chargerId(), "sessionId", e.sessionId())));
            case ReservationCompleted e -> out.add(fact("reservation.completed", rid, e.occurredAt(), data(
                    "reservationId", rid, "driverId", e.driver().value(), "chargerId", e.charger().chargerId(),
                    "energyKwh", e.energy().kwh())));
            case ReservationCancelled e -> {
                out.add(fact("reservation.cancelled", rid, e.occurredAt(), data(
                        "reservationId", rid, "driverId", e.driver().value(), "chargerId", e.charger().chargerId(),
                        "reason", e.reason().name())));
                out.add(command(e.charger().chargerId(), "RELEASE", rid, e.driver().value(), e.occurredAt()));
            }
            case ReservationExpired e -> {
                out.add(fact("reservation.expired", rid, e.occurredAt(), data(
                        "reservationId", rid, "driverId", e.driver().value(), "chargerId", e.charger().chargerId())));
                out.add(command(e.charger().chargerId(), "RELEASE", rid, e.driver().value(), e.occurredAt()));
            }
        }
        return out;
    }

    private OutboxEntity fact(String type, String key, Instant at, Map<String, Object> data) {
        lifecycle.add(1, Attributes.of(AttributeKey.stringKey("event"), type.substring(type.indexOf('.') + 1)));
        return entity(RESERVATIONS, key, type, at, data);
    }

    private OutboxEntity command(String chargerId, String command, String reservationId, String driverId, Instant at) {
        return entity(COMMANDS, chargerId, "charger.command", at, data(
                "chargerId", chargerId, "command", command, "reservationId", reservationId, "driverId", driverId));
    }

    private OutboxEntity entity(String topic, String key, String type, Instant at, Map<String, Object> data) {
        UUID id = UUID.randomUUID();
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", id.toString());
        envelope.put("eventType", type);
        envelope.put("occurredAt", at.toString());
        envelope.put("source", "reservation-service");
        envelope.put("data", data);
        OutboxEntity e = new OutboxEntity();
        e.id = id;
        e.topic = topic;
        e.messageKey = key;
        e.eventType = type;
        e.createdAt = Instant.now();
        e.traceparent = TraceContext.currentTraceparent();
        try {
            e.payload = mapper.writeValueAsString(envelope);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
        return e;
    }

    private static Map<String, Object> data(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }
}
