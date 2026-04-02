# Swarm & Wave 3D Avatars — Design Spec

**Date:** 2026-04-02  
**Phase:** 04 — 3D Implementation  
**File:** `frontend/src/components/views/AvatarStudio.jsx`

---

## Goal

Add `SwarmAvatar` and `WaveAvatar` 3D forms to the Avatar Studio, animated purely by math (sine wave + time) since no audio input is available yet. Wire up their settings sliders and color pickers so they are interactive.

---

## Components

### SwarmAvatar
- **Props:** `count`, `spread`, `color`
- Uses `useMemo` to generate a `Float32Array` of random `[x, y, z]` positions scaled by `spread`
- Renders a `<points>` element with `<bufferGeometry>` + `<bufferAttribute attach="attributes-position" />`
- Uses `useFrame` + `useRef` to slowly rotate the particle cloud (alive feeling)
- `<pointsMaterial size={0.1} color transparent opacity={0.8} />`

### WaveAvatar
- **Props:** `amplitude`, `frequency`, `color`
- Renders 24 vertical box bars aligned along the X-axis
- Uses `useRef` array + `useFrame` to animate Y-scale per bar:
  `Math.abs(Math.sin(clock.elapsedTime * frequency + i * 0.4)) * amplitude + 0.1`
- Bar Y-position tracks `scale / 2` so bars grow upward from zero

---

## State (added to FormTab)

| Variable | Default | Form |
|---|---|---|
| `particleCount` | 100 | Swarm |
| `spread` | 5 | Swarm |
| `swarmColor` | `#00ffff` | Swarm |
| `amplitude` | 2 | Wave |
| `frequency` | 1 | Wave |
| `waveColor` | `#ff00ff` | Wave |

---

## Integration

- `PreviewCanvas` renders `Canvas` for all three forms (no more placeholder div)
- Camera at `[0, 0, 10]` works for all form sizes
- `FormSettings` Swarm branch: Particle Count (10–500), Spread (1–15), Color picker
- `FormSettings` Wave branch: Amplitude (0.5–5), Frequency (0.1–5), Color picker
- All sliders are controlled (`value` + `onValueChange`)

---

## Constraints

- `useMemo` must be added to React import
- File must stay ≤ 300 lines
