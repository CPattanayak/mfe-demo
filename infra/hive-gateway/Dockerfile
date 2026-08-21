# Extends the official Hive Gateway image to add kafkajs — CONFIRMED
# necessary, not assumed: Hive Gateway's own Docker deployment guide
# explicitly documents that a custom plugin using an external npm
# package (their own example uses "moment") requires exactly this —
# "FROM ghcr.io/graphql-hive/gateway" plus installing the extra
# package — rather than trying to bind-mount a plugin file into the
# pulled image and expecting a third-party dependency to already be
# there (it won't be).
FROM ghcr.io/graphql-hive/gateway:latest

# Explicit, not assumed — gateway.config.ts and the plugins folder are
# both mounted at /gateway (confirmed via this exact gateway's own
# startup log: "Found default config file /gateway/gateway.config.ts").
# Setting WORKDIR here BEFORE npm install guarantees node_modules ends
# up at /gateway/node_modules specifically, so Node's standard
# ancestor-directory module resolution finds kafkajs from
# /gateway/plugins/kafkaMutationNotifier.ts — rather than trusting
# whatever the base image's own internal WORKDIR happens to already be
# (unconfirmed, and a mismatch here would only surface as a runtime
# import failure, not a build-time error).
WORKDIR /gateway
RUN npm install kafkajs
