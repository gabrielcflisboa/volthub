package com.volthub.reservation.infrastructure.persistence;

import com.volthub.reservation.application.port.UnitOfWork;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

@Component
public class SpringUnitOfWork implements UnitOfWork {

    private final TransactionTemplate tx;

    public SpringUnitOfWork(TransactionTemplate tx) {
        this.tx = tx;
    }

    @Override
    public <T> T inTransaction(Supplier<T> work) {
        return tx.execute(status -> work.get());
    }
}
