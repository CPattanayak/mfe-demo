import { gql } from "@apollo/client";

// A fragment: a named, reusable field selection. ORDERS_QUERY and
// ORDER_QUERY both need the exact same OrderItem shape (id, product
// details, etc.) — before this, that selection was copy-pasted in both
// places, so adding/removing a field meant remembering to update it
// twice. Define it once here, spread it with `...OrderItemFields` below.
const ORDER_ITEM_FRAGMENT = gql`
  fragment OrderItemFields on OrderItem {
    id
    productId
    quantity
    unitPriceCents
    product {
      id
      sku
      name
      priceCents
      currency
    }
  }
`;

export const ORDERS_QUERY = gql`
  query Orders($page: Int, $size: Int, $sortField: OrderSortField, $sortDirection: SortDirection) {
    orders(page: $page, size: $size, sortField: $sortField, sortDirection: $sortDirection) {
      id
      customerId
      status
      createdAt
      updatedAt
      items {
        ...OrderItemFields
      }
    }
  }
  ${ORDER_ITEM_FRAGMENT}
`;

export const ORDER_QUERY = gql`
  query Order($id: ID!) {
    order(id: $id) {
      id
      customerId
      status
      items {
        ...OrderItemFields
      }
    }
  }
  ${ORDER_ITEM_FRAGMENT}
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
