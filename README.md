# Module Federation + Keycloak + GraphQL + R2DBC Sample Platform

A reference/sample project showing how to wire together a React Module
Federation micro‑frontend platform with Keycloak auth, Apollo Client,
Spring GraphQL microservices (reactive, R2DBC), DataLoader batching,
GraphQL‑level permissions, MinIO static hosting, and Kubernetes deployment.

> This is a **learning scaffold**, not a production-hardened system. Secrets,
> TLS, HA config, etc. are simplified so the architecture is easy to read.
> Treat every password/secret in this repo as a placeholder to rotate.

## What's included, mapped to your requirements

| # | Requirement | Where |
|---|---|---|
| 1 | React Module Federation micro-frontends | `frontend/shell` (host) + `frontend/mfe-products`, `frontend/mfe-orders` (remotes). Each remote owns its own `list` / `create` / `:id/edit` routes (`ProductsApp.jsx`, `OrdersApp.jsx`) built from individual `.jsx` components under `src/components/`, and the shell's nav (`components/NavGroup.jsx`) exposes "List"/"Create" as sub-links under "Products"/"Orders" |
| 2 | Publish to MinIO via Docker (local dev) / CDN (QA) | `infra/minio`, `docker-compose.yml` (`mc` bucket bootstrap job), `k8s/minio.yaml`, `scripts/publish-to-minio.sh` for local dev; `cdn/`, `docker-compose.qa.yml`, `k8s/qa/cdn.yaml` for QA |
| 3 | Keycloak login | `infra/keycloak/realm-export.json`, `frontend/shared-auth` |
| 4 | Regular refresh token + shared auth token across MFEs | `frontend/shared-auth/src/authClient.js` (silent refresh loop), exposed as a Module Federation shared singleton |
| 5 | Logout + change password URLs | `frontend/shared-auth/src/authClient.js` (`logout()`, `changePassword()`) |
| 6 | Apollo Client to backend GraphQL | `frontend/shared-auth/src/apolloClient.js` |
| 7 | Spring microservices exposing GraphQL schema | `backend/product-service`, `backend/order-service` (Spring GraphQL) |
| 8 | DataLoader to fix N+1 | `backend/order-service/.../dataloader/ProductDataLoader.java` (batches Order→Product lookups) |
| 9 | GraphQL permissions | `@PreAuthorize` on `@SchemaMapping`/`@MutationMapping` methods, backed by Keycloak realm roles in the JWT |
| 10 | Postgres R2DBC reactive repos for queries & mutations | `ProductRepository`, `OrderRepository` (`ReactiveCrudRepository`) |
| 11 | Kubernetes deployment for prod | `k8s/*.yaml` |
| 12 | One DB, multiple schemas | `infra/postgres/init.sql` (`product_schema`, `order_schema` in a single `appdb` database) |
| — | Per-environment config | `frontend/shared-auth/src/config.js` (local/qa/production URL sets, selected at build time by `APP_ENV`) |

## High-level architecture

```
                         ┌─────────────────────────┐
                         │        Keycloak          │
                         │  realm: microfrontend-demo│
                         └────────────┬─────────────┘
                                      │ OIDC (PKCE)
                                      ▼
┌───────────────────────────── Browser ─────────────────────────────┐
│  shell (host, MF)                                                  │
│   ├─ shared-auth (singleton via Module Federation "shared")        │
│   │    - keycloak-js session, silent refresh, Apollo Client        │
│   ├─ remote: mfe-products  ──┐                                     │
│   └─ remote: mfe-orders    ──┤  both reuse the SAME Keycloak token │
└──────────────────────────────┼──────────────────────────────────────┘
                                │ GraphQL (Bearer <access_token>)
                 ┌──────────────┴───────────────┐
                 ▼                               ▼
     ┌────────────────────┐          ┌────────────────────┐
     │   product-service   │          │    order-service    │
     │  Spring GraphQL      │◄────────┤  Spring GraphQL      │
     │  R2DBC (product_schema)│ WebClient (batched via     │
     │                      │  DataLoader) │  R2DBC (order_schema)│
     └──────────┬───────────┘          └──────────┬───────────┘
                │                                  │
                └───────────────┬──────────────────┘
                                 ▼
                     ┌─────────────────────┐
                     │   PostgreSQL: appdb   │
                     │  schemas: product_schema, order_schema │
                     └─────────────────────┘

MinIO hosts the built static assets for shell / mfe-products / mfe-orders
(each MFE is published as an object prefix, served through nginx or the
MinIO console/gateway, or fronted by an Ingress in k8s).
```

## Importing into an IDE

**Backend (Java/Maven):** open/import the root **`pom.xml`** — it's a Maven
reactor/aggregator POM whose `<modules>` are `backend/product-service` and
`backend/order-service`. Importing it (IntelliJ: *Open* → select
`pom.xml`; Eclipse/VS Code + Java extension pack: *Import Maven Project*)
pulls in both microservices as linked modules, so you get cross-module
navigation, one consistent dependency/BOM version set, and can run
`mvn -pl backend/product-service -am spring-boot:run` (or the equivalent
"Run" button per module) straight from the IDE. `mvn clean install` from
the root builds both services in the correct order.

**Frontend (Node/webpack):** open the `frontend/` folder directly in a
JS-aware editor (VS Code, WebStorm). It's a set of independent npm
packages (`shell`, `mfe-products`, `mfe-orders`, `shared-auth`) rather than
a single npm/yarn workspace — see the per-package `package.json` files. If
you'd rather manage them as one workspace, add a root `package.json` with
`"workspaces": ["frontend/*"]` and run `npm install` from `frontend/`.

## Repo layout (top-level)

```
mfe-demo/
├── pom.xml                # root Maven reactor POM — import this in your IDE
├── docker-compose.yml
├── backend/
│   ├── product-service/   # module of the root pom.xml
│   └── order-service/     # module of the root pom.xml
├── frontend/
│   ├── shell/, mfe-products/, mfe-orders/, shared-auth/
├── cdn/                    # QA/prod CDN edge image (nginx) — see below
├── infra/                 # postgres init.sql, keycloak realm export
├── k8s/                   # production manifests
│   └── qa/                 # QA overlay (namespace mfe-demo-qa, CDN instead of MinIO)
├── docker-compose.yml      # local dev (MinIO)
├── docker-compose.qa.yml   # QA (CDN edge)
└── scripts/                # publish-to-minio.sh
```

## Routing inside each micro-frontend

Each remote owns its own create/edit/list routes rather than the shell
knowing about them — the shell only mounts `mfeProducts` at `/products/*`
and `mfeOrders` at `/orders/*`:

```
frontend/mfe-products/src/
├── ProductsApp.jsx           # router: index -> list, /new -> create, /:id/edit -> edit
└── components/
    ├── ProductList.jsx       # list + "Create product" link + per-row "Edit" link
    ├── ProductForm.jsx       # individual, reusable form (shared by Create and Edit)
    ├── ProductCreate.jsx     # create page (CREATE_PRODUCT mutation)
    └── ProductEdit.jsx       # edit page (loads by id, UPDATE_PRODUCT mutation)

frontend/mfe-orders/src/
├── OrdersApp.jsx             # router: index -> list, /new -> create, /:id/edit -> edit
└── components/
    ├── OrderList.jsx         # list + "Create order" link + per-row "Update status" link
    ├── OrderItemsEditor.jsx  # individual, reusable line-items editor
    ├── OrderCreate.jsx       # create page (CREATE_ORDER mutation)
    └── OrderEdit.jsx         # "edit" page — order-service's schema only exposes
                                #  updateOrderStatus, so this is scoped to that
```

Every component is its own `.jsx` file (modern JSX, not plain `.js`) —
`webpack.config.js` in each app adds `resolve.extensions: [".js", ".jsx"]`
and injects `process.env.APP_ENV` via `webpack.DefinePlugin` so
`shared-auth/src/config.js` resolves at build time (see below).

In the shell, `components/NavGroup.jsx` renders each top-level nav item
("Products", "Orders") with **List**/**Create** as sub-links underneath —
so "Create Order" and "List" appear as sub-links in the shell's own nav,
in addition to the equivalent links inside each remote's own UI.

## Per-environment config (`config.js`)

`frontend/shared-auth/src/config.js` holds one block per environment
(`local`, `qa`, `production`) with that environment's Keycloak URL/realm
and each backend's GraphQL URL. Which block gets used is decided **at
build time**, not at runtime: every webpack config statically injects
`process.env.APP_ENV` via `webpack.DefinePlugin`, so a QA build only ever
contains QA URLs (no other environment's config ships in the bundle).

```bash
# local (default)
npm run build                 # APP_ENV defaults to "local" in webpack.config.js

# qa
APP_ENV=qa npm run build

# production
APP_ENV=production npm run build
```

Docker builds pass this the same way, e.g. `cdn/Dockerfile` takes
`--build-arg APP_ENV=qa` (see `docker-compose.qa.yml`). Add a new
environment by adding a key to `config.js`'s `ENVIRONMENTS` object.

## Real-time updates & cache freshness

**The problem:** `fetchPolicy: "cache-and-network"` only re-hits the
network when a query component (re)mounts or its variables change. It does
NOT poll and does NOT know about changes that happen elsewhere while the
query is just sitting there mounted — e.g. a colleague updates an order's
status in another tab, or an omnichannel/POS system writes an order
directly. Mutations made *from the same tab* already fix themselves up via
`refetchQueries` (see `ProductCreate`/`ProductEdit`/`OrderCreate`/
`OrderEdit`), but that doesn't help with changes from anywhere else.

**What this demo settled on: polling, for both products AND orders.**
`ProductList.jsx` and `OrderList.jsx` both use `pollInterval: 15_000` on
their `useQuery` calls, plus a manual "⟳ Refresh" button for immediate
resync. Background changes take up to 15 seconds to show, instead of
being pushed instantly — a real trade-off, made deliberately.

**Why not GraphQL Subscriptions (they were built, then removed):**
An earlier version of this demo had a full subscription-based push
pipeline for orders — `subscription { orderUpdated }`, a Postgres
`LISTEN`/`NOTIFY` trigger so it worked regardless of who wrote the row
(this GraphQL API, omnichannel, batch imports), `customerId`-scoped
filtering, WebSocket authentication via the `connection_init` payload,
reconnect-triggered cache resync, and ingress WebSocket timeout tuning.
It worked. It was also judged not worth the operational risk for a
production default, for reasons that surfaced while stress-testing it:

- Postgres's `NOTIFY` queue is a bounded, shared structure — not designed
  as a high-throughput event bus. At real sustained order volume, it can
  back up faster than listeners drain it. Worse: the trigger fired
  `pg_notify()` **synchronously inside the same transaction as the order
  write**, meaning a notification-system problem could, in the worst
  case, fail or block the order write itself — a live-update feature
  taking down core business writes is a bad trade at any scale.
- Each `order-service` replica had to hold one dedicated, non-pooled
  Postgres connection open for its entire lifetime just to `LISTEN`. More
  replicas (needed to handle more load) directly meant more permanent
  connection pressure on Postgres — compounding the point above rather
  than helping it.
- Even with `customerId` scoping, every subscriber's `Flux` still got
  touched by every published event before the filter ran — real,
  unavoidable per-event fan-out cost that scaled with subscriber count.

None of that is wrong for every use case — a system that genuinely needs
instant push (e.g. live inventory during a flash sale) might reasonably
accept these trade-offs, ideally backed by a real event bus (Redis
Pub/Sub, Kafka, NATS) instead of Postgres `NOTIFY`/`LISTEN`, which is not
built for this. For this project, polling was chosen as the safer default:
no persistent-connection infrastructure to operate, no coupling between a
"nice to have" live-update feature and the correctness of order writes,
and correctness that doesn't depend on a connection surviving deploys or
network blips. `shared-auth/apolloClient.js` still supports an optional
`subscriptionUri` for a future event bus that doesn't have Postgres
`NOTIFY`'s throughput ceiling — nothing in this codebase currently uses
it.

## Pagination & sorting (orders grid)

`OrderList.jsx` is a sortable, paginated grid backed entirely by
server-side pagination/sorting — not a client-side slice/sort of a large
fetched dataset:

- **Pagination**: `page`/`size` are real component state, changed by
  `Pagination.jsx`'s Previous/Next buttons. `hasNextPage` is a heuristic
  (page came back full) since `orders(...)` returns a plain list, not a
  total count — see `Pagination.jsx`'s comment.
- **Sorting**: clicking a column header (`SortableHeader.jsx`) sets
  `sortField`/`sortDirection`, which `OrderGraphQLController.orders()`
  turns into a real Spring Data `Sort`/`ORDER BY` — sorting the whole
  dataset, not just the current page. Both product-service's and
  order-service's paginated queries always apply an explicit `Sort`
  (never unsorted) with `id` appended as a final tiebreaker, so page
  boundaries stay stable instead of rows shifting/duplicating between
  requests — Postgres doesn't guarantee row order across separate queries
  without one.
- **Refresh from backend**: the 15s poll keeps the current page/sort
  reasonably fresh automatically; the "⟳ Refresh" button forces an
  immediate `refetch()` for whatever page/sort is active.

## Would this survive 100M orders/day?

Short answer: **no, not as-is**, independent of the polling-vs-subscription
question above — several other parts of this demo architecture would
degrade or fail well before that volume:

- **Offset-based pagination doesn't hold up.** `PageRequest.of(page,
  size, sort)` uses `OFFSET`/`LIMIT`; at high row counts, deep pages
  require scanning and discarding millions of rows first. Needs
  **keyset/cursor pagination** (`WHERE (createdAt, id) < (:lastCreatedAt,
  :lastId) ORDER BY createdAt DESC, id LIMIT :size`) instead.
- **An unpartitioned `orders` table won't scale to this row count.**
  ~36B+ rows/year with no partitioning means vacuum, index maintenance,
  and backup/restore all degrade badly. Needs date-range partitioning
  from the start at this scale.
- **Polling at high concurrency is its own real cost.** Every open
  `OrderList`/`ProductList` polling every 15s is still N clients × 1
  query/15s hitting the database — bounded and predictable (unlike the
  subscription fan-out issue above), but still real load that needs
  capacity planning as concurrent viewers grow.

None of this is implemented here — genuinely handling 100M orders/day is
a different infrastructure tier (partitioned tables, keyset pagination,
likely read replicas or a different datastore for the query side) than
what a demo/reference project should carry.

## Local run (docker-compose)

```bash
docker compose up -d --build
```

Services:
- Keycloak: http://localhost:8080 (admin/admin) — realm auto-imported
- MinIO console: http://localhost:9001 (minioadmin/minioadmin)
- product-service GraphQL: http://localhost:8081/graphql (+ /graphiql)
- order-service GraphQL: http://localhost:8082/graphql (+ /graphiql)
- shell app: http://localhost:3000

Demo user created by the realm import: `demo.user` / `Passw0rd!`
(roles: `product:read`, `product:write`, `order:read`, `order:write`)

## QA environment: CDN instead of MinIO

MinIO (above) is a good stand-in for "some object store" for local dev,
but it isn't a CDN — no immutable-asset caching, no gzip negotiation, and
it's awkward to front with a real Ingress/TLS for a shared QA environment.
For QA, static assets are served by a small **CDN edge** (`cdn/`) instead:
an nginx origin, built from `cdn/Dockerfile`, that bundles shell +
mfe-products + mfe-orders together and serves them with real CDN cache
semantics (content-hashed JS/CSS cached as `immutable` for a year;
`index.html`/`remoteEntry.js` always revalidated so new deploys are picked
up). See `cdn/nginx.conf` for the exact rules.

```bash
docker compose -f docker-compose.qa.yml up -d --build
# shell:        http://localhost:8090
# mfe-products: http://localhost:8090/products/
# mfe-orders:   http://localhost:8090/orders/
```

For Kubernetes, `k8s/qa/` is a separate overlay (namespace `mfe-demo-qa`)
that deploys this same CDN edge instead of MinIO, alongside single-replica
Postgres/Keycloak/backends sized for QA rather than prod. See
`k8s/qa/README.md`. In a real hosted QA environment you'd typically put an
actual cloud CDN (CloudFront / Cloud CDN / Cloudflare) in front of this
same nginx origin rather than exposing it directly to the internet.

## Publishing the micro-frontends to MinIO (local dev)

```bash
./scripts/publish-to-minio.sh
```

This builds each frontend (webpack) and uploads `dist/` to a bucket/prefix
per app (`mfe-assets/shell`, `mfe-assets/products`, `mfe-assets/orders`),
so `remoteEntry.js` URLs resolve to MinIO-served static files — the same
pattern used for CDN-hosted Module Federation remotes in production.

## Kubernetes

**Prod** (`k8s/`, namespace `mfe-demo`, MinIO-published assets):

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

See `k8s/README.md` for ingress hostnames and secrets you must supply.

**QA** (`k8s/qa/`, namespace `mfe-demo-qa`, CDN-edge assets, single-replica
backing services): see `k8s/qa/README.md`.
