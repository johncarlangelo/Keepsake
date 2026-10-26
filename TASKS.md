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
      Refined after owner feedback: session settings + Continue live in a pinned sheet footer
      (Sheet gained a `footer` prop) so no scrolling is needed to reach them.
- [x] **T18.2** Dead X button root-caused (dialog rendered on landing branch only) and fixed by
      rendering the discard dialog in every phase branch.
- [x] **T18.3** Manual/Continuous capture toggle in the live view; continuous auto-fires each
      remaining shot (ref-held timer, cancelled on end/retake/unmount); setting persisted.

## Phase 19 — GitHub Pages deployment — DONE (2026-10-25, D-032; owner-approved)
- [x] **T19.1** Pages enabled via REST API (`build_type: workflow`) using gh CLI — no manual
      GitHub-UI configuration required.
- [x] **T19.2** `.github/workflows/deploy.yml` added (build + upload-artifact + deploy-pages);
      site live at https://johncarlangelo.github.io/Keepsake/.

## Phase 20 — Live Photo strips — DONE (2026-10-25, D-034; owner tested and approved for push)
Physical photobooths print a still but let you relive the moment; Keepsake should too.
- [x] **T20.1** Spike + storage shape: MediaRecorder (MP4 for iOS → WebM fallback, feature
      detected); `PhotoRecord.live?` additive field; recorder never stops the camera stream.
- [x] **T20.2** Capture UX: "Live photos" chip in the start sheet (persisted pref, default off);
      clip spans countdown + shutter (countdown + 1.2s, or 3s untimed); last shot delays camera
      stop; continuous mode serializes on recording.
- [x] **T20.3** View UX (reworked per owner: strips, not individual clips): Studio shows BOTH
      outputs — still strip + `LiveStripPlayer` live strip; live strips save to the Gallery as
      `live-strip` records and open in the player from Finished strips (LIVE badge). Gallery
      tiles keep press-and-hold replay for individual captures.
- [x] **T20.4** Saves moved out of the export sheet (owner request): "Save still strip" / "Save
      live strip" sit in the Studio (above strips on mobile, below on desktop); export sheet keeps
      Share/Download PNG only. Stills never mutated; live data additive.
- [x] **T20.5** Privacy/quota: clips stay in IndexedDB; quota failure keeps the still + honest
      toast; storage meter reflects clips automatically (usage-based estimate).
- [x] **T20.6** Owner tested in-browser and approved push (2026-10-25). Known v1 limits: real-
      device (iPhone/Android) capture still to be exercised; clips of selfie sessions match the
      mirrored stills; iOS video export is one-at-a-time via the share sheet.

## Phase 21 — Face-tracking filters (Snap/Instagram-style) — RESEARCHED, NOT STARTED (2026-10-25)
Owner question: can we add face-tracking filters like Snapchat/Instagram without any API calls?
Research findings (full write-up in the session, 2026-10-25):
- **Snap/Instagram use native on-device ML** (ARKit/ARCore face meshes) — not web tech; their web
  SDKs (Snap Camera Kit, DeepAR, Banuba) all require platform accounts/keys/APIs → charter-violating.
- **Recommended: MediaPipe Face Landmarker** (`@mediapipe/tasks-vision`, Apache-2.0, Google) —
  478 landmarks + 52 blendshapes (smile, blink, jaw…), runs fully in-browser via WASM/WebGL/WebGPU,
  ~15–30 ms/frame desktop. Self-hostable: commit the `.task` model (~3.7 MB) + wasm to the repo and
  lazy-load only when a face filter is enabled → keeps the **zero external runtime requests**
  charter intact. Alternative: `@vladmandic/face-api` (68 landmarks, TF.js, heavier, older tech).
- Filter UX: overlay props anchored to landmarks (sunglasses on eyes, hat on forehead, dog ears),
  blendshape triggers (sparkles on smile, mask on jaw-open); overlays are BAKED into the capture
  (drawn on the capture canvas before save) so filters persist in strips/exports like the mirror.
- Plan: T21.1 bundle assets + lazy loader · T21.2 live-preview overlay loop in the booth ·
  T21.3 2–3 landmark-anchored props · T21.4 blendshape-triggered effects · T21.5 perf guard
  (toggle off / reduced-resolution inference on weak devices) · T21.6 device test.
- Charter checks: no API calls (bundled assets), no uploads (all inference local) — needs a
  DECISIONS entry for the `@mediapipe/tasks-vision` runtime dependency before implementation.

## Phase 22 — 3D flip album — SCOPED (owner idea, 2026-10-27; TODO)
A third Gallery view: a realistic flipbook album whose PAGES are the saved still strips — the
photobooth-as-keepsake experience beyond a thumbnail grid. Owner concept: "a 3d photo album that
composes of the saved strip (still) with flippable pages".
- [ ] **T22.1 Data** — zero new storage: the album is a VIEW over existing records
      (`kind: 'strip'` sorted by date; live strips included). Later: user-created named albums
      with covers.
- [ ] **T22.2 Album view** — Gallery gains a "Grid | Album" segment; a centered book (one strip
      per page, cover page with title) with a real page-flip: CSS 3D `rotateY` around the spine
      with `perspective` on the container, backface-hidden page backs, corner-peel affordance on
      hover. No new dependencies — hand-rolled CSS 3D (matches the D-030 expressive direction).
- [ ] **T22.3 Interactions** — flip via click/drag on the page corner, arrow keys, swipe on
      touch; page-jump control; `prefers-reduced-motion` falls back to simple crossfade paging.
- [ ] **T22.4 Live strips in the album** — a live strip's page plays its clip while the page is
      open (same player pattern as the detail modal).
- [ ] **T22.5 Polish + scope guards** — spine shadow, paper texture, page thickness edge; works
      at 375 and desktop; strips render through the shared StripCanvas (single render path).
      Deferred (later phases): multiple named albums, album PDF export.

## Open follow-ups (not blockers)
- Tier C device testing (VERIFY C1–C6) when hardware available — required before claiming any
  platform as verified.
- B6 (storage-full via DevTools override), B12 (keyboard/reduced-motion sweep), B13 (network
  panel capture) — 30 minutes of manual DevTools work, ideally alongside device tests.
