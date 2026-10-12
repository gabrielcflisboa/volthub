package com.volthub.reservation.application.port;

import java.util.function.Supplier;

/** Transação como port: a camada de aplicação não importa @Transactional do Spring. */
public interface UnitOfWork {
    <T> T inTransaction(Supplier<T> work);

    default void inTransaction(Runnable work) {
        inTransaction(() -> { work.run(); return null; });
    }
}
