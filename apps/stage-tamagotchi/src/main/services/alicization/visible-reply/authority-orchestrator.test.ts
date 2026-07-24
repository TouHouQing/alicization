import { describe, expect, it } from 'vitest'

import { buildAlicizationMindAuthoringFailureArtifact } from './authority-orchestrator'

describe('visible reply authority orchestrator', () => {
  it('wraps mind-authoring failures in the standard typed failure surface', () => {
    const artifact = buildAlicizationMindAuthoringFailureArtifact({
      stage: 'provider-recovery',
      reason: 'HTTP 401',
      turnId: 'turn-provider-auth',
      failureKind: 'provider-auth',
    })

    expect(artifact).toEqual(expect.objectContaining({
      origin: 'failure-surface',
      visibleReplyAuthority: 'non-human-authored-blocked',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface: expect.objectContaining({
        kind: 'provider-auth',
        origin: 'failure-surface',
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
        visibleReplySource: 'infrastructure-failure',
      }),
    }))
  })
})
