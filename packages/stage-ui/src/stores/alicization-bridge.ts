export type AlicizationKillSwitchState = 'ACTIVE' | 'SUSPENDED'

export interface AlicizationCardScope {
  cardId: string
}

export interface AlicizationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type AlicizationGender = 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'

export interface AlicizationSoulFrontmatter {
  schemaVersion: number
  initialized: boolean
  custom_directives: string
  host_attitude: string
  core_incarnation: string
  profile: {
    ownerName: string
    hostName: string
    alicizationName: string
    gender: AlicizationGender
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: AlicizationPersonalityState
  boundaries: {
    killSwitch: boolean
    mcpGuard: boolean
  }
}

export interface AlicizationSoulSnapshot {
  soulPath: string
  content: string
  frontmatter: AlicizationSoulFrontmatter
  revision: number
  hash: string
  needsGenesis: boolean
  watching: boolean
}

export interface AlicizationGenesisInput {
  ownerName: string
  hostName: string
  alicizationName: string
  gender: AlicizationGender
  genderCustom?: string
  relationship: string
  personaNotes?: string
  customDirectives?: string
  mindAge: number
  personality: AlicizationPersonalityState
  allowOverwrite?: boolean
}

export interface AlicizationInitializeGenesisResult {
  soul: AlicizationSoulSnapshot
  conflict: boolean
  conflictCandidate?: AlicizationSoulSnapshot
}

export interface AlicizationPersonalityUpdatePayload {
  expectedRevision?: number
  reason?: string
  deltas: Partial<AlicizationPersonalityState>
}

export interface AlicizationSoulUpdatePayload {
  expectedRevision?: number
  content: string
}

export interface AlicizationKillSwitchSnapshot {
  state: AlicizationKillSwitchState
  reason?: string
  updatedAt: number
}

export interface AlicizationMemoryStats {
  total: number
  active: number
  archived: number
  lastPrunedAt: number | null
}

export type AlicizationMemorySource = 'rule' | 'async-llm'

export interface AlicizationMemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastAccessAt: number | null
  accessCount: number
}

export interface AlicizationMemoryArchiveRecord extends AlicizationMemoryFact {
  archivedAt: number
}

export interface AlicizationMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
}

export interface AlicizationMemoryLegacySnapshot {
  facts: AlicizationMemoryFact[]
  archive: AlicizationMemoryArchiveRecord[]
  lastPrunedAt: number | null
}

export interface AlicizationMemoryMigrationResult {
  migrated: boolean
  importedFacts: number
  importedArchive: number
  marker: string
}

export type AlicizationSubconsciousFragmentSourceKind
  = | 'active-demotion'
    | 'dream-fragment'
    | 'former-core-incarnation'
    | 'unforged-shattering-event'
    | 'attitude-shift'

export interface AlicizationActiveThought {
  id: string
  text: string
  createdAt: number
  updatedAt: number
}

export interface AlicizationSubconsciousFragment {
  id: string
  text: string
  sourceKind: AlicizationSubconsciousFragmentSourceKind
  createdAt: number
  lastRecalledAt: number | null
  recallCount: number
}

export interface AlicizationOrganicMemorySnapshot {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  subconsciousCount: number
  recentSubconsciousFragments: AlicizationSubconsciousFragment[]
  lastDreamedAt: number | null
}

export interface AlicizationDreamMetabolismPayload {
  host_attitude: string
  soul_shift: {
    obedience_delta: number
    liveliness_delta: number
    sensibility_delta: number
  }
  next_active_thoughts: Array<{ text: string }>
  explicit_demoted_thoughts: Array<{ text: string }>
  new_sediment_fragments: Array<{ text: string }>
  shattering_event: { text: string } | null
}

export interface AlicizationCoreIncarnationReforgePayload {
  core_incarnation: string
}

export interface AlicizationConversationTurnInput {
  turnId?: string
  sessionId?: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured?: Record<string, unknown>
  createdAt?: number
}

export type AlicizationAuditLogLevel = 'info' | 'notice' | 'warning' | 'critical'

export interface AlicizationAuditLogInput {
  level?: AlicizationAuditLogLevel
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
  createdAt?: number
}

export type AlicizationRealtimeCategory = 'weather' | 'news' | 'finance' | 'sports'

export interface AlicizationRealtimeExecutePayload {
  category: AlicizationRealtimeCategory
  query: string
  locale?: string
  now?: number
}

export interface AlicizationRealtimeExecuteResult {
  category: AlicizationRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  data?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  durationMs: number
}

export type AlicizationSystemProbeDegradeReason
  = | 'battery-unavailable'
    | 'cpu-unavailable'
    | 'memory-unavailable'

export interface AlicizationSystemProbeSample {
  collectedAt: number
  time: {
    iso: string
    local: string
    timezone: string
  }
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
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
  degraded?: AlicizationSystemProbeDegradeReason[]
}

export interface AlicizationSensoryCacheSnapshot {
  sample: AlicizationSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
}

export const alicizationEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
] as const

export type AlicizationEmotion = typeof alicizationEmotionWhitelist[number]

export type AlicizationPerformanceDelivery
  = | 'calm'
    | 'gentle'
    | 'firm'
    | 'energetic'
    | 'hesitant'
    | 'teasing'

export interface AlicizationDialoguePerformancePayload {
  baseEmotion: AlicizationEmotion
  emotion: AlicizationEmotion
  facialCue?: string | null
  actionCue?: string | null
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
}

export interface CharacterFacialCapability {
  key: string
  label: string
  description: string
  source: 'preset' | 'custom'
  affectsMouth: boolean
}

export interface CharacterActionCapability {
  key: string
  label: string
  description: string
  source: 'builtin' | 'external-vrma' | 'live2d-motion'
}

export interface CharacterPerformanceCapabilitiesManifest {
  renderer: 'live2d' | 'vrm'
  supportedBaseEmotions: AlicizationEmotion[]
  supportedFacialCues: CharacterFacialCapability[]
  supportedActions: CharacterActionCapability[]
  supportsLookAt: boolean
  supportsVisemeLipSync: boolean
  supportsMicroDynamics: boolean
}

const alicizationPerformanceDeliveryWhitelist = [
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
] as const

export function normalizeAlicizationEmotion(raw: unknown): { emotion: AlicizationEmotion, rawEmotion?: string, downgraded: boolean } {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'processing' || value === 'think') {
    return {
      emotion: 'thinking',
      rawEmotion: value,
      downgraded: true,
    }
  }

  if ((alicizationEmotionWhitelist as readonly string[]).includes(value)) {
    return {
      emotion: value as AlicizationEmotion,
      downgraded: false,
    }
  }

  return {
    emotion: 'neutral',
    rawEmotion: value || undefined,
    downgraded: Boolean(value),
  }
}

export function normalizeAlicizationPerformanceDelivery(raw: unknown): AlicizationPerformanceDelivery {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if ((alicizationPerformanceDeliveryWhitelist as readonly string[]).includes(value))
    return value as AlicizationPerformanceDelivery
  return 'calm'
}

function normalizePerformanceCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 80) : null
}

function normalizePerformanceEmphasis(raw: unknown): 0 | 1 | 2 {
  const parsed = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseInt(raw, 10)
      : Number.NaN

  if (!Number.isFinite(parsed))
    return 0

  if (parsed <= 0)
    return 0
  if (parsed >= 2)
    return 2
  return 1
}

export function normalizeAlicizationPerformancePayload(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationDialoguePerformancePayload {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const normalizedEmotion = normalizeAlicizationEmotion(candidate.baseEmotion ?? candidate.emotion ?? fallbackEmotion)

  return {
    baseEmotion: normalizedEmotion.emotion,
    emotion: normalizedEmotion.emotion,
    facialCue: normalizePerformanceCue(candidate.facialCue),
    actionCue: normalizePerformanceCue(candidate.actionCue),
    delivery: normalizeAlicizationPerformanceDelivery(candidate.delivery),
    emphasis: normalizePerformanceEmphasis(candidate.emphasis),
  }
}

export interface AlicizationPerformanceManifestClampResult {
  performance: AlicizationDialoguePerformancePayload
  downgradedBaseEmotion?: AlicizationEmotion
  droppedFacialCue?: string
  droppedActionCue?: string
}

function resolveManifestFallbackEmotion(
  manifest: CharacterPerformanceCapabilitiesManifest,
  fallbackEmotion: AlicizationEmotion,
) {
  if (manifest.supportedBaseEmotions.includes(fallbackEmotion))
    return fallbackEmotion
  if (manifest.supportedBaseEmotions.includes('neutral'))
    return 'neutral'
  return manifest.supportedBaseEmotions[0] ?? 'neutral'
}

export function clampAlicizationPerformancePayloadToManifest(
  payload: AlicizationDialoguePerformancePayload,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationPerformanceManifestClampResult {
  const normalized = normalizeAlicizationPerformancePayload(payload, fallbackEmotion)
  if (!manifest) {
    return {
      performance: normalized,
    }
  }

  const facialCueKeys = new Set(manifest.supportedFacialCues.map(item => item.key))
  const actionCueKeys = new Set(manifest.supportedActions.map(item => item.key))
  const resolvedFallbackEmotion = resolveManifestFallbackEmotion(manifest, fallbackEmotion)
  const nextBaseEmotion = manifest.supportedBaseEmotions.includes(normalized.baseEmotion)
    ? normalized.baseEmotion
    : resolvedFallbackEmotion
  const nextFacialCue = normalized.facialCue && facialCueKeys.has(normalized.facialCue)
    ? normalized.facialCue
    : null
  const nextActionCue = normalized.actionCue && actionCueKeys.has(normalized.actionCue)
    ? normalized.actionCue
    : null

  return {
    performance: {
      ...normalized,
      baseEmotion: nextBaseEmotion,
      emotion: nextBaseEmotion,
      facialCue: nextFacialCue,
      actionCue: nextActionCue,
    },
    downgradedBaseEmotion: nextBaseEmotion !== normalized.baseEmotion
      ? normalized.baseEmotion
      : undefined,
    droppedFacialCue: normalized.facialCue && nextFacialCue === null
      ? normalized.facialCue
      : undefined,
    droppedActionCue: normalized.actionCue && nextActionCue === null
      ? normalized.actionCue
      : undefined,
  }
}

export interface AlicizationDialogueStructuredPayload {
  thought: string
  emotion: AlicizationEmotion
  reply: string
  performance: AlicizationDialoguePerformancePayload
  policyLocked?: string
  rawEmotion?: string
}

export interface AlicizationDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  structured: AlicizationDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}

export interface AlicizationSubconsciousNeedsState {
  boredom: number
  loneliness: number
  fatigue: number
  lastTickAt: number
  lastInteractionAt: number
  lastSavedAt: number
}

export interface AlicizationSubconsciousStatePayload extends AlicizationCardScope, AlicizationSubconsciousNeedsState {
  updatedAt: number
}

export interface AlicizationSubconsciousTickResult {
  processedCards: string[]
  proactiveTriggered: string[]
  suppressedCards: string[]
}

export interface AlicizationDreamRunResult {
  processedCards: string[]
  skippedCards: Array<{ cardId: string, reason: string }>
}

export interface AlicizationSubconsciousForceDreamPayload extends Partial<AlicizationCardScope> {
  reason?: string
}

export interface AlicizationLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export interface AlicizationChatStartPayload extends AlicizationCardScope {
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

export interface AlicizationChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
}

export interface AlicizationChatAbortPayload extends AlicizationCardScope {
  turnId: string
  reason?: string
}

export interface AlicizationChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AlicizationReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export type AlicizationBridgeChatStreamEvent
  = | { type: 'text-delta', text: string }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | { type: 'finish' }
    | { type: 'error', error: unknown }

export type AlicizationToolRiskLevel = 'safe' | 'sensitive' | 'danger'

export interface AlicizationSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AlicizationToolRiskLevel
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

interface AlicizationBridge {
  bootstrap: () => Promise<AlicizationSoulSnapshot>
  getSoul: () => Promise<AlicizationSoulSnapshot>
  initializeGenesis: (payload: AlicizationGenesisInput) => Promise<AlicizationInitializeGenesisResult>
  updateSoul: (payload: AlicizationSoulUpdatePayload) => Promise<AlicizationSoulSnapshot>
  updatePersonality: (payload: AlicizationPersonalityUpdatePayload) => Promise<AlicizationSoulSnapshot>
  getKillSwitchState: () => Promise<AlicizationKillSwitchSnapshot>
  suspendKillSwitch: (payload?: { reason?: string }) => Promise<AlicizationKillSwitchSnapshot>
  resumeKillSwitch: (payload?: { reason?: string }) => Promise<AlicizationKillSwitchSnapshot>
  getMemoryStats: () => Promise<AlicizationMemoryStats>
  runMemoryPrune: () => Promise<AlicizationMemoryStats>
  updateMemoryStats: (payload: AlicizationMemoryStats) => Promise<AlicizationMemoryStats>
  retrieveMemoryFacts: (payload: { query: string, limit?: number }) => Promise<AlicizationMemoryFact[]>
  upsertMemoryFacts: (payload: { facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource }) => Promise<void>
  importLegacyMemory: (payload: AlicizationMemoryLegacySnapshot) => Promise<AlicizationMemoryMigrationResult>
  getOrganicMemorySnapshot?: () => Promise<AlicizationOrganicMemorySnapshot>
  searchOrganicSubconsciousFragments?: (payload: { query: string, limit?: number }) => Promise<AlicizationSubconsciousFragment[]>
  getPerformanceManifest?: () => Promise<CharacterPerformanceCapabilitiesManifest | null>
  setPerformanceManifest?: (payload: CharacterPerformanceCapabilitiesManifest | null) => Promise<void>
  appendConversationTurn: (payload: AlicizationConversationTurnInput) => Promise<void>
  setActiveSession?: (payload: { sessionId: string }) => Promise<void>
  appendAuditLog: (payload: AlicizationAuditLogInput) => Promise<void>
  realtimeExecute: (payload: AlicizationRealtimeExecutePayload) => Promise<AlicizationRealtimeExecuteResult>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>
  getSubconsciousState?: () => Promise<AlicizationSubconsciousStatePayload>
  forceSubconsciousTick?: () => Promise<AlicizationSubconsciousTickResult>
  forceDreaming?: (payload?: AlicizationSubconsciousForceDreamPayload) => Promise<AlicizationDreamRunResult>
  syncLlmConfig?: (payload: AlicizationLlmConfigPayload) => Promise<void>
  getLlmConfig?: () => Promise<AlicizationLlmConfigPayload>
  chatStart?: (payload: Omit<AlicizationChatStartPayload, 'cardId'>) => Promise<AlicizationChatStartResult>
  chatAbort?: (payload: { turnId: string, reason?: string }) => Promise<AlicizationChatAbortResult>
  reminderSchedule?: (payload: { minutes: number, message: string, sourceTurnId?: string }) => Promise<AlicizationReminderScheduleResult>
  clearAllConversations?: () => Promise<void>
  streamChat?: (
    payload: Omit<AlicizationChatStartPayload, 'cardId'>,
    options: {
      abortSignal?: AbortSignal
      onStreamEvent?: (event: AlicizationBridgeChatStreamEvent) => Promise<void> | void
    },
  ) => Promise<void>
  deleteCardScope?: (scope: AlicizationCardScope) => Promise<void>
  deleteAllData?: () => Promise<void>
}

let bridge: AlicizationBridge | undefined

export function setAlicizationBridge(nextBridge: AlicizationBridge) {
  bridge = nextBridge
}

export function clearAlicizationBridge() {
  bridge = undefined
}

export function getAlicizationBridge(): AlicizationBridge {
  if (!bridge) {
    throw new Error('Alicization bridge is not available in this runtime.')
  }
  return bridge
}

export function hasAlicizationBridge() {
  return Boolean(bridge)
}
