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
  projectStateContinuity: {
    sameHerSelfLine: null,
    sameHerDriftRisk: null,
    proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
    emotionalClosureCue: null,
    sameHerHoldDetail: 'same-her hold: keep this self-revision on the same living line before later replay summaries cool it into generic verification bookkeeping.',
    continuityGuard: null,
    continuityPressure: 0.18,
  },
  reasonCodes: ['domain:self-model'],
  summary: 'Prefer replay-backed self-model changes.',
} as any

describe('self evolution version runtime', () => {
  it('keeps every candidate in shadow until replay and production gold gates pass', () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })

    expect(candidate.status).toBe('shadow')
    expect(candidate.activatedAt).toBeNull()
    expect(candidate.validation.rollbackSupported).toBe(false)
    expect(candidate.decisionTraceId).toBe('trace-1')
    expect(candidate.validation.activationBlockedReasons).toEqual(expect.arrayContaining([
      'self-evolution:shadow-replay-required',
      'self-evolution:final-replay-gate-required',
      'self-evolution:production-gold-required',
    ]))
    expect(candidate.validation.projectStateContinuityReasons).toEqual(expect.arrayContaining([
      'self-evolution:project-preflight-carry-present',
      'self-evolution:project-same-her-hold-detail-present',
      'self-evolution:project-proactive-same-her-gap-present',
      'self-evolution:project-same-her-self-line-present',
      'self-evolution:project-same-her-drift-risk-present',
      'self-evolution:project-phase-memory-closure-still-open',
    ]))
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
      finalReplayGatePassed: false,
      productionGoldSampleCount: 0,
      productionGoldCoverage: 0,
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

  it('activates shadow candidates only after replay and production gold gates pass', () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })
    const snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [candidate],
    })
    const validated = applyAlicizationSelfEvolutionReplayValidation({
      snapshot,
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 8,
      productionGoldCoverage: 1,
      now: 120,
    })

    expect(validated.candidates[0]?.status).toBe('active')
    expect(validated.candidates[0]?.activatedAt).toBe(120)
    expect(validated.candidates[0]?.validation.activationBlockedReasons).not.toContain('self-evolution:shadow-replay-required')
    expect(validated.candidates[0]?.validation.activationBlockedReasons).not.toContain('self-evolution:final-replay-gate-required')
    expect(validated.candidates[0]?.validation.activationBlockedReasons).not.toContain('self-evolution:production-gold-required')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toContain('self-evolution:project-phase-memory-closure-still-open')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toContain('self-evolution:project-preflight-carry-present')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toContain('self-evolution:project-proactive-same-her-gap-present')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toContain('self-evolution:project-same-her-self-line-present')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toContain('self-evolution:project-same-her-drift-risk-present')
  })

  it('keeps a replay-validated candidate in shadow when replay still shows project-state continuity drift', () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })
    const snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [candidate],
    })
    const validated = applyAlicizationSelfEvolutionReplayValidation({
      snapshot,
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 8,
      productionGoldCoverage: 1,
      now: 120,
      projectStateContinuityDrift: true,
      projectStateContinuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | landed=Keep the latest landed project-state progress explicit in the rewritten answer. | open=Keep the still-open closure work explicit in the rewritten answer.',
      projectStateSummary: {
        comparedTurnCount: 3,
        identityHitCount: 1,
        phaseHitCount: 1,
        openLoopHitCount: 0,
        sameHerHitCount: 0,
        proactiveSameHerGapHitCount: 0,
        continuityHitCount: 0,
      },
    } as any)

    expect(validated.candidates[0]?.status).toBe('shadow')
    expect(validated.candidates[0]?.activatedAt).toBeNull()
    expect(validated.candidates[0]?.validation.activationBlockedReasons).toContain('self-evolution:project-state-continuity-drift')
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toEqual(expect.arrayContaining([
      'self-evolution:project-preflight-carry-present',
      'self-evolution:project-phase-memory-closure-still-open',
      'self-evolution:project-proactive-same-her-gap-present',
      'self-evolution:project-state-continuity-drift',
      'self-evolution:project-state-identity-carry-weak',
      'self-evolution:project-state-same-her-carry-weak',
      'self-evolution:project-state-phase-carry-weak',
      'self-evolution:project-state-open-loop-carry-weak',
      'self-evolution:project-state-proactive-gap-carry-weak',
    ]))
    expect(validated.candidates[0]?.validation.projectStateContinuityReasons?.some(reason =>
      reason.startsWith('self-evolution:project-state-continuity-summary=same-her=Answer project-state questions from one same-her continuity'),
    )).toBe(true)
  })

  it('keeps same-her hold detail visible as version-level continuity evidence during replay validation', () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })
    const snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [candidate],
    })
    const validated = applyAlicizationSelfEvolutionReplayValidation({
      snapshot,
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 8,
      productionGoldCoverage: 1,
      now: 120,
      projectStateContinuityDrift: true,
      projectStateContinuitySummary: 'same-her=Keep one same digital life explicit while replay checks whether the living line stayed intact.',
      projectStateSummary: {
        comparedTurnCount: 2,
        identityHitCount: 2,
        sameHerHitCount: 0,
        phaseHitCount: 2,
        openLoopHitCount: 2,
        proactiveSameHerGapHitCount: 2,
        continuityHitCount: 0,
      },
    } as any)

    expect(validated.candidates[0]?.validation.projectStateContinuityReasons).toEqual(expect.arrayContaining([
      'self-evolution:project-same-her-hold-detail-present',
      'self-evolution:project-state-same-her-carry-weak',
    ]))
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

    expect(candidate.status).toBe('shadow')
    expect((await runtime.getSnapshot()).activeCandidateId).toBeNull()
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

    await runtime.validate({
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 4,
      productionGoldCoverage: 1,
    })

    expect((await runtime.getActiveCandidate())?.id).toBe(candidate.id)
    expect(await runtime.getActivePatch()).toEqual(basePatch)
  })

  it('promotes the newest validated candidate to authoritative active state', async () => {
    let snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({ candidates: [] })
    let now = 300
    const runtime = createAlicizationSelfEvolutionVersionRuntime({
      now: () => now,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    const firstCandidate = await runtime.propose({
      event: {
        ...baseEvent,
        id: 'event-older',
        decisionTraceId: 'trace-older',
      },
      patch: {
        ...basePatch,
        id: 'patch-older',
        sourceEventId: 'event-older',
        decisionTraceId: 'trace-older',
        summary: 'Older active patch.',
      },
    })

    await runtime.validate({
      candidateId: firstCandidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 4,
      productionGoldCoverage: 1,
    })

    now = 320
    const secondCandidate = await runtime.propose({
      event: {
        ...baseEvent,
        id: 'event-newer',
        decisionTraceId: 'trace-newer',
      },
      patch: {
        ...basePatch,
        id: 'patch-newer',
        sourceEventId: 'event-newer',
        decisionTraceId: 'trace-newer',
        summary: 'Newer active patch.',
      },
    })

    await runtime.validate({
      candidateId: secondCandidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 5,
      productionGoldCoverage: 1,
    })

    expect((await runtime.getActiveCandidate())?.id).toBe(secondCandidate.id)
    expect((await runtime.getActivePatch())?.id).toBe('patch-newer')
  })

  it('preserves baseline adoption history across runtime validation and later proposals', async () => {
    const candidate = buildAlicizationSelfEvolutionVersionCandidate({
      event: baseEvent,
      patch: basePatch,
      now: 100,
    })
    const baselineAdoptionHistory = [{
      version: 'self-evolution-baseline-adoption/v1' as const,
      adoptedAt: 180,
      snapshotCapturedAt: 160,
      candidateId: candidate.id,
      decisionTraceId: candidate.decisionTraceId,
      activeThreadId: 'thread-project-state',
      selectedCardId: 'project-state-carry',
      activePatternKey: 'pattern-project-state-governance',
      repairOwnerHint: 'project state continuity governance',
      adoptionMode: 'adopt-now' as const,
      summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
      projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
    }]
    let snapshot = buildAlicizationSelfEvolutionVersionRuntimeSnapshot({
      candidates: [candidate],
      baselineAdoptionHistory,
    } as any)
    let now = 200
    const runtime = createAlicizationSelfEvolutionVersionRuntime({
      now: () => now,
      readSnapshot: async () => snapshot,
      writeSnapshot: async (next) => {
        snapshot = next
      },
    })

    await runtime.validate({
      candidateId: candidate.id,
      replayPassed: true,
      finalReplayGatePassed: true,
      productionGoldSampleCount: 4,
      productionGoldCoverage: 1,
    })

    expect((snapshot as any).baselineAdoptionHistory).toEqual(baselineAdoptionHistory)

    now = 240
    await runtime.propose({
      event: {
        ...baseEvent,
        id: 'event-next',
        decisionTraceId: 'trace-next',
      },
      patch: {
        ...basePatch,
        id: 'patch-next',
        sourceEventId: 'event-next',
        decisionTraceId: 'trace-next',
        summary: 'Next patch should not erase the adopted baseline history.',
      },
    })

    expect((snapshot as any).baselineAdoptionHistory).toEqual(baselineAdoptionHistory)
    expect((snapshot as any).baselineAdoptionHistory?.[0]?.projectStateContinuityGovernanceNote)
      .toBe('项目状态连续性治理已经再次确认，可直接进入长期基线。')
  })
})
