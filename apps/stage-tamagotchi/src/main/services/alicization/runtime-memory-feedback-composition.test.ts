import { describe, expect, it } from 'vitest'

import { createAlicizationRuntimeMemoryFeedbackComposition } from './runtime-memory-feedback-composition'

describe('runtime memory feedback composition', () => {
  it('returns null instead of throwing when persisted recall feedback summary is malformed json', async () => {
    const composition = createAlicizationRuntimeMemoryFeedbackComposition({
      now: () => 100,
      activeCardId: 'card-1',
      summaryMetaKey: 'memory_recall_feedback_summary_v1',
      alicizationDb: {
        getMetaValue: async key => key === 'memory_recall_feedback_summary_v1'
          ? '{not-valid-json'
          : undefined,
        setMetaValue: async () => {},
        listMemoryReflections: async () => [],
      },
    })

    await expect(composition.getRecallFeedbackSummary()).resolves.toBeNull()
  })
})
