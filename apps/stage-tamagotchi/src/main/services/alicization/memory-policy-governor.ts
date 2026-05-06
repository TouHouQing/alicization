import type { AlicizationMemoryRetrievalBudgetClass, AlicizationMemoryRetrievalTelemetrySnapshot } from './memory-retrieval-telemetry'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

export interface AlicizationOnlineMemoryPolicy {
  version: 'online-memory-policy-v1'
  enabled: true
  budgetClassOverride: AlicizationMemoryRetrievalBudgetClass | null
  topKMultiplier: number
  cacheTtlMultiplier: number
  verificationStrictness: 'normal' | 'strict' | 'quarantine'
  wrongThreadSuppressionBias: number
  provenanceLabelingBias: number
  sourceWeights: {
    episodic: number
    consolidation: number
    conversation: number
  }
  reasonCodes: string[]
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value))
    return min
  return Math.max(min, Math.min(max, value))
}

function rounded(value: number) {
  return Number(value.toFixed(2))
}

function pushUnique(target: string[], value: string | null | undefined) {
  const normalized = typeof value === 'string'
    ? value.trim()
    : ''
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function deriveAlicizationOnlineMemoryPolicy(input: {
  budgetClass?: AlicizationMemoryRetrievalBudgetClass | null
  telemetry?: AlicizationMemoryRetrievalTelemetrySnapshot | null
  tuningAdvice?: AlicizationMemoryTuningAdvice | null
}): AlicizationOnlineMemoryPolicy {
  const telemetry = input.telemetry ?? null
  const tuningAdvice = input.tuningAdvice ?? null
  const reasons: string[] = []
  const wrongThreadPressure = clamp(
    Math.max(
      telemetry?.wrongThreadRate ?? 0,
      1 - (telemetry?.wrongThreadSuppression ?? 1),
      tuningAdvice?.retrievalAdjustments.wrongThreadPenalty ?? 0,
    ),
    0,
    1,
  )
  const recallPressure = clamp(1 - Math.max(telemetry?.recallAt3 ?? 0, telemetry?.recallHitRate ?? 0), 0, 1)
  const precisionPressure = clamp(1 - (telemetry?.precisionAt3 ?? 1), 0, 1)
  const latencyFailing = telemetry?.latencyBudgetPass === false
    || telemetry?.budgetLatencyTelemetry?.[input.budgetClass ?? 'realtime-reply']?.gateStatus === 'fail'

  if (wrongThreadPressure >= 0.25)
    pushUnique(reasons, 'wrong-thread-pressure')
  if (recallPressure >= 0.35)
    pushUnique(reasons, 'low-recall')
  if (precisionPressure >= 0.25)
    pushUnique(reasons, 'low-precision')
  if (latencyFailing)
    pushUnique(reasons, 'latency-budget-failing')
  if ((telemetry?.misinternalizationRate ?? 0) >= 0.12)
    pushUnique(reasons, 'learning-misinternalization-pressure')
  for (const reason of telemetry?.learningPolicyReasonCodes ?? [])
    pushUnique(reasons, `learning:${reason}`)

  const budgetClassOverride: AlicizationMemoryRetrievalBudgetClass | null = latencyFailing
    ? 'realtime-reply'
    : recallPressure >= 0.45 && input.budgetClass === 'realtime-reply'
      ? 'deep-recall-reply'
      : null
  const strictness = wrongThreadPressure >= 0.42
    || (telemetry?.misinternalizationRate ?? 0) >= 0.18
    || (telemetry?.learningPolicyStrictnessBias ?? 0) >= 0.28
    ? 'quarantine'
    : wrongThreadPressure >= 0.2
        || precisionPressure >= 0.22
        || (tuningAdvice?.surfaceAdjustments.specificityClampBias ?? 0) >= 0.14
        || (telemetry?.learningPolicyStrictnessBias ?? 0) >= 0.12
      ? 'strict'
      : 'normal'

  const proceduralBoost = tuningAdvice?.retrievalAdjustments.proceduralBoost ?? 0
  const relationshipBoost = tuningAdvice?.retrievalAdjustments.relationshipBoost ?? 0
  const temporalBoost = tuningAdvice?.retrievalAdjustments.temporalWindowBias ?? 0
  const suppressionBias = clamp(
    wrongThreadPressure
    + (tuningAdvice?.retrievalAdjustments.wrongThreadPenalty ?? 0)
    + (telemetry?.learningPolicyWrongThreadSuppressionBias ?? 0)
    + (telemetry?.falsePositiveSuppressionRate ?? 0) * -0.3,
    0,
    1,
  )

  return {
    version: 'online-memory-policy-v1',
    enabled: true,
    budgetClassOverride,
    topKMultiplier: rounded(clamp(1 + recallPressure * 0.45 - (latencyFailing ? 0.25 : 0), 0.7, 1.6)),
    cacheTtlMultiplier: rounded(clamp(latencyFailing ? 1.5 : 1 - wrongThreadPressure * 0.35, 0.55, 1.8)),
    verificationStrictness: strictness,
    wrongThreadSuppressionBias: rounded(suppressionBias),
    provenanceLabelingBias: rounded(clamp(
      (tuningAdvice?.surfaceAdjustments.provenanceLabelBias ?? 0)
      + wrongThreadPressure * 0.35
      + precisionPressure * 0.25
      + (telemetry?.learningPolicyProvenanceLabelBias ?? 0),
      0,
      1,
    )),
    sourceWeights: {
      episodic: rounded(clamp(1 + temporalBoost * 0.25 - suppressionBias * 0.2, 0.65, 1.35)),
      consolidation: rounded(clamp(1 + proceduralBoost * 0.35 + relationshipBoost * 0.25, 0.75, 1.45)),
      conversation: rounded(clamp(1 + recallPressure * 0.2 - wrongThreadPressure * 0.18, 0.7, 1.3)),
    },
    reasonCodes: reasons,
  }
}
