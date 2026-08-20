/**
 * Requirement: config.js for different environments.
 *
 * One source of truth for every environment-specific URL. Each app's
 * webpack.config.js injects `process.env.APP_ENV` via webpack.DefinePlugin
 * at BUILD time (see "APP_ENV" in shell/mfe-products/mfe-orders
 * webpack.config.js), so the compiled QA bundle only ever contains QA
 * URLs, the prod bundle only prod URLs, etc. — nothing is decided at
 * runtime in the browser, and no other environment's config leaks into a
 * given build.
 *
 * `graphqlUrl` is ONE endpoint, not two: with Apollo Federation (see
 * backend/*\/config/FederationConfig.java + infra/hive-gateway/), all
 * four subgraphs compose into a single supergraph schema served through
 * Hive Gateway (an Apollo-Federation-compatible gateway — not Apollo's
 * own Router binary; see infra/hive-gateway/gateway.config.ts for why).
 * mfe-products and mfe-orders both read this same field; there's no
 * separate productGraphqlUrl/orderGraphqlUrl split.
 *
 * No separate application gateway service: in local dev, this points
 * directly at Hive Gateway's own port (:4000, same default port Apollo
 * Router also used — no URL change needed when migrating between the
 * two). In qa/production, cdn/nginx.conf reverse-proxies BOTH /graphql
 * (to Hive Gateway) and /realms/** (to
 * Keycloak) on the SAME origin as the UI itself — so graphqlUrl is a
 * relative path (resolves against whatever host actually served the
 * page, via HttpLink's normal relative-URI handling) and keycloakUrl
 * reads window.location.origin at runtime rather than a hardcoded
 * domain. This was a real bug earlier: hardcoding a separate
 * "qa.example.com"/"qa-auth.example.com"-style absolute URL only works
 * if that's really where the app is deployed — a relative/origin-based
 * value works on ANY hostname QA or production actually ends up on,
 * without needing to know or rebuild for that hostname in advance
 * (useful since Kubernetes/Ingress hostnames are usually decided at
 * deploy time, not at container-build time).
 *
 * Add a new environment by adding a key here and passing
 * APP_ENV=<name> when building (see cdn/Dockerfile, docker-compose*.yml).
 */
const currentOrigin = typeof window !== "undefined" ? window.location.origin : undefined;

const ENVIRONMENTS = {
  local: {
    name: "local",
    keycloakUrl: "http://localhost:8080",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    // Directly to Hive Gateway — no nginx proxy in front of it in local
    // dev, so this can't be relative (there's no single origin shared
    // with a proxy to resolve it against).
    graphqlUrl: "/graphql",
  },
  qa: {
    name: "qa",
    // Falls back to a placeholder only if window isn't available (e.g.
    // server-side tooling) — in the browser this is always the real
    // deployed origin, whatever it actually is.
    keycloakUrl: currentOrigin || "https://qa.example.com",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    graphqlUrl: "/graphql",
  },
  production: {
    name: "production",
    keycloakUrl: currentOrigin || "https://app.example.com",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    graphqlUrl: "/graphql",
  },
};

const APP_ENV =
  (typeof process !== "undefined" && process.env && process.env.APP_ENV) ||
  "local";

if (!ENVIRONMENTS[APP_ENV]) {
  // eslint-disable-next-line no-console
  console.warn(`Unknown APP_ENV "${APP_ENV}", falling back to "local".`);
}

export const config = ENVIRONMENTS[APP_ENV] || ENVIRONMENTS.local;
export const ENV_NAMES = Object.keys(ENVIRONMENTS);
