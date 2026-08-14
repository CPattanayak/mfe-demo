import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { ORDER_QUERY, ORDERS_QUERY, UPDATE_ORDER_STATUS } from "../graphql/orderQueries";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

const STATUS_OPTIONS = ["PENDING", "PAID", "SHIPPED", "CANCELLED"];

export default function OrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("PENDING");

  const { data, loading: loadingOrder, error: loadError } = useQuery(ORDER_QUERY, {
    variables: { id },
    onCompleted: (result) => setStatus(result.order.status),
  });

  const [updateStatus, { loading: saving, error: saveError }] = useMutation(UPDATE_ORDER_STATUS, {
    refetchQueries: [{ query: ORDERS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/orders"),
  });

  useEffect(() => {
    if (data?.order?.status) setStatus(data.order.status);
  }, [data]);

  if (loadingOrder) return <CircularProgress />;
  if (loadError) return <Alert severity="error">{loadError.message}</Alert>;
  if (!data?.order) return <Typography>Order not found.</Typography>;

  return (
    <Box sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      <Link component={RouterLink} to="/orders" underline="hover">
        &larr; Back to orders
      </Link>
      <Typography variant="h5" sx={{ my: 2 }}>
        Order — {data.order.customerId}
      </Typography>
      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError.message}</Alert>}

      <List dense>
        {data.order.items.map((item) => (
          <ListItem key={item.id} disableGutters>
            <ListItemText primary={`${item.quantity} × ${item.product?.name ?? item.productId}`} />
          </ListItem>
        ))}
      </List>

      <Stack spacing={2} sx={{ mt: 2 }}>
        <FormControl sx={{ maxWidth: 220 }}>
          <InputLabel id="status-label">Status</InputLabel>
          <Select
            labelId="status-label"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          disabled={saving}
          onClick={() => updateStatus({ variables: { id, status } })}
          sx={{ alignSelf: "flex-start" }}
        >
          {saving ? "Saving…" : "Update status"}
        </Button>
      </Stack>
    </Box>
  );
}
