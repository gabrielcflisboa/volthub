package com.volthub.gateway.mqtt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.gateway.telemetry.TelemetryTranslator;
import com.volthub.gateway.telemetry.TelemetryTranslator.InvalidTelemetryException;
import com.volthub.gateway.telemetry.TelemetryTranslator.KafkaMessage;
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lado MQTT → Kafka. Os carregadores falam MQTT (leve, feito para dispositivo com rede instável);
 * os serviços falam Kafka (durável, com replay e consumer groups). O gateway é a fronteira entre os dois.
 */
@Component
public class MqttBridge implements MqttCallbackExtended {

    private static final Logger log = LoggerFactory.getLogger(MqttBridge.class);
    public static final String INBOUND = "volthub/chargers/+/+";
    public static final String DLQ_TOPIC = "volthub.telemetry.dlq";

    private final String brokerUrl;
    private final KafkaTemplate<String, String> kafka;
    private final TelemetryTranslator translator;
    private final ObjectMapper mapper;
    private final Tracer tracer = GlobalOpenTelemetry.getTracer("volthub.iot-gateway");
    private final LongCounter received = GlobalOpenTelemetry.getMeter("volthub.iot-gateway")
            .counterBuilder("volthub.mqtt.messages").setDescription("Mensagens MQTT recebidas dos carregadores").build();
    private MqttClient client;

    public MqttBridge(@Value("${volthub.mqtt.url}") String brokerUrl, KafkaTemplate<String, String> kafka, ObjectMapper mapper) {
        this.brokerUrl = brokerUrl;
        this.kafka = kafka;
        this.mapper = mapper;
        this.translator = new TelemetryTranslator(mapper);
    }

    @PostConstruct
    void connect() throws MqttException {
        client = new MqttClient(brokerUrl, "iot-gateway", new MemoryPersistence());
        client.setCallback(this);
        MqttConnectOptions options = new MqttConnectOptions();
        options.setAutomaticReconnect(true);
        options.setCleanSession(false); // sessão persistente: QoS 1 não se perde enquanto o gateway reinicia
        options.setConnectionTimeout(10);
        connectWithRetry(options);
    }

    private void connectWithRetry(MqttConnectOptions options) throws MqttException {
        for (int attempt = 1; ; attempt++) {
            try {
                client.connect(options);
                return;
            } catch (MqttException e) {
                if (attempt >= 30) throw e;
                log.warn("Broker MQTT indisponível ({}), tentativa {}", e.getMessage(), attempt);
                try { Thread.sleep(2000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); return; }
            }
        }
    }

    @Override
    public void connectComplete(boolean reconnect, String serverURI) {
        try {
            client.subscribe(INBOUND, 1);
            log.info("Conectado ao MQTT {} (reconexão={}), assinando {}", serverURI, reconnect, INBOUND);
        } catch (MqttException e) {
            log.error("Falha ao assinar {}", INBOUND, e);
        }
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        if (topic.endsWith("/commands")) return; // comandos são o caminho de volta, publicados por nós mesmos
        String channel = topic.substring(topic.lastIndexOf('/') + 1);
        Span span = tracer.spanBuilder("mqtt receive " + channel).setSpanKind(SpanKind.CONSUMER)
                .setAttribute("messaging.system", "mqtt").setAttribute("messaging.destination.name", topic).startSpan();
        try (Scope ignored = span.makeCurrent()) {
            KafkaMessage msg = translator.translate(topic, message.getPayload());
            kafka.send(msg.topic(), msg.key(), mapper.writeValueAsString(msg.envelope()));
            received.add(1, Attributes.of(AttributeKey.stringKey("channel"), channel, AttributeKey.stringKey("result"), "ok"));
            if (!"meter".equals(channel)) log.info("MQTT {} → Kafka {} ({})", topic, msg.topic(), msg.eventType());
        } catch (InvalidTelemetryException e) {
            span.setStatus(StatusCode.ERROR, e.getMessage());
            received.add(1, Attributes.of(AttributeKey.stringKey("channel"), channel, AttributeKey.stringKey("result"), "dlq"));
            sendToDlq(topic, message.getPayload(), e.getMessage());
        } catch (Exception e) {
            span.recordException(e);
            log.error("Erro inesperado processando {}", topic, e);
        } finally {
            span.end();
        }
    }

    /** Dead Letter Queue: mensagem inválida não trava o fluxo e não some — vai para análise. */
    private void sendToDlq(String topic, byte[] payload, String reason) {
        try {
            Map<String, Object> dlq = new LinkedHashMap<>();
            dlq.put("mqttTopic", topic);
            dlq.put("reason", reason);
            dlq.put("payload", new String(payload, StandardCharsets.UTF_8));
            kafka.send(DLQ_TOPIC, topic, mapper.writeValueAsString(dlq));
            log.warn("Telemetria inválida enviada para DLQ: {} ({})", topic, reason);
        } catch (Exception e) {
            log.error("Falha ao enviar para DLQ", e);
        }
    }

    /** Lado Kafka → MQTT: entrega um comando a um carregador específico. */
    public void publishCommand(String chargerId, byte[] payload) throws MqttException {
        MqttMessage msg = new MqttMessage(payload);
        msg.setQos(1);
        client.publish("volthub/chargers/" + chargerId + "/commands", msg);
    }

    @Override
    public void connectionLost(Throwable cause) {
        log.warn("Conexão MQTT perdida: {} (reconectando automaticamente)", cause.getMessage());
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) { }

    @PreDestroy
    void close() throws MqttException {
        if (client != null && client.isConnected()) client.disconnect();
    }
}
