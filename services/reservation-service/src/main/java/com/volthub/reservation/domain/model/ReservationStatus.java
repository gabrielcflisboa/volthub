package com.volthub.reservation.domain.model;

/**
 *  CONFIRMED ──start──▶ (aguarda o carregador) ──session-started──▶ IN_PROGRESS ──session-ended──▶ COMPLETED
 *      │                                                                                        
 *      ├──cancel / falha no carregador──▶ CANCELLED
 *      └──passou do prazo──────────────▶ EXPIRED
 */
public enum ReservationStatus {
    CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, EXPIRED;

    public boolean isActive() { return this == CONFIRMED || this == IN_PROGRESS; }
}
