import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseSurfaceLearningRules } from './response-surface-learning-rules'

describe('response-surface-learning-rules', () => {
  it('constrains visible certainty during verify phase', () => {
    const result = buildAlicizationResponseSurfaceLearningRules({
      currentTaskId: 'verify-1',
      currentStatus: 'running',
      currentAttemptCount: 0,
      currentMaxAttempts: 3,
      currentNextRetryAt: null,
      currentBlockedReason: null,
      currentFailureKind: null,
      nextLearningAction: 'verify',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: true,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: [],
      queuedTaskCount: 0,
      runningTaskCount: 1,
      blockedTaskCount: 0,
      recentTaskIds: [],
      lastCompletedTaskId: null,
      lastCompletedAction: null,
      lastCompletedSummary: null,
      lastFailureTaskId: null,
      lastFailureKind: null,
      lastFailureReason: null,
      lastFailureNextRetryAt: null,
      updatedAt: 1,
    })

    expect(result.mustDo).toContain('Keep visible certainty behind the current verification pass.')
    expect(result.mustNotDo).toContain('Do not let fluency or warmth outrun what is still being verified.')
  })
})
