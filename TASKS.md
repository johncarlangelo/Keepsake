# TASKS.md — Implementation roadmap

Statuses: `TODO` · `IN_PROGRESS` · `BLOCKED` · `DONE`. Dependencies listed as task ids.
Update statuses as work proceeds; acceptance criteria reference `VERIFY.md` ids.

## Phase 1 — Repository inspection & documentation
- [x] **T1.1** Inspect repository (was empty; greenfield) — findings in `DECISIONS.md` D-012. DONE
- [x] **T1.2** Install project-local skills; study guidance. DONE
- [x] **T1.3** Write all nine docs, reconciled (`PRD`, `DESIGN`, `ARCHITECHTURE`, `AGENTS`, `LOOP`, `VERIFY`, `TASKS`, `PPROGRESS`, `DECISIONS`). DONE

## Phase 2 — Design system & app shell
- [ ] **T2.1** Tokens, base CSS, fonts (self-host), grain texture. *(A: n/a · B: B11)*
- [ ] **T2.2** App shell: header, hash router, tab bar, sheets/modals/toasts, focus trap. *(B11, B12)*
- [ ] **T2.3** Shared UI kit (Button/Chip/Slider/Sheet/Modal/Toast/StorageMeter). *(A11)*

## Phase 3 — Camera access & capture lifecycle
- [ ] **T3.1** `CameraController` + permission states + explainer modal. *(B1–B3)*
- [ ] **T3.2** Live preview UI, mirroring, camera switch, cleanup guarantees. *(B1, B4)*

## Phase 4 — Capture sessions, countdown, retakes
- [ ] **T4.1** Session store, countdown (0/3/5), shutter flash, optional sound. *(B1)*
- [ ] **T4.2** Review grid, per-slot retake, restart/discard controls. *(B4)*

## Phase 5 — IndexedDB Gallery & persistence
- [ ] **T5.1** `db.ts` wrapper + record schema + quota/persist/estimate. *(A7, B5, B6)*
- [ ] **T5.2** Auto-save on capture (success/failure honesty). *(B1, B6)*

## Phase 6 — Gallery browsing & management
- [ ] **T6.1** Grid, thumbnails, detail viewer, metadata. *(B5)*
- [ ] **T6.2** Select mode, delete/clear, reuse into Studio, storage meter UI. *(B6, B14)*

## Phase 7 — Strip templates & composition engine
- [ ] **T7.1** Template registry ≥10 layouts incl. unequal slots. *(A1)*
- [ ] **T7.2** `renderComposition` single-path preview/export + footer band. *(A10, B7)*

## Phase 8 — Unequal slots & variable shot counts
- [ ] **T8.1** Verified geometry for hero/mosaic layouts; 1–6 shot coverage. *(A1, B7)*

## Phase 9 — Filter library
- [ ] **T9.1** Registry ≥25 presets / ≥8 categories + intensity. *(A2)*
- [ ] **T9.2** Render integration (ctx.filter + pixel fallback + overlays). *(A10, B8)*

## Phase 10 — Frames, themes, stickers, text
- [ ] **T10.1** Frame registry ≥20 presets, procedural rendering. *(A3, B8)*
- [ ] **T10.2** Sticker set + placement/drag/scale/rotate; text & date stamps. *(B9)*

## Phase 11 — Editor
- [ ] **T11.1** Editor store + undo/redo + reset; per-slot crop (pan/zoom). *(A6, A5, B9)*
- [ ] **T11.2** Studio screen: tabs, slot selection, apply-to-all, reorder. *(B9)*

## Phase 12 — Export & sharing
- [ ] **T12.1** Hi-res PNG export 2×/3×, download, Web Share + fallbacks, save-strip-to-Gallery. *(A9, B10)*

## Phase 13 — Cross-platform compatibility & performance
- [ ] **T13.1** Responsive passes (320–1440), safe areas, landscape. *(B11)*
- [ ] **T13.2** Memory pass: URL pool, bitmap LRU, canvas reuse. *(B10 leak check)*

## Phase 14 — Accessibility, privacy, tests, deployment readiness
- [ ] **T14.1** Keyboard/reduced-motion/focus pass; aria coverage. *(B12)*
- [ ] **T14.2** Privacy audit (network panel) + build budget check. *(B13)*
- [ ] **T14.3** README deployment instructions (Vercel / GitHub Pages subpath). DONE with scaffold docs
- [ ] **T14.4** Full Tier A suite green locally. *(A1–A11)*

## Phase 15 — Final CI configuration
- [ ] **T15.1** Review absent `ci.yml` discrepancy (D-012) and add minimal workflow **only after all above DONE**.

## Definition of DONE (per task)
Gates pass (`typecheck`/`lint`/`test`/`build`), referenced VERIFY ids executed at required tier,
docs + `PPROGRESS.md` updated, conventional commit made.
