package com.volthub.station.application.port.in;

import com.volthub.station.domain.Charger;
import com.volthub.station.domain.ConnectorType;
import com.volthub.station.domain.Station;

import java.math.BigDecimal;

/** Port de entrada (driving) — lado de COMANDO do CQRS. */
public interface ManageStationsUseCase {

    record RegisterStationCommand(String name, String address, double latitude, double longitude, BigDecimal pricePerKwh) {}

    record AddChargerCommand(String stationId, String chargerId, ConnectorType connector, int powerKw) {}

    Station registerStation(RegisterStationCommand command);

    Charger addCharger(AddChargerCommand command);

    Station changePrice(String stationId, BigDecimal newPrice);
}
