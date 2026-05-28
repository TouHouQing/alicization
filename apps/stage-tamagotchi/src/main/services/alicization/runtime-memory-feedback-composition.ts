import { createAlicizationMemoryRetrievalTelemetryRuntime } from './memory-retrieval-telemetry'
import { createAlicizationRecallFeedbackSummaryOrchestrator } from './runtime-recall-feedback-summary-orchestrator'

export function createAlicizationRuntimeMemoryFeedbackComposition(input: {
  now: () => number
  activeCardId: string
  summaryMetaKey: string
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
    listMemoryReflections: (input: {
      cardId: string
      limit?: number
    }) => Promise<any[]>
  }
}) {
  const memoryRetrievalTelemetryRuntime = createAlicizationMemoryRetrievalTelemetryRuntime({
    now: input.now,
    key: 'memory_retrieval_telemetry_v1',
    getMetaValue: async key => await input.alicizationDb.getMetaValue(key),
    upsertMeta: async (key, value) => await input.alicizationDb.setMetaValue(key, value),
    enqueueWrite: async task => await task(),
  })

  const recallFeedbackSummaryOrchestrator = createAlicizationRecallFeedbackSummaryOrchestrator({
    now: input.now,
    readReflections: async () => await input.alicizationDb.listMemoryReflections({ cardId: input.activeCardId, limit: 64 }).catch(() => []),
    writeSummary: async serialized => await input.alicizationDb.setMetaValue(
      input.summaryMetaKey,
      serialized,
    ),
  })

  async function getRecallFeedbackSummary() {
    const raw = await input.alicizationDb.getMetaValue(input.summaryMetaKey).catch(() => undefined)
    if (!raw)
      return null
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? parsed as any
      : null
  }

  return {
    memoryRetrievalTelemetryRuntime,
    recallFeedbackSummaryOrchestrator,
    getRecallFeedbackSummary,
  }
}
