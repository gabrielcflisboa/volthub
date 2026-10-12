package com.volthub.station.application.port.in;

import com.volthub.station.domain.ChargerAvailability;
import com.volthub.station.domain.Station;

import java.math.BigDecimal;
import java.util.List;

/** Port de entrada — lado de CONSULTA do CQRS. Só lê o read model, sem regra de negócio. */
public interface QueryAvailabilityUseCase {

    record StationView(Station station, List<ChargerAvailability> chargers) {}

    List<StationView> listStations();

    ChargerAvailability getCharger(String chargerId);

    BigDecimal tariffOf(String stationId);
}
