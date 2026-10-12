package com.volthub.station;

import com.volthub.station.application.port.in.ManageStationsUseCase.AddChargerCommand;
import com.volthub.station.application.port.in.ManageStationsUseCase.RegisterStationCommand;
import com.volthub.station.application.port.out.AvailabilityReadModel;
import com.volthub.station.application.port.out.StationRepository;
import com.volthub.station.application.service.StationCommandService;
import com.volthub.station.domain.*;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/** Os ports permitem testar o caso de uso com adapters em memória. */
class StationCommandServiceTest {

    static class InMemoryStations implements StationRepository {
        final Map<String, Station> stations = new HashMap<>();
        final Map<String, Charger> chargers = new HashMap<>();
        public Station save(Station s) { stations.put(s.id(), s); return s; }
        public Optional<Station> findById(String id) { return Optional.ofNullable(stations.get(id)); }
        public List<Station> findAll() { return new ArrayList<>(stations.values()); }
        public Charger saveCharger(Charger c) { chargers.put(c.id(), c); return c; }
        public boolean chargerExists(String id) { return chargers.containsKey(id); }
    }

    static class RecordingReadModel implements AvailabilityReadModel {
        final List<String> upserts = new ArrayList<>();
        public void upsertCharger(Station s, Charger c) { upserts.add(c.id()); }
        public void refreshStation(Station s) {}
        public boolean applyPhysicalStatus(String id, ChargerStatus st, Instant at) { return true; }
        public void setActiveReservation(String c, String r) {}
        public void clearActiveReservation(String c, String r) {}
        public Optional<ChargerAvailability> find(String id) { return Optional.empty(); }
        public List<ChargerAvailability> findByStation(String id) { return List.of(); }
    }

    final InMemoryStations repo = new InMemoryStations();
    final RecordingReadModel readModel = new RecordingReadModel();
    final StationCommandService service = new StationCommandService(repo, readModel);

    @Test
    void registraEstacaoComIdLegivel() {
        Station s = service.registerStation(new RegisterStationCommand("VoltHub Lourdes Ótica", "Rua X", -19.9, -43.9, new BigDecimal("1.99")));
        assertEquals("volthub-lourdes-otica", s.id());
    }

    @Test
    void adicionarCarregadorAtualizaOReadModel() {
        service.registerStation(new RegisterStationCommand("Centro", "Rua Y", -19.9, -43.9, new BigDecimal("1.50")));
        service.addCharger(new AddChargerCommand("centro", "BH-CEN-01", ConnectorType.CCS2, 60));
        assertEquals(List.of("BH-CEN-01"), readModel.upserts);
    }

    @Test
    void naoPermiteCarregadorDuplicado() {
        service.registerStation(new RegisterStationCommand("Centro", "Rua Y", -19.9, -43.9, new BigDecimal("1.50")));
        service.addCharger(new AddChargerCommand("centro", "BH-CEN-01", ConnectorType.CCS2, 60));
        assertThrows(DomainException.class,
                () -> service.addCharger(new AddChargerCommand("centro", "BH-CEN-01", ConnectorType.TYPE2, 22)));
    }
}
