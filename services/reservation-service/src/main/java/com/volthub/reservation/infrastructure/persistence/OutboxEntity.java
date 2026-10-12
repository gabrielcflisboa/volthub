package com.volthub.reservation.infrastructure.persistence;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "outbox")
public class OutboxEntity {
    @Id public UUID id;
    public String topic;
    @Column(name = "message_key") public String messageKey;
    @Column(name = "event_type") public String eventType;
    @Column(columnDefinition = "text") public String payload;
    @Column(name = "created_at") public Instant createdAt;
    @Column(name = "published_at") public Instant publishedAt;
    public String traceparent;
}
