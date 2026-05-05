import { describe, expect, it } from 'vitest'

import { learningArtifactLedgerRecordFromMindTurnEvent } from './alicization-learning-artifact-ledger'

describe('alicization-learning-artifact-ledger', () => {
  it('projects learning-executed event payloads into durable artifact ledger records', () => {
    const record = learningArtifactLedgerRecordFromMindTurnEvent({
      id: 'event-1',
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'system',
      kind: 'learning-executed',
      payload: {
        taskId: 'task-1',
        action: 'verify',
        domain: 'world-model',
        resultSummary: 'Verified the claim and blocked internalization pending revalidation.',
        verificationBasis: ['trusted-source', 'existing-memory'],
        verifiedArtifact: {
          version: 'verified-learning-artifact-v1',
          artifactId: 'artifact-1',
          taskId: 'task-1',
          action: 'verify',
          domain: 'world-model',
          verifier: {
            kind: 'world-model-verifier',
            mayVerify: true,
            mayInternalize: false,
            mayValidateOnly: true,
            rollbackRequired: false,
            blockedReasons: ['revalidation-required'],
          },
          status: 'downgraded',
          producedAt: 123,
          claimGraph: {
            version: 'claim-evidence-graph-v1',
            producedAt: 123,
            claimId: 'claim-1',
            claim: 'screenReferenceMode accepts avoid',
            domain: 'world-model',
            supportingEvidence: [],
            contradictingEvidence: [],
            supersededBy: [],
            currentBelief: 'screenReferenceMode accepts avoid',
            validationState: 'validated',
            sourceTrust: 0.82,
            lastRevalidatedAt: 123,
            revalidationPolicy: {
              shouldRevalidate: true,
              nextRevalidationAt: 456,
              expiredSourceIds: [],
              reasonTags: ['world-model-revalidation-required'],
            },
            internalizationDecision: {
              mayInternalize: false,
              mayValidateOnly: true,
              blockedReasons: ['revalidation-required'],
            },
          },
          verificationBasis: ['trusted-source'],
          supportingFactIds: ['fact-1'],
          contradictionFactIds: [],
          internalizationStage: 'validated-knowledge',
          reason: 'validation remained provisional',
        },
      },
      createdAt: 123,
    })

    expect(record).toEqual(expect.objectContaining({
      decisionTraceId: 'trace-1',
      taskId: 'task-1',
      action: 'verify',
      domain: 'world-model',
      verificationBasis: ['trusted-source', 'existing-memory'],
      verifiedArtifact: expect.objectContaining({
        artifactId: 'artifact-1',
        status: 'downgraded',
      }),
    }))
  })
})
