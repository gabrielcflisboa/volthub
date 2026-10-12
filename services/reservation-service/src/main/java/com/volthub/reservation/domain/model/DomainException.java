package com.volthub.reservation.domain.model;

/** Violação de regra de negócio (vira 409/422 na borda HTTP). */
public class DomainException extends RuntimeException {
    public DomainException(String message) { super(message); }
}
