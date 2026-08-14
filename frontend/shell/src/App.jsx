import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Header from "./components/Header";
import { theme } from "./theme";

const ProductsApp = lazy(() => import("mfeProducts/ProductsApp"));
const OrdersApp = lazy(() => import("mfeOrders/OrdersApp"));

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Header />
        <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1.5, sm: 3 } }}>
          <Suspense fallback={<LinearProgress />}>
            <Routes>
              <Route path="/products/*" element={<ProductsApp />} />
              <Route path="/orders/*" element={<OrdersApp />} />
              <Route path="/" element={<Navigate to="/products" replace />} />
            </Routes>
          </Suspense>
        </Container>
      </BrowserRouter>
    </ThemeProvider>
  );
}
