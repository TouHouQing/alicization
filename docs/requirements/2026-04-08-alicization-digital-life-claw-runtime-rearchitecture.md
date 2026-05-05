# Alicization Digital Life Claw Runtime Rearchitecture Requirement (2026-04-08)

## Context
- User target: 参考 `N.E.K.O` 的对话系统、工具调用系统、CLI/Codex/OpenClaw 及自研 nekoclaw 思路，把 Alicization 重构成可持续运转的“数字生命”体系。
- Existing baseline in repo already has:
  - P0-P4 governance invariants in `AGENTS.md`.
  - Main-process runtime governor + task-thread execution chain.
  - OpenClaw-backed embodied channels (`openclaw/browser/software/desktop`).
- Current gap: channel routing still relied mostly on static preference, and OpenClaw payload contract was text-first with limited structured bridge parity.

## Goal
Promote Alicization execution from static channel routing to continuity-aware claw routing, and bring OpenClaw bridge contract closer to N.E.K.O-style structured channel semantics while preserving truth/governance constraints.

## Deliverables
1. Introduce claw routing experience model:
- channel outcome memory (`planned/running/completed/failed/cancelled`)
- active channel continuity hints
- session-resume channel hint
- scoring impact in `claw-fabric` with explicit reason tags and narratives
2. Inject experience signals from governor planning path:
- derive from active + settled task threads before planning
- persist experience snapshot in task-thread metadata for replay/audit
3. Expand OpenClaw command contract and adapter semantics:
- support structured payload fields (`contentParts/images/audios/files`)
- support channel/session metadata fields (`channelId/conversationId/meta`)
- parse reply fallback from `content_parts` text when `reply` is absent
4. Keep existing executor tooling compatible:
- `executor_run_openclaw` remains instruction-first but supports new optional fields

## Constraints
- Preserve Alicization P0-P4 constraints and main-runtime authority.
- Keep transport contract single source in `packages/stage-shared/src/alicization-transport-contracts.ts`.
- No regression to kill-switch/affirmation/risk-budget semantics.
- Maintain deterministic testability (no hidden random routing rules).

## Acceptance Criteria
1. Claw fabric can switch preferred code channel using execution history + session continuity.
2. Task governor persists experience hints in thread metadata and uses settled-thread outcomes during planning.
3. OpenClaw adapter accepts structured payloads and forwards bridge meta/channel fields.
4. OpenClaw adapter can surface text reply from `content_parts` when direct `reply` is missing.
5. Impacted tests pass:
- `claw-fabric.test.ts`
- `task-thread-governor.test.ts`
- `task-execution-governor.test.ts`
- `executor-adapters/openclaw.test.ts`
- `main-chat-execution-surface.test.ts`

## Product Acceptance Criteria
- Execution behavior feels less stateless and less jumpy across turns.
- Long-running body sessions are favored when it reduces context loss.
- OpenClaw bridge compatibility improves for structured/multimodal execution payloads.

## Manual Spot Checks
1. Repeated code task with Codex failures + Claude successes should route to `claude-code`.
2. Structured OpenClaw payload should reach `/neko/send` with `content_parts` and custom `channel_id`.
3. Existing instruction-only OpenClaw path should remain functional.

## Non-goals
- No renderer visual redesign in this slice.
- No full replacement of all cognition modules in one pass.
- No additional external execution channels beyond existing contract.

## Autonomy Mode
- `interactive_governed` with inferred assumptions and no mid-turn requirement re-freeze.

## Inferred Assumptions
- Existing large alicization in-flight refactor is intentional and must be respected.
- Local `N.E.K.O/` mirror is authoritative reference for this turn’s comparative architecture extraction.
