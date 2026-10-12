package com.volthub.reservation.infrastructure.web;

import com.volthub.reservation.application.usecase.ReservationCommands;
import com.volthub.reservation.application.usecase.ReservationQueries;
import com.volthub.reservation.domain.model.Reservation;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Controller fino: extrai o motorista do JWT e delega para os casos de uso. */
@RestController
@RequestMapping("/v1/reservations")
public class ReservationController {

    private final ReservationCommands commands;
    private final ReservationQueries queries;

    public ReservationController(ReservationCommands commands, ReservationQueries queries) {
        this.commands = commands;
        this.queries = queries;
    }

    public record CreateRequest(@NotBlank String chargerId) {}

    public record ReservationResponse(String id, String chargerId, String stationId, String status,
                                      Instant startsAt, Instant expiresAt, boolean startRequested,
                                      String sessionId, BigDecimal energyKwh, String cancelReason) {
        static ReservationResponse of(Reservation r) {
            return new ReservationResponse(r.id().value(), r.charger().chargerId(), r.charger().stationId(),
                    r.status().name(), r.hold().startsAt(), r.hold().expiresAt(), r.startRequested(), r.sessionId(),
                    r.energy().kwh(), r.cancelReason() == null ? null : r.cancelReason().name());
        }
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReservationResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateRequest req) {
        return ReservationResponse.of(commands.create(new ReservationCommands.CreateReservation(jwt.getSubject(), req.chargerId())));
    }

    @PostMapping("/{id}/start")
    public ReservationResponse start(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return ReservationResponse.of(commands.start(id, jwt.getSubject()));
    }

    @PostMapping("/{id}/cancel")
    public ReservationResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        return ReservationResponse.of(commands.cancel(id, jwt.getSubject()));
    }

    @GetMapping("/me")
    public List<ReservationResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        return queries.mine(jwt.getSubject()).stream().map(ReservationResponse::of).toList();
    }

    @GetMapping("/{id}")
    public ReservationResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable String id) {
        boolean operator = jwt.getClaimAsMap("realm_access") != null
                && String.valueOf(jwt.getClaimAsMap("realm_access").get("roles")).contains("operator");
        return ReservationResponse.of(queries.get(id, jwt.getSubject(), operator));
    }
}
