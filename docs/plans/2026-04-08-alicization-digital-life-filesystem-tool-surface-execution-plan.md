# Alicization Digital Life Filesystem Tool Surface Execution Plan (2026-04-08)

## Internal Grade Decision
- Grade: `L` (serial native execution)
- Rationale: execution-surface tools and tests are tightly coupled; serial edits reduce regression risk.

## Wave Structure

### Wave 1: Tool Surface Design
- Audit current main gateway tools and existing MCP bridge behavior.
- Define minimal first-class filesystem tools and stable result contract.

### Wave 2: Runtime Implementation
- Add `filesystem_read_file` / `filesystem_write_file` / `filesystem_edit_file` / `filesystem_list_directory`.
- Add MCP candidate fallback and argument-shape fallback helpers.
- Add normalized response helpers: text extraction, hashing, byte-size, truncation.
- Add edit read-modify-write flow with `expectedHash` guard.

### Wave 3: Prompt-Routing Guidance
- Update execution router system block to recommend `filesystem_*` as preferred file-operation tools.
- Keep `mcp_call_tool` as fallback escape hatch.

### Wave 4: Verification + Cleanup
- Run targeted test:
  - `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- Run required global checks:
  - `pnpm typecheck`
  - `pnpm lint:fix`
- Emit governed runtime receipts and delivery acceptance decision.

## Ownership Boundaries
- Code write scope:
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.ts`
  - `apps/stage-tamagotchi/src/main/services/alicization/main-chat-execution-surface.test.ts`
- Artifact scope:
  - `docs/requirements/2026-04-08-alicization-digital-life-filesystem-tool-surface.md`
  - `docs/plans/2026-04-08-alicization-digital-life-filesystem-tool-surface-execution-plan.md`
  - `outputs/runtime/vibe-sessions/20260408-125336-digital-life-filesystem-tool-surface/*`

## Verification Commands
- `pnpm -F @proj-alicization/stage-tamagotchi exec vitest run src/main/services/alicization/main-chat-execution-surface.test.ts`
- `pnpm typecheck`
- `pnpm lint:fix`

## Delivery Acceptance Plan
- Completion language is allowed only when targeted tests and global required checks pass.
- If global checks fail on unrelated pre-existing surfaces, report as residual risk and keep scope truthfully bounded.

## Completion Language Rules
- No blanket “fully complete” without command-level evidence.
- Separate implemented scope, verified scope, and unresolved debt.

## Rollback Rules
- Roll back only touched files in this plan if regressions are introduced.
- Do not reset or revert unrelated dirty workspace changes.

## Phase Cleanup Expectations
- Persist all stage receipts in `outputs/runtime/vibe-sessions/20260408-125336-digital-life-filesystem-tool-surface/`.
- Include verification outcomes and delivery-acceptance verdict in `cleanup-receipt.json`.
