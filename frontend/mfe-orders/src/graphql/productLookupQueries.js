import { gql } from "@apollo/client";

// Used only by OrderItemsEditor's Autocomplete to look up product id/name
// pairs — a separate, minimal query from mfe-products' own PRODUCTS_QUERY
// so this remote doesn't need to import across the mfe-products bundle.
//
// Federation note: this query's SHAPE didn't need to change when
// order-service/product-service became federation subgraphs — the
// gateway (currently Hive Gateway, not Apollo Router — see
// infra/hive-gateway/) composes both subgraphs' Query fields into one
// Query type without renaming anything, so `products(page, size) { ... }`
// resolves exactly the same way it always did. What changed is WHERE
// it's sent: see OrdersApp.jsx — this now runs against the same single
// client (config.graphqlUrl) as every other query in this app, not a
// second, product-service-specific client.
export const PRODUCTS_FOR_AUTOCOMPLETE_QUERY = gql`
  query ProductsForAutocomplete($page: Int, $size: Int) {
    products(page: $page, size: $size) {
      id
      sku
      name
      priceCents
      currency
    }
  }
`;
