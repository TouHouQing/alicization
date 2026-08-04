import type { AlicizationPersistentPresenceAuthoritySnapshot } from '@proj-alicization/stage-shared'

import type {
  AlicizationChatErrorEvent,
  AlicizationChatFinishEvent,
  AlicizationChatStreamChunkEvent,
  AlicizationMemoryRecallProbeConfidencePolicy,
  AlicizationMemoryRecallProbeEvidenceKind,
  AlicizationMemoryRecallProbeEvidenceVisibility,
  AlicizationMemoryRecallProbeMode,
  AlicizationMemoryRecallProbeResult,
  AlicizationMemoryRecallProbeTemporalFocus,
  AlicizationMemoryWorkbenchSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './eventa'

type Expect<T extends true> = T
type Extends<T, U> = T extends U ? true : false

const chatChunkOrigin: Expect<Extends<
  AlicizationChatStreamChunkEvent['origin'],
  'provider' | 'failure-surface' | 'authorization-surface' | undefined
>> = true
const chatChunkLearningPolicy: Expect<Extends<
  AlicizationChatStreamChunkEvent['learningPolicy'],
  {
    allowLongTermCondensation: boolean
    allowPersonaLearning: boolean
    allowTraining: boolean
  } | undefined
>> = true
const chatFinishFailureSurface: Expect<Extends<
  AlicizationChatFinishEvent['failureSurface'],
  { kind: string, origin: 'failure-surface' } | null | undefined
>> = true
const chatErrorFailureSurface: Expect<Extends<
  AlicizationChatErrorEvent['failureSurface'],
  { kind: string, origin: 'failure-surface' } | null | undefined
>> = true

const authorityFields: AlicizationPersistentPresenceAuthoritySnapshot = {} as AlicizationVisualPresenceStateSnapshot

void chatChunkOrigin
void chatChunkLearningPolicy
void chatFinishFailureSurface
void chatErrorFailureSurface
void authorityFields

const memoryWorkbenchSnapshot: AlicizationMemoryWorkbenchSnapshot = {
  cardId: 'default',
  sessionId: 'session-1',
  updatedAt: 1,
  workingMemory: {
    cardId: 'default',
    sessionId: 'session-1',
    updatedAt: 1,
    threadTitle: 'Phase 1 memory contracts',
    threadMode: 'implementation',
    currentUserMove: 'tighten reviewer feedback',
    activeTask: 'shared eventa contracts',
    taskStatus: 'review-fix',
    unresolvedQuestions: ['Should review kind stay bounded?'],
    commitments: ['Only touch shared contracts'],
    userCorrections: ['Include correction candidates'],
    relationshipPosture: 'attuned',
    emotionalPosture: 'focused',
    queryHints: ['memory workbench', 'correction'],
    longTermQueue: [
      {
        id: 'candidate-1',
        kind: 'correction',
        summary: 'Host corrected the memory contract kind boundary.',
        reason: 'Reviewer identified existing correction candidate kind.',
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.88,
        allowTraining: false,
      },
    ],
    failureTurnIds: ['turn-1'],
  },
  longTerm: {
    total: 1,
    byKind: {
      correction: 1,
    },
    items: [
      {
        id: 'memory-1',
        kind: 'correction',
        summary: 'Correction memories are first-class workbench rows.',
        evidenceSnippets: ['kind: correction'],
        sourceIds: ['candidate-1'],
        confidence: 0.86,
        salience: 0.8,
        sensitivity: 'personal',
        visibility: 'explicit',
        training: 'blocked',
        source: 'working-memory',
        createdAt: 1,
        updatedAt: 1,
        lastAccessedAt: null,
        tombstoned: false,
      },
    ],
  },
  review: {
    pending: 1,
    items: [
      {
        id: 'review-1',
        transactionId: 'transaction-1',
        status: 'pending',
        kind: 'correction',
        summary: 'Review queue can carry correction candidates.',
        evidenceSnippets: ['review correction'],
        reviewReasons: ['bounded kind coverage'],
        sensitivity: 'personal',
        visibleMode: 'explicit',
        allowTraining: false,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
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
      vectorSpaceId: null,
      reindexRequired: false,
      indexMode: 'brute-force',
      approximate: false,
      degraded: true,
      nativeIndexReady: false,
      searchReady: false,
      lastError: null,
      canonicalCount: 0,
      indexedCount: 0,
      missingCount: 0,
      textHashMismatchCount: 0,
      staleOrFailedCount: 0,
      orphanedCount: 0,
      coverageRatio: null,
      reindexJob: null,
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
  evidence: [
    {
      id: 'memory-episode-1',
      kind: 'episode',
      summary: 'The host and Alicization played a game together.',
      source: 'long-term-memory',
      score: 0.76,
      visibleMode: 'tentative',
      queryMatches: ['打游戏'],
      rankReasons: ['episodic cue match'],
    },
  ],
  semantic: {
    available: false,
    modelId: null,
    dimensions: null,
    error: 'embedding provider is not configured',
  },
  latencyMs: 1,
  errors: [],
}

const recallMode: AlicizationMemoryRecallProbeMode = recallProbe.intent.mode
const temporalFocus: AlicizationMemoryRecallProbeTemporalFocus = recallProbe.intent.temporalFocus
const confidencePolicy: AlicizationMemoryRecallProbeConfidencePolicy = recallProbe.plan.confidencePolicy
const evidenceKind: AlicizationMemoryRecallProbeEvidenceKind = recallProbe.evidence[0].kind
const evidenceVisibility: AlicizationMemoryRecallProbeEvidenceVisibility = recallProbe.evidence[0].visibleMode

void memoryWorkbenchSnapshot
void recallProbe
void recallMode
void temporalFocus
void confidencePolicy
void evidenceKind
void evidenceVisibility

export type EventaSnapshotExtendsAuthority = Expect<
  Extends<AlicizationVisualPresenceStateSnapshot, AlicizationPersistentPresenceAuthoritySnapshot>
>
