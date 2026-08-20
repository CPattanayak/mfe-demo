"""
The agent's tools come from Apollo MCP Server (infra/apollo-mcp-server/)
as a REAL MCP client connection, not hand-written LangChain tools that
duplicate what Apollo MCP Server already exposes. One definition of
"what operations exist" — the .graphql files in
infra/apollo-mcp-server/operations/ — consumed by both this agent and
any other MCP-compatible client (Claude Desktop, etc.), rather than a
second, parallel set of Python functions that could drift out of sync
with it.

create_react_agent, from langgraph.prebuilt, NOT langchain's newer
create_agent — see this file's earlier version for the full reasoning
(create_react_agent is deprecated upstream in favor of create_agent,
but create_agent's exact import path wasn't independently confirmed
with enough confidence to bet on, while create_react_agent's usage was).
"""

import time
from collections import OrderedDict

from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent

from app.agent.llm import get_llm
from app.config import settings

SYSTEM_PROMPT = (
    "You are a helpful assistant for an e-commerce catalog. You can "
    "look up products, browse the catalog, check low-stock inventory "
    "across warehouses, and look up orders. Always use the available "
    "tools to get real data — never guess at prices, stock levels, "
    "ratings, or order status. Keep answers concise and grounded in "
    "what the tools actually returned."
)

# Per-token tool cache, NOT per-request — building a fresh
# MultiServerMCPClient (and re-fetching tools over the network) on
# EVERY single request opened a new MCP connection far more often than
# necessary: repeated questions from the SAME logged-in user were
# paying that connection cost every time, for no benefit, since their
# token — and therefore the available tools — hadn't changed at all.
# Keyed by the raw Authorization string (~= "one entry per logged-in
# user's active session"), bounded by both a TTL (so a since-expired
# token's cached client doesn't linger forever) and a max size (so this
# can't grow unbounded under many distinct users).
#
# Deliberately NOT a fully persistent, always-reused client shared
# across ALL users — that would need either a custom httpx.Auth
# implementation combined with contextvars to correctly inject the
# CURRENT request's own token into a shared connection (Python's
# contextvars do correctly isolate state per concurrent request), or
# accepting one client per token as done here. Went with the
# token-keyed cache: it still cuts connection churn dramatically for
# any user asking more than one question, without needing to bet on
# unverified httpx.Auth interface details in a security-sensitive code
# path.
_TOOLS_CACHE_TTL_SECONDS = 300
_TOOLS_CACHE_MAX_ENTRIES = 200
_tools_cache: "OrderedDict[str, tuple[list, float]]" = OrderedDict()


async def _get_tools_for(authorization: str | None) -> list:
    cache_key = authorization or "__anonymous__"
    now = time.time()

    cached = _tools_cache.get(cache_key)
    if cached is not None:
        tools, cached_at = cached
        if now - cached_at < _TOOLS_CACHE_TTL_SECONDS:
            _tools_cache.move_to_end(cache_key)  # mark as recently used
            return tools
        del _tools_cache[cache_key]  # stale — fall through and refetch

    mcp_client = MultiServerMCPClient(
        {
            "catalog": {
                "transport": "streamable_http",
                "url": settings.mcp_server_url,
                "headers": (
                    {"Authorization": authorization} if authorization else {}
                ),
            }
        }
    )
    tools = await mcp_client.get_tools()

    _tools_cache[cache_key] = (tools, now)
    if len(_tools_cache) > _TOOLS_CACHE_MAX_ENTRIES:
        _tools_cache.popitem(last=False)  # evict least-recently-used

    return tools


async def build_agent(authorization: str | None):
    """
    The AGENT object itself is still built fresh per request (cheap —
    no network call, just wiring an LLM client to an already-resolved
    tools list) — only the expensive part (fetching tools from Apollo
    MCP Server) is what's now cached, per the module docstring above.
    """
    tools = await _get_tools_for(authorization)
    llm = get_llm()
    return create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)
