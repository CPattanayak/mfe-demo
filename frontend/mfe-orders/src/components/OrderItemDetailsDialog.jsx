import React from "react";
import { useQuery } from "@apollo/client";
import { ORDER_ITEM_DETAIL_QUERY } from "../graphql/orderQueries";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Requirement: clicking an order item opens a modal with its full
 * details, rather than just showing "qty × name" inline in the table.
 *
 * Fix for "list already fetched item + product, detail re-fetches the
 * same thing": `summary` carries the fields the LIST query already has
 * (id, quantity, product name) — passed straight in as props, rendered
 * IMMEDIATELY, no network wait. Only the fields the list never fetched
 * (SKU, unit price, currency, productId) come from
 * ORDER_ITEM_DETAIL_QUERY, fired on demand and merged with `summary` for
 * display. Net effect: opening this dialog costs exactly one small
 * network request for exactly the data that was actually missing — not
 * a full re-fetch of data the app already had a moment earlier.
 */
export default function OrderItemDetailsDialog({ summary, open, onClose }) {
  const itemId = summary?.id;

  const { data, loading, error } = useQuery(ORDER_ITEM_DETAIL_QUERY, {
    variables: { id: itemId },
    skip: !itemId || !open,
    // Fix for "request count keeps growing" — without this, every time
    // this dialog reopens (even for an item you already viewed a moment
    // ago) it inherits the client's default "cache-and-network" and
    // refetches over the network again, unconditionally. This enrichment
    // data (SKU, price, currency) is just as stable within a session as
    // the Autocomplete's product catalog (see OrderItemsEditor.jsx's
    // identical fetchPolicy choice, same reasoning). "cache-first" means:
    // first click on a given item → one network request, cached from
    // then on. Reopening that SAME item later → answered straight from
    // cache, zero network calls. Only a genuinely NEW item (different id,
    // nothing cached yet) triggers a fresh request.
    fetchPolicy: "cache-first",
  });

  const detail = data?.orderItem;
  const productName = summary?.product?.name ?? "(unknown product)";
  const quantity = summary?.quantity;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {productName}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableBody>
            {/* These three render instantly from `summary` — already known
                from the list, no network wait. */}
            <Row label="Name" value={productName} />
            <Row label="Quantity" value={quantity} />
            <Row label="Order item ID" value={itemId} mono />

            {/* These come from the on-demand query — the ONLY fields the
                list didn't already have. */}
            {loading && <SkeletonRows count={4} />}
            {detail && (
              <>
                <Row label="Product ID" value={detail.productId} mono />
                <Row label="SKU" value={detail.product?.sku ?? "—"} />
                <Row
                  label="Unit price"
                  value={formatMoney(detail.unitPriceCents, detail.product?.currency)}
                />
                <Row
                  label="Line total"
                  value={formatMoney(detail.unitPriceCents * quantity, detail.product?.currency)}
                  bold
                />
              </>
            )}
          </TableBody>
        </Table>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error.message}
          </Alert>
        )}
        {!loading && !error && detail && !detail.product && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="warning.main">
              Product details couldn't be resolved — the product may have been deleted.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function SkeletonRows({ count }) {
  return Array.from({ length: count }).map((_, i) => (
    <TableRow key={i}>
      <TableCell sx={{ border: 0 }}>
        <Skeleton variant="text" width="60%" />
      </TableCell>
      <TableCell sx={{ border: 0 }}>
        <Skeleton variant="text" width="80%" />
      </TableCell>
    </TableRow>
  ));
}

function Row({ label, value, mono, bold }) {
  return (
    <TableRow>
      <TableCell sx={{ color: "text.secondary", border: 0, width: "40%" }}>{label}</TableCell>
      <TableCell
        sx={{
          border: 0,
          fontFamily: mono ? "monospace" : undefined,
          fontWeight: bold ? 700 : undefined,
          wordBreak: "break-all",
        }}
      >
        {value}
      </TableCell>
    </TableRow>
  );
}

function formatMoney(cents, currency) {
  if (cents == null) return "—";
  return `${(cents / 100).toFixed(2)} ${currency ?? ""}`.trim();
}
