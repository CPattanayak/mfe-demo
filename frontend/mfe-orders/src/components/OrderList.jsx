import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@apollo/client";
import { authClient } from "@demo/shared-auth";
import { ORDERS_QUERY } from "../graphql/orderQueries";
import Pagination from "./Pagination";
import SortableHeader from "./SortableHeader";

const PAGE_SIZE = 20;
const DEFAULT_SORT_FIELD = "CREATED_AT";
const DEFAULT_SORT_DIRECTION = "DESC";

// Requirement #8 in action: even though every order can have many items,
// and every item resolves a `product`, the order-service DataLoader
// collapses all of those product lookups into a single batched call to
// product-service — this query does NOT cause N+1 network requests.
export default function OrderList() {
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState(DEFAULT_SORT_DIRECTION);

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
    setPage(0);
  };

  const variables = { page, size: PAGE_SIZE, sortField, sortDirection };

  // Production-safe default: polling, same pattern as ProductList — no
  // WebSocket/subscription infrastructure (no OrderChangeListener, no
  // Postgres LISTEN/NOTIFY, no WebSocketAuthInterceptor, no graphql-ws on
  // the client). Coarser than push (background changes take up to 15s to
  // show, instead of instantly), but avoids the entire class of
  // production problems raised earlier: Postgres NOTIFY not being a
  // high-throughput event bus, one dedicated DB connection held open per
  // replica, and unfiltered per-subscriber fan-out cost. Simpler
  // operationally, and correctness doesn't depend on a persistent
  // connection surviving deploys/network blips.
  const { data, loading, error, refetch, networkStatus } = useQuery(ORDERS_QUERY, {
    variables,
    pollInterval: 15_000,
    notifyOnNetworkStatusChange: true, // so `networkStatus` updates during refetch()/poll, driving the spinner below
  });

  const canWrite = authClient.hasRole("order:write");
  const isRefreshing = networkStatus === 4; // Apollo's NetworkStatus.refetch

  if (loading && !data) return <p>Loading orders…</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error.message}</p>;

  return (
    <div>
      <div style={styles.headerRow}>
        <h2>Orders</h2>
        <div style={styles.headerActions}>
          <button onClick={() => refetch()} disabled={isRefreshing} style={styles.refreshBtn}>
            {isRefreshing ? "Refreshing…" : "⟳ Refresh"}
          </button>
          {canWrite && (
            <Link to="new" style={styles.createBtn}>
              + Create order
            </Link>
          )}
        </div>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <SortableHeader
              label="Customer"
              field="CUSTOMER_ID"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Status"
              field="STATUS"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <th style={styles.th}>Items</th>
            <SortableHeader
              label="Created"
              field="CREATED_AT"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <SortableHeader
              label="Updated"
              field="UPDATED_AT"
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <th style={styles.th} />
          </tr>
        </thead>
        <tbody>
          {data.orders.map((order) => (
            <tr key={order.id} style={styles.row}>
              <td style={styles.td}>{order.customerId}</td>
              <td style={styles.td}>
                <span style={styles.statusBadge}>{order.status}</span>
              </td>
              <td style={styles.td}>
                {order.items.map((item) => (
                  <div key={item.id} style={styles.itemLine}>
                    {item.quantity} × {item.product?.name ?? "(unknown product)"}
                  </div>
                ))}
              </td>
              <td style={styles.td}>{formatDate(order.createdAt)}</td>
              <td style={styles.td}>{formatDate(order.updatedAt)}</td>
              <td style={styles.td}>
                {canWrite && <Link to={`${order.id}/edit`}>Update status</Link>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.orders.length === 0 && <p style={{ color: "#888" }}>No orders on this page.</p>}

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        itemCount={data.orders.length}
        onPageChange={setPage}
      />
    </div>
  );
}

function formatDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
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
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "2px solid #ddd",
    whiteSpace: "nowrap",
  },
  row: { borderBottom: "1px solid #eee" },
  td: { padding: "8px 6px", verticalAlign: "top" },
  itemLine: { fontSize: 13 },
  statusBadge: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 12,
    background: "#eef2ff",
    color: "#3730a3",
  },
};
