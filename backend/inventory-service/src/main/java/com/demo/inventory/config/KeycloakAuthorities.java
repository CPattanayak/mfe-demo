package com.demo.inventory.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Reads Keycloak's `realm_access.roles` JWT claim into Spring
 * GrantedAuthority objects (ROLE_ prefixed).
 *
 * A plain static method + method reference, NOT an anonymous
 * JwtGrantedAuthoritiesConverter subclass or lambda assigned to that type:
 * org.springframework.security.oauth2.server.resource.authentication.
 * JwtGrantedAuthoritiesConverter is a concrete CLASS in Spring Security,
 * not a functional interface, so a lambda can't target it directly
 * ("X is not a functional interface"). JwtAuthenticationConverter.
 * setJwtGrantedAuthoritiesConverter(...) actually accepts a
 * Converter&lt;Jwt, Collection&lt;GrantedAuthority&gt;&gt; — which this
 * method reference satisfies fine — see SecurityConfig.
 */
public final class KeycloakAuthorities {

    private KeycloakAuthorities() {}

    public static List<GrantedAuthority> fromJwt(Jwt jwt) {
        Map<String, Object> realmAccess = jwt.getClaim("realm_access");
        if (realmAccess == null || !(realmAccess.get("roles") instanceof List<?> roles)) {
            return List.of();
        }
        return roles.stream()
                .map(Object::toString)
                .map(role -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toUnmodifiableList());
    }
}
