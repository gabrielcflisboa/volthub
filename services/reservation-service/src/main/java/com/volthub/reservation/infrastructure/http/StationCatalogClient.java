package com.volthub.reservation.infrastructure.http;

import com.volthub.reservation.application.port.ChargerCatalog;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Optional;

/**
 * Adapter REST para o station-service, protegido por Retry (só leitura, idempotente)
 * + Circuit Breaker + Timeout. Configuração em application.yml (resilience4j.*).
 */
@Component
public class StationCatalogClient implements ChargerCatalog {

    private final RestClient http;
    private final ServiceTokenProvider tokens;

    public StationCatalogClient(@Value("${volthub.station-service.url}") String baseUrl, ServiceTokenProvider tokens) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(1000);
        factory.setReadTimeout(2000); // Timeout: nunca esperar a rede para sempre
        this.http = RestClient.builder().baseUrl(baseUrl).requestFactory(factory).build();
        this.tokens = tokens;
    }

    @Override
    @CircuitBreaker(name = "station-service", fallbackMethod = "unavailable")
    @Retry(name = "station-service")
    public Optional<ChargerInfo> find(String chargerId) {
        try {
            ChargerInfo info = http.get().uri("/v1/chargers/{id}", chargerId)
                    .header("Authorization", "Bearer " + tokens.token())
                    .retrieve().body(ChargerInfo.class);
            return Optional.ofNullable(info);
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    @SuppressWarnings("unused")
    private Optional<ChargerInfo> unavailable(String chargerId, Throwable t) {
        if (t instanceof HttpClientErrorException.NotFound) return Optional.empty();
        throw new CatalogUnavailableException("Catálogo de estações indisponível, tente em instantes", t);
    }

}
