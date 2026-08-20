#!/bin/sh
set -e

echo "Composing supergraph from static subgraph SDL files..."
rover supergraph compose \
  --config /workspace/supergraph-config.yaml \
  --output /output/supergraph.graphql \
  --elv2-license accept

echo "Supergraph composed -> /output/supergraph.graphql"
