import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

export default function OrderItemsEditor({ items, onChange }) {
  const updateItem = (index, field, value) => {
    const next = items.slice();
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addRow = () => onChange([...items, { productId: "", quantity: 1 }]);
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => (
        // Rows stack fields vertically on mobile (each TextField full
        // width) and go side-by-side from tablet up.
        <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
          <TextField
            label="Product ID"
            value={item.productId}
            onChange={(e) => updateItem(index, "productId", e.target.value)}
            required
            size="small"
            fullWidth
            sx={{ flex: { sm: 1 } }}
          />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              label="Qty"
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
              size="small"
              sx={{ width: 90, flexShrink: 0 }}
            />
            <IconButton onClick={() => removeRow(index)} color="error" size="small">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Stack>
      ))}
      <Button startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: "flex-start" }}>
        Add item
      </Button>
    </Stack>
  );
}
