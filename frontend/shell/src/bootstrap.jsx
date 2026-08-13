import React from "react";
import { createRoot } from "react-dom/client";
import { authClient } from "@demo/shared-auth";
import App from "./App";

// Requirement #3: Keycloak login gate — nothing renders until the user is
// authenticated. Because authClient is a Module Federation shared
// singleton, mfe-products and mfe-orders reuse this SAME session instead of
// each doing their own login.
authClient
  .init()
  .then((authenticated) => {
    if (!authenticated) {
      // keycloak-js already triggered a redirect to the login page.
      return;
    }
    const root = createRoot(document.getElementById("root"));
    root.render(<App />);
  })
  .catch((err) => {
    console.error("Failed to initialize authentication", err);
    document.getElementById("root").innerText =
      "Failed to reach Keycloak. Is it running?";
  });
