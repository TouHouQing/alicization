import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMemoryRecallFeedbackSample,
  createAlicizationMemoryRecallFeedbackRuntime,
  summarizeAlicizationMemoryRecallFeedback,
} from './recall-feedback-runtime'

describe('memory recall feedback runtime', () => {
  it('records sample-level recall and precision feedback instead of only aggregate telemetry', () => {
    const sample = buildAlicizationMemoryRecallFeedbackSample({
      turnId: 'turn-1',
      decisionTraceId: 'trace-1',
      expectedMemoryIds: ['mem-1', 'mem-2'],
      artifact: {
        candidates: {
          retrievalCandidateIds: ['mem-1', 'mem-3', 'wrong-thread-1'],
          selectedCandidateIds: ['mem-1', 'mem-3'],
        },
        competition: {
          wrongThreadCandidateIds: ['wrong-thread-1'],
        },
      } as any,
      judgeReason: 'mem-2 was missed; mem-3 was a false positive.',
      now: 100,
    })

    expect(sample.recallAt3).toBe(0.5)
    expect(sample.precisionAt3).toBe(0.5)
    expect(sample.missedIds).toEqual(['mem-2'])
    expect(sample.falsePositiveIds).toEqual(['mem-3'])
    expect(sample.wrongThreadIds).toEqual(['wrong-thread-1'])
    expect(sample.wrongThreadRate).toBeGreaterThan(0)
  })

  it('keeps bounded persisted samples and summarizes final gate metrics', async () => {
    let rows: ReturnType<typeof buildAlicizationMemoryRecallFeedbackSample>[] = []
    const runtime = createAlicizationMemoryRecallFeedbackRuntime({
      now: () => 200,
      readSamples: async () => rows,
      writeSamples: async (next) => {
        rows = next
      },
      maxSamples: 2,
    })

    await runtime.recordSample({
      turnId: 'turn-1',
      expectedMemoryIds: ['mem-1'],
      retrievedCandidateIds: ['mem-1'],
      surfacedMemoryIds: ['mem-1'],
    })
    await runtime.recordSample({
      turnId: 'turn-2',
      expectedMemoryIds: ['mem-2'],
      retrievedCandidateIds: ['mem-3'],
      surfacedMemoryIds: ['mem-3'],
    })

    const summary = await runtime.getSummary()
    expect(rows).toHaveLength(2)
    expect(summary).toEqual(expect.objectContaining({
      version: 'memory-recall-feedback-summary-v1',
      sampleCount: 2,
      recallAt3: 0.5,
      precisionAt3: 0.5,
    }))
    expect(summary.reasonCodes).toEqual(expect.arrayContaining([
      'memory-feedback:recall-below-final-gate',
      'memory-feedback:precision-below-final-gate',
    ]))
    expect(summarizeAlicizationMemoryRecallFeedback([]).reasonCodes).toContain('memory-feedback:no-samples')
  })
})
