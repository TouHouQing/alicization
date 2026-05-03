import type {
  AlicizationHostPersonModelSnapshot,
  AlicizationRunReplayBenchmarkResult,
} from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface AlicizationMemoryTuningAdvice {
  version: 'memory-tuning-advice-v1'
  source: 'nightly-replay-benchmark'
  updatedAt: number
  sourceReportAt: number
  focusDimensions: string[]
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
    const normalized = sanitizeText(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
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
  advice.notes = uniqueList(advice.notes, 8)

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
      focusDimensions: uniqueList(parsed.focusDimensions ?? [], 12),
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
      notes: uniqueList(parsed.notes ?? [], 8),
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

  const nextRepairTriggers = [...hostPersonModel.repairTriggers]
  if (tuningAdvice.personStateAdjustments.repairWindowBias >= 0.12)
    nextRepairTriggers.unshift('If the line still feels unstable, keep repair visibly ahead of closeness and remembered detail.')

  const nextCloseness = [...hostPersonModel.preferredClosenessByContext]
  if (tuningAdvice.personStateAdjustments.repairWindowBias >= 0.12 && !nextCloseness.some(item => item.context === 'repair-window')) {
    nextCloseness.unshift({
      context: 'repair-window',
      preference: 'Keep recollection and closeness lighter until the repair line has visibly landed.',
      confidence: clamp01(0.72 + tuningAdvice.personStateAdjustments.repairWindowBias * 0.2),
    })
  }

  if (tuningAdvice.personStateAdjustments.closenessCapBias >= 0.12 && !nextCloseness.some(item => item.context === 'focused-work')) {
    nextCloseness.unshift({
      context: 'focused-work',
      preference: 'Keep the answer low-pressure and do not let memory warmth outrun the host’s need for room.',
      confidence: clamp01(0.7 + tuningAdvice.personStateAdjustments.closenessCapBias * 0.2),
    })
  }

  return {
    ...hostPersonModel,
    summary: uniqueList([
      hostPersonModel.summary,
      tuningAdvice.notes[0] ?? '',
    ], 2).join(' '),
    repairTriggers: uniqueList(nextRepairTriggers, 6),
    preferredClosenessByContext: nextCloseness.slice(0, 6),
  }
}

export function applyMemoryTuningAdviceToSpeechPlan(input: {
  speechPlan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined
  memoryDeliberation: OrganicMemoryPromptContext['memoryDeliberation'] | null | undefined
  tuningAdvice: AlicizationMemoryTuningAdvice | null | undefined
}) {
  const speechPlan = input.speechPlan ?? null
  const memoryDeliberation = input.memoryDeliberation ?? null
  const tuningAdvice = input.tuningAdvice ?? null
  if (!speechPlan || !memoryDeliberation || !tuningAdvice)
    return speechPlan

  let next = { ...speechPlan }
  const ambiguity = memoryDeliberation.ambiguityPosture ?? 'settled'
  const conflictSeverity = memoryDeliberation.conflictSeverity ?? 'none'
  const highConflict = ambiguity === 'ambiguous' || conflictSeverity === 'high'
  const moderateConflict = highConflict || ambiguity === 'approximate' || conflictSeverity === 'medium'

  if (tuningAdvice.surfaceAdjustments.delayUntilAfterPayoffBias >= 0.12 && next.shouldSurface && next.placement === 'before-payoff' && moderateConflict) {
    next = {
      ...next,
      placement: 'after-payoff',
      styleNote: uniqueList([
        next.styleNote,
        'Let the live payoff land before remembered continuity comes forward.',
      ], 2).join(' '),
    }
  }

  if (tuningAdvice.surfaceAdjustments.inwardCarryBias >= 0.16 && highConflict) {
    next = {
      ...next,
      shouldSurface: false,
      placement: 'internal-only',
      visibleLead: null,
      styleNote: uniqueList([
        next.styleNote,
        'Keep recollection inward until the competing memory pressure settles.',
      ], 2).join(' '),
    }
  }

  if ((tuningAdvice.surfaceAdjustments.provenanceLabelBias >= 0.1 || tuningAdvice.surfaceAdjustments.specificityClampBias >= 0.1) && next.certainty === 'firm' && moderateConflict) {
    next = {
      ...next,
      certainty: 'approximate',
    }
  }

  return next
}
