import { createContext, useContext } from "react";

export const ProductLookupClientContext = createContext(null);

export function useProductLookupClient() {
  const client = useContext(ProductLookupClientContext);
  if (!client) {
    throw new Error("useProductLookupClient must be used within OrdersApp's provider tree");
  }
  return client;
}
