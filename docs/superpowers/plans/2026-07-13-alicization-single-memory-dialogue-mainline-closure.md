# Alicization Single Memory Dialogue Mainline Closure

**Original planning date:** 2026-07-13

**Closure updated:** 2026-07-30

**Status:** Closed for ordinary desktop dialogue.

## Objective

Establish one Provider-authored dialogue path in which short-term memory, long-term recall, personhood, execution facts, and visible failures have explicit ownership and traceability.

## Ownership

- `SOUL.md` owns the user-governed personhood and relationship baseline.
- `WorkingMemory` owns the active short-term conversation state.
- `LongTermMemoryRecall` owns long-term evidence retrieval.
- The main-process session runtime owns Provider input assembly.
- The Provider owns ordinary visible reply authorship.
- Memory Workbench owns no memory data; it aggregates inspection and governance APIs.
- The renderer owns transport, presentation, interruption, and failure display.

## Unified Dialogue Envelope

The main-process session runtime assembles one allowlisted Provider request from:

- current user turn and bounded recent dialogue
- `SOUL.md` and user-governed card directives
- WorkingMemory owner context
- LongTermMemoryRecall evidence and risk flags
- perception and inspection facts
- execution capability, routing, callback, and ledger facts
- host, datetime, and event facts

WorkingMemory and LongTermMemoryRecall remain distinguishable inside the envelope. A review candidate never becomes confirmed long-term evidence merely because it appears in a queue or UI.

## Visible Reply Authority

- Ordinary visible replies come from the configured Provider.
- Tool results return to the Provider as structured facts.
- Renderer and local runtime code do not author, repair, or rewrite ordinary replies.
- A Provider artifact remains provisional until source, structure, and contamination checks pass.
- Accepted Provider turns are persisted before downstream memory settlement and embodiment projection.

## Transparent Failure Surfaces

Timeout, Provider, tool, permission, protocol, recall, persistence, and structure failures return typed user-visible failure surfaces. Failure artifacts:

- retain the real failure origin
- expose a safe error summary
- do not become ordinary dialogue
- do not enter WorkingMemory as successful assistant speech
- do not enter long-term condensation
- do not enter persona learning or training

## Persona And Memory Safety

- Raw transcripts do not enter persona training.
- Pending review candidates are not treated as confirmed memories.
- Persona candidates come only from cleaned long-term reflections or persona reinforcement.
- Persona approval, rejection, and no-training actions persist policy only.
- Embeddings remain retrieval representations and never become personhood state.
- Embedding model changes require reindexing into a new vector space.

## Verification

```bash
pnpm exec vitest run \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-single-dialogue-mainline-audit.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-provider-fact-filter.test.ts \
  apps/stage-tamagotchi/src/main/services/alicization/fixed-reply-governance-removal.test.ts \
  packages/stage-ui/src/stores/chat.test.ts \
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
- `0e26a7aa8` restrict one-shot system facts
- `0b9ddc694` retire agent session prompt facts
- `436f6a323` close retired prompt block slots
- `4e2fbe41f` narrow dialogue Provider facts
- `5885b7ea2` retire renderer-side Provider input composer

## Remaining Quality And Scale Work

The ordinary dialogue mainline is closed. Follow-up work should improve:

- retrieval quality evaluation and replay benchmarks
- production embedding provider operations and reindex observability
- persistent vector search and mixed lexical/semantic ranking
- long-term memory pagination, search, and filtering
- WorkingMemory capacity, summarization, and session handoff behavior
- real Memory Workbench health metrics
- review policy persistence and persona candidate governance
- user-visible recall traces without exposing private internal reasoning
