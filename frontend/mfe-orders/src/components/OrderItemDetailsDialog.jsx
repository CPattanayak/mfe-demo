import React from "react";
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
import CloseIcon from "@mui/icons-material/Close";

/**
 * Requirement: clicking an order item opens a modal with its full
 * details, rather than just showing "qty × name" inline in the table.
 */
export default function OrderItemDetailsDialog({ item, open, onClose }) {
  if (!item) return null;

  const unitPrice = formatMoney(item.unitPriceCents, item.product?.currency);
  const lineTotal = formatMoney(item.unitPriceCents * item.quantity, item.product?.currency);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {item.product?.name ?? "Item details"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Table size="small">
          <TableBody>
            <Row label="Product ID" value={item.productId} mono />
            <Row label="SKU" value={item.product?.sku ?? "—"} />
            <Row label="Name" value={item.product?.name ?? "(unknown product)"} />
            <Row label="Quantity" value={item.quantity} />
            <Row label="Unit price" value={unitPrice} />
            <Row label="Line total" value={lineTotal} bold />
            <Row label="Order item ID" value={item.id} mono />
          </TableBody>
        </Table>
        {!item.product && (
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
