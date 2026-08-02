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
      followUpAffordance: string | null
    }
    execution: {
      carryMode: string | null
      carrySummary: string | null
      threadAnchor: string | null
      confidence: number | null
    }
    embodiment: {
      hint: string | null
      expressionPosture: string | null
      voicePacing: string | null
      motionPosture: string | null
    }
    dialogue: {
      answerPosture: string | null
    }
    learning: {
      nextAction: string | null
      reason: string | null
      readiness: number | null
      focuses: string[]
      executionSummary: string | null
    }
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
    context.personStateProjection?.selfContinuityAuthority?.authoritySummary ?? null,
  ], 1, 180)[0] ?? null
}

function pickRelationshipLine(context: OrganicMemoryPromptContext) {
  const projection = context.personStateProjection ?? null
  return uniqueList([
    projection?.relationshipPosture ? `posture=${projection.relationshipPosture}` : null,
    projection?.activeClosenessContext && projection.activeClosenessRung
      ? `distance=${projection.activeClosenessContext}/${projection.activeClosenessRung}`
      : null,
    projection?.relationshipDoctrine ?? null,
  ], 4, 180).join(' | ') || null
}

function pickMemoryLine(context: OrganicMemoryPromptContext, memoryTurnArtifact?: MemoryTurnArtifact | null) {
  const selectedFromArtifact = memoryTurnArtifact?.deliberation.stableCore[0]
    ?? memoryTurnArtifact?.candidates.topRankedCandidates.find(item => item.selected)?.summary
    ?? null
  return uniqueList([
    selectedFromArtifact,
    context.memoryDeliberation?.stableCore?.[0] ?? null,
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
  const cadence = affectiveResidue?.relationshipCadence ?? null
  return uniqueList([
    cadence?.distancePosture ? `distance=${cadence.distancePosture}` : null,
    cadence?.cadenceMode ? `cadence=${cadence.cadenceMode}` : null,
    affectiveResidue?.summary ?? null,
  ], 3, 160).join(' | ') || null
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
  const searchTrace = buildSearchTraceLines(context)
  const embodimentHint = pickEmbodimentHint(context)
  const relationshipLine = pickRelationshipLine(context)
  const selectedMemory = pickMemoryLine(context, memoryTurnArtifact)
  const learningLine = pickLearningLine(context)
  const followUpAffordance = uniqueList([
    memoryTurnArtifact?.deliberation.followUp?.summary ?? null,
    memoryTurnArtifact?.deliberation.followUp?.preferredTiming ?? null,
    memoryTurnArtifact?.deliberation.followUp?.intrusionRisk ?? null,
    context.memoryDeliberation?.followUpAffordance?.summary ?? null,
  ], 4, 220).join(' | ') || null

  const modules: AlicizationPersonMemoryCapsule['modules'] = {
    personality: {
      identityLine: pickIdentityLine(context),
      relationshipLine,
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
      answerPosture: sanitizeText(projection?.relationshipPosture, 80) || null,
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
  }

  return {
    version: 'person-memory-capsule-v1',
    budget: {
      budgetClass,
      latencyClass,
      recallAction,
      compactOnly: shouldUseCompactPersonMemoryCapsuleOnly(context, memoryTurnArtifact),
    },
    modules,
  }
}
