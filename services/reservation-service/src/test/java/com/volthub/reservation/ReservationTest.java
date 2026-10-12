package com.volthub.reservation;

import com.volthub.reservation.domain.event.*;
import com.volthub.reservation.domain.model.*;
import com.volthub.reservation.domain.service.BookingPolicy;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

/** Regras do Aggregate Root, sem Spring, sem banco, sem Kafka. */
class ReservationTest {

    final Instant t0 = Instant.parse("2026-10-20T19:00:00Z");
    final DriverId ana = new DriverId("ana");
    final ChargerRef sav01 = new ChargerRef("BH-SAV-01", "volthub-savassi");
    final BookingPolicy policy = new BookingPolicy();

    Reservation nova() {
        Reservation r = policy.book(ana, sav01, new BookingPolicy.Facts(true, false, false), t0, Duration.ofMinutes(10));
        r.pullEvents();
        return r;
    }

    @Test
    void reservaNasceConfirmadaEPublicaEvento() {
        Reservation r = policy.book(ana, sav01, new BookingPolicy.Facts(true, false, false), t0, Duration.ofMinutes(10));
        assertEquals(ReservationStatus.CONFIRMED, r.status());
        assertInstanceOf(ReservationConfirmed.class, r.pullEvents().getFirst());
    }

    @Test
    void naoReservaCarregadorOcupadoNemMotoristaComReservaAtiva() {
        assertThrows(DomainException.class, () ->
                policy.book(ana, sav01, new BookingPolicy.Facts(false, false, false), t0, Duration.ofMinutes(10)));
        assertThrows(DomainException.class, () ->
                policy.book(ana, sav01, new BookingPolicy.Facts(true, true, false), t0, Duration.ofMinutes(10)));
    }

    @Test
    void cicloCompletoDaRecarga() {
        Reservation r = nova();
        r.requestStart(ana, t0.plusSeconds(60));
        assertInstanceOf(ChargingStartRequested.class, r.pullEvents().getFirst());
        r.markInProgress("sess-1", t0.plusSeconds(70));
        r.complete(Energy.ofKwh(12.5), t0.plusSeconds(900));
        assertEquals(ReservationStatus.COMPLETED, r.status());
        assertEquals("12.500", r.energy().kwh().toPlainString());
    }

    @Test
    void iniciarDuasVezesNaoGeraDoisComandos() {
        Reservation r = nova();
        r.requestStart(ana, t0.plusSeconds(60));
        r.requestStart(ana, t0.plusSeconds(61));
        assertEquals(1, r.pullEvents().size());
    }

    @Test
    void outroMotoristaNaoMexeNaReserva() {
        Reservation r = nova();
        assertThrows(Reservation.NotOwnerException.class, () -> r.cancelByDriver(new DriverId("bruno"), t0));
    }

    @Test
    void naoIniciaReservaExpirada() {
        Reservation r = nova();
        assertThrows(DomainException.class, () -> r.requestStart(ana, t0.plus(Duration.ofMinutes(11))));
        assertTrue(r.expireIfOverdue(t0.plus(Duration.ofMinutes(11))));
        assertEquals(ReservationStatus.EXPIRED, r.status());
    }

    @Test
    void compensacaoPorFalhaSoAntesDeComecar() {
        Reservation r = nova();
        assertTrue(r.cancelDueToChargerFault(t0.plusSeconds(30)));
        assertEquals(CancelReason.CHARGER_FAULT, r.cancelReason());

        Reservation emAndamento = nova();
        emAndamento.markInProgress("s", t0.plusSeconds(10));
        assertFalse(emAndamento.cancelDueToChargerFault(t0.plusSeconds(30)));
    }

    @Test
    void eventoDeSessaoRepetidoEhIgnorado() {
        Reservation r = nova();
        r.markInProgress("s1", t0.plusSeconds(10));
        r.markInProgress("s1", t0.plusSeconds(11));
        assertEquals(1, r.pullEvents().size());
    }
}
