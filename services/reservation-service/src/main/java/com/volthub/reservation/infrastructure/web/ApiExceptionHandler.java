package com.volthub.reservation.infrastructure.web;

import com.volthub.reservation.application.port.ChargerCatalog;
import com.volthub.reservation.application.usecase.NotFoundException;
import com.volthub.reservation.domain.model.DomainException;
import com.volthub.reservation.domain.model.Reservation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ProblemDetail notFound(NotFoundException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(Reservation.NotOwnerException.class)
    public ProblemDetail notOwner(Reservation.NotOwnerException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.getMessage());
    }

    /** Regra de negócio violada → 409 Conflict (ex.: reservar carregador ocupado, iniciar reserva expirada). */
    @ExceptionHandler(DomainException.class)
    public ProblemDetail conflict(DomainException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
    }

    /** Corrida entre duas requisições: o índice único parcial do banco barrou a segunda. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail race(DataIntegrityViolationException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Carregador ou motorista já possui reserva ativa");
    }

    @ExceptionHandler(ChargerCatalog.CatalogUnavailableException.class)
    public ProblemDetail unavailable(ChargerCatalog.CatalogUnavailableException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
    }
}
