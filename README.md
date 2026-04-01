# MAPA - Multimodal Autonomous Personal Agent

A web-based, AI-driven personal agent that combines local and remote LLMs with real-time avatar interaction. MAPA provides multimodal communication (text, voice, visual) through a containerized, privacy-focused architecture.

---

## Vision

MAPA bridges the gap between abstract AI assistants and embodied interaction. By integrating LLM intelligence with 3D avatar representation and the Web Speech API, it creates a personal agent that feels present, responsive, and autonomous—running locally where possible, scaling to the cloud when needed.

---

## Core Principles

- **KISS (Keep It Small and Simple)**: Minimal dependencies, focused features, incremental complexity
- **Docker-First**: All services containerized for reproducibility and isolation
- **Zero Budget / Local-First**: Free tiers and local inference prioritized; cloud as fallback

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 6, Tailwind CSS, Shadcn UI |
| **Backend** | Python 3.12, FastAPI, Uvicorn |
| **Infrastructure** | Docker, Docker Compose |
| **LLM** | OpenRouter API, Ollama (Phase 02+) |
| **Avatar** | VRM format, Three.js (Phase 03+) |

---

## Quick Start

### 1. Clone and Configure

```bash
# Copy environment template
cp .env.example .env

# Edit .env and add your API keys
# OPENROUTER_API_KEY=your_key_here
```

### 2. Start Services

```bash
docker compose up --build
```

### 3. Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Health Check | http://localhost:8000/health |

---

## Repository Structure

```
AI-Avatar/
├── frontend/           # React + Vite application
├── backend/            # FastAPI backend
├── docs/               # Documentation & roadmap
│   ├── system-architecture.md
│   ├── Recherche.md
│   └── roadmap/
│       └── phase01.md
├── infrastructure/     # Docker & deployment configs
├── docker-compose.yml  # Service orchestration
├── .env.example        # Environment template
└── README.md           # This file
```

---

## AI Assistant Guidelines

> **Critical:** Any LLM or AI editor working on this repository **MUST** read `docs/roadmap/phase01.md` before making code changes.

### Rules for AI Assistants

1. **Consult Phase Documentation First**: Understand the current phase scope and constraints before modifying code.
2. **No Scope Creep**: Implement only what's defined in the current phase. Defer advanced features to later phases.
3. **Token Efficiency**: Write minimal, purposeful code. Avoid unnecessary comments or verbosity.
4. **Docker-Only Execution**: All npm/pip commands must run inside Docker containers—never on the host.
5. **Modular Design**: Small, focused components with clear interfaces.

---

## Current Phase: 01 (Foundation)

**Status**: Scaffolding complete. Docker infrastructure operational.

**Deliverables**:
- [x] Frontend scaffold (React + Vite)
- [x] Backend scaffold (FastAPI + /health endpoint)
- [x] Docker Compose orchestration
- [x] Hot-reload configuration
- [ ] UI components (Phase 02)
- [ ] LLM integration (Phase 02)

---

## License

MIT
