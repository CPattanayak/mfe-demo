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
  // One Apollo Client per remote/backend, built from the shared
  // authClient token-refresh logic (requirement #4 & #6), pointed at this
  // environment's product-service URL (requirement: config.js).
  const client = useMemo(() => createApolloClient(config.productGraphqlUrl), []);

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
