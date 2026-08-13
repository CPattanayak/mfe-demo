import {
  ApolloClient,
  InMemoryCache,
  HttpLink,
  from,
  split,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";
import { authClient } from "./authClient";

/**
 * ===========================================================================
 * WHY BACKGROUND CHANGES DIDN'T SHOW UP, AND WHAT FIXES IT
 * ===========================================================================
 * `fetchPolicy: "cache-and-network"` on watchQuery only re-hits the network
 * when a query component (re)mounts or its variables change. It does NOT
 * poll, and it does NOT know when something changes on the server that
 * nobody local asked for — e.g. another user updates an order's status.
 * The component just keeps rendering whatever's already in the normalized
 * cache. Mutations *we* make already fix themselves up via `refetchQueries`
 * in each mutation call (see ProductCreate/ProductEdit/OrderCreate/OrderEdit),
 * but that only covers changes made from THIS browser tab.
 *
 * The production-safe default used throughout this demo (both products AND
 * orders): polling. Pass `pollInterval` to useQuery in the component itself
 * — see ProductList.jsx and OrderList.jsx. Coarser than a push (background
 * changes take up to the poll interval to show, instead of instantly), but
 * simple, always eventually correct, and doesn't depend on a persistent
 * connection surviving deploys/network blips or on Postgres NOTIFY/LISTEN
 * holding up under load.
 *
 * GraphQL Subscriptions were tried for orders earlier and deliberately
 * removed: Postgres NOTIFY/LISTEN isn't a high-throughput event bus, each
 * order-service replica had to hold one dedicated DB connection open for
 * its whole lifetime, and unfiltered fan-out did real resolution work per
 * subscriber. The subscription machinery below (buildSubscriptionLink,
 * the `subscriptionUri` option) is kept as general-purpose plumbing — it
 * still works correctly if a future event bus (Redis Pub/Sub, Kafka, NATS)
 * replaces NOTIFY/LISTEN — but nothing in this codebase currently passes
 * `subscriptionUri`, so it's inert unless a caller opts in.
 * ===========================================================================
 */

function buildAuthLink() {
  return setContext(async (_, { headers }) => {
    const token = await authClient.ensureFreshToken(30);
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  });
}

function buildErrorLink() {
  return onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      graphQLErrors.forEach(({ message, extensions }) => {
        if (extensions?.classification === "UNAUTHORIZED") {
          // Permission requirement (#9): surfaced back to the UI instead of
          // silently failing.
          console.warn(`GraphQL permission denied: ${message}`);
        }
      });
    }
    if (networkError) {
      console.error("GraphQL network error", networkError);
    }
  });
}

function buildSubscriptionLink(subscriptionUri, { onReconnected } = {}) {
  let hasConnectedBefore = false;

  return new GraphQLWsLink(
    createClient({
      url: subscriptionUri,
      // graphql-ws's connection_init payload — read server-side by
      // WebSocketAuthInterceptor, since browsers can't set a custom
      // Authorization header on the WebSocket handshake itself.
      connectionParams: async () => {
        const token = await authClient.ensureFreshToken(30);
        return { Authorization: token ? `Bearer ${token}` : "" };
      },
      shouldRetry: () => true,
      retryAttempts: Infinity,
      // Multi-replica prod note: a rolling deploy / pod restart / HPA
      // scale-down drops every WebSocket connected to that pod. graphql-ws
      // reconnects automatically (to whichever pod the Service picks next)
      // — keepAlive pings help distinguish "still connecting" from "idle
      // and about to be killed by an intermediate proxy's read timeout".
      keepAlive: 12_000,
      on: {
        connected: () => {
          if (hasConnectedBefore) {
            // This is a RE-connect, not the first connect: anything
            // published while we were disconnected (mid pod-restart, brief
            // network blip) was missed — no replay buffer on the server
            // side. onReconnected resyncs by refetching every currently
            // mounted query so the gap self-heals instead of silently
            // leaving stale data on screen.
            onReconnected?.();
          }
          hasConnectedBefore = true;
        },
      },
    })
  );
}

/**
 * Creates one Apollo Client per backend GraphQL endpoint (product-service,
 * order-service). Each micro-frontend imports this factory from the shared
 * singleton so the auth link logic (and therefore the token-refresh
 * behaviour) is defined exactly once.
 *
 * @param {string} graphqlUri     HTTP(S) endpoint for queries/mutations.
 * @param {object} [options]
 * @param {string} [options.subscriptionUri] WS(S) endpoint for subscriptions.
 *   When provided, `subscription { ... }` operations are routed over a
 *   WebSocket link instead of HTTP; all other operations still use HTTP.
 */
export function createApolloClient(graphqlUri, options = {}) {
  const { subscriptionUri } = options;

  const httpLink = new HttpLink({ uri: graphqlUri });
  const httpChain = from([buildErrorLink(), buildAuthLink(), httpLink]);

  // Forward reference: buildSubscriptionLink's onReconnected callback needs
  // to call back into the ApolloClient instance we're still constructing.
  // Safe because onReconnected only ever fires later, asynchronously, by
  // which point `apolloClient` below has been assigned.
  let apolloClient;

  const link = subscriptionUri
    ? split(
        ({ query }) => {
          const definition = getMainDefinition(query);
          return (
            definition.kind === "OperationDefinition" &&
            definition.operation === "subscription"
          );
        },
        buildSubscriptionLink(subscriptionUri, {
          onReconnected: () => apolloClient?.reFetchObservableQueries(),
        }),
        httpChain
      )
    : httpChain;

  apolloClient = new ApolloClient({
    link,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: { fetchPolicy: "cache-and-network" },
    },
  });

  return apolloClient;
}
