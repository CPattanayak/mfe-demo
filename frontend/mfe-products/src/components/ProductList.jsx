import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { PRODUCTS_QUERY } from "../graphql/productQueries";
import Pagination from "./Pagination";

const PAGE_SIZE = 20;

export default function ProductList() {
  // This is the fix for "pagination doesn't work": `page` is now real
  // component state, changed by Pagination's Previous/Next buttons — not
  // a hardcoded { page: 0 } that never moved. Every page change re-runs
  // this query with new variables, which product-service's `products(page,
  // size)` resolver turns into PageRequest.of(page, size) against the
  // R2DBC repository.
  const [page, setPage] = useState(0);

  // Fix for "background changes don't reflect": products don't have a
  // GraphQL Subscription in this demo (see README's "Real-time updates"
  // section for why subscriptions were tried and then removed), so this
  // uses the pragmatic fallback instead — poll every 15s, plus a manual
  // "⟳ Refresh" button below for an immediate resync instead of waiting
  // out the poll interval.
  const { data, loading, error, refetch, networkStatus } = useQuery(PRODUCTS_QUERY, {
    variables: { page, size: PAGE_SIZE },
    pollInterval: 15_000,
    notifyOnNetworkStatusChange: true, // so `networkStatus` updates during refetch()/poll, driving the spinner below
  });

  const canWrite = authClient.hasRole("product:write");
  const isRefreshing = networkStatus === 4; // Apollo's NetworkStatus.refetch

  if (loading && !data) return <p>Loading products…</p>;
  if (error) {
    // Requirement #9: a clean permission-denied message instead of a crash
    // when the logged-in user lacks product:read.
    return <p style={{ color: "crimson" }}>Error: {error.message}</p>;
  }

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Products</h2>
        <div style={styles.headerActions}>
          <button onClick={() => refetch()} disabled={isRefreshing} style={styles.refreshBtn}>
            {isRefreshing ? "Refreshing…" : "⟳ Refresh"}
          </button>
          {canWrite && (
            <Link to="new" style={styles.createBtn}>
              + Create product
            </Link>
          )}
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Price</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data.products.map((p) => (
            <tr key={p.id}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>
                {(p.priceCents / 100).toFixed(2)} {p.currency}
              </td>
              <td>{canWrite && <Link to={`${p.id}/edit`}>Edit</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={data.products.length}
        onPageChange={setPage}
      />

      {!canWrite && (
        <p style={{ color: "#888" }}>
          You need the <code>product:write</code> role to create or edit products.
        </p>
      )}
    </div>
  );
}

const styles = {
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerActions: { display: "flex", gap: 8, alignItems: "center" },
  refreshBtn: {
    padding: "6px 12px",
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
  },
  createBtn: {
    textDecoration: "none",
    background: "#1a73e8",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 4,
    fontSize: 13,
  },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 12 },
};
