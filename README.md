Emmi — Real-Time Agent with Grok-Style Responsiveness

R3F front-end × orchestration back-end for a candid, fast, “human-speed” AI experience.

<div align="center">


</div>

Note on branding
Emmi is designed to deliver a Grok-style experience—fast, witty, and direct. This is a style reference only: Emmi is not powered by or affiliated with xAI/Grok.

Overview

Emmi is an agentic application that blends a high-fidelity, R3F (react-three-fiber) front-end with a low-latency, policy-aware back-end to produce real-time answers, suggestions, and multi-step actions. The experience is intentionally Grok-like—rapid, candid, and useful—paired with enterprise-grade controls for reliability and safety.

Why it matters: modern users bounce if answers lag or feel mushy. Emmi fuses streaming transformers, retrieval-augmented generation (RAG), tool-calling, and hierarchical planning to turn messy inputs into decisive actions—while maintaining observability, guardrails, and a crisp UX.

Highlights

Human-speed UX: sub-200ms first-token targets via speculative decoding and token streaming.

Agentic pipeline: planner → tool invocation → post-processors → answer streaming.

Memory that matters: vector+event memory for preference retention and long-horizon context.

Deterministic surfaces: schema-validated outputs with retry/circuit-breaker patterns.

R3F front-end: interactive, animated scenes with asset compression and mobile-safe DPR.

Production posture: env-driven config, CORS, rate limiting, audit logs, /healthz.

This repo currently holds two packages:

r3f-virtual-girlfriend-frontend — R3F front-end (Vercel-ready)

r3f-virtual-girlfriend-backend — Node/Express (orchestrates tools & streaming)

Architecture (high level)
                +-----------------------------+
 User Input --> | Frontend (R3F, Next/React) |  <— animations, UI, streaming display
                +---------------+-------------+
                                |
                                v  (SSE/WebSocket)
                        +-------+--------+
                        |  Orchestration |  <— planner / policy / traces
                        +-------+--------+
                                |
              +-----------------+-------------------+
              |                 |                   |
              v                 v                   v
         Retrieval           Tool-Calls         Memory Layer
     (vectors/docs)      (APIs/functions)   (vector + event log)
              \                 |                  /
               \                |                 /
                +---------------+----------------+
                                |
                                v
                        Post-Processors
                     (validation, guardrails)
                                |
                                v
                           Token Stream
                                |
                                v
                          Frontend Render


Key subsystems

Planner/Executor: hierarchical tasks, fast/slow thinking modes, reflective critique loop.

RAG: semantic retrieval + freshness heuristics, ranker, and safety filters.

Toolformer-style affordances: typed function calls with schemas for predictable actions.

Observability: request IDs, spans, metrics; replayable traces for QA and audits.

Live Demo

Frontend (Vercel): https://emmi-flame.vercel.app (if deployed)

Health: GET /healthz returns { ok: true } from the backend.

Tip: Keep demo copy labeled as [DEMO COPY] when referencing “Grok-style” to stay brand-safe.

Repo Layout
Emmi_/
├─ README.md
├─ r3f-virtual-girlfriend-frontend/     # R3F front-end app
│  ├─ public/                           # static assets
│  ├─ src/                              # UI, scenes, hooks
│  ├─ .env.example
│  └─ package.json
├─ r3f-virtual-girlfriend-backend/      # orchestration & APIs
│  ├─ src/
│  │  ├─ index.ts|js                    # Express entrypoint
│  │  ├─ routes/                        # /chat, /healthz
│  │  ├─ services/                      # planner, tools, rag
│  │  └─ middleware/                    # auth, rate-limit, cors
│  ├─ .env.example
│  └─ package.json
└─ .github/workflows/ci.yml             # (optional) CI pipeline

Quick Start
Prerequisites

Node.js 20+

pnpm or npm (examples assume npm)

System libs for WebGL/GPU acceleration (for local R3F dev)

Install & Run (per package)

Front-end:

cd r3f-virtual-girlfriend-frontend
cp .env.example .env.local  # fill values
npm install
npm run dev


Back-end:

cd r3f-virtual-girlfriend-backend
cp .env.example .env.local  # fill values
npm install
npm run dev


Prefer a monorepo workspace? Add a root package.json with "workspaces" and use npm run dev:all with concurrently. (See “Workspaces” below.)

Environment Variables
Front-end (r3f-virtual-girlfriend-frontend/.env.example)
Key	Description	Example
NEXT_PUBLIC_BACKEND_URL	Base URL for chat/stream	http://localhost:8787
NEXT_PUBLIC_SENTRY_DSN	(optional) error reporting	https://...
Back-end (r3f-virtual-girlfriend-backend/.env.example)
Key	Description	Example
PORT	Server port	8787
ALLOWED_ORIGINS	CORS allowlist (CSV)	http://localhost:3000,https://emmi-flame.vercel.app
VECTOR_DB_URL	Vector DB or embeddings store	postgres://... or qdrant://...
MODEL_API_KEY	Upstream model key (if applicable)	sk-...
TELEMETRY_WRITE_KEY	(optional) observability	posthog_...

Keep all secrets in env vars. Never commit real keys.

Development Notes
Front-end (R3F/React)

Use <Suspense fallback={null}> and <Preload all /> for asset loading.

Compress GLTF (Draco/Meshopt).

Clamp devicePixelRatio on mobile: Math.min(2, window.devicePixelRatio).

Back-end (Node/Express or similar)

Middleware: helmet(), request logging, rate-limits (e.g., 100/15m/user).

Streaming: Server-Sent Events (SSE) or WebSocket for token streaming.

Planner: fast path (speculative decoding) vs slow path (tool-heavy turns).

RAG: rankers + freshness scoring; redact PII pre-index and pre-response.

Contracts: Zod/JSON-schema for tool I/O; retries with jitter; circuit breaker.

Workspaces (Optional but recommended)

At repo root:

{
  "name": "emmi",
  "private": true,
  "workspaces": [
    "r3f-virtual-girlfriend-frontend",
    "r3f-virtual-girlfriend-backend"
  ],
  "scripts": {
    "dev:all": "concurrently -n FE,BE -c auto \"npm run dev -w r3f-virtual-girlfriend-frontend\" \"npm run dev -w r3f-virtual-girlfriend-backend\"",
    "lint": "eslint .",
    "format": "prettier -w .",
    "build": "npm run build -w r3f-virtual-girlfriend-frontend && npm run build -w r3f-virtual-girlfriend-backend"
  },
  "devDependencies": {
    "concurrently": "9.0.1",
    "eslint": "9.9.0",
    "eslint-plugin-import": "2.30.0",
    "prettier": "3.3.3"
  }
}


Then:

npm install
npm run dev:all

CI / CD

Lint & Build on PR: run npm run lint && npm run build for both packages.

Preview Deploys: Vercel for front-end; back-end on your preferred host (Railway/Fly/Docker).

Health Checks: /healthz (200 OK) for uptime monitors.

(Sample ./.github/workflows/ci.yml can lint+build on Node 20.)

Security & Privacy

CORS strictly to known origins.

Rate-limiting per IP/session; abuse detection hooks.

PII handling: redact-on-write for memory stores; opt-in persistence; signed policy docs.

Audit trail for tool calls and retrieved documents.

Roadmap

 Tool graph editor (visual planner debugging)

 Memory tiering (short-term vs long-term decay)

 Cost-aware routing across model families

 Multi-modal inputs (image/audio)

 A/B harness for prompt & tool-chain variants 
