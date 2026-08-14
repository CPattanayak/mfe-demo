import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

/**
 * Top-level nav item ("Products", "Orders") that opens an MUI Menu
 * submenu with List/Create — replaces the old always-visible sub-links.
 */
export default function NavGroup({ label, basePath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname.startsWith(basePath);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

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
        <MenuItem onClick={() => go(`${basePath}/new`)}>Create</MenuItem>
      </Menu>
    </>
  );
}
