package com.volthub.station.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/** Contrato REST gerado a partir do código: /v3/api-docs (JSON) e /swagger-ui.html. */
@Configuration
@OpenAPIDefinition(
        info = @Info(title = "VoltHub station-service", version = "v1", description = "Estações, carregadores e disponibilidade (read model CQRS). Token emitido pelo Keycloak (realm volthub)."),
        security = @SecurityRequirement(name = "bearer"))
@SecurityScheme(name = "bearer", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
