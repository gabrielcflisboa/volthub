package com.volthub.reservation.domain.model;

/**
 * Value Object: referência a um carregador de OUTRO bounded context (Estações).
 * Aqui "carregador" é só um id + a estação a que pertence; potência, preço e conector
 * pertencem ao contexto de Estações e não são copiados para cá.
 */
public record ChargerRef(String chargerId, String stationId) {
    public ChargerRef {
        if (chargerId == null || chargerId.isBlank()) throw new DomainException("Carregador é obrigatório");
        if (stationId == null || stationId.isBlank()) throw new DomainException("Estação é obrigatória");
    }
}
