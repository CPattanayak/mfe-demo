import React, { useMemo } from "react";
import { Routes, Route } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { createApolloClient, config } from "@demo/shared-auth";
import ProductList from "./components/ProductList";
import ProductCreate from "./components/ProductCreate";
import ProductEdit from "./components/ProductEdit";

/**
 * Requirement: create/edit/list routes owned by the micro-frontend itself.
 * Mounted by the shell at "/products/*", so these paths resolve to:
 *   /products         -> ProductList
 *   /products/new      -> ProductCreate
 *   /products/:id/edit -> ProductEdit
 */
export default function ProductsApp() {
  // Federation fix: was config.productGraphqlUrl (a product-service-
  // specific URL) — now config.graphqlUrl, the single endpoint served by
  // Apollo Router (composed supergraph of both subgraphs). No separate
  // gateway service; local dev hits Router directly, QA/production reach
  // it via cdn/nginx.conf's reverse proxy. mfe-orders points at this
  // exact same URL now too.
  const client = useMemo(() => createApolloClient(config.graphqlUrl), []);

  return (
    <ApolloProvider client={client}>
      <Routes>
        <Route index element={<ProductList />} />
        <Route path="new" element={<ProductCreate />} />
        <Route path=":id/edit" element={<ProductEdit />} />
      </Routes>
    </ApolloProvider>
  );
}
