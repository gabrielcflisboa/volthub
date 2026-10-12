package com.volthub.reservation.application.port;

import java.util.Optional;

/** Port para o contexto de Estações (implementado com REST + Circuit Breaker). */
public interface ChargerCatalog {

    record ChargerInfo(String chargerId, String stationId, String status) {
        public boolean isAvailable() { return "AVAILABLE".equals(status); }
    }

    Optional<ChargerInfo> find(String chargerId);

    class CatalogUnavailableException extends RuntimeException {
        public CatalogUnavailableException(String message, Throwable cause) { super(message, cause); }
    }
}
