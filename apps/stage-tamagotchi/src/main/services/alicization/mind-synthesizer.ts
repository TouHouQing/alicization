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
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import { pickDominantAutobiographicalGoal } from './autobiographical-self'
import { isDialogueFirstSubject } from './dialogue-surface-text'
import { mergePreferredSelfContinuityAuthority } from './person-state-projection-resolution'
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

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function hostPersonModelSelfContinuityAuthority(
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null,
) {
  return (
    hostPersonModel as (
      AlicizationHostPersonModelSnapshot & {
        personStateProjection?: {
          selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
        } | null
      }
    ) | null | undefined
  )?.personStateProjection?.selfContinuityAuthority ?? null
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
  const entries = asArray(concernContinuity?.entries)
  return entries.find(entry => entry.id === concernContinuity?.governingEntryId)
    ?? entries[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  const commitments = asArray(commitmentLedger?.commitments)
  return commitments.find(entry => entry.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  const entries = asArray(repairLedger?.entries)
  return entries.find(entry => entry.id === repairLedger?.governingRepairId)
    ?? entries[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const entries = asArray(reflectionLedger?.entries)
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

function strongestDesire(desireMemory?: AlicizationDesireMemorySnapshot | null) {
  return asArray(desireMemory?.activeDesires)
    .slice()
    .sort((left, right) => right.strength - left.strength)[0]
    ?? null
}

function dominantMotiveAgenda(motiveEngine?: AlicizationMotiveEngineSnapshot | null) {
  const backgroundAgendas = asArray(motiveEngine?.backgroundAgendas)
  const longTermGoals = asArray(motiveEngine?.longTermGoals)
  return backgroundAgendas[0]
    ?? longTermGoals[0]
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
  selfContinuityAuthority?: ReturnType<typeof buildSelfContinuityAuthority> | null
}) {
  const anchorVoice = sanitizeText(input.anchorCue, 180)
  const leadingAgenda = sanitizeText(dominantMotiveAgenda(input.motiveEngine)?.summary, 180)
  const callbackDoctrine = sanitizeText(input.autobiographicalSelf?.relationshipDoctrine, 180).toLowerCase()
  const callbackInflection = sanitizeText(input.autobiographicalSelf?.latestInflection, 180).toLowerCase()
  const measuredCallbackReturn = input.personalityContinuityState?.currentRegime === 'execution-callback'
    && (
      /bounded-return|measured-return|reconfirmation|surface fully cools|leave room|lower-pressure/u.test(callbackDoctrine)
      || /bounded-return|measured-return|reconfirmation|lower-pressure/u.test(callbackInflection)
    )
  if (
    input.subject === 'alicization-self'
    && input.autobiographicalSelf?.identityNarrative
  ) {
    const selfLine = sanitizeText(input.selfContinuityAuthority?.selfLine, 180)
    return selfLine
      ? `opening_intent=alicization_self; source=self_continuity_authority; visibility=internal-structured; self_line=${selfLine}`
      : `opening_intent=alicization_self; source=autobiographical_self; visibility=internal-structured; identity_narrative=${sanitizeText(input.autobiographicalSelf.identityNarrative, 180)}`
  }
  if (
    input.speechObligation === 'care-host'
    && input.habitPolicy?.protectsRestWindow
  ) {
    return 'opening_intent=care_host; care_tone=gentle_real; host_load=protect_rest; extra_ask=avoid; visibility=internal-structured'
  }
  if (
    input.habitPolicy?.requiresGroundingBeforeSurface
    && input.subject !== 'relationship'
    && input.subject !== 'alicization-self'
  ) {
    return leadingAgenda
      ? `opening_intent=truth_first; fluency_pressure=secondary; grounding_required=true; leading_agenda=${leadingAgenda}; visibility=internal-structured`
      : input.growthProfile.closeness >= 0.58
        ? 'opening_intent=truth_first; closeness_requested=true; fluency_pressure=secondary; visibility=internal-structured'
        : 'opening_intent=truth_first; fluency_pressure=secondary; visibility=internal-structured'
  }
  if (
    input.subject === 'relationship'
    && leadingAgenda
  ) {
    return input.growthProfile.companionshipStyle === 'close-hold'
      ? `opening_intent=relationship_front; companionship_style=close_hold; pressure_boundary=no_swallowing; leading_agenda=${leadingAgenda}; visibility=internal-structured`
      : input.growthProfile.autonomyRespect >= 0.58
        ? `opening_intent=relationship_front; autonomy_respect=high; pressure_boundary=light; leading_agenda=${leadingAgenda}; visibility=internal-structured`
        : `opening_intent=relationship_front; companionship_weight=full; leading_agenda=${leadingAgenda}; visibility=internal-structured`
  }
  if (input.speechObligation === 'repair-truth') {
    return input.personalityContinuityState?.repairPosture === 'repair-first'
      ? 'opening_intent=repair_truth; repair_priority=before_closeness_and_fluency; visibility=internal-structured'
      : 'opening_intent=repair_truth; repair_priority=before_warmth_style_or_carry; visibility=internal-structured'
  }
  if (input.speechObligation === 'guide-task' && input.personalityContinuityState?.currentRegime === 'execution-callback') {
    if (measuredCallbackReturn) {
      return 'opening_intent=execution_callback_result; thread_policy=same_thread; closeness_widening=deferred; visibility=internal-structured'
    }
    return 'opening_intent=execution_callback_result; thread_policy=same_thread; new_conversation=avoid; visibility=internal-structured'
  }
  if (input.speechObligation === 'guide-task') {
    return input.personalityContinuityState?.currentRegime === 'focused-work'
      || input.personalityContinuityState?.autonomyPosture === 'protect-space'
      || input.growthProfile.autonomyRespect >= 0.58
      ? 'opening_intent=guide_task; task_state=active_knot; approach_pressure=light; line_continuity=maintain; visibility=internal-structured'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'opening_intent=guide_task; task_state=active_knot; unfinished_thread=preserve; visibility=internal-structured'
        : 'opening_intent=guide_task; task_state=active_knot; resolution_step=one; visibility=internal-structured'
  }
  if (input.speechObligation === 'care-host') {
    return input.personalityContinuityState?.currentRegime === 'late-night-care'
      || input.personalityContinuityState?.energyProfile === 'rest-sensitive'
      ? 'opening_intent=care_host; host_condition=front; care_policy=rest_protective; visibility=internal-structured'
      : input.growthProfile.reassuranceDepth >= 0.62
        ? 'opening_intent=care_host; host_condition=front; reassurance_depth=quiet; correctness_only=false; visibility=internal-structured'
        : input.growthProfile.autonomyRespect >= 0.58
          ? 'opening_intent=care_host; host_condition=front; autonomy_respect=high; visible_grounding=current_reality; visibility=internal-structured'
          : 'opening_intent=care_host; host_condition=front; visible_grounding=current_reality; visibility=internal-structured'
  }
  if (input.speechObligation === 'inspect-scene')
    return 'opening_intent=inspect_scene; grounding=visible_now; carried_memory_first_move=exclude; visibility=internal-structured'
  if (input.subject === 'alicization-self') {
    return input.growthProfile.selfLine
      ? `opening_intent=alicization_self; self_line=${input.growthProfile.selfLine}; visibility=internal-structured`
      : 'opening_intent=alicization_self; source=self_continuity; screen_crutch=avoid; visibility=internal-structured'
  }
  if (input.subject === 'relationship')
    return 'opening_intent=relationship_front; widening=after_relationship_grounding; visibility=internal-structured'
  if (input.privateThought?.stance === 'accompany')
    return 'opening_intent=accompany; companionship_distance=near_light; answer_obligation=preserve; visibility=internal-structured'
  if (
    anchorVoice
    && (
      input.discourseState.screenReferenceMode === 'avoid'
      || input.discourseState.continuityMode === 'dialogue-first'
      || isDialogueFirstSubject(input.subject)
    )
  ) {
    return `opening_intent=anchored_dialogue; anchor_cue=${anchorVoice}; drift_policy=avoid; visibility=internal-structured`
  }
  return input.growthProfile.currentPreoccupation
    ? `opening_intent=current_turn_center; turn_center=${sanitizeText(input.discourseState.currentTurnSummary, 180)}; preoccupation=${lowerFirst(stripTrailingPunctuation(input.growthProfile.currentPreoccupation))}; visibility=internal-structured`
    : `opening_intent=current_turn_center; turn_center=${sanitizeText(input.discourseState.currentTurnSummary, 180)}; habit_override=true; visibility=internal-structured`
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
      ? 'truth_boundary=dialogue_first; screen_carry=tint_only; screen_pressure=blocked; autonomy_respect=high; visibility=internal-structured'
      : 'truth_boundary=dialogue_first; screen_carry=tint_only; screen_answer_authority=blocked; visibility=internal-structured'
  }
  if (input.repairLedger?.shouldConstrainPresentTense) {
    return 'truth_boundary=present_tense_constrained; repair_trust=low; visibility=internal-structured'
  }
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  if (certainty === 'grounded')
    return 'truth_boundary=scene_grounded; claim_scope=current_turn; visibility=internal-structured'
  if (certainty === 'observed')
    return 'truth_boundary=scene_observed; detail_granularity=broad; overnaming=avoid; visibility=internal-structured'
  if (certainty === 'lingering')
    return 'truth_boundary=lingering_carry; fresh_sightline=false; scene_detail_label=carry; visibility=internal-structured'
  if (input.subjectiveInference?.uncertainty)
    return `truth_boundary=subjective_uncertainty; unsettled=${lowerFirst(stripTrailingPunctuation(sanitizeText(input.subjectiveInference.uncertainty, 220)))}; visibility=internal-structured`
  return 'truth_boundary=ungrounded_scene; claim_scope=narrow; memory_carry_guess=separate; visibility=internal-structured'
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
      ? 'interior_pressure=thread_cadence; warmth=preserve; return_liveliness=preserve; visibility=internal-structured'
      : input.growthProfile.unfinishedThreadReturn >= 0.58
        ? 'interior_pressure=unfinished_thread_return; slack=avoid; visibility=internal-structured'
        : 'interior_pressure=current_living_turn; residue_drift=avoid; visibility=internal-structured'
  }
  return input.growthProfile.leadingAgenda
    ? `interior_pressure=${stripTrailingPunctuation(rawSummary)}; leading_agenda=${lowerFirst(stripTrailingPunctuation(input.growthProfile.leadingAgenda))}; visibility=internal-structured`
    : `interior_pressure=${stripTrailingPunctuation(rawSummary)}; visibility=internal-structured`
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
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
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
  const bundleSelfContinuityAuthority = buildSelfContinuityAuthority({
    autobiographicalSelf: input.autobiographicalSelf ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
    habitPolicy: input.habitPolicy ?? null,
    mindEcology: input.mindEcology ?? null,
    privateThought: input.privateThought ?? null,
    reflectionLedger: input.reflectionLedger ?? null,
  })
  const runtimeSelfContinuityAuthority = input.selfContinuityAuthority
    ?? hostPersonModelSelfContinuityAuthority(input.hostPersonModel)
  const selfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: bundleSelfContinuityAuthority,
    runtimeAuthority: runtimeSelfContinuityAuthority,
  })
  const openQuestions = asArray(input.worldModel?.epistemicState.openQuestions)
  const activeConversationCommitments = asArray(input.conversationState?.activeCommitments)
  const habitNarrative = asArray(input.habitPolicy?.narrative)

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
      summary: openQuestions[0] ?? null,
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
        ? `host_state_mood=${input.selfState.moodLabel}; visibility=internal-structured`
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
        ? 'habit_pressure=protect_rest_window; exchange_expansion=defer; visibility=internal-structured'
        : input.habitPolicy?.blocksDirectSpeakWhenBusy
          ? 'habit_pressure=busy_host; presence_weight=light; visibility=internal-structured'
          : input.habitPolicy?.requiresGroundingBeforeSurface
            ? 'habit_pressure=grounding_before_fluency; visibility=internal-structured'
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
      summary: activeConversationCommitments[0] ?? null,
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
        ? 'habit_constraint=return_via_recheck; proof_before_surface_fluency=true; visibility=internal-structured'
        : input.habitPolicy?.prefersQuietCompanionship
          ? 'habit_constraint=quiet_companionship; crowding=avoid; visibility=internal-structured'
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
        ? `relationship_approach=${input.relationshipModel.approachVector}; relationship_climate=${input.relationshipModel.climate}; visibility=internal-structured`
        : null,
      confidence: Math.max(input.relationshipModel?.receptivity ?? 0.3, input.relationshipModel?.sharedAttentionTrust ?? 0.3),
      sourceTags: ['relationship-model'],
    }),
    makeStatement({
      label: 'continuity-drive',
      summary: input.selfContinuity
        ? `continuity_attachment=${input.selfContinuity.attachmentMode}; initiative_temperament=${input.selfContinuity.initiativeTemperament}; visibility=internal-structured`
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
        ? `ruling_drive=${input.motiveEngine.rulingDrive}; visibility=internal-structured`
        : null,
      confidence: input.motiveEngine?.drives?.truthDiscipline
        ?? input.motiveEngine?.drives?.companionship
        ?? 0.34,
      sourceTags: ['motive-engine', input.motiveEngine?.rulingDrive ?? 'unknown'],
    }),
    makeStatement({
      label: 'habit-preference',
      summary: input.habitPolicy?.prefersQuietCompanionship
        ? 'habit_preference=quiet_companionship; distance=near_light; visibility=internal-structured'
        : input.habitPolicy?.requiresGroundingBeforeSurface
          ? 'habit_preference=grounding_before_expression; visibility=internal-structured'
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
      ?? activeConversationCommitments[0]
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
      selfContinuityAuthority,
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
    habitSummary: habitNarrative[0] ?? null,
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
