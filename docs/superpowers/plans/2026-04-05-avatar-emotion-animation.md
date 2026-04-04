# Avatar Emotion Animation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace keyword-regex pose detection with LLM-tagged emotion + intensity, add spine/head-tilt/talking-gesture animation layers to the VRM avatar in chat.

**Architecture:** Backend buffers the first 60 chars of each LLM stream to extract and strip an `[EMO:emotion:intensity]` tag, emitting it as a structured SSE `emotion` event before the content stream. The frontend captures the tag and dispatches it to `GLTFAvatar.tsx` which applies it across three composited animation layers (pose+spine+head, talk gestures, existing blink/mouth/mouse).

**Tech Stack:** Python/FastAPI (backend), React/TypeScript, Three.js/@react-three/fiber (frontend), pytest + pytest-asyncio (backend tests)

**Spec:** `docs/superpowers/specs/2026-04-05-avatar-emotion-animation-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/requirements.txt` | Modify | Add pytest + pytest-asyncio |
| `backend/emo_parser.py` | Create | `parse_emo_tag`, `emo_buffered_stream`, `inject_emo_instruction`, constants — extracted to keep `main.py` under 300 lines |
| `backend/main.py` | Modify | Import from `emo_parser`, wire `emo_buffered_stream` into `chat()` |
| `backend/conftest.py` | Create | pytest path configuration so `from main import ...` resolves in Docker |
| `backend/tests/test_emo_buffer.py` | Modify | Update import to `from emo_parser import ...` |
| `frontend/src/components/3d/avatarPoses.ts` | Create | `PoseTargets` interface, `NEUTRAL`, `getPoseTargets()`, all 11 poses |
| `frontend/src/components/3d/GLTFAvatar.tsx` | Create | GLTFAvatar extracted from AvatarForms + 3-layer useFrame |
| `frontend/src/components/3d/AvatarForms.tsx` | Modify | Remove GLTFAvatar + pose code, add re-export |
| `frontend/src/components/views/ChatInterface.jsx` | Modify | SSE event-type parser, remove `detectPose()` |

---

## Task 1: Add pytest to backend

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add test dependencies**

Open `backend/requirements.txt` and append two lines:

```
pytest==8.3.4
pytest-asyncio==0.24.0
```

- [ ] **Step 2: Install inside Docker**

```bash
docker compose exec backend pip install pytest==8.3.4 pytest-asyncio==0.24.0
```

Expected output: `Successfully installed pytest-8.3.4 pytest-asyncio-0.24.0`

- [ ] **Step 3: Verify pytest works**

```bash
docker compose exec backend pytest --version
```

Expected: `pytest 8.3.4`

- [ ] **Step 4: Commit**

```bash
git add backend/requirements.txt
git commit -m "chore: add pytest and pytest-asyncio for backend unit tests"
```

---

## Task 2: Backend — `parse_emo_tag` (TDD)

**Files:**
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_emo_buffer.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create test package init**

Create `backend/tests/__init__.py` as an empty file.

- [ ] **Step 2: Write failing tests for `parse_emo_tag`**

Create `backend/tests/test_emo_buffer.py`:

```python
import pytest
from main import parse_emo_tag


def test_parse_clean_tag():
    assert parse_emo_tag("[EMO:happy:medium]") == ("happy", "medium")


def test_parse_high_intensity():
    assert parse_emo_tag("[EMO:excited:high]") == ("excited", "high")


def test_parse_case_insensitive():
    assert parse_emo_tag("[EMO:Happy:HIGH]") == ("happy", "high")


def test_parse_with_internal_spaces():
    assert parse_emo_tag("[ Emo : Happy : High ]") == ("happy", "high")


def test_parse_unknown_emotion_defaults_to_neutral():
    assert parse_emo_tag("[EMO:confused:medium]") == ("neutral", "medium")


def test_parse_unknown_intensity_defaults_to_medium():
    assert parse_emo_tag("[EMO:happy:extreme]") == ("happy", "medium")


def test_parse_malformed_returns_neutral_medium():
    assert parse_emo_tag("no tag here") == ("neutral", "medium")


def test_parse_all_valid_emotions():
    emotions = [
        "neutral", "wave", "happy", "excited", "thinking",
        "sad", "surprised", "bow", "explaining", "embarrassed", "confident"
    ]
    for e in emotions:
        result_emotion, _ = parse_emo_tag(f"[EMO:{e}:medium]")
        assert result_emotion == e, f"Failed for emotion: {e}"
```

- [ ] **Step 3: Run to verify they fail**

```bash
docker compose exec backend pytest tests/test_emo_buffer.py -v
```

Expected: `ImportError: cannot import name 'parse_emo_tag' from 'main'`

- [ ] **Step 4: Implement `parse_emo_tag` in `backend/main.py`**

Add directly after the imports block (after `from openai import AsyncOpenAI`):

```python
import re

VALID_EMOTIONS = {
    'neutral', 'wave', 'happy', 'excited', 'thinking',
    'sad', 'surprised', 'bow', 'explaining', 'embarrassed', 'confident'
}
VALID_INTENSITIES = {'low', 'medium', 'high'}


def parse_emo_tag(raw: str) -> tuple[str, str]:
    """Parse [EMO:emotion:intensity] tag. Aggressively forgiving — strips whitespace, lowercases."""
    cleaned = re.sub(r'\s', '', raw).lower()
    match = re.search(r'\[emo:([^:]+):([^\]]+)\]', cleaned)
    if not match:
        return 'neutral', 'medium'
    emotion = match.group(1) if match.group(1) in VALID_EMOTIONS else 'neutral'
    intensity = match.group(2) if match.group(2) in VALID_INTENSITIES else 'medium'
    return emotion, intensity
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
docker compose exec backend pytest tests/test_emo_buffer.py -v
```

Expected: all 8 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/tests/__init__.py backend/tests/test_emo_buffer.py backend/main.py
git commit -m "feat: add parse_emo_tag with full test coverage"
```

---

## Task 3: Backend — `emo_buffered_stream` (TDD)

**Files:**
- Modify: `backend/tests/test_emo_buffer.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Add failing tests for `emo_buffered_stream`**

Append to `backend/tests/test_emo_buffer.py`:

```python
import json
import asyncio
from main import emo_buffered_stream


async def collect(gen) -> list[str]:
    """Helper: drain an async generator into a list."""
    return [item async for item in gen]


async def mock_stream(chunks: list[str]):
    """Simulate what stream_with_fallback yields: data: {"content": "..."} lines."""
    for chunk in chunks:
        yield f"data: {json.dumps({'content': chunk})}\n\n"
    yield "data: [DONE]\n\n"


def test_extracts_emotion_from_fragmented_tag():
    """Tag split across multiple chunks — must buffer and parse correctly."""
    chunks = ["[EMO", ":happy:medium]", "Hello there"]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))

    # First event: emotion SSE
    assert events[0] == "event: emotion\ndata: {\"emotion\": \"happy\", \"intensity\": \"medium\"}\n\n"
    # Second event: the remainder "Hello there" as message
    assert events[1] == "event: message\ndata: {\"content\": \"Hello there\"}\n\n"
    # Last event: [DONE] preserved
    assert events[-1] == "data: [DONE]\n\n"


def test_fallback_when_no_tag_in_60_chars():
    """If ] not found in first 60 chars, emits neutral/medium and flushes buffer."""
    long_preamble = "Sure, I would be happy to help you with that question today!"
    assert len(long_preamble) > 60
    chunks = [long_preamble, " More content."]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))

    assert events[0] == "event: emotion\ndata: {\"emotion\": \"neutral\", \"intensity\": \"medium\"}\n\n"
    # Buffer content flushed as message
    assert "event: message" in events[1]
    assert long_preamble in events[1]


def test_done_preserved_without_event_type():
    """[DONE] must NOT have an event: type prefix."""
    chunks = ["[EMO:neutral:medium]Hi"]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))
    assert events[-1] == "data: [DONE]\n\n"


def test_content_after_tag_streams_as_message_events():
    """All content after the tag must be wrapped in event: message."""
    chunks = ["[EMO:sad:low]I'm sorry", " to hear that."]
    events = asyncio.run(collect(emo_buffered_stream(mock_stream(chunks))))
    message_events = [e for e in events if e.startswith("event: message")]
    assert len(message_events) >= 1
    combined = "".join(message_events)
    assert "I'm sorry" in combined
```

- [ ] **Step 2: Run to verify they fail**

```bash
docker compose exec backend pytest tests/test_emo_buffer.py::test_extracts_emotion_from_fragmented_tag -v
```

Expected: `ImportError: cannot import name 'emo_buffered_stream' from 'main'`

- [ ] **Step 3: Implement `emo_buffered_stream` in `backend/main.py`**

Add after `parse_emo_tag` (before the FastAPI app definition):

```python
EMO_BUFFER_LIMIT = 60  # chars — fallback if ] not found within this many buffered characters


def _emo_event(emotion: str, intensity: str) -> str:
    return f"event: emotion\ndata: {json.dumps({'emotion': emotion, 'intensity': intensity})}\n\n"


def _msg_event(content: str) -> str:
    return f"event: message\ndata: {json.dumps({'content': content})}\n\n"


def _extract_content(raw_sse_line: str) -> str:
    """Pull the content string out of a data: {"content": "..."} SSE chunk."""
    if not raw_sse_line.startswith("data: "):
        return ""
    payload = raw_sse_line[6:].strip()
    if payload == "[DONE]":
        return ""
    try:
        return json.loads(payload).get("content", "")
    except (json.JSONDecodeError, AttributeError):
        return ""


async def emo_buffered_stream(raw_gen) -> AsyncGenerator[str, None]:
    """
    Wrap any SSE generator to intercept and strip the [EMO:emotion:intensity] tag.
    Emits a structured 'event: emotion' SSE before streaming content.
    Preserves the [DONE] terminator without an event type.
    """
    buffer = ""
    tag_done = False

    async for raw_chunk in raw_gen:
        # Pass [DONE] through unchanged (no event type — preserves frontend termination)
        if raw_chunk.strip() == "data: [DONE]":
            yield "data: [DONE]\n\n"
            return

        if not tag_done:
            text = _extract_content(raw_chunk)
            buffer += text

            if "]" in buffer:
                # Tag complete — find the closing bracket
                end_idx = buffer.index("]") + 1
                tag_str = buffer[:end_idx]
                remainder = buffer[end_idx:]
                emotion, intensity = parse_emo_tag(tag_str)
                yield _emo_event(emotion, intensity)
                if remainder:
                    yield _msg_event(remainder)
                tag_done = True

            elif len(buffer) > EMO_BUFFER_LIMIT:
                # Fallback: LLM ignored the tag instruction
                logger.warning("EMO tag not found in first %d chars — defaulting to neutral/medium", EMO_BUFFER_LIMIT)
                yield _emo_event("neutral", "medium")
                yield _msg_event(buffer)
                tag_done = True
        else:
            text = _extract_content(raw_chunk)
            if text:
                yield _msg_event(text)
```

- [ ] **Step 4: Run all buffer tests**

```bash
docker compose exec backend pytest tests/test_emo_buffer.py -v
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_emo_buffer.py backend/main.py
git commit -m "feat: add emo_buffered_stream with lookahead buffer and full test coverage"
```

---

## Task 4: Backend — inject instruction + wire into `chat()`

**Files:**
- Modify: `backend/main.py`

- [ ] **Step 1: Add `EMO_INSTRUCTION` constant and `inject_emo_instruction` helper**

Add directly after `EMO_BUFFER_LIMIT` constant (after the `emo_buffered_stream` function):

```python
EMO_INSTRUCTION = (
    "CRITICAL: Your response MUST begin with exactly: [EMO:emotion:intensity]\n"
    "emotion = one of: neutral wave happy excited thinking sad surprised "
    "bow explaining embarrassed confident\n"
    "intensity = low | medium | high\n"
    "No preamble. No greeting. No filler before the bracket.\n"
    "Example: [EMO:happy:medium]Here is the answer..."
)


def inject_emo_instruction(messages: list[dict]) -> list[dict]:
    """Append the EMO tag instruction as the last system message."""
    return list(messages) + [{"role": "system", "content": EMO_INSTRUCTION}]
```

- [ ] **Step 2: Wire `inject_emo_instruction` and `emo_buffered_stream` into `chat()`**

In `backend/main.py`, find the `chat()` function. Locate the line:

```python
    messages = request.messages
```

Change it to:

```python
    messages = inject_emo_instruction(request.messages)
```

Then find the return statement at the end of `chat()`:

```python
    return StreamingResponse(
        stream_with_fallback(primary_client, model, messages, provider),
        media_type="text/event-stream"
    )
```

Change it to:

```python
    return StreamingResponse(
        emo_buffered_stream(stream_with_fallback(primary_client, model, messages, provider)),
        media_type="text/event-stream"
    )
```

- [ ] **Step 3: Run full test suite**

```bash
docker compose exec backend pytest tests/ -v
```

Expected: all 12 tests PASS.

- [ ] **Step 4: Smoke test via Docker**

```bash
docker compose up -d
curl -N -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}],"settings":{"llmProvider":"ollama"}}' \
  2>/dev/null | head -20
```

Expected: first SSE lines contain `event: emotion` followed by `event: message` lines.

- [ ] **Step 5: Commit**

```bash
git add backend/main.py
git commit -m "feat: inject EMO instruction and wrap chat stream with emo_buffered_stream"
```

---

## Task 5: Frontend — `avatarPoses.ts` (new file)

**Files:**
- Create: `frontend/src/components/3d/avatarPoses.ts`

- [ ] **Step 1: Create `avatarPoses.ts`**

Create `frontend/src/components/3d/avatarPoses.ts`:

```typescript
import { MathUtils } from 'three'

export interface PoseTargets {
  lUAz: number   // leftUpperArm.rotation.z
  rUAz: number   // rightUpperArm.rotation.z
  lLAz: number   // leftLowerArm.rotation.z
  rLAz: number   // rightLowerArm.rotation.z (dynamic for wave)
  spineX: number // spine.rotation.x
  headZ: number  // head.rotation.z — additive roll only, mouse tracking owns X/Y
}

export const NEUTRAL: PoseTargets = {
  lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0, spineX: 0, headZ: 0
}

const INTENSITY_FACTOR: Record<string, number> = {
  low: 0.5, medium: 1.0, high: 1.5
}

function getRawTargets(pose: string, t: number): PoseTargets {
  switch (pose) {
    case 'wave':
      return { lUAz: -1.2, rUAz: -0.9, lLAz: 0, rLAz: -0.35 + Math.sin(t * 3) * 0.35, spineX: 0,     headZ: 0.05 }
    case 'happy':
      return { lUAz: -0.8, rUAz:  0.8, lLAz: 0, rLAz: 0,                                spineX: -0.05, headZ: 0.10 }
    case 'thinking':
      return { lUAz: -1.2, rUAz:  0.25, lLAz: 0, rLAz: -0.85,                           spineX: 0.05,  headZ: 0.18 }
    case 'sad':
      return { lUAz: -1.5, rUAz:  1.5, lLAz: 0, rLAz: 0,                                spineX: 0.10,  headZ: -0.12 }
    case 'surprised':
      return { lUAz: -0.15, rUAz: 0.15, lLAz: 0, rLAz: 0,                               spineX: -0.10, headZ: 0 }
    case 'excited':
      return { lUAz: -0.20, rUAz: 0.20, lLAz: 0, rLAz: 0,                               spineX: -0.12, headZ: 0 }
    case 'bow':
      return { lUAz: -1.2,  rUAz: 1.2,  lLAz: 0, rLAz: 0,                               spineX: 0.40,  headZ: 0 }
    case 'explaining':
      return { lUAz: -1.2,  rUAz: 0.55, lLAz: 0, rLAz: -0.40,                           spineX: 0.05,  headZ: 0.05 }
    case 'embarrassed':
      return { lUAz: -1.05, rUAz: 1.05, lLAz: -0.30, rLAz: 0.30,                        spineX: 0.08,  headZ: 0.20 }
    case 'confident':
      return { lUAz: -1.0,  rUAz: 1.0,  lLAz: -0.50, rLAz: 0.50,                        spineX: -0.05, headZ: -0.05 }
    default: // neutral
      return { ...NEUTRAL }
  }
}

function scalePose(raw: PoseTargets, factor: number): PoseTargets {
  const clamp = MathUtils.clamp
  return {
    lUAz:   clamp(NEUTRAL.lUAz  + (raw.lUAz  - NEUTRAL.lUAz)  * factor, -1.8, 0.2),
    rUAz:   clamp(NEUTRAL.rUAz  + (raw.rUAz  - NEUTRAL.rUAz)  * factor, -0.2, 1.8),
    lLAz:   clamp(NEUTRAL.lLAz  + (raw.lLAz  - NEUTRAL.lLAz)  * factor, -1.0, 1.0),
    rLAz:   clamp(NEUTRAL.rLAz  + (raw.rLAz  - NEUTRAL.rLAz)  * factor, -1.0, 1.0),
    spineX: clamp(NEUTRAL.spineX + (raw.spineX - NEUTRAL.spineX) * factor, -0.2, 0.6),
    headZ:  clamp(NEUTRAL.headZ  + (raw.headZ  - NEUTRAL.headZ)  * factor, -0.4, 0.4),
  }
}

export function getPoseTargets(pose: string, intensity: string, t: number): PoseTargets {
  const factor = INTENSITY_FACTOR[intensity] ?? 1.0
  return scalePose(getRawTargets(pose, t), factor)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors for `avatarPoses.ts`.

- [ ] **Step 3: Manually verify neutral returns zeroed spine/headZ**

In browser devtools console (while app is running), this is a pure-logic check:
- Confirm `getPoseTargets('neutral', 'medium', 0)` would return `{ lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0, spineX: 0, headZ: 0 }` by reading the source.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/3d/avatarPoses.ts
git commit -m "feat: add avatarPoses.ts with 11 emotions and intensity scaling"
```

---

## Task 6: Frontend — Extract `GLTFAvatar.tsx` from `AvatarForms.tsx`

**Files:**
- Create: `frontend/src/components/3d/GLTFAvatar.tsx`
- Modify: `frontend/src/components/3d/AvatarForms.tsx`

**Goal of this task:** Pure extraction, zero behavior change. The 3D layer additions come in Tasks 7 and 8.

- [ ] **Step 1: Create `GLTFAvatar.tsx` with the extracted component**

Create `frontend/src/components/3d/GLTFAvatar.tsx` by copying the entire `GLTFAvatar` component from `AvatarForms.tsx` (currently lines 422–695). The file must include its own imports:

```typescript
import { useState, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MathUtils } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { VRMLoaderPlugin } from '@pixiv/three-vrm'
```

Copy the `getPoseTargets` function and `PoseTargets` interface **temporarily** (they will be replaced by imports from `avatarPoses.ts` in Task 7). Then copy the full `GLTFAvatar` component and its `GLTFAvatarProps` interface.

End the file with:

```typescript
export { GLTFAvatar }
export type { GLTFAvatarProps }
```

- [ ] **Step 2: Update `AvatarForms.tsx` to remove GLTFAvatar and re-export**

In `AvatarForms.tsx`:
1. Delete lines 387–695 (the `PoseTargets` interface, `getPoseTargets` function, `GLTFAvatarProps` interface, and `GLTFAvatar` component).
2. Add this re-export at the bottom of the file:

```typescript
export { GLTFAvatar } from './GLTFAvatar'
export type { GLTFAvatarProps } from './GLTFAvatar'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Verify app runs and avatar renders**

```bash
docker compose up -d
```

Open the app in the browser, navigate to Chat. Confirm the 3D avatar still renders and arm poses still work (the system still dispatches string-format `vrm-pose-change` events at this point — backward compat is intact).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/3d/GLTFAvatar.tsx frontend/src/components/3d/AvatarForms.tsx
git commit -m "refactor: extract GLTFAvatar into own file, re-export from AvatarForms"
```

---

## Task 7: Frontend — Expand `GLTFAvatar.tsx` with Layer 1 (spine + headZ + intensity)

**Files:**
- Modify: `frontend/src/components/3d/GLTFAvatar.tsx`

- [ ] **Step 1: Replace local pose code with `avatarPoses.ts` import**

At the top of `GLTFAvatar.tsx`, remove the local `PoseTargets` interface and `getPoseTargets` function (copied temporarily in Task 6). Replace with:

```typescript
import { getPoseTargets, type PoseTargets } from './avatarPoses'
```

- [ ] **Step 2: Rename `armState` → `boneState` and add new fields**

Find:
```typescript
const armState = useRef({ lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0 })
```

Replace with:
```typescript
const boneState = useRef({ lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0, spineX: 0, headZ: 0 })
const intensityRef = useRef<string>('medium')
```

- [ ] **Step 3: Update backward-compatible `vrm-pose-change` handler**

Find the existing handler:
```typescript
const handlePoseChange = (e: Event) => { poseRef.current = (e as CustomEvent<string>).detail }
```

Replace with:
```typescript
const handlePoseChange = (e: Event) => {
  const detail = (e as CustomEvent).detail
  if (typeof detail === 'string') {
    poseRef.current = detail
    intensityRef.current = 'medium'
  } else {
    poseRef.current = (detail as { pose: string; intensity: string }).pose
    intensityRef.current = (detail as { pose: string; intensity: string }).intensity
  }
}
```

- [ ] **Step 4: Add spine and head bone lookups after VRM loads**

In the `useFrame` callback, find where arm bones are looked up:
```typescript
const leftArm    = vrm.humanoid.getNormalizedBoneNode('leftUpperArm')
const rightArm   = vrm.humanoid.getNormalizedBoneNode('rightUpperArm')
const leftLower  = vrm.humanoid.getNormalizedBoneNode('leftLowerArm')
const rightLower = vrm.humanoid.getNormalizedBoneNode('rightLowerArm')
```

Add two more lookups:
```typescript
const spine      = vrm.humanoid.getNormalizedBoneNode('spine')
const head       = vrm.humanoid.getNormalizedBoneNode('head')
```

- [ ] **Step 5: Replace Layer 1 lerp block with expanded version**

Find the existing arm lerp block (currently references `armState`):
```typescript
const targets = getPoseTargets(poseRef.current, state.clock.elapsedTime)
const a = armState.current
const LERP = 0.08
a.lUAz = MathUtils.lerp(a.lUAz, targets.lUAz, LERP)
a.rUAz = MathUtils.lerp(a.rUAz, targets.rUAz, LERP)
a.lLAz = MathUtils.lerp(a.lLAz, targets.lLAz, LERP)
a.rLAz = MathUtils.lerp(a.rLAz, targets.rLAz, LERP)
```

Replace with:
```typescript
// ── LAYER 1: Pose (arms + spine + head tilt) ─────────────────────────
const targets = getPoseTargets(poseRef.current, intensityRef.current, state.clock.elapsedTime)
const b = boneState.current
b.lUAz  = MathUtils.lerp(b.lUAz,  targets.lUAz,  0.08)
b.rUAz  = MathUtils.lerp(b.rUAz,  targets.rUAz,  0.08)
b.lLAz  = MathUtils.lerp(b.lLAz,  targets.lLAz,  0.08)
b.rLAz  = MathUtils.lerp(b.rLAz,  targets.rLAz,  0.08)
b.spineX = MathUtils.lerp(b.spineX, targets.spineX, 0.06)
b.headZ  = MathUtils.lerp(b.headZ,  targets.headZ,  0.05)
```

- [ ] **Step 6: Update bone assignment block**

Find the existing assignments:
```typescript
if (leftArm)    leftArm.rotation.z    = a.lUAz
if (rightArm)   rightArm.rotation.z   = a.rUAz
if (leftLower)  leftLower.rotation.z  = a.lLAz
if (rightLower) rightLower.rotation.z = a.rLAz
```

Replace with:
```typescript
if (leftArm)    leftArm.rotation.z    = b.lUAz
if (rightArm)   rightArm.rotation.z   = b.rUAz
if (leftLower)  leftLower.rotation.z  = b.lLAz
if (rightLower) rightLower.rotation.z = b.rLAz
if (spine)      spine.rotation.x      = b.spineX
if (head)       head.rotation.z       = b.headZ   // additive roll — mouse owns X/Y
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Verify in app**

Reload the chat page. Type a greeting like "hello". After the response, the avatar should:
- Show arm pose as before
- Spine should lean slightly if the emotion is not neutral
- Head should show a small roll tilt matching the emotion

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/3d/GLTFAvatar.tsx
git commit -m "feat: expand GLTFAvatar Layer 1 with spine, headZ tilt and intensity scaling"
```

---

## Task 8: Frontend — Add Layer 2 (talk gestures) to `GLTFAvatar.tsx`

**Files:**
- Modify: `frontend/src/components/3d/GLTFAvatar.tsx`

- [ ] **Step 1: Add `isTalkingRef` ref**

Add alongside the other refs at the top of the component body:
```typescript
const isTalkingRef = useRef<boolean>(false)
```

- [ ] **Step 2: Move volume calculation above the Layer 1 block**

In `useFrame`, the current mouth-sync code calculates volume inside the Layer 3 section. Move the entire volume calculation to a new **Pre-calc block** at the very top of the `useFrame` callback, before Layer 1:

```typescript
// ── Pre-calc: volume (shared by Layer 2 talk gestures + Layer 3 mouth sync) ──
let volume = 0
if (analyserRef.current) {
  const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
  analyserRef.current.getByteFrequencyData(dataArray)
  for (let i = 0; i < dataArray.length; i++) {
    if (dataArray[i] > volume) volume = dataArray[i]
  }
}
```

Then remove the duplicate volume calculation from the mouth sync section in Layer 3 — replace it with the already-computed `volume` variable.

- [ ] **Step 3: Add Layer 2 block between Layer 1 and Layer 3**

After the Layer 1 bone assignments (`b.spineX`, `b.headZ` lerp lines), add:

```typescript
// ── LAYER 2: Talk gestures (additive, volume-driven) ─────────────────
if (isTalkingRef.current && volume > 10) {
  const v = Math.min(volume / 128, 1)
  b.rLAz += Math.sin(state.clock.elapsedTime * 4) * 0.08 * v
  b.lUAz += Math.sin(state.clock.elapsedTime * 2.5 + 1) * 0.04 * v
}
```

- [ ] **Step 4: Update `vrm-audio-play` handler to set `isTalkingRef`**

Find the existing `vrm-audio-play` `useEffect`. Inside the handler, after getting the `audio` object, add:

```typescript
isTalkingRef.current = true
audio.onended = () => {
  setIsSpeaking(false)
  isTalkingRef.current = false
}
```

Note: remove or update any existing `audio.onended` assignment that only calls `setIsSpeaking(false)` — replace it with the two-line version above.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Verify talk gestures in app**

Enable TTS in the Chat settings. Send a message. While the avatar is speaking, the right wrist and left arm should show subtle movement proportional to the audio volume. Movement should stop immediately when speech ends.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/3d/GLTFAvatar.tsx
git commit -m "feat: add Layer 2 talk gestures to GLTFAvatar, volume-driven wrist and arm motion"
```

---

## Task 9: Frontend — Update `ChatInterface.jsx` SSE parser

**Files:**
- Modify: `frontend/src/components/views/ChatInterface.jsx`

- [ ] **Step 1: Remove `detectPose` function and its call**

In `ChatInterface.jsx`:
1. Delete the entire `detectPose` function (lines 78–86 in the current file).
2. Delete the `poseTimerRef` ref declaration.
3. Delete the entire pose timer block after streaming finishes (the block that calls `detectPose`, dispatches `vrm-pose-change`, sets `poseTimerRef`, and sets a timeout to return to neutral).

- [ ] **Step 2: Add emotion state variables inside `handleSubmit`**

At the top of the `handleSubmit` function, just before the `try {` block, add:

```javascript
let pendingEmotion = 'neutral'
let pendingIntensity = 'medium'
let currentEventType = 'message'
```

- [ ] **Step 3: Update the SSE line parser**

Find the existing `for (const line of lines)` loop inside the streaming `while (true)` block. Currently it only handles `data: ` lines. Replace the loop body with:

```javascript
for (const line of lines) {
  if (line.startsWith('event: ')) {
    currentEventType = line.slice(7).trim()
  } else if (line.startsWith('data: ')) {
    const data = line.slice(6)

    if (data === '[DONE]') continue

    try {
      const parsed = JSON.parse(data)

      if (currentEventType === 'emotion') {
        pendingEmotion = parsed.emotion ?? 'neutral'
        pendingIntensity = parsed.intensity ?? 'medium'
      } else {
        if (parsed.error) {
          updateSessionMessages(activeSessionId, [
            ...newMessages,
            createMessage('assistant', `Error: ${parsed.error}`)
          ])
          break
        }
        if (parsed.content) {
          if (accumulatedContent.length > 0 && parsed.content.startsWith(accumulatedContent)) {
            accumulatedContent = parsed.content
          } else {
            accumulatedContent += parsed.content
          }
          updateSessionMessages(activeSessionId, [
            ...newMessages,
            createMessage('assistant', accumulatedContent)
          ])
        }
      }

      currentEventType = 'message' // reset after every data line
    } catch {
      // Ignore parse errors for incomplete chunks
    }
  }
}
```

- [ ] **Step 4: Dispatch LLM-tagged pose after stream ends**

After the `while (true)` loop ends (after `reader.read()` returns `done`), replace the old pose dispatch with:

```javascript
// Speak full response
speakText(accumulatedContent)

// Dispatch LLM-tagged emotion to avatar
window.dispatchEvent(new CustomEvent('vrm-pose-change', {
  detail: { pose: pendingEmotion, intensity: pendingIntensity }
}))

// Return to neutral after 8s
setTimeout(() => {
  window.dispatchEvent(new CustomEvent('vrm-pose-change', {
    detail: { pose: 'neutral', intensity: 'medium' }
  }))
}, 8000)
```

- [ ] **Step 5: Remove unused `poseTimerRef`**

Delete the line:
```javascript
const poseTimerRef = useRef(null)
```

- [ ] **Step 6: Verify TypeScript/ESLint**

```bash
docker compose exec frontend npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: End-to-end test in app**

1. Open Chat. Send "Hello!".
2. Open browser DevTools → Network → filter for `api/chat`.
3. In the Response stream, confirm the first SSE lines are `event: emotion` / `data: {"emotion": "wave", "intensity": ...}` (or similar).
4. Confirm the avatar reacts with the wave pose + head tilt + spine lean matching the emotion.
5. Confirm the avatar returns to neutral ~8 seconds later.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/views/ChatInterface.jsx
git commit -m "feat: update ChatInterface SSE parser to consume LLM-tagged emotion events"
```

---

## Task 10: Final verification + branch cleanup

- [ ] **Step 1: Run full backend test suite**

```bash
docker compose exec backend pytest tests/ -v
```

Expected: all 12 tests PASS.

- [ ] **Step 2: Verify app end-to-end with all emotions**

Send one message for each emotion keyword to confirm LLM produces correct tags:
- "Hello!" → should trigger `wave`
- "That's amazing!" → should trigger `happy` or `excited`
- "Hmm, let me think about that." → should trigger `thinking`
- "I'm sorry, I can't do that." → should trigger `sad`
- "Wow, really?!" → should trigger `surprised`

For each, confirm: correct arm pose, head tilt, spine lean, and intensity scaling all visible.

- [ ] **Step 3: Check AvatarStudio pose test dropdown still works**

Navigate to AvatarStudio → 3D tab. Use any pose test button. Confirm the avatar responds (backward-compat string handler is active).

- [ ] **Step 4: Commit docs**

```bash
git add docs/superpowers/specs/2026-04-05-avatar-emotion-animation-design.md
git add docs/superpowers/plans/2026-04-05-avatar-emotion-animation.md
git commit -m "docs: add avatar emotion animation spec and implementation plan"
```
