# Changelog

All notable changes to this project are documented here, newest first.
Each entry lists exactly which files changed and why — see the referenced
files for full implementation detail and inline comments.

## [Unreleased] — Fragments

**Type:** Refactor (data layer). No UI/visual change, no backend change,
no change to what data is returned.

**Changed:**
- `frontend/mfe-orders/src/graphql/orderQueries.js`
  - Added `ORDER_ITEM_FRAGMENT` — a named GraphQL fragment
    (`fragment OrderItemFields on OrderItem { ... }`) extracting the
    `OrderItem` field selection that `ORDERS_QUERY` and `ORDER_QUERY`
    previously each defined separately, with identical field lists.
  - `ORDERS_QUERY`'s `items { ... }` block now spreads
    `...OrderItemFields` instead of repeating all 10 fields inline.
  - `ORDER_QUERY`'s `items { ... }` block does the same.

**Why:** those two queries needed the exact same `OrderItem` shape
(`id`, `productId`, `quantity`, `unitPriceCents`, `product.{id,sku,name,
priceCents,currency}`), and that selection was copy-pasted in both
places — a real risk that a future field addition/removal gets updated
in one query and forgotten in the other. A shared fragment makes that
structurally impossible: there's exactly one place the `OrderItem` shape
is defined.

**Not changed:** `OrderList.jsx`, `OrderEdit.jsx`,
`OrderItemDetailsDialog.jsx`, and everything backend — the data shape
returned to the UI is byte-for-byte identical to before. Fragments are a
query-authoring convenience; they're expanded back into the same flat
field selection before the request is sent over the wire.

---

## UI polish pass

**Type:** Frontend only. Cosmetic/UX, no data-layer or backend change.

**Added:**
- `frontend/shell/src/theme.js` — `createAppTheme(mode)`, builds a
  light or dark MUI theme (was a single static `theme` export before).
- `frontend/shell/src/colorModeContext.js` (new) — React Context
  carrying the current color mode + a toggle function.
- `frontend/shell/src/App.jsx` — mode state initialized from
  `localStorage` (falls back to the OS's `prefers-color-scheme`),
  persisted on toggle; rebuilds the theme via `useMemo` when mode changes.
- `frontend/shell/src/components/Header.jsx`
  - Dark/light toggle `IconButton` (sun/moon icon) wired to the context.
  - Mobile nav rebuilt as a real MUI `Drawer` (slide-out panel with
    `List`/`ListItemButton`/`ListItemIcon`) — previously a dropdown
    `Menu`, which isn't actually a Drawer pattern.
- `frontend/mfe-products/src/components/TableSkeleton.jsx`,
  `frontend/mfe-orders/src/components/TableSkeleton.jsx` (new, one per
  remote — each app is built independently) — renders placeholder table
  rows shaped like real data, instead of a generic spinner.
- `frontend/mfe-products/src/components/FormSkeleton.jsx`,
  `frontend/mfe-orders/src/components/FormSkeleton.jsx` (new) — same
  idea, shaped like each form's actual field layout.

**Changed:**
- `frontend/mfe-products/src/components/ProductList.jsx`,
  `frontend/mfe-orders/src/components/OrderList.jsx` — restructured so
  the page header/toolbar/table-head render immediately; only the table
  *body* shows a skeleton during the initial load (`loading && !data`).
  A background poll/refetch no longer blanks anything — it updates data
  in place since `data` is already populated by then.
- `frontend/mfe-products/src/components/ProductEdit.jsx`,
  `frontend/mfe-orders/src/components/OrderEdit.jsx` — swapped
  `CircularProgress` for `FormSkeleton` on initial load.

---

## Item details modal

**Type:** Frontend only, reusing existing backend fields (no schema or
resolver changes — `unitPriceCents`, `product.id`, `product.sku` already
existed on `order-service`'s types).

**Added:**
- `frontend/mfe-orders/src/components/OrderItemDetailsDialog.jsx` (new)
  — MUI `Dialog` showing Product ID, SKU, Name, Quantity, Unit price,
  computed Line total, Order Item ID. Handles a deleted/unresolvable
  product gracefully (shows a warning instead of breaking).

**Changed:**
- `frontend/mfe-orders/src/graphql/orderQueries.js` — `ORDERS_QUERY`/
  `ORDER_QUERY` extended to select `unitPriceCents`, `product.id`,
  `product.sku` (pre-existing backend fields, just not previously
  requested by these queries).
- `OrderList.jsx`, `OrderEdit.jsx` — order items are now clickable
  (`Link`/`ListItemButton`), opening the dialog for that item.

---

## Autocomplete product picker

**Type:** Frontend only, reuses the existing `products` query
(`product-service`'s schema/resolver were not changed).

**Added:**
- `frontend/mfe-orders/src/graphql/productLookupQueries.js` (new) — a
  minimal query against product-service's existing `products(page,
  size)` field.
- `frontend/mfe-orders/src/productLookupClientContext.js` (new) — React
  Context carrying a second Apollo Client instance scoped to
  `product-service`, since order-service's own schema has no products
  query of its own.

**Changed:**
- `frontend/mfe-orders/src/OrdersApp.jsx` — creates and provides the
  second Apollo Client via the new context.
- `frontend/mfe-orders/src/components/OrderItemsEditor.jsx` — the old
  free-text "Product ID" field replaced with an MUI `Autocomplete`
  populated from `product-service`, showing `name (sku)` as the option
  label; the underlying stored value is still the product's `id`.

**Depends on a real permission:** the logged-in user needs `product:read`
(in addition to `order:write`) for the autocomplete to load results —
both seeded demo users (`demo.user`, `readonly.user`) already have it.

---

## Bug fix — product resolution was silently broken

**Type:** Backend only.

**Changed:**
- `backend/product-service/src/main/java/com/demo/product/repository/ProductRepository.java`
  — `findAllByIdIn`'s query changed from
  `SELECT * FROM products WHERE id = ANY(:ids)` to
  `SELECT * FROM products WHERE id IN (:ids)`.

**Why:** `= ANY(:ids)` requires a `Collection<UUID>` parameter to be
coerced into a genuine Postgres array bind value — driver/version
dependent, and it was silently matching nothing (not erroring, just
never matching), which meant every `OrderItem.product` field resolved to
`null` regardless of whether the referenced product actually existed.
`IN (:ids)` is Spring Data R2DBC's officially documented Collection
parameter binding — reliably expands to one placeholder per element.

---

## Permission gaps in the nav/forms

**Type:** Frontend only.

**Changed:**
- `frontend/shell/src/components/NavGroup.jsx` — added a `createRole`
  prop; the "Create" submenu item only renders if
  `authClient.hasRole(createRole)` is true.
- `frontend/shell/src/components/Header.jsx` — passes `product:write`/
  `order:write` to each `NavGroup`; the mobile nav item list is filtered
  the same way.
- `frontend/mfe-products/src/components/ProductCreate.jsx`,
  `ProductEdit.jsx`, `frontend/mfe-orders/src/components/OrderCreate.jsx`
  — added a page-level role guard (shows a warning `Alert` instead of a
  form that's guaranteed to fail on submit) for anyone who navigates
  directly to a create/edit URL, bypassing the now-hidden nav entry.
- `frontend/mfe-orders/src/components/OrderEdit.jsx` — viewing stays
  available for `order:read` alone; only the status `Select`/"Update
  status" button are gated behind `order:write`.

**Why:** the nav previously offered "Create" to every user regardless of
role — the backend's `@PreAuthorize` always correctly rejected the
mutation, but the UI shouldn't dangle an action the user can't complete.

---

## Material UI conversion

**Type:** Frontend only.

**Changed:** every custom-CSS component across `shell`, `mfe-products`,
`mfe-orders` converted to MUI equivalents — `AppBar`/`Toolbar`, `Table`/
`TableContainer`/`TableSortLabel`, `Dialog`, `Grid` (responsive forms),
`Menu`/`MenuItem` (nav submenus), `Pagination`, `Chip`, `Alert`,
`Select`, `Autocomplete`, `List`. Added `@mui/material`,
`@mui/icons-material`, `@emotion/react`, `@emotion/styled` to all three
apps' `package.json` and Module Federation `shared` config.

---

## GraphQL Subscriptions — added, then removed

**Type:** Backend + frontend, net removal.

Order-service originally gained a full push-based live-update pipeline:
`subscription { orderUpdated }`, a Postgres `LISTEN`/`NOTIFY` trigger (so
it worked regardless of who wrote the row — this API, omnichannel, batch
imports), `customerId`-scoped filtering, WebSocket auth via the
`connection_init` payload, reconnect-triggered cache resync. It worked,
but was deliberately removed as a production-safety decision: Postgres
`NOTIFY` isn't a high-throughput event bus, and it required one dedicated
DB connection held open per `order-service` replica. Replaced with
15-second polling (`pollInterval` in `ProductList.jsx`/`OrderList.jsx`)
plus a manual refresh button — see the "Real-time updates & cache
freshness" section in `README.md` for the full reasoning.
