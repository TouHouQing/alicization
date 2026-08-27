import type {
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
