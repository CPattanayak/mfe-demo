import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header";

// Requirement #1: lazily-loaded remote micro-frontends via Module Federation.
// Each remote owns its OWN internal list/create/edit routes (mounted at
// "/products/*" and "/orders/*") — the shell only needs to know the base
// path, not every sub-route inside a given micro-frontend.
const ProductsApp = lazy(() => import("mfeProducts/ProductsApp"));
const OrdersApp = lazy(() => import("mfeOrders/OrdersApp"));

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main style={styles.main}>
        <Suspense fallback={<p>Loading micro-frontend…</p>}>
          <Routes>
            <Route path="/products/*" element={<ProductsApp />} />
            <Route path="/orders/*" element={<OrdersApp />} />
            <Route path="/" element={<Navigate to="/products" replace />} />
          </Routes>
        </Suspense>
      </main>
    </BrowserRouter>
  );
}

const styles = {
  main: { padding: 20, fontFamily: "sans-serif" },
};
