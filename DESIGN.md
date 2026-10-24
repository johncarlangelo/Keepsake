# Keepsake — Design System & Experience Specification

**Aesthetic:** *"Analog Heartbreak"* — a warm, film-era photobooth reimagined as careful software.
Ivory paper, muted rose ink, dark charcoal, a whisper of gold. Soft shadows like a photo mat,
subtle grain like expired film. Playful where the ritual is playful (countdown, flash, stickers);
restrained where the photos are the hero.

This is a design contract. UI work that contradicts it is a bug.

---

## 1. Color tokens

| Token | Hex | Role |
| --- | --- | --- |
| `--bg` | `#F7F1E5` | App background (warm ivory) |
| `--surface` | `#FFFDF6` | Cards, sheets, strips |
| `--surface-2` | `#F3EBDB` | Recessed panels, input fills |
| `--ink` | `#2B2118` | Primary text, dark UI |
| `--ink-soft` | `#6E5F4E` | Secondary text (AA on `--bg`) |
| `--ink-faint` | `#9A8B77` | Tertiary labels, placeholders (large text / decorative only) |
| `--rose` | `#C4797F` | Brand primary; active states, primary CTAs |
| `--rose-deep` | `#A3565E` | Rose text on light surfaces (4.6:1), pressed states |
| `--blush` | `#F4E3DC` | Rose tint fills, selected chips |
| `--gold` | `#B98A2F` | Accents, stars, active stars |
| `--sage` | `#7D8B6A` | Success, secondary accent |
| `--line` | `#E4D8C2` | Hairline borders |
| `--danger` | `#A83A32` | Destructive actions, errors |
| *(focus ring)* | `--rose-deep` | 2 px ring with 2 px offset on all interactive elements (WCAG 2.4.7) |

Contrast rules (WCAG AA, verified against `--bg`/`--surface`):
- Body text: `--ink` (≈ 13:1). Secondary: `--ink-soft` (≥ 5:1).
- Rose is decorative/interactive only in small sizes; rose *text* uses `--rose-deep`.
- Never convey state by color alone (icons + text accompany danger/success).
- On `--ink` surfaces (e.g., live camera chrome), text is `--surface`.

Dark surfaces (camera view, review) invert: background `#221A12` (deep warm ink), text ivory.

## 2. Typography

Self-hosted (SIL OFL; files in `public/fonts/` — no external font CDN, see privacy charter):

| Role | Font | Weights | Usage |
| --- | --- | --- | --- |
| Display / headings / wordmark | **Fraunces** (retro-grotesk serif, warm) | 500, 600, 700 (+soft optical size) | Screen titles, "Keepsake" wordmark, empty-state headlines |
| UI / body | System stack: `-apple-system, "Segoe UI", Roboto, sans-serif` | 400–700 | All controls, labels, body copy (16 px minimum) |
| Script accent | **Caveat** | 500, 600 | Handwritten date stamps, caption previews, playful microcopy |
| Mono accent | `ui-monospace, "Cascadia Mono", Menlo, monospace` | 400 | Frame numbers, storage stats, debug-ish metadata |

Scale (rem): `0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 2 · 2.5 · 3` — line-height 1.5 body, 1.15 display.
Fallback stack if fonts fail to load: `Georgia, "Times New Roman", serif` for Fraunces; `cursive` for Caveat. Layout must not depend on exact metrics (no fixed-height text boxes).

## 3. Space, radii, borders, shadows, elevation

- **Space scale (px):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. No off-scale values.
- **Radii:** chips/inputs 10 px; cards/canvas frames 16 px; sheets 24 px (top corners); pills 999 px. Photos inside strips get template-defined radii (frames own this).
- **Borders:** 1 px `--line` default; 2 px `--rose` for selected; dashed `--ink-faint` for drop/empty slots.
- **Shadows** (warm-tinted, never pure black):
  - `--shadow-1`: `0 1px 2px rgba(43,33,24,.08)` — chips, resting cards
  - `--shadow-2`: `0 4px 16px rgba(43,33,24,.12)` — raised cards, strip preview
  - `--shadow-3`: `0 12px 40px rgba(43,33,24,.18)` — modals, sheets
- **z-index scale:** 10 sticky chrome · 20 sheets · 30 modals · 40 toasts · 50 flash overlay.
- **Texture:** one subtle SVG grain overlay (opacity 0.04, `mix-blend-mode: multiply`) on app background only — never over photos the user is judging. Disabled under `prefers-reduced-motion`? No — grain is static; keep, but never animate it.

## 4. Motion

Follows the web-animation-design skill contract (all under 300 ms, transform/opacity only):

| Interaction | Spec |
| --- | --- |
| Enter (sheets, modals, toasts, thumbnails) | `ease-out-cubic`, 180–240 ms, from `scale(.96) translateY(8px)` — never from 0 |
| Exit | Same, ~20% faster |
| Hover (pointer-fine only) | `background-color/border-color` 150 ms `ease`; no scale on layout-affecting elements |
| Button press | `scale(.97)` on `:active`, 100 ms |
| Countdown | Number scales 1.15→1 + fade, `ease-out-quart` 400 ms per tick; final tick gold |
| Shutter | Full-screen ivory flash 0→1→0 over 260 ms; slot thumbnail "develops" (blur→sharp + brightness 1.2→1) 600 ms — film reference |
| View change | Crossfade 160 ms + 8 px rise; never slide whole screens |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` sets all of the above to `none`; countdown becomes static number swap |

Paired elements (overlay + sheet) animate with identical duration/easing.

## 5. Information architecture & navigation

Three primary destinations (bottom tab bar on phone/tablet portrait; top nav ≥ 900 px):

```
┌───────────────────────────────────────────────┐
│ ◉ Keepsake            [Gallery n] [Settings]? │  ← header (wordmark, storage dot)
├───────────────────────────────────────────────┤
│                                               │
│   BOOTH (#/booth)                             │
│   landing → template pick → permission →      │
│   live camera → countdown → review grid       │
│                                               │
│   STUDIO (#/studio)                           │
│   strip canvas + tabs: Layout · Filter ·      │
│   Frame · Text · Stickers · Adjust            │
│                                               │
│   GALLERY (#/gallery)                         │
│   grid → detail viewer · select mode →        │
│   "Create strip" → Studio                     │
│                                               │
├───────────────────────────────────────────────┤
│ [ Booth ]  [ Studio ]  [ Gallery ]            │  ← tab bar w/ safe-area padding
└───────────────────────────────────────────────┘
```

- Hash routing (`#/…`) so static hosting needs no rewrites and browser back works.
- Booth → Studio handoff carries captured photo ids. Gallery → Studio carries selected ids.
- Studio state survives navigation away/back (kept in a store, not the URL).
- Export is a bottom sheet/modal within Studio, not a fourth destination.

## 6. Screen specifications

### 6.1 Booth — landing (idle)
- Hero: animated 4-cut strip illustration (CSS), wordmark, tagline *"a film photobooth that keeps your moments."*
- Layout carousel: template cards (mini canvas-rendered thumbnails), name + shot count chip.
- Primary CTA **Start the Booth** (pill, `--rose`, white text). Secondary: *use Gallery photos*.
- Privacy chip: "Photos stay on this device." Storage status line if storage unavailable.
- Desktop: two-column — illustration left, controls right; camera hints mention Space key.

### 6.2 Booth — permission explainer (modal)
- Why the camera is needed, what is saved (in-app Gallery), what never happens (no uploads).
- Buttons: **Enable camera** (primary) / **Not now**. Shown *before* calling `getUserMedia`.

### 6.3 Booth — live capture
- Full-bleed video (mirrored for front camera), warm-ink chrome overlays.
- Top: template mini-map (slots fill as shots land), close (ends session, confirms), camera-switch (only if > 1 device).
- Center: countdown numerals (aria-live polite).
- Bottom: big shutter (76 px ring), shot progress "2 / 4", cancel.
- States: `denied` → recovery card (browser settings steps + retry); `no-device`; `busy` → retry guidance.

### 6.4 Booth — review grid
- Captured slots in template order; tap a slot → **Retake** (recaptures just that slot) / **Keep**.
- Actions: **Compose in Studio** (primary), **Retake all**, **Discard session** (confirm — note: photos already saved to Gallery stay saved; discarding only ends the session).

### 6.5 Studio
- Canvas: strip preview centered, fits available height, rendered at DPR≤2. Tap a photo slot → selects it (rose outline + handles).
- Tool rail: bottom sheet with tabs **Layout · Filter · Frame · Text · Stickers**; photo slot selected adds **Adjust** (crop/pan/zoom + per-slot filter quick row) and an "apply filter to all" toggle.
- Undo/redo + reset live in a compact header row with keyboard hints on desktop.
- Empty slots show dashed outline + "add from Gallery" affordance.
- Export button (primary, pill) fixed in sheet header.

### 6.6 Export sheet
- Final preview, output size chips (2× / 3×), format note PNG.
- **Share** (if `navigator.share` files supported), **Download**, **Save to Gallery** (secondary), platform hint text when download semantics differ (e.g., "long-press the image to add to Photos" where applicable).

### 6.7 Gallery
- Responsive thumbnail grid (CSS grid, `auto-fill`, minmax 96 px), newest first, entry animation stagger ≤ 40 ms/item (reduced-motion: none).
- Header: photo count + storage meter (usage/quota bar + text), info button → storage-truth sheet.
- Tap → full preview (date, dimensions, size; download original; delete).
- Select mode (long-press or "Select" button): multi-select, **Delete** (confirm), **Create strip**.
- Empty state: illustrated strip outline + "Photos you take in the booth appear here automatically — nothing to save, nothing uploaded."

## 7. Responsive behavior

| Viewport | Layout |
| --- | --- |
| 320–479 px (small phones) | Single column; tab bar; sheets full-width; canvas max-height 52 vh |
| 480–899 px (large phones / portrait tablets) | As above with roomier grids; studio canvas max-height 56 vh |
| 480–899 landscape | Tab bar → left rail (56 px icons); studio becomes side-by-side |
| ≥ 900 px (tablet landscape / desktop) | Top nav; Studio side-by-side: canvas left (55%), tool panel right (fixed 380 px); Booth two-column |

- Safe areas: `padding: env(safe-area-inset-*)` on tab bar, header, sheets; `viewport-fit=cover`.
- No horizontal scroll at any width ≥ 320 px; long names truncate with ellipsis.
- Landscape phones: capture chrome compacts (countdown smaller, shutter bottom-right).

## 8. Touch, pointer, keyboard

- All targets ≥ 44×44 px (shutter 76 px). Spacing between destructive/primary ≥ 12 px.
- Primary actions on tap/click — never hover-only. Hover is enhancement (`@media (hover:hover) and (pointer:fine)`).
- Keyboard: Tab order matches visual; visible focus ring (2 px `--rose-deep`, 2 px offset); Studio: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z / Y redo, arrows nudge selected sticker, Delete removes it; Booth: Space = shutter, Esc = cancel/close; modals: Esc closes, focus trapped, focus returns on close.
- Screens use landmarks (`header/main/nav`), aria-labels on icon buttons, `aria-live` for countdown, toasts, and storage errors.

## 9. States (mandatory for every data surface)

| State | Design |
| --- | --- |
| Empty | Illustration + one-line explanation + one action (see 6.7) |
| Loading | Skeleton blocks matching final layout (gallery grid, canvas) — no spinners for content |
| Permission denied | Card: what happened, browser-specific steps, **Try again** |
| Storage full | Toast/sheet: size needed, actions: open Gallery to free space, retry; never claims save succeeded |
| Storage unavailable | Gallery shows explain-state; booth warns before session that captures can't be kept (still allows capture with explicit notice) |
| Corrupted record | Thumbnail placeholder; detail view offers delete |
| Offline | Not applicable by design — but font/canvas failures must not blank the app |

## 10. Component patterns

- **Button** variants: primary (rose pill), secondary (outline ink), ghost, danger (text `--danger` + confirm); pressed scale .97; loading state disables + swaps label ("Saving…").
- **Chip** (filters, categories): 36 px, icon+label, selected = `--blush` fill + `--rose-deep` text + 2 px rose border.
- **Slider** (intensity, crop zoom): 28 px track, thumb 24 px, value bubble; keyboard arrows work.
- **Sheet** (bottom on phone, right-side panel ≥ 900 px, centered modal on desktop landscape tablets per context) with grabber, title, Esc/dim-dismiss.
- **Toast**: bottom-center above tab bar, auto-dismiss 4 s + manual, `role="status"`; errors sticky until dismissed.
- **ConfirmDialog** for destructive actions, with consequence stated ("Delete 3 photos from Keepsake's Gallery? This can't be undone.").
- **StripCanvas**: shared preview/export canvas component; DPR-capped; redraws on parameter change (no animation frames).
- **StorageMeter**: thin bar + "12.4 MB of ~2 GB used" text, tooltip explaining browser-managed quota.
- Icons: single inline SVG set (24 px, 1.5 px stroke, round caps) — camera, aperture shutter, gallery, sparkles, frame, text, sticker, undo/redo, download, share, trash, close, switch-camera, info, heart-star doodles for frames. **No emoji as UI icons.**

## 11. Adding to the design system

- New template: add to `src/data/templates.ts` registry (geometry in normalized units) — thumbnails and pickers generate themselves.
- New filter: add preset object to `src/data/filters.ts` under a category; preview thumbnails render from the active photo automatically.
- New frame: add to `src/data/frames.ts`; frame *rendering* code lives beside the definition; must render identically at preview and export scales (use normalized drawing units).
- New sticker: add path data to the sticker set; keep paths ≤ 2 KB.
- Any new token goes in the Tailwind `@theme` block first (the Analog Heartbreak custom properties live there — see D-028); no raw hex or arbitrary values in component classes.

## 12. References consulted

Skill guidance applied: `ui-ux-pro-max` (contrast, touch targets, motion checklist, no-emoji-icons, focus states — database queried 2026-10-24; its generic palette suggestions were overridden by this product's charter), `frontend-ui-engineering` (component architecture, state-tier choice, empty/error states, anti-"AI aesthetic"), `web-animation-design` (easing blueprint, duration table, reduced-motion rules).
