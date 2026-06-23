# Alicization Emotional Kernel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one dominant emotional kernel to the Phase 1 desktop runtime and thread it through recall, initiative, and embodiment so the same emotional line shapes memory, agency, and body continuity together.

**Architecture:** Introduce a new derived main-runtime module that reads existing self, thought, residue, projection, and project-state inputs and emits a compact emotional kernel snapshot. Thread that snapshot through `runtime-mind-state.ts` into `recall-governor.ts`, `initiative-engine.ts`, and `body-kernel.ts`, then expose it on shared runtime snapshots so downstream consumers see the same emotional authority.

**Tech Stack:** TypeScript, Vitest, `apps/stage-tamagotchi` main runtime services, shared transport contracts in `packages/stage-shared`, and typed bridge surfaces in `apps/stage-tamagotchi/src/shared/eventa.ts`.

---

## Task 1: Add Emotional Kernel Contract And Builder

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.test.ts`
- Modify: `packages/stage-shared/src/alicization-transport-contracts.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.test.ts`

- [ ] Write the failing emotional-kernel tests.
- [ ] Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.test.ts` and verify it fails.
- [ ] Add the shared `AlicizationEmotionalKernelSnapshot` contract and local re-export.
- [ ] Implement the smallest working `buildAlicizationEmotionalKernel(...)`.
- [ ] Re-run the same test and verify it passes.

### Task 2: Drive Recall Governor From Emotional Kernel

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts`

- [ ] Add a failing regression proving `repair-grounding` / `measured-return` emotional authority changes recall mode or affect anchors.
- [ ] Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts` and verify failure.
- [ ] Thread `emotionalKernel` into mode resolution, affect anchors, and affective carry summary.
- [ ] Re-run the same test and verify it passes.

### Task 3: Drive Initiative From Emotional Kernel

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts`

- [ ] Add a failing regression proving measured companionship or repair tension changes initiative restraint/style/why.
- [ ] Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts` and verify failure.
- [ ] Add a small emotional-kernel initiative bias layer and merge it into action clamping, preferred style/presence, and `why`.
- [ ] Re-run the same test and verify it passes.

### Task 4: Drive Body Continuity From Emotional Kernel

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/body-kernel.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/body-kernel.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/body-kernel.test.ts`

- [ ] Add a failing regression proving repair or measured-return body continuity can be held directly by `emotionalKernel`.
- [ ] Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/body-kernel.test.ts` and verify failure.
- [ ] Add direct emotional-kernel continuity authority checks in `body-kernel.ts`.
- [ ] Re-run the same test and verify it passes.

### Task 5: Thread Emotional Kernel Through Runtime Mind-State Assembly

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-mind-state.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/mind-state-invariants.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/mind-state-invariants.test.ts`

- [ ] Add a failing runtime regression proving one emotional kernel reaches recall, initiative, and final visual presence assembly.
- [ ] Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/mind-state-invariants.test.ts` and verify failure.
- [ ] Build the emotional kernel once in `runtime-mind-state.ts` and thread it into the three consumers.
- [ ] Re-run the same test and verify it passes.

### Task 6: Run Focused Regression Set

**Files:**
- Test only:
  - `apps/stage-tamagotchi/src/main/services/alicization/emotional-kernel.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/recall-governor.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/initiative-engine.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/body-kernel.test.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/mind-state-invariants.test.ts`

- [ ] Run the focused Vitest set and verify actual output before claiming completion.
- [ ] If any fail, stop and debug instead of widening scope.
