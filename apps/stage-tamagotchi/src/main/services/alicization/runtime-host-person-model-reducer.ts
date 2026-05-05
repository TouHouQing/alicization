import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildMindEcologyFromRuntimeSurface } from './mind-ecology'
import { buildAlicizationPersonStateProjection } from './person-state-projection'
import { mergeGuidanceLine, mergeUniqueRules, sanitizeGuidanceText } from './runtime-turn-composition'

function mapAnswerActToReplyMotive(answerAct: AlicizationMindTurnGovernance['answerAct']) {
  switch (answerAct) {
    case 'guide':
      return 'guide' as const
    case 'care':
      return 'care' as const
    case 'defer':
      return 'defer' as const
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair' as const
    default:
      return 'answer' as const
  }
}

function inferHostSocialContexts(input: {
  surface: AlicizationDigitalLifeRuntimeSurface
  governance: AlicizationMindTurnGovernance
}) {
  const contexts = ['general']
  const scene = input.surface.perception.currentScene
  const tension = input.surface.cognition.privateThought?.emotionalTension ?? null
  if (
    scene?.workloadKind === 'coding'
    || scene?.contentKind === 'diff'
    || input.governance.answerSubject === 'task-knot'
    || input.governance.answerAct === 'guide'
  ) {
    contexts.push('focused-work', 'execution')
  }
  if (tension === 'late-night-drain')
    contexts.push('late-night')
  if (
    input.governance.answerSubject === 'relationship'
    || input.governance.answerSubject === 'alicization-self'
    || input.governance.answerAct === 'care'
  ) {
    contexts.push('open-window')
  }
  return [...new Set(contexts)]
}

export function applyHostPersonModelToGovernance(input: {
  now: number
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const hostPersonModel = input.context.hostPersonModel ?? null
  if (!governance || !hostPersonModel)
    return governance

  const contexts = ['general']
  const anchorText = `${governance.liveSurface ?? ''} ${governance.focusAnchor ?? ''} ${governance.answerIntent ?? ''}`
  if (governance.answerSubject === 'task-knot' || governance.answerAct === 'guide')
    contexts.push('focused-work', 'execution')
  if (/runtime|diff|code|patch|cursor|terminal|cli|debug|fix|verify|test/iu.test(anchorText))
    contexts.push('focused-work', 'execution')
  if (governance.emotionalTension === 'late-night-drain' || governance.answerAct === 'care')
    contexts.push('late-night')
  if (governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self')
    contexts.push('open-window')

  const projection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: [...new Set(contexts)],
    hostPersonModel,
    habitPolicy: null,
    selfContinuity: null,
    selfState: null,
    privateThought: null,
    mindEcology: null,
  })

  return {
    ...governance,
    relationshipPosture: projection.relationshipPosture ?? governance.relationshipPosture,
    mustDo: mergeUniqueRules([
      projection.preferenceText ? `Host preference for this context: ${projection.preferenceText}` : null,
      projection.repairTriggerText ? `Repair trigger to respect: ${projection.repairTriggerText}` : null,
      projection.burdenText ? `Burden cue to respect: ${projection.burdenText}` : null,
      ...(governance.mustDo ?? []),
    ]),
    mustNotDo: mergeUniqueRules([
      projection.sensitivityText ? `Do not trigger host sensitivity: ${projection.sensitivityText}` : null,
      ...(governance.mustNotDo ?? []),
    ]),
    answerIntent: mergeGuidanceLine([
      governance.answerIntent ?? null,
      projection.trustRationale ? `Trust context: ${projection.trustRationale}` : null,
    ], 220) ?? governance.answerIntent ?? null,
  }
}

export function applyHostPersonModelToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const hostPersonModel = input.context.hostPersonModel ?? null
  const relationshipDoctrine = sanitizeGuidanceText(surface?.memory.autobiographicalSelf?.relationshipDoctrine ?? '', 180)
  if (!surface || !governance || (!hostPersonModel && !relationshipDoctrine))
    return surface

  const projection = buildAlicizationPersonStateProjection({
    now: input.now,
    contexts: inferHostSocialContexts({ surface, governance }),
    autobiographicalSelf: surface.memory.autobiographicalSelf ?? null,
    hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
    longHorizonMemory: surface.memory.longHorizonMemory ?? null,
    motiveEngine: surface.memory.motiveEngine ?? null,
    habitPolicy: surface.agency.habitPolicy ?? null,
    selfContinuity: surface.memory.selfContinuity ?? null,
    selfState: surface.agency.selfState ?? null,
    privateThought: surface.cognition.privateThought ?? null,
    mindEcology: buildMindEcologyFromRuntimeSurface(surface),
    previousContinuityState: surface.memory.personalityContinuityState ?? null,
  })
  const contexts = projection.contexts
  const selectedMotive = (() => {
    if (projection.repairTriggerText && projection.relationshipPosture === 'restrained')
      return 'attune' as const
    if (governance.answerSubject === 'relationship' && (projection.repairTriggerText || projection.sensitivityText))
      return 'attune' as const
    if (contexts.includes('late-night') && (projection.burdenText || projection.personalityContinuityState.currentRegime === 'late-night-care'))
      return 'care' as const
    return surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct)
  })()
  const socialWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    projection.preferenceText ? `Host preference in this context: ${projection.preferenceText}` : null,
    `Closeness ladder in play: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
    projection.sensitivityText ? `Host sensitivity in play: ${projection.sensitivityText}` : null,
    projection.repairTriggerText ? `Repair trigger in play: ${projection.repairTriggerText}` : null,
    projection.relationshipDoctrine ? `Relationship doctrine in play: ${projection.relationshipDoctrine}` : null,
    projection.trustRationale ? `Trust line: ${projection.trustRationale}` : null,
    projection.summary ? `Person-state: ${projection.summary}` : null,
  ], 240)
  const socialAnswerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    projection.relationshipDoctrine ? `Relationship doctrine: ${projection.relationshipDoctrine}` : null,
    projection.routineText ? `Routine cue: ${projection.routineText}` : null,
    projection.preferenceText ? `Preferred closeness here: ${projection.preferenceText}` : null,
  ], 220)

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
      personalityContinuityState: projection.personalityContinuityState,
      personStateProjection: projection,
    },
    dialogue: {
      ...surface.dialogue,
      replyDeliberation: {
        selectedMotive,
        speakingFrom: surface.dialogue.replyDeliberation?.speakingFrom ?? (governance.answerSubject === 'relationship' ? 'dialogue-bond' : 'task-thread'),
        memoryMode: surface.dialogue.replyDeliberation?.memoryMode ?? (governance.answerSubject === 'relationship' ? 'dialogue-carry' : 'task-thread'),
        openingBeat: mergeGuidanceLine([
          surface.dialogue.replyDeliberation?.openingBeat ?? null,
          projection.openingGuidance,
        ], 220) || surface.dialogue.replyDeliberation?.openingBeat || governance.openingMove || socialWhyNow || '',
        whyThisReplyNow: socialWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || '',
        whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
        withheldImpulses: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
          projection.sensitivityText ? `Do not trigger host sensitivity: ${projection.sensitivityText}` : null,
        ], 8),
        candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
        shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
        mustInclude: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
          `Respect closeness ladder: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
          projection.preferenceText ? `Respect host closeness preference: ${projection.preferenceText}` : null,
          projection.repairTriggerText ? `Respect repair trigger: ${projection.repairTriggerText}` : null,
          projection.relationshipPosture === 'restrained' ? 'Let repair land before closeness.' : null,
          projection.relationshipDoctrine ? `Keep this doctrine alive: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustAvoid: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
          projection.sensitivityText ? `Avoid this sensitivity: ${projection.sensitivityText}` : null,
          projection.burdenText ? `Avoid adding burden here: ${projection.burdenText}` : null,
          projection.restrained ? 'Do not let presence become pressure.' : null,
        ], 10),
        confidence: surface.dialogue.replyDeliberation?.confidence ?? 0.72,
        narrative: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.narrative ?? []),
          'person-state-projection',
          ...contexts.map(context => `host-context:${context}`),
        ], 12),
        updatedAt: input.now,
      },
      answerPlanner: {
        act: surface.dialogue.answerPlanner?.act ?? governance.answerAct ?? 'answer',
        evidenceMode: surface.dialogue.answerPlanner?.evidenceMode ?? governance.evidenceMode ?? 'dialogue-grounded',
        confidence: surface.dialogue.answerPlanner?.confidence ?? 0.72,
        governingFocus: mergeGuidanceLine([
          surface.dialogue.answerPlanner?.governingFocus ?? null,
          projection.preferenceText ? `Host preference: ${projection.preferenceText}` : null,
          projection.relationshipDoctrine ? `Doctrine: ${projection.relationshipDoctrine}` : null,
        ], 220) || surface.dialogue.answerPlanner?.governingFocus || socialWhyNow || '',
        openingMove: mergeGuidanceLine([
          surface.dialogue.answerPlanner?.openingMove ?? null,
          projection.openingGuidance,
        ], 220) || surface.dialogue.answerPlanner?.openingMove || governance.openingMove || '',
        answerIntent: socialAnswerIntent || surface.dialogue.answerPlanner?.answerIntent || governance.answerIntent || '',
        relationshipPosture: projection.relationshipPosture ?? surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
        shouldAskForGrounding: surface.dialogue.answerPlanner?.shouldAskForGrounding ?? governance.shouldAskForGrounding,
        shouldAcknowledgeRepair: surface.dialogue.answerPlanner?.shouldAcknowledgeRepair ?? governance.shouldAcknowledgeRepair,
        selectedConcernEntryId: surface.dialogue.answerPlanner?.selectedConcernEntryId ?? null,
        selectedRepairId: surface.dialogue.answerPlanner?.selectedRepairId ?? null,
        selectedCommitmentId: surface.dialogue.answerPlanner?.selectedCommitmentId ?? null,
        selectedInquiryPlanId: surface.dialogue.answerPlanner?.selectedInquiryPlanId ?? null,
        selectedRuntimeThreadId: surface.dialogue.answerPlanner?.selectedRuntimeThreadId ?? null,
        selectedProjectId: surface.dialogue.answerPlanner?.selectedProjectId ?? null,
        selectedReflectionId: surface.dialogue.answerPlanner?.selectedReflectionId ?? null,
        executivePhase: surface.dialogue.answerPlanner?.executivePhase ?? null,
        selectedTruthFrame: surface.dialogue.answerPlanner?.selectedTruthFrame ?? null,
        mustDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustDo ?? []),
          `Plan to the closeness ladder: ${projection.activeClosenessContext}/${projection.activeClosenessRung}.`,
          projection.preferenceText ? `Respect host preference here: ${projection.preferenceText}` : null,
          projection.routineText ? `Remember host routine: ${projection.routineText}` : null,
          projection.relationshipPosture === 'restrained' ? 'Plan the answer so repair lands before closeness.' : null,
          projection.relationshipDoctrine ? `Keep doctrine visible in the answer plan: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustNotDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
          projection.sensitivityText ? `Do not ignore host sensitivity: ${projection.sensitivityText}` : null,
          projection.restrained ? 'Do not let closeness outrun room or turn into pressure.' : null,
        ], 10),
        narrative: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.narrative ?? []),
          'person-state-projection',
          ...contexts.map(context => `host-context:${context}`),
        ], 12),
        updatedAt: input.now,
      },
    },
  }
}
