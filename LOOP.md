# LOOP.md — Bounded self-review loop for development iterations

An *optional* grep-based loop an agent runs to hunt down unfinished or risky work before closing
a task. It is intentionally bounded: no open-ended iterating, no unbounded refactors.

## Loop procedure (max 4 iterations per task)

**Iteration = scan → triage → fix highest-priority items → re-run gates.**

### 1. Scan (run from repo root)

```bash
# Unfinished markers in app code
grep -rn "TODO\|FIXME\|HACK\|XXX\|placeholder\|not implemented" src/ --include="*.ts" --include="*.tsx"

# Swallowed errors / empty catches
grep -rn "catch" src/ --include="*.ts" --include="*.tsx" | grep -v "lib/"
grep -rnE "catch\s*\([^)]*\)\s*\{\s*\}" src/ --include="*.ts" --include="*.tsx"

# Privacy guard: no network calls in app code (charter violation if found)
grep -rnE "fetch\(|XMLHttpRequest|WebSocket|sendBeacon|navigator\.sendBeacon" src/ --include="*.ts" --include="*.tsx"

# PWA guard
grep -rnE "serviceWorker|navigator\.serviceWorker|manifest\.json|beforeinstallprompt" src/ index.html

# Forbidden storage misuse (images in localStorage)
grep -rn "localStorage" src/ --include="*.ts" --include="*.tsx"

# Raw URLs / leaked object URLs (bypassing ObjectUrlPool)
grep -rn "createObjectURL" src/ --include="*.ts" --include="*.tsx" | grep -v "lib/images.ts"

# Raw hex in components (design-token violations)
grep -rnE "#[0-9a-fA-F]{3,8}" src/components/ src/screens/ --include="*.tsx"

# Missing tests for changed modules (compare with git diff)
git diff --name-only HEAD~1
```

### 2. Triage

Order findings by: **(a)** charter violations (privacy, PWA, silent deletion) → fix immediately;
**(b)** broken gates (`typecheck`, `lint`, `test`, `build` failures) → fix immediately;
**(c)** TODOs/empty catches on code touched by the current task → fix within the task;
**(d)** pre-existing TODOs elsewhere → append to `TASKS.md` as new tasks, do **not** fix now.

### 3. Gates (must pass before a task is DONE)

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

### 4. Record & stop conditions

Stop the loop when any of:
- All scans clean for the current task's scope, and all four gates pass. → Loop complete.
- 4 iterations consumed. → Record remaining findings in `TASKS.md`/`PPROGRESS.md` as known issues.
- A fix attempt for the same problem fails twice. → Do not retry a third time with the same
  strategy; write the blocker into `PPROGRESS.md` (symptom, hypothesis, attempted fixes) and
  stop or change approach.

After the loop: update `PPROGRESS.md` (phase, what was verified with actual gate output, files
changed, exact next recommended action).

## Protections

- **No broad destructive replacements**: never `sed`/regex-edit across many files in one shot;
  edit files individually with review.
- **No unrelated refactors**: if a fix tempts you to restructure untouched modules, it goes to
  `TASKS.md` instead.
- **Never** execute destructive commands (`rm -rf`, `git reset --hard`, force-push), push, or
  deploy as part of the loop (pushes are authorized only as ordinary incremental commits per the
  owner's instruction — never force-push, never rewrite history).

## Loop ≠ release

A completed loop means: code consistent, gates green, records updated. It does **not** mean
release verification — device testing, permission flows on real hardware, and hosting checks are
tracked separately in `VERIFY.md` and remain open until actually performed.
