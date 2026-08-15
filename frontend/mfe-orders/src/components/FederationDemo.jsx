import React from "react";
import { useQuery } from "@apollo/client";
import { DASHBOARD_QUERY } from "../graphql/dashboardQuery";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

/**
 * Concrete, runnable proof of the federation requirement: ONE query
 * (DASHBOARD_QUERY) fetching `products` (owned by product-service) and
 * `orders` (owned by order-service) in a single round trip to Apollo
 * Router, which resolves both subgraphs in parallel and merges the
 * result — no separate gateway service in between.
 *
 * Open this page's network tab: there is exactly ONE request to
 * /graphql, not two — Router did the fan-out/merge, the browser never
 * knew two separate services were involved.
 */
export default function FederationDemo() {
  const { data, loading, error } = useQuery(DASHBOARD_QUERY);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Federation demo
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        One query, two subgraphs, resolved in parallel by Apollo Router —
        see DASHBOARD_QUERY in graphql/dashboardQuery.js.
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Products (product-service)
            </Typography>
            <List dense>
              {data.products.map((p) => (
                <ListItem key={p.id} disableGutters>
                  <ListItemText
                    primary={p.name}
                    secondary={`${(p.priceCents / 100).toFixed(2)} ${p.currency}`}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Orders (order-service)
            </Typography>
            <List dense>
              {data.orders.map((o) => (
                <ListItem key={o.id} disableGutters>
                  <ListItemText primary={o.customerId} />
                  <Chip label={o.status} size="small" color="primary" variant="outlined" />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
