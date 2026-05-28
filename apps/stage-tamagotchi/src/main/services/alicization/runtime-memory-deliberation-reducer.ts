import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  buildMemoryAnswerAnchorTag,
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import { buildAlicizationAffectiveResidueMemory } from './affective-residue-memory'
import {
  mergeGuidanceLine,
  mergeUniqueRules,
  sanitizeGuidanceText,
} from './runtime-turn-composition'
import { buildDerivedMindStateBundle } from '@proj-alicization/stage-shared'

export function applyMemoryDeliberationToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  if (!governance || (!speech && !deliberation))
    return governance

  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
    tuningAdvice: input.context.memoryTuningAdvice ?? null,
  })
  if (!deliberationKernel?.shouldRecall)
    return governance

  const surfacePolicy = deliberationKernel.surfacePolicy
  const shouldStayInward = deliberationKernel.shouldStayInward
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const speechControls = deliberationKernel.speechControls
  const speechLatentSummary = deliberationKernel.speechLatentSummary
  const rationale = deliberationKernel.rationale
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const memoryControl = deliberationKernel.memoryControl
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const inwardCarryRule = deliberationKernel.inwardCarryRule
  const inwardCarryBoundary = deliberationKernel.inwardCarryBoundary
  const baseMindTurnFrame = governance.mindTurnFrame ?? {
    world: {
      activeThread: governance.carriedThread ?? null,
      visibleSurface: governance.liveSurface ?? null,
      truthState: governance.truthState,
      truthBoundary: null,
      continuityPolicy: null,
      continuitySummary: governance.carriedThread ?? null,
      staleRisk: governance.repairState === 'none' ? 0 : 0.72,
    },
    relation: {
      subject: governance.answerSubject ?? 'general',
      hostMove: null,
      hostGoal: null,
      relationNeed: null,
      relationMove: null,
      relationshipPosture: governance.relationshipPosture ?? null,
    },
    memory: {
      memoryMode: null,
      carriedThread: governance.carriedThread ?? null,
      carriedFacts: [],
      recallKeys: [],
      recallSeed: null,
      lastOutcome: null,
      suppressAssociativeRecall: governance.suppressAssociativeRecall,
      labelCarryAsMemory: governance.labelCarryAsMemory,
    },
    self: {
      stance: null,
      mindMode: governance.mindMode ?? null,
      dominantDrive: null,
      embodiedPresence: governance.embodiedPresence ?? 'none',
      emotionalTension: governance.emotionalTension,
      initiativeAction: null,
      thought: null,
    },
    obligation: {
      shouldSpeak: true,
      speechObligation: null,
      answerAct: governance.answerAct ?? null,
      responseMode: null,
      turnMode: governance.turnMode,
      openingClaim: governance.liveSurface ?? null,
      openingMove: governance.openingMove ?? null,
      answerIntent: governance.answerIntent ?? null,
      whyNow: null,
      repairState: governance.repairState,
      shouldAskForGrounding: governance.shouldAskForGrounding,
      shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
    },
    focusAnchor: governance.focusAnchor ?? null,
    confidence: 0.72,
    mustDo: [...(governance.mustDo ?? [])],
    mustNotDo: [...(governance.mustNotDo ?? [])],
    narrative: [],
    updatedAt: Date.now(),
  }
  const inwardThought = mergeGuidanceLine([
    baseMindTurnFrame.self.thought ?? null,
    selectedChainSummary ? `The experience chain shaping the answer is ${selectedChainSummary}.` : null,
    selectedBundleSummary ? `The linked recollection bundle shaping the answer is ${selectedBundleSummary}.` : null,
    selectedPeriodSummary ? `The period currently shaping the answer is ${selectedPeriodSummary}.` : null,
    selectedEraSummary ? `The remembered era currently shaping the answer is ${selectedEraSummary}.` : null,
    selectedProcedureSummary ? `The remembered way of doing this is ${selectedProcedureSummary}.` : null,
    selectedRelationshipSummary ? `The remembered relationship line is ${selectedRelationshipSummary}.` : null,
    memoryControlSummary ? `Memory latent controls: ${memoryControlSummary}.` : null,
    !memoryControlSummary && speechLatentSummary ? `Recollection latent controls: ${speechLatentSummary}.` : null,
    speechControls
      ? `Let recollection stay ${speechControls.visibility} with ${speechControls.continuityRole} discipline and ${speechControls.certainty} certainty.`
      : null,
  ])
  const inwardWhyNow = mergeGuidanceLine([
    baseMindTurnFrame.obligation.whyNow ?? null,
    rationale
      ? `An active recollection is shaping the answer from the inside because ${rationale.charAt(0).toLowerCase()}${rationale.slice(1)}`
      : null,
    memoryControl ? `Memory latent controls: ${memoryControlSummary}.` : null,
    selectedChainStance ? `Current stance carried from remembered experience: ${selectedChainStance}.` : null,
  ])
  const inwardAnswerIntent = mergeGuidanceLine([
    baseMindTurnFrame.obligation.answerIntent ?? governance.answerIntent ?? null,
    memoryControl ? buildMemoryAnswerAnchorTag(memoryControl) : null,
    !memoryControl && speechLatentSummary ? `recollection_answer_anchor{${speechLatentSummary}}` : null,
    selectedChainPosture,
  ])
  const inwardOpeningMove = baseMindTurnFrame.obligation.openingMove
    ?? governance.openingMove
    ?? (shouldStayInward
      ? memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=payoff-first-inward-carry}'
      : memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=embedded-memory-carry}')

  return {
    ...governance,
    answerIntent: inwardAnswerIntent ?? governance.answerIntent ?? null,
    openingMove: governance.openingMove ?? inwardOpeningMove,
    mustDo: mergeUniqueRules([inwardCarryRule, ...(governance.mustDo ?? [])]),
    mustNotDo: mergeUniqueRules([
      inwardCarryBoundary,
      ...(memoryControl?.unsafeDetails ?? []).map(item => `Do not overstate this remembered detail: ${item}`),
      ...(governance.mustNotDo ?? []),
    ]),
    mindTurnFrame: {
      ...baseMindTurnFrame,
      self: {
        ...baseMindTurnFrame.self,
        thought: inwardThought ?? baseMindTurnFrame.self.thought ?? null,
      },
      obligation: {
        ...baseMindTurnFrame.obligation,
        openingMove: sanitizeGuidanceText(inwardOpeningMove, 220) || baseMindTurnFrame.obligation.openingMove || null,
        answerIntent: inwardAnswerIntent ?? baseMindTurnFrame.obligation.answerIntent ?? null,
        whyNow: inwardWhyNow ?? baseMindTurnFrame.obligation.whyNow ?? null,
      },
      narrative: mergeUniqueRules([
        ...(baseMindTurnFrame.narrative ?? []),
        'memory:inward-recollection',
        `memory-deliberation:surface:${surfacePolicy}`,
        speech?.certainty ? `recollection:certainty:${speech.certainty}` : null,
        speech?.surfaceMode ? `recollection:surface:${speech.surfaceMode}` : null,
      ], 12),
    },
  }
}

export function deriveMemoryDeliberationSurfaceMode(input: {
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
  answerSubject: AlicizationMindTurnGovernance['answerSubject']
}) {
  if (input.shouldStayInward)
    return 'held-memory' as const
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return input.answerSubject === 'relationship' ? 'dialogue-bond' as const : 'self-continuity' as const
  return 'held-memory' as const
}

export function deriveMemoryDeliberationMemoryMode(input: {
  existingMode: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
}) {
  if (input.existingMode)
    return input.existingMode
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return 'dialogue-carry' as const
  return input.shouldStayInward ? 'emotional-resonance' as const : 'dialogue-carry' as const
}

export function applyMemoryDeliberationToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
    tuningAdvice: input.context.memoryTuningAdvice ?? null,
  })
  if (!surface || !governance || !deliberationKernel?.shouldRecall || !deliberation)
    return surface

  const shouldStayInward = deliberationKernel.shouldStayInward
  const resolvedSurfacePolicy = deliberationKernel.surfacePolicy
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const whyNow = deliberationKernel.rationale
  const followUpAffordance = deliberationKernel.followUpAffordance
  const memoryControl = deliberationKernel.memoryControl!
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const mapAnswerActToReplyMotive = (answerAct: AlicizationMindTurnGovernance['answerAct']) => {
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
  const speakingIntention = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.speakingIntention ?? null,
    shouldStayInward
      ? 'Let remembered continuity shape the answer before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${resolvedSurfacePolicy}.`,
    `Memory latent controls: ${memoryControlSummary}.`,
  ])
  const consciousNeed = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousNeed ?? null,
    selectedChainSummary ? `The recollection chain now shaping the answer is ${selectedChainSummary}.` : null,
    selectedBundleSummary ? `The recollection bundle now shaping the answer is ${selectedBundleSummary}.` : null,
    selectedPeriodSummary ? `The remembered period now shaping the answer is ${selectedPeriodSummary}.` : null,
    selectedEraSummary ? `The remembered era now shaping the answer is ${selectedEraSummary}.` : null,
    selectedProcedureSummary ? `The remembered procedure pressing forward is ${selectedProcedureSummary}.` : null,
    memoryControlSummary,
  ])
  const consciousTension = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousTension ?? null,
    selectedRelationshipSummary ? `What is relationally live inside the recollection is ${selectedRelationshipSummary}.` : null,
    selectedChainStance ? `The remembered stance pulling on this answer is ${selectedChainStance}.` : null,
  ])
  const replyWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    followUpAffordance?.whyNow ?? null,
    whyNow,
  ])
  const answerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    buildMemoryAnswerAnchorTag(memoryControl),
    selectedChainPosture,
  ])
  const openingMove = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.openingMove ?? governance.openingMove ?? null,
    buildMemoryOpeningStrategyTag(memoryControl),
  ], 220)
  const mindTurnFrame = (governance.mindTurnFrame ?? surface.cognition.mindTurnFrame ?? null) as AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  const nextMindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame'] = mindTurnFrame
    ? {
        ...mindTurnFrame,
        narrative: mergeUniqueRules([
          ...(mindTurnFrame.narrative ?? []),
          'memory-deliberation',
          `memory-deliberation:surface:${resolvedSurfacePolicy}`,
        ], 12),
      }
    : mindTurnFrame
  const nextCurrentConsciousFrame: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']> = {
    subject: surface.dialogue.currentConsciousFrame?.subject ?? governance.answerSubject ?? 'general',
    centerOfGravity: surface.dialogue.currentConsciousFrame?.centerOfGravity ?? mapAnswerActToReplyMotive(governance.answerAct),
    truthDiscipline: surface.dialogue.currentConsciousFrame?.truthDiscipline === 'dialogue-first' ? 'dialogue-first' : 'memory-labeled',
    consciousNeed: consciousNeed || surface.dialogue.currentConsciousFrame?.consciousNeed || memoryControlSummary || whyNow || '',
    consciousTension: consciousTension || surface.dialogue.currentConsciousFrame?.consciousTension || whyNow || '',
    speakingIntention: speakingIntention || surface.dialogue.currentConsciousFrame?.speakingIntention || `Memory latent controls: ${memoryControlSummary}.` || whyNow || '',
    focusAnchor: surface.dialogue.currentConsciousFrame?.focusAnchor ?? governance.focusAnchor ?? null,
    withheldImpulse: surface.dialogue.currentConsciousFrame?.withheldImpulse ?? (shouldStayInward
      ? 'Do not flatten remembered continuity into a narrated memory dump.'
      : 'Do not let recollection outrun the live payoff.'),
    shouldWithholdSpecificity: surface.dialogue.currentConsciousFrame?.shouldWithholdSpecificity ?? (memoryControl.unsafeDetails.length > 0 || memoryControl.conflictBurden !== 'none'),
    shouldSelfRevise: surface.dialogue.currentConsciousFrame?.shouldSelfRevise ?? shouldStayInward,
    confidence: Math.max(surface.dialogue.currentConsciousFrame?.confidence ?? 0, deliberation.confidence),
    reasonTags: mergeUniqueRules([...(surface.dialogue.currentConsciousFrame?.reasonTags ?? []), 'memory-deliberation'], 10),
    updatedAt: input.now,
  }
  const nextReplyDeliberation: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['replyDeliberation']> = {
    selectedMotive: surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct),
    speakingFrom: deriveMemoryDeliberationSurfaceMode({
      shouldStayInward,
      surfacePolicy: resolvedSurfacePolicy,
      answerSubject: governance.answerSubject,
    }),
    memoryMode: deriveMemoryDeliberationMemoryMode({
      existingMode: surface.dialogue.replyDeliberation?.memoryMode ?? null,
      shouldStayInward,
      surfacePolicy: resolvedSurfacePolicy,
    }),
    openingBeat: openingMove || surface.dialogue.replyDeliberation?.openingBeat || whyNow || '',
    whyThisReplyNow: replyWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || whyNow || '',
    whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
    withheldImpulses: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
      followUpAffordance?.intrusionRisk === 'high'
        ? 'Do not force the remembered follow-up forward before the host has room for it.'
        : null,
      shouldStayInward
        ? 'Do not narrate the active recollection unless the live payoff truly needs it.'
        : 'Do not let recollection replace the live answer.',
      memoryControl.conflictBurden !== 'none'
        ? 'Do not overstate remembered detail while this recollection still carries conflict pressure.'
        : null,
      memoryControl.dominantProvenance === 'dreamt'
        ? 'Do not present dream residue as lived remembered fact.'
        : null,
      memoryControl.dominantProvenance === 'inferred'
        ? 'Do not present inferred continuity as settled remembered fact.'
        : null,
    ], 8),
    candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
    shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
    mustInclude: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
      `memory_latent_controls=${memoryControlSummary}`,
      followUpAffordance?.summary ? `memory_follow_up_affordance=${followUpAffordance.summary}` : null,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      memoryControl.dominantProvenance === 'dreamt' ? 'Do not present dream residue as lived remembered fact.' : null,
      memoryControl.dominantProvenance === 'inferred' ? 'Do not present inferred continuity as settled remembered fact.' : null,
      ...memoryControl.unsafeDetails.map(item => `Do not state this remembered detail as settled fact: ${item}`),
    ], 8),
    confidence: Math.max(surface.dialogue.replyDeliberation?.confidence ?? 0, deliberation.confidence),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
      followUpAffordance?.preferredTiming ? `memory-deliberation:followup:${followUpAffordance.preferredTiming}` : null,
    ], 10),
    updatedAt: input.now,
  }
  const nextAnswerPlanner: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['answerPlanner']> = {
    act: surface.dialogue.answerPlanner?.act ?? governance.answerAct ?? 'answer',
    evidenceMode: surface.dialogue.answerPlanner?.evidenceMode ?? governance.evidenceMode ?? 'continuity-carry',
    confidence: Math.max(surface.dialogue.answerPlanner?.confidence ?? 0, deliberation.confidence),
    governingFocus: mergeGuidanceLine([
      surface.dialogue.answerPlanner?.governingFocus ?? null,
      selectedChainSummary,
      selectedBundleSummary,
      selectedEraSummary,
      selectedPeriodSummary,
      selectedProcedureSummary,
      selectedRelationshipSummary,
      memoryControlSummary,
    ], 220) || memoryControlSummary || whyNow || '',
    openingMove: openingMove || surface.dialogue.answerPlanner?.openingMove || whyNow || '',
    answerIntent: answerIntent || surface.dialogue.answerPlanner?.answerIntent || whyNow || '',
    relationshipPosture: surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
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
      `memory_latent_controls=${memoryControlSummary}`,
      memoryControl.dominantProvenance === 'dreamt' ? 'If the recollection becomes explicit, frame it as dream residue rather than lived fact.' : null,
      memoryControl.dominantProvenance === 'inferred' ? 'If the recollection becomes explicit, frame it as inference or likely continuity rather than settled memory.' : null,
      memoryControl.dominantProvenance === 'reconstructed' ? 'If the recollection becomes explicit, keep it approximate and centered on the stable core.' : null,
    ], 10),
    mustNotDo: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      ...memoryControl.unsafeDetails.map(item => `Do not over-assert this remembered detail: ${item}`),
    ], 10),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
    ], 10),
    updatedAt: input.now,
  }
  const nextDialogueActKernel: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueActKernel']> = {
    subject: surface.dialogue.dialogueActKernel?.subject ?? governance.answerSubject ?? 'general',
    hostGoal: surface.dialogue.dialogueActKernel?.hostGoal ?? (
      governance.answerAct === 'care'
        ? 'rest'
        : governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self'
          ? 'chat'
          : 'resolve-problem'
    ),
    relationNeed: surface.dialogue.dialogueActKernel?.relationNeed ?? (
      resolvedSurfacePolicy === 'relationship-continuity'
        ? 'companionship'
        : governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guidance'
            : 'unclear'
    ),
    activeProject: surface.dialogue.dialogueActKernel?.activeProject ?? selectedProcedureSummary ?? selectedPeriodSummary ?? null,
    truthMode: surface.dialogue.dialogueActKernel?.truthMode ?? (
      shouldStayInward || resolvedSurfacePolicy === 'relationship-continuity'
        ? 'memory-only'
        : governance.evidenceMode ?? 'continuity-carry'
    ),
    speechAct: surface.dialogue.dialogueActKernel?.speechAct ?? governance.answerAct ?? nextAnswerPlanner.act,
    turnMode: surface.dialogue.dialogueActKernel?.turnMode ?? governance.turnMode,
    screenReferenceMode: surface.dialogue.dialogueActKernel?.screenReferenceMode ?? governance.screenReferenceMode ?? 'avoid',
    speakingFrom: nextReplyDeliberation.speakingFrom,
    selectedEvidence: surface.dialogue.dialogueActKernel?.selectedEvidence ?? [{
      kind: 'memory',
      source: 'reply-deliberation',
      summary: memoryControl.stableCore[0]
        || selectedEraSummary
        || selectedPeriodSummary
        || selectedChainSummary
        || selectedBundleSummary
        || selectedProcedureSummary
        || selectedRelationshipSummary
        || memoryControlSummary
        || whyNow
        || '',
      confidence: deliberation.confidence,
    }],
    openingClaim: surface.dialogue.dialogueActKernel?.openingClaim ?? selectedEraSummary ?? selectedPeriodSummary ?? selectedChainSummary ?? selectedBundleSummary ?? selectedProcedureSummary ?? selectedRelationshipSummary ?? whyNow ?? '',
    openingMove: openingMove || surface.dialogue.dialogueActKernel?.openingMove || whyNow || '',
    whyNow: replyWhyNow || surface.dialogue.dialogueActKernel?.whyNow || whyNow || '',
    mustSay: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
      answerIntent,
      `memory_latent_controls=${memoryControlSummary}`,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
    ], 8),
    sourceTrace: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.sourceTrace ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
    ], 10),
    confidence: Math.max(surface.dialogue.dialogueActKernel?.confidence ?? 0, deliberation.confidence),
    updatedAt: input.now,
  }

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
      personalityContinuityState: input.context.personStateProjection?.personalityContinuityState
        ?? surface.memory.personalityContinuityState
        ?? null,
      personStateProjection: input.context.personStateProjection ?? surface.memory.personStateProjection ?? null,
      recollectionPlan: input.context.recollectionPlan ?? surface.memory.recollectionPlan ?? null,
      recollectionSpeechPlan: input.context.recollectionSpeechPlan ?? surface.memory.recollectionSpeechPlan ?? null,
      memoryDeliberation: deliberation,
      knowledgeEvidence: input.context.knowledgeEvidence ?? surface.memory.knowledgeEvidence ?? null,
      selfEvolution: input.context.selfEvolution ?? surface.memory.selfEvolution ?? null,
      learningExecutionState: input.context.learningExecutionState ?? surface.memory.learningExecutionState ?? null,
      memoryStageReplay: input.context.memoryStageReplay ?? surface.memory.memoryStageReplay ?? null,
      memoryResolutionLedger: input.context.memoryResolutionLedger ?? surface.memory.memoryResolutionLedger ?? null,
      affectiveResidue: input.context.affectiveResidue ?? surface.memory.affectiveResidue ?? surface.memory.derivedMindStateBundle?.affectiveResidue ?? null,
      derivedMindStateBundle: buildDerivedMindStateBundle({
        source: 'main-runtime',
        producedAt: input.now,
        hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
        personStateProjection: (input.context.personStateProjection ?? surface.memory.personStateProjection ?? null) as unknown as Record<string, unknown> | null,
        knowledgeEvidence: input.context.knowledgeEvidence ?? surface.memory.knowledgeEvidence ?? null,
        selfEvolution: input.context.selfEvolution ?? surface.memory.selfEvolution ?? null,
        affectiveResidue: input.context.affectiveResidue ?? buildAlicizationAffectiveResidueMemory({
          now: input.now,
          recentRelationshipOutcomes: input.context.recentRelationshipOutcomes ?? [],
          recentMemoryReflections: input.context.recentMemoryReflections ?? [],
          personStateEvolutionSummary: null,
          personalityContinuityState: input.context.personStateProjection?.personalityContinuityState ?? surface.memory.personalityContinuityState ?? null,
          hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
          relationshipDynamics: input.context.relationshipDynamics ?? null,
        }),
        learningExecutionState: input.context.learningExecutionState ?? surface.memory.learningExecutionState ?? null,
        recallLatencyPolicy: input.context.recallLatencyPolicy ?? surface.memory.derivedMindStateBundle?.recallLatencyPolicy ?? null,
        recollectionIntent: input.context.recollectionIntent as unknown as Record<string, unknown> | null,
        recollectionPlan: input.context.recollectionPlan ?? surface.memory.recollectionPlan ?? null,
        recollectionSpeechPlan: input.context.recollectionSpeechPlan ?? surface.memory.recollectionSpeechPlan ?? null,
        memoryDeliberation: deliberation as unknown as Record<string, unknown> | null,
      }),
    },
    cognition: {
      ...surface.cognition,
      mindTurnFrame: nextMindTurnFrame,
    },
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: nextCurrentConsciousFrame,
      dialogueActKernel: nextDialogueActKernel,
      replyDeliberation: nextReplyDeliberation,
      answerPlanner: nextAnswerPlanner,
    },
  }
}
