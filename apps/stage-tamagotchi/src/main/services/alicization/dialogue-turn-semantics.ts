import type {
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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
  taskAnchor: string | null
  sharedAttentionDemand: number
  personaSuppression: number
  confidence: number
  summary: string
  source: 'heuristic' | 'structured-cognition' | 'hybrid'
  reasonTags: string[]
}

function topHostGoal(
  inference?: AlicizationSubjectiveInferenceSnapshot | null,
) {
  return inference?.hostIntentCandidates[0]?.goal ?? 'unknown'
}

function questionWeight(text: string) {
  return /[?？]/u.test(text) ? 1 : 0
}

function terseTurn(text: string) {
  return text.length > 0 && text.length <= 18
}

function codingAnchor(
  scene: AlicizationVisualSceneSnapshot | null,
  worldModel?: AlicizationWorldModelSnapshot | null,
) {
  return sanitizeText(
    worldModel?.activeThread?.title
    ?? worldModel?.activeThread?.summary
    ?? scene?.summary
    ?? '',
    160,
  ) || null
}

// NOTICE: This heuristic layer is intentionally coarse. The primary turn
// semantics should come from structured private cognition, while this fallback
// keeps runtime behavior stable when the extra cognition call times out.
export function buildDialogueTurnSemantics(input: {
  userText: string
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}): AlicizationDialogueTurnSemantics {
  const userText = sanitizeText(input.userText, 320)
  const question = questionWeight(userText)
  const terse = terseTurn(userText)
  const codingLike = input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.worldModel?.activeThread?.kind === 'debugging'
    || input.worldModel?.activeThread?.kind === 'change-review'
  const careLike = input.context.relationship.fatigue >= 58
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
  const unstableTruth = input.worldModel?.epistemicState.certainty === 'uncertain'
    || input.worldModel?.epistemicState.certainty === 'lingering'
    || input.privateThought?.stance === 'uncertain'
  const topGoal = topHostGoal(input.subjectiveInference)

  let act: AlicizationDialogueAct = 'unknown'
  let responseNeed: AlicizationDialogueResponseNeed = 'answer'
  let truthExpectation: AlicizationDialogueTruthExpectation = 'normal'
  let affectiveTone: AlicizationDialogueAffectiveTone = careLike ? 'tired' : 'neutral'
  let sharedAttentionDemand = clamp01(question * 0.42 + (codingLike ? 0.18 : 0.04))
  let personaSuppression = clamp01((codingLike ? 0.28 : 0.08) + (question ? 0.14 : 0))
  const reasonTags: string[] = []

  if (!userText) {
    return {
      act: 'unknown',
      responseNeed: 'answer',
      truthExpectation: 'normal',
      affectiveTone: 'neutral',
      taskAnchor: codingAnchor(input.currentScene, input.worldModel),
      sharedAttentionDemand: 0.18,
      personaSuppression: 0.16,
      confidence: 0.22,
      summary: 'The host turn is too thin to pin down yet.',
      source: 'heuristic',
      reasonTags: ['empty-user-turn'],
    }
  }

  if (unstableTruth && question) {
    act = 'verify-grounding'
    responseNeed = 'repair'
    truthExpectation = 'strict'
    personaSuppression = clamp01(personaSuppression + 0.32)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.26)
    reasonTags.push('unstable-truth', 'question-turn')
  }
  else if (codingLike && question) {
    act = topGoal === 'inspect-change' ? 'verify-grounding' : 'ask-help'
    responseNeed = topGoal === 'resolve-problem' || topGoal === 'inspect-change'
      ? 'guide'
      : 'answer'
    truthExpectation = 'strict'
    personaSuppression = clamp01(personaSuppression + 0.22)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.2)
    reasonTags.push('coding-question')
  }
  else if (careLike && !question) {
    act = 'share-state'
    responseNeed = 'care'
    truthExpectation = 'normal'
    affectiveTone = 'tired'
    personaSuppression = clamp01(personaSuppression + 0.06)
    reasonTags.push('fatigue-state')
  }
  else if (question) {
    act = 'ask-help'
    responseNeed = 'answer'
    truthExpectation = codingLike ? 'strict' : 'normal'
    personaSuppression = clamp01(personaSuppression + 0.14)
    reasonTags.push('question-turn')
  }
  else if (terse && codingLike) {
    act = 'continue-thread'
    responseNeed = unstableTruth ? 'repair' : 'guide'
    truthExpectation = 'strict'
    personaSuppression = clamp01(personaSuppression + 0.18)
    sharedAttentionDemand = clamp01(sharedAttentionDemand + 0.16)
    reasonTags.push('terse-coding-followup')
  }
  else if (terse) {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = input.relationshipModel?.approachVector === 'stay-near' ? 'warm' : 'neutral'
    personaSuppression = clamp01(personaSuppression - 0.04)
    reasonTags.push('terse-social-turn')
  }
  else if (topGoal === 'chat') {
    act = 'social-bid'
    responseNeed = 'accompany'
    truthExpectation = 'light'
    affectiveTone = 'warm'
    personaSuppression = clamp01(personaSuppression - 0.06)
    reasonTags.push('chat-goal')
  }

  if (input.privateThought?.stance === 'warn' || input.privateThought?.stance === 'care') {
    affectiveTone = careLike ? 'tired' : 'urgent'
    reasonTags.push('private-thought-carry')
  }

  const taskAnchor = codingAnchor(input.currentScene, input.worldModel)
  const summary = sanitizeText(
    taskAnchor
      ? `${act} around ${taskAnchor}`
      : `${act} with ${responseNeed} need`,
    180,
  ) || 'The host expects a current-turn response.'

  return {
    act,
    responseNeed,
    truthExpectation,
    affectiveTone,
    taskAnchor,
    sharedAttentionDemand,
    personaSuppression,
    confidence: clamp01(
      (question ? 0.26 : 0.12)
      + (codingLike ? 0.18 : 0.04)
      + (unstableTruth ? 0.14 : 0)
      + (topGoal !== 'unknown' ? 0.14 : 0)
      + (taskAnchor ? 0.1 : 0.04),
    ),
    summary,
    source: 'heuristic',
    reasonTags: uniqueLabels([
      ...reasonTags,
      topGoal !== 'unknown' ? `host-goal:${topGoal}` : '',
      taskAnchor ? 'task-anchor' : '',
    ]),
  }
}

export interface AlicizationDialogueTurnSemanticsCandidate {
  act?: AlicizationDialogueAct
  responseNeed?: AlicizationDialogueResponseNeed
  truthExpectation?: AlicizationDialogueTruthExpectation
  affectiveTone?: AlicizationDialogueAffectiveTone
  taskAnchor?: string
  sharedAttentionDemand?: number
  personaSuppression?: number
  confidence?: number
  summary?: string
  reasonTags?: string[]
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
    summary: sanitizeText(parsed.summary, 180) || undefined,
    reasonTags: Array.isArray(parsed.reasonTags) ? uniqueLabels(parsed.reasonTags) : undefined,
  }

  const hasSignal = Boolean(
    candidate.act
    || candidate.responseNeed
    || candidate.truthExpectation
    || candidate.affectiveTone
    || candidate.taskAnchor
    || candidate.summary
    || (candidate.reasonTags && candidate.reasonTags.length > 0),
  )

  return hasSignal ? candidate : null
}

export function mergeDialogueTurnSemantics(
  base: AlicizationDialogueTurnSemantics,
  candidate: AlicizationDialogueTurnSemanticsCandidate | null | undefined,
): AlicizationDialogueTurnSemantics {
  if (!candidate)
    return base

  const overrideConfidence = candidate.confidence ?? base.confidence
  const weight = clamp01(0.34 + overrideConfidence * 0.4)
  return {
    act: candidate.act ?? base.act,
    responseNeed: candidate.responseNeed ?? base.responseNeed,
    truthExpectation: candidate.truthExpectation ?? base.truthExpectation,
    affectiveTone: candidate.affectiveTone ?? base.affectiveTone,
    taskAnchor: candidate.taskAnchor ?? base.taskAnchor,
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
    summary: candidate.summary ?? base.summary,
    source: 'hybrid',
    reasonTags: uniqueLabels([
      ...(candidate.reasonTags ?? []),
      ...base.reasonTags,
      'structured-dialogue-cognition',
    ]),
  }
}
