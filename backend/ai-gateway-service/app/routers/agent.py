from fastapi import APIRouter, Depends, Request
from langchain_core.messages import HumanMessage
from pydantic import BaseModel

from app.agent.graph import build_agent
from app.auth import TokenClaims, require_role

router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentQueryRequest(BaseModel):
    question: str


class AgentQueryResponse(BaseModel):
    answer: str


@router.post("/query", response_model=AgentQueryResponse)
async def query_agent(
    request: Request,
    body: AgentQueryRequest,
    # Same product:read gate as the plain REST routes — the agent's
    # tools only ever touch product/inventory/rating data, so it needs
    # the same permission a human would need to see that data directly.
    user: TokenClaims = Depends(require_role("product:read")),
):
    # build_agent is now async — it fetches tools from Apollo MCP
    # Server (a network call) rather than constructing hand-written
    # tools in-process.
    agent = await build_agent(request.headers.get("authorization"))
    result = await agent.ainvoke(
        {"messages": [HumanMessage(content=body.question)]}
    )
    # The agent's state accumulates every message in the ReAct loop
    # (tool calls, tool results, intermediate reasoning) — the actual
    # answer for the caller is the LAST message's content.
    final_message = result["messages"][-1]
    return AgentQueryResponse(answer=final_message.content)
