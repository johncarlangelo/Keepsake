# PPROGRESS.md — Living status record

**Last updated:** 2026-10-24 (post-implementation, pre-CI)

## Current phase
All phases complete (1–15), CI green on GitHub. Remaining: owner-gated hosting decision and
real-device testing (Tier C).

## Completed
- Phase 1: nine docs written & reconciled; skills installed project-local; git initialized and
  pushed to `github.com/johncarlangelo/Keepsake` with incremental conventional commits.
- Phases 2–13: full application implemented — design system & shell, camera/capture lifecycle,
  countdown sessions & per-slot retakes, IndexedDB auto-save Gallery (browsing, preview, select,
  delete, clear, reuse, storage meter, failure honesty), 18 strip templates (incl. unequal-slot
  hero/mosaic/collage layouts), 35-filter library in 10 categories with intensity, 25 frame themes
  + custom color, 12 vector stickers + text/date stamps, Studio editor with undo/redo (cap 40) and
  per-slot crop/pan/zoom, high-res PNG export at 2×/3× with share/download/save-to-Gallery.
- Phase 14: accessibility pass (focus trap, aria, keyboard shortcuts incl. Ctrl+Z/Y, Space shutter,
  sticker arrow-nudge), privacy by construction (zero external runtime requests; fonts bundled),
  README with deployment instructions.

## In progress
- None. iOS export fix shipped (D-033, Phase 19.1): export pipeline is gesture-safe/synchronous
  and iOS saves via the share sheet ("Save Image"). **Needs re-test on a real iPhone** (owner's
  friend) — desktop re-verified, 58/58 tests green. Live Photo strips planned as Phase 20 (TODO).
  Live at https://johncarlangelo.github.io/Keepsake/.

## Blockers & known limitations
- **Owner's desktop "covered buttons" report** — root-caused and structurally fixed via the D-027
  Studio rebuild (three contained bands; tabs wrap instead of scroll-clipping; canvas pane owns its
  height with `overflow:hidden`). Verified at 375/853/1093/1280/1440, scrolled + unscrolled, but
  the owner's exact environment remains the final arbiter.
- **Real-device testing (Tier C) not performed** — iOS Safari, Android Chrome, iPad, and Windows
  webcams remain UNVERIFIED. Desktop-emulation smoke passed (see below).
- Camera behaviors that only manifest on devices (permission prompts, facingMode switching,
  iOS share sheet) are implemented per spec but unverified on hardware.
- Blur filters on browsers without `ctx.filter` fall back to an approximation (documented D-006).

## Verification results (actual runs)

**Tier A — automated (all green, 2026-10-24):**
- `npm run typecheck` → 0 errors (strict TS).
- `npm run lint` → 0 errors / 0 warnings.
- `npm test` → **8 files, 54 tests, 54 passed** (geometry, registries, crop math, editor history,
  IndexedDB CRUD/quota mapping, prefs round-trip, export naming, compose render calls, UI kit).
- `npm run build` → success. Output: JS 243.4 kB (**78 kB gzipped**, budget 250 kB gz) + CSS
  16 kB (4.3 kB gz) + 5 self-hosted WOFF2 fonts (~157 kB static, cacheable).

**Tier B — desktop emulation (in-app Chromium browser, 1280-wide + 390×844):**
- App boots; all three views render (Booth landing with 6 quick layouts + full 18-layout picker,
  Gallery, Studio).
- Seeded a synthetic photo into IndexedDB from the page: appeared in Gallery with storage meter
  (~14 KB / ~236 GB); select → **Create strip** opened Studio correctly fitted to a 1-shot template.
- Pixel-verified render: photo drawn (center px = rose 196,121,126), frame & footer white;
  canvas 300×367 preview of 900×1100 design.
- Filter applied live (**Noir Deep** → center px 130,130,130 grayscale) with undo enabled.
- Export → **Download PNG** fired the browser download event.
- Mobile 390×844: no horizontal scroll, bottom tab bar visible.
- Not covered in emulation: real camera permission, countdown/flash (camera-dependent),
  share sheet, storage-full path (needs DevTools override), reduced-motion toggle.

**Tier C — actual devices: UNVERIFIED (see VERIFY.md C1–C6).**

**CI (GitHub Actions, real runs):** `.github/workflows/ci.yml` (created per D-012) — run
40105098575 ✓ success (27 s, Node 20), run 40105184558 ✓ success (27 s, Node 24). All four gates
green on ubuntu-latest.

## Important files changed (latest first)
- `README.md`, `PPROGRESS.md`, `TASKS.md`, `DECISIONS.md` (this update)
- `src/**` (all application code), `tests/**` (8 suites), `src/assets/fonts/**` (OFL fonts)
- Nine root documentation files, `.agents/skills/**`

## Exact next recommended action
All code phases are complete and CI is green. Next: the project owner tests the app
(`npm run dev` locally) and gives the go-ahead for hosting — Vercel or GitHub Pages, both
documented in `README.md`. Deployment is explicitly owner-gated; real-device testing (VERIFY C1–C6)
is the other open follow-up.
