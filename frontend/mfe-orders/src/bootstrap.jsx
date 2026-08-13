import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authClient } from "@demo/shared-auth";
import OrdersApp from "./OrdersApp";

authClient.init().then((authenticated) => {
  if (!authenticated) return;
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <OrdersApp />
    </BrowserRouter>
  );
});
