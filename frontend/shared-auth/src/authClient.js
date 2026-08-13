import Keycloak from "keycloak-js";
import { config } from "./config";

/**
 * Requirements #3, #4, #5:
 *  - Keycloak login (Authorization Code + PKCE)
 *  - Regular refresh-token cycle, token used as the single source of truth
 *    for authentication across every micro-frontend (this module is loaded
 *    ONCE, as a Module Federation "shared" singleton, so shell / mfe-products
 *    / mfe-orders all read the same in-memory token — no separate logins).
 *  - Logout URL + change-password URL.
 *
 * Any remote can do:
 *   import { authClient } from "@demo/shared-auth";
 *   await authClient.init();
 *   const token = authClient.getToken();
 */
class AuthClient {
  constructor() {
    this.keycloak = new Keycloak({
      url: config.keycloakUrl,
      realm: config.keycloakRealm,
      clientId: config.keycloakClientId,
    });
    this._refreshTimer = null;
    this._listeners = new Set();
    this._initialized = false;
    this._initPromise = null;
  }

  /** Idempotent — safe to call from every micro-frontend's bootstrap. */
  init() {
    if (this._initPromise) return this._initPromise;

    this._initPromise = this.keycloak
      .init({
        onLoad: "login-required",
        pkceMethod: "S256",
        checkLoginIframe: false,
        silentCheckSsoRedirectUri:
          window.location.origin + "/silent-check-sso.html",
      })
      .then((authenticated) => {
        this._initialized = true;
        if (authenticated) {
          this._startAutoRefresh();
        }
        return authenticated;
      });

    return this._initPromise;
  }

  /**
   * Refreshes the access token proactively, well before expiry, and keeps
   * doing so for the life of the session — this is the "regularly refresh
   * the token" requirement. 30s poll, refresh if <70s of validity remain.
   */
  _startAutoRefresh() {
    if (this._refreshTimer) return;
    this._refreshTimer = setInterval(() => {
      this.keycloak
        .updateToken(70)
        .then((refreshed) => {
          if (refreshed) {
            this._notify(this.keycloak.token);
          }
        })
        .catch(() => {
          // Refresh token itself expired / invalid -> force re-login
          this.keycloak.login();
        });
    }, 30_000);

    // Also hook the library's own callback for immediate refresh attempts.
    this.keycloak.onTokenExpired = () => {
      this.keycloak.updateToken(70).catch(() => this.keycloak.login());
    };
  }

  /** Subscribe to token refresh events (e.g. to re-inject into Apollo Client links). */
  onTokenRefresh(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify(token) {
    this._listeners.forEach((cb) => cb(token));
  }

  getToken() {
    return this.keycloak.token;
  }

  getUsername() {
    return this.keycloak.tokenParsed?.preferred_username;
  }

  hasRole(role) {
    return !!this.keycloak.tokenParsed?.realm_access?.roles?.includes(role);
  }

  /** Ensures the token has at least `minValiditySeconds` left, refreshing if needed. */
  async ensureFreshToken(minValiditySeconds = 30) {
    try {
      await this.keycloak.updateToken(minValiditySeconds);
    } catch {
      this.keycloak.login();
    }
    return this.keycloak.token;
  }

  // Requirement #5: logout URL
  logout(redirectUri = window.location.origin) {
    if (this._refreshTimer) {
      clearInterval(this._refreshTimer);
      this._refreshTimer = null;
    }
    return this.keycloak.logout({ redirectUri });
  }

  // Requirement #5: change-password URL (Keycloak Account Console, deep-linked
  // to the "Signing in" / password tab).
  changePasswordUrl() {
    return `${config.keycloakUrl}/realms/${config.keycloakRealm}/account/#/security/signing-in`;
  }

  changePassword() {
    window.location.href = this.changePasswordUrl();
  }

  accountManagementUrl() {
    return this.keycloak.createAccountUrl();
  }
}

export const authClient = new AuthClient();
