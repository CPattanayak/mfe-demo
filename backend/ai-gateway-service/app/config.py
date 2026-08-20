from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Same Keycloak realm every other service in this project already
    # validates against — see backend/*/config/SecurityConfig.java for
    # the Java equivalent of everything this service's app/auth.py does.
    #
    # TWO different URLs, deliberately not one — the same class of
    # issue this project already hit with Java's KC_HOSTNAME earlier:
    #   - keycloak_issuer: the BROWSER-facing URL (localhost:8080).
    #     Used to (a) validate a token's own "iss" claim — which was
    #     stamped by Keycloak using whatever hostname the CLIENT used
    #     to reach it, i.e. localhost:8080, not the Docker-internal
    #     name — and (b) Swagger UI's OAuth2 authorizationUrl/tokenUrl,
    #     since the user's own BROWSER navigates there directly.
    #   - keycloak_internal_url: the DOCKER-internal service name
    #     (keycloak:8080). Used ONLY for this service's OWN server-side
    #     HTTP calls (fetching JWKS) — "localhost" from inside this
    #     container would resolve to itself, not the keycloak
    #     container, and that call would simply fail.
    keycloak_issuer: str = "http://localhost:8080/realms/microfrontend-demo"
    keycloak_internal_url: str = "http://keycloak:8080/realms/microfrontend-demo"
    keycloak_client_id: str = "web-app"

    # infra/apollo-mcp-server/ — exposes GraphQL operations
    # (GetProduct, ListProducts, GetLowStockInventory, ListOrders) as
    # MCP tools. The agent connects here as an MCP CLIENT
    # (langchain-mcp-adapters) rather than hand-rolling duplicate
    # LangChain tools that call GraphQL directly — one definition of
    # "what operations exist" (the .graphql files themselves), not two.
    # This is also this service's ONLY path to product/inventory/
    # rating/order data — deliberately no direct GraphQL client of its
    # own (see app/main.py's description for why: this service owns AI
    # operations only, nothing else).
    mcp_server_url: str = "http://apollo-mcp-server:8000/mcp"

    # OpenRouter — powers the LangGraph agent's reasoning (app/agent/),
    # the only thing in this service that touches an LLM at all.
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_model: str = "openai/gpt-4o-mini"

    class Config:
        env_file = ".env"


settings = Settings()
