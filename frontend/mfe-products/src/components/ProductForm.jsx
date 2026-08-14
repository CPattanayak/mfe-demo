import React, { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

export default function ProductForm({ initialValues, onSubmit, submitLabel, submitting }) {
  const [values, setValues] = useState({
    sku: initialValues?.sku ?? "",
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    priceCents: initialValues?.priceCents ?? 0,
    currency: initialValues?.currency ?? "USD",
  });

  const handleChange = (field) => (e) => {
    const raw = e.target.value;
    setValues((prev) => ({
      ...prev,
      [field]: field === "priceCents" ? Number(raw) : raw,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: { xs: "100%", sm: 480, md: 640 } }}>
      {/* Grid: stacked (xs=12) on mobile, two columns (sm=6) from tablet
          up, so the form uses space efficiently on wider screens without
          becoming cramped on a phone. */}
      <Grid container spacing={2}>
        {!initialValues && (
          <Grid item xs={12} sm={6}>
            <TextField label="SKU" value={values.sku} onChange={handleChange("sku")} required fullWidth />
          </Grid>
        )}
        <Grid item xs={12} sm={initialValues ? 12 : 6}>
          <TextField label="Name" value={values.name} onChange={handleChange("name")} required fullWidth />
        </Grid>
        <Grid item xs={12}>
          <TextField
            label="Description"
            value={values.description}
            onChange={handleChange("description")}
            multiline
            rows={3}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            label="Price (cents)"
            type="number"
            value={values.priceCents}
            onChange={handleChange("priceCents")}
            required
            fullWidth
          />
        </Grid>
        {!initialValues && (
          <Grid item xs={12} sm={6}>
            <TextField label="Currency" value={values.currency} onChange={handleChange("currency")} fullWidth />
          </Grid>
        )}
        <Grid item xs={12}>
          <Button type="submit" variant="contained" disabled={submitting} fullWidth={false}
            sx={{ width: { xs: "100%", sm: "auto" } }}>
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
