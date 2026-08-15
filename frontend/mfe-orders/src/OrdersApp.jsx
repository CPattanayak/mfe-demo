import React, { useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient, config } from "@demo/shared-auth";
import OrderList from "./components/OrderList";
import OrderCreate from "./components/OrderCreate";
import OrderEdit from "./components/OrderEdit";
import FederationDemo from "./components/FederationDemo";

/**
 * Requirement: create/edit/list routes owned by the micro-frontend itself.
 * Mounted by the shell at "/orders/*", so these paths resolve to:
 *   /orders         -> OrderList
 *   /orders/new      -> OrderCreate
 *   /orders/:id/edit -> OrderEdit (status update)
 */
export default function OrdersApp() {
  // Federation fix (removed the second client): before federation,
  // order-service's own schema had no `products` query, so
  // OrderItemsEditor's Autocomplete needed a SECOND ApolloClient pointed
  // directly at product-service (via ProductLookupClientContext). Now
  // that Apollo Router composes both subgraphs into one schema, `orders`
  // AND `products` both live behind this SAME endpoint — one client is
  // enough. See OrderItemsEditor.jsx for the matching simplification.
  //
  // No subscriptionUri: live updates via WebSocket subscription were
  // dropped in favor of polling (see OrderList.jsx) as the production-safe
  // default — Postgres NOTIFY/LISTEN isn't a high-throughput event bus,
  // and the persistent-connection infrastructure it required added real
  // operational risk for a live-update feature that polling covers well
  // enough.
  const client = useMemo(() => createApolloClient(config.graphqlUrl), []);

  return (
    <ApolloProvider client={client}>
      <Routes>
        <Route index element={<OrderList />} />
        <Route path="new" element={<OrderCreate />} />
        <Route path=":id/edit" element={<OrderEdit />} />
        <Route path="federation-demo" element={<FederationDemo />} />
      </Routes>
    </ApolloProvider>
  );
}
