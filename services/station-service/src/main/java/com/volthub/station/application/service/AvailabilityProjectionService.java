package com.volthub.station.application.service;

import com.volthub.station.application.port.in.ProjectAvailabilityUseCase;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.domain.ChargerStatus;

import java.time.Instant;
import java.util.logging.Logger;

public class AvailabilityProjectionService implements ProjectAvailabilityUseCase {

    private static final Logger log = Logger.getLogger(AvailabilityProjectionService.class.getName());
    private final AvailabilityReadModel readModel;

    public AvailabilityProjectionService(AvailabilityReadModel readModel) {
        this.readModel = readModel;
    }

    @Override
    public void onPhysicalStatus(String chargerId, ChargerStatus status, Instant occurredAt) {
        if (!readModel.applyPhysicalStatus(chargerId, status, occurredAt)) {
            log.info(() -> "Evento de status ignorado (antigo ou carregador desconhecido): " + chargerId);
        }
    }

    @Override
    public void onReservationActive(String chargerId, String reservationId) {
        readModel.setActiveReservation(chargerId, reservationId);
    }

    @Override
    public void onReservationClosed(String chargerId, String reservationId) {
        readModel.clearActiveReservation(chargerId, reservationId);
    }
}
