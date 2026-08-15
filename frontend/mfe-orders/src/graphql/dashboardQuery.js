import { gql } from "@apollo/client";

/**
 * THE parallel-subgraph-call example. `products` is resolved entirely by
 * product-service; `orders` (with its nested `items`/`product`, which
 * itself further calls back into product-service via order-service's own
 * DataLoader — see ProductBatchLoader.java) is resolved entirely by
 * order-service. Neither branch depends on the other's result, so Apollo
 * Router's query planner fires both subgraph requests AT THE SAME TIME
 * instead of waiting for one to finish before starting the other, then
 * merges both results into this one response shape.
 *
 * Verify it for yourself: open Apollo Router's sandbox (router.yaml has
 * sandbox.enabled: true) at http://localhost:4000, run this query, and
 * check the "Query Plan" tab — it shows the two Fetch nodes for
 * `products`/`orders` as siblings under a single Parallel node, not
 * sequential Fetch nodes waiting on each other.
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
  }
`;
