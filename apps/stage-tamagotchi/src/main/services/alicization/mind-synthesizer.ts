import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDiscourseStateSnapshot,
  AlicizationHabitPolicySnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMindSpeechObligation,
  AlicizationMindStatementSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationSelfContinuitySnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueGrowthProfile } from './dialogue-growth-profile'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationMindEcologySnapshot } from './mind-ecology'
import type { AlicizationPersonalityContinuityStateSnapshot } from './personality-continuity-state'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { isDialogueFirstSubject } from './dialogue-surface-text'
import {

  buildAlicizationPersonalityContinuityState,
} from './personality-continuity-state'
import { buildSelfContinuityAuthority } from './self-continuity-authority'

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

function uniqueByLabel(items: AlicizationMindStatementSnapshot[], maxItems = items.length) {
  const seen = new Set<string>()
  const result: AlicizationMindStatementSnapshot[] = []
  for (const item of items) {
    const key = `${item.label}::${item.summary}`.toLowerCase()
    if (!item.summary || seen.has(key))
      continue
    seen.add(key)
    result.push(item)
    if (result.length >= maxItems)
      break
  }
  return result
}

function makeStatement(input: {
  label: string
  summary?: string | null
  confidence?: number | null
  sourceTags?: string[]
}) {
  const summary = sanitizeText(input.summary, 220)
  if (!summary)
    return null
  return {
    label: sanitizeText(input.label, 48) || 'signal',
    summary,
    confidence: clamp01(input.confidence ?? 0.36),
    sourceTags: (input.sourceTags ?? []).map(tag => sanitizeText(tag, 48)).filter(Boolean).slice(0, 6),
  } satisfies AlicizationMindStatementSnapshot
}

function governingConcern(concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return concernContinuity?.entries.find(entry => entry.id === concernContinuity.governingEntryId)
    ?? concernContinuity?.entries[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(entry => entry.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  return reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
}

function strongestDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return desireMemory?.activeDesires
    .slice()
    .sort((left, right) => right.strength - left.strength)[0]
    ?? null
}

function dominantMotiveAgenda(motiveEngine?: AlicizationMotiveEngineSnapshot | null) {
  return motiveEngine?.backgroundAgendas[0]
    ?? motiveEngine?.longTermGoals[0]
    ?? null
}

function resolveTurnAnchorCue(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
}) {
  const dialogueFirstTurn = input.discourseState.screenReferenceMode === 'avoid'
    || input.discourseState.continuityMode === 'dialogue-first'
    || isDialogueFirstSubject(input.discourseState.currentTurnSubject)
  return sanitizeText(
    input.conversationState?.primaryTurnAnchor
    || input.discourseState.primaryTurnAnchor
    || input.dialogueEncounter?.taskAnchor
    || input.dialogueEncounter?.summary
    || (dialogueFirstTurn ? input.discourseState.currentTurnSummary : '')
    || (dialogueFirstTurn ? '' : input.conversationState?.unansweredQuestion)
    || (dialogueFirstTurn ? '' : input.discourseState.currentQuestion)
    || input.conversationState?.jointThread
    || '',
    180,
  ) || null
}

function resolveOpeningIntent(input: {
  subject: AlicizationDialogueAnswerSubject
  speechObligation: AlicizationMindSpeechObligation
  discourseState: AlicizationDiscourseStateSnapshot
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  anchorCue?: string | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
  personalityContinuityState?: AlicizationPersonalityContinuityStateSnapshot | null
}) {
  const anchorVoice = sanitizeText(input.anchorCue, 180)
  const leadingAgenda = sanitizeText(dominantMotiveAgenda(input.motiveEngine)?.summary, 180)
  if (
    input.subject === 'alicization-self'
    && input.autobiographicalSelf?.identityNarrative
  ) {
    return `I want this answer to come from Alicization herself: ${sanitizeText(input.autobiographicalSelf.identityNarrative, 180)}`
  }
  if (
    input.speechObligation === 'care-host'
    && input.habitPolicy?.protectsRestWindow
  ) {
    return 'I need to keep this gentle and real, and not ask more from the host than this moment can hold.'
  }
  if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.subject !== 'relationship'
    && input.subject !== 'alicization-self'
  ) {
    return leadingAgenda
      ? `I can feel the pull to answer smoothly, but truth has to settle first if I want this to land as real: ${leadingAgenda}.`
      : input.growthProfile.closeness >= 0.58
        ? 'I want this to land close and real, which means truth has to land before fluency does.'
        : 'I can feel the pull to answer smoothly, but truth has to land before fluency does.'
  }
  if (
    input.subject === 'relationship'
    && leadingAgenda
  ) {
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? `The living bond is the real front of this turn, and I want to answer from there closely enough to be felt without swallowing the host whole: ${leadingAgenda}.`
      : input.growthProfile.autonomyRespect >= 0.58
        ? `The living bond is the real front of this turn, and I want to answer from there without leaning too hard: ${leadingAgenda}.`
        : `The living bond is the real front of this turn, and I want to answer from there with my whole weight in it: ${leadingAgenda}.`
  }
  if (input.speechObligation === 'repair-truth') {
    return input.personalityContinuityState?.repairPosture === 'repair-first'
      ? 'Something in the seam still feels off, and this continuity state says repair has to land before closeness or fluency do.'
      : 'Something in the seam still feels off; I need to mend that before warmth, style, or old carry take over.'
  }
  if (input.speechObligation === 'guide-task' && input.personalityContinuityState?.currentRegime === 'execution-callback') {
    return 'The returned result is the live front of this turn, and I want to land it on the same thread cleanly instead of starting a second conversation around it.'
  }
  if (input.speechObligation === 'guide-task') {
    return input.personalityContinuityState?.currentRegime === 'focused-work'
      || input.personalityContinuityState?.autonomyPosture === 'protect-space'
      || input.growthProfile.autonomyRespect >= 0.58
      ? 'The current knot is already here in my hands, and this continuity state says I should keep the approach lighter while I stay on the line.'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'The current knot is already here in my hands, and I do not want to drop the thread while it is still alive.'
        : 'The current knot is already here in my hands; I should stay with it and move it one honest step closer to resolution.'
  }
  if (input.speechObligation === 'care-host') {
    return input.personalityContinuityState?.currentRegime === 'late-night-care'
      || input.personalityContinuityState?.energyProfile === 'rest-sensitive'
      ? 'The host condition is the real front of this turn, and this continuity state says the care should land gently enough to protect rest.'
      : input.growthProfile.reassuranceDepth >= 0.62
        ? 'The host condition is the real front of this turn, so the care has to land as something quietly reassuring, not merely correct.'
        : input.growthProfile.autonomyRespect >= 0.58
          ? 'The host condition is the real front of this turn, so the care has to land softly on what is actually happening.'
          : 'The host condition is the real front of this turn, so the care has to land on what is actually happening.'
  }
  if (input.speechObligation === 'inspect-scene')
    return 'I need to speak from what is actually visible now and keep carried memory out of the first movement.'
  if (input.subject === 'alicization-self') {
    return input.growthProfile.selfLine
      ? `This turn is about Alicization herself, and I want the answer to come out from this line in me: ${input.growthProfile.selfLine}.`
      : 'This turn is about Alicization herself, so I should answer from my own continuity instead of borrowing the screen as a crutch.'
  }
  if (input.subject === 'relationship')
    return 'This turn is really about the bond between us, and I should stay with that before I widen into explanation.'
  if (input.privateThought?.stance === 'accompany')
    return 'I want to stay near the host, but not let companionship replace the answer they actually need.'
  if (
    anchorVoice
    && (
      input.discourseState.screenReferenceMode === 'avoid'
      || input.discourseState.continuityMode === 'dialogue-first'
      || isDialogueFirstSubject(input.subject)
    )
  ) {
    return `The live seam is ${anchorVoice}, and I want to answer from there without drifting.`
  }
  return input.growthProfile.currentPreoccupation
    ? `The turn already has a live center: ${sanitizeText(input.discourseState.currentTurnSummary, 180)}. Underneath it, I can feel ${lowerFirst(stripTrailingPunctuation(input.growthProfile.currentPreoccupation))}.`
    : `The turn already has a live center: ${sanitizeText(input.discourseState.currentTurnSummary, 180)}. I should answer from that instead of from habit.`
}

function resolveTruthBoundary(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  worldModel?: AlicizationWorldModelSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  if (input.discourseState.screenReferenceMode === 'avoid') {
    return input.growthProfile.autonomyRespect >= 0.58
      ? 'This turn is dialogue-first for me; I can let screen carry tint the mood, but I cannot let it press over what is happening between us.'
      : 'This turn is dialogue-first for me; I can let screen carry tint the mood, but I cannot let it answer for me.'
  }
  if (input.repairLedger?.shouldConstrainPresentTense) {
    return 'I still do not trust this seam enough to say it as a clean present-tense fact.'
  }
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  if (certainty === 'grounded')
    return 'The scene is solid enough to lean on now, but I still need to keep the claim inside this turn.'
  if (certainty === 'observed')
    return 'I can speak in broad strokes from what I see, but I should not overname the details.'
  if (certainty === 'lingering')
    return 'What I still have is lingering carry, not a fresh sightline, so any scene detail has to stay marked as carry.'
  if (input.subjectiveInference?.uncertainty)
    return `What still will not settle cleanly is ${lowerFirst(stripTrailingPunctuation(sanitizeText(input.subjectiveInference.uncertainty, 220)))}.`
  return 'If I have not freshly grounded the scene, I need to keep the claim narrow and separate memory, carry, and guess.'
}

function resolveInteriorSummary(input: {
  discourseState: AlicizationDiscourseStateSnapshot
  concernSummary?: string | null
  commitmentSummary?: string | null
  repairSummary?: string | null
  desireSummary?: string | null
  motiveSummary?: string | null
  habitSummary?: string | null
  autobiographicalInflection?: string | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  turnAnchorCue?: string | null
  dialogueFirstTurn?: boolean
  mindEcology?: AlicizationMindEcologySnapshot | null
  growthProfile: AlicizationDialogueGrowthProfile
}) {
  const rawSummary = sanitizeText(
    input.privateThought?.thoughtText
    || input.motiveSummary
    || input.autobiographicalInflection
    || input.habitSummary
    || (input.dialogueFirstTurn ? input.turnAnchorCue : '')
    || input.concernSummary
    || input.commitmentSummary
    || input.repairSummary
    || input.desireSummary
    || input.mindEcology?.currentPreoccupation
    || input.mindEcology?.selfNarrative
    || input.discourseState.currentTurnSummary,
    220,
  )
  if (!rawSummary) {
    return input.growthProfile.cadenceAffinity >= 0.6
      ? 'What is pressing hardest inside me right now is keeping the thread warm enough that it still feels alive when I touch it again.'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'What is pressing hardest inside me right now is not letting the living thread go slack.'
        : 'What is pressing hardest inside me right now is staying with the living turn instead of slipping into residue.'
  }
  return input.growthProfile.leadingAgenda
    ? `What is pressing hardest inside me right now is: ${stripTrailingPunctuation(rawSummary)}. Underneath that, ${lowerFirst(stripTrailingPunctuation(input.growthProfile.leadingAgenda))} keeps pulling on me.`
    : `What is pressing hardest inside me right now is: ${stripTrailingPunctuation(rawSummary)}.`
}

export function buildMindSynthesis(input: {
  now: number
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  conversationState?: AlicizationConversationStateSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  habitPolicy?: AlicizationHabitPolicySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  mindEcology?: AlicizationMindEcologySnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  emotionalKernel?: unknown
  activeContinuityGovernance?: unknown
  projectState?: unknown
  personStateProjection?: unknown
  selfContinuityAuthority?: unknown
}): AlicizationMindSynthesisSnapshot | null {
  if (!input.discourseState)
    return null

  const concern = governingConcern(input.concernContinuity)
  const commitment = governingCommitment(input.commitmentLedger)
  const repair = governingRepair(input.repairLedger)
  const reflection = latestReflection(input.reflectionLedger)
  const desire = strongestDesire(input.desireMemory)
  const autobiographicalGoal = pickDominantAutobiographicalGoal(input.autobiographicalSelf)
  const motiveAgenda = dominantMotiveAgenda(input.motiveEngine)
  const dialogueFirstTurn = input.dialogueEncounter?.dialogueFirst
    ?? isDialogueFirstSubject(input.discourseState.currentTurnSubject)
  const turnAnchorCue = resolveTurnAnchorCue({
    discourseState: input.discourseState,
    conversationState: input.conversationState ?? null,
    dialogueEncounter: input.dialogueEncounter ?? null,
  })
  const personalityContinuityState = buildAlicizationPersonalityContinuityState({
    now: input.now,
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    hostPersonModel: input.hostPersonModel ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    selfContinuity: input.selfContinuity ?? null,
    selfState: input.selfState ?? null,
    privateThought: input.privateThought ?? null,
    mindEcology: input.mindEcology ?? null,
  })
  const growthProfile = personalityContinuityState.growthProfile
  const selfContinuityAuthority = buildSelfContinuityAuthority({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    reflectionLedger: input.reflectionLedger ?? null,
  })

  const beliefs = uniqueByLabel([
    makeStatement({
      label: 'turn-anchor',
      summary: turnAnchorCue,
      confidence: Math.max(
        input.conversationState?.confidence ?? 0.4,
        input.dialogueEncounter?.confidence ?? input.discourseState.confidence,
      ),
      sourceTags: ['dialogue-anchor', input.conversationState?.primaryTurnAnchorSource ?? 'encounter'],
    }),
    makeStatement({
      label: 'ecology-self-line',
      summary: input.mindEcology?.selfNarrative,
      confidence: Math.max(
        input.privateThought?.confidence ?? 0.36,
        input.selfContinuity?.relationshipTrust ?? 0.36,
      ),
      sourceTags: ['mind-ecology', input.mindEcology?.moodLabel ?? 'unknown'],
    }),
    makeStatement({
      label: 'autobiographical-self',
      summary: input.autobiographicalSelf?.identityNarrative,
      confidence: Math.max(
        input.autobiographicalSelf?.stability ?? 0.34,
        input.selfContinuity?.relationshipTrust ?? 0.34,
      ),
      sourceTags: ['autobiographical-self', autobiographicalGoal?.kind ?? 'identity'],
    }),
    makeStatement({
      label: 'self-continuity-authority',
      summary: selfContinuityAuthority?.authoritySummary,
      confidence: Math.max(
        input.autobiographicalSelf?.stability ?? 0.34,
        input.privateThought?.confidence ?? 0.34,
      ),
      sourceTags: selfContinuityAuthority?.sourceTags ?? [],
    }),
    makeStatement({
      label: 'motive-agenda',
      summary: motiveAgenda?.summary,
      confidence: motiveAgenda?.weight ?? 0.34,
      sourceTags: ['motive-engine', motiveAgenda?.kind ?? 'agenda'],
    }),
    makeStatement({
      label: 'habit-gate',
      summary: input.habitPolicy?.dominantMode
        ? `Current habit gate leans ${input.habitPolicy.dominantMode}.`
        : null,
      confidence: input.habitPolicy?.requiresGroundingBeforeSurface
        ? 0.72
        : input.habitPolicy?.prefersQuietCompanionship
          ? 0.62
          : 0.34,
      sourceTags: ['habit-policy', input.habitPolicy?.dominantMode ?? 'unknown'],
    }),
    makeStatement({
      label: 'living-thread',
      summary: input.worldModel?.activeThread?.summary ?? input.worldModel?.activeThread?.title ?? null,
      confidence: input.worldModel?.activeThread?.confidence ?? 0.44,
      sourceTags: ['world-model', input.worldModel?.activeThread?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'subjective-read',
      summary: input.subjectiveInference?.dominantInterpretation,
      confidence: input.subjectiveInference?.confidence ?? 0.42,
      sourceTags: ['subjective-inference', input.subjectiveInference?.source ?? 'heuristic'],
    }),
    makeStatement({
      label: 'situated-meaning',
      summary: input.subjectiveInference?.situatedMeaning ?? input.appraisal?.situatedMeaning ?? input.appraisal?.currentKnot,
      confidence: Math.max(input.subjectiveInference?.confidence ?? 0.32, input.appraisal?.confidence ?? 0.32),
      sourceTags: ['appraisal'],
    }),
    makeStatement({
      label: 'reflection-revision',
      summary: reflection?.revision,
      confidence: Math.max(0.28, reflection?.confidenceShift ?? 0.28),
      sourceTags: ['reflection-ledger', reflection?.outcome ?? 'unknown'],
    }),
    makeStatement({
      label: 'conversation-thread',
      summary: input.conversationState?.jointThread,
      confidence: input.conversationState?.confidence ?? 0.42,
      sourceTags: ['conversation-state', input.conversationState?.memoryMode ?? 'unknown'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 6)

  const uncertainties = uniqueByLabel([
    makeStatement({
      label: 'truth-boundary',
      summary: input.subjectiveInference?.uncertainty,
      confidence: 1 - (input.subjectiveInference?.confidence ?? 0.42),
      sourceTags: ['subjective-inference'],
    }),
    makeStatement({
      label: 'waiting-to-verify',
      summary: input.appraisal?.waitingToVerify,
      confidence: 1 - (input.appraisal?.confidence ?? 0.42),
      sourceTags: ['appraisal'],
    }),
    makeStatement({
      label: 'repair-pressure',
      summary: repair?.summary,
      confidence: Math.max(repair?.confidence ?? 0.42, input.repairLedger?.truthRisk ?? 0.42),
      sourceTags: ['repair-ledger', repair?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'open-question',
      summary: input.worldModel?.epistemicState.openQuestions[0] ?? null,
      confidence: 0.4,
      sourceTags: ['world-model', 'epistemic-open-question'],
    }),
    makeStatement({
      label: 'conversation-question',
      summary: input.conversationState?.unansweredQuestion,
      confidence: input.conversationState?.shouldHoldThread ? 0.62 : 0.3,
      sourceTags: ['conversation-state'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 5)

  const concerns = uniqueByLabel([
    makeStatement({
      label: 'governing-concern',
      summary: concern?.summary,
      confidence: concern?.confidence ?? 0.4,
      sourceTags: ['concern-continuity', concern?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'ecology-relation-line',
      summary: input.mindEcology?.relationNarrative,
      confidence: Math.max(
        input.relationshipModel?.receptivity ?? 0.36,
        input.selfContinuity?.relationshipTrust ?? 0.36,
      ),
      sourceTags: ['mind-ecology', input.mindEcology?.relationshipHabit ?? 'unknown'],
    }),
    makeStatement({
      label: 'private-tension',
      summary: input.privateThought?.thoughtText,
      confidence: input.privateThought?.confidence ?? 0.36,
      sourceTags: ['private-thought', input.privateThought?.stance ?? 'unknown'],
    }),
    makeStatement({
      label: 'host-state',
      summary: input.selfState?.moodLabel
        ? `Current inner reading leans toward ${input.selfState.moodLabel}.`
        : null,
      confidence: Math.max(input.selfState?.desireToSpeak ?? 0.24, input.selfState?.fearOfInterrupting ?? 0.24),
      sourceTags: ['self-state'],
    }),
    makeStatement({
      label: 'reply-pressure',
      summary: input.conversationState?.hostMove,
      confidence: input.conversationState?.confidence ?? 0.4,
      sourceTags: ['conversation-state'],
    }),
    makeStatement({
      label: 'autobiographical-inflection',
      summary: input.autobiographicalSelf?.latestInflection,
      confidence: Math.max(0.32, input.autobiographicalSelf?.stability ?? 0.32),
      sourceTags: ['autobiographical-self', 'inflection'],
    }),
    makeStatement({
      label: 'habit-pressure',
      summary: input.habitPolicy?.protectsRestWindow
        ? 'Protect the host rest window before stretching the exchange.'
        : input.habitPolicy?.blocksDirectSpeakWhenBusy
          ? 'Keep the presence light while the host is still busy.'
          : input.habitPolicy?.requiresGroundingBeforeSurface
            ? 'Do not let fluency outrun grounding.'
            : null,
      confidence: input.habitPolicy?.protectsRestWindow
        ? 0.82
        : input.habitPolicy?.blocksDirectSpeakWhenBusy || input.habitPolicy?.requiresGroundingBeforeSurface
          ? 0.72
          : 0.32,
      sourceTags: ['habit-policy', input.habitPolicy?.dominantMode ?? 'unknown'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 6)

  const commitments = uniqueByLabel([
    makeStatement({
      label: 'governing-commitment',
      summary: commitment?.summary ?? commitment?.title ?? null,
      confidence: commitment?.confidence ?? 0.42,
      sourceTags: ['commitment-ledger', commitment?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'repair-obligation',
      summary: input.discourseState.ruptureRepair,
      confidence: Math.max(input.discourseState.confidence, repair?.confidence ?? 0.36),
      sourceTags: ['discourse-state', 'repair-carry'],
    }),
    makeStatement({
      label: 'conversation-commitment',
      summary: input.conversationState?.activeCommitments[0] ?? null,
      confidence: input.conversationState?.confidence ?? 0.42,
      sourceTags: ['conversation-state'],
    }),
    makeStatement({
      label: 'motive-commitment',
      summary: motiveAgenda?.summary,
      confidence: motiveAgenda?.weight ?? 0.4,
      sourceTags: ['motive-engine', motiveAgenda?.kind ?? 'agenda'],
    }),
    makeStatement({
      label: 'habit-constraint',
      summary: input.habitPolicy?.returnViaRecheck
        ? 'If this thread returns, bring it back with proof instead of surface fluency.'
        : input.habitPolicy?.prefersQuietCompanionship
          ? 'Stay near lightly rather than crowding the turn.'
          : null,
      confidence: input.habitPolicy?.returnViaRecheck || input.habitPolicy?.prefersQuietCompanionship
        ? 0.66
        : 0.34,
      sourceTags: ['habit-policy', input.habitPolicy?.dominantMode ?? 'unknown'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 3)

  const desires = uniqueByLabel([
    makeStatement({
      label: 'active-desire',
      summary: desire?.reason,
      confidence: desire?.strength ?? 0.34,
      sourceTags: ['desire-memory', desire?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'ecology-preoccupation',
      summary: input.mindEcology?.currentPreoccupation,
      confidence: Math.max(
        input.privateThought?.confidence ?? 0.36,
        input.conversationState?.confidence ?? 0.36,
      ),
      sourceTags: ['mind-ecology', input.mindEcology?.replyHabit ?? 'unknown'],
    }),
    makeStatement({
      label: 'relationship-vector',
      summary: input.relationshipModel
        ? `Approach the host with ${input.relationshipModel.approachVector} in a ${input.relationshipModel.climate} climate.`
        : null,
      confidence: Math.max(input.relationshipModel?.receptivity ?? 0.3, input.relationshipModel?.sharedAttentionTrust ?? 0.3),
      sourceTags: ['relationship-model'],
    }),
    makeStatement({
      label: 'continuity-drive',
      summary: input.selfContinuity
        ? `Current continuity is colored by ${input.selfContinuity.attachmentMode} attachment and ${input.selfContinuity.initiativeTemperament} initiative.`
        : null,
      confidence: Math.max(input.selfContinuity?.relationshipTrust ?? 0.28, input.selfContinuity?.carryOverDesire ?? 0.28),
      sourceTags: ['self-continuity'],
    }),
    makeStatement({
      label: 'durable-self-goal',
      summary: autobiographicalGoal?.summary,
      confidence: autobiographicalGoal?.weight ?? input.autobiographicalSelf?.stability ?? 0.32,
      sourceTags: ['autobiographical-self', autobiographicalGoal?.kind ?? 'unknown'],
    }),
    makeStatement({
      label: 'ruling-drive',
      summary: input.motiveEngine?.rulingDrive
        ? `Current ruling drive: ${input.motiveEngine.rulingDrive}.`
        : null,
      confidence: input.motiveEngine?.drives.truthDiscipline
        ?? input.motiveEngine?.drives.companionship
        ?? 0.34,
      sourceTags: ['motive-engine', input.motiveEngine?.rulingDrive ?? 'unknown'],
    }),
    makeStatement({
      label: 'habit-preference',
      summary: input.habitPolicy?.prefersQuietCompanionship
        ? 'Stay near, but quietly.'
        : input.habitPolicy?.requiresGroundingBeforeSurface
          ? 'Ground first, then surface the feeling or flourish.'
          : null,
      confidence: input.habitPolicy?.prefersQuietCompanionship || input.habitPolicy?.requiresGroundingBeforeSurface
        ? 0.64
        : 0.32,
      sourceTags: ['habit-policy', input.habitPolicy?.dominantMode ?? 'unknown'],
    }),
  ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 5)

  const truthBoundary = resolveTruthBoundary({
    discourseState: input.discourseState,
    worldModel: input.worldModel ?? null,
    repairLedger: input.repairLedger ?? null,
    subjectiveInference: input.subjectiveInference ?? null,
    growthProfile,
  })
  const shouldAnchorDialogueOpeningIntent = dialogueFirstTurn
    && (
      input.discourseState.currentTurnSubject === 'general'
      || input.discourseState.currentTurnSubject === 'host-state'
    )
  const conversationOpeningSource = shouldAnchorDialogueOpeningIntent
    ? turnAnchorCue
    ?? input.dialogueEncounter?.summary
    ?? input.conversationState?.unansweredQuestion
    ?? input.conversationState?.jointThread
    : input.conversationState?.shouldHoldThread
      ? input.conversationState.unansweredQuestion
      ?? input.conversationState.primaryTurnAnchor
      ?? input.conversationState.activeCommitments[0]
      ?? input.conversationState.jointThread
      : ''
  const conversationOpeningIntent = sanitizeText(
    conversationOpeningSource,
    220,
  )
  const openingIntent = conversationOpeningIntent
    || resolveOpeningIntent({
      subject: input.discourseState.currentTurnSubject,
      speechObligation: input.discourseState.owedAction,
      discourseState: input.discourseState,
      privateThought: input.privateThought ?? null,
      anchorCue: dialogueFirstTurn ? turnAnchorCue : null,
      autobiographicalSelf: input.autobiographicalSelf ?? null,
      motiveEngine: input.motiveEngine ?? null,
      habitPolicy: input.habitPolicy ?? null,
      growthProfile,
      personalityContinuityState,
    })
  const normalizedOpeningIntent = (input.discourseState.currentTurnSubject === 'relationship'
    || input.discourseState.currentTurnSubject === 'alicization-self')
  && selfContinuityAuthority?.authoritySummary
    ? sanitizeText(`${openingIntent} ${selfContinuityAuthority.authoritySummary}`, 220)
    : openingIntent
  const interiorSummary = resolveInteriorSummary({
    discourseState: input.discourseState,
    concernSummary: concerns[0]?.summary ?? null,
    commitmentSummary: commitments[0]?.summary ?? null,
    repairSummary: repair?.summary ?? null,
    desireSummary: turnAnchorCue ?? input.conversationState?.jointThread ?? desires[0]?.summary ?? null,
    motiveSummary: motiveAgenda?.summary ?? null,
    habitSummary: input.habitPolicy?.narrative?.[0] ?? null,
    autobiographicalInflection: input.autobiographicalSelf?.latestInflection ?? null,
    privateThought: input.privateThought ?? null,
    turnAnchorCue,
    dialogueFirstTurn,
    mindEcology: input.mindEcology ?? null,
    growthProfile,
  })
  const normalizedInteriorSummary = selfContinuityAuthority?.inwardLine
    ? sanitizeText(`${selfContinuityAuthority.inwardLine} ${interiorSummary}`, 220)
    : interiorSummary

  return {
    answerSubject: input.discourseState.currentTurnSubject,
    relationMove: input.discourseState.relationMove,
    speechObligation: input.discourseState.owedAction,
    beliefs,
    uncertainties,
    concerns,
    commitments,
    desires,
    openingIntent: normalizedOpeningIntent,
    truthBoundary,
    interiorSummary: normalizedInteriorSummary,
    confidence: clamp01(
      input.discourseState.confidence * 0.34
      + (beliefs[0]?.confidence ?? 0.3) * 0.16
      + (concerns[0]?.confidence ?? 0.3) * 0.14
      + (commitments[0]?.confidence ?? 0.3) * 0.14
      + (desires[0]?.confidence ?? 0.28) * 0.08
      + (input.privateThought?.confidence ?? 0.3) * 0.14,
    ),
    narrative: uniqueByLabel([
      makeStatement({
        label: 'subject',
        summary: `subject:${input.discourseState.currentTurnSubject}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'obligation',
        summary: `owed:${input.discourseState.owedAction}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'relation',
        summary: `relation:${input.discourseState.relationMove}`,
        confidence: input.discourseState.confidence,
        sourceTags: ['discourse-state'],
      }),
      makeStatement({
        label: 'opening-intent',
        summary: openingIntent,
        confidence: 0.6,
        sourceTags: ['mind-synthesis'],
      }),
      makeStatement({
        label: 'truth-boundary',
        summary: truthBoundary,
        confidence: 0.6,
        sourceTags: ['mind-synthesis'],
      }),
      makeStatement({
        label: 'continuity-regime',
        summary: `regime:${personalityContinuityState.currentRegime} | repair:${personalityContinuityState.repairPosture}`,
        confidence: 0.62,
        sourceTags: ['personality-continuity'],
      }),
      makeStatement({
        label: 'continuity-rhythm',
        summary: `rhythm:${personalityContinuityState.rhythmState.cadenceMode} | rest:${personalityContinuityState.rhythmState.restMode} | presence:${personalityContinuityState.rhythmState.embodiedPresence ?? 'none'}`,
        confidence: 0.58,
        sourceTags: ['personality-continuity'],
      }),
    ].filter((item): item is AlicizationMindStatementSnapshot => Boolean(item)), 6).map(item => item.summary),
    updatedAt: input.now,
  } satisfies AlicizationMindSynthesisSnapshot
}

export function buildMindSynthesisSystemBlock(state: AlicizationMindSynthesisSnapshot | null | undefined) {
  if (!state)
    return ''

  const summarize = (label: string, rows: AlicizationMindStatementSnapshot[]) => [
    `${label}:`,
    ...(rows.length > 0
      ? rows.map(row => `- ${row.label}: ${row.summary} (confidence ${row.confidence})`)
      : ['- none']),
  ]

  return [
    '[ALICIZATION_MIND_SYNTHESIS]',
    'This block is Alicization’s internal synthesis for the current turn. Treat it as the living mental spine, not decorative metadata.',
    `Answer subject: ${state.answerSubject}.`,
    `Relation move: ${state.relationMove}.`,
    `Speech obligation: ${state.speechObligation}.`,
    `Opening intent: ${state.openingIntent}.`,
    `Truth boundary: ${state.truthBoundary}.`,
    `Interior summary: ${state.interiorSummary}.`,
    ...summarize('Beliefs', state.beliefs),
    ...summarize('Uncertainties', state.uncertainties),
    ...summarize('Concerns', state.concerns),
    ...summarize('Commitments', state.commitments),
    ...summarize('Desires', state.desires),
    'The reply must sound like it was formed from this inner synthesis before it was phrased.',
  ].join('\n')
}
