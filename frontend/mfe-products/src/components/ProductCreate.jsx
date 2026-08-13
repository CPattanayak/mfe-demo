import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { CREATE_PRODUCT, PRODUCTS_QUERY } from "../graphql/productQueries";
import ProductForm from "./ProductForm";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [createProduct, { loading, error }] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: PRODUCTS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/products"),
  });

  return (
    <div>
      <Link to="/products">&larr; Back to products</Link>
      <h2>Create product</h2>
      {error && <p style={{ color: "crimson" }}>{error.message}</p>}
      <ProductForm
        submitLabel="Create product"
        submitting={loading}
        onSubmit={(values) =>
          createProduct({
            variables: {
              input: {
                sku: values.sku,
                name: values.name,
                description: values.description || null,
                priceCents: values.priceCents,
                currency: values.currency,
              },
            },
          })
        }
      />
    </div>
  );
}
