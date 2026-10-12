package com.volthub.gateway.telemetry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Anti-Corruption Layer: o formato do carregador (MQTT, pensado para hardware) não vaza para dentro
 * do sistema. Aqui ele é validado e traduzido para o evento de integração do VoltHub.
 * Classe pura, sem Spring: testável isoladamente.
 */
public class TelemetryTranslator {

    public static final String STATUS_TOPIC = "volthub.charger.status";
    public static final String SESSIONS_TOPIC = "volthub.charging.sessions";
    public static final String METER_TOPIC = "volthub.charging.meter";

    private static final Set<String> STATUSES = Set.of("AVAILABLE", "CHARGING", "FAULTED", "OFFLINE");

    public record KafkaMessage(String topic, String key, String eventType, Map<String, Object> envelope) {}

    public static class InvalidTelemetryException extends RuntimeException {
        public InvalidTelemetryException(String m) { super(m); }
    }

    private final ObjectMapper mapper;

    public TelemetryTranslator(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** mqttTopic = volthub/chargers/{chargerId}/{status|session|meter} */
    public KafkaMessage translate(String mqttTopic, byte[] payload) {
        String[] parts = mqttTopic.split("/");
        if (parts.length != 4 || !parts[0].equals("volthub") || !parts[1].equals("chargers"))
            throw new InvalidTelemetryException("Tópico MQTT fora do padrão: " + mqttTopic);
        String chargerId = parts[2];
        JsonNode body;
        try {
            body = mapper.readTree(payload);
        } catch (Exception e) {
            throw new InvalidTelemetryException("Payload não é JSON válido");
        }
        Instant ts = parseTs(body);
        return switch (parts[3]) {
            case "status" -> {
                String status = required(body, "status");
                if (!STATUSES.contains(status)) throw new InvalidTelemetryException("Status desconhecido: " + status);
                yield message(STATUS_TOPIC, chargerId, "charger.status-changed", ts,
                        data("chargerId", chargerId, "status", status));
            }
            case "session" -> {
                String type = required(body, "type");
                String sessionId = required(body, "sessionId");
                Map<String, Object> d = data("chargerId", chargerId, "sessionId", sessionId,
                        "reservationId", body.path("reservationId").asText(null),
                        "driverId", body.path("driverId").asText(null));
                yield switch (type) {
                    case "STARTED" -> message(SESSIONS_TOPIC, chargerId, "charging.session-started", ts, d);
                    case "ENDED" -> {
                        d.put("energyKwh", nonNegative(body, "energyKwh"));
                        d.put("reason", body.path("reason").asText("COMPLETED"));
                        yield message(SESSIONS_TOPIC, chargerId, "charging.session-ended", ts, d);
                    }
                    default -> throw new InvalidTelemetryException("Tipo de sessão desconhecido: " + type);
                };
            }
            case "meter" -> message(METER_TOPIC, chargerId, "charging.meter-values", ts,
                    data("chargerId", chargerId, "sessionId", required(body, "sessionId"),
                         "energyKwh", nonNegative(body, "energyKwh"), "powerKw", nonNegative(body, "powerKw")));
            default -> throw new InvalidTelemetryException("Canal MQTT desconhecido: " + parts[3]);
        };
    }

    private KafkaMessage message(String topic, String key, String type, Instant ts, Map<String, Object> data) {
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", UUID.randomUUID().toString());
        envelope.put("eventType", type);
        envelope.put("occurredAt", ts.toString());
        envelope.put("source", "iot-gateway");
        envelope.put("data", data);
        return new KafkaMessage(topic, key, type, envelope);
    }

    private static String required(JsonNode body, String field) {
        String v = body.path(field).asText(null);
        if (v == null || v.isBlank()) throw new InvalidTelemetryException("Campo obrigatório ausente: " + field);
        return v;
    }

    private static double nonNegative(JsonNode body, String field) {
        JsonNode n = body.path(field);
        if (!n.isNumber() || n.asDouble() < 0) throw new InvalidTelemetryException("Campo numérico inválido: " + field);
        return n.asDouble();
    }

    private static Instant parseTs(JsonNode body) {
        try {
            return body.hasNonNull("ts") ? Instant.parse(body.get("ts").asText()) : Instant.now();
        } catch (Exception e) {
            throw new InvalidTelemetryException("Timestamp inválido");
        }
    }

    private static Map<String, Object> data(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }
}
