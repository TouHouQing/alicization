import type { AlicizationMemoryReflectionRecord } from '../../../../shared/eventa'

import type { AlicizationMemoryRecallFeedbackSummary } from './recall-feedback-runtime'

function uniqueIds(values: Array<string | null | undefined>, maxItems = 64) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string'
      ? value.trim()
      : ''
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function round(value: number) {
  return Number(value.toFixed(2))
}

export function createAlicizationRecallFeedbackSummaryRuntime(options: {
  now: () => number
  readReflections: () => Promise<AlicizationMemoryReflectionRecord[]>
  writeSummary: (summary: AlicizationMemoryRecallFeedbackSummary & { updatedAt: number }) => Promise<void>
}) {
  async function refresh() {
    const reflections = await options.readReflections().catch(() => [])
    const sampleCount = reflections.length
    const confirmed = reflections.filter(item => item.status === 'confirmed')
    const deniedOrSuperseded = reflections.filter(item => item.status === 'denied' || item.status === 'superseded')
    const sourceKinds = uniqueIds(reflections.map(item => item.sourceKind ?? null), 8)
    const targetScopes = uniqueIds(reflections.map(item => item.targetScope ?? null), 8)

    const confirmedSignals = confirmed.flatMap(item => item.supportingFactIds ?? [])
    const deniedSignals = reflections
      .filter(item => item.status === 'denied')
      .flatMap(item => item.supportingFactIds ?? [])
    const supersededSignals = reflections
      .filter(item => item.status === 'superseded')
      .flatMap(item => item.supportingFactIds ?? [])
    const suppressedSignals = [...deniedSignals, ...supersededSignals]
    const recallAt3 = sampleCount <= 0 ? 0 : round(confirmed.length / sampleCount)
    const precisionAt3 = sampleCount <= 0 ? 0 : round(Math.max(0, confirmed.length - deniedOrSuperseded.length * 0.5) / sampleCount)

    const summary = {
      version: 'memory-recall-feedback-summary-v1' as const,
      sampleCount,
      recallAt3,
      precisionAt3,
      wrongThreadRate: 0,
      missedIds: [],
      falsePositiveIds: uniqueIds(suppressedSignals, 32),
      wrongThreadIds: [],
      sourceKinds,
      targetScopes,
      confirmedFactIds: uniqueIds(confirmedSignals, 32),
      deniedFactIds: uniqueIds(deniedSignals, 32),
      supersededFactIds: uniqueIds(supersededSignals, 32),
      reasonCodes: uniqueIds([
        'recall-feedback:reflection-signals-applied',
        confirmed.length > 0 ? 'recall-feedback:confirmed-reflection-present' : null,
        deniedOrSuperseded.some(item => item.status === 'denied') ? 'recall-feedback:denied-reflection-present' : null,
        deniedOrSuperseded.some(item => item.status === 'superseded') ? 'recall-feedback:superseded-reflection-present' : null,
        ...sourceKinds.map(item => `recall-feedback:source-kind:${item}`),
        ...targetScopes.map(item => `recall-feedback:target-scope:${item}`),
        sampleCount <= 0 ? 'memory-feedback:no-samples' : null,
        recallAt3 < 0.9 ? 'memory-feedback:recall-below-final-gate' : null,
        precisionAt3 < 0.86 ? 'memory-feedback:precision-below-final-gate' : null,
        suppressedSignals.length > 0 ? 'memory-feedback:false-positive-memory' : null,
        confirmedSignals.length <= 0 && sampleCount > 0 ? 'memory-feedback:missed-expected-memory' : null,
      ], 16),
      updatedAt: options.now(),
    }

    await options.writeSummary(summary)
    return summary
  }

  return {
    refresh,
  }
}
