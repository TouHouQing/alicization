import type { AlicizationLearningArtifactLedgerRecord } from './alicization-learning-artifact-ledger'

import { describe, expect, it } from 'vitest'

import {

  filterLearningArtifactLedgerRecords,
  learningArtifactLedgerRecordFromMindTurnEvent,
} from './alicization-learning-artifact-ledger'

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
      artifactId: 'artifact-1',
      claimId: 'claim-1',
      action: 'verify',
      domain: 'world-model',
      verificationBasis: ['trusted-source', 'existing-memory'],
      sourceFactIds: ['fact-1'],
      verifiedArtifact: expect.objectContaining({
        artifactId: 'artifact-1',
        status: 'downgraded',
      }),
    }))
  })

  it('filters durable ledger records by claim, artifact, task, source fact, and decision trace', () => {
    const records = [
      learningArtifactLedgerRecordFromMindTurnEvent({
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
              blockedReasons: [],
            },
            status: 'verified',
            producedAt: 100,
            claimGraph: {
              version: 'claim-evidence-graph-v1',
              producedAt: 100,
              claimId: 'claim-1',
              claim: 'alpha',
              domain: 'world-model',
              supportingEvidence: [],
              contradictingEvidence: [],
              supersededBy: [],
              currentBelief: 'alpha',
              validationState: 'validated',
              sourceTrust: 0.9,
              lastRevalidatedAt: 100,
              revalidationPolicy: {
                shouldRevalidate: false,
                nextRevalidationAt: null,
                expiredSourceIds: [],
                reasonTags: [],
              },
              internalizationDecision: {
                mayInternalize: true,
                mayValidateOnly: false,
                blockedReasons: [],
              },
            },
            verificationBasis: [],
            supportingFactIds: ['fact-1', 'fact-2'],
            contradictionFactIds: [],
            internalizationStage: 'validated-knowledge',
            reason: 'ok',
          },
        },
        createdAt: 100,
      }),
      learningArtifactLedgerRecordFromMindTurnEvent({
        id: 'event-2',
        decisionTraceId: 'trace-2',
        turnId: 'turn-2',
        sessionId: 'session-2',
        origin: 'system',
        kind: 'learning-executed',
        payload: {
          taskId: 'task-2',
          action: 'revise',
          domain: 'relationship',
          verifiedArtifact: {
            version: 'verified-learning-artifact-v1',
            artifactId: 'artifact-2',
            taskId: 'task-2',
            action: 'revise',
            domain: 'relationship',
            verifier: {
              kind: 'relationship-verifier',
              mayVerify: true,
              mayInternalize: true,
              mayValidateOnly: false,
              rollbackRequired: false,
              blockedReasons: [],
            },
            status: 'verified',
            producedAt: 200,
            claimGraph: {
              version: 'claim-evidence-graph-v1',
              producedAt: 200,
              claimId: 'claim-2',
              claim: 'beta',
              domain: 'relationship',
              supportingEvidence: [],
              contradictingEvidence: [],
              supersededBy: [],
              currentBelief: 'beta',
              validationState: 'validated',
              sourceTrust: 0.88,
              lastRevalidatedAt: 200,
              revalidationPolicy: {
                shouldRevalidate: false,
                nextRevalidationAt: null,
                expiredSourceIds: [],
                reasonTags: [],
              },
              internalizationDecision: {
                mayInternalize: true,
                mayValidateOnly: false,
                blockedReasons: [],
              },
            },
            verificationBasis: [],
            supportingFactIds: ['fact-9'],
            contradictionFactIds: ['fact-4'],
            internalizationStage: 'internalized-long-horizon-knowledge',
            reason: 'ok',
          },
        },
        createdAt: 200,
      }),
    ].filter((record): record is AlicizationLearningArtifactLedgerRecord => Boolean(record))

    expect(filterLearningArtifactLedgerRecords(records, { claimId: 'claim-2' })).toHaveLength(1)
    expect(filterLearningArtifactLedgerRecords(records, { claimId: 'claim-2' })[0]?.artifactId).toBe('artifact-2')
    expect(filterLearningArtifactLedgerRecords(records, { artifactId: 'artifact-1' })[0]?.taskId).toBe('task-1')
    expect(filterLearningArtifactLedgerRecords(records, { taskId: 'task-2' })[0]?.decisionTraceId).toBe('trace-2')
    expect(filterLearningArtifactLedgerRecords(records, { sourceFactId: 'fact-4' })[0]?.claimId).toBe('claim-2')
    expect(filterLearningArtifactLedgerRecords(records, { decisionTraceId: 'trace-1' })[0]?.artifactId).toBe('artifact-1')
  })
})
