import React from "react";

/**
 * A clickable column header that drives server-side sorting. Clicking the
 * active column flips direction; clicking a different column switches to
 * it (defaulting to DESC — newest/most-relevant first).
 */
export default function SortableHeader({ label, field, sortField, sortDirection, onSort }) {
  const isActive = field === sortField;
  const nextDirection = isActive && sortDirection === "DESC" ? "ASC" : "DESC";

  return (
    <th
      onClick={() => onSort(field, nextDirection)}
      style={{ ...styles.th, ...(isActive ? styles.active : {}) }}
      title={`Sort by ${label}`}
    >
      {label}
      {isActive && <span style={styles.arrow}>{sortDirection === "DESC" ? " ▼" : " ▲"}</span>}
    </th>
  );
}

const styles = {
  th: {
    cursor: "pointer",
    userSelect: "none",
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "2px solid #ddd",
    whiteSpace: "nowrap",
  },
  active: { color: "#1a73e8" },
  arrow: { fontSize: 10 },
};
