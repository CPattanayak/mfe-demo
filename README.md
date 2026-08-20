# Unified GraphQL Platform

### GraphQL Federation · Micro Frontends · AI Agents · MCP · Keycloak · Spring Boot · R2DBC · PostgreSQL

A full-stack reference architecture for building a **unified GraphQL platform for every client** — Web, Mobile, External Applications, and AI Agents.

The platform combines **React Module Federation**, **GraphQL Federation**, **Hive GraphQL Gateway**, **Apollo MCP**, **LangGraph**, **Keycloak**, **Spring Boot**, **R2DBC**, **PostgreSQL**, and **Redis response caching** into a single client-agnostic API platform.

> **Build domain capabilities once and expose them consistently to every client through a unified GraphQL platform.**

---

## Architecture

![Unified GraphQL Platform Architecture](unified-graphql-platform.png)

The architecture follows this flow:

```text
Web / Mobile / External Clients
             │
          GraphQL
             │
             ▼
     Hive GraphQL Gateway
             │
      Federation + Cache
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Product Order Inventory
       │     │     │
       └─────┼─────┘
             ▼
         PostgreSQL

AI Agent / LangGraph
             │
            MCP
             ▼
     Apollo MCP Gateway
             │
          GraphQL
             ▼
     Hive GraphQL Gateway
```

The **Hive GraphQL Gateway is the central API platform**. Apollo MCP acts as an agent-facing protocol adapter; it does not bypass the federated GraphQL layer.

---

# Why This Architecture?

Traditional architectures often create separate APIs for different consumers:

```text
Web       → REST API
Mobile    → REST API
Partners  → REST API
AI Agent  → Agent-specific API
```

This can lead to duplicated contracts and integration logic.

This project takes a different approach:

```text
                    Unified GraphQL Platform
                              │
             ┌────────────────┼────────────────┐
             │                │                │
            Web             Mobile           AI
             │                │                │
             └────────────────┼────────────────┘
                              │
                     Federated Graph
                              │
                       Domain Services
```

GraphQL is the **canonical domain API**, while MCP provides an AI-compatible access protocol.

---

# Core Principles

### One platform for every client

The same domain graph can serve:

- React applications
- Mobile applications
- External applications
- Internal enterprise applications
- AI agents
- Agentic workflows

### Domain ownership through Federation

Business capabilities are modeled as independently owned GraphQL subgraphs:

```text
Product
Order
Inventory
Rating
Customer
```

### MCP as an adapter

The AI request path is:

```text
LangGraph
    │
    │ MCP
    ▼
Apollo MCP Gateway
    │
    │ GraphQL
    ▼
Hive GraphQL Gateway
    │
    ▼
Federated Graph
    │
    ▼
Domain Services
```

### Centralized response caching

GraphQL response caching is implemented at the gateway layer, allowing both UI and agent traffic to use the same caching strategy.

### Centralized identity

Keycloak provides OAuth2/OIDC authentication and the authenticated context can flow through the API platform to the domain services.

---

# Platform Components

| Layer | Technology | Responsibility |
|---|---|---|
| Web UI | React | User-facing application |
| Micro Frontends | Webpack Module Federation | Independently deployable UI modules |
| Authentication | Keycloak | OAuth2/OIDC authentication |
| GraphQL Client | Apollo Client | Client-side GraphQL communication |
| API Gateway | Hive GraphQL Gateway | Unified GraphQL entry point |
| Federation | GraphQL Federation | Compose domain subgraphs |
| Response Cache | Redis | Query response caching |
| AI Protocol | MCP | Agent-to-tool communication |
| MCP Gateway | Apollo MCP | Expose GraphQL operations as MCP tools |
| Agent Orchestration | LangGraph | Agent reasoning and workflow |
| Domain Services | Spring Boot | Business capabilities |
| GraphQL | Spring GraphQL | Domain API |
| Reactive Data | R2DBC | Non-blocking database access |
| Database | PostgreSQL | Transactional persistence |
| DataLoader | DataLoader | Batch related GraphQL lookups |
| Static Assets | MinIO / CDN | Micro-frontend hosting |
| Deployment | Docker / Kubernetes | Containerized deployment |

---

# Web Client Architecture

The web application uses React Module Federation.

```text
React Shell
    │
    ├── Products MFE
    ├── Orders MFE
    └── Shared Authentication
```

Each micro frontend can be independently developed and deployed.

The shell provides application composition, navigation, and shared authentication.

---

# AI Agent Architecture

AI agents consume the same GraphQL platform through MCP.

```text
User
 │
 ▼
LangGraph Agent
 │
 ├── Reasoning
 ├── Planning
 ├── Tool Selection
 └── Workflow
 │
 ▼
Apollo MCP Gateway
 │
 ▼
Hive GraphQL Gateway
 │
 ▼
Federated Graph
```

For example:

> Find products under ₹10,000 that are in stock and have a rating above 4.

The agent can decompose the task into operations such as:

```text
searchProducts()
      ↓
getRatings()
      ↓
checkInventory()
      ↓
selectProducts()
```

The underlying business capabilities remain GraphQL-based.

---

# GraphQL Federation

The gateway composes independently owned domain subgraphs into a unified graph.

```text
                 Unified Graph
                      │
       ┌──────────────┼──────────────┐
       │              │              │
    Product          Order        Inventory
    Subgraph         Subgraph       Subgraph
       │              │              │
       ▼              ▼              ▼
   Product DB       Order DB      Inventory DB
```

A client does not need to know which service owns a field.

Example:

```graphql
query ProductDetails($id: ID!) {
  product(id: $id) {
    id
    name
    price
    inventory {
      available
    }
    rating {
      average
    }
  }
}
```

The gateway composes the response across the appropriate subgraphs.

---

# Response Caching

Response caching is implemented at the GraphQL gateway layer using Redis.

```text
Client
  │
  ▼
Hive Gateway
  │
  ├── Redis Cache HIT
  │       │
  │       └── Return cached response
  │
  └── Cache MISS
          │
          ▼
      Federation
          │
          ▼
      Subgraphs
          │
          ▼
       Response
          │
          ▼
       Redis SET
```

Cache keys should consider:

- GraphQL operation
- Query variables
- Tenant context
- Authorization context where required
- Relevant request headers

Public/read-only queries can generally have longer TTLs. User-specific or sensitive data should use appropriate cache policies or bypass caching.

Mutations should not be treated as normal response-cache candidates.

---

# Authentication & Authorization

Keycloak provides centralized identity management.

```text
Client
   │
   ▼
Keycloak
   │
   │ JWT / OAuth2
   ▼
GraphQL Platform
   │
   ▼
Domain Services
```

The platform supports:

- OAuth2
- OpenID Connect
- JWT access tokens
- Role-based authorization
- Shared authentication across micro frontends
- GraphQL-level authorization

Example permissions:

```text
product:read
product:write
order:read
order:write
```

---

# DataLoader & N+1 Prevention

GraphQL can introduce N+1 query problems when resolving nested relationships.

Without batching:

```text
1 query → orders
N queries → products
```

With DataLoader:

```text
1 query → orders
1 batched query → products
```

Conceptually:

```text
Orders
  │
  ├── Product 101 ┐
  ├── Product 102 │
  ├── Product 103 ├── DataLoader
  ├── Product 104 │
  └── Product 105 ┘
          │
          ▼
     Batched lookup
```

---

# Reactive Backend

The backend uses:

```text
Spring Boot
     │
Spring GraphQL
     │
   R2DBC
     │
 PostgreSQL
```

R2DBC provides non-blocking database access and fits well with reactive request processing.

---

# Project Structure

```text
mfe-demo/
│
├── backend/
│   ├── product-service/
│   ├── order-service/
│   └── ...
│
├── frontend/
│   ├── shell/
│   ├── mfe-products/
│   ├── mfe-orders/
│   └── shared-auth/
│
├── gateway/
│   └── hive-graphql/
│
├── mcp/
│   └── apollo-mcp/
│
├── agent/
│   └── langgraph/
│
├── infra/
│   ├── keycloak/
│   ├── postgres/
│   └── redis/
│
├── docs/
│   └── architecture/
│
├── k8s/
├── scripts/
├── docker-compose.yml
├── docker-compose.qa.yml
├── pom.xml
└── README.md
```

---

# Local Development

## Prerequisites

- Docker
- Docker Compose
- Java 21+
- Maven
- Node.js
- npm
- Kubernetes tooling, if deploying to Kubernetes

## Start the platform

```bash
docker compose up -d --build
```

Build the backend:

```bash
mvn clean install
```

Run an individual service:

```bash
mvn -pl backend/product-service -am spring-boot:run
```

Run the frontend:

```bash
cd frontend/shell
npm install
npm start
```

---

# Kubernetes

Kubernetes manifests are available under:

```text
k8s/
```

Example:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

Environment-specific deployment instructions should be maintained alongside the corresponding Kubernetes manifests.

---

# Scaling Considerations

For higher-scale deployments:

### GraphQL

- Persisted queries
- Query complexity limits
- Depth limits
- Rate limiting
- Request budgets
- Horizontal gateway scaling

### Database

- Proper indexing
- Read replicas
- Partitioning where required
- Keyset/cursor pagination
- Independent read/write models where appropriate

### Caching

- Distributed Redis
- Per-operation TTL
- Cache invalidation strategy
- Tenant-aware cache keys

### Events

```text
Domain Service
      │
      ▼
    Kafka
      │
 ┌────┼─────┐
 ▼    ▼     ▼
Cache Search Analytics
```

### Agents

- Agent-specific rate limits
- Tool authorization
- Audit logging
- Human approval for sensitive mutations
- Tool execution timeouts
- Token/cost budgets

---

# Security Model for Agents

AI agents should be treated as untrusted clients.

The MCP boundary should enforce:

- Authentication
- Authorization
- Tool-level permissions
- Input validation
- Rate limiting
- Audit logging
- Mutation policies
- Human approval where required

Example:

```text
Agent
 │
 ▼
"Cancel order 123"
 │
 ▼
MCP Authorization
 │
 ├── Is user authenticated?
 ├── Can user cancel this order?
 ├── Is order cancellable?
 ├── Is approval required?
 │
 ▼
GraphQL Mutation
```

The agent should never bypass normal domain authorization.

---

# Architectural Benefits

### One API Contract

Every client interacts with the same domain graph.

### Independent Domain Ownership

Teams can independently own and deploy subgraphs.

### Reduced API Duplication

Business capabilities do not require separate implementations for Web, Mobile, and AI.

### AI Ready

MCP allows agent frameworks such as LangGraph to consume selected GraphQL operations.

### Centralized Governance

Authentication, authorization, caching, observability, and API policies can be managed at the platform boundary.

### Frontend Independence

Module Federation enables independently deployable frontend modules.

### Reactive Backend

Spring Boot + Spring GraphQL + R2DBC provides a reactive backend architecture.

---

# Design Philosophy

```text
┌────────────────────────────────────────────┐
│                 Clients                    │
│                                            │
│ Web │ Mobile │ External │ AI Agents       │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│             Access Protocols               │
│                                            │
│ GraphQL │ MCP                              │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│            GraphQL Platform                │
│                                            │
│ Federation │ Cache │ Auth │ Observability │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│              Domain Layer                  │
│                                            │
│ Product │ Order │ Inventory │ Rating ...  │
└─────────────────────┬──────────────────────┘
                      │
┌─────────────────────▼──────────────────────┐
│               Data Layer                   │
│                                            │
│ PostgreSQL │ Redis │ Event Streaming       │
└────────────────────────────────────────────┘
```

> **Clients change. Protocols evolve. Domain capabilities remain reusable.**

---

# Technology Stack

### Frontend

- React
- Webpack Module Federation
- Apollo Client
- React Router
- Keycloak JavaScript adapter

### Backend

- Java
- Spring Boot
- Spring GraphQL
- Spring Security
- R2DBC
- Spring Data
- DataLoader

### Platform

- GraphQL Federation
- Hive GraphQL Gateway
- Apollo MCP
- Redis
- Keycloak

### AI

- LangGraph
- MCP
- LLM-based agent orchestration

### Infrastructure

- Docker
- Docker Compose
- Kubernetes
- PostgreSQL
- MinIO
- nginx/CDN

---

# Project Status

This repository is a **reference architecture and learning platform** demonstrating how a modern full-stack application can evolve into an agent-ready GraphQL platform.

It is intended to demonstrate architectural patterns rather than provide a turnkey production platform.

Production deployments should additionally address:

- Secret management
- TLS
- High availability
- Distributed tracing
- Centralized observability
- Rate limiting
- Query complexity controls
- Production-grade cache invalidation
- Database scaling
- Event-driven integration
- Agent governance
- Disaster recovery
- Security hardening

---

# Roadmap

- [ ] Complete federated Product / Order / Inventory graph
- [ ] Central Hive GraphQL Gateway
- [ ] Redis GraphQL response cache
- [ ] Apollo MCP integration
- [ ] LangGraph agent
- [ ] Agent tool authorization
- [ ] Persisted GraphQL operations
- [ ] Query complexity and depth controls
- [ ] OpenTelemetry tracing
- [ ] Kafka-based domain events
- [ ] Event-driven cache invalidation
- [ ] Cursor/keyset pagination
- [ ] Production-grade Kubernetes deployment
- [ ] AI agent audit and approval workflow
- [ ] Multi-tenant authorization model

---

# Key Architectural Takeaway

The project demonstrates a shift from:

```text
                    Multiple APIs
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
         Web           Mobile           AI
          │              │              │
        REST            REST        Agent API
```

to:

```text
                       Unified GraphQL Platform
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
           Web                  Mobile                AI
            │                     │                     │
         GraphQL               GraphQL                 MCP
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                         Hive GraphQL Gateway
                                  │
                         GraphQL Federation
                                  │
                  ┌───────────────┼───────────────┐
                  ▼               ▼               ▼
               Product          Order          Inventory
```

## One platform. One domain graph. Every client.

---

## License

This project is provided as a reference and learning implementation. Add an explicit open-source license if you intend to permit redistribution or modification.
