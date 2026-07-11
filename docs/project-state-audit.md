# Project State Audit

This audit tracks project-state governance without preserving old reply templates
or internal cue strings.

## Required Invariants

- Project-state code may carry governance facts, but it must not author the visible reply.
- Provider-facing project-state blocks may mention memory ownership and failure transparency only.
- `WorkingMemory` owns short-term carry.
- `LongTermMemoryRecall` owns long-term recall.
- Dialogue, short-term memory, long-term recall, and embodiment must not depend on fixed project-state wording.
- Sanitizers may identify old template residue, but replacement text must not become a new prompt template.

## Current Coverage

- `project-state-brief.test.ts` verifies canonical project-state output is free of old template markers.
- `project-state-docs-sync.test.ts` verifies docs stay short and free of old template markers.
- `quick-reply-project-awareness-audit.test.ts` verifies quick-reply surfaces hide internal project-state residue while preserving real failure messages.
- host-visible inward-carry audit ties reopen-persistence handoff, speech-boundary pre-dialogue awareness rebuilding, front-stage quick-reply closure, and the dialogue-panel hidden diagnostic boundary without leaking diagnostic closure markers into the main dialogue bubble.
- quick-reply visible surfaces now hide fixed templates and internal diagnostic fields.
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
