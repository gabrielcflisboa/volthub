package com.volthub.reservation.infrastructure.messaging;

import com.volthub.reservation.infrastructure.persistence.OutboxEntity;
import com.volthub.reservation.infrastructure.persistence.OutboxJpa;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.TimeUnit;

/**
 * Relay do Transactional Outbox: lê o que foi gravado e ainda não publicado, envia ao Kafka e marca.
 * Garantia: "pelo menos uma vez". Se cair entre o envio e o UPDATE, a mensagem sai de novo,
 * por isso todo consumidor do VoltHub é idempotente (usa o eventId).
 */
@Component
public class OutboxRelay {

    private static final Logger log = LoggerFactory.getLogger(OutboxRelay.class);
    private final OutboxJpa outbox;
    private final KafkaTemplate<String, String> kafka;
    private final TransactionTemplate tx;

    public OutboxRelay(OutboxJpa outbox, KafkaTemplate<String, String> kafka, TransactionTemplate tx) {
        this.outbox = outbox;
        this.kafka = kafka;
        this.tx = tx;
    }

    @Scheduled(fixedDelayString = "${volthub.outbox.poll-ms:500}")
    public void publishPending() {
        TraceContext.quietly(() -> tx.execute(status -> {
            for (OutboxEntity m : outbox.lockPendingBatch()) {
                if (!publish(m)) break;
            }
            return null;
        }));
    }

    private boolean publish(OutboxEntity m) {
        boolean[] ok = {false};
        // O envio ao Kafka continua o trace da requisição que gerou o evento
        TraceContext.continueTrace(m.traceparent, () -> {
            try {
                ProducerRecord<String, String> record = new ProducerRecord<>(m.topic, m.messageKey, m.payload);
                record.headers().add("eventType", m.eventType.getBytes(StandardCharsets.UTF_8));
                kafka.send(record).get(5, TimeUnit.SECONDS);
                m.publishedAt = Instant.now();
                ok[0] = true;
                log.info("Outbox publicado: {} -> {}", m.eventType, m.topic);
            } catch (Exception e) {
                log.warn("Falha ao publicar {} (tenta de novo no próximo ciclo): {}", m.id, e.getMessage());
            }
        });
        return ok[0];
    }
}
