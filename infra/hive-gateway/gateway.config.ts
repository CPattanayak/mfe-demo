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
  prometheus: {
    metrics: {
      graphql_gateway_fetch_duration: true,
      graphql_gateway_subgraph_execute_duration: true,
      graphql_gateway_subgraph_execute_errors: true,
      graphql_envelop_deprecated_field: true,
      graphql_envelop_request: true,
      graphql_envelop_request_duration: true,
      graphql_envelop_request_time_summary: true,
      graphql_envelop_phase_parse: true,
      graphql_envelop_phase_validate: true,
      graphql_envelop_phase_context: true,
      graphql_envelop_error_result: true,
      graphql_envelop_phase_execute: true,
      graphql_envelop_phase_subscribe: true,
      graphql_envelop_schema_change: true,
      graphql_yoga_http_duration: true,
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

  // logging: "debug",
});
