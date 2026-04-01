# MAPA - Product Concept & Architecture Vision

## Vision

**MAPA** (Multimodal Autonomous Personal Agent) is a privacy-first, zero-budget AI companion that combines conversational intelligence with visual presence. It runs locally where possible, scales to the cloud when needed, and costs nothing to operate.

---

## Core Philosophy

| Principle | Description |
|-----------|-------------|
| **Zero Budget** | Free tiers, open-source, local-first. No mandatory subscriptions. |
| **KISS** | Minimal dependencies. Simple architecture. Incremental complexity. |
| **Privacy-First** | Local processing prioritized. User data stays on-device. |
| **Modular** | Swap components without breaking the system. |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         MAPA System                         │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Body      │    │   Brain     │    │  Nervous    │     │
│  │  (Avatar)   │◄──►│   (LLM)     │◄──►│  System     │     │
│  │             │    │             │    │  (Voice)    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│        │                  │                  │              │
│   Three.js /        OpenRouter /      Web Speech API        │
│   Ready Player Me   Local Ollama      (STT + TTS)           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### Frontend (Body Interface)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | React + Vite | Fast HMR, component modularity |
| **Styling** | Tailwind CSS | Utility-first, token-efficient |
| **Components** | Shadcn UI | Copy-paste, readable source |
| **Future** | Tauri | Desktop app from web codebase |

### Backend (API Gateway)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Python + FastAPI | Lightweight, async-ready |
| **Purpose** | API key management, LLM routing | Centralized secret handling |
| **Future** | Local Ollama integration | Zero-cost inference |

### AI Brain (Intelligence)

| Option | Technology | Cost | Latency |
|--------|------------|------|---------|
| **Primary** | OpenRouter (free tier) | $0 | Low |
| **Secondary** | Ollama (local, small models) | $0 | Medium |
| **Future** | User-provided API keys | Variable | Variable |

### Nervous System (Voice I/O)

| Function | Technology | Rationale |
|----------|------------|-----------|
| **Speech-to-Text** | Web Speech API (`SpeechRecognition`) | Zero-cost, browser-native |
| **Text-to-Speech** | Web Speech API (`speechSynthesis`) | Zero-cost, no server load |
| **Alternative** | Piper / Coqui TTS (local) | Better quality, higher resource |

### Avatar (Visual Body)

| Phase | Technology | Complexity |
|-------|------------|------------|
| **Phase 01-02** | Abstract 3D forms (Three.js) | Low |
| **Phase 03** | Ready Player Me integration | Medium |
| **Phase 04** | VRM avatars + lip-sync | High |

---

## Data Flow

### Voice Interaction Loop

```
User speaks
    │
    ▼
Web Speech API (STT)
    │
    ▼
Transcribed text
    │
    ▼
LLM (OpenRouter/Ollama)
    │
    ▼
AI response text
    │
    ▼
Web Speech API (TTS)
    │
    ▼
Audio output + Avatar animation
```

### Configuration Flow

```
User adjusts settings
    │
    ▼
localStorage (frontend)
    │
    ▼
Optional sync to backend
    │
    ▼
Applied to next interaction
```

---

## Zero-Budget Strategy

| Component | Free Solution | Trade-off |
|-----------|---------------|-----------|
| **LLM** | OpenRouter free tier / Ollama | Rate limits / Smaller models |
| **Voice** | Web Speech API | Browser support variance |
| **Avatar** | Three.js primitives | Abstract, not photorealistic |
| **Hosting** | Local-only (no cloud) | No remote access |

---

## Future Scaling Path

| Phase | Upgrade | Cost Impact |
|-------|---------|-------------|
| **Now** | OpenRouter free tier | $0 |
| **Phase 03** | User API keys | User's choice |
| **Phase 04** | Cloud hosting (Fly.io, Railway) | ~$5/mo |
| **Phase 05** | Premium LLM (GPT-4, Claude) | ~$20/mo |

---

## Design Principles

1. **No mandatory costs** - Everything works on free tiers
2. **Local-first** - Process on-device when possible
3. **Browser-native** - Use Web APIs before adding dependencies
4. **Progressive enhancement** - Start simple, add quality later

---

## Success Metrics

| Metric | Target |
|--------|--------|
| **Monthly Cost** | $0 (base), optional upgrades |
| **Setup Time** | < 5 minutes |
| **Resource Usage** | < 2GB RAM (idle) |
| **Response Time** | < 2s (free tier LLM) |

---

## Terminology & Ubiquitous Language

**Strict rules for all code and UI generation:**

| Term | Usage Rule | Example |
|------|------------|---------|
| **MAPA** | Internal codename ONLY. **NEVER** in user-facing UI. | Technical docs, code comments |
| **AI Avatar** | Official product name in UI headers/logos. | `<title>AI Avatar</title>` |
| **Avatar** | The AI entity itself. | "Your Avatar is typing..." |
| **Bot** | ❌ Forbidden term | Do not use |
| **Assistant** | ❌ Forbidden term | Do not use |
| **AI Assistant** | ❌ Forbidden term | Do not use |

### Approved Phrases

| Context | Approved Text |
|---------|---------------|
| Welcome message | "Hello, I am your AI Avatar." |
| Loading state | "Avatar is typing..." |
| Settings | "Avatar Configuration" |
| Header/Logo | "AI Avatar" |

### Code Naming

| Element | Convention |
|---------|------------|
| Component files | `AvatarStudio.jsx`, `ChatInterface.jsx` |
| Context/Hooks | `AvatarContext`, `useAvatar()` |
| Variables | `avatarDisplayMode`, `avatarSettings` |
| localStorage keys | `mapa-*` prefix allowed (internal) |
