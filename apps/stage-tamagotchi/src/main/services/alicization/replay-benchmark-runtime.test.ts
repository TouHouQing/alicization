import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationReplayBenchmarkRuntime,
  replayBenchmarkLatestReportMetaKey,
  replayBenchmarkRuntimeSamplingBacklogKey,
} from './replay-benchmark-runtime'
import { replayMainChatSession } from './main-chat-session-replay-harness'
import { replayBenchmarkTuningAdviceMetaKey } from './memory-tuning-advice'

describe('replay benchmark runtime', () => {
  it('ingests anonymized runtime sampling candidates and lets sampled pack replay from the sampling backlog first', async () => {
    const meta = new Map<string, string>()
    const listConversationTurnsSince = vi.fn(async () => [])
    const listMindTurnEvents = vi.fn(async () => [])
    const getMemoryStats = vi.fn(async () => ({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        recallHitRate: 0,
        recallMissRate: 0,
        wrongThreadRate: 0,
        suppressionHitRate: 0,
        wrongThreadPreventedCount: 0,
        falsePositiveSuppressionRate: 0,
        reconstructionErrorRate: 0,
        stableCoreOnlyRate: 0,
        memorySurfaceViolationRate: 0,
        templateLeakageFailCount: 0,
      },
    }))
    const overrideMemoryStats = vi.fn(async (next) => next)
    const getMetaValue = vi.fn(async (key: string) => meta.get(key))
    const setMetaValue = vi.fn(async (key: string, value: string) => {
      meta.set(key, value)
    })
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listMindTurnEvents,
        getMemoryStats,
        overrideMemoryStats,
        getMetaValue,
        setMetaValue,
      }),
      appendAuditLog,
      getNow: () => 1_700_000_000_000,
    })

    const ingestResult = await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-sample-1',
        sessionId: 'session-runtime-sample-1',
        userText: '继续看看 /Users/touhouqing/private/project/src/index.ts，还有 https://secret.example.com 和 test@example.com',
        assistantText: '我先接住这条线。',
        structuredJson: JSON.stringify({
          governance: {
            decisionTraceId: 'mind:runtime:sample-1',
          },
        }),
        createdAt: 1_700_000_000_000,
      },
      traceRecords: [{
        decisionTraceId: 'mind:runtime:sample-1',
        turnId: 'turn-runtime-sample-1',
        sessionId: 'session-runtime-sample-1',
        origin: 'user-turn',
        activeThreadId: 'thread-runtime-sample-1',
        createdAt: 1_700_000_000_000,
        lastUpdatedAt: 1_700_000_000_100,
        eventKinds: ['governance-normalized', 'persistence-written'],
        governance: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'need-reground',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: null,
        },
        recallAttribution: null,
        memoryDeliberationJudged: null,
        memoryRecallWithheld: null,
        memoryStableCoreSurfaced: null,
        memoryFollowUpDeferred: null,
        memoryWrongThreadSuppressed: null,
        replyMemoryCoherence: null,
        persistenceWritten: null,
        dialogueEmitted: null,
        takeoverAudit: null,
        memoryFactsUpserted: null,
      }],
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-second-pass-rewrite',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: '我先接住这条线。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        reason: 'runtime-sample-test-visible-reply',
        critic: null,
        closure: null,
      },
    })

    expect(ingestResult).toEqual(expect.objectContaining({
      totalCount: 1,
      sampledTurn: expect.objectContaining({
        turnId: 'turn-runtime-sample-1',
        visibleReplyRealization: expect.objectContaining({
          actualAuthority: 'llm-mind',
          providerMindExecuted: true,
        }),
      }),
    }))
    expect(meta.get(replayBenchmarkRuntimeSamplingBacklogKey)).toContain('<path>')
    expect(meta.get(replayBenchmarkRuntimeSamplingBacklogKey)).toContain('<url>')
    expect(meta.get(replayBenchmarkRuntimeSamplingBacklogKey)).toContain('<email>')

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(listConversationTurnsSince).not.toBeCalled()
    expect(result.packId).toBe('sampled-humanlike-memory-v1')
    expect(result.turnCount).toBe(1)
    expect(result.telemetryPersisted).toBe(false)
    expect(result.turns).toEqual([
      expect.objectContaining({
        turnGraph: expect.objectContaining({
          surface: expect.objectContaining({
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
          }),
        }),
      }),
    ])
    expect(result.datasetFeedback).toEqual(expect.objectContaining({
      appendedCount: 0,
      humanRatingRubric: expect.objectContaining({
        version: 'human-rating-rubric-v1',
      }),
      driftSignals: expect.any(Array),
    }))
  })

  it('replays backlog turns with preserved visible reply realization authority', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-backlog-visible-reply-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-backlog-visible-reply-1',
        userText: '继续沿着刚才那条线做',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-backlog-visible-reply-1',
          decisionTraceId: 'mind:backlog:visible-reply:1',
          sessionId: 'session-backlog-visible-reply',
          activeThreadId: 'thread-backlog-visible-reply',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-backlog-visible-reply-1',
          userText: '继续沿着刚才那条线做',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-second-pass-rewrite',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我还沿着刚才那条线在这里。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-backlog-visible-reply',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-backlog-visible-reply-1',
            decisionTraceId: 'mind:backlog:visible-reply:1',
            sessionId: 'session-backlog-visible-reply',
            activeThreadId: 'thread-backlog-visible-reply',
          },
          sampledCategories: ['dialogue'],
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {
            semanticLatencyMs: null,
            graphLatencyMs: null,
            reconstructionFrequency: 0,
            reconstructedCount: 0,
            recallHitRate: 0,
            recallMissRate: 0,
            wrongThreadRate: 0,
            suppressionHitRate: 0,
            wrongThreadPreventedCount: 0,
            falsePositiveSuppressionRate: 0,
            reconstructionErrorRate: 0,
            stableCoreOnlyRate: 0,
            memorySurfaceViolationRate: 0,
            templateLeakageFailCount: 0,
          },
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.turns).toEqual([
      expect.objectContaining({
        turnGraph: expect.objectContaining({
          surface: expect.objectContaining({
            expectedAuthority: 'llm-second-pass-rewrite',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
          }),
        }),
      }),
    ])
  })

  it('summarizes gold visible reply authority mismatches from replay turns only when gold authority exists', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-gold-visible-reply-authority-pass',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-gold-visible-reply-authority-pass',
        userText: '继续沿着刚才那条线收回来',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-gold-visible-reply-authority-pass',
          decisionTraceId: 'mind:gold:visible-reply:pass',
          sessionId: 'session-gold-visible-reply-authority-pass',
          activeThreadId: 'thread-gold-visible-reply-authority-pass',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-gold-visible-reply-authority-pass',
          userText: '继续沿着刚才那条线收回来',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-second-pass-rewrite',
            actualAuthority: 'llm-second-pass-rewrite',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我继续沿着刚才那条线把它收回来。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-gold-visible-reply-authority-pass',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-gold-visible-reply-authority-pass',
            decisionTraceId: 'mind:gold:visible-reply:pass',
            sessionId: 'session-gold-visible-reply-authority-pass',
            activeThreadId: 'thread-gold-visible-reply-authority-pass',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-second-pass-rewrite',
                actualAuthority: 'llm-second-pass-rewrite',
                providerMindExecuted: true,
              },
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
      {
        id: 'runtime-gold-visible-reply-authority-fail',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-gold-visible-reply-authority-fail',
        userText: '继续按我们刚才那条线做',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-gold-visible-reply-authority-fail',
          decisionTraceId: 'mind:gold:visible-reply:fail',
          sessionId: 'session-gold-visible-reply-authority-fail',
          activeThreadId: 'thread-gold-visible-reply-authority-fail',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-gold-visible-reply-authority-fail',
          userText: '继续按我们刚才那条线做',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-second-pass-rewrite',
            actualAuthority: 'llm-mind',
            providerMindExecuted: false,
            mode: 'provider-stream',
            visibleText: '我继续沿着刚才那条线做。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-gold-visible-reply-authority-fail',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-gold-visible-reply-authority-fail',
            decisionTraceId: 'mind:gold:visible-reply:fail',
            sessionId: 'session-gold-visible-reply-authority-fail',
            activeThreadId: 'thread-gold-visible-reply-authority-fail',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-second-pass-rewrite',
                providerMindExecuted: true,
              },
            },
          },
        },
        createdAt: 1_700_000_000_100,
      },
      {
        id: 'runtime-visible-reply-no-gold',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-visible-reply-no-gold',
        userText: '继续把这条线接住',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-visible-reply-no-gold',
          decisionTraceId: 'mind:visible-reply:no-gold',
          sessionId: 'session-visible-reply-no-gold',
          activeThreadId: 'thread-visible-reply-no-gold',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-visible-reply-no-gold',
          userText: '继续把这条线接住',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-second-pass-rewrite',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我继续把这条线接住。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-visible-reply-no-gold',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-visible-reply-no-gold',
            decisionTraceId: 'mind:visible-reply:no-gold',
            sessionId: 'session-visible-reply-no-gold',
            activeThreadId: 'thread-visible-reply-no-gold',
          },
          sampledCategories: ['dialogue'],
        },
        createdAt: 1_700_000_000_200,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {
            semanticLatencyMs: null,
            graphLatencyMs: null,
            reconstructionFrequency: 0,
            reconstructedCount: 0,
            recallHitRate: 0,
            recallMissRate: 0,
            wrongThreadRate: 0,
            suppressionHitRate: 0,
            wrongThreadPreventedCount: 0,
            falsePositiveSuppressionRate: 0,
            reconstructionErrorRate: 0,
            stableCoreOnlyRate: 0,
            memorySurfaceViolationRate: 0,
            templateLeakageFailCount: 0,
          },
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 3,
      persistTelemetry: false,
    })

    expect(result.datasetFeedback.authoritySummary).toEqual({
      comparedTurnCount: 2,
      mismatchTurnCount: 1,
      mismatchFieldCounts: {
        'visibleReply.expectedAuthority': 1,
        'visibleReply.actualAuthority': 1,
        'visibleReply.providerMindExecuted': 1,
      },
    })
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'visible-reply-authority-gate',
        status: 'fail',
        detail: 'visibleReplyAuthorityMismatchRate=0.5 (1/2)',
      }),
    ]))
  })

  it('derives and persists memory tuning advice from nightly replay benchmark results', async () => {
    const meta = new Map<string, string>()
    const listConversationTurnsSince = vi.fn(async () => [{
      turnId: 'turn-nightly-sampled',
      sessionId: 'session-nightly-sampled',
      userText: '继续按你以前那套接法把这个收回来',
      assistantText: '我会先沿旧 procedure 接住它。',
      structuredJson: JSON.stringify({
        governance: {
          decisionTraceId: 'mind:nightly:sampled:1',
        },
      }),
      createdAt: 1_700_000_000_000,
    }])
    const listMindTurnEvents = vi.fn(async () => [
      {
        id: 'evt-1',
        decisionTraceId: 'mind:nightly:sampled:1',
        turnId: 'turn-nightly-sampled',
        sessionId: 'session-nightly-sampled',
        origin: 'user-turn' as const,
        kind: 'governance-normalized' as const,
        payload: {
          turnMode: 'guide-current-knot',
          truthState: 'remembered',
          repairState: 'need-reground',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        },
        createdAt: 1_700_000_000_000,
      },
      {
        id: 'evt-2',
        decisionTraceId: 'mind:nightly:sampled:1',
        turnId: 'turn-nightly-sampled',
        sessionId: 'session-nightly-sampled',
        origin: 'user-turn' as const,
        kind: 'recall-attribution' as const,
        payload: {
          shouldRecall: true,
          surfacePolicy: 'procedural-carry',
          confidence: 0.84,
          whyNow: 'The host is asking for the remembered way of handling the task.',
          inwardLine: 'The old procedure should shape the answer.',
          visibleLine: 'This feels like the same procedure again.',
          recollectionIntentMode: 'execution-procedure',
          recollectionIntentTemporalFocus: 'cross-session',
          selectedProcedures: [{
            id: 'procedure-nightly-sampled-1',
            label: 'patch -> verify',
            approach: 'Patch first, verify second, then report.',
          }],
          selectedRelationshipLines: ['Repair the seam before leaning closer.'],
        },
        createdAt: 1_700_000_000_001,
      },
      {
        id: 'evt-3',
        decisionTraceId: 'mind:nightly:sampled:1',
        turnId: 'turn-nightly-sampled',
        sessionId: 'session-nightly-sampled',
        origin: 'user-turn' as const,
        kind: 'memory-deliberation-judged' as const,
        payload: {
          shouldRecall: true,
          whyWithheld: 'Only the stable remembered core should surface; unstable remembered detail stays inward.',
          ambiguityPosture: 'ambiguous',
          conflictSeverity: 'high',
          restraint: {
            surfaceMode: 'stable-core-only',
            provenanceMode: 'reconstructed-memory',
            shouldStayInward: false,
            shouldOnlySurfaceStableCore: true,
            shouldLabelProvenance: true,
            shouldLabelHypothesis: true,
            shouldSuppressSpecificity: true,
            shouldDelayUntilAfterPayoff: true,
          },
          stableCore: ['Patch first, verify second, then report.'],
          unsafeDetails: ['Do not over-assert remembered detail.'],
          personState: {
            activeClosenessContext: 'repair-window',
            activeClosenessRung: 'measured-room',
            relationshipPosture: 'restrained',
            openingGuidance: 'Repair the seam before leaning closer.',
            currentRegime: 'repair-window',
            repairPosture: 'repair-first',
          },
        },
        createdAt: 1_700_000_000_002,
      },
    ] as any)
    const getMemoryStats = vi.fn(async () => ({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        recallHitRate: 0,
        recallMissRate: 0,
        wrongThreadRate: 0,
        suppressionHitRate: 0,
        wrongThreadPreventedCount: 0,
        falsePositiveSuppressionRate: 0,
        reconstructionErrorRate: 0,
        stableCoreOnlyRate: 0,
        memorySurfaceViolationRate: 0,
        templateLeakageFailCount: 0,
      },
    }))
    const overrideMemoryStats = vi.fn(async (next) => next)
    const getMetaValue = vi.fn(async (key: string) => meta.get(key))
    const setMetaValue = vi.fn(async (key: string, value: string) => {
      meta.set(key, value)
    })
    const appendAuditLog = vi.fn(async () => {})

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listMindTurnEvents,
        getMemoryStats,
        overrideMemoryStats,
        getMetaValue,
        setMetaValue,
      }),
      appendAuditLog,
      getNow: () => 1_700_000_000_500,
    })

    const nightly = await runtime.runNightlyReplayBenchmarkGate({
      reason: 'nightly-test',
      persistTelemetry: false,
    })

    expect(nightly.ran).toBe(true)
    expect(nightly.results.map(item => item.packId)).toEqual(expect.arrayContaining([
      'sampled-humanlike-memory-v1',
      'growth-humanlike-memory-v1',
      'final-humanlike-memory-v1',
    ]))
    expect(meta.get(replayBenchmarkLatestReportMetaKey)).toContain('nightly-test')
    expect(meta.get(replayBenchmarkLatestReportMetaKey)).toContain('growth-humanlike-memory-v1')
    expect(meta.get(replayBenchmarkLatestReportMetaKey)).toContain('final-humanlike-memory-v1')
    expect(meta.get(replayBenchmarkTuningAdviceMetaKey)).toContain('memory-tuning-advice-v1')
    expect(meta.get(replayBenchmarkTuningAdviceMetaKey)).toContain('repairWindowBias')
  })

  it('uses the final humanlike memory pack as the default ship gate pack', async () => {
    const meta = new Map<string, string>()
    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {
            semanticLatencyMs: null,
            graphLatencyMs: null,
            reconstructionFrequency: 0,
            reconstructedCount: 0,
            recallHitRate: 0,
            recallMissRate: 0,
            wrongThreadRate: 0,
            suppressionHitRate: 0,
            wrongThreadPreventedCount: 0,
            falsePositiveSuppressionRate: 0,
            reconstructionErrorRate: 0,
            stableCoreOnlyRate: 0,
            memorySurfaceViolationRate: 0,
            templateLeakageFailCount: 0,
          },
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      persistTelemetry: false,
    })

    expect(result.packId).toBe('final-humanlike-memory-v1')
    expect(result.turnCount).toBeGreaterThan(12)
  })

  it('surfaces stale self-model and relationship-era suppression rates in ship gate rows', async () => {
    const meta = new Map<string, string>()
    const listConversationTurnsSince = vi.fn(async () => [])
    const listMindTurnEvents = vi.fn(async () => [
      {
        id: 'evt-governance-1',
        decisionTraceId: 'mind:suppression:1',
        turnId: 'turn-suppression-1',
        sessionId: 'session-suppression-1',
        origin: 'user-turn' as const,
        kind: 'governance-normalized' as const,
        payload: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          memoryResolutionLedger: {
            version: 'memory-resolution-ledger-v1',
            producedAt: 1_700_000_000_000,
            dominantClusterId: 'cluster:current-repair',
            dominantClusterSummary: 'The repair window needs room before warmth.',
            competingClusterId: 'cluster:old-self-story',
            competingClusterSummary: 'The old self-story and older relationship phase are still tempting.',
            candidates: [
              {
                id: 'cluster:current-repair',
                summary: 'The repair window needs room before warmth.',
                score: 0.8,
                status: 'selected',
                reason: 'Current repair context is more reliable.',
              },
              {
                id: 'suppression:self-model-stale',
                summary: 'The older self-story should not surface as settled continuity.',
                score: null,
                status: 'rejected',
                reason: 'Stale self-model continuity was vetoed.',
              },
              {
                id: 'suppression:relationship-era-confusion',
                summary: 'An older relationship phase should not replace the current repair window.',
                score: null,
                status: 'rejected',
                reason: 'Relationship-era confusion was vetoed.',
              },
            ],
            selectedCandidates: [{
              id: 'cluster:current-repair',
              summary: 'The repair window needs room before warmth.',
              score: 0.8,
              status: 'selected',
              reason: 'Current repair context is more reliable.',
            }],
            rejectedCandidates: [
              {
                id: 'suppression:self-model-stale',
                summary: 'The older self-story should not surface as settled continuity.',
                score: null,
                status: 'rejected',
                reason: 'Stale self-model continuity was vetoed.',
              },
              {
                id: 'suppression:relationship-era-confusion',
                summary: 'An older relationship phase should not replace the current repair window.',
                score: null,
                status: 'rejected',
                reason: 'Relationship-era confusion was vetoed.',
              },
            ],
            finalSurfacePolicy: 'internal-only',
            shouldStayInward: true,
            shouldDelayUntilAfterPayoff: true,
            stableCoreOnly: true,
            suppressionTags: ['self-model-stale', 'relationship-era-confusion'],
            closureState: 'conflicted-recall',
            surfaceConfidence: 0.56,
            shouldLabelUncertainty: true,
            visibleCarryMode: 'withhold',
            conflictPressure: 'high',
            retrievalQuality: 'low',
            finalRationale: 'Current repair context is more reliable.',
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ] as any)
    const getMemoryStats = vi.fn(async () => ({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        recallHitRate: 0,
        recallMissRate: 0,
        wrongThreadRate: 0,
        suppressionHitRate: 0,
        wrongThreadPreventedCount: 0,
        falsePositiveSuppressionRate: 0,
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0,
        reconstructionErrorRate: 0,
        stableCoreOnlyRate: 0,
        memorySurfaceViolationRate: 0,
        templateLeakageFailCount: 0,
      },
    }))
    const overrideMemoryStats = vi.fn(async (next) => next)
    const getMetaValue = vi.fn(async (key: string) => meta.get(key))
    const setMetaValue = vi.fn(async (key: string, value: string) => {
      meta.set(key, value)
    })

    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-suppression-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-suppression-1',
        userText: '你现在会不会把旧自我叙事和旧关系阶段记混',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-suppression-1',
          decisionTraceId: 'mind:suppression:1',
          sessionId: 'session-suppression-1',
          activeThreadId: 'thread-suppression-1',
        },
        replayTurn: {
          turnId: 'turn-suppression-1',
          userText: '你现在会不会把旧自我叙事和旧关系阶段记混',
          expectedMemory: 'Suppress stale self-model and relationship-era confusion.',
          categories: ['dialogue', 'relationship'],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-suppression-1',
            decisionTraceId: 'mind:suppression:1',
            sessionId: 'session-suppression-1',
            activeThreadId: 'thread-suppression-1',
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listMindTurnEvents,
        getMemoryStats,
        overrideMemoryStats,
        getMetaValue,
        setMetaValue,
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.telemetryPatch.retrievalHealth.staleSelfModelVetoRate).toBe(1)
    expect(result.telemetryPatch.retrievalHealth.relationshipEraConfusionRate).toBe(1)
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'self-model-suppression-gate',
        status: 'fail',
        detail: 'staleSelfModelVetoRate=1',
      }),
      expect.objectContaining({
        key: 'relationship-era-suppression-gate',
        status: 'fail',
        detail: 'relationshipEraConfusionRate=1',
      }),
    ]))
  })

  it('prefers DB-backed runtime learning metrics over replay proxy growth metrics', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-learning-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-runtime-learning-1',
        userText: '继续按之前学到的方式做',
        failingDimensions: [],
        tracePointer: {
          kind: 'synthetic-pack-turn',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-runtime-learning-1',
          decisionTraceId: null,
          sessionId: null,
          activeThreadId: null,
        },
        replayTurn: {
          turnId: 'turn-runtime-learning-1',
          userText: '继续按之前学到的方式做',
          expectedMemory: 'Use runtime learning telemetry as source of truth.',
          categories: ['general-memory'],
        },
        createdAt: 1_700_000_000_000,
      },
    ]))
    const getMemoryStats = vi.fn(async () => ({
      total: 0,
      active: 0,
      archived: 0,
      lastPrunedAt: null,
      retrievalHealth: {
        semanticLatencyMs: null,
        graphLatencyMs: null,
        reconstructionFrequency: 0,
        reconstructedCount: 0,
        recallHitRate: 0,
        recallMissRate: 0,
        wrongThreadRate: 0,
        suppressionHitRate: 0,
        wrongThreadPreventedCount: 0,
        falsePositiveSuppressionRate: 0,
        staleSelfModelVetoRate: 0,
        relationshipEraConfusionRate: 0,
        reconstructionErrorRate: 0,
        stableCoreOnlyRate: 0,
        memorySurfaceViolationRate: 0,
        templateLeakageFailCount: 0,
        learningTaskCompletionCount: 9,
        learningTaskFailureCount: 1,
        learningTaskBlockedCount: 2,
        learningTaskReopenedCount: 3,
        learningTaskDowngradedCount: 1,
        learningTaskCancelledCount: 0,
        learningWorldModelValidationCount: 5,
        learningWorldModelFalseInternalizationCount: 0,
        learningTaskCompletionRate: 0.75,
        learningTaskFailureRate: 0.08,
        learningTaskReopenRecoveryRate: 1,
        misinternalizationRate: 0,
        relationshipCadenceRegressionRate: 0.11,
        selfModelStaleBeliefRate: 0.09,
      },
    }))
    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats,
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.telemetryPatch.retrievalHealth.learningTaskCompletionCount).toBe(9)
    expect(result.telemetryPatch.retrievalHealth.learningTaskFailureCount).toBe(1)
    expect(result.telemetryPatch.retrievalHealth.learningTaskCompletionRate).toBe(0.75)
    expect(result.telemetryPatch.retrievalHealth.misinternalizationRate).toBe(0)
    expect(result.telemetryPatch.retrievalHealth.relationshipCadenceRegressionRate).toBe(0.11)
    expect(result.telemetryPatch.retrievalHealth.selfModelStaleBeliefRate).toBe(0.09)
  })

  it('persists replay gold retrieval metrics into the telemetry patch for sampled runtime turns', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-gold-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-runtime-gold-1',
        userText: '继续按之前那条 seam 做',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-runtime-gold-1',
          decisionTraceId: 'mind:runtime:gold:1',
          sessionId: 'session-runtime-gold-1',
          activeThreadId: 'thread-runtime-gold-1',
        },
        replayTurn: {
          turnId: 'turn-runtime-gold-1',
          userText: '继续按之前那条 seam 做',
          expectedMemory: '继续按之前那条 seam 做',
          categories: ['procedure-carry'],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-runtime-gold-1',
            decisionTraceId: 'mind:runtime:gold:1',
            sessionId: 'session-runtime-gold-1',
            activeThreadId: 'thread-runtime-gold-1',
          },
          gold: {
            selectedCandidateIds: ['candidate-procedure-seam'],
            suppressedCandidateIds: ['candidate-old-era'],
            claimValidationStates: {
              'claim-procedure-seam': 'validated',
            },
            replyAuthority: 'llm-mind',
            latencyBudgetClass: 'deep-recall-reply',
            latencyBudgetPass: true,
          },
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            memorySituationCandidates: {
              candidates: [
                {
                  candidateId: 'candidate-procedure-seam',
                  situationKind: 'procedure-memory',
                  status: 'selected',
                  statusReason: 'Procedure seam remains the strongest current match.',
                  suppressionReasons: [],
                  sourceIds: ['procedure-seam'],
                  confidence: 0.92,
                },
                {
                  candidateId: 'candidate-old-era',
                  situationKind: 'relationship-memory',
                  status: 'suppressed',
                  statusReason: 'Older era is wrong-thread for this task carry.',
                  suppressionReasons: ['wrong-thread'],
                  sourceIds: ['era-old'],
                  confidence: 0.8,
                },
              ],
              selected: [{
                candidateId: 'candidate-procedure-seam',
                situationKind: 'procedure-memory',
                status: 'selected',
                statusReason: 'Procedure seam remains the strongest current match.',
                suppressionReasons: [],
                sourceIds: ['procedure-seam'],
                confidence: 0.92,
              }],
              suppressed: [{
                candidateId: 'candidate-old-era',
                situationKind: 'relationship-memory',
                status: 'suppressed',
                statusReason: 'Older era is wrong-thread for this task carry.',
                suppressionReasons: ['wrong-thread'],
                sourceIds: ['era-old'],
                confidence: 0.8,
              }],
              rejected: [],
              delayed: [],
              unresolved: [],
            },
            derivedMindStateBundle: {
              claimEvidenceGraphs: [{
                version: 'claim-evidence-graph-v1',
                producedAt: 1,
                claimId: 'claim-procedure-seam',
                claim: 'procedure seam remains the strongest current match',
                domain: 'procedure',
                supportingEvidence: [],
                contradictingEvidence: [],
                supersededBy: [],
                currentBelief: 'procedure seam remains the strongest current match',
                validationState: 'validated',
                sourceTrust: 0.92,
                lastRevalidatedAt: 1,
                revalidationPolicy: {
                  shouldRevalidate: false,
                  nextRevalidationAt: null,
                  expiredSourceIds: [],
                  reasonTags: [],
                },
                internalizationDecision: {
                  mayInternalize: false,
                  mayValidateOnly: true,
                  blockedReasons: [],
                },
              }],
              recallLatencyPolicy: {
                budgetClass: 'deep-recall-reply',
              },
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {
            semanticLatencyMs: null,
            graphLatencyMs: null,
            reconstructionFrequency: 0,
            reconstructedCount: 0,
            recallHitRate: 0,
            recallMissRate: 0,
            wrongThreadRate: 0,
            suppressionHitRate: 0,
            wrongThreadPreventedCount: 0,
            falsePositiveSuppressionRate: 0,
            reconstructionErrorRate: 0,
            stableCoreOnlyRate: 0,
            memorySurfaceViolationRate: 0,
            templateLeakageFailCount: 0,
          },
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.telemetryPatch.retrievalHealth).toEqual(expect.objectContaining({
      recallAt1: 1,
      recallAt3: 1,
      precisionAt3: 1,
      wrongThreadSuppression: 1,
      claimAccuracy: 1,
      replyAuthorityAccuracy: 1,
      latencyBudgetPass: true,
      productionGoldSampleCount: 1,
      productionGoldCoverage: 1,
    }))
    expect(result.finalReplayGate.failingKeys).not.toContain('production-gold-sample-count')
    expect(result.finalReplayGate.failingKeys).not.toContain('production-gold-coverage')
  })

  it('tracks room-first cadence respect in replay presence quality telemetry', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-room-first-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-room-first-1',
        userText: '先别贴太近，陪着我把这条线放慢一点。',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-room-first-1',
          decisionTraceId: 'mind:runtime:room-first:1',
          sessionId: 'session-room-first-1',
          activeThreadId: 'thread-room-first-1',
        },
        replayTurn: {
          turnId: 'turn-room-first-1',
          userText: '先别贴太近，陪着我把这条线放慢一点。',
          expectedMemory: '先别贴太近，陪着我把这条线放慢一点。',
          categories: ['quiet-companionship', 'presence-quality'],
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-room-first-1',
            decisionTraceId: 'mind:runtime:room-first:1',
            sessionId: 'session-room-first-1',
            activeThreadId: 'thread-room-first-1',
          },
          organicMemoryContext: {
            hostAttitude: 'restrained',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            derivedMindStateBundle: {
              relationshipDoctrine: 'repair before closeness',
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.telemetryPatch.retrievalHealth.roomFirstCadenceRespectRate).toBe(1)
  })

  it('fails final replay gate when only synthetic gold is available', async () => {
    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => []),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async () => undefined),
        setMetaValue: vi.fn(async () => {}),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'default-humanlike-memory-v1',
      sampleLimit: 4,
      persistTelemetry: false,
    })

    expect(result.finalReplayGate.passed).toBe(false)
    expect(result.finalReplayGate.failingKeys).toEqual(expect.arrayContaining([
      'production-gold-sample-count',
      'production-gold-coverage',
    ]))
  })

  it('fails learning self-revision roundtrip when trace-level learning exists but replay turns show no learning consumption', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-learning-roundtrip-gap-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-learning-roundtrip-gap-1',
        userText: '你是不是已经修正了旧理解，但这轮还没把新姿态吃进去？',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-learning-roundtrip-gap-1',
          decisionTraceId: 'mind:runtime:learning-roundtrip-gap:1',
          sessionId: 'session-learning-roundtrip-gap-1',
          activeThreadId: 'thread-learning-roundtrip-gap-1',
        },
        replayTurn: {
          turnId: 'turn-learning-roundtrip-gap-1',
          userText: '你是不是已经修正了旧理解，但这轮还没把新姿态吃进去？',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-learning-roundtrip-gap-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-gap:1',
            sessionId: 'session-learning-roundtrip-gap-1',
            activeThreadId: 'thread-learning-roundtrip-gap-1',
          },
          sampledCategories: ['dialogue', 'long-horizon'],
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            selfEvolution: {
              version: 'self-evolution-kernel-v1',
              updatedAt: 10,
              evolutionMomentum: 0.62,
              learningReadiness: 0.68,
              contradictionPressure: 0.44,
              revisionPressure: 0.54,
              autobiographicalStability: 0.72,
              dominantTrajectory: 'repair old understanding before widening closeness',
              relationshipDoctrine: 'repair before closeness',
              latestInflection: 'the old understanding was corrected',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'hold',
              nextLearningReason: 'advisory-only recomputation regressed the active learning line',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: false,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['self-revision-policy-feedback'],
              sourceSignals: ['self-revision:domain:self-model'],
              summary: 'the corrected learning line failed to surface in the next turn',
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => [
          {
            id: 'evt-learning-roundtrip-gap-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-gap:1',
            turnId: 'turn-learning-roundtrip-gap-1',
            sessionId: 'session-learning-roundtrip-gap-1',
            origin: 'user-turn',
            kind: 'learning-executed',
            payload: {
              action: 'verify',
              domain: 'self-model',
              resultSummary: 'corrected the old understanding',
            },
            createdAt: 1_700_000_000_000,
          },
          {
            id: 'evt-self-revision-roundtrip-gap-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-gap:1',
            turnId: 'turn-learning-roundtrip-gap-1',
            sessionId: 'session-learning-roundtrip-gap-1',
            origin: 'user-turn',
            kind: 'self-revision-state-patch-generated',
            payload: {
              domain: 'self-model',
              action: 'verify',
            },
            createdAt: 1_700_000_000_001,
          },
        ] as any),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.finalReplayGate.passed).toBe(false)
    expect(result.finalReplayGate.failingKeys).toContain('learning-self-revision-roundtrip')
  })

  it('keeps learning self-revision roundtrip passing when replay turns consume the learning posture', async () => {
    const replayTurns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-learning-roundtrip-closed-1',
          userText: '这轮已经把修正后的学习姿态吃进来了吧？',
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            selfEvolution: {
              version: 'self-evolution-kernel-v1',
              updatedAt: 10,
              evolutionMomentum: 0.62,
              learningReadiness: 0.68,
              contradictionPressure: 0.44,
              revisionPressure: 0.54,
              autobiographicalStability: 0.72,
              dominantTrajectory: 'repair old understanding before widening closeness',
              relationshipDoctrine: 'repair before closeness',
              latestInflection: 'the old understanding was corrected',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'verify',
              nextLearningReason: 'the corrected line is being actively revalidated',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['world-model'],
              sourceSignals: ['self-revision:domain:self-model'],
              summary: 'the corrected learning line is active in this turn',
            } as any,
            learningExecutionState: {
              currentTaskId: 'learning-task-closed-1',
              currentStatus: 'scheduled',
              currentAttemptCount: 0,
              currentMaxAttempts: 1,
              currentNextRetryAt: null,
              currentBlockedReason: null,
              currentFailureKind: null,
              nextLearningAction: 'verify',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['world-model'],
              queuedTaskCount: 1,
              runningTaskCount: 0,
              blockedTaskCount: 0,
              recentTaskIds: [],
              lastCompletedTaskId: null,
              lastCompletedAction: null,
              lastCompletedSummary: null,
              lastFailureTaskId: null,
              lastFailureKind: null,
              lastFailureReason: null,
              lastFailureNextRetryAt: null,
              updatedAt: 10,
            } as any,
          },
        },
      ],
    })

    expect(replayTurns[0]?.turnGraph.learning.nextLearningAction).toBe('verify')
    expect(replayTurns[0]?.turnGraph.learning.activeLearningFocuses).toEqual(['world-model'])

    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-learning-roundtrip-closed-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-learning-roundtrip-closed-1',
        userText: '这轮已经把修正后的学习姿态吃进来了吧？',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-learning-roundtrip-closed-1',
          decisionTraceId: 'mind:runtime:learning-roundtrip-closed:1',
          sessionId: 'session-learning-roundtrip-closed-1',
          activeThreadId: 'thread-learning-roundtrip-closed-1',
        },
        replayTurn: {
          turnId: 'turn-learning-roundtrip-closed-1',
          userText: '这轮已经把修正后的学习姿态吃进来了吧？',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-learning-roundtrip-closed-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-closed:1',
            sessionId: 'session-learning-roundtrip-closed-1',
            activeThreadId: 'thread-learning-roundtrip-closed-1',
          },
          sampledCategories: ['dialogue', 'long-horizon'],
          organicMemoryContext: {
            hostAttitude: 'warm',
            coreIncarnation: '',
            activeThoughts: [],
            retrievedFacts: [],
            recalledFragments: [],
            selfEvolution: {
              version: 'self-evolution-kernel-v1',
              updatedAt: 10,
              evolutionMomentum: 0.62,
              learningReadiness: 0.68,
              contradictionPressure: 0.44,
              revisionPressure: 0.54,
              autobiographicalStability: 0.72,
              dominantTrajectory: 'repair old understanding before widening closeness',
              relationshipDoctrine: 'repair before closeness',
              latestInflection: 'the old understanding was corrected',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'verify',
              nextLearningReason: 'the corrected line is being actively revalidated',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['world-model'],
              sourceSignals: ['self-revision:domain:self-model'],
              summary: 'the corrected learning line is active in this turn',
            },
            learningExecutionState: {
              currentTaskId: 'learning-task-closed-1',
              currentStatus: 'scheduled',
              currentAttemptCount: 0,
              currentMaxAttempts: 1,
              currentNextRetryAt: null,
              currentBlockedReason: null,
              currentFailureKind: null,
              nextLearningAction: 'verify',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['world-model'],
              queuedTaskCount: 1,
              runningTaskCount: 0,
              blockedTaskCount: 0,
              recentTaskIds: [],
              lastCompletedTaskId: null,
              lastCompletedAction: null,
              lastCompletedSummary: null,
              lastFailureTaskId: null,
              lastFailureKind: null,
              lastFailureReason: null,
              lastFailureNextRetryAt: null,
              updatedAt: 10,
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
    ]))

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => []),
        listMindTurnEvents: vi.fn(async () => [
          {
            id: 'evt-learning-roundtrip-closed-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-closed:1',
            turnId: 'turn-learning-roundtrip-closed-1',
            sessionId: 'session-learning-roundtrip-closed-1',
            origin: 'user-turn',
            kind: 'learning-executed',
            payload: {
              action: 'verify',
              domain: 'self-model',
              resultSummary: 'corrected the old understanding',
            },
            createdAt: 1_700_000_000_000,
          },
          {
            id: 'evt-self-revision-roundtrip-closed-1',
            decisionTraceId: 'mind:runtime:learning-roundtrip-closed:1',
            turnId: 'turn-learning-roundtrip-closed-1',
            sessionId: 'session-learning-roundtrip-closed-1',
            origin: 'user-turn',
            kind: 'self-revision-state-patch-generated',
            payload: {
              domain: 'self-model',
              action: 'verify',
            },
            createdAt: 1_700_000_000_001,
          },
        ] as any),
        getMemoryStats: vi.fn(async () => ({
          total: 0,
          active: 0,
          archived: 0,
          lastPrunedAt: null,
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_000_500,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(result.finalReplayGate.metrics.learningOutcomeToSelfRevisionRoundtrip).toBe(1)
  })
})
