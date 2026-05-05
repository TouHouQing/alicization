import { describe, expect, it } from 'vitest'

import {
  deriveAlicizationLearningLifecycleState,
  deriveAlicizationLearningPolicyFeedback,
  deriveNextAlicizationLearningLifecycleState,
} from './learning-state-machine'

describe('learning-state-machine', () => {
  it('routes verify tasks with revalidation pressure into the revalidation state', () => {
    const state = deriveAlicizationLearningLifecycleState({
      task: {
        action: 'verify',
      } as any,
      verifiedArtifact: {
        claimGraph: {
          revalidationPolicy: {
            shouldRevalidate: true,
          },
        },
      } as any,
    })

    expect(state).toBe('revalidation')
  })

  it('raises strict feedback when rollback pressure appears', () => {
    const feedback = deriveAlicizationLearningPolicyFeedback({
      state: 'rollback-downgrade',
      domain: 'relationship',
      result: {
        status: 'downgraded',
      },
      verifiedArtifact: {
        status: 'rollback-required',
        claimGraph: {
          revalidationPolicy: {
            shouldRevalidate: true,
          },
        },
      } as any,
    })
    const nextState = deriveNextAlicizationLearningLifecycleState({
      currentState: 'rollback-downgrade',
      result: {
        status: 'downgraded',
      },
      verifiedArtifact: {
        status: 'rollback-required',
      } as any,
    })

    expect(feedback.strictnessBias).toBeGreaterThan(0.3)
    expect(feedback.reasonCodes).toContain('rollback-pressure')
    expect(nextState).toBe('rollback-downgrade')
  })
})
