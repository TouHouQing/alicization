# Alicization Dialogue Memory Personhood Cleanup Closure

**Original planning date:** 2026-07-05

**Closure updated:** 2026-07-30

**Status:** Closed for the ordinary dialogue mainline.

## Goal

Keep Alicization's visible dialogue authored by the configured Provider while allowing the personhood core, WorkingMemory, and LongTermMemoryRecall to supply traceable context. Infrastructure failures must remain explicit and must never be converted into an ordinary in-character reply.

## Final Ownership

- `SOUL.md` is the user-governed personhood and relationship source.
- `WorkingMemory` owns short-term conversation state.
- `LongTermMemoryRecall` owns long-term evidence retrieval.
- Memory Workbench is the user-visible governance and inspection surface.
- The main-process session runtime owns Provider input assembly.
- The renderer owns transport, presentation, interruption, and transparent failure display.

These boundaries are intentionally separate. Memory Workbench does not become a memory owner, and the renderer does not maintain a parallel model of personality or memory.

## Final Ordinary Dialogue Mainline

1. The renderer sends the current turn through the desktop runtime bridge.
2. The main-process session runtime assembles `SOUL.md`, WorkingMemory, LongTermMemoryRecall evidence, the current user turn, and allowlisted structured Provider facts.
3. The configured Provider authors the visible reply.
4. Timeout, Provider, tool, permission, protocol, recall, and persistence failures return typed transparent failure surfaces.
5. Failure artifacts are excluded from long-term condensation, persona learning, and training.
6. Successful Provider-authored turns are persisted before downstream memory settlement and embodiment projection.

## Retired Parallel Surfaces

- renderer-side Provider input assembly
- local ordinary reply authoring
- ordinary dialogue fast-path reply authoring
- second-pass visible reply rewriting
- reply wording governance derived from project or runtime state
- normal-reply fallbacks that conceal infrastructure failure

The remaining deterministic user-visible text is limited to typed infrastructure and memory failure surfaces.

## Memory And Persona Invariants

- Raw transcripts do not enter persona training.
- Review candidates are not treated as confirmed long-term memory.
- Persona candidates come only from cleaned, reviewable long-term reflections or persona reinforcement.
- Embeddings are retrieval representations, not personhood state.
- Different embedding vector spaces are never mixed; model changes require reindexing.
- Recall evidence remains traceable to its owner and source records.

## Verification

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/fixed-reply-governance-removal.test.ts \
  packages/stage-ui/src/stores/chat-core-pre-dialogue-authority.test.ts \
  packages/stage-ui/src/composables/alicization-guardrails.test.ts \
  packages/stage-ui/src/stores/chat.test.ts
```

```bash
pnpm -F @proj-alicization/stage-ui typecheck
pnpm -F @proj-alicization/stage-tamagotchi typecheck:node
```

## Key Closure Commits

- `9b5276a1f` unify Provider memory context
- `6fd4ed1bd` merge live WorkingMemory turns
- `5d028c3d7` expose missing recall owner
- `0b9ddc694` retire agent session prompt facts
- `436f6a323` close retired prompt block slots
- `4e2fbe41f` narrow dialogue Provider facts
- `5885b7ea2` retire renderer-side Provider input composer

## Remaining Work

The ordinary dialogue authorship cleanup is closed. Remaining Phase 1 work should focus on memory quality and scale: retrieval evaluation, production embedding operations, long-term search pagination, health metrics, review policy persistence, persona candidate governance, and user-facing Memory Workbench diagnostics.
