import type { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import type { OrganicMemoryPromptContext } from './runtime-soul'

type MemoryTurnArtifact = ReturnType<typeof buildAlicizationMemoryTurnArtifact>

export interface AlicizationPersonMemoryCapsule {
  version: 'person-memory-capsule-v1'
  budget: {
    budgetClass: string
    latencyClass: string | null
    recallAction: string | null
    compactOnly: boolean
  }
  modules: {
    personality: {
      identityLine: string | null
      relationshipLine: string | null
      openingGuidance: string | null
      continuityRisk: string | null
    }
    memory: {
      memoryGate: string
      visibleCarryMode: string | null
      selectedMemory: string | null
      surfacePolicy: string | null
      uncertaintyPolicy: string | null
      searchTrace: string[]
    }
    emotion: {
      dominantResidue: string | null
      affectiveSummary: string | null
      cadenceMode: string | null
      distancePosture: string | null
      repairPressure: number | null
      burdenPressure: number | null
      trustPressure: number | null
    }
    initiative: {
      proactiveStyle: string | null
      cadenceSummary: string | null
      sameHerGap: string | null
      followUpAffordance: string | null
    }
    execution: {
      carryMode: string | null
      carrySummary: string | null
      threadAnchor: string | null
      confidence: number | null
    }
    embodiment: {
      hint: string
      expressionPosture: string | null
      voicePacing: string | null
      motionPosture: string | null
    }
    dialogue: {
      openingGuidance: string | null
      answerPosture: string | null
      mustDo: string[]
      mustNotDo: string[]
    }
    learning: {
      nextAction: string | null
      reason: string | null
      readiness: number | null
      focuses: string[]
      executionSummary: string | null
    }
    governance: {
      activeCandidateId: string | null
      activePatchId: string | null
      lanes: string[]
      reasonCodes: string[]
      memoryGate: string
      guard: string | null
    }
  }
  rendering: {
    blockLines: string[]
  }
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 5, maxChars = 180) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readBudgetClass(context: OrganicMemoryPromptContext) {
  return sanitizeText(context.recallLatencyPolicy?.budgetClass, 64) || 'realtime-reply'
}

export function shouldUseCompactPersonMemoryCapsuleOnly(
  context: OrganicMemoryPromptContext,
  memoryTurnArtifact?: MemoryTurnArtifact | null,
) {
  if ((context.memoryTuningAdvice?.focusDimensions.length ?? 0) > 0)
    return false
  if (!memoryTurnArtifact)
    return false
  if (!context.recallLatencyPolicy)
    return false

  const budgetClass = readBudgetClass(context)
  return budgetClass === 'realtime-reply'
    || context.recallLatencyPolicy?.shouldAvoidDeepExpansion === true
    || context.recallLatencyPolicy?.recallAction === 'stable-core-only'
    || context.recallLatencyPolicy?.recallAction === 'shallow-answer'
}

function pickIdentityLine(context: OrganicMemoryPromptContext) {
  return uniqueList([
    context.personStateProjection?.selfContinuityAuthority?.selfLine ?? null,
    context.projectStateContinuity?.sameHerSelfLine ?? null,
    context.personStateProjection?.selfContinuityAuthority?.authoritySummary ?? null,
    context.projectStateContinuity?.sameHerSummary ?? null,
    context.projectStateContinuity?.identity ?? null,
  ], 1, 180)[0] ?? null
}

function pickRelationshipLine(context: OrganicMemoryPromptContext) {
  const projection = context.personStateProjection ?? null
  return uniqueList([
    projection?.relationshipPosture ? `posture=${projection.relationshipPosture}` : null,
    projection?.activeClosenessContext && projection.activeClosenessRung
      ? `distance=${projection.activeClosenessContext}/${projection.activeClosenessRung}`
      : null,
    projection?.manifestationCadenceSummary ?? null,
    projection?.relationshipDoctrine ?? null,
    context.selfEvolution?.relationshipCadenceSummary ?? null,
  ], 4, 180).join(' | ') || null
}

function pickOpeningLine(context: OrganicMemoryPromptContext) {
  return uniqueList([
    context.personStateProjection?.openingGuidance ?? null,
    context.projectStateContinuity?.preDialogueAwarenessLine ?? null,
    context.selfEvolution?.dominantTrajectory ?? null,
  ], 1, 200)[0] ?? null
}

function pickMemoryLine(context: OrganicMemoryPromptContext, memoryTurnArtifact?: MemoryTurnArtifact | null) {
  const selectedFromArtifact = memoryTurnArtifact?.deliberation.stableCore[0]
    ?? memoryTurnArtifact?.candidates.topRankedCandidates.find(item => item.selected)?.summary
    ?? null
  return uniqueList([
    selectedFromArtifact,
    context.memoryDeliberation?.stableCore?.[0] ?? null,
    context.recollectionSpeechPlan?.styleNote ?? null,
    context.recollectionPlan?.opening ?? null,
    context.consolidatedMemories?.[0]?.summary ?? null,
    context.retrievedFacts[0]
      ? `${context.retrievedFacts[0].subject} ${context.retrievedFacts[0].predicate} ${context.retrievedFacts[0].object}`
      : null,
    context.recalledFragments[0]?.text ?? null,
  ], 1, 220)[0] ?? null
}

function pickLearningLine(context: OrganicMemoryPromptContext) {
  const selfEvolution = context.selfEvolution ?? null
  if (!selfEvolution)
    return null
  return uniqueList([
    selfEvolution.nextLearningAction
      ? `${selfEvolution.nextLearningAction}${selfEvolution.nextLearningReason ? `:${selfEvolution.nextLearningReason}` : ''}`
      : null,
    selfEvolution.summary ?? null,
    selfEvolution.activeLearningFocuses?.[0] ?? null,
  ], 1, 220)[0] ?? null
}

function pickEmbodimentHint(context: OrganicMemoryPromptContext) {
  const affectiveResidue = context.affectiveResidue ?? null
  const projection = context.personStateProjection ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  return uniqueList([
    projection?.manifestationCadenceSummary ?? null,
    cadence?.distancePosture ? `distance=${cadence.distancePosture}` : null,
    cadence?.cadenceMode ? `cadence=${cadence.cadenceMode}` : null,
    affectiveResidue?.summary ?? null,
    context.selfEvolution?.relationshipCadenceSummary ?? null,
  ], 3, 160).join(' | ') || 'derive voice, face, motion, and timing from the same person-state authority'
}

function pickGuardLine(context: OrganicMemoryPromptContext, memoryTurnArtifact?: MemoryTurnArtifact | null) {
  return uniqueList([
    memoryTurnArtifact?.visibleMemoryGate.status === 'closed' || memoryTurnArtifact?.visibleMemoryGate.status === 'inward-only'
      ? 'keep recall inward unless it directly serves the current payoff'
      : null,
    context.memoryResolutionLedger?.shouldLabelUncertainty ? 'label recalled uncertainty when surfaced' : null,
    context.projectStateContinuity?.sameHerDriftRisk ?? null,
    context.selfEvolution?.burdenLine ?? null,
    context.personStateProjection?.burdenText ?? null,
  ], 3, 180).join(' | ') || null
}

function buildSearchTraceLines(context: OrganicMemoryPromptContext) {
  const searchTrace = context.memoryDeliberation?.searchTrace
    ?? context.recollectionPlan?.searchTrace
    ?? null
  if (!searchTrace)
    return []

  return [
    `search_first_hop=${sanitizeText(searchTrace.firstHop.focus, 64)}:${sanitizeText(searchTrace.firstHop.summary, 160)}`,
    `search_second_hop=${sanitizeText(searchTrace.secondHop.action, 64)}:${sanitizeText(searchTrace.secondHop.evidenceGap, 80)}:${sanitizeText(searchTrace.secondHop.summary, 160)}`,
    `search_third_hop=${sanitizeText(searchTrace.thirdHop.ambiguityPosture, 64)}:${sanitizeText(searchTrace.thirdHop.summary, 160)}`,
  ]
}

function joinLine(values: Array<string | null | undefined>, separator = ' | ') {
  return values.map(value => sanitizeText(value, 220)).filter(Boolean).join(separator) || null
}

function numberOrNull(raw: unknown) {
  return Number.isFinite(raw) ? Number(raw) : null
}

export function buildAlicizationPersonMemoryCapsule(
  context: OrganicMemoryPromptContext,
  memoryTurnArtifact?: MemoryTurnArtifact | null,
): AlicizationPersonMemoryCapsule {
  const budgetClass = readBudgetClass(context)
  const latencyClass = sanitizeText(context.recallLatencyPolicy?.latencyClass, 64) || null
  const recallAction = sanitizeText(context.recallLatencyPolicy?.recallAction, 64) || null
  const memoryGate = memoryTurnArtifact?.visibleMemoryGate.status ?? 'no-turn-gate'
  const projection = context.personStateProjection ?? null
  const affectiveResidue = context.affectiveResidue ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  const executionCarry = context.executionCallbackCarry ?? null
  const selfEvolution = context.selfEvolution ?? null
  const activeGovernance = context.activeContinuityGovernance ?? null
  const guard = pickGuardLine(context, memoryTurnArtifact)
  const searchTrace = buildSearchTraceLines(context)
  const embodimentHint = pickEmbodimentHint(context)
  const openingGuidance = pickOpeningLine(context)
  const relationshipLine = pickRelationshipLine(context)
  const selectedMemory = pickMemoryLine(context, memoryTurnArtifact)
  const learningLine = pickLearningLine(context)
  const followUpAffordance = joinLine([
    memoryTurnArtifact?.deliberation.followUp?.summary ?? null,
    memoryTurnArtifact?.deliberation.followUp?.preferredTiming ?? null,
    memoryTurnArtifact?.deliberation.followUp?.intrusionRisk ?? null,
    context.memoryDeliberation?.followUpAffordance?.summary ?? null,
  ])

  const modules: AlicizationPersonMemoryCapsule['modules'] = {
    personality: {
      identityLine: pickIdentityLine(context),
      relationshipLine,
      openingGuidance,
      continuityRisk: sanitizeText(context.projectStateContinuity?.sameHerDriftRisk, 220) || null,
    },
    memory: {
      memoryGate,
      visibleCarryMode: memoryTurnArtifact?.closure.visibleCarryMode ?? null,
      selectedMemory,
      surfacePolicy: memoryTurnArtifact?.deliberation.surfacePolicy ?? context.memoryDeliberation?.surfacePolicy ?? null,
      uncertaintyPolicy: context.memoryResolutionLedger?.shouldLabelUncertainty || memoryTurnArtifact?.closure.shouldLabelUncertainty
        ? 'label-uncertainty'
        : null,
      searchTrace,
    },
    emotion: {
      dominantResidue: sanitizeText(affectiveResidue?.dominantResidueKind, 80) || null,
      affectiveSummary: sanitizeText(affectiveResidue?.summary, 220) || null,
      cadenceMode: sanitizeText(cadence?.cadenceMode, 80) || null,
      distancePosture: sanitizeText(cadence?.distancePosture, 80) || null,
      repairPressure: numberOrNull(affectiveResidue?.repairPressure),
      burdenPressure: numberOrNull(affectiveResidue?.burdenPressure),
      trustPressure: numberOrNull(affectiveResidue?.trustPressure),
    },
    initiative: {
      proactiveStyle: sanitizeText(projection?.preferredProactiveStyle, 80) || null,
      cadenceSummary: sanitizeText(projection?.manifestationCadenceSummary ?? selfEvolution?.relationshipCadenceSummary, 220) || null,
      sameHerGap: sanitizeText(context.projectStateContinuity?.proactiveSameHerGap, 220) || null,
      followUpAffordance,
    },
    execution: {
      carryMode: sanitizeText(executionCarry?.carryMode, 80) || null,
      carrySummary: sanitizeText(executionCarry?.summary, 220) || null,
      threadAnchor: sanitizeText(executionCarry?.threadAnchor, 160) || null,
      confidence: numberOrNull(executionCarry?.confidence),
    },
    embodiment: {
      hint: embodimentHint,
      expressionPosture: sanitizeText(projection?.relationshipPosture ?? cadence?.distancePosture, 80) || null,
      voicePacing: sanitizeText(cadence?.cadenceMode ?? projection?.preferredProactiveStyle, 80) || null,
      motionPosture: sanitizeText(cadence?.distancePosture ?? projection?.activeClosenessRung, 80) || null,
    },
    dialogue: {
      openingGuidance,
      answerPosture: sanitizeText(projection?.relationshipPosture, 80) || null,
      mustDo: uniqueList([
        memoryTurnArtifact?.deliberation.whyNow ?? null,
        context.memoryDeliberation?.whyNow ?? null,
        context.recollectionSpeechPlan?.styleNote ?? null,
      ], 3, 180),
      mustNotDo: uniqueList([
        ...(memoryTurnArtifact?.deliberation.unsafeDetails ?? []),
        guard,
      ], 4, 180),
    },
    learning: {
      nextAction: sanitizeText(selfEvolution?.nextLearningAction, 80) || null,
      reason: sanitizeText(selfEvolution?.nextLearningReason, 220) || null,
      readiness: numberOrNull(selfEvolution?.learningReadiness),
      focuses: uniqueList(selfEvolution?.activeLearningFocuses ?? [], 6, 120),
      executionSummary: sanitizeText(
        context.learningExecutionState?.lastCompletedSummary
        ?? context.learningExecutionState?.currentBlockedReason
        ?? context.learningExecutionState?.lastFailureReason
        ?? context.learningExecutionState?.currentStatus
        ?? '',
        220,
      ) || learningLine,
    },
    governance: {
      activeCandidateId: sanitizeText(activeGovernance?.candidateId, 160) || null,
      activePatchId: sanitizeText(activeGovernance?.patchId, 160) || null,
      lanes: uniqueList(activeGovernance?.lanes ?? [], 8, 80),
      reasonCodes: uniqueList(activeGovernance?.reasonCodes ?? [], 10, 120),
      memoryGate,
      guard,
    },
  }

  const lines = [
    '[ALICIZATION_PERSON_MEMORY_CAPSULE]',
    'Compact realtime authority for this turn. Use this before any expanded memory block; do not quote it verbatim.',
    `budget=${budgetClass}`,
    latencyClass ? `latency=${latencyClass}` : '',
    recallAction ? `recall_action=${recallAction}` : '',
    modules.personality.identityLine ? `identity=${modules.personality.identityLine}` : '',
    modules.personality.relationshipLine ? `relationship=${modules.personality.relationshipLine}` : '',
    modules.dialogue.openingGuidance ? `opening=${modules.dialogue.openingGuidance}` : '',
    `memory_gate=${memoryGate}`,
    modules.memory.visibleCarryMode ? `visible_carry=${modules.memory.visibleCarryMode}` : '',
    modules.memory.selectedMemory ? `selected_memory=${modules.memory.selectedMemory}` : '',
    modules.learning.nextAction ? `learning=${modules.learning.nextAction}${modules.learning.reason ? `:${modules.learning.reason}` : ''}` : '',
    `embodiment_hint=${modules.embodiment.hint}`,
    modules.governance.guard ? `guard=${modules.governance.guard}` : '',
    `personality=${joinLine([modules.personality.identityLine, modules.personality.relationshipLine, modules.personality.continuityRisk]) ?? 'none'}`,
    `memory=${joinLine([modules.memory.selectedMemory, modules.memory.surfacePolicy, modules.memory.uncertaintyPolicy]) ?? 'none'}`,
    `emotion=${joinLine([modules.emotion.dominantResidue, modules.emotion.affectiveSummary, modules.emotion.distancePosture]) ?? 'none'}`,
    `initiative=${joinLine([modules.initiative.proactiveStyle, modules.initiative.cadenceSummary, modules.initiative.sameHerGap]) ?? 'none'}`,
    `execution=${joinLine([modules.execution.carryMode, modules.execution.carrySummary, modules.execution.threadAnchor]) ?? 'none'}`,
    `embodiment=${joinLine([modules.embodiment.hint, modules.embodiment.expressionPosture, modules.embodiment.voicePacing]) ?? 'none'}`,
    `dialogue=${joinLine([modules.dialogue.openingGuidance, modules.dialogue.answerPosture, modules.dialogue.mustDo[0]]) ?? 'none'}`,
    `learning=${joinLine([modules.learning.nextAction, modules.learning.reason, modules.learning.focuses[0]]) ?? 'none'}`,
    `governance=${joinLine([modules.governance.activePatchId, modules.governance.memoryGate, modules.governance.guard]) ?? 'none'}`,
    ...modules.memory.searchTrace,
  ]

  return {
    version: 'person-memory-capsule-v1',
    budget: {
      budgetClass,
      latencyClass,
      recallAction,
      compactOnly: shouldUseCompactPersonMemoryCapsuleOnly(context, memoryTurnArtifact),
    },
    modules,
    rendering: {
      blockLines: lines.filter(Boolean),
    },
  }
}

export function buildAlicizationPersonMemoryCapsuleBlock(
  context: OrganicMemoryPromptContext,
  memoryTurnArtifact?: MemoryTurnArtifact | null,
) {
  return buildAlicizationPersonMemoryCapsule(context, memoryTurnArtifact).rendering.blockLines.join('\n')
}
