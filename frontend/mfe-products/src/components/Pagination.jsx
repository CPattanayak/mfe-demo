import React from "react";

/**
 * Previous/Next pagination controls.
 *
 * hasNextPage is a HEURISTIC, not real data: the backend's
 * `products(page, size)` query returns a plain list, not a count of how
 * many products exist in total. So "is there a next page?" is inferred
 * from whether this page came back FULL (itemCount === pageSize) — if it
 * did, there MIGHT be more. This is wrong in exactly one case: when the
 * total count is an exact multiple of pageSize, "Next" will still be
 * enabled and return an empty page. Fine for a demo; a real system would
 * have the backend return `{ items, totalCount }` instead of a bare list
 * so hasNextPage could be computed exactly.
 */
export default function Pagination({ page, pageSize, itemCount, onPageChange }) {
  const hasPreviousPage = page > 0;
  const hasNextPage = itemCount === pageSize;

  if (!hasPreviousPage && !hasNextPage) return null;

  return (
    <div style={styles.row}>
      <button
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(page - 1)}
        style={styles.btn}
      >
        ← Previous
      </button>
      <span style={styles.pageLabel}>Page {page + 1}</span>
      <button disabled={!hasNextPage} onClick={() => onPageChange(page + 1)} style={styles.btn}>
        Next →
      </button>
    </div>
  );
}

const styles = {
  row: { display: "flex", alignItems: "center", gap: 12, marginTop: 12 },
  pageLabel: { fontSize: 13, color: "#666" },
  btn: {
    padding: "6px 12px",
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  },
};
