package com.volthub.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.volthub.gateway.telemetry.TelemetryTranslator;
import com.volthub.gateway.telemetry.TelemetryTranslator.InvalidTelemetryException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class TelemetryTranslatorTest {

    final TelemetryTranslator t = new TelemetryTranslator(new ObjectMapper());

    @Test
    void traduzStatusParaEventoDeIntegracao() {
        var msg = t.translate("volthub/chargers/BH-SAV-01/status", """
                {"status":"FAULTED","ts":"2026-10-20T19:00:00Z"}""".getBytes());
        assertEquals("volthub.charger.status", msg.topic());
        assertEquals("BH-SAV-01", msg.key());
        assertEquals("charger.status-changed", msg.eventType());
        assertEquals("FAULTED", ((Map<?, ?>) msg.envelope().get("data")).get("status"));
    }

    @Test
    void sessaoEncerradaLevaEnergia() {
        var msg = t.translate("volthub/chargers/BH-SAV-01/session", """
                {"type":"ENDED","sessionId":"s1","reservationId":"r1","energyKwh":12.3}""".getBytes());
        assertEquals("charging.session-ended", msg.eventType());
        assertEquals(12.3, ((Map<?, ?>) msg.envelope().get("data")).get("energyKwh"));
    }

    @Test
    void rejeitaPayloadInvalido() {
        assertThrows(InvalidTelemetryException.class,
                () -> t.translate("volthub/chargers/X/status", "{\"status\":\"QUEBRADO\"}".getBytes()));
        assertThrows(InvalidTelemetryException.class,
                () -> t.translate("volthub/chargers/X/meter", "{\"sessionId\":\"s\",\"energyKwh\":-1,\"powerKw\":1}".getBytes()));
        assertThrows(InvalidTelemetryException.class,
                () -> t.translate("volthub/chargers/X/status", "não é json".getBytes()));
    }
}
