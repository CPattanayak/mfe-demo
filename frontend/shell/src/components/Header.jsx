import React from "react";
import { authClient } from "@demo/shared-auth";
import NavGroup from "./NavGroup";

export default function Header() {
  return (
    <header style={styles.header}>
      <nav style={styles.nav}>
        {/* Requirement: "Create Order"/"List" etc as sub-links under each
            top-level nav item. */}
        <NavGroup label="Products" basePath="/products" />
        <NavGroup label="Orders" basePath="/orders" />
      </nav>
      <div style={styles.userBox}>
        <span>{authClient.getUsername()}</span>
        {/* Requirement #5: logout + change-password entry points */}
        <button onClick={() => authClient.changePassword()} style={styles.btn}>
          Change password
        </button>
        <button onClick={() => authClient.logout()} style={styles.btn}>
          Logout
        </button>
      </div>
    </header>
  );
}

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "12px 20px",
    borderBottom: "1px solid #ddd",
    fontFamily: "sans-serif",
  },
  nav: { display: "flex", gap: 28 },
  userBox: { display: "flex", gap: 8, alignItems: "center" },
  btn: {
    padding: "6px 10px",
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  },
};
