# Keepsake

A film-inspired photobooth that lives in your browser. Take photo strips, play with 35 filters and
25 frames, and keep every capture in Keepsake's own on-device Gallery — including **live photo
strips**, where every frame of a strip can replay its ~3-second moment like a physical photobooth.
**Nothing is ever uploaded** — all processing is local.

Built as a static web app (Vite + React 18 + TypeScript + Tailwind CSS v4). No backend, no
accounts, no PWA, no analytics.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 (camera requires a secure context — localhost is fine)
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint |
| `npm test` | Vitest suite (65 tests) |

## What's inside

- **Booth** — layout choice first (Start the Booth → "Choose your layout" sheet with live
  previews), then camera permission explainer → live preview (mirrored front camera) →
  configurable countdown (off/3s/5s), Manual or Continuous shutter (continuous auto-fires every
  shot), sequential shots → review with per-slot retakes. Every successful capture is saved
  automatically to the in-app Gallery. Camera switch where multiple cameras exist; stream always
  cleaned up (route change, tab hidden, session end).
- **Gallery** (Keepsake's own, browser-local — not your device's photo library) — thumbnail grid,
  full preview with metadata, multi-select, delete/clear with confirmation, storage meter, and
  one-tap reuse into the Studio. Survives reloads via IndexedDB. Honest failure states for full or
  unavailable storage; never silently deletes.
- **Studio** — 18 data-driven strip layouts (classic strips, Korean four-cut, hero+three, mosaic,
  collage, filmstrip, singles… including unequal slot sizes), per-slot or whole-strip filters with
  intensity, 25 procedural frame themes + custom color, 12 vector stickers (drag/scale/rotate),
  captions with font/color/alignment and date stamps, per-photo crop (zoom & pan), undo/redo
  (40 steps, Ctrl+Z / Ctrl+Shift+Z), keyboard-friendly.
- **Live photos** — with Live photos enabled, each shutter press also records a ~3-second clip
  (MediaRecorder; MP4 on iOS Safari, WebM elsewhere — all on-device). The Studio shows the still
  strip and the live strip side by side, both saveable to the Gallery; saved live strips replay in
  the Gallery and export as MP4.
- **Export** — high-resolution PNG at 2×/3× design scale, native share sheet where supported
  (iOS saves via the share sheet), download fallback with platform-appropriate hints, and explicit
  "Save still strip / Save live strip" actions in the Studio.

## Privacy

- All capture, filtering, composition, and export happen locally in the browser.
- Zero external runtime requests (fonts are bundled, SIL OFL — see `src/assets/fonts/`).
- No analytics, no service worker, no manifest, no accounts.
- Gallery storage is per-browser (IndexedDB) and is **not** cloud backup — the app says so where
  it matters. See `PRD.md §11` for the honest limitations.

## Deployment

The build is fully static with relative asset paths (`base: './'`) and hash routing, so it works
on any static host without server rewrites.

### Vercel
1. Import the repository at vercel.com.
2. Framework preset: **Vite** (Build `npm run build`, Output `dist/`). No env vars needed.
3. Deploy. HTTPS is automatic (required for camera access).

### GitHub Pages (repository subpath) — **ACTIVE**
1. Deployed via `.github/workflows/deploy.yml`: on every push to `main` the app is built and
   published with `actions/upload-pages-artifact@v3` + `actions/deploy-pages@v4`.
2. Pages source is **GitHub Actions** (enabled once via the Pages API, `build_type: workflow`).
3. The app is served under `/Keepsake/` — relative asset URLs and `#/` routing handle the
   subpath with no configuration.

**Live at: https://johncarlangelo.github.io/Keepsake/**

> Deployment was gated on the owner's explicit go-ahead per the project charter — the owner
> approved GitHub Pages on 2026-10-25 (see `DECISIONS.md` D-032).

## Repository layout

```
PRD.md DESIGN.md ARCHITECHTURE.md AGENTS.md LOOP.md VERIFY.md TASKS.md PPROGRESS.md DECISIONS.md
src/        application code (lib, data, render, state, components, screens, styles)
tests/      Vitest suites + canvas mock + jsdom setup
.agents/    project-local agent skills (installed per project charter)
```

`ARCHITECHTURE.md` keeps its charter spelling intentionally (DECISIONS D-013).

## Testing & honesty

Automated: `npm run typecheck && npm run lint && npm test && npm run build`.
Verification status (automated / emulation / real-device) is tracked in `VERIFY.md` and recorded in
`PPROGRESS.md`. As of the latest update, **real-device testing has not been performed** — iOS
Safari, Android Chrome, and Windows webcams are unverified until tested on hardware.
