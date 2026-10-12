package com.volthub.reservation.domain.model;

import java.time.Duration;
import java.time.Instant;

/** Value Object: janela em que o carregador fica segurado para o motorista chegar. */
public record HoldPeriod(Instant startsAt, Instant expiresAt) {
    public HoldPeriod {
        if (!expiresAt.isAfter(startsAt)) throw new DomainException("A reserva precisa expirar depois de começar");
        if (Duration.between(startsAt, expiresAt).toMinutes() > 60) throw new DomainException("Reserva de no máximo 60 minutos");
    }
    public static HoldPeriod of(Instant now, Duration hold) { return new HoldPeriod(now, now.plus(hold)); }
    public boolean isOver(Instant now) { return !now.isBefore(expiresAt); }
}
