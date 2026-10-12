package com.volthub.station.domain;

import java.math.BigDecimal;
import java.time.Instant;

/** Linha do read model: tudo que a tela precisa, já desnormalizado (sem JOIN na leitura). */
public record ChargerAvailability(
        String chargerId,
        String stationId,
        String stationName,
        ConnectorType connector,
        int powerKw,
        BigDecimal pricePerKwh,
        ChargerStatus physicalStatus,
        String activeReservationId,
        ChargerStatus status,
        Instant updatedAt) {
}
