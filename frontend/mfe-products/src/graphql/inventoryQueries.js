import { gql } from "@apollo/client";

export const CREATE_INVENTORY = gql`
  mutation CreateInventory($input: CreateInventoryInput!) {
    createInventory(input: $input) {
      id
      productId
      quantityAvailable
      quantityReserved
      warehouseLocation
      lastRestockedAt
    }
  }
`;

export const UPDATE_INVENTORY = gql`
  mutation UpdateInventory($id: ID!, $input: UpdateInventoryInput!) {
    updateInventory(id: $id, input: $input) {
      id
      quantityAvailable
      quantityReserved
      warehouseLocation
      lastRestockedAt
    }
  }
`;

export const DELETE_INVENTORY = gql`
  mutation DeleteInventory($id: ID!) {
    deleteInventory(id: $id)
  }
`;
