import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { CREATE_ORDER, ORDERS_QUERY } from "../graphql/orderQueries";
import OrderItemsEditor from "./OrderItemsEditor";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";

export default function OrderCreate() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);

  const [createOrder, { loading, error }] = useMutation(CREATE_ORDER, {
    refetchQueries: [{ query: ORDERS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/orders"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createOrder({
      variables: {
        input: {
          customerId,
          items: items
            .filter((i) => i.productId)
            .map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
    });
  };

  return (
    <Box sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      <Link component={RouterLink} to="/orders" underline="hover">
        &larr; Back to orders
      </Link>
      <Typography variant="h5" sx={{ my: 2 }}>
        Create order
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Customer ID"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Items
            </Typography>
            <OrderItemsEditor items={items} onChange={setItems} />
          </Grid>
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {loading ? "Creating…" : "Create order"}
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
