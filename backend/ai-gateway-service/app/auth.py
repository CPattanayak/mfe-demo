"""
Same Keycloak realm, same JWT-based auth every other service in this
project already validates (see backend/*/config/SecurityConfig.java +
KeycloakAuthorities.java for the Java equivalent of everything here).

FastAPI's own dependency-injection system (Depends()) is what makes
this "permission-driven" per-route without repeating auth logic in
every handler — a route just declares
`user: TokenClaims = Depends(require_role("product:read"))` and FastAPI
resolves the whole chain (extract token -> validate signature -> check
role) before the handler body ever runs, the same conceptual shape as
@PreAuthorize("hasRole('product:read')") in the Java services, just
FastAPI's own idiom for it instead of Spring's.
"""

import time
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2AuthorizationCodeBearer
from jose import jwt
from pydantic import BaseModel

from app.config import settings

# OAuth2AuthorizationCodeBearer (not OAuth2PasswordBearer) specifically
# because it models the REAL login flow Keycloak uses (redirect to a
# login page, not posting a username/password directly to this
# service) — and because FastAPI's Swagger UI renders an "Authorize"
# button from this exact security scheme that redirects to
# authorizationUrl, satisfying the "expose swagger docs and
# authentication link via keycloak" requirement without any extra code
# beyond declaring this scheme and passing it to FastAPI() in main.py.
oauth2_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=f"{settings.keycloak_issuer}/protocol/openid-connect/auth",
    tokenUrl=f"{settings.keycloak_issuer}/protocol/openid-connect/token",
)


class TokenClaims(BaseModel):
    sub: str
    preferred_username: Optional[str] = None
    roles: list[str] = []


class _JwksCache:
    """
    Keycloak's JWKS (its public signing keys) rarely change — fetching
    it on every single request would mean an extra network round trip
    per request for no real benefit. Cached for 10 minutes, matching a
    reasonable balance between "don't hammer Keycloak" and "pick up a
    real key rotation within a bounded window" — this project doesn't
    rotate signing keys in normal operation, so this is a generous
    window, not a tight one.
    """

    def __init__(self):
        self._jwks: Optional[dict] = None
        self._fetched_at: float = 0
        self._ttl_seconds = 600

    async def get(self) -> dict:
        now = time.time()
        if self._jwks is None or (now - self._fetched_at) > self._ttl_seconds:
            async with httpx.AsyncClient() as client:
                # Deliberately keycloak_internal_url here, NOT
                # keycloak_issuer — this HTTP call happens server-side,
                # from inside this container. "localhost" would resolve
                # to this container itself, not the keycloak one. See
                # config.py's comment for the full explanation.
                resp = await client.get(
                    f"{settings.keycloak_internal_url}/protocol/openid-connect/certs"
                )
                resp.raise_for_status()
                self._jwks = resp.json()
                self._fetched_at = now
        return self._jwks


_jwks_cache = _JwksCache()


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenClaims:
    jwks = await _jwks_cache.get()
    try:
        unverified_header = jwt.get_unverified_header(token)
        key = next(
            (k for k in jwks["keys"] if k["kid"] == unverified_header["kid"]), None
        )
        if key is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unknown signing key",
            )
        payload = jwt.decode(
            token,
            key,
            algorithms=[key.get("alg", "RS256")],
            audience=settings.keycloak_client_id,
            issuer=settings.keycloak_issuer,
            # Keycloak access tokens commonly carry "account" as one of
            # several audiences alongside the actual client id — same
            # multi-audience shape the Java services' JWT validation
            # already tolerates.
            options={"verify_aud": False},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc

    # realm_access.roles — the EXACT same claim path
    # KeycloakAuthorities.java already reads on every other service.
    roles = payload.get("realm_access", {}).get("roles", [])
    return TokenClaims(
        sub=payload["sub"],
        preferred_username=payload.get("preferred_username"),
        roles=roles,
    )


def require_role(role: str):
    """
    Usage: Depends(require_role("product:read")) — the FastAPI
    dependency-injection equivalent of
    @PreAuthorize("hasRole('product:read')"). A route with no
    matching role gets a clean 403, same as the Java services do,
    before the handler body ever runs.
    """

    async def _check(user: TokenClaims = Depends(get_current_user)) -> TokenClaims:
        if role not in user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required role: {role}",
            )
        return user

    return _check
