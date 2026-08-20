# Lint Baselines

The root lint commands are split by responsibility:

- `pnpm lint:core` is the passable Phase 1 Alicization life-loop gate. It uses
  ESLint with the explicit Alicization warning baseline described below.
- `pnpm lint` is the full non-documentation repository inventory. It runs
  oxlint before ESLint and may remain red while unrelated historical findings
  are paid down.

Markdown is reference material, not production source. Documentation quality
should use a dedicated documentation tool instead of applying production
TypeScript and Vue rules to illustrative snippets.

## Phase 1 Core

The core gate covers only:

- `apps/stage-tamagotchi/src/main/services/alicization`
- the stage-tamagotchi memory settings page and `memory-*` settings components
- the stage-tamagotchi window layer, renderer bridge entry, and memory Eventa contracts
- `packages/stage-shared/src/alicization-*` contracts and semantics
- `packages/stage-ui/src/stores/alicization-*` stores
- the English and Simplified Chinese memory settings translations

Existing violations in this boundary remain visible as warnings through the
Alicization-specific ESLint override. New error-level rules still fail the
gate until they are either fixed or deliberately classified in that override.

## Verification

Run both commands without suppressing their exit status:

```bash
pnpm lint:core # Must exit 0.
pnpm lint      # Reports the broader repository inventory.
```

A valid lint-layer change must satisfy all of the following:

1. Findings from the Phase 1 core paths remain visible in `pnpm lint:core`.
2. Findings from `.agents`, `docs`, Markdown files, and fenced Markdown code do
   not appear in either production lint command.
3. `pnpm lint` additionally reports non-documentation root configuration
   and non-core source violations.
4. `pnpm lint:core` exits successfully with its classified warning baseline.
5. Error-level findings from either command are not suppressed with shell
   fallbacks.
