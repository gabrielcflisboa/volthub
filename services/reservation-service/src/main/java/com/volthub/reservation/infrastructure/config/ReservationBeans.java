package com.volthub.reservation.infrastructure.config;

import com.volthub.reservation.application.port.ChargerCatalog;
import com.volthub.reservation.application.port.ProcessedEvents;
import com.volthub.reservation.application.port.ReservationRepository;
import com.volthub.reservation.application.port.UnitOfWork;
import com.volthub.reservation.application.usecase.ChargingSagaHandler;
import com.volthub.reservation.application.usecase.ExpireReservations;
import com.volthub.reservation.application.usecase.ReservationCommands;
import com.volthub.reservation.application.usecase.ReservationQueries;
import com.volthub.reservation.domain.service.BookingPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.Clock;
import java.time.Duration;

/** Frameworks & Drivers: monta os casos de uso com os adapters concretos. */
@Configuration
@EnableScheduling
public class ReservationBeans {

    private static final Logger log = LoggerFactory.getLogger(ReservationBeans.class);

    @Bean Clock clock() { return Clock.systemUTC(); }

    @Bean BookingPolicy bookingPolicy() { return new BookingPolicy(); }

    @Bean
    ReservationCommands reservationCommands(ReservationRepository repo, ChargerCatalog catalog, BookingPolicy policy,
                                            UnitOfWork uow, Clock clock, @Value("${volthub.reservation.hold-minutes}") long hold) {
        return new ReservationCommands(repo, catalog, policy, uow, clock, Duration.ofMinutes(hold));
    }

    @Bean ReservationQueries reservationQueries(ReservationRepository repo) { return new ReservationQueries(repo); }

    @Bean
    ChargingSagaHandler chargingSagaHandler(ReservationRepository repo, ProcessedEvents processed, UnitOfWork uow, Clock clock) {
        return new ChargingSagaHandler(repo, processed, uow, clock);
    }

    @Bean ExpireReservations expireReservations(ReservationRepository repo, UnitOfWork uow, Clock clock) {
        return new ExpireReservations(repo, uow, clock);
    }

    @Bean ExpirationJob expirationJob(ExpireReservations useCase) { return new ExpirationJob(useCase); }

    static class ExpirationJob {
        private final ExpireReservations useCase;
        ExpirationJob(ExpireReservations useCase) { this.useCase = useCase; }

        @Scheduled(fixedDelay = 15_000)
        void run() {
            int n = com.volthub.reservation.infrastructure.messaging.TraceContext.quietly(useCase::run);
            if (n > 0) log.info("{} reserva(s) expirada(s)", n);
        }
    }
}
