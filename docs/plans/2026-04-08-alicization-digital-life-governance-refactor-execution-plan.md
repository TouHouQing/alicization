# Alicization Digital Life Governance Refactor Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution from frozen plan)
- Rationale: Single critical lane (`proactive-policy`) with high coupling to governance behavior; bounded tests sufficient for validation.

## Wave Structure

### Wave 1: Baseline Verification
- Verify current runtime architecture and active-loop status.
- Run targeted tests to establish no-regression baseline.

### Wave 2: Governance Refactor
- Update `proactive-policy.ts` to consume active-loop gating values as execution truth:
  - `phase`
  - `handoffTarget`
  - `initiativeBudget`
  - `coherence`
- Apply gating in:
  - style resolution
  - score/threshold shaping
  - interruption final gate
  - explainability text

### Wave 3: Contracted Tests
- Extend `proactive-policy.test.ts` with:
  - low-coherence observe-phase suppression
  - high-coherence dialogue-phase promotion
- Adjust expectation strings for active-loop-aware narrative.

### Wave 4: Verification + Cleanup
- Run targeted suite:
  - `proactive-policy.test.ts`
  - `alicization-active-loop.test.ts`
  - `alicization-runtime-architecture.test.ts`
  - `runtime.test.ts`
- Run required workspace checks:
  - `pnpm typecheck`
  - `pnpm lint:fix`
- Emit cleanup receipts and delivery acceptance report.

## Ownership Boundaries
- Write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/proactive-policy.test.ts`
  - governed runtime artifacts under `docs/` and `outputs/runtime/vibe-sessions/...`
- No changes to transport-contract single source in this slice.

## Verification Commands
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/proactive-policy.test.ts`
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/alicization-active-loop.test.ts src/main/services/alicization/alicization-runtime-architecture.test.ts src/main/services/alicization/proactive-policy.test.ts src/main/services/alicization/runtime.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Only claim completion after all verification commands pass.
- Report explicit residual risk if any global command cannot be completed.

## Completion Language Rules
- No blanket “fully done” claim without verification evidence.
- State what was changed, what was tested, and what remains out of scope.

## Rollback Rules
- Revert only files in this slice if regression appears.
- Keep existing user modifications untouched outside ownership scope.

## Phase Cleanup Expectations
- Persist stage artifacts and cleanup receipt in `outputs/runtime/vibe-sessions/20260408-102258-digital-life-governance-refactor/`.
- Record command/test evidence and delivery acceptance decision.
