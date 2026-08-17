# Alicization Memory Scale Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 完成长久记忆的 DB/索引级搜索、可恢复 embedding reindex、真实向量 adapter、card 隔离和 persona/LoRA 数据集治理。

**Architecture:** 以 `db.ts` 为 SQLite facade，新增 focused runtime 模块承载搜索投影、reindex job、vector adapter 和 dataset version。WorkingMemory、LongTermMemoryRecall 和 Memory Workbench 的 owner 边界不变；所有跨模块数据通过现有 Eventa/bridge 合同传递。

**Tech Stack:** Electron main process, Vue 3, TypeScript, SQLite3, FTS5, Vitest, Eventa, Pinia, pnpm.

---

## Task 1: 删除旧全局记忆并强制 card scope

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-consolidation-runtime.test.ts`

- [x] **Step 1: Add a failing schema isolation test**

Create an old-schema database with `memory_facts` and `memory_consolidations` but no `card_id`, open it through `setupAlicizationDb`, then assert the old rows are gone and new tables expose `card_id`.

- [x] **Step 2: Run the targeted test and verify the expected failure**

Run `pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "deletes legacy global memory"`.

- [x] **Step 3: Recreate both tables with card-scoped schemas**

During `initializeSchema`, inspect `PRAGMA table_info`. If either legacy table lacks `card_id`, delete dependent legacy vectors/policies/reviews, drop the two old tables, and create the new schemas. Use `UNIQUE(card_id, dedupe_key)` for facts and `UNIQUE(card_id, period_key, kind, facet)` for consolidations.

- [x] **Step 4: Thread `cardId` through every facts/consolidation facade**

Change `listMemoryFacts`, `retrieveMemoryFacts`, `upsertMemoryFacts`, `applyMemoryFactCorrections`, `listMemoryConsolidations`, and `searchMemoryConsolidations` to require card scope. Update runtime ports and all production call sites; tests may pass an explicit `default` card.

- [x] **Step 5: Make consolidation rebuild card-local**

`memory-consolidation-runtime.ts` receives `cardId`, filters rows by card, deletes only `WHERE card_id = ?`, inserts `card_id`, and never performs a global delete.

- [x] **Step 6: Run focused memory tests and commit**

Run the DB, consolidation, runtime memory, and recall tests listed in the plan. Commit with `fix(alicization): enforce card scoped long term memory`.

## Task 2: SQLite long-term search projection and keyset pagination

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-search-index.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-search-index.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-evidence.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/memory-workbench.test.ts`

- [x] **Step 1: Add failing tests for SQL pagination**

Insert more rows than the old source window across facts, reflections, episodes, and consolidations. Assert two DB cursor pages contain every item exactly once, and a query/filter only returns matching card-scoped rows.

- [x] **Step 2: Implement the projection tables**

Create `long_term_memory_search_documents` and an FTS5 table with explicit `card_id`, source, source id, kind, search text, sensitivity, timestamps, hash, and tombstone state. Upsert/delete projection rows in a transaction.

- [x] **Step 3: Implement cursor encoding and SQL keyset queries**

Use a versioned base64url cursor. Empty queries order by `(updated_at DESC, id ASC)`; FTS queries use BM25 rank followed by timestamp and id. Apply all filters in SQL and fetch `limit + 1`.

- [x] **Step 4: Rebuild the projection from card-scoped source rows**

Add `rebuildLongTermMemorySearchIndex({ cardId })` and call it after source writes and consolidation rebuilds. Provide a full-card reconcile path for repair and tests.

- [x] **Step 5: Route Workbench list and recall candidates through the index**

Remove source-window pagination from `listMemoryWorkbenchLongTermItems`. The returned DTO remains compatible, but every page is produced by the database query.

- [x] **Step 6: Verify and commit**

Run search-index, workbench, dialogue-loop, and long-term recall tests. Commit with `feat(alicization): add database long term memory search index`.

## Task 3: Durable asynchronous embedding reindex jobs

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-embedding-reindex-runtime.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-embedding-reindex-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`

- [x] **Step 1: Add failing state-machine tests**

Cover queued progress, lease recovery, cancellation, retry backoff, dead-letter transition, explicit dead-letter retry, and provider errors that remain visible in `lastError`.

- [x] **Step 2: Add job and item tables**

Create card-scoped job/item tables with status, attempt count, lease expiry, next retry, cancellation, error, and progress counters. Add indexes for claim order and status.

- [x] **Step 3: Implement claim/process/finalize transitions**

Claim bounded batches in a transaction, embed only claimed texts, upsert vector records, mark each item independently, and recalculate job counters from item rows.

- [x] **Step 4: Add startup crash recovery and worker lifecycle**

Reset expired leases on initialization and expose an idempotent `runNextReindexBatch`/`resumePendingJobs` hook from DB setup. Do not run an unbounded loop in the dialogue request.

- [x] **Step 5: Extend Eventa/bridge/store/UI**

Add start/status/cancel/retry-dead-letter actions and a progress DTO. UI displays queued/running/cancelled/completed/failed/dead-lettered states and provider errors in Chinese.

- [x] **Step 6: Verify and commit**

Run reindex runtime, DB, bridge/store, and page tests. Commit with `feat(alicization): make embedding reindex durable`.

## Task 4: Vector index adapter with truthful ANN capability

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-vector-index-adapter.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-vector-index-adapter.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-persistent-vector-store.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/electron.vite.config.ts`
- Modify: `apps/stage-tamagotchi/electron-builder.config.ts`
- Modify: `apps/stage-tamagotchi/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Add failing adapter contract tests**

Assert model/dimension/card isolation, adapter health, and that an unavailable native backend reports `brute-force` instead of pretending to be ANN.

- [x] **Step 2: Define the adapter contract and capability DTO**

Expose `initialize`, `upsert`, `delete`, `search`, `rebuild`, and `getHealth`, with `indexMode` and `approximate` fields.

- [x] **Step 3: Implement sqlite-vec adapter loading**

Load the packaged extension only when present and compatible. Keep the persistent row table as source of truth; synchronize the vector index from it. Use the existing exact store only as explicit degraded fallback.

- [x] **Step 4: Route recall and health through the adapter**

Remove direct persistent-store cosine scanning from the recall path. Health reports extension load errors, active model/dimensions, and fallback mode.

- [x] **Step 5: Verify packaging paths and commit**

Run adapter tests, node typecheck, and a macOS unpacked build smoke check. Commit with `feat(alicization): add vector index adapter`.

## Task 5: Persona/LoRA dataset version governance

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-runtime.ts`
- Create: `apps/stage-tamagotchi/src/main/services/alicization/persona-training-dataset-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/shared/eventa.ts`
- Modify: `packages/stage-ui/src/stores/alicization-bridge.ts`
- Modify: `packages/stage-ui/src/stores/alicization-memory-workbench.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime-invoke-handlers-memory.ts`
- Modify: `apps/stage-tamagotchi/src/renderer/pages/settings/memory/index.vue`
- Modify: `packages/i18n/src/locales/zh-Hans/settings.yaml`
- Modify: `packages/i18n/src/locales/en/settings.yaml`

- [x] **Step 1: Add failing governance tests**

Cover schema version, content hash dedupe, PII quarantine, consent gating, immutable export manifest, active version switch, and rollback.

- [x] **Step 2: Add dataset/version/example/export tables**

Store immutable dataset versions and examples with card scope, provenance, sensitivity, PII status, consent snapshot, and `allow_training`.

- [x] **Step 3: Implement cleaning and deterministic dedupe**

Only cleaned reflections and persona reinforcement can be staged. Raw transcript, failure artifacts, review queue items, fixed-template residue, and PII failures are quarantined.

- [x] **Step 4: Implement export and rollback**

Export only approved, consented, training-allowed examples with a manifest hash. Rollback changes the active version pointer and does not delete old versions.

- [x] **Step 5: Add Workbench controls and Chinese i18n**

Expose dataset version, consent, export, active version, and rollback state without triggering training. Keep candidate approval as policy only.

- [x] **Step 6: Verify and commit**

Run dataset, persona candidate, UI store/page, and typecheck tests. Commit with `feat(alicization): govern persona training datasets`.

## Task 6: End-to-end scale gates

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/memory-scale-governance.e2e.test.ts`
- Modify: `package.json` or the existing Alicization final-gate script only if required
- No unrelated production changes

- [x] **Step 1: Add cross-card and restart regression scenarios**

Prove card A data cannot leak into card B across facts, consolidation, search, vector, reindex, and persona export.

- [x] **Step 2: Add large-data pagination and job recovery scenarios**

Use a dataset larger than every previous source window. On restart, reclaim only jobs whose lease has expired; a still-valid lease remains owned by the previous worker identity. Verify recovery after lease expiry without duplicates or lost items.

- [x] **Step 3: Run final gates**

Run targeted Vitest suites, `pnpm test:alicization-final-gate`, both required typechecks, and `git diff --check`.

- [x] **Step 4: Request final code review**

Review the complete diff for scope leakage, false health reporting, accidental training, and data loss beyond the approved legacy cleanup.
