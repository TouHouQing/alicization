export type AliceKillSwitchState = 'ACTIVE' | 'SUSPENDED'

export interface AliceCardScope {
  cardId: string
}

export interface AlicePersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type AliceGender = 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'

export interface AliceSoulFrontmatter {
  schemaVersion: number
  initialized: boolean
  custom_directives: string
  profile: {
    ownerName: string
    hostName: string
    aliceName: string
    gender: AliceGender
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: AlicePersonalityState
  boundaries: {
    killSwitch: boolean
    mcpGuard: boolean
  }
}

export interface AliceSoulSnapshot {
  soulPath: string
  content: string
  frontmatter: AliceSoulFrontmatter
  revision: number
  hash: string
  needsGenesis: boolean
  watching: boolean
}

export interface AliceGenesisInput {
  ownerName: string
  hostName: string
  aliceName: string
  gender: AliceGender
  genderCustom?: string
  relationship: string
  personaNotes?: string
  customDirectives?: string
  mindAge: number
  personality: AlicePersonalityState
  allowOverwrite?: boolean
}

export interface AliceInitializeGenesisResult {
  soul: AliceSoulSnapshot
  conflict: boolean
  conflictCandidate?: AliceSoulSnapshot
}

export interface AlicePersonalityUpdatePayload {
  expectedRevision?: number
  reason?: string
  deltas: Partial<AlicePersonalityState>
}

export interface AliceSoulUpdatePayload {
  expectedRevision?: number
  content: string
}

export interface AliceKillSwitchSnapshot {
  state: AliceKillSwitchState
  reason?: string
  updatedAt: number
}

export interface AliceMemoryStats {
  total: number
  active: number
  archived: number
  lastPrunedAt: number | null
}

export type AliceMemorySource = 'rule' | 'async-llm'

export interface AliceMemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AliceMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastAccessAt: number | null
  accessCount: number
}

export interface AliceMemoryArchiveRecord extends AliceMemoryFact {
  archivedAt: number
}

export interface AliceMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
}

export interface AliceMemoryLegacySnapshot {
  facts: AliceMemoryFact[]
  archive: AliceMemoryArchiveRecord[]
  lastPrunedAt: number | null
}

export interface AliceMemoryMigrationResult {
  migrated: boolean
  importedFacts: number
  importedArchive: number
  marker: string
}

export interface AliceConversationTurnInput {
  turnId?: string
  sessionId?: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured?: Record<string, unknown>
  createdAt?: number
}

export type AliceAuditLogLevel = 'info' | 'notice' | 'warning' | 'critical'

export interface AliceAuditLogInput {
  level?: AliceAuditLogLevel
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
  createdAt?: number
}

export type AliceRealtimeCategory = 'weather' | 'news' | 'finance' | 'sports'

export interface AliceRealtimeExecutePayload {
  category: AliceRealtimeCategory
  query: string
  locale?: string
  now?: number
}

export interface AliceRealtimeExecuteResult {
  category: AliceRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  data?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  durationMs: number
}

export type AliceSystemProbeDegradeReason
  = | 'battery-unavailable'
    | 'cpu-unavailable'
    | 'memory-unavailable'

export interface AliceSystemProbeSample {
  collectedAt: number
  time: {
    iso: string
    local: string
    timezone: string
  }
  battery?: {
    percent: number
    charging: boolean
    source: 'native' | 'fallback'
  }
  cpu: {
    usagePercent: number
    windowMs: number
  }
  memory: {
    freeMB: number
    totalMB: number
    usagePercent: number
  }
  degraded?: AliceSystemProbeDegradeReason[]
}

export interface AliceSensoryCacheSnapshot {
  sample: AliceSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
}

export const aliceEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'processing',
] as const

export type AliceEmotion = typeof aliceEmotionWhitelist[number]

export function normalizeAliceEmotion(raw: unknown): { emotion: AliceEmotion, rawEmotion?: string, downgraded: boolean } {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if ((aliceEmotionWhitelist as readonly string[]).includes(value)) {
    return {
      emotion: value as AliceEmotion,
      downgraded: false,
    }
  }

  return {
    emotion: 'neutral',
    rawEmotion: value || undefined,
    downgraded: Boolean(value),
  }
}

export interface AliceDialogueStructuredPayload {
  thought: string
  emotion: AliceEmotion
  reply: string
  policyLocked?: string
  rawEmotion?: string
}

export interface AliceDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  structured: AliceDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}

export interface AliceSubconsciousNeedsState {
  boredom: number
  loneliness: number
  fatigue: number
  lastTickAt: number
  lastInteractionAt: number
  lastSavedAt: number
}

export interface AliceSubconsciousStatePayload extends AliceCardScope, AliceSubconsciousNeedsState {
  updatedAt: number
}

export interface AliceSubconsciousTickResult {
  processedCards: string[]
  proactiveTriggered: string[]
  suppressedCards: string[]
}

export interface AliceDreamRunResult {
  processedCards: string[]
  skippedCards: Array<{ cardId: string, reason: string }>
}

export interface AliceSubconsciousForceDreamPayload extends Partial<AliceCardScope> {
  reason?: string
}

export interface AliceLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export interface AliceChatStartPayload extends AliceCardScope {
  turnId: string
  providerId: string
  model: string
  providerConfig: Record<string, unknown>
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: unknown
    toolCallId?: string
    toolName?: string
  }>
  supportsTools?: boolean
  waitForTools?: boolean
}

export interface AliceChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
}

export interface AliceChatAbortPayload extends AliceCardScope {
  turnId: string
  reason?: string
}

export interface AliceChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AliceReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export type AliceBridgeChatStreamEvent
  = | { type: 'text-delta', text: string }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | { type: 'finish' }
    | { type: 'error', error: unknown }

export type AliceToolRiskLevel = 'safe' | 'sensitive' | 'danger'

export interface AliceSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AliceToolRiskLevel
  actionCategory: 'read' | 'write' | 'delete' | 'execute' | 'network' | 'unknown'
  serverName: string
  toolName: string
  reason: string
  resourceLabel?: string
  argumentsSummary?: {
    kind: string
    keyCount?: number
    keys?: string[]
  }
  timeoutMs: number
  createdAt: number
  supportsRememberSession: boolean
}

interface AliceBridge {
  bootstrap: () => Promise<AliceSoulSnapshot>
  getSoul: () => Promise<AliceSoulSnapshot>
  initializeGenesis: (payload: AliceGenesisInput) => Promise<AliceInitializeGenesisResult>
  updateSoul: (payload: AliceSoulUpdatePayload) => Promise<AliceSoulSnapshot>
  updatePersonality: (payload: AlicePersonalityUpdatePayload) => Promise<AliceSoulSnapshot>
  getKillSwitchState: () => Promise<AliceKillSwitchSnapshot>
  suspendKillSwitch: (payload?: { reason?: string }) => Promise<AliceKillSwitchSnapshot>
  resumeKillSwitch: (payload?: { reason?: string }) => Promise<AliceKillSwitchSnapshot>
  getMemoryStats: () => Promise<AliceMemoryStats>
  runMemoryPrune: () => Promise<AliceMemoryStats>
  updateMemoryStats: (payload: AliceMemoryStats) => Promise<AliceMemoryStats>
  retrieveMemoryFacts: (payload: { query: string, limit?: number }) => Promise<AliceMemoryFact[]>
  upsertMemoryFacts: (payload: { facts: AliceMemoryFactInput[], source: AliceMemorySource }) => Promise<void>
  importLegacyMemory: (payload: AliceMemoryLegacySnapshot) => Promise<AliceMemoryMigrationResult>
  appendConversationTurn: (payload: AliceConversationTurnInput) => Promise<void>
  setActiveSession?: (payload: { sessionId: string }) => Promise<void>
  appendAuditLog: (payload: AliceAuditLogInput) => Promise<void>
  realtimeExecute: (payload: AliceRealtimeExecutePayload) => Promise<AliceRealtimeExecuteResult>
  getSensorySnapshot: () => Promise<AliceSensoryCacheSnapshot>
  getSubconsciousState?: () => Promise<AliceSubconsciousStatePayload>
  forceSubconsciousTick?: () => Promise<AliceSubconsciousTickResult>
  forceDreaming?: (payload?: AliceSubconsciousForceDreamPayload) => Promise<AliceDreamRunResult>
  syncLlmConfig?: (payload: AliceLlmConfigPayload) => Promise<void>
  getLlmConfig?: () => Promise<AliceLlmConfigPayload>
  chatStart?: (payload: Omit<AliceChatStartPayload, 'cardId'>) => Promise<AliceChatStartResult>
  chatAbort?: (payload: { turnId: string, reason?: string }) => Promise<AliceChatAbortResult>
  reminderSchedule?: (payload: { minutes: number, message: string, sourceTurnId?: string }) => Promise<AliceReminderScheduleResult>
  clearAllConversations?: () => Promise<void>
  streamChat?: (
    payload: Omit<AliceChatStartPayload, 'cardId'>,
    options: {
      abortSignal?: AbortSignal
      onStreamEvent?: (event: AliceBridgeChatStreamEvent) => Promise<void> | void
    },
  ) => Promise<void>
  deleteCardScope?: (scope: AliceCardScope) => Promise<void>
  deleteAllData?: () => Promise<void>
}

let bridge: AliceBridge | undefined

export function setAliceBridge(nextBridge: AliceBridge) {
  bridge = nextBridge
}

export function clearAliceBridge() {
  bridge = undefined
}

export function getAliceBridge(): AliceBridge {
  if (!bridge) {
    throw new Error('A.L.I.C.E bridge is not available in this runtime.')
  }
  return bridge
}

export function hasAliceBridge() {
  return Boolean(bridge)
}
