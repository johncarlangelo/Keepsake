# AGENTS.md — Standing instructions for all coding agents working on Keepsake

These rules apply to every agent (human or AI) modifying this repository. They exist to keep
Keepsake coherent, honest, and safe. When agent output conflicts with these rules, the rules win.

## Before you change anything

1. **Read the docs first**: `PRD.md`, `DESIGN.md`, `ARCHITECHTURE.md`, `TASKS.md`, `PPROGRESS.md`,
   and any `DECISIONS.md` entries touching the area you work on.
2. Check `TASKS.md` for task status and dependencies; move the task you take to `IN_PROGRESS`.
3. Follow the existing architecture (`ARCHITECHTURE.md §2`) and the design tokens (`DESIGN.md §1–4`).
   Raw hex values, off-scale spacing, and emoji-as-icons are bugs.

## While you work

- Keep documentation synchronized with implementation. A behavior change without a doc update
  (or vice versa) is an incomplete change.
- No unnecessary dependencies. Any new runtime dependency requires a `DECISIONS.md` entry with
  justification. No duplicated logic; extend registries (`src/data/*`) instead of copying.
- Components stay focused; split anything over ~200 lines. Separate data/state/render concerns
  per the module map.
- No unrelated refactors, no broad destructive replacements, no drive-by style churn.
- Strict TypeScript, explicit error handling (`try/catch` with typed failures at boundaries),
  modular pure functions for anything testable.
- Changing behavior ⇒ add or update tests in the same change.
- Clean up: camera streams, object URLs (use `ObjectUrlPool`), `ImageBitmap`s, event listeners.

## Hard product rules (never violate)

- **Never upload user photographs, camera frames, thumbnails, or metadata** anywhere. No fetch/
  XHR/beacon/WebSocket that carries image data may exist in app code.
- **No PWA**: no service worker, no web app manifest, no install prompts.
- **No backend/auth/cloud/paid services** — static frontend only.
- **Never silently delete or mutate user photos.** Migrations are additive; deletion happens only
  through explicit user action; storage failures are surfaced, never swallowed.
- **Never write captures to the device's native photo store** — the in-app Gallery (IndexedDB) only;
  external saving is the explicit export/share feature.
- Camera permission is requested only after an explicit user action.
- Do not modify `.github/workflows/ci.yml` except during the explicitly-final CI phase.

## Verification & honesty

- Run the available gates before declaring done: `npm run typecheck`, `npm run lint`,
  `npm test`, `npm run build`. Report actual output; fix or explain failures.
- **Never claim a test, device, or browser was verified unless it was actually run.** Desktop
  emulation is not iOS/Android verification — record platform results as untested when untested.
- `PPROGRESS.md` must reflect reality: writing code is not evidence of completion; passing the
  relevant checks is.

## Records

- Consequential decisions (stack, storage, rendering, compat, tradeoffs) go into `DECISIONS.md`
  as numbered entries (`D-###`), including rejected alternatives.
- Update `TASKS.md` (statuses: `TODO`/`IN_PROGRESS`/`BLOCKED`/`DONE`) and `PPROGRESS.md`
  (current phase, verified results, files touched, exact next action) as you complete work.
- Commit per major task with conventional one-line messages (`feat: …`, `fix: …`, `docs: …`,
  `test: …`, `chore: …`). Never push, deploy, or publish without explicit authorization — except
  the incremental pushes the project owner has explicitly authorized for this repository.

## Loop discipline

When self-reviewing with the bounded grep loop, follow `LOOP.md`: cap iterations, never retry a
failed fix more than twice without changing strategy, and stop cleanly with honest status.
