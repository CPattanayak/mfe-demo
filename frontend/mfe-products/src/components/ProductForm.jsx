import React, { useState } from "react";

/**
 * Individual, reusable component: the same form drives both "create" and
 * "edit" — only the initial values, submit handler, and button label
 * differ between the two screens that use it.
 */
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
    <form onSubmit={handleSubmit} style={styles.form}>
      {!initialValues && (
        <label style={styles.field}>
          SKU
          <input value={values.sku} onChange={handleChange("sku")} required />
        </label>
      )}
      <label style={styles.field}>
        Name
        <input value={values.name} onChange={handleChange("name")} required />
      </label>
      <label style={styles.field}>
        Description
        <textarea value={values.description} onChange={handleChange("description")} rows={3} />
      </label>
      <label style={styles.field}>
        Price (cents)
        <input
          type="number"
          min={0}
          value={values.priceCents}
          onChange={handleChange("priceCents")}
          required
        />
      </label>
      {!initialValues && (
        <label style={styles.field}>
          Currency
          <input value={values.currency} onChange={handleChange("currency")} />
        </label>
      )}
      <button type="submit" disabled={submitting} style={styles.submit}>
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 10, maxWidth: 360 },
  field: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13 },
  submit: {
    marginTop: 8,
    padding: "8px 14px",
    border: "none",
    borderRadius: 4,
    background: "#1a73e8",
    color: "#fff",
    cursor: "pointer",
  },
};
