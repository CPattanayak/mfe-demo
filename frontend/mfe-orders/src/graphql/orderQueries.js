import { gql } from "@apollo/client";

export const ORDERS_QUERY = gql`
  query Orders($page: Int, $size: Int, $sortField: OrderSortField, $sortDirection: SortDirection) {
    orders(page: $page, size: $size, sortField: $sortField, sortDirection: $sortDirection) {
      id
      customerId
      status
      createdAt
      updatedAt
      items {
        id
        quantity
        product {
          name
          priceCents
          currency
        }
      }
    }
  }
`;

export const ORDER_QUERY = gql`
  query Order($id: ID!) {
    order(id: $id) {
      id
      customerId
      status
      items {
        id
        quantity
        productId
        product {
          name
          priceCents
          currency
        }
      }
    }
  }
`;

export const CREATE_ORDER = gql`
  mutation CreateOrder($input: CreateOrderInput!) {
    createOrder(input: $input) {
      id
      status
    }
  }
`;

export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;
