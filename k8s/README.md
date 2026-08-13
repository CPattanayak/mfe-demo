# Kubernetes deployment notes

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f secrets.example.yaml     # copy, fill in real secrets first!
kubectl apply -f postgres.yaml
kubectl apply -f keycloak.yaml
kubectl apply -f minio.yaml
kubectl apply -f backend-deployments.yaml
kubectl apply -f frontend-deployments.yaml
kubectl apply -f ingress.yaml
```

## Before you go to production, replace these placeholders

- `ghcr.io/your-org/*:latest` image references — point at your registry and
  pin real tags (never `:latest` in prod).
- Hostnames in `ingress.yaml` (`app.example.com`, etc).
- Real secret values in `secrets.example.yaml` (rename it, drop `.example`,
  and never commit the filled-in file).
- `postgres.yaml`'s `postgres-init` ConfigMap — populate with the full
  contents of `infra/postgres/init.sql` (via `kubectl create configmap
  postgres-init --from-file=infra/postgres/init.sql -n mfe-demo`, or a
  Kustomize `configMapGenerator`) so schema bootstrap actually runs.
- Keycloak realm: for prod, import the realm once via the Admin REST API /
  Terraform provider rather than `--import-realm` on every restart.
- Add `HorizontalPodAutoscaler`s for the stateless Deployments
  (product-service, order-service, shell, mfe-products, mfe-orders).
- Add NetworkPolicies restricting product-service/order-service to only be
  reachable from inside the cluster (never expose 8081/8082 directly on the
  Ingress in prod — put a proper API gateway/WAF in front instead).
- MinIO here is single-node for demo purposes; for prod use a proper
  distributed MinIO deployment (Operator) or a managed S3-compatible store.

## Multi-schema, one DB (requirement #12)

Both `product-service` and `order-service` point at the same `postgres`
Service / database (`appdb`), but each authenticates with its own least-
privilege role (`product_service`, `order_service`) that only has access to
its own schema (`product_schema`, `order_schema`) — see
`infra/postgres/init.sql`. This keeps operational overhead low (one DB
instance to run/back up/monitor) while preserving service-level data
isolation, similar to a "database per service" pattern without the extra
infrastructure cost.
