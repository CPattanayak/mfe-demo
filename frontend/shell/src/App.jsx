import React, { Suspense, lazy, useMemo, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Header from "./components/Header";
import { createAppTheme } from "./theme";
import { ColorModeContext } from "./colorModeContext";

const ProductsApp = lazy(() => import("mfeProducts/ProductsApp"));
const OrdersApp = lazy(() => import("mfeOrders/OrdersApp"));

const STORAGE_KEY = "mfe-demo-color-mode";

function getInitialMode() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.) — fall through
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [mode, setMode] = useState(getInitialMode);

  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          try {
            window.localStorage.setItem(STORAGE_KEY, next);
          } catch {
            // ignore — persistence is a nice-to-have, not required
          }
          return next;
        });
      },
    }),
    [mode]
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
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
    </ColorModeContext.Provider>
  );
}
