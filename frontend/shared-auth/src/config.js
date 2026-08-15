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
 * backend/*\/config/FederationConfig.java + infra/apollo-router/),
 * product-service and order-service compose into a single supergraph
 * schema served through Apollo Router. mfe-products and mfe-orders both
 * read this same field; there's no more separate productGraphqlUrl/
 * orderGraphqlUrl split.
 *
 * No separate gateway service: in local dev, this points directly at
 * Apollo Router's own port (:4000). In qa/production, it's the SAME
 * origin as the UI itself — cdn/nginx.conf reverse-proxies /graphql
 * straight to Apollo Router internally, so from the browser's
 * perspective the GraphQL endpoint and the UI are one and the same host.
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
    // Directly to Apollo Router — no gateway in front of it in local dev.
    graphqlUrl: "/graphql",
  },
  qa: {
    name: "qa",
    keycloakUrl: "https://qa.example.com",
    keycloakRealm: "microfrontend-demo",
    keycloakClientId: "web-app",
    graphqlUrl: "/graphql",
  },
  production: {
    name: "production",
    keycloakUrl: "https://app.example.com",
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
