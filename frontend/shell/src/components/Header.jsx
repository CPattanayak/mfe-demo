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
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import MenuIcon from "@mui/icons-material/Menu";
import InventoryIcon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import HubIcon from "@mui/icons-material/Hub";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { authClient } from "@demo/shared-auth";
import { useColorMode } from "../colorModeContext";
import NavGroup from "./NavGroup";

const NAV_ITEMS = [
  { label: "Products", path: "/products", icon: InventoryIcon },
  { label: "New product", path: "/products/new", icon: AddCircleOutlineIcon, requiresRole: "product:write" },
  { label: "Orders", path: "/orders", icon: ReceiptLongIcon },
  { label: "New order", path: "/orders/new", icon: AddCircleOutlineIcon, requiresRole: "order:write" },
  { label: "Federation demo", path: "/orders/federation-demo", icon: HubIcon },
];

export default function Header() {
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Same permission fix as NavGroup's submenu: don't offer "New order" /
  // "New product" to a user without the matching *:write role.
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.requiresRole || authClient.hasRole(item.requiresRole)
  );

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: { xs: 1, sm: 3 } }}>
        {/* Mobile: a real slide-out Drawer, not a dropdown menu */}
        <Box sx={{ display: { xs: "flex", md: "none" } }}>
          <IconButton onClick={() => setDrawerOpen(true)} edge="start">
            <MenuIcon />
          </IconButton>
          <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <Box sx={{ width: 260 }} role="presentation">
              <Typography variant="h6" sx={{ px: 2, py: 2, fontWeight: 700 }}>
                MFE Demo
              </Typography>
              <Divider />
              <List>
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <ListItemButton
                      key={item.path}
                      onClick={() => {
                        setDrawerOpen(false);
                        navigate(item.path);
                      }}
                    >
                      <ListItemIcon>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          </Drawer>
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
          <NavGroup
            label="Orders"
            basePath="/orders"
            createRole="order:write"
            extraItems={[{ label: "Federation demo", path: "/orders/federation-demo" }]}
          />
        </Box>
        <Box sx={{ display: { xs: "block", md: "none" }, flexGrow: 1 }} />

        <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton onClick={toggle} sx={{ mr: 0.5 }}>
            {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Tooltip>

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
