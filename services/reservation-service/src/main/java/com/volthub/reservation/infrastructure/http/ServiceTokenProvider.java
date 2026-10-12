package com.volthub.reservation.infrastructure.http;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.time.Instant;

/**
 * OAuth2 Client Credentials (M2M): o reservation-service se autentica no Keycloak com o próprio
 * client_id/secret (que vêm de variável de ambiente, nunca do código) e guarda o token até perto de vencer.
 */
@Component
public class ServiceTokenProvider {

    private final RestClient http = RestClient.create();
    private final String tokenUri;
    private final String clientId;
    private final String clientSecret;
    private volatile String token;
    private volatile Instant expiresAt = Instant.EPOCH;

    public ServiceTokenProvider(@Value("${volthub.oidc.token-uri}") String tokenUri,
                                @Value("${volthub.oidc.client-id}") String clientId,
                                @Value("${volthub.oidc.client-secret}") String clientSecret) {
        this.tokenUri = tokenUri;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public synchronized String token() {
        if (token == null || Instant.now().isAfter(expiresAt.minusSeconds(30))) {
            var form = new LinkedMultiValueMap<String, String>();
            form.add("grant_type", "client_credentials");
            form.add("client_id", clientId);
            form.add("client_secret", clientSecret);
            JsonNode body = http.post().uri(tokenUri).contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(JsonNode.class);
            token = body.path("access_token").asText();
            expiresAt = Instant.now().plusSeconds(body.path("expires_in").asLong(60));
        }
        return token;
    }
}
