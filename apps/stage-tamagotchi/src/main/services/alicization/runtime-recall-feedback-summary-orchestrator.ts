import type { AlicizationMemoryReflectionRecord } from '../../../shared/eventa'

import { createAlicizationRecallFeedbackSummaryRuntime } from './memory-os/feedback-summary-runtime'

export interface AlicizationRecallFeedbackSummaryOrchestrator {
  refresh: () => Promise<void>
}

export function createAlicizationRecallFeedbackSummaryOrchestrator(options: {
  now: () => number
  readReflections: () => Promise<AlicizationMemoryReflectionRecord[]>
  writeSummary: (serialized: string) => Promise<void>
}): AlicizationRecallFeedbackSummaryOrchestrator {
  const runtime = createAlicizationRecallFeedbackSummaryRuntime({
    now: options.now,
    readReflections: options.readReflections,
    writeSummary: async (summary) => {
      await options.writeSummary(JSON.stringify(summary))
    },
  })

  return {
    refresh: async () => {
      await runtime.refresh()
    },
  }
}
