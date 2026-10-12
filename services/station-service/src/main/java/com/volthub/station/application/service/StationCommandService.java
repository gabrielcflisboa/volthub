package com.volthub.station.application.service;

import com.volthub.station.application.port.in.ManageStationsUseCase;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.domain.Charger;
import com.volthub.station.domain.DomainException;
import com.volthub.station.domain.NotFoundException;
import com.volthub.station.domain.Station;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.Locale;

/** Núcleo da aplicação: só conhece ports. Spring entra apenas na config (StationBeans). */
public class StationCommandService implements ManageStationsUseCase {

    private final StationRepository stations;
    private final AvailabilityReadModel readModel;

    public StationCommandService(StationRepository stations, AvailabilityReadModel readModel) {
        this.stations = stations;
        this.readModel = readModel;
    }

    @Override
    public Station registerStation(RegisterStationCommand c) {
        Station station = new Station(slug(c.name()), c.name(), c.address(), c.latitude(), c.longitude(), c.pricePerKwh());
        if (stations.findById(station.id()).isPresent()) {
            throw new DomainException("Já existe uma estação com o id " + station.id());
        }
        return stations.save(station);
    }

    @Override
    public Charger addCharger(AddChargerCommand c) {
        Station station = stations.findById(c.stationId())
                .orElseThrow(() -> new NotFoundException("Estação não encontrada: " + c.stationId()));
        if (stations.chargerExists(c.chargerId())) {
            throw new DomainException("Carregador já cadastrado: " + c.chargerId());
        }
        Charger charger = stations.saveCharger(new Charger(c.chargerId(), station.id(), c.connector(), c.powerKw()));
        readModel.upsertCharger(station, charger);
        return charger;
    }

    @Override
    public Station changePrice(String stationId, BigDecimal newPrice) {
        Station station = stations.findById(stationId)
                .orElseThrow(() -> new NotFoundException("Estação não encontrada: " + stationId));
        Station updated = stations.save(station.withPrice(newPrice));
        readModel.refreshStation(updated);
        return updated;
    }

    static String slug(String name) {
        String n = Normalizer.normalize(name, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
    }
}
