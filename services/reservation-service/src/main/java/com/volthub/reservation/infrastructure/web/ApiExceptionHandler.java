package com.volthub.reservation.infrastructure.web;

import com.volthub.reservation.application.port.ChargerCatalog;
import com.volthub.reservation.application.usecase.NotFoundException;
import com.volthub.reservation.domain.model.DomainException;
import com.volthub.reservation.domain.model.Reservation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;

import java.util.Map;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    /** Payload inválido (campo obrigatório em branco) → 400 Bad Request com a lista de violações. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail validation(MethodArgumentNotValidException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Payload inválido");
        pd.setProperty("violations", e.getBindingResult().getFieldErrors().stream()
                .map(f -> Map.of("field", f.getField(), "message", String.valueOf(f.getDefaultMessage())))
                .toList());
        return pd;
    }

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
