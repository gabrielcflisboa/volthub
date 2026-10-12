package com.volthub.reservation.infrastructure.messaging;

import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;
import io.opentelemetry.api.trace.TraceFlags;
import io.opentelemetry.api.trace.TraceState;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.Scope;
import io.opentelemetry.context.propagation.TextMapGetter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/** Utilitários de propagação de contexto de trace (W3C Trace Context). */
public final class TraceContext {

    private TraceContext() { }

    /** traceparent do span atual, para gravar junto com o evento no outbox. */
    public static String currentTraceparent() {
        Map<String, String> carrier = new HashMap<>();
        GlobalOpenTelemetry.getPropagators().getTextMapPropagator().inject(Context.current(), carrier, Map::put);
        return carrier.get("traceparent");
    }

    /** Executa o trabalho como continuação do trace que gerou o evento. */
    public static void continueTrace(String traceparent, Runnable work) {
        if (traceparent == null) { work.run(); return; }
        Context parent = GlobalOpenTelemetry.getPropagators().getTextMapPropagator()
                .extract(Context.root(), Map.of("traceparent", traceparent), GETTER);
        try (Scope ignored = parent.makeCurrent()) {
            work.run();
        }
    }

    /**
     * Polling (outbox, jobs) roda num contexto NÃO amostrado: os SELECTs a cada 500 ms não viram
     * milhares de traces inúteis no Tempo. Só o que de fato é publicado aparece (no trace de origem).
     */
    public static <T> T quietly(Supplier<T> work) {
        String traceId = UUID.randomUUID().toString().replace("-", "");
        String spanId = traceId.substring(0, 16);
        SpanContext unsampled = SpanContext.create(traceId, spanId, TraceFlags.getDefault(), TraceState.getDefault());
        try (Scope ignored = Context.root().with(Span.wrap(unsampled)).makeCurrent()) {
            return work.get();
        }
    }

    private static final TextMapGetter<Map<String, String>> GETTER = new TextMapGetter<>() {
        @Override public Iterable<String> keys(Map<String, String> carrier) { return carrier.keySet(); }
        @Override public String get(Map<String, String> carrier, String key) { return carrier == null ? null : carrier.get(key); }
    };
}
