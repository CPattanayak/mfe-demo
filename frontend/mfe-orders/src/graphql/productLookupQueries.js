import { gql } from "@apollo/client";

// Used only by OrderItemsEditor's Autocomplete to look up product id/name
// pairs — a separate, minimal query from mfe-products' own PRODUCTS_QUERY
// so this remote doesn't need to import across the mfe-products bundle.
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
