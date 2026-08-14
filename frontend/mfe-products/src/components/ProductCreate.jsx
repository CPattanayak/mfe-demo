import React from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
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

  // The nav menu already hides "Create" for users without product:write
  // (see Header.jsx/NavGroup.jsx), but that doesn't stop someone from
  // typing /products/new directly into the URL bar. The backend's
  // @PreAuthorize would reject the mutation either way, but showing a
  // form that's guaranteed to fail on submit is a bad experience — this
  // is the same permission check, just applied at the page level too.
  if (!authClient.hasRole("product:write")) {
    return (
      <Box sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
        <Link component={RouterLink} to="/products" underline="hover">
          &larr; Back to products
        </Link>
        <Alert severity="warning" sx={{ mt: 2 }}>
          You need the <code>product:write</code> role to create products.
        </Alert>
      </Box>
    );
  }

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
