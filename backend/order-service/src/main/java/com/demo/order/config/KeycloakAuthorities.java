package com.demo.order.config;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Reads Keycloak's `realm_access.roles` JWT claim into Spring
 * GrantedAuthority objects (ROLE_ prefixed). Shared with product-service's
 * identically-named helper so both services enforce identical permissions
 * (requirement #9) from the identical token claim.
 */
public final class KeycloakAuthorities {

    private KeycloakAuthorities() {}

    @SuppressWarnings("unchecked")
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
