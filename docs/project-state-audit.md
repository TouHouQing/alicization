# Project State Audit

This audit tracks project-state governance without preserving old reply templates
or internal cue strings.

## Required Invariants

- Project-state code may carry governance facts, but it must not author the visible reply.
- Only explicit project-status lanes may attach project-state context, and it must be serialized typed facts rather than reply prose.
- `WorkingMemory` owns short-term carry.
- `LongTermMemoryRecall` owns long-term recall.
- Dialogue, short-term memory, long-term recall, and embodiment must not depend on fixed project-state wording.
- Sanitizers may identify old template residue, but replacement text must not become a new prompt template.

## Current Coverage

- `project-state-brief.test.ts` verifies project-state output is typed data and free of reply templates.
- `execution-runtime-context.test.ts` verifies provider-facing execution context uses typed facts.
- `memory-workbench-dialogue-loop.test.ts` verifies memory UI aggregation does not replace memory owners.
- `long-term-memory-recall.test.ts` verifies durable recall stays evidence-backed.
- `main-chat-timeout-fallback.test.ts` verifies failures remain visible.
- clean provider/tool failure hints remain visible.
- This still does not prove fully sustained noisy-desktop convergence.

## Follow-Up Audit Targets

- `current-conscious-frame.ts`
- `answer-compiler.ts`
- `response-surface-contract.ts`
- `main-chat-active-dialogue-loop.ts`
- `recall-governor.ts`
- `response-charter.ts`
- `packages/stage-ui/src/services/speech/pipeline-runtime.ts`
- `packages/stage-ui/src/stores/project-state-observation.ts`
- `packages/stage-ui/src/stores/chat/session-store.ts`

These targets must be cleaned by removing legacy structured fallback text and
old project-state placeholder tokens from model-visible or user-visible paths.
