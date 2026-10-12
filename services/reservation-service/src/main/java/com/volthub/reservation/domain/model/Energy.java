package com.volthub.reservation.domain.model;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Value Object: energia entregue, em kWh, com 3 casas. */
public record Energy(BigDecimal kwh) {
    public static final Energy ZERO = new Energy(BigDecimal.ZERO);
    public Energy {
        if (kwh == null || kwh.signum() < 0) throw new DomainException("Energia não pode ser negativa");
        kwh = kwh.setScale(3, RoundingMode.HALF_UP);
    }
    public static Energy ofKwh(double v) { return new Energy(BigDecimal.valueOf(v)); }
}
