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
      # A list, from inventory-service — a product can be stocked in
      # multiple warehouses. Resolved for potentially many products at
      # once via @BatchMapping (ONE query, not one per product) — see
      # ProductInventoryResolver.java's javadoc.
      inventory {
        id
        productId
        quantityAvailable
        quantityReserved
        warehouseLocation
        lastRestockedAt
      }
      # A SINGLE nullable object, from rating-service — genuinely 1:1,
      # deliberately different in shape from inventory above. Both are
      # federated in from services product-service knows nothing about,
      # in this SAME one request.
      rating {
        averageRating
        reviewCount
        updatedAt
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
