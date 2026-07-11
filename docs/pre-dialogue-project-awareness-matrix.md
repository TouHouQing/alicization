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

## Proof Anchors

- `project-state-brief.test.ts`: shared pre-dialogue awareness/closure structures keep explicit `initiative_gap=` carry inside `reasonPreview` / `reasons`.
- `same-living-self-host-visible-inward-carry-bridge-audit.test.ts`: host-visible inward-carry audit keeps diagnostic boundaries traceable without moving cue text into visible replies.
- `reopen-persistence-project-awareness-audit.test.ts`: restored-session and browser-local recovery remain covered by route-level proof.
- `quick-reply-project-awareness-audit.test.ts`: quick-reply visible surfaces now hide fixed templates and internal diagnostic fields.
- The old project-brief proof surface has been removed.

## Next Audit Pass

Remove remaining model-visible cue fallbacks from the production files listed in
`docs/project-state-audit.md`.
