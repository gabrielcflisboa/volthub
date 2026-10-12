package com.volthub.station.adapter.in.web;

import com.volthub.station.application.port.in.ManageStationsUseCase;
import com.volthub.station.application.port.in.ManageStationsUseCase.AddChargerCommand;
import com.volthub.station.application.port.in.ManageStationsUseCase.RegisterStationCommand;
import com.volthub.station.application.port.in.QueryAvailabilityUseCase;
import com.volthub.station.domain.Charger;
import com.volthub.station.domain.ChargerAvailability;
import com.volthub.station.domain.ConnectorType;
import com.volthub.station.domain.Station;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Adapter de entrada (driving): traduz HTTP para chamadas nos ports de entrada. Versionado em /v1. */
@RestController
@RequestMapping("/v1")
public class StationController {

    private final ManageStationsUseCase commands;
    private final QueryAvailabilityUseCase queries;

    public StationController(ManageStationsUseCase commands, QueryAvailabilityUseCase queries) {
        this.commands = commands;
        this.queries = queries;
    }

    // ───────────── Queries ─────────────

    @GetMapping("/stations")
    public List<StationResponse> list() {
        return queries.listStations().stream().map(StationResponse::of).toList();
    }

    @GetMapping("/chargers/{chargerId}")
    public ChargerResponse charger(@PathVariable String chargerId) {
        return ChargerResponse.of(queries.getCharger(chargerId));
    }

    @GetMapping("/stations/{stationId}/tariff")
    public Map<String, Object> tariff(@PathVariable String stationId) {
        return Map.of("stationId", stationId, "pricePerKwh", queries.tariffOf(stationId), "currency", "BRL");
    }

    // ───────────── Commands (operador) ─────────────

    public record RegisterStationRequest(@NotBlank String name, String address,
                                         @Min(-90) @Max(90) double latitude, @Min(-180) @Max(180) double longitude,
                                         @NotNull @DecimalMin("0.01") BigDecimal pricePerKwh) {}

    public record AddChargerRequest(@NotBlank String chargerId, @NotNull ConnectorType connector, @Min(1) @Max(400) int powerKw) {}

    public record ChangePriceRequest(@NotNull @DecimalMin("0.01") BigDecimal pricePerKwh) {}

    @PostMapping("/stations")
    @ResponseStatus(HttpStatus.CREATED)
    public Station register(@Valid @RequestBody RegisterStationRequest r) {
        return commands.registerStation(new RegisterStationCommand(r.name(), r.address(), r.latitude(), r.longitude(), r.pricePerKwh()));
    }

    @PostMapping("/stations/{stationId}/chargers")
    @ResponseStatus(HttpStatus.CREATED)
    public Charger addCharger(@PathVariable String stationId, @Valid @RequestBody AddChargerRequest r) {
        return commands.addCharger(new AddChargerCommand(stationId, r.chargerId(), r.connector(), r.powerKw()));
    }

    @PutMapping("/stations/{stationId}/price")
    public Station changePrice(@PathVariable String stationId, @Valid @RequestBody ChangePriceRequest r) {
        return commands.changePrice(stationId, r.pricePerKwh());
    }

    // ───────────── DTOs de resposta ─────────────

    public record ChargerResponse(String chargerId, String stationId, String stationName, String connector,
                                  int powerKw, BigDecimal pricePerKwh, String status, String activeReservationId) {
        static ChargerResponse of(ChargerAvailability a) {
            return new ChargerResponse(a.chargerId(), a.stationId(), a.stationName(), a.connector().name(),
                    a.powerKw(), a.pricePerKwh(), a.status().name(), a.activeReservationId());
        }
    }

    public record StationResponse(String id, String name, String address, double latitude, double longitude,
                                  BigDecimal pricePerKwh, long availableChargers, List<ChargerResponse> chargers) {
        static StationResponse of(QueryAvailabilityUseCase.StationView v) {
            Station s = v.station();
            List<ChargerResponse> chargers = v.chargers().stream().map(ChargerResponse::of).toList();
            long available = chargers.stream().filter(c -> c.status().equals("AVAILABLE")).count();
            return new StationResponse(s.id(), s.name(), s.address(), s.latitude(), s.longitude(), s.pricePerKwh(), available, chargers);
        }
    }
}
