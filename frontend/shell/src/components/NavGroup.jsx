import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authClient } from "@demo/shared-auth";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

/**
 * Top-level nav item ("Products", "Orders") that opens an MUI Menu
 * submenu with List/Create.
 *
 * Fix: "Create" used to render unconditionally regardless of role — a
 * readonly.user (product:read/order:read only, no *:write) would see a
 * "Create" option that always failed once clicked, since the backend's
 * @PreAuthorize("hasRole('product:write')") correctly rejects the
 * mutation anyway. The backend was never the security boundary that was
 * missing; this is purely about not dangling an action the UI already
 * knows the user can't complete. `createRole` is optional — omit it for
 * a nav group that has no write-gated create action.
 */
export default function NavGroup({ label, basePath, createRole, extraItems = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith(basePath);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const canCreate = !createRole || authClient.hasRole(createRole);

  const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const go = (path) => {
    navigate(path);
    handleClose();
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        color={isActive ? "primary" : "inherit"}
        endIcon={<ArrowDropDownIcon />}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        {label}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem onClick={() => go(basePath)}>List</MenuItem>
        {canCreate && <MenuItem onClick={() => go(`${basePath}/new`)}>Create</MenuItem>}
        {extraItems.map((item) => (
          <MenuItem key={item.path} onClick={() => go(item.path)}>
            {item.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
