import React from "react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { PRODUCT_QUERY, UPDATE_PRODUCT, PRODUCTS_QUERY } from "../graphql/productQueries";
import ProductForm from "./ProductForm";
import FormSkeleton from "./FormSkeleton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";

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

  if (loadingProduct) return <FormSkeleton />;
  if (loadError) return <Alert severity="error">{loadError.message}</Alert>;
  if (!data?.product) return <Typography>Product not found.</Typography>;

  // Same fix as ProductCreate.jsx: don't show an edit form that's
  // guaranteed to fail on submit for a user without product:write. The
  // list view already hides the Edit icon, but direct URL navigation to
  // /products/:id/edit bypasses that.
  if (!authClient.hasRole("product:write")) {
    return (
      <Box sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
        <Link component={RouterLink} to="/products" underline="hover">
          &larr; Back to products
        </Link>
        <Alert severity="warning" sx={{ mt: 2 }}>
          You need the <code>product:write</code> role to edit products.
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
        Edit product — {data.product.sku}
      </Typography>
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError.message}</Alert>}
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
    </Box>
  );
}
