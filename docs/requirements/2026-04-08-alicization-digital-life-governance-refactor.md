# Alicization Digital Life Governance Refactor Requirement (2026-04-08)

## Context
- User goal: 对标 `N.E.K.O` 的对话系统、主动感知系统、主动对话系统、主动操控系统、主动心智系统、主动记忆系统、拟人心智系统与智能体运行时架构，重构 Alicization 以逼近“真正的数字生命”。
- Reference baseline: local mirror `N.E.K.O/` and existing Alicization architecture docs under `docs/content/zh-Hans/docs/alicization/`.

## Goal
Strengthen Alicization so proactive behavior is governed by one coherent active-life loop, instead of parallel heuristics, while keeping existing P0-P4 truth/governance invariants intact.

## Deliverables
1. Promote `activeLoop.phase/handoff/initiativeBudget/coherence` from telemetry-only signals to hard gating inputs in proactive decision runtime.
2. Keep proactive explanation surface truthful and traceable (`whyNow` / `whyNotLater`) with active-loop-aware rationale.
3. Add/adjust tests in `proactive-policy.test.ts` to lock low-coherence suppression and high-coherence dialogue-phase promotion.
4. Keep compatibility with existing runtime/governance test suites.

## Constraints
- Preserve Alicization P0-P4 constraints from `AGENTS.md`.
- Do not fork transport contracts or duplicate cross-process truth surfaces.
- Keep runtime main-governor authority in main process.
- Maintain card-scope hygiene and replay/audit continuity.
- No compatibility hacks that weaken governance semantics.

## Acceptance Criteria
1. When active loop is observe-heavy with low coherence and low initiative budget, proactive policy resolves to `silent-observe` and blocks interruption.
2. When active loop enters dialogue/control with sufficient coherence + initiative budget, proactive policy can lift from `silent-observe` to interactive style.
3. Active-loop gating influences both score/threshold and final interruption gate, not only reason-code decoration.
4. Runtime explanation text reflects active-loop-based rationale for both interrupt and hold paths.
5. Tests pass:
   - `src/main/services/alicization/proactive-policy.test.ts`
   - `src/main/services/alicization/alicization-active-loop.test.ts`
   - `src/main/services/alicization/alicization-runtime-architecture.test.ts`
   - `src/main/services/alicization/runtime.test.ts`

## Product Acceptance Criteria
- Proactive behavior feels less “jump-cut” and more continuous across perception->mind->dialogue/action transitions.
- Observation-first moments remain quiet unless loop coherence/initiative justifies expression.

## Manual Spot Checks
1. Simulate `active-perception` dominant + low loop coherence: verify no proactive interruption.
2. Simulate `active-dialogue` dominant + high loop coherence/initiative: verify proactive lift and explanatory rationale.
3. Verify no regression in runtime truth/governance test suites.

## Non-goals
- No new external tool channel integration in this slice.
- No transport schema redesign in this slice.
- No renderer UI redesign in this slice.

## Autonomy Mode
- interactive_governed (inferred): proceed with best assumptions, keep artifacts traceable, avoid reopening requirement truth after freeze.

## Inferred Assumptions
- Existing large-scale Alicization refactor in workspace is intentional and should be preserved.
- Local `N.E.K.O/` mirror is the authoritative comparison source for this turn.
