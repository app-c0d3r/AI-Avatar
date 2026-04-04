# Avatar Emotion Animation System — Design Spec

**Date:** 2026-04-05  
**Branch:** feature from `fix/chat-streaming-accumulation`  
**Status:** Approved — ready for implementation planning

---

## Overview

Replace the current keyword-regex pose system with a full layered animation pipeline. The LLM tags its own response with an emotion and intensity level. The backend buffers the tag, strips it from the stream, and emits it as a structured SSE event. The frontend applies it across three composited animation layers.

---

## Decisions Made

| Question | Decision |
|---|---|
| Emotion detection method | LLM-tagged (Option B) — LLM emits `[EMO:emotion:intensity]` prefix |
| Animation layers | Head tilt + torso/spine + emotion intensity + talking gestures |
| Idle breathing/sway | Not in scope (deferred) |
| New poses | excited, bow, explaining, embarrassed, confident |
| Architecture | Layered animation system (Option B) |

---

## 1. Backend — Lookahead Buffer

### Files changed
- `backend/main.py`

### System prompt injection

A constant `EMO_INSTRUCTION` is appended as the last system message on every chat request, regardless of frontend settings:

```
CRITICAL: Your response MUST begin with exactly: [EMO:emotion:intensity]
emotion = one of: neutral wave happy excited thinking sad surprised bow explaining embarrassed confident
intensity = low | medium | high
No preamble. No greeting. No filler before the bracket.
Example: [EMO:happy:medium]Here is the answer...
```

Injected via a helper `inject_emo_instruction(messages: list[dict]) -> list[dict]` that appends a `system` role message.

### `emo_buffered_stream(raw_gen)` — new async generator

Wraps `stream_with_fallback(...)` transparently. Logic:

1. Accumulate chunks into `buffer` while `tag_done = False`
2. On each chunk, check if `"]"` is in buffer:
   - **Yes** → call `emit_emo_and_flush(buffer)`: parse tag, yield `event: emotion` SSE, yield remainder as `event: message` SSE, set `tag_done = True`
   - **No, but** `len(buffer) > 60` → fallback: yield `event: emotion` with `neutral/medium`, yield buffer as `event: message`, set `tag_done = True`
3. Once `tag_done`, yield each chunk directly as `event: message` SSE
4. Yield `data: [DONE]\n\n` at end (no event type — preserves existing frontend termination check)

### Tag parser — `parse_emo_tag(raw: str) -> tuple[str, str]`

Aggressively forgiving:
```python
import re
VALID_EMOTIONS = {'neutral', 'wave', 'happy', 'excited', 'thinking', 'sad',
                  'surprised', 'bow', 'explaining', 'embarrassed', 'confident'}
VALID_INTENSITIES = {'low', 'medium', 'high'}

def parse_emo_tag(raw: str) -> tuple[str, str]:
    # Strip whitespace inside brackets, lowercase, extract values
    cleaned = re.sub(r'\s', '', raw).lower()
    match = re.search(r'\[emo:([^:]+):([^\]]+)\]', cleaned)
    if not match:
        return 'neutral', 'medium'
    emotion = match.group(1) if match.group(1) in VALID_EMOTIONS else 'neutral'
    intensity = match.group(2) if match.group(2) in VALID_INTENSITIES else 'medium'
    return emotion, intensity
```

Handles `[ Emo : Happy : High ]`, `[EMO:Happy:HIGH]`, and similar LLM variations.

### SSE wire format after change

```
event: emotion
data: {"emotion": "happy", "intensity": "medium"}

event: message
data: {"content": "Hello there"}

event: message
data: {"content": "...more content"}

data: [DONE]
```

### Hook-in (1-line change)

```python
# Before:
return StreamingResponse(stream_with_fallback(...), ...)
# After:
return StreamingResponse(emo_buffered_stream(stream_with_fallback(...)), ...)
```

---

## 2. Frontend — SSE Parser Update

### File changed
- `frontend/src/components/views/ChatInterface.jsx`

### Changes

Add `currentEventType` tracking to the existing chunk parser loop:

```js
let pendingEmotion = 'neutral'
let pendingIntensity = 'medium'
let currentEventType = 'message'

// Inside lines loop — add BEFORE the existing data: check:
if (line.startsWith('event: ')) {
  currentEventType = line.slice(7).trim()
} else if (line.startsWith('data: ')) {
  if (currentEventType === 'emotion') {
    const parsed = JSON.parse(data)
    pendingEmotion = parsed.emotion
    pendingIntensity = parsed.intensity
  }
  // else: existing content accumulation unchanged
  currentEventType = 'message' // reset after every data line
}
```

After stream ends, replace the existing `detectPose()` call:

```js
// Remove: const detectedPose = detectPose(accumulatedContent)
// Remove: window.dispatchEvent(new CustomEvent('vrm-pose-change', { detail: detectedPose }))

// Add:
window.dispatchEvent(new CustomEvent('vrm-pose-change', {
  detail: { pose: pendingEmotion, intensity: pendingIntensity }
}))
```

The `detectPose()` function and its import can be removed entirely.

---

## 3. New File — `avatarPoses.ts`

**Path:** `frontend/src/components/3d/avatarPoses.ts`  
**Target size:** ~80 lines

### Exports

```typescript
export interface PoseTargets {
  lUAz: number   // leftUpperArm.rotation.z
  rUAz: number   // rightUpperArm.rotation.z
  lLAz: number   // leftLowerArm.rotation.z
  rLAz: number   // rightLowerArm.rotation.z
  spineX: number // spine.rotation.x
  headZ: number  // head.rotation.z (additive roll only)
}

export const NEUTRAL: PoseTargets = {
  lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0, spineX: 0, headZ: 0
}

const INTENSITY_FACTOR: Record<string, number> = {
  low: 0.5, medium: 1.0, high: 1.5
}

// Internal: returns raw pose values (before intensity scaling)
function getRawTargets(pose: string, t: number): PoseTargets { /* switch on pose */ }

// Internal: applies intensity factor — neutral + (raw - neutral) * factor
function scalePose(raw: PoseTargets, factor: number): PoseTargets { /* per-field lerp */ }

export function getPoseTargets(pose: string, intensity: string, t: number): PoseTargets {
  const factor = INTENSITY_FACTOR[intensity] ?? 1.0
  return scalePose(getRawTargets(pose, t), factor)
}
```

### Full pose table (all 11 emotions)

| Pose | lUA.z | rUA.z | lLA.z | rLA.z | spine.x | head.z | Notes |
|---|---|---|---|---|---|---|---|
| neutral | -1.2 | 1.2 | 0 | 0 | 0 | 0 | baseline |
| wave | -1.2 | -0.9 | 0 | sin(t·3)·0.35 | 0 | 0.05 | forearm oscillates |
| happy | -0.8 | 0.8 | 0 | 0 | -0.05 | 0.10 | arms up, lean back |
| thinking | -1.2 | 0.25 | 0 | -0.85 | 0.05 | 0.18 | hand to chin, curious tilt |
| sad | -1.5 | 1.5 | 0 | 0 | 0.10 | -0.12 | drooped + slumped |
| surprised | -0.15 | 0.15 | 0 | 0 | -0.10 | 0 | arms fly up, snap-back |
| excited | -0.20 | 0.20 | 0 | 0 | -0.12 | 0 | higher than surprised, chest out |
| bow | -1.2 | 1.2 | 0 | 0 | 0.40 | 0 | ~23° forward — polite bow |
| explaining | -1.2 | 0.55 | 0 | -0.40 | 0.05 | 0.05 | right arm extended + pointing |
| embarrassed | -1.05 | 1.05 | -0.30 | 0.30 | 0.08 | 0.20 | arms in, elbows bent |
| confident | -1.0 | 1.0 | -0.50 | 0.50 | -0.05 | -0.05 | braced resting pose (Z-only approximation) |

**Intensity scaling:** `value = neutral_value + (pose_value - neutral_value) × factor`  
where `low=0.5`, `medium=1.0`, `high=1.5` (values clamped to reasonable bone limits).

---

## 4. New File — `GLTFAvatar.tsx`

**Path:** `frontend/src/components/3d/GLTFAvatar.tsx`  
**Target size:** ~330 lines (justified — single coherent animation graph)  
**Extracted from:** `AvatarForms.tsx` (which currently contains this component at lines 422–695)

### New refs

The existing `armState` ref is **renamed** to `boneState` and expanded with two new fields:

```typescript
const intensityRef = useRef<string>('medium')
const isTalkingRef = useRef<boolean>(false)
// Rename armState → boneState, add spineX + headZ:
const boneState = useRef({
  lUAz: -1.2, rUAz: 1.2, lLAz: 0, rLAz: 0,
  spineX: 0,   // new
  headZ: 0,    // new
})
```

### Event handler update (backward compatible)

```typescript
const handlePoseChange = (e: Event) => {
  const detail = (e as CustomEvent).detail
  if (typeof detail === 'string') {
    // Legacy: Studio test dropdown still dispatches strings
    poseRef.current = detail
    intensityRef.current = 'medium'
  } else {
    poseRef.current = detail.pose
    intensityRef.current = detail.intensity
  }
}
```

### `vrm-audio-play` handler update

In the existing `vrm-audio-play` handler, set `isTalkingRef.current = true` when audio starts.
Add `audio.onended = () => { setIsSpeaking(false); isTalkingRef.current = false }` so the talk layer stops when TTS finishes.

### `useFrame` — execution order (critical)

```typescript
useFrame((state, delta) => {
  const t = state.clock.elapsedTime
  const b = boneState.current

  // ── Pre-calc: volume (used by Layer 2 AND Layer 3 mouth sync) ──────
  let volume = 0
  if (analyserRef.current) {
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > volume) volume = dataArray[i]
    }
  }

  // ── LAYER 1: Pose (arms + spine + head tilt) ───────────────────────
  const targets = getPoseTargets(poseRef.current, intensityRef.current, t)
  b.lUAz  = lerp(b.lUAz,  targets.lUAz,  0.08)
  b.rUAz  = lerp(b.rUAz,  targets.rUAz,  0.08)
  b.lLAz  = lerp(b.lLAz,  targets.lLAz,  0.08)
  b.rLAz  = lerp(b.rLAz,  targets.rLAz,  0.08)
  b.spineX = lerp(b.spineX, targets.spineX, 0.06)  // slightly slower — heavier movement
  b.headZ  = lerp(b.headZ,  targets.headZ,  0.05)  // slowest — natural head settle

  // ── LAYER 2: Talk gestures (additive, volume-driven) ───────────────
  if (isTalkingRef.current && volume > 10) {
    const v = Math.min(volume / 128, 1)
    b.rLAz += Math.sin(t * 4) * 0.08 * v      // wrist flick
    b.lUAz += Math.sin(t * 2.5 + 1) * 0.04 * v  // left arm breathes
  }

  // ── LAYER 3: Existing (blink, mouth sync, mouse look) ─────────────
  // ... mouth sync uses pre-calculated volume from above
  // ... blink timer unchanged
  // ... head/neck mouse tracking unchanged

  // ── Apply all bones ────────────────────────────────────────────────
  if (leftArm)    leftArm.rotation.z    = b.lUAz
  if (rightArm)   rightArm.rotation.z   = b.rUAz
  if (leftLower)  leftLower.rotation.z  = b.lLAz
  if (rightLower) rightLower.rotation.z = b.rLAz
  if (spine)      spine.rotation.x      = b.spineX
  // head.z is additive on top of mouse tracking (pitch/yaw):
  if (head)       head.rotation.z       = b.headZ
})
```

**Key:** Volume is calculated once, before Layer 2 and Layer 3, so both have access to the current frame's audio level.

---

## 5. Updated File — `AvatarForms.tsx`

**Path:** `frontend/src/components/3d/AvatarForms.tsx`  
**Target size:** ~410 lines (existing debt — no worse than before)

### Changes
- Remove `GLTFAvatar` component body (moved to `GLTFAvatar.tsx`)
- Remove `getPoseTargets` and `PoseTargets` (moved to `avatarPoses.ts`)
- Add re-export: `export { GLTFAvatar } from './GLTFAvatar'`
- All other form avatars (Cube, Swarm, Swarm2, Wave, Core, DNA, Ghost) unchanged

---

## Error Handling

| Scenario | Behavior |
|---|---|
| LLM skips EMO tag entirely | 60-char fallback fires → neutral/medium |
| LLM emits malformed tag `[ Emo : Happy ]` | `parse_emo_tag` regex scrubs whitespace + lowercases → parses correctly |
| Unknown emotion value | Falls back to `neutral` |
| Unknown intensity value | Falls back to `medium` |
| VRM model missing spine bone | `spine?.rotation.x = ...` optional chaining — silent skip |
| Audio analyser not connected | `volume` stays 0 → Layer 2 dormant |
| Studio test dropdown (string dispatch) | Backward-compat handler reads string, sets intensity to `medium` |

---

## File Summary

| File | Action | Est. lines |
|---|---|---|
| `backend/main.py` | Add `EMO_INSTRUCTION`, `inject_emo_instruction()`, `parse_emo_tag()`, `emo_buffered_stream()`, wire into `chat()` | +70 lines |
| `frontend/src/components/3d/avatarPoses.ts` | New — pose types, constants, `getPoseTargets()` | ~80 lines |
| `frontend/src/components/3d/GLTFAvatar.tsx` | New — extracted + 3-layer useFrame | ~330 lines |
| `frontend/src/components/3d/AvatarForms.tsx` | Remove GLTFAvatar + poses, add re-export | ~410 lines |
| `frontend/src/components/views/ChatInterface.jsx` | SSE event parser update, remove `detectPose()` | ~10 lines net change |
