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
  const anchorText = `${input.governance.liveSurface ?? ''} ${input.governance.focusAnchor ?? ''} ${input.governance.answerIntent ?? ''}`
  if (
    scene?.workloadKind === 'coding'
    || scene?.contentKind === 'diff'
    || input.governance.answerSubject === 'task-knot'
    || input.governance.answerAct === 'guide'
    || /runtime|diff|code|patch|cursor|terminal|cli|debug|fix|verify|test/iu.test(anchorText)
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

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function deriveSelfEvolutionOpeningBias(selfEvolution?: OrganicMemoryPromptContext['selfEvolution'] | null) {
  if (!selfEvolution)
    return null

  const relationshipDoctrine = sanitizeGuidanceText(selfEvolution.relationshipDoctrine ?? '', 180).toLowerCase()
  const burdenLine = sanitizeGuidanceText(selfEvolution.burdenLine ?? '', 180).toLowerCase()
  const trustMeaning = sanitizeGuidanceText(selfEvolution.trustMeaning ?? '', 180).toLowerCase()
  const latestInflection = sanitizeGuidanceText(selfEvolution.latestInflection ?? '', 180).toLowerCase()

  const lowerPressure = includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager'])

  if (!lowerPressure)
    return null

  return {
    openingGuidance: 'Keep the opening lower-pressure and leave room before widening closeness.',
    mustInclude: 'Keep long-horizon relationship timing visible: lower pressure before closeness widens.',
    mustAvoid: 'Do not let eager warmth or older closeness tempo reopen faster than this learned relationship timing supports.',
    narrativeTag: 'self-evolution:lower-pressure-opening',
    sourceTrace: 'self-evolution:lower-pressure-opening',
  }
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
  const contextProjection = input.context.personStateProjection ?? null
  const selfEvolution = input.context.selfEvolution ?? null
  const selfEvolutionOpeningBias = deriveSelfEvolutionOpeningBias(selfEvolution)
  const relationshipDoctrine = sanitizeGuidanceText(
    contextProjection?.relationshipDoctrine
    ?? surface?.memory.autobiographicalSelf?.relationshipDoctrine
    ?? '',
    180,
  )
  if (!surface || !governance || (!hostPersonModel && !relationshipDoctrine && !contextProjection && !selfEvolution))
    return surface

  const projection = hostPersonModel
    ? buildAlicizationPersonStateProjection({
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
    : contextProjection
      ?? surface.memory.personStateProjection
      ?? buildAlicizationPersonStateProjection({
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
    selfEvolution?.relationshipDoctrine ? `Long-horizon doctrine: ${selfEvolution.relationshipDoctrine}` : null,
    projection.routineText ? `Routine cue: ${projection.routineText}` : null,
    projection.preferenceText ? `Preferred closeness here: ${projection.preferenceText}` : null,
  ], 220)
  const socialOpeningMove = mergeGuidanceLine([
    surface.dialogue.dialogueActKernel?.openingMove ?? null,
    surface.dialogue.answerPlanner?.openingMove ?? null,
    surface.dialogue.replyDeliberation?.openingBeat ?? null,
    projection.openingGuidance,
    selfEvolutionOpeningBias?.openingGuidance ?? null,
  ], 220) || surface.dialogue.dialogueActKernel?.openingMove || surface.dialogue.answerPlanner?.openingMove || surface.dialogue.replyDeliberation?.openingBeat || governance.openingMove || socialWhyNow || ''

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: hostPersonModel ?? surface.memory.hostPersonModel ?? null,
      selfEvolution: selfEvolution ?? surface.memory.selfEvolution ?? null,
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
          projection.openingGuidance ? `Keep opening guidance active: ${projection.openingGuidance}` : null,
          selfEvolutionOpeningBias?.mustInclude ?? null,
          projection.relationshipPosture === 'restrained' ? 'Let repair land before closeness.' : null,
          projection.relationshipDoctrine ? `Keep this doctrine alive: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustAvoid: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
          projection.sensitivityText ? `Avoid this sensitivity: ${projection.sensitivityText}` : null,
          projection.burdenText ? `Avoid adding burden here: ${projection.burdenText}` : null,
          selfEvolutionOpeningBias?.mustAvoid ?? null,
          projection.restrained ? 'Do not let presence become pressure.' : null,
        ], 10),
        confidence: surface.dialogue.replyDeliberation?.confidence ?? 0.72,
        narrative: mergeUniqueRules([
          ...(surface.dialogue.replyDeliberation?.narrative ?? []),
          'person-state-projection',
          selfEvolutionOpeningBias?.narrativeTag ?? null,
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
          projection.openingGuidance ? `Open with this guidance: ${projection.openingGuidance}` : null,
          selfEvolutionOpeningBias?.mustInclude ?? null,
          projection.relationshipPosture === 'restrained' ? 'Plan the answer so repair lands before closeness.' : null,
          projection.relationshipDoctrine ? `Keep doctrine visible in the answer plan: ${projection.relationshipDoctrine}` : null,
        ], 10),
        mustNotDo: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
          projection.sensitivityText ? `Do not ignore host sensitivity: ${projection.sensitivityText}` : null,
          selfEvolutionOpeningBias?.mustAvoid ?? null,
          projection.restrained ? 'Do not let closeness outrun room or turn into pressure.' : null,
        ], 10),
        narrative: mergeUniqueRules([
          ...(surface.dialogue.answerPlanner?.narrative ?? []),
          'person-state-projection',
          selfEvolutionOpeningBias?.narrativeTag ?? null,
          ...contexts.map(context => `host-context:${context}`),
        ], 12),
        updatedAt: input.now,
      },
      dialogueActKernel: {
        subject: surface.dialogue.dialogueActKernel?.subject ?? governance.answerSubject ?? 'general',
        hostGoal: surface.dialogue.dialogueActKernel?.hostGoal ?? (
          governance.answerAct === 'care'
            ? 'rest'
            : governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self'
              ? 'chat'
              : 'resolve-problem'
        ),
        relationNeed: surface.dialogue.dialogueActKernel?.relationNeed ?? (
          governance.answerSubject === 'relationship'
            ? 'companionship'
            : governance.answerAct === 'care'
              ? 'care'
              : governance.answerAct === 'guide'
                ? 'guidance'
                : 'unclear'
        ),
        activeProject: surface.dialogue.dialogueActKernel?.activeProject ?? null,
        truthMode: surface.dialogue.dialogueActKernel?.truthMode ?? (
          governance.screenReferenceMode === 'avoid'
            ? 'memory-only'
            : governance.evidenceMode ?? 'dialogue-grounded'
        ),
        speechAct: surface.dialogue.dialogueActKernel?.speechAct ?? governance.answerAct ?? 'answer',
        turnMode: surface.dialogue.dialogueActKernel?.turnMode ?? governance.turnMode,
        screenReferenceMode: surface.dialogue.dialogueActKernel?.screenReferenceMode ?? governance.screenReferenceMode ?? 'avoid',
        speakingFrom: surface.dialogue.dialogueActKernel?.speakingFrom
          ?? surface.dialogue.replyDeliberation?.speakingFrom
          ?? (governance.answerSubject === 'relationship' ? 'dialogue-bond' : 'task-thread'),
        selectedEvidence: surface.dialogue.dialogueActKernel?.selectedEvidence ?? [],
        openingClaim: surface.dialogue.dialogueActKernel?.openingClaim
          ?? surface.dialogue.answerPlanner?.answerIntent
          ?? governance.answerIntent
          ?? socialWhyNow
          ?? '',
        openingMove: socialOpeningMove,
        whyNow: socialWhyNow || surface.dialogue.dialogueActKernel?.whyNow || '',
        mustSay: mergeUniqueRules([
          ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
          socialAnswerIntent,
          projection.openingGuidance ? `Keep opening guidance active: ${projection.openingGuidance}` : null,
          selfEvolutionOpeningBias?.mustInclude ?? null,
          projection.relationshipPosture === 'restrained' ? 'Let repair land before closeness.' : null,
        ], 8),
        mustAvoid: mergeUniqueRules([
          ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
          projection.sensitivityText ? `Avoid this sensitivity: ${projection.sensitivityText}` : null,
          selfEvolutionOpeningBias?.mustAvoid ?? null,
          projection.restrained ? 'Do not let closeness outrun room or turn into pressure.' : null,
        ], 8),
        sourceTrace: mergeUniqueRules([
          ...(surface.dialogue.dialogueActKernel?.sourceTrace ?? []),
          'person-state-projection',
          selfEvolutionOpeningBias?.sourceTrace ?? null,
          ...contexts.map(context => `host-context:${context}`),
        ], 10),
        confidence: surface.dialogue.dialogueActKernel?.confidence ?? 0.72,
        updatedAt: input.now,
      },
    },
  }
}
