# Build context is ../frontend (see docker-compose.yml)
FROM node:20-alpine AS build
WORKDIR /workspace

COPY shared-auth ./shared-auth
COPY mfe-products ./mfe-products

WORKDIR /workspace/mfe-products
ARG APP_ENV=local
ENV APP_ENV=${APP_ENV}
# shared-auth's SOURCE is symlinked in via "file:../shared-auth" in
# package.json, but its OWN dependencies (keycloak-js, @apollo/client,
# etc.) still need installing separately into shared-auth/node_modules —
# without this, webpack can't resolve shared-auth's own imports.
RUN cd ../shared-auth && npm install --legacy-peer-deps --include=dev
# package.json declares "@demo/shared-auth": "file:../shared-auth", so this
# one install resolves it locally instead of hitting the npm registry.
RUN npm install --legacy-peer-deps --include=dev
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /workspace/mfe-products/dist /usr/share/nginx/html
COPY mfe-products/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3001
