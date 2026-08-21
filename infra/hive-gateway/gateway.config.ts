import { defineConfig } from "@graphql-hive/gateway";
import { useKafkaMutationNotifier } from "./plugins/kafkaMutationNotifier";

export const gatewayConfig = defineConfig({
  // Same artifact supergraph-compose already produces.
  supergraph: "/supergraph/supergraph.graphql",

  // ✅ Plugins must be factory functions, not wrapped in another arrow
  // plugins({ log }) {
  //   return [
  //     {
  //       onPluginInit() {
  //         log.info("🔥 PLUGIN INIT");
  //       },
  //
  //       onRequest({ request }) {
  //         log.info(
  //             `🔥 REQUEST: ${request.method} ${new URL(request.url).pathname}`
  //         );
  //       },
  //
  //       onEnveloped() {
  //         log.info("🔥 ENVELOPED");
  //       },
  //
  //       onExecute({ args }) {
  //         log.info(`🔥 EXECUTE: ${args.operationName ?? "anonymous"}`);
  //
  //         return {
  //           onExecuteDone({ result }) {
  //             log.info("🔥 EXECUTE DONE");
  //           },
  //         };
  //       },
  //     },
  //   ];
  // },
  // Shared cache storage
  plugins() {
    return [
      useKafkaMutationNotifier(),
    ];
  },
  cache: {
    type: "redis",
    url: process.env.REDIS_URL ?? "redis://redis:6379",
  },

  // Forward the client's Authorization bearer token to every subgraph
  propagateHeaders: {
    fromClientToSubgraphs({ request }) {
      const authorization = request.headers.get("authorization");
      return authorization ? { authorization } : {};
    },
  },

  responseCaching: {
    session: () => null,
    ttl: 60_000,
    ttlPerSchemaCoordinate: {
      "Query.products": 0,
      "Query.productsByIds": 0,
    },
    serveStaleOnError: true,
    invalidateViaMutation: true,
  },

  logging: "debug",
});
