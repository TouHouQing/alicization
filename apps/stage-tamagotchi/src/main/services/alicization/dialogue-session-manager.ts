import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'
import type { OrganicMemoryPromptContext, OrganicMemoryRecollectionCarry } from './runtime-soul'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
} from '@proj-alicization/stage-shared'

import { deriveAlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'

export interface AlicizationDialogueSessionMirror {
  agencySummary: string | null
  cardId: string
  continuityArcSummary?: string | null
  continuityProjectSummary?: string | null
  continuityLabels: string[]
  decisionTraceId: string | null
  dialogueSummary: string | null
  digitalLifeArchitectureSummary: string | null
  digitalLifeRuntimeSummary: string | null
  runtimeChannelSummary?: string | null
  runtimeTransitionSummary?: string | null
  captureSummary: string
  executionSummary: string | null
  mindSummary: string | null
  memoryCarrySummary: string | null
  memorySummary: string | null
  recollection: AlicizationDialogueSessionRecollectionState | null
  perceptionSummary: string | null
  sessionId: string
  sessionPhases: string[]
  toolingSummary: string
  updatedAt: number
}

export type AlicizationDialogueSessionRecollectionState = OrganicMemoryRecollectionCarry

export interface AlicizationDialogueSessionManager {
  /**
   * Session mirrors are audit state, not a prompt owner.
   *
   * WorkingMemory and LongTermMemoryRecall own dialogue context. Keeping this
   * method in the contract lets callers stay transport-compatible while making
   * the old mirror prompt path inert.
   */
  buildSessionMirrorSystemBlock: (input: {
    cardId: string
    sessionId: string
  }) => string
  clear: (cardId?: string) => void
  getSessionMirror: (cardId: string, sessionId: string) => AlicizationDialogueSessionMirror | null
  ingestAgentSessionSnapshot: (input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    decisionTraceId?: string | null
    sessionId: string
    sessionPhases?: string[]
    source: string
  }) => AlicizationDialogueSessionMirror
  ingestPreparedExecution: (input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
    organicMemoryContext?: OrganicMemoryPromptContext | null
    runtimeSurface: AlicizationMainChatRuntimeSurface
    sessionId: string
  }) => AlicizationDialogueSessionMirror
}

interface CreateAlicizationDialogueSessionManagerOptions {
  getNow?: () => number
  maxContinuityLabels?: number
  maxSessionPhases?: number
  staleAfterMs?: number
}

const defaultSessionMirrorStaleAfterMs = 10 * 60 * 1000
const defaultMaxContinuityLabels = 6
const defaultMaxSessionPhases = 10

const legacyGovernancePattern
  = /same[-_ ]?her|same[-_ ]?living|project[-_ ]?state|project[-_ ]?continuity|continuity[-_ ]?(?:hold|mode|arc|timing|cadence|governance|baseline|carry|closure|self|anchor|identity|line|thread)|opening[_ -]?policy|relationship[_ -]?cadence|visibility\s*=\s*(?:redacted_)?internal|before (?:answering|speaking|acting)|phase\s*1\s*(?:digital|local)[- ]?life|local[- ]first digital life project/iu

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeFactText(raw: unknown, maxChars = 320) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized || normalized === alicizationFixedTemplateReplacement)
    return ''
  if (containsAlicizationFixedTemplateResidue(normalized) || legacyGovernancePattern.test(normalized))
    return ''

  return normalized
}

function buildMirrorKey(cardId: string, sessionId: string) {
  return `${cardId}::${sessionId}`
}

function cloneMirror(mirror: AlicizationDialogueSessionMirror): AlicizationDialogueSessionMirror {
  return {
    ...mirror,
    continuityLabels: [...mirror.continuityLabels],
    recollection: mirror.recollection ? { ...mirror.recollection } : null,
    sessionPhases: [...mirror.sessionPhases],
  }
}

function takeTailUnique(values: unknown[], limit: number, maxChars = 120) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const text = sanitizeFactText(values[index], maxChars)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    normalized.push(text)
    if (normalized.length >= limit)
      break
  }

  return normalized.reverse()
}

function asRecord(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function hasUsableDigitalLifeRuntimeSurface(
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null | undefined,
) {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

function resolvePreferredPreparedRuntimeSurface(surface: AlicizationMainChatRuntimeSurface) {
  const preparedRuntimeSurface = surface.digitalLifeRuntimeSurface ?? null
  const spineRuntimeSurface = surface.digitalLifeSpine?.runtimeSurface ?? null
  if (hasUsableDigitalLifeRuntimeSurface(preparedRuntimeSurface))
    return preparedRuntimeSurface
  if (hasUsableDigitalLifeRuntimeSurface(spineRuntimeSurface))
    return spineRuntimeSurface
  return preparedRuntimeSurface ?? spineRuntimeSurface
}

function resolveUsableRuntimeSurfaceFromSpine(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  return hasUsableDigitalLifeRuntimeSurface(spine?.runtimeSurface ?? null)
    ? spine?.runtimeSurface ?? null
    : null
}

function sanitizeMirrorDigitalLifeSpine(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  if (!spine?.runtimeSurface || hasUsableDigitalLifeRuntimeSurface(spine.runtimeSurface))
    return spine ?? null

  const { runtimeSurface: _ignoredRuntimeSurface, ...digestLikeSpine } = spine as AlicizationDigitalLifeSpineSnapshot & {
    runtimeSurface?: AlicizationDigitalLifeSpineSnapshot['runtimeSurface'] | null
  }
  return digestLikeSpine as AlicizationDigitalLifeSpineSnapshot
}

function resolveDigitalLifeSpineUpdatedAt(
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined,
) {
  return Number(
    spine?.runtime?.updatedAt
    ?? spine?.runtimeSurface?.perception?.updatedAt
    ?? 0,
  )
}

function preferMoreRecentDigitalLifeSpine(input: {
  preparedRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  runtimeSurfaceSpine: AlicizationDigitalLifeSpineSnapshot | null | undefined
}) {
  const preparedSpine = input.preparedRuntimeSurface
    ? deriveAlicizationDigitalLifeSpineFromSurface(input.preparedRuntimeSurface)
    : null
  const runtimeSurfaceSpine = sanitizeMirrorDigitalLifeSpine(input.runtimeSurfaceSpine)
  if (!preparedSpine)
    return runtimeSurfaceSpine
  if (!runtimeSurfaceSpine)
    return preparedSpine

  return resolveDigitalLifeSpineUpdatedAt(runtimeSurfaceSpine) >= resolveDigitalLifeSpineUpdatedAt(preparedSpine)
    ? runtimeSurfaceSpine
    : preparedSpine
}

function summarizeTooling(input: {
  agentSession: AlicizationAgentSessionSnapshot
  source?: string
}) {
  const recentTaskLabels = takeTailUnique(
    input.agentSession.tasks.map(task => task.label),
    3,
    64,
  )
  return [
    input.source ? `source=${sanitizeFactText(input.source, 48) || 'unknown'}` : '',
    `recent_actions=${recentTaskLabels.join(',') || 'none'}`,
  ].filter(Boolean).join(' ')
}

function summarizeCapture(snapshot: AlicizationSensoryCacheSnapshot | null | undefined) {
  return [
    `health=${sanitizeFactText(snapshot?.capture?.health, 32) || 'unknown'}`,
    `permission=${sanitizeFactText(snapshot?.capture?.permission, 32) || 'unknown'}`,
    'fallback=none',
  ].join(' ')
}

function summarizeDialogueFromSurface(
  surface: AlicizationMainChatRuntimeSurface,
) {
  const runtimeSurface = resolvePreferredPreparedRuntimeSurface(surface)
  return [
    surface.trace.turnMode ? `turn=${sanitizeFactText(surface.trace.turnMode, 48)}` : '',
    surface.trace.personaKernelMode ? `persona=${sanitizeFactText(surface.trace.personaKernelMode, 48)}` : '',
    runtimeSurface?.dialogue?.dialogueEncounter?.subject
      ? `subject=${sanitizeFactText(runtimeSurface.dialogue.dialogueEncounter.subject, 64)}`
      : '',
    runtimeSurface?.dialogue?.answerPlanner?.answerIntent
      ? `answer=${sanitizeFactText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
    runtimeSurface?.dialogue?.replyDeliberation?.speakingFrom
      ? `voice=${sanitizeFactText(runtimeSurface.dialogue.replyDeliberation.speakingFrom, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeDialogueFromSpine(input: {
  decisionTraceId?: string | null
  source?: string
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
}) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(input.spine)
  return [
    input.source ? `source=${sanitizeText(input.source, 48) || 'unknown'}` : '',
    input.decisionTraceId ? `trace=${sanitizeFactText(input.decisionTraceId, 120)}` : '',
    runtimeSurface?.dialogue?.dialogueEncounter?.subject
      ? `subject=${sanitizeFactText(runtimeSurface.dialogue.dialogueEncounter.subject, 64)}`
      : '',
    runtimeSurface?.dialogue?.answerPlanner?.answerIntent
      ? `answer=${sanitizeFactText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizePerceptionFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const attention = runtimeSurface?.perception?.attention ?? null
  const attentionTarget = sanitizeFactText(
    attention?.target?.title
    ?? attention?.target?.appName
    ?? attention?.target?.processName
    ?? '',
    120,
  )

  return [
    digest?.runtime?.watchMode ? `watch=${sanitizeFactText(digest.runtime.watchMode, 48)}` : '',
    digest?.runtime?.sceneSummary ? `scene=${sanitizeFactText(digest.runtime.sceneSummary, 160)}` : '',
    attentionTarget ? `attention=${attentionTarget}` : '',
    attention?.source ? `source=${sanitizeFactText(attention.source, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeMindFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const runtime = digest?.runtime
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const privateThought = runtimeSurface?.cognition?.privateThought ?? null
  const beliefs = Array.isArray(runtimeSurface?.cognition?.beliefLedger?.beliefs)
    ? runtimeSurface.cognition.beliefLedger.beliefs
    : []
  const focusBelief = beliefs[0] as { statement?: unknown, summary?: unknown } | undefined

  return [
    runtime?.dominantMode ? `mode=${sanitizeFactText(runtime.dominantMode, 48)}` : '',
    runtime?.dominantDrive ? `drive=${sanitizeFactText(runtime.dominantDrive, 48)}` : '',
    privateThought?.mindNeed ? `need=${sanitizeFactText(privateThought.mindNeed, 64)}` : '',
    focusBelief?.statement || focusBelief?.summary
      ? `belief=${sanitizeFactText(focusBelief.statement ?? focusBelief.summary, 120)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeAgencyFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const proactive = digest?.proactive
  if (!proactive)
    return ''

  return [
    proactive.selectedAction ? `action=${sanitizeFactText(proactive.selectedAction, 64)}` : '',
    typeof proactive.shouldSpeak === 'boolean'
      ? `speak=${proactive.shouldSpeak ? 'true' : 'false'}`
      : '',
    proactive.preferredStyle ? `style=${sanitizeFactText(proactive.preferredStyle, 64)}` : '',
    proactive.leadingGoalSummary ? `goal=${sanitizeFactText(proactive.leadingGoalSummary, 160)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeMemoryFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const memory = digest?.memory
  if (!memory)
    return ''

  return [
    memory.summary ? sanitizeFactText(memory.summary, 220) : '',
    !memory.summary && memory.recentEpisodeSummary
      ? `recent=${sanitizeFactText(memory.recentEpisodeSummary, 140)}`
      : '',
    !memory.summary && memory.leadingGoalSummary
      ? `goal=${sanitizeFactText(memory.leadingGoalSummary, 140)}`
      : '',
    !memory.summary && memory.recallMode
      ? `recall=${sanitizeFactText(memory.recallMode, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeRuntimeChannelFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtime = deriveAlicizationRuntimeSnapshot({ spine })
  if (!runtime)
    return ''

  return [
    runtime.dominantChannel ? `dominant=${sanitizeFactText(runtime.dominantChannel, 48)}` : '',
    runtime.autonomy?.selectedMode ? `mode=${sanitizeFactText(runtime.autonomy.selectedMode, 48)}` : '',
    runtime.autonomy?.visibleAction ? `action=${sanitizeFactText(runtime.autonomy.visibleAction, 80)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeRuntimeTransitionFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const runtimeSurface = resolveUsableRuntimeSurfaceFromSpine(spine)
  const recentTransition = runtimeSurface?.perception?.recentTransition ?? null
  if (!recentTransition)
    return ''

  return [
    recentTransition.fromWatchMode ? `from=${sanitizeFactText(recentTransition.fromWatchMode, 48)}` : '',
    recentTransition.toWatchMode ? `to=${sanitizeFactText(recentTransition.toWatchMode, 48)}` : '',
    recentTransition.fromScenario ? `scenario=${sanitizeFactText(recentTransition.fromScenario, 64)}` : '',
    recentTransition.reason ? `reason=${sanitizeFactText(recentTransition.reason, 160)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeExecutionFromAgentSession(agentSession: AlicizationAgentSessionSnapshot) {
  const executorTasks = agentSession.tasks.filter(task => task.kind === 'executor')
  if (executorTasks.length === 0)
    return ''

  const latestTask = executorTasks.at(-1) ?? null
  const latestMetadata = asRecord(latestTask?.metadata)
  const latestStatus = sanitizeFactText(
    latestMetadata?.threadStatus ?? latestTask?.status,
    32,
  ) || 'unknown'
  const latestGoal = sanitizeFactText(latestMetadata?.goal, 160)
  const latestSummary = sanitizeFactText(latestTask?.summary, 180)

  return [
    `status=${latestStatus}`,
    latestGoal ? `goal=${latestGoal}` : '',
    latestSummary ? `summary=${latestSummary}` : '',
    `recent=${takeTailUnique(executorTasks.map(task => task.label), 3, 72).join(',') || 'none'}`,
  ].filter(Boolean).join(' | ')
}

function deriveSessionMirrorRecollectionState(
  context: OrganicMemoryPromptContext | null | undefined,
): AlicizationDialogueSessionRecollectionState | null {
  const deliberation = context?.memoryDeliberation ?? null
  const intent = context?.recollectionIntent ?? null
  const plan = context?.recollectionPlan ?? null
  const speech = context?.recollectionSpeechPlan ?? null
  const narrative = context?.recollectionNarratives?.[0] ?? null
  if (!deliberation && !intent && !plan && !speech && !narrative)
    return null

  const foreground = sanitizeFactText(
    deliberation?.inwardLine
    ?? plan?.opening
    ?? narrative?.recallCenter
    ?? '',
    180,
  ) || null
  const certainty = speech?.certainty ?? plan?.certainty ?? narrative?.certainty ?? null
  const rawConfidence = deliberation?.confidence
    ?? plan?.confidence
    ?? speech?.confidence
    ?? narrative?.confidence
  const confidence = Number.isFinite(rawConfidence)
    ? Math.max(0, Math.min(1, Number(rawConfidence)))
    : null
  const rawMode = intent?.mode ?? narrative?.mode ?? null
  const mode = rawMode && rawMode !== 'none' ? rawMode : null
  const surfaceMode = deliberation?.surfacePolicy ?? speech?.surfaceMode ?? null
  const placement = speech?.placement ?? null
  const hasSurfaceDecision = Boolean(deliberation || speech)

  return {
    afterthoughtState: (
      hasSurfaceDecision
      && deliberation?.shouldRecall !== false
      && (surfaceMode === 'internal-only' || placement === 'internal-only')
      && (confidence ?? 0) >= 0.68
    )
      ? 'ripe'
      : 'resting',
    certainty,
    confidence,
    foreground,
    mode,
    placement,
    surfaceMode,
    visibility: hasSurfaceDecision
      ? deliberation?.shouldRecall === false || speech?.shouldSurface !== true
        ? 'inward'
        : 'visible'
      : null,
  }
}

function buildMirrorBase(input: {
  agentSession: AlicizationAgentSessionSnapshot
  cardId: string
  decisionTraceId?: string | null
  digitalLifeSpine: AlicizationDigitalLifeSpineSnapshot | null
  getNow: () => number
  previousMirror?: AlicizationDialogueSessionMirror | null
  recollection?: AlicizationDialogueSessionRecollectionState | null
  sessionId: string
  maxContinuityLabels: number
  maxSessionPhases: number
  sessionPhases: string[]
  source?: string
  runtimeSurface?: AlicizationMainChatRuntimeSurface | null
}) {
  const spine = input.digitalLifeSpine
  const runtimeSurface = input.runtimeSurface
  const updatedAt = resolveDigitalLifeSpineUpdatedAt(spine)
  const previous = input.previousMirror
  const dialogueSummary = runtimeSurface
    ? summarizeDialogueFromSurface(runtimeSurface)
    : summarizeDialogueFromSpine({
        decisionTraceId: input.decisionTraceId,
        source: input.source,
        spine,
      })

  return {
    cardId: input.cardId,
    sessionId: input.sessionId,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0
      ? updatedAt
      : Number.isFinite(input.agentSession.lastActiveAt)
        ? Number(input.agentSession.lastActiveAt)
        : input.getNow(),
    decisionTraceId: sanitizeFactText(input.decisionTraceId, 200)
      || previous?.decisionTraceId
      || null,
    continuityArcSummary: null,
    continuityProjectSummary: null,
    continuityLabels: takeTailUnique(
      input.agentSession.continuitySignals
        .filter(signal => signal.kind !== 'execution-callback')
        .map(signal => signal.label),
      input.maxContinuityLabels,
      80,
    ),
    sessionPhases: takeTailUnique(input.sessionPhases, input.maxSessionPhases, 80),
    toolingSummary: summarizeTooling({
      agentSession: input.agentSession,
      source: input.source,
    }),
    captureSummary: runtimeSurface
      ? summarizeCapture(runtimeSurface.digitalLifeRuntimeSurface?.perception?.captureState
          ? input.agentSession.lastSensorySnapshot
          : input.agentSession.lastSensorySnapshot)
      : summarizeCapture(input.agentSession.lastSensorySnapshot),
    digitalLifeArchitectureSummary: sanitizeFactText(
      spine?.architecture?.summary
      ?? runtimeSurface?.digitalLifeArchitecture?.summary
      ?? input.agentSession.digitalLifeArchitecture?.summary
      ?? '',
      220,
    ) || previous?.digitalLifeArchitectureSummary || null,
    digitalLifeRuntimeSummary: sanitizeFactText(
      spine?.continuitySignal?.summary ?? '',
      220,
    ) || previous?.digitalLifeRuntimeSummary || null,
    runtimeChannelSummary: sanitizeFactText(
      summarizeRuntimeChannelFromSpine(spine),
      220,
    ) || previous?.runtimeChannelSummary || null,
    runtimeTransitionSummary: sanitizeFactText(
      summarizeRuntimeTransitionFromSpine(spine),
      220,
    ) || previous?.runtimeTransitionSummary || null,
    mindSummary: sanitizeFactText(
      summarizeMindFromSpine(spine),
      220,
    ) || previous?.mindSummary || null,
    memoryCarrySummary: sanitizeFactText(
      deriveAlicizationDialogueMemoryCarryPolicy({
        now: input.getNow(),
        spine,
      }).summary,
      220,
    ) || previous?.memoryCarrySummary || null,
    memorySummary: sanitizeFactText(
      summarizeMemoryFromSpine(spine),
      220,
    ) || previous?.memorySummary || null,
    recollection: input.recollection ?? previous?.recollection ?? null,
    perceptionSummary: sanitizeFactText(
      summarizePerceptionFromSpine(spine),
      220,
    ) || previous?.perceptionSummary || null,
    agencySummary: sanitizeFactText(
      summarizeAgencyFromSpine(spine),
      220,
    ) || previous?.agencySummary || null,
    executionSummary: sanitizeFactText(
      summarizeExecutionFromAgentSession(input.agentSession),
      220,
    ) || previous?.executionSummary || null,
    dialogueSummary: sanitizeFactText(dialogueSummary, 220) || previous?.dialogueSummary || null,
  } satisfies AlicizationDialogueSessionMirror
}

export function createAlicizationDialogueSessionManager(
  options: CreateAlicizationDialogueSessionManagerOptions = {},
): AlicizationDialogueSessionManager {
  const getNow = options.getNow ?? Date.now
  const maxContinuityLabels = Math.max(1, Math.floor(options.maxContinuityLabels ?? defaultMaxContinuityLabels))
  const maxSessionPhases = Math.max(1, Math.floor(options.maxSessionPhases ?? defaultMaxSessionPhases))
  const staleAfterMs = Math.max(1, Math.floor(options.staleAfterMs ?? defaultSessionMirrorStaleAfterMs))
  const mirrors = new Map<string, AlicizationDialogueSessionMirror>()

  function pruneExpiredMirrors() {
    const now = getNow()
    for (const [key, mirror] of mirrors.entries()) {
      if (now - mirror.updatedAt > staleAfterMs)
        mirrors.delete(key)
    }
  }

  function clear(cardId?: string) {
    if (!cardId) {
      mirrors.clear()
      return
    }

    const normalizedCardId = sanitizeText(cardId, 120)
    for (const [key, mirror] of mirrors.entries()) {
      if (mirror.cardId === normalizedCardId)
        mirrors.delete(key)
    }
  }

  function getSessionMirror(cardId: string, sessionId: string) {
    pruneExpiredMirrors()
    const normalizedCardId = sanitizeText(cardId, 120)
    const normalizedSessionId = sanitizeText(sessionId, 160)
    if (!normalizedCardId || !normalizedSessionId)
      return null

    const mirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    return mirror ? cloneMirror(mirror) : null
  }

  function storeMirror(mirror: AlicizationDialogueSessionMirror) {
    mirrors.set(buildMirrorKey(mirror.cardId, mirror.sessionId), mirror)
    return cloneMirror(mirror)
  }

  function ingestPreparedExecution(input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
    organicMemoryContext?: OrganicMemoryPromptContext | null
    runtimeSurface: AlicizationMainChatRuntimeSurface
    sessionId: string
  }) {
    pruneExpiredMirrors()
    const cardId = sanitizeText(input.cardId, 120) || 'default'
    const sessionId = sanitizeText(input.sessionId, 160)
    if (!sessionId)
      throw new Error('dialogue session manager requires a non-empty session id')

    const key = buildMirrorKey(cardId, sessionId)
    const previousMirror = mirrors.get(key) ?? null
    const preferredRuntimeSurface = resolvePreferredPreparedRuntimeSurface(input.runtimeSurface)
    const digitalLifeSpine = preferMoreRecentDigitalLifeSpine({
      preparedRuntimeSurface: preferredRuntimeSurface,
      runtimeSurfaceSpine: input.digitalLifeSpine ?? input.runtimeSurface.digitalLifeSpine ?? null,
    })

    return storeMirror(buildMirrorBase({
      agentSession: input.agentSession,
      cardId,
      decisionTraceId: input.runtimeSurface.trace.decisionTraceId,
      digitalLifeSpine,
      getNow,
      previousMirror,
      recollection: deriveSessionMirrorRecollectionState(input.organicMemoryContext),
      maxContinuityLabels,
      maxSessionPhases,
      runtimeSurface: input.runtimeSurface,
      sessionId,
      sessionPhases: input.runtimeSurface.trace.sessionPhases,
    }))
  }

  function ingestAgentSessionSnapshot(input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    decisionTraceId?: string | null
    sessionId: string
    sessionPhases?: string[]
    source: string
  }) {
    pruneExpiredMirrors()
    const cardId = sanitizeText(input.cardId, 120) || 'default'
    const sessionId = sanitizeText(input.sessionId, 160)
    if (!sessionId)
      throw new Error('dialogue session manager requires a non-empty session id')

    const previousMirror = mirrors.get(buildMirrorKey(cardId, sessionId)) ?? null
    const digitalLifeSpine = sanitizeMirrorDigitalLifeSpine(input.agentSession.digitalLifeSpine ?? null)
    return storeMirror(buildMirrorBase({
      agentSession: input.agentSession,
      cardId,
      decisionTraceId: input.decisionTraceId,
      digitalLifeSpine,
      getNow,
      previousMirror,
      maxContinuityLabels,
      maxSessionPhases,
      sessionId,
      sessionPhases: [
        ...(input.sessionPhases ?? []),
        `source:${sanitizeText(input.source, 48) || 'unknown'}`,
      ],
      source: input.source,
    }))
  }

  function buildSessionMirrorSystemBlock(input: {
    cardId: string
    sessionId: string
  }) {
    void input
    return ''
  }

  return {
    buildSessionMirrorSystemBlock,
    clear,
    getSessionMirror,
    ingestAgentSessionSnapshot,
    ingestPreparedExecution,
  }
}
