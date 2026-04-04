# MAPA System Architecture

## Overview

**MAPA** (Multimodal Autonomous Personal Agent) is a Docker-containerized AI avatar system providing real-time 3D avatar interaction backed by LLM intelligence, text-to-speech, and multi-provider AI routing.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + Vite 6 | Component-based UI with HMR |
| **UI** | Tailwind CSS + Shadcn UI | Utility-first styling + accessible components |
| **3D** | Three.js + @react-three/fiber | 3D rendering in React |
| **Avatar** | @pixiv/three-vrm | VRM humanoid avatar format |
| **Backend** | Python 3.12 + FastAPI + Uvicorn | AI API routing, TTS, file serving |
| **TTS** | edge-tts | Microsoft Neural text-to-speech |
| **HTTP Client** | httpx | Async HTTP for Ollama proxy |
| **LLM** | OpenRouter / Ollama / OpenAI / Anthropic / Gemini | Cloud and local inference |
| **Infrastructure** | Docker + Docker Compose | Containerized deployment |

---

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                       Docker Network (mapa-network)            │
│                                                                │
│  ┌──────────────────────┐          ┌──────────────────────┐   │
│  │      Frontend        │          │       Backend        │   │
│  │  React 19 + Vite     │ ───────► │   FastAPI + Uvicorn  │   │
│  │  Port: 5173          │  /api    │   Port: 8000         │   │
│  │                      │  proxy   │                      │   │
│  │  - Chat              │          │  /api/chat           │   │
│  │  - AvatarStudio      │          │  /api/tts            │   │
│  │  - SettingsBoard     │          │  /api/upload/model   │   │
│  │  - UserProfile       │          │  /api/ollama/models  │   │
│  │  - MiniAvatar (3D)   │          │  /uploads/ (static)  │   │
│  └──────────────────────┘          └──────────┬───────────┘   │
│                                               │               │
└───────────────────────────────────────────────┼───────────────┘
                                                │
                          ┌─────────────────────┼────────────────┐
                          │                     │                │
                          ▼                     ▼                ▼
                   ┌─────────────┐    ┌──────────────┐  ┌──────────────┐
                   │  OpenRouter │    │    Ollama     │  │  OpenAI /    │
                   │  (cloud)    │    │  (local host) │  │  Anthropic / │
                   └─────────────┘    └──────────────┘  │  Gemini      │
                                                         └──────────────┘
```

---

## Directory Structure

```
AI-Avatar/
├── frontend/
│   ├── Dockerfile                   # Node 20 Alpine, Vite dev server
│   ├── package.json
│   ├── vite.config.js               # API proxy → backend:8000
│   └── src/
│       ├── App.jsx                  # Root + tab routing
│       ├── main.jsx
│       ├── context/
│       │   └── AvatarContext.jsx    # avatarDisplayMode
│       ├── hooks/
│       │   └── useLocalStorage.js
│       └── components/
│           ├── 3d/
│           │   └── AvatarForms.tsx  # All avatar components (GLTFAvatar + procedural)
│           ├── Chat/
│           │   └── MiniAvatar.tsx   # Chat bubble avatar (audio-reactive)
│           ├── layout/
│           │   └── MainLayout.jsx
│           └── views/
│               ├── AvatarStudio.jsx  # Form/2D/3D tabs + settings
│               ├── ChatInterface.jsx
│               ├── SettingsBoard.jsx
│               └── UserProfile.jsx
│
├── backend/
│   ├── Dockerfile                   # Python 3.12 slim
│   ├── requirements.txt
│   ├── main.py                      # FastAPI application (all routes)
│   └── uploads/
│       └── models/                  # Uploaded VRM/GLB/GLTF files (Docker volume)
│
├── docs/
│   ├── system-architecture.md       # This file
│   └── roadmap/
│       ├── index.md
│       ├── phase01.md – phase05.md
│       └── superpowers/
│           ├── specs/               # Design specification documents
│           └── plans/               # Implementation plans
│
├── docker-compose.yml
├── .env                             # Secrets (gitignored)
├── .env.example
└── README.md
```

---

## Docker Services

### Frontend

| Property | Value |
|----------|-------|
| Base image | `node:20-alpine` |
| Port | 5173 |
| Volumes | `./frontend:/app`, `/app/node_modules` |
| Command | `npm run dev` |

### Backend

| Property | Value |
|----------|-------|
| Base image | `python:3.12-slim` |
| Port | 8000 |
| Volumes | `./backend:/app`, `uploads` (named volume) |
| Command | `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Root info |
| `GET` | `/health` | Container health check |
| `POST` | `/api/chat` | LLM streaming chat (SSE), multi-provider |
| `POST` | `/api/tts` | Text-to-speech via edge-tts → `audio/mpeg` |
| `POST` | `/api/upload/model` | Upload VRM/GLB/GLTF model → returns URL |
| `GET` | `/api/ollama/models` | Proxy: list installed Ollama models |
| `GET` | `/uploads/models/{file}` | Serve uploaded 3D model files |

### `/api/chat` Request

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "context": { "userName": "Alex", "language": "en" },
  "settings": {
    "llmProvider": "ollama",
    "baseUrl": "http://host.docker.internal:11434",
    "modelName": "llama3.2:latest",
    "apiKey": ""
  }
}
```

Response: `text/event-stream` — `data: {"content": "..."}` chunks, terminated by `data: [DONE]`

### `/api/tts` Request

```json
{ "text": "Hello!", "voice": "female", "language": "en-US" }
```

### `/api/ollama/models` Response

```json
{ "models": ["llama3.2:latest", "qwen2.5-coder:7b"] }
```

---

## Key localStorage Keys (Frontend State)

| Key | Type | Purpose |
|-----|------|---------|
| `avatarMode` | `'form' \| '2d' \| '3d'` | Active avatar type |
| `avatar3DUrl` | `string` | Active VRM model URL |
| `avatar3DScale` | `number` | Active model scale (synced from map) |
| `avatar3DYOffset` | `number` | Active model Y offset (synced from map) |
| `avatar3DModelSettings` | `Record<url, {scale, yOffset}>` | Per-model saved settings |
| `avatar3DGallery` | `Array<{id, name, url}>` | 3D model gallery |
| `avatarConfig` | `object` | Procedural form settings |
| `mapa-llmProvider` | `string` | Selected LLM provider |
| `mapa-modelName` | `string` | Selected model |
| `mapa-apiKey` | `string` | API key (encrypted by browser) |
| `mapa-baseUrl` | `string` | Provider base URL |

---

## Data Flow

### Chat with TTS and Avatar Lip-Sync

```
User types message
    │
    ▼
ChatInterface → POST /api/chat (SSE stream)
    │
    ▼
Backend → LLM provider (with fallback to Ollama)
    │
    ▼
SSE chunks → ChatInterface displays streamed text
    │
    ▼ (on response complete, if autoRead enabled)
ChatInterface → POST /api/tts → audio/mpeg blob
    │
    ▼
new Audio(blobUrl).play()
window.dispatchEvent('vrm-audio-play', audio)
    │
    ├─► MiniAvatar (GLTFAvatar) → AudioContext → AnalyserNode
    │       → useFrame: maxVolume → sine oscillation → vrm 'aa' expression
    │
    └─► AvatarStudio preview (same pipeline)
```

### VRM Auto-Fit Flow

```
User selects model from gallery
    │
    ▼
avatar3DUrl changes → AvatarStudio useEffect
    │
    ├─ [saved settings exist] → restore scale/yOffset from avatar3DModelSettings
    │
    └─ [new model] → GLTFAvatar loads VRM
            │
            ▼
        onFitComputed callback fires:
        - Box3.setFromObject(vrm.scene)
        - head bone getWorldPosition
        - fitScale = clamp(3.5 / boxHeight, 1, 6)
        - fitYOffset = clamp(-headWorldY * fitScale, -8, 2)
            │
            ▼
        AvatarStudio saves to avatar3DModelSettings[url]
        Sets avatar3DScale + avatar3DYOffset
```

---

## Security

| Mechanism | Implementation |
|-----------|----------------|
| Environment variables | `.env` file, gitignored |
| Secret injection | `env_file` in docker-compose |
| API keys | Never written to code; user-supplied via Settings or `.env` |
| Network isolation | Internal `mapa-network` bridge |
| CORS | Backend allows all origins (internal Docker network use) |

---

## Development Workflow

```bash
# Start all services
docker compose up --build

# Restart single service after code changes
docker compose restart backend

# Install frontend package (Docker only — never on host)
docker compose exec frontend npm install <pkg>

# Install Python package (Docker only)
docker compose exec backend pip install <pkg>
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| Health | http://localhost:8000/health |