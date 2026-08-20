# One-off image for running `rover supergraph compose` — NOT a long-running
# service. There's no officially confirmed, stable `rover` CLI Docker image
# coordinate (unlike ghcr.io/apollographql/router, which IS confirmed — see
# router.yaml's sibling files), so this installs rover via its own official
# install script instead of guessing at an image tag.
FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://rover.apollo.dev/nix/latest | sh
ENV PATH="/root/.rover/bin:${PATH}"
ENV APOLLO_ELV2_LICENSE=accept

WORKDIR /workspace
COPY compose.sh /usr/local/bin/compose.sh
RUN chmod +x /usr/local/bin/compose.sh

ENTRYPOINT ["/usr/local/bin/compose.sh"]
