import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationReplayBenchmarkRuntime,
  replayBenchmarkLatestReportMetaKey,
  replayBenchmarkRuntimeSamplingBacklogKey,
} from './replay-benchmark-runtime'
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
    })

    expect(ingestResult).toEqual(expect.objectContaining({
      totalCount: 1,
      sampledTurn: expect.objectContaining({
        turnId: 'turn-runtime-sample-1',
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
    expect(result).toEqual(expect.objectContaining({
      packId: 'sampled-humanlike-memory-v1',
      turnCount: 1,
      telemetryPersisted: false,
      datasetFeedback: expect.objectContaining({
        appendedCount: 0,
        humanRatingRubric: expect.objectContaining({
          version: 'human-rating-rubric-v1',
        }),
        driftSignals: expect.any(Array),
      }),
    }))
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
    expect(meta.get(replayBenchmarkLatestReportMetaKey)).toContain('nightly-test')
    expect(meta.get(replayBenchmarkTuningAdviceMetaKey)).toContain('memory-tuning-advice-v1')
    expect(meta.get(replayBenchmarkTuningAdviceMetaKey)).toContain('repairWindowBias')
  })
})
