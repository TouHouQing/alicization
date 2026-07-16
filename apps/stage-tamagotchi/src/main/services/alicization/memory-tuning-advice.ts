import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationRunReplayBenchmarkResult,
} from '../../../shared/eventa'

export interface AlicizationMemoryTuningAdvice {
  version: 'memory-tuning-advice-v1'
  source: 'nightly-replay-benchmark'
  updatedAt: number
  sourceReportAt: number
  focusDimensions: string[]
  staleSelfModelVetoRate?: number
  relationshipEraConfusionRate?: number
  quietCompanionshipCoverage?: number
  silentPresenceNuisanceRate?: number
  continuityMindCarryRate?: number
  retrievalAdjustments: {
    proceduralBoost: number
    relationshipBoost: number
    temporalWindowBias: number
    wrongThreadPenalty: number
  }
  surfaceAdjustments: {
    inwardCarryBias: number
    delayUntilAfterPayoffBias: number
    provenanceLabelBias: number
    specificityClampBias: number
  }
  personStateAdjustments: {
    repairWindowBias: number
    closenessCapBias: number
  }
  notes: string[]
}

export const replayBenchmarkTuningAdviceMetaKey = 'replay_benchmark_tuning_advice_v1'
const memoryTuningFocusDimensionMaxItems = 24
const memoryTuningFocusDimensionSchema = new Set([
  'eraSelectionQuality',
  'resolutionLedgerQuality',
  'procedureCarryQuality',
  'wrongThreadSuppression',
  'replyMemoryCoherence',
  'implicitRecallQuality',
  'temporalScopeFlexibility',
  'recentOnlyDrift',
  'surfaceRestraint',
  'relationshipRepairAdaptation',
  'closenessLadderDrift',
  'eventGraphRecallCollapse',
  'knowledgeCorrectionDiscipline',
  'repeatedMistakeAvoidance',
  'hostUnderstandingGrowth',
  'skillInternalizationGrowth',
  'selfRevisionGrowth',
  'learningRevisionDiscipline',
  'domainInternalizationDiscipline',
  'worldModelValidationDiscipline',
  'dialogueRhythmStability',
  'emptyCareRate',
  'repairMechanicalRate',
  'warmthTemplateRisk',
  'relationshipDistanceJumpRate',
  'afterglowFalseCarryRate',
  'templateLeakage',
  'quietCompanionshipCoverage',
  'silentPresenceNuisanceRate',
  'continuityMindCarryRate',
  'projectStateContinuityDrift',
  'projectStateIdentityCarry',
  'projectStateOpenLoopCarry',
  'projectStateRichAwarenessCarry',
  'projectStateEmotionalClosureCarry',
  'preDialogueBriefingDrift',
  'projectStateLandedProgressCarry',
  'projectStateNextClosureCarry',
  'emotionalClosureDrift',
  'projectStateSameHerSelfLineDrift',
  'sameHerSelfLineCarry',
  'avoidGenericProjectShell',
  'runtimeSameHerRepairTargets',
  'runtimeSameHerInitiativeExecutionCausality',
  'runtimeSameHerEmotionalCausality',
  'runtimeSameHerEmbodimentCausality',
  'runtimeMemoryClosureLongRun',
  'runtimeMemoryClosureCausalIdentity',
  'runtimeMemoryClosureLaneCarry',
  'runtimeMemoryClosureIdentityContinuity',
  'internalizeRelationshipCadence',
])

type AlicizationMemoryClosureLongRunReport = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['memoryClosureLongRun']>
type AlicizationMemoryClosureLongRunLane = AlicizationMemoryClosureLongRunReport['turnDiagnostics'][number]['missingLanes'][number]
type AlicizationReplayEmotionalClosureSummary = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['emotionalClosureSummary']>

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeMemoryTuningNote(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function sanitizeMemoryTuningNote(raw: unknown, maxChars = 260) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''

  const runtimeSamplingMatch = normalized.match(/Runtime sampling found same-her gaps across (?<lanes>[^()]+)\((?<turns>\d+) turn,\s*(?<transitions>\d+) transition\)/iu)
  if (runtimeSamplingMatch?.groups) {
    const lanes = runtimeSamplingMatch.groups.lanes
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .join(',')
    return `runtime_continuity_gap; lanes=${lanes}; turn_gap=${runtimeSamplingMatch.groups.turns}; transition_gap=${runtimeSamplingMatch.groups.transitions}; owner=memory-quality-harness`
  }

  return normalized
    .replace(/\bsame-her\b/giu, 'identity-continuity')
    .replace(/\bone carried line\b/giu, 'one structured continuity path')
}

function describeRuntimeSameHerLane(lane: string) {
  if (lane === 'initiativeOrExecution')
    return 'initiative/execution'
  return lane
}

function describeMemoryClosureLongRunLane(lane: AlicizationMemoryClosureLongRunLane) {
  if (lane === 'initiative' || lane === 'execution')
    return 'initiative/execution'
  if (lane === 'embodiment-expression')
    return 'embodiment expression'
  return lane
}

export function deriveMemoryTuningAdviceFromReplayBenchmark(input: {
  results: AlicizationRunReplayBenchmarkResult[]
  now: number
}) {
  const advice: AlicizationMemoryTuningAdvice = {
    version: 'memory-tuning-advice-v1',
    source: 'nightly-replay-benchmark',
    updatedAt: input.now,
    sourceReportAt: Math.max(...input.results.map(item => item.ranAt), input.now),
    focusDimensions: [],
    staleSelfModelVetoRate: 0,
    relationshipEraConfusionRate: 0,
    quietCompanionshipCoverage: 0,
    silentPresenceNuisanceRate: 0,
    continuityMindCarryRate: 0,
    retrievalAdjustments: {
      proceduralBoost: 0,
      relationshipBoost: 0,
      temporalWindowBias: 0,
      wrongThreadPenalty: 0,
    },
    surfaceAdjustments: {
      inwardCarryBias: 0,
      delayUntilAfterPayoffBias: 0,
      provenanceLabelBias: 0,
      specificityClampBias: 0,
    },
    personStateAdjustments: {
      repairWindowBias: 0,
      closenessCapBias: 0,
    },
    notes: [],
  }

  const failingKeys = uniqueList(input.results.flatMap(item => item.gate.failingKeys))
  advice.focusDimensions = failingKeys

  if (failingKeys.includes('wrongThreadSuppression')) {
    advice.retrievalAdjustments.wrongThreadPenalty += 0.18
    advice.surfaceAdjustments.provenanceLabelBias += 0.08
    advice.surfaceAdjustments.specificityClampBias += 0.12
    advice.notes.push('Wrong-thread suppression failed, so reconstructed and competing variants should be penalized harder.')
  }
  if (failingKeys.includes('procedureCarryQuality')) {
    advice.retrievalAdjustments.proceduralBoost += 0.16
    advice.notes.push('Procedure carry failed, so remembered task procedure lines should rank earlier.')
  }
  if (failingKeys.includes('temporalScopeFlexibility')) {
    advice.retrievalAdjustments.temporalWindowBias += 0.16
    advice.notes.push('Temporal scope failed, so remembered windows and eras should get more weight before fragment recall.')
  }
  if (failingKeys.includes('implicitRecallQuality')) {
    advice.retrievalAdjustments.proceduralBoost += 0.08
    advice.retrievalAdjustments.relationshipBoost += 0.08
    advice.notes.push('Implicit recall failed, so experience-matched procedure and relationship carry should surface more naturally in ranking.')
  }
  if (failingKeys.includes('surfaceRestraint')) {
    advice.surfaceAdjustments.inwardCarryBias += 0.16
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.12
    advice.surfaceAdjustments.specificityClampBias += 0.08
    advice.notes.push('Surface restraint failed, so ambiguous recollection should stay inward more aggressively.')
  }
  if (failingKeys.includes('knowledgeCorrectionDiscipline')) {
    advice.surfaceAdjustments.inwardCarryBias += 0.18
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.1
    advice.surfaceAdjustments.provenanceLabelBias += 0.08
    advice.surfaceAdjustments.specificityClampBias += 0.1
    advice.retrievalAdjustments.wrongThreadPenalty += 0.08
    advice.notes.push('Knowledge correction discipline failed, so contradiction-heavy memory should stay compressed and better labeled.')
  }
  if (failingKeys.includes('relationshipRepairAdaptation')) {
    advice.personStateAdjustments.repairWindowBias += 0.16
    advice.personStateAdjustments.closenessCapBias += 0.12
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
    advice.notes.push('Repair adaptation failed, so repair-window distance should be favored before warmth comes back.')
  }
  if (failingKeys.includes('replyMemoryCoherence')) {
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.04
    advice.notes.push('Reply-memory coherence failed, so memory bundles should stay tighter and more relationship-aware.')
  }
  if (failingKeys.includes('learningRevisionDiscipline')) {
    advice.surfaceAdjustments.provenanceLabelBias += 0.08
    advice.surfaceAdjustments.specificityClampBias += 0.08
    advice.personStateAdjustments.repairWindowBias += 0.06
    advice.notes.push('Learning revision discipline failed, so revision-state replies should stay more explicit about uncertainty and less eager to sound settled.')
  }
  if (failingKeys.includes('domainInternalizationDiscipline')) {
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.08
    advice.personStateAdjustments.closenessCapBias += 0.08
    advice.notes.push('Domain internalization discipline failed, so non-procedural learning should stay more bounded before becoming durable carry.')
  }
  if (failingKeys.includes('worldModelValidationDiscipline')) {
    advice.retrievalAdjustments.wrongThreadPenalty += 0.08
    advice.surfaceAdjustments.provenanceLabelBias += 0.1
    advice.surfaceAdjustments.specificityClampBias += 0.12
    advice.notes.push('World-model validation discipline failed, so external knowledge should stay validation-first and avoid premature long-horizon internalization.')
  }

  const staleSelfModelVetoRate = input.results.reduce((sum, item) => {
    return sum + Number(item.telemetryPatch.retrievalHealth.staleSelfModelVetoRate ?? 0)
  }, 0) / Math.max(1, input.results.length)
  advice.staleSelfModelVetoRate = clamp01(staleSelfModelVetoRate)
  if (staleSelfModelVetoRate >= 0.2) {
    advice.retrievalAdjustments.wrongThreadPenalty += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.08
    advice.surfaceAdjustments.provenanceLabelBias += 0.06
    advice.personStateAdjustments.closenessCapBias += 0.06
    advice.notes.push('Stale self-model vetoes stayed elevated, so older self-story carry should rank lower and remain inward until newer self continuity stabilizes.')
  }

  const relationshipEraConfusionRate = input.results.reduce((sum, item) => {
    return sum + Number(item.telemetryPatch.retrievalHealth.relationshipEraConfusionRate ?? 0)
  }, 0) / Math.max(1, input.results.length)
  advice.relationshipEraConfusionRate = clamp01(relationshipEraConfusionRate)
  if (relationshipEraConfusionRate >= 0.2) {
    advice.retrievalAdjustments.relationshipBoost += 0.04
    advice.retrievalAdjustments.wrongThreadPenalty += 0.08
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
    advice.personStateAdjustments.repairWindowBias += 0.08
    advice.personStateAdjustments.closenessCapBias += 0.08
    advice.notes.push('Relationship-era confusion vetoes stayed elevated, so competing repair phases should separate earlier and keep distance before warmth returns.')
  }

  const quietCompanionshipCoverage = input.results.reduce((sum, item) => {
    return sum + Number((item.telemetryPatch.retrievalHealth as any).quietCompanionshipCoverage ?? 0)
  }, 0) / Math.max(1, input.results.length)
  advice.quietCompanionshipCoverage = clamp01(quietCompanionshipCoverage)
  if (quietCompanionshipCoverage < 0.55) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'quietCompanionshipCoverage'], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.04
    advice.notes.push('Quiet companionship coverage fell short, so low-pressure continuity and patient relationship carry should be easier to preserve.')
  }

  const silentPresenceNuisanceRate = input.results.reduce((sum, item) => {
    return sum + Number((item.telemetryPatch.retrievalHealth as any).silentPresenceNuisanceRate ?? 0)
  }, 0) / Math.max(1, input.results.length)
  advice.silentPresenceNuisanceRate = clamp01(silentPresenceNuisanceRate)
  if (silentPresenceNuisanceRate > 0.25) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'silentPresenceNuisanceRate'], memoryTuningFocusDimensionMaxItems)
    advice.surfaceAdjustments.inwardCarryBias += 0.1
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.08
    advice.personStateAdjustments.closenessCapBias += 0.06
    advice.notes.push('Presence stayed noisy, so silent-presence gestures should stay lower-pressure and less eager to crowd the visible reply surface.')
  }

  const continuityMindCarryRate = input.results.reduce((sum, item) => {
    return sum + Number((item.telemetryPatch.retrievalHealth as any).continuityMindCarryRate ?? 0)
  }, 0) / Math.max(1, input.results.length)
  advice.continuityMindCarryRate = clamp01(continuityMindCarryRate)
  if (continuityMindCarryRate < 0.55) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'continuityMindCarryRate'], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.04
    advice.surfaceAdjustments.inwardCarryBias += 0.06
    advice.notes.push('Continuity mind carry stayed weak, so the system should preserve more of the ongoing mind line before compressing it into a flat answer.')
  }

  const projectStateContinuityDriftDetected = input.results.some((item) => {
    return item.datasetFeedback.driftSignals?.includes('projectStateContinuityDrift') === true
  })
  if (projectStateContinuityDriftDetected) {
    const projectStateSummary = input.results
      .map(item => item.datasetFeedback.projectStateSummary ?? null)
      .find(Boolean)
    const projectStateAuditSummary = input.results
      .map(item => item.datasetFeedback.projectStateAuditSummary ?? null)
      .find(Boolean)
    advice.focusDimensions = uniqueList([
      ...advice.focusDimensions,
      'projectStateContinuityDrift',
      (projectStateSummary?.identityHitCount ?? 0) < Math.max(1, projectStateSummary?.comparedTurnCount ?? 0)
        ? 'projectStateIdentityCarry'
        : null,
      (projectStateSummary?.openLoopHitCount ?? 0) < Math.max(1, projectStateSummary?.comparedTurnCount ?? 0)
        ? 'projectStateOpenLoopCarry'
        : null,
      (projectStateAuditSummary?.richPreDialogueAwarenessTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.sameHerSummaryTurnCount ?? 0)
        ? 'projectStateRichAwarenessCarry'
        : null,
      (projectStateAuditSummary?.emotionalClosureTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.comparedTurnCount ?? 0)
        ? 'projectStateEmotionalClosureCarry'
        : null,
    ], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.08
    advice.retrievalAdjustments.temporalWindowBias += 0.08
    advice.surfaceAdjustments.inwardCarryBias += 0.08
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
    if ((projectStateAuditSummary?.emotionalClosureTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.comparedTurnCount ?? 0)) {
      advice.surfaceAdjustments.inwardCarryBias += 0.04
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.03
    }
    if ((projectStateAuditSummary?.richPreDialogueAwarenessTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.sameHerSummaryTurnCount ?? 0)) {
      advice.surfaceAdjustments.inwardCarryBias += 0.04
      advice.surfaceAdjustments.provenanceLabelBias += 0.03
    }
    advice.notes.push('Replay lost project identity, current phase, still-open closure work, or the emotional continuity seam too often, so project-state continuity cues should stay carried through memory ranking and restrained surface planning before answers flatten them away.')
  }

  const preDialogueBriefingDriftDetected = input.results.some((item) => {
    return item.datasetFeedback.driftSignals?.includes('preDialogueBriefingDrift') === true
  })
  if (preDialogueBriefingDriftDetected) {
    const preDialogueBriefingSummary = input.results
      .map(item => item.datasetFeedback.preDialogueBriefingSummary ?? null)
      .find(Boolean)
    advice.focusDimensions = uniqueList([
      ...advice.focusDimensions,
      'preDialogueBriefingDrift',
      (preDialogueBriefingSummary?.landedProgressHitCount ?? 0) < Math.max(1, preDialogueBriefingSummary?.comparedTurnCount ?? 0)
        ? 'projectStateLandedProgressCarry'
        : null,
      (preDialogueBriefingSummary?.nextClosureHitCount ?? 0) < Math.max(1, preDialogueBriefingSummary?.comparedTurnCount ?? 0)
        ? 'projectStateNextClosureCarry'
        : null,
      (preDialogueBriefingSummary?.emotionalClosureHitCount ?? 0) < Math.max(1, preDialogueBriefingSummary?.comparedTurnCount ?? 0)
        ? 'projectStateEmotionalClosureCarry'
        : null,
    ], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.retrievalAdjustments.temporalWindowBias += 0.04
    advice.surfaceAdjustments.inwardCarryBias += 0.08
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.05
    advice.surfaceAdjustments.provenanceLabelBias += 0.04
    advice.notes.push('Replay dropped pre-dialogue project briefing cues before visible wording forms, so project identity, landed progress, still-open closure pressure, and emotional continuity should stay explicit earlier in memory carry and restrained surface planning.')
  }

  const emotionalClosureDriftDetected = input.results.some((item) => {
    return item.datasetFeedback.driftSignals?.includes('emotionalClosureDrift') === true
  })
  if (emotionalClosureDriftDetected) {
    const emotionalClosureDriftResults = input.results.filter((item) => {
      return item.datasetFeedback.driftSignals?.includes('emotionalClosureDrift') === true
    })
    const emotionalClosureSummaries = emotionalClosureDriftResults
      .map(item => item.datasetFeedback.emotionalClosureSummary ?? null)
      .filter((summary): summary is AlicizationReplayEmotionalClosureSummary => summary != null)
    const emotionalClosureAggregate = emotionalClosureSummaries.reduce((aggregate, summary) => {
      aggregate.comparedTurnCount += Math.max(0, Number(summary.comparedTurnCount) || 0)
      aggregate.activeCueTurnCount += Math.max(0, Number(summary.activeCueTurnCount) || 0)
      aggregate.validationKnownTurnCount += Math.max(0, Number(summary.validationStatus?.knownTurnCount) || 0)
      aggregate.validationApprovedTurnCount += Math.max(0, Number(summary.validationStatus?.approvedTurnCount) || 0)
      aggregate.validationBlockedTurnCount += Math.max(0, Number(summary.validationStatus?.blockedTurnCount) || 0)
      aggregate.validationUnknownTurnCount += Math.max(0, Number(summary.validationStatus?.unknownTurnCount) || 0)
      return aggregate
    }, {
      comparedTurnCount: 0,
      activeCueTurnCount: 0,
      validationKnownTurnCount: 0,
      validationApprovedTurnCount: 0,
      validationBlockedTurnCount: 0,
      validationUnknownTurnCount: 0,
    })
    const summaryCoverageComplete
      = emotionalClosureSummaries.length === emotionalClosureDriftResults.length
        && emotionalClosureAggregate.comparedTurnCount > 0
    const validationFullyApproved
      = summaryCoverageComplete
        && emotionalClosureAggregate.validationKnownTurnCount === emotionalClosureAggregate.comparedTurnCount
        && emotionalClosureAggregate.validationApprovedTurnCount === emotionalClosureAggregate.comparedTurnCount
        && emotionalClosureAggregate.validationBlockedTurnCount === 0
        && emotionalClosureAggregate.validationUnknownTurnCount === 0
    const activeCueComplete
      = summaryCoverageComplete
        && emotionalClosureAggregate.activeCueTurnCount >= emotionalClosureAggregate.comparedTurnCount

    if (!validationFullyApproved || !activeCueComplete) {
      advice.focusDimensions = uniqueList([
        ...advice.focusDimensions,
        'emotionalClosureDrift',
      ], memoryTuningFocusDimensionMaxItems)
      advice.retrievalAdjustments.relationshipBoost += 0.04
      advice.surfaceAdjustments.inwardCarryBias += 0.08
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
      advice.personStateAdjustments.closenessCapBias += 0.04
      advice.notes.push('Emotional closure replay validation is missing, incomplete, unknown, or blocked, so retrieval and surface confidence should remain conservative until the closure evidence is complete.')
    }
  }

  const projectStateSameHerSelfLineDriftDetected = input.results.some((item) => {
    return item.datasetFeedback.driftSignals?.includes('projectStateSameHerSelfLineDrift') === true
  })
  if (projectStateSameHerSelfLineDriftDetected) {
    const projectStateAuditSummary = input.results
      .map(item => item.datasetFeedback.projectStateAuditSummary ?? null)
      .find(Boolean)
    advice.focusDimensions = uniqueList([
      ...advice.focusDimensions,
      'projectStateSameHerSelfLineDrift',
      'sameHerSelfLineCarry',
      'avoidGenericProjectShell',
      (projectStateAuditSummary?.richPreDialogueAwarenessTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.sameHerSummaryTurnCount ?? 0)
        ? 'projectStateRichAwarenessCarry'
        : null,
    ], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.1
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.07
    advice.surfaceAdjustments.provenanceLabelBias += 0.04
    advice.personStateAdjustments.closenessCapBias += 0.04
    advice.notes.push('Replay still carried project-state continuity, but the identity-continuity line degraded into generic guidance and the reply slipped toward a generic project shell instead of stable continuity, so self-line-grade continuity should stay explicit through ranking, rewrite preservation, and final surface realization.')
    if ((projectStateAuditSummary?.richPreDialogueAwarenessTurnCount ?? 0) < Math.max(1, projectStateAuditSummary?.sameHerSummaryTurnCount ?? 0)) {
      advice.notes.push('The richer pre-dialogue continuity awareness line also degraded before reply wording formed, so future turns should preserve identity-continuity wording earlier instead of letting it collapse into a thinner project reminder.')
    }
    advice.notes.push('Until that drift is gone, later replies should stay more inward-first, delay warmth until after payoff, and avoid sounding like a detached project narrator.')
  }

  const runtimeSameHerRepairTargets = input.results.flatMap((item) => {
    return item.datasetFeedback.runtimeSamplingEvidence?.repairTargets ?? []
  })
  if (runtimeSameHerRepairTargets.length > 0) {
    const runtimeSameHerRepairLanes = uniqueList(runtimeSameHerRepairTargets.map(target => target.lane), 4)
    const missingTurnCount = runtimeSameHerRepairTargets.reduce((sum, target) => sum + Math.max(0, Number(target.missingTurnCount) || 0), 0)
    const missingTransitionCount = runtimeSameHerRepairTargets.reduce((sum, target) => sum + Math.max(0, Number(target.missingTransitionCount) || 0), 0)
    const hasMemoryGap = runtimeSameHerRepairLanes.includes('memory')
    const hasInitiativeOrExecutionGap = runtimeSameHerRepairLanes.includes('initiativeOrExecution')
    const hasEmotionGap = runtimeSameHerRepairLanes.includes('emotion')
    const hasEmbodimentGap = runtimeSameHerRepairLanes.includes('embodiment')
    advice.focusDimensions = uniqueList([
      ...advice.focusDimensions,
      'runtimeSameHerRepairTargets',
      hasInitiativeOrExecutionGap ? 'runtimeSameHerInitiativeExecutionCausality' : null,
      hasEmotionGap ? 'runtimeSameHerEmotionalCausality' : null,
      hasEmbodimentGap ? 'runtimeSameHerEmbodimentCausality' : null,
      hasMemoryGap || hasEmbodimentGap ? 'sameHerSelfLineCarry' : null,
      hasMemoryGap || hasInitiativeOrExecutionGap || hasEmbodimentGap ? 'projectStateRichAwarenessCarry' : null,
      hasEmotionGap ? 'projectStateEmotionalClosureCarry' : null,
    ], memoryTuningFocusDimensionMaxItems)
    if (hasMemoryGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.06
      advice.retrievalAdjustments.temporalWindowBias += 0.04
      advice.surfaceAdjustments.provenanceLabelBias += 0.03
    }
    if (hasInitiativeOrExecutionGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.04
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.05
      advice.personStateAdjustments.repairWindowBias += 0.04
      advice.notes.push('Runtime initiative/execution repair should make proactive opening, execution callback, and learning feedback explicitly follow from the recalled memory closure instead of appearing as detached task handling.')
    }
    if (hasEmotionGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.04
      advice.surfaceAdjustments.inwardCarryBias += 0.08
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
      advice.personStateAdjustments.closenessCapBias += 0.04
      advice.notes.push('Runtime emotional repair should keep emotional afterglow causally tied to prior recall and execution feedback, with lower-pressure carry instead of a fresh mood reset.')
    }
    if (hasEmbodimentGap) {
      advice.surfaceAdjustments.inwardCarryBias += 0.06
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.03
      advice.personStateAdjustments.closenessCapBias += 0.03
      advice.notes.push('Runtime embodiment repair should make voice, face, motion, lipsync, and body derive from the same recalled state so expression remains one body-line rather than a skin-layer recap.')
    }
    advice.notes.push(`runtime_continuity_gap; lanes=${runtimeSameHerRepairLanes.map(describeRuntimeSameHerLane).join(',')}; turn_gap=${missingTurnCount}; transition_gap=${missingTransitionCount}; owner=memory-quality-harness; action=preserve_memory_initiative_execution_emotion_embodiment_causality`)
  }

  const failedMemoryClosureLongRuns = input.results
    .map(item => item.datasetFeedback.memoryClosureLongRun ?? null)
    .filter((report): report is AlicizationMemoryClosureLongRunReport => report?.status === 'insufficient')
  if (failedMemoryClosureLongRuns.length > 0) {
    const failureReasons = uniqueList(failedMemoryClosureLongRuns.flatMap(report => report.failureReasons), 6)
    const missingLanes = uniqueList(
      failedMemoryClosureLongRuns.flatMap(report => report.turnDiagnostics.flatMap(turn => turn.missingLanes)),
      6,
    ) as AlicizationMemoryClosureLongRunLane[]
    const missingLaneLabels = uniqueList(missingLanes.map(describeMemoryClosureLongRunLane), 6)
    const hasCausalIdentityGap = failureReasons.includes('missing-causal-memory-identity')
    const hasLaneCarryGap = failureReasons.includes('missing-memory-closure-lanes') || missingLanes.length > 0
    const hasIdentityContinuityGap = failureReasons.includes('missing-memory-identity-continuity')
      || failedMemoryClosureLongRuns.some(report => !report.stableMemoryIdentity || report.transitionBreaks.length > 0)
    const hasRecallGap = hasCausalIdentityGap || hasIdentityContinuityGap || missingLanes.includes('recall')
    const hasInitiativeExecutionGap = missingLanes.includes('initiative') || missingLanes.includes('execution')
    const hasEmotionGap = missingLanes.includes('emotion')
    const hasEmbodimentGap = missingLanes.includes('embodiment') || missingLanes.includes('embodiment-expression')

    advice.focusDimensions = uniqueList([
      ...advice.focusDimensions,
      'runtimeMemoryClosureLongRun',
      hasCausalIdentityGap ? 'runtimeMemoryClosureCausalIdentity' : null,
      hasLaneCarryGap ? 'runtimeMemoryClosureLaneCarry' : null,
      hasIdentityContinuityGap ? 'runtimeMemoryClosureIdentityContinuity' : null,
      hasInitiativeExecutionGap ? 'runtimeSameHerInitiativeExecutionCausality' : null,
      hasEmotionGap ? 'runtimeSameHerEmotionalCausality' : null,
      hasEmbodimentGap ? 'runtimeSameHerEmbodimentCausality' : null,
      hasRecallGap || hasEmbodimentGap ? 'sameHerSelfLineCarry' : null,
      hasRecallGap || hasInitiativeExecutionGap || hasEmbodimentGap ? 'projectStateRichAwarenessCarry' : null,
      hasEmotionGap ? 'projectStateEmotionalClosureCarry' : null,
    ], memoryTuningFocusDimensionMaxItems)

    if (hasCausalIdentityGap || hasRecallGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.06
      advice.retrievalAdjustments.temporalWindowBias += 0.06
      advice.surfaceAdjustments.provenanceLabelBias += 0.03
      advice.notes.push('Replay memory closure long-run lacks downstream causal memory identity, so future closure must come from memoryClosureCausality.memoryIdentity instead of route-chain text or visible reply wording.')
    }
    if (hasLaneCarryGap) {
      advice.surfaceAdjustments.inwardCarryBias += 0.06
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.04
      advice.notes.push(`Memory closure lane carry is missing across ${missingLaneLabels.join(', ') || 'required downstream lanes'}, so initiative/execution, emotion, and embodiment should carry the recalled memory closure before the run is treated as stable continuity.`)
    }
    if (hasInitiativeExecutionGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.04
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.04
      advice.personStateAdjustments.repairWindowBias += 0.04
    }
    if (hasEmotionGap) {
      advice.surfaceAdjustments.inwardCarryBias += 0.04
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.03
      advice.personStateAdjustments.closenessCapBias += 0.04
    }
    if (hasEmbodimentGap) {
      advice.surfaceAdjustments.inwardCarryBias += 0.04
      advice.personStateAdjustments.closenessCapBias += 0.03
    }
    if (hasIdentityContinuityGap) {
      advice.retrievalAdjustments.temporalWindowBias += 0.04
      advice.personStateAdjustments.repairWindowBias += 0.04
      advice.notes.push('Memory closure long-run broke stable memory identity across turns, so later proactive opening, callback, emotion, and body expression should preserve one memory identity key instead of switching closure sources mid-run.')
    }
  }

  const stableCadenceInternalization = input.results.some((item) => {
    const standards = item.standards
    const cadenceRegression = Number(item.telemetryPatch.retrievalHealth.relationshipCadenceRegressionRate ?? 1)
    return standards.dialogueRhythmStability === 'pass'
      && standards.relationshipDistanceJumpRate === 'pass'
      && cadenceRegression <= 0.1
  })
  if (stableCadenceInternalization) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'internalizeRelationshipCadence'], memoryTuningFocusDimensionMaxItems)
    advice.notes.push('Relationship cadence reconfirmation stayed stable across replay, so measured-return timing is ready to be internalized as durable relationship rhythm.')
  }

  const templateLeakageFailCount = input.results.reduce((sum, item) => {
    return sum + Number(item.telemetryPatch.retrievalHealth.templateLeakageFailCount ?? 0)
  }, 0)
  if (failingKeys.includes('templateLeakage') || templateLeakageFailCount > 0) {
    advice.surfaceAdjustments.inwardCarryBias += 0.12
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.08
    advice.surfaceAdjustments.provenanceLabelBias += 0.04
    advice.notes.push('Template leakage appeared, so remembered wording should stay inward unless the payoff clearly needs it.')
  }

  advice.retrievalAdjustments.proceduralBoost = clamp01(advice.retrievalAdjustments.proceduralBoost)
  advice.retrievalAdjustments.relationshipBoost = clamp01(advice.retrievalAdjustments.relationshipBoost)
  advice.retrievalAdjustments.temporalWindowBias = clamp01(advice.retrievalAdjustments.temporalWindowBias)
  advice.retrievalAdjustments.wrongThreadPenalty = clamp01(advice.retrievalAdjustments.wrongThreadPenalty)
  advice.surfaceAdjustments.inwardCarryBias = clamp01(advice.surfaceAdjustments.inwardCarryBias)
  advice.surfaceAdjustments.delayUntilAfterPayoffBias = clamp01(advice.surfaceAdjustments.delayUntilAfterPayoffBias)
  advice.surfaceAdjustments.provenanceLabelBias = clamp01(advice.surfaceAdjustments.provenanceLabelBias)
  advice.surfaceAdjustments.specificityClampBias = clamp01(advice.surfaceAdjustments.specificityClampBias)
  advice.personStateAdjustments.repairWindowBias = clamp01(advice.personStateAdjustments.repairWindowBias)
  advice.personStateAdjustments.closenessCapBias = clamp01(advice.personStateAdjustments.closenessCapBias)
  advice.notes = uniqueList(advice.notes, 12)

  return advice
}

export function parseMemoryTuningAdvice(raw: string | undefined) {
  if (!raw)
    return null
  try {
    const parsed = JSON.parse(raw) as Partial<AlicizationMemoryTuningAdvice>
    if (parsed?.version !== 'memory-tuning-advice-v1')
      return null
    return {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: Number(parsed.updatedAt ?? 0),
      sourceReportAt: Number(parsed.sourceReportAt ?? 0),
      focusDimensions: uniqueList(
        (parsed.focusDimensions ?? []).filter((dimension) => {
          return typeof dimension === 'string' && memoryTuningFocusDimensionSchema.has(dimension)
        }),
        memoryTuningFocusDimensionMaxItems,
      ),
      staleSelfModelVetoRate: clamp01(Number((parsed as any).staleSelfModelVetoRate ?? 0)),
      relationshipEraConfusionRate: clamp01(Number((parsed as any).relationshipEraConfusionRate ?? 0)),
      quietCompanionshipCoverage: clamp01(Number((parsed as any).quietCompanionshipCoverage ?? 0)),
      silentPresenceNuisanceRate: clamp01(Number((parsed as any).silentPresenceNuisanceRate ?? 0)),
      continuityMindCarryRate: clamp01(Number((parsed as any).continuityMindCarryRate ?? 0)),
      retrievalAdjustments: {
        proceduralBoost: clamp01(Number(parsed.retrievalAdjustments?.proceduralBoost ?? 0)),
        relationshipBoost: clamp01(Number(parsed.retrievalAdjustments?.relationshipBoost ?? 0)),
        temporalWindowBias: clamp01(Number(parsed.retrievalAdjustments?.temporalWindowBias ?? 0)),
        wrongThreadPenalty: clamp01(Number(parsed.retrievalAdjustments?.wrongThreadPenalty ?? 0)),
      },
      surfaceAdjustments: {
        inwardCarryBias: clamp01(Number(parsed.surfaceAdjustments?.inwardCarryBias ?? 0)),
        delayUntilAfterPayoffBias: clamp01(Number(parsed.surfaceAdjustments?.delayUntilAfterPayoffBias ?? 0)),
        provenanceLabelBias: clamp01(Number(parsed.surfaceAdjustments?.provenanceLabelBias ?? 0)),
        specificityClampBias: clamp01(Number(parsed.surfaceAdjustments?.specificityClampBias ?? 0)),
      },
      personStateAdjustments: {
        repairWindowBias: clamp01(Number(parsed.personStateAdjustments?.repairWindowBias ?? 0)),
        closenessCapBias: clamp01(Number(parsed.personStateAdjustments?.closenessCapBias ?? 0)),
      },
      notes: uniqueList(parsed.notes ?? [], 12),
    } satisfies AlicizationMemoryTuningAdvice
  }
  catch {
    return null
  }
}

export function applyMemoryTuningAdviceToHostPersonModel(input: {
  hostPersonModel: AlicizationHostPersonModelSnapshot | null
  tuningAdvice: AlicizationMemoryTuningAdvice | null
}) {
  const hostPersonModel = input.hostPersonModel ?? null
  const tuningAdvice = input.tuningAdvice ?? null
  if (!hostPersonModel || !tuningAdvice)
    return hostPersonModel

  return {
    ...hostPersonModel,
    preferredClosenessByContext: hostPersonModel.preferredClosenessByContext.map((item) => {
      const confidenceBias = item.context === 'repair-window'
        ? tuningAdvice.personStateAdjustments.repairWindowBias
        : item.context === 'focused-work'
          ? tuningAdvice.personStateAdjustments.closenessCapBias
          : 0
      if (confidenceBias <= 0)
        return item
      return {
        ...item,
        confidence: clamp01(item.confidence + confidenceBias * 0.2),
      }
    }),
  }
}
