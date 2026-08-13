# Build context is ../frontend (see docker-compose.yml: context ./frontend,
# dockerfile shell/Dockerfile) so we can pull in the shared-auth workspace
# package that shell/mfe-products/mfe-orders all depend on (declared as
# "file:../shared-auth" in package.json, so this one `npm install` resolves
# it locally instead of hitting the npm registry for "@demo/shared-auth").

# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /workspace

COPY shared-auth ./shared-auth
COPY shell ./shell

WORKDIR /workspace/shell
ARG APP_ENV=local
ENV APP_ENV=${APP_ENV}
# shared-auth's SOURCE is symlinked in via "file:../shared-auth" in
# package.json, but its OWN dependencies (keycloak-js, @apollo/client,
# etc.) still need installing separately into shared-auth/node_modules —
# without this, webpack can't resolve shared-auth's own imports.
RUN cd ../shared-auth && npm install --legacy-peer-deps --include=dev
RUN npm install --legacy-peer-deps --include=dev
RUN npm run build

# --- runtime stage ---
FROM nginx:1.27-alpine
COPY --from=build /workspace/shell/dist /usr/share/nginx/html
COPY shell/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
