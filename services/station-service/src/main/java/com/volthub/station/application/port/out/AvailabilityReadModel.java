package com.volthub.station.application.port.out;

import com.volthub.station.domain.Charger;
import com.volthub.station.domain.ChargerAvailability;
import com.volthub.station.domain.ChargerStatus;
import com.volthub.station.domain.Station;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

/** Port de saída do read model (projeção desnormalizada). */
public interface AvailabilityReadModel {
    void upsertCharger(Station station, Charger charger);
    void refreshStation(Station station);
    /** Retorna false se o evento é mais antigo que o último aplicado (fora de ordem / duplicado). */
    boolean applyPhysicalStatus(String chargerId, ChargerStatus status, Instant occurredAt);
    void setActiveReservation(String chargerId, String reservationId);
    void clearActiveReservation(String chargerId, String reservationId);
    Optional<ChargerAvailability> find(String chargerId);
    List<ChargerAvailability> findByStation(String stationId);
}
