import React, { useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient, config } from "@demo/shared-auth";
import { ProductLookupClientContext } from "./productLookupClientContext";
import OrderList from "./components/OrderList";
import OrderCreate from "./components/OrderCreate";
import OrderEdit from "./components/OrderEdit";

/**
 * Requirement: create/edit/list routes owned by the micro-frontend itself.
 * Mounted by the shell at "/orders/*", so these paths resolve to:
 *   /orders         -> OrderList
 *   /orders/new      -> OrderCreate
 *   /orders/:id/edit -> OrderEdit (status update)
 */
export default function OrdersApp() {
  // No subscriptionUri: live updates via WebSocket subscription were
  // dropped in favor of polling (see OrderList.jsx) as the production-safe
  // default — Postgres NOTIFY/LISTEN isn't a high-throughput event bus,
  // and the persistent-connection infrastructure it required (
  // OrderChangeListener, WebSocketAuthInterceptor, one dedicated DB
  // connection held open per order-service replica) added real
  // operational risk for a live-update feature that polling covers well
  // enough. createApolloClient still works standalone with just
  // graphqlUri; the subscriptionUri option remains available if a future
  // event-bus (e.g. Redis Pub/Sub, Kafka) replaces NOTIFY/LISTEN.
  const client = useMemo(() => createApolloClient(config.orderGraphqlUrl), []);

  // Second client, scoped to product-service, ONLY for OrderItemsEditor's
  // product-id/name autocomplete (see OrderCreate.jsx). order-service's
  // schema has no products query of its own — that data genuinely lives
  // in a different service — so a second ApolloProvider is the correct
  // shape here rather than routing product lookups through order-service.
  const productLookupClient = useMemo(
    () => createApolloClient(config.productGraphqlUrl),
    []
  );

  return (
    <ApolloProvider client={client}>
      <ProductLookupClientContext.Provider value={productLookupClient}>
        <Routes>
          <Route index element={<OrderList />} />
          <Route path="new" element={<OrderCreate />} />
          <Route path=":id/edit" element={<OrderEdit />} />
        </Routes>
      </ProductLookupClientContext.Provider>
    </ApolloProvider>
  );
}
