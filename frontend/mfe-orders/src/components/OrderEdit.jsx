import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client";
import { ORDER_QUERY, ORDERS_QUERY, UPDATE_ORDER_STATUS } from "../graphql/orderQueries";

const STATUS_OPTIONS = ["PENDING", "PAID", "SHIPPED", "CANCELLED"];

// order-service's GraphQL schema only exposes updateOrderStatus (see
// backend/order-service/schema.graphqls) — there's no generic "edit line
// items" mutation, so this "edit" screen is scoped to what the API
// actually supports: reviewing the order and changing its status.
export default function OrderEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("PENDING");

  const { data, loading: loadingOrder, error: loadError } = useQuery(ORDER_QUERY, {
    variables: { id },
    onCompleted: (result) => setStatus(result.order.status),
  });

  const [updateStatus, { loading: saving, error: saveError }] = useMutation(
    UPDATE_ORDER_STATUS,
    {
      refetchQueries: [{ query: ORDERS_QUERY, variables: { page: 0, size: 20 } }],
      onCompleted: () => navigate("/orders"),
    }
  );

  useEffect(() => {
    if (data?.order?.status) setStatus(data.order.status);
  }, [data]);

  if (loadingOrder) return <p>Loading order…</p>;
  if (loadError) return <p style={{ color: "crimson" }}>{loadError.message}</p>;
  if (!data?.order) return <p>Order not found.</p>;

  return (
    <div>
      <Link to="/orders">&larr; Back to orders</Link>
      <h2>Order — {data.order.customerId}</h2>
      {saveError && <p style={{ color: "crimson" }}>{saveError.message}</p>}

      <ul>
        {data.order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.product?.name ?? item.productId}
          </li>
        ))}
      </ul>

      <label style={styles.field}>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <button
        disabled={saving}
        onClick={() => updateStatus({ variables: { id, status } })}
        style={styles.submit}
      >
        {saving ? "Saving…" : "Update status"}
      </button>
    </div>
  );
}

const styles = {
  field: { display: "flex", flexDirection: "column", gap: 4, fontSize: 13, maxWidth: 200, marginTop: 12 },
  submit: {
    marginTop: 12,
    padding: "8px 14px",
    border: "none",
    borderRadius: 4,
    background: "#1a73e8",
    color: "#fff",
    cursor: "pointer",
  },
};
