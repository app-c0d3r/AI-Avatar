# Avatar Per-Model Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save scale/yOffset per 3D model URL so switching back restores exact settings; auto-fit new models on first load; add a Reset button to re-trigger auto-fit.

**Architecture:** `GLTFAvatar` computes a fit suggestion after VRM load and calls an optional callback. `AvatarStudio` manages a `avatar3DModelSettings` map in localStorage keyed by model URL; on URL change it loads saved settings or waits for the fit callback; slider changes write back to the map. `MiniAvatar` is untouched — it still reads the global `avatar3DScale`/`avatar3DYOffset` keys, which stay in sync.

**Tech Stack:** React, @react-three/fiber, three (THREE.Box3 / THREE.Vector3), @pixiv/three-vrm, localStorage via useLocalStorage hook.

---

## Files

| File | Change |
|---|---|
| `frontend/src/components/3d/AvatarForms.tsx` | Add `onFitComputed` prop; compute bounding-box auto-fit after VRM load |
| `frontend/src/components/views/AvatarStudio.jsx` | Add per-model settings map; sync on URL change; update map on slider; pass callback; add Reset button |

---

### Task 1: Add `onFitComputed` prop to `GLTFAvatar`

**Files:**
- Modify: `frontend/src/components/3d/AvatarForms.tsx:387-464`

- [ ] **Step 1: Extend the props interface**

In `AvatarForms.tsx` find:
```typescript
interface GLTFAvatarProps {
  url: string
  scale: number
  yOffset?: number
}
```
Replace with:
```typescript
interface GLTFAvatarProps {
  url: string
  scale: number
  yOffset?: number
  onFitComputed?: (fit: { scale: number; yOffset: number }) => void
}
```

- [ ] **Step 2: Destructure the new prop in the function signature**

Find:
```typescript
export function GLTFAvatar({ url, scale = 2.5, yOffset = -2.0 }: GLTFAvatarProps) {
```
Replace with:
```typescript
export function GLTFAvatar({ url, scale = 2.5, yOffset = -2.0, onFitComputed }: GLTFAvatarProps) {
```

- [ ] **Step 3: Compute fit and call callback after VRM load**

Find the `.then()` block inside the loader `useEffect`:
```typescript
        } else {
          setVrm(loaded)
        }
```
Replace with:
```typescript
        } else {
          setVrm(loaded)
          if (onFitComputed) {
            const box = new THREE.Box3().setFromObject(loaded.scene)
            const boxHeight = box.max.y - box.min.y
            if (boxHeight > 0) {
              loaded.scene.updateWorldMatrix(true, true)
              const headBone = loaded.humanoid?.getNormalizedBoneNode?.('head')
              const headLocalY = headBone
                ? (() => { const v = new THREE.Vector3(); headBone.getWorldPosition(v); return v.y })()
                : box.min.y + boxHeight * 0.88
              const fitScale = Math.min(Math.max(3.5 / boxHeight, 1.0), 6.0)
              const fitYOffset = Math.min(Math.max(-headLocalY * fitScale, -8), 2)
              onFitComputed({ scale: fitScale, yOffset: fitYOffset })
            }
          }
        }
```

- [ ] **Step 4: Verify in the browser**

Open the app → Studio tab → 3D tab → open browser console.
Add a temporary `onFitComputed` log to the Canvas in AvatarStudio to verify callback fires. Expect output like:
```
fit computed { scale: 2.1, yOffset: -3.0 }
```
(Values will vary per model — any non-NaN numbers are correct.)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/3d/AvatarForms.tsx
git commit -m "feat: add onFitComputed callback to GLTFAvatar for auto-fit"
```

---

### Task 2: Per-model settings in AvatarStudio

**Files:**
- Modify: `frontend/src/components/views/AvatarStudio.jsx:299-715`

- [ ] **Step 1: Add `avatar3DModelSettings` localStorage state**

In `AvatarStudio` function (after line 309, after `avatar3DYOffset` state):
Find:
```javascript
  const [chatAvatarSize, setChatAvatarSize]   = useLocalStorage('chatAvatarSize', 80)
```
Add the new state directly before it:
```javascript
  const [avatar3DModelSettings, setAvatar3DModelSettings] = useLocalStorage('avatar3DModelSettings', {})
  const [chatAvatarSize, setChatAvatarSize]   = useLocalStorage('chatAvatarSize', 80)
```

- [ ] **Step 2: Load saved settings when active URL changes**

After all the state declarations and before `const currentAudioRef`, add:
```javascript
  useEffect(() => {
    if (!avatar3DUrl) return
    const saved = avatar3DModelSettings[avatar3DUrl]
    if (saved) {
      setAvatar3DScale(saved.scale)
      setAvatar3DYOffset(saved.yOffset)
    }
  }, [avatar3DUrl]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Add `handleFitComputed` and `handleResetFit` handlers**

After the `useEffect` from Step 2, add:
```javascript
  const handleFitComputed = ({ scale, yOffset }) => {
    if (!avatar3DUrl || avatar3DModelSettings[avatar3DUrl]) return
    setAvatar3DScale(scale)
    setAvatar3DYOffset(yOffset)
    setAvatar3DModelSettings(prev => ({ ...prev, [avatar3DUrl]: { scale, yOffset } }))
  }

  const handleResetFit = () => {
    if (!avatar3DUrl) return
    setAvatar3DModelSettings(prev => {
      const next = { ...prev }
      delete next[avatar3DUrl]
      return next
    })
    setAvatar3DScale(2.5)
    setAvatar3DYOffset(-3.5)
  }
```

- [ ] **Step 4: Write scale/yOffset back to the map on slider change**

Find the scale slider `onChange` (currently sets only `setAvatar3DScale`):
```javascript
              onChange={(e) => setAvatar3DScale(Number(e.target.value))}
```
Replace with:
```javascript
              onChange={(e) => {
                const val = Number(e.target.value)
                setAvatar3DScale(val)
                if (avatar3DUrl) setAvatar3DModelSettings(prev => ({ ...prev, [avatar3DUrl]: { scale: val, yOffset: avatar3DYOffset } }))
              }}
```

Find the yOffset slider `onChange`:
```javascript
              onChange={(e) => setAvatar3DYOffset(Number(e.target.value))}
```
Replace with:
```javascript
              onChange={(e) => {
                const val = Number(e.target.value)
                setAvatar3DYOffset(val)
                if (avatar3DUrl) setAvatar3DModelSettings(prev => ({ ...prev, [avatar3DUrl]: { scale: avatar3DScale, yOffset: val } }))
              }}
```

- [ ] **Step 5: Add Reset fit button to the UI**

Find the closing `</div>` of the yOffset slider section (the one that contains `Vertical Position`):
```javascript
                  </div>

                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Chat Bubble Size
```
Insert the Reset button between the two sections:
```javascript
                  </div>

                  {avatar3DUrl && (
                    <div className="flex justify-end">
                      <button
                        onClick={handleResetFit}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        title="Re-compute auto-fit for this model"
                      >
                        ↺ Reset fit
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 pb-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Chat Bubble Size
```

- [ ] **Step 6: Pass `onFitComputed` to `GLTFAvatar` in the studio preview**

Find the studio Canvas GLTFAvatar (inside the `PreviewErrorBoundary` block, around line 511):
```javascript
                                <GLTFAvatar url={avatar3DUrl} scale={avatar3DScale} yOffset={avatar3DYOffset} />
```
Replace with:
```javascript
                                <GLTFAvatar url={avatar3DUrl} scale={avatar3DScale} yOffset={avatar3DYOffset} onFitComputed={handleFitComputed} />
```

- [ ] **Step 7: Verify full flow in browser**

**First load test:**
1. Open Studio → 3D tab
2. Clear `avatar3DModelSettings` from localStorage (`localStorage.removeItem('avatar3DModelSettings')`)
3. Select a model → sliders should auto-jump to computed values → face should be visible
4. Check `JSON.parse(localStorage.getItem('avatar3DModelSettings'))` — should show entry for current URL

**Persistence test:**
5. Adjust sliders manually
6. Switch to a different model
7. Switch back — sliders should restore the manually adjusted values

**Reset test:**
8. Click "↺ Reset fit" — sliders should jump back to auto-computed values
9. Check localStorage — previous entry removed and new auto-fit entry saved

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/views/AvatarStudio.jsx
git commit -m "feat: save scale/yOffset per model with auto-fit on first load and reset button"
```
