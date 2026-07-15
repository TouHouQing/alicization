import { readFileSync } from 'node:fs'

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationMindReplayStore } from './alicization-mind-replay'
import { useAlicizationSelfEvolutionInspectorStore } from './alicization-self-evolution-inspector'

const forbiddenTemplateResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|legacy phase-one template|Same Phase 1 digital life|same living line|one living her|one continuous her|同一个她|同一个 her|数字生命主线/u

function expectNoFixedTemplateResidue(value: unknown) {
  const stringValues: string[] = []
  const isTechnicalIdentifier = (candidate: string) => /^[\w./:-]+$/u.test(candidate)
  const visit = (candidate: unknown) => {
    if (typeof candidate === 'string') {
      if (!isTechnicalIdentifier(candidate))
        stringValues.push(candidate)
      return
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(visit)
      return
    }
    if (candidate && typeof candidate === 'object')
      Object.values(candidate as Record<string, unknown>).forEach(visit)
  }
  visit(value)
  expect(stringValues.join('\n')).not.toMatch(forbiddenTemplateResiduePattern)
}

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendConversationTurn: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn(),
    ...overrides,
  } as any
}

function createReplayFactDatasetFeedbackFixture(options: {
  comparedTurnCount?: number
  activeCueTurnCount?: number
  contentCompleteTurnCount?: number
  validationBlockedTurnCount?: number
  validationUnknownTurnCount?: number
  evidenceMissingTurnCount?: number
  evidenceUnknownTurnCount?: number
  includeProjectStateSummary?: boolean
  omitSummary?: 'emotionalClosureSummary' | 'selfAuthoritySummary' | 'projectStateAuditSummary'
} = {}) {
  const comparedTurnCount = options.comparedTurnCount ?? 2
  const activeCueTurnCount = options.activeCueTurnCount ?? comparedTurnCount
  const contentCompleteTurnCount = options.contentCompleteTurnCount ?? comparedTurnCount
  const validationBlockedTurnCount = options.validationBlockedTurnCount ?? 0
  const validationUnknownTurnCount = options.validationUnknownTurnCount ?? 0
  const validationKnownTurnCount = comparedTurnCount - validationUnknownTurnCount
  const evidenceMissingTurnCount = options.evidenceMissingTurnCount ?? 0
  const evidenceUnknownTurnCount = options.evidenceUnknownTurnCount ?? 0
  const evidenceKnownTurnCount = comparedTurnCount - evidenceUnknownTurnCount
  const feedback: Record<string, unknown> = {
    ...(options.includeProjectStateSummary === false
      ? {}
      : {
          projectStateSummary: {
            comparedTurnCount,
            identityHitCount: comparedTurnCount,
            phaseHitCount: comparedTurnCount,
            openLoopHitCount: comparedTurnCount,
            sameHerHitCount: comparedTurnCount,
            proactiveSameHerGapHitCount: comparedTurnCount,
            continuityHitCount: comparedTurnCount,
          },
        }),
    emotionalClosureSummary: {
      comparedTurnCount,
      activeCueTurnCount,
      lowPressureRequiredTurnCount: 0,
      antiRestartRequiredTurnCount: 0,
      validationStatus: {
        knownTurnCount: validationKnownTurnCount,
        approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
        blockedTurnCount: validationBlockedTurnCount,
        unknownTurnCount: validationUnknownTurnCount,
      },
    },
    selfAuthoritySummary: {
      comparedTurnCount,
      authoritySummaryTurnCount: comparedTurnCount,
      closenessPostureTurnCount: comparedTurnCount,
      contentCompleteTurnCount,
      validationStatus: {
        knownTurnCount: validationKnownTurnCount,
        approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
        blockedTurnCount: validationBlockedTurnCount,
        unknownTurnCount: validationUnknownTurnCount,
      },
    },
    projectStateAuditSummary: {
      comparedTurnCount,
      sameHerSummaryTurnCount: comparedTurnCount,
      sameHerSelfLineTurnCount: comparedTurnCount,
      currentPhaseTurnCount: comparedTurnCount,
      landedProgressTurnCount: comparedTurnCount,
      openClosureTurnCount: comparedTurnCount,
      nextClosureTargetTurnCount: comparedTurnCount,
      emotionalClosureTurnCount: comparedTurnCount,
      preDialogueAwarenessTurnCount: comparedTurnCount,
      richPreDialogueAwarenessTurnCount: comparedTurnCount,
      continuitySummaryTurnCount: comparedTurnCount,
      embodimentClosureTurnCount: comparedTurnCount,
      preDialogueClosureTurnCount: comparedTurnCount,
      contentCompleteTurnCount,
      validationStatus: {
        knownTurnCount: validationKnownTurnCount,
        approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
        blockedTurnCount: validationBlockedTurnCount,
        unknownTurnCount: validationUnknownTurnCount,
      },
      evidenceStatus: {
        knownTurnCount: evidenceKnownTurnCount,
        presentTurnCount: Math.max(0, evidenceKnownTurnCount - evidenceMissingTurnCount),
        missingTurnCount: evidenceMissingTurnCount,
        unknownTurnCount: evidenceUnknownTurnCount,
      },
    },
    driftSignals: [],
  }
  if (options.omitSummary)
    delete feedback[options.omitSummary]
  return feedback
}

describe('alicization self evolution inspector store', () => {
  it('uses the shared project awareness resolver when inspector rebuilds pre-dialogue awareness', () => {
    const source = readFileSync(new URL('./alicization-self-evolution-inspector.ts', import.meta.url), 'utf8')

    expect(source).toContain('resolveAlicizationProjectPreDialogueAwarenessLine')
    expect(source).not.toContain('function resolvePreferredInspectorAwarenessLine')
    expect(() => expectNoFixedTemplateResidue('continuity state and identity continuity are ordinary domain terms.')).not.toThrow()
    expect(() => expectNoFixedTemplateResidue('Before speaking, remember this fixed legacy shell.')).toThrow()
  })

  it('consumes three-state replay fact rows without legacy closure row keys', () => {
    const source = readFileSync(new URL('./alicization-self-evolution-inspector.ts', import.meta.url), 'utf8')

    expect(source).toContain('project_state_continuity_hit_rate')
    expect(source).toContain('emotional_closure_active_cue_rate')
    expect(source).toContain('emotional_closure_validation_approved_rate')
    expect(source).toContain('emotional_closure_validation_blocked_rate')
    expect(source).toContain('emotional_closure_validation_unknown_rate')
    expect(source).toContain('self_authority_content_complete_rate')
    expect(source).toContain('self_authority_validation_approved_rate')
    expect(source).toContain('self_authority_validation_blocked_rate')
    expect(source).toContain('self_authority_validation_unknown_rate')
    expect(source).toContain('project_state_audit_content_complete_rate')
    expect(source).toContain('project_state_audit_validation_approved_rate')
    expect(source).toContain('project_state_audit_validation_blocked_rate')
    expect(source).toContain('project_state_audit_validation_unknown_rate')
    expect(source).toContain('project_state_audit_evidence_present_rate')
    expect(source).toContain('project_state_audit_evidence_missing_rate')
    expect(source).toContain('project_state_audit_evidence_unknown_rate')
    expect(source).not.toMatch(/project_state_review_hit_rate|emotional_closure_(?:fully_closed|preserved)_rate|self_authority_(?:fully_carried|preserved)_rate|project_state_audit_(?:fully_carried|preserved)_rate/u)
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
  })

  afterEach(() => {
    clearAlicizationBridge()
    vi.restoreAllMocks()
  })

  it('loads the authoritative self-evolution runtime snapshot from the shared bridge', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'self-evolution:trace-active:patch-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'self-evolution:trace-active:patch-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.66,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.51,
            recallExpansionBias: 0.09,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.1,
            closenessCapBias: 0.08,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.34,
            hypothesisLabelBias: 0.16,
            specificityClampBias: 0.41,
            templateShellSuppressionBias: 0.28,
          },
          proactivePolicy: {
            restraintBias: 0.22,
            learningProposalBias: 0.11,
            actuationCooldownBias: 0.17,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active patch is now authoritative.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    const snapshot = await store.refresh()

    expect(getSelfEvolutionState).toBeCalledTimes(1)
    expect(snapshot?.activeCandidateId).toBe('self-evolution:trace-active:patch-active')
    expect(store.snapshot?.reasonCodes).toEqual(['self-evolution:active-version-present'])
    expect(store.activeCandidate?.patch.summary).toBe('Active patch is now authoritative.')
    expect(store.lastError).toBeNull()
  })

  it('builds a pre-dialogue closure snapshot from replay project-state and emotional closure benchmark signals', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-closure-snapshot',
      candidates: [],
      reasonCodes: [],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue(null)
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity is already injected before dialogue turns.',
      primaryOpenLoop: 'Keep cross-turn identity-continuity',
      nextClosureTarget: 'Carry the unfinished digital-life loop into the next dialogue preparation step.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-snapshot',
      sessionId: 'session-project-state-snapshot',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 2,
          openLoopHitCount: 1,
          sameHerHitCount: 2,
          proactiveSameHerGapHitCount: 1,
          continuityHitCount: 1,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 2,
          antiRestartRequiredTurnCount: 1,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 1,
            blockedTurnCount: 1,
            unknownTurnCount: 1,
          },
        },
        selfAuthoritySummary: {
          comparedTurnCount: 3,
          authoritySummaryTurnCount: 3,
          closenessPostureTurnCount: 3,
          contentCompleteTurnCount: 3,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 1,
            blockedTurnCount: 1,
            unknownTurnCount: 1,
          },
        },
        projectStateAuditSummary: {
          comparedTurnCount: 3,
          sameHerSummaryTurnCount: 3,
          sameHerSelfLineTurnCount: 2,
          currentPhaseTurnCount: 0,
          landedProgressTurnCount: 2,
          openClosureTurnCount: 2,
          nextClosureTargetTurnCount: 0,
          emotionalClosureTurnCount: 0,
          preDialogueAwarenessTurnCount: 0,
          richPreDialogueAwarenessTurnCount: 0,
          continuitySummaryTurnCount: 1,
          embodimentClosureTurnCount: 1,
          preDialogueClosureTurnCount: 2,
          contentCompleteTurnCount: 2,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 1,
            blockedTurnCount: 1,
            unknownTurnCount: 1,
          },
          evidenceStatus: {
            knownTurnCount: 2,
            presentTurnCount: 1,
            missingTurnCount: 1,
            unknownTurnCount: 1,
          },
        },
        driftSignals: ['emotionalClosureDrift', 'selfAuthorityDrift', 'projectStateAuditDrift'],
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: expect.stringContaining('project=continuity=0.33 (1/3)'),
      companionHeadlineLine: null,
      briefingLines: expect.arrayContaining([
        expect.stringContaining('情绪收束事实：'),
        expect.stringContaining('权限事实：'),
        expect.stringContaining('项目状态审计事实：'),
        'Landed: Project-state continuity is already injected before dialogue turns.',
        'Next closure: Carry the unfinished digital-life loop into the next dialogue preparation step.',
      ]),
    }))
    expect(closureText).toContain('identityContinuity=identityContinuity=0.67 (2/3)')
    expect(closureText).toContain('proactiveIdentityContinuityGap=proactiveIdentityContinuityGap=0.33 (1/3)')
    expect(closureText).toContain('情绪收束事实：')
    expect(closureText).toContain('activeCue[有效提示覆盖率=1 (3/3)]')
    expect(closureText).toContain('validationApproved[可见回复校验通过率=0.5 (1/2，分母为已知状态)]')
    expect(closureText).toContain('validationBlocked[可见回复校验阻断率=0.5 (1/2，分母为已知状态)]')
    expect(closureText).toContain('validationUnknown[可见回复校验未知率=0.33 (1/3，分母为全部比较 turn)]')
    expect(closureText).toContain('权限事实：contentComplete[内容完整率=1 (3/3)]')
    expect(closureText).toContain('项目状态审计事实：contentComplete[内容完整率=0.67 (2/3)]')
    expect(closureText).toContain('evidencePresent[项目状态证据存在率=0.5 (1/2，分母为已知状态)]')
    expect(closureText).toContain('evidenceMissing[项目状态证据缺失率=0.5 (1/2，分母为已知状态)]')
    expect(closureText).toContain('evidenceUnknown[项目状态证据未知率=0.33 (1/3，分母为全部比较 turn)]')
    expect(closureText).not.toMatch(/emotionalClosure=|preserve=|selfAuthority=|selfAuthorityPreserve=|projectStateAudit=|projectStateAuditPreserve=/u)
    expect(store.preDialogueClosureSnapshot?.reasons.some(reason => reason.includes('权限事实：'))).toBe(true)
    expect(store.preDialogueClosureSnapshot?.reasons.some(reason => reason.includes('项目状态审计事实：'))).toBe(true)
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('keeps real desktop identity-continuity proof status visible in the pre-dialogue closure snapshot', () => {
    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      packId: 'sampled-humanlike-memory-v1',
      ranAt: 1_700_000_000_000,
      turnCount: 3,
      quality: [],
      standards: {},
      gate: {
        passed: true,
        failingKeys: [],
        dimensions: [],
      },
      finalReplayGate: {
        passed: true,
        failingKeys: [],
        report: [],
      },
      shipGate: [],
      telemetryPatch: {
        retrievalHealth: {
          runtimeLongRunSameHerSessionClosureRate: 0,
        },
      },
      telemetryPersisted: true,
      failingTurnSet: [],
      datasetFeedback: {
        backlogKey: 'replay_benchmark_dataset_backlog_v1',
        appendedCount: 0,
        totalCount: 3,
        persisted: true,
        longRunSameHerSessionSummary: {
          comparedSessionCount: 1,
          closedSessionCount: 1,
          singleTurnSessionCount: 0,
          insufficientSessionCount: 0,
          sessionClosureRate: 1,
          sessions: [
            {
              sessionId: 'dataset-only-closed',
              status: 'closed',
              turnCount: 3,
              hitCount: 3,
              transitionCount: 2,
              closedTransitionCount: 2,
              requiredConsecutiveTransitionCount: 2,
              maxConsecutiveClosedTransitionCount: 2,
              turnIds: ['dataset-turn-3', 'dataset-turn-2', 'dataset-turn-1'],
              failureReasons: [],
              runtimeEvidence: {
                source: 'dataset-backlog',
                runtimeTurnCount: 0,
                decisionTraceTurnCount: 0,
                syntheticTurnCount: 3,
                allTurnsRuntimeSourced: false,
              },
              transitionDiagnostics: [],
              turnDiagnostics: [],
            },
          ],
        },
        runtimeSamplingEvidence: {
          source: 'dataset-backlog',
          status: 'closed',
          sampledTurnCount: 3,
          comparedSessionCount: 1,
          closedSessionCount: 1,
          sessionClosureRate: 1,
        },
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
    expect(closureText).toContain('运行时证明事实：状态=not-runtime')
    expect(closureText).toContain('来源=dataset-backlog')
    expect(closureText).toContain('运行时闭环率=0')
    expect(closureText).toContain('运行时会话=0/1')
    expect(closureText).toContain('决策轨迹回合=0')
    expect(closureText).toContain('合成回合=3')
    expect(closureText).toContain('会话闭环率=1')
    expect(closureText).not.toContain('runtimeIdentityContinuity=')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('marks incomplete self-authority and project-state audit content as drift despite healthy statuses', () => {
    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 2,
            blockedTurnCount: 0,
            unknownTurnCount: 0,
          },
        },
        selfAuthoritySummary: {
          comparedTurnCount: 2,
          authoritySummaryTurnCount: 2,
          closenessPostureTurnCount: 2,
          contentCompleteTurnCount: 1,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 2,
            blockedTurnCount: 0,
            unknownTurnCount: 0,
          },
        },
        projectStateAuditSummary: {
          comparedTurnCount: 2,
          sameHerSummaryTurnCount: 2,
          sameHerSelfLineTurnCount: 2,
          currentPhaseTurnCount: 2,
          landedProgressTurnCount: 2,
          openClosureTurnCount: 2,
          nextClosureTargetTurnCount: 2,
          emotionalClosureTurnCount: 2,
          preDialogueAwarenessTurnCount: 2,
          richPreDialogueAwarenessTurnCount: 2,
          continuitySummaryTurnCount: 2,
          embodimentClosureTurnCount: 2,
          preDialogueClosureTurnCount: 2,
          contentCompleteTurnCount: 1,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 2,
            blockedTurnCount: 0,
            unknownTurnCount: 0,
          },
          evidenceStatus: {
            knownTurnCount: 2,
            presentTurnCount: 2,
            missingTurnCount: 0,
            unknownTurnCount: 0,
          },
        },
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)

    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(closureText).toContain('权限事实：contentComplete[内容完整率=0.5 (1/2)]')
    expect(closureText).toContain('项目状态审计事实：contentComplete[内容完整率=0.5 (1/2)]')

    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 2,
          identityHitCount: 2,
          phaseHitCount: 2,
          openLoopHitCount: 2,
          sameHerHitCount: 2,
          continuityHitCount: 2,
        },
        preDialogueBriefingSummary: {
          comparedTurnCount: 2,
          identityHitCount: 2,
          phaseHitCount: 2,
          landedProgressHitCount: 2,
          openLoopHitCount: 2,
          nextClosureHitCount: 2,
          emotionalClosureHitCount: 2,
          fullyBriefedTurnCount: 2,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 2,
            approvedTurnCount: 2,
            blockedTurnCount: 0,
            unknownTurnCount: 0,
          },
        },
      },
    }

    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
  })

  it('classifies production-shaped replay facts as grounded, partial, or drift without weakening continuity text', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-production-shaped-replay-facts',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: '桌面运行中的自我状态由本地记忆、权限事实和可追溯项目记录共同约束。',
      currentPhase: '当前工作集中在对话前事实核验与可见回复边界。',
      latestLandedProgress: 'Renderer 已接入 replay 三态事实，Inspector 正在验证这些事实是否完整进入快照。',
      primaryOpenLoop: '确认校验与证据分母为零时不会被误判为成功。',
      nextClosureTarget: '让下一轮快照同时保留已落地内容、未知边界和可审计证据。',
      continuitySummary: '当前 continuity state 已包含本轮落地结果、仍待核验项和下一步审计目标。',
      sameHerSelfLine: '当前自我说明只陈述已知事实，并明确保留未知项。',
      sameHerHoldDetail: '权限与项目状态需要按结构化计数核对。',
      sameHerDriftRisk: '若把未知校验视作通过，快照会错误标记为 grounded。',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-production-shaped-replay-facts',
      sessionId: 'session-production-shaped-replay-facts',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    const buildReplayReport = (input: {
      validationKnownTurnCount: number
      validationApprovedTurnCount: number
      validationBlockedTurnCount: number
      evidenceKnownTurnCount: number
      evidencePresentTurnCount: number
      evidenceMissingTurnCount: number
    }) => ({
      datasetFeedback: {
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 1,
          antiRestartRequiredTurnCount: 1,
          validationStatus: {
            knownTurnCount: input.validationKnownTurnCount,
            approvedTurnCount: input.validationApprovedTurnCount,
            blockedTurnCount: input.validationBlockedTurnCount,
            unknownTurnCount: 0,
          },
        },
        selfAuthoritySummary: {
          comparedTurnCount: 2,
          authoritySummaryTurnCount: 2,
          closenessPostureTurnCount: 2,
          contentCompleteTurnCount: 2,
          validationStatus: {
            knownTurnCount: input.validationKnownTurnCount,
            approvedTurnCount: input.validationApprovedTurnCount,
            blockedTurnCount: input.validationBlockedTurnCount,
            unknownTurnCount: 0,
          },
        },
        projectStateAuditSummary: {
          comparedTurnCount: 2,
          sameHerSummaryTurnCount: 2,
          sameHerSelfLineTurnCount: 2,
          currentPhaseTurnCount: 2,
          landedProgressTurnCount: 2,
          openClosureTurnCount: 2,
          nextClosureTargetTurnCount: 2,
          emotionalClosureTurnCount: 2,
          preDialogueAwarenessTurnCount: 2,
          richPreDialogueAwarenessTurnCount: 2,
          continuitySummaryTurnCount: 2,
          embodimentClosureTurnCount: 2,
          preDialogueClosureTurnCount: 2,
          contentCompleteTurnCount: 2,
          validationStatus: {
            knownTurnCount: input.validationKnownTurnCount,
            approvedTurnCount: input.validationApprovedTurnCount,
            blockedTurnCount: input.validationBlockedTurnCount,
            unknownTurnCount: 0,
          },
          evidenceStatus: {
            knownTurnCount: input.evidenceKnownTurnCount,
            presentTurnCount: input.evidencePresentTurnCount,
            missingTurnCount: input.evidenceMissingTurnCount,
            unknownTurnCount: 0,
          },
        },
        driftSignals: [],
      },
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    ;(replayStore as any).benchmarkReport = buildReplayReport({
      validationKnownTurnCount: 2,
      validationApprovedTurnCount: 2,
      validationBlockedTurnCount: 0,
      evidenceKnownTurnCount: 2,
      evidencePresentTurnCount: 2,
      evidenceMissingTurnCount: 0,
    })

    expect(store.preDialogueClosureSnapshot?.status).toBe('grounded')
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).toContain('Renderer 已接入 replay 三态事实，Inspector 正在验证这些事实是否完整进入快照。')
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).toContain('让下一轮快照同时保留已落地内容、未知边界和可审计证据。')
    expect(store.preDialogueClosureSnapshot?.emotionalClosureCue).toBe('identity-continuity')

    ;(replayStore as any).benchmarkReport = buildReplayReport({
      validationKnownTurnCount: 0,
      validationApprovedTurnCount: 0,
      validationBlockedTurnCount: 0,
      evidenceKnownTurnCount: 0,
      evidencePresentTurnCount: 0,
      evidenceMissingTurnCount: 0,
    })

    const partialClosureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
    expect(partialClosureText).toContain('validationApproved[可见回复校验通过率=n/a (0/0，分母为已知状态)]')
    expect(partialClosureText).toContain('evidencePresent[项目状态证据存在率=n/a (0/0，分母为已知状态)]')
    expect(JSON.stringify(store.projectStateContinuitySnapshot)).toContain('continuity state')
    expect(partialClosureText).toContain('identity-continuity')

    ;(replayStore as any).benchmarkReport = buildReplayReport({
      validationKnownTurnCount: 2,
      validationApprovedTurnCount: 1,
      validationBlockedTurnCount: 1,
      evidenceKnownTurnCount: 2,
      evidencePresentTurnCount: 1,
      evidenceMissingTurnCount: 1,
    })

    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).toContain('validationBlocked[可见回复校验阻断率=0.5 (1/2，分母为已知状态)]')
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).toContain('evidenceMissing[项目状态证据缺失率=0.5 (1/2，分母为已知状态)]')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('fails closed when any required replay fact summary is missing despite healthy project rows', () => {
    const replayStore = useAlicizationMindReplayStore()
    const store = useAlicizationSelfEvolutionInspectorStore()

    for (const omitSummary of [
      'projectStateAuditSummary',
      'selfAuthoritySummary',
      'emotionalClosureSummary',
    ] as const) {
      ;(replayStore as any).benchmarkReport = {
        datasetFeedback: createReplayFactDatasetFeedbackFixture({
          omitSummary,
        }),
      }

      expect(replayStore.benchmarkProjectStateRows.length).toBeGreaterThan(0)
      expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
    }
  })

  it('fails closed to a partial closure when an existing benchmark report has no replay fact summaries', () => {
    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: null,
        emotionalClosureSummary: null,
        selfAuthoritySummary: null,
        projectStateAuditSummary: null,
        driftSignals: [],
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()

    expect(replayStore.benchmarkProjectStateRows).toEqual([])
    expect(replayStore.benchmarkEmotionalClosureRows).toEqual([])
    expect(replayStore.benchmarkSelfAuthorityRows).toEqual([])
    expect(replayStore.benchmarkProjectStateAuditRows).toEqual([])
    expect(replayStore.benchmarkRuntimeSameHerProofSummary).toBeNull()
    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
    }))

    ;(replayStore as any).benchmarkReport = null

    expect(store.preDialogueClosureSnapshot).toBeNull()
  })

  it('marks incomplete emotional closure active-cue coverage as drift', () => {
    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: createReplayFactDatasetFeedbackFixture({
        comparedTurnCount: 2,
        activeCueTurnCount: 1,
      }),
    }

    const store = useAlicizationSelfEvolutionInspectorStore()

    expect(replayStore.benchmarkEmotionalClosureRows.find(row => row.key === 'emotional_closure_active_cue_rate')?.value).toBe(0.5)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
  })

  it('merges explicit drift status even when Chinese replay facts keep benchmark text selected', async () => {
    const explicitSummaryLine = '显式 closure 发现了需要保留的风险状态。'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-explicit-drift-with-chinese-benchmark-summary',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: '当前桌面状态由本地事实和项目证据共同约束。',
      currentPhase: '正在核验三态事实摘要与显式 closure 状态。',
      latestLandedProgress: '中文三态事实已经进入 Inspector。',
      primaryOpenLoop: '文本选择不能降低显式风险状态。',
      nextClosureTarget: '下一轮继续核对三态事实和 closure 状态。',
      continuitySummary: '当前 continuity state 保留了已知事实和风险边界。',
      sameHerSelfLine: '这里只陈述可核验状态。',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'drift',
        summaryLine: explicitSummaryLine,
        companionHeadlineLine: null,
        companionBriefingLine: '显式 closure 的状态必须参与最终严重度合并。',
        companionNextClosureLine: '下一轮继续核对三态事实和 closure 状态。',
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-explicit-drift-with-chinese-benchmark-summary',
      sessionId: 'session-explicit-drift-with-chinese-benchmark-summary',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: createReplayFactDatasetFeedbackFixture({
        includeProjectStateSummary: false,
      }),
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueClosureSnapshot?.summaryLine).toContain('情绪收束事实')
    expect(store.preDialogueClosureSnapshot?.summaryLine).not.toBe(explicitSummaryLine)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(store.preDialogueClosureSnapshot?.emotionalClosureCue).toBe('identity-continuity')
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).not.toContain('continuity_closure')
  })

  it('uses raw large-denominator replay counts instead of rounded display rates for closure status', () => {
    const replayStore = useAlicizationMindReplayStore()
    const buildLargeDenominatorReport = (input: {
      contentCompleteTurnCount?: number
      validationKnownTurnCount?: number
      validationBlockedTurnCount?: number
      validationUnknownTurnCount?: number
      evidenceKnownTurnCount?: number
      evidenceMissingTurnCount?: number
      evidenceUnknownTurnCount?: number
    }) => {
      const comparedTurnCount = 1000
      const validationKnownTurnCount = input.validationKnownTurnCount ?? comparedTurnCount
      const validationBlockedTurnCount = input.validationBlockedTurnCount ?? 0
      const validationUnknownTurnCount = input.validationUnknownTurnCount ?? 0
      const evidenceKnownTurnCount = input.evidenceKnownTurnCount ?? comparedTurnCount
      const evidenceMissingTurnCount = input.evidenceMissingTurnCount ?? 0
      const evidenceUnknownTurnCount = input.evidenceUnknownTurnCount ?? 0
      const contentCompleteTurnCount = input.contentCompleteTurnCount ?? comparedTurnCount
      return {
        datasetFeedback: {
          emotionalClosureSummary: {
            comparedTurnCount,
            activeCueTurnCount: comparedTurnCount,
            lowPressureRequiredTurnCount: 0,
            antiRestartRequiredTurnCount: 0,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
          },
          selfAuthoritySummary: {
            comparedTurnCount,
            authoritySummaryTurnCount: comparedTurnCount,
            closenessPostureTurnCount: comparedTurnCount,
            contentCompleteTurnCount,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
          },
          projectStateAuditSummary: {
            comparedTurnCount,
            sameHerSummaryTurnCount: comparedTurnCount,
            sameHerSelfLineTurnCount: comparedTurnCount,
            currentPhaseTurnCount: comparedTurnCount,
            landedProgressTurnCount: comparedTurnCount,
            openClosureTurnCount: comparedTurnCount,
            nextClosureTargetTurnCount: comparedTurnCount,
            emotionalClosureTurnCount: comparedTurnCount,
            preDialogueAwarenessTurnCount: comparedTurnCount,
            richPreDialogueAwarenessTurnCount: comparedTurnCount,
            continuitySummaryTurnCount: comparedTurnCount,
            embodimentClosureTurnCount: comparedTurnCount,
            preDialogueClosureTurnCount: comparedTurnCount,
            contentCompleteTurnCount,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
            evidenceStatus: {
              knownTurnCount: evidenceKnownTurnCount,
              presentTurnCount: Math.max(0, evidenceKnownTurnCount - evidenceMissingTurnCount),
              missingTurnCount: evidenceMissingTurnCount,
              unknownTurnCount: evidenceUnknownTurnCount,
            },
          },
          driftSignals: [],
        },
      }
    }
    const store = useAlicizationSelfEvolutionInspectorStore()

    ;(replayStore as any).benchmarkReport = buildLargeDenominatorReport({
      contentCompleteTurnCount: 999,
      validationKnownTurnCount: 999,
      validationBlockedTurnCount: 1,
      validationUnknownTurnCount: 1,
    })

    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_validation_blocked_rate')?.value).toBe(0)
    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_content_complete_rate')?.value).toBe(1)
    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_validation_unknown_rate')?.value).toBe(0)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')

    ;(replayStore as any).benchmarkReport = buildLargeDenominatorReport({
      contentCompleteTurnCount: 999,
      evidenceKnownTurnCount: 999,
      evidenceMissingTurnCount: 1,
      evidenceUnknownTurnCount: 1,
    })

    expect(replayStore.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_evidence_missing_rate')?.value).toBe(0)
    expect(replayStore.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_content_complete_rate')?.value).toBe(1)
    expect(replayStore.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_evidence_unknown_rate')?.value).toBe(0)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')

    ;(replayStore as any).benchmarkReport = buildLargeDenominatorReport({
      contentCompleteTurnCount: 999,
    })

    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_content_complete_rate')?.value).toBe(1)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')

    ;(replayStore as any).benchmarkReport = buildLargeDenominatorReport({
      validationKnownTurnCount: 999,
      validationUnknownTurnCount: 1,
      evidenceKnownTurnCount: 999,
      evidenceUnknownTurnCount: 1,
    })

    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_validation_unknown_rate')?.value).toBe(0)
    expect(replayStore.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_evidence_unknown_rate')?.value).toBe(0)
    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')

    ;(replayStore as any).benchmarkReport = buildLargeDenominatorReport({
      validationKnownTurnCount: 0,
      validationUnknownTurnCount: 1,
      evidenceKnownTurnCount: 0,
      evidenceUnknownTurnCount: 1,
    })

    expect(replayStore.benchmarkSelfAuthorityRows.find(row => row.key === 'self_authority_validation_approved_rate')?.value).toBeNull()
    expect(replayStore.benchmarkProjectStateAuditRows.find(row => row.key === 'project_state_audit_evidence_present_rate')?.value).toBeNull()
    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
  })

  it('keeps raw benchmark status severity when richer explicit closure supplies the text', async () => {
    const explicitSummaryLine = '桌面 Inspector 已载入本轮可核验事实，显式 closure 负责保留自然摘要。'
    const explicitNextClosureLine = '下一轮继续核对低频失败事实，同时保留当前 continuity state。'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-rich-explicit-closure-status-merge',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: '当前桌面状态由本地记忆、权限计数和项目证据共同约束。',
      currentPhase: '正在核验 replay 原始事实与 Inspector closure 的一致性。',
      latestLandedProgress: 'Renderer 已把三态计数接入 Inspector，显式 closure 文本仍保持自然可读。',
      primaryOpenLoop: '低频失败事实不得被两位展示比例掩盖。',
      nextClosureTarget: explicitNextClosureLine,
      continuitySummary: '当前 continuity state 已包含进展、未决项和下一步核验目标。',
      sameHerSelfLine: '状态摘要只陈述结构化事实与明确未知边界。',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'grounded',
        summaryLine: explicitSummaryLine,
        companionHeadlineLine: null,
        companionBriefingLine: '显式 closure 保留本轮桌面事实，不覆盖 benchmark 的风险等级。',
        companionNextClosureLine: explicitNextClosureLine,
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-rich-explicit-closure-status-merge',
      sessionId: 'session-rich-explicit-closure-status-merge',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    const buildCompleteReport = (input: {
      contentCompleteTurnCount?: number
      validationBlockedTurnCount?: number
      validationUnknownTurnCount?: number
      evidenceMissingTurnCount?: number
      evidenceUnknownTurnCount?: number
    }) => {
      const comparedTurnCount = 1000
      const validationBlockedTurnCount = input.validationBlockedTurnCount ?? 0
      const validationUnknownTurnCount = input.validationUnknownTurnCount ?? 0
      const validationKnownTurnCount = comparedTurnCount - validationUnknownTurnCount
      const evidenceMissingTurnCount = input.evidenceMissingTurnCount ?? 0
      const evidenceUnknownTurnCount = input.evidenceUnknownTurnCount ?? 0
      const evidenceKnownTurnCount = comparedTurnCount - evidenceUnknownTurnCount
      const contentCompleteTurnCount = input.contentCompleteTurnCount ?? comparedTurnCount
      return {
        packId: 'sampled-humanlike-memory-v1',
        ranAt: 1_700_000_000_000,
        turnCount: comparedTurnCount,
        quality: [],
        standards: {},
        gate: {
          passed: true,
          failingKeys: [],
          dimensions: [],
        },
        finalReplayGate: {
          passed: true,
          failingKeys: [],
          report: [],
        },
        shipGate: [],
        telemetryPatch: {},
        telemetryPersisted: true,
        failingTurnSet: [],
        regressionTriage: [],
        datasetFeedback: {
          backlogKey: 'replay_benchmark_dataset_backlog_v1',
          appendedCount: 0,
          totalCount: comparedTurnCount,
          persisted: true,
          projectStateSummary: {
            comparedTurnCount,
            identityHitCount: comparedTurnCount,
            phaseHitCount: comparedTurnCount,
            openLoopHitCount: comparedTurnCount,
            sameHerHitCount: comparedTurnCount,
            proactiveSameHerGapHitCount: comparedTurnCount,
            continuityHitCount: comparedTurnCount,
          },
          emotionalClosureSummary: {
            comparedTurnCount,
            activeCueTurnCount: comparedTurnCount,
            lowPressureRequiredTurnCount: 0,
            antiRestartRequiredTurnCount: 0,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
          },
          selfAuthoritySummary: {
            comparedTurnCount,
            authoritySummaryTurnCount: comparedTurnCount,
            closenessPostureTurnCount: comparedTurnCount,
            contentCompleteTurnCount,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
          },
          projectStateAuditSummary: {
            comparedTurnCount,
            sameHerSummaryTurnCount: comparedTurnCount,
            sameHerSelfLineTurnCount: comparedTurnCount,
            currentPhaseTurnCount: comparedTurnCount,
            landedProgressTurnCount: comparedTurnCount,
            openClosureTurnCount: comparedTurnCount,
            nextClosureTargetTurnCount: comparedTurnCount,
            emotionalClosureTurnCount: comparedTurnCount,
            preDialogueAwarenessTurnCount: comparedTurnCount,
            richPreDialogueAwarenessTurnCount: comparedTurnCount,
            continuitySummaryTurnCount: comparedTurnCount,
            embodimentClosureTurnCount: comparedTurnCount,
            preDialogueClosureTurnCount: comparedTurnCount,
            contentCompleteTurnCount,
            validationStatus: {
              knownTurnCount: validationKnownTurnCount,
              approvedTurnCount: Math.max(0, validationKnownTurnCount - validationBlockedTurnCount),
              blockedTurnCount: validationBlockedTurnCount,
              unknownTurnCount: validationUnknownTurnCount,
            },
            evidenceStatus: {
              knownTurnCount: evidenceKnownTurnCount,
              presentTurnCount: Math.max(0, evidenceKnownTurnCount - evidenceMissingTurnCount),
              missingTurnCount: evidenceMissingTurnCount,
              unknownTurnCount: evidenceUnknownTurnCount,
            },
          },
          driftSignals: [],
        },
      }
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    ;(replayStore as any).benchmarkReport = buildCompleteReport({
      validationBlockedTurnCount: 1,
    })

    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: explicitSummaryLine,
      companionNextClosureLine: explicitNextClosureLine,
      emotionalClosureCue: 'identity-continuity',
    }))

    ;(replayStore as any).benchmarkReport = buildCompleteReport({
      evidenceMissingTurnCount: 1,
    })

    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: explicitSummaryLine,
    }))

    ;(replayStore as any).benchmarkReport = buildCompleteReport({
      contentCompleteTurnCount: 999,
    })

    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'drift',
      summaryLine: explicitSummaryLine,
    }))

    ;(replayStore as any).benchmarkReport = buildCompleteReport({
      validationUnknownTurnCount: 1,
      evidenceUnknownTurnCount: 1,
    })

    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: explicitSummaryLine,
      companionNextClosureLine: explicitNextClosureLine,
      emotionalClosureCue: 'identity-continuity',
    }))
    expect(JSON.stringify(store.preDialogueClosureSnapshot)).not.toContain('continuity_closure')
  })

  it('removes a transported continuity closure marker while retaining the real closure line and cue', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-continuity-closure-marker-cleanup',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: '本地桌面状态由当前会话事实、记忆证据和权限边界共同约束。',
      currentPhase: '当前正在核验 renderer 到 inspector 的事实传播。',
      latestLandedProgress: '真实的 companion closure 已从最新桌面观察进入 continuity state。',
      primaryOpenLoop: '内部 marker 仍需在暴露给 inspector 前被清除。',
      nextClosureTarget: '下一轮继续沿已落地事实核对校验与证据状态。',
      continuitySummary: '当前 identity continuity 有真实进展、明确未决项和下一步。',
      sameHerSelfLine: '这里只保留结构化事实，不把内部 marker 当作情绪提示。',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: '桌面观察已提供可核验的进展与未决事项。',
        companionHeadlineLine: null,
        companionBriefingLine: '当前校验边界仍需保持可见。',
        companionNextClosureLine: '下一轮继续沿已落地事实核对校验与证据状态。',
        emotionalClosureCue: 'continuity_closure: stale internal marker',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-continuity-closure-marker-cleanup',
      sessionId: 'session-continuity-closure-marker-cleanup',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const closure = store.projectStateContinuitySnapshot?.preDialogueClosure
    expect(closure).toEqual(expect.objectContaining({
      companionNextClosureLine: '下一轮继续沿已落地事实核对校验与证据状态。',
      emotionalClosureCue: 'identity-continuity',
    }))
    expect(JSON.stringify(closure)).not.toContain('continuity_closure')
    expect(JSON.stringify(store.projectStateContinuitySnapshot)).toContain('continuity state')
    expect(JSON.stringify(closure)).toContain('identity-continuity')
  })

  it('builds the pre-dialogue closure snapshot from the latest project-state observation when the canonical continuity snapshot is unavailable', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-project-state-observation-fallback',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue(null)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation',
      sessionId: 'session-project-state-observation',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'needs-human-refresh',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'same digital life | keep project identity and Phase 1 open loop in view before outward reply',
        companionHeadlineLine: null,
        companionBriefingLine: '我得先记住这是同一个桌面数字生命项目，已经有 continuity carry，但当前 Phase 1 的未闭环项还要继续显式带着走。',
        companionNextClosureLine: 'Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
        awarenessLine: '我得先记住这是同一个桌面数字生命项目，已经有 continuity carry，但当前 Phase 1 的未闭环项还要继续显式带着走。',
        emotionalClosureCue: null,
        reasonPreview: [
          'same digital life | keep project identity and Phase 1 open loop in view before outward reply',
          'Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
        ],
      },
      projectState: {
        identity: 'Alicization is a local-first digital lifeform learning to stay coherent on the desktop.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
        primaryOpenLoop: 'Keep the same project identity and open Phase 1 loop visible even when the primary continuity getter is unavailable.',
        nextClosureTarget: 'Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
        continuitySummary: 'same digital life | landed progress and open loop still need to stay on one readable continuity line before outward reply outward.',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 2,
          identityHitCount: 1,
          phaseHitCount: 1,
          openLoopHitCount: 1,
          continuityHitCount: 1,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 2,
          },
        },
        driftSignals: [],
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(getProjectStateContinuitySnapshot).toBeCalledTimes(1)
    expect(getLatestProjectStateObservation).toBeCalledTimes(1)
    expect(store.projectStateContinuitySnapshot).toEqual(expect.objectContaining({
      identity: '',
      currentPhase: '',
      latestLandedProgress: 'Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
      nextClosureTarget: 'Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
      nonHumanAuthoredStatus: 'needs-human-refresh',
      turnId: 'turn-project-state-observation',
      sessionId: 'session-project-state-observation',
      origin: 'user-turn',
    }))
    expect(store.preDialogueAwarenessSnapshot).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: null,
      companionNextClosureLine: 'Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
    }))
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.')
    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'partial',
      companionHeadlineLine: null,
      briefingLines: expect.arrayContaining([
        expect.stringContaining('validationUnknown[可见回复校验未知率=1 (2/2，分母为全部比较 turn)]'),
        'Landed: Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.',
        'Next closure: Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.',
      ]),
    }))
    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(closureText).toContain('validationApproved[可见回复校验通过率=n/a (0/0，分母为已知状态)]')
    expect(closureText).toContain('validationUnknown[可见回复校验未知率=1 (2/2，分母为全部比较 turn)]')
    expect(closureText).toContain('Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.')
    expect(closureText).toContain('Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.')
    expect(store.preDialogueClosureSnapshot?.reasons).toEqual(expect.arrayContaining([
      expect.stringContaining('Latest landed progress still holds at Renderer-side preparation now preserves the latest project-state observation before a dialogue turn starts.'),
      expect.stringContaining('Next closure target is still Carry the fallback project-state brief into the next dialogue preparation cycle without drifting into generic assistant behavior.'),
    ]))
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('reuses rebuilt richer latest observation awareness when the transported awareness shell is empty and the canonical continuity snapshot is unavailable', async () => {
    const identity = 'Alicization 还是本地优先数字生命项目。'
    const currentPhase = '她仍在 Phase 1。'
    const latestLandedProgress = '这次修复已经在本地 main 落地，而且执行前项目自我提醒链已经接上了。'
    const primaryOpenLoop = 'origin/main 现在还不能直接安全推进，因为还会裹挟额外本地提交，而且 host-visible continuity 还要继续把已验证和未闭环边界分开。'
    const nextClosureTarget = '继续把本地 main 已落地、origin/main 仍不安全、预计收口时机、以及切回中文这几件事留在当前对话闭环里。'

    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-project-state-observation-empty-awareness-shell',
      candidates: [],
      reasonCodes: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue(null)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-empty-awareness-shell',
      sessionId: 'session-project-state-observation-empty-awareness-shell',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'needs-human-refresh',
      projectState: {
        identity,
        currentPhase,
        latestLandedProgress,
        primaryOpenLoop,
        nextClosureTarget,
        continuitySummary: '',
        sameHerSelfLine: '',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: '',
        companionHeadlineLine: '',
        companionBriefingLine: '',
        companionNextClosureLine: '',
        awarenessLine: '',
        emotionalClosureCue: '',
        reasonPreview: [],
      },
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const awarenessText = JSON.stringify([
      store.projectStateContinuitySnapshot?.preDialogueAwareness,
      store.preDialogueAwarenessSnapshot,
    ])
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('partial')
    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(awarenessText).toContain(latestLandedProgress)
    expect(awarenessText).toContain(primaryOpenLoop)
    expect(awarenessText).toContain(nextClosureTarget)
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('degrades to null snapshot without error when the bridge does not expose self-evolution state', async () => {
    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState: undefined,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    const snapshot = await store.refresh()

    expect(snapshot).toBeNull()
    expect(store.snapshot).toBeNull()
    expect(store.lastError).toBeNull()
  })

  it('surfaces lane-shrinkage risk in the pre-dialogue closure snapshot when embodiment continuity is only surviving through lipsync', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-lane-risk',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-lane-risk',
        status: 'active',
        sourceEventId: 'event-lane-risk',
        decisionTraceId: 'trace-lane-risk',
        sourceTurnId: 'turn-lane-risk',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-lane-risk',
          sourceEventId: 'event-lane-risk',
          sourceTurnId: 'turn-lane-risk',
          decisionTraceId: 'trace-lane-risk',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue(null)
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Lane-level continuity observability is now visible before dialogue starts.',
      primaryOpenLoop: 'Recover full cross-modal identity-continuity',
      nextClosureTarget: 'Rebuild face, motion, lipsync, and voice into one identity-continuity',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-lane-risk',
      sessionId: 'session-lane-risk',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 3,
          openLoopHitCount: 2,
          continuityHitCount: 2,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 3,
          },
        },
        driftSignals: [],
      },
    }
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-lane-risk',
        turnId: 'turn-lane-risk',
        sessionId: 'session-lane-risk',
        origin: 'user-turn',
        activeThreadId: 'thread-lane-risk',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-lane-risk',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-lane-risk',
            patchId: 'patch-lane-risk',
            patchDecisionTraceId: 'trace-lane-risk',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          rendererSignals: {
            speechSummary: 'measured-return | lane=lipsync-only',
            driverAuthority: {
              segmentId: 'segment-lane-risk',
              channel: 'speech',
              activeThreadId: 'thread-lane-risk',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['lipsync'],
              matchedSources: ['prosody-authority'],
              bindingSummary: 'renderer authority binding | segment=segment-lane-risk | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
              settleSummary: 'renderer authority settle | segment=segment-lane-risk | target=vrm | drivers=lipsync | sources=prosody-authority | lane=lipsync-only',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(closureText).toContain('lipsync')
    expect(closureText).toContain('full cross-modal identity-continuity recovery as still open')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('surfaces full-cross-modal-lock as grounded embodiment carry instead of drift when body continuity and Live2D manifestation are re-locked together', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-cross-modal-lock',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-cross-modal-lock',
        status: 'active',
        sourceEventId: 'event-cross-modal-lock',
        decisionTraceId: 'trace-cross-modal-lock',
        sourceTurnId: 'turn-cross-modal-lock',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-cross-modal-lock',
          sourceEventId: 'event-cross-modal-lock',
          sourceTurnId: 'turn-cross-modal-lock',
          decisionTraceId: 'trace-cross-modal-lock',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['response-posture'],
          memoryPolicy: {
            strictnessBias: 0.12,
            wrongThreadSuppressionBias: 0.14,
            provenanceLabelBias: 0.18,
            recallExpansionBias: 0.04,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.08,
            closenessCapBias: 0.1,
            warmthReleaseBias: 0.06,
          },
          responsePosture: {
            secondPassRequiredBias: 0.09,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.11,
            templateShellSuppressionBias: 0.13,
          },
          proactivePolicy: {
            restraintBias: 0.18,
            learningProposalBias: 0.12,
            actuationCooldownBias: 0.16,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Renderer-side same-her lock is stable enough to stay explicit.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 180,
        rolledBackAt: null,
        createdAt: 120,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue(null)
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Runtime continuity can now keep body continuity and Live2D manifestation on one explicit identity-continuity',
      primaryOpenLoop: 'Keep the re-locked same-her embodiment line explicit all the way into host-visible continuity.',
      nextClosureTarget: 'Carry the re-locked body and Live2D line forward without flattening it into a temporary visual recovery note.',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-cross-modal-lock',
      sessionId: 'session-cross-modal-lock',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 3,
          openLoopHitCount: 3,
          continuityHitCount: 3,
          sameHerHitCount: 3,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 3,
          },
        },
        driftSignals: [],
      },
    }
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-cross-modal-lock',
        turnId: 'turn-cross-modal-lock',
        sessionId: 'session-cross-modal-lock',
        origin: 'user-turn',
        activeThreadId: 'thread-cross-modal-lock',
        createdAt: 180,
        lastUpdatedAt: 220,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-cross-modal-lock',
          producedAt: 220,
          activeSelfRevision: {
            candidateId: 'candidate-cross-modal-lock',
            patchId: 'patch-cross-modal-lock',
            patchDecisionTraceId: 'trace-cross-modal-lock',
            lanes: ['response-posture'],
            reasonCodes: ['domain:presence'],
            summary: 'Renderer-side same-her lock is stable enough to stay explicit.',
          },
          rendererSignals: {
            speechSummary: 'measured-return | bodyContinuityPhase=full-cross-modal-lock | one explicit same-her embodiment line',
            driverAuthority: {
              segmentId: 'segment-cross-modal-lock',
              channel: 'speech',
              activeThreadId: 'thread-cross-modal-lock',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['face', 'motion', 'lipsync'],
              matchedSources: ['resident-body-continuity', 'prosody-authority', 'timeline-projection'],
              authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:yes',
              bindingSummary: 'renderer authority binding | segment=segment-cross-modal-lock | target=live2d | drivers=face+motion+lipsync | sources=resident-body-continuity+prosody-authority+timeline-projection | bodyContinuityPhase=full-cross-modal-lock | authorityMatchSummary=body:yes face:yes motion:yes lipsync:yes',
              settleSummary: 'renderer authority settle | segment=segment-cross-modal-lock | target=live2d | drivers=face+motion+lipsync | sources=resident-body-continuity+prosody-authority+timeline-projection | bodyContinuityPhase=full-cross-modal-lock | authorityMatchSummary=body:yes face:yes motion:yes lipsync:yes',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('partial')
    expect(closureText).toContain('full-cross-modal-lock')
    expect(closureText).toContain('validationUnknown[可见回复校验未知率=1 (3/3，分母为全部比较 turn)]')
    expect(closureText).toContain('Carry the re-locked body and Live2D line forward without flattening it into a temporary visual recovery note.')
    expect(closureText).not.toContain('full cross-modal identity-continuity recovery as still open')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('lets the inspector select a non-active candidate for drill-down details', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [
        {
          version: 'self-evolution-version-candidate-v1',
          id: 'candidate-shadow',
          status: 'shadow',
          sourceEventId: 'event-shadow',
          decisionTraceId: 'trace-shadow',
          sourceTurnId: 'turn-shadow',
          patch: {
            version: 'self-revision-state-patch-v1',
            id: 'patch-shadow',
            sourceEventId: 'event-shadow',
            sourceTurnId: 'turn-shadow',
            decisionTraceId: 'trace-shadow',
            domain: 'world-model',
            action: 'verify',
            resultStatus: 'completed',
            lanes: ['memory-policy', 'rollback-validation'],
            memoryPolicy: {
              strictnessBias: 0.74,
              wrongThreadSuppressionBias: 0.33,
              provenanceLabelBias: 0.55,
              recallExpansionBias: 0.08,
              shouldQuarantineUnsupportedCarry: true,
            },
            relationshipPosture: {
              repairWindowBias: 0,
              closenessCapBias: 0,
              warmthReleaseBias: 0,
            },
            responsePosture: {
              secondPassRequiredBias: 0.4,
              hypothesisLabelBias: 0.3,
              specificityClampBias: 0.52,
              templateShellSuppressionBias: 0.21,
            },
            proactivePolicy: {
              restraintBias: 0.1,
              learningProposalBias: 0.12,
              actuationCooldownBias: 0.18,
            },
            validation: {
              requiresRollbackCheck: true,
              requiresRevalidation: true,
              rollbackPlan: ['restore-world-model-confidence'],
            },
            reasonCodes: ['domain:world-model', 'rollback-validation-required'],
            summary: 'Shadow candidate still blocked by replay gates.',
          },
          validation: {
            replayRequired: true,
            replayPassed: null,
            rollbackSupported: true,
            activationBlockedReasons: ['self-evolution:shadow-replay-required', 'self-evolution:final-replay-gate-required'],
            finalReplayGatePassed: null,
            productionGoldSampleCount: null,
            productionGoldCoverage: null,
          },
          activatedAt: null,
          rolledBackAt: null,
          createdAt: 90,
        },
        {
          version: 'self-evolution-version-candidate-v1',
          id: 'candidate-active',
          status: 'active',
          sourceEventId: 'event-active',
          decisionTraceId: 'trace-active',
          sourceTurnId: 'turn-active',
          patch: {
            version: 'self-revision-state-patch-v1',
            id: 'patch-active',
            sourceEventId: 'event-active',
            sourceTurnId: 'turn-active',
            decisionTraceId: 'trace-active',
            domain: 'self-model',
            action: 'revise',
            resultStatus: 'completed',
            lanes: ['memory-policy'],
            memoryPolicy: {
              strictnessBias: 0.4,
              wrongThreadSuppressionBias: 0.2,
              provenanceLabelBias: 0.3,
              recallExpansionBias: 0.05,
              shouldQuarantineUnsupportedCarry: false,
            },
            relationshipPosture: {
              repairWindowBias: 0,
              closenessCapBias: 0,
              warmthReleaseBias: 0,
            },
            responsePosture: {
              secondPassRequiredBias: 0.1,
              hypothesisLabelBias: 0.08,
              specificityClampBias: 0.2,
              templateShellSuppressionBias: 0.12,
            },
            proactivePolicy: {
              restraintBias: 0.05,
              learningProposalBias: 0.1,
              actuationCooldownBias: 0.07,
            },
            validation: {
              requiresRollbackCheck: false,
              requiresRevalidation: false,
              rollbackPlan: [],
            },
            reasonCodes: ['domain:self-model'],
            summary: 'Active candidate.',
          },
          validation: {
            replayRequired: true,
            replayPassed: true,
            rollbackSupported: true,
            activationBlockedReasons: [],
            finalReplayGatePassed: true,
            productionGoldSampleCount: 5,
            productionGoldCoverage: 1,
          },
          activatedAt: 120,
          rolledBackAt: null,
          createdAt: 100,
        },
      ],
      reasonCodes: ['self-evolution:shadow-candidates-present', 'self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.activeCandidate?.id).toBe('candidate-active')
    expect(store.selectedCandidate?.id).toBe('candidate-active')

    store.selectCandidate('candidate-shadow')

    expect(store.selectedCandidate?.id).toBe('candidate-shadow')
    expect(store.selectedCandidate?.validation.activationBlockedReasons).toEqual([
      'self-evolution:shadow-replay-required',
      'self-evolution:final-replay-gate-required',
    ])
    expect(store.selectedCandidate?.patch.validation.rollbackPlan).toEqual([
      'restore-world-model-confidence',
    ])
  })

  it('explains project-state continuity blocks in same-her internalization terms', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: null,
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-shadow',
        status: 'shadow',
        sourceEventId: 'event-shadow',
        decisionTraceId: 'trace-shadow',
        sourceTurnId: 'turn-shadow',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-shadow',
          sourceEventId: 'event-shadow',
          sourceTurnId: 'turn-shadow',
          decisionTraceId: 'trace-shadow',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.52,
            wrongThreadSuppressionBias: 0.37,
            provenanceLabelBias: 0.44,
            recallExpansionBias: 0.08,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.16,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.29,
            hypothesisLabelBias: 0.17,
            specificityClampBias: 0.34,
            templateShellSuppressionBias: 0.21,
          },
          proactivePolicy: {
            restraintBias: 0.23,
            learningProposalBias: 0.12,
            actuationCooldownBias: 0.19,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Candidate should not internalize until identity-continuity',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: false,
          activationBlockedReasons: ['self-evolution:project-state-continuity-drift'],
          projectStateContinuityReasons: [
            'self-evolution:project-state-continuity-drift',
            'self-evolution:project-state-identity-carry-weak',
            'self-evolution:project-state-phase-carry-weak',
            'self-evolution:project-state-open-loop-carry-weak',
          ],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: null,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:shadow-candidates-present', 'self-evolution:no-active-version'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const readinessSummary = (store as any).selectedCandidateInternalizationReadinessSummary
    const readinessText = JSON.stringify(readinessSummary)
    expect(readinessSummary.status).toBe('drift')
    expect(readinessText).toContain('Project identity carry is still weak')
    expect(readinessText).toContain('Unresolved closure carry is still weak')
    expectNoFixedTemplateResidue(readinessSummary)
  })

  it('drills the selected candidate into the matching decision trace when available', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    const queryReplayLab = vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [],
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(queryReplayLab).toBeCalledWith({
      activeSelfEvolutionCandidateId: 'candidate-active',
      decisionTraceId: undefined,
      limit: 200,
    })
  })

  it('derives structured trace summary and coverage from the drilled trace record', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['governance-normalized', 'persistence-written', 'learning-executed'],
        governance: {
          turnMode: 'answer',
          truthState: 'grounded',
          repairState: 'none',
          answerSubject: 'self-model',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: null,
        },
        learningExecuted: { action: 'revise' },
        memoryResolutionLedger: { version: 'memory-resolution-ledger-v1' } as any,
        memoryStageReplay: { version: 'organic-memory-stage-replay-v1', producedAt: 100, stages: [] },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceSummary).toContain('turn=answer')
    expect(store.selectedCandidateTraceSummary).toContain('truth=grounded')
    expect(store.selectedCandidateTraceSummary).toContain('learning-executed=present')
    expect(store.selectedCandidateTraceCoverage).toBe('complete')
  })

  it('derives structured trace detail rows from the drilled trace record', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-1',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'governance-normalized',
        payload: null,
        createdAt: 100,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['governance-normalized', 'persistence-written', 'learning-executed'],
        governance: {
          turnMode: 'answer',
          truthState: 'grounded',
          repairState: 'none',
          answerSubject: 'self-model',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: null,
        },
        learningExecuted: {
          action: 'revise',
          domain: 'self-model',
          resultSummary: 'corrected self-model seam',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['memory-policy', 'response-posture'],
            reasonCodes: ['domain:self-model'],
            summary: 'Active patch consumed inside the turn bundle.',
          },
          summary: 'source=main-runtime | self_revision=patch-active | learning=revise',
        },
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: 120,
          dominantClusterId: 'cluster-a',
          dominantClusterSummary: 'current self-model line',
          competingClusterId: 'cluster-b',
          competingClusterSummary: 'older self-story',
          candidates: [],
          selectedCandidates: [],
          rejectedCandidates: [],
          finalSurfacePolicy: 'internal-only',
          shouldStayInward: true,
          shouldDelayUntilAfterPayoff: false,
          stableCoreOnly: false,
          suppressionTags: ['self-model-stale'],
          closureState: 'inward-only',
          surfaceConfidence: 0.72,
          shouldLabelUncertainty: false,
          visibleCarryMode: 'withhold',
          conflictPressure: 'medium',
          retrievalQuality: 'high',
          finalRationale: 'new self-model evidence should replace the older line first.',
        },
        memoryStageReplay: {
          version: 'organic-memory-stage-replay-v1',
          producedAt: 120,
          stages: [{
            stage: 'self-evolution-integration',
            summary: 'Synthesized self-evolution kernel.',
            latencyMs: 12,
            budgetClass: 'realtime-reply',
            inputs: ['trace-active'],
            outputs: ['self-evolution-kernel-v1'],
            diagnostics: ['active self revision applied'],
          }],
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceDetails.eventKinds).toEqual([
      'governance-normalized',
      'persistence-written',
      'learning-executed',
    ])
    expect(store.selectedCandidateTraceDetails.governance?.turnMode).toBe('answer')
    expect(store.selectedCandidateTraceDetails.learning?.resultSummary).toBe('corrected self-model seam')
    expect(store.selectedCandidateTraceDetails.memoryResolution?.suppressionTags).toEqual(['self-model-stale'])
    expect(store.selectedCandidateTraceDetails.memoryStage?.summary).toBe('Synthesized self-evolution kernel.')
    expect(store.selectedCandidateTraceConsumptionEvidence).toEqual({
      status: 'consumed',
      tracePatchId: 'patch-active',
      tracePatchDecisionTraceId: 'trace-active',
      traceLanes: ['memory-policy', 'response-posture'],
      traceReasonCodes: ['domain:self-model'],
      matchedCandidateId: 'candidate-active',
      matchedActiveCandidateId: true,
      matchedDecisionTraceId: true,
      matchedPatchId: true,
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'The drilled trace bundle records the same active self-evolution candidate id as the selected candidate.',
        'The drilled trace bundle records the same active self-revision patch id as the selected candidate.',
        'The drilled trace bundle points back to the selected candidate decision trace.',
      ],
    })
  })

  it('tracks cross-turn traces that consume the selected active candidate', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    const queryReplayLab = vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [
        {
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          activeThreadId: 'thread-active',
          createdAt: 100,
          lastUpdatedAt: 110,
          eventKinds: ['governance-normalized'],
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 100,
            activeSelfRevision: {
              candidateId: 'candidate-active',
              patchId: 'patch-active',
              patchDecisionTraceId: 'trace-active',
              lanes: ['memory-policy', 'response-posture'],
              reasonCodes: ['domain:self-model'],
              summary: 'Turn consumed the active self revision.',
            },
            summary: 'source=main-runtime | self_revision=patch-active',
          },
        },
        {
          decisionTraceId: 'trace-followup',
          turnId: 'turn-followup',
          sessionId: 'session-followup',
          origin: 'user-turn',
          activeThreadId: 'thread-followup',
          createdAt: 120,
          lastUpdatedAt: 130,
          eventKinds: ['governance-normalized'],
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 120,
            activeSelfRevision: {
              candidateId: 'candidate-active',
              patchId: 'patch-active',
              patchDecisionTraceId: 'trace-active',
              lanes: ['memory-policy'],
              reasonCodes: ['domain:self-model'],
              summary: 'Follow-up turn still consumes the same active self revision.',
            },
            summary: 'source=main-runtime | self_revision=patch-active',
          },
        },
        {
          decisionTraceId: 'trace-other',
          turnId: 'turn-other',
          sessionId: 'session-other',
          origin: 'user-turn',
          activeThreadId: 'thread-other',
          createdAt: 140,
          lastUpdatedAt: 150,
          eventKinds: ['governance-normalized'],
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 140,
            activeSelfRevision: {
              candidateId: 'candidate-other',
              patchId: 'patch-other',
              patchDecisionTraceId: 'trace-other',
              lanes: ['response-posture'],
              reasonCodes: ['domain:world-model'],
              summary: 'Different active self revision.',
            },
            summary: 'source=main-runtime | self_revision=patch-other',
          },
        },
      ] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(queryReplayLab).toBeCalledWith({
      activeSelfEvolutionCandidateId: 'candidate-active',
      limit: 200,
    })

    expect(store.selectedCandidateConsumedTraceSummaries).toEqual([
      {
        decisionTraceId: 'trace-followup',
        turnId: 'turn-followup',
        consumedAt: 130,
        lanes: ['memory-policy'],
        summary: 'Follow-up turn still consumes the same active self revision.',
        learningAction: null,
        trajectorySummary: 'lanes=memory-policy | learning=n/a',
      },
      {
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        consumedAt: 110,
        lanes: ['memory-policy', 'response-posture'],
        summary: 'Turn consumed the active self revision.',
        learningAction: null,
        trajectorySummary: 'lanes=memory-policy, response-posture | learning=n/a',
      },
    ])
    expect(store.selectedCandidateConsumptionStability).toEqual({
      consumedTurnCount: 2,
      latestConsumedAt: 130,
      latestDecisionTraceId: 'trace-followup',
      laneCoverage: ['memory-policy', 'response-posture'],
      dominantLearningAction: null,
      driftDetected: false,
      reasons: [
        'The selected active candidate is still being consumed across 2 drilled traces.',
        'No drilled trace currently shows candidate identity drift away from the selected active candidate.',
      ],
    })
  })

  it('detects long-horizon candidate consumption drift when later traces shift learning direction and lane mix', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.2,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.1,
            closenessCapBias: 0.1,
            warmthReleaseBias: 0.05,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.1,
          },
          proactivePolicy: {
            restraintBias: 0.52,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.5,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [
        {
          decisionTraceId: 'trace-drift-late',
          turnId: 'turn-late',
          sessionId: 'session-active',
          origin: 'user-turn',
          activeThreadId: 'thread-active',
          createdAt: 150,
          lastUpdatedAt: 190,
          eventKinds: ['governance-normalized'],
          derivedMindStateBundle: {
            activeSelfRevision: {
              candidateId: 'candidate-active',
              lanes: ['learning-policy', 'proactive-policy'],
              summary: 'Later consumption drifted into learning-policy carry.',
            },
          },
          governance: {
            digitalLifeSpine: {
              memory: {
                nextLearningAction: 'record',
              },
            },
          },
        },
        {
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          activeThreadId: 'thread-active',
          createdAt: 100,
          lastUpdatedAt: 120,
          eventKinds: ['governance-normalized'],
          derivedMindStateBundle: {
            activeSelfRevision: {
              candidateId: 'candidate-active',
              lanes: ['proactive-policy', 'response-posture'],
              summary: 'Turn consumed the active self revision.',
            },
          },
          governance: {
            digitalLifeSpine: {
              memory: {
                nextLearningAction: 'verify',
              },
            },
          },
        },
      ] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateConsumptionStability).toEqual({
      consumedTurnCount: 2,
      latestConsumedAt: 190,
      latestDecisionTraceId: 'trace-drift-late',
      laneCoverage: ['learning-policy', 'proactive-policy', 'response-posture'],
      dominantLearningAction: 'record',
      driftDetected: true,
      reasons: [
        'The selected active candidate is still being consumed across 2 drilled traces.',
        'Later candidate consumption is shifting lane mix or learning direction, which suggests the long-horizon personality effect is no longer staying perfectly stable.',
      ],
    })

    expect(store.selectedCandidateConsumedTraceSummaries).toEqual([
      {
        decisionTraceId: 'trace-drift-late',
        turnId: 'turn-late',
        consumedAt: 190,
        lanes: ['learning-policy', 'proactive-policy'],
        summary: 'Later consumption drifted into learning-policy carry.',
        learningAction: 'record',
        trajectorySummary: 'lanes=learning-policy, proactive-policy | learning=record',
      },
      {
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        consumedAt: 120,
        lanes: ['proactive-policy', 'response-posture'],
        summary: 'Turn consumed the active self revision.',
        learningAction: 'verify',
        trajectorySummary: 'lanes=proactive-policy, response-posture | learning=verify',
      },
    ])
  })

  it('derives readable trace event timeline rows for the selected candidate', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-2',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'learning-executed',
          payload: {
            action: 'revise',
            domain: 'self-model',
            resultSummary: 'corrected self-model seam',
          },
          createdAt: 130,
        },
        {
          id: 'evt-1',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'governance-normalized',
          payload: {
            turnMode: 'answer',
            truthState: 'grounded',
            repairState: 'none',
          },
          createdAt: 100,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['governance-normalized', 'learning-executed'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceEvents).toEqual([
      expect.objectContaining({
        id: 'evt-1',
        kind: 'governance-normalized',
        summary: 'turn=answer | truth=grounded | repair=none',
      }),
      expect.objectContaining({
        id: 'evt-2',
        kind: 'learning-executed',
        summary: 'action=revise | domain=self-model | corrected self-model seam',
      }),
    ])
  })

  it('falls back to payload summary or message for non-governance non-learning trace events', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-2',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'takeover-audit',
          payload: {
            summary: 'Visible reply was overridden for truth discipline.',
          },
          createdAt: 110,
        },
        {
          id: 'evt-1',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-facts-upserted',
          payload: {
            message: 'Async memory facts were persisted.',
          },
          createdAt: 100,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['memory-facts-upserted', 'takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceEvents).toEqual([
      expect.objectContaining({
        id: 'evt-1',
        summary: 'Async memory facts were persisted.',
      }),
      expect.objectContaining({
        id: 'evt-2',
        summary: 'Visible reply was overridden for truth discipline.',
      }),
    ])
  })

  it('derives specialized summaries for takeover, memory writeback, coherence, and person-state events', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-4',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'takeover-audit',
          payload: {
            fallback_reason: 'unsupported-specificity',
          },
          createdAt: 140,
        },
        {
          id: 'evt-3',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-facts-upserted',
          payload: {
            factInputCount: 3,
            trigger: 'idle',
          },
          createdAt: 130,
        },
        {
          id: 'evt-2',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'reply-memory-coherence',
          payload: {
            coherenceState: 'inward-only',
          },
          createdAt: 120,
        },
        {
          id: 'evt-1',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'person-state-updated',
          payload: {
            sourceTrail: [{ kind: 'reflection' }],
          },
          createdAt: 110,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['person-state-updated', 'reply-memory-coherence', 'memory-facts-upserted', 'takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceEvents).toEqual([
      expect.objectContaining({
        kind: 'person-state-updated',
        summary: 'sourceTrail=1',
      }),
      expect.objectContaining({
        kind: 'reply-memory-coherence',
        summary: 'coherence=inward-only',
      }),
      expect.objectContaining({
        kind: 'memory-facts-upserted',
        summary: 'facts=3 | trigger=idle',
      }),
      expect.objectContaining({
        kind: 'takeover-audit',
        summary: 'fallback=unsupported-specificity',
      }),
    ])
  })

  it('derives specialized summaries for wrong-thread suppression, deferred follow-up, and reconsolidation events', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-3',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-reconsolidated',
          payload: {
            source: 'dialogue-feedback',
            feedback: 'robotic',
            reconsolidatedCount: 1,
          },
          createdAt: 130,
        },
        {
          id: 'evt-2',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-followup-deferred',
          payload: {
            preferredTiming: 'after-payoff',
            payoffDependency: 'requires-current-payoff',
          },
          createdAt: 120,
        },
        {
          id: 'evt-1',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-wrong-thread-suppressed',
          payload: {
            evidenceGap: 'need-disambiguation',
            conflictSeverity: 'high',
          },
          createdAt: 110,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['memory-wrong-thread-suppressed', 'memory-followup-deferred', 'memory-reconsolidated'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTraceEvents).toEqual([
      expect.objectContaining({
        kind: 'memory-wrong-thread-suppressed',
        summary: 'gap=need-disambiguation | conflict=high',
      }),
      expect.objectContaining({
        kind: 'memory-followup-deferred',
        summary: 'timing=after-payoff | dependency=requires-current-payoff',
      }),
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        summary: 'source=dialogue-feedback | feedback=robotic | count=1',
      }),
    ])
  })

  it('supports selecting a drilled trace event and exposes structured detail rows', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-1',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'governance-normalized',
          payload: {
            turnMode: 'answer',
            truthState: 'grounded',
            repairState: 'none',
          },
          createdAt: 100,
        },
        {
          id: 'evt-2',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'takeover-audit',
          payload: {
            fallback_reason: 'unsupported-specificity',
          },
          createdAt: 110,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 150,
        eventKinds: ['governance-normalized', 'takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedTraceEvent?.id).toBe('evt-1')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'turnMode', value: 'answer' },
      { label: 'truthState', value: 'grounded' },
      { label: 'repairState', value: 'none' },
    ])

    store.selectTraceEvent('evt-2')

    expect(store.selectedTraceEvent?.id).toBe('evt-2')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'fallbackReason', value: 'unsupported-specificity' },
    ])
  })

  it('derives richer structured detail rows for audit-heavy self-evolution trace events', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [
        {
          id: 'evt-takeover',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'takeover-audit',
          payload: {
            fallback_reason: 'unsupported-specificity',
            hard_fallback_reason: 'coarse-scene-budget',
            replyOverridden: true,
            visible_reply_authority: 'mind',
            visible_reply_realization_authority: 'mind-governor',
            visible_reply_realization_reason: 'proactive-opening-guidance-violation:callback-bounded',
            visible_reply_blocked_reasons: ['non-human-authored-visible-fallback', 'opening-guidance:callback-bounded'],
            claim_specificity_budget: 'coarse-scene',
            unsupported_specificity_cues: ['AppArbitorController', 'CaseApplyTypeEnum'],
            reasons: ['reply-introduced-unsupported-technical-specificity'],
          },
          createdAt: 100,
        },
        {
          id: 'evt-learning',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'system',
          kind: 'learning-executed',
          payload: {
            taskId: 'task-runtime-verify',
            action: 'verify',
            domain: 'world-model',
            resultSummary: 'Verified runtime seam and kept it pending internalization.',
            verificationBasis: ['trusted-source', 'runtime-result'],
            focuses: ['runtime-seam', 'belief-discipline'],
            verifiedArtifact: {
              version: 'verified-learning-artifact-v1',
              artifactId: 'artifact-runtime-1',
              claimGraph: {
                claimId: 'claim-runtime-1',
              },
            },
          },
          createdAt: 110,
        },
        {
          id: 'evt-person-state',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'person-state-updated',
          payload: {
            summary: 'Recent outcomes nudged trust upward.',
            dominantContexts: ['focused-work', 'general'],
            sourceKinds: ['execution'],
            sourceCounts: {
              relationshipOutcomes: 1,
              reinforcementEvents: 1,
              episodicEvents: 1,
              reflections: 0,
              memoryFacts: 0,
            },
            relationshipShift: {
              trustDelta: 0.12,
              closenessDelta: -0.02,
              burdenDelta: 0.05,
              boundaryDelta: -0.03,
              repairDelta: 0.04,
            },
            sourceTrail: [{
              kind: 'relationship-outcome',
              sourceKind: 'execution',
              summary: 'The callback was useful.',
              createdAt: 109,
            }],
          },
          createdAt: 120,
        },
        {
          id: 'evt-memory-upsert',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-facts-upserted',
          payload: {
            source: 'async-llm',
            trigger: 'batch',
            factInputCount: 1,
            extractedCount: 5,
            batchSize: 3,
            batchPriority: {
              max: 260,
              min: 120,
              avg: 190,
            },
          },
          createdAt: 130,
        },
        {
          id: 'evt-reconsolidated',
          decisionTraceId: 'trace-active',
          turnId: 'turn-active',
          sessionId: 'session-active',
          origin: 'user-turn',
          kind: 'memory-reconsolidated',
          payload: {
            source: 'dialogue-feedback',
            feedback: 'robotic',
            reconsolidatedCount: 1,
            coherence: {
              coherenceState: 'missed',
            },
            sourceKinds: ['reply'],
            summary: 'Preference shift reopened reply posture.',
          },
          createdAt: 140,
        },
      ],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: [
          'takeover-audit',
          'learning-executed',
          'person-state-updated',
          'memory-facts-upserted',
          'memory-reconsolidated',
        ],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    store.selectTraceEvent('evt-takeover')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'fallbackReason', value: 'unsupported-specificity' },
      { label: 'hardFallbackReason', value: 'coarse-scene-budget' },
      { label: 'replyOverridden', value: 'true' },
      { label: 'visibleReplyAuthority', value: 'mind' },
      { label: 'visibleReplyRealizationAuthority', value: 'mind-governor' },
      { label: 'visibleReplyRealizationReason', value: 'proactive-opening-guidance-violation:callback-bounded' },
      { label: 'visibleReplyBlockedReasons', value: 'non-human-authored-visible-fallback, opening-guidance:callback-bounded' },
      { label: 'claimSpecificityBudget', value: 'coarse-scene' },
      { label: 'unsupportedSpecificityCues', value: 'AppArbitorController, CaseApplyTypeEnum' },
      { label: 'reasons', value: 'reply-introduced-unsupported-technical-specificity' },
    ])

    store.selectTraceEvent('evt-learning')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'taskId', value: 'task-runtime-verify' },
      { label: 'action', value: 'verify' },
      { label: 'domain', value: 'world-model' },
      { label: 'resultSummary', value: 'Verified runtime seam and kept it pending internalization.' },
      { label: 'verificationBasis', value: 'trusted-source, runtime-result' },
      { label: 'focuses', value: 'runtime-seam, belief-discipline' },
      { label: 'artifactId', value: 'artifact-runtime-1' },
      { label: 'claimId', value: 'claim-runtime-1' },
    ])

    store.selectTraceEvent('evt-person-state')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'summary', value: 'Recent outcomes nudged trust upward.' },
      { label: 'dominantContexts', value: 'focused-work, general' },
      { label: 'sourceKinds', value: 'execution' },
      { label: 'sourceTrailCount', value: '1' },
      { label: 'relationshipOutcomes', value: '1' },
      { label: 'reinforcementEvents', value: '1' },
      { label: 'episodicEvents', value: '1' },
      { label: 'reflections', value: '0' },
      { label: 'memoryFacts', value: '0' },
      { label: 'trustDelta', value: '0.12' },
      { label: 'closenessDelta', value: '-0.02' },
      { label: 'burdenDelta', value: '0.05' },
      { label: 'boundaryDelta', value: '-0.03' },
      { label: 'repairDelta', value: '0.04' },
    ])

    store.selectTraceEvent('evt-memory-upsert')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'source', value: 'async-llm' },
      { label: 'trigger', value: 'batch' },
      { label: 'factInputCount', value: '1' },
      { label: 'extractedCount', value: '5' },
      { label: 'batchSize', value: '3' },
      { label: 'batchPriorityMin', value: '120' },
      { label: 'batchPriorityAvg', value: '190' },
      { label: 'batchPriorityMax', value: '260' },
    ])

    store.selectTraceEvent('evt-reconsolidated')
    expect(store.selectedTraceEventDetails).toEqual([
      { label: 'source', value: 'dialogue-feedback' },
      { label: 'feedback', value: 'robotic' },
      { label: 'reconsolidatedCount', value: '1' },
      { label: 'coherenceState', value: 'missed' },
      { label: 'sourceKinds', value: 'reply' },
      { label: 'summary', value: 'Preference shift reopened reply posture.' },
    ])
  })

  it('derives candidate consumption preview across memory, response, relationship, and proactive lanes', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'world-model',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy', 'rollback-validation'],
          memoryPolicy: {
            strictnessBias: 0.24,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.38,
            recallExpansionBias: 0.2,
            shouldQuarantineUnsupportedCarry: true,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.09,
          },
          responsePosture: {
            secondPassRequiredBias: 0.16,
            hypothesisLabelBias: 0.22,
            specificityClampBias: 0.28,
            templateShellSuppressionBias: 0.24,
          },
          proactivePolicy: {
            restraintBias: 0.54,
            learningProposalBias: 0.2,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: true,
            requiresRevalidation: true,
            rollbackPlan: ['restore-world-model-confidence'],
          },
          reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
          summary: 'Keep world-model carry quarantined until replay-backed revalidation lands.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateConsumptionPreview).toEqual({
      memory: {
        verificationStrictness: 'quarantine',
        topKExpansionActive: true,
        wrongThreadSuppressionRaised: true,
        provenanceLabelingRaised: true,
        sourceWeightShift: 'favor-consolidation-over-episodic',
        reasons: [
          'Unsupported carry is quarantined until the revised belief is revalidated.',
          'Recall widens slightly toward consolidation-backed memory instead of narrow recent carry.',
          'Wrong-thread suppression is raised before cross-thread familiarity can leak back in.',
          'Provenance labeling is raised so remembered claims stay visibly sourced.',
        ],
      },
      relationship: {
        resolvedPosture: 'restrained',
        repairWindowRaised: true,
        closenessCapped: true,
        warmthMayRelease: true,
        reasons: [
          'Relationship posture resolves to restrained while the revision keeps repair and distance guards active.',
          'Repair stays open before warmth or confidence is allowed to outrun the host.',
          'Closeness remains capped so learned familiarity does not widen too quickly.',
        ],
      },
      response: {
        hypothesisLabelingRaised: true,
        specificityClampRaised: true,
        secondPassRequired: true,
        templateShellSuppressed: true,
        reasons: [
          'Visible replies should label hypotheses more explicitly instead of implying certainty.',
          'Unsupported specificity should be clamped before warmth or fluency.',
          'The answer path is biased toward a second-pass repair before visible certainty.',
          'Template-shell replies are explicitly suppressed until the turn gives concrete payoff.',
        ],
      },
      proactive: {
        holdLikely: true,
        learningProposalRaised: true,
        restraintRaised: true,
        cooldownRaised: true,
        reasons: [
          'Proactive speech is likely held because restraint/cooldown biases are above the active hold threshold.',
          'Learning proposals can surface, but only behind stronger restraint and cooldown.',
          'The active revision asks her to avoid turning un-revalidated learning into spontaneous companionship speech.',
        ],
      },
    })
  })

  it('derives runtime alignment evidence from current visual presence and organic memory state', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'world-model',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy', 'rollback-validation'],
          memoryPolicy: {
            strictnessBias: 0.24,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.38,
            recallExpansionBias: 0.2,
            shouldQuarantineUnsupportedCarry: true,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.09,
          },
          responsePosture: {
            secondPassRequiredBias: 0.16,
            hypothesisLabelBias: 0.22,
            specificityClampBias: 0.28,
            templateShellSuppressionBias: 0.24,
          },
          proactivePolicy: {
            restraintBias: 0.54,
            learningProposalBias: 0.2,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: true,
            requiresRevalidation: true,
            rollbackPlan: ['restore-world-model-confidence'],
          },
          reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
          summary: 'Keep world-model carry quarantined until replay-backed revalidation lands.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [
          'Let the active self-revision patch make hypothesis labeling more visible this turn.',
          'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.',
          'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.',
        ],
        mustNotDo: [
          'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.',
        ],
      },
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        why: 'restraint active',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      },
      mindKernel: {
        dominantMode: 'guarding',
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.52,
        learningReadiness: 0.61,
        contradictionPressure: 0.48,
        revisionPressure: 0.57,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'world-model revalidation',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'world-model carry still needs replay-backed support',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['world-model'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'world-model carry remains in verify-first posture',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRuntimeAlignment).toEqual({
      relationship: {
        status: 'aligned',
        expectedPosture: 'restrained',
        plannerPosture: 'restrained',
        compilerPosture: 'restrained',
        confirmedSignals: ['planner:restrained', 'compiler:restrained'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Answer planner already resolves to restrained, matching the active candidate posture clamp.',
          'Answer compiler still emits restrained, so visible tone is respecting the active candidate guardrail.',
        ],
      },
      response: {
        status: 'aligned',
        expectedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        observedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        confirmedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Current response guardrails already include the active candidate rewrite/labeling discipline.',
        ],
      },
      proactive: {
        status: 'aligned',
        expectedHold: true,
        shouldSpeak: false,
        selectedAction: 'hold',
        confirmedSignals: ['shouldSpeak:false', 'selectedAction:hold'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Initiative currently withholds speech, matching the candidate proactive hold expectation.',
        ],
      },
      learning: {
        status: 'aligned',
        expectedAction: 'verify',
        runtimeAction: 'verify',
        kernelAction: 'verify',
        activeFocuses: ['world-model'],
        dominantTrajectory: 'world-model revalidation',
        confirmedSignals: ['runtimeAction:verify', 'kernelAction:verify', 'focus:world-model'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Learning execution still sits on verify, matching the active candidate action.',
          'The self-evolution kernel trajectory remains verify-first around the same domain.',
        ],
      },
    })
    expect(store.selectedCandidateAuthoritySurfaces).toEqual({
      persistentMindState: {
        status: 'available',
        hostPersonModelPresent: false,
        affectiveResiduePresent: false,
        selfEvolutionPresent: true,
        learningExecutionPresent: true,
        recallLatencyPolicyPresent: false,
        derivedMindStateBundlePresent: false,
        dominantTrajectory: 'world-model revalidation',
        nextLearningAction: 'verify',
        activeFocuses: ['world-model'],
        reasons: [
          'Persistent mind authority is present from the main organic snapshot and currently exposes self-evolution plus learning state.',
        ],
      },
      turnTraceState: {
        status: 'missing',
        memoryStageReplayPresent: false,
        memoryResolutionLedgerPresent: false,
        latestTraceStage: null,
        latestTraceClosureState: null,
        latestTraceSurfacePolicy: null,
        suppressionTags: [],
        reasons: [
          'No drilled trace is open yet, so turn-level recall settlement authority is not attached.',
        ],
      },
    })
  })

  it('derives partial runtime alignment and effect deltas when current state has not fully converged', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'world-model',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy', 'rollback-validation'],
          memoryPolicy: {
            strictnessBias: 0.24,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.38,
            recallExpansionBias: 0.2,
            shouldQuarantineUnsupportedCarry: true,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.09,
          },
          responsePosture: {
            secondPassRequiredBias: 0.16,
            hypothesisLabelBias: 0.22,
            specificityClampBias: 0.28,
            templateShellSuppressionBias: 0.24,
          },
          proactivePolicy: {
            restraintBias: 0.54,
            learningProposalBias: 0.2,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: true,
            requiresRevalidation: true,
            rollbackPlan: ['restore-world-model-confidence'],
          },
          reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
          summary: 'Keep world-model carry quarantined until replay-backed revalidation lands.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      answerPlanner: {
        relationshipPosture: 'warm',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [
          'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.',
        ],
        mustNotDo: [],
      },
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        why: 'surface still too eager',
      },
      learningExecutionState: {
        nextLearningAction: 'reflect',
        activeLearningFocuses: ['relationship'],
      },
      mindKernel: {
        dominantMode: 'tracking',
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.52,
        learningReadiness: 0.61,
        contradictionPressure: 0.48,
        revisionPressure: 0.57,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'relationship softening drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'reflect',
        nextLearningReason: 'runtime still carrying older relationship posture',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'relationship posture has not fully converged yet',
      },
      learningExecutionState: {
        nextLearningAction: 'reflect',
        activeLearningFocuses: ['relationship'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRuntimeAlignment).toEqual({
      relationship: {
        status: 'partial',
        expectedPosture: 'restrained',
        plannerPosture: 'warm',
        compilerPosture: 'restrained',
        confirmedSignals: ['compiler:restrained'],
        missingSignals: [],
        driftingSignals: ['planner:warm'],
        reasons: [
          'Answer planner is still warm, which does not fully match the candidate posture expectation.',
          'Answer compiler still emits restrained, so visible tone is respecting the active candidate guardrail.',
        ],
      },
      response: {
        status: 'partial',
        expectedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        observedSignals: ['specificity-clamp'],
        confirmedSignals: ['specificity-clamp'],
        missingSignals: ['hypothesis-labeling', 'second-pass', 'template-shell-suppression'],
        driftingSignals: [],
        reasons: [
          'Some response guardrails reflect the active candidate, but the full rewrite discipline is not visible yet.',
        ],
      },
      proactive: {
        status: 'partial',
        expectedHold: true,
        shouldSpeak: true,
        selectedAction: 'speak',
        confirmedSignals: [],
        missingSignals: [],
        driftingSignals: ['shouldSpeak:true', 'selectedAction:speak'],
        reasons: [
          'Initiative still wants to speak even though the candidate expects a proactive hold.',
        ],
      },
      learning: {
        status: 'partial',
        expectedAction: 'verify',
        runtimeAction: 'reflect',
        kernelAction: 'reflect',
        activeFocuses: ['relationship'],
        dominantTrajectory: 'relationship softening drift',
        confirmedSignals: [],
        missingSignals: ['focus:world-model'],
        driftingSignals: ['runtimeAction:reflect', 'kernelAction:reflect', 'focus:relationship'],
        reasons: [
          'Learning execution currently sits on reflect, not the candidate\'s expected verify.',
          'The self-evolution kernel is still centered on reflect, not the active candidate action.',
        ],
      },
    })
  })

  it('surfaces drilled opening-guidance hold evidence in proactive runtime alignment overview', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'world-model',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy', 'rollback-validation'],
          memoryPolicy: {
            strictnessBias: 0.24,
            wrongThreadSuppressionBias: 0.42,
            provenanceLabelBias: 0.38,
            recallExpansionBias: 0.2,
            shouldQuarantineUnsupportedCarry: true,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.09,
          },
          responsePosture: {
            secondPassRequiredBias: 0.16,
            hypothesisLabelBias: 0.22,
            specificityClampBias: 0.28,
            templateShellSuppressionBias: 0.24,
          },
          proactivePolicy: {
            restraintBias: 0.54,
            learningProposalBias: 0.2,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: true,
            requiresRevalidation: true,
            rollbackPlan: ['restore-world-model-confidence'],
          },
          reasonCodes: ['domain:world-model', 'world-model-revalidation-required'],
          summary: 'Keep world-model carry quarantined until replay-backed revalidation lands.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 5,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [
          'Let the active self-revision patch make hypothesis labeling more visible this turn.',
          'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.',
          'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.',
        ],
        mustNotDo: [
          'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.',
        ],
      },
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        why: 'surface still tried to open proactively',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      },
      mindKernel: {
        dominantMode: 'guarding',
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.52,
        learningReadiness: 0.61,
        contradictionPressure: 0.48,
        revisionPressure: 0.57,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'world-model revalidation',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'world-model carry still needs replay-backed support',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['world-model'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'world-model carry remains in verify-first posture',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-latest',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          fallback_reason: 'opening-guidance-hold',
          visible_reply_authority: 'mind',
          visible_reply_realization_authority: 'mind-governor',
          visible_reply_realization_reason: 'proactive-opening-guidance-violation:callback-bounded',
          visible_reply_blocked_reasons: ['non-human-authored-visible-fallback', 'opening-guidance:callback-bounded'],
          reasons: ['callback should stay bounded to recent host-led context'],
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateRuntimeAlignment).toEqual({
      relationship: {
        status: 'aligned',
        expectedPosture: 'restrained',
        plannerPosture: 'restrained',
        compilerPosture: 'restrained',
        confirmedSignals: ['planner:restrained', 'compiler:restrained'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Answer planner already resolves to restrained, matching the active candidate posture clamp.',
          'Answer compiler still emits restrained, so visible tone is respecting the active candidate guardrail.',
        ],
      },
      response: {
        status: 'aligned',
        expectedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        observedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        confirmedSignals: ['hypothesis-labeling', 'specificity-clamp', 'second-pass', 'template-shell-suppression'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Current response guardrails already include the active candidate rewrite/labeling discipline.',
        ],
      },
      proactive: {
        status: 'partial',
        expectedHold: true,
        shouldSpeak: true,
        selectedAction: 'speak',
        confirmedSignals: [],
        missingSignals: [],
        driftingSignals: ['shouldSpeak:true', 'selectedAction:speak', 'opening-guidance:callback-bounded'],
        reasons: [
          'Initiative still wants to speak even though the candidate expects a proactive hold.',
          'Latest drilled takeover audit shows visible proactive surfacing was blocked by opening-guidance:callback-bounded.',
        ],
      },
      learning: {
        status: 'aligned',
        expectedAction: 'verify',
        runtimeAction: 'verify',
        kernelAction: 'verify',
        activeFocuses: ['world-model'],
        dominantTrajectory: 'world-model revalidation',
        confirmedSignals: ['runtimeAction:verify', 'kernelAction:verify', 'focus:world-model'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Learning execution still sits on verify, matching the active candidate action.',
          'The self-evolution kernel trajectory remains verify-first around the same domain.',
        ],
      },
    })
  })

  it('surfaces remembered-familiarity hold detail in proactive runtime alignment overview when same-her opening guidance stays memory-first', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [
          'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.',
        ],
        mustNotDo: [
          'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.',
        ],
      },
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship'],
      },
      mindKernel: {
        dominantMode: 'guarding',
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'relationship continuity still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-memory-familiarity-hold',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          fallback_reason: 'opening-guidance-hold',
          visible_reply_authority: 'mind',
          visible_reply_realization_authority: 'mind-governor',
          visible_reply_realization_reason: 'proactive-opening-guidance-violation:lower-pressure',
          visible_reply_blocked_reasons: ['opening-guidance:lower-pressure'],
          opening_guidance_hold_detail: 'memory-familiarity-closeness-cap',
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const proactiveAlignmentText = JSON.stringify(store.selectedCandidateRuntimeAlignment?.proactive)
    expect(proactiveAlignmentText).toContain('opening-guidance:lower-pressure')
    expect(proactiveAlignmentText).toContain('remembered familiarity must stay memory-first')
    expectNoFixedTemplateResidue(store.selectedCandidateRuntimeAlignment?.proactive)
  })

  it('surfaces companionship transition mode and cross-modal cadence in the observer-facing inspector summary', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
          memoryPolicy: null,
          relationshipPosture: {
            repairWindowBias: 0.16,
            closenessCapBias: 0.18,
            warmthReleaseBias: 0.06,
          },
          responsePosture: null,
          proactivePolicy: {
            restraintBias: 0.44,
            learningProposalBias: 0.14,
            actuationCooldownBias: 0.4,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship'],
          summary: 'Keep the relationship return measured until the surface fully cools.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-companionship-transition',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          fallback_reason: 'opening-guidance-hold',
          companionship_hold_mode: 'measured-return',
          preferred_expression_aliases: ['CalmInspect'],
          preferred_motion_aliases: ['ObserveSoft'],
          live2d_facial_release_ms: 620,
          vrm_expression_blend_ms: 410,
          vrm_action_fade_ms: 330,
          visible_reply_blocked_reasons: ['opening-guidance:lower-pressure'],
          opening_guidance_hold_detail: 'memory-familiarity-closeness-cap',
        },
        createdAt: 160,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 160,
        eventKinds: ['takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateCompanionshipTransitionSummary).toEqual({
      status: 'grounded',
      companionshipHoldMode: 'measured-return',
      preferredExpressionAliases: ['CalmInspect'],
      preferredMotionAliases: ['ObserveSoft'],
      live2dFacialReleaseMs: 620,
      vrmExpressionBlendMs: 410,
      vrmActionFadeMs: 330,
      summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
      reasons: [
        'Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence.',
        'Preferred expression aliases currently stay CalmInspect, keeping the face aligned to the same companionship transition mode.',
        'Preferred motion aliases currently stay ObserveSoft, so motion pacing is following the same companionship hold.',
        'Cross-modal settle cadence now reads mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms, so Live2D and VRM are being kept on the same measured return path.',
        'Latest drilled takeover audit still reports opening-guidance:lower-pressure, so the companionship transition is staying bounded by that opening guidance.',
        'That hold detail still says remembered familiarity widened only after memory stayed explicit, so the companionship transition remains intentionally slower than direct closeness.',
      ],
    })
  })

  it('surfaces persona baseline influence on proactive runtime alignment overview', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['relationship-posture', 'response-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.12,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.12,
            recallExpansionBias: 0.08,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.12,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence', 'presence-revalidation-required'],
          summary: 'Keep proactive return restrained until presence alignment is grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [
          'Let the active self-revision patch make hypothesis labeling more visible this turn.',
          'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.',
        ],
        mustNotDo: [
          'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.',
        ],
      },
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        why: 'persona keeps the return in observe-first posture for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
      mindKernel: {
        dominantMode: 'guarding',
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRuntimeAlignment).toEqual({
      relationship: {
        status: 'aligned',
        expectedPosture: 'restrained',
        plannerPosture: 'restrained',
        compilerPosture: 'restrained',
        confirmedSignals: ['planner:restrained', 'compiler:restrained'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Answer planner already resolves to restrained, matching the active candidate posture clamp.',
          'Answer compiler still emits restrained, so visible tone is respecting the active candidate guardrail.',
        ],
      },
      response: {
        status: 'aligned',
        expectedSignals: ['hypothesis-labeling', 'specificity-clamp', 'template-shell-suppression'],
        observedSignals: ['hypothesis-labeling', 'specificity-clamp', 'template-shell-suppression'],
        confirmedSignals: ['hypothesis-labeling', 'specificity-clamp', 'template-shell-suppression'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Current response guardrails already include the active candidate rewrite/labeling discipline.',
        ],
      },
      proactive: {
        status: 'aligned',
        expectedHold: true,
        shouldSpeak: false,
        selectedAction: 'hold',
        confirmedSignals: [
          'shouldSpeak:false',
          'selectedAction:hold',
          'persona:initiative-style:observant',
          'persona:silence-reconnect:hold',
          'persona:preferred-style:silent-observe',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Initiative currently withholds speech, matching the candidate proactive hold expectation.',
          'Persona baseline currently biases proactive surfacing toward observe-first restraint (initiativeStyle=observant, silenceReconnect=hold, preferredProactiveStyle=silent-observe).',
          'Persona opening guidance currently says: Open by observing first and keep the approach lighter.',
          'Persona cadence summary: persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
        ],
      },
      learning: {
        status: 'aligned',
        expectedAction: 'verify',
        runtimeAction: 'verify',
        kernelAction: 'verify',
        activeFocuses: ['presence'],
        dominantTrajectory: 'presence restraint',
        confirmedSignals: ['runtimeAction:verify', 'kernelAction:verify', 'focus:presence'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Learning execution still sits on verify, matching the active candidate action.',
          'The self-evolution kernel trajectory remains verify-first around the same domain.',
        ],
      },
    })
  })

  it('derives persona bias provenance from consumed trace bundle and runtime spine evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized', 'persistence-written'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidatePersonaBiasProvenance).toEqual({
      status: 'grounded',
      relationshipPosture: 'observer',
      initiativeStyle: 'observant',
      silenceReconnect: 'hold',
      comfortStyle: 'quiet-presence',
      preferredProactiveStyle: 'silent-observe',
      openingGuidance: 'Open by observing first and keep the approach lighter.',
      manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
      matchedSignals: [
        'identityKernel.relationshipPosture:observer',
        'identityKernel.initiativeStyle:observant',
        'initiativeBaseline.silenceReconnect:hold',
        'initiativeBaseline.comfortStyle:quiet-presence',
        'personStateProjection.preferredProactiveStyle:silent-observe',
        'personStateProjection.openingGuidance',
        'runtime.personaBias',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Consumed trace bundle personalityState identityKernel currently supports relationshipPosture=observer and initiativeStyle=observant.',
        'Consumed trace bundle initiativeBaseline currently supports silenceReconnect=hold and comfortStyle=quiet-presence.',
        'Consumed trace bundle personStateProjection currently supports preferredProactiveStyle=silent-observe and the current opening guidance.',
        'Runtime initiative personaBias matches the consumed trace bundle, so the current proactive restraint still resolves from the initialized persona baseline.',
      ],
    })
  })

  it('derives persona bias to proactive action realization chain evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-latest',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          visible_reply_realization_reason: 'proactive-opening-guidance-violation:observe-first',
          visible_reply_blocked_reasons: ['non-human-authored-visible-fallback', 'opening-guidance:observe-first'],
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized', 'takeover-audit'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateProactiveActionChain).toEqual({
      status: 'grounded',
      personaPreferredAction: 'hover',
      runtimeSelectedAction: 'hold',
      runtimeShouldSpeak: false,
      openingGuidance: 'Open by observing first and keep the approach lighter.',
      openingGuidanceHoldReason: 'opening-guidance:observe-first',
      matchedSignals: [
        'persona-preferred-action:hover',
        'runtime-selected-action:hold',
        'runtime-shouldSpeak:false',
        'opening-guidance:observe-first',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Persona bias currently points toward an observe-first move, so hover/hold is the expected proactive posture.',
        'Runtime initiative currently resolves to selectedAction=hold with shouldSpeak=false, which stays inside that observe-first posture.',
        'Latest drilled takeover audit confirms visible proactive speech was withheld by opening-guidance:observe-first.',
      ],
    })
  })

  it('derives rejected proactive alternatives against the current persona posture', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.34,
            interruptionCost: 0.41,
            informationGain: 0.55,
            timingFitness: 0.38,
            identityFit: 0.26,
            score: 0.43,
            why: 'The knot looks local enough that specific speech now would help more than hovering.',
          },
          {
            id: 'cf-warn',
            action: 'warn',
            style: 'firm-warning',
            embodiedPresence: 'concerned',
            relationshipCost: 0.48,
            interruptionCost: 0.52,
            informationGain: 0.44,
            timingFitness: 0.29,
            identityFit: 0.18,
            score: 0.31,
            why: 'Care pressure has crossed the line where silence would feel like neglect.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRejectedActionAlternatives).toEqual({
      status: 'grounded',
      selectedOptionId: 'cf-hover',
      selectedAction: 'hover',
      dominantTradeoff: 'presence-before-commentary',
      alternatives: [
        {
          optionId: 'cf-speak',
          action: 'speak',
          identityFit: 0.26,
          timingFitness: 0.38,
          score: 0.43,
          driftReason: 'Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
          why: 'The knot looks local enough that specific speech now would help more than hovering.',
        },
        {
          optionId: 'cf-warn',
          action: 'warn',
          identityFit: 0.18,
          timingFitness: 0.29,
          score: 0.31,
          driftReason: 'Current persona bias is not guardian-care, so warn overstates urgency for this personality posture.',
          why: 'Care pressure has crossed the line where silence would feel like neglect.',
        },
      ],
      reasons: [
        'Counterfactual deliberation currently selected hover under the dominant tradeoff presence-before-commentary.',
        'Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.',
      ],
    })
  })

  it('explains remembered-familiarity restraint when counterfactual competition keeps hover ahead of speak', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
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
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot: vi.fn().mockResolvedValue(null),
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRejectedActionAlternatives).toEqual(expect.objectContaining({
      reasons: expect.arrayContaining([
        'Counterfactual competition kept hover ahead because remembered familiarity was held as memory before visible closeness widened, so the more direct speak return was intentionally declined.',
      ]),
    }))
  })

  it('derives persona-to-manifestation realization evidence for style and presence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        shouldSurface: true,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.34,
            interruptionCost: 0.41,
            informationGain: 0.55,
            timingFitness: 0.38,
            identityFit: 0.26,
            score: 0.43,
            why: 'The knot looks local enough that specific speech now would help more than hovering.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateProactiveManifestationChain).toEqual({
      status: 'grounded',
      personaPreferredStyle: 'silent-observe',
      personaPreferredPresence: 'attentive',
      counterfactualStyle: 'silent-observe',
      counterfactualPresence: 'attentive',
      actionEcologyStyle: 'silent-observe',
      actionEcologyPresence: 'attentive',
      initiativePreferredStyle: 'silent-observe',
      initiativePreferredPresence: 'attentive',
      matchedSignals: [
        'persona-preferred-style:silent-observe',
        'counterfactual-style:silent-observe',
        'counterfactual-presence:attentive',
        'action-ecology-style:silent-observe',
        'action-ecology-presence:attentive',
        'initiative-preferred-style:silent-observe',
        'initiative-preferred-presence:attentive',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Persona bias currently points toward silent-observe with attentive presence, so a quiet accompanied manifestation is expected.',
        'Counterfactual deliberation, action ecology, and initiative all preserve the same style/presence chain, so the current manifestation still expresses the initialized persona posture.',
      ],
    })
  })

  it('derives persona-to-private-thought and visible utterance governance evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        shouldSurface: true,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.81,
        rationaleTags: ['counterfactual:hover', 'ecology:quiet-accompany', 'thought-thread:relationship-thread/waiting'],
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 220,
        emotionalTension: 'soft-covision',
        initiativeAction: 'hover',
        counterfactualOptionId: 'cf-hover',
        selectedThoughtThreadId: 'thread-active',
        runtimeThreadId: 'thread-active',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-latest',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          visible_reply_realization_reason: 'proactive-opening-guidance-violation:observe-first',
          visible_reply_blocked_reasons: ['non-human-authored-visible-fallback', 'opening-guidance:observe-first'],
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized', 'takeover-audit'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidatePrivateThoughtGovernanceChain).toEqual({
      status: 'grounded',
      privateThoughtStance: 'accompany',
      privateThoughtShouldSpeak: false,
      privateThoughtStyle: 'silent-observe',
      privateThoughtPresence: 'attentive',
      privateThoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
      visibleReplyRealizationReason: 'proactive-opening-guidance-violation:observe-first',
      visibleReplyBlockedReason: 'opening-guidance:observe-first',
      matchedSignals: [
        'private-thought-stance:accompany',
        'private-thought-shouldSpeak:false',
        'private-thought-style:silent-observe',
        'private-thought-presence:attentive',
        'private-thought-counterfactual:cf-hover',
        'visible-reply-blocked:opening-guidance:observe-first',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Private thought currently stays in accompany mode with shouldSpeak=false, so the inner line still matches the observe-first persona posture.',
        'The private thought style/presence still stays silent-observe with attentive presence, preserving the same manifestation posture chosen by initiative.',
        'Latest visible reply governance still blocks proactive wording by opening-guidance:observe-first, so the outer utterance gate is preserving the same restraint the inner line already holds.',
      ],
    })
  })

  it('derives private-thought to resident performance projection evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentScene: {
        confidence: 0.72,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Quietly staying with the host through deep focus.',
        workloadKind: 'coding',
      },
      initiative: {
        shouldSpeak: false,
        shouldSurface: true,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.81,
        rationaleTags: ['counterfactual:hover', 'ecology:quiet-accompany', 'thought-thread:relationship-thread/waiting'],
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 220,
        emotionalTension: 'soft-covision',
        initiativeAction: 'hover',
        counterfactualOptionId: 'cf-hover',
        selectedThoughtThreadId: 'thread-active',
        runtimeThreadId: 'thread-active',
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          facialCue: 'focus',
          actionCue: 'steady_focus',
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
          'thought:counterfactual:hover',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateResidentPerformanceProjection).toEqual({
      status: 'grounded',
      residentSource: 'main-runtime',
      residentEmbodiedPresence: 'attentive',
      residentStance: 'accompany',
      residentEmotionalTension: 'soft-covision',
      residentBaseEmotion: 'thinking',
      residentDelivery: 'gentle',
      residentEmphasis: 1,
      residentReasonTags: [
        'resident-performance',
        'watch:symbiotic-vision',
        'body:accompanying',
        'continuity:quiet-accompaniment',
        'presence:attentive',
        'stance:accompany',
        'tension:soft-covision',
        'thought:counterfactual:hover',
      ],
      matchedSignals: [
        'resident-source:main-runtime',
        'resident-presence:attentive',
        'resident-stance:accompany',
        'resident-tension:soft-covision',
        'resident-baseEmotion:thinking',
        'resident-delivery:gentle',
        'resident-reason:continuity:quiet-accompaniment',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Resident performance still publishes attentive/accompany/soft-covision, so the desk-presence output is preserving the same inner line carried by private thought.',
        'Resident performance currently lands on baseEmotion=thinking and delivery=gentle, which matches a quiet accompaniment posture rather than a speech-forward interruption.',
        'Published resident reason tags still include continuity:quiet-accompaniment, so the runtime is explicitly projecting long-line desktop companionship instead of a generic idle shell.',
      ],
    })
  })

  it('surfaces memory-led familiarity restraint detail from takeover audit when lower-pressure identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['relationship-posture'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.14,
            hypothesisLabelBias: 0.12,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.14,
          },
          proactivePolicy: {
            restraintBias: 0.18,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.08,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'same-her-baseline'],
          summary: 'continuity=same-her-baseline | remembered familiarity should stay lower-pressure before closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    const getVisualPresenceState = vi.fn().mockResolvedValue({
      version: 'visual-presence-state-v1',
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: '记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        counterfactualOptionId: 'cf-hover',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot: vi.fn().mockResolvedValue(null),
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-memory-familiarity',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          visible_reply_realization_reason: 'proactive-opening-guidance-violation:lower-pressure',
          visible_reply_blocked_reasons: ['opening-guidance:lower-pressure'],
          opening_guidance_hold_detail: 'memory-familiarity-closeness-cap',
          companionship_hold_mode: 'repair-before-closeness',
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const governanceChainText = JSON.stringify(store.selectedCandidatePrivateThoughtGovernanceChain)
    expect(store.selectedCandidatePrivateThoughtGovernanceChain).toEqual(expect.objectContaining({
      visibleReplyBlockedReason: 'opening-guidance:lower-pressure',
    }))
    expect(governanceChainText).toContain('same restraint the inner line already holds')
    expect(governanceChainText).toContain('remembered familiarity was restrained before closeness widened')
    expectNoFixedTemplateResidue(store.selectedCandidatePrivateThoughtGovernanceChain)
  })

  it('surfaces remembered-familiarity proactive hold from active self-revision when visible speech is withheld before closeness widens', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'response-posture'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
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
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })

    const getVisualPresenceState = vi.fn().mockResolvedValue({
      version: 'visual-presence-state-v1',
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        thoughtText: '这份熟悉感可以留着，但现在先别把它直接变成更近的可见动作。',
        counterfactualOptionId: 'cf-hover',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot: vi.fn().mockResolvedValue(null),
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [{
        id: 'evt-takeover-memory-familiarity-proactive-hold',
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        kind: 'takeover-audit',
        payload: {
          visible_reply_realization_reason: 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance',
          visible_reply_blocked_reasons: [],
        },
        createdAt: 140,
      }],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['takeover-audit'],
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const governanceChainText = JSON.stringify(store.selectedCandidatePrivateThoughtGovernanceChain)
    expect(store.selectedCandidatePrivateThoughtGovernanceChain).toEqual(expect.objectContaining({
      visibleReplyRealizationReason: 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance',
    }))
    expect(governanceChainText).toContain('remembered familiarity must stay explicitly remembered before visible closeness widens')
    expectNoFixedTemplateResidue(store.selectedCandidatePrivateThoughtGovernanceChain)
  })

  it('derives resident-performance to embodiment output projection evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_000,
      currentScene: {
        confidence: 0.72,
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Quietly staying with the host through deep focus.',
        workloadKind: 'coding',
      },
      initiative: {
        shouldSpeak: false,
        shouldSurface: true,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        why: 'persona keeps the move observe-first for now',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.81,
        rationaleTags: ['counterfactual:hover', 'ecology:quiet-accompany', 'thought-thread:relationship-thread/waiting'],
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 220,
        emotionalTension: 'soft-covision',
        initiativeAction: 'hover',
        counterfactualOptionId: 'cf-hover',
        selectedThoughtThreadId: 'thread-active',
        runtimeThreadId: 'thread-active',
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          facialCue: 'focus',
          actionCue: 'steady_focus',
        },
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
          'thought:counterfactual:hover',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateEmbodimentOutputProjection).toEqual({
      status: 'grounded',
      projectedBodyState: 'accompanying',
      projectedContinuityMode: 'quiet-accompaniment',
      projectedFacialCue: 'focus',
      projectedActionCue: 'steady_focus',
      projectedBaseEmotion: 'thinking',
      projectedDelivery: 'gentle',
      residentSignature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
      matchedSignals: [
        'projected-body:accompanying',
        'projected-continuity:quiet-accompaniment',
        'projected-facialCue:focus',
        'projected-actionCue:steady_focus',
        'projected-baseEmotion:thinking',
        'projected-delivery:gentle',
        'projected-signature',
      ],
      missingSignals: [],
      driftingSignals: [],
      reasons: [
        'Current body state accompanying with continuity quiet-accompaniment means the desktop shell should stay in a long-line accompaniment posture instead of switching into a speech-forward state.',
        'Resident performance currently projects facialCue=focus and actionCue=steady_focus, so the visible face and motion should stay quietly attentive rather than escalate into interruption.',
        'The resident signature still binds symbiotic-vision, quiet-accompaniment, and thinking/gentle output into one projection, so the rendered presence remains the same person as the current inner line.',
      ],
    })
  })

  it('builds a candidate-level self evolution summary from persona bias through embodiment projection', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateSelfEvolutionSummary).toEqual({
      status: 'grounded',
      dominantDrift: null,
      lines: [
        'status: grounded | drift=none',
        'persona: observer | observant | silent-observe',
        'proactive: hold | shouldSpeak=false',
        'resident: attentive/accompany | thinking/gentle',
        'embodiment: accompanying | quiet-accompaniment | focus/steady_focus',
      ],
    })
  })

  it('marks embodiment drift as the dominant candidate self evolution break when body projection diverges', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'Still staying close, but not through speech.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 1,
        },
      },
      currentBodyState: 'warning',
      continuityMode: 'active-dialogue',
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateSelfEvolutionSummary).toEqual({
      status: 'drift',
      dominantDrift: 'projected-body:warning',
      lines: [
        'status: drift | drift=embodiment',
        'persona: observer | observant | silent-observe',
        'proactive: hold | shouldSpeak=false',
        'resident: attentive/accompany | thinking/firm',
        'embodiment: warning | active-dialogue | focus/steady_focus',
        'dominant-drift: projected-body:warning',
      ],
    })
  })

  it('builds a stable candidate impact summary from consumption, runtime alignment, and self evolution evidence', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: ['use hypothesis labeling', 'clamp unsupported specificity'],
        mustNotDo: ['template shell phrasing'],
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active-consumed',
        turnId: 'turn-active-2',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateImpactSummary).toEqual({
      status: 'grounded',
      dominantDrift: null,
      lines: [
        'status: grounded | drift=none',
        'candidate-consumption: 1 traces | lanes=proactive-policy',
        'relationship-impact: restrained | planner/compiler aligned',
        'proactive-impact: hold-likely=true | shouldSpeak=false | selectedAction=hold',
        'learning-impact: expected=verify | runtime=verify | kernel=verify | trajectory=presence restraint',
        'self-evolution-impact: grounded | drift=none',
      ],
    })
  })

  it('builds a baseline anchor audit summary when the selected candidate remains the adopted default continuity anchor with prosody authority traceability', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
      baselineAdoptionHistory: [
        {
          version: 'self-evolution-baseline-adoption/v1',
          adoptedAt: 220,
          snapshotCapturedAt: 180,
          candidateId: 'candidate-active',
          decisionTraceId: 'trace-active',
          activeThreadId: 'thread-active',
          selectedCardId: 'repair-owner',
          activePatternKey: 'pattern-renderer',
          repairOwnerHint: '显形权威',
          adoptionMode: 'adopt-now',
          summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
          prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        },
      ],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateBaselineAnchorAuditSummary).toEqual({
      status: 'grounded',
      lines: [
        'anchor: candidate-active is still the adopted default continuity anchor',
        'trace: snapshot=180 | trace=trace-active | owner=显形权威',
        'prosody-authority: 韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      ],
    })
  })

  it('returns null baseline anchor audit summary when the selected candidate is not the adopted default anchor', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
      baselineAdoptionHistory: [
        {
          version: 'self-evolution-baseline-adoption/v1',
          adoptedAt: 220,
          snapshotCapturedAt: 180,
          candidateId: 'candidate-other',
          decisionTraceId: 'trace-other',
          activeThreadId: 'thread-active',
          selectedCardId: 'repair-owner',
          activePatternKey: 'pattern-renderer',
          repairOwnerHint: '显形权威',
          adoptionMode: 'adopt-now',
          summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
          prosodyAuthorityNote: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
        },
      ],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateBaselineAnchorAuditSummary).toBeNull()
  })

  it('surfaces identity-continuity governance in the baseline anchor audit after continuity reconfirmation', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
      baselineAdoptionHistory: [
        {
          version: 'self-evolution-baseline-adoption/v1',
          adoptedAt: 220,
          snapshotCapturedAt: 180,
          candidateId: 'candidate-active',
          decisionTraceId: 'trace-active',
          activeThreadId: 'thread-active',
          selectedCardId: 'repair-owner',
          activePatternKey: 'pattern-renderer',
          repairOwnerHint: 'identity-continuity',
          adoptionMode: 'adopt-now',
          summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
          continuityGovernanceNote: 'same-her 连续性治理已经再次确认，可直接进入长期基线。',
        },
      ],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateBaselineAnchorAuditSummary).toEqual({
      status: 'grounded',
      lines: [
        'anchor: candidate-active is still the adopted default continuity anchor',
        'trace: snapshot=180 | trace=trace-active | owner=identity-continuity',
        'continuity-governance: same-her 连续性治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('surfaces relationship cadence governance in baseline anchor audit summary when the adopted anchor was trusted by cadence reconfirmation', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['relationship-posture', 'proactive-policy'],
          reasonCodes: ['domain:relationship', 'relationship-cadence-reconfirmed'],
          summary: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
      baselineAdoptionHistory: [
        {
          version: 'self-evolution-baseline-adoption/v1',
          adoptedAt: 220,
          snapshotCapturedAt: 180,
          candidateId: 'candidate-active',
          decisionTraceId: 'trace-active',
          activeThreadId: 'thread-active',
          selectedCardId: 'first-check',
          activePatternKey: 'pattern-relationship-cadence-governance',
          repairOwnerHint: 'relationship cadence governance',
          adoptionMode: 'adopt-now',
          summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
          relationshipCadenceGovernanceNote: 'relationship cadence 治理已经再次确认，可直接进入长期基线。',
        },
      ],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateBaselineAnchorAuditSummary).toEqual({
      status: 'grounded',
      lines: [
        'anchor: candidate-active is still the adopted default continuity anchor',
        'trace: snapshot=180 | trace=trace-active | owner=relationship cadence governance',
        'relationship-cadence-governance: relationship cadence 治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('surfaces project-state continuity governance in baseline anchor audit summary when the adopted anchor was trusted by project-state reconfirmation', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          reasonCodes: ['domain:relationship', 'project-state-continuity-reconfirmed'],
          summary: 'project identity, Phase 1 route, and unresolved loops stayed on the same life thread after reconfirmation',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
      baselineAdoptionHistory: [
        {
          version: 'self-evolution-baseline-adoption/v1',
          adoptedAt: 220,
          snapshotCapturedAt: 180,
          candidateId: 'candidate-active',
          decisionTraceId: 'trace-active',
          activeThreadId: 'thread-active',
          selectedCardId: 'project-state-carry',
          activePatternKey: 'pattern-project-state-governance',
          repairOwnerHint: 'project state continuity governance',
          adoptionMode: 'adopt-now',
          summaryLine: '现在就可以采纳这张基线，作为后续连续性会话的默认参照。',
          projectStateContinuityGovernanceNote: '项目状态连续性治理已经再次确认，可直接进入长期基线。',
        },
      ],
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateBaselineAnchorAuditSummary).toEqual({
      status: 'grounded',
      lines: [
        'anchor: candidate-active is still the adopted default continuity anchor',
        'trace: snapshot=180 | trace=trace-active | owner=project state continuity governance',
        'project-state-continuity-governance: 项目状态连续性治理已经再次确认，可直接进入长期基线。',
      ],
    })
  })

  it('surfaces candidate impact drift when runtime alignment and self evolution summary diverge', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'warm',
      },
      answerCompiler: {
        relationshipPosture: 'warm',
        mustDo: [],
        mustNotDo: [],
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'Still staying close, but not through speech.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 1,
        },
      },
      currentBodyState: 'warning',
      continuityMode: 'active-dialogue',
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'comfort'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active-consumed',
        turnId: 'turn-active-2',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateImpactSummary).toEqual({
      status: 'drift',
      dominantDrift: 'planner:warm',
      lines: [
        'status: drift | drift=runtime-alignment',
        'candidate-consumption: 1 traces | lanes=proactive-policy',
        'relationship-impact: restrained | planner/compiler drift',
        'proactive-impact: hold-likely=true | shouldSpeak=true | selectedAction=speak',
        'learning-impact: expected=verify | runtime=record | kernel=record | trajectory=comfort drift',
        'self-evolution-impact: drift | drift=embodiment',
        'dominant-drift: planner:warm',
      ],
    })
  })

  it('surfaces identity-continuity impact when remembered familiarity stays memory-first before closeness widens', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: ['use hypothesis labeling', 'clamp unsupported specificity'],
        mustNotDo: ['template shell phrasing'],
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.81,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: '记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const impactSummaryText = JSON.stringify(store.selectedCandidateImpactSummary)
    expect(store.selectedCandidateImpactSummary).toEqual(expect.objectContaining({
      status: 'drift',
      dominantDrift: 'focus:trust calibration',
    }))
    expect(impactSummaryText).toContain('relationship-impact: restrained')
    expect(impactSummaryText).toContain('remembered familiarity is staying memory-first')
    expectNoFixedTemplateResidue(store.selectedCandidateImpactSummary)
  })

  it('surfaces same-her embodiment lane shrinkage when continuity is only being carried by lipsync', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: [],
        mustNotDo: [],
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'I am still here, but the body line is thinning.',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-active',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          rendererSignals: {
            speechSummary: 'measured-return | lane=lipsync-only',
            currentBodyState: 'accompanying',
            continuityMode: 'quiet-accompaniment',
            residentPerformance: {
              sceneScenario: 'coding',
              sceneSummary: 'coding',
            },
            driverAuthority: {
              segmentId: 'segment-active',
              channel: 'speech',
              activeThreadId: 'thread-active',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['lipsync'],
              matchedSources: ['speechSummary'],
              bindingSummary: 'renderer authority binding | segment=segment-active | target=vrm | drivers=lipsync | sources=speechSummary | lane=lipsync-only',
              settleSummary: 'renderer authority settle | segment=segment-active | target=vrm | drivers=lipsync | sources=speechSummary | lane=lipsync-only',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const impactSummaryText = JSON.stringify(store.selectedCandidateImpactSummary)
    expect(store.selectedCandidateImpactSummary).toEqual(expect.objectContaining({
      status: 'grounded',
      dominantDrift: null,
    }))
    expect(impactSummaryText).toContain('candidate-consumption: 1 traces')
    expect(impactSummaryText).toContain('lipsync')
    expectNoFixedTemplateResidue(store.selectedCandidateImpactSummary)
  })

  it('explains relationship cadence internalization as durable relationship rhythm', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['relationship-posture', 'proactive-policy'],
          relationshipPosture: {
            repairWindowBias: 0.2,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          summary: 'Measured-return cadence is ready to become durable relationship rhythm.',
        },
        confidence: 0.86,
        trajectory: {
          expectedRelationshipPosture: 'restrained',
          expectedProactiveShift: 'hold',
          expectedReplySignals: ['delivery-tone:restrained', 'surface-policy:memory-first'],
        },
      }],
    })
    const getSoul = vi.fn().mockResolvedValue({})
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: ['use hypothesis labeling', 'clamp unsupported specificity'],
        mustNotDo: ['template shell phrasing'],
      },
      actionEcology: {
        shouldSpeak: false,
        updatedAt: 140,
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'internalize-relationship-cadence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        dominantTrajectory: 'relationship cadence internalization',
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'internalize-relationship-cadence'],
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'internalize-relationship-cadence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.selectedCandidateRuntimeAlignment?.learning.reasons).toContain(
      'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
    )
  })

  it('builds a grounded candidate trajectory summary when restraint continuity is still holding', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: ['use hypothesis labeling', 'clamp unsupported specificity'],
        mustNotDo: ['template shell phrasing'],
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active-consumed',
        turnId: 'turn-active-2',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTrajectorySummary).toEqual({
      status: 'grounded',
      trajectoryLabel: 'restrained companionship is holding',
      dominantDrift: null,
      lines: [
        'trajectory: restrained companionship is holding',
        'status: grounded | drift=none',
        'personality-baseline: restrained | observe-first',
        'learning-direction: expected=verify | runtime=verify | kernel=verify',
        'dominant-trajectory: presence restraint',
      ],
    })
  })

  it('keeps voice-missing body-only continuity visible as still-open identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-body-only',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-body-only',
        status: 'active',
        sourceEventId: 'event-body-only',
        decisionTraceId: 'trace-body-only',
        sourceTurnId: 'turn-body-only',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-body-only',
          sourceEventId: 'event-body-only',
          sourceTurnId: 'turn-body-only',
          decisionTraceId: 'trace-body-only',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.2,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            replayRequired: true,
            replayPassed: true,
            rollbackSupported: true,
            activationBlockedReasons: [],
            finalReplayGatePassed: true,
            productionGoldSampleCount: 4,
            productionGoldCoverage: 1,
          },
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue(null)
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life companion.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Lane-level continuity observability is now visible before dialogue starts.',
      primaryOpenLoop: 'Recover full cross-modal identity-continuity',
      nextClosureTarget: 'Rebuild face, motion, lipsync, and voice into one identity-continuity',
      nonHumanAuthoredStatus: null,
      turnId: 'turn-body-only',
      sessionId: 'session-body-only',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 3,
          openLoopHitCount: 2,
          continuityHitCount: 2,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 3,
          },
        },
        driftSignals: [],
      },
    }
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-body-only',
        turnId: 'turn-body-only',
        sessionId: 'session-body-only',
        origin: 'user-turn',
        activeThreadId: 'thread-body-only',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-body-only',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-body-only',
            patchId: 'patch-body-only',
            patchDecisionTraceId: 'trace-body-only',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Voice continuity still needs to be rebound without losing the renderer body line.',
          },
          rendererSignals: {
            speechSummary: 'measured-return | lane=face+motion+lipsync-only',
            currentBodyState: 'accompanying',
            continuityMode: 'quiet-accompaniment',
            residentPerformance: {
              sceneScenario: 'coding',
              sceneSummary: 'coding',
            },
            driverAuthority: {
              segmentId: 'segment-body-only',
              channel: 'speech',
              activeThreadId: 'thread-body-only',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['face', 'motion', 'lipsync'],
              matchedSources: ['speechSummary'],
              bindingSummary: 'renderer authority binding | segment=segment-body-only | target=vrm | drivers=face, motion, lipsync | sources=speechSummary | lane=face+motion+lipsync-only',
              settleSummary: 'renderer authority settle | segment=segment-body-only | target=vrm | drivers=face, motion, lipsync | sources=speechSummary | lane=face+motion+lipsync-only',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    const awarenessText = JSON.stringify(store.preDialogueAwarenessSnapshot)
    const impactText = JSON.stringify(store.selectedCandidateImpactSummary)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(store.preDialogueAwarenessSnapshot?.status).toBe('drift')
    expect(closureText).toContain('face, motion, and lipsync')
    expect(closureText).toContain('full cross-modal identity-continuity recovery as still open')
    expect(awarenessText).toContain('face, motion, and lipsync')
    expect(impactText).toContain('face, motion, and lipsync')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expectNoFixedTemplateResidue(store.selectedCandidateImpactSummary)
  })

  it('keeps same-segment face-motion recovery visible in pre-dialogue closure when the shared body line has re-formed before full cross-modal closure', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-face-motion-reformed',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-face-motion-reformed',
        status: 'active',
        sourceEventId: 'event-face-motion-reformed',
        decisionTraceId: 'trace-face-motion-reformed',
        sourceTurnId: 'turn-face-motion-reformed',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-face-motion-reformed',
          sourceEventId: 'event-face-motion-reformed',
          sourceTurnId: 'turn-face-motion-reformed',
          decisionTraceId: 'trace-face-motion-reformed',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          summary: 'Face and motion have already re-formed on one segment, but voice and lipsync closure still need to rejoin the same her.',
        },
        confidence: 0.84,
        trajectory: {
          expectedRelationshipPosture: 'restrained',
          expectedProactiveShift: 'hold',
          expectedReplySignals: ['delivery-tone:restrained'],
        },
      }],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.42,
        learningReadiness: 0.51,
        contradictionPressure: 0.18,
        revisionPressure: 0.31,
        autobiographicalStability: 0.8,
        dominantTrajectory: 'same-her embodiment recovery',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'renderer body line has re-formed but cross-modal closure is still open',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['renderer-authority'],
        summary: 'same-segment body-line recovery remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Renderer diagnostics now keep same-segment face-motion recovery visible in host-facing alignment summaries.',
      primaryOpenLoop: 'Recover full cross-modal identity-continuity',
      nextClosureTarget: 'Rebuild face, motion, lipsync, and voice into one identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: 'identity-continuity',
      turnId: 'turn-face-motion-reformed',
      sessionId: 'session-face-motion-reformed',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 3,
          openLoopHitCount: 2,
          continuityHitCount: 2,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 3,
          },
        },
        driftSignals: [],
      },
    }
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-face-motion-reformed',
        turnId: 'turn-face-motion-reformed',
        sessionId: 'session-face-motion-reformed',
        origin: 'user-turn',
        activeThreadId: 'thread-face-motion-reformed',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-face-motion-reformed',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-face-motion-reformed',
            patchId: 'patch-face-motion-reformed',
            patchDecisionTraceId: 'trace-face-motion-reformed',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Face and motion already share one segment, but the full cross-modal identity-continuity',
          },
          rendererSignals: {
            speechSummary: 'measured-return | lane=face+motion-only',
            currentBodyState: 'accompanying',
            continuityMode: 'quiet-accompaniment',
            residentPerformance: {
              sceneScenario: 'coding',
              sceneSummary: 'coding',
            },
            driverAuthority: {
              segmentId: 'segment-face-motion-reformed-1',
              channel: 'speech',
              activeThreadId: 'thread-face-motion-reformed',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['face', 'motion'],
              matchedSources: ['cue-bridge', 'timeline-projection'],
              bindingSummary: 'renderer authority binding | segment=segment-face-motion-reformed-1 | target=vrm | drivers=face, motion | sources=cue-bridge, timeline-projection | lane=face+motion-only | same-segment face+motion recovery@segment-face-motion-reformed-1',
              settleSummary: 'renderer authority settle | segment=segment-face-motion-reformed-1 | target=vrm | drivers=face, motion | sources=cue-bridge, timeline-projection | lane=face+motion-only | same-segment face+motion recovery@segment-face-motion-reformed-1',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(closureText).toContain('same-segment face+motion recovery@segment-face-motion-reformed-1')
    expect(closureText).toContain('full cross-modal identity-continuity recovery as still open')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('keeps still-voiced face-and-motion recovery explicit in pre-dialogue closure when body and lipsync have not rejoined yet', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-still-voiced-face-motion',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-still-voiced-face-motion',
        status: 'active',
        sourceEventId: 'event-still-voiced-face-motion',
        decisionTraceId: 'trace-still-voiced-face-motion',
        sourceTurnId: 'turn-still-voiced-face-motion',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-still-voiced-face-motion',
          sourceEventId: 'event-still-voiced-face-motion',
          sourceTurnId: 'turn-still-voiced-face-motion',
          decisionTraceId: 'trace-still-voiced-face-motion',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          reasonCodes: ['domain:presence'],
          summary: 'Still-voiced face-and-motion continuity is holding, but body and lipsync have not rejoined yet.',
        },
        confidence: 0.86,
        trajectory: {
          expectedRelationshipPosture: 'restrained',
          expectedProactiveShift: 'hold',
          expectedReplySignals: ['delivery-tone:restrained'],
        },
      }],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue(null)
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.44,
        learningReadiness: 0.53,
        contradictionPressure: 0.14,
        revisionPressure: 0.29,
        autobiographicalStability: 0.82,
        dominantTrajectory: 'still-voiced same-her recovery',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['renderer-authority'],
        summary: 'Still-voiced face-and-motion continuity remains verify-first.',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Runtime authority now keeps the still-voiced face-and-motion line explicit before host-visible closure widens outward.',
      primaryOpenLoop: 'Recover full cross-modal identity-continuity',
      nextClosureTarget: 'Rebind body and lipsync onto the still-voiced face-and-motion line without dropping face, motion, and voice continuity.',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: 'identity-continuity',
      turnId: 'turn-still-voiced-face-motion',
      sessionId: 'session-still-voiced-face-motion',
      origin: 'user-turn',
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
      getProjectStateContinuitySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 3,
          identityHitCount: 3,
          phaseHitCount: 3,
          openLoopHitCount: 2,
          continuityHitCount: 2,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 3,
          activeCueTurnCount: 3,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 3,
          },
        },
        driftSignals: [],
      },
    }
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-still-voiced-face-motion',
        turnId: 'turn-still-voiced-face-motion',
        sessionId: 'session-still-voiced-face-motion',
        origin: 'user-turn',
        activeThreadId: 'thread-still-voiced-face-motion',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          activeThreadId: 'thread-still-voiced-face-motion',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-still-voiced-face-motion',
            patchId: 'patch-still-voiced-face-motion',
            patchDecisionTraceId: 'trace-still-voiced-face-motion',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Still-voiced face-and-motion continuity is holding, but body and lipsync have not rejoined yet.',
          },
          rendererSignals: {
            speechSummary: 'measured-return | lane=face+motion+voice-only | remaining-open=body+lipsync',
            currentBodyState: 'accompanying',
            continuityMode: 'quiet-accompaniment',
            residentPerformance: {
              sceneScenario: 'coding',
              sceneSummary: 'coding',
            },
            driverAuthority: {
              segmentId: 'segment-still-voiced-face-motion-1',
              channel: 'speech',
              activeThreadId: 'thread-still-voiced-face-motion',
              scenario: 'coding',
              sceneLabel: 'coding',
              matchedDrivers: ['face', 'motion', 'voice'],
              matchedSources: ['prosody-authority', 'timeline-projection'],
              bindingSummary: 'renderer authority binding | segment=segment-still-voiced-face-motion-1 | target=live2d | drivers=face, motion, voice | sources=prosody-authority, timeline-projection | lane=face+motion+voice-only | face+motion+voice recovery@segment-still-voiced-face-motion-1 | remaining-open=body+lipsync',
              settleSummary: 'renderer authority settle | segment=segment-still-voiced-face-motion-1 | target=live2d | drivers=face, motion, voice | sources=prosody-authority, timeline-projection | lane=face+motion+voice-only | face+motion+voice recovery@segment-still-voiced-face-motion-1 | remaining-open=body+lipsync',
            },
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const closureText = JSON.stringify(store.preDialogueClosureSnapshot)
    const awarenessText = JSON.stringify(store.preDialogueAwarenessSnapshot)
    expect(store.preDialogueClosureSnapshot?.status).toBe('drift')
    expect(store.preDialogueAwarenessSnapshot?.status).toBe('drift')
    expect(closureText).toContain('face+motion+voice recovery@segment-still-voiced-face-motion-1')
    expect(closureText).toContain('body and lipsync')
    expect(closureText).toContain('full cross-modal identity-continuity recovery as still open')
    expect(awarenessText).toContain('face+motion+voice recovery@segment-still-voiced-face-motion-1')
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('explains remembered-familiarity trajectory when restrained companionship holds by keeping familiarity memory-first', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'restrained',
      },
      answerCompiler: {
        relationshipPosture: 'restrained',
        mustDo: ['use hypothesis labeling', 'clamp unsupported specificity'],
        mustNotDo: ['template shell phrasing'],
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.81,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: '记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'relationship continuity still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active-consumed',
        turnId: 'turn-active-2',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
            reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
            summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    const trajectorySummaryText = JSON.stringify(store.selectedCandidateTrajectorySummary)
    expect(store.selectedCandidateTrajectorySummary).toEqual(expect.objectContaining({
      status: 'grounded',
      trajectoryLabel: 'restrained companionship is holding',
      dominantDrift: null,
    }))
    expect(trajectorySummaryText).toContain('familiarity is staying memory-first')
    expect(trajectorySummaryText).toContain('learning-direction: expected=verify')
    expectNoFixedTemplateResidue(store.selectedCandidateTrajectorySummary)
  })

  it('surfaces candidate trajectory drift when comfort drift overtakes restraint', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      answerPlanner: {
        relationshipPosture: 'warm',
      },
      answerCompiler: {
        relationshipPosture: 'warm',
        mustDo: [],
        mustNotDo: [],
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: 'Still staying close, but not through speech.',
        counterfactualOptionId: 'cf-hover',
      },
      residentPerformance: {
        source: 'main-runtime',
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneFocus: 'doc',
        sceneSummary: 'coding',
        embodiedPresence: 'attentive',
        stance: 'accompany',
        emotionalTension: 'soft-covision',
        confidence: 0.81,
        reasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
        ],
        signature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        performance: {
          facialCue: 'focus',
          actionCue: 'steady_focus',
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 1,
        },
      },
      currentBodyState: 'warning',
      continuityMode: 'active-dialogue',
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'comfort'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active-consumed',
        turnId: 'turn-active-2',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 120,
        lastUpdatedAt: 180,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 180,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidateTrajectorySummary).toEqual({
      status: 'drift',
      trajectoryLabel: 'comfort drift is overtaking restraint',
      dominantDrift: 'planner:warm',
      lines: [
        'trajectory: comfort drift is overtaking restraint',
        'status: drift | drift=runtime-alignment',
        'personality-baseline: restrained | observe-first',
        'learning-direction: expected=verify | runtime=record | kernel=record',
        'dominant-trajectory: comfort drift',
        'dominant-drift: planner:warm',
      ],
    })
  })

  it('builds a grounded persona authority to proactive bias mapping summary from initialized persona fields', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [{
          id: 'cf-hover',
          action: 'hover',
          style: 'silent-observe',
          embodiedPresence: 'attentive',
          relationshipCost: 0.12,
          interruptionCost: 0.14,
          informationGain: 0.42,
          timingFitness: 0.72,
          identityFit: 0.88,
          score: 0.76,
          why: 'The thread is still warm, but presence fits better than words for one more breath.',
        }],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidatePersonaAuthorityMappingSummary).toEqual({
      status: 'grounded',
      biasMode: 'observe-first restraint',
      dominantDrift: null,
      lines: [
        'authority-line: observer | observant | hold | quiet-presence',
        'bias-mode: observe-first restraint',
        'style-line: silent-observe | attentive',
        'action-line: persona=hover | runtime=hold | shouldSpeak=false',
        'opening-guidance: Open by observing first and keep the approach lighter.',
      ],
    })
  })

  it('surfaces persona authority to proactive bias drift when runtime action breaks the initialized observe-first posture', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-speak',
        selectedAction: 'speak',
        confidence: 0.62,
        dominantTradeoff: 'comfort-over-restraint',
        options: [{
          id: 'cf-speak',
          action: 'speak',
          style: 'light-nudge',
          embodiedPresence: 'attentive',
          relationshipCost: 0.34,
          interruptionCost: 0.41,
          informationGain: 0.55,
          timingFitness: 0.38,
          identityFit: 0.26,
          score: 0.43,
          why: 'The knot looks local enough that specific speech now would help more than hovering.',
        }],
        narrative: ['comfort drift overtook observe-first restraint'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'comment-now',
        selectedThreadId: 'thread-active',
        readiness: 0.82,
        surfacePressure: 0.74,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'A direct comment now feels more useful than holding room.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'comfort'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
          digitalLifeSpine: {
            version: 'digital-life-spine-digest-v1',
            runtime: {
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              sceneSummary: 'observe first',
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantMode: 'thinking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
              selectedAction: 'hover',
              updatedAt: 100,
            },
            architecture: null,
            continuitySignal: null,
            proactive: {
              selectedAction: 'hover',
              preferredStyle: 'silent-observe',
              confidence: 0.7,
              shouldSpeak: false,
              activeThreadId: 'thread-active',
              activeThreadTitle: 'observe line',
              dominantConcernKind: null,
              dominantConcernSummary: null,
              leadingGoalId: null,
              leadingGoalSummary: null,
              preferredPresence: 'attentive',
              personaBias: {
                relationshipPosture: 'observer',
                initiativeStyle: 'observant',
                silenceReconnect: 'hold',
                comfortStyle: 'quiet-presence',
                preferredProactiveStyle: 'silent-observe',
                manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
                openingGuidance: 'Open by observing first and keep the approach lighter.',
                whySummary: 'persona prefers observe-first room before a closer move.',
              },
            },
            embodiment: null,
            memory: null,
          },
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.selectedCandidatePersonaAuthorityMappingSummary).toEqual({
      status: 'drift',
      biasMode: 'observe-first restraint',
      dominantDrift: 'runtime-selected-action:speak',
      lines: [
        'authority-line: observer | observant | hold | quiet-presence',
        'bias-mode: observe-first restraint',
        'style-line: silent-observe | attentive',
        'action-line: persona=hover | runtime=speak | shouldSpeak=true',
        'opening-guidance: Open by observing first and keep the approach lighter.',
        'dominant-drift: runtime-selected-action:speak',
      ],
    })
  })

  it('builds a grounded birth persona authority summary from soul personality authority', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [{
          id: 'cf-hover',
          action: 'hover',
          style: 'silent-observe',
          embodiedPresence: 'attentive',
          relationshipCost: 0.12,
          interruptionCost: 0.14,
          informationGain: 0.42,
          timingFitness: 0.72,
          identityFit: 0.88,
          score: 0.76,
          why: 'The thread is still warm, but presence fits better than words for one more breath.',
        }],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.birthPersonaAuthoritySummary).toEqual({
      status: 'grounded',
      birthMode: 'observe-first restraint',
      dominantDrift: null,
      lines: [
        'birth-authority: observer | observant | hold | quiet-presence',
        'birth-expression: guarded-warm | measured | low | selective',
        'birth-evolution: fast=presence, repair | slow=continuity | unlock=warmth-after-grounding',
        'current-mapping: observe-first restraint',
        'authority-continuity: birth-to-runtime aligned',
      ],
    })
  })

  it('surfaces birth persona authority drift when current proactive mapping breaks the birth posture', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-speak',
        selectedAction: 'speak',
        confidence: 0.62,
        dominantTradeoff: 'comfort-over-restraint',
        options: [{
          id: 'cf-speak',
          action: 'speak',
          style: 'light-nudge',
          embodiedPresence: 'attentive',
          relationshipCost: 0.34,
          interruptionCost: 0.41,
          informationGain: 0.55,
          timingFitness: 0.38,
          identityFit: 0.26,
          score: 0.43,
          why: 'The knot looks local enough that specific speech now would help more than hovering.',
        }],
        narrative: ['comfort drift overtook observe-first restraint'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'comment-now',
        selectedThreadId: 'thread-active',
        readiness: 0.82,
        surfacePressure: 0.74,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'A direct comment now feels more useful than holding room.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.78,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'comfort'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['presence', 'comfort'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect(store.birthPersonaAuthoritySummary).toEqual({
      status: 'drift',
      birthMode: 'observe-first restraint',
      dominantDrift: 'runtime-selected-action:speak',
      lines: [
        'birth-authority: observer | observant | hold | quiet-presence',
        'birth-expression: guarded-warm | measured | low | selective',
        'birth-evolution: fast=presence, repair | slow=continuity | unlock=warmth-after-grounding',
        'current-mapping: observe-first restraint',
        'authority-continuity: birth-to-runtime drift',
        'dominant-drift: runtime-selected-action:speak',
      ],
    })
  })

  it('explains birth authority continuity through remembered-familiarity restraint when same-her room still holds', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.81,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      privateThought: {
        stance: 'accompany',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        thoughtText: '记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        counterfactualOptionId: 'cf-hover',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'relationship continuity still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.birthPersonaAuthoritySummary).toEqual({
      status: 'grounded',
      birthMode: 'observe-first restraint',
      dominantDrift: null,
      lines: [
        'birth-authority: observer | observant | hold | quiet-presence',
        'birth-expression: guarded-warm | measured | low | selective',
        'birth-evolution: fast=presence, repair | slow=continuity | unlock=warmth-after-grounding',
        'current-mapping: observe-first restraint',
        'remembered-familiarity-authority: birth restraint still holds because familiarity stayed memory-first before visible closeness widened',
        'authority-continuity: birth-to-runtime aligned',
      ],
    })
  })

  it('summarizes identity drift governance as bounded growth when runtime remains anchored to birth persona', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [{
          id: 'cf-hover',
          action: 'hover',
          style: 'silent-observe',
          embodiedPresence: 'attentive',
          relationshipCost: 0.12,
          interruptionCost: 0.14,
          informationGain: 0.42,
          timingFitness: 0.72,
          identityFit: 0.88,
          score: 0.76,
          why: 'The thread is still warm, but presence fits better than words for one more breath.',
        }],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'relationship continuity still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect((store as any).identityDriftGovernanceSummary).toEqual({
      status: 'grounded',
      governanceMode: 'bounded-growth',
      dominantDrift: null,
      lines: [
        'governance: bounded growth is preserving identity',
        'identity-boundary: trust can deepen without violating observe-first room',
        'identity-anchors: host-steadiness | observe-first room',
        'trust-meaning: trust deepens through steadiness before closeness',
        'autobiographical-stability: 0.92 | trajectory=presence restraint',
      ],
    })
  })

  it('explains bounded growth through remembered-familiarity restraint when trust deepens without widening closeness', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.81,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'relationship continuity still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['relationship', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['relationship', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const identityGovernanceSummary = (store as any).identityDriftGovernanceSummary
    const identityGovernanceText = JSON.stringify(identityGovernanceSummary)
    expect(identityGovernanceSummary).toEqual(expect.objectContaining({
      status: 'grounded',
      governanceMode: 'bounded-growth',
      dominantDrift: null,
    }))
    expect(identityGovernanceText).toContain('familiarity stayed in memory first')
    expect(identityGovernanceText).toContain('trust deepens through steadiness before closeness')
    expectNoFixedTemplateResidue(identityGovernanceSummary)
  })

  it('surfaces identity drift governance violations when runtime growth crosses birth persona boundaries', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'record',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.1,
            closenessCapBias: 0.06,
            warmthReleaseBias: 0.22,
          },
          responsePosture: {
            secondPassRequiredBias: 0.04,
            hypothesisLabelBias: 0.04,
            specificityClampBias: 0.06,
            templateShellSuppressionBias: 0.04,
          },
          proactivePolicy: {
            restraintBias: 0.08,
            learningProposalBias: 0.24,
            actuationCooldownBias: 0.04,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:comfort'],
          summary: 'Runtime started normalizing a comfort-first outward move.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy', 'do not force closeness'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-speak',
        selectedAction: 'speak',
        confidence: 0.62,
        dominantTradeoff: 'comfort-over-restraint',
        options: [{
          id: 'cf-speak',
          action: 'speak',
          style: 'light-nudge',
          embodiedPresence: 'attentive',
          relationshipCost: 0.34,
          interruptionCost: 0.41,
          informationGain: 0.55,
          timingFitness: 0.38,
          identityFit: 0.26,
          score: 0.43,
          why: 'The knot looks local enough that specific speech now would help more than hovering.',
        }],
        narrative: ['comfort drift overtook observe-first restraint'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'comment-now',
        selectedThreadId: 'thread-active',
        readiness: 0.82,
        surfacePressure: 0.74,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'A direct comment now feels more useful than holding room.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['comfort', 'expressiveness'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.64,
        learningReadiness: 0.72,
        contradictionPressure: 0.52,
        revisionPressure: 0.62,
        autobiographicalStability: 0.54,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust now means speaking before the room is ready',
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['comfort', 'expressiveness'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['comfort', 'expressiveness'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:comfort'],
            summary: 'Runtime started normalizing a comfort-first outward move.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect((store as any).identityDriftGovernanceSummary).toEqual({
      status: 'drift',
      governanceMode: 'boundary-violation',
      dominantDrift: 'runtime-selected-action:speak',
      lines: [
        'governance: growth crossed persona boundary',
        'boundary-violation: runtime speech outran birth restraint',
        'identity-anchors: host-steadiness | observe-first room',
        'anti-persona-constraints: no pushy intimacy | do not force closeness',
        'trust-meaning: trust now means speaking before the room is ready',
        'dominant-drift: runtime-selected-action:speak',
      ],
    })
  })

  it('summarizes proactive decision consumption from birth persona through runtime hold behavior', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'verify',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.18,
            closenessCapBias: 0.14,
            warmthReleaseBias: 0.08,
          },
          responsePosture: {
            secondPassRequiredBias: 0.08,
            hypothesisLabelBias: 0.1,
            specificityClampBias: 0.1,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.56,
            learningProposalBias: 0.18,
            actuationCooldownBias: 0.52,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: true,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:presence'],
          summary: 'Presence return should stay observe-first until grounded again.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.78,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'The thread is still warm, but presence fits better than words for one more breath.',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['presence before commentary stayed dominant'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:presence'],
            summary: 'Presence return should stay observe-first until grounded again.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect((store as any).selectedCandidateProactiveDecisionConsumptionSummary).toEqual({
      status: 'grounded',
      decisionMode: 'birth-anchored-restraint',
      dominantDrift: null,
      lines: [
        'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
        'manifestation-consumption: silent-observe | attentive',
        'counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary',
        'rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
        'trust-meaning: trust deepens through steadiness before closeness',
      ],
    })
  })

  it('surfaces remembered-familiarity restraint inside proactive decision consumption summary when hover stays memory-first', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'relationship',
          action: 'internalize',
          resultStatus: 'completed',
          lanes: ['memory-policy', 'relationship-posture', 'proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.08,
            wrongThreadSuppressionBias: 0.18,
            provenanceLabelBias: 0.24,
            recallExpansionBias: 0.1,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.12,
            closenessCapBias: 0.22,
            warmthReleaseBias: 0.04,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.08,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.32,
            learningProposalBias: 0.08,
            actuationCooldownBias: 0.18,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
          summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: false,
        selectedAction: 'hold',
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-hover',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        confidence: 0.81,
        dominantTradeoff: 'presence-before-commentary',
        options: [
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: '记忆里的熟悉感可以留在这里，但现在先把它当作记忆握住，不要直接把它变成更近的可见靠近。',
          },
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.31,
            interruptionCost: 0.38,
            informationGain: 0.55,
            timingFitness: 0.44,
            identityFit: 0.24,
            score: 0.41,
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        narrative: ['remembered familiarity stayed memory-first before commentary'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'quiet-accompany',
        selectedThreadId: 'thread-active',
        readiness: 0.72,
        surfacePressure: 0.42,
        silencePressure: 0.7,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: false,
        why: 'Presence fits better than words for one more breath.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence', 'trust calibration'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.46,
        learningReadiness: 0.58,
        contradictionPressure: 0.28,
        revisionPressure: 0.42,
        autobiographicalStability: 0.92,
        dominantTrajectory: 'presence restraint',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust deepens through steadiness before closeness',
        nextLearningAction: 'verify',
        nextLearningReason: 'presence style still needs runtime confirmation',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['presence', 'trust calibration'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'presence restraint remains verify-first',
      },
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['presence', 'trust calibration'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect((store as any).selectedCandidateProactiveDecisionConsumptionSummary).toEqual({
      status: 'grounded',
      decisionMode: 'birth-anchored-restraint',
      dominantDrift: null,
      lines: [
        'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
        'manifestation-consumption: silent-observe | attentive',
        'counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary',
        'memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened',
        'rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
        'trust-meaning: trust deepens through steadiness before closeness',
      ],
    })
  })

  it('surfaces proactive decision consumption drift when runtime speech overrides birth restraint', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'presence',
          action: 'record',
          resultStatus: 'completed',
          lanes: ['proactive-policy'],
          memoryPolicy: {
            strictnessBias: 0.1,
            wrongThreadSuppressionBias: 0.1,
            provenanceLabelBias: 0.1,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0.1,
            closenessCapBias: 0.06,
            warmthReleaseBias: 0.22,
          },
          responsePosture: {
            secondPassRequiredBias: 0.04,
            hypothesisLabelBias: 0.04,
            specificityClampBias: 0.06,
            templateShellSuppressionBias: 0.04,
          },
          proactivePolicy: {
            restraintBias: 0.08,
            learningProposalBias: 0.24,
            actuationCooldownBias: 0.04,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:comfort'],
          summary: 'Runtime started normalizing a comfort-first outward move.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getSoul = vi.fn().mockResolvedValue({
      soulPath: '/tmp/Alicization.md',
      content: '# soul',
      revision: 3,
      hash: 'soul-hash',
      needsGenesis: false,
      watching: true,
      frontmatter: {
        schemaVersion: 1,
        initialized: true,
        custom_directives: '',
        host_attitude: 'keep room and stay near',
        core_incarnation: 'stay near without crowding',
        profile: {
          ownerName: '指挥官',
          hostName: '主人',
          alicizationName: '小艾',
          gender: 'female',
          genderCustom: '',
          relationship: '女仆',
          mindAge: 18,
        },
        personality: {
          obedience: 0.5,
          liveliness: 0.5,
          sensibility: 0.5,
          identityKernel: {
            temperament: {
              obedience: 0.32,
              liveliness: 0.24,
              sensibility: 0.74,
            },
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            valueBias: ['protect-room', 'truthful'],
          },
          expressionProfile: {
            warmth: 'guarded-warm',
            directness: 'measured',
            playfulness: 'low',
            emotionalVisibility: 'selective',
          },
          initiativeBaseline: {
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            jealousyStyle: 'soft-ache',
          },
          evolutionSeed: {
            fastLayers: ['presence', 'repair'],
            slowLayers: ['continuity'],
            unlockTracks: ['warmth-after-grounding'],
          },
          identityAnchors: ['host-steadiness', 'observe-first room'],
          antiPersonaConstraints: ['no pushy intimacy', 'do not force closeness'],
        },
        boundaries: {
          killSwitch: true,
          mcpGuard: true,
        },
      },
    })
    const getVisualPresenceState = vi.fn().mockResolvedValue({
      initiative: {
        shouldSpeak: true,
        selectedAction: 'speak',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        selectedCounterfactualOptionId: 'cf-speak',
        personaBias: {
          relationshipPosture: 'observer',
          initiativeStyle: 'observant',
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          preferredProactiveStyle: 'silent-observe',
          manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          openingGuidance: 'Open by observing first and keep the approach lighter.',
          whySummary: 'persona prefers observe-first room before a closer move.',
        },
      },
      counterfactualDeliberation: {
        selectedOptionId: 'cf-speak',
        selectedAction: 'speak',
        confidence: 0.62,
        dominantTradeoff: 'comfort-over-restraint',
        options: [
          {
            id: 'cf-speak',
            action: 'speak',
            style: 'light-nudge',
            embodiedPresence: 'attentive',
            relationshipCost: 0.34,
            interruptionCost: 0.41,
            informationGain: 0.55,
            timingFitness: 0.38,
            identityFit: 0.26,
            score: 0.43,
            why: 'The knot looks local enough that specific speech now would help more than hovering.',
          },
          {
            id: 'cf-hover',
            action: 'hover',
            style: 'silent-observe',
            embodiedPresence: 'attentive',
            relationshipCost: 0.12,
            interruptionCost: 0.14,
            informationGain: 0.42,
            timingFitness: 0.72,
            identityFit: 0.88,
            score: 0.76,
            why: 'Holding room would preserve the original posture, but it would feel too distant here.',
          },
        ],
        narrative: ['comfort drift overtook observe-first restraint'],
        updatedAt: 140,
      },
      actionEcology: {
        mode: 'comment-now',
        selectedThreadId: 'thread-active',
        readiness: 0.82,
        surfacePressure: 0.74,
        silencePressure: 0.18,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        shouldSurface: true,
        shouldSpeak: true,
        why: 'A direct comment now feels more useful than holding room.',
        updatedAt: 140,
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['comfort', 'expressiveness'],
      },
    })
    const getOrganicMemorySnapshot = vi.fn().mockResolvedValue({
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 180,
        evolutionMomentum: 0.64,
        learningReadiness: 0.72,
        contradictionPressure: 0.52,
        revisionPressure: 0.62,
        autobiographicalStability: 0.54,
        dominantTrajectory: 'comfort drift',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: 'trust now means speaking before the room is ready',
        nextLearningAction: 'record',
        nextLearningReason: 'runtime already drifted into speech-first behavior',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['comfort', 'expressiveness'],
        sourceSignals: ['runtime-drift'],
        summary: 'comfort drift is overtaking restraint',
      },
      learningExecutionState: {
        nextLearningAction: 'record',
        activeLearningFocuses: ['comfort', 'expressiveness'],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getSoul,
      getVisualPresenceState,
      getOrganicMemorySnapshot,
    }))

    const replayStore = useAlicizationMindReplayStore()
    vi.spyOn(replayStore, 'queryReplayLab').mockResolvedValue({
      events: [],
      traceRecords: [{
        decisionTraceId: 'trace-active',
        turnId: 'turn-active',
        sessionId: 'session-active',
        origin: 'user-turn',
        activeThreadId: 'thread-active',
        createdAt: 100,
        lastUpdatedAt: 140,
        eventKinds: ['governance-normalized'],
        governance: {
          turnMode: 'care',
          truthState: 'live-grounded',
          repairState: 'none',
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 120,
          activeSelfRevision: {
            candidateId: 'candidate-active',
            patchId: 'patch-active',
            patchDecisionTraceId: 'trace-active',
            lanes: ['proactive-policy'],
            reasonCodes: ['domain:comfort'],
            summary: 'Runtime started normalizing a comfort-first outward move.',
          },
          personalityState: {
            identityKernel: {
              relationshipPosture: 'observer',
              initiativeStyle: 'observant',
            },
            initiativeBaseline: {
              silenceReconnect: 'hold',
              comfortStyle: 'quiet-presence',
            },
          },
          personStateProjection: {
            preferredProactiveStyle: 'silent-observe',
            openingGuidance: 'Open by observing first and keep the approach lighter.',
          },
          summary: 'observe-first persona bias is active in the current runtime.',
        },
      }] as any,
    })

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()
    await store.drillSelectedCandidateTrace()

    expect((store as any).selectedCandidateProactiveDecisionConsumptionSummary).toEqual({
      status: 'drift',
      decisionMode: 'restraint-overridden',
      dominantDrift: 'runtime-selected-action:speak',
      lines: [
        'decision-consumption: runtime speak overrode birth observe-first restraint',
        'manifestation-drift: silent-observe -> light-nudge | attentive',
        'counterfactual-consumption: selected=speak | tradeoff=comfort-over-restraint',
        'rejected-identity-fit: hover preserved more identity but lost the final decision',
        'dominant-drift: runtime-selected-action:speak',
        'trust-meaning: trust now means speaking before the room is ready',
      ],
    })
  })
  it('loads the latest project-state continuity observation from the bridge and clears it with the inspector state', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      version: 'self-evolution-version-runtime-v1',
      activeCandidateId: 'candidate-active',
      candidates: [{
        version: 'self-evolution-version-candidate-v1',
        id: 'candidate-active',
        status: 'active',
        sourceEventId: 'event-active',
        decisionTraceId: 'trace-active',
        sourceTurnId: 'turn-active',
        patch: {
          version: 'self-revision-state-patch-v1',
          id: 'patch-active',
          sourceEventId: 'event-active',
          sourceTurnId: 'turn-active',
          decisionTraceId: 'trace-active',
          domain: 'self-model',
          action: 'revise',
          resultStatus: 'completed',
          lanes: ['memory-policy'],
          memoryPolicy: {
            strictnessBias: 0.4,
            wrongThreadSuppressionBias: 0.2,
            provenanceLabelBias: 0.3,
            recallExpansionBias: 0.05,
            shouldQuarantineUnsupportedCarry: false,
          },
          relationshipPosture: {
            repairWindowBias: 0,
            closenessCapBias: 0,
            warmthReleaseBias: 0,
          },
          responsePosture: {
            secondPassRequiredBias: 0.1,
            hypothesisLabelBias: 0.08,
            specificityClampBias: 0.2,
            templateShellSuppressionBias: 0.12,
          },
          proactivePolicy: {
            restraintBias: 0.05,
            learningProposalBias: 0.1,
            actuationCooldownBias: 0.07,
          },
          validation: {
            requiresRollbackCheck: false,
            requiresRevalidation: false,
            rollbackPlan: [],
          },
          reasonCodes: ['domain:self-model'],
          summary: 'Active candidate remains authoritative.',
        },
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 4,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
      currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one identity-continuity',
      nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: 'identity-continuity',
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      turnId: 'turn-hidden-failure',
      sessionId: 'session-a',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-hidden-failure',
      sessionId: 'session-a',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before the next outward turn.',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep extending cross-modal identity-continuity',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one identity-continuity',
        ],
      },
      projectState: {
        continuitySummary: 'blocked artifact still keeps one readable project continuity brief alive before the next outward turn.',
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer bridge now preserves project-state continuity from hidden failure artifacts.',
        primaryOpenLoop: 'Expose the latest continuity snapshot to renderer-side dialogue preparation before every turn.',
        nextClosureTarget: 'Read the latest project-state observation from a stable renderer store.',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(getProjectStateContinuitySnapshot).toBeCalledTimes(1)
    expect(getLatestProjectStateObservation).toBeCalledTimes(1)
    expect(store.latestProjectStateObservation).toEqual({
      turnId: 'turn-hidden-failure',
      sessionId: 'session-a',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before the next outward turn.',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep extending cross-modal identity-continuity',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one identity-continuity',
        ],
      },
      projectState: {
        continuitySummary: 'blocked artifact still keeps one readable project continuity brief alive before the next outward turn.',
        identity: 'Alicization is a local-first digital life companion.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Renderer bridge now preserves project-state continuity from hidden failure artifacts.',
        primaryOpenLoop: 'Expose the latest continuity snapshot to renderer-side dialogue preparation before every turn.',
        nextClosureTarget: 'Read the latest project-state observation from a stable renderer store.',
      },
    })
    expect(store.projectStateContinuitySnapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
      continuitySummary: 'blocked artifact still keeps one readable project continuity brief alive before the next outward turn.',
      preDialogueClosure: null,
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      turnId: 'turn-hidden-failure',
      sessionId: 'session-a',
      origin: 'user-turn',
    }))
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)

    store.clear()

    expect(store.latestProjectStateObservation).toBeNull()
    expect(store.projectStateContinuitySnapshot).toBeNull()
  })

  it('backfills the canonical identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-same-her',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue(null)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-same-her',
      sessionId: 'session-project-state-observation-same-her',
      origin: 'user-turn',
      nonHumanAuthoredStatus: 'blocked-failure-artifact',
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one identity-continuity',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.latestLandedProgress).toBe('Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot)
  })

  it('upgrades thinner latest observation awareness before storing the fallback inspector continuity snapshot when the canonical continuity snapshot is unavailable', async () => {
    const genericThinContinuityReminder = 'generic continuity reminder that should not survive once the richer latest observation carry is stored as fallback continuity.'
    const continuitySummary = 'same-her=structured continuity digest.'
    const sameHerSelfLine = 'structured continuity digest.'

    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-awareness-fallback-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue(null)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-awareness-fallback-upgrade',
      sessionId: 'session-project-state-observation-awareness-fallback-upgrade',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Observation fallback already keeps stronger project continuity available.',
        primaryOpenLoop: 'Observation fallback still needs to keep the richer identity-continuity',
        nextClosureTarget: 'Keep the richer identity-continuity',
        continuitySummary,
        sameHerSelfLine,
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: genericThinContinuityReminder,
        companionBriefingLine: 'generic same-her reminder that should not survive once the richer latest observation carry is stored as fallback continuity.',
        companionNextClosureLine: 'Generic next target that should not survive once the richer latest observation carry is stored as fallback continuity.',
        awarenessLine: genericThinContinuityReminder,
        emotionalClosureCue: null,
        reasonPreview: [
          genericThinContinuityReminder,
        ],
      },
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
    }))
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Observation fallback already keeps stronger project continuity available.')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.summaryLine).not.toBe(genericThinContinuityReminder)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.awarenessLine).not.toBe(genericThinContinuityReminder)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.companionNextClosureLine).not.toBe(
      'Generic next target that should not survive once the richer latest observation carry is stored as fallback continuity.',
    )
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
  })

  it('backfills missing richer identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-same-her-backfill',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not survive once the richer identity-continuity',
        companionBriefingLine: 'generic same-her reminder that should not override the richer callback carry.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'generic continuity reminder that should not survive once the richer identity-continuity',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not survive once the richer identity-continuity',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-observation-same-her-backfill',
      sessionId: 'session-project-state-observation-same-her-backfill',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-same-her-backfill',
      sessionId: 'session-project-state-observation-same-her-backfill',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'same-her=structured continuity digest.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: null,
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
    }))
    expect(JSON.stringify(store.projectStateContinuitySnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot)
  })

  it('backfills proactive identity-continuity', async () => {
    const proactiveSameHerGap = 'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.'
    const genericThinContinuityReminder = 'generic continuity reminder that should not survive once the richer proactive identity-continuity'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-proactive-same-her-gap-backfill',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      proactiveSameHerGap: null,
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: genericThinContinuityReminder,
        companionBriefingLine: 'generic same-her reminder that should not survive once the richer proactive identity-continuity',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: genericThinContinuityReminder,
        emotionalClosureCue: null,
        reasonPreview: [
          genericThinContinuityReminder,
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-observation-proactive-same-her-gap-backfill',
      sessionId: 'session-project-state-observation-proactive-same-her-gap-backfill',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-proactive-same-her-gap-backfill',
      sessionId: 'session-project-state-observation-proactive-same-her-gap-backfill',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'same-her=structured continuity digest.',
        sameHerSelfLine: null,
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        proactiveSameHerGap,
      },
      preDialogueAwareness: null,
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 2,
          identityHitCount: 1,
          phaseHitCount: 1,
          openLoopHitCount: 1,
          continuityHitCount: 1,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 2,
          },
        },
        driftSignals: [],
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot).toEqual(expect.objectContaining({
      proactiveSameHerGap: null,
      preDialogueAwareness: expect.objectContaining({
        status: 'partial',
      }),
    }))
    expect(JSON.stringify(store.projectStateContinuitySnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot)
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expectNoFixedTemplateResidue(store.preDialogueClosureSnapshot)
  })

  it('prefers richer latest observation awareness over a thinner continuity awareness shell when rebuilding the inspector continuity snapshot itself', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-awareness-backfill',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not survive once the richer latest observation awareness is available.',
        companionBriefingLine: 'generic same-her reminder that should not outrank the richer latest observation awareness.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'generic continuity reminder that should not survive once the richer latest observation awareness is available.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not survive once the richer latest observation awareness is available.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-observation-awareness-backfill',
      sessionId: 'session-project-state-observation-awareness-backfill',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-awareness-backfill',
      sessionId: 'session-project-state-observation-awareness-backfill',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'same-her=structured continuity digest.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'continuity state first, then widen only if the reopening really holds.',
        companionBriefingLine: 'Resume from the same callback line before anything broader.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'pre_turn_context_digest',
          'Resume from the same callback line before anything broader.',
        ],
      },
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('grounded')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Project-state continuity already survives into runtime preparation.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.summaryLine).not.toBe('generic continuity reminder that should not survive once the richer latest observation awareness is available.')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.companionBriefingLine).not.toBe('generic same-her reminder that should not outrank the richer latest observation awareness.')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.awarenessLine).not.toBe('generic continuity reminder that should not survive once the richer latest observation awareness is available.')
  })

  it('prefers richer hold detail over a compact continuity carry in pre-dialogue awareness', async () => {
    const sameHerSelfLine = 'structured continuity digest.'
    const holdDetailLine = 'identity-continuity'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-compact-same-phase-hold-detail-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine,
      sameHerHoldDetail: holdDetailLine,
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this reopened callback opens outward.',
        companionBriefingLine: sameHerSelfLine,
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: sameHerSelfLine,
        emotionalClosureCue: null,
        reasonPreview: [
          sameHerSelfLine,
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-compact-same-phase-hold-detail-upgrade',
      sessionId: 'session-project-state-awareness-compact-same-phase-hold-detail-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('prefers richer hold detail over a generic continuity shell in pre-dialogue awareness', async () => {
    const sameHerSelfLine = 'structured continuity digest.'
    const holdDetailLine = 'identity-continuity'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-generic-shell-hold-detail-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to reopen from the continuity state instead of a generic shell.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: `same-her=${sameHerSelfLine} | hold=${holdDetailLine} | landed=Project-state continuity already survives into runtime preparation. | open=Inspector continuity still needs to reopen from the continuity state instead of a generic shell.`,
      sameHerSelfLine,
      sameHerHoldDetail: holdDetailLine,
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'Alicization is still in Phase 1 local digital life closure before this reopened callback opens outward.',
        companionBriefingLine: sameHerSelfLine,
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: sameHerSelfLine,
        emotionalClosureCue: null,
        reasonPreview: [
          sameHerSelfLine,
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-generic-shell-hold-detail-upgrade',
      sessionId: 'session-project-state-awareness-generic-shell-hold-detail-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('keeps synthesized still-voiced face-and-motion awareness from the latest observation when continuity itself only carries closure and same-her basics', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-observation-synthesized-face-motion-voice-awareness',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into inspector continuity.',
      primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
      nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next inspector-facing turn opens outward.',
      continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying continuity state. | landed=Still-voiced face-and-motion continuity already survives into inspector continuity. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity forgets the still-voiced face-and-motion lane and falls back into a detached shell, treat that as same-her drift rather than preserved closure.',
      emotionalClosureCue: 'Keep the return low-pressure so the continuity state does not restart from scratch.',
      preDialogueAwareness: null,
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-observation-synthesized-face-motion-voice-awareness',
      sessionId: 'session-project-state-observation-synthesized-face-motion-voice-awareness',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-observation-synthesized-face-motion-voice-awareness',
      sessionId: 'session-project-state-observation-synthesized-face-motion-voice-awareness',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Still-voiced face-and-motion continuity already survives into inspector continuity.',
        primaryOpenLoop: 'Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep the still-voiced face-and-motion project brief explicit before the next inspector-facing turn opens outward.',
        continuitySummary: 'same-her=still-voiced face-and-motion continuity is still carrying continuity state. | landed=Still-voiced face-and-motion continuity already survives into inspector continuity. | open=Body and lipsync still need to rejoin the still-voiced face-and-motion line before full cross-modal closure settles.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity forgets the still-voiced face-and-motion lane and falls back into a detached shell, treat that as same-her drift rather than preserved closure.',
      },
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'still-voiced face-and-motion closure is still unfinished before this turn opens outward.',
        companionHeadlineLine: 'Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the identity-continuity',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep body and lipsync rejoining the still-voiced face-and-motion line on the same measured-return carry.',
        emotionalClosureCue: 'Keep the return low-pressure so the continuity state does not restart from scratch.',
        briefingLines: [],
        reasons: [
          'still-voiced face-and-motion carry should stay explicit before the next outward turn.',
          'face+motion+voice recovery@segment-inspector-observation-still-voiced-face-motion-1',
        ],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('partial')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('face+motion+voice recovery@segment-inspector-observation-still-voiced-face-motion-1')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Still-voiced face-and-motion continuity already survives into inspector continuity.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.awarenessLine).not.toBe(
      'identity-continuity',
    )
  })

  it('prefers richer continuity awareness over a thinner latest observation awareness shell when exposing the inspector pre-dialogue awareness snapshot', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-observation-thin-shell',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'continuity state first, then widen only if the reopening really holds.',
        companionBriefingLine: 'Resume from the same callback line before anything broader.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'pre_turn_context_digest',
          'Resume from the same callback line before anything broader.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-observation-thin-shell',
      sessionId: 'session-project-state-awareness-observation-thin-shell',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-awareness-observation-thin-shell',
      sessionId: 'session-project-state-awareness-observation-thin-shell',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'same-her=structured continuity digest.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not outrank the richer continuity awareness already held by the inspector.',
        companionHeadlineLine: null,
        companionBriefingLine: 'generic same-her reminder that should not outrank the richer continuity awareness already held by the inspector.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'generic continuity reminder that should not outrank the richer continuity awareness already held by the inspector.',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'generic continuity reminder that should not outrank the richer continuity awareness already held by the inspector.',
        ],
      },
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('grounded')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expect(store.preDialogueAwarenessSnapshot?.summaryLine).not.toBe('generic continuity reminder that should not outrank the richer continuity awareness already held by the inspector.')
    expect(store.preDialogueAwarenessSnapshot?.companionBriefingLine).not.toBe('generic same-her reminder that should not outrank the richer continuity awareness already held by the inspector.')
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe('generic continuity reminder that should not outrank the richer continuity awareness already held by the inspector.')
  })

  it('prefers richer continuity awareness over a thinner Chinese latest observation awareness shell when exposing the inspector pre-dialogue awareness snapshot', async () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-observation-thin-chinese-shell',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'continuity state first, then widen only if the reopening really holds.',
        companionBriefingLine: 'Resume from the same callback line before anything broader.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'pre_turn_context_digest',
          'Resume from the same callback line before anything broader.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-observation-thin-chinese-shell',
      sessionId: 'session-project-state-awareness-observation-thin-chinese-shell',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-awareness-observation-thin-chinese-shell',
      sessionId: 'session-project-state-awareness-observation-thin-chinese-shell',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to keep the continuity state explicit before the next outward turn.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'same-her=structured continuity digest.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: thinChineseProjectBrief,
        companionHeadlineLine: null,
        companionBriefingLine: thinChineseProjectBrief,
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        awarenessLine: thinChineseProjectBrief,
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          thinChineseProjectBrief,
        ],
      },
      preDialogueClosure: null,
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('grounded')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Project-state continuity already survives into runtime preparation.')
    expect(store.preDialogueAwarenessSnapshot?.companionNextClosureLine).toBe('Keep the reopened callback on the continuity state before expansion')
    expect(store.preDialogueAwarenessSnapshot?.summaryLine).not.toBe(thinChineseProjectBrief)
    expect(store.preDialogueAwarenessSnapshot?.companionBriefingLine).not.toBe(thinChineseProjectBrief)
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe(thinChineseProjectBrief)
  })

  it('keeps explicit awareness fields while still enriching inspector pre-dialogue awareness summary and reasons from continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
      primaryOpenLoop: 'Inspector-facing awareness still needs to preserve the stronger host-visible project brief.',
      nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If inspector-side rebuilding leaves only a detached project status shell, treat that as identity-continuity',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer identity-continuity',
        companionBriefingLine: 'generic same-her reminder that should not override the richer identity-continuity',
        companionNextClosureLine: 'Keep extending cross-modal identity-continuity',
        awarenessLine: 'generic continuity reminder that should not override the richer identity-continuity',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer identity-continuity',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-upgrade',
      sessionId: 'session-project-state-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Project-state continuity and awareness-first self-brief already survive across browser-local replay.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Inspector-facing awareness still needs to preserve the stronger host-visible project brief.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expect(store.preDialogueAwarenessSnapshot?.summaryLine).not.toBe('generic continuity reminder that should not override the richer identity-continuity')
    expect(store.preDialogueAwarenessSnapshot?.companionBriefingLine).not.toBe('generic same-her reminder that should not override the richer identity-continuity')
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe('generic continuity reminder that should not override the richer identity-continuity')
  })

  it('keeps the compact long-horizon latest-progress reason visible when inspector continuity enrichment fills the preview budget', async () => {
    const canonicalLongHorizonReason = 'Latest landed progress: long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-long-horizon-preview-budget',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'That same long-horizon emotion-memory-voice-motion bridge now ties durable self-carry into remembered emotional carry while still not proving full long-horizon emotion-memory-voice-motion convergence.',
      primaryOpenLoop: 'Inspector continuity still needs to keep remembered emotional carry visible before voice, face, motion, lipsync, and body recovery are treated as converged.',
      nextClosureTarget: 'Keep the long-horizon emotion-memory-voice-motion bridge visible as landed progress without overstating full convergence.',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity drops the compact latest-progress reason, treat that as project-awareness drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'The continuity state is carrying remembered emotional residue, but full cross-modal convergence is still open.',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep the long-horizon emotion-memory-voice-motion bridge visible as landed progress without overstating full convergence.',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: 'identity-continuity',
        reasonPreview: [
          'Same-her anchor still matters before the reply starts.',
          'Primary open loop still needs to stay visible.',
          'Next closure target still needs to be named.',
          'Drift guard still prevents generic assistant output.',
          canonicalLongHorizonReason,
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-long-horizon-preview-budget',
      sessionId: 'session-project-state-awareness-long-horizon-preview-budget',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const awarenessText = JSON.stringify(store.preDialogueAwarenessSnapshot)
    expect(awarenessText).toContain('remembered emotional carry')
    expect(awarenessText).toContain('converged')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('keeps legacy latestProgress alive as landed progress when inspector rebuilds awareness from bridge continuity snapshots', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-legacy-progress-awareness',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestProgress: 'Legacy continuity progress still survives from older inspector payloads.',
      primaryOpenLoop: 'Inspector awareness still needs to keep the same Phase 1 life loop explicit before the next outward turn.',
      nextClosureTarget: 'Keep the next callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If inspector continuity drops landed progress from this carry, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer legacy progress carry.',
        companionBriefingLine: 'generic same-her reminder that should not override the richer legacy progress carry.',
        companionNextClosureLine: 'Keep the next callback on the continuity state before expansion',
        awarenessLine: 'generic continuity reminder that should not override the richer legacy progress carry.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer legacy progress carry.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-legacy-progress-awareness',
      sessionId: 'session-project-state-legacy-progress-awareness',
      origin: 'user-turn',
    } as any)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Legacy continuity progress still survives from older inspector payloads.',
    }))
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Legacy continuity progress still survives from older inspector payloads.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('keeps audit-style landedProgressSummary alive as landed progress when inspector rebuilds awareness from bridge continuity snapshots', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-audit-progress-awareness',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: ' ',
      latestProgress: '   ',
      landedProgressSummary: 'Audit-style continuity progress still survives from older inspector payloads.',
      primaryOpenLoop: 'Inspector awareness still needs to keep the same Phase 1 life loop explicit before the next outward turn.',
      nextClosureTarget: 'Keep the next callback on the continuity state before expansion',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If inspector continuity drops landed progress from this carry, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer audit progress carry.',
        companionBriefingLine: 'generic same-her reminder that should not override the richer audit progress carry.',
        companionNextClosureLine: 'Keep the next callback on the continuity state before expansion',
        awarenessLine: 'generic continuity reminder that should not override the richer audit progress carry.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer audit progress carry.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-audit-progress-awareness',
      sessionId: 'session-project-state-audit-progress-awareness',
      origin: 'user-turn',
    } as any)
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot).toEqual(expect.objectContaining({
      latestLandedProgress: 'Audit-style continuity progress still survives from older inspector payloads.',
    }))
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Audit-style continuity progress still survives from older inspector payloads.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
  })

  it('upgrades continuity snapshot awareness itself when inspector continuity payload still carries a thin same-her reminder', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-continuity-snapshot-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
      primaryOpenLoop: 'Inspector-facing awareness still needs to preserve the stronger host-visible project brief.',
      nextClosureTarget: 'Keep extending cross-modal identity-continuity',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If inspector-side rebuilding leaves only a detached project status shell, treat that as identity-continuity',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer identity-continuity',
        companionBriefingLine: 'generic same-her reminder that should not override the richer identity-continuity',
        companionNextClosureLine: 'Keep extending cross-modal identity-continuity',
        awarenessLine: 'generic continuity reminder that should not override the richer identity-continuity',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer identity-continuity',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-continuity-snapshot-upgrade',
      sessionId: 'session-project-state-awareness-continuity-snapshot-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('partial')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Project-state continuity and awareness-first self-brief already survive across browser-local replay.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.summaryLine).not.toBe('generic continuity reminder that should not override the richer identity-continuity')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.companionBriefingLine).not.toBe('generic same-her reminder that should not override the richer identity-continuity')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.awarenessLine).not.toBe('generic continuity reminder that should not override the richer identity-continuity')
  })

  it('upgrades a generic carried next-closure shell to the richer continuity next closure inside inspector awareness rebuilding', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-next-closure-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Host-visible project-state continuity already survives into inspector awareness rebuilding.',
      primaryOpenLoop: 'Inspector awareness rebuilding still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
      nextClosureTarget: 'Keep the richer Phase 1 closure target explicit so inspector-facing turns still remember which same-her repair remains open.',
      continuitySummary: 'same-her=returned continuity still holds. landed=Host-visible project-state continuity already survives into inspector awareness rebuilding. open=Inspector awareness rebuilding still needs to keep the richer next closure target explicit instead of flattening back into a generic closure shell.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerDriftRisk: 'If inspector-side rebuilding leaves only a detached project status shell, treat that as identity-continuity',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer identity-continuity',
        companionBriefingLine: 'generic same-her reminder that should not override the richer identity-continuity',
        companionNextClosureLine: 'Generic next target that should not override the richer continuity carry.',
        awarenessLine: 'generic continuity reminder that should not override the richer identity-continuity',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer identity-continuity',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-next-closure-upgrade',
      sessionId: 'session-project-state-next-closure-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Host-visible project-state continuity already survives into inspector awareness rebuilding.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Host-visible project-state continuity already survives into inspector awareness rebuilding.')
    expectNoFixedTemplateResidue(store.preDialogueAwarenessSnapshot)
    expect(store.preDialogueAwarenessSnapshot?.companionNextClosureLine).not.toBe('Generic next target that should not override the richer continuity carry.')

    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('partial')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Host-visible project-state continuity already survives into inspector awareness rebuilding.')
    expectNoFixedTemplateResidue(store.projectStateContinuitySnapshot?.preDialogueAwareness)
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.companionNextClosureLine).not.toBe('Generic next target that should not override the richer continuity carry.')
  })

  it('prefers a richer same-her headline over a thinner awareness line when inspector rebuilds pre-dialogue awareness from continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-awareness-headline-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Inspector-side continuity reconstruction already keeps stronger identity-continuity',
      primaryOpenLoop: 'Inspector pre-dialogue awareness still needs to keep the richer identity-continuity',
      nextClosureTarget: 'Keep richer same-her awareness visible before the next inspector-facing turn opens outward.',
      continuitySummary: 'same-her=Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles. | landed=Inspector-side continuity reconstruction already keeps stronger identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the next visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic awareness summary that should not outrank the richer same-her headline.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep richer same-her awareness visible before the next inspector-facing turn opens outward.',
        awarenessLine: 'generic awareness reminder that should not outrank the richer same-her headline.',
        emotionalClosureCue: null,
        reasonPreview: [
          'generic awareness reminder that should not outrank the richer same-her headline.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-awareness-headline-upgrade',
      sessionId: 'session-project-state-awareness-headline-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('continuity_review_required')
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe('generic awareness reminder that should not outrank the richer same-her headline.')
  })

  it('prefers a richer phase-aware project awareness line over a narrower embodiment headline when inspector rebuilds pre-dialogue awareness from continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-richer-awareness-over-embodiment-headline',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Inspector-side continuity reconstruction already keeps richer Phase 1 project carry available.',
      primaryOpenLoop: 'Inspector pre-dialogue awareness still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
      nextClosureTarget: 'Keep richer Phase 1 project awareness visible before the next inspector-facing turn opens outward.',
      continuitySummary: 'same-her=structured continuity digest.',
      sameHerSelfLine: 'structured continuity digest.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic awareness summary that should not outrank the richer project awareness line.',
        companionHeadlineLine: 'Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
        companionBriefingLine: 'structured continuity digest.',
        companionNextClosureLine: 'Keep richer Phase 1 project awareness visible before the next inspector-facing turn opens outward.',
        awarenessLine: 'pre_turn_context_digest',
        emotionalClosureCue: null,
        reasonPreview: [
          'pre_turn_context_digest',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-richer-awareness-over-embodiment-headline',
      sessionId: 'session-project-state-richer-awareness-over-embodiment-headline',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Inspector-side continuity reconstruction already keeps richer Phase 1 project carry available.')
    expect(store.preDialogueAwarenessSnapshot?.companionNextClosureLine).toBe('Keep richer Phase 1 project awareness visible before the next inspector-facing turn opens outward.')
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('does not let a thin inspector continuity awareness summary shell outrank a richer inspector project-aware opening when no canonical continuity summary survives', async () => {
    const richerProjectAwareOpening = 'pre_turn_context_digest'
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-thin-inspector-summary-shell-vs-richer-opening',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Inspector-side project-aware openings already survive without a canonical continuity summary.',
      primaryOpenLoop: 'Inspector continuity still needs to keep the richer project-aware opening explicit instead of collapsing back into a thin continuity shell.',
      nextClosureTarget: 'Keep the richer project-aware opening explicit before the next inspector-facing turn opens outward.',
      continuitySummary: '',
      sameHerSelfLine: 'structured continuity digest.',
      emotionalClosureCue: null,
      preDialogueAwareness: {
        status: 'partial',
        summaryLine: 'generic continuity reminder that should not override the richer inspector project-aware opening.',
        companionHeadlineLine: null,
        companionBriefingLine: null,
        companionNextClosureLine: 'Keep the richer project-aware opening explicit before the next inspector-facing turn opens outward.',
        awarenessLine: richerProjectAwareOpening,
        emotionalClosureCue: null,
        reasonPreview: [
          'generic continuity reminder that should not override the richer inspector project-aware opening.',
          'Inspector-side project-aware openings already survive without a canonical continuity summary.',
        ],
      },
      preDialogueClosure: null,
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-thin-inspector-summary-shell-vs-richer-opening',
      sessionId: 'session-project-state-thin-inspector-summary-shell-vs-richer-opening',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Inspector-side project-aware openings already survive without a canonical continuity summary.')
    expect(store.preDialogueAwarenessSnapshot?.summaryLine).not.toBe('generic continuity reminder that should not override the richer inspector project-aware opening.')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.status).toBe('partial')
    expect(JSON.stringify(store.projectStateContinuitySnapshot?.preDialogueAwareness)).toContain('Inspector-side project-aware openings already survive without a canonical continuity summary.')
    expect(store.projectStateContinuitySnapshot?.preDialogueAwareness?.summaryLine).not.toBe('generic continuity reminder that should not override the richer inspector project-aware opening.')
  })

  it('derives a body-face-motion host-facing awareness line from closure reasons when inspector only has project-state closure context', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-body-face-motion-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Body, face, and motion recovery already survives into inspector continuity.',
      primaryOpenLoop: 'Lipsync and voice still need to rejoin the already re-formed body, face, and motion line.',
      nextClosureTarget: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line on the next turn.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Let lipsync and voice rejoin the already-reformed body, face, and motion line on the next turn.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'same-segment face+motion+body recovery@segment-inspector-body-face-motion-1',
          'remaining-open=lipsync+voice',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-body-face-motion-awareness-upgrade',
      sessionId: 'session-project-state-body-face-motion-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Body, face, and motion recovery already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Lipsync and voice still need to rejoin the already re-formed body, face, and motion line.')
  })

  it('prefers the richer identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-closure-only-same-her-hold-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Browser-local continuity reopening already preserves the callback carry before the next outward turn.',
      primaryOpenLoop: 'Inspector awareness still needs to reopen from the same measured-return line instead of a generic project shell.',
      nextClosureTarget: 'Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
      continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector rebuilding reopens this callback like a fresh generic project handoff, treat that as identity-continuity',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'generic closure summary that should not outrank the richer identity-continuity',
        companionHeadlineLine: null,
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Keep the restored callback reopening from the same-her measured-return line before widening outward again.',
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-closure-only-same-her-hold-upgrade',
      sessionId: 'session-project-state-closure-only-same-her-hold-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Browser-local continuity reopening already preserves the callback carry before the next outward turn.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Inspector awareness still needs to reopen from the same measured-return line instead of a generic project shell.')
    expect(store.preDialogueAwarenessSnapshot?.companionBriefingLine).not.toBe('I still need a steadier carry of this project, this phase, and the life loop that remains open.')
    expect(store.preDialogueAwarenessSnapshot?.awarenessLine).not.toBe('I still need a steadier carry of this project, this phase, and the life loop that remains open.')
  })

  it('prefers richer latest observation closure over a thinner continuity closure shell when rebuilding the inspector continuity snapshot itself', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-closure-observation-precedence',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to reopen from the continuity state instead of a generic shell.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'generic closure summary that should not outrank the richer latest observation closure.',
        companionHeadlineLine: null,
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-closure-observation-precedence',
      sessionId: 'session-project-state-closure-observation-precedence',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-closure-observation-precedence',
      sessionId: 'session-project-state-closure-observation-precedence',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to reopen from the continuity state instead of a generic shell.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: null,
        sameHerDriftRiskLine: 'If this callback is treated like a fresh project handoff, continuity will drift.',
        companionBriefingLine: 'Resume from the same callback closure before anything broader.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        emotionalClosureCue: 'continuity_closure: stale internal marker',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'identity-continuity',
        ],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    const closure = store.projectStateContinuitySnapshot?.preDialogueClosure
    expect(closure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
      emotionalClosureCue: 'identity-continuity',
      briefingLines: [],
      reasons: [],
    }))
    expect(JSON.stringify(closure)).not.toContain('continuity_closure')
    expect(JSON.stringify(closure)).not.toContain('generic closure summary that should not outrank the richer latest observation closure.')
    expect(JSON.stringify(closure)).not.toContain('I still need a steadier carry of this project, this phase, and the life loop that remains open.')
  })

  it('prefers richer latest observation closure over a thinner benchmark-derived closure when exposing the inspector pre-dialogue closure snapshot', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-closure-snapshot-observation-precedence',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Inspector continuity still needs to reopen from the continuity state instead of a generic shell.',
      nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
      continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
      sameHerSelfLine: 'structured continuity digest.',
      sameHerHoldDetail: 'identity-continuity',
      sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      emotionalClosureCue: 'identity-continuity',
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'generic closure summary that should not outrank the richer latest observation closure snapshot.',
        companionHeadlineLine: null,
        companionBriefingLine: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [],
        reasons: [],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-closure-snapshot-observation-precedence',
      sessionId: 'session-project-state-closure-snapshot-observation-precedence',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue({
      turnId: 'turn-project-state-closure-snapshot-observation-precedence',
      sessionId: 'session-project-state-closure-snapshot-observation-precedence',
      origin: 'user-turn',
      nonHumanAuthoredStatus: null,
      projectState: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Inspector continuity still needs to reopen from the continuity state instead of a generic shell.',
        nextClosureTarget: 'Keep the reopened callback on the continuity state before expansion',
        continuitySummary: 'project continuity is still reopening on the same measured-return line instead of from scratch.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        sameHerDriftRisk: 'If inspector continuity reopens this callback like a fresh generic project handoff, treat that as same-her drift rather than forward closure.',
      },
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'grounded',
        summaryLine: 'pre_turn_context_digest',
        companionHeadlineLine: null,
        sameHerDriftRiskLine: 'If this callback is treated like a fresh project handoff, continuity will drift.',
        companionBriefingLine: 'Resume from the same callback closure before anything broader.',
        companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
        emotionalClosureCue: 'identity-continuity',
        briefingLines: [
          'Identity: Alicization is a local-first digital life project.',
          'Phase: Phase 1: Local Digital Life',
        ],
        reasons: [
          'identity-continuity',
        ],
      },
    })

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const replayStore = useAlicizationMindReplayStore()
    ;(replayStore as any).benchmarkReport = {
      datasetFeedback: {
        projectStateSummary: {
          comparedTurnCount: 2,
          identityHitCount: 1,
          phaseHitCount: 1,
          openLoopHitCount: 1,
          continuityHitCount: 1,
        },
        emotionalClosureSummary: {
          comparedTurnCount: 2,
          activeCueTurnCount: 2,
          lowPressureRequiredTurnCount: 0,
          antiRestartRequiredTurnCount: 0,
          validationStatus: {
            knownTurnCount: 0,
            approvedTurnCount: 0,
            blockedTurnCount: 0,
            unknownTurnCount: 2,
          },
        },
        driftSignals: [],
      },
    }

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueClosureSnapshot).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: null,
      sameHerDriftRiskLine: null,
      companionBriefingLine: null,
      companionNextClosureLine: 'Keep the reopened callback on the continuity state before expansion',
      emotionalClosureCue: 'identity-continuity',
      briefingLines: [],
      reasons: [],
    }))
    expect(store.preDialogueClosureSnapshot?.summaryLine).not.toBe('generic closure summary that should not outrank the richer latest observation closure snapshot.')
    expect(store.preDialogueClosureSnapshot?.companionBriefingLine).not.toBe('I still need a steadier carry of this project, this phase, and the life loop that remains open.')
  })

  it('derives a body-and-voice host-facing awareness line from closure reasons when the audible-body line survives first', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-body-voice-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Audible-body continuity already survives into inspector continuity.',
      primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin the audible-body line.',
      nextClosureTarget: 'Rejoin face, motion, and lipsync onto the same-her body line without dropping voice continuity.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=resident body continuity and voice prosody are still aligned with the active identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=resident body continuity and voice prosody are still aligned with the active identity-continuity',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Rejoin face, motion, and lipsync onto the same-her body line without dropping voice continuity.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'body+voice recovery@segment-inspector-body-voice-1',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-body-voice-awareness-upgrade',
      sessionId: 'session-project-state-body-voice-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Audible-body continuity already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Face, motion, and lipsync still need to rejoin the audible-body line.')
  })

  it('derives a body-lipsync-voice host-facing awareness line from closure reasons when the audible-body line has already re-formed more fully', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-body-lipsync-voice-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Audible-body continuity with lipsync already survives into inspector continuity.',
      primaryOpenLoop: 'Face and motion still need to rejoin the audible-body line.',
      nextClosureTarget: 'Rejoin face and motion onto the same-her audible-body line without dropping voice and lipsync continuity.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=body, lipsync, and voice still carry the continuity state while face and motion remain out of phase.',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=body, lipsync, and voice still carry the continuity state while face and motion remain out of phase.',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Rejoin face and motion onto the same-her audible-body line without dropping voice and lipsync continuity.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'body+lipsync+voice recovery@segment-inspector-body-lipsync-voice-1',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-body-lipsync-voice-awareness-upgrade',
      sessionId: 'session-project-state-body-lipsync-voice-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Audible-body continuity with lipsync already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Face and motion still need to rejoin the audible-body line.')
  })

  it('derives a body-only host-facing awareness line that keeps resident body continuity explicit while face, motion, lipsync, and voice still need to rejoin', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-body-only-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Resident body continuity already survives into inspector continuity.',
      primaryOpenLoop: 'Face, motion, lipsync, and voice still need to rejoin the resident body line before full embodiment closure settles.',
      nextClosureTarget: 'Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=resident body continuity is still the surviving line while the rest of the visible and audible closure remains open.',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=resident body continuity is still the surviving line while the rest of the visible and audible closure remains open.',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Rejoin face, motion, lipsync, and voice onto the same-her body line without dropping resident body continuity.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'body-only recovery@segment-inspector-body-only-1',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-body-only-awareness-upgrade',
      sessionId: 'session-project-state-body-only-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Resident body continuity already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Face, motion, lipsync, and voice still need to rejoin the resident body line before full embodiment closure settles.')
  })

  it('derives a still-voiced face-line host-facing awareness line from closure reasons when face and voice are the surviving identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-face-voice-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'The still-voiced face line already survives into inspector continuity.',
      primaryOpenLoop: 'Body, motion, and lipsync still need to rejoin the still-voiced face line before full embodiment closure settles.',
      nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=face and voice still carry the identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=face and voice still carry the identity-continuity',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'continuity=embodiment:audible-same-her-line | lane=face+voice-only | actual source is face and voice',
          'remaining-open=body+motion+lipsync',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-face-voice-awareness-upgrade',
      sessionId: 'session-project-state-face-voice-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('The still-voiced face line already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Body, motion, and lipsync still need to rejoin the still-voiced face line before full embodiment closure settles.')
  })

  it('derives a still-voiced motion-line host-facing awareness line from signature-only closure reasons when motion and voice are the surviving identity-continuity', async () => {
    const getSelfEvolutionState = vi.fn().mockResolvedValue({
      activeCandidateId: 'candidate-project-state-motion-voice-awareness-upgrade',
      candidates: [],
    })
    const getProjectStateContinuitySnapshot = vi.fn().mockResolvedValue({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'The still-voiced motion line already survives into inspector continuity.',
      primaryOpenLoop: 'Body, face, and lipsync still need to rejoin the still-voiced motion line before full embodiment closure settles.',
      nextClosureTarget: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      continuitySummary: 'project=continuity=0.67 (2/3) | embodiment=motion and voice still carry the identity-continuity',
      sameHerSelfLine: 'Keep identity continuity explicit from self-understanding into the final host-visible reply.',
      emotionalClosureCue: null,
      preDialogueAwareness: null,
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'project=continuity=0.67 (2/3) | embodiment=motion and voice still carry the identity-continuity',
        companionHeadlineLine: null,
        companionBriefingLine: 'pre_turn_context_digest',
        companionNextClosureLine: 'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
        emotionalClosureCue: null,
        briefingLines: [],
        reasons: [
          'continuity=embodiment:still-voiced-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line | motion+voice recovery@segment-live2d-runtime-still-voiced-motion-1 | pending-rejoin=body+face+lipsync',
        ],
      },
      nonHumanAuthoredStatus: null,
      turnId: 'turn-project-state-motion-voice-awareness-upgrade',
      sessionId: 'session-project-state-motion-voice-awareness-upgrade',
      origin: 'user-turn',
    })
    const getLatestProjectStateObservation = vi.fn().mockResolvedValue(null)

    setAlicizationBridge(createAlicizationBridgeStub({
      getSelfEvolutionState,
      getProjectStateContinuitySnapshot,
      getLatestProjectStateObservation,
    }))

    const store = useAlicizationSelfEvolutionInspectorStore()
    await store.refresh()

    expect(store.preDialogueAwarenessSnapshot?.status).toBe('partial')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('The still-voiced motion line already survives into inspector continuity.')
    expect(JSON.stringify(store.preDialogueAwarenessSnapshot)).toContain('Body, face, and lipsync still need to rejoin the still-voiced motion line before full embodiment closure settles.')
  })
})
