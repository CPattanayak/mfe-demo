import React, { useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient, config } from "@demo/shared-auth";
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

  return (
    <ApolloProvider client={client}>
      <Routes>
        <Route index element={<OrderList />} />
        <Route path="new" element={<OrderCreate />} />
        <Route path=":id/edit" element={<OrderEdit />} />
      </Routes>
    </ApolloProvider>
  );
}
