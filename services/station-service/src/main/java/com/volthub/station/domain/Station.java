package com.volthub.station.domain;

import java.math.BigDecimal;
import java.util.Objects;

/** Entidade de domínio pura: nenhuma anotação de framework, nenhum import de Spring ou JDBC. */
public record Station(String id, String name, String address, double latitude, double longitude, BigDecimal pricePerKwh) {

    public Station {
        Objects.requireNonNull(id, "id");
        if (name == null || name.isBlank()) throw new DomainException("Nome da estação é obrigatório");
        if (pricePerKwh == null || pricePerKwh.signum() <= 0) throw new DomainException("Preço por kWh deve ser positivo");
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new DomainException("Coordenadas inválidas");
    }

    public Station withPrice(BigDecimal newPrice) {
        return new Station(id, name, address, latitude, longitude, newPrice);
    }
}
