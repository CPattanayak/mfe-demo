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
