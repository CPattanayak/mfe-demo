import React from "react";
import { useQuery } from "@apollo/client";
import { useProductLookupClient } from "../productLookupClientContext";
import { PRODUCTS_FOR_AUTOCOMPLETE_QUERY } from "../graphql/productLookupQueries";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";

export default function OrderItemsEditor({ items, onChange }) {
  // Requirement fix: was a free-text "Product ID" field the person had to
  // already know/copy-paste — now an Autocomplete populated from
  // product-service, showing "id — name" as the option label so the
  // person picks a product by name and productId is stored automatically.
  const productLookupClient = useProductLookupClient();
  const { data, loading, error } = useQuery(PRODUCTS_FOR_AUTOCOMPLETE_QUERY, {
    client: productLookupClient,
    variables: { page: 0, size: 100 },
  });
  const options = data?.products ?? [];

  const updateItem = (index, field, value) => {
    const next = items.slice();
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addRow = () => onChange([...items, { productId: "", quantity: 1 }]);
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index));

  if (error) {
    // Falls back to nothing selectable rather than crashing the whole
    // create-order form — the person can still see the error and retry.
    return (
      <Box sx={{ color: "error.main", fontSize: 14 }}>
        Couldn't load products for selection: {error.message}
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {items.map((item, index) => {
        const selected = options.find((p) => p.id === item.productId) ?? null;
        return (
          // Rows stack fields vertically on mobile (each control full
          // width) and go side-by-side from tablet up.
          <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
            <Autocomplete
              options={options}
              value={selected}
              loading={loading}
              // key/value: id is the stored value, name (with sku) is
              // what's displayed and searched.
              getOptionLabel={(option) => (option ? `${option.name} (${option.sku})` : "")}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onChange={(_, newValue) => updateItem(index, "productId", newValue ? newValue.id : "")}
              sx={{ flex: { sm: 1 }, minWidth: { xs: "100%", sm: 260 } }}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Box>
                    <Box sx={{ fontWeight: 500 }}>{option.name}</Box>
                    <Box sx={{ fontSize: 12, color: "text.secondary" }}>
                      {option.sku} · {(option.priceCents / 100).toFixed(2)} {option.currency}
                    </Box>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Product"
                  required
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress color="inherit" size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
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
        );
      })}
      <Button startIcon={<AddIcon />} onClick={addRow} sx={{ alignSelf: "flex-start" }}>
        Add item
      </Button>
    </Stack>
  );
}
