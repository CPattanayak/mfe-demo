# Kubernetes deployment notes (production)

This mirrors `k8s/qa/` (see that directory's own README for the QA-
specific differences) — same architecture: federated GraphQL behind
Hive Gateway (an Apollo-Federation-compatible, MIT-licensed alternative
to Apollo Router — see `infra/hive-gateway/gateway.config.ts`), a single
`cdn` origin serving the UI and reverse-proxying GraphQL/auth, one
Ingress host/backend.

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.example.yaml     # copy, fill in real secrets first!

# Populate the ConfigMaps that reference repo files directly (keeps this
# repo's YAML DRY — no second copy of these files pasted into k8s/):
kubectl create configmap postgres-init \
  --from-file=init.sql=infra/postgres/init.sql \
  -n mfe-demo --dry-run=client -o yaml | kubectl apply -f -
kubectl create configmap hive-gateway-config \
  --from-file=gateway.config.ts=infra/hive-gateway/gateway.config.ts \
  --from-file=supergraph-config.yaml=infra/apollo-router/supergraph-config.yaml \
  --from-file=product.graphql=infra/apollo-router/product.graphql \
  --from-file=order.graphql=infra/apollo-router/order.graphql \
  --from-file=inventory.graphql=infra/apollo-router/inventory.graphql \
  --from-file=rating.graphql=infra/apollo-router/rating.graphql \
  -n mfe-demo --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f postgres.yaml
kubectl apply -f keycloak.yaml
kubectl apply -f redis.yaml
kubectl apply -f backend-deployments.yaml
kubectl apply -f hive-gateway.yaml
kubectl apply -f cdn.yaml
kubectl apply -f ingress.yaml
```

**Do NOT apply** `frontend-deployments.yaml` or `minio.yaml` — both are
superseded (see each file's own header comment for why) and kept only
for reference/rollback. `cdn.yaml` replaces both.

## Before this actually works on a real hostname

Two placeholders (`app.example.com`) need to become your real hostname,
and BOTH sides need to agree or login will break with an "invalid
redirect_uri" error:

1. **`ingress.yaml`**'s `host:` field.
2. **`keycloak.yaml`**'s `KC_HOSTNAME` env var — must exactly match #1.
3. **`infra/keycloak/realm-export.json`**'s `web-app` client — add your
   real hostname (`https://your-real-host/*`) to `redirectUris` and
   `webOrigins`.

`config.js`'s `keycloakUrl`/`graphqlUrl` for production resolve from
`window.location.origin` / a relative path at runtime (see that file's
comment) — so the same built `cdn` image works on any hostname you point
it at, as long as the three items above are consistent with each other.

## Building images

```bash
# CDN — APP_ENV=production is NOT optional; see cdn.yaml's own comment
# for what happens if this is wrong (silent, no build error).
docker build -f cdn/Dockerfile \
  --build-arg APP_ENV=production \
  --build-arg CDN_PUBLIC_PATH=/ \
  --build-arg PRODUCTS_REMOTE_URL=/products/remoteEntry.js \
  --build-arg ORDERS_REMOTE_URL=/orders/remoteEntry.js \
  -t ghcr.io/your-org/mfe-cdn:latest .

# rover-compose (the hive-gateway.yaml initContainer image — unchanged
# by the Hive Gateway migration, still built from infra/apollo-router/)
docker build -f infra/apollo-router/rover-compose/Dockerfile \
  -t ghcr.io/your-org/rover-compose:latest infra/apollo-router/rover-compose

# product-service / order-service / inventory-service / rating-service —
# each from backend/<name>/Dockerfile, build context is the repo root
# (all four share the reactor's root pom.xml):
docker build -f backend/product-service/Dockerfile -t ghcr.io/your-org/product-service:latest .
docker build -f backend/order-service/Dockerfile -t ghcr.io/your-org/order-service:latest .
docker build -f backend/inventory-service/Dockerfile -t ghcr.io/your-org/inventory-service:latest .
docker build -f backend/rating-service/Dockerfile -t ghcr.io/your-org/rating-service:latest .
```

Push each, then pin real tags (never `:latest`) in the Deployment specs
before an actual production rollout — the `:latest` tags in these files
are placeholders for getting the topology right locally/in staging first.

## Other placeholders to replace before production

- `ghcr.io/your-org/*` image references — point at your real registry.
- Real secret values in `secrets.example.yaml` (rename it, drop
  `.example`, and never commit the filled-in file).
- Keycloak realm: for prod, import the realm once via the Admin REST API
  / Terraform provider rather than `--import-realm` (already off here,
  unlike `k8s/qa/keycloak.yaml`).
- Add `HorizontalPodAutoscaler`s for the stateless Deployments
  (product-service, order-service, inventory-service, rating-service,
  hive-gateway, cdn).
- Add NetworkPolicies restricting product-service/order-service/
  inventory-service/rating-service to only be reachable from inside the
  cluster — none of the four publish a host port even in this file;
  only `cdn` does, same as QA.

## Multi-schema, one DB (requirement #12)

`product-service`, `order-service`, `inventory-service`, and
`rating-service` all point at the same `postgres` Service / database
(`appdb`), but each authenticates with its own least-privilege role that
only has access to its own schema (`product_schema`, `order_schema`,
`inventory_schema`, `rating_schema`) — see `infra/postgres/init.sql`.
This keeps operational overhead low (one DB instance to run/back up/
monitor) while preserving service-level data isolation, similar to a
"database per service" pattern without the extra infrastructure cost.
