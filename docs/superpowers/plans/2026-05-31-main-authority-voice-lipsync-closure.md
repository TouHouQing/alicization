# Main Authority Voice-Lipsync Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `main`-process embodiment authority settle `voice` with the same measured-return, repair-before-closeness, and recovering logic already applied to lipsync and body continuity.

**Architecture:** Keep the closure inside `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.ts` so one authority source reconciles `digitalLife.voice`, `digitalLife.speechStyle`, and `frames[].voice` together with lipsync continuity. Verify the closure through focused coordinator regression tests instead of renderer changes.

**Tech Stack:** TypeScript, Vitest, pnpm workspace, Electron desktop runtime, stage-shared digital-life contracts.

---

## Task 1: Add failing coordinator regressions for same-authority voice settling

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that measured-return, repair-before-closeness, and recovering flows settle `digitalLife.voice` and keep `digitalLife.speechStyle.rateMultiplier` aligned with `digitalLife.voice.rateMultiplier`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`
Expected: FAIL on the new voice-settling assertions because coordinator currently reconciles lipsync/face/action without reconciling `voice`.

- [ ] **Step 3: Write minimal implementation**

Update `reconcileRuntimeDigitalLifeAuthority()` so companionship settling and recovering also reconcile base `voice`, `speechStyle`, and `frames[].voice`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-05-31-main-authority-voice-lipsync-closure.md apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.ts apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts
git commit -m "feat: reconcile embodiment voice authority"
```

### Task 2: Verify the closure against the desktop runtime contract

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`

- [ ] **Step 1: Re-run the targeted coordinator test**

Run: `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/embodiment/runtime-embodiment-coordinator.test.ts`
Expected: PASS with the new voice assertions included.

- [ ] **Step 2: Run desktop typecheck**

Run: `pnpm -F @proj-alicization/stage-tamagotchi typecheck`
Expected: PASS

- [ ] **Step 3: Inspect remaining risk**

Check that this change only narrows `voice` toward the same continuity line and does not broaden renderer scope or create a second authority path.
