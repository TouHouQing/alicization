# Alicization Digital Life Tool Runtime Strengthening Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution)
- Rationale: executor adapter, chat contract, and regression tests are tightly coupled; serial progression keeps governance invariants stable.

## Wave Structure

### Wave 1: Baseline + Reference Extraction
- Inspect current Alicization executor weakness in CLI and payout chain.
- Extract stable patterns from local `N.E.K.O` and `claude-code-main` references:
  - stream-first command execution
  - bounded output capture + truncation marker
  - explicit obligation retry directives for tool-call contracts
- Cross-check architecture notes against [agent-aura file operations docs](https://ccb.agent-aura.top/docs/tools/file-operations) for robust file/tool runtime principles.

### Wave 2: CLI Adapter Runtime Hardening
- Refactor `executor-adapters/cli.ts` to spawn-driven execution.
- Replace `maxBuffer` failure path with bounded stream capture and truncation notices.
- Expand timeout windows for real engineering tasks.
- Preserve abort and timeout lifecycle with SIGTERM + SIGKILL fallback.

### Wave 3: Execution Contract Parity (OpenClaw Included)
- Extend executor tool critical-retry directive set in `chat.ts` to include `executor_run_openclaw`.
- Keep executor payoff retry constraints aligned across CLI/Codex/Claude/OpenClaw.
- Add regression tests for OpenClaw execution-intent enforcement.

### Wave 4: Verification + Cleanup
- Run focused tests:
  - `cli.test.ts`
  - `chat.test.ts`
- Run required repository-wide checks:
  - `pnpm typecheck`
  - `pnpm lint:fix`
- Emit governed runtime receipts and completion decision for this run.

## Ownership Boundaries
- Code write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/executor-adapters/cli.ts`
  - `packages/stage-ui/src/stores/chat.ts`
  - `packages/stage-ui/src/stores/chat.test.ts`
- Artifact scope:
  - `docs/requirements/2026-04-08-alicization-digital-life-tool-runtime-strengthening.md`
  - `docs/plans/2026-04-08-alicization-digital-life-tool-runtime-strengthening-execution-plan.md`
  - `outputs/runtime/vibe-sessions/20260408-123718-digital-life-tool-runtime-strengthening/*`

## Verification Commands
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/executor-adapters/cli.test.ts`
- `pnpm -F @proj-alicization/stage-ui exec vitest run src/stores/chat.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Full completion wording is allowed only when targeted tests and global required checks pass.
- If global checks fail on unrelated pre-existing surfaces, report failures as residual risk with explicit scope boundary.

## Completion Language Rules
- No claim of “fully complete” without command-level evidence.
- Report implemented changes, verification evidence, and unresolved debt separately.

## Rollback Rules
- Roll back only touched files in this plan if regressions are introduced.
- Do not reset or revert unrelated dirty workspace modifications.

## Phase Cleanup Expectations
- Persist all stage receipts under `outputs/runtime/vibe-sessions/20260408-123718-digital-life-tool-runtime-strengthening/`.
- Include targeted test results and global-check outcomes in `cleanup-receipt.json`.
