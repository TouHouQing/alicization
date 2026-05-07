import { describe, expect, it } from 'vitest'

import {
  applyAlicizationSelfEvolutionReplayValidation,
  buildAlicizationSelfEvolutionVersionCandidate,
  buildAlicizationSelfEvolutionVersionRuntimeSnapshot,
  createAlicizationSelfEvolutionVersionRuntime,
  rollbackAlicizationSelfEvolutionCandidate,
} from './version-runtime'

const baseEvent = {
  version: 'self-revision-event-v1',
  id: 'event-1',
  sourceTurnId: 'turn-1',
  decisionTraceId: 'trace-1',
  domain: 'self-model',
  taskAction: 'revise',
  resultStatus: 'completed',
  evidence: {
    supportCount: 2,
    contradictionCount: 0,
    verificationBasis: ['existing-memory'],
  },
  proposedRevision: {
    summary: 'Prefer replay-backed self-model changes.',
    lifecycleState: 'verifying',
    nextLifecycleState: 'settled',
  },
  verifier: {
    status: 'validated',
    mayInternalize: true,
    mayValidateOnly: false,
  },
  appliedTargets: ['fact-1'],
  rollbackPlan: [],
} as any

const basePatch = {
  version: 'self-revision-state-patch-v1',
  id: 'patch-1',
  sourceEventId: 'event-1',
  sourceTurnId: 'turn-1',
  decisionTraceId: 'trace-1',
  domain: 'self-model',
  action: 'revise',
  resultStatus: 'completed',
  lanes: ['memory-policy', 'response-posture'],
  memoryPolicy: {
    strictnessBias: 0.1,
    wrongThreadSuppressionBias: 0.1,
    provenanceLabelBias: 0.1,
    recallExpansionBias: 0.06,
    shouldQuarantineUnsupportedCarry: false,
  },
  relationshipPosture: {
    repairWindowBias: 0,
    closenessCapBias: 0,
    warmthReleaseBias: 0,
  },
  responsePosture: {
    secondPassRequiredBias: 0.08,
    hypothesisLabelBias: 0.04,
    specificityClampBias: 0.1,
    templateShellSuppressionBias: 0.12,
  },
  proactivePolicy: {
    restraintBias: 0,
    learningProposalBias: 0.08,
    actuationCooldownBias: 0,
  },
  validation: {
    requiresRollbackCheck: false,
    requiresRevalidation: false,
    rollbackPlan: [],
  },
  reasonCodes: ['domain:self-model'],
  summary: 'Prefer replay-backed self-model changes.',
} as any

describe('self evolution version runtime', () => {
  it('activates safe candidates immediately and keeps traceable version metadata', () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })

    expect(candidate.status).toBe('active')
    expect(candidate.activatedAt).toBe(100)
    expect(candidate.validation.rollbackSupported).toBe(false)
    expect(candidate.decisionTraceId).toBe('trace-1')
  })

  it('keeps risky candidates in shadow until replay validation and supports rollback', () => {
    const riskyPatch = {
      ...basePatch,
      id: 'patch-risky',
      validation: {
        requiresRollbackCheck: true,
        requiresRevalidation: true,
        rollbackPlan: ['restore-previous-self-model'],
      },
    }
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: {
        ...baseEvent,
        id: 'event-risky',
        verifier: {
          status: 'rollback-required',
          mayInternalize: false,
          mayValidateOnly: true,
        },
      },
      patch: riskyPatch,
      now: 100,
    })
    const snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [candidate],
    })
    const failed = applyAlicizationSelfEvolutionReplayValidation({
      snapshot,
      candidateId: candidate.id,
      replayPassed: false,
      now: 120,
    })
    const rolledBack = rollbackAlicizationSelfEvolutionCandidate({
      snapshot: failed,
      candidateId: candidate.id,
      reason: 'replay-regression',
      now: 140,
    })

    expect(candidate.status).toBe('shadow')
    expect(candidate.validation.rollbackSupported).toBe(true)
    expect(failed.candidates[0]?.status).toBe('rejected')
    expect(rolledBack.candidates[0]?.status).toBe('rolled-back')
    expect(rolledBack.candidates[0]?.validation.activationBlockedReasons).toContain('rollback:replay-regression')
  })

  it('persists proposals through the runtime adapter', async () => {
    let snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({ candidates: [] })
    const runtime = createAlicizationSelfEvolutionVersionRuntime({
      now: () => 200,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const candidate = await runtime.propose({
      event: baseEvent,
      patch: basePatch,
    })

    expect(candidate.status).toBe('active')
    expect((await runtime.getSnapshot()).activeCandidateId).toBe(candidate.id)
  })

  it('exposes the active state patch for downstream memory and reply policy consumers', async () => {
    let snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({ candidates: [] })
    const runtime = createAlicizationSelfEvolutionVersionRuntime({
      now: () => 240,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const candidate = await runtime.propose({
      event: baseEvent,
      patch: basePatch,
    })

    expect((await runtime.getActiveCandidate())?.id).toBe(candidate.id)
    expect(await runtime.getActivePatch()).toEqual(basePatch)
  })
})
