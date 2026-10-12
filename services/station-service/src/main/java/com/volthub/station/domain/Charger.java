package com.volthub.station.domain;

public record Charger(String id, String stationId, ConnectorType connector, int powerKw) {
    public Charger {
        if (id == null || id.isBlank()) throw new DomainException("Id do carregador é obrigatório");
        if (powerKw <= 0 || powerKw > 400) throw new DomainException("Potência deve estar entre 1 e 400 kW");
    }

    public boolean isFastCharger() {
        return powerKw >= 50;
    }
}
