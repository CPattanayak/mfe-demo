-- Single database ("appdb"), multiple schemas — one per microservice.
-- Each service connects with a role scoped to its own schema only.

CREATE SCHEMA IF NOT EXISTS product_schema;
CREATE SCHEMA IF NOT EXISTS order_schema;
CREATE SCHEMA IF NOT EXISTS inventory_schema;
CREATE SCHEMA IF NOT EXISTS rating_schema;

-- ---------------------------------------------------------------------
-- Roles: least-privilege per microservice (both point at the same DB)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'product_service') THEN
    CREATE ROLE product_service LOGIN PASSWORD 'product_service_pwd';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'order_service') THEN
    CREATE ROLE order_service LOGIN PASSWORD 'order_service_pwd';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'inventory_service') THEN
    CREATE ROLE inventory_service LOGIN PASSWORD 'inventory_service_pwd';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rating_service') THEN
    CREATE ROLE rating_service LOGIN PASSWORD 'rating_service_pwd';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA product_schema   TO product_service;
GRANT USAGE ON SCHEMA order_schema     TO order_service;
GRANT USAGE ON SCHEMA inventory_schema TO inventory_service;
GRANT USAGE ON SCHEMA rating_schema    TO rating_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA product_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO product_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA order_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO order_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA inventory_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO inventory_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA rating_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rating_service;

-- order_service also needs read access to product_schema.products
-- for validation / fallback joins (in general prefer calling the
-- product-service GraphQL API instead of cross-schema joins).
GRANT USAGE ON SCHEMA product_schema TO order_service;

-- ---------------------------------------------------------------------
-- product_schema
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_schema.products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku         VARCHAR(64) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price_cents BIGINT NOT NULL CHECK (price_cents >= 0),
    currency    VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_by  VARCHAR(128) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON product_schema.products TO order_service;

INSERT INTO product_schema.products (sku, name, description, price_cents, created_by)
VALUES
  ('SKU-001', 'Wireless Mouse', 'Ergonomic 2.4GHz wireless mouse', 2499, 'seed'),
  ('SKU-002', 'Mechanical Keyboard', 'Hot-swappable RGB keyboard', 8999, 'seed'),
  ('SKU-003', '27" Monitor', '27 inch 4K IPS monitor', 34999, 'seed')
ON CONFLICT (sku) DO NOTHING;

-- ---------------------------------------------------------------------
-- order_schema
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_schema.orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id VARCHAR(128) NOT NULL,
    status      VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_schema.order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES order_schema.orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL, -- logical FK to product_schema.products.id (cross-schema, not enforced)
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price_cents BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_schema.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_schema.order_items(product_id);

-- ---------------------------------------------------------------------
-- inventory_schema
--
-- Owns NO entity of its own from a federation standpoint — its whole
-- purpose is to EXTEND product-service's Product entity with an
-- `inventory` field (see backend/inventory-service's schema.graphqls:
-- `extend type Product @key(fields: "id") { id: ID! @external inventory:
-- [Inventory!]! }`). This is the canonical Apollo Federation pattern: a
-- subgraph that doesn't own an entity can still attach fields to it.
--
-- Genuinely 1:MANY — a product can have stock in several warehouses at
-- once, so `id` (not `product_id`) is the primary key, and `product_id`
-- is an indexed regular column multiple rows can share.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_schema.inventory (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID NOT NULL, -- logical FK to product_schema.products.id (cross-schema, not enforced — same convention as order_items.product_id)
    quantity_available  INT NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
    quantity_reserved   INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    warehouse_location  VARCHAR(64) NOT NULL,
    last_restocked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory_schema.inventory(product_id);

-- Seeded by joining against product_schema's seed data above (via SKU,
-- since the products' UUIDs are generated at insert time, not fixed).
-- inventory_service is granted read access to product_schema purely for
-- this one-time seed join — its actual application code never queries
-- product_schema directly (same convention as order_service's identical
-- grant above: cross-service reads happen over GraphQL, not SQL joins).
GRANT USAGE ON SCHEMA product_schema TO inventory_service;
GRANT SELECT ON product_schema.products TO inventory_service;

-- The Wireless Mouse deliberately gets TWO rows (two warehouses) — the
-- multi-store case ProductInventoryResolver.java's @BatchMapping and
-- InventorySection.jsx both need to handle correctly, not just the
-- simpler single-warehouse products below it.
INSERT INTO inventory_schema.inventory (product_id, quantity_available, quantity_reserved, warehouse_location)
SELECT id, 80, 3, 'WAREHOUSE-A' FROM product_schema.products WHERE sku = 'SKU-001'
UNION ALL
SELECT id, 40, 2, 'WAREHOUSE-B' FROM product_schema.products WHERE sku = 'SKU-001'
UNION ALL
SELECT id, 45, 2, 'WAREHOUSE-A' FROM product_schema.products WHERE sku = 'SKU-002'
UNION ALL
SELECT id, 8, 1, 'WAREHOUSE-B' FROM product_schema.products WHERE sku = 'SKU-003';

-- ---------------------------------------------------------------------
-- rating_schema
--
-- Deliberately GENUINELY 1:1 with Product — contrast this with
-- inventory_schema above (a real 1:MANY relationship: multiple
-- warehouse rows per product). Here, product_id itself IS the primary
-- key — the database structurally enforces at most one rating row per
-- product, the same way a foreign key with a UNIQUE constraint would.
-- See backend/rating-service's schema.graphqls: Product.rating returns
-- a single nullable ProductRating, not a list.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rating_schema.product_rating (
    product_id      UUID PRIMARY KEY, -- logical FK to product_schema.products.id, same cross-schema convention as inventory_schema.inventory.product_id
    average_rating  NUMERIC(2, 1) NOT NULL CHECK (average_rating >= 0 AND average_rating <= 5),
    review_count    INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT USAGE ON SCHEMA product_schema TO rating_service;
GRANT SELECT ON product_schema.products TO rating_service;

INSERT INTO rating_schema.product_rating (product_id, average_rating, review_count)
SELECT id, 4.5, 128 FROM product_schema.products WHERE sku = 'SKU-001'
UNION ALL
SELECT id, 4.2, 64 FROM product_schema.products WHERE sku = 'SKU-002'
UNION ALL
SELECT id, 3.8, 12 FROM product_schema.products WHERE sku = 'SKU-003'
ON CONFLICT (product_id) DO NOTHING;
