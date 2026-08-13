import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { authClient } from "@demo/shared-auth";
import ProductsApp from "./ProductsApp";

// Lets you run this remote standalone (npm start on :3001) for isolated
// development, independent of the shell. When mounted inside the shell,
// the shell itself provides the BrowserRouter — this one is only for
// standalone dev.
authClient.init().then((authenticated) => {
  if (!authenticated) return;
  createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <ProductsApp />
    </BrowserRouter>
  );
});
