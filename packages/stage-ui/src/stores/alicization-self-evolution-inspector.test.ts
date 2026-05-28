import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationMindReplayStore } from './alicization-mind-replay'
import { useAlicizationSelfEvolutionInspectorStore } from './alicization-self-evolution-inspector'

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

describe('alicization self evolution inspector store', () => {
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

    expect(store.selectedCandidateRuntimeAlignment).toEqual(expect.objectContaining({
      proactive: expect.objectContaining({
        reasons: expect.arrayContaining([
          'Latest drilled takeover audit shows visible proactive surfacing was blocked by opening-guidance:lower-pressure.',
          'That proactive lower-pressure hold specifically says remembered familiarity must stay memory-first before visible closeness widens, so runtime surfacing is still preserving the same-her room.',
        ]),
      }),
    }))
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

  it('surfaces memory-led familiarity restraint detail from takeover audit when lower-pressure same-her continuity holds the line', async () => {
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

    expect(store.selectedCandidatePrivateThoughtGovernanceChain).toEqual(expect.objectContaining({
      visibleReplyBlockedReason: 'opening-guidance:lower-pressure',
      reasons: expect.arrayContaining([
        'Latest visible reply governance still blocks proactive wording by opening-guidance:lower-pressure, so the outer utterance gate is preserving the same restraint the inner line already holds.',
        'That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the same-her return inside the current room.',
      ]),
    }))
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

    expect(store.selectedCandidatePrivateThoughtGovernanceChain).toEqual(expect.objectContaining({
      visibleReplyRealizationReason: 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance',
      reasons: expect.arrayContaining([
        'Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the same-her return from jumping ahead of the current room.',
      ]),
    }))
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
      status: 'partial',
      dominantDrift: 'projected-body:warning',
      lines: [
        'status: partial | drift=embodiment',
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

  it('surfaces same-her continuity governance in baseline anchor audit summary when the adopted anchor was trusted by continuity reconfirmation', async () => {
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
          repairOwnerHint: 'same-her continuity governance',
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
        'trace: snapshot=180 | trace=trace-active | owner=same-her continuity governance',
        'continuity-governance: same-her 连续性治理已经再次确认，可直接进入长期基线。',
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
      status: 'partial',
      dominantDrift: 'planner:warm',
      lines: [
        'status: partial | drift=runtime-alignment',
        'candidate-consumption: 1 traces | lanes=proactive-policy',
        'relationship-impact: restrained | planner/compiler drift',
        'proactive-impact: hold-likely=true | shouldSpeak=true | selectedAction=speak',
        'learning-impact: expected=verify | runtime=record | kernel=record | trajectory=comfort drift',
        'self-evolution-impact: partial | drift=embodiment',
        'dominant-drift: planner:warm',
      ],
    })
  })

  it('surfaces same-her continuity impact when remembered familiarity stays memory-first before visible closeness widens', async () => {
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

    expect(store.selectedCandidateImpactSummary).toEqual({
      status: 'partial',
      dominantDrift: 'focus:trust calibration',
      lines: [
        'status: partial | drift=mixed',
        'relationship-impact: restrained | planner/compiler aligned',
        'proactive-impact: hold-likely=false | shouldSpeak=false | selectedAction=hold',
        'learning-impact: expected=verify | runtime=verify | kernel=verify | trajectory=presence restraint',
        'self-evolution-impact: grounded | drift=none',
        'continuity-impact: remembered familiarity is staying memory-first, so visible closeness is intentionally being held inside the same-her room',
        'dominant-drift: focus:trust calibration',
      ],
    })
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

    expect(store.selectedCandidateTrajectorySummary).toEqual({
      status: 'grounded',
      trajectoryLabel: 'restrained companionship is holding',
      dominantDrift: null,
      lines: [
        'trajectory: restrained companionship is holding',
        'status: grounded | drift=none',
        'personality-baseline: restrained | observe-first',
        'remembered-familiarity-trajectory: familiarity is staying memory-first while the same-her room holds',
        'learning-direction: expected=verify | runtime=verify | kernel=verify',
        'dominant-trajectory: presence restraint',
      ],
    })
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
      status: 'partial',
      trajectoryLabel: 'comfort drift is overtaking restraint',
      dominantDrift: 'planner:warm',
      lines: [
        'trajectory: comfort drift is overtaking restraint',
        'status: partial | drift=runtime-alignment',
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
      status: 'partial',
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
      status: 'partial',
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

    expect((store as any).identityDriftGovernanceSummary).toEqual({
      status: 'grounded',
      governanceMode: 'bounded-growth',
      dominantDrift: null,
      lines: [
        'governance: bounded growth is preserving identity',
        'identity-boundary: trust can deepen without violating observe-first room',
        'identity-anchors: host-steadiness | observe-first room',
        'remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the same-her room',
        'trust-meaning: trust deepens through steadiness before closeness',
        'autobiographical-stability: 0.92 | trajectory=presence restraint',
      ],
    })
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
      status: 'partial',
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
      status: 'partial',
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
})
