import React from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { CREATE_PRODUCT, PRODUCTS_QUERY } from "../graphql/productQueries";
import ProductForm from "./ProductForm";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [createProduct, { loading, error }] = useMutation(CREATE_PRODUCT, {
    refetchQueries: [{ query: PRODUCTS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/products"),
  });

  return (
    <Box sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      <Link component={RouterLink} to="/products" underline="hover">
        &larr; Back to products
      </Link>
      <Typography variant="h5" sx={{ my: 2 }}>
        Create product
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
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
    </Box>
  );
}
