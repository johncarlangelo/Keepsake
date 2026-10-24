# TASKS.md — Implementation roadmap

Statuses: `TODO` · `IN_PROGRESS` · `BLOCKED` · `DONE`. Acceptance criteria reference `VERIFY.md` ids.

## Phase 1 — Repository inspection & documentation — DONE
- [x] **T1.1** Inspect repository (greenfield; findings in `DECISIONS.md` D-012).
- [x] **T1.2** Install project-local skills; study guidance.
- [x] **T1.3** Nine docs written and reconciled.

## Phase 2 — Design system & app shell — DONE
- [x] **T2.1** Tokens, base CSS, self-hosted fonts, grain texture. *(B: B11 partial — desktop emulation pass)*
- [x] **T2.2** App shell: header, hash router, tab bar, sheets/modals/toasts, focus trap.
- [x] **T2.3** Shared UI kit (Button/Chip/Slider/Sheet/Modal/Toast/StorageMeter). *(A11 ✓)*

## Phase 3 — Camera access & capture lifecycle — DONE (code); Tier C device verification pending
- [x] **T3.1** `CameraController` + permission states + explainer modal. *(B2/B3 not yet run on device)*
- [x] **T3.2** Live preview UI, mirroring, camera switch, cleanup guarantees.

## Phase 4 — Capture sessions, countdown, retakes — DONE (code); device verification pending
- [x] **T4.1** Session store, countdown (0/3/5), shutter flash, optional synthesized sound.
- [x] **T4.2** Review grid, per-slot retake, restart/discard controls.

## Phase 5 — IndexedDB Gallery & persistence — DONE
- [x] **T5.1** `db.ts` wrapper + schema + quota/persist/estimate. *(A7 ✓, B5 partial ✓)*
- [x] **T5.2** Auto-save on capture with honest failure reporting. *(B6 needs DevTools override run)*

## Phase 6 — Gallery browsing & management — DONE
- [x] **T6.1** Grid, thumbnails, detail viewer, metadata. *(B5 partial ✓ via seeded record)*
- [x] **T6.2** Select mode, delete/clear, reuse into Studio, storage meter UI. *(emulation ✓)*

## Phase 7 — Strip templates & composition engine — DONE
- [x] **T7.1** Template registry: 18 layouts incl. unequal slots. *(A1 ✓)*
- [x] **T7.2** `renderComposition` single-path preview/export + footer band. *(A10 ✓, B7 partial — one template pixel-verified)*

## Phase 8 — Unequal slots & variable shot counts — DONE
- [x] **T8.1** Hero/mosaic/collage geometry verified; shot counts 1–6. *(A1 ✓)*

## Phase 9 — Filter library — DONE
- [x] **T9.1** Registry: 35 presets / 10 categories + intensity. *(A2 ✓)*
- [x] **T9.2** Render integration (ctx.filter + pixel fallback + overlays). *(A10 ✓, live pixel check ✓)*

## Phase 10 — Frames, themes, stickers, text — DONE
- [x] **T10.1** Frame registry: 25 presets incl. custom color. *(A3 ✓)*
- [x] **T10.2** 12 vector stickers with drag/scale/rotate; text & date stamps. *(B9 device pass pending)*

## Phase 11 — Editor — DONE
- [x] **T11.1** Editor store + undo/redo (cap 40) + reset; per-slot crop. *(A5/A6 ✓)*
- [x] **T11.2** Studio screen: tabs, slot selection, apply-to-all, reorder. *(emulation ✓)*

## Phase 12 — Export & sharing — DONE
- [x] **T12.1** Hi-res PNG 2×/3×, download, Web Share + fallbacks, save-strip-to-Gallery. *(A9 ✓, download event ✓)*

## Phase 13 — Cross-platform compatibility & performance — DONE (desktop emulation); devices pending
- [x] **T13.1** Responsive 390–1440 checked (no h-scroll at 390; desktop grid OK). *(B11 partial ✓)*
- [x] **T13.2** Memory discipline: URL pool, bitmap LRU, canvas reuse, download-URL revocation. *(leak check on device pending)*

## Phase 14 — Accessibility, privacy, tests, deployment readiness — DONE
- [x] **T14.1** Keyboard/reduced-motion/focus/aria implemented; full manual keyboard sweep pending (B12).
- [x] **T14.2** Privacy by construction (no network calls in code; fonts bundled); DevTools network confirmation on device pending (B13).
- [x] **T14.3** README deployment instructions (Vercel / GitHub Pages).
- [x] **T14.4** Full Tier A suite green: 54/54 tests; build 78 kB gz JS.

## Phase 15 — Final CI configuration — DONE
- [x] **T15.1** `.github/workflows/ci.yml` created per D-012 (checkout@v4, setup-node@v4/Node 24,
      npm cache, then the four real gates: typecheck → lint → test → build). Verified green on
      GitHub Actions: runs 40105098575 and 40105184558, both ✓ 27 s.

## Phase 16 — Tailwind CSS migration — DONE (2026-10-25, D-028/D-029)
- [x] **T16.1** `tailwindcss` + `@tailwindcss/vite` added; Analog Heartbreak tokens mapped into
      CSS-first `@theme` in `src/styles/theme.css`; gates green with Tailwind active.
- [x] **T16.2** UI kit rebuilt on cva + `cn()` (shadcn pattern) + Radix Tabs; App shell, Booth,
      Studio, Gallery, pickers, filter picker, decorations all migrated to utilities. Legacy
      tokens/base/ui/screens.css deleted — `theme.css` is the only stylesheet.
- [x] **T16.3** D-027 studio geometry/hit-test audit re-run at 375/853/1093/1280/1440 (unscrolled
      + scrolled): zero issues; all tab pills click through; strip never clipped; no h-overflow.
- [x] **T16.4** ARCHITECHTURE stack table + module map updated; README tree unchanged
      (`src/styles` still exists, now holding only `theme.css`). CI four gates unchanged.

## Phase 17 — Expressive showcase redesign — DONE (2026-10-25, D-030)
- [x] **T17.1** `src/components/showcase.tsx` + `booth-sections.tsx`: AuroraBackdrop,
      SpotlightCard, Marquee, FanStrips, StepCard, SectionHeading, HeroStage, FeatureBento,
      HowItWorks — zero new runtime dependencies.
- [x] **T17.2** Booth landing rebuilt (hero stage + marquee + bento + steps), Gallery expressive
      pass, Studio film-stage pane, App shell hairline + footer. Verified in-browser at 1280/375:
      no overflow, CTAs hittable, D-027 studio containment audit clean.

## Phase 18 — Booth flow rework & capture modes — DONE (2026-10-25, D-031)
- [x] **T18.1** Layout selection moved into a "Choose your layout" start sheet (Start the Booth →
      layout + session settings → camera explainer); landing picker removed, CTA band added.
- [x] **T18.2** Dead X button root-caused (dialog rendered on landing branch only) and fixed by
      rendering the discard dialog in every phase branch.
- [x] **T18.3** Manual/Continuous capture toggle in the live view; continuous auto-fires each
      remaining shot (ref-held timer, cancelled on end/retake/unmount); setting persisted.

## Open follow-ups (not blockers)
- Tier C device testing (VERIFY C1–C6) when hardware available — required before claiming any
  platform as verified.
- B6 (storage-full via DevTools override), B12 (keyboard/reduced-motion sweep), B13 (network
  panel capture) — 30 minutes of manual DevTools work, ideally alongside device tests.
