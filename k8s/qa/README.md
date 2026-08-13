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
- Single replica for stateful/backing services (Postgres, Keycloak) and
  the backend microservices — QA doesn't need prod-level redundancy.
- `letsencrypt-staging` cert issuer instead of `letsencrypt-prod`, to avoid
  burning your production rate limits while testing.
- Keycloak keeps `--import-realm` enabled (prod turns it off after first
  boot) so the QA realm always matches `infra/keycloak/realm-export.json`.

## Apply order

```bash
kubectl apply -f k8s/qa/namespace.yaml
kubectl apply -f k8s/qa/secrets.example.yaml   # copy, fill in real values first!

# Populate the two ConfigMaps that reference repo files directly:
kubectl create configmap postgres-init \
  --from-file=init.sql=infra/postgres/init.sql \
  -n mfe-demo-qa --dry-run=client -o yaml | kubectl apply -f -
kubectl create configmap keycloak-realm \
  --from-file=realm-export.json=infra/keycloak/realm-export.json \
  -n mfe-demo-qa --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/qa/postgres.yaml
kubectl apply -f k8s/qa/keycloak.yaml
kubectl apply -f k8s/qa/backend-deployments.yaml
kubectl apply -f k8s/qa/cdn.yaml
kubectl apply -f k8s/qa/ingress.yaml
```

## Building the CDN image for QA

```bash
docker build -f cdn/Dockerfile \
  --build-arg CDN_PUBLIC_PATH=https://qa.example.com/ \
  --build-arg PRODUCTS_REMOTE_URL=https://qa.example.com/products/remoteEntry.js \
  --build-arg ORDERS_REMOTE_URL=https://qa.example.com/orders/remoteEntry.js \
  -t ghcr.io/your-org/mfe-cdn:qa .
docker push ghcr.io/your-org/mfe-cdn:qa
```

Re-run this (with new build args) whenever the QA hostname changes, since
the remote URLs and asset public path are baked in at build time — the
same way a real CI pipeline would produce a QA-specific frontend build.

## Local equivalent

`docker-compose.qa.yml` at the repo root gives you the same topology
(CDN edge instead of MinIO) without a cluster:

```bash
docker compose -f docker-compose.qa.yml up -d --build
```

Then visit `http://localhost:8090`.
