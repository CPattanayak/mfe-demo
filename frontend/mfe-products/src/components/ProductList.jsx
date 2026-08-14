import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { PRODUCTS_QUERY } from "../graphql/productQueries";
import Pagination from "./Pagination";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditIcon from "@mui/icons-material/Edit";

const PAGE_SIZE = 20;

export default function ProductList() {
  const [page, setPage] = useState(0);

  const { data, loading, error, refetch, networkStatus } = useQuery(PRODUCTS_QUERY, {
    variables: { page, size: PAGE_SIZE },
    pollInterval: 15_000,
    notifyOnNetworkStatusChange: true,
  });

  const canWrite = authClient.hasRole("product:write");
  const isRefreshing = networkStatus === 4;

  if (loading && !data) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Box>
      {/* Stack switches from column (mobile) to row (tablet+) so the
          Create button doesn't get squeezed next to a long heading on
          narrow screens. */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Products</Typography>
        <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-end", sm: "flex-start" }}>
          <IconButton onClick={() => refetch()} disabled={isRefreshing}>
            <RefreshIcon />
          </IconButton>
          {canWrite && (
            <Button component={RouterLink} to="new" variant="contained" startIcon={<AddIcon />}>
              Create product
            </Button>
          )}
        </Stack>
      </Stack>

      {/* TableContainer scrolls horizontally on its own if content is
          still too wide after hiding columns below — never clips. */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.products.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{p.sku}</TableCell>
                <TableCell>{p.name}</TableCell>
                <TableCell>
                  {(p.priceCents / 100).toFixed(2)} {p.currency}
                </TableCell>
                <TableCell align="right">
                  {canWrite && (
                    <IconButton component={RouterLink} to={`${p.id}/edit`} size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Pagination page={page} pageSize={PAGE_SIZE} itemCount={data.products.length} onPageChange={setPage} />

      {!canWrite && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          You need the <code>product:write</code> role to create or edit products.
        </Typography>
      )}
    </Box>
  );
}
