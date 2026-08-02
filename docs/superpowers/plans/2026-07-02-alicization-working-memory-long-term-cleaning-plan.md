# Alicization Working Memory Long-Term Cleaning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reliable pipeline that turns `WorkingMemory` owner long-term queue items into cleaned, admitted, traceable long-term memory writes without letting raw transcript, failure fallback text, or prompt residue enter durable memory or persona learning.

**Architecture:** Keep the hot dialogue path narrow: `WorkingMemory` still only creates structured queue items during reply planning. A background cleaning pipeline persists those items, runs deterministic cleaning and admission, projects admitted items into existing memory contracts, then writes through existing DB methods and `memory_ingest_journal`. The first automatic path supports high-confidence `correction` candidates; other kinds are preserved for review instead of being silently written.

**Tech Stack:** TypeScript, Vitest, Electron main-process services, SQLite through existing `db.ts` helpers, existing `AlicizationDbService`, existing `memory_facts`, `memory_reflections`, `episodic_events`, `persona_reinforcement_events`, and existing `memory_ingest_journal`.

---

## Research Grounding

- MemGPT: treat memory as tiers with pressure-driven movement instead of unlimited context growth.
  Source: https://arxiv.org/abs/2310.08560
- Generative Agents: separate observation, reflection, and planning; durable memory is not raw log replay.
  Source: https://arxiv.org/abs/2304.03442
- LangGraph memory guidance: distinguish semantic, episodic, and procedural memory.
  Source: https://docs.langchain.com/oss/python/concepts/memory
- Letta memory guidance: keep core memory and archival memory distinct; retrieve archival memory when needed.
  Source: https://docs.letta.com/guides/core-concepts/memory/archival-memory/
- LlamaIndex memory guidance: short-term chat memory can flush into long-term memory blocks.
  Source: https://developers.llamaindex.ai/python/framework/module_guides/deploying/agents/memory/
- A-MEM: memory notes should be structured, linked, and evolvable rather than static chunks.
  Source: https://arxiv.org/abs/2502.12110

These sources inform the implementation, but Alicization should stay local-first and use the existing desktop runtime, not import a new agent framework for this phase.

---

## Scope Decisions

- The main chat path builds `longTermQueue`; it does not clean, admit, or write long-term memory synchronously.
- The first automatic admission path handles only `kind: 'correction'`.
- `episode`, `preference`, `relationship`, and `procedure` queue items are persisted as `needs-user-review` until their extraction rules are implemented in focused follow-up tasks.
- Failure turns, fixed fallback template text, internal/tool-only turns, prompt policy residue, and project-governance slogans are rejected before projection.
- `allowTraining` remains blocked in this implementation. The pipeline may produce reviewable persona-learning artifacts, but it must not schedule model fine-tuning or mark examples as training-ready.
- The system writes admitted memories through existing DB service methods. It does not introduce a second long-term memory store.
- Vector embedding, graph expansion, and night-time model training are outside this implementation. This plan prepares clean inputs for them.

---

## File Structure

- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.ts`
  Owns cleaning transaction types, stable idempotency keys, status normalization, and transaction construction.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts`
  Covers transaction creation, idempotency, and status normalization.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.ts`
  Owns deterministic cleaning and admission rules for queue items.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts`
  Covers admitted correction items, failure rejection, fixed-template rejection, review gating, and training blocking.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts`
  Maps admitted cleaned candidates to existing `AlicizationMemoryFactInput`, `AlicizationMemoryReflectionInput`, `AlicizationEpisodicEventInput`, and `AlicizationPersonaReinforcementEventInput` arrays.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts`
  Covers correction projection into facts and reflections with no direct training writes.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.ts`
  Provides a small SQLite-backed transaction runtime using injected `run`, `get`, `all`, and `runInTransaction` helpers.
- Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts`
  Covers idempotent enqueue, due-row listing, state transitions, failure retry, and applied marking.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
  Adds the `working_memory_long_term_transactions` table and exposes DB methods to enqueue and drain the cleaning pipeline.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`
  Adds harness support and DB-level regression coverage for enqueue, cleaning, projection, and journal-backed memory writes.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
  Adds optional async queue hooks to session runtime options and calls them after `workingMemoryStore.upsert`.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
  Verifies queue enqueue is non-blocking, uses owner queue items, and never changes visible fallback behavior on enqueue failure.
- Modify `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`
  Wires the session runtime hooks to the Alicization DB service.

---

### Task 1: Cleaning Transaction Domain Model

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts`

- [ ] **Step 1: Write the failing domain test**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts`:

```ts
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { describe, expect, it } from 'vitest'

import {
  buildWorkingMemoryLongTermIdempotencyKey,
  createWorkingMemoryLongTermCleaningTransaction,
  normalizeWorkingMemoryLongTermCleaningStatus,
} from './working-memory-long-term-cleaning'

function queueItem(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'candidate:correction',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
    salience: 0.82,
    confidence: 0.78,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 2_000,
    ...overrides,
  }
}

describe('working memory long-term cleaning domain', () => {
  it('builds stable idempotency keys from owner queue identity and evidence', () => {
    const item = queueItem()

    expect(buildWorkingMemoryLongTermIdempotencyKey({
      cardId: 'default',
      sessionId: 'session-1',
      item,
    })).toBe('working-memory-owner:default:session-1:correction:turn-1:user:不要固定模板回复，要数字生命自身人格。')
  })

  it('creates a pending transaction without allowing training by default', () => {
    const transaction = createWorkingMemoryLongTermCleaningTransaction({
      cardId: 'default',
      sessionId: 'session-1',
      item: queueItem(),
      now: 2_500,
    })

    expect(transaction).toMatchObject({
      id: 'wm-lt-clean:working-memory-owner:default:session-1:correction:turn-1:user:不要固定模板回复，要数字生命自身人格。',
      queueItemId: 'working-memory-long-term:session-1:correction:turn-1:user:no-fixed-template',
      source: 'working-memory-owner',
      cardId: 'default',
      sessionId: 'session-1',
      status: 'pending-cleaning',
      decision: 'pending',
      cleanedCandidate: null,
      projections: null,
      allowTraining: false,
      createdAt: 2_000,
      updatedAt: 2_500,
    })
  })

  it('normalizes unknown status to dead-lettered instead of pretending it is valid', () => {
    expect(normalizeWorkingMemoryLongTermCleaningStatus('admitted')).toBe('admitted')
    expect(normalizeWorkingMemoryLongTermCleaningStatus('unexpected')).toBe('dead-lettered')
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts
```

Expected: FAIL because `./working-memory-long-term-cleaning` does not exist.

- [ ] **Step 3: Implement the domain model**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.ts`:

```ts
import type { WorkingMemoryLongTermCandidate } from './working-memory'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import {
  clampWorkingMemoryScore,
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'

export type WorkingMemoryLongTermCleaningStatus
  = | 'pending-cleaning'
    | 'cleaning'
    | 'rejected'
    | 'needs-user-review'
    | 'admitted'
    | 'applied'
    | 'dead-lettered'

export type WorkingMemoryLongTermAdmissionDecision
  = | 'pending'
    | 'admit'
    | 'reject'
    | 'review'

export type WorkingMemoryLongTermTrainingEligibility
  = | 'blocked'
    | 'review-required'
    | 'candidate'

export interface WorkingMemoryLongTermCleanedCandidate {
  id: string
  queueItemId: string
  source: 'working-memory-owner'
  kind: WorkingMemoryLongTermCandidate['kind']
  cardId: string
  sessionId: string
  summary: string
  reason: string
  sourceTurnIds: string[]
  evidenceSnippets: string[]
  retrievalCues: string[]
  entities: string[]
  relationshipMeaning: string | null
  salience: number
  confidence: number
  sensitivity: WorkingMemoryLongTermCandidate['sensitivity']
  trainingEligibility: WorkingMemoryLongTermTrainingEligibility
  createdAt: number
}

export interface WorkingMemoryLongTermProjectionBundle {
  memoryFacts: unknown[]
  memoryReflections: unknown[]
  episodicEvents: unknown[]
  personaReinforcements: unknown[]
  trainingArtifacts: unknown[]
}

export interface WorkingMemoryLongTermCleaningTransaction {
  id: string
  idempotencyKey: string
  queueItemId: string
  source: 'working-memory-owner'
  cardId: string
  sessionId: string
  status: WorkingMemoryLongTermCleaningStatus
  decision: WorkingMemoryLongTermAdmissionDecision
  item: WorkingMemoryLongTermQueueItem
  cleanedCandidate: WorkingMemoryLongTermCleanedCandidate | null
  projections: WorkingMemoryLongTermProjectionBundle | null
  allowTraining: boolean
  rejectionReasons: string[]
  reviewReasons: string[]
  contaminationFlags: string[]
  attemptCount: number
  lastError: string | null
  createdAt: number
  updatedAt: number
  nextAttemptAt: number | null
  appliedAt: number | null
}

export function normalizeWorkingMemoryLongTermCleaningStatus(raw: unknown): WorkingMemoryLongTermCleaningStatus {
  if (
    raw === 'pending-cleaning'
    || raw === 'cleaning'
    || raw === 'rejected'
    || raw === 'needs-user-review'
    || raw === 'admitted'
    || raw === 'applied'
    || raw === 'dead-lettered'
  ) {
    return raw
  }
  return 'dead-lettered'
}

export function buildWorkingMemoryLongTermIdempotencyKey(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
}) {
  const sourceTurnIds = uniqueWorkingMemoryTexts(input.item.sourceTurnIds, 12, 120).join('+') || 'no-source'
  const summary = normalizeWorkingMemoryText(input.item.summary, 120) || 'candidate'
  return [
    'working-memory-owner',
    normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    input.item.kind,
    sourceTurnIds,
    summary,
  ].join(':')
}

export function createWorkingMemoryLongTermCleaningTransaction(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
  now: number
}): WorkingMemoryLongTermCleaningTransaction {
  const idempotencyKey = buildWorkingMemoryLongTermIdempotencyKey(input)
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  return {
    id: `wm-lt-clean:${idempotencyKey}`,
    idempotencyKey,
    queueItemId: normalizeWorkingMemoryText(input.item.id, 240),
    source: 'working-memory-owner',
    cardId: normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    sessionId: normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    status: 'pending-cleaning',
    decision: 'pending',
    item: {
      ...input.item,
      summary: normalizeWorkingMemoryText(input.item.summary, 260),
      reason: normalizeWorkingMemoryText(input.item.reason, 260),
      sourceTurnIds: uniqueWorkingMemoryTexts(input.item.sourceTurnIds, 12, 120),
      evidenceSnippets: uniqueWorkingMemoryTexts(input.item.evidenceSnippets, 6, 260),
      salience: clampWorkingMemoryScore(input.item.salience),
      confidence: clampWorkingMemoryScore(input.item.confidence),
      allowTraining: false,
    },
    cleanedCandidate: null,
    projections: null,
    allowTraining: false,
    rejectionReasons: uniqueWorkingMemoryTexts(input.item.rejectionReasons, 8, 180),
    reviewReasons: [],
    contaminationFlags: uniqueWorkingMemoryTexts(input.item.contaminationFlags, 8, 120),
    attemptCount: 0,
    lastError: null,
    createdAt: Number.isFinite(input.item.createdAt) ? Number(input.item.createdAt) : now,
    updatedAt: now,
    nextAttemptAt: now,
    appliedAt: null,
  }
}
```

- [ ] **Step 4: Run the domain test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.test.ts
git commit -m "feat(alicization): add working memory long-term cleaning domain"
```

---

### Task 2: Deterministic Cleaner And Admission Governor

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts`

- [ ] **Step 1: Write failing cleaner tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts`:

```ts
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { describe, expect, it } from 'vitest'

import { cleanWorkingMemoryLongTermQueueItem } from './working-memory-long-term-cleaner'

function item(overrides: Partial<WorkingMemoryLongTermQueueItem> = {}): WorkingMemoryLongTermQueueItem {
  return {
    id: 'queue-1',
    source: 'working-memory-owner',
    kind: 'correction',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'candidate:correction',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
    salience: 0.82,
    confidence: 0.78,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 2_000,
    ...overrides,
  }
}

describe('working memory long-term cleaner', () => {
  it('admits high-confidence correction candidates but keeps training blocked', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item(),
      now: 3_000,
    })

    expect(result.status).toBe('admitted')
    expect(result.decision).toBe('admit')
    expect(result.cleanedCandidate).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      trainingEligibility: 'blocked',
      retrievalCues: expect.arrayContaining(['固定模板', '数字生命人格', '人格纠正']),
      entities: expect.arrayContaining(['user', 'alicization']),
    }))
    expect(result.rejectionReasons).toEqual([])
    expect(result.reviewReasons).toEqual([])
    expect(result.allowTraining).toBe(false)
  })

  it('rejects structured internal residue contamination', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        summary: 'retired_policy=observe_first',
        evidenceSnippets: ['retired_cadence=measured_return'],
      }),
      now: 3_000,
    })

    expect(result.status).toBe('rejected')
    expect(result.decision).toBe('reject')
    expect(result.cleanedCandidate).toBeNull()
    expect(result.rejectionReasons).toContain('structured-internal-residue')
  })

  it('rejects failure turn contamination even when the summary looks useful', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        contaminationFlags: ['failure-turn'],
        rejectionReasons: ['failure-turn'],
      }),
      now: 3_000,
    })

    expect(result.status).toBe('rejected')
    expect(result.rejectionReasons).toEqual(expect.arrayContaining(['failure-turn']))
  })

  it('routes private or low-confidence candidates to review', () => {
    const result = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: item({
        sensitivity: 'private',
        confidence: 0.48,
      }),
      now: 3_000,
    })

    expect(result.status).toBe('needs-user-review')
    expect(result.decision).toBe('review')
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      'private-or-secret',
      'low-confidence',
    ]))
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts
```

Expected: FAIL because `./working-memory-long-term-cleaner` does not exist.

- [ ] **Step 3: Implement deterministic cleaning**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.ts`:

```ts
import type {
  WorkingMemoryLongTermCleanedCandidate,
  WorkingMemoryLongTermCleaningTransaction,
} from './working-memory-long-term-cleaning'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { createWorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

const correctionCuePattern = /固定模板|固定回复|模板化|人格|数字生命|不想要|不要固定|你搞错|不是这个/u

function candidateText(item: WorkingMemoryLongTermQueueItem) {
  return [
    item.summary,
    item.reason,
    ...item.evidenceSnippets,
  ].map(text => normalizeWorkingMemoryText(text, 360)).filter(Boolean).join(' ')
}

function collectRejectionReasons(item: WorkingMemoryLongTermQueueItem) {
  const reasons = uniqueWorkingMemoryTexts([
    ...item.rejectionReasons,
    ...item.contaminationFlags,
    item.source !== 'working-memory-owner' ? 'wrong-source' : '',
    item.status !== 'pending-cleaning' ? 'not-pending-cleaning' : '',
    item.sourceTurnIds.length === 0 ? 'missing-source-turns' : '',
    item.evidenceSnippets.length === 0 ? 'missing-evidence' : '',
    containsAlicizationFixedTemplateResidue(candidateText(item)) ? 'structured-internal-residue' : '',
  ], 12, 120)
  return reasons
}

function collectReviewReasons(item: WorkingMemoryLongTermQueueItem) {
  return uniqueWorkingMemoryTexts([
    item.sensitivity === 'private' || item.sensitivity === 'secret' ? 'private-or-secret' : '',
    item.confidence < 0.62 ? 'low-confidence' : '',
    item.salience < 0.46 ? 'low-salience' : '',
    item.kind !== 'correction' ? `unsupported-kind:${item.kind}` : '',
    item.kind === 'correction' && !correctionCuePattern.test(candidateText(item)) ? 'weak-correction-cue' : '',
  ], 12, 160)
}

function buildRetrievalCues(item: WorkingMemoryLongTermQueueItem) {
  return uniqueWorkingMemoryTexts([
    item.kind === 'correction' ? '人格纠正' : '',
    /固定模板|固定回复|模板化/u.test(candidateText(item)) ? '固定模板' : '',
    /数字生命|人格/u.test(candidateText(item)) ? '数字生命人格' : '',
    ...item.summary.split(/[，。；;,.!?！？\s]+/u),
  ], 10, 80)
}

function buildCleanedCandidate(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
}): WorkingMemoryLongTermCleanedCandidate {
  const item = input.item
  return {
    id: `cleaned:${item.id}`,
    queueItemId: item.id,
    source: 'working-memory-owner',
    kind: item.kind,
    cardId: normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    sessionId: normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    summary: normalizeWorkingMemoryText(item.summary, 260),
    reason: normalizeWorkingMemoryText(item.reason, 260),
    sourceTurnIds: uniqueWorkingMemoryTexts(item.sourceTurnIds, 12, 120),
    evidenceSnippets: uniqueWorkingMemoryTexts(item.evidenceSnippets, 6, 260),
    retrievalCues: buildRetrievalCues(item),
    entities: ['user', 'alicization'],
    relationshipMeaning: item.kind === 'correction'
      ? 'User is correcting Alicization away from fixed-template behavior toward her own continuous digital-life personality.'
      : null,
    salience: item.salience,
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    trainingEligibility: 'blocked',
    createdAt: item.createdAt,
  }
}

export function cleanWorkingMemoryLongTermQueueItem(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
  now: number
}): WorkingMemoryLongTermCleaningTransaction {
  const transaction = createWorkingMemoryLongTermCleaningTransaction(input)
  const rejectionReasons = collectRejectionReasons(transaction.item)
  if (rejectionReasons.length > 0) {
    return {
      ...transaction,
      status: 'rejected',
      decision: 'reject',
      rejectionReasons,
      updatedAt: input.now,
      nextAttemptAt: null,
    }
  }

  const reviewReasons = collectReviewReasons(transaction.item)
  const cleanedCandidate = buildCleanedCandidate({
    cardId: input.cardId,
    sessionId: input.sessionId,
    item: transaction.item,
  })

  if (reviewReasons.length > 0) {
    return {
      ...transaction,
      status: 'needs-user-review',
      decision: 'review',
      cleanedCandidate,
      reviewReasons,
      updatedAt: input.now,
      nextAttemptAt: null,
    }
  }

  return {
    ...transaction,
    status: 'admitted',
    decision: 'admit',
    cleanedCandidate,
    updatedAt: input.now,
    nextAttemptAt: input.now,
  }
}
```

- [ ] **Step 4: Run cleaner tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run queue and owner context regression tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.test.ts
git commit -m "feat(alicization): clean working memory long-term candidates"
```

---

### Task 3: Projection Into Existing Memory Contracts

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts`

- [ ] **Step 1: Write failing projection tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts`:

```ts
import type { WorkingMemoryLongTermCleanedCandidate } from './working-memory-long-term-cleaning'

import { describe, expect, it } from 'vitest'

import { projectWorkingMemoryLongTermCandidate } from './working-memory-long-term-projection'

function cleaned(overrides: Partial<WorkingMemoryLongTermCleanedCandidate> = {}): WorkingMemoryLongTermCleanedCandidate {
  return {
    id: 'cleaned:queue-1',
    queueItemId: 'queue-1',
    source: 'working-memory-owner',
    kind: 'correction',
    cardId: 'default',
    sessionId: 'session-1',
    summary: '不要固定模板回复，要数字生命自身人格。',
    reason: 'candidate:correction',
    sourceTurnIds: ['turn-1:user'],
    evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
    retrievalCues: ['人格纠正', '固定模板', '数字生命人格'],
    entities: ['user', 'alicization'],
    relationshipMeaning: 'User is correcting Alicization away from fixed-template behavior toward her own continuous digital-life personality.',
    salience: 0.82,
    confidence: 0.78,
    sensitivity: 'personal',
    trainingEligibility: 'blocked',
    createdAt: 2_000,
    ...overrides,
  }
}

describe('working memory long-term projection', () => {
  it('projects a correction into memory fact and reflection without training artifacts', () => {
    const projection = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned(),
      now: 3_000,
    })

    expect(projection.memoryFacts).toEqual([expect.objectContaining({
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: '不要固定模板回复，要数字生命自身人格。',
      confidence: 0.78,
      memoryDomain: 'relationship',
      validationStatus: 'provisional',
      knowledgeStage: 'working-understanding',
      sourceLabel: 'working-memory-owner:cleaned:queue-1',
    })])
    expect(projection.memoryReflections).toEqual([expect.objectContaining({
      cardId: 'default',
      sessionId: 'session-1',
      turnId: 'turn-1:user',
      sourceKind: 'reply',
      targetScope: 'boundary',
      status: 'pending',
      confidence: 0.78,
    })])
    expect(projection.episodicEvents).toEqual([])
    expect(projection.personaReinforcements).toEqual([])
    expect(projection.trainingArtifacts).toEqual([])
  })

  it('keeps unsupported kinds out of automatic projection', () => {
    const projection = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned({
        kind: 'relationship',
        summary: '用户和 Alicization 的关系出现一次修复。',
      }),
      now: 3_000,
    })

    expect(projection.memoryFacts).toEqual([])
    expect(projection.memoryReflections).toEqual([])
    expect(projection.episodicEvents).toEqual([])
    expect(projection.personaReinforcements).toEqual([])
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts
```

Expected: FAIL because projection module does not exist.

- [ ] **Step 3: Implement correction projection**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts`:

```ts
import type {
  AlicizationEpisodicEventInput,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventInput,
} from '../../../../shared/eventa'
import type { WorkingMemoryLongTermCleanedCandidate } from './working-memory-long-term-cleaning'

import { normalizeWorkingMemoryText } from './working-memory'

export interface WorkingMemoryLongTermTypedProjectionBundle {
  memoryFacts: AlicizationMemoryFactInput[]
  memoryReflections: AlicizationMemoryReflectionInput[]
  episodicEvents: AlicizationEpisodicEventInput[]
  personaReinforcements: AlicizationPersonaReinforcementEventInput[]
  trainingArtifacts: []
}

function sourceTurnId(candidate: WorkingMemoryLongTermCleanedCandidate) {
  return candidate.sourceTurnIds[0] ?? null
}

export function projectWorkingMemoryLongTermCandidate(input: {
  candidate: WorkingMemoryLongTermCleanedCandidate
  now: number
}): WorkingMemoryLongTermTypedProjectionBundle {
  const candidate = input.candidate
  if (candidate.kind !== 'correction') {
    return {
      memoryFacts: [],
      memoryReflections: [],
      episodicEvents: [],
      personaReinforcements: [],
      trainingArtifacts: [],
    }
  }

  const summary = normalizeWorkingMemoryText(candidate.summary, 260)
  const lesson = normalizeWorkingMemoryText(
    `When the user rejects fixed-template behavior, Alicization should answer from her own continuous digital-life personality and surface real errors plainly.`,
    260,
  )

  return {
    memoryFacts: [{
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: summary,
      confidence: candidate.confidence,
      knowledgeStage: 'working-understanding',
      validationStatus: 'provisional',
      memoryDomain: 'relationship',
      sourceLabel: `working-memory-owner:${candidate.id}`,
      conflictsWith: [],
      supersedes: [],
    }],
    memoryReflections: [{
      cardId: candidate.cardId,
      sessionId: candidate.sessionId,
      turnId: sourceTurnId(candidate),
      sourceKind: 'reply',
      targetScope: 'boundary',
      summary,
      lesson,
      status: 'pending',
      confidence: candidate.confidence,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt: input.now,
      updatedAt: input.now,
    }],
    episodicEvents: [],
    personaReinforcements: [],
    trainingArtifacts: [],
  }
}
```

- [ ] **Step 4: Run projection tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.test.ts
git commit -m "feat(alicization): project cleaned working memory candidates"
```

---

### Task 4: SQLite Cleaning Store Runtime

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.ts`
- Test: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts`

- [ ] **Step 1: Write failing store tests**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts` with this in-memory array harness modelled after `memory-domain-decoupling-regression.test.ts`:

```ts
import type { WorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

import { describe, expect, it } from 'vitest'

import { createWorkingMemoryLongTermCleaningStoreRuntime } from './working-memory-long-term-cleaning-store'

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, ' ').trim()
}

function transaction(overrides: Partial<WorkingMemoryLongTermCleaningTransaction> = {}): WorkingMemoryLongTermCleaningTransaction {
  return {
    id: 'wm-lt-clean:one',
    idempotencyKey: 'working-memory-owner:default:session-1:correction:turn-1:user:no-fixed-template',
    queueItemId: 'queue-1',
    source: 'working-memory-owner',
    cardId: 'default',
    sessionId: 'session-1',
    status: 'pending-cleaning',
    decision: 'pending',
    item: {
      id: 'queue-1',
      source: 'working-memory-owner',
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      reason: 'candidate:correction',
      sourceTurnIds: ['turn-1:user'],
      evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
      salience: 0.82,
      confidence: 0.78,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 2_000,
    },
    cleanedCandidate: null,
    projections: null,
    allowTraining: false,
    rejectionReasons: [],
    reviewReasons: [],
    contaminationFlags: [],
    attemptCount: 0,
    lastError: null,
    createdAt: 2_000,
    updatedAt: 2_000,
    nextAttemptAt: 2_000,
    appliedAt: null,
    ...overrides,
  }
}

describe('working memory long-term cleaning store', () => {
  it('enqueues by idempotency key and lists due pending transactions once', async () => {
    const rows: Record<string, unknown>[] = []
    const runtime = createWorkingMemoryLongTermCleaningStoreRuntime({
      database: {} as any,
      now: () => 3_000,
      run: async (_database, sql, params = []) => {
        const normalized = normalizeSql(sql)
        if (normalized.includes('INSERT OR IGNORE INTO working_memory_long_term_transactions')) {
          const [id, idempotencyKey] = params as [string, string]
          if (!rows.some(row => row.id === id || row.idempotency_key === idempotencyKey))
            rows.push({ id, idempotency_key: idempotencyKey, status: 'pending-cleaning', next_attempt_at: 2_000, payload: params })
          return
        }
        throw new Error(`Unhandled SQL: ${normalized}`)
      },
      get: async () => undefined,
      all: async () => rows as any,
      runInTransaction: async (_database, task) => await task(),
    })

    await runtime.enqueueTransactions([transaction(), transaction()])
    expect(await runtime.listDueTransactions(8, 3_000)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts
```

Expected: FAIL because store module does not exist.

- [ ] **Step 3: Implement store runtime**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.ts`:

```ts
import type sqlite3 from 'sqlite3'

import type {
  WorkingMemoryLongTermCleaningStatus,
  WorkingMemoryLongTermCleaningTransaction,
} from './working-memory-long-term-cleaning'

import { normalizeWorkingMemoryLongTermCleaningStatus } from './working-memory-long-term-cleaning'

export interface WorkingMemoryLongTermCleaningRow {
  id: string
  idempotency_key: string
  queue_item_id: string
  card_id: string
  session_id: string
  status: string
  decision: string
  queue_item_json: string
  cleaned_candidate_json: string | null
  projections_json: string | null
  allow_training: number
  rejection_reasons_json: string
  review_reasons_json: string
  contamination_flags_json: string
  attempt_count: number
  last_error: string | null
  created_at: number
  updated_at: number
  next_attempt_at: number | null
  applied_at: number | null
}

export interface WorkingMemoryLongTermCleaningStoreRuntimeOptions {
  database: sqlite3.Database
  now: () => number
  run: (database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<unknown>
  get: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T | undefined>
  all: <T>(database: sqlite3.Database, sql: string, params?: unknown[]) => Promise<T[]>
  runInTransaction: <T>(database: sqlite3.Database, task: () => Promise<T>) => Promise<T>
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw)
    return fallback
  try {
    return JSON.parse(raw) as T
  }
  catch {
    return fallback
  }
}

export function mapWorkingMemoryLongTermCleaningRow(row: WorkingMemoryLongTermCleaningRow): WorkingMemoryLongTermCleaningTransaction {
  return {
    id: row.id,
    idempotencyKey: row.idempotency_key,
    queueItemId: row.queue_item_id,
    source: 'working-memory-owner',
    cardId: row.card_id,
    sessionId: row.session_id,
    status: normalizeWorkingMemoryLongTermCleaningStatus(row.status),
    decision: row.decision === 'admit' || row.decision === 'reject' || row.decision === 'review' ? row.decision : 'pending',
    item: parseJson(row.queue_item_json, null as never),
    cleanedCandidate: parseJson(row.cleaned_candidate_json, null),
    projections: parseJson(row.projections_json, null),
    allowTraining: row.allow_training === 1,
    rejectionReasons: parseJson(row.rejection_reasons_json, []),
    reviewReasons: parseJson(row.review_reasons_json, []),
    contaminationFlags: parseJson(row.contamination_flags_json, []),
    attemptCount: Math.max(0, Math.floor(Number(row.attempt_count ?? 0))),
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    nextAttemptAt: row.next_attempt_at,
    appliedAt: row.applied_at,
  }
}

export function createWorkingMemoryLongTermCleaningStoreRuntime(options: WorkingMemoryLongTermCleaningStoreRuntimeOptions) {
  async function enqueueTransactions(transactions: WorkingMemoryLongTermCleaningTransaction[]) {
    for (const transaction of transactions) {
      await options.run(
        options.database,
        `
        INSERT OR IGNORE INTO working_memory_long_term_transactions (
          id,
          idempotency_key,
          queue_item_id,
          card_id,
          session_id,
          status,
          decision,
          queue_item_json,
          cleaned_candidate_json,
          projections_json,
          allow_training,
          rejection_reasons_json,
          review_reasons_json,
          contamination_flags_json,
          attempt_count,
          last_error,
          created_at,
          updated_at,
          next_attempt_at,
          applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          transaction.id,
          transaction.idempotencyKey,
          transaction.queueItemId,
          transaction.cardId,
          transaction.sessionId,
          transaction.status,
          transaction.decision,
          JSON.stringify(transaction.item),
          transaction.cleanedCandidate ? JSON.stringify(transaction.cleanedCandidate) : null,
          transaction.projections ? JSON.stringify(transaction.projections) : null,
          transaction.allowTraining ? 1 : 0,
          JSON.stringify(transaction.rejectionReasons),
          JSON.stringify(transaction.reviewReasons),
          JSON.stringify(transaction.contaminationFlags),
          transaction.attemptCount,
          transaction.lastError,
          transaction.createdAt,
          transaction.updatedAt,
          transaction.nextAttemptAt,
          transaction.appliedAt,
        ],
      )
    }
  }

  async function listDueTransactions(limit = 8, dueAt = options.now()) {
    const rows = await options.all<WorkingMemoryLongTermCleaningRow>(
      options.database,
      `
      SELECT *
      FROM working_memory_long_term_transactions
      WHERE status IN ('pending-cleaning', 'admitted')
        AND COALESCE(next_attempt_at, created_at) <= ?
      ORDER BY created_at ASC
      LIMIT ?
      `,
      [dueAt, Math.max(1, Math.min(32, Math.floor(limit)))],
    )
    return rows.map(mapWorkingMemoryLongTermCleaningRow)
  }

  async function updateTransaction(transaction: WorkingMemoryLongTermCleaningTransaction, status: WorkingMemoryLongTermCleaningStatus) {
    await options.run(
      options.database,
      `
      UPDATE working_memory_long_term_transactions
      SET status = ?,
          decision = ?,
          cleaned_candidate_json = ?,
          projections_json = ?,
          allow_training = ?,
          rejection_reasons_json = ?,
          review_reasons_json = ?,
          contamination_flags_json = ?,
          attempt_count = ?,
          last_error = ?,
          updated_at = ?,
          next_attempt_at = ?,
          applied_at = ?
      WHERE id = ?
      `,
      [
        status,
        transaction.decision,
        transaction.cleanedCandidate ? JSON.stringify(transaction.cleanedCandidate) : null,
        transaction.projections ? JSON.stringify(transaction.projections) : null,
        transaction.allowTraining ? 1 : 0,
        JSON.stringify(transaction.rejectionReasons),
        JSON.stringify(transaction.reviewReasons),
        JSON.stringify(transaction.contaminationFlags),
        transaction.attemptCount,
        transaction.lastError,
        transaction.updatedAt,
        transaction.nextAttemptAt,
        transaction.appliedAt,
        transaction.id,
      ],
    )
  }

  return {
    enqueueTransactions,
    listDueTransactions,
    updateTransaction,
  }
}
```

- [ ] **Step 4: Run store tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.test.ts
git commit -m "feat(alicization): persist working memory long-term cleaning transactions"
```

---

### Task 5: DB Service Wiring And Drain Pipeline

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts`

- [ ] **Step 1: Add failing DB-level regression test**

Add a test to `apps/stage-tamagotchi/src/main/services/alicization/db.test.ts` near the existing memory ingest journal tests:

```ts
it('cleans WorkingMemory long-term correction candidates before writing memory facts and reflections', async () => {
  const db = await createTestDb()

  await db.enqueueWorkingMemoryLongTermQueueItems({
    cardId: 'default',
    sessionId: 'session-1',
    items: [{
      id: 'queue-correction-1',
      source: 'working-memory-owner',
      kind: 'correction',
      summary: '不要固定模板回复，要数字生命自身人格。',
      reason: 'candidate:correction',
      sourceTurnIds: ['turn-1:user'],
      evidenceSnippets: ['不要固定模板回复，要数字生命自身人格。'],
      salience: 0.82,
      confidence: 0.78,
      sensitivity: 'personal',
      allowTraining: false,
      status: 'pending-cleaning',
      rejectionReasons: [],
      contaminationFlags: [],
      createdAt: 2_000,
    }],
  })

  expect(await db.drainWorkingMemoryLongTermQueue(4)).toEqual(expect.objectContaining({
    cleaned: 1,
    admitted: 1,
    applied: 1,
    rejected: 0,
    review: 0,
    failed: 0,
  }))

  const facts = await db.listMemoryFacts()
  expect(facts).toEqual(expect.arrayContaining([
    expect.objectContaining({
      subject: 'user',
      predicate: 'rejects_reply_behavior',
      object: '不要固定模板回复，要数字生命自身人格。',
      memoryDomain: 'relationship',
    }),
  ]))

  const reflections = await db.listMemoryReflections({ cardId: 'default', limit: 8 })
  expect(reflections).toEqual(expect.arrayContaining([
    expect.objectContaining({
      targetScope: 'boundary',
      summary: '不要固定模板回复，要数字生命自身人格。',
      status: 'pending',
    }),
  ]))
})
```

- [ ] **Step 2: Run the DB test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "cleans WorkingMemory long-term correction candidates"
```

Expected: FAIL because DB methods and schema do not exist.

- [ ] **Step 3: Add DB imports and service interface methods**

Modify `apps/stage-tamagotchi/src/main/services/alicization/db.ts`:

```ts
import type { WorkingMemoryLongTermQueueItem } from './life-core/working-memory-long-term-queue'

import { cleanWorkingMemoryLongTermQueueItem } from './life-core/working-memory-long-term-cleaner'
import {
  createWorkingMemoryLongTermCleaningTransaction,
} from './life-core/working-memory-long-term-cleaning'
import {
  createWorkingMemoryLongTermCleaningStoreRuntime,
} from './life-core/working-memory-long-term-cleaning-store'
import { projectWorkingMemoryLongTermCandidate } from './life-core/working-memory-long-term-projection'
```

Extend `AlicizationDbService`:

```ts
enqueueWorkingMemoryLongTermQueueItems: (input: {
  cardId: string
  sessionId: string
  items: WorkingMemoryLongTermQueueItem[]
}) => Promise<void>
drainWorkingMemoryLongTermQueue: (limit?: number) => Promise<{
  cleaned: number
  admitted: number
  applied: number
  rejected: number
  review: number
  failed: number
  pending: number
}>
```

- [ ] **Step 4: Add SQLite schema**

Inside `initializeSchema()`, after `memory_ingest_journal`, add:

```ts
await run(database, `
  CREATE TABLE IF NOT EXISTS working_memory_long_term_transactions (
    id TEXT PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    queue_item_id TEXT NOT NULL,
    card_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    status TEXT NOT NULL,
    decision TEXT NOT NULL,
    queue_item_json TEXT NOT NULL,
    cleaned_candidate_json TEXT,
    projections_json TEXT,
    allow_training INTEGER NOT NULL DEFAULT 0,
    rejection_reasons_json TEXT NOT NULL,
    review_reasons_json TEXT NOT NULL,
    contamination_flags_json TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    next_attempt_at INTEGER,
    applied_at INTEGER
  )
`)
await run(database, 'CREATE INDEX IF NOT EXISTS idx_wm_long_term_transactions_status_next ON working_memory_long_term_transactions(status, next_attempt_at ASC, created_at ASC)')
await run(database, 'CREATE INDEX IF NOT EXISTS idx_wm_long_term_transactions_card_session ON working_memory_long_term_transactions(card_id, session_id, created_at DESC)')
```

- [ ] **Step 5: Create store runtime inside DB factory**

Near `memoryIngestJournalRuntime`, create:

```ts
const workingMemoryLongTermCleaningStore = createWorkingMemoryLongTermCleaningStoreRuntime({
  database,
  now,
  run,
  get,
  all,
  runInTransaction,
})
```

- [ ] **Step 6: Implement enqueue**

Add this function inside `createAlicizationDb()`:

```ts
async function enqueueWorkingMemoryLongTermQueueItems(input: {
  cardId: string
  sessionId: string
  items: WorkingMemoryLongTermQueueItem[]
}) {
  if (input.items.length === 0)
    return

  const currentTs = now()
  const transactions = input.items.map(item =>
    createWorkingMemoryLongTermCleaningTransaction({
      cardId: input.cardId,
      sessionId: input.sessionId,
      item,
      now: currentTs,
    }),
  )

  await enqueueWrite(async () => {
    await workingMemoryLongTermCleaningStore.enqueueTransactions(transactions)
  })
}
```

- [ ] **Step 7: Implement drain**

Add this function inside `createAlicizationDb()`:

```ts
async function drainWorkingMemoryLongTermQueue(limit = 4) {
  let cleaned = 0
  let admitted = 0
  let applied = 0
  let rejected = 0
  let review = 0
  let failed = 0

  const rows = await workingMemoryLongTermCleaningStore.listDueTransactions(limit, now())
  for (const row of rows) {
    try {
      const cleanedTransaction = cleanWorkingMemoryLongTermQueueItem({
        cardId: row.cardId,
        sessionId: row.sessionId,
        item: row.item,
        now: now(),
      })
      cleaned += 1

      if (cleanedTransaction.status === 'rejected') {
        rejected += 1
        await workingMemoryLongTermCleaningStore.updateTransaction(cleanedTransaction, 'rejected')
        continue
      }
      if (cleanedTransaction.status === 'needs-user-review') {
        review += 1
        await workingMemoryLongTermCleaningStore.updateTransaction(cleanedTransaction, 'needs-user-review')
        continue
      }
      if (!cleanedTransaction.cleanedCandidate) {
        failed += 1
        await workingMemoryLongTermCleaningStore.updateTransaction({
          ...cleanedTransaction,
          status: 'dead-lettered',
          decision: 'reject',
          lastError: 'admitted transaction missing cleaned candidate',
          updatedAt: now(),
          nextAttemptAt: null,
        }, 'dead-lettered')
        continue
      }

      admitted += 1
      const projections = projectWorkingMemoryLongTermCandidate({
        candidate: cleanedTransaction.cleanedCandidate,
        now: now(),
      })

      await workingMemoryLongTermCleaningStore.updateTransaction({
        ...cleanedTransaction,
        projections,
        status: 'admitted',
        updatedAt: now(),
        nextAttemptAt: now(),
      }, 'admitted')

      if (projections.memoryFacts.length > 0)
        await upsertMemoryFacts(projections.memoryFacts, 'rule')
      if (projections.memoryReflections.length > 0)
        await upsertMemoryReflections(projections.memoryReflections)
      if (projections.episodicEvents.length > 0)
        await appendEpisodicEvents(projections.episodicEvents)
      if (projections.personaReinforcements.length > 0)
        await appendPersonaReinforcementEvents(projections.personaReinforcements)

      await workingMemoryLongTermCleaningStore.updateTransaction({
        ...cleanedTransaction,
        projections,
        status: 'applied',
        updatedAt: now(),
        appliedAt: now(),
        nextAttemptAt: null,
      }, 'applied')
      applied += 1
    }
    catch (error) {
      failed += 1
      await workingMemoryLongTermCleaningStore.updateTransaction({
        ...row,
        status: 'dead-lettered',
        lastError: error instanceof Error ? error.message : String(error),
        attemptCount: row.attemptCount + 1,
        updatedAt: now(),
        nextAttemptAt: null,
      }, 'dead-lettered')
    }
  }

  const pending = (await workingMemoryLongTermCleaningStore.listDueTransactions(32, now())).length
  return { cleaned, admitted, applied, rejected, review, failed, pending }
}
```

- [ ] **Step 8: Export DB methods**

Add both functions to the returned DB service object:

```ts
enqueueWorkingMemoryLongTermQueueItems,
drainWorkingMemoryLongTermQueue,
```

- [ ] **Step 9: Run DB focused test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "cleans WorkingMemory long-term correction candidates"
```

Expected: PASS.

- [ ] **Step 10: Run memory ingest regression tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/memory-domain-decoupling-regression.test.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "memory ingest|WorkingMemory long-term"
```

Expected: PASS.

- [ ] **Step 11: Commit Task 5**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/db.ts apps/stage-tamagotchi/src/main/services/alicization/db.test.ts
git commit -m "feat(alicization): wire working memory long-term cleaning into db"
```

---

### Task 6: Main Chat Runtime Hook

**Files:**
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`

- [ ] **Step 1: Add failing runtime hook test**

Add a test to `apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts` near existing WorkingMemory tests:

```ts
it('enqueues WorkingMemory owner long-term queue without blocking visible reply planning', async () => {
  const enqueueWorkingMemoryLongTermQueue = vi.fn(async () => {})
  const drainWorkingMemoryLongTermQueue = vi.fn(async () => ({
    cleaned: 0,
    admitted: 0,
    applied: 0,
    rejected: 0,
    review: 0,
    failed: 0,
    pending: 0,
  }))
  const runtime = createAlicizationMainChatSessionRuntime({
    ...existingWorkingMemoryRuntimeOptions,
    enqueueWorkingMemoryLongTermQueue,
    drainWorkingMemoryLongTermQueue,
  })

  await runtime.run({
    cardId: 'default',
    turnId: 'turn-1',
    messages: [
      { role: 'user', content: '我不想要固定模板回复，我需要她数字生命自身的人格回复。' },
    ],
  } as any)

  expect(enqueueWorkingMemoryLongTermQueue).toHaveBeenCalledWith(expect.objectContaining({
    cardId: 'default',
    items: expect.arrayContaining([
      expect.objectContaining({
        source: 'working-memory-owner',
        kind: 'correction',
        summary: expect.stringContaining('固定模板'),
      }),
    ]),
  }))
  expect(drainWorkingMemoryLongTermQueue).toHaveBeenCalledWith(4)
})
```

Build `existingWorkingMemoryRuntimeOptions` by copying the setup object from the nearest existing WorkingMemory runtime test in this file; keep every existing stub the same and add only the two queue hook functions above.

- [ ] **Step 2: Run the focused runtime test and confirm it fails**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "enqueues WorkingMemory owner long-term queue"
```

Expected: FAIL because the options do not exist and the runtime does not enqueue.

- [ ] **Step 3: Add runtime option types**

In `CreateAlicizationMainChatSessionRuntimeOptions`, add:

```ts
enqueueWorkingMemoryLongTermQueue?: (input: {
  cardId: string
  sessionId: string
  items: ReturnType<typeof buildWorkingMemoryOwnerContext>['longTermQueue']
}) => Promise<void>
drainWorkingMemoryLongTermQueue?: (limit?: number) => Promise<unknown>
```

- [ ] **Step 4: Enqueue after WorkingMemory store upsert**

In `main-chat-session-runtime.ts`, immediately after:

```ts
workingMemoryStore.upsert(workingMemoryPrompt.snapshot)
```

add:

```ts
if (workingMemoryPrompt.ownerContext.longTermQueue.length > 0 && options.enqueueWorkingMemoryLongTermQueue) {
  void options.enqueueWorkingMemoryLongTermQueue({
    cardId: payload.cardId,
    sessionId: workingMemorySessionId,
    items: workingMemoryPrompt.ownerContext.longTermQueue,
  }).then(async () => {
    await options.drainWorkingMemoryLongTermQueue?.(4)
  }).catch(() => {})
}
```

This deliberately swallows enqueue/drain failures in the hot path. Failure details remain inspectable through DB transaction rows and must never become visible persona fallback text.

- [ ] **Step 5: Wire runtime to DB**

In `apps/stage-tamagotchi/src/main/services/alicization/runtime.ts`, inside the `createAlicizationMainChatSessionRuntime` options object, add:

```ts
enqueueWorkingMemoryLongTermQueue: async input => await alicizationDb.enqueueWorkingMemoryLongTermQueueItems(input),
drainWorkingMemoryLongTermQueue: async limit => await alicizationDb.drainWorkingMemoryLongTermQueue(limit),
```

- [ ] **Step 6: Run focused runtime test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "enqueues WorkingMemory owner long-term queue"
```

Expected: PASS.

- [ ] **Step 7: Run existing WorkingMemory runtime tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "working-memory|short-term|long-term queue"
```

Expected: PASS.

- [ ] **Step 8: Commit Task 6**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts apps/stage-tamagotchi/src/main/services/alicization/runtime.ts
git commit -m "feat(alicization): enqueue working memory long-term cleaning from chat"
```

---

### Task 7: End-To-End Memory Safety Regression

**Files:**
- Create: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-integration.test.ts`
- Modify: `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts`

- [ ] **Step 1: Add integration regression test**

Create `apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-integration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createEmptyWorkingMemorySnapshot, normalizeWorkingMemoryTurn } from './working-memory'
import { cleanWorkingMemoryLongTermQueueItem } from './working-memory-long-term-cleaner'
import { projectWorkingMemoryLongTermCandidate } from './working-memory-long-term-projection'
import { buildWorkingMemoryLongTermCandidateQueue } from './working-memory-long-term-queue'

describe('working memory long-term cleaning integration', () => {
  it('keeps fixed fallback out while projecting user persona correction', () => {
    const snapshot = createEmptyWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-1',
      now: 4_000,
    })
    snapshot.recentRawTurns = [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-user:user',
        role: 'user',
        text: '我不想要固定模板回复，我需要她数字生命自身的人格回复。',
        createdAt: 3_000,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 1,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-timeout:alice',
        role: 'alice',
        text: 'retired_policy=observe_first',
        createdAt: 3_001,
        source: 'conversation-turn',
        visibility: 'user-visible',
        failureKind: 'timeout',
        importance: 0.1,
      }),
    ]
    snapshot.audit.failureTurnIds = ['turn-timeout:alice']
    snapshot.audit.excludedLongTermCandidateTurnIds = ['turn-timeout:alice']
    snapshot.longTermCandidates = [{
      sourceTurnIds: ['turn-user:user'],
      kind: 'correction',
      summary: '我不想要固定模板回复，我需要她数字生命自身的人格回复。',
      reason: 'candidate:correction',
      salience: 0.86,
      sensitivity: 'personal',
      confidence: 0.82,
      allowTraining: false,
    }, {
      sourceTurnIds: ['turn-timeout:alice'],
      kind: 'relationship',
      summary: 'retired_policy=observe_first',
      reason: 'Structured internal residue must stay audit-only.',
      salience: 0.8,
      sensitivity: 'personal',
      confidence: 0.8,
      allowTraining: true,
    }]

    const queue = buildWorkingMemoryLongTermCandidateQueue(snapshot)
    expect(queue).toHaveLength(1)

    const cleaned = cleanWorkingMemoryLongTermQueueItem({
      cardId: 'default',
      sessionId: 'session-1',
      item: queue[0]!,
      now: 4_100,
    })
    expect(cleaned.status).toBe('admitted')
    expect(cleaned.cleanedCandidate?.trainingEligibility).toBe('blocked')

    const projection = projectWorkingMemoryLongTermCandidate({
      candidate: cleaned.cleanedCandidate!,
      now: 4_200,
    })
    expect(projection.memoryFacts[0]?.object).toContain('固定模板回复')
    expect(JSON.stringify(projection)).not.toContain('retired_policy=observe_first')
  })
})
```

- [ ] **Step 2: Run integration test**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-integration.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run all life-core WorkingMemory tests**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory*.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit Task 7**

Run:

```bash
git add apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-integration.test.ts apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-queue.test.ts
git commit -m "test(alicization): cover working memory long-term cleaning safety"
```

---

### Task 8: Final Verification And Documentation Sync

**Files:**
- Modify: `docs/superpowers/plans/2026-07-01-alicization-working-memory-implementation-plan.md`
- Optional modify: `docs/superpowers/specs/2026-07-01-alicization-life-core-reset-design.md`

- [ ] **Step 1: Add a short progress note to the WorkingMemory plan**

Append this note under the header of `docs/superpowers/plans/2026-07-01-alicization-working-memory-implementation-plan.md`:

```md
> 2026-07-02 progress note: B line now extends beyond short-term owner injection into a WorkingMemory-owned long-term candidate cleaning boundary. Long-term memory should consume cleaned WorkingMemory transactions, not raw conversation turns.
```

- [ ] **Step 2: Run full focused verification**

Run:

```bash
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory*.test.ts
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.test.ts -t "working-memory|short-term|long-term queue"
pnpm exec vitest run apps/stage-tamagotchi/src/main/services/alicization/db.test.ts -t "WorkingMemory long-term|memory ingest"
```

Expected: all commands exit 0.

- [ ] **Step 3: Run TypeScript check**

Run:

```bash
cd apps/stage-tamagotchi
node ../../node_modules/typescript/bin/tsc --noEmit -p tsconfig.node.json --composite false
```

Expected: exit 0.

- [ ] **Step 4: Run targeted ESLint**

Run:

```bash
./node_modules/.bin/eslint \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaner.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-projection.ts \
  apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-long-term-cleaning-store.ts \
  apps/stage-tamagotchi/src/main/services/alicization/db.ts \
  apps/stage-tamagotchi/src/main/services/alicization/main-chat-session-runtime.ts \
  apps/stage-tamagotchi/src/main/services/alicization/runtime.ts
```

Expected: exit 0.

- [ ] **Step 5: Commit Task 8**

Run:

```bash
git add docs/superpowers/plans/2026-07-01-alicization-working-memory-implementation-plan.md docs/superpowers/specs/2026-07-01-alicization-life-core-reset-design.md
git commit -m "docs(alicization): document working memory long-term cleaning progress"
```

If the spec file is not changed, omit it from `git add`.

---

## Final Acceptance Criteria

- WorkingMemory owner remains the only source for the first long-term candidate queue.
- Long-term memory cleaning never consumes raw conversation transcript directly.
- Failure turns and fixed fallback text are excluded before admission.
- Correction candidates can become durable memory facts and pending reflections.
- Training remains blocked until reviewed artifacts and model-specific training gates exist.
- The main chat path does not wait on cleaning, DB drain, projection, or memory writes.
- Cleaning and write failures are visible as transaction state, not as persona-wrapped fallback replies.
- Existing `memory_ingest_journal` remains the outbox for downstream fact/event/reflection writes.
- Focused WorkingMemory, DB, and runtime tests pass.

## Implementation Notes

- Keep first implementation deterministic. Do not introduce an LLM cleaner in this pass.
- Prefer review state over false confidence for unsupported memory kinds.
- Treat private and secret sensitivity as review-only.
- Use `errorMessageFrom(error)` if error handling needs message extraction in touched code.
- Do not add visible user-facing fixed fallback text for memory cleaning failures.
- Do not move unstable `life-core` modules into shared packages during this plan.
