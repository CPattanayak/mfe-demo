import { gql } from "@apollo/client";

/**
 * THE parallel-subgraph-call example — now with THREE branches across
 * THREE subgraphs. `products` is resolved entirely by product-service;
 * `orders` (with its nested `items`/`product`, which itself further calls
 * back into product-service via order-service's own DataLoader — see
 * ProductBatchLoader.java) is resolved entirely by order-service;
 * `lowStockInventory` is resolved entirely by inventory-service. NONE of
 * the three depends on either of the other two's results, so Apollo
 * Router's query planner fires all three subgraph requests AT THE SAME
 * TIME instead of waiting for one to finish before starting the next,
 * then merges all three results into this one response shape.
 *
 * Contrast this with productQueries.js's PRODUCT_QUERY, which ALSO
 * touches inventory-service but is NOT parallel — it's Fetch (product-
 * service) then Flatten (inventory-service), because inventory-service
 * needs to know a specific product's id before it can look anything up.
 * `lowStockInventory` here needs no such id — that's exactly what makes
 * it parallelizable with the other two branches.
 *
 * Verify it for yourself: open Apollo Router's sandbox (router.yaml has
 * sandbox.enabled: true) at http://localhost:4000, run this query, and
 * check the "Query Plan" tab — it shows all three Fetch nodes as
 * siblings under a single Parallel node, not sequential Fetch nodes
 * waiting on each other.
 */
export const DASHBOARD_QUERY = gql`
  query Dashboard {
    products(page: 0, size: 5) {
      id
      name
      priceCents
      currency
    }
    orders(page: 0, size: 5, sortField: CREATED_AT, sortDirection: DESC) {
      id
      customerId
      status
    }
    lowStockInventory(threshold: 10) {
      id
      productId
      quantityAvailable
      warehouseLocation
    }
  }
`;
