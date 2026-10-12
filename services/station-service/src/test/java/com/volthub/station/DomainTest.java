package com.volthub.station;

import com.volthub.station.domain.ChargerStatus;
import com.volthub.station.domain.DomainException;
import com.volthub.station.domain.Station;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/** Testes do domínio puro: rodam sem Spring, sem banco e sem Kafka (prova da regra de dependência). */
class DomainTest {

    @Test
    void statusFisicoTemPrioridadeSobreReserva() {
        assertEquals(ChargerStatus.FAULTED, ChargerStatus.effective(ChargerStatus.FAULTED, true));
        assertEquals(ChargerStatus.CHARGING, ChargerStatus.effective(ChargerStatus.CHARGING, true));
        assertEquals(ChargerStatus.RESERVED, ChargerStatus.effective(ChargerStatus.AVAILABLE, true));
        assertEquals(ChargerStatus.AVAILABLE, ChargerStatus.effective(ChargerStatus.AVAILABLE, false));
        assertEquals(ChargerStatus.OFFLINE, ChargerStatus.effective(null, false));
    }

    @Test
    void estacaoNaoAceitaPrecoZero() {
        assertThrows(DomainException.class,
                () -> new Station("x", "X", "rua", 0, 0, BigDecimal.ZERO));
    }
}
