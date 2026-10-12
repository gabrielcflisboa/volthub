package com.volthub.station.application.service;

import com.volthub.station.application.port.in.QueryAvailabilityUseCase;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.domain.ChargerAvailability;
import com.volthub.station.domain.NotFoundException;

import java.math.BigDecimal;
import java.util.List;

public class AvailabilityQueryService implements QueryAvailabilityUseCase {

    private final StationRepository stations;
    private final AvailabilityReadModel readModel;

    public AvailabilityQueryService(StationRepository stations, AvailabilityReadModel readModel) {
        this.stations = stations;
        this.readModel = readModel;
    }

    @Override
    public List<StationView> listStations() {
        return stations.findAll().stream()
                .map(s -> new StationView(s, readModel.findByStation(s.id())))
                .toList();
    }

    @Override
    public ChargerAvailability getCharger(String chargerId) {
        return readModel.find(chargerId)
                .orElseThrow(() -> new NotFoundException("Carregador não encontrado: " + chargerId));
    }

    @Override
    public BigDecimal tariffOf(String stationId) {
        return stations.findById(stationId)
                .orElseThrow(() -> new NotFoundException("Estação não encontrada: " + stationId))
                .pricePerKwh();
    }
}
