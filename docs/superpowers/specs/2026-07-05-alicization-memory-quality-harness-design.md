# Alicization Memory Quality Harness Design

## Context

Alicization is in Phase 1: Local Digital Life. The memory system now has the main product loop in place:

- `WorkingMemory` owns short-term turn, task, correction, commitment, and long-term candidate state.
- `LongTermMemoryRecall` owns durable recall intent, query planning, evidence selection, and rank reasons.
- Memory Workbench is the user-visible governance surface for memory health, review policy, long-term search, embeddings, and persona candidates.
- Persistent vector search and an OpenAI-compatible embedding provider can participate in recall without replacing lexical and structured recall.

This is enough to be usable for early local testing, but it is not enough for quality and scale. The next phase must make memory behavior measurable, repeatable, and diagnosable before widening search volume, provider support, or persona learning.

## External Engineering Lessons

Recent agent memory systems converge on four useful patterns:

- Short-term memory should be thread-scoped state with clear ownership, not a global history pile.
- Long-term memory should be stored in inspectable namespaces or stores, with retrieval separated from the current working state.
- Agent quality work depends on traces and evals. Memory changes need replayable fixtures, observable rank reasons, and failure artifacts.
- Complex memory stacks should earn complexity through measured quality gains, not by adding another retrieval channel first.

These lessons match Alicization's charter. The quality phase should strengthen continuous personhood, explainability, and local sovereignty rather than turning memory into a hidden RAG subsystem.

## Goals

1. Create a Memory Quality Harness that can evaluate long-term recall with deterministic fixtures and real DB-backed recall paths.
2. Create a WorkingMemory Compression Harness that detects whether short-term memory compression drops current obligations, user corrections, commitments, or failure transparency.
3. Produce trace artifacts that explain why a memory was selected, rejected, withheld, or unavailable.
4. Feed quality summaries into Memory Workbench health without making Workbench the owner of memory semantics.
5. Establish metrics that future embedding, vector, pagination, search, and persona-candidate work must pass before entering the main path.

## Non-Goals

- Do not rewrite the memory architecture.
- Do not make Workbench the owner of short-term or long-term memory behavior.
- Do not train persona weights, publish persona samples, or treat approved persona candidates as automatic training data.
- Do not vectorize raw transcripts as a shortcut.
- Do not let review queue candidates count as confirmed long-term memory.
- Do not hide provider failures, timeout failures, harness failures, or tool failures behind fixed personality text.

## Architecture

The quality system has three layers.

### Layer 1: Deterministic Harnesses

`long-term-memory-harness.ts` remains the base for synthetic candidate fixtures. It should be expanded rather than replaced.

The first new runtime is `memory-quality-harness.ts`. It composes long-term harness results, DB-backed recall runs, semantic availability, tombstone and review policy checks, and latency metrics into one report.

The second new runtime is `working-memory-quality-harness.ts`. It evaluates WorkingMemory snapshots and compressed prompt views to ensure important short-term obligations survive compression.

### Layer 2: Trace Artifacts

Every harness run produces a trace artifact with enough evidence to debug memory behavior:

```ts
interface AlicizationMemoryQualityTrace {
  id: string
  fixtureId: string
  owner: 'WorkingMemory' | 'LongTermMemoryRecall'
  query: string
  intentMode: string | null
  queryPlan: {
    lexicalQueries: string[]
    phraseQueries: string[]
    semanticQueries: string[]
    threadHints: string[]
  }
  selectedIds: string[]
  rejectedIds: string[]
  forbiddenIds: string[]
  rankReasonsById: Record<string, string[]>
  semantic: {
    available: boolean
    providerId: string | null
    modelId: string | null
    dimensions: number | null
    reindexRequired: boolean
  }
  metrics: {
    recallAtK: number
    precisionAtK: number
    mrr: number
    ndcg: number
    falseRecallRate: number
    blockedLeakCount: number
    latencyMs: number
  }
  error: string | null
  createdAt: number
}
```

The trace is not a transcript and must not contain raw conversation text beyond bounded fixture query text and sanitized evidence snippets.

### Layer 3: Workbench Summary

Memory Workbench consumes aggregated quality summaries:

- latest harness run status
- failing fixture ids
- recall metrics
- WorkingMemory compression-loss metrics
- semantic provider health
- latency p95
- last explicit error

Workbench only displays and triggers quality actions. It does not decide recall ownership, compression policy, or persona training policy.

## Long-Term Recall Quality

The harness should cover these fixture classes first:

1. **Explicit relationship correction**
   - Query: "你还记得我不要固定模板回复吗？"
   - Expected: cleaned correction or reflection about fixed-template avoidance.
   - Forbidden: generic project progress memories.

2. **Shared episode recall**
   - Query: "我们去打游戏吧"
   - Expected: prior shared game episode if present.
   - Forbidden: unrelated entertainment or task memories.

3. **Task continuity**
   - Query: "继续上次那个开发任务"
   - Expected: current or recent task memory with thread fit.
   - Forbidden: high-lexical wrong-thread memory.

4. **Low-confidence protection**
   - Query asks about an ambiguous memory.
   - Expected: either no explicit memory or a tentative rank reason.
   - Forbidden: confident recall without evidence.

5. **Tombstone and review policy**
   - Tombstoned memories must not appear in selected ids.
   - Review-only candidates must not count as confirmed long-term memory.

6. **Semantic-only assistance**
   - Semantic score may improve ranking when provider/index are healthy.
   - Lexical and structured channels must still work when embeddings are unavailable.

Metrics:

- `recallAtK`
- `precisionAtK`
- `mrr`
- `ndcg`
- `falseRecallRate`
- `wrongThreadRate`
- `blockedLeakCount`
- `semanticHitRate`
- `sourceTraceRate`
- `p95LatencyMs`

## WorkingMemory Quality

WorkingMemory quality must evaluate the short-term owner as a live state machine, not as a summary paragraph.

The first fixtures should check:

- active task survives compression
- unresolved user question survives compression
- user correction survives compression
- assistant commitment survives compression
- provider/tool failure remains explicit
- relationship posture remains bounded and does not become a fixed template
- long-term candidates remain candidates and are not promoted as confirmed memories

Metrics:

- `obligationRetentionRate`
- `correctionRetentionRate`
- `commitmentRetentionRate`
- `failureTransparencyRetentionRate`
- `candidateBoundaryViolationCount`
- `compressionLossCount`

## DB-Backed Recall Path

Synthetic candidate tests are useful but not enough. The quality runtime must also support a real DB-backed mode that:

1. Seeds only cleaned long-term memory rows.
2. Optionally seeds vector rows using a deterministic test embedding provider.
3. Calls the same DB facade recall method used by the dialogue path.
4. Records query plan, evidence ids, rank reasons, semantic availability, and latency.
5. Verifies tombstone, review policy, and vector-space isolation.

This mode is the bridge between unit fixtures and real local user data behavior.

## Error Handling

Failures must remain visible:

- embedding provider unavailable -> report semantic unavailable and continue lexical/structured recall
- vector index stale -> report `reindexRequired=true`
- recall exception -> report error and mark fixture failed
- harness exception -> report harness failure
- timeout -> report timeout explicitly

No error path may produce a successful-looking memory quality result.

## Privacy And Training Boundaries

Quality traces must not become persona training data.

Allowed trace content:

- fixture ids
- memory ids
- rank reasons
- bounded sanitized query text
- sanitized evidence snippets
- metrics and error strings

Disallowed trace content:

- raw transcripts
- private unredacted snippets
- review queue candidates as confirmed memory
- persona training samples
- provider secrets

## Implementation Phases

### Phase 1: Harness Core

- Extend `long-term-memory-harness.ts` with `recallAtK`, `ndcg`, `wrongThreadRate`, `blockedLeakCount`, semantic hit data, and trace output.
- Add `working-memory-quality-harness.ts` with compression-loss fixtures.
- Add tests that fail on false recall, candidate boundary leaks, and dropped short-term obligations.

### Phase 2: DB-Backed Harness

- Add DB-backed fixture support with deterministic seeded memories.
- Add deterministic embedding provider fixtures.
- Verify semantic ranking, provider fallback, stale index behavior, and tombstone propagation.

### Phase 3: Workbench Aggregation

- Persist latest quality summary in the existing local metadata or a small quality table.
- Extend Memory Workbench health DTO with quality summary fields.
- Show latest status, failing fixture ids, and last error in `/settings/memory`.

### Phase 4: Scale Gates

- Make future recall/vector changes run the quality harness.
- Add a replay gate that blocks scale-sensitive memory changes when recall quality regresses.
- Keep thresholds conservative until enough local fixtures exist.

## Acceptance Criteria

- A developer can run targeted tests for long-term and WorkingMemory quality without Electron.
- Long-term fixture output explains selected ids, rejected ids, rank reasons, semantic state, latency, and errors.
- WorkingMemory fixture output detects compression loss for obligations, corrections, commitments, and failure transparency.
- Tombstoned memories and review-only candidates do not leak into selected confirmed recall.
- Embedding provider failure degrades explicitly and does not break lexical/structured recall.
- Workbench can later display quality status without taking ownership of memory behavior.
- The implementation is covered by focused Vitest tests and TypeScript typecheck.

## Open Follow-Ups

- Add a larger anonymized replay dataset after the harness shape stabilizes.
- Decide whether nightly local quality runs should be user-triggered, automatic idle work, or both.
- Add import/export for quality fixtures so users can share redacted regression packs.
