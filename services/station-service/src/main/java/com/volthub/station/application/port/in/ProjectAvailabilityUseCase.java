package com.volthub.station.application.port.in;

import com.volthub.station.domain.ChargerStatus;

import java.time.Instant;

/** Port de entrada acionado por eventos (Kafka): mantém o read model atualizado. */
public interface ProjectAvailabilityUseCase {

    void onPhysicalStatus(String chargerId, ChargerStatus status, Instant occurredAt);

    void onReservationActive(String chargerId, String reservationId);

    void onReservationClosed(String chargerId, String reservationId);
}
