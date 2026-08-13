import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { PRODUCT_QUERY, UPDATE_PRODUCT, PRODUCTS_QUERY } from "../graphql/productQueries";
import ProductForm from "./ProductForm";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, loading: loadingProduct, error: loadError } = useQuery(PRODUCT_QUERY, {
    variables: { id },
  });

  const [updateProduct, { loading: saving, error: saveError }] = useMutation(UPDATE_PRODUCT, {
    refetchQueries: [{ query: PRODUCTS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/products"),
  });

  if (loadingProduct) return <p>Loading product…</p>;
  if (loadError) return <p style={{ color: "crimson" }}>{loadError.message}</p>;
  if (!data?.product) return <p>Product not found.</p>;

  return (
    <div>
      <Link to="/products">&larr; Back to products</Link>
      <h2>Edit product — {data.product.sku}</h2>
      {saveError && <p style={{ color: "crimson" }}>{saveError.message}</p>}
      <ProductForm
        initialValues={data.product}
        submitLabel="Save changes"
        submitting={saving}
        onSubmit={(values) =>
          updateProduct({
            variables: {
              id,
              input: {
                name: values.name,
                description: values.description || null,
                priceCents: values.priceCents,
              },
            },
          })
        }
      />
    </div>
  );
}
