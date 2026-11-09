package com.volthub.station.domain;

import java.math.BigDecimal;
import java.util.Objects;

/** Entidade de domínio pura: nenhuma anotação de framework, nenhum import de Spring ou JDBC. */
public record Station(
        String id,
        String name,
        String address,
        double latitude,
        double longitude,
        BigDecimal pricePerKwh,
        String imageUrl,
        BigDecimal rating,
        String openHours,
        String amenities
) {

    public Station {
        Objects.requireNonNull(id, "id");
        if (name == null || name.isBlank()) throw new DomainException("Nome da estação é obrigatório");
        if (pricePerKwh == null || pricePerKwh.signum() <= 0) throw new DomainException("Preço por kWh deve ser positivo");
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new DomainException("Coordenadas inválidas");
        if (imageUrl == null || imageUrl.isBlank()) imageUrl = "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=800&q=80";
        if (rating == null || rating.compareTo(BigDecimal.ZERO) < 0 || rating.compareTo(new BigDecimal("5.0")) > 0) rating = new BigDecimal("4.8");
        if (openHours == null || openHours.isBlank()) openHours = "24 horas";
        if (amenities == null || amenities.isBlank()) amenities = "WIFI,PARKING";
    }

    /** Construtor para compatibilidade com código existente sem metadados visuais. */
    public Station(String id, String name, String address, double latitude, double longitude, BigDecimal pricePerKwh) {
        this(id, name, address, latitude, longitude, pricePerKwh, null, null, null, null);
    }

    public Station withPrice(BigDecimal newPrice) {
        return new Station(id, name, address, latitude, longitude, newPrice, imageUrl, rating, openHours, amenities);
    }
}

