# MAPA System Architecture

## Overview

**MAPA** (Multimodal Autonomous Personal Agent) is a Docker-containerized AI avatar system that provides real-time, interactive 3D avatar communication with LLM-backed intelligence.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite 6 | Component-based UI with fast HMR |
| **UI Stack** | Tailwind CSS + Shadcn UI | Utility-first styling + accessible components |
| **Backend** | Python 3.12 + FastAPI | Lightweight AI API routing |
| **LLM Integration** | OpenRouter API / Ollama | Cloud-based and local LLM inference |
| **Infrastructure** | Docker + Docker Compose | Containerized deployment |

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                         │
│                    (mapa-network)                           │
│                                                             │
│  ┌─────────────────────┐         ┌─────────────────────┐   │
│  │     Frontend        │         │      Backend        │   │
│  │  React + Vite       │ ──────► │   FastAPI +         │   │
│  │  Port: 5173         │  /api   │   Uvicorn           │   │
│  │                     │  proxy  │   Port: 8000        │   │
│  │  - UserProfile      │         │                     │   │
│  │  - Chat             │         │  - /health          │   │
│  │  - Settings         │         │  - /api/chat        │   │
│  │                     │         │  - /api/profile     │   │
│  └─────────┬───────────┘         │  - /api/settings    │   │
│            │                     └──────────┬──────────┘   │
│            │                                │              │
│            └────────────────┬───────────────┘              │
│                             │                              │
│                             ▼                              │
│                  ┌─────────────────────┐                   │
│                  │   External APIs     │                   │
│                  │   - OpenRouter      │                   │
│                  │   - Ollama (later)  │                   │
│                  └─────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│   Host System   │
│  - localhost:5173 (Frontend)  │
│  - localhost:8000 (Backend)   │
└─────────────────┘
```

---

## Directory Structure

```
AI-Avatar/
├── frontend/
│   ├── Dockerfile              # Node 20 Alpine, Vite dev server
│   ├── package.json            # React + Vite dependencies
│   ├── vite.config.js          # Server config + API proxy
│   ├── index.html              # HTML entry point
│   └── src/
│       ├── main.jsx            # React bootstrap
│       ├── App.jsx             # Root component
│       ├── index.css           # Base styles
│       └── components/         # UI components (Phase 02+)
│           ├── UserProfile/
│           ├── Chat/
│           └── Settings/
│
├── backend/
│   ├── Dockerfile              # Python 3.12 slim, Uvicorn
│   ├── requirements.txt        # FastAPI + Uvicorn
│   ├── main.py                 # FastAPI application
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py             # API routes
│   └── docs/
│       └── api-spec.md         # API documentation
│
├── infrastructure/
│   ├── docker-compose.yml      # Service definitions (symlink)
│   └── README.md               # Infrastructure docs
│
├── docs/
│   ├── system-architecture.md  # This file
│   ├── Recherche.md            # Market research
│   └── roadmap/
│       └── phase01.md          # Phase 01 plan
│
├── docker-compose.yml          # Root compose file
├── .env                        # Environment variables (secrets)
├── .env.example                # Environment template
└── QWEN.md                     # Project context
```

---

## Docker Services

### Frontend Service

| Property | Value |
|----------|-------|
| **Build Context** | `./frontend` |
| **Base Image** | `node:20-alpine` |
| **Port** | 5173 |
| **Volumes** | `./frontend:/app`, `/app/node_modules` |
| **Command** | `npm run dev` |
| **Features** | Hot-reload, Vite polling, API proxy |

### Backend Service

| Property | Value |
|----------|-------|
| **Build Context** | `./backend` |
| **Base Image** | `python:3.12-slim` |
| **Port** | 8000 |
| **Volumes** | `./backend:/app` |
| **Command** | `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| **Environment** | Loaded from `.env` |
| **Features** | Auto-reload, env var injection |

---

## API Specification

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root info endpoint |
| `GET` | `/health` | Health check for container verification |
| `POST` | `/api/chat` | LLM chat communication (Phase 02) |
| `GET` | `/api/profile` | User profile retrieval (Phase 02) |
| `PUT` | `/api/profile` | User profile update (Phase 02) |
| `GET` | `/api/settings` | Configuration retrieval (Phase 02) |
| `PUT` | `/api/settings` | Configuration update (Phase 02) |

### Health Check Response

```json
{
  "status": "ok"
}
```

---

## Data Flow

### Chat Request Flow

```
User Input
    │
    ▼
Frontend (React)
    │
    ▼
POST /api/chat
    │
    ▼
Backend (FastAPI)
    │
    ▼
LLM Provider (OpenRouter/Ollama)
    │
    ▼
Backend Response
    │
    ▼
Frontend Display
    │
    ▼
Avatar Animation (Phase 03)
```

---

## Security & Secrets

| Mechanism | Implementation |
|-----------|----------------|
| **Environment Variables** | `.env` file (gitignored) |
| **Secret Injection** | `env_file` in docker-compose |
| **API Keys** | `OPENROUTER_API_KEY` via environment |
| **Network Isolation** | Internal `mapa-network` bridge |

---

## Development Workflow

### Local Development

```bash
# Start all services
docker compose up --build

# Access services
# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# Health:   http://localhost:8000/health
```

### Hot-Reload Configuration

| Service | Mechanism |
|---------|-----------|
| Frontend | Bind mount + Vite polling |
| Backend | Bind mount + Uvicorn `--reload` |

---

## Future Phases

| Phase | Focus |
|-------|-------|
| **Phase 01** | Foundation & Scaffolding (Current) |
| **Phase 02** | LLM Integration (OpenRouter/Ollama) |
| **Phase 03** | 3D Avatar Integration (VRM) |
| **Phase 04** | Voice & Motion Capture |
| **Phase 05** | Memory & Personalization |

---

## Design Principles

1. **Modularity**: Small, focused components with clear interfaces
2. **Token Efficiency**: Minimal, purposeful code and prompts
3. **Docker-First**: All services containerized
4. **Hot-Reload**: Fast iteration during development
5. **Scope Awareness**: Read only relevant directories per task
