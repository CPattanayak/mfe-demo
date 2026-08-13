import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@apollo/client";
import { CREATE_ORDER, ORDERS_QUERY } from "../graphql/orderQueries";
import OrderItemsEditor from "./OrderItemsEditor";

export default function OrderCreate() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);

  const [createOrder, { loading, error }] = useMutation(CREATE_ORDER, {
    refetchQueries: [{ query: ORDERS_QUERY, variables: { page: 0, size: 20 } }],
    onCompleted: () => navigate("/orders"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createOrder({
      variables: {
        input: {
          customerId,
          items: items
            .filter((i) => i.productId)
            .map((i) => ({ productId: i.productId, quantity: i.quantity })),
        },
      },
    });
  };

  return (
    <div>
      <Link to="/orders">&larr; Back to orders</Link>
      <h2>Create order</h2>
      {error && <p style={{ color: "crimson" }}>{error.message}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.field}>
          Customer ID
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
        </label>

        <div style={styles.field}>
          <span>Items</span>
          <OrderItemsEditor items={items} onChange={setItems} />
        </div>

        <button type="submit" disabled={loading} style={styles.submit}>
          {loading ? "Creating…" : "Create order"}
        </button>
      </form>
    </div>
  );
}

const styles = {
  form: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 },
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
