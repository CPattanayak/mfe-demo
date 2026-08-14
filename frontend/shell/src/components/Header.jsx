import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import MenuIcon from "@mui/icons-material/Menu";
import { authClient } from "@demo/shared-auth";
import NavGroup from "./NavGroup";

const NAV_ITEMS = [
  { label: "Products — List", path: "/products" },
  { label: "Products — Create", path: "/products/new", requiresRole: "product:write" },
  { label: "Orders — List", path: "/orders" },
  { label: "Orders — Create", path: "/orders/new", requiresRole: "order:write" },
];

export default function Header() {
  const navigate = useNavigate();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  // Same fix as NavGroup.jsx: don't dangle a "Create" entry the user's
  // role can't actually complete (was showing for readonly.user before).
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresRole || authClient.hasRole(item.requiresRole)
  );

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: { xs: 1, sm: 3 } }}>
        {/* Mobile: hamburger menu replaces the inline Products/Orders nav */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <IconButton onClick={(e) => setMobileMenuAnchor(e.currentTarget)} edge="start">
            <MenuIcon />
          </IconButton>
          <Menu
            anchorEl={mobileMenuAnchor}
            open={Boolean(mobileMenuAnchor)}
            onClose={() => setMobileMenuAnchor(null)}
          >
            {visibleNavItems.map((item) => (
              <MenuItem
                key={item.path}
                onClick={() => {
                  setMobileMenuAnchor(null);
                  navigate(item.path);
                }}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Typography
          variant="h6"
          noWrap
          sx={{ fontWeight: 700, mr: { xs: 0, sm: 2 }, fontSize: { xs: "1rem", sm: "1.25rem" } }}
        >
          MFE Demo
        </Typography>

        {/* Desktop/tablet: inline nav with submenus */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1, flexGrow: 1 }}>
          <NavGroup label="Products" basePath="/products" createRole="product:write" />
          <NavGroup label="Orders" basePath="/orders" createRole="order:write" />
        </Box>
        <Box sx={{ display: { xs: "block", md: "none" }, flexGrow: 1 }} />

        <Typography variant="body2" sx={{ mr: 1, display: { xs: "none", sm: "block" } }}>
          {authClient.getUsername()}
        </Typography>
        <IconButton onClick={(e) => setUserMenuAnchor(e.currentTarget)} size="small">
          <Avatar sx={{ width: 32, height: 32 }}>
            {(authClient.getUsername() || "?").charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
        <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)}>
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null);
              authClient.changePassword();
            }}
          >
            Change password
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setUserMenuAnchor(null);
              authClient.logout();
            }}
          >
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
