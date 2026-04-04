# Per-Model Avatar Settings with Auto-Fit

**Date:** 2026-04-03
**Status:** Approved

## Problem

`avatar3DScale` and `avatar3DYOffset` are single global localStorage values shared across all 3D models. Switching models reuses the previous model's settings, forcing the user to re-adjust sliders every time.

## Goals

- Settings are saved per model URL — switching back to a known model restores it exactly as left
- First load of an unknown model auto-fits: scale and vertical position are computed from the model's geometry so the face is centered
- A "Reset fit" button lets the user re-trigger auto-fit at any time

## Data & Storage

New localStorage key: `avatar3DModelSettings`
Type: `Record<modelUrl, { scale: number, yOffset: number }>`

The existing keys `avatar3DScale` and `avatar3DYOffset` remain and always reflect the active model's current settings. `MiniAvatar.tsx` requires no changes.

**Model switch flow:**
1. User selects model X
2. Check `avatar3DModelSettings[X]`
3. Entry exists → write its `scale`/`yOffset` into `avatar3DScale`/`avatar3DYOffset`
4. No entry → wait for `onFitComputed` callback from `GLTFAvatar`, then save

**Slider change flow:**
- Update `avatar3DScale`/`avatar3DYOffset` as before
- Also write `avatar3DModelSettings[currentUrl] = { scale, yOffset }`

## Auto-Fit Algorithm

`GLTFAvatar` gains a new optional prop:
```
onFitComputed?: (fit: { scale: number, yOffset: number }) => void
```

Computed after VRM/GLTF load:

1. `Box3.setFromObject(vrm.scene)` — bounding box in local model space
2. `headLocalY`:
   - Primary: `vrm.humanoid?.getNormalizedBoneNode('head')?.position.y`
   - Fallback (no humanoid): `box.min.y + boxHeight * 0.88`
3. `scale = clamp(3.5 / boxHeight, 1.0, 6.0)` — normalizes model to ~3.5 world units tall
4. `yOffset = clamp(-headLocalY * scale, -8, 2)` — places head at world Y ≈ 0 (camera focus)
5. Call `onFitComputed({ scale, yOffset })`

`AvatarStudio` accepts this callback and applies the values only when no saved entry exists for the URL.

## Reset Fit Button

A small "↺ Reset fit" button is shown next to the scale/offset sliders in the 3D tab.

On click:
- Delete `avatar3DModelSettings[currentUrl]`
- The next render will trigger `GLTFAvatar` to re-compute and call `onFitComputed`
- New auto-fit values are applied and saved

## Component Changes

| File | Change |
|---|---|
| `frontend/src/components/3d/AvatarForms.tsx` | Add `onFitComputed` prop to `GLTFAvatarProps`; compute and call after VRM load |
| `frontend/src/components/views/AvatarStudio.jsx` | Add `avatar3DModelSettings` localStorage state; sync on model switch; update map on slider change; pass `onFitComputed`; add Reset button |
| `frontend/src/components/Chat/MiniAvatar.tsx` | No changes |

## Out of Scope

- Auto-fit for 2D avatars
- Per-model camera FOV adjustment
- Sharing settings between users
