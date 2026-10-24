# Keepsake — Product Requirements Document

**Product:** Keepsake, a cross-platform web photobooth
**Type:** Independent passion project. Static, browser-only web application.
**Status:** Active development (see `PPROGRESS.md`)

---

## 1. Vision

Keepsake is a photobooth that lives in a browser tab. Open a link, allow the camera, and in
seconds you are taking photos with film-inspired filters, dropping them into classic or playful
strip layouts, decorating them, and exporting a finished keepsake to keep or share.

It should feel like a thoughtful physical object — a warm, film-era photobooth — not a generic
web dashboard. Every photo taken is automatically kept in Keepsake's own in-app Gallery, so
coming back to the site means coming back to your favorite moments.

**One-line pitch:** *A film-inspired photobooth in your browser that keeps your moments.*

## 2. Users

| Persona | Device | Motivation |
| --- | --- | --- |
| **The friend group** | Phones (iOS Safari / Android Chrome), often at gatherings | Take a quick strip of silly photos together, apply a cute frame, share to group chat. |
| **The couple** | Phone or tablet | Date-night four-cut strips (Korean photo-booth style), romantic frames, printed or saved. |
| **The solo nostalgist** | Laptop/desktop with webcam (Windows/Edge/Chrome) | Play with film filters, build layouts from webcam shots, export wallpapers or avatars. |
| **The returning visitor** | Any supported device | Revisit the Gallery, reuse old photos in a new strip without retaking them. |

All users share one expectation: **photos are kept automatically** and **nothing is uploaded anywhere**.

## 3. Product principles

1. **Local-first privacy.** Camera frames and photos never leave the device. No uploads, no analytics, no accounts.
2. **The Gallery is the heart.** Every successful capture is automatically saved into Keepsake's own browser-local Gallery. Saving is not a user task; it is a product behavior.
3. **The preview is the truth.** What you see in the editor is pixel-for-pixel what you export (same rendering code path).
4. **Delight in the details.** Countdowns, shutter flash, film grain, playful frames — the photobooth ritual, honored.
5. **Honest software.** Never claim a save succeeded if it failed. Never claim a platform works if it was not tested. Surface errors with recovery actions.
6. **Extensible by design.** Filters, frames, and strip layouts are data, not hard-coded UI. New ones are added without touching the render engine.

## 4. User journeys

### J1 — First visit, capture to share (phone)
1. Open hosted URL → landing screen with a friendly privacy note.
2. Tap **Start the Booth** → choose a strip layout (e.g., Classic 4) and session settings → allow the camera.
3. Permission explainer modal → **Enable camera** → browser permission prompt → live preview (mirrored, front camera default on phones).
4. Countdown 3-2-1 × 4 shots, shutter flash and optional sound between each. Each photo is saved to the in-app Gallery as it is taken.
5. Review grid: retake any single slot, or **Compose in Studio**.
6. Studio: pick a filter (per-photo or whole strip), pick a frame, add a caption/date, maybe a sticker.
7. **Export** → high-resolution PNG → **Share** (native sheet) or **Download**.
8. Later: reopen site → Gallery still has the originals.

### J2 — Reuse saved photos (any device)
1. Open Gallery → thumbnails of past captures and saved strips.
2. Long-press / check marks to select 4 photos → **Create strip**.
3. Studio opens with those photos already placed in the default template.
4. Style, export as in J1. Originals remain untouched in the Gallery.

### J3 — Webcam on desktop
Same as J1, with mouse/keyboard: Space to capture, arrow keys to browse filters, Ctrl+Z/Y in Studio.

## 5. Feature requirements

### 5.1 Camera & capture
- Live preview via `getUserMedia`; explicit user action always precedes the permission request.
- Front/rear camera switching where the device has more than one camera; no assumption both exist.
- Permission states: idle → requesting → granted / denied / no-device / busy, each with a clear, actionable UI.
- Configurable countdown (off / 3 s / 5 s), per-session shot count driven by the chosen template (1–6+).
- Sequential capture sessions; **per-slot retake** without restarting the session; restart and clear controls.
- Optional shutter sound (synthesized, gesture-gated; never depends on autoplay) and flash overlay.
- Stream cleanup on camera switch, screen change, session end, and tab hide (`visibilitychange`).
- Front-camera captures are saved mirrored to match the live preview (see `DECISIONS.md` D-006).

### 5.2 Automatic in-app Gallery
- **Every successful capture is automatically saved** to Keepsake's Gallery (IndexedDB) immediately — no save button, no download step, no writes to the device's native Photos app.
- Gallery entry point is a first-class navigation destination (Booth / Gallery / Studio).
- Thumbnail grid with lazy loading; tap to open a full preview with metadata (capture date, dimensions, size).
- Reuse: select one or many photos → create a new strip without retaking.
- Delete individual photos, multi-select delete, and clear-all with confirmation.
- Storage feedback: usage estimate meter where supported; plain-language capacity notes.
- Failure handling: quota exhaustion, disabled storage, corrupted records — each with recovery options and honest messaging. Never silently drop or delete photos.
- Where supported, request persistent storage (`navigator.storage.persist()`), without assuming it is granted.
- The Gallery is **browser-local, not cloud backup**. The UI states this clearly (site-data clearing, private browsing, and eviction can remove photos).
- Finished strips may optionally be saved into the Gallery as a separate, explicit action; this never replaces automatic saving of originals.

### 5.3 Strip builder (data-driven templates)
- Layout registry defines real geometry per template (not one stretched layout): classic vertical strips, Korean four-cut grids, 1–6 shots, grids, horizontal filmstrip, single polaroid, and mixed layouts with **unequal slot sizes** (e.g., hero + three small).
- Per-slot aspect ratios and cropping; portrait and landscape outputs; configurable gaps, padding, backgrounds.
- Captions, date stamps, decorative footers per template family.
- Live preview rendered by the **same engine as export** at a smaller scale.

### 5.4 Filter library
- ~30 named presets in browsable categories: Analog Film, Disposable, Vintage & Faded, Warm & Golden, Cool & Muted, Soft Glow, Y2K Digicam, Monochrome, Dramatic, Pastel & Romantic.
- Overlay-based effects (grain, vignette, warm light-leak) where technically honest.
- Adjustable intensity; non-destructive; per-photo or whole-strip; consistent between preview and export.
- Filter thumbnails rendered from the user's own photo (or a bundled sample when no photo exists yet).

### 5.5 Frames, themes, stickers, text
- 20+ frame/theme presets: classic white/black, editorial minimal, blush & hearts, doodles & stars, Korean booth, Y2K, film borders with sprockets, scrapbook paper, elegant mono, seasonal, and custom-color frames.
- Instant preview; data-driven registry; all decorations drawn locally (CSS/SVG/canvas — no external assets).
- Vector sticker set (hearts, stars, sparkles, bows, flowers, tape, speech bubble, etc.), addable, draggable, scalable, rotatable, removable.
- Footer text with font, color, alignment; automatic date stamp; per-template caption areas.

### 5.6 Editor (Studio)
- Non-destructive: edits are parameters over original photos; originals in the Gallery are never overwritten.
- Per-photo crop (pan/zoom), filter choice, intensity; reorder photos where the layout allows.
- Undo/redo (≥ 30 steps) with keyboard support and buttons; reset controls.
- Clear handling of empty slots and partial sessions.

### 5.7 Export & sharing
- High-resolution PNG (template design resolution × 2 or × 3, e.g., a classic strip exports at 1200×3680 or 1800×5520).
- Rendering independent of CSS/screen scaling; crisp text and decorations.
- Desktop: download via anchor + Blob object URL (revoked promptly).
- Mobile: `navigator.share` with a file where supported; otherwise download or long-press guidance per platform.
- Optional "save strip to Gallery" (5.2). No promise of identical behavior across browsers; fallbacks are explained in-UI.

## 6. Cross-platform requirements

- **Targets:** iOS Safari (iPhone/iPad), Android Chrome (phones/tablets), Windows desktop browsers (Edge/Chrome) with webcams. Graceful support elsewhere.
- Responsive layouts for 320–1440 px+ viewports; portrait and landscape; safe-area insets respected; no hover-only controls; ≥ 44 px touch targets; 16 px minimum body text.
- Camera access requires a secure context (HTTPS or localhost). Production hosting (Vercel/GitHub Pages) provides this; local dev uses `localhost`.
- Real-device verification is tracked honestly in `VERIFY.md`; emulation alone is never reported as device verification.

## 7. Privacy

- All capture, filtering, composition, and export happen locally in the browser.
- No uploads, no analytics, no tracking, no accounts, no third-party requests at runtime (fonts are self-hosted).
- Camera permission is requested only after an explicit user action, and the stream is released when not needed.
- Storage limitations are explained in the Gallery UI.

## 8. Non-functional requirements

- Type-safe, modular TypeScript; registries separated from UI and rendering.
- Interactive preview renders at interactive resolution (device-pixel-ratio capped); export renders full-resolution off-screen.
- Memory discipline: object URLs tracked and revoked; `ImageBitmap`s closed when replaced; captures stored as Blobs.
- Automated tests for layout geometry, registries, storage wrapper, editor state, and export naming.
- Build < ~250 KB gzipped JS for first paint (budget, not hard gate).

## 9. MVP scope

**In (v1):** everything in §5 and §6, single-language English UI, PNG export.

**Explicit non-goals (v1):**
- PWA features (no service worker, manifest, or install prompt) — by project charter.
- Backend, accounts, sync, or cloud backup.
- Video/GIF capture, AR masks, face tracking.
- Print ordering or e-commerce.
- i18n/RTL.

**Future candidates:** JPEG/WebP export options, more seasonal packs, strip PDF printing layout, collage packs, optional EXIF-like metadata editing.

## 10. Acceptance criteria (summary level; detailed matrix in `VERIFY.md`)

1. **AC-Camera:** On a granted-permission device, a full session (pick layout → N shots with countdown → review) completes; tracks are stopped afterwards (verified via `mediaStream.active === false` / no camera indicator).
2. **AC-AutoSave:** After each successful capture, a new record appears in the Gallery without any user save action; it survives a full page reload; a failed write surfaces an error, never a false success.
3. **AC-Gallery:** Browse, preview, multi-select, delete, clear-with-confirm, reuse-into-Studio all work; empty and error states are reachable and correct.
4. **AC-Strips:** At least 10 distinct templates render, including ≥ 3 with unequal slot sizes and ≥ 4 shot-count variants (1, 2, 3, 4, 6).
5. **AC-Filters:** ≥ 25 presets across ≥ 8 categories apply per-photo and whole-strip, with working intensity and removal.
6. **AC-Frames:** ≥ 20 presets render identically in preview and export.
7. **AC-Editor:** Crop, reorder, filter, frame, text, sticker operations all undoable/redoable; original Gallery photos unchanged after editing.
8. **AC-Export:** Exported PNG dimensions match the template at the chosen scale; download works on desktop-class browsers; share sheet appears where `navigator.share({files})` is supported; fallback guidance otherwise.
9. **AC-Responsive:** No horizontal scroll or clipped controls at 320/375/768/1024/1440 px; portrait & landscape.
10. **AC-Privacy:** DevTools network panel shows zero external requests after load (excluding none — fonts are bundled); all processing local.

## 11. Storage limitations & browser behavior (user-facing truth)

- Browser-local storage is per-browser, per-device, per-origin. It is **not** sync and **not** backup.
- iOS Safari may evict IndexedDB data under storage pressure (Website Data offloading); Safari private windows do not persist. Android/Chrome eviction is possible when quota is exceeded and storage is not persistent.
- Clearing site data, browser profiles, or using private/incognito modes removes Gallery contents.
- These limitations are disclosed in-app (Gallery info sheet) and here.
