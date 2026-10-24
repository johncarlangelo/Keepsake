# Keepsake

A film-inspired photobooth that lives in your browser. Take photo strips, play with 35 filters and
25 frames, and keep every capture in Keepsake's own on-device Gallery. **Nothing is ever
uploaded** — all processing is local.

Built as a static web app (Vite + React 18 + TypeScript). No backend, no accounts, no PWA, no
analytics.

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
| `npm test` | Vitest suite (54 tests) |

## What's inside

- **Booth** — camera permission explainer → live preview (mirrored front camera) → configurable
  countdown (off/3s/5s) → sequential shots → review with per-slot retakes. Every successful capture
  is saved automatically to the in-app Gallery. Camera switch where multiple cameras exist; stream
  always cleaned up (route change, tab hidden, session end).
- **Gallery** (Keepsake's own, browser-local — not your device's photo library) — thumbnail grid,
  full preview with metadata, multi-select, delete/clear with confirmation, storage meter, and
  one-tap reuse into the Studio. Survives reloads via IndexedDB. Honest failure states for full or
  unavailable storage; never silently deletes.
- **Studio** — 18 data-driven strip layouts (classic strips, Korean four-cut, hero+three, mosaic,
  collage, filmstrip, singles… including unequal slot sizes), per-slot or whole-strip filters with
  intensity, 25 procedural frame themes + custom color, 12 vector stickers (drag/scale/rotate),
  captions with font/color/alignment and date stamps, per-photo crop (zoom & pan), undo/redo
  (40 steps, Ctrl+Z / Ctrl+Shift+Z), keyboard-friendly.
- **Export** — high-resolution PNG at 2×/3× design scale, native share sheet where supported,
  download fallback with platform-appropriate hints, and an explicit "save strip to Gallery".

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

### GitHub Pages (repository subpath)
1. Build and publish from the `dist/` folder, e.g. with a workflow using
   `actions/deploy-pages@v4` (artifact upload of `dist/`), or the classic
   `gh-pages` branch: `npm run build && npx gh-pages -d dist`.
2. Enable Pages in repo Settings (source: GitHub Actions or `gh-pages` branch).
3. The app is served under `/Keepsake/` — relative asset URLs and `#/` routing handle the
   subpath with no configuration.

> Deployment/hosting of this project is gated on the owner's explicit go-ahead per the project
> charter — nothing is deployed by the repository itself.

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
