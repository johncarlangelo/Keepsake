# VERIFY.md — Verification plan

Three verification tiers, kept strictly separate. A check in one tier is **never** reported as
satisfaction of another tier.

- **Tier A — Automated:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` (CI-runnable).
- **Tier B — Desktop emulation:** Chrome/Edge DevTools device emulation, fake cameras, throttling.
- **Tier C — Actual devices:** real hardware, real browsers, real cameras. Recorded only when performed.

Results log lives in `PPROGRESS.md §Verification results`. Untested ⇒ `UNVERIFIED`, always.

## Tier A — Automated (Vitest)

| ID | Area | What is asserted |
| --- | --- | --- |
| A1 | Template geometry | Normalized rects within 0–1; slot count 1–6+; aspect math correct for unequal layouts; frame padding math; ≥10 templates, ≥3 unequal, shot counts {1,2,3,4,6} present |
| A2 | Filter registry | Unique ids; every preset params in valid ranges; category set matches PRD; ≥25 presets, ≥8 categories; intensity 0 ⇒ identity |
| A3 | Frame registry | Unique ids; ≥20 presets; draw functions exist; preview/export share one renderer |
| A4 | Sticker registry | Unique ids; parseable path data |
| A5 | Crop math | Cover-fit and pan/zoom crop rects clamp correctly; no divide-by-zero on odd aspect ratios |
| A6 | Editor store | commit/undo/redo sequences; history cap 40; redo cleared on new commit; reset |
| A7 | DB wrapper | put/get/delete/clear against fake-indexeddb; quota error mapped to typed failure; corrupted record flagged not thrown |
| A8 | Prefs | Round-trip; version-tolerant parse; rejects oversized payloads |
| A9 | Export naming/format | Filename pattern; scale ×2/×3 output dims from design units |
| A10 | compose render calls | Mock ctx: pass order (bg → slots → frame → text → stickers), clip/save/restore balance, filter string applied, determinism between two renders |
| A11 | Components | Gallery empty state, template picker options, review grid render (Testing Library) |

## Tier B — Desktop emulation (documented procedure, Chrome + Edge, Windows)

| ID | Scenario | Steps | Pass criteria |
| --- | --- | --- | --- |
| B1 | Camera grant | DevTools → fake video device; run a 4-shot session | 4 frames captured; auto-saved; stream stops after (camera indicator off) |
| B2 | Camera denied | Block permission, retry flow | Denial card with recovery steps; retry works after allowing |
| B3 | No camera | Disable device | "No camera" state; Gallery/Studio still usable |
| B4 | Retakes | Review grid → retake slot 2 | Only slot 2 replaced; all photos still in Gallery |
| B5 | Persistence | Reload, restart dev server | Gallery contents + settings survive |
| B6 | Quota full | DevTools storage override to tiny quota | Typed error toast; no false success; retry after clearing works |
| B7 | Templates | Cycle all templates with photos | Live preview == exported PNG (side-by-side compare) |
| B8 | Filters/frames | Apply across categories, intensity slider, remove | Applied live; removable; no console errors |
| B9 | Editor | Crop, sticker drag, text, undo/redo incl. keyboard | Every op undoable; originals untouched in Gallery |
| B10 | Export | 2×/3× download | Correct pixel dims; PNG; URL revoked (no leak in Performance panel) |
| B11 | Responsive | Emulate 320/375/768/1024/1440, portrait+landscape | No horizontal scroll; targets ≥44px; safe areas respected |
| B12 | Keyboard/a11y | Full app via keyboard; reduced-motion emulation | Focus visible & logical; Esc/Space/arrows work; animations off |
| B13 | Privacy | Network panel, hard reload + full session | Zero external requests (fonts bundled); nothing uploaded |
| B14 | Storage eviction UX | Clear site data | Graceful empty state; explanatory copy shown |

## Tier C — Actual devices (fill in only when performed)

| ID | Device / Browser | Scenarios | Status |
| --- | --- | --- | --- |
| C1 | iPhone (iOS Safari) | B1–B5, B10 (share + save), B11, safe-area, camera switch front/rear | UNVERIFIED |
| C2 | iPad (Safari) | B1, B7, B11 landscape | UNVERIFIED |
| C3 | Android phone (Chrome) | B1–B5, B10 share/download, B11, camera switch | UNVERIFIED |
| C4 | Android tablet (Chrome) | B7, B11 | UNVERIFIED |
| C5 | Windows laptop (Edge/Chrome + webcam) | B1–B13 | UNVERIFIED |
| C6 | Production URL (after hosting, phase gated) | HTTPS camera permission; GH Pages subpath assets | UNVERIFIED |

Device-specific watch items: iOS `input`/`change` quirks with `toBlob`; iOS share-sheet file
support; Android camera-switch `facingMode` reliability; iPadOS touch+drag in Studio sticker
placement; Safari `navigator.storage.estimate` availability.

## Reporting rules

- Each run records: date, environment (browser version, OS, device/emulation), pass/fail per ID,
  and evidence (screenshots/console excerpts where sensible) in `PPROGRESS.md`.
- Any `UNVERIFIED` claim in docs/UI must remain labeled as such.
- Regressions found in Tier B/C become `TASKS.md` items with `VERIFY-` id references.
