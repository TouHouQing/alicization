import type {
  AlicizationGenesisInput,
  AlicizationKillSwitchSnapshot,
  AlicizationMemoryStats,
  AlicizationMindTurnGovernance,
  AlicizationOrganicMemorySnapshot,
  AlicizationPreDialogueSendIdentity,
  AlicizationSoulSnapshot,
  AlicizationSubconsciousFragment,
} from './alicization-bridge'

import { errorMessageFrom } from '@moeru/std'
import { isAlicizationThinProjectAwarenessLine } from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { calibrateSentimentConfidence, estimateLexicalSentiment } from '../composables/alicization-structured-output'
import { getAlicizationBridge, hasAlicizationBridge } from './alicization-bridge'
import {
  asyncExtractionBatchThreshold,
  asyncExtractionForcePriorityThreshold,
  asyncExtractionIdleMs,
  asyncExtractionMaxPendingTurns,
  evaluateAsyncExtractionBudget,
  evaluateAsyncExtractionTrigger,
  hasAsyncExtractionDuplicate,
  pickAsyncExtractionBatch,
  trimAsyncExtractionQueue,
} from './alicization-epoch1-scheduler'
import {
  extractRuleFacts,
  getMemoryStats,
  runMemoryPrune,
  upsertFacts,
} from './alicization-memory'
import { computePersonalityDelta } from './alicization-personality'
import { useChatOrchestratorStore } from './chat'
import { buildPreDialogueSendIdentityFromSnapshots } from './chat/pre-dialogue-send-identity'
import { projectStateObservationToContinuitySnapshot } from './project-state-observation'

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value))
    return min
  return Math.min(max, Math.max(min, value))
}

function normalizeBooleanEnv(value: unknown) {
  if (typeof value !== 'string')
    return false
  return /^(?:1|true|yes|on)$/i.test(value.trim())
}

function isAlicizationDebugAuditEnabled() {
  const envValue = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.ALICIZATION_DEBUG_AUDIT
  return normalizeBooleanEnv(envValue)
}

function createThoughtDigest(input: string) {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function parseUserText(content: unknown) {
  if (typeof content === 'string')
    return content
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String((part as { text?: unknown }).text ?? '')
      return ''
    }).join('')
  }
  return ''
}

function normalizeAsyncExtractionDedupeSegment(raw: string, maxLength = 140) {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function buildAsyncExtractionDedupeKey(userText: string, assistantText: string) {
  const userSegment = normalizeAsyncExtractionDedupeSegment(userText, 140)
  const assistantSegment = normalizeAsyncExtractionDedupeSegment(assistantText, 140)
  if (!userSegment && !assistantSegment)
    return 'empty-turn'
  return `${userSegment}|${assistantSegment}`
}

const durableMemoryCuePattern = /喜欢|不喜欢|讨厌|偏好|习惯|计划|约定|限制|禁忌|记住|别忘|明天|下周|always|never|prefer|like|dislike|plan|constraint|remember/iu

function parseMindSignalField(thought: string, field: 'obligation' | 'truth' | 'focus') {
  const pattern = new RegExp(`${field}=([^;\\n]+)`, 'i')
  const match = pattern.exec(thought)
  if (!match?.[1])
    return null
  const value = normalizeAsyncExtractionDedupeSegment(match[1], 48)
  return value || null
}

function deriveMindAwareExtractionPriority(input: {
  userText: string
  assistantText: string
  thought?: string | null
  structuredFormat?: string | null
  contractFailed?: boolean
  governance?: AlicizationMindTurnGovernance | null
}) {
  let priority = 100

  if (input.structuredFormat === 'mind-turn-v1')
    priority += 35

  const thought = input.thought ?? ''
  const obligation = thought ? parseMindSignalField(thought, 'obligation') : null
  const truth = thought ? parseMindSignalField(thought, 'truth') : null
  const focus = thought ? parseMindSignalField(thought, 'focus') : null

  if (obligation === 'care' || obligation === 'accompany')
    priority += 35
  else if (obligation === 'repair' || obligation === 'clarify')
    priority += 20
  else if (obligation === 'answer' || obligation === 'guide')
    priority += 15

  if (truth === 'grounded')
    priority += 20
  else if (truth === 'uncertain')
    priority -= 12

  if (focus) {
    if (focus.includes('relationship') || focus.includes('host') || focus.includes('self'))
      priority += 45
    else if (focus.includes('task') || focus.includes('thread'))
      priority += 25
    else if (focus.includes('scene'))
      priority += 10
  }

  if (input.contractFailed)
    priority -= 25

  switch (input.governance?.answerSubject) {
    case 'relationship':
      priority += 60
      break
    case 'alicization-self':
    case 'host-state':
      priority += 45
      break
    case 'task-knot':
      priority += 25
      break
    default:
      break
  }

  if (input.governance?.repairState && input.governance.repairState !== 'none')
    priority -= 15

  if (input.governance?.claimEvidence?.forbidUnsupportedSpecificity)
    priority += 10

  if (durableMemoryCuePattern.test(input.userText))
    priority += 45

  const compactTurn = input.userText.trim().length <= 8 && input.assistantText.trim().length <= 18
  if (compactTurn)
    priority -= 35

  return clamp(Math.round(priority), 10, 300)
}

function shouldForceAsyncExtractionTurn(input: {
  userText: string
  priority: number
  thoughtObligation: string | null
  structuredFormat?: string | null
  contractFailed?: boolean
  governance?: AlicizationMindTurnGovernance | null
}) {
  if (input.contractFailed)
    return false
  if (input.priority < asyncExtractionForcePriorityThreshold)
    return false
  if (input.structuredFormat !== 'mind-turn-v1')
    return false

  switch (input.governance?.answerSubject) {
    case 'relationship':
    case 'alicization-self':
    case 'host-state':
      return true
    default:
      break
  }

  if (input.thoughtObligation === 'care' || input.thoughtObligation === 'accompany')
    return true

  return durableMemoryCuePattern.test(input.userText)
}

function resolvePendingAsyncExtractionTrigger(
  pending: PendingAsyncExtractionTurn[],
  now: number,
  lastQueuedAt: number | null,
) {
  const highestPriority = pending.length > 0
    ? Math.max(...pending.map(item => item.priority))
    : null

  return evaluateAsyncExtractionTrigger({
    forceFlush: pending.some(item => item.forceFlush),
    highestPriority,
    pendingCount: pending.length,
    lastQueuedAt,
    now,
  })
}

function pushUniquePromptLine(lines: string[], value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized || lines.includes(normalized))
    return
  lines.push(normalized)
}

function normalizeAsyncExtractionProjectAwarenessText(value: unknown) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function normalizeAsyncExtractionProjectAwarenessProjectState(
  projectState: AlicizationPreDialogueSendIdentity['projectState'],
) {
  return projectState
    && typeof projectState === 'object'
    && !Array.isArray(projectState)
    ? { ...projectState } as Record<string, unknown>
    : null
}

function normalizeAsyncExtractionProjectAwarenessReasonPreview(
  reasonPreview: AlicizationPreDialogueSendIdentity['reasonPreview'],
) {
  const normalized: string[] = []

  for (const reason of reasonPreview ?? []) {
    const trimmed = typeof reason === 'string' ? reason.trim() : ''
    if (!trimmed || normalized.includes(trimmed))
      continue
    normalized.push(trimmed)
  }

  return normalized
}

function looksLikeThinAsyncExtractionProjectAwareness(value: unknown) {
  const normalized = normalizeAsyncExtractionProjectAwarenessText(value)
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || lowered.includes('generic continuity reminder')
    || lowered.includes('generic continuity shell')
    || lowered.includes('generic awareness reminder')
    || lowered.includes('generic same-her reminder')
    || lowered.includes('generic next target')
    || lowered.includes('generic closure summary')
}

function mergeAsyncExtractionProjectAwarenessText(existing: unknown, incoming: unknown) {
  const existingText = normalizeAsyncExtractionProjectAwarenessText(existing)
  const incomingText = normalizeAsyncExtractionProjectAwarenessText(incoming)
  if (!incomingText)
    return existingText
  if (!existingText)
    return incomingText

  const existingLooksThin = looksLikeThinAsyncExtractionProjectAwareness(existingText)
  const incomingLooksThin = looksLikeThinAsyncExtractionProjectAwareness(incomingText)
  if (existingLooksThin && !incomingLooksThin)
    return incomingText
  if (incomingLooksThin && !existingLooksThin)
    return existingText

  return incomingText
}

function mergeAsyncExtractionProjectAwarenessProjectState(
  existingProjectState: Record<string, unknown> | null,
  incomingProjectState: Record<string, unknown> | null,
) {
  if (!existingProjectState)
    return incomingProjectState
  if (!incomingProjectState)
    return existingProjectState

  const merged: Record<string, unknown> = { ...existingProjectState }
  for (const [key, value] of Object.entries(incomingProjectState)) {
    if (value == null)
      continue
    if (typeof value === 'string' && !value.trim())
      continue
    merged[key] = value
  }

  return merged
}

function needsAsyncExtractionProjectAwarenessUpgrade(
  identity: AlicizationPreDialogueSendIdentity | null,
) {
  if (!identity || typeof identity !== 'object')
    return true

  const projectState = normalizeAsyncExtractionProjectAwarenessProjectState(identity.projectState)
  return [
    identity.summaryLine,
    identity.companionHeadlineLine,
    identity.companionBriefingLine,
    identity.companionNextClosureLine,
    identity.awarenessLine,
    projectState?.preflightSummary,
    projectState?.preDialogueAwarenessLine,
    projectState?.awarenessLine,
    projectState?.companionHeadlineLine,
    projectState?.companionBriefingLine,
    projectState?.nextClosureTarget,
  ].some(value => looksLikeThinAsyncExtractionProjectAwareness(value))
}

function resolveAsyncExtractionProjectAwarenessIdentity(
  identity: AlicizationPreDialogueSendIdentity | null,
  fallbackIdentity: AlicizationPreDialogueSendIdentity | null,
): AlicizationPreDialogueSendIdentity | null {
  if (!identity)
    return fallbackIdentity
  if (!fallbackIdentity || !needsAsyncExtractionProjectAwarenessUpgrade(identity))
    return identity

  const existingProjectState = normalizeAsyncExtractionProjectAwarenessProjectState(identity.projectState)
  const fallbackProjectState = normalizeAsyncExtractionProjectAwarenessProjectState(fallbackIdentity.projectState)

  return {
    ...identity,
    status: fallbackIdentity.status ?? identity.status,
    summaryLine: mergeAsyncExtractionProjectAwarenessText(identity.summaryLine, fallbackIdentity.summaryLine),
    companionHeadlineLine: mergeAsyncExtractionProjectAwarenessText(identity.companionHeadlineLine, fallbackIdentity.companionHeadlineLine),
    companionBriefingLine: mergeAsyncExtractionProjectAwarenessText(identity.companionBriefingLine, fallbackIdentity.companionBriefingLine),
    companionNextClosureLine: mergeAsyncExtractionProjectAwarenessText(identity.companionNextClosureLine, fallbackIdentity.companionNextClosureLine),
    awarenessLine: mergeAsyncExtractionProjectAwarenessText(identity.awarenessLine, fallbackIdentity.awarenessLine),
    emotionalClosureCue: mergeAsyncExtractionProjectAwarenessText(identity.emotionalClosureCue, fallbackIdentity.emotionalClosureCue),
    projectState: mergeAsyncExtractionProjectAwarenessProjectState(existingProjectState, fallbackProjectState) as AlicizationPreDialogueSendIdentity['projectState'],
    reasonPreview: normalizeAsyncExtractionProjectAwarenessReasonPreview([
      ...identity.reasonPreview,
      ...fallbackIdentity.reasonPreview,
    ]),
  }
}

function buildAsyncExtractionProjectAwarenessPrompt(identities: AlicizationPreDialogueSendIdentity[]) {
  const lines = [
    'You are Alicization asynchronous memory extractor.',
    'Extract durable memory facts from user-visible dialogue and structured continuity evidence.',
  ]

  for (const identity of identities) {
    pushUniquePromptLine(lines, identity.awarenessLine)
    pushUniquePromptLine(lines, identity.companionHeadlineLine)
    pushUniquePromptLine(lines, identity.companionBriefingLine)
    pushUniquePromptLine(lines, identity.summaryLine)
    pushUniquePromptLine(lines, identity.companionNextClosureLine)
    for (const reason of identity.reasonPreview)
      pushUniquePromptLine(lines, reason)
  }

  lines.push(
    'When extracting durable memory, keep user facts, relationship facts, constraints, preferences, plans, and explicit continuity evidence.',
    'Do not store project slogans, fixed-template residue, provider fallback text, timeout fallback text, or detached project-status shells as durable memory.',
    'Return JSON only. No markdown.',
    'Schema:',
    '{"facts":[{"subject":"user|assistant|relationship","predicate":"likes|dislikes|plan|fact|constraint|preference","object":"short text","confidence":0.45-0.95}]}',
    'Rules:',
    '- Keep only durable facts that matter for future continuity.',
    '- Ignore one-off small talk and transient phatic lines.',
    '- Deduplicate semantically similar facts.',
    '- Max 8 facts in one response.',
  )

  return lines.join('\n')
}

function serializeAsyncExtractionProjectAwareness(
  identity: AlicizationPreDialogueSendIdentity | null,
) {
  if (!identity)
    return null

  const projectState = normalizeAsyncExtractionProjectAwarenessProjectState(identity.projectState)

  return {
    status: identity.status,
    summaryLine: identity.summaryLine ?? null,
    companionHeadlineLine: identity.companionHeadlineLine ?? null,
    companionBriefingLine: identity.companionBriefingLine ?? null,
    companionNextClosureLine: identity.companionNextClosureLine ?? null,
    awarenessLine: identity.awarenessLine ?? null,
    emotionalClosureCue: identity.emotionalClosureCue ?? null,
    projectState,
    reasonPreview: normalizeAsyncExtractionProjectAwarenessReasonPreview(identity.reasonPreview),
  }
}

interface PendingAsyncExtractionTurn {
  turnId: string
  sessionId: string
  userText: string
  assistantText: string
  preDialogueSendIdentity: AlicizationPreDialogueSendIdentity | null
  dedupeKey: string
  priority: number
  decisionTraceId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  thoughtObligation: string | null
  thoughtTruth: string | null
  thoughtFocus: string | null
  structuredFormat: string | null
  forceFlush: boolean
  queuedAt: number
}

interface ParsedAsyncExtractionFact {
  subject: string
  predicate: string
  object: string
  confidence: number
}

function sanitizeFactToken(raw: unknown, maxLength = 96) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function clampFactConfidence(raw: unknown) {
  const value = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseFloat(raw)
      : Number.NaN
  if (!Number.isFinite(value))
    return 0.65
  return clamp(value, 0.45, 0.95)
}

function extractJsonFenceBody(text: string) {
  const fenceStart = text.indexOf('```')
  if (fenceStart < 0)
    return null
  const firstNewline = text.indexOf('\n', fenceStart + 3)
  if (firstNewline < 0)
    return null
  const fenceEnd = text.indexOf('```', firstNewline + 1)
  if (fenceEnd < 0)
    return null
  const body = text.slice(firstNewline + 1, fenceEnd).trim()
  return body || null
}

function parseAsyncExtractionFacts(raw: string): ParsedAsyncExtractionFact[] {
  const text = raw.trim()
  if (!text)
    return []

  let payload: unknown = null
  try {
    payload = JSON.parse(text)
  }
  catch {
    const fenced = extractJsonFenceBody(text)
    if (!fenced)
      return []
    try {
      payload = JSON.parse(fenced.trim())
    }
    catch {
      return []
    }
  }

  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { facts?: unknown[] }).facts)
      ? (payload as { facts: unknown[] }).facts
      : []

  return list
    .map((item) => {
      if (!item || typeof item !== 'object')
        return null
      const candidate = item as Record<string, unknown>
      const subject = sanitizeFactToken(candidate.subject, 60)
      const predicate = sanitizeFactToken(candidate.predicate, 60)
      const object = sanitizeFactToken(candidate.object, 180)
      if (!subject || !predicate || !object)
        return null
      return {
        subject,
        predicate,
        object,
        confidence: clampFactConfidence(candidate.confidence),
      } satisfies ParsedAsyncExtractionFact
    })
    .filter((item): item is ParsedAsyncExtractionFact => Boolean(item))
}

function extractSoulBody(content: string) {
  if (!content.startsWith('---\n'))
    return content.trim()
  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0)
    return content.trim()
  return content.slice(secondMarkerIndex + 5).trim()
}

function replaceSoulBody(content: string, body: string) {
  const normalizedBody = body.trim()
  if (!content.startsWith('---\n')) {
    return `${normalizedBody}\n`
  }

  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0) {
    return `${normalizedBody}\n`
  }

  const frontmatterBlock = content.slice(0, secondMarkerIndex + 5)
  return `${frontmatterBlock}${normalizedBody}\n`
}

const genesisPollIntervalMs = 2000

async function appendAlicizationAuditLog(payload: {
  level: 'info' | 'notice' | 'warning' | 'critical'
  category: string
  action: string
  message: string
  details?: Record<string, unknown>
}) {
  if (!hasAlicizationBridge())
    return

  await getAlicizationBridge().appendAuditLog({
    level: payload.level,
    category: payload.category,
    action: payload.action,
    message: payload.message,
    payload: payload.details,
  }).catch(() => {})
}

function createEmptyOrganicMemorySnapshot(hostAttitude = '礼貌而克制，保持观察', coreIncarnation = ''): AlicizationOrganicMemorySnapshot {
  return {
    hostAttitude,
    coreIncarnation,
    activeThoughts: [],
    subconsciousCount: 0,
    recentSubconsciousFragments: [],
    recentEpisodicEvents: [],
    hostPersonModel: null,
    memoryConsolidations: [],
    recollectionIntent: null,
    recollectionPlan: null,
    recollectionSpeechPlan: null,
    recollectionForeground: null,
    lastDreamedAt: null,
  }
}

export const useAlicizationEpoch1Store = defineStore('alicization-epoch1', () => {
  const soul = ref<AlicizationSoulSnapshot | null>(null)
  const needsGenesis = ref(false)
  const genesisConflictCandidate = ref<AlicizationSoulSnapshot | null>(null)
  const killSwitch = ref<AlicizationKillSwitchSnapshot>({
    state: 'ACTIVE',
    reason: 'bootstrap',
    updatedAt: Date.now(),
  })
  const memoryStats = ref<AlicizationMemoryStats>({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  })
  const organicMemorySnapshot = ref<AlicizationOrganicMemorySnapshot>(createEmptyOrganicMemorySnapshot())
  const organicMemorySearchResults = ref<AlicizationSubconsciousFragment[]>([])

  let initialized = false
  let genesisPollTimer: ReturnType<typeof setInterval> | undefined
  let asyncExtractionFlushTimer: ReturnType<typeof setTimeout> | undefined
  let asyncExtractionInFlight = false
  let asyncExtractionLastQueuedAt: number | null = null
  let asyncExtractionBudgetState = {
    windowStartedAt: Date.now(),
    consumed: 0,
  }
  const pendingAsyncExtractionTurns = ref<PendingAsyncExtractionTurn[]>([])
  let lastAssistantEmotion: string | null = null
  const hookDisposers: Array<() => void> = []

  async function syncMemoryStatsToRuntime() {
    const stats = await getMemoryStats()
    memoryStats.value = stats
    return stats
  }

  async function runPruneNow() {
    const stats = await runMemoryPrune()
    memoryStats.value = stats
    return await syncMemoryStatsToRuntime()
  }

  async function refreshMemoryStats() {
    return await syncMemoryStatsToRuntime()
  }

  async function refreshOrganicMemorySnapshot() {
    const currentSoul = soul.value
    organicMemorySearchResults.value = []
    const bridge = hasAlicizationBridge() ? getAlicizationBridge() : null
    if (!bridge?.getOrganicMemorySnapshot) {
      organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot(
        currentSoul?.frontmatter.host_attitude ?? '礼貌而克制，保持观察',
        currentSoul?.frontmatter.core_incarnation ?? '',
      )
      return organicMemorySnapshot.value
    }

    const snapshot = await bridge.getOrganicMemorySnapshot().catch(() => null)
    if (snapshot) {
      organicMemorySnapshot.value = snapshot
      return snapshot
    }

    organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot(
      currentSoul?.frontmatter.host_attitude ?? '礼貌而克制，保持观察',
      currentSoul?.frontmatter.core_incarnation ?? '',
    )
    return organicMemorySnapshot.value
  }

  async function searchOrganicSubconsciousFragments(query: string, limit = 12) {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) {
      organicMemorySearchResults.value = []
      return organicMemorySearchResults.value
    }

    const bridge = hasAlicizationBridge() ? getAlicizationBridge() : null
    if (!bridge?.searchOrganicSubconsciousFragments) {
      organicMemorySearchResults.value = []
      return organicMemorySearchResults.value
    }

    const result = await bridge.searchOrganicSubconsciousFragments({
      query: normalizedQuery,
      limit,
    }).catch(() => null)
    organicMemorySearchResults.value = result ?? []
    return organicMemorySearchResults.value
  }

  async function syncKillSwitchState() {
    if (!hasAlicizationBridge()) {
      killSwitch.value = {
        state: 'ACTIVE',
        reason: 'bridge-unavailable',
        updatedAt: Date.now(),
      }
      return killSwitch.value
    }

    const snapshot = await getAlicizationBridge().getKillSwitchState().catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  function setKillSwitchSnapshot(snapshot: AlicizationKillSwitchSnapshot) {
    killSwitch.value = snapshot
  }

  async function suspendKillSwitch(reason = 'manual-ui') {
    if (!hasAlicizationBridge())
      return killSwitch.value

    const snapshot = await getAlicizationBridge().suspendKillSwitch({ reason }).catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  async function resumeKillSwitch(reason = 'manual-ui') {
    if (!hasAlicizationBridge())
      return killSwitch.value

    const snapshot = await getAlicizationBridge().resumeKillSwitch({ reason }).catch(() => null)
    if (snapshot)
      killSwitch.value = snapshot
    return killSwitch.value
  }

  function stopGenesisPolling() {
    if (!genesisPollTimer)
      return

    clearInterval(genesisPollTimer)
    genesisPollTimer = undefined
  }

  function setupGenesisPolling() {
    if (genesisPollTimer || !hasAlicizationBridge())
      return

    genesisPollTimer = setInterval(() => {
      void (async () => {
        if (!needsGenesis.value || !hasAlicizationBridge()) {
          stopGenesisPolling()
          return
        }

        const latest = await getAlicizationBridge().getSoul().catch(() => null)
        if (!latest)
          return
        if (latest.hash === soul.value?.hash)
          return

        soul.value = latest
        needsGenesis.value = latest.needsGenesis
        if (latest.needsGenesis) {
          genesisConflictCandidate.value = latest
        }
        else {
          genesisConflictCandidate.value = null
          stopGenesisPolling()
        }
      })()
    }, genesisPollIntervalMs)
  }

  function stopAsyncExtractionFlushTimer() {
    if (!asyncExtractionFlushTimer)
      return
    clearTimeout(asyncExtractionFlushTimer)
    asyncExtractionFlushTimer = undefined
  }

  function scheduleAsyncExtractionFlush(delayMs = asyncExtractionIdleMs) {
    stopAsyncExtractionFlushTimer()
    asyncExtractionFlushTimer = setTimeout(() => {
      void flushPendingAsyncExtraction('idle')
    }, Math.max(500, delayMs))
  }

  async function runAsyncExtractionWithMainGateway(batch: PendingAsyncExtractionTurn[]) {
    if (!hasAlicizationBridge())
      return []

    const bridge = getAlicizationBridge()
    if (!bridge.streamChat || !bridge.getLlmConfig)
      return []

    const llmConfig = await bridge.getLlmConfig().catch(() => null)
    const providerId = llmConfig?.activeProviderId?.trim() ?? ''
    const model = llmConfig?.activeModelId?.trim() ?? ''
    if (!providerId || !model)
      return []

    const providerConfig = llmConfig?.providerCredentials?.[providerId] ?? {}
    if (!providerConfig || typeof providerConfig !== 'object' || Array.isArray(providerConfig))
      return []

    const carriedProjectAwarenessIdentities = batch
      .map(item => item.preDialogueSendIdentity)
      .filter((identity): identity is AlicizationPreDialogueSendIdentity => Boolean(identity))
    const needsFallbackProjectAwareness = batch.some(item => needsAsyncExtractionProjectAwarenessUpgrade(item.preDialogueSendIdentity))
    const fallbackProjectStateContinuitySnapshot = needsFallbackProjectAwareness
      ? bridge.getProjectStateContinuitySnapshot
        ? await bridge.getProjectStateContinuitySnapshot().catch(() => null)
        : null
      : null
    const fallbackObservedProjectState = !needsFallbackProjectAwareness || fallbackProjectStateContinuitySnapshot
      ? null
      : bridge.getLatestProjectStateObservation
        ? await bridge.getLatestProjectStateObservation().catch(() => null)
        : null
    const fallbackProjectAwarenessIdentity = needsFallbackProjectAwareness
      ? buildPreDialogueSendIdentityFromSnapshots({
          projectStateContinuitySnapshot: fallbackProjectStateContinuitySnapshot
            ?? projectStateObservationToContinuitySnapshot(fallbackObservedProjectState),
        })
      : null
    const resolvedProjectAwarenessIdentities = batch
      .map(item => resolveAsyncExtractionProjectAwarenessIdentity(
        item.preDialogueSendIdentity,
        fallbackProjectAwarenessIdentity,
      ))
      .filter((identity): identity is AlicizationPreDialogueSendIdentity => Boolean(identity))
    const projectAwarenessIdentities = resolvedProjectAwarenessIdentities.length > 0
      ? resolvedProjectAwarenessIdentities
      : [
          ...carriedProjectAwarenessIdentities,
          ...(fallbackProjectAwarenessIdentity ? [fallbackProjectAwarenessIdentity] : []),
        ]

    let output = ''
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort(new DOMException('Async extraction timed out.', 'AbortError'))
    }, 12_000)

    try {
      await bridge.streamChat({
        turnId: `memory-async-extract:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
        providerId,
        model,
        providerConfig: providerConfig as Record<string, unknown>,
        supportsTools: false,
        waitForTools: false,
        messages: [
          {
            role: 'system',
            content: buildAsyncExtractionProjectAwarenessPrompt(projectAwarenessIdentities),
          },
          {
            role: 'user',
            content: JSON.stringify({
              turns: batch.map(item => ({
                turnId: item.turnId,
                sessionId: item.sessionId,
                user: item.userText,
                assistant: item.assistantText,
                priority: item.priority,
                projectAwareness: serializeAsyncExtractionProjectAwareness(
                  resolveAsyncExtractionProjectAwarenessIdentity(
                    item.preDialogueSendIdentity,
                    fallbackProjectAwarenessIdentity,
                  ),
                ),
                mind: {
                  obligation: item.thoughtObligation,
                  truth: item.thoughtTruth,
                  focus: item.thoughtFocus,
                  format: item.structuredFormat,
                },
              })),
            }),
          },
        ],
      }, {
        abortSignal: abortController.signal,
        onStreamEvent: async (event) => {
          if (event.type === 'text-delta')
            output += event.text
          if (event.type === 'error')
            throw event.error ?? new Error('Async extraction stream failed.')
        },
      })
    }
    finally {
      clearTimeout(timeout)
    }

    return parseAsyncExtractionFacts(output)
  }

  async function flushPendingAsyncExtraction(trigger: 'batch' | 'idle' | 'force') {
    if (asyncExtractionInFlight)
      return

    const pending = pendingAsyncExtractionTurns.value
    if (pending.length === 0)
      return

    const budgetDecision = evaluateAsyncExtractionBudget({
      state: asyncExtractionBudgetState,
      now: Date.now(),
    })
    asyncExtractionBudgetState = budgetDecision.nextState
    if (!budgetDecision.allowed) {
      await appendAlicizationAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'async-extraction-budget-exhausted',
        message: 'Skipped async memory extraction because current budget window is exhausted.',
        details: {
          trigger,
          pendingCount: pending.length,
          consumed: asyncExtractionBudgetState.consumed,
          windowStartedAt: asyncExtractionBudgetState.windowStartedAt,
        },
      })
      scheduleAsyncExtractionFlush(60_000)
      return
    }

    asyncExtractionInFlight = true
    stopAsyncExtractionFlushTimer()
    const selection = pickAsyncExtractionBatch({
      pending,
      batchSize: asyncExtractionBatchThreshold,
    })
    const batch = selection.batch
    pendingAsyncExtractionTurns.value = selection.remaining
    if (batch.length === 0) {
      asyncExtractionInFlight = false
      return
    }

    try {
      const llmFacts = await runAsyncExtractionWithMainGateway(batch)
      const facts = llmFacts.length > 0
        ? llmFacts
        : batch.flatMap(item => extractRuleFacts({
            userText: item.userText,
            replyText: item.assistantText,
          }).map(fact => ({
            ...fact,
            confidence: Math.min(0.42, fact.confidence),
          })))
      const factSource = llmFacts.length > 0 ? 'async-llm' : 'rule-shadow'

      const batchPriority = {
        max: Math.max(...batch.map(item => item.priority)),
        min: Math.min(...batch.map(item => item.priority)),
        avg: Math.round(batch.reduce((sum, item) => sum + item.priority, 0) / batch.length),
      }

      if (facts.length > 0) {
        const traceCandidate = batch.find(item => Boolean(item.decisionTraceId)) ?? batch[0]
        await upsertFacts(facts, factSource, {
          trace: {
            decisionTraceId: traceCandidate?.decisionTraceId ?? null,
            turnId: traceCandidate?.turnId ?? null,
            sessionId: traceCandidate?.sessionId ?? null,
            origin: traceCandidate?.origin ?? 'user-turn',
            trigger,
            batchSize: batch.length,
            extractedCount: facts.length,
            extractionSource: factSource,
            batchPriority,
          },
        })
      }

      await appendAlicizationAuditLog({
        level: 'notice',
        category: 'alicization.memory',
        action: 'async-extraction-batch-flushed',
        message: 'Flushed pending async memory extraction batch.',
        details: {
          trigger,
          batchSize: batch.length,
          batchPriority,
          extractedCount: facts.length,
          llmExtractedCount: llmFacts.length,
          factSource,
          remainingCount: pendingAsyncExtractionTurns.value.length,
        },
      })
    }
    catch (error) {
      await appendAlicizationAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'async-extraction-batch-failed',
        message: 'Async memory extraction batch failed.',
        details: {
          trigger,
          batchSize: batch.length,
          reason: errorMessageFrom(error) ?? 'unknown-error',
          remainingCount: pendingAsyncExtractionTurns.value.length,
        },
      })
    }
    finally {
      asyncExtractionInFlight = false
      const pendingCount = pendingAsyncExtractionTurns.value.length
      if (pendingCount > 0) {
        const nextTrigger = resolvePendingAsyncExtractionTrigger(
          pendingAsyncExtractionTurns.value,
          Date.now(),
          asyncExtractionLastQueuedAt,
        )
        if (nextTrigger === 'force' || nextTrigger === 'batch')
          void flushPendingAsyncExtraction(nextTrigger)
        else
          scheduleAsyncExtractionFlush()
      }
    }
  }

  async function enqueueAsyncExtractionTurn(payload: {
    turnId: string
    sessionId: string
    userText: string
    assistantText: string
    preDialogueSendIdentity?: AlicizationPreDialogueSendIdentity | null
    origin?: 'user-turn' | 'subconscious-proactive'
    thought?: string | null
    structuredFormat?: string | null
    contractFailed?: boolean
    governance?: AlicizationMindTurnGovernance | null
  }) {
    const userText = payload.userText.trim()
    if (!userText)
      return

    const assistantText = payload.assistantText.trim()
    const thoughtObligation = payload.thought ? parseMindSignalField(payload.thought, 'obligation') : null
    const priority = deriveMindAwareExtractionPriority({
      userText,
      assistantText,
      thought: payload.thought,
      structuredFormat: payload.structuredFormat ?? null,
      contractFailed: payload.contractFailed,
      governance: payload.governance,
    })
    const nextItem: PendingAsyncExtractionTurn = {
      turnId: payload.turnId,
      sessionId: payload.sessionId,
      userText,
      assistantText,
      preDialogueSendIdentity: payload.preDialogueSendIdentity ?? null,
      dedupeKey: buildAsyncExtractionDedupeKey(userText, assistantText),
      priority,
      decisionTraceId: payload.governance?.decisionTraceId?.trim() || null,
      origin: payload.origin === 'subconscious-proactive' ? 'subconscious-proactive' : 'user-turn',
      thoughtObligation,
      thoughtTruth: payload.thought ? parseMindSignalField(payload.thought, 'truth') : null,
      thoughtFocus: payload.thought ? parseMindSignalField(payload.thought, 'focus') : null,
      structuredFormat: payload.structuredFormat ?? null,
      forceFlush: shouldForceAsyncExtractionTurn({
        userText,
        priority,
        thoughtObligation,
        structuredFormat: payload.structuredFormat ?? null,
        contractFailed: payload.contractFailed,
        governance: payload.governance,
      }),
      queuedAt: Date.now(),
    }

    if (hasAsyncExtractionDuplicate(pendingAsyncExtractionTurns.value, nextItem))
      return

    const trimmed = trimAsyncExtractionQueue({
      pending: [...pendingAsyncExtractionTurns.value, nextItem],
      maxPending: asyncExtractionMaxPendingTurns,
    })
    pendingAsyncExtractionTurns.value = trimmed.queue
    if (trimmed.dropped.length > 0) {
      await appendAlicizationAuditLog({
        level: 'notice',
        category: 'alicization.memory',
        action: 'async-extraction-queue-trimmed',
        message: 'Dropped low-priority pending async extraction turns to keep queue bounded.',
        details: {
          droppedCount: trimmed.dropped.length,
          dropped: trimmed.dropped.map(item => ({
            turnId: item.turnId,
            priority: item.priority,
            queuedAt: item.queuedAt,
          })),
          pendingCount: pendingAsyncExtractionTurns.value.length,
          maxPending: asyncExtractionMaxPendingTurns,
        },
      })
    }

    asyncExtractionLastQueuedAt = Date.now()

    const trigger = resolvePendingAsyncExtractionTrigger(
      pendingAsyncExtractionTurns.value,
      Date.now(),
      asyncExtractionLastQueuedAt,
    )
    if (trigger === 'force' || trigger === 'batch') {
      void flushPendingAsyncExtraction(trigger)
      return
    }

    scheduleAsyncExtractionFlush()
  }

  async function bootstrapRuntime() {
    if (!hasAlicizationBridge()) {
      needsGenesis.value = false
      stopGenesisPolling()
      organicMemorySnapshot.value = createEmptyOrganicMemorySnapshot()
      return
    }

    const snapshot = await getAlicizationBridge().bootstrap()
    soul.value = snapshot
    needsGenesis.value = snapshot.needsGenesis
    if (!snapshot.needsGenesis)
      genesisConflictCandidate.value = null
    if (snapshot.needsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: snapshot.frontmatter.host_attitude,
      coreIncarnation: snapshot.frontmatter.core_incarnation,
    }
  }

  async function initializeGenesis(payload: AlicizationGenesisInput) {
    if (!hasAlicizationBridge())
      return

    const result = await getAlicizationBridge().initializeGenesis(payload)
    const resolvedNeedsGenesis = result.soul.needsGenesis

    soul.value = result.soul
    needsGenesis.value = resolvedNeedsGenesis
    genesisConflictCandidate.value = result.conflictCandidate ?? null
    if (resolvedNeedsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: result.soul.frontmatter.host_attitude,
      coreIncarnation: result.soul.frontmatter.core_incarnation,
    }
    return result
  }

  async function refreshSoul() {
    if (!hasAlicizationBridge())
      return soul.value

    const snapshot = await getAlicizationBridge().getSoul().catch(() => null)
    if (snapshot)
      setSoulSnapshot(snapshot)
    return soul.value
  }

  async function updateSoulContent(content: string) {
    if (!hasAlicizationBridge() || !soul.value)
      return soul.value

    const updated = await getAlicizationBridge().updateSoul({
      expectedRevision: soul.value.revision,
      content,
    }).catch(() => null)

    if (updated)
      setSoulSnapshot(updated)
    return soul.value
  }

  async function updateSoulBody(body: string) {
    if (!soul.value)
      return soul.value

    const nextContent = replaceSoulBody(soul.value.content, body)
    if (extractSoulBody(nextContent) === extractSoulBody(soul.value.content))
      return soul.value
    return await updateSoulContent(nextContent)
  }

  function attachChatHooks() {
    const chatOrchestrator = useChatOrchestratorStore()

    hookDisposers.push(
      chatOrchestrator.onChatTurnComplete(async ({ output, outputText }, context) => {
        const userText = parseUserText(context.message.content)
        const assistantText = parseUserText(outputText || output.content)
        const structured = output.structured
        const turnId = output.id ?? context.message.id ?? nanoid()
        const sessionId = context.sessionId ?? 'unknown-session'
        const debugAuditEnabled = isAlicizationDebugAuditEnabled()

        if (output.origin !== 'subconscious-proactive' && userText.trim()) {
          void enqueueAsyncExtractionTurn({
            turnId,
            sessionId,
            userText,
            assistantText,
            preDialogueSendIdentity: context.preDialogueSendIdentity ?? null,
            origin: output.origin,
            thought: structured?.thought ?? null,
            structuredFormat: structured?.format ?? null,
            contractFailed: Boolean(structured?.contractFailed),
            governance: structured?.governance ?? null,
          }).catch(async (error) => {
            await appendAlicizationAuditLog({
              level: 'warning',
              category: 'alicization.memory',
              action: 'async-extraction-enqueue-failed',
              message: 'Failed to enqueue async memory extraction turn.',
              details: {
                turnId,
                sessionId,
                reason: errorMessageFrom(error) ?? 'unknown-error',
              },
            })
          })
        }

        await appendAlicizationAuditLog({
          level: 'info',
          category: 'emotion',
          action: 'assistant-turn-emotion',
          message: 'Recorded assistant turn emotion telemetry.',
          details: {
            sessionId,
            turnId,
            emotion: structured?.emotion ?? 'neutral',
            parsePath: structured?.parsePath ?? 'fallback',
            contractFailed: Boolean(structured?.contractFailed),
            policyLocked: structured?.policyLocked ?? null,
            format: structured?.format ?? 'fallback-v1',
            thoughtDigest: structured?.thought ? createThoughtDigest(structured.thought) : undefined,
            thought: debugAuditEnabled && structured?.thought
              ? structured.thought
              : undefined,
          },
        })

        if (structured?.contractFailed) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'structured-output',
            action: 'provider-payload-invalid-skip-learning',
            message: 'Skipped personality drift because provider payload validation failed.',
            details: {
              sessionId,
              turnId,
              parsePath: structured.parsePath,
              format: structured.format,
            },
          })
          lastAssistantEmotion = structured.emotion || lastAssistantEmotion
          return
        }

        if (structured?.policyLocked) {
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'policy-lock',
            action: 'policy-locked-skip-learning',
            message: 'Skipped personality drift for policy-locked turn.',
            details: {
              sessionId,
              turnId,
              policyLocked: structured.policyLocked,
            },
          })
          lastAssistantEmotion = structured.emotion || lastAssistantEmotion
          return
        }

        const lexicalStrength = Math.abs(estimateLexicalSentiment(structured?.reply ?? parseUserText(output.content)))
        const emotionalCoherence = lastAssistantEmotion
          ? (lastAssistantEmotion === structured?.emotion ? 1 : 0.55)
          : 0.7
        const calibratedConfidence = calibrateSentimentConfidence({
          rawConfidence: structured?.sentimentConfidenceRaw,
          lexicalStrength,
          emotionCoherence: emotionalCoherence,
          extractorAgreement: 0.5,
        })

        if (!structured || !hasAlicizationBridge())
          return

        structured.sentimentConfidence = calibratedConfidence
        const confidence = calibratedConfidence
        if (confidence < 0.25) {
          lastAssistantEmotion = structured.emotion
          return
        }
        const userSignal = estimateLexicalSentiment(userText)
        const modelScore = clamp(structured.userSentimentScore ?? 0, -1, 1)
        const weightedScore = clamp(userSignal * 0.75 + modelScore * 0.25, -1, 1)
        const confidenceDecay = confidence < 0.35
          ? clamp(confidence / 0.35, 0, 1)
          : 1
        const effectiveScore = clamp(weightedScore * confidenceDecay, -1, 1)

        await appendAlicizationAuditLog({
          level: 'info',
          category: 'alicization.personality',
          action: 'drift-signal',
          message: 'Computed autonomous personality drift signal from user-first sentiment weighting.',
          details: {
            sessionId,
            turnId,
            userSignal,
            modelScore,
            effectiveScore,
            confidence,
          },
        })

        const delta = computePersonalityDelta(effectiveScore, confidence)
        if (
          Math.abs(delta.obedience) <= 0.0001
          && Math.abs(delta.liveliness) <= 0.0001
          && Math.abs(delta.sensibility) <= 0.0001
        ) {
          lastAssistantEmotion = structured.emotion
          return
        }

        const nextSoul = await getAlicizationBridge().updatePersonality({
          expectedRevision: soul.value?.revision,
          reason: 'epoch1-sentiment-drift',
          deltas: delta,
        }).catch(() => null)

        if (nextSoul) {
          soul.value = nextSoul
          await appendAlicizationAuditLog({
            level: 'notice',
            category: 'personality-drift',
            action: 'personality-drift-updated',
            message: 'Applied autonomous multi-axis personality drift from structured turn sentiment.',
            details: {
              sessionId,
              turnId,
              userSignal,
              modelScore,
              effectiveScore,
              confidence,
              delta,
            },
          })
        }
        lastAssistantEmotion = structured.emotion
      }),
    )
  }

  async function initialize() {
    if (initialized)
      return
    initialized = true

    await bootstrapRuntime()
    attachChatHooks()
    await syncMemoryStatsToRuntime()
    await syncKillSwitchState()
    await refreshOrganicMemorySnapshot()
  }

  function setSoulSnapshot(snapshot: AlicizationSoulSnapshot) {
    soul.value = snapshot
    needsGenesis.value = snapshot.needsGenesis
    if (!snapshot.needsGenesis)
      genesisConflictCandidate.value = null
    if (snapshot.needsGenesis)
      setupGenesisPolling()
    else
      stopGenesisPolling()
    organicMemorySnapshot.value = {
      ...organicMemorySnapshot.value,
      hostAttitude: snapshot.frontmatter.host_attitude,
      coreIncarnation: snapshot.frontmatter.core_incarnation,
    }
  }

  function dispose() {
    for (const disposer of hookDisposers.splice(0, hookDisposers.length)) {
      disposer()
    }

    stopGenesisPolling()
    stopAsyncExtractionFlushTimer()
    pendingAsyncExtractionTurns.value = []
    asyncExtractionInFlight = false
    asyncExtractionLastQueuedAt = null
    asyncExtractionBudgetState = {
      windowStartedAt: Date.now(),
      consumed: 0,
    }
    lastAssistantEmotion = null
    initialized = false
  }

  return {
    soul,
    needsGenesis,
    memoryStats,
    organicMemorySnapshot,
    organicMemorySearchResults,
    genesisConflictCandidate,
    killSwitch,
    initialize,
    initializeGenesis,
    setSoulSnapshot,
    setKillSwitchSnapshot,
    refreshSoul,
    updateSoulContent,
    updateSoulBody,
    suspendKillSwitch,
    resumeKillSwitch,
    syncKillSwitchState,
    refreshMemoryStats,
    refreshOrganicMemorySnapshot,
    searchOrganicSubconsciousFragments,
    runPruneNow,
    dispose,
  }
})
