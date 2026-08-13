#!/usr/bin/env bash
# Requirement #2: build every micro-frontend and publish its static bundle
# (including remoteEntry.js) to MinIO, exactly how you'd push Module
# Federation remotes to a CDN/object store in production.
#
# Usage: ./scripts/publish-to-minio.sh
# Env vars (override as needed):
#   MINIO_ENDPOINT   default http://localhost:9000
#   MINIO_ACCESS_KEY default minioadmin
#   MINIO_SECRET_KEY default minioadmin
#   MINIO_BUCKET     default mfe-assets

set -euo pipefail

MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-mfe-assets}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"

command -v mc >/dev/null 2>&1 || {
  echo "MinIO client 'mc' not found. Install: https://min.io/docs/minio/linux/reference/minio-mc.html" >&2
  exit 1
}

mc alias set demo-minio "$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY"
mc mb -p "demo-minio/$MINIO_BUCKET" 2>/dev/null || true
mc anonymous set download "demo-minio/$MINIO_BUCKET"

build_and_publish() {
  local app_dir="$1"
  local prefix="$2"

  echo "==> Installing shared-auth's own dependencies"
  # shared-auth's SOURCE is symlinked in via "file:../shared-auth" in
  # package.json, but its OWN dependencies (keycloak-js, @apollo/client,
  # etc.) still need installing separately — without this, webpack can't
  # resolve shared-auth's own imports.
  (cd "$FRONTEND_DIR/shared-auth" && npm install --legacy-peer-deps --include=dev)

  echo "==> Building $app_dir"
  pushd "$FRONTEND_DIR/$app_dir" >/dev/null
  # package.json declares "@demo/shared-auth": "file:../shared-auth", so
  # this one install resolves it locally — no separate link step needed.
  npm install --legacy-peer-deps --include=dev
  npm run build
  popd >/dev/null

  echo "==> Publishing $app_dir/dist -> demo-minio/$MINIO_BUCKET/$prefix"
  mc cp --recursive "$FRONTEND_DIR/$app_dir/dist/" "demo-minio/$MINIO_BUCKET/$prefix/"
}

build_and_publish "shell" "shell"
build_and_publish "mfe-products" "products"
build_and_publish "mfe-orders" "orders"

echo ""
echo "Done. Public URLs (via MinIO's built-in static file serving):"
echo "  Shell:        $MINIO_ENDPOINT/$MINIO_BUCKET/shell/index.html"
echo "  Products remoteEntry: $MINIO_ENDPOINT/$MINIO_BUCKET/products/remoteEntry.js"
echo "  Orders remoteEntry:   $MINIO_ENDPOINT/$MINIO_BUCKET/orders/remoteEntry.js"
echo ""
echo "Point PRODUCTS_REMOTE_URL / ORDERS_REMOTE_URL at the remoteEntry.js"
echo "URLs above when building/deploying the shell for production."
