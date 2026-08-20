from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import agent

app = FastAPI(
    title="AI Gateway Service",
    description=(
        "AI-agent operations only — this service does NOT expose plain "
        "REST-to-GraphQL forwarding (deliberately; that responsibility "
        "belongs to the GraphQL layer itself — React and any other "
        "direct client talk to Hive Gateway, not here). The one route "
        "this service owns is /api/agent/query: a natural-language "
        "interface backed by a LangGraph agent, which itself consumes "
        "Apollo MCP Server's tools (see app/agent/graph.py) — so even "
        "the agent's own data access goes through the same supergraph "
        "everything else does, not a private copy of it. "
        "Permission-gated the same way the GraphQL layer itself already "
        "is — Keycloak realm roles, forwarded from the caller's own "
        "token, never a shared service account. See app/auth.py."
    ),
    # This is what turns the "Authorize" button in the /docs Swagger UI
    # into a real Keycloak login redirect — clientId matches the SAME
    # public client (web-app) already configured in
    # infra/keycloak/realm-export.json, the one the React frontend's
    # own login flow already uses (see shared-auth/authClient.js).
    # usePkceWithAuthorizationCodeGrant: true because "web-app" is a
    # PUBLIC client (no client secret) — PKCE is the standard, required
    # way to do the authorization code flow securely from a public
    # client, matching how the React app itself already authenticates.
    swagger_ui_init_oauth={
        "clientId": settings.keycloak_client_id,
        "usePkceWithAuthorizationCodeGrant": True,
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agent.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
