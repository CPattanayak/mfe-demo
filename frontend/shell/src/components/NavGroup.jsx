import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * A top-level nav item ("Products", "Orders") with List/Create sub-links
 * underneath it — the shell-level equivalent of each micro-frontend's own
 * internal create/edit/list routes.
 */
export default function NavGroup({ label, basePath }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(basePath);

  return (
    <div style={styles.group}>
      <Link
        to={basePath}
        style={{ ...styles.groupLabel, ...(isActive ? styles.active : {}) }}
      >
        {label}
      </Link>
      <div style={styles.subLinks}>
        <Link to={basePath} style={styles.subLink}>
          List
        </Link>
        <Link to={`${basePath}/new`} style={styles.subLink}>
          Create
        </Link>
      </div>
    </div>
  );
}

const styles = {
  group: { display: "flex", flexDirection: "column", gap: 2 },
  groupLabel: {
    textDecoration: "none",
    color: "#1a73e8",
    fontWeight: 600,
    fontSize: 15,
  },
  active: { textDecoration: "underline" },
  subLinks: { display: "flex", gap: 10, fontSize: 12 },
  subLink: { textDecoration: "none", color: "#666" },
};
