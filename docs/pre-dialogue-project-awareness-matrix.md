# Pre-Dialogue Project Awareness Matrix

This matrix now records governance boundaries, not fixed dialogue wording.

| Boundary | Owner | Current Rule |
| --- | --- | --- |
| Short-term carry | `WorkingMemory` | Owns current-turn and recent-turn memory context. |
| Long-term recall | `LongTermMemoryRecall` | Owns durable recall, evidence, latency, and recall errors. |
| Visible memory governance | `MemoryWorkbench` | Aggregates health, policy, search, and embedding controls. |
| Provider failures | Runtime/provider adapters | Report timeout, provider failure, tool failure, and invalid structured output directly. |
| Persona learning | Review policy | Use cleaned long-term reflection or persona reinforcement only. |

## Disallowed Matrix Content

- Fixed reply openings.
- Internal cue strings copied into prompts.
- Placeholder project-state tokens.
- Claims that memory closure is complete without runtime evidence.

## Behavior Anchors

- `execution-runtime-context.test.ts`: execution context is serialized as typed facts with transparent failure semantics.
- `memory-workbench-dialogue-loop.test.ts`: the visible memory workbench remains an aggregate entry rather than a memory owner.
- `long-term-memory-recall.test.ts`: long-term recall keeps evidence and retrieval behavior in its owning subsystem.
- `main-chat-timeout-fallback.test.ts`: timeout failures remain explicit instead of becoming a persona reply.
- Source-snippet proof tests have been removed.

## Next Audit Pass

Remove remaining model-visible cue fallbacks from the production files listed in
`docs/project-state-audit.md`.
