import { describe, expect, it } from 'vitest'

import { createAlicizationSelfEvolutionRuntime } from './runtime'

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
  projectStateContinuity: {
    proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
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
  projectStateContinuity: {
    sameHerSelfLine: null,
    sameHerDriftRisk: null,
    proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
    emotionalClosureCue: null,
    continuityGuard: null,
    continuityPressure: 0.18,
  },
  reasonCodes: ['domain:self-model'],
  summary: 'Prefer replay-backed self-model changes.',
} as any

describe('self evolution runtime facade', () => {
  it('proposes and activates through the runtime facade', async () => {
    let snapshot: any = null
    const runtime = createAlicizationSelfEvolutionRuntime({
      now: () => 100,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const candidate = await runtime.proposeVersion({
      event: baseEvent,
      patch: basePatch,
    })
    expect(candidate.status).toBe('shadow')

    await runtime.validateVersion({
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 4,
      productionGoldCoverage: 1,
    })

    expect((await runtime.getActiveCandidate())?.id).toBe(candidate.id)
    expect(await runtime.getActivePatch()).toEqual(basePatch)
  })

  it('validates shadow candidates in batch for replay-driven activation', async () => {
    let snapshot: any = null
    const runtime = createAlicizationSelfEvolutionRuntime({
      now: () => 120,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const candidate = await runtime.proposeVersion({
      event: baseEvent,
      patch: basePatch,
    })
    expect(candidate.status).toBe('shadow')

    await runtime.validateAllShadowVersions({
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 6,
      productionGoldCoverage: 1,
    })

    expect((await runtime.getActiveCandidate())?.id).toBe(candidate.id)
  })

  it('keeps shadow candidates blocked in batch when replay still shows project-state continuity drift', async () => {
    let snapshot: any = null
    const runtime = createAlicizationSelfEvolutionRuntime({
      now: () => 120,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const candidate = await runtime.proposeVersion({
      event: baseEvent,
      patch: basePatch,
    })
    expect(candidate.status).toBe('shadow')

    await runtime.validateAllShadowVersions({
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 6,
      productionGoldCoverage: 1,
      projectStateContinuityDrift: true,
      projectStateSummary: {
        comparedTurnCount: 2,
        identityHitCount: 1,
        phaseHitCount: 2,
        openLoopHitCount: 0,
        proactiveSameHerGapHitCount: 0,
        continuityHitCount: 0,
      },
    } as any)

    const selected = (await runtime.getSnapshot()).candidates.find((item: any) => item.id === candidate.id)
    expect(selected?.status).toBe('shadow')
    expect(selected?.validation.activationBlockedReasons).toContain('self-evolution:project-state-continuity-drift')
    expect(selected?.validation.projectStateContinuityReasons).toEqual(expect.arrayContaining([
      'self-evolution:project-state-continuity-drift',
      'self-evolution:project-state-identity-carry-weak',
      'self-evolution:project-state-open-loop-carry-weak',
      'self-evolution:project-state-proactive-gap-carry-weak',
    ]))
    expect(await runtime.getActiveCandidate()).toBeNull()
  })
})
