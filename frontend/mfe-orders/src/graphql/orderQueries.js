import { gql } from "@apollo/client";

// Two fragments, deliberately DIFFERENT sizes for DIFFERENT purposes —
// this is the fix for "OrderList always loads the entire order, even with
// a DataLoader": DataLoader batches network CALLS, it doesn't reduce
// payload size or how often that payload is re-fetched. Polling every 15s
// while eagerly requesting every item's full nested Product breakdown
// (sku, price, currency) for every order was real, repeated, mostly-wasted
// work — the list view only actually displays the product NAME.

// Lightweight: used by ORDERS_QUERY/ORDER_QUERY (the list/poll path).
// Just enough to render "quantity × product name" in a table row.
const ORDER_ITEM_SUMMARY_FRAGMENT = gql`
  fragment OrderItemSummaryFields on OrderItem {
    id
    quantity
    product {
      name
    }
  }
`;

// Enrichment ONLY: used by ORDER_ITEM_DETAIL_QUERY, fetched on demand —
// see OrderItemDetailsDialog.jsx. Deliberately does NOT re-request
// `quantity` or `product.name` — the caller already has both from
// ORDER_ITEM_SUMMARY_FRAGMENT (the list query that got us here in the
// first place), so re-asking the server for them would be the exact
// "list already fetched this, detail re-fetches it" duplication this
// fragment split exists to avoid. `id` stays: it's needed to identify
// the object in Apollo's cache, not "data" in the redundant sense.
const ORDER_ITEM_DETAIL_FRAGMENT = gql`
  fragment OrderItemDetailFields on OrderItem {
    id
    productId
    unitPriceCents
    product {
      id
      sku
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
        ...OrderItemSummaryFields
      }
    }
  }
  ${ORDER_ITEM_SUMMARY_FRAGMENT}
`;

export const ORDER_QUERY = gql`
  query Order($id: ID!) {
    order(id: $id) {
      id
      customerId
      status
      items {
        ...OrderItemSummaryFields
      }
    }
  }
  ${ORDER_ITEM_SUMMARY_FRAGMENT}
`;

// On-demand only — see OrderItemDetailsDialog.jsx's useQuery(..., { skip:
// !open }). Never fired as part of loading a list; only when a specific
// item is actually clicked.
export const ORDER_ITEM_DETAIL_QUERY = gql`
  query OrderItemDetail($id: ID!) {
    orderItem(id: $id) {
      ...OrderItemDetailFields
    }
  }
  ${ORDER_ITEM_DETAIL_FRAGMENT}
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
