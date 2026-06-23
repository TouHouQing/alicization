import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { describe, expect, it } from 'vitest'

import { buildOrganicMemoryEvolutionState } from './runtime-organic-memory-self-evolution-integration'

const historicalSelfRevisionTelemetry = {
  version: 'memory-stats-v1',
  total: 0,
  active: 0,
  archived: 0,
  lastPrunedAt: null,
  retrievalHealth: {
    semanticLatencyMs: null,
    graphLatencyMs: null,
    templateLeakageFailCount: 0,
    reconstructionFrequency: 0,
    reconstructedCount: 0,
    selfRevisionPatchCount: 3,
    selfRevisionMemoryPolicyBias: 0.82,
    selfRevisionRelationshipPostureBias: 0.68,
    selfRevisionResponsePostureBias: 0.74,
    selfRevisionProactivePolicyBias: 0.61,
    selfRevisionValidationBias: 1,
    selfRevisionReasonCodes: ['domain:self-model'],
  },
} as any

const activeSelfRevisionPatch: AlicizationSelfRevisionStatePatch = {
  version: 'self-revision-state-patch-v1',
  id: 'patch-active-1',
  sourceEventId: 'event-active-1',
  sourceTurnId: 'turn-active-1',
  decisionTraceId: 'trace-active-1',
  domain: 'self-model',
  action: 'revise',
  resultStatus: 'completed',
  lanes: ['memory-policy', 'response-posture', 'rollback-validation'],
  memoryPolicy: {
    strictnessBias: 0.82,
    wrongThreadSuppressionBias: 0.58,
    provenanceLabelBias: 0.64,
    recallExpansionBias: 0.14,
    shouldQuarantineUnsupportedCarry: true,
  },
  relationshipPosture: {
    repairWindowBias: 0.44,
    closenessCapBias: 0.26,
    warmthReleaseBias: 0,
  },
  responsePosture: {
    secondPassRequiredBias: 0.74,
    hypothesisLabelBias: 0.36,
    specificityClampBias: 0.62,
    templateShellSuppressionBias: 0.52,
  },
  proactivePolicy: {
    restraintBias: 0.61,
    learningProposalBias: 0.12,
    actuationCooldownBias: 0.47,
  },
  validation: {
    requiresRollbackCheck: true,
    requiresRevalidation: true,
    rollbackPlan: ['rollback-to-pre-revision-posture'],
  },
  reasonCodes: ['domain:self-model', 'rollback-validation-required'],
  summary: 'Do not let unverified self-model revisions drift into durable identity.',
}

describe('runtime organic memory self evolution integration', () => {
  it('does not let historical self-revision telemetry alone alter the long-horizon self-evolution kernel', () => {
    const result = buildOrganicMemoryEvolutionState({
      producedAt: 100,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      memoryStats: historicalSelfRevisionTelemetry,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
    })

    expect(result.selfEvolution).toBeNull()
  })

  it('treats the active self-revision patch as the authority for long-horizon self-evolution pressure', () => {
    const result = buildOrganicMemoryEvolutionState({
      producedAt: 100,
      retrievedFacts: [],
      proceduralMemories: [],
      hostPersonModel: null,
      memoryStats: historicalSelfRevisionTelemetry,
      recollectionIntent: null,
      recollectionPlan: null,
      recollectionSpeechPlan: null,
      memoryDeliberation: null,
      personStateProjection: null,
      activeSelfEvolutionCandidateId: 'candidate-self-evolution-1',
      activeSelfRevisionPatch,
    })

    expect(result.selfEvolution).toEqual(expect.objectContaining({
      activeLearningFocuses: expect.arrayContaining(['self-revision-policy-feedback']),
      sourceSignals: expect.arrayContaining(['self-revision:domain:self-model']),
    }))
    expect(result.derivedMindStateBundle).toEqual(expect.objectContaining({
      activeSelfRevision: expect.objectContaining({
        candidateId: 'candidate-self-evolution-1',
        patchId: 'patch-active-1',
        patchDecisionTraceId: 'trace-active-1',
        lanes: expect.arrayContaining(['memory-policy', 'response-posture', 'rollback-validation']),
        reasonCodes: expect.arrayContaining(['domain:self-model', 'rollback-validation-required']),
        summary: 'Do not let unverified self-model revisions drift into durable identity.',
      }),
    }))
  })
})
