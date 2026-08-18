# QA environment (Kubernetes)

Namespace: `mfe-demo-qa`. This is a separate overlay from `k8s/` (which is
the prod-style deployment) — same services, but:

- **No MinIO.** Static assets (shell / mfe-products / mfe-orders) are
  served from a single **CDN edge** (`cdn.yaml`, image built from
  `cdn/Dockerfile`) with real CDN cache semantics — immutable, 1-year
  cache on content-hashed JS/CSS, no-cache on `index.html`/`remoteEntry.js`
  — instead of a raw object-store bucket. This is what you'd point a real
  cloud CDN (CloudFront / Cloud CDN / Cloudflare) at if this QA env is
  externally reachable.
- **Federated GraphQL.** `product-service`/`order-service`/
  `inventory-service`/`rating-service` are real Apollo Federation
  subgraphs (see `backend/*/config/FederationConfig.java`).
  `hive-gateway.yaml`'s initContainer runs `rover supergraph compose`
  fresh on every pod start (static SDL files, not live introspection —
  see `infra/apollo-router/`, still named that since `rover` — an
  Apollo CLI tool — still does this composition step), and Hive Gateway
  (an Apollo-Federation-compatible, MIT-licensed alternative to Apollo
  Router — see `infra/hive-gateway/gateway.config.ts` for why) does the
  actual federation query planning/parallel subgraph execution AND
  response caching (`product`/`rating` data only — see that file's
  comments for the scoping rationale).
- **Single entry point, no separate gateway.** `cdn`'s nginx (see
  `cdn/nginx.conf`) reverse-proxies `/graphql` to Hive Gateway and
  `/realms/**` to Keycloak, alongside serving the UI itself — it's the
  ONLY thing `ingress.yaml` routes to. A dedicated application gateway
  would just be doing the identical path-routing nginx already does for
  free.
- Single replica for stateful/backing services (Postgres, Keycloak,
  Redis) and the backend microservices — QA doesn't need prod-level
  redundancy. Hive Gateway and the CDN run 2 replicas each (stateless,
  cheap to scale).
- `letsencrypt-staging` cert issuer instead of `letsencrypt-prod`, to avoid
  burning your production rate limits while testing.
- Keycloak keeps `--import-realm` enabled (prod turns it off after first
  boot) so the QA realm always matches `infra/keycloak/realm-export.json`.

## Apply order

```bash
kubectl apply -f k8s/qa/namespace.yaml
kubectl apply -f k8s/qa/secrets.example.yaml   # copy, fill in real values first!

# Populate the ConfigMaps that reference repo files directly (keeps this
# repo's YAML DRY — no second copy of these files pasted into k8s/):
kubectl create configmap postgres-init \
  --from-file=init.sql=infra/postgres/init.sql \
  -n mfe-demo-qa --dry-run=client -o yaml | kubectl apply -f -
kubectl create configmap keycloak-realm \
  --from-file=realm-export.json=infra/keycloak/realm-export.json \
  -n mfe-demo-qa --dry-run=client -o yaml | kubectl apply -f -
kubectl create configmap hive-gateway-config \
  --from-file=gateway.config.ts=infra/hive-gateway/gateway.config.ts \
  --from-file=supergraph-config.yaml=infra/apollo-router/supergraph-config.yaml \
  --from-file=product.graphql=infra/apollo-router/product.graphql \
  --from-file=order.graphql=infra/apollo-router/order.graphql \
  --from-file=inventory.graphql=infra/apollo-router/inventory.graphql \
  --from-file=rating.graphql=infra/apollo-router/rating.graphql \
  -n mfe-demo-qa --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/qa/postgres.yaml
kubectl apply -f k8s/qa/keycloak.yaml
kubectl apply -f k8s/qa/redis.yaml
kubectl apply -f k8s/qa/backend-deployments.yaml
kubectl apply -f k8s/qa/hive-gateway.yaml
kubectl apply -f k8s/qa/cdn.yaml
kubectl apply -f k8s/qa/ingress.yaml
```

## Before this actually works on a real hostname

Two placeholders throughout this overlay (`qa.example.com`) need to
become your real QA hostname, and BOTH sides need to agree or login will
break with an "invalid redirect_uri" error:

1. **`ingress.yaml`**'s `host:` field.
2. **`keycloak.yaml`**'s `KC_HOSTNAME` env var — must exactly match #1,
   or Keycloak generates redirect/token URLs pointing at its internal
   cluster address instead of the public one.
3. **`infra/keycloak/realm-export.json`**'s `web-app` client — add your
   real hostname (`https://your-real-host/*`) to `redirectUris` and
   `webOrigins`. The checked-in file only has `localhost` entries for
   local dev; a fresh hostname needs to be added there too (or via the
   Keycloak Admin Console directly, same as any other client config
   change — see the README section on this in the repo root).

Note what does NOT need per-hostname configuration anymore:
`config.js`'s `keycloakUrl` and `graphqlUrl` for qa/production now
resolve from `window.location.origin` / a relative path at runtime (see
that file's comment) — so the same built `cdn` image works on ANY
hostname you point it at, as long as #1–#3 above are consistent with
each other.

## Building images for QA

```bash
# CDN — APP_ENV=qa is NOT optional. This is what selects config.js's
# "qa" block at build time; get it wrong (or reuse a stale cached Docker
# layer built with a different APP_ENV) and the bundle silently ships
# with the WRONG environment's config baked in — no build error, just a
# broken app once deployed. Verify what actually got baked in with:
#   kubectl exec -it deploy/cdn -n mfe-demo-qa -- \
#     grep -o 'graphqlUrl:"[^"]*"' /usr/share/nginx/html/*.js
docker build -f cdn/Dockerfile \
  --build-arg APP_ENV=qa \
  --build-arg CDN_PUBLIC_PATH=/ \
  --build-arg PRODUCTS_REMOTE_URL=/products/remoteEntry.js \
  --build-arg ORDERS_REMOTE_URL=/orders/remoteEntry.js \
  -t ghcr.io/your-org/mfe-cdn:qa .
docker push ghcr.io/your-org/mfe-cdn:qa

# rover-compose (the hive-gateway.yaml initContainer image — unchanged
# by the Hive Gateway migration, still built from infra/apollo-router/)
docker build -f infra/apollo-router/rover-compose/Dockerfile \
  -t ghcr.io/your-org/rover-compose:qa infra/apollo-router/rover-compose
docker push ghcr.io/your-org/rover-compose:qa

# product-service / order-service / inventory-service / rating-service —
# same as k8s/README.md's prod build, just tagged :qa instead.
```

Unlike earlier versions of this setup, the CDN build args no longer need
to embed the real hostname (`CDN_PUBLIC_PATH`/`PRODUCTS_REMOTE_URL`/
`ORDERS_REMOTE_URL` are relative paths, resolved against whatever host
actually serves the page) — only `APP_ENV` needs to be right.

## Local equivalent

`docker-compose.qa.yml` at the repo root gives you the same topology
(federation + CDN edge, no Kubernetes) without a cluster:

```bash
docker compose -f docker-compose.qa.yml up -d --build
```

Then visit `http://localhost:8090`.
