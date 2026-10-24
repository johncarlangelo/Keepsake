# Keepsake — Architecture

**Note on filename:** this file is intentionally named `ARCHITECHTURE.md` per the project charter's
required file list (see `DECISIONS.md` D-013).

---

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | **Vite 6** + `@vitejs/plugin-react` | Fast static builds, simple GH Pages/Vercel output |
| UI | **React 18 + TypeScript (strict)** | Componentized screens; broad tooling |
| State | **Zustand** (3 small stores) | Editor history without prop drilling; no Redux weight |
| Tests | **Vitest** + jsdom + Testing Library + `fake-indexeddb` + `jest-canvas-mock` | Unit + component tests of geometry, storage, state |
| Lint | ESLint 9 (`typescript-eslint`, `react-hooks`) | CI gate |
| Styling | Hand-written CSS with design tokens (`src/styles/*.css`) | No framework weight; tokens are the contract |
| Fonts | Self-hosted WOFF2 (Fraunces, Caveat — SIL OFL) | Privacy charter: zero third-party runtime requests |

No other runtime dependencies. Anything new requires a `DECISIONS.md` entry.

## 2. Module map

```
src/
  main.tsx                 # entry: mounts <App/>, imports styles
  App.tsx                  # shell: header, view router, tab bar, toasts
  route.ts                 # tiny hash router (#/booth #/studio #/gallery)
  types.ts                 # shared domain types (PhotoRecord, SlotEdit, Composition…)
  lib/
    camera.ts              # CameraController class: start/stop/switch/capture, permission states
    db.ts                  # IndexedDB wrapper: photos store, CRUD, estimate, persist
    images.ts              # bitmap loading, thumbs, crop-fit math, ObjectUrlPool
    prefs.ts               # localStorage settings (countdown, sound, mirror, last template)
    share.ts               # download / Web Share / fallback detection
    sound.ts               # synthesized shutter & countdown beeps (WebAudio, gesture-gated)
  data/
    templates.ts           # strip layout registry (normalized geometry)
    filters.ts             # filter preset registry (params + overlay spec)
    frames.ts              # frame/theme registry (draw functions, normalized)
    stickers.ts            # vector sticker path registry
  render/
    compose.ts             # THE renderer: geometry → canvas (preview & export, one path)
    filterRender.ts        # css-filter build, pixel fallback, overlay passes (grain/vignette/leak)
    frameRender.ts         # frame drawing helpers (paper, sprockets, doodles, washi…)
    patterns.ts            # seeded noise/pattern generators (deterministic)
  state/
    settings.ts            # persisted preferences store
    capture.ts             # capture session store (shots, review, retakes)
    editor.ts              # composition store + undo/redo history
    gallery.ts             # gallery list store (records, selection, storage stats)
  screens/
    BoothScreen.tsx        # landing → live → review state machine
    StudioScreen.tsx       # canvas + tool sheet (Layout/Filter/Frame/Text/Stickers/Adjust)
    GalleryScreen.tsx      # grid, detail viewer, select mode
  components/              # Button, Chip, Sheet, Modal, Toast, Slider, StripCanvas,
                           # TemplatePicker, FilterPicker, FramePicker, StorageMeter, …
tests/                     # unit & component tests (see VERIFY.md)
```

**Dependency direction:** `screens → state → lib/data → render`. `render` never imports React.
Registries (`data/*`) are pure data + pure functions; UI iterates them.

## 3. Camera acquisition & lifecycle

`CameraController` (one instance per live session, in `screens/BoothScreen.tsx`):

```
idle → (user taps Start, after explainer) requesting → granted ⇄ switching
                                          ↘ denied | no-device | busy (terminal until user retries)
```

- `start(preferFacing)`: `getUserMedia({ video: { facingMode, width: {ideal:1920}, height:{ideal:1080} }, audio:false })`.
- Errors map to states: `NotAllowedError→denied`, `NotFoundError/OverconstrainedError→no-device`, `NotReadableError→busy`.
- `switchCamera()`: enumerate devices; restart stream; video track `onended` handled (external camera grab).
- `captureStill(videoEl, {mirror})`: draws the current frame to an offscreen canvas at native
  resolution → `toBlob('image/jpeg', .92)`. Mirrored via transform when front camera and setting on.
- **Cleanup guarantees:** `stop()` stops every track; called on unmount, route change,
  `visibilitychange→hidden` (restarts on visible if session live), session end, and retake flow end.
  The `<video>` element is always paused & `srcObject` nulled after stop.

## 4. Capture sessions

`state/capture.ts` holds `{ templateId, shots: ShotRecord[], phase }`, `phase ∈
{idle,live,countdown,review}`. `ShotRecord = { photoId, blob, thumbUrl, width, height }`
(ephemeral, for the review grid). The durable copy lives in IndexedDB the moment a shot succeeds:

```
countdown ends → captureStill → makeThumb → db.putPhoto(record)  // automatic Gallery save
              → on success: shot pushed, next countdown
              → on failure: toast with retry; shot NOT pushed; session paused
```

Retake(slotIndex) → re-enters live for one shot → replaces slot (new photo also auto-saved;
the old photo remains in the Gallery — retake never deletes). "Compose in Studio" loads shot
ids into the editor store.

## 5. Data model & storage

### 5.1 IndexedDB (`lib/db.ts`)
- DB `keepsake`, version 1. Object store **`photos`** keyPath `id` (uuid), index `createdAt`.
- Record:

```ts
type PhotoRecord = {
  id: string;
  kind: 'capture' | 'strip';
  createdAt: number;          // epoch ms
  width: number; height: number;
  bytes: number;
  blob: Blob;                 // original JPEG (capture) or PNG (strip)
  thumb: Blob;                // ~320px JPEG for grid
  label?: string;             // template/frame name for strips
};
```

- Corruption policy: `getAll` wraps reads; a record whose `blob`/`thumb` fails to decode is flagged
  `corrupt` in the store (never auto-deleted); detail view offers explicit delete.
- Quota policy: `putPhoto` maps `QuotaExceededError` to a typed failure → UI toast with
  "free space / retry". **Never silently evict.**
- `navigator.storage.estimate()` powers the meter; `navigator.storage.persist()` is requested once
  after the first successful capture (best effort, result surfaced in storage info sheet).
- Migrations: version bump = additive change + a migration function in `db.ts`; migrations must
  never delete user photos (charter). Schema changes get a DECISIONS entry.

### 5.2 localStorage (`lib/prefs.ts`)
Keys under `keepsake.*`: `settings` (countdown length, sound on/off, mirror-save on/off, last
template, default export scale). Small JSON only — never image data.

## 6. Composition engine (the heart)

`render/compose.ts` exposes `renderComposition(canvas, comp, bitmaps, targetWidth)` used by
**both** the live preview (small) and export (large). One code path ⇒ preview/export parity.

### 6.1 Template geometry
Templates declare design-space `canvas {w,h}` and `slots: [{x,y,w,h}]` **normalized 0–1**,
spacing baked in. Frames declare `padding` (normalized) + `gap`. Final rect:
`slotRect = contentRect ∘ (framePadding + slotNorm)`. Aspect per slot is *computed* from geometry,
not asserted — so unequal layouts are first-class. Adding a layout = adding data.

### 6.2 Render pass order
1. Background: frame fill + texture pattern (seeded, deterministic).
2. Footer/caption band (if template has one): background first, text later.
3. For each slot: clip rounded rect → `drawSlotImage`:
   - source crop = cover-fit + user crop (`pan/zoom`) in normalized source units;
   - color pass: `ctx.filter` CSS string when supported, else `filterRender`'s pixel fallback
     (brightness/contrast/saturate/hue/sepia/grayscale via LUT; blur approximated by
     downsample-upsample composite);
   - overlay passes: vignette (radial gradient), grain (seeded noise pattern), light leak
     (screen-blend gradient) — intensity-scaled.
4. Slot borders/insets per frame.
5. Frame foreground: doodles, sprockets, tape, custom footer typography (Caveat/Fraunces).
6. Text layer: caption + optional date stamp.
7. Stickers: vector paths, per-instance transform (x,y,scale,rotation,color).

All drawing uses normalized units × current scale ⇒ identical output at 600 px or 3600 px wide.

### 6.3 Editor state & history (`state/editor.ts`)
```ts
Composition = {
  templateId, frameId,
  slots: SlotEdit[]           // {photoId, filterId, intensity, crop:{x,y,zoom,panX,panY}, flip}
  text: { caption, showDate, font, color, align, size }
  stickers: Placed[]          // {stickerId, x, y, scale, rotation, color}
}
```
Store keeps `past[]`/`future[]` (deep-cloned Composition snapshots, cap 40). `commit()`
wraps every mutation; debounced commits for continuous inputs (sliders commit on release).
Originals: `SlotEdit` references `photoId` only — the Gallery blob is never rewritten.
Export blobs may be saved as **new** records (`kind:'strip'`).

## 7. Memory & object URLs

- `ObjectUrlPool` (lib/images.ts): create/track/revoke-all; components never call
  `URL.createObjectURL` directly. Pool is flushed on route change and when thumbs unmount.
- `ImageBitmap`s are held in a module-level LRU (≤ 12), `close()`d on eviction.
- Capture canvases are reused (module singletons) instead of allocated per shot.
- Export: blob → object URL → anchor click → revoke after 10 s.

## 8. Export & sharing (`lib/share.ts`)

- Scales: 2× and 3× design units (e.g., classic strip 600×1840 → 1200×3680 / 1800×5520 PNG).
- Download: `<a download="keepsake-YYYYMMDD-HHMM.png">` — desktops save; iOS 13+ saves to Files/Photos per OS.
- Share: `navigator.canShare({files})` → share sheet; else hide Share, show Download + hint text.
- "Save to Gallery": `db.putPhoto({kind:'strip'})` — explicit, separate from automatic captures.

## 9. Routing & static hosting

- Hash router (`#/booth|#/studio|#/gallery`) — zero server rewrites, works on GH Pages subpath.
- Vite `base: './'` → relative asset URLs ⇒ correct under `johncarlangelo.github.io/Keepsake/` and
  Vercel root alike. No PWA, no service worker, no manifest (charter).
- `index.html`: `viewport-fit=cover`, `theme-color`, inline SVG favicon, font preloads.

## 10. Privacy enforcement

- Runtime network: fonts bundled; no fetch/XHR/beacons in app code. `VERIFY.md` includes a
  "zero external requests" DevTools check to keep this true.
- Camera frames exist only in: `<video>` → capture canvas → Blob → IndexedDB/preview. No
  `RTCDataChannel`, no WebSocket, no upload code paths exist at all.

## 11. Testing strategy

- **Unit:** template geometry (normalized rects, aspect math, unequal layouts), crop-fit math,
  filter registry integrity (ids unique, categories valid, params in range), frame registry,
  editor store (commit/undo/redo caps), prefs round-trip, export filename, db wrapper CRUD +
  quota error mapping (fake-indexeddb).
- **Component:** gallery empty state, template picker render, capture review grid smoke (jsdom).
- **Canvas:** renderComposition called with mock ctx (jest-canvas-mock) — verifies pass order,
  clip/filter calls, determinism across scales.
- **Not automated:** real camera, real device behavior, share sheets — manual checklists in `VERIFY.md`.
