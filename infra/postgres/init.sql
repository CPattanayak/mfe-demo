-- Single database ("appdb"), multiple schemas — one per microservice.
-- Each service connects with a role scoped to its own schema only.

CREATE SCHEMA IF NOT EXISTS product_schema;
CREATE SCHEMA IF NOT EXISTS order_schema;

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
END
$$;

GRANT USAGE ON SCHEMA product_schema TO product_service;
GRANT USAGE ON SCHEMA order_schema   TO order_service;

ALTER DEFAULT PRIVILEGES IN SCHEMA product_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO product_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA order_schema
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO order_service;

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
