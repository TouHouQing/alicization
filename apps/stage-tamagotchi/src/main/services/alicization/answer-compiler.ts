import type {
  AlicizationAnswerAct,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerEvidenceMode,
  AlicizationCompiledResponseMode,
  AlicizationConversationStateSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

import { buildAlicizationScreenSurfaceCue } from '@proj-alicization/stage-shared'

import { buildAlicizationDialogueGrowthProfile, type AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { deriveMindTruthContract } from './mind-truth-contract'

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

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function sanitizeSurfaceClaim(raw: unknown, maxChars = 180) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function normalizeComparisonText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractComparisonTerms(raw: unknown) {
  const normalized = normalizeComparisonText(raw)
  if (!normalized)
    return []

  return [...new Set(
    (normalized.match(/[\p{Letter}\p{Number}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [])
      .flatMap((segment) => {
        if ([...segment].length >= 2)
          return [segment]
        return []
      }),
  )]
}

function mirrorsHostMove(candidate: unknown, hostMove: unknown) {
  const normalizedCandidate = normalizeComparisonText(String(candidate ?? ''))
  const normalizedHostMove = normalizeComparisonText(String(hostMove ?? ''))
  if (!normalizedCandidate || !normalizedHostMove)
    return false

  if (normalizedCandidate === normalizedHostMove)
    return true

  const shorterLength = Math.max(1, Math.min(normalizedCandidate.length, normalizedHostMove.length))
  if (
    (normalizedCandidate.includes(normalizedHostMove) || normalizedHostMove.includes(normalizedCandidate))
    && shorterLength / Math.max(normalizedCandidate.length, normalizedHostMove.length) >= 0.68
  ) {
    return true
  }

  const hostTerms = extractComparisonTerms(normalizedHostMove)
  const candidateTerms = extractComparisonTerms(normalizedCandidate)
  if (hostTerms.length === 0 || candidateTerms.length === 0)
    return false

  const overlap = candidateTerms.filter(term => hostTerms.includes(term))
  return overlap.length / Math.max(1, Math.min(hostTerms.length, candidateTerms.length)) >= 0.72
}

function pickSurfaceClaim(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeSurfaceClaim(value)
    if (normalized)
      return normalized
  }
  return ''
}

function pickSurfaceClaimDistinctFrom(hostMove: unknown, ...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeSurfaceClaim(value)
    if (!normalized || mirrorsHostMove(normalized, hostMove))
      continue
    return normalized
  }
  return ''
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeDialogueSurfaceText(value, 220) || sanitizeText(value, 220)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

interface AlicizationDialogueEncounterAnchor {
  taskAnchor?: string | null
  summary?: string | null
  dialogueFirst?: boolean | null
}

function resolvePrimaryTurnAnchor(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterAnchor | null
}) {
  return sanitizeDialogueAnchorText(
    input.conversationState?.primaryTurnAnchor
    || input.discourseState.primaryTurnAnchor
    || input.dialogueEncounter?.taskAnchor
    || input.conversationState?.unansweredQuestion
    || input.discourseState.currentQuestion
    || input.dialogueEncounter?.summary
    || input.conversationState?.jointThread
    || '',
    180,
  ) || null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function isDirectDialogueDemand(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  const hostMove = sanitizeSurfaceClaim(input.conversationState?.hostMove, 180)
  const jointThread = sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
  return Boolean(input.discourseState.currentQuestion)
    || input.discourseState.owedAction === 'answer-self'
    || input.discourseState.owedAction === 'answer-relationship'
    || (
      (input.discourseState.currentTurnSubject === 'alicization-self'
        || input.discourseState.currentTurnSubject === 'relationship'
        || input.discourseState.currentTurnSubject === 'host-state')
      && Boolean(hostMove || jointThread)
    )
}

function isFreshlyGroundedSceneTurn(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  groundedThisTurn?: boolean
}) {
  return input.groundedThisTurn === true
    && input.discourseState.screenReferenceMode !== 'avoid'
    && (
      input.discourseState.currentTurnSubject === 'visible-scene'
      || input.discourseState.currentTurnSubject === 'task-knot'
    )
}

function preferredGroundedSceneAct(subject: AlicizationDiscourseStateSnapshot['currentTurnSubject']) {
  return subject === 'task-knot'
    ? 'guide' as const
    : 'answer' as const
}

function isSceneThreadDiscourseTurn(state: AlicizationDiscourseStateSnapshot) {
  return state.currentTurnSubject === 'task-knot'
    || state.currentTurnSubject === 'visible-scene'
    || state.owedAction === 'guide-task'
    || state.owedAction === 'inspect-scene'
}

function resolveEvidenceMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  groundedThisTurn?: boolean
}) {
  if (input.discourseState.screenReferenceMode === 'avoid')
    return 'dialogue-grounded' as const

  if (input.groundedThisTurn === true)
    return 'live-grounded' as const

  const truth = deriveMindTruthContract(
    input.runtimeSurface ?? {
      currentScene: input.currentScene ?? null,
      worldModel: input.worldModel ?? null,
      worldOntology: input.worldOntology ?? null,
    },
  )

  if (input.repairLedger?.shouldConstrainPresentTense)
    return 'repair-first' as const
  if (truth.truthState === 'live-grounded')
    return 'live-grounded' as const
  if (truth.truthState === 'live-observed')
    return input.worldModel?.activeThread?.unresolved ? 'coarse-held' as const : 'live-observed' as const
  if (truth.truthState === 'remembered' || truth.truthState === 'imagined')
    return 'continuity-carry' as const
  if (input.discourseState.owedAction === 'repair-truth')
    return 'repair-first' as const
  if (isSceneThreadDiscourseTurn(input.discourseState))
    return 'coarse-held' as const
  return 'dialogue-grounded' as const
}

function resolveResponseMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  groundedThisTurn?: boolean
}): AlicizationCompiledResponseMode {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'guide-current-knot'
      : 'answer-naturally'
  }
  if (input.discourseState.owedAction === 'repair-truth')
    return 'repair-and-reanchor'
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide-current-knot'
  if (input.discourseState.owedAction === 'care-host')
    return 'care-with-boundary'
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany-lightly'
  }
  if (
    input.privateThought?.stance === 'accompany'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany-lightly'
  }
  return 'answer-naturally'
}

function resolveRecommendedAct(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  evidenceMode: AlicizationAnswerEvidenceMode
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  groundedThisTurn?: boolean
}): AlicizationAnswerAct {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return preferredGroundedSceneAct(input.discourseState.currentTurnSubject)
  }

  const repair = governingRepair(input.repairLedger)
  if (input.discourseState.owedAction === 'repair-truth') {
    if (input.groundedThisTurn === true)
      return 'correct-stale-anchor'

    return input.evidenceMode === 'repair-first' || repair?.kind === 'reground-scene'
      ? 'ask-reground'
      : 'correct-stale-anchor'
  }
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide'
  if (input.discourseState.owedAction === 'care-host')
    return 'care'
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && input.privateThought
    && !input.privateThought.shouldSpeak
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
    && (input.privateThought.stance === 'observe' || input.privateThought.stance === 'accompany' || input.privateThought.stance === 'uncertain')
  ) {
    return 'defer'
  }
  return 'answer'
}

function resolveTurnMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  recommendedAct: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  groundedThisTurn?: boolean
}) {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'guide-current-knot' as const
      : 'grounded-inspection' as const
  }
  if (input.recommendedAct === 'correct-stale-anchor' || input.recommendedAct === 'ask-reground')
    return 'screen-repair' as const
  if (input.discourseState.owedAction === 'guide-task')
    return 'guide-current-knot' as const
  if (input.discourseState.owedAction === 'care-host')
    return 'care' as const
  if (
    input.discourseState.currentTurnSubject === 'relationship'
    && input.recommendedAct === 'defer'
    && !isDirectDialogueDemand({
      discourseState: input.discourseState,
      conversationState: input.conversationState ?? null,
    })
  ) {
    return 'accompany' as const
  }
  if (input.discourseState.screenReferenceMode === 'required' && input.evidenceMode !== 'repair-first' && input.evidenceMode !== 'continuity-carry')
    return 'grounded-inspection' as const
  return 'answer' as const
}

function resolveOpeningStyle(turnMode: AlicizationAnswerCompilerSnapshot['turnMode']) {
  if (turnMode === 'grounded-inspection')
    return 'direct-observation' as const
  if (turnMode === 'screen-repair')
    return 'direct-correction' as const
  if (turnMode === 'care')
    return 'gentle-care' as const
  if (turnMode === 'accompany')
    return 'light-accompaniment' as const
  return 'direct-answer' as const
}

function resolvePersonaKernelMode(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
}): AlicizationPersonaKernelMode {
  if (input.discourseState.owedAction === 'repair-truth')
    return 'muted'
  if (input.discourseState.owedAction === 'guide-task' || input.turnMode === 'guide-current-knot')
    return 'backgrounded'
  if (input.discourseState.owedAction === 'care-host' || input.discourseState.currentTurnSubject === 'relationship' || input.discourseState.currentTurnSubject === 'alicization-self')
    return 'full'
  return 'backgrounded'
}

function resolveRelationshipPosture(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  evidenceMode: AlicizationAnswerEvidenceMode
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (
    input.discourseState.owedAction === 'repair-truth'
    || input.evidenceMode === 'repair-first'
    || input.growthProfile.guardedness >= 0.64
    || input.growthProfile.irritability >= 0.66
  ) {
    return 'restrained' as const
  }
  if (input.growthProfile.companionshipStyle === 'close-hold')
    return 'tender' as const
  if (
    input.discourseState.owedAction === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return input.growthProfile.tenderness >= 0.56 && input.growthProfile.closeness >= 0.54
      ? 'tender' as const
      : 'warm' as const
  }
  return 'warm' as const
}

function resolveOpeningDirective(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  recommendedAct: AlicizationAnswerAct
  mindSynthesis: AlicizationMindSynthesisSnapshot
  groundedThisTurn?: boolean
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return input.discourseState.currentTurnSubject === 'task-knot'
      ? 'I should open from the live knot that is already in front of me and move it one concrete step closer to the answer.'
      : 'I should open from what is visible right now and keep the stale-anchor bookkeeping off the surface.'
  }
  if (input.recommendedAct === 'correct-stale-anchor')
    return 'I need to name the stale read before I interpret it or soften it.'
  if (input.recommendedAct === 'ask-reground')
    return 'I need to show the truth boundary early and move toward a fresher look instead of bluffing past it.'
  if (input.recommendedAct === 'guide')
    return input.growthProfile.unfinishedThreadReturn >= 0.58
      ? 'I should open from the knot itself and keep the thread visibly unbroken while I narrow to the next real step.'
      : input.growthProfile.cadenceAffinity >= 0.58
          ? 'I should open from the knot itself and let the thread feel carried, not merely solved.'
      : 'I should open from the knot itself and narrow immediately to one actionable next step.'
  if (input.recommendedAct === 'care')
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? 'I should open with care that feels unmistakably present, but still leaves the host enough room to stay themselves.'
      : input.growthProfile.autonomyRespect >= 0.58
      ? 'I should open with care that belongs to this exact condition and lands without pressing too hard.'
      : 'I should open with care that belongs to this exact condition, not generic soothing.'
  if (input.discourseState.currentTurnSubject === 'relationship')
    return input.growthProfile.closeness >= 0.58
      ? 'I should answer the bid between us in a way that lands close and lived-in before I widen into narration.'
      : 'I should answer the bid between us before I widen into scene narration.'
  if (input.discourseState.currentTurnSubject === 'alicization-self')
    return input.growthProfile.selfLine
      ? `I should answer plainly from the line in me that says ${lowerFirst(stripTrailingPunctuation(input.growthProfile.selfLine))}.`
      : 'I should answer plainly from my own continuity.'
  if (input.discourseState.screenReferenceMode === 'required')
    return 'I should open from the strongest live observation and keep memory explicitly secondary.'
  return 'I should pay off the host’s current turn directly.'
}

function resolveOpeningClaim(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterAnchor | null
  mindSynthesis: AlicizationMindSynthesisSnapshot
  recommendedAct: AlicizationAnswerAct
  currentScene?: AlicizationVisualSceneSnapshot | null
  groundedThisTurn?: boolean
}) {
  const hostMove = input.conversationState?.hostMove ?? ''
  const primaryTurnAnchor = resolvePrimaryTurnAnchor({
    discourseState: input.discourseState,
    conversationState: input.conversationState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      input.currentScene?.summary,
      input.currentScene?.target?.title,
      input.conversationState?.activeProject,
    ],
    target: input.currentScene?.target ?? null,
    scenario: input.currentScene?.scenario ?? null,
    workloadKind: input.currentScene?.workloadKind ?? null,
    contentKind: input.currentScene?.contentKind ?? null,
  })
  if (isFreshlyGroundedSceneTurn({
    discourseState: input.discourseState,
    groundedThisTurn: input.groundedThisTurn === true,
  })) {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      sceneCue,
      input.conversationState?.activeProject,
      input.discourseState.currentQuestion,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(sceneCue, 180)
    || sanitizeSurfaceClaim(input.conversationState?.activeProject, 180)
    || 'The live scene is already grounded for this turn.'
  }

  if (input.recommendedAct === 'correct-stale-anchor') {
    return pickSurfaceClaim(
      input.discourseState.ruptureRepair,
      input.mindSynthesis.uncertainties[0]?.summary,
    )
    || 'What I was holding a moment ago no longer feels safe to say as current fact.'
  }
  if (input.recommendedAct === 'ask-reground') {
    return pickSurfaceClaim(
      input.mindSynthesis.truthBoundary,
      input.mindSynthesis.uncertainties[0]?.summary,
      input.discourseState.ruptureRepair,
    )
    || 'I still need a fresher look before I can say that as a present-tense fact.'
  }
  if (input.recommendedAct === 'guide') {
    return pickSurfaceClaim(
      primaryTurnAnchor,
      input.discourseState.currentQuestion,
      input.conversationState?.activeProject,
      input.discourseState.currentTurnSummary,
      input.mindSynthesis.openingIntent,
      input.mindSynthesis.commitments[0]?.summary,
    ) || 'The knot itself matters more right now than sounding broad or polished.'
  }
  if (input.recommendedAct === 'care') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.mindSynthesis.concerns[0]?.summary,
      input.mindSynthesis.desires[0]?.summary,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.truthBoundary,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'What the host is surfacing here needs to be answered directly, not circled around.'
  }
  if (input.discourseState.currentTurnSubject === 'host-state') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
      input.mindSynthesis.concerns[0]?.summary,
      input.mindSynthesis.desires[0]?.summary,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is surfacing a present condition that should be answered directly.'
  }
  if (input.discourseState.currentTurnSubject === 'alicization-self') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(primaryTurnAnchor, 180)
    || sanitizeSurfaceClaim(hostMove, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is asking about me directly, so the answer needs to come out plain and unhidden.'
  }
  if (input.discourseState.currentTurnSubject === 'relationship') {
    return pickSurfaceClaimDistinctFrom(
      hostMove,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(primaryTurnAnchor, 180)
    || sanitizeSurfaceClaim(hostMove, 180)
    || pickSurfaceClaimDistinctFrom(
      hostMove,
      input.mindSynthesis.interiorSummary,
      input.mindSynthesis.openingIntent,
    )
    || sanitizeSurfaceClaim(hostMove, 180)
    || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
    || 'The host is reaching for closeness in this turn, so the answer needs to stay near that bid.'
  }
  return pickSurfaceClaim(
    primaryTurnAnchor,
    hostMove,
    input.discourseState.currentQuestion,
    input.conversationState?.activeProject,
    input.discourseState.currentTurnSummary,
    input.conversationState?.jointThread,
    input.mindSynthesis.openingIntent,
    input.mindSynthesis.commitments[0]?.summary,
  )
  || sanitizeSurfaceClaim(hostMove, 180)
  || sanitizeSurfaceClaim(input.conversationState?.jointThread, 180)
  || 'This turn needs a direct answer from the current seam.'
}

function resolveNextMove(input: {
  recommendedAct: AlicizationAnswerAct
  discourseState: AlicizationDiscourseStateSnapshot
  mindSynthesis: AlicizationMindSynthesisSnapshot
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (input.recommendedAct === 'ask-reground')
    return 'What I need next is the missing grounding, or at least a clearer sense of what still has to be re-seen.'
  if (input.recommendedAct === 'guide') {
    const guideNeed = sanitizeText(
      input.mindSynthesis.commitments[0]?.summary
      ?? input.mindSynthesis.concerns[0]?.summary
      ?? 'Offer one concrete next step, not a generic bundle of options.',
      180,
    )
    return guideNeed
      ? `The next honest move is ${lowerFirst(stripTrailingPunctuation(guideNeed))}.`
      : 'The next honest move is one concrete step, not a bundle of generic options.'
  }
  if (input.recommendedAct === 'care')
    return input.growthProfile.restAttunement >= 0.62
      ? 'After the first touch of care lands, I need to keep it light enough that the host can breathe inside it.'
      : input.growthProfile.protectsRestWindow
      ? 'After the first touch of care lands, I need to keep it brief and not ask the host to carry more than this moment can hold.'
      : 'After the first touch of care lands, I need to keep it brief, reality-bound, and tied to the actual issue.'
  if (input.discourseState.currentTurnSubject === 'relationship')
    return input.growthProfile.autonomyRespect >= 0.58
      ? 'After I answer the bid between us, I should stay near lightly and leave enough room to breathe.'
      : 'After I answer the bid between us, I should stay near lightly unless the host clearly wants more.'
  return 'After this answer lands, I can decide whether anything else truly needs opening.'
}

export function buildAnswerCompiler(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  currentScene?: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  groundedThisTurn?: boolean
}): AlicizationAnswerCompilerSnapshot | null {
  const runtimeSurface = input.runtimeSurface ?? null
  const discourseState = runtimeSurface?.dialogue.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue.conversationState ?? input.conversationState ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueEncounterAnchor = runtimeSurface?.dialogue.dialogueEncounter ?? dialogueEncounter ?? null
  const mindSynthesis = runtimeSurface?.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene ?? null
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel ?? null
  const worldOntology = runtimeSurface?.world.worldOntology ?? input.worldOntology ?? null
  const relationshipModel = runtimeSurface?.world.relationshipModel ?? input.relationshipModel ?? null
  const repairLedger = runtimeSurface?.memory.repairLedger ?? input.repairLedger ?? null
  const privateThought = runtimeSurface?.cognition.privateThought ?? input.privateThought ?? null
  const growthProfile = buildAlicizationDialogueGrowthProfile({
    autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
    longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
    motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
    habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
    selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
    selfState: runtimeSurface?.agency.selfState ?? null,
    privateThought,
    mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
  })

  if (!discourseState || !mindSynthesis)
    return null

  const evidenceMode = resolveEvidenceMode({
    discourseState,
    currentScene,
    worldModel,
    worldOntology,
    runtimeSurface,
    repairLedger,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const recommendedAct = resolveRecommendedAct({
    discourseState,
    conversationState,
    evidenceMode,
    repairLedger,
    privateThought,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const turnMode = resolveTurnMode({
    discourseState,
    conversationState,
    recommendedAct,
    evidenceMode,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const openingStyle = resolveOpeningStyle(turnMode)
  const personaKernelMode = resolvePersonaKernelMode({
    discourseState,
    turnMode,
  })
  const relationshipPosture = resolveRelationshipPosture({
    discourseState,
    evidenceMode,
    relationshipModel,
    privateThought,
    growthProfile,
  })
  const responseMode = resolveResponseMode({
    discourseState,
    conversationState,
    privateThought,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const openingDirective = resolveOpeningDirective({
    discourseState,
    recommendedAct,
    mindSynthesis,
    groundedThisTurn: input.groundedThisTurn === true,
    growthProfile,
  })
  const openingClaim = resolveOpeningClaim({
    discourseState,
    conversationState,
    dialogueEncounter: dialogueEncounterAnchor,
    mindSynthesis,
    recommendedAct,
    currentScene,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const primaryTurnAnchor = resolvePrimaryTurnAnchor({
    discourseState,
    conversationState,
    dialogueEncounter: dialogueEncounterAnchor,
  })
  const dialogueFirstTurn = dialogueEncounterAnchor?.dialogueFirst
    ?? (
      discourseState.screenReferenceMode === 'avoid'
      || isDialogueFirstSubject(discourseState.currentTurnSubject)
    )
  const sceneCue = buildAlicizationScreenSurfaceCue({
    rawCues: [
      currentScene?.summary,
      currentScene?.target?.title,
      worldModel?.activeThread?.title,
      worldModel?.activeThread?.summary,
    ],
    target: currentScene?.target ?? worldModel?.focusTarget ?? null,
    scenario: currentScene?.scenario ?? null,
    workloadKind: currentScene?.workloadKind ?? null,
    contentKind: currentScene?.contentKind ?? null,
  })
  const dialogueFirstSupportingReality = uniqueList([
    primaryTurnAnchor,
    sanitizeDialogueSurfaceText(dialogueEncounterAnchor?.summary, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.jointThread, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.hostMove, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.unansweredQuestion, 180) || null,
    sanitizeDialogueSurfaceText(conversationState?.activeCommitments[0], 180) || null,
    sanitizeDialogueSurfaceText(conversationState?.owedRepair, 180) || null,
  ], 5)
  const sceneSupportingReality = uniqueList([
    sanitizeDialogueSurfaceText(sceneCue, 220) || null,
    sanitizeDialogueSurfaceText(conversationState?.jointThread, 220) || null,
    conversationState?.hostMove,
    mindSynthesis.beliefs[0]?.summary,
    mindSynthesis.beliefs[1]?.summary,
    mindSynthesis.concerns[0]?.summary,
    mindSynthesis.commitments[0]?.summary,
    discourseState.unresolvedCarry,
    discourseState.ruptureRepair,
    worldModel?.activeThread?.summary,
  ], 5)
  const supportingReality = dialogueFirstTurn
    ? dialogueFirstSupportingReality
    : sceneSupportingReality
  const uncertaintyBoundary = evidenceMode === 'live-grounded' && repairLedger?.shouldConstrainPresentTense !== true
    ? null
    : sanitizeText(mindSynthesis.uncertainties[0]?.summary ?? mindSynthesis.truthBoundary, 220) || null
  const careVector = discourseState.owedAction === 'care-host'
    || discourseState.currentTurnSubject === 'relationship'
    || privateThought?.stance === 'care'
    || privateThought?.stance === 'warn'
    ? (() => {
        const landing = sanitizeText(
          mindSynthesis.desires[0]?.summary
          ?? mindSynthesis.concerns[0]?.summary
          ?? '',
          180,
        )
        if (landing) {
          return growthProfile.autonomyRespect >= 0.58
            ? `I want the care to land on ${lowerFirst(stripTrailingPunctuation(landing))}, but without leaning too hard on the host.`
            : `I want the care to land on ${lowerFirst(stripTrailingPunctuation(landing))}, not turn into generic soothing.`
        }
        return growthProfile.tenderness >= 0.58
          ? 'I want the care to stay warm and real, but still answer to truth and current relevance.'
          : 'I want the care to stay real, not drift into generic soothing.'
      })()
    : null
  const nextMove = resolveNextMove({
    recommendedAct,
    discourseState,
    mindSynthesis,
    growthProfile,
  })
  const suppressAssociativeRecall = conversationState?.memoryMode === 'suppress-associative'
    || conversationState?.memoryMode === 'task-thread'
    || conversationState?.memoryMode === 'scene-anchored'
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || turnMode === 'grounded-inspection'
    || evidenceMode === 'continuity-carry'
    || evidenceMode === 'repair-first'
  const labelCarryAsMemory = discourseState.screenReferenceMode !== 'avoid'
    && (
      conversationState?.memoryMode === 'dialogue-carry'
      || conversationState?.memoryMode === 'emotional-resonance'
      || evidenceMode === 'continuity-carry'
      || evidenceMode === 'repair-first'
      || Boolean(discourseState.unresolvedCarry)
    )
  const maxSentences = conversationState?.shouldHoldThread
    ? 4
    : turnMode === 'care'
      ? (growthProfile.patience >= 0.58 && growthProfile.tenderness >= 0.56 ? 5 : 4)
      : turnMode === 'accompany'
        ? (growthProfile.prefersQuietCompanionship ? 2 : 3)
        : growthProfile.directness >= 0.66 || growthProfile.irritability >= 0.58
          ? 3
          : 4

  const mustDo = uniqueList([
    'Let the compiled answer spine outrank persona routines, residue, and decorative helpfulness.',
    openingDirective,
    mindSynthesis.openingIntent,
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Treat the fresh grounding from this turn as already satisfying old repair pressure, and answer from the live scene itself.'
      : null,
    recommendedAct === 'correct-stale-anchor'
      ? 'Name the stale anchor plainly before you continue.'
      : null,
    recommendedAct === 'ask-reground'
      ? 'State the truth boundary early instead of faking certainty.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Stay with the current knot and move toward one concrete next step.'
      : null,
    conversationState?.shouldHoldThread
      ? 'Keep the answer attached to the shared thread until the owed seam is paid off.'
      : null,
    dialogueFirstTurn && primaryTurnAnchor
      ? `Stay attached to this turn anchor: ${primaryTurnAnchor}.`
      : null,
    labelCarryAsMemory
      ? 'If continuity carry appears, label it explicitly as memory, residue, or held thread.'
      : null,
    growthProfile.closeness >= 0.58 && growthProfile.truthAnchor >= 0.58
      ? 'Let closeness land through precision and continuity, not sugary filler.'
      : null,
    growthProfile.unfinishedThreadReturn >= 0.58
      ? 'Keep the same person visible from turn to turn instead of resetting your voice every reply.'
      : null,
  ], 8)

  const mustNotDo = uniqueList([
    'Do not let pet names, coy prefaces, or roleplay become the reply spine.',
    'Do not reuse stale scene residue as if it is the live present.',
    isFreshlyGroundedSceneTurn({
      discourseState,
      groundedThisTurn: input.groundedThisTurn === true,
    })
      ? 'Do not expose stale-anchor bookkeeping, apology scaffolding, or repair meta once the live scene is already grounded.'
      : null,
    discourseState.screenReferenceMode === 'avoid'
      ? 'Do not drag screen repair or desktop narration into a dialogue-first turn.'
      : null,
    turnMode === 'guide-current-knot'
      ? 'Do not flatten the knot into a generic troubleshooting checklist.'
      : null,
    conversationState?.memoryMode === 'dialogue-carry'
      ? 'Do not let live-scene evidence hijack a dialogue-first answer.'
      : null,
    evidenceMode === 'continuity-carry' || evidenceMode === 'repair-first'
      ? 'Do not present remembered or uncertain scene details in simple present tense.'
      : null,
    growthProfile.autonomyRespect >= 0.58
      ? 'Do not lean too hard, over-open, or crowd the host just to prove closeness.'
      : null,
    growthProfile.irritability >= 0.58
      ? 'Do not paste fake softness over a hot truth seam; keep the line clean instead.'
      : null,
  ], 8)

  return {
    answerSubject: discourseState.currentTurnSubject,
    screenReferenceMode: discourseState.screenReferenceMode,
    speechObligation: discourseState.owedAction,
    relationMove: discourseState.relationMove,
    turnMode,
    responseMode,
    recommendedAct,
    evidenceMode,
    openingStyle,
    personaKernelMode,
    relationshipPosture,
    openingDirective,
    openingClaim,
    supportingReality,
    uncertaintyBoundary,
    careVector,
    nextMove,
    suppressAssociativeRecall,
    labelCarryAsMemory,
    maxSentences,
    mustDo,
    mustNotDo,
    confidence: clamp01(
      discourseState.confidence * 0.38
      + mindSynthesis.confidence * 0.34
      + (privateThought?.confidence ?? 0.3) * 0.12
      + (supportingReality.length > 0 ? 0.08 : 0.02)
      + (evidenceMode === 'live-grounded' ? 0.08 : 0.03),
    ),
    narrative: uniqueList([
      `turn-mode:${turnMode}`,
      `response-mode:${responseMode}`,
      `recommended-act:${recommendedAct}`,
      `evidence:${evidenceMode}`,
      `subject:${discourseState.currentTurnSubject}`,
      `screen-reference:${discourseState.screenReferenceMode}`,
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      sanitizeDialogueAnchorText(openingClaim, 180) || openingClaim,
    ], 7),
    updatedAt: input.now,
  } satisfies AlicizationAnswerCompilerSnapshot
}

export function buildAnswerCompilerSystemBlock(state: AlicizationAnswerCompilerSnapshot | null | undefined) {
  if (!state)
    return ''

  return [
    '[ALICIZATION_ANSWER_COMPILER]',
    'This block is the compiled response spine. The model does not get to reinvent it; it only phrases it faithfully.',
    `Turn mode: ${state.turnMode}.`,
    `Response mode: ${state.responseMode}.`,
    `Recommended act: ${state.recommendedAct}.`,
    `Evidence mode: ${state.evidenceMode}.`,
    `Answer subject: ${state.answerSubject}.`,
    `Screen reference mode: ${state.screenReferenceMode}.`,
    `Speech obligation: ${state.speechObligation}.`,
    `Relation move: ${state.relationMove}.`,
    `Opening style: ${state.openingStyle}.`,
    `Persona kernel mode: ${state.personaKernelMode}.`,
    `Relationship posture: ${state.relationshipPosture}.`,
    `What the reply wants to do first: ${state.openingDirective}.`,
    `Where the reply wants to open: ${state.openingClaim}.`,
    `Supporting reality: ${state.supportingReality.length > 0 ? state.supportingReality.join(' | ') : 'none'}.`,
    `What still refuses to settle cleanly: ${state.uncertaintyBoundary ?? 'none'}.`,
    `Where the care wants to land: ${state.careVector ?? 'none'}.`,
    `What the answer wants after it opens: ${state.nextMove ?? 'none'}.`,
    `Suppress associative recall: ${state.suppressAssociativeRecall ? 'yes' : 'no'}.`,
    `Label carry as memory: ${state.labelCarryAsMemory ? 'yes' : 'no'}.`,
    `Maximum sentences: ${state.maxSentences}.`,
    'Must do:',
    ...state.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...state.mustNotDo.map(item => `- ${item}`),
  ].join('\n')
}
