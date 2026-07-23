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
import type { AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import type { AlicizationPersonaKernelMode } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  buildAlicizationScreenSurfaceCue,
  readHostPersonModelFromDerivedMindStateBundle,
  readPersonStateProjectionFromDerivedMindStateBundle,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { isDialogueFirstSubject, sanitizeDialogueAnchorText, sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { deriveMindTruthContract } from './mind-truth-contract'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
} from './person-state-projection-resolution'
import {

  buildAlicizationPersonalityContinuityState,
} from './personality-continuity-state'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

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

function readableControlToken(raw: string) {
  return raw
    .replace(/_/gu, ' ')
    .replace(/\btrue\b/giu, 'yes')
    .replace(/\bfalse\b/giu, 'no')
    .trim()
}

function renderAnswerCompilerControlSegment(trimmed: string) {
  const matched = trimmed.match(/^([a-z][\w-]+)\s*=\s*(.+)$/iu)
  if (!matched)
    return trimmed

  const key = readableControlToken(matched[1] ?? '')
  const value = readableControlToken(matched[2] ?? '')
  if (!key || !value)
    return ''

  if (key === 'avoid')
    return `Avoid ${value}.`
  if (/blocked|forbid|avoid/iu.test(value))
    return `Do not allow ${key}.`
  if (/defer|after payoff|after repair/iu.test(value))
    return `Defer ${key} until ${value}.`
  if (/required|present|active|current|primary|explicit|yes|preserve/iu.test(value))
    return `Keep ${key} ${value}.`
  if (/lower/iu.test(value))
    return `Lower the priority of ${key}.`
  return `Use ${key} as ${value}.`
}

function containsAnswerCompilerFixedTemplateResidue(raw: string) {
  return /\bSame Phase 1 digital life\b|local_desktop_life_loop|phase1_local_digital_life|runtime_personhood|life_core|project_state_review|memory_dialogue_embodiment_closure|relationship_cadence=|continuity_hold=|visibility=internal|owner=project_state_governance|Before (?:answering|speaking|acting)/iu.test(raw)
}

function naturalizeAnswerCompilerControlText(raw: unknown, maxChars = 420) {
  const providerSafe = sanitizeAlicizationProviderFacingText(raw, maxChars, '')
  const rawSafe = sanitizeText(raw, maxChars)
  const normalized = providerSafe || rawSafe
  if (!normalized)
    return ''
  if (containsAnswerCompilerFixedTemplateResidue(normalized))
    return ''

  if (!/\b[a-z][\w-]+\s*=/iu.test(normalized))
    return normalized

  return sanitizeText(normalized
    .split(/\s*[;|]\s*/u)
    .map(segment => renderAnswerCompilerControlSegment(segment.trim()))
    .filter(Boolean)
    .join(' '), maxChars)
}

function naturalizeAnswerCompilerControlList(values: string[], maxItems = 10) {
  return uniqueList(values.map(value => naturalizeAnswerCompilerControlText(value, 360)), maxItems)
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
    const rawValue = typeof value === 'string' ? value.trim() : ''
    const maxChars = rawValue.startsWith('pre-dialogue project awareness:') ? 960 : 220
    const normalized = sanitizeDialogueSurfaceText(value, maxChars) || sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function firstCommitmentLine(conversationState?: AlicizationConversationStateSnapshot | null) {
  const commitments = Array.isArray(conversationState?.activeCommitments)
    ? conversationState.activeCommitments
    : []
  return sanitizeDialogueSurfaceText(commitments[0], 180) || null
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

function deriveClosenessContextFromContinuityState(
  state: AlicizationPersonalityContinuityStateSnapshot | null | undefined,
) {
  const regime = state?.currentRegime
  if (
    regime === 'focused-work'
    || regime === 'repair-window'
    || regime === 'late-night-care'
    || regime === 'execution-callback'
    || regime === 'open-companionship'
  ) {
    return regime
  }
  return 'general' as const
}

function deriveClosenessRungFromContinuityState(
  state: AlicizationPersonalityContinuityStateSnapshot | null | undefined,
) {
  const posture = state?.closenessPosture
  if (posture === 'space-first')
    return 'space-first' as const
  if (posture === 'close-hold')
    return 'close-hold' as const
  if (posture === 'warm-guidance') {
    return state?.currentRegime === 'open-companionship'
      ? 'warm-near' as const
      : 'nearby-soft' as const
  }
  if (state?.currentRegime === 'repair-window' || state?.currentRegime === 'execution-callback')
    return 'measured-room' as const
  if (state?.currentRegime === 'late-night-care')
    return 'nearby-soft' as const
  return 'measured-room' as const
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
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
  projectedRelationshipPosture?: AlicizationAnswerCompilerSnapshot['relationshipPosture'] | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
}) {
  if (input.projectedRelationshipPosture)
    return input.projectedRelationshipPosture
  if (input.selfContinuityAuthority?.closenessPosture === 'close-hold')
    return 'tender' as const
  if (input.selfContinuityAuthority?.closenessPosture === 'space-first')
    return 'restrained' as const
  if (
    input.personalityContinuityState?.currentRegime === 'focused-work'
    && input.personalityContinuityState.autonomyPosture === 'protect-space'
  ) {
    return 'restrained' as const
  }
  if (
    input.discourseState.owedAction === 'repair-truth'
    || input.evidenceMode === 'repair-first'
    || input.growthProfile.guardedness >= 0.64
    || input.growthProfile.irritability >= 0.66
    || input.personalityContinuityState?.repairPosture === 'repair-first'
  ) {
    return 'restrained' as const
  }
  if (
    input.growthProfile.companionshipStyle === 'close-hold'
    || input.personalityContinuityState?.closenessPosture === 'close-hold'
  ) {
    return 'tender' as const
  }
  if (
    input.discourseState.owedAction === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
    || input.personalityContinuityState?.currentRegime === 'late-night-care'
  ) {
    return input.growthProfile.tenderness >= 0.56 && input.growthProfile.closeness >= 0.54
      ? 'tender' as const
      : 'warm' as const
  }
  return 'warm' as const
}

function resolveOpeningClaim(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueEncounterAnchor | null
  mindSynthesis: AlicizationMindSynthesisSnapshot
  recommendedAct: AlicizationAnswerAct
  currentScene?: AlicizationVisualSceneSnapshot | null
  groundedThisTurn?: boolean
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
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
      input.selfContinuityAuthority?.selfLine,
      input.selfContinuityAuthority?.inwardLine,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.selfLine, 180)
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.inwardLine, 180)
    || pickSurfaceClaimDistinctFrom(
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
      input.selfContinuityAuthority?.relationshipLine,
      input.selfContinuityAuthority?.selfLine,
      primaryTurnAnchor,
      input.discourseState.currentTurnSummary,
      input.conversationState?.jointThread,
    )
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.relationshipLine, 180)
    || sanitizeSurfaceClaim(input.selfContinuityAuthority?.selfLine, 180)
    || pickSurfaceClaimDistinctFrom(
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
    || 'A relationship signal is present; answer the current turn directly.'
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
  const derivedBundle = runtimeSurface?.memory.derivedMindStateBundle ?? null
  const explicitPersonalityContinuityState = runtimeSurface?.memory.personalityContinuityState ?? null
  const personStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle),
    runtimeProjection: runtimeSurface?.memory.personStateProjection ?? null,
  }) ?? null
  const personalityContinuityState = explicitPersonalityContinuityState
    ?? personStateProjection?.personalityContinuityState
    ?? buildAlicizationPersonalityContinuityState({
      now: input.now,
      autobiographicalSelf: runtimeSurface?.memory.autobiographicalSelf ?? null,
      hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
        ?? runtimeSurface?.memory.hostPersonModel
        ?? null,
      longHorizonMemory: runtimeSurface?.memory.longHorizonMemory ?? null,
      motiveEngine: runtimeSurface?.memory.motiveEngine ?? null,
      habitPolicy: runtimeSurface?.agency.habitPolicy ?? null,
      selfContinuity: runtimeSurface?.memory.selfContinuity ?? null,
      selfState: runtimeSurface?.agency.selfState ?? null,
      privateThought,
      mindEcology: runtimeSurface ? buildMindEcologyFromRuntimeSurface(runtimeSurface) : null,
    })
  const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: readPersonStateProjectionFromDerivedMindStateBundle<any>(derivedBundle)?.selfContinuityAuthority ?? null,
    runtimeAuthority: personStateProjection?.selfContinuityAuthority
      ?? runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority
      ?? null,
  }) ?? buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  const runtimeRelationshipCarry = personStateProjection?.selfContinuityAuthority?.relationshipLine
    ?? runtimeSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine
    ?? null
  const selfContinuityAuthority = (
    mergedSelfContinuityAuthority
    && runtimeRelationshipCarry
    && hasContinuityRestraintRelationshipSignal(runtimeRelationshipCarry)
    && (
      !mergedSelfContinuityAuthority.relationshipLine
      || hasNeutralRelationshipSignal(mergedSelfContinuityAuthority.relationshipLine)
    )
  )
    ? {
        ...mergedSelfContinuityAuthority,
        relationshipLine: runtimeRelationshipCarry,
      }
    : mergedSelfContinuityAuthority
  const growthProfile = personalityContinuityState.growthProfile

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
    personalityContinuityState,
    selfContinuityAuthority,
    projectedRelationshipPosture: explicitPersonalityContinuityState
      ? null
      : personStateProjection?.relationshipPosture ?? null,
  })
  const responseMode = resolveResponseMode({
    discourseState,
    conversationState,
    privateThought,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const replyRealizationMode = 'provider-mind-required' as const
  const expectedVisibleReplyAuthority = 'llm-mind' as const
  const activeClosenessContext = personStateProjection?.activeClosenessContext
    ?? deriveClosenessContextFromContinuityState(personalityContinuityState)
  const activeClosenessRung = personStateProjection?.activeClosenessRung
    ?? deriveClosenessRungFromContinuityState(personalityContinuityState)
  const openingClaim = resolveOpeningClaim({
    discourseState,
    conversationState,
    dialogueEncounter: dialogueEncounterAnchor,
    mindSynthesis,
    recommendedAct,
    currentScene,
    groundedThisTurn: input.groundedThisTurn === true,
    selfContinuityAuthority,
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
    firstCommitmentLine(conversationState),
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
  const providerSafeOpeningDirective = ''
  const providerSafeOpeningClaim = naturalizeAnswerCompilerControlText(openingClaim, 260)
  const providerSafeSupportingReality = naturalizeAnswerCompilerControlList(supportingReality, 12)
  const providerSafeUncertaintyBoundary = naturalizeAnswerCompilerControlText(uncertaintyBoundary, 260)
  const providerSafeCareVector = ''
  const providerSafeNextMove = ''
  const providerSafeMustDo: string[] = []
  const providerSafeMustNotDo: string[] = []

  return {
    answerSubject: discourseState.currentTurnSubject,
    screenReferenceMode: discourseState.screenReferenceMode,
    speechObligation: discourseState.owedAction,
    relationMove: discourseState.relationMove,
    turnMode,
    responseMode,
    replyRealizationMode,
    expectedVisibleReplyAuthority,
    recommendedAct,
    evidenceMode,
    openingStyle,
    personaKernelMode,
    relationshipPosture,
    activeClosenessContext,
    activeClosenessRung,
    openingDirective: providerSafeOpeningDirective,
    openingClaim: providerSafeOpeningClaim,
    supportingReality: providerSafeSupportingReality,
    uncertaintyBoundary: providerSafeUncertaintyBoundary,
    careVector: providerSafeCareVector,
    nextMove: providerSafeNextMove,
    suppressAssociativeRecall,
    labelCarryAsMemory,
    maxSentences,
    mustDo: providerSafeMustDo,
    mustNotDo: providerSafeMustNotDo,
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
      `continuity-regime:${personalityContinuityState.currentRegime}`,
      `continuity-trust:${personalityContinuityState.trustStage}`,
      `continuity-rhythm:${personalityContinuityState.rhythmState.cadenceMode}:${personalityContinuityState.rhythmState.restMode}`,
      `screen-reference:${discourseState.screenReferenceMode}`,
      primaryTurnAnchor ? `anchor:${primaryTurnAnchor}` : null,
      activeClosenessContext && activeClosenessRung ? `closeness-ladder:${activeClosenessContext}/${activeClosenessRung}` : null,
      sanitizeDialogueAnchorText(providerSafeOpeningClaim, 180) || providerSafeOpeningClaim,
    ], 10),
    updatedAt: input.now,
  } satisfies AlicizationAnswerCompilerSnapshot
}

export function buildAnswerCompilerSystemBlock(_state: AlicizationAnswerCompilerSnapshot | null | undefined) {
  return ''
}
