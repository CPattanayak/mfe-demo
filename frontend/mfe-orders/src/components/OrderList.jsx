import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { ORDERS_QUERY } from "../graphql/orderQueries";
import Pagination from "./Pagination";
import OrderItemDetailsDialog from "./OrderItemDetailsDialog";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

const PAGE_SIZE = 20;
const DEFAULT_SORT_FIELD = "CREATED_AT";
const DEFAULT_SORT_DIRECTION = "DESC";

// `hideOnMobile: true` columns are dropped below the `sm` breakpoint
// (600px) — the table still fits a phone without horizontal scrolling
// for the columns that matter most there (Customer/Status/Items).
const COLUMNS = [
  { field: "CUSTOMER_ID", label: "Customer" },
  { field: "STATUS", label: "Status" },
  { field: null, label: "Items" },
  { field: "CREATED_AT", label: "Created", hideOnMobile: true },
  { field: "UPDATED_AT", label: "Updated", hideOnMobile: true },
];

export default function OrderList() {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState(DEFAULT_SORT_DIRECTION);
  // Requirement: clicking an item opens a modal with its details.
  const [selectedItem, setSelectedItem] = useState(null);

  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "DESC" ? "ASC" : "DESC");
    } else {
      setSortField(field);
      setSortDirection("DESC");
    }
    setPage(0);
  };

  const variables = { page, size: PAGE_SIZE, sortField, sortDirection };
  const { data, loading, error, refetch, networkStatus } = useQuery(ORDERS_QUERY, {
    variables,
    pollInterval: 15_000,
    notifyOnNetworkStatusChange: true,
  });

  const canWrite = authClient.hasRole("order:write");
  const isRefreshing = networkStatus === 4;

  if (loading && !data) return <CircularProgress />;
  if (error) return <Alert severity="error">{error.message}</Alert>;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Orders</Typography>
        <Stack direction="row" spacing={1} justifyContent={{ xs: "flex-end", sm: "flex-start" }}>
          <IconButton onClick={() => refetch()} disabled={isRefreshing}>
            <RefreshIcon />
          </IconButton>
          {canWrite && (
            <Button component={RouterLink} to="new" variant="contained" startIcon={<AddIcon />}>
              Create order
            </Button>
          )}
        </Stack>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {COLUMNS.map((col) => (
                <TableCell
                  key={col.label}
                  sx={col.hideOnMobile ? { display: { xs: "none", sm: "table-cell" } } : undefined}
                >
                  {col.field ? (
                    <TableSortLabel
                      active={sortField === col.field}
                      direction={sortField === col.field ? sortDirection.toLowerCase() : "desc"}
                      onClick={() => handleSort(col.field)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {data.orders.map((order) => (
              <TableRow key={order.id} hover>
                <TableCell>{order.customerId}</TableCell>
                <TableCell>
                  <Chip label={order.status} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell>
                  {order.items.map((item) => (
                    <Link
                      key={item.id}
                      component="button"
                      variant="body2"
                      underline="hover"
                      onClick={() => setSelectedItem(item)}
                      sx={{ display: "block", textAlign: "left" }}
                    >
                      {item.quantity} × {item.product?.name ?? "(unknown product)"}
                    </Link>
                  ))}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  {formatDate(order.updatedAt)}
                </TableCell>
                <TableCell align="right">
                  {canWrite && (
                    <Button component={RouterLink} to={`${order.id}/edit`} size="small">
                      Update
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {data.orders.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No orders on this page.
        </Typography>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} itemCount={data.orders.length} onPageChange={setPage} />

      <OrderItemDetailsDialog
        item={selectedItem}
        open={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
      />
    </Box>
  );
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}
