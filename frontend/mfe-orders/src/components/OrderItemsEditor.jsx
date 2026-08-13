import React from "react";

/**
 * Individual, reusable component: an editable list of {productId, quantity}
 * rows, used by OrderCreate. Kept separate from the form/page component so
 * it can be tested or reused (e.g. in a future "add items to order" screen)
 * on its own.
 */
export default function OrderItemsEditor({ items, onChange }) {
  const updateItem = (index, field, value) => {
    const next = items.slice();
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  const addRow = () => onChange([...items, { productId: "", quantity: 1 }]);
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index));

  return (
    <div>
      {items.map((item, index) => (
        <div key={index} style={styles.row}>
          <input
            placeholder="Product ID"
            value={item.productId}
            onChange={(e) => updateItem(index, "productId", e.target.value)}
            required
            style={styles.productIdInput}
          />
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
            style={styles.qtyInput}
          />
          <button type="button" onClick={() => removeRow(index)} style={styles.removeBtn}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={addRow} style={styles.addBtn}>
        + Add item
      </button>
    </div>
  );
}

const styles = {
  row: { display: "flex", gap: 8, marginBottom: 6, alignItems: "center" },
  productIdInput: { flex: 1 },
  qtyInput: { width: 70 },
  removeBtn: { border: "none", background: "none", color: "crimson", cursor: "pointer" },
  addBtn: {
    marginTop: 4,
    border: "1px dashed #999",
    background: "#fff",
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
  },
};
