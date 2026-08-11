import type {
  AlicizationCodingAgentDelegationIntentKind,
  AlicizationCodingAgentDelegationRequestedAgent,
  AlicizationCodingAgentDelegationScope,
  AlicizationCodingAgentDelegationSnapshot,
  AlicizationCodingAgentDelegationVerdict,
  AlicizationDialogueAnswerSubject,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { sanitizeDialogueAnchorText } from './dialogue-surface-text'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeShortLabel(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxChars)
}

function uniqueLabels(items: unknown[]) {
  return [...new Set(items.map(item => normalizeShortLabel(item)).filter(Boolean))].slice(0, 10)
}

function interpolate01(base: number, override: number, weight: number) {
  return clamp01(base * (1 - weight) + override * weight)
}

export type AlicizationDialogueAct
  = | 'ask-help'
    | 'ask-teach'
    | 'verify-grounding'
    | 'correct'
    | 'challenge'
    | 'share-state'
    | 'seek-care'
    | 'social-bid'
    | 'continue-thread'
    | 'close-thread'
    | 'unknown'

export type AlicizationDialogueResponseNeed
  = | 'repair'
    | 'guide'
    | 'teach'
    | 'answer'
    | 'care'
    | 'accompany'
    | 'clarify'

export type AlicizationDialogueTruthExpectation = 'strict' | 'normal' | 'light'

export type AlicizationDialogueAffectiveTone
  = | 'frustrated'
    | 'tired'
    | 'urgent'
    | 'warm'
    | 'neutral'

export interface AlicizationDialogueTurnSemantics {
  act: AlicizationDialogueAct
  responseNeed: AlicizationDialogueResponseNeed
  truthExpectation: AlicizationDialogueTruthExpectation
  affectiveTone: AlicizationDialogueAffectiveTone
  subjectPreference?: AlicizationDialogueAnswerSubject | null
  taskAnchor: string | null
  sharedAttentionDemand: number
  personaSuppression: number
  confidence: number
  summary: string
  source: 'heuristic' | 'structured-cognition' | 'hybrid'
  codingAgentDelegation?: AlicizationCodingAgentDelegationSnapshot | null
  reasonTags: string[]
}

function topHostGoal(
  inference?: AlicizationSubjectiveInferenceSnapshot | null,
) {
  return inference?.hostIntentCandidates[0]?.goal ?? 'unknown'
}

function topRelationshipNeed(
  inference?: AlicizationSubjectiveInferenceSnapshot | null,
) {
  return inference?.relationshipNeedCandidates[0]?.need ?? 'unclear'
}

function isDialogueFirstPreference(subjectPreference?: AlicizationDialogueAnswerSubject | null) {
  return subjectPreference === 'alicization-self'
    || subjectPreference === 'relationship'
    || subjectPreference === 'host-state'
    || subjectPreference === 'general'
}

export function shouldAttemptDialogueTurnSemanticsRefinement(input: {
  heuristic: AlicizationDialogueTurnSemantics
  inspectionRequested?: boolean
  groundedThisTurn?: boolean
}) {
  return input.groundedThisTurn !== true
}

function codingAnchor(
  scene: AlicizationVisualSceneSnapshot | null,
  worldModel?: AlicizationWorldModelSnapshot | null,
) {
  return sanitizeDialogueAnchorText(
    worldModel?.activeThread?.title
    ?? worldModel?.activeThread?.summary
    ?? scene?.summary
    ?? '',
    160,
  ) || null
}

function fallbackDialogueTurnSemantics(): AlicizationDialogueTurnSemantics {
  return {
    act: 'unknown',
    responseNeed: 'answer',
    truthExpectation: 'normal',
    affectiveTone: 'neutral',
    subjectPreference: null,
    taskAnchor: null,
    sharedAttentionDemand: 0.12,
    personaSuppression: 0.08,
    confidence: 0.24,
    summary: '',
    source: 'heuristic',
    reasonTags: ['structured-fallback'],
  }
}

// NOTICE: User wording is deliberately opaque here. Reply posture may only
// come from structured cognition or explicit runtime ownership.
export function buildDialogueTurnSemantics(input: {
  userText: string
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  previousAssistantText?: string | null
  inspectionRequested?: boolean
  groundedThisTurn?: boolean
}): AlicizationDialogueTurnSemantics {
  const codingLike = input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.worldModel?.activeThread?.kind === 'debugging'
    || input.worldModel?.activeThread?.kind === 'change-review'
  const careLike = input.context.relationship.fatigue >= 58
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
  const topGoal = topHostGoal(input.subjectiveInference)
  const topNeed = topRelationshipNeed(input.subjectiveInference)
  const inspectionOwnedTurn = input.inspectionRequested === true
  const groundedThisTurn = input.groundedThisTurn === true
  const sceneTaskAnchor = codingAnchor(input.currentScene, input.worldModel)
  const inspectionTaskCarry = Boolean(input.worldModel?.activeThread)
    || Boolean(groundedThisTurn && (
      codingLike
      || input.currentScene?.scenario === 'coding'
      || input.currentScene?.contentKind === 'error'
      || input.currentScene?.contentKind === 'diff'
    ))
  const inspectionSceneAvailable = Boolean(
    groundedThisTurn
    || input.currentScene?.summary
    || input.currentScene?.target
    || input.worldModel?.activeThread,
  )

  if (inspectionOwnedTurn) {
    return {
      act: 'verify-grounding',
      responseNeed: groundedThisTurn
        ? topNeed === 'guidance' && inspectionTaskCarry
          ? 'guide'
          : 'answer'
        : 'repair',
      truthExpectation: 'strict',
      affectiveTone: 'neutral',
      subjectPreference: inspectionTaskCarry ? 'task-knot' : 'visible-scene',
      taskAnchor: inspectionTaskCarry ? sceneTaskAnchor : null,
      sharedAttentionDemand: 0.4,
      personaSuppression: 0.4,
      confidence: inspectionSceneAvailable ? 0.72 : 0.46,
      summary: '',
      source: 'heuristic',
      reasonTags: uniqueLabels([
        'inspection-requested-turn',
        'inspection-owned-turn',
        groundedThisTurn ? 'inspection-grounded-this-turn' : '',
        inspectionTaskCarry ? 'inspection-task-carry' : 'inspection-scene-carry',
        inspectionSceneAvailable ? '' : 'inspection-needs-reground',
      ]),
    }
  }

  const hasStructuredIntent = topGoal !== 'unknown'
  const hasStructuredNeed = topNeed !== 'unclear'
  const hasPrivatePosture = input.privateThought?.stance === 'warn'
    || input.privateThought?.stance === 'care'

  if (!hasStructuredIntent && !hasStructuredNeed && !hasPrivatePosture)
    return fallbackDialogueTurnSemantics()

  let act: AlicizationDialogueAct = 'unknown'
  let responseNeed: AlicizationDialogueResponseNeed = 'answer'
  let truthExpectation: AlicizationDialogueTruthExpectation = 'normal'
  let affectiveTone: AlicizationDialogueAffectiveTone = 'neutral'
  let subjectPreference: AlicizationDialogueAnswerSubject | null = null
  let taskAnchor: string | null = null
  let sharedAttentionDemand = 0.18
  let personaSuppression = 0.12
  const reasonTags: string[] = []

  if (topGoal === 'inspect-change') {
    act = 'verify-grounding'
    responseNeed = 'guide'
    truthExpectation = 'strict'
    subjectPreference = sceneTaskAnchor ? 'task-knot' : 'visible-scene'
    taskAnchor = sceneTaskAnchor
    sharedAttentionDemand = 0.48
    personaSuppression = 0.4
  }
  else if (topGoal === 'resolve-problem') {
    act = 'ask-help'
    responseNeed = 'guide'
    truthExpectation = codingLike || sceneTaskAnchor ? 'strict' : 'normal'
    subjectPreference = sceneTaskAnchor ? 'task-knot' : 'general'
    taskAnchor = sceneTaskAnchor
    sharedAttentionDemand = 0.44
    personaSuppression = 0.34
  }
  else if (
    topGoal === 'continue-thread'
    || topGoal === 'keep-going'
    || topGoal === 'finish-one-more-step'
    || topGoal === 'resume-work'
  ) {
    act = 'continue-thread'
    responseNeed = 'guide'
    truthExpectation = codingLike || sceneTaskAnchor ? 'strict' : 'normal'
    subjectPreference = sceneTaskAnchor ? 'task-knot' : 'general'
    taskAnchor = sceneTaskAnchor
    sharedAttentionDemand = 0.38
    personaSuppression = 0.28
  }
  else if (topGoal === 'chat' || topGoal === 'stay-connected') {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = 'warm'
    subjectPreference = 'relationship'
    sharedAttentionDemand = 0.14
    personaSuppression = 0.04
  }
  else if (topGoal === 'rest') {
    act = 'seek-care'
    responseNeed = 'care'
    affectiveTone = careLike ? 'tired' : 'warm'
    subjectPreference = 'host-state'
    sharedAttentionDemand = 0.16
    personaSuppression = 0.08
  }

  if (hasStructuredIntent)
    reasonTags.push(`structured-host-goal-${topGoal}`)

  if (topNeed === 'guidance') {
    act = topGoal === 'inspect-change' ? 'verify-grounding' : act === 'unknown' ? 'ask-help' : act
    responseNeed = 'guide'
    truthExpectation = codingLike || sceneTaskAnchor ? 'strict' : truthExpectation
    subjectPreference = sceneTaskAnchor ? 'task-knot' : subjectPreference ?? 'general'
    taskAnchor = sceneTaskAnchor
    sharedAttentionDemand = Math.max(sharedAttentionDemand, 0.42)
    personaSuppression = Math.max(personaSuppression, 0.3)
  }
  else if (topNeed === 'care') {
    act = 'seek-care'
    responseNeed = 'care'
    truthExpectation = 'normal'
    affectiveTone = careLike ? 'tired' : 'warm'
    subjectPreference = 'host-state'
    taskAnchor = null
    sharedAttentionDemand = 0.16
    personaSuppression = 0.08
  }
  else if (topNeed === 'companionship') {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = 'warm'
    subjectPreference = 'relationship'
    taskAnchor = null
    sharedAttentionDemand = 0.14
    personaSuppression = 0.04
  }

  if (hasStructuredNeed)
    reasonTags.push(`structured-relationship-need-${topNeed}`)

  if (input.privateThought?.stance === 'warn' || input.privateThought?.stance === 'care') {
    affectiveTone = input.privateThought.stance === 'care'
      ? careLike ? 'tired' : 'warm'
      : 'urgent'
    subjectPreference = subjectPreference ?? 'host-state'
    reasonTags.push('private-thought-carry')
  }

  if (isDialogueFirstPreference(subjectPreference))
    taskAnchor = null

  return {
    act,
    responseNeed,
    truthExpectation,
    affectiveTone,
    subjectPreference,
    taskAnchor,
    sharedAttentionDemand: clamp01(sharedAttentionDemand),
    personaSuppression: clamp01(personaSuppression),
    confidence: clamp01(Math.max(0.36, input.subjectiveInference?.confidence ?? 0)),
    summary: '',
    source: 'structured-cognition',
    reasonTags: uniqueLabels([
      ...reasonTags,
      taskAnchor ? 'task-anchor' : '',
    ]),
  }
}

export interface AlicizationDialogueTurnSemanticsCandidate {
  act?: AlicizationDialogueAct
  responseNeed?: AlicizationDialogueResponseNeed
  truthExpectation?: AlicizationDialogueTruthExpectation
  affectiveTone?: AlicizationDialogueAffectiveTone
  subjectPreference?: AlicizationDialogueAnswerSubject | null
  taskAnchor?: string
  sharedAttentionDemand?: number
  personaSuppression?: number
  confidence?: number
  reasonTags?: string[]
  codingAgentDelegation?: {
    intentKind?: AlicizationCodingAgentDelegationIntentKind
    requestedAgent?: AlicizationCodingAgentDelegationRequestedAgent
    verdict?: AlicizationCodingAgentDelegationVerdict
    scope?: AlicizationCodingAgentDelegationScope
    confidence?: number
    sourceTurnId?: string
  }
}

function normalizeAct(raw: unknown): AlicizationDialogueAct | undefined {
  return raw === 'ask-help'
    || raw === 'ask-teach'
    || raw === 'verify-grounding'
    || raw === 'correct'
    || raw === 'challenge'
    || raw === 'share-state'
    || raw === 'seek-care'
    || raw === 'social-bid'
    || raw === 'continue-thread'
    || raw === 'close-thread'
    || raw === 'unknown'
    ? raw
    : undefined
}

function normalizeResponseNeed(raw: unknown): AlicizationDialogueResponseNeed | undefined {
  return raw === 'repair'
    || raw === 'guide'
    || raw === 'teach'
    || raw === 'answer'
    || raw === 'care'
    || raw === 'accompany'
    || raw === 'clarify'
    ? raw
    : undefined
}

function normalizeTruthExpectation(raw: unknown): AlicizationDialogueTruthExpectation | undefined {
  return raw === 'strict' || raw === 'normal' || raw === 'light' ? raw : undefined
}

function normalizeAffectiveTone(raw: unknown): AlicizationDialogueAffectiveTone | undefined {
  return raw === 'frustrated'
    || raw === 'tired'
    || raw === 'urgent'
    || raw === 'warm'
    || raw === 'neutral'
    ? raw
    : undefined
}

function normalizeSubjectPreference(raw: unknown): AlicizationDialogueAnswerSubject | null | undefined {
  return raw === 'alicization-self'
    || raw === 'relationship'
    || raw === 'host-state'
    || raw === 'task-knot'
    || raw === 'visible-scene'
    || raw === 'general'
    ? raw
    : raw === null
      ? null
      : undefined
}

function normalizeCodingAgentDelegationVerdict(raw: unknown): AlicizationCodingAgentDelegationVerdict | undefined {
  return raw === 'respond-directly'
    || raw === 'clarify'
    || raw === 'delegate-coding-agent'
    ? raw
    : undefined
}

function normalizeCodingAgentDelegationIntentKind(raw: unknown): AlicizationCodingAgentDelegationIntentKind | undefined {
  return raw === 'capability-query' || raw === 'execute' ? raw : undefined
}

function normalizeCodingAgentDelegationRequestedAgent(raw: unknown): AlicizationCodingAgentDelegationRequestedAgent | undefined {
  return raw === 'auto'
    || raw === 'codex'
    || raw === 'claude-code'
    || raw === 'cli'
    || raw === null
    ? raw
    : undefined
}

function normalizeCodingAgentDelegationScope(raw: unknown): AlicizationCodingAgentDelegationScope | undefined {
  return raw === 'none'
    || raw === 'investigation'
    || raw === 'edit'
    || raw === 'command'
    ? raw
    : undefined
}

export function parseDialogueTurnSemanticsCandidate(raw: string): AlicizationDialogueTurnSemanticsCandidate | null {
  const text = raw.trim()
  if (!text.startsWith('{') || !text.endsWith('}'))
    return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  }
  catch {
    return null
  }

  const candidate: AlicizationDialogueTurnSemanticsCandidate = {
    act: normalizeAct(parsed.act),
    responseNeed: normalizeResponseNeed(parsed.responseNeed),
    truthExpectation: normalizeTruthExpectation(parsed.truthExpectation),
    affectiveTone: normalizeAffectiveTone(parsed.affectiveTone),
    subjectPreference: normalizeSubjectPreference(parsed.subjectPreference),
    taskAnchor: sanitizeText(parsed.taskAnchor, 160) || undefined,
    sharedAttentionDemand: Number.isFinite(Number(parsed.sharedAttentionDemand))
      ? clamp01(Number(parsed.sharedAttentionDemand))
      : undefined,
    personaSuppression: Number.isFinite(Number(parsed.personaSuppression))
      ? clamp01(Number(parsed.personaSuppression))
      : undefined,
    confidence: Number.isFinite(Number(parsed.confidence))
      ? clamp01(Number(parsed.confidence))
      : undefined,
    reasonTags: Array.isArray(parsed.reasonTags) ? uniqueLabels(parsed.reasonTags) : undefined,
    codingAgentDelegation: parsed.codingAgentDelegation && typeof parsed.codingAgentDelegation === 'object'
      && !Array.isArray(parsed.codingAgentDelegation)
      ? {
          intentKind: normalizeCodingAgentDelegationIntentKind((parsed.codingAgentDelegation as Record<string, unknown>).intentKind),
          requestedAgent: normalizeCodingAgentDelegationRequestedAgent((parsed.codingAgentDelegation as Record<string, unknown>).requestedAgent),
          verdict: normalizeCodingAgentDelegationVerdict((parsed.codingAgentDelegation as Record<string, unknown>).verdict),
          scope: normalizeCodingAgentDelegationScope((parsed.codingAgentDelegation as Record<string, unknown>).scope),
          confidence: Number.isFinite(Number((parsed.codingAgentDelegation as Record<string, unknown>).confidence))
            ? clamp01(Number((parsed.codingAgentDelegation as Record<string, unknown>).confidence))
            : undefined,
          sourceTurnId: sanitizeText((parsed.codingAgentDelegation as Record<string, unknown>).sourceTurnId, 160) || undefined,
        }
      : undefined,
  }

  const hasSignal = Boolean(
    candidate.act
    || candidate.responseNeed
    || candidate.truthExpectation
    || candidate.affectiveTone
    || candidate.subjectPreference
    || candidate.taskAnchor
    || candidate.codingAgentDelegation?.verdict
    || candidate.codingAgentDelegation?.scope
    || (candidate.reasonTags && candidate.reasonTags.length > 0),
  )

  return hasSignal ? candidate : null
}

export function mergeDialogueTurnSemantics(
  base: AlicizationDialogueTurnSemantics,
  candidate: AlicizationDialogueTurnSemanticsCandidate | null | undefined,
  options?: {
    sourceTurnId?: string
  },
): AlicizationDialogueTurnSemantics {
  if (!candidate) {
    return {
      ...base,
      codingAgentDelegation: null,
    }
  }

  const overrideConfidence = candidate.confidence ?? base.confidence
  const weight = clamp01(0.34 + overrideConfidence * 0.4)
  const candidatePullsDialogueFirst = isDialogueFirstPreference(candidate.subjectPreference)
    || candidate.act === 'social-bid'
    || candidate.responseNeed === 'accompany'
    || candidate.responseNeed === 'care'
  const preserveInspectionBase = base.reasonTags.includes('inspection-owned-turn')
    && candidatePullsDialogueFirst
  const candidateSubjectPreference = candidate.subjectPreference !== undefined
    ? candidate.subjectPreference
    : base.subjectPreference ?? null
  const expectedSourceTurnId = sanitizeText(options?.sourceTurnId, 160)
  const codingAgentDelegation = candidate.codingAgentDelegation
    && expectedSourceTurnId
    && (
      !candidate.codingAgentDelegation.sourceTurnId
      || candidate.codingAgentDelegation.sourceTurnId === expectedSourceTurnId
    )
    ? candidate.codingAgentDelegation
    : null

  return {
    act: preserveInspectionBase ? base.act : candidate.act ?? base.act,
    responseNeed: preserveInspectionBase ? base.responseNeed : candidate.responseNeed ?? base.responseNeed,
    truthExpectation: preserveInspectionBase ? base.truthExpectation : candidate.truthExpectation ?? base.truthExpectation,
    affectiveTone: preserveInspectionBase ? base.affectiveTone : candidate.affectiveTone ?? base.affectiveTone,
    subjectPreference: preserveInspectionBase
      ? base.subjectPreference ?? null
      : candidateSubjectPreference,
    taskAnchor: preserveInspectionBase
      ? base.taskAnchor
      : candidatePullsDialogueFirst
        ? null
        : candidate.taskAnchor ?? base.taskAnchor,
    sharedAttentionDemand: interpolate01(
      base.sharedAttentionDemand,
      candidate.sharedAttentionDemand ?? base.sharedAttentionDemand,
      weight,
    ),
    personaSuppression: interpolate01(
      base.personaSuppression,
      candidate.personaSuppression ?? base.personaSuppression,
      weight,
    ),
    confidence: interpolate01(base.confidence, overrideConfidence, weight),
    summary: base.summary,
    source: 'hybrid',
    reasonTags: uniqueLabels([
      ...(candidate.reasonTags ?? []),
      ...base.reasonTags,
      preserveInspectionBase ? 'preserve-inspection-base' : '',
      'structured-dialogue-cognition',
    ]),
    codingAgentDelegation: codingAgentDelegation
      ? {
          intentKind: codingAgentDelegation.intentKind ?? 'capability-query',
          requestedAgent: codingAgentDelegation.requestedAgent ?? null,
          verdict: codingAgentDelegation.verdict ?? 'respond-directly',
          scope: codingAgentDelegation.scope ?? 'none',
          confidence: codingAgentDelegation.confidence ?? overrideConfidence,
          sourceTurnId: expectedSourceTurnId,
          source: 'structured-cognition',
        }
      : null,
  }
}
