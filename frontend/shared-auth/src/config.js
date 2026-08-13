/**
 * Requirement: config.js for different environments.
 *
 * One source of truth for every environment-specific URL (Keycloak,
 * each backend's GraphQL endpoint). Each app's webpack.config.js injects
 * `process.env.APP_ENV` via webpack.DefinePlugin at BUILD time (see
 * "APP_ENV" in shell/mfe-products/mfe-orders webpack.config.js), so the
 * compiled QA bundle only ever contains QA URLs, the prod bundle only
 * prod URLs, etc. — nothing is decided at runtime in the browser, and no
 * other environment's config leaks into a given build.
 *
 * Add a new environment by adding a key here and passing
 * APP_ENV=<name> when building (see cdn/Dockerfile, docker-compose*.yml).
 */
const ENVIRONMENTS = {
  local: {
    name: "local",
    keycloakUrl: "http://localhost:8080",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    productGraphqlUrl: "http://localhost:8081/graphql",
    orderGraphqlUrl: "http://localhost:8082/graphql",
  },
  qa: {
    name: "qa",
    keycloakUrl: "https://qa-auth.example.com",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    productGraphqlUrl: "https://qa-api.example.com/product/graphql",
    orderGraphqlUrl: "https://qa-api.example.com/order/graphql",
  },
  production: {
    name: "production",
    keycloakUrl: "https://auth.example.com",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    productGraphqlUrl: "https://api.example.com/product/graphql",
    orderGraphqlUrl: "https://api.example.com/order/graphql",
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
