# CDN edge image for QA/prod. Build context is the REPO ROOT
# (see docker-compose.qa.yml / k8s: context: ., dockerfile: cdn/Dockerfile)
# so this can pull in both frontend/* and cdn/nginx.conf.
#
# MinIO (docker-compose.yml) is a fine stand-in for "some object store" in
# local dev, but it isn't a CDN: no edge caching, no immutable-asset
# semantics, no gzip/brotli negotiation, and it's awkward to put a real
# Ingress/TLS in front of for QA testing. This image builds all three
# Module Federation apps and serves them behind an nginx edge configured
# the way a real CDN origin/edge would be (see cdn/nginx.conf):
#   - content-hashed JS/CSS  -> Cache-Control: immutable, 1 year
#   - index.html / remoteEntry.js -> no-cache, must-revalidate (so new
#     deploys are always picked up)
#   - gzip + an X-Cache-Status header for observability
#
# In a real cloud QA/prod environment you would typically put an actual CDN
# (CloudFront, Cloud CDN, Azure Front Door, Cloudflare) in front of this
# same origin (or in front of an S3/GCS bucket populated by CI), rather
# than relying on nginx's own cache alone at internet scale. This image is
# still the right "origin" to point that CDN at either way.

# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY frontend/shared-auth ./shared-auth
COPY frontend/shell ./shell
COPY frontend/mfe-products ./mfe-products
COPY frontend/mfe-orders ./mfe-orders

ARG CDN_PUBLIC_PATH=/
ARG PRODUCTS_REMOTE_URL=/products/remoteEntry.js
ARG ORDERS_REMOTE_URL=/orders/remoteEntry.js
# Requirement: config.js for different environments — selects which of
# shared-auth/src/config.js's environment blocks (local/qa/production)
# gets baked into this build. Passed through to each webpack build below
# via webpack.DefinePlugin (see each app's webpack.config.js).
ARG APP_ENV=qa

ENV APP_ENV=${APP_ENV}

# NOTE: NODE_ENV=production is intentionally NOT set as an image-wide ENV
# here. npm treats NODE_ENV=production as an implicit --omit=dev, which
# silently skips devDependencies — and webpack/webpack-cli live in
# devDependencies for all three apps. Setting it globally caused
# `npm install` to install almost nothing and `npm run build` to fail with
# "sh: webpack: not found". --include=dev on each install forces
# devDependencies in regardless of NODE_ENV; NODE_ENV=production is passed
# inline to `npm run build` instead, where webpack's own `--mode
# production` reads it for its actual intended purpose (minification,
# dead-code elimination) without affecting what `npm install` fetches.

# shared-auth is consumed via "file:../shared-auth" in each app's
# package.json, which symlinks its SOURCE — but does NOT install ITS OWN
# dependencies (keycloak-js, @apollo/client, graphql-ws, react, etc.) into
# shared-auth/node_modules. Without this step, webpack can't resolve
# shared-auth's own imports ("Can't resolve '@apollo/client'", "Can't
# resolve 'keycloak-js'", ...) even though shared-auth's SOURCE is present.
RUN cd shared-auth && npm install --legacy-peer-deps --include=dev

RUN cd mfe-products \
    && npm install --legacy-peer-deps --include=dev \
    && NODE_ENV=production CDN_PUBLIC_PATH=${CDN_PUBLIC_PATH}products/ npm run build

RUN cd mfe-orders \
    && npm install --legacy-peer-deps --include=dev \
    && NODE_ENV=production CDN_PUBLIC_PATH=${CDN_PUBLIC_PATH}orders/ npm run build

RUN cd shell \
    && npm install --legacy-peer-deps --include=dev \
    && NODE_ENV=production \
       PRODUCTS_REMOTE_URL=${PRODUCTS_REMOTE_URL} \
       ORDERS_REMOTE_URL=${ORDERS_REMOTE_URL} \
       CDN_PUBLIC_PATH=${CDN_PUBLIC_PATH} \
       npm run build

# --- runtime stage ---
FROM nginx:1.27-alpine
RUN mkdir -p /usr/share/nginx/html/products /usr/share/nginx/html/orders
COPY --from=build /workspace/shell/dist          /usr/share/nginx/html
COPY --from=build /workspace/mfe-products/dist   /usr/share/nginx/html/products
COPY --from=build /workspace/mfe-orders/dist     /usr/share/nginx/html/orders
COPY cdn/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8090
