# Auraswarm Redesign — Design Spec

**Date:** 2026-04-02
**Phase:** 04 — 3D Implementation
**Files:** `frontend/src/components/views/AvatarForms.jsx` (new), `AvatarStudio.jsx` (updated)

---

## Constraints

- No new packages — `simplex-noise` not available, noise approximated via layered sine harmonics (FBM-style)
- File split required: current file will exceed 300 lines, so avatar components are extracted to `AvatarForms.jsx`
- `three` and `@react-three/fiber` are the only 3D dependencies

---

## Noise Strategy

Organic movement uses overlapping sine harmonics (FBM approximation):

```
dx = sin(sy*1.7 + t*0.8 + phase_x) * cos(sz*1.3 + t*0.6) * drift
dy = sin(sz*1.7 + t*0.8 + phase_y) * cos(sx*1.3 + t*0.6) * drift
dz = sin(sx*1.7 + t*0.8 + phase_z) * cos(sy*1.3 + t*0.6) * drift
```

Each particle has unique seed coordinates (unit sphere) and unique phase offsets, so they all drift independently.

---

## SwarmAvatar — Plexus / Sentient Data Cloud

**Props:** `count`, `spread`, `color`

### Particle Movement
- Seeds: uniform random points on unit sphere surface
- Phase offsets: random per particle per axis
- Each frame: `position = seed * spread + noise(seed, t) * spread * 0.25`
- This keeps particles orbiting loosely around their seed positions

### Plexus Lines
- Pre-allocated `lineBuffer` of size `count * (count - 1) * 3` floats (max possible lines)
- Each frame: O(n²) distance check using squared distance to avoid sqrt
- Connection radius: `spread * 0.75`
- Write matching pairs into `lineBuffer`, track write index `li`
- Call `setDrawRange(0, li / 3)` to render only populated lines
- Line geometry initialized imperatively via `linesGeoRef.current.setAttribute(...)` on first frame / count change, tracked with `currentLineRef`

### Rendering
- `<points>` with `bufferAttribute` (declarative, mutated each frame)
- `<lineSegments>` with empty `bufferGeometry` (initialized imperatively)
- `pointsMaterial`: size 0.08, opacity 0.9
- `lineBasicMaterial`: opacity 0.15 (translucent constellation lines)

### Slider adjustments
- Particle Count: 20–120 (O(n²) cap)
- Spread (Swirl Radius): 1–8

---

## WaveAvatar — Plasma Aura Sphere

**Props:** `amplitude`, `frequency`, `color`

**Constant:** 800 particles

### Particle Arrangement
- Uniform random on sphere surface (unit sphere seeds, fixed at mount)
- No re-seeding on prop change — only ripple parameters change

### Animation
- Per particle: `angle = atan2(sy, sx)`, `polar = acos(sz)` — spherical coordinates of seed
- `ripple = sin(angle*3 + polar*4 + t*frequency) * amplitude * 0.5`
           `+ sin(angle*5 - polar*2 + t*frequency*1.3) * amplitude * 0.2`
- `r = 3 + ripple` — particles pulse radially, creating a living sphere surface

### Rendering
- `<points>` with additive blending (`THREE.AdditiveBlending`) for glow
- `depthWrite={false}` to prevent z-fighting with additive transparency
- `pointsMaterial`: size 0.07, opacity 0.7

### Slider adjustments
- Amplitude: 0.5–4 (controls pulse depth)
- Frequency: 0.1–3 (controls ripple speed)

---

## File Structure

```
frontend/src/components/views/
├── AvatarForms.jsx   NEW  ~155 lines — CubeAvatar, SwarmAvatar, WaveAvatar
└── AvatarStudio.jsx  MOD  ~205 lines — UI shell, settings, layout
```

---

## State defaults (FormTab)

| State | Old | New |
|---|---|---|
| particleCount | 100 | 80 |
| spread | 5 | 4 |
| amplitude | 2 | 1.5 |
| frequency | 1 | 1.5 |
