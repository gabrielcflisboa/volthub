package com.volthub.reservation.domain.model;

/** Value Object: o "sub" do token do Keycloak. O domínio não sabe o que é JWT, só que existe um motorista. */
public record DriverId(String value) {
    public DriverId {
        if (value == null || value.isBlank()) throw new DomainException("Motorista é obrigatório");
    }
    @Override public String toString() { return value; }
}
