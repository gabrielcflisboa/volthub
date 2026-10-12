package com.volthub.station.application.port.out;

import com.volthub.station.domain.Charger;
import com.volthub.station.domain.Station;

import java.util.List;
import java.util.Optional;

/** Port de saída (driven) do modelo de escrita. */
public interface StationRepository {
    Station save(Station station);
    Optional<Station> findById(String id);
    List<Station> findAll();
    Charger saveCharger(Charger charger);
    boolean chargerExists(String chargerId);
}
