# Alicization Digital Life Claw Runtime Rearchitecture Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution)
- Rationale: planner/governor/adapter contracts are tightly coupled; serial edits reduce cross-module drift.

## Wave Structure

### Wave 1: Baseline + Comparative Extraction
- Inspect existing Alicization execution chain (`claw-fabric`, `task-thread-governor`, `task-execution-governor`, `openclaw adapter`).
- Extract transferable runtime patterns from local `N.E.K.O` mirror:
  - unified channel decision mentality
  - session affinity continuity
  - structured bridge payload compatibility

### Wave 2: Claw Fabric Experience Routing
- Add explicit `experience` contract to claw fabric input.
- Add score/risk modulation rules:
  - success lift
  - failure pressure
  - active channel continuity
  - session-resume affinity
- Preserve affirmation/permission/risk-budget governance checks.

### Wave 3: Governor Injection + Metadata Traceability
- Let task execution governor derive experience hints from active + settled task threads.
- Feed experience into planning draft generation.
- Persist normalized experience snapshot under `thread.metadata.fabric.experience` for replay/audit.

### Wave 4: OpenClaw Structured Contract Parity
- Expand shared transport input for OpenClaw:
  - structured payload fields
  - channel/conversation/meta fields
- Update adapter to forward fields to `/neko/send` and parse `content_parts` fallback reply.
- Keep instruction-first path backward compatible.

### Wave 5: Verification + Cleanup
- Run focused Vitest suite for changed modules.
- Run required global checks:
  - `pnpm typecheck`
  - `pnpm lint:fix`
- Emit governed runtime phase receipts and cleanup evidence.

## Ownership Boundaries
- Code write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/claw-fabric.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/task-thread-governor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/task-execution-governor.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/openclaw.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
  - impacted tests
  - `packages/stage-shared/src/alicization-transport-contracts.ts`
- Artifact scope:
  - `docs/requirements/2026-04-08-alicization-digital-life-claw-runtime-rearchitecture.md`
  - `docs/plans/2026-04-08-alicization-digital-life-claw-runtime-rearchitecture-execution-plan.md`
  - `outputs/runtime/vibe-sessions/<run-id>/...`

## Verification Commands
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/claw-fabric.test.ts src/main/services/alicization/task-thread-governor.test.ts src/main/services/alicization/task-execution-governor.test.ts src/main/services/alicization/executor-adapters/openclaw.test.ts src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Completion wording allowed only if verification commands pass.
- If global checks fail outside this slice, report exact failing surface and residual risk.

## Completion Language Rules
- No blanket “fully done” without evidence.
- Explicitly separate “implemented”, “verified”, and “follow-up needed”.

## Rollback Rules
- Rollback only touched files in this plan if regression appears.
- Never reset or revert unrelated in-flight workspace changes.

## Phase Cleanup Expectations
- Persist phase receipts and cleanup report in `outputs/runtime/vibe-sessions/20260408-105101-digital-life-claw-runtime-rearchitecture/`.
- Include test command outcomes and delivery acceptance decision.
