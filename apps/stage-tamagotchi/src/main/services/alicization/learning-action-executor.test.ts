import { describe, expect, it, vi } from 'vitest'

import { createAlicizationLearningActionExecutor } from './learning-action-executor'

describe('learning action executor', () => {
  it('keeps relationship verification on reflection/outcome revision instead of forcing procedure-style internalization', async () => {
    const upsertMemoryReflections = vi.fn(async () => {})
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const upsertMemoryFacts = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 10_000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-relationship-1',
        subject: 'host',
        predicate: 'relationship',
        object: 'prefers more room before warmth',
        confidence: 0.82,
        source: 'rule',
        dedupeKey: 'host|relationship|prefers more room before warmth',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        memoryDomain: 'relationship',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        validationCount: 3,
        contradictionCount: 1,
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [{
        id: 'reflection-1',
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'maintenance',
        targetScope: 'relationship',
        summary: 'The timing still needs more room.',
        lesson: 'Warmth should not outrun room.',
        status: 'pending',
        confidence: 0.76,
        supportingFactIds: ['fact-relationship-1'],
        supportingOutcomeIds: ['outcome-1'],
        createdAt: 1,
        updatedAt: 1,
        confirmedAt: null,
        deniedAt: null,
      }],
      listRelationshipOutcomes: async () => [{
        id: 'outcome-1',
        cardId: 'default',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        sourceKind: 'reply',
        actionSummary: 'stayed too warm',
        closenessDelta: 0,
        trustDelta: 0,
        burdenDelta: 0.08,
        boundaryDelta: -0.06,
        misreadDelta: 0,
        repairDelta: 0.02,
        openLoopDelta: 0,
        summary: 'Warmth landed too early and added pressure.',
        createdAt: 1,
      }],
      upsertMemoryReflections,
      applyMemoryFactCorrections,
      upsertMemoryFacts,
      appendMindTurnEvents,
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-1',
      cardId: 'default',
      taskId: 'learning:relationship:verify',
      status: 'running',
      triggerAt: 1,
      action: 'verify',
      message: 'learning-action=verify',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sourceSessionId: 'session-1',
        action: 'verify',
        reason: 'verify relationship correction',
        focuses: ['internalize-relationship'],
        dominantTrajectory: 'Timing is still changing.',
        sourceSignals: ['Timing is still changing.'],
        learningReadiness: 0.72,
        contradictionPressure: 0.54,
        revisionPressure: 0.41,
        autobiographicalStability: 0.74,
        supportingFactIds: ['fact-relationship-1'],
        supportingReflectionIds: ['reflection-1'],
        supportingOutcomeIds: ['outcome-1'],
        supersedeTargets: [],
        conflictTargets: ['fact-relationship-1'],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('completed')
    expect(result.resultSummary).toContain('relationship')
    expect(result.lifecycleState).toBe('verification')
    expect(result.nextLifecycleState).toBe('internalization')
    expect(result.policyFeedback).toEqual(expect.objectContaining({
      strictnessBias: expect.any(Number),
      wrongThreadSuppressionBias: expect.any(Number),
      provenanceLabelBias: expect.any(Number),
      reasonCodes: expect.arrayContaining(['state:verification', 'result:completed', 'domain:relationship']),
    }))
    expect(result.verifiedArtifact).toEqual(expect.objectContaining({
      version: 'verified-learning-artifact-v1',
      domain: 'relationship',
      action: 'verify',
      verifier: expect.objectContaining({
        kind: 'relationship-verifier',
      }),
    }))
    expect(applyMemoryFactCorrections).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        sourceLabel: 'learning-verify-relationship',
      }),
    ]))
    expect(appendMindTurnEvents).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'learning-executed',
        payload: expect.objectContaining({
          action: 'verify',
          domain: 'relationship',
          verifiedArtifact: expect.objectContaining({
            version: 'verified-learning-artifact-v1',
          }),
        }),
      }),
    ]))
    expect(upsertMemoryFacts).not.toHaveBeenCalled()
  })

  it('keeps world-model internalization at validated knowledge instead of long-horizon internalization', async () => {
    const upsertMemoryFacts = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 10_000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-world-1',
        subject: 'typescript',
        predicate: 'world fact',
        object: 'screenReferenceMode accepts required and avoid',
        confidence: 0.88,
        source: 'rule',
        dedupeKey: 'typescript|world fact|screenReferenceMode accepts required and avoid',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        memoryDomain: 'world-model',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
        validationCount: 2,
        contradictionCount: 0,
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [],
      listRelationshipOutcomes: async () => [],
      upsertMemoryReflections: async () => {},
      applyMemoryFactCorrections: async () => {},
      upsertMemoryFacts,
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-2',
      cardId: 'default',
      taskId: 'learning:world:internalize',
      status: 'running',
      triggerAt: 1,
      action: 'internalize',
      message: 'learning-action=internalize',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sourceSessionId: 'session-1',
        action: 'internalize',
        reason: 'promote stable world-model knowledge carefully',
        focuses: ['internalize-world-model'],
        dominantTrajectory: 'World knowledge is stabilizing.',
        sourceSignals: ['World knowledge is stabilizing.'],
        learningReadiness: 0.81,
        contradictionPressure: 0.08,
        revisionPressure: 0.12,
        autobiographicalStability: 0.8,
        supportingFactIds: ['fact-world-1'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: [],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('completed')
    expect(result.verifiedArtifact?.claimGraph.internalizationDecision.mayValidateOnly).toBe(true)
    expect(upsertMemoryFacts).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        memoryDomain: 'world-model',
        knowledgeStage: 'validated-knowledge',
      }),
    ]), 'rule')
  })

  it('blocks expired world-model internalization until revalidation artifact is available', async () => {
    const upsertMemoryFacts = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 30 * 24 * 60 * 60 * 1000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-world-expired',
        subject: 'external api',
        predicate: 'world fact',
        object: 'old response shape',
        confidence: 0.78,
        source: 'async-llm',
        dedupeKey: 'external-api|world-fact|old-response-shape',
        createdAt: 1,
        updatedAt: 1,
        lastAccessAt: null,
        accessCount: 1,
        memoryDomain: 'world-model',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        validationCount: 0,
        contradictionCount: 0,
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [],
      listRelationshipOutcomes: async () => [],
      upsertMemoryReflections: async () => {},
      applyMemoryFactCorrections: async () => {},
      upsertMemoryFacts,
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-3',
      cardId: 'default',
      taskId: 'learning:world:expired',
      status: 'running',
      triggerAt: 1,
      action: 'internalize',
      message: 'learning-action=internalize',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sourceSessionId: 'session-1',
        action: 'internalize',
        reason: 'promote stale world-model knowledge',
        focuses: ['internalize-world-model'],
        dominantTrajectory: 'World knowledge might be stale.',
        sourceSignals: ['World knowledge might be stale.'],
        learningReadiness: 0.81,
        contradictionPressure: 0,
        revisionPressure: 0,
        autobiographicalStability: 0.8,
        supportingFactIds: ['fact-world-expired'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: [],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('blocked')
    expect(result.verifiedArtifact?.claimGraph.revalidationPolicy.shouldRevalidate).toBe(true)
    expect(result.verifiedArtifact?.verifier.kind).toBe('world-model-verifier')
    expect(upsertMemoryFacts).not.toHaveBeenCalled()
  })

  it('downgrades contradictory relationship claims through verified artifact rollback', async () => {
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 10_000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-relationship-rollback',
        subject: 'host',
        predicate: 'relationship',
        object: 'wants immediate warmth',
        confidence: 0.86,
        source: 'rule',
        dedupeKey: 'host|relationship|wants immediate warmth',
        createdAt: 1,
        updatedAt: 9_900,
        lastAccessAt: null,
        accessCount: 2,
        memoryDomain: 'relationship',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        validationCount: 3,
        contradictionCount: 4,
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [],
      listRelationshipOutcomes: async () => [],
      upsertMemoryReflections: async () => {},
      applyMemoryFactCorrections,
      upsertMemoryFacts: async () => {},
      appendMindTurnEvents,
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-relationship-rollback',
      cardId: 'default',
      taskId: 'learning:relationship:rollback',
      status: 'running',
      triggerAt: 1,
      action: 'verify',
      message: 'learning-action=verify',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-relationship-rollback',
        sourceSessionId: 'session-1',
        action: 'verify',
        reason: 'relationship carry contradicted newer signals',
        focuses: ['verify-relationship'],
        dominantTrajectory: 'Relationship claim needs rollback.',
        sourceSignals: ['Relationship claim needs rollback.'],
        learningReadiness: 0.8,
        contradictionPressure: 0.92,
        revisionPressure: 0.82,
        autobiographicalStability: 0.72,
        supportingFactIds: ['fact-relationship-rollback'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: ['fact-relationship-rollback'],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('downgraded')
    expect(result.lifecycleState).toBe('verification')
    expect(result.nextLifecycleState).toBe('rollback-downgrade')
    expect(result.policyFeedback?.reasonCodes).toEqual(expect.arrayContaining([
      'state:verification',
      'result:downgraded',
      'rollback-pressure',
      'domain:relationship',
    ]))
    expect(result.verifiedArtifact).toEqual(expect.objectContaining({
      domain: 'relationship',
      status: 'rollback-required',
      contradictionFactIds: ['fact-relationship-rollback'],
    }))
    expect(applyMemoryFactCorrections).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-relationship-rollback',
        sourceLabel: expect.stringContaining('artifact-rollback:'),
      }),
    ]))
    expect(appendMindTurnEvents).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          domain: 'relationship',
          verifiedArtifact: expect.objectContaining({
            status: 'rollback-required',
          }),
        }),
      }),
    ]))
  })

  it('downgrades self-model verification targets back to validated knowledge before re-learning', async () => {
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 10_000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-self-1',
        subject: 'alicization',
        predicate: 'self-model',
        object: 'prefers direct truth over decorative warmth',
        confidence: 0.9,
        source: 'rule',
        dedupeKey: 'alicization|self-model|prefers direct truth over decorative warmth',
        createdAt: 1,
        updatedAt: 9_900,
        lastAccessAt: null,
        accessCount: 3,
        memoryDomain: 'self-model',
        knowledgeStage: 'internalized-long-horizon-knowledge',
        validationStatus: 'validated',
        validationCount: 4,
        contradictionCount: 0,
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [],
      listRelationshipOutcomes: async () => [],
      upsertMemoryReflections: async () => {},
      applyMemoryFactCorrections,
      upsertMemoryFacts: async () => {},
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-self-model-downgrade',
      cardId: 'default',
      taskId: 'learning:self-model:verify',
      status: 'running',
      triggerAt: 1,
      action: 'verify',
      message: 'learning-action=verify',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-self-model-downgrade',
        sourceSessionId: 'session-1',
        action: 'verify',
        reason: 'self-model line needs re-check before staying internalized',
        focuses: ['verify-self-model'],
        dominantTrajectory: 'Self model needs a careful downgrade before relearning.',
        sourceSignals: ['Self model needs a careful downgrade before relearning.'],
        learningReadiness: 0.78,
        contradictionPressure: 0.3,
        revisionPressure: 0.48,
        autobiographicalStability: 0.82,
        supportingFactIds: ['fact-self-1'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: ['fact-self-1'],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('completed')
    expect(result.verifiedArtifact).toEqual(expect.objectContaining({
      domain: 'self-model',
      verifier: expect.objectContaining({
        kind: 'self-model-verifier',
      }),
    }))
    expect(applyMemoryFactCorrections).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-self-1',
        nextValidationStatus: 'provisional',
        nextKnowledgeStage: 'validated-knowledge',
        sourceLabel: 'learning-verify-self-model',
      }),
    ]))
  })

  it('rolls back contradictory world-model claims through verified artifact downgrade', async () => {
    const applyMemoryFactCorrections = vi.fn(async () => {})
    const appendMindTurnEvents = vi.fn(async () => {})
    const execute = createAlicizationLearningActionExecutor({
      now: () => 10_000,
      cardId: 'default',
      listMemoryFacts: async () => [{
        id: 'fact-world-contradictory',
        subject: 'external api',
        predicate: 'world fact',
        object: 'old response shape',
        confidence: 0.88,
        source: 'rule',
        dedupeKey: 'external-api|world-fact|old-response-shape',
        createdAt: 1,
        updatedAt: 9_900,
        lastAccessAt: null,
        accessCount: 2,
        memoryDomain: 'world-model',
        knowledgeStage: 'validated-knowledge',
        validationStatus: 'validated',
        validationCount: 2,
        contradictionCount: 4,
        sourceLabel: 'trusted-tool',
        conflictsWith: [],
        supersedes: [],
      } as any],
      listMemoryReflections: async () => [],
      listRelationshipOutcomes: async () => [],
      upsertMemoryReflections: async () => {},
      applyMemoryFactCorrections,
      upsertMemoryFacts: async () => {},
      appendMindTurnEvents,
      assimilateMemoryFactsDetailed: input => ({
        facts: input.facts,
        corrections: [],
      }),
    })

    const result = await execute({
      id: 'row-4',
      cardId: 'default',
      taskId: 'learning:world:rollback',
      status: 'running',
      triggerAt: 1,
      action: 'verify',
      message: 'learning-action=verify',
      payload: {
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sourceSessionId: 'session-1',
        action: 'verify',
        reason: 'world-model contradiction appeared',
        focuses: ['verify-world-model'],
        dominantTrajectory: 'World model needs rollback.',
        sourceSignals: ['World model needs rollback.'],
        learningReadiness: 0.82,
        contradictionPressure: 0.9,
        revisionPressure: 0.8,
        autobiographicalStability: 0.8,
        supportingFactIds: ['fact-world-contradictory'],
        supportingReflectionIds: [],
        supportingOutcomeIds: [],
        supersedeTargets: [],
        conflictTargets: ['fact-world-contradictory'],
      },
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: 1,
      updatedAt: 1,
      claimedAt: 1,
      startedAt: 1,
      completedAt: null,
      blockedAt: null,
      cancelledAt: null,
      downgradedAt: null,
      reopenedAt: null,
      nextRetryAt: null,
      sourceTurnId: 'turn-1',
      resultSummary: null,
      failureKind: null,
      lastError: null,
      firedTurnId: null,
    })

    expect(result.status).toBe('downgraded')
    expect(result.verifiedArtifact).toEqual(expect.objectContaining({
      status: 'rollback-required',
      contradictionFactIds: ['fact-world-contradictory'],
      verifier: expect.objectContaining({
        rollbackRequired: true,
      }),
    }))
    expect(applyMemoryFactCorrections).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-world-contradictory',
        sourceLabel: expect.stringContaining('artifact-rollback:'),
      }),
    ]))
    expect(appendMindTurnEvents).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        payload: expect.objectContaining({
          verifiedArtifact: expect.objectContaining({
            status: 'rollback-required',
          }),
        }),
      }),
    ]))
  })
})
