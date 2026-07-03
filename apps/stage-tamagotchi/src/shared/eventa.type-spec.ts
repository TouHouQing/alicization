import type { AlicizationPersistentPresenceAuthoritySnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './eventa'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

void authorityFields

const memoryWorkbenchSnapshot: AlicizationMemoryWorkbenchSnapshot = {
  cardId: 'default',
  sessionId: 'session-1',
  updatedAt: 1,
  workingMemory: null,
  longTerm: {
    total: 0,
    byKind: {},
    items: [],
  },
  review: {
    pending: 0,
    items: [],
  },
  health: {
    status: 'ok',
    queue: {
      pending: 0,
      review: 0,
      applied: 0,
      failed: 0,
      deadLettered: 0,
    },
    recall: {
      lastLatencyMs: null,
      p95LatencyMs: null,
      lastError: null,
    },
    embedding: {
      providerConfigured: false,
      modelId: null,
      dimensions: null,
      reindexRequired: false,
    },
    errors: [],
  },
}

const recallProbe: AlicizationMemoryRecallProbeResult = {
  query: '我们去打游戏吧',
  intent: {
    mode: 'episodic',
    shouldRecall: true,
    confidence: 0.8,
    rationale: 'shared episodic memory cue',
    temporalFocus: 'unspecified',
    riskFlags: [],
  },
  plan: {
    keywordQueries: ['我们去打游戏吧'],
    phraseQueries: ['打游戏'],
    charGramQueries: ['游戏'],
    semanticQueries: ['共同经历'],
    episodicQueries: ['一起做过的事情'],
    threadHints: [],
    negativeCues: [],
    confidencePolicy: 'direct',
  },
  evidence: [],
  latencyMs: 1,
  errors: [],
}

void memoryWorkbenchSnapshot
void recallProbe

export type EventaSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
