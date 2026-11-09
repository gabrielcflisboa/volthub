package com.volthub.station;

import com.volthub.station.application.port.in.QueryAvailabilityUseCase.StationView;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.application.service.AvailabilityQueryService;
import com.volthub.station.domain.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class AvailabilityQueryServiceTest {

    static class InMemoryStations implements StationRepository {
        final Map<String, Station> stations = new HashMap<>();
        public Station save(Station s) { stations.put(s.id(), s); return s; }
        public Optional<Station> findById(String id) { return Optional.ofNullable(stations.get(id)); }
        public List<Station> findAll() { return new ArrayList<>(stations.values()); }
        public Charger saveCharger(Charger c) { return c; }
        public boolean chargerExists(String id) { return false; }
    }

    static class DummyReadModel implements AvailabilityReadModel {
        final Map<String, List<ChargerAvailability>> byStation = new HashMap<>();
        public void upsertCharger(Station s, Charger c) {}
        public void refreshStation(Station s) {}
        public boolean applyPhysicalStatus(String id, ChargerStatus st, Instant at) { return true; }
        public void setActiveReservation(String c, String r) {}
        public void clearActiveReservation(String c, String r) {}
        public Optional<ChargerAvailability> find(String id) { return Optional.empty(); }
        public List<ChargerAvailability> findByStation(String id) {
            return byStation.getOrDefault(id, List.of());
        }
    }

    final InMemoryStations repo = new InMemoryStations();
    final DummyReadModel readModel = new DummyReadModel();
    final AvailabilityQueryService service = new AvailabilityQueryService(repo, readModel);

    @Test
    void buscaEstacaoPorIdComSucesso() {
        Station s = new Station("savassi", "VoltHub Savassi", "Praça Diogo", -19.93, -43.93, new BigDecimal("2.19"),
                "https://image.url", new BigDecimal("4.9"), "24 horas", "WIFI,CAFE");
        repo.save(s);

        StationView view = service.getStation("savassi");
        assertNotNull(view);
        assertEquals("VoltHub Savassi", view.station().name());
        assertEquals(new BigDecimal("4.9"), view.station().rating());
        assertEquals("WIFI,CAFE", view.station().amenities());
    }

    @Test
    void buscaEstacaoInexistenteLancaNotFoundException() {
        assertThrows(NotFoundException.class, () -> service.getStation("nao-existe"));
    }
}
