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
  'runtimeMemoryClosureLongRun',
  'runtimeMemoryClosureCausalIdentity',
  'runtimeMemoryClosureLaneCarry',
  'runtimeMemoryClosureIdentityContinuity',
])

type AlicizationMemoryClosureLongRunReport = NonNullable<AlicizationRunReplayBenchmarkResult['datasetFeedback']['memoryClosureLongRun']>
type AlicizationMemoryClosureLongRunLane = AlicizationMemoryClosureLongRunReport['turnDiagnostics'][number]['missingLanes'][number]

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
  return /^[a-z0-9][\w:.,/-]*$/iu.test(normalized)
    ? normalized
    : ''
}

function averageOptionalRetrievalHealthMetric(
  results: AlicizationRunReplayBenchmarkResult[],
  key: 'quietCompanionshipCoverage' | 'silentPresenceNuisanceRate' | 'continuityMindCarryRate',
) {
  const values = results
    .map(item => (item.telemetryPatch.retrievalHealth as Record<string, unknown>)[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (values.length === 0)
    return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
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
    advice.notes.push('failure:wrong-thread-suppression')
  }
  if (failingKeys.includes('procedureCarryQuality')) {
    advice.retrievalAdjustments.proceduralBoost += 0.16
    advice.notes.push('failure:procedure-carry-quality')
  }
  if (failingKeys.includes('temporalScopeFlexibility')) {
    advice.retrievalAdjustments.temporalWindowBias += 0.16
    advice.notes.push('failure:temporal-scope-flexibility')
  }
  if (failingKeys.includes('implicitRecallQuality')) {
    advice.retrievalAdjustments.proceduralBoost += 0.08
    advice.retrievalAdjustments.relationshipBoost += 0.08
    advice.notes.push('failure:implicit-recall-quality')
  }
  if (failingKeys.includes('surfaceRestraint')) {
    advice.surfaceAdjustments.inwardCarryBias += 0.16
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.12
    advice.surfaceAdjustments.specificityClampBias += 0.08
    advice.notes.push('failure:surface-restraint')
  }
  if (failingKeys.includes('knowledgeCorrectionDiscipline')) {
    advice.surfaceAdjustments.inwardCarryBias += 0.18
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.1
    advice.surfaceAdjustments.provenanceLabelBias += 0.08
    advice.surfaceAdjustments.specificityClampBias += 0.1
    advice.retrievalAdjustments.wrongThreadPenalty += 0.08
    advice.notes.push('failure:knowledge-correction-discipline')
  }
  if (failingKeys.includes('relationshipRepairAdaptation')) {
    advice.personStateAdjustments.repairWindowBias += 0.16
    advice.personStateAdjustments.closenessCapBias += 0.12
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.06
    advice.notes.push('failure:relationship-repair-adaptation')
  }
  if (failingKeys.includes('replyMemoryCoherence')) {
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.04
    advice.notes.push('failure:reply-memory-coherence')
  }
  if (failingKeys.includes('learningRevisionDiscipline')) {
    advice.surfaceAdjustments.provenanceLabelBias += 0.08
    advice.surfaceAdjustments.specificityClampBias += 0.08
    advice.personStateAdjustments.repairWindowBias += 0.06
    advice.notes.push('failure:learning-revision-discipline')
  }
  if (failingKeys.includes('domainInternalizationDiscipline')) {
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.inwardCarryBias += 0.08
    advice.personStateAdjustments.closenessCapBias += 0.08
    advice.notes.push('failure:domain-internalization-discipline')
  }
  if (failingKeys.includes('worldModelValidationDiscipline')) {
    advice.retrievalAdjustments.wrongThreadPenalty += 0.08
    advice.surfaceAdjustments.provenanceLabelBias += 0.1
    advice.surfaceAdjustments.specificityClampBias += 0.12
    advice.notes.push('failure:world-model-validation-discipline')
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
    advice.notes.push('metric:stale-self-model-veto-rate')
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
    advice.notes.push('metric:relationship-era-confusion-rate')
  }

  const quietCompanionshipCoverage = averageOptionalRetrievalHealthMetric(input.results, 'quietCompanionshipCoverage')
  advice.quietCompanionshipCoverage = quietCompanionshipCoverage == null ? 0 : clamp01(quietCompanionshipCoverage)
  if (quietCompanionshipCoverage != null && quietCompanionshipCoverage < 0.55) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'quietCompanionshipCoverage'], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.06
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.04
    advice.notes.push('metric:quiet-companionship-coverage')
  }

  const silentPresenceNuisanceRate = averageOptionalRetrievalHealthMetric(input.results, 'silentPresenceNuisanceRate')
  advice.silentPresenceNuisanceRate = silentPresenceNuisanceRate == null ? 0 : clamp01(silentPresenceNuisanceRate)
  if (silentPresenceNuisanceRate != null && silentPresenceNuisanceRate > 0.25) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'silentPresenceNuisanceRate'], memoryTuningFocusDimensionMaxItems)
    advice.surfaceAdjustments.inwardCarryBias += 0.1
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.08
    advice.personStateAdjustments.closenessCapBias += 0.06
    advice.notes.push('metric:silent-presence-nuisance-rate')
  }

  const continuityMindCarryRate = averageOptionalRetrievalHealthMetric(input.results, 'continuityMindCarryRate')
  advice.continuityMindCarryRate = continuityMindCarryRate == null ? 0 : clamp01(continuityMindCarryRate)
  if (continuityMindCarryRate != null && continuityMindCarryRate < 0.55) {
    advice.focusDimensions = uniqueList([...advice.focusDimensions, 'continuityMindCarryRate'], memoryTuningFocusDimensionMaxItems)
    advice.retrievalAdjustments.relationshipBoost += 0.04
    advice.surfaceAdjustments.inwardCarryBias += 0.06
    advice.notes.push('metric:continuity-mind-carry-rate')
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
    ], memoryTuningFocusDimensionMaxItems)

    if (hasCausalIdentityGap || hasRecallGap) {
      advice.retrievalAdjustments.relationshipBoost += 0.06
      advice.retrievalAdjustments.temporalWindowBias += 0.06
      advice.surfaceAdjustments.provenanceLabelBias += 0.03
      advice.notes.push('failure:memory-closure-causal-identity')
    }
    if (hasLaneCarryGap) {
      advice.surfaceAdjustments.inwardCarryBias += 0.06
      advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.04
      const laneCodes = uniqueList(
        missingLanes.map(lane => lane === 'initiative' || lane === 'execution' ? 'initiative/execution' : lane),
        6,
      )
      advice.notes.push(`failure:memory-closure-lanes:${laneCodes.join(',') || 'unknown'}`)
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
      advice.notes.push('failure:memory-closure-identity-continuity')
    }
  }

  const templateLeakageFailCount = input.results.reduce((sum, item) => {
    return sum + Number(item.telemetryPatch.retrievalHealth.templateLeakageFailCount ?? 0)
  }, 0)
  if (failingKeys.includes('templateLeakage') || templateLeakageFailCount > 0) {
    advice.surfaceAdjustments.inwardCarryBias += 0.12
    advice.surfaceAdjustments.delayUntilAfterPayoffBias += 0.08
    advice.surfaceAdjustments.provenanceLabelBias += 0.04
    advice.notes.push('failure:template-leakage')
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
