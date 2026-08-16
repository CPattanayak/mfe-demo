import { gql } from "@apollo/client";

export const PRODUCTS_QUERY = gql`
  query Products($page: Int, $size: Int) {
    products(page: $page, size: $size) {
      id
      sku
      name
      priceCents
      currency
    }
  }
`;

export const PRODUCT_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      sku
      name
      description
      priceCents
      currency
      # Owned by inventory-service, not product-service — this ONE query
      # selecting a field from a DIFFERENT subgraph than the rest is what
      # triggers Router's entity extension resolution: Fetch
      # product-service for everything above, THEN Flatten to
      # inventory-service (using the id product-service just returned) for
      # this. See ProductInventoryResolver.java's javadoc for why this
      # specific shape is sequential, not parallel.
      #
      # A LIST: a product can have stock in multiple warehouses. Resolved
      # for potentially many products at once via @BatchMapping (ONE query,
      # not one per product) — see that class's javadoc.
      inventory {
        id
        productId
        quantityAvailable
        quantityReserved
        warehouseLocation
        lastRestockedAt
      }
    }
  }
`;

export const CREATE_PRODUCT = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
    }
  }
`;

export const UPDATE_PRODUCT = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      id
      name
      priceCents
      description
    }
  }
`;

export const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id)
  }
`;
