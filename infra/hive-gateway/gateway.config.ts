import { defineConfig } from "@graphql-hive/gateway";

export const gatewayConfig = defineConfig({
  supergraph: "/supergraph/supergraph.graphql",

  cache: {
    type: "redis",
    url: "redis://redis:6379",
  },

  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      const authorization = request.headers.get("authorization");

      return authorization
          ? { authorization }
          : {};
    },
  },

  responseCaching: {
    session: () => null,

    // TEST: cache every successful query for 60 seconds
    ttl: 60_000,

    serveStaleOnError: true,
    // Enable automatic invalidation from mutation results
    invalidateViaMutation: true,
  },

  logging: "debug",
});