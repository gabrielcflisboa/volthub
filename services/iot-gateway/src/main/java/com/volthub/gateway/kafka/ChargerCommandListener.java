package com.volthub.gateway.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.gateway.mqtt.MqttBridge;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/** Kafka → MQTT: comandos de negócio (RESERVE, START, RELEASE) viram mensagens para o hardware. */
@Component
public class ChargerCommandListener {

    private static final Logger log = LoggerFactory.getLogger(ChargerCommandListener.class);
    private final MqttBridge mqtt;
    private final ObjectMapper mapper;

    public ChargerCommandListener(MqttBridge mqtt, ObjectMapper mapper) {
        this.mqtt = mqtt;
        this.mapper = mapper;
    }

    @KafkaListener(topics = "volthub.charger.commands", groupId = "iot-gateway")
    public void onCommand(String message) throws Exception {
        JsonNode event = mapper.readTree(message);
        JsonNode d = event.path("data");
        String chargerId = d.path("chargerId").asText();
        // Formato enxuto para o dispositivo: só o que ele precisa saber
        Map<String, Object> cmd = new LinkedHashMap<>();
        cmd.put("command", d.path("command").asText());
        cmd.put("reservationId", d.path("reservationId").asText(null));
        cmd.put("driverId", d.path("driverId").asText(null));
        cmd.put("commandId", event.path("eventId").asText());
        mqtt.publishCommand(chargerId, mapper.writeValueAsBytes(cmd));
        log.info("Kafka → MQTT: {} para {}", cmd.get("command"), chargerId);
    }
}
