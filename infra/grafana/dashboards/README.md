# Hive Gateway Grafana dashboard

An official, Hive-Gateway-team-maintained dashboard for these exact
metrics exists — confirmed real via Grafana's own public marketplace
listing (dashboard ID **21777**,
https://grafana.com/grafana/dashboards/21777-mesh/) and referenced
directly in Hive Gateway's own monitoring docs. It is NOT embedded in
this repo — I was not able to actually fetch and verify its raw JSON
content through my own tools (the request was blocked, since that
exact URL hadn't appeared in a prior search result), and I'd rather
have you import the real thing than have me hand-type or guess at a
large, complex dashboard definition I never actually saw.

## Import it (one-time, ~30 seconds)

1. Open Grafana at http://localhost:3000 (see docker-compose.qa.yml)
2. Dashboards → New → Import
3. Enter **21777** in the "Import via grafana.com" field → Load
4. Select **Prometheus** as the datasource (already auto-provisioned —
   see infra/grafana/provisioning/datasources/prometheus.yml) → Import

## Make it load automatically on every startup (optional)

Once imported, export it back out (dashboard settings → JSON Model →
copy) and save the JSON as a file in this folder
(infra/grafana/dashboards/). The provider config
(infra/grafana/provisioning/dashboards/dashboards.yml) already watches
this folder — any JSON file dropped here loads automatically the next
time Grafana starts, no manual re-import needed after that point.
