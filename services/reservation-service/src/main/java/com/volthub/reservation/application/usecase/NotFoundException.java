package com.volthub.reservation.application.usecase;

public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
