import type {
  AlicizationChatFailureKind,
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from '@proj-alicization/stage-shared'

export type AlicizationWorkingMemoryVersion = 'working-memory-v1'

export type WorkingMemoryTurnRole = 'user' | 'alice' | 'tool' | 'system'
export type WorkingMemoryTurnSource = 'conversation-turn' | 'tool-result' | 'runtime-event'
export type WorkingMemoryTurnVisibility = 'user-visible' | 'internal'
export type WorkingMemoryFailureKind = 'timeout' | 'provider-error' | 'tool-error' | 'abort'

export interface WorkingMemoryFailureSurface {
  kind: AlicizationChatFailureKind
  origin: 'failure-surface'
  allowLongTermCondensation: false
  allowPersonaLearning: false
  allowTraining: false
}

export interface WorkingMemoryTurn {
  turnId: string
  role: WorkingMemoryTurnRole
  text: string
  createdAt: number
  source: WorkingMemoryTurnSource
  visibility: WorkingMemoryTurnVisibility
  failureKind: WorkingMemoryFailureKind | null
  origin?: AlicizationVisibleArtifactOrigin | null
  learningPolicy?: AlicizationVisibleArtifactLearningPolicy | null
  failureSurface?: WorkingMemoryFailureSurface | null
  contaminated?: boolean
  importance: number
}

export interface WorkingMemoryEpisodelet {
  id: string
  sourceTurnIds: string[]
  summary: string
  thread: string | null
  unresolvedQuestions: string[]
  commitments: string[]
  corrections: string[]
  relationshipPosture: string | null
  emotionalPosture: string | null
  executionCarry: string | null
  importance: number
  createdAt: number
}

export interface WorkingMemoryThread {
  title: string
  currentUserMove: string
  currentAliceMove: string | null
  primaryAnchor: string | null
  mode: 'casual' | 'task' | 'repair' | 'execution' | 'reflection' | 'recollection'
  shouldHold: boolean
  confidence: number
}

export interface WorkingMemoryTask {
  summary: string
  status: 'active' | 'waiting-user' | 'waiting-tool' | 'blocked' | 'settled'
  evidenceTurnIds: string[]
}

export interface WorkingMemoryQuestion {
  text: string
  sourceTurnId: string | null
}

export interface WorkingMemoryCommitment {
  text: string
  sourceTurnId: string | null
}

export interface WorkingMemoryCorrection {
  text: string
  sourceTurnId: string | null
  scope: 'reply' | 'memory' | 'persona' | 'task' | 'unknown'
}

export interface WorkingMemoryRelationshipPosture {
  summary: string
  source: 'conversation-state' | 'conscious-frame' | 'runtime'
}

export interface WorkingMemoryEmotionalPosture {
  summary: string
  source: 'conscious-frame' | 'runtime'
}

export interface WorkingMemoryExecutionState {
  summary: string
  source: 'execution-callback' | 'execution-ledger' | 'tool-result'
}

export interface WorkingMemoryLongTermCandidate {
  sourceTurnIds: string[]
  kind: 'episode' | 'preference' | 'relationship' | 'procedure' | 'correction'
  summary: string
  reason: string
  salience: number
  sensitivity: 'public' | 'personal' | 'private' | 'secret'
  confidence: number
  allowTraining: boolean
}

export interface WorkingMemoryCompressionState {
  level: 'none' | 'light' | 'heavy'
  sourceTurnIds: string[]
  lastCompressedAt: number | null
}

export interface WorkingMemoryAuditState {
  failureTurnIds: string[]
  excludedLongTermCandidateTurnIds: string[]
  notes: string[]
}

export interface WorkingMemorySnapshot {
  version: AlicizationWorkingMemoryVersion
  cardId: string
  sessionId: string
  updatedAt: number
  turnRange: {
    fromTurnId: string | null
    toTurnId: string | null
  }
  recentRawTurns: WorkingMemoryTurn[]
  compressedTimeline: WorkingMemoryEpisodelet[]
  currentThread: WorkingMemoryThread | null
  activeTask: WorkingMemoryTask | null
  unresolvedQuestions: WorkingMemoryQuestion[]
  commitments: WorkingMemoryCommitment[]
  userCorrections: WorkingMemoryCorrection[]
  relationshipPosture: WorkingMemoryRelationshipPosture | null
  emotionalPosture: WorkingMemoryEmotionalPosture | null
  executionState: WorkingMemoryExecutionState | null
  memoryQueryHints: string[]
  longTermCandidates: WorkingMemoryLongTermCandidate[]
  compression: WorkingMemoryCompressionState
  audit: WorkingMemoryAuditState
}

export function normalizeWorkingMemoryText(raw: unknown, maxChars = 500) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

export function clampWorkingMemoryScore(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return 0
  return Math.max(0, Math.min(1, numeric))
}

export function normalizeWorkingMemoryTurn(input: Omit<WorkingMemoryTurn, 'failureKind'> & {
  failureKind?: WorkingMemoryFailureKind | null
}): WorkingMemoryTurn {
  const failureSurface = input.failureSurface
    ? {
        kind: input.failureSurface.kind,
        origin: 'failure-surface' as const,
        allowLongTermCondensation: false as const,
        allowPersonaLearning: false as const,
        allowTraining: false as const,
      }
    : null
  const learningPolicy = input.learningPolicy
    ? {
        allowLongTermCondensation: input.learningPolicy.allowLongTermCondensation === true,
        allowPersonaLearning: input.learningPolicy.allowPersonaLearning === true,
        allowTraining: false,
      }
    : failureSurface
      ? {
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
        }
      : null

  return {
    turnId: normalizeWorkingMemoryText(input.turnId, 120),
    role: input.role,
    text: normalizeWorkingMemoryText(input.text, 1600),
    createdAt: Number.isFinite(input.createdAt) ? Number(input.createdAt) : 0,
    source: input.source,
    visibility: input.visibility,
    failureKind: input.failureKind ?? null,
    origin: input.origin ?? failureSurface?.origin ?? null,
    learningPolicy,
    failureSurface,
    contaminated: input.contaminated === true,
    importance: clampWorkingMemoryScore(input.importance),
  }
}

export function uniqueWorkingMemoryTexts(values: Array<string | null | undefined>, maxItems = 8, maxChars = 220) {
  const result: string[] = []
  const limit = Number.isFinite(maxItems) ? Math.max(0, Math.floor(maxItems)) : 0
  for (const value of values) {
    if (result.length >= limit)
      break
    const normalized = normalizeWorkingMemoryText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

export function createEmptyWorkingMemorySnapshot(input: {
  cardId: string
  sessionId: string
  now: number
}): WorkingMemorySnapshot {
  const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
  return {
    version: 'working-memory-v1',
    cardId: normalizeWorkingMemoryText(input.cardId, 120) || 'default',
    sessionId: normalizeWorkingMemoryText(input.sessionId, 160) || 'detached',
    updatedAt: now,
    turnRange: {
      fromTurnId: null,
      toTurnId: null,
    },
    recentRawTurns: [],
    compressedTimeline: [],
    currentThread: null,
    activeTask: null,
    unresolvedQuestions: [],
    commitments: [],
    userCorrections: [],
    relationshipPosture: null,
    emotionalPosture: null,
    executionState: null,
    memoryQueryHints: [],
    longTermCandidates: [],
    compression: {
      level: 'none',
      sourceTurnIds: [],
      lastCompressedAt: null,
    },
    audit: {
      failureTurnIds: [],
      excludedLongTermCandidateTurnIds: [],
      notes: [],
    },
  }
}
