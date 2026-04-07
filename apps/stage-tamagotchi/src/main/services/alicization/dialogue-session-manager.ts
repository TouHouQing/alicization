import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'

import { deriveAlicizationDialogueMemoryCarryPolicy } from './dialogue-memory-governor'
import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'

export interface AlicizationDialogueSessionMirror {
  agencySummary: string | null
  cardId: string
  continuityLabels: string[]
  decisionTraceId: string | null
  dialogueSummary: string | null
  digitalLifeArchitectureSummary: string | null
  digitalLifeRuntimeSummary: string | null
  captureSummary: string
  executionSummary: string | null
  mindSummary: string | null
  memoryCarrySummary: string | null
  memorySummary: string | null
  perceptionSummary: string | null
  sessionId: string
  sessionPhases: string[]
  toolingSummary: string
  updatedAt: number
}

export interface AlicizationDialogueSessionManager {
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

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function buildMirrorKey(cardId: string, sessionId: string) {
  return `${cardId}::${sessionId}`
}

function takeTailUnique(values: unknown[], limit: number, maxChars = 120) {
  const normalized: string[] = []
  const seen = new Set<string>()

  for (let index = values.length - 1; index >= 0; index -= 1) {
    const text = sanitizeText(values[index], maxChars)
    if (!text || seen.has(text))
      continue
    seen.add(text)
    normalized.push(text)
    if (normalized.length >= limit)
      break
  }

  return normalized.reverse()
}

function cloneMirror(mirror: AlicizationDialogueSessionMirror): AlicizationDialogueSessionMirror {
  return {
    ...mirror,
    continuityLabels: [...mirror.continuityLabels],
    sessionPhases: [...mirror.sessionPhases],
  }
}

function summarizeTooling(input: {
  agentSession: AlicizationAgentSessionSnapshot
  surface: AlicizationMainChatRuntimeSurface
}) {
  const recentTaskLabels = takeTailUnique(
    input.agentSession.tasks.map(task => task.label),
    3,
    64,
  )
  return [
    `allow=${input.surface.tooling.allowTools ? 'true' : 'false'}`,
    `wait=${input.surface.tooling.waitForTools ? 'true' : 'false'}`,
    `routing=${input.surface.tooling.routingRequired ? 'required' : 'optional'}`,
    `enforced=${input.surface.tooling.enforcedToolNames.join(',') || 'none'}`,
    `recent_actions=${recentTaskLabels.join(',') || 'none'}`,
  ].join(' ')
}

function summarizeCapture(surface: AlicizationMainChatRuntimeSurface) {
  return [
    `grounded=${surface.capture.groundedThisTurn ? 'true' : 'false'}`,
    `inspection=${surface.capture.inspectionRequested ? 'true' : 'false'}`,
    `health=${surface.capture.health ?? 'unknown'}`,
    `permission=${surface.capture.permission ?? 'unknown'}`,
    surface.capture.fallbackReason
      ? `fallback=${sanitizeText(surface.capture.fallbackReason, 120)}`
      : 'fallback=none',
  ].join(' ')
}

function summarizeDialogue(surface: AlicizationMainChatRuntimeSurface) {
  const runtimeSurface = surface.digitalLifeSpine?.runtimeSurface ?? surface.digitalLifeRuntimeSurface
  if (!runtimeSurface)
    return ''

  return [
    surface.trace.turnMode ? `turn=${surface.trace.turnMode}` : '',
    `persona=${surface.trace.personaKernelMode}`,
    runtimeSurface.dialogue.dialogueEncounter?.subject
      ? `subject=${sanitizeText(runtimeSurface.dialogue.dialogueEncounter.subject, 48)}`
      : '',
    runtimeSurface.dialogue.answerPlanner?.answerIntent
      ? `answer=${sanitizeText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
    runtimeSurface.dialogue.replyDeliberation?.speakingFrom
      ? `voice=${sanitizeText(runtimeSurface.dialogue.replyDeliberation.speakingFrom, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeDialogueFromSpine(input: {
  decisionTraceId?: string | null
  personaKernelMode?: string | null
  source?: string
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
  turnMode?: string | null
}) {
  const runtimeSurface = input.spine?.runtimeSurface
  if (!runtimeSurface && !input.source)
    return ''

  return [
    input.source ? `source=${sanitizeText(input.source, 48)}` : '',
    input.turnMode ? `turn=${sanitizeText(input.turnMode, 48)}` : '',
    input.personaKernelMode ? `persona=${sanitizeText(input.personaKernelMode, 48)}` : '',
    input.decisionTraceId ? `trace=${sanitizeText(input.decisionTraceId, 120)}` : '',
    runtimeSurface?.dialogue.dialogueEncounter?.subject
      ? `subject=${sanitizeText(runtimeSurface.dialogue.dialogueEncounter.subject, 48)}`
      : '',
    runtimeSurface?.dialogue.answerPlanner?.answerIntent
      ? `answer=${sanitizeText(runtimeSurface.dialogue.answerPlanner.answerIntent, 64)}`
      : '',
    runtimeSurface?.dialogue.replyDeliberation?.speakingFrom
      ? `voice=${sanitizeText(runtimeSurface.dialogue.replyDeliberation.speakingFrom, 48)}`
      : '',
  ].filter(Boolean).join(' | ')
}

function summarizeToolingFromAgentSession(input: {
  agentSession: AlicizationAgentSessionSnapshot
  source: string
}) {
  const recentTaskLabels = takeTailUnique(
    input.agentSession.tasks.map(task => task.label),
    3,
    64,
  )
  return [
    `source=${sanitizeText(input.source, 48) || 'unknown'}`,
    `recent_actions=${recentTaskLabels.join(',') || 'none'}`,
  ].join(' ')
}

function summarizeCaptureFromAgentSession(snapshot: AlicizationSensoryCacheSnapshot | null) {
  return [
    'grounded=unknown',
    'inspection=unknown',
    `health=${snapshot?.capture?.health ?? 'unknown'}`,
    `permission=${snapshot?.capture?.permission ?? 'unknown'}`,
    'fallback=none',
  ].join(' ')
}

function summarizePerceptionFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const attention = spine?.runtimeSurface.perception.attention ?? null
  const attentionTarget = sanitizeText(
    attention?.target?.title
    ?? attention?.target?.appName
    ?? attention?.target?.processName
    ?? '',
    120,
  )

  return [
    digest?.runtime.watchMode ? `watch=${digest.runtime.watchMode}` : '',
    digest?.runtime.sceneSummary ? `scene=${digest.runtime.sceneSummary}` : '',
    attentionTarget ? `attention=${attentionTarget}` : '',
    attention?.source ? `source=${sanitizeText(attention.source, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function pickFocusBeliefFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const beliefs = Array.isArray(spine?.runtimeSurface.cognition.beliefLedger?.beliefs)
    ? spine.runtimeSurface.cognition.beliefLedger.beliefs
    : []
  const focusBeliefId = sanitizeText(spine?.runtimeSurface.cognition.beliefLedger?.focusBeliefId ?? '', 160)
  return beliefs.find(belief => sanitizeText((belief as { id?: unknown }).id ?? '', 160) === focusBeliefId)
    ?? beliefs[0]
    ?? null
}

function pickActiveHypothesisFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const hypotheses = Array.isArray(spine?.runtimeSurface.cognition.hypothesisGraph?.hypotheses)
    ? spine.runtimeSurface.cognition.hypothesisGraph.hypotheses
    : []
  const activeHypothesisId = sanitizeText(spine?.runtimeSurface.cognition.hypothesisGraph?.activeHypothesisId ?? '', 160)
  return hypotheses.find(hypothesis => sanitizeText((hypothesis as { id?: unknown }).id ?? '', 160) === activeHypothesisId)
    ?? hypotheses[0]
    ?? null
}

function summarizeMindFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const runtime = digest?.runtime
  const focusBelief = pickFocusBeliefFromSpine(spine) as {
    label?: unknown
    statement?: unknown
    summary?: unknown
  } | null
  const activeHypothesis = pickActiveHypothesisFromSpine(spine) as {
    kind?: unknown
    question?: unknown
    statement?: unknown
    summary?: unknown
  } | null
  const privateThought = spine?.runtimeSurface.cognition.privateThought ?? null

  const focusBeliefSummary = sanitizeText(
    focusBelief?.statement ?? focusBelief?.summary ?? focusBelief?.label ?? '',
    96,
  )
  const activeHypothesisSummary = sanitizeText(
    activeHypothesis?.summary
    ?? activeHypothesis?.question
    ?? activeHypothesis?.statement
    ?? activeHypothesis?.kind
    ?? '',
    96,
  )

  return [
    runtime?.dominantMode ? `mode=${runtime.dominantMode}` : '',
    runtime?.dominantDrive ? `drive=${runtime.dominantDrive}` : '',
    privateThought?.mindNeed ? `need=${sanitizeText(privateThought.mindNeed, 48)}` : '',
    focusBeliefSummary ? `belief=${focusBeliefSummary}` : '',
    activeHypothesisSummary ? `hypothesis=${activeHypothesisSummary}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeAgencyFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const proactive = digest?.proactive
  if (!digest || !proactive)
    return ''

  return [
    proactive.selectedAction ? `action=${proactive.selectedAction}` : '',
    typeof proactive.shouldSpeak === 'boolean'
      ? `speak=${proactive.shouldSpeak ? 'true' : 'false'}`
      : '',
    proactive.preferredStyle ? `style=${proactive.preferredStyle}` : '',
    digest.runtime.activeThreadTitle ? `thread=${digest.runtime.activeThreadTitle}` : '',
    proactive.leadingGoalSummary ? `goal=${proactive.leadingGoalSummary}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeMemoryFromSpine(spine: AlicizationDigitalLifeSpineSnapshot | null | undefined) {
  const digest = projectAlicizationDigitalLifeSpineDigest(spine)
  const memory = digest?.memory
  if (!digest || !memory)
    return ''

  return [
    memory.summary ? sanitizeText(memory.summary, 220) : '',
    !memory.summary && memory.recentEpisodeSummary ? `recent=${sanitizeText(memory.recentEpisodeSummary, 96)}` : '',
    !memory.summary && memory.leadingGoalSummary ? `goal=${sanitizeText(memory.leadingGoalSummary, 96)}` : '',
    !memory.summary && memory.dominantConcernSummary ? `concern=${sanitizeText(memory.dominantConcernSummary, 96)}` : '',
    !memory.summary && memory.recallMode ? `recall=${sanitizeText(memory.recallMode, 48)}` : '',
  ].filter(Boolean).join(' | ')
}

function summarizeExecutionFromAgentSession(agentSession: AlicizationAgentSessionSnapshot) {
  const executorTasks = agentSession.tasks.filter(task => task.kind === 'executor')
  if (executorTasks.length === 0)
    return ''

  const recentExecutions = takeTailUnique(
    executorTasks.map((task) => {
      const label = sanitizeText(task.label, 72) || 'executor'
      const status = sanitizeText(task.status, 24) || 'unknown'
      return `${label}:${status}`
    }),
    3,
    96,
  )
  const latestSummary = sanitizeText(executorTasks.at(-1)?.summary ?? '', 160)

  return [
    `recent=${recentExecutions.join(',') || 'none'}`,
    latestSummary ? `summary=${latestSummary}` : '',
  ].filter(Boolean).join(' ')
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
    if (!normalizedCardId)
      return

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

  function ingestPreparedExecution(input: {
    agentSession: AlicizationAgentSessionSnapshot
    cardId: string
    runtimeSurface: AlicizationMainChatRuntimeSurface
    sessionId: string
  }) {
    pruneExpiredMirrors()
    const normalizedCardId = sanitizeText(input.cardId, 120) || 'default'
    const normalizedSessionId = sanitizeText(input.sessionId, 160)
    if (!normalizedSessionId) {
      throw new Error('dialogue session manager requires a non-empty session id')
    }

    const previousMirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    const digitalLifeSpine = input.runtimeSurface.digitalLifeSpine
      ?? (input.runtimeSurface.digitalLifeRuntimeSurface
        ? deriveAlicizationDigitalLifeSpineFromSurface(input.runtimeSurface.digitalLifeRuntimeSurface)
        : null)
    const mirror: AlicizationDialogueSessionMirror = {
      cardId: normalizedCardId,
      sessionId: normalizedSessionId,
      updatedAt: Number.isFinite(digitalLifeSpine?.runtimeSurface.perception.updatedAt)
        ? Number(digitalLifeSpine?.runtimeSurface.perception.updatedAt)
        : getNow(),
      decisionTraceId: sanitizeText(input.runtimeSurface.trace.decisionTraceId, 200) || null,
      continuityLabels: takeTailUnique(
        input.agentSession.continuitySignals
          .filter(signal => signal.kind !== 'execution-callback')
          .map(signal => signal.label),
        maxContinuityLabels,
        80,
      ),
      sessionPhases: takeTailUnique(
        input.runtimeSurface.trace.sessionPhases,
        maxSessionPhases,
        80,
      ),
      toolingSummary: summarizeTooling({
        agentSession: input.agentSession,
        surface: input.runtimeSurface,
      }),
      captureSummary: summarizeCapture(input.runtimeSurface),
      digitalLifeArchitectureSummary: sanitizeText(
        digitalLifeSpine?.architecture?.summary ?? input.runtimeSurface.digitalLifeArchitecture?.summary ?? '',
        220,
      ) || previousMirror?.digitalLifeArchitectureSummary || null,
      digitalLifeRuntimeSummary: sanitizeText(digitalLifeSpine?.continuitySignal?.summary ?? '', 220) || previousMirror?.digitalLifeRuntimeSummary || null,
      mindSummary: sanitizeText(
        summarizeMindFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.mindSummary || null,
      memoryCarrySummary: sanitizeText(
        deriveAlicizationDialogueMemoryCarryPolicy({
          now: getNow(),
          spine: digitalLifeSpine,
        }).summary,
        220,
      ) || previousMirror?.memoryCarrySummary || null,
      memorySummary: sanitizeText(
        summarizeMemoryFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.memorySummary || null,
      perceptionSummary: sanitizeText(
        summarizePerceptionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.perceptionSummary || null,
      agencySummary: sanitizeText(
        summarizeAgencyFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.agencySummary || null,
      executionSummary: sanitizeText(
        summarizeExecutionFromAgentSession(input.agentSession),
        220,
      ) || previousMirror?.executionSummary || null,
      dialogueSummary: sanitizeText(summarizeDialogue(input.runtimeSurface), 220) || previousMirror?.dialogueSummary || null,
    }

    mirrors.set(buildMirrorKey(normalizedCardId, normalizedSessionId), mirror)
    return cloneMirror(mirror)
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
    const normalizedCardId = sanitizeText(input.cardId, 120) || 'default'
    const normalizedSessionId = sanitizeText(input.sessionId, 160)
    if (!normalizedSessionId) {
      throw new Error('dialogue session manager requires a non-empty session id')
    }

    const previousMirror = mirrors.get(buildMirrorKey(normalizedCardId, normalizedSessionId))
    const digitalLifeSpine = input.agentSession.digitalLifeSpine ?? null
    const mirror: AlicizationDialogueSessionMirror = {
      cardId: normalizedCardId,
      sessionId: normalizedSessionId,
      updatedAt: Number.isFinite(digitalLifeSpine?.runtimeSurface.perception.updatedAt)
        ? Number(digitalLifeSpine?.runtimeSurface.perception.updatedAt)
        : Number.isFinite(input.agentSession.lastActiveAt)
          ? Number(input.agentSession.lastActiveAt)
          : getNow(),
      decisionTraceId: sanitizeText(input.decisionTraceId, 200) || previousMirror?.decisionTraceId || null,
      continuityLabels: takeTailUnique(
        input.agentSession.continuitySignals
          .filter(signal => signal.kind !== 'execution-callback')
          .map(signal => signal.label),
        maxContinuityLabels,
        80,
      ),
      sessionPhases: takeTailUnique(
        [
          ...(input.sessionPhases ?? []),
          `source:${sanitizeText(input.source, 48) || 'unknown'}`,
        ],
        maxSessionPhases,
        80,
      ),
      toolingSummary: summarizeToolingFromAgentSession({
        agentSession: input.agentSession,
        source: input.source,
      }),
      captureSummary: summarizeCaptureFromAgentSession(input.agentSession.lastSensorySnapshot),
      digitalLifeArchitectureSummary: sanitizeText(
        digitalLifeSpine?.architecture?.summary ?? input.agentSession.digitalLifeArchitecture?.summary ?? '',
        220,
      ) || previousMirror?.digitalLifeArchitectureSummary || null,
      digitalLifeRuntimeSummary: sanitizeText(
        digitalLifeSpine?.continuitySignal?.summary ?? '',
        220,
      ) || previousMirror?.digitalLifeRuntimeSummary || null,
      mindSummary: sanitizeText(
        summarizeMindFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.mindSummary || null,
      memoryCarrySummary: sanitizeText(
        deriveAlicizationDialogueMemoryCarryPolicy({
          now: getNow(),
          spine: digitalLifeSpine,
        }).summary,
        220,
      ) || previousMirror?.memoryCarrySummary || null,
      memorySummary: sanitizeText(
        summarizeMemoryFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.memorySummary || null,
      perceptionSummary: sanitizeText(
        summarizePerceptionFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.perceptionSummary || null,
      agencySummary: sanitizeText(
        summarizeAgencyFromSpine(digitalLifeSpine),
        220,
      ) || previousMirror?.agencySummary || null,
      executionSummary: sanitizeText(
        summarizeExecutionFromAgentSession(input.agentSession),
        220,
      ) || previousMirror?.executionSummary || null,
      dialogueSummary: sanitizeText(summarizeDialogueFromSpine({
        decisionTraceId: input.decisionTraceId,
        source: input.source,
        spine: digitalLifeSpine,
      }), 220) || previousMirror?.dialogueSummary || null,
    }

    mirrors.set(buildMirrorKey(normalizedCardId, normalizedSessionId), mirror)
    return cloneMirror(mirror)
  }

  function buildSessionMirrorSystemBlock(input: {
    cardId: string
    sessionId: string
  }) {
    const mirror = getSessionMirror(input.cardId, input.sessionId)
    if (!mirror)
      return ''

    return [
      '[ALICIZATION_DIALOGUE_SESSION_MIRROR]',
      `conversation_session_id=${mirror.sessionId}`,
      `mirror_age_ms=${Math.max(0, getNow() - mirror.updatedAt)}`,
      mirror.decisionTraceId
        ? `decision_trace_id=${mirror.decisionTraceId}`
        : '',
      `session_phases=${mirror.sessionPhases.join(' -> ') || 'none'}`,
      `continuity_labels=${mirror.continuityLabels.join(',') || 'none'}`,
      `tooling=${mirror.toolingSummary}`,
      `capture=${mirror.captureSummary}`,
      `digital_life_architecture=${mirror.digitalLifeArchitectureSummary ?? 'none'}`,
      `digital_life_runtime=${mirror.digitalLifeRuntimeSummary ?? 'none'}`,
      `mind=${mirror.mindSummary ?? 'none'}`,
      `memory_carry=${mirror.memoryCarrySummary ?? 'none'}`,
      `memory=${mirror.memorySummary ?? 'none'}`,
      `perception=${mirror.perceptionSummary ?? 'none'}`,
      `agency=${mirror.agencySummary ?? 'none'}`,
      `execution=${mirror.executionSummary ?? 'none'}`,
      `dialogue=${mirror.dialogueSummary ?? 'none'}`,
      'Treat this as the latest settled mirror from the same conversation session, not as a fresh perception sample.',
      'Use it to preserve continuity when no newer grounded signal supersedes it this turn.',
      'Do not restate mirrored scene, tool, or capture state as if it was re-observed right now.',
    ].filter(Boolean).join('\n')
  }

  return {
    buildSessionMirrorSystemBlock,
    clear,
    getSessionMirror,
    ingestAgentSessionSnapshot,
    ingestPreparedExecution,
  }
}
