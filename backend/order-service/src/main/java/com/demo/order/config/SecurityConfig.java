package com.demo.order.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableReactiveMethodSecurity;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.ReactiveJwtAuthenticationConverterAdapter;
import org.springframework.security.web.server.SecurityWebFilterChain;

/**
 * Validates the Keycloak-issued JWT on every request (Bearer token that was
 * refreshed client-side by shared-auth/authClient.js) and maps Keycloak
 * "realm_access.roles" into Spring GrantedAuthority objects (prefixed with
 * ROLE_) so that @PreAuthorize("hasRole('order:write')") works on the
 * GraphQL controller methods — this is how GraphQL-level permissions are
 * enforced per field/mutation (requirement #9).
 */
@Configuration
@EnableWebFluxSecurity
@EnableReactiveMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain filterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .authorizeExchange(ex -> ex
                        // Browsers never send an Authorization header on a CORS
                        // preflight OPTIONS request. Without this, Spring
                        // Security rejects the preflight with 401 before it
                        // ever reaches spring.graphql.cors's CORS handling —
                        // the browser then reports the whole request as a
                        // CORS error (a blocked/malformed preflight looks like
                        // a CORS failure client-side), even though the real
                        // problem is Security, not CORS config.
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers("/graphiql", "/graphiql/**", "/actuator/**").permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .build();
    }

    private ReactiveJwtAuthenticationConverterAdapter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(KeycloakAuthorities::fromJwt);
        return new ReactiveJwtAuthenticationConverterAdapter(converter);
    }
}
