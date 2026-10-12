package com.volthub.station.domain;

/**
 * Status que o motorista enxerga. Combina o status físico (enviado pelo carregador via MQTT)
 * com o status de negócio (existe uma reserva ativa para ele?).
 */
public enum ChargerStatus {
    AVAILABLE, RESERVED, CHARGING, FAULTED, OFFLINE;

    /** Status físico tem prioridade: carregador com defeito não fica "reservado". */
    public static ChargerStatus effective(ChargerStatus physical, boolean hasActiveReservation) {
        if (physical == null) return OFFLINE;
        return switch (physical) {
            case FAULTED, OFFLINE, CHARGING -> physical;
            default -> hasActiveReservation ? RESERVED : AVAILABLE;
        };
    }
}
