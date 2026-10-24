# DECISIONS.md — Architectural & product decision record

Format: id · date · context → decision → alternatives → consequences. Append-only; supersede via
new entry referencing the old one.

---

## D-001 · 2026-10-24 · Frontend stack: Vite + React 18 + TypeScript + Zustand
**Context:** Greenfield static app; needs modularity, testability, fast builds, GH Pages/Vercel output.
**Decision:** Vite 6, React 18, strict TS, Zustand for the three stores, plain CSS with tokens
(styling choice superseded by D-028 — Tailwind).
**Alternatives:** Vanilla TS (leaner but slower to build a full editor UI), Next.js (server
features explicitly out of scope), Tailwind (fine, but hand CSS keeps the token contract explicit
and the bundle lean — adopted later per owner decision, see D-028).
**Consequences:** Minimal deps; editor state trivially testable as pure stores; anyone adding a
runtime dependency must justify it here. Follow-ups: keep bundle budget < ~250 KB gz initial.

## D-002 · 2026-10-24 · Design direction overrides skill database palette
**Context:** ui-ux-pro-max's design-system query returned an "App Store landing / claymorphism /
pixel-font" system and identical generic palettes for every product type — off-brief.
**Decision:** Keep the product charter's film-inspired identity (ivory/rose/ink/gold, Fraunces +
system sans + Caveat); apply the skill's *rules* (contrast, targets, motion, checklists), not its
generic palette output. Typography pairing validated against its editorial/serif results.
**Alternatives:** Adopt database palette (rejected: contradicts charter §DESIGN "Analog Heartbreak").
**Consequences:** DESIGN.md documents custom tokens; database consulted for rules, not colors.

## D-003 · 2026-10-24 · Gallery storage: IndexedDB for photos, localStorage for prefs only
**Context:** Photos are multi-MB binaries; localStorage is ~5 MB and synchronous.
**Decision:** IndexedDB DB `keepsake` v1, `photos` store (id keyPath, createdAt index); records
carry original blob + ~320 px thumb blob. Settings JSON only in localStorage (`keepsake.*`).
**Alternatives:** localStorage for everything (quota death), CacheAPI (wrong shape), OPFS (less
portable, no benefit here).
**Consequences:** Migrations must be additive and never delete photos; quota failures surfaced
(never silent); `navigator.storage.persist()` requested best-effort after first capture.

## D-004 · 2026-10-24 · Automatic in-app save semantics
**Context:** Charter: every successful capture is saved into Keepsake's Gallery automatically;
export/share is separate; never write to device Photos.
**Decision:** Capture pipeline writes to IndexedDB immediately per shot (before review/retake);
retakes add new records (old ones remain); strips saved only via explicit "Save to Gallery".
**Consequences:** Session discard never loses photos (by design, stated in UI); storage errors
pause the session with recovery rather than claiming success.

## D-005 · 2026-10-24 · Single render path: one composition engine for preview & export
**Context:** Preview/export divergence is the classic photobooth bug.
**Decision:** `renderComposition(canvas, comp, bitmaps, targetWidth)` used for both (preview at
DPR-capped size, export at 2×/3× design units). All geometry normalized 0–1; frames/text/stickers
drawn in normalized units.
**Alternatives:** CSS-composed preview + separate canvas export (fast but diverges).
**Consequences:** Preview is pixel-true; cost = full redraw on parameter change (acceptable at
≤2× DPR canvas sizes; no rAF loop).

## D-006 · 2026-10-24 · Filters: CSS-style params + canvas overlays, with pixel fallback
**Context:** `ctx.filter` is not universal (older Safari).
**Decision:** Presets compile to a CSS filter string applied via `ctx.filter` when supported
(feature-detected once); a per-pixel fallback implements brightness/contrast/saturate/hue/sepia/
grayscale, approximating blur via downsample-upsample. Grain/vignette/leaks are canvas overlay
passes (universal). Seeded RNG keeps overlays deterministic (preview == export).
**Consequences:** All modern targets get identical quality; very old browsers get approximate
blur-free rendering, documented as such.

## D-007 · 2026-10-24 · Front-camera captures saved mirrored
**Context:** Live preview mirrors front camera (user expectation); saving unmirrored surprises.
**Decision:** When capturing with the user-facing camera, apply the same mirror to the saved
image (toggleable in settings, default on).
**Consequences:** Saved photo matches what users saw; rear camera never mirrored.

## D-008 · 2026-10-24 · Hash routing + relative asset base
**Context:** Static hosting on GH Pages subpath (`/Keepsake/`) and Vercel root; no server rewrites.
**Decision:** `base: './'` in Vite; hand-rolled hash router (`#/booth|#/studio|#/gallery`).
**Alternatives:** React Router with BrowserRouter (needs 404 fallback — impossible on GH Pages
without hacks).
**Consequences:** URLs slightly less pretty; browser back/forward work everywhere.

## D-009 · 2026-10-24 · No PWA, no backend, no analytics — charter constraints
Recorded as standing product decisions (see PRD §9, AGENTS.md hard rules). Violations are bugs.

## D-010 · 2026-10-24 · Self-hosted fonts (Fraunces, Caveat) under SIL OFL
**Context:** Privacy charter: no third-party runtime requests; font CDNs leak IPs.
**Decision:** Bundle WOFF2 subsets in `public/fonts/` with OFL notices; system stack fallbacks.
**Consequences:** +~120 KB static assets, zero runtime requests; fallbacks must not break layout.

## D-011 · 2026-10-24 · Synthesized sounds, gesture-gated
**Context:** Optional shutter/countdown sound without autoplay dependencies or audio assets.
**Decision:** Tiny WebAudio synth (oscillator + noise burst), lazily created on first user
gesture; disabled setting default off? — no: default **on**, but fully optional and failure-
silent.
**Consequences:** No audio files shipped; browsers that block audio degrade silently.

## D-012 · 2026-10-24 · Greenfield repo; `ci.yml` does not exist yet
**Context:** Phase-zero inspection found an empty folder and a GitHub remote containing only a
README initial commit — no `ci.yml` anywhere.
**Decision:** Per charter §9, no CI file is created until all implementation phases complete;
then the discrepancy is resolved by creating the standard GitHub Actions location
`.github/workflows/ci.yml` (Actions cannot read a root-level `ci.yml`; that is the correct
intended location) running only real scripts (`typecheck`, `lint`, `test`, `build`).
**Consequences:** CI phase (T15.1) will create that file as its sole change, with explanation.

## D-013 · 2026-10-24 · Filename `ARCHITECHTURE.md` kept verbatim
**Context:** Charter requires exact filenames including this (non-standard) spelling.
**Decision:** Keep the charter spelling; note the intentional naming at the top of the file.
**Alternatives:** Rename to `ARCHITECTURE.md` (violates "do not silently rename").
**Consequences:** None functional.

## D-014 · 2026-10-24 · Git workflow: incremental conventional commits, authorized pushes
**Context:** Owner instruction 2026-10-24: initialize the GitHub repo and commit per major task.
**Decision:** Local commits per major task, conventional one-line subjects; push to
`origin/main` after each milestone (explicitly authorized). Never force-push or rewrite history.
**Consequences:** CI and review see incremental history; agents must not push elsewhere/deploy.

## D-015 · 2026-10-24 · Test canvas strategy: purpose-built mock instead of jest-canvas-mock
**Context:** Vitest/jsdom has no canvas implementation; jest-canvas-mock requires a Jest runtime
global (`jest.fn`, `jest.isMockFunction`) that does not exist under Vitest.
**Decision:** Wrote `tests/canvas-mock.ts` (~120 lines): per-canvas recording 2D context with the
exact API surface Keepsake uses, plus a Path2D stub. Removed the jest-canvas-mock dependency.
**Alternatives:** extend a `jest`-global shim (fragile, chases an external package's internals);
`node-canvas` native dep (heavy, Windows build friction).
**Consequences:** Compose tests assert call sequences (pass order, save/restore balance,
determinism) rather than pixels; real pixel output verified once in-browser (PPROGRESS Tier B).

## D-016 · 2026-10-24 · Verification evidence recorded honestly
**Context:** Charter forbids claiming untested platforms as verified.
**Decision:** PPROGRESS records three tiers separately: Tier A automated (54/54 green, build
78 kB gz), Tier B desktop-emulation smoke (render pixel-check, filter live-apply, export download
event, mobile 390 px no-scroll), Tier C real devices = UNVERIFIED. All device claims remain
explicitly unverified pending hardware testing.
**Consequences:** Docs never claim iOS/Android/Windows verification; VERIFY.md C1–C6 track the gap.

## D-017 · 2026-10-24 · Fixed-position bug: entrance animations must not leave transforms applied
**Context:** Owner-reported desktop bug — the "All layouts" sheet clipped/overlapped the page.
Root cause: `.anim-enter` used `animation-fill-mode: both`, so the finished keyframe kept
`transform: translateY(0) scale(1)` applied, making the animated section a containing block;
`position: fixed` sheets/scrim inside it positioned against the section, not the viewport.
**Decision:** (1) Portal Sheet/Modal to `document.body` via `createPortal` so overlays never
inherit ancestor geometry. (2) All entrance animations use fill-mode `backwards` (final state is
the element's natural styles, so no lingering transform). Documented in `base.css`.
**Alternatives:** none needed once diagnosed; portals alone would have sufficed, but `backwards`
removes the foot-gun for every future overlay.
**Consequences:** Overlays are viewport-anchored anywhere they're rendered; entrance animations
still run once and settle (reduced-motion unaffected).

## D-018 · 2026-10-24 · Landing layout pills drive the session template + live preview
**Context:** Owner report: quick-layout pills seemed unclickable — they only persisted a
preference and never changed the session template; only "All layouts" visibly worked.
**Decision:** New `capture.setTemplate(id)` action (idle-only); pills and the picker both write it;
Booth hydrates from `settings.lastTemplateId` on mount; a live preview card (shared render engine,
warm sample placeholder fills, no micro-text at that size — `RenderOptions`) shows the selected
layout and cross-fades on change. Picker minis also use sample fills (`text: false`).
**Consequences:** Pills give immediate visible feedback; "Start the Booth" uses the shown layout.

## D-019 · 2026-10-24 · Modal self-darkening: static card painted under its own scrim
**Context:** Owner report: the dialog dimmed the background *and itself*. `.modal-card` was a
non-positioned element, so its sibling scrim (positioned, z-index 20) painted above the card in
the same stacking context.
**Decision:** `.modal-card` gets `position: relative; z-index: calc(var(--z-sheet) + 1)`.
**Consequences:** Dialog content always sits above its dim layer; verified by hit-test in-browser.

## D-020 · 2026-10-24 · Canvas fitting by measurement, not CSS aspect chains
**Context:** Owner report: Studio canvas blank/clipped on desktop. CSS `aspect-ratio` +
`height:100%` chains collapse inside indefinite-height grid rows (desktop Studio layout).
**Decision:** `StripCanvas` measures its container (ResizeObserver, ±1px convergence guard) and
computes the fitted pixel box in JS; auto-height contexts pass `maxCanvasHeight`. Desktop
`.studio-canvas-area` gets a definite height.
**Consequences:** Correct aspect-true rendering in every context (Studio grid, landing preview,
export sheet); caption/date sizes raised with clamped fit (default 0.05, range 0.03–0.12; date
0.28 of band; script font +15% x-height compensation). Studio also lands on the Filter tab now —
layout was already chosen pre-capture (owner feedback).

## D-021 · 2026-10-24 · Cross-viewport UI audit (quantitative) + polish pass
**Context:** Owner reported persistent unpolished buttons/layout across viewports.
**Method:** scripted in-browser audit at 375/768/1280/1440 × booth/gallery/studio (all tabs):
horizontal overflow, tap targets <24px, WCAG contrast on every visible button, cursor, transition
coverage, canvas overflow past cards.
**Findings fixed:**
- Booth page overflowed horizontally at 375/768 (951px scrollWidth): grid auto columns sized to the
  chip row's max-content. All hero/layout grids now use `minmax(0, 1fr)` + `min-width: 0`.
- Primary buttons were white-on-rose at 3.29:1 (AA fail) → now rose-deep/rose-ink (4.6–5.2:1).
- Selected chips & top-nav current were 4.16:1 → new `--rose-ink` text (5.2:1).
- Empty-slot "+" overlay was near-invisible (1.11:1) → solid dark plate with ivory icon.
- Filter thumbnails, sticker buttons, gallery tiles lacked hover/active feedback → shared
  `.picker-card` polish (lift on precise pointers, press scale, transitions).
- Native checkbox/range accents unbranded; `kbd` unstyled → tokenized.
- Mobile Studio canvas raised to 64dvh; slot hit-areas carry aria labels with no phantom text.
**Result:** final sweep reports zero issues across all view/views; gates green (54/54).

## D-022 · 2026-10-24 · Gallery IA: finished strips headline, photos secondary
**Context:** Owner: individual captures in the Gallery were unintended but welcome — the Gallery's
original purpose is the finished strip (the product).
**Decision:** Two sections: "Finished strips" first (wider ~148px min tiles, fixed height,
object-fit: contain so the whole strip reads) then "Photos" (square cover-fit thumbs as before).
Selection/delete/clear and Create-strip behavior unchanged (creation uses captures). Redundant
STRIP corner tag removed — the section says it. Empty strips section carries a pointer to
Studio → Export → Save strip to Gallery.
**Alternatives:** separate Screens/Strips destination (rejected: more navigation for one concern);
removing captures (explicitly rejected by owner).
**Consequences:** none storage-wise (same records); tile CSS uses higher-specificity selectors so
base tile rules can't override the strip variant.

## D-023 · 2026-10-25 · Modal dismissal: pointer-events inheritance bug + affordances
**Context:** Owner could not close the photo detail modal by clicking outside. `.modal-center`
uses `pointer-events: none` so the page behind stays interactive; `pointer-events` is inherited,
so the backdrop inside it inherited `none` and never received clicks — the card alone re-enabled it.
**Decision:** (1) `.sheet-scrim { pointer-events: auto }` explicitly. (2) Modal now has a header
with a visible X close button (only the scrim/Esc existed before). (3) Body scroll locks while any
Modal/Sheet is open (counted, so nested confirm dialogs restore correctly).
**Sweep result:** every dismissible surface now supports scrim-click + X + Esc: photo detail,
camera explainer, all confirm dialogs, all sheets (export, photo picker, all-layouts, storage info).
Verified in-browser: open → close by scrim click, X, and Esc; scroll locks and restores.

## D-024 · 2026-10-25 · Component libraries: Radix primitives + Motion + Lucide
**Context:** Owner asked for component libraries to lift UI polish (and approved new deps
explicitly). Charter prefers minimal deps; AGENTS.md requires justification per dependency.
**Decision (after web research):**
- `@radix-ui/react-dialog` + `@radix-ui/react-slider` — headless, unstyled, best-in-class a11y
  (focus trap, scroll lock, pointer-outside, keyboard) while keeping our token styling. Replaces
  hand-rolled Modal/Sheet plumbing and raw range inputs.
- `motion` (framer-motion's successor) — view transitions with exit animations, toast
  enter/exit, hero entrance. Tree-shakes to ~17 KB gz core.
- `lucide-react` — replaces the hand-drawn icon set with the industry-standard icon library
  (per ui-ux-pro-max "use Lucide/SVG icons, never emoji"). Brand Logo stays custom.
**Alternatives:** MUI/Chakra/NextUI (opinioned styling would fight the Analog Heartbreak system);
react-spring (lighter but less DX); keeping hand-rolled (owner asked for libraries).
**Consequences:** bundle grows (~+60–70 KB gz est., budget 250 KB); overlays gain Radix-maintained
a11y behaviors; icons noticeably more professional; exit animations finally exist.

## D-025 · 2026-10-25 · Empty-slot affordance, opaque header, sticky studio toolbar, enter-only transitions
**Context:** Owner: "you still did not fix this" — screenshot showed a black bar over a strip frame
reading as a bug. Diagnosis: (1) my earlier empty-slot "fix" used a solid dark plate over the whole
slot — looked like a broken render; (2) the Export button appeared cut in half under the
semi-transparent sticky header; (3) verification also exposed AnimatePresence mode="wait" blocking
the next view when exit rAF stalls (occluded panes).
**Decision:** Empty slots now show a dashed outline + a 44px circular ink "+" button (proper add
 affordance, no full-plate fill). Header is fully opaque (--bg). Studio toolbar is sticky under the
header on mobile so Undo/Redo/Export stay reachable while the tool panel scrolls. View transitions
are enter-only (no exit wait) so a stalled frame can never block navigation; Motion exit remains
for toasts/overlays where a stall is cosmetic and self-heals.
**Verified in-browser:** empty slot = transparent bg + dashed border + 44px circle; toolbar
position sticky; #/gallery renders after reload; studio mounts after every navigation.

## D-026 · 2026-10-25 · Sticky toolbar broken by body overflow-x:hidden (zoomed desktops)
**Context:** Owner still could not see Undo/Redo/Export on "desktop". Reproduction showed true
desktop widths (≥900) render fine; Windows scaling/browser zoom shrinks effective width below 900
into the column layout, where the toolbar was made sticky — but `body { overflow-x: hidden }`
creates a scroll container that disables position:sticky for descendants, so the toolbar scrolled
away instead of pinning under the header.
**Decision:** `overflow-x: clip` (with hidden as legacy fallback) — prevents sideways overflow
without creating a scroll container, restoring sticky. Verified at 853×900 scrolled 600px:
toolbar pinned at header bottom (y=56), Export visible, Undo hit-test clean.
**Consequences:** Sticky descendants work everywhere; true-desktop layout unaffected (studio fits
viewport there; side panel scrolls internally).

## D-027 · 2026-10-25 · Studio layout rebuilt as three contained bands (root-cause fix for covered controls)
**Context:** Owner: "nothing changed even after hard refresh… refactor the frontend layout pleaseee."
Screenshot analysis finally identified the real failure: the tool panel painted over the tab pills
(only their top arcs visible), the strip canvas was hidden underneath, and the toolbar was clipped —
the old studio-root grid/sticky/flex arrangement had multiple interacting containment mechanisms
(grid-row placement, sticky-in-flex, side-panel internal scroll, tabs as a horizontal scroll
container) that could collapse onto each other in environments we could not reproduce (owner's
browser/zoom), despite passing audits at standard widths.
**Decision:** Replace the studio layout entirely with a rigid three-band structure that carries its
own containment at every level: (1) `.studio-top` — toolbar + tab pills in ONE opaque sticky band
directly under the header at all widths; (2) `.studio-body` — a two-column grid (canvas pane |
380px tool panel ≥900px, stacked below); (3) every pane self-contained: canvas pane owns a definite
`clamp()` height + `overflow:hidden` (StripCanvas measures it — no parent-chain height dependency),
panel scrolls internally on desktop and flows naturally on mobile, tabs `flex-wrap` instead of a
horizontal scroll container (the old `overflow-x:auto` computed `overflow-y:auto` and clipped the
pills' bottoms — the exact "covered pills" artifact). All legacy classes (.studio-root/.studio-side)
deleted so no stale cascade remains.
**Verified in-browser (seeded 3-photo strip):** at 375/853/1093/1280/1440, unscrolled and scrolled
to bottom — Undo/Redo/Reset/Export and every tab pill in-viewport and elementFromPoint-hittable;
canvas|panel side-by-side ≥900 with zero overlap, stacked <900; sticky band pinned at header bottom
while scrolled; no horizontal overflow; strip canvas never collapses; tab switching swaps panels.

## D-028 · 2026-10-25 · Styling moves from hand-written CSS to Tailwind CSS (supersedes D-001 styling)
**Context:** Owner decision: "we are now moving to tailwind css instead of vanilla css." Comes
after the D-024 component-library adoption (Radix/Motion/Lucide) and the D-027 studio layout
rebuild — the owner wants the styling layer on the same modern utility stack as the components.
**Decision:** Adopt **Tailwind CSS v4** as the styling system. v4's CSS-first `@theme` config maps
the existing Analog Heartbreak custom properties (colors, radii, shadows, fonts, motion tokens)
into theme tokens, so the token contract survives unchanged — utilities replace hand-written
component rules in `src/styles/`. Tailwind is a devDependency only (build-time; zero runtime JS;
v4 emits only the utilities actually used). Docs updated with this entry: ARCHITECHTURE §1 styling
row, DESIGN §11 token rule, TASKS Phase 16, PPROGRESS.
**Migration constraints (owner's standing rules still apply):**
- Zero visual regression — the D-027 studio containment geometry must hold exactly (audited
  widths re-checked after migration).
- Tokens stay the single source: new values go into `@theme`, never arbitrary hex in classes.
- Incremental migration screen-by-screen; delete each vanilla block as it is replaced so the two
  systems never drift long-term. CI's four gates unchanged.
**Alternatives:** keep vanilla CSS (owner explicitly declined); Tailwind v3 with JS config
(older config model, larger setup — v4 is current); styled-components/Emotion (runtime-in-JS,
against the no-runtime-weight posture).
**Consequences:** New devDependency (`tailwindcss` + `@tailwindcss/vite`); class-based styling is
now the norm for new code; existing `src/styles/*.css` shrinks to tokens + a few global rules
(keyframes, canvas-specific selectors) as screens migrate.

## D-029 · 2026-10-25 · Full Tailwind migration + shadcn-pattern redesign (completes D-028)
**Context:** Owner: "use the popular react tailwind components in the internet, redesign the ui ux
layouts, all of them. dont make it basic." The most popular React+Tailwind component pattern is the
shadcn/ui architecture (Radix primitives + cva variants + a class-merge helper) — already half in
place since D-024 (Radix Dialog/Slider).
**Decision:** Adopted shadcn-pattern architecture across the kit and redesigned every screen:
- `src/lib/cn.ts` — clsx + tailwind-merge class-merge helper (`cn()`).
- `ui.tsx` rebuilt on **class-variance-authority** (`buttonVariants`, chip/icon/picker variants);
  Radix **Tabs** (@radix-ui/react-tabs) replaces the hand-rolled tab row in the Studio (keyboard
  arrow navigation, roving tabindex for free); Button gains `outline` variant; LabeledIconButton
  for the toolbar.
- `src/styles/theme.css` is the **only stylesheet**: Tailwind v4 `@theme` carries the full Analog
  Heartbreak token contract (colors → utilities like `bg-surface`/`text-ink-soft`, radii, warm
  shadows, easing, brand keyframes as `--animate-*`); `wide:` breakpoint = the audited 900px.
  tokens/base/ui/screens.css deleted.
- Redesigns: App shell (motion layout-id pill on desktop nav, underline indicator on mobile
  tabbar), Booth (layered hero with back-frame depth, badge, sticky preview card, film-frame
  corners on the live view), Studio (same D-027 three-band containment, restyled), Gallery
  (cards, hover lift, storage meter), pickers/filter/decorations on shared PickerCard.
**Verified:** typecheck/lint/54 tests/build green; in-browser re-audit at 375/853/1093/1280/1440
unscrolled + scrolled — toolbar, all five tab pills in-viewport & hittable, canvas|panel geometry
exact, strip never clipped, no horizontal overflow; all tabs click through (Radix); bundles
162 KB gz JS (+14 from cva/tw-merge/tabs) + 9.8 KB gz CSS (−2) — well under the 250 KB budget.
**Consequences:** new code styles with utilities referencing `@theme` tokens only; `muted` is the
one component-layer text helper; disabled buttons are pointer-events:none (shadcn default).

## D-030 · 2026-10-25 · Expressive showcase layer: aurora hero, spotlight bento, marquee, film stage
**Context:** Owner after the Tailwind migration: "lots of empty spaces… go wild with the front
end… eye catching… you have creative freedom; you may disregard or update DESIGN.md/AGENTS.md for
UI/UX." Owner pointed at prismic.io's React component libraries roundup; its Tailwind-native,
animation-forward picks are NextUI (Tailwind Variants + Framer Motion + React Aria) and Tailwind
UI's marketing sections, with shadcn already adopted (D-029).
**Decision:** Adopted the *pattern language* of those libraries rather than their packages —
hand-built showpieces on the existing stack (motion + Tailwind v4 + tokens), zero new runtime
dependencies: `src/components/showcase.tsx` (AuroraBackdrop drifting gradient blobs, SpotlightCard
with pointer-tracked glow, Marquee band, FanStrips hero art, StepCard, SectionHeading) and
`src/components/booth-sections.tsx` (HeroStage, FeatureBento with live strip canvas, HowItWorks).
New tokens only in `@theme` (rose-soft/gold-soft/sage-soft gradient stops; ks-aurora/ks-marquee/
ks-float/ks-bob/ks-sheen keyframes — transform/opacity only, killed by the global reduced-motion
rule). Booth landing = hero stage + marquee + bento + 3 steps + layout picker; Gallery = icon
section headings with count pills, polaroid-stack empty state, hover zoom; Studio = film-stage
pane with sprocket edges (containment classes unchanged, audit re-verified); App shell = gradient
hairline under the header + script footer on wide screens. Feature copy pulls live counts from
the data registries (TEMPLATES/FRAMES/STICKERS) so docs and UI never disagree.
**Alternatives:** installing NextUI/HeroUI (own theme plugin + tailwind-variants, plugin conflicts
with v4, big dep for ~6 components); Tailwind UI (paid license); MUI/Mantine (fight the token
contract, bundle weight).
**Consequences:** DESIGN.md gains the expressive-direction note (§13); AGENTS.md notes this
sanction. Ambient animation is decorative, aria-hidden, and reduced-motion-safe.

## D-031 · 2026-10-25 · Booth start flow (layout choice moves off the landing), live-view session fixes, continuous capture
**Context:** Owner: "when we press Start the Booth there should be the selection of the layouts…
the layouts selection should not belong in the home/landing page," plus "an X button here… does
absolutely nothing," plus a manual-vs-continuous capture toggle in the camera view.
**Decision:** (1) Landing no longer hosts the layout picker — **Start the Booth** (hero and closing
CTA) opens a "Choose your layout" sheet holding the live preview, all 18 layouts, session settings
(countdown/sound/mirror/continuous), and a Continue button that leads into the existing camera
permission explainer; a compact CTA band closes the landing. (2) Root-caused the dead X button:
the discard ConfirmDialog only rendered on the landing branch, so in live/review phases the X set
state for a dialog that did not exist. The dialog now renders in every phase branch. (3) New
`continuous` setting (localStorage pref, sanitized in prefs.ts, default off): a Manual/Continuous
segmented control in the live view; in continuous mode each captured shot schedules the next
countdown ~900 ms later until the session completes — timer held in a ref, cancelled on end
session/retake/unmount, and re-checked against live state (phase + setting) before firing. The
shutter hint reflects the mode. PRD journey updated to the new flow.
**Verified in-browser:** landing has no picker card; sheet opens with 18 layouts + settings +
Continue → explainer; X opens "End this session?" from the live view; toggle flips, hint updates,
and persists. Gates: typecheck/lint/54 tests/build green.
**Consequences:** capture.addShot order unchanged; continuous respects the countdown setting per
shot (set countdown 0 for back-to-back instant shots); retakes always end after one shot.

## D-032 · 2026-10-25 · Hosting: GitHub Pages via Actions workflow (owner-approved)
**Context:** Owner: "ready to deploy in github pages. can you do it via gh cli or do i have to
configure it via github itself?" — this is the charter's owner-gated hosting decision being
exercised. The classic alternative (pushing `dist/` to a `gh-pages` branch) pollutes history and
needs a second remote branch; Vercel remains documented in README as an option but was not chosen.
**Decision:** Official Actions-based Pages deployment, fully provisioned via gh CLI/API with no
manual GitHub-UI steps: (1) Pages enabled through the REST API with `build_type: workflow`
(`POST /repos/…/pages`) — the API equivalent of Settings → Pages → Source: GitHub Actions;
(2) new `.github/workflows/deploy.yml` (ci.yml untouched per AGENTS.md) — on push to main:
npm ci → build → upload-pages-artifact(dist) → deploy-pages, with a `pages` concurrency group
and the `github-pages` environment for the URL output. `base: './'` (D-009) + hash router (D-008)
make the `/Keepsake/` subpath work with zero config. Live at
https://johncarlangelo.github.io/Keepsake/.
**Alternatives:** `gh-pages` branch flow (history churn, manual source setting); Vercel (owner
picked Pages); modifying ci.yml to deploy (forbidden split of concerns — CI gates, deploy ships).
**Consequences:** every push to main ships if CI-shaped checks in deploy are green (deploy builds
independently; ci.yml remains the gate); HTTPS enforced by GitHub (camera access requires it).
