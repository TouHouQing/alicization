import { describe, expect, it, vi } from 'vitest'

import {
  replayMainChatSession,
} from './main-chat-session-replay-harness'
import { replayBenchmarkTuningAdviceMetaKey } from './memory-tuning-advice'
import {
  __alicizationTestOnly,
  createAlicizationReplayBenchmarkRuntime,
  replayBenchmarkDatasetBacklogKey,
  replayBenchmarkLatestReportMetaKey,
  replayBenchmarkRuntimeSamplingBacklogKey,
} from './replay-benchmark-runtime'

describe('replay benchmark runtime', { timeout: 60_000 }, () => {
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
    const overrideMemoryStats = vi.fn(async next => next)
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
        expectedAuthority: 'llm-mind',
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
    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      tracePointer?: {
        kind?: string
        decisionTraceId?: string | null
        sessionId?: string | null
      }
      replayTurn?: {
        tracePointer?: {
          kind?: string
          decisionTraceId?: string | null
          sessionId?: string | null
        }
      }
    }>
    expect(runtimeSamplingBacklog[0]?.tracePointer).toEqual(expect.objectContaining({
      kind: 'decision-trace',
      decisionTraceId: 'mind:runtime:sample-1',
      sessionId: 'session-runtime-sample-1',
    }))
    expect(runtimeSamplingBacklog[0]?.replayTurn?.tracePointer).toEqual(expect.objectContaining({
      kind: 'decision-trace',
      decisionTraceId: 'mind:runtime:sample-1',
      sessionId: 'session-runtime-sample-1',
    }))

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
      appendedCount: 1,
      runtimeSamplingEvidence: expect.objectContaining({
        source: 'runtime-sampling-backlog',
        status: 'insufficient',
        sampledTurnCount: 1,
        comparedSessionCount: 0,
        closedSessionCount: 0,
        sessionClosureRate: 0,
      }),
      humanRatingRubric: expect.objectContaining({
        version: 'human-rating-rubric-v1',
      }),
      driftSignals: expect.any(Array),
    }))
  })

  it('uses primary chat runtime samples without admitting execution-callback rows as dialogue proof', async () => {
    const meta = new Map<string, string>()
    const runtimeBacklogTurn = (input: {
      id: string
      turnId: string
      userText: string
      decisionTraceId: string
      createdAt: number
    }) => ({
      id: input.id,
      packId: 'sampled-humanlike-memory-v1',
      turnId: input.turnId,
      userText: input.userText,
      failingDimensions: [],
      tracePointer: {
        kind: 'decision-trace',
        packId: 'sampled-humanlike-memory-v1',
        turnId: input.turnId,
        decisionTraceId: input.decisionTraceId,
        sessionId: 'session-chat-main-sample',
        activeThreadId: 'thread-chat-main-sample',
      },
      replayTurn: {
        turnId: input.turnId,
        userText: input.userText,
        expectedMemory: '白樱线要保持在同一段真实桌面对话里。',
        categories: ['dialogue', 'long-horizon'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: input.turnId,
          decisionTraceId: input.decisionTraceId,
          sessionId: 'session-chat-main-sample',
          activeThreadId: 'thread-chat-main-sample',
        },
      },
      createdAt: input.createdAt,
    })
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      runtimeBacklogTurn({
        id: 'runtime-chat-main-sample-1',
        turnId: 'chat:session-chat-main-sample:turn-1',
        userText: '白樱线第一轮，只要记住它。',
        decisionTraceId: 'mind:chat-main-sample:1',
        createdAt: 1_700_000_000_000,
      }),
      {
        ...runtimeBacklogTurn({
          id: 'runtime-execution-callback-main-sample-pollution',
          turnId: 'execution-callback:default:thread:tool:abc:1700000000050',
          userText: 'execution callback carried the same memory line.',
          decisionTraceId: 'mind:chat-main-sample:execution-callback',
          createdAt: 1_700_000_000_050,
        }),
        sampledCategories: ['execution'],
      },
      runtimeBacklogTurn({
        id: 'runtime-chat-main-sample-2',
        turnId: 'chat:session-chat-main-sample:turn-2',
        userText: '白樱线第二轮，确认你还是沿着同一条关系线。',
        decisionTraceId: 'mind:chat-main-sample:2',
        createdAt: 1_700_000_000_100,
      }),
    ]))
    const conversationRows = [{
      turnId: 'chat:session-chat-main-sample:turn-3',
      sessionId: 'session-chat-main-sample',
      userText: '你还记得白樱线第三轮吗，把这段回忆自然接回来。',
      assistantText: '我还记得白樱线，并且会把它轻轻接回同一段对话。',
      structuredJson: JSON.stringify({
        governance: {
          decisionTraceId: 'mind:chat-main-sample:3',
        },
        reply: '我还记得白樱线，并且会把它轻轻接回同一段对话。',
      }),
      createdAt: 1_700_000_000_200,
    }]
    const listConversationTurnsSince = vi.fn(async () => conversationRows)
    const listMindTurnEvents = vi.fn(async (options: { turnId?: string | null }) => {
      if (options.turnId !== 'chat:session-chat-main-sample:turn-3')
        return []

      return [
        {
          id: 'evt-chat-main-sample-3-governance',
          decisionTraceId: 'mind:chat-main-sample:3',
          turnId: 'chat:session-chat-main-sample:turn-3',
          sessionId: 'session-chat-main-sample',
          origin: 'user-turn' as const,
          kind: 'governance-normalized' as const,
          payload: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
          createdAt: 1_700_000_000_200,
        },
        {
          id: 'evt-chat-main-sample-3-recall',
          decisionTraceId: 'mind:chat-main-sample:3',
          turnId: 'chat:session-chat-main-sample:turn-3',
          sessionId: 'session-chat-main-sample',
          origin: 'user-turn' as const,
          kind: 'recall-attribution' as const,
          payload: {
            shouldRecall: true,
            surfacePolicy: 'relationship-carry',
            confidence: 0.84,
            whyNow: '白樱线在同一段真实桌面对话里第三次返回。',
            inwardLine: '白樱线应该继续保持在同一段关系线里。',
            visibleLine: '我还记得白樱线，并且会把它轻轻接回来。',
            recollectionIntentMode: 'relationship-continuity',
            recollectionIntentTemporalFocus: 'cross-turn',
            selectedEpisodes: [{
              id: 'episode:white-sakura-main-sample-3',
              summary: '白樱线在同一段真实桌面对话里被连续提起。',
              provenance: 'observed',
            }],
            selectedRelationshipLines: ['白樱线保持在同一段真实桌面对话里。'],
          },
          createdAt: 1_700_000_000_201,
        },
      ]
    })

    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listMindTurnEvents,
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
      sampleLimit: 3,
      persistTelemetry: false,
    })

    expect(listConversationTurnsSince).toBeCalled()
    expect(result.datasetFeedback.runtimeSamplingEvidence).toEqual(expect.objectContaining({
      source: 'mixed-runtime-and-conversation',
      sampledTurnCount: 3,
    }))
    expect(result.turns.map(turn => turn.turnGraph.ids.turnId).sort()).toEqual([
      'chat:session-chat-main-sample:turn-1',
      'chat:session-chat-main-sample:turn-2',
      'chat:session-chat-main-sample:turn-3',
    ].sort())
    expect(result.turns.map(turn => turn.turnGraph.ids.turnId)).not.toContain(
      'execution-callback:default:thread:tool:abc:1700000000050',
    )
  })

  it('prefers the newest contiguous primary chat runtime sampling turns before older category-priority samples', () => {
    const runtimeBacklogTurn = (input: {
      id: string
      turnId: string
      sessionId: string
      createdAt: number
      sampledCategories?: string[]
      failingDimensions?: string[]
    }) => ({
      id: input.id,
      packId: 'sampled-humanlike-memory-v1',
      turnId: input.turnId,
      userText: `${input.turnId} user text`,
      failingDimensions: input.failingDimensions ?? [],
      tracePointer: {
        kind: 'decision-trace',
        packId: 'sampled-humanlike-memory-v1',
        turnId: input.turnId,
        decisionTraceId: `mind:${input.turnId}`,
        sessionId: input.sessionId,
        activeThreadId: null,
      },
      sampledCategories: input.sampledCategories ?? ['dialogue'],
      replayTurn: {
        turnId: input.turnId,
        userText: `${input.turnId} user text`,
        expectedMemory: `${input.turnId} memory`,
        categories: ['dialogue'],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: input.turnId,
          decisionTraceId: `mind:${input.turnId}`,
          sessionId: input.sessionId,
          activeThreadId: null,
        },
        sampledCategories: input.sampledCategories ?? ['dialogue'],
        createdAt: input.createdAt,
      },
      createdAt: input.createdAt,
    })

    const selected = __alicizationTestOnly.selectRuntimeSamplingPrimaryBacklogTurns({
      backlogEntries: [
        runtimeBacklogTurn({
          id: 'latest-3',
          turnId: 'chat:session-new:turn-3',
          sessionId: 'session-new',
          createdAt: 1_700_000_000_300,
          sampledCategories: ['dialogue'],
        }),
        runtimeBacklogTurn({
          id: 'latest-2',
          turnId: 'chat:session-new:turn-2',
          sessionId: 'session-new',
          createdAt: 1_700_000_000_200,
          sampledCategories: ['dialogue'],
        }),
        runtimeBacklogTurn({
          id: 'latest-1',
          turnId: 'chat:session-new:turn-1',
          sessionId: 'session-new',
          createdAt: 1_700_000_000_100,
          sampledCategories: ['dialogue'],
        }),
        runtimeBacklogTurn({
          id: 'older-category-priority',
          turnId: 'chat:session-new:older-category-priority',
          sessionId: 'session-new',
          createdAt: 1_699_999_999_000,
          sampledCategories: ['repair-arc'],
          failingDimensions: ['afterglowFalseCarryRate'],
        }),
        {
          ...runtimeBacklogTurn({
            id: 'execution-callback-pollution',
            turnId: 'execution-callback:default:thread:tool:abc:1700000000350',
            sessionId: 'session-new',
            createdAt: 1_700_000_000_350,
            sampledCategories: ['proactive'],
          }),
        },
      ],
      sampleLimit: 3,
    })

    expect(selected.map(turn => turn.turnId)).toEqual([
      'chat:session-new:turn-1',
      'chat:session-new:turn-2',
      'chat:session-new:turn-3',
    ])
  })

  it('loads trace events for backlog-only runtime sampling turns before scoring sampled proof', async () => {
    const meta = new Map<string, string>()
    const sessionId = 'session-runtime-backlog-traces'
    const runtimeBacklogTurn = (index: number) => {
      const turnId = `chat:${sessionId}:turn-${index}`
      const decisionTraceId = `mind:${sessionId}:${index}`
      return {
        id: `runtime-backlog-trace-${index}`,
        packId: 'sampled-humanlike-memory-v1',
        turnId,
        userText: `第 ${index} 轮继续验证真实 runtime backlog trace 不会丢失。`,
        assistantText: `第 ${index} 轮 trace 仍然绑定在同一个桌面生命闭环里。`,
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId,
          decisionTraceId,
          sessionId,
          activeThreadId: 'thread-runtime-backlog-traces',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId,
          userText: `第 ${index} 轮继续验证真实 runtime backlog trace 不会丢失。`,
          assistantText: `第 ${index} 轮 trace 仍然绑定在同一个桌面生命闭环里。`,
          expectedMemory: 'runtime backlog 采样必须回读对应 mind_turn_events 才能证明记忆闭环。',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId,
            decisionTraceId,
            sessionId,
            activeThreadId: 'thread-runtime-backlog-traces',
          },
          sampledCategories: ['dialogue'],
          createdAt: 1_700_000_001_000 + index * 100,
        },
        createdAt: 1_700_000_001_000 + index * 100,
      }
    }
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      runtimeBacklogTurn(1),
      runtimeBacklogTurn(2),
      runtimeBacklogTurn(3),
    ]))
    const listConversationTurnsSince = vi.fn(async () => [])
    const listMindTurnEvents = vi.fn(async (options: { turnId?: string | null }) => {
      const turnId = String(options.turnId ?? '')
      const index = Number(turnId.match(/turn-(\d+)$/u)?.[1] ?? '0')
      if (index === 0)
        return []

      return [{
        id: `evt-runtime-backlog-trace-${index}`,
        decisionTraceId: `mind:${sessionId}:${index}`,
        turnId,
        sessionId,
        origin: 'user-turn' as const,
        kind: 'governance-normalized' as const,
        payload: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        },
        createdAt: 1_700_000_001_000 + index * 100,
      }]
    })
    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince,
        listMindTurnEvents,
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
      getNow: () => 1_700_000_002_000,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 3,
      persistTelemetry: false,
    })

    expect(listConversationTurnsSince).not.toBeCalled()
    expect(listMindTurnEvents.mock.calls
      .map(([options]) => options.turnId)
      .filter(Boolean),
    ).toEqual([
      `chat:${sessionId}:turn-1`,
      `chat:${sessionId}:turn-2`,
      `chat:${sessionId}:turn-3`,
    ])
    expect(result.datasetFeedback.runtimeSamplingEvidence).toEqual(expect.objectContaining({
      source: 'runtime-sampling-backlog',
      sampledTurnCount: 3,
    }))
  })

  it('preserves trace-level memory identity in runtime sampling backlog entries', async () => {
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

    const ingestResult = await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-sampling-memory-identity',
        sessionId: 'session-runtime-sampling-memory-identity',
        userText: '继续验证运行时采样必须保留记忆身份，而不是只看候选 id 文本。',
        assistantText: '我会把这条记忆身份透传到采样回放。',
        structuredJson: JSON.stringify({
          reply: '我会把这条记忆身份透传到采样回放。',
        }),
        createdAt: 1_700_000_000_500,
      },
      traceRecords: [{
        decisionTraceId: 'mind:runtime-sampling-memory-identity',
        turnId: 'turn-runtime-sampling-memory-identity',
        sessionId: 'session-runtime-sampling-memory-identity',
        origin: 'user-turn',
        activeThreadId: 'thread-runtime-sampling-memory-identity',
        createdAt: 1_700_000_000_500,
        lastUpdatedAt: 1_700_000_000_600,
        eventKinds: ['governance-normalized', 'memory-closure-trace'],
        governance: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: {
            memory: {
              memoryClosureTrace: {
                authority: 'memory-os',
                whySurface: [{
                  summary: 'why recall surfaced now: runtime sampling must keep explicit memory identity.',
                }],
                selectedCandidateIds: ['candidate-noisy-order-1'],
                reasonTags: ['memory-closure-trace', 'memory-identity:cluster:runtime-sampling-memory-identity'],
                memoryIdentity: {
                  selectedCandidateIds: ['candidate-noisy-order-1'],
                  continuityKey: 'cluster:runtime-sampling-memory-identity',
                  reasonTags: ['memory-identity:cluster:runtime-sampling-memory-identity'],
                },
              },
            },
          } as any,
        },
      } as any],
    })

    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      replayTurn?: {
        structured?: {
          memoryClosureTrace?: {
            memoryIdentity?: {
              selectedCandidateIds?: string[] | null
              continuityKey?: string | null
              reasonTags?: string[] | null
            } | null
          } | null
        } | null
      } | null
    }>

    expect(ingestResult?.sampledTurn.structured?.memoryClosureTrace?.memoryIdentity?.continuityKey)
      .toBe('cluster:runtime-sampling-memory-identity')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.memoryIdentity)
      .toEqual({
        selectedCandidateIds: ['candidate-noisy-order-1'],
        continuityKey: 'cluster:runtime-sampling-memory-identity',
        reasonTags: ['memory-identity:cluster:runtime-sampling-memory-identity'],
      })
  })

  it('retains visible reply realization authority when replaying backlog turns', async () => {
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
            expectedAuthority: 'llm-mind',
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
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
          }),
        }),
      }),
    ])
  })

  it('canonicalizes proactive fallback sampling categories before writing runtime backlog entries', async () => {
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
      getNow: () => 1_700_000_000_900,
    })

    const ingestResult = await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-proactive-fallback-1',
        sessionId: 'session-runtime-proactive-fallback',
        userText: '如果这是你主动回来接我，就继续沿着同一条线说下去。',
        assistantText: '我还在沿着同一条线继续。',
        structuredJson: JSON.stringify({
          reply: '我还在沿着同一条线继续。',
        }),
        createdAt: 1_700_000_000_900,
      },
      traceRecords: [{
        decisionTraceId: 'mind:runtime:proactive:fallback-1',
        turnId: 'turn-runtime-proactive-fallback-1',
        sessionId: 'session-runtime-proactive-fallback',
        origin: ' SubConscious-Proactive ' as any,
        activeThreadId: 'thread-runtime-proactive-fallback',
        createdAt: 1_700_000_000_900,
        lastUpdatedAt: 1_700_000_000_980,
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
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: '我还在沿着同一条线继续。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        reason: 'runtime-sample-proactive-fallback',
        critic: null,
        closure: null,
      },
    })

    expect(ingestResult?.sampledTurn.sampledCategories).toEqual(['proactive', 'repair'])
    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      sampledCategories?: string[]
      replayTurn?: {
        sampledCategories?: string[]
      }
    }>
    expect(runtimeSamplingBacklog[0]?.sampledCategories).toEqual(['proactive', 'repair'])
    expect(runtimeSamplingBacklog[0]?.replayTurn?.sampledCategories).toEqual(['proactive', 'repair'])
  })

  it('canonicalizes origin-lost autonomous fallback sampling categories before writing runtime backlog entries', async () => {
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
      getNow: () => 1_700_000_000_950,
    })

    const ingestResult = await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'subconscious:runtime-proactive-fallback-2',
        sessionId: 'session-runtime-proactive-fallback-2',
        userText: '如果这是你沿着同一条主动线回来，就别把它记成普通对话。',
        assistantText: '我还是沿着那条主动线回来接你。',
        structuredJson: JSON.stringify({
          reply: '我还是沿着那条主动线回来接你。',
        }),
        createdAt: 1_700_000_000_950,
      },
      traceRecords: [{
        decisionTraceId: 'mind:runtime:proactive:fallback-2',
        turnId: 'subconscious:runtime-proactive-fallback-2',
        sessionId: 'session-runtime-proactive-fallback-2',
        origin: '' as any,
        activeThreadId: 'thread-runtime-proactive-fallback-2',
        createdAt: 1_700_000_000_950,
        lastUpdatedAt: 1_700_000_001_010,
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
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: '我还是沿着那条主动线回来接你。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        reason: 'runtime-sample-originless-proactive-fallback',
        critic: null,
        closure: null,
      },
    })

    expect(ingestResult?.sampledTurn.sampledCategories).toEqual(['proactive', 'repair'])
    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      sampledCategories?: string[]
      replayTurn?: {
        sampledCategories?: string[]
      }
    }>
    expect(runtimeSamplingBacklog[0]?.sampledCategories).toEqual(['proactive', 'repair'])
    expect(runtimeSamplingBacklog[0]?.replayTurn?.sampledCategories).toEqual(['proactive', 'repair'])
  })

  it('preserves trace-sourced memory-closure next influence when runtime structured output omits it', async () => {
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
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_001_650,
    })

    await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-trace-memory-closure-only-1',
        sessionId: 'session-runtime-trace-memory-closure-only',
        userText: '真实桌面长跑继续，刚才的回忆要改变下一轮主动和身体，不要只存在 trace 里。',
        assistantText: '我会把这段回忆放回下一轮主动和身体节奏。',
        structuredJson: JSON.stringify({
          reply: '我会把这段回忆放回下一轮主动和身体节奏。',
        }),
        createdAt: 1_700_000_001_650,
      },
      traceRecords: [{
        decisionTraceId: 'mind:runtime:trace-memory-closure-only:1',
        turnId: 'turn-runtime-trace-memory-closure-only-1',
        sessionId: 'session-runtime-trace-memory-closure-only',
        origin: 'user-turn',
        activeThreadId: 'thread-runtime-trace-memory-closure-only',
        createdAt: 1_700_000_001_650,
        lastUpdatedAt: 1_700_000_001_720,
        eventKinds: ['governance-normalized', 'persistence-written'],
        governance: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: {
            memory: {
              memoryClosureTrace: {
                version: 'memory-closure-trace-v1',
                authority: 'memory-os',
                whySurface: [
                  {
                    source: 'retrieval',
                    summary: 'why recall surfaced now: the previous continuity memory pressure must change the next proactive and embodied turn',
                    reasonCodes: ['why-surfaced', 'continuity-memory-closure'],
                  },
                ],
                surfacePolicy: {
                  gateStatus: 'open',
                  mode: 'tone-carry',
                  timing: 'after-payoff',
                  speechMode: 'visible',
                  placement: 'inside-payoff',
                  certainty: 'grounded',
                  reasons: ['continuity-memory-closure'],
                },
                nextInfluence: {
                  initiative: {
                    restraint: 'measured-return',
                    preferredTiming: 'after-payoff',
                    pressure: 'lower-pressure',
                    reason: 'keep the next proactive return lower-pressure because of the prior recall',
                  },
                  execution: {
                    carry: 'carry the prior recall into the next execution callback instead of resetting to a fresh helper task',
                    nextLearningAction: 'verify',
                    shouldVerify: true,
                    shouldReflect: true,
                    activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
                  },
                  embodiment: {
                    cadence: 'measured-return body voice face motion lipsync',
                    preferredVoiceMode: 'lower-pressure',
                    preferredLipsyncMode: 'restrained',
                    preferredGazeMode: 'soften',
                    reason: 'soften gaze and quieter blink because the prior recall is still shaping embodiment',
                  },
                },
                closureState: {
                  state: 'grounded-recall',
                  open: true,
                  revisionRequired: false,
                  shouldLabelUncertainty: false,
                  visibleCarryMode: 'tone-carry',
                  retrievalQuality: 'high',
                  conflictPressure: 'low',
                },
                selectedCandidateIds: ['memory-closure-trace:trace-only'],
                reasonTags: ['memory-closure-trace', 'next-turn-causal-handoff', 'body-lipsync-voice'],
              },
            },
          } as any,
        },
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: 1_700_000_001_700,
          emotionalTransitionLedger: {
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'emotion',
              causedByMemoryClosure: true,
              traceAuthority: 'memory-os',
              reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
              memoryIdentity: {
                selectedCandidateIds: ['memory-closure-trace:trace-only'],
                continuityKey: 'memory-closure-trace:trace-only',
                reasonTags: ['memory-identity:memory-closure-trace:trace-only'],
              },
              summary: 'trace-only memory identity caused this emotional afterglow',
            },
            initiativeSuppression: {
              memoryClosureCausality: {
                causalSource: 'memory-closure-trace',
                affectedLane: 'initiative',
                causedByMemoryClosure: true,
                traceAuthority: 'memory-os',
                reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
                memoryIdentity: {
                  selectedCandidateIds: ['memory-closure-trace:trace-only'],
                  continuityKey: 'memory-closure-trace:trace-only',
                  reasonTags: ['memory-identity:memory-closure-trace:trace-only'],
                },
                summary: 'trace-only memory identity caused this proactive restraint',
              },
            },
          },
          learningExecutionState: {
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'execution',
              causedByMemoryClosure: true,
              traceAuthority: 'memory-os',
              reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
              memoryIdentity: {
                selectedCandidateIds: ['memory-closure-trace:trace-only'],
                continuityKey: 'memory-closure-trace:trace-only',
                reasonTags: ['memory-identity:memory-closure-trace:trace-only'],
              },
              summary: 'trace-only memory identity caused this execution callback carry',
            },
          },
          embodimentContinuityLedger: {
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'embodiment',
              causedByMemoryClosure: true,
              traceAuthority: 'memory-os',
              reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
              memoryIdentity: {
                selectedCandidateIds: ['memory-closure-trace:trace-only'],
                continuityKey: 'memory-closure-trace:trace-only',
                reasonTags: ['memory-identity:memory-closure-trace:trace-only'],
              },
              summary: 'trace-only memory identity caused this body voice face motion lipsync carry',
            },
          },
        } as any,
      } as any],
    })

    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      replayTurn?: {
        structured?: {
          memoryClosureTrace?: {
            nextInfluence?: {
              initiative?: { reason?: string | null }
              execution?: { carry?: string | null }
              embodiment?: { reason?: string | null, cadence?: string | null }
            } | null
          } | null
          derivedMindStateBundle?: {
            emotionalTransitionLedger?: {
              memoryClosureCausality?: {
                memoryIdentity?: { continuityKey?: string | null } | null
              } | null
            } | null
            learningExecutionState?: {
              memoryClosureCausality?: {
                memoryIdentity?: { continuityKey?: string | null } | null
              } | null
            } | null
            embodimentContinuityLedger?: {
              memoryClosureCausality?: {
                memoryIdentity?: { continuityKey?: string | null } | null
              } | null
            } | null
          } | null
        } | null
      }
    }>

    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.nextInfluence?.initiative?.reason)
      .toContain('prior recall')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.derivedMindStateBundle?.emotionalTransitionLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('memory-closure-trace:trace-only')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.derivedMindStateBundle?.learningExecutionState?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('memory-closure-trace:trace-only')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.derivedMindStateBundle?.embodimentContinuityLedger?.memoryClosureCausality?.memoryIdentity?.continuityKey)
      .toBe('memory-closure-trace:trace-only')
  })

  it('does not drop DB-sampled same-turn sibling trace evidence when the newest trace is thin', async () => {
    const meta = new Map<string, string>()
    const rows = [{
      turnId: 'turn-db-newest-thin-sibling-full-closure',
      sessionId: 'session-db-newest-thin-sibling-full-closure',
      userText: '真实 DB 采样里，最新薄 trace 不该遮住同回合完整闭环证据。',
      assistantText: '我会沿着这轮记忆、主动、回调和身体线继续。',
      structuredJson: JSON.stringify({
        reply: '我会沿着这轮记忆、主动、回调和身体线继续。',
      }),
      createdAt: 1_700_000_012_700,
    }]
    const listMindTurnEvents = vi.fn(async (_options: { turnId?: string | null, decisionTraceId?: string | null }) => [
      {
        id: 'evt-db-newest-thin-sibling-full-closure-full-1',
        decisionTraceId: 'mind:db:newest-thin-sibling-full-closure:full',
        turnId: 'turn-db-newest-thin-sibling-full-closure',
        sessionId: 'session-db-newest-thin-sibling-full-closure',
        origin: 'user-turn' as const,
        kind: 'governance-normalized' as const,
        payload: {
          turnMode: 'answer',
          truthState: 'remembered',
          repairState: 'none',
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
          digitalLifeSpine: {
            memory: {
              memoryClosureTrace: {
                version: 'memory-closure-trace-v1',
                authority: 'memory-os',
                whySurface: [{
                  source: 'retrieval',
                  summary: 'why recall surfaced now: memory-closure-trace says prior recall must change the next proactive callback and continuity embodied return',
                  reasonCodes: ['why-surfaced', 'continuity-memory-closure'],
                }],
                nextInfluence: {
                  initiative: {
                    restraint: 'measured-return',
                    preferredTiming: 'after-payoff',
                    pressure: 'lower-pressure',
                    reason: 'prior recall keeps the next proactive opening lower-pressure after the execution callback',
                  },
                  execution: {
                    carry: 'carry corrected memory into the next execution callback instead of resetting to a fresh helper task',
                  },
                  embodiment: {
                    cadence: 'measured-return body voice face motion lipsync',
                    reason: 'continuity body voice face motion lipsync should soften because prior recall is still active',
                  },
                },
                reasonTags: ['memory-closure-trace', 'prior recall', 'next turn', 'continuity embodiment'],
              },
            },
          },
        },
        createdAt: 1_700_000_012_710,
      },
      {
        id: 'evt-db-newest-thin-sibling-full-closure-full-2',
        decisionTraceId: 'mind:db:newest-thin-sibling-full-closure:full',
        turnId: 'turn-db-newest-thin-sibling-full-closure',
        sessionId: 'session-db-newest-thin-sibling-full-closure',
        origin: 'user-turn' as const,
        kind: 'persistence-written' as const,
        payload: {
          activeThreadId: 'thread-db-newest-thin-sibling-full-closure',
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 1_700_000_012_720,
            emotionalKernel: {
              dominantEmotion: 'callback-afterglow',
              initiativeMode: 'proactive-opening',
              memoryRecallMode: 'execution-callback-carry',
              embodimentTone: 'audible-body-carry',
              reasonTags: ['continuity-memory-closure', 'execution-callback-carry'],
              why: 'Sibling full DB trace holds memory, emotion, initiative, execution callback, and embodiment proof.',
            },
            emotionalTransitionLedger: {
              version: 'emotional-transition-ledger-v1',
              transitionKind: 'execution-callback-afterglow',
              replayLine: 'execution callback afterglow stayed on the indexing callback thread',
              traceSummary: 'callback proof should survive newest thin DB trace selection',
            },
            embodimentContinuityLedger: {
              version: 'embodiment-continuity-ledger-v1',
              continuityPhase: 'body-lipsync-voice-rejoin',
              replayLine: 'body+voice+lipsync carried continuity through the callback afterglow.',
              traceSummary: 'embodiment proof should survive newest thin DB trace selection',
            },
            summary: 'indexing-callback-evidence',
          },
        },
        createdAt: 1_700_000_012_720,
      },
      {
        id: 'evt-db-newest-thin-sibling-full-closure-thin-1',
        decisionTraceId: 'mind:db:newest-thin-sibling-full-closure:thin',
        turnId: 'turn-db-newest-thin-sibling-full-closure',
        sessionId: 'session-db-newest-thin-sibling-full-closure',
        origin: 'user-turn' as const,
        kind: 'recall-attribution' as const,
        payload: {
          shouldRecall: true,
          surfacePolicy: 'gist-first',
          confidence: 0.68,
          whyNow: 'thin recall context exists, but sibling DB trace owns the closure proof',
          inwardLine: 'Keep the sibling proof available.',
        },
        createdAt: 1_700_000_012_740,
      },
    ] as any)
    const runtime = createAlicizationReplayBenchmarkRuntime({
      getAlicizationDb: () => ({
        listConversationTurnsSince: vi.fn(async () => rows),
        listMindTurnEvents,
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
      getNow: () => 1_700_000_012_900,
    })

    const result = await runtime.runReplayBenchmark({
      packId: 'sampled-humanlike-memory-v1',
      sampleLimit: 1,
      persistTelemetry: false,
    })

    expect(listMindTurnEvents.mock.calls.filter(([options]) => Boolean(options.turnId))).toHaveLength(1)
    expect(result.datasetFeedback.runtimeSamplingEvidence).toEqual(expect.objectContaining({
      source: 'conversation-sample',
      sampledTurnCount: 1,
    }))
    expect(result.failingTurnSet[0]?.sampledCategories).toEqual(expect.arrayContaining([
      'execution',
      'procedure-carry',
      'long-horizon',
      'presence-quality',
    ]))
    const datasetBacklog = JSON.parse(meta.get(replayBenchmarkDatasetBacklogKey) ?? '[]') as Array<{
      replayTurn?: {
        structured?: {
          memoryClosureTrace?: {
            nextInfluence?: {
              initiative?: {
                reason?: string | null
              } | null
              execution?: {
                carry?: string | null
              } | null
              embodiment?: {
                cadence?: string | null
              } | null
            } | null
          } | null
        } | null
        organicMemoryContext?: {
          derivedMindStateBundle?: unknown
        }
      }
    }>
    expect(datasetBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.nextInfluence?.initiative?.reason)
      .toContain('prior recall')
    expect(datasetBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.nextInfluence?.execution?.carry)
      .toContain('corrected memory')
    expect(datasetBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.nextInfluence?.embodiment?.cadence)
      .toContain('body voice face motion lipsync')
  })

  it('points runtime sampling provenance at the trace that actually carries memory-closure proof', async () => {
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
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_012_500,
    })

    await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-audit-pointer-proof',
        sessionId: 'session-runtime-audit-pointer-proof',
        userText: '继续验证同一轮里完整记忆闭环 trace 才应该成为可审计指针。',
        assistantText: '我会把完整 trace 作为这次运行时采样的审计来源。',
        structuredJson: JSON.stringify({
          reply: '我会把完整 trace 作为这次运行时采样的审计来源。',
        }),
        createdAt: 1_700_000_012_500,
      },
      traceRecords: [
        {
          decisionTraceId: 'audit-thin-context',
          turnId: 'turn-runtime-audit-pointer-proof',
          sessionId: 'session-runtime-audit-pointer-proof',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-audit-pointer-proof',
          createdAt: 1_700_000_012_500,
          lastUpdatedAt: 1_700_000_012_700,
          eventKinds: ['governance-normalized', 'recall-attribution'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
            digitalLifeSpine: null,
          },
          recallAttribution: {
            shouldRecall: true,
            whyNow: 'thin recall context exists but does not carry the audit proof',
            selectedProcedures: [],
            selectedPeriods: [],
            selectedEras: [],
            selectedEpisodes: [],
            confidence: 0.74,
          },
        } as any,
        {
          decisionTraceId: 'audit-full-memory-closure-proof',
          turnId: 'turn-runtime-audit-pointer-proof',
          sessionId: 'session-runtime-audit-pointer-proof',
          origin: 'subconscious-proactive',
          activeThreadId: 'thread-runtime-audit-pointer-proof',
          createdAt: 1_700_000_012_500,
          lastUpdatedAt: 1_700_000_012_600,
          eventKinds: ['governance-normalized', 'memory-reconsolidated', 'dialogue-emitted'],
          governance: {
            turnMode: 'answer',
            truthState: 'remembered',
            repairState: 'none',
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
            digitalLifeSpine: {
              memory: {
                memoryClosureTrace: {
                  version: 'memory-closure-trace-v1',
                  authority: 'memory-os',
                  whySurface: [{
                    source: 'retrieval',
                    summary: 'why recall surfaced now: corrected memory must change the next proactive opening, execution callback, emotional afterglow, and body voice face motion lipsync expression.',
                    reasonCodes: ['why-surfaced', 'memory-audit'],
                  }],
                  nextInfluence: {
                    initiative: {
                      reason: 'prior recall changed the next proactive/callback carry into a lower-pressure measured return',
                      restraint: 'measured-return',
                      preferredTiming: 'after-payoff',
                    },
                    execution: {
                      carry: 'corrected memory changed the next execution callback carry instead of resetting to a fresh helper task',
                    },
                    emotion: {
                      afterglow: 'corrected memory changed the next emotional afterglow into quieter continuity residue',
                    },
                    embodiment: {
                      reason: 'corrected memory changed the next body voice face motion lipsync expression into softer indexing callback evidence',
                      cadence: 'body voice face motion lipsync measured-return',
                    },
                  },
                  reasonTags: ['memory-closure-trace', 'corrected-memory', 'memory-audit', 'execution-callback', 'proactive-opening', 'body-lipsync-voice'],
                },
              },
            } as any,
          },
          memoryReconsolidated: {
            source: 'execution-result-feedback',
            memoryClosureExecution: {
              authority: 'memory-os',
              carry: 'Corrected memory downranked stale status recap, kept correction provenance, and changed the next proactive opening, emotional afterglow, and body voice face motion lipsync expression.',
              nextLearningAction: 'verify',
              shouldVerify: true,
              shouldReflect: true,
              activeLearningFocuses: ['indexing-callback-evidence', 'embodiment handoff'],
              reasonTags: ['memory-reconsolidated', 'downrank-stale-status', 'correction-provenance'],
            },
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 1_700_000_012_580,
            emotionalKernel: {
              dominantEmotion: 'callback-afterglow',
              initiativeMode: 'proactive-opening',
              memoryRecallMode: 'execution-callback-carry',
              embodimentTone: 'body-voice-face-motion-lipsync',
              why: 'memory recall, proactive opening, execution callback, emotional afterglow, body, voice, face, motion, and lipsync form one traceable callback evidence chain',
              reasonTags: ['execution-callback', 'proactive-opening', 'body-voice-face-motion-lipsync'],
            },
            emotionalTransitionLedger: {
              version: 'emotional-transition-ledger-v1',
              transitionKind: 'execution-callback-afterglow',
              replayLine: 'memory+proactive opening+execution callback+emotion+body+voice+face+motion+lipsync stayed continuity',
              memoryWriteback: {
                shouldWrite: true,
                lane: 'emotional-continuity',
                reason: 'Later recall needs the execution callback afterglow.',
              },
              embodimentDrive: {
                shouldDrive: true,
                tone: 'body-voice-face-motion-lipsync',
                reason: 'Body, voice, face, motion, and lipsync should express the callback afterglow.',
              },
            },
            embodimentContinuityLedger: {
              version: 'embodiment-continuity-ledger-v1',
              continuityPhase: 'body-voice-face-motion-lipsync-rejoin',
              carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
              rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
              replayLine: 'body+voice+face+motion+lipsync carried continuity through the callback afterglow.',
              traceSummary: 'phase=body-voice-face-motion-lipsync-rejoin | carrying=body,voice,face,motion,lipsync',
            },
          } as any,
        } as any,
      ],
      visibleReplyRealization: {
        version: 'visible-reply-realization-v1',
        expectedAuthority: 'llm-mind',
        actualAuthority: 'llm-mind',
        providerMindExecuted: true,
        mode: 'provider-stream',
        visibleText: '我会把完整 trace 作为这次运行时采样的审计来源。',
        nonHumanAuthoredStatus: null,
        blockedReasons: [],
        reason: 'runtime-audit-pointer-proof',
        critic: null,
        closure: null,
      },
    })

    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      tracePointer?: { decisionTraceId?: string | null }
      replayTurn?: {
        tracePointer?: { decisionTraceId?: string | null }
        structured?: {
          memoryClosureTrace?: {
            nextInfluence?: {
              execution?: { carry?: string | null }
            } | null
          } | null
        } | null
      }
    }>

    expect(runtimeSamplingBacklog[0]?.tracePointer?.decisionTraceId).toBe('audit-full-memory-closure-proof')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.tracePointer?.decisionTraceId).toBe('audit-full-memory-closure-proof')
    expect(runtimeSamplingBacklog[0]?.replayTurn?.structured?.memoryClosureTrace?.nextInfluence?.execution?.carry)
      .toContain('corrected memory')
  })

  it('selects the richest same-turn embodiment authority when runtime sampling sees thin and full traces', async () => {
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
          retrievalHealth: {},
        })),
        overrideMemoryStats: vi.fn(async next => next),
        getMetaValue: vi.fn(async (key: string) => meta.get(key)),
        setMetaValue: vi.fn(async (key: string, value: string) => {
          meta.set(key, value)
        }),
      }),
      appendAuditLog: vi.fn(async () => {}),
      getNow: () => 1_700_000_002_300,
    })

    await runtime.ingestRuntimeSamplingConversationTurn({
      row: {
        turnId: 'turn-runtime-richest-embodiment-authority-1',
        sessionId: 'session-runtime-richest-embodiment-authority',
        userText: '继续验证同一轮里后写入的完整身体证据不会被薄 trace 吃掉。',
        assistantText: '我会以完整身体证据为准，把语音、表情、动作和口型接在同一条线上。',
        structuredJson: JSON.stringify({
          reply: '我会以完整身体证据为准，把语音、表情、动作和口型接在同一条线上。',
        }),
        createdAt: 1_700_000_002_300,
      },
      traceRecords: [
        {
          decisionTraceId: 'mind:runtime:richest-embodiment-authority:thin',
          turnId: 'turn-runtime-richest-embodiment-authority-1',
          sessionId: 'session-runtime-richest-embodiment-authority',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-richest-embodiment-authority',
          createdAt: 1_700_000_002_300,
          lastUpdatedAt: 1_700_000_002_320,
          eventKinds: ['governance-normalized'],
          governance: null,
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
          embodimentAuthority: {
            emotion: 'thinking',
            performance: null,
            digitalLife: {
              emotion: 'thinking',
              mode: 'speaking',
              preferredPresence: null,
              voice: null,
              face: {
                residentMode: 'thin-face-only',
                emotion: 'thinking',
                facialCue: 'thin-focus',
              },
              motion: null,
              lipSync: null,
              bodyContinuity: null,
              action: null,
            },
            embodimentScript: null,
            visibleReply: {
              expectedAuthority: 'llm-mind',
              actualAuthority: 'llm-mind',
              providerMindExecuted: true,
            },
          },
        },
        {
          decisionTraceId: 'mind:runtime:richest-embodiment-authority:full',
          turnId: 'turn-runtime-richest-embodiment-authority-1',
          sessionId: 'session-runtime-richest-embodiment-authority',
          origin: 'user-turn',
          activeThreadId: 'thread-runtime-richest-embodiment-authority',
          createdAt: 1_700_000_002_330,
          lastUpdatedAt: 1_700_000_002_380,
          eventKinds: ['dialogue-emitted'],
          governance: null,
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
          embodimentAuthority: {
            emotion: 'thinking',
            performance: {
              baseEmotion: 'thinking',
              facialCue: 'soft-focus',
              actionCue: 'measured-return',
              delivery: 'steady',
              emphasis: 0.42,
            },
            digitalLife: {
              emotion: 'thinking',
              mode: 'speaking',
              preferredPresence: 'resident-stage',
              voice: { residentMode: 'full-voice-line' },
              face: {
                residentMode: 'full-face-line',
                emotion: 'thinking',
                facialCue: 'soft-focus',
              },
              motion: { residentMode: 'full-motion-line' },
              lipSync: { residentMode: 'full-lipsync-line' },
              bodyContinuity: {
                bodyLine: 'full body line keeps voice face motion and lipsync together',
              },
              action: {
                actionCue: 'measured-return',
                actionMode: 'idle-with-attention',
              },
            },
            embodimentScript: {
              rendererTarget: 'live2d',
              state: {
                baseEmotion: 'thinking',
                delivery: 'steady',
                emphasis: 0.42,
                residentMode: 'full-resident-body',
              },
              speechPlan: {
                segmentCount: 2,
                interruptPolicy: 'finish-current-phrase',
              },
            },
            visibleReply: {
              expectedAuthority: 'llm-mind',
              actualAuthority: 'llm-mind',
              providerMindExecuted: true,
            },
          },
        },
      ],
    })

    const runtimeSamplingBacklog = JSON.parse(meta.get(replayBenchmarkRuntimeSamplingBacklogKey) ?? '[]') as Array<{
      replayTurn?: {
        gold?: {
          embodimentAuthority?: {
            digitalLife?: {
              voice?: { residentMode?: string | null } | null
              face?: { residentMode?: string | null } | null
              motion?: { residentMode?: string | null } | null
              lipSync?: { residentMode?: string | null } | null
              bodyContinuity?: { bodyLine?: string | null } | null
            } | null
            embodimentScript?: {
              state?: { residentMode?: string | null } | null
            } | null
          } | null
        }
      }
    }>
    const authority = runtimeSamplingBacklog[0]?.replayTurn?.gold?.embodimentAuthority
    expect(authority?.digitalLife?.voice?.residentMode).toBe('full-voice-line')
    expect(authority?.digitalLife?.face?.residentMode).toBe('full-face-line')
    expect(authority?.digitalLife?.motion?.residentMode).toBe('full-motion-line')
    expect(authority?.digitalLife?.lipSync?.residentMode).toBe('full-lipsync-line')
    expect(authority?.digitalLife?.bodyContinuity?.bodyLine).toBe('full body line keeps voice face motion and lipsync together')
    expect(authority?.embodimentScript?.state?.residentMode).toBe('full-resident-body')
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
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
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
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
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
            expectedAuthority: 'llm-mind',
            actualAuthority: 'local-deterministic-fallback',
            providerMindExecuted: false,
            mode: 'local-fallback',
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
                actualAuthority: 'llm-mind',
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
            expectedAuthority: 'llm-mind',
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
        'visibleReply.actualAuthority': 1,
        'visibleReply.providerMindExecuted': 1,
      },
    })
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'visible-reply-authority-gate',
        status: 'fail',
        detail: 'embodiedAuthorityMismatchRate=0.5 (1/2)',
      }),
    ]))
  })

  it('treats digital-life action-cue drift as an authority mismatch even when visible reply authority still matches', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-callback-embodiment-authority-digital-life-drift',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-callback-embodiment-authority-digital-life-drift',
        userText: '这类回调先中性可见占位，不要一下子把距离拉近。',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-callback-embodiment-authority-digital-life-drift',
          decisionTraceId: 'mind:callback:embodiment:digital-life-drift',
          sessionId: 'session-callback-embodiment-authority-digital-life-drift',
          activeThreadId: 'thread-callback-embodiment-authority-digital-life-drift',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-callback-embodiment-authority-digital-life-drift',
          userText: '这类回调先中性可见占位，不要一下子把距离拉近。',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我先轻一点把这条回流接回来。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-callback-embodiment-authority-digital-life-drift',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-callback-embodiment-authority-digital-life-drift',
            decisionTraceId: 'mind:callback:embodiment:digital-life-drift',
            sessionId: 'session-callback-embodiment-authority-digital-life-drift',
            activeThreadId: 'thread-callback-embodiment-authority-digital-life-drift',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
                providerMindExecuted: true,
              },
              digitalLife: {
                mode: 'thinking',
                action: {
                  actionCue: 'idle_settle',
                },
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

    expect(result.datasetFeedback.authoritySummary).toEqual({
      comparedTurnCount: 1,
      mismatchTurnCount: 1,
      mismatchFieldCounts: {
        'digitalLife.action.actionCue': 1,
      },
    })
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'visible-reply-authority-gate',
        status: 'fail',
        detail: 'embodiedAuthorityMismatchRate=1 (1/1)',
      }),
    ]))
  })

  it('keeps restrained execution-callback embodiment authority stable in replay gold when callback returns must stay on the indexing callback thread', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-callback-embodiment-authority-measured-return',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-callback-embodiment-authority-measured-return',
        userText: '这类回调你这次也别一下子变热，像上次那样中性可见占位。',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-callback-embodiment-authority-measured-return',
          decisionTraceId: 'mind:callback:embodiment:measured-return',
          sessionId: 'session-callback-embodiment-authority-measured-return',
          activeThreadId: 'thread-callback-embodiment-authority-measured-return',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-callback-embodiment-authority-measured-return',
          userText: '这类回调你这次也别一下子变热，像上次那样中性可见占位。',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我先轻一点把这条回流接回来。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-callback-embodiment-authority-measured-return',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-callback-embodiment-authority-measured-return',
            decisionTraceId: 'mind:callback:embodiment:measured-return',
            sessionId: 'session-callback-embodiment-authority-measured-return',
            activeThreadId: 'thread-callback-embodiment-authority-measured-return',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
                providerMindExecuted: true,
              },
              digitalLife: {
                mode: 'thinking',
                action: {
                  actionCue: 'observe_focus',
                },
              },
            },
          },
        },
        createdAt: 1_700_000_000_000,
      },
      {
        id: 'runtime-callback-embodiment-authority-repair-before-closeness',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-callback-embodiment-authority-repair-before-closeness',
        userText: '这次先稳住，不要一下子把距离拉近。',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-callback-embodiment-authority-repair-before-closeness',
          decisionTraceId: 'mind:callback:embodiment:repair-before-closeness',
          sessionId: 'session-callback-embodiment-authority-repair-before-closeness',
          activeThreadId: 'thread-callback-embodiment-authority-repair-before-closeness',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-callback-embodiment-authority-repair-before-closeness',
          userText: '这次先稳住，不要一下子把距离拉近。',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我先把这一下稳稳落在这里。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-callback-embodiment-authority-repair-before-closeness',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-callback-embodiment-authority-repair-before-closeness',
            decisionTraceId: 'mind:callback:embodiment:repair-before-closeness',
            sessionId: 'session-callback-embodiment-authority-repair-before-closeness',
            activeThreadId: 'thread-callback-embodiment-authority-repair-before-closeness',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
                providerMindExecuted: true,
              },
              digitalLife: {
                mode: 'thinking',
                action: {
                  actionCue: 'idle_settle',
                },
              },
            },
          },
        },
        createdAt: 1_700_000_000_100,
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
      sampleLimit: 2,
      persistTelemetry: false,
    })

    expect(result.turns).toHaveLength(2)
    expect(result.datasetFeedback.authoritySummary).toEqual({
      comparedTurnCount: 2,
      mismatchTurnCount: 2,
      mismatchFieldCounts: {
        'digitalLife.action.actionCue': 2,
      },
    })
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'visible-reply-authority-gate',
        status: 'fail',
        detail: 'embodiedAuthorityMismatchRate=1 (2/2)',
      }),
    ]))
  })

  it('treats cross-modal callback drift as an authority mismatch when voice, face, motion, lipsync, and body observations diverge', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-callback-embodiment-authority-cross-modal-drift',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-callback-embodiment-authority-cross-modal-drift',
        userText: '这次先稳住，先把同一条 living line 收稳，再慢一点回来。',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-callback-embodiment-authority-cross-modal-drift',
          decisionTraceId: 'mind:callback:embodiment:cross-modal-drift',
          sessionId: 'session-callback-embodiment-authority-cross-modal-drift',
          activeThreadId: 'thread-callback-embodiment-authority-cross-modal-drift',
        },
        sampledCategories: ['dialogue'],
        replayTurn: {
          turnId: 'turn-callback-embodiment-authority-cross-modal-drift',
          userText: '这次先稳住，先把同一条 living line 收稳，再慢一点回来。',
          visibleReplyRealization: {
            version: 'visible-reply-realization-v1',
            expectedAuthority: 'llm-mind',
            actualAuthority: 'llm-mind',
            providerMindExecuted: true,
            mode: 'provider-stream',
            visibleText: '我先把这一下稳稳落在这里，再沿着同一条线轻一点回来。',
            nonHumanAuthoredStatus: null,
            blockedReasons: [],
            reason: 'runtime-callback-embodiment-authority-cross-modal-drift',
            critic: null,
            closure: null,
          },
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-callback-embodiment-authority-cross-modal-drift',
            decisionTraceId: 'mind:callback:embodiment:cross-modal-drift',
            sessionId: 'session-callback-embodiment-authority-cross-modal-drift',
            activeThreadId: 'thread-callback-embodiment-authority-cross-modal-drift',
          },
          sampledCategories: ['dialogue'],
          gold: {
            embodimentAuthority: {
              visibleReply: {
                expectedAuthority: 'llm-mind',
                actualAuthority: 'llm-mind',
                providerMindExecuted: true,
              },
              digitalLife: {
                mode: 'thinking',
                preferredPresence: 'repair-before-closeness',
                action: {
                  actionCue: 'idle_settle',
                },
                voice: {
                  residentMode: 'repair-before-closeness',
                },
                face: {
                  residentMode: 'repair-before-closeness',
                },
                motion: {
                  residentMode: 'repair-before-closeness',
                },
                lipSync: {
                  residentMode: 'repair-before-closeness',
                },
                bodyContinuity: {
                  bodyLine: 'voice+face+motion+lipsync+body-settle',
                },
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

    expect(result.datasetFeedback.authoritySummary).toEqual({
      comparedTurnCount: 1,
      mismatchTurnCount: 1,
      mismatchFieldCounts: {
        'digitalLife.preferredPresence': 1,
        'digitalLife.action.actionCue': 1,
        'digitalLife.voice.residentMode': 1,
        'digitalLife.face.residentMode': 1,
        'digitalLife.motion.residentMode': 1,
        'digitalLife.lipSync.residentMode': 1,
        'digitalLife.bodyContinuity.bodyLine': 1,
      },
    })
    expect(result.shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'visible-reply-authority-gate',
        status: 'fail',
        detail: 'embodiedAuthorityMismatchRate=1 (1/1)',
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
          withheldReasons: ['unstable-detail', 'payoff-required'],
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
    const overrideMemoryStats = vi.fn(async next => next)
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
    expect(meta.get(replayBenchmarkTuningAdviceMetaKey)).toContain('runtimeMemoryClosureCausalIdentity')
  }, 180_000)

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
  }, 120_000)

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
    const overrideMemoryStats = vi.fn(async next => next)
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

  it('requires structured memory-closure causality across initiative, execution, emotion, and embodiment downstream state', () => {
    const traceRecord = {
      decisionTraceId: 'mind:runtime:structured-causality',
      turnId: 'turn-runtime-structured-causality',
      sessionId: 'session-runtime-structured-causality',
      origin: 'user-turn' as const,
      activeThreadId: 'thread-runtime-structured-causality',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['persistence-written' as const],
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-structured-causality',
          previousEmotion: 'focused',
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: {},
          changedAxes: ['arousal'],
          sourceTags: ['runtime-derived-downstream-state'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'Keep the later recall state available.',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'Return with restraint.',
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'Body voice face motion lipsync express the current state.',
          },
          traceSummary: 'emotional afterglow stayed smooth',
          replayLine: 'emotional afterglow and callback residue stayed continuity',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'emotion',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause links the prior recall to this emotional state',
          },
        },
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-structured-causality',
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'cross-modal-continuity',
            reason: 'Body voice face motion lipsync carried together.',
          },
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
          replayLine: 'body voice face motion lipsync stayed continuity',
          sourceTags: ['runtime-derived-downstream-state'],
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'embodiment',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause links the prior recall to this embodied state',
          },
        },
        learningExecutionState: {
          currentTaskId: null,
          currentStatus: null,
          currentAttemptCount: 0,
          currentMaxAttempts: 0,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['indexing-callback-evidence'],
          queuedTaskCount: 0,
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
          updatedAt: 1_700_000_000_001,
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.hasRuntimeSamplingTraceDownstreamStateEvidence([traceRecord as any]))
      .toBe(false)
    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: false,
        execution: false,
        embodiment: false,
        memoryIdentity: true,
        missingLanes: ['initiative', 'execution', 'embodiment'],
      })

    const fullRendererAuthorityWithoutMemoryCause = {
      ...traceRecord,
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: {
            residentMode: 'continuity-face-line',
            emotion: 'measured-companionship',
            facialCue: 'soft-gaze',
          },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: {
            bodyLine: 'body stays with the continuity renderer line',
          },
        },
      },
      derivedMindStateBundle: {
        ...traceRecord.derivedMindStateBundle,
        embodimentContinuityLedger: {
          ...traceRecord.derivedMindStateBundle.embodimentContinuityLedger,
          memoryClosureCausality: undefined,
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
          replayLine: 'body voice face motion lipsync are present, but no structured field says memory closure caused this body line',
        },
      },
    }

    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([fullRendererAuthorityWithoutMemoryCause as any]))
      .toEqual({
        emotion: true,
        initiative: false,
        execution: false,
        embodiment: false,
        memoryIdentity: true,
        missingLanes: ['initiative', 'execution', 'embodiment'],
      })

    const closedTraceRecord = {
      ...traceRecord,
      origin: 'subconscious-proactive' as const,
      eventKinds: [
        'governance-normalized' as const,
        'persistence-written' as const,
        'memory-reconsolidated' as const,
      ],
      memoryReconsolidated: {
        source: 'execution-result-feedback',
        memoryClosureExecution: {
          authority: 'memory-os',
          carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
          reasonTags: ['memory-os', 'execution-feedback'],
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: {
            residentMode: 'continuity-face-line',
            emotion: 'measured-companionship',
            facialCue: 'soft-gaze',
          },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: {
            bodyLine: 'body stays with the continuity renderer line',
          },
        },
      },
      derivedMindStateBundle: {
        ...traceRecord.derivedMindStateBundle,
        emotionalTransitionLedger: {
          ...traceRecord.derivedMindStateBundle.emotionalTransitionLedger,
          memoryClosureCausality: {
            ...traceRecord.derivedMindStateBundle.emotionalTransitionLedger.memoryClosureCausality,
            memoryIdentity: {
              selectedCandidateIds: ['cluster:runtime-downstream-state'],
              continuityKey: 'cluster:runtime-downstream-state',
              reasonTags: ['memory-identity:cluster:runtime-downstream-state'],
            },
          },
          initiativeSuppression: {
            ...traceRecord.derivedMindStateBundle.emotionalTransitionLedger.initiativeSuppression,
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'initiative',
              causedByMemoryClosure: true,
              traceAuthority: 'memory-os',
              reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
              memoryIdentity: {
                selectedCandidateIds: ['cluster:runtime-downstream-state'],
                continuityKey: 'cluster:runtime-downstream-state',
                reasonTags: ['memory-identity:cluster:runtime-downstream-state'],
              },
              summary: 'structured cause links the prior recall to this initiative restraint',
            },
          },
        },
        learningExecutionState: {
          ...traceRecord.derivedMindStateBundle.learningExecutionState,
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'execution',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            memoryIdentity: {
              selectedCandidateIds: ['cluster:runtime-downstream-state'],
              continuityKey: 'cluster:runtime-downstream-state',
              reasonTags: ['memory-identity:cluster:runtime-downstream-state'],
            },
            summary: 'structured cause links the prior recall to this execution feedback state',
          },
        },
        embodimentContinuityLedger: {
          ...traceRecord.derivedMindStateBundle.embodimentContinuityLedger,
          memoryClosureCausality: {
            ...traceRecord.derivedMindStateBundle.embodimentContinuityLedger.memoryClosureCausality,
            memoryIdentity: {
              selectedCandidateIds: ['cluster:runtime-downstream-state'],
              continuityKey: 'cluster:runtime-downstream-state',
              reasonTags: ['memory-identity:cluster:runtime-downstream-state'],
            },
          },
        },
      },
    }

    expect(__alicizationTestOnly.hasRuntimeSamplingTraceDownstreamStateEvidence([closedTraceRecord as any]))
      .toBe(true)
    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([closedTraceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: true,
        execution: true,
        embodiment: true,
        memoryIdentity: true,
        missingLanes: [],
      })
  })

  it('does not accept trace-only initiative and execution causality without runtime event evidence', () => {
    const traceRecord = {
      decisionTraceId: 'mind:runtime:trace-only-initiative-execution',
      turnId: 'turn-runtime-trace-only-initiative-execution',
      sessionId: 'session-runtime-trace-only-initiative-execution',
      origin: 'user-turn' as const,
      activeThreadId: 'thread-runtime-trace-only-initiative-execution',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['persistence-written' as const],
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-trace-only-initiative-execution',
          previousEmotion: 'focused',
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: {},
          changedAxes: ['initiativePressure'],
          sourceTags: ['runtime-derived-downstream-state'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'Keep the later recall state available.',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'Return with restraint.',
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'initiative',
              causedByMemoryClosure: true,
              traceAuthority: 'memory-os',
              reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
              summary: 'structured cause links the prior recall to this initiative restraint',
            },
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'Body voice face motion lipsync express the current state.',
          },
          traceSummary: 'emotional afterglow stayed smooth',
          replayLine: 'emotional afterglow and callback residue stayed continuity',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'emotion',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause links the prior recall to this emotional state',
          },
        },
        learningExecutionState: {
          currentTaskId: 'learning-task-trace-only',
          currentStatus: 'scheduled',
          currentAttemptCount: 0,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['indexing-callback-evidence'],
          queuedTaskCount: 1,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: [],
          lastCompletedTaskId: null,
          lastCompletedAction: null,
          lastCompletedSummary: 'structured state says execution callback carry exists',
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_700_000_000_001,
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'execution',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause links the prior recall to this execution feedback state',
          },
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: false,
        execution: false,
        embodiment: false,
        memoryIdentity: true,
        missingLanes: ['initiative', 'execution', 'embodiment'],
      })
  })

  it('accepts explicit UI user-turn memory closure causality as downstream state evidence', () => {
    const memoryIdentity = {
      selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621'],
      continuityKey: 'fallback:铃兰-phase1-0621',
      reasonTags: ['memory-identity:fallback:铃兰-phase1-0621'],
    }
    const causalityFor = (
      affectedLane: 'emotion' | 'initiative' | 'execution' | 'embodiment',
      summary: string,
    ) => ({
      causalSource: 'memory-closure-trace',
      affectedLane,
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: [
        'memory-closure-trace',
        'runtime-derived-downstream-state',
        'fallback-memory-closure',
        'execution-callback',
        'body-voice-face-motion-lipsync',
      ],
      memoryIdentity,
      summary,
    })
    const traceRecord = {
      decisionTraceId: 'mind:runtime:ui-user-memory-closure-causality',
      turnId: 'turn-ui-user-memory-closure-causality',
      sessionId: 'session-ui-user-memory-closure-causality',
      origin: 'user-turn' as const,
      activeThreadId: null,
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: [
        'governance-normalized' as const,
        'persistence-written' as const,
        'dialogue-emitted' as const,
      ],
      governance: {
        answerSubject: 'memory',
        digitalLifeSpine: {
          memory: {
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [{
                summary: 'why recall surfaced now: explicit memory handoff for 铃兰-Phase1-0621 asked this line to return as the same memory identity.',
              }],
              nextInfluence: {
                initiative: {
                  reason: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
                  restraint: 'measured-return',
                  preferredTiming: 'after-payoff',
                },
                execution: {
                  carry: 'prior memory closure carries 铃兰-Phase1-0621 into the next execution callback instead of resetting to a fresh helper task.',
                  nextLearningAction: 'verify',
                },
                emotion: {
                  afterglow: 'prior memory closure changes the next emotional afterglow into quieter continuity residue.',
                  residue: 'prior memory closure keeps 铃兰-Phase1-0621 as continuity emotional residue.',
                },
                embodiment: {
                  reason: 'prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
                  cadence: 'body voice face motion lipsync measured-return',
                },
              },
              selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621'],
              memoryIdentity,
              reasonTags: [
                'memory-closure-trace',
                'fallback-memory-closure',
                'why-surfaced',
                'memory-reconsolidated',
                'forget-stale-noise',
                'proactive-opening',
                'execution-callback',
                'emotional_transition:execution-callback-afterglow',
                'body-voice-face-motion-lipsync',
              ],
            },
          },
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: {
            residentMode: 'continuity-face-line',
            emotion: 'measured-companionship',
            facialCue: 'soft-gaze',
          },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: {
            bodyLine: 'body stays with the continuity renderer line',
          },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-ui-user-memory-closure-causality',
          previousEmotion: null,
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: {
            valence: 0.04,
            arousal: -0.08,
            guardedness: -0.04,
            closenessDrive: 0.02,
            repairNeed: -0.03,
            initiativePressure: -0.06,
          },
          changedAxes: ['arousal', 'repairNeed', 'initiativePressure'],
          sourceTags: [
            'memory-closure-trace',
            'runtime-derived-downstream-state',
            'fallback-memory-closure',
          ],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'prior memory closure keeps 铃兰-Phase1-0621 as continuity emotional residue.',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
            memoryClosureCausality: causalityFor(
              'initiative',
              'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
            ),
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
          },
          traceSummary: 'prior memory closure handoff changed next-turn emotional state: prior memory closure changes the next emotional afterglow into quieter continuity residue.',
          replayLine: 'prior memory closure handoff carried forward into next-turn emotional afterglow and continuity body voice face motion lipsync.',
          memoryClosureCausality: causalityFor(
            'emotion',
            'prior memory closure changes the next emotional afterglow into quieter continuity residue.',
          ),
        },
        learningExecutionState: {
          currentTaskId: null,
          currentStatus: null,
          currentAttemptCount: 0,
          currentMaxAttempts: 0,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['memory-closure', 'execution-callback', '铃兰-Phase1-0621'],
          queuedTaskCount: 0,
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
          updatedAt: 1_700_000_000_001,
          memoryClosureCausality: causalityFor(
            'execution',
            'prior memory closure carries 铃兰-Phase1-0621 into the next execution callback instead of resetting to a fresh helper task.',
          ),
        },
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-ui-user-memory-closure-causality',
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'cross-modal-continuity',
            reason: 'prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
          },
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync | prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
          replayLine: 'body voice face motion lipsync carried continuity through memory closure emotional afterglow.',
          sourceTags: [
            'memory-closure-trace',
            'runtime-derived-downstream-state',
            'fallback-memory-closure',
          ],
          memoryClosureCausality: causalityFor(
            'embodiment',
            'prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
          ),
        },
        summary: 'emotion_transition=softened | execution_learning=memory-closure-causal | embodiment_phase=fully-rejoined | source=main-runtime | memory_closure=runtime-derived-downstream-state',
      },
    }

    expect(__alicizationTestOnly.hasRuntimeSamplingTraceDownstreamStateEvidence([traceRecord as any]))
      .toBe(true)
    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: true,
        execution: true,
        embodiment: true,
        memoryIdentity: true,
        missingLanes: [],
      })
  })

  it('selects the strongest runtime sampling provenance trace when sibling events contain the explicit downstream closure state', () => {
    const genericTraceRecord = {
      decisionTraceId: 'mind:runtime:provenance-selection',
      turnId: 'turn-runtime-provenance-selection',
      sessionId: 'session-runtime-provenance-selection',
      origin: 'user-turn' as const,
      activeThreadId: null,
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['dialogue-emitted' as const],
      governance: {
        digitalLifeSpine: {
          memory: {
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [{ summary: 'why recall surfaced now: generic cluster remained inward.' }],
              nextInfluence: {
                initiative: { reason: 'generic measured return' },
              },
              memoryIdentity: {
                continuityKey: 'cluster:2026-w25:during:2026-w25:strongest',
                selectedCandidateIds: [],
                reasonTags: ['memory-identity:cluster:2026-w25:during:2026-w25:strongest'],
              },
              reasonTags: ['memory-closure-trace', 'memory-os-authority', 'gate:inward-only'],
            },
          },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        emotionalTransitionLedger: {
          transitionKind: 'stable',
          changedAxes: [],
          axisDeltas: {},
        },
      },
    }
    const explicitTraceRecord = {
      ...genericTraceRecord,
      eventKinds: ['persistence-written' as const],
      governance: {
        digitalLifeSpine: {
          memory: {
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [{ summary: 'why recall surfaced now: explicit memory handoff for 铃兰-Phase1-0621C asked this line to return.' }],
              nextInfluence: {
                initiative: {
                  reason: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
                  restraint: 'measured-return',
                  preferredTiming: 'after-payoff',
                },
                execution: {
                  carry: 'prior memory closure carries 铃兰-Phase1-0621C into the next execution callback instead of resetting.',
                },
                emotion: {
                  afterglow: 'prior memory closure changes the next emotional afterglow into quieter continuity residue.',
                },
                embodiment: {
                  reason: 'prior memory closure changes body voice face motion lipsync into softer indexing callback evidence',
                  cadence: 'body voice face motion lipsync measured-return',
                },
              },
              memoryIdentity: {
                continuityKey: 'fallback:铃兰-phase1-0621c',
                selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621c'],
                reasonTags: ['memory-identity:fallback:铃兰-phase1-0621c'],
              },
              reasonTags: [
                'memory-closure-trace',
                'fallback-memory-closure',
                'why-surfaced',
                'memory-reconsolidated',
                'forget-stale-noise',
                'proactive-opening',
                'execution-callback',
                'emotional_transition:execution-callback-afterglow',
                'body-voice-face-motion-lipsync',
              ],
            },
          },
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: { residentMode: 'continuity-face-line', emotion: 'measured-companionship', facialCue: 'soft-gaze' },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: { bodyLine: 'body stays with the continuity renderer line' },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        emotionalTransitionLedger: {
          transitionKind: 'softened',
          changedAxes: ['arousal', 'initiativePressure'],
          axisDeltas: { arousal: -0.08, initiativePressure: -0.06 },
          traceSummary: 'prior memory closure changed next-turn emotional state',
          replayLine: 'prior memory closure carried emotional afterglow forward',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'emotion',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:铃兰-phase1-0621c',
              selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621c'],
              reasonTags: ['memory-identity:fallback:铃兰-phase1-0621c'],
            },
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'prior memory closure changes the next proactive opening',
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'initiative',
              causedByMemoryClosure: true,
              memoryIdentity: {
                continuityKey: 'fallback:铃兰-phase1-0621c',
                selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621c'],
                reasonTags: ['memory-identity:fallback:铃兰-phase1-0621c'],
              },
            },
          },
        },
        learningExecutionState: {
          nextLearningAction: 'verify',
          shouldReflect: true,
          shouldVerify: true,
          activeLearningFocuses: ['memory-closure', 'execution-callback', '铃兰-Phase1-0621C'],
          lastCompletedSummary: 'prior memory closure carries 铃兰-Phase1-0621C into the next execution callback',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'execution',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:铃兰-phase1-0621c',
              selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621c'],
              reasonTags: ['memory-identity:fallback:铃兰-phase1-0621c'],
            },
          },
        },
        embodimentContinuityLedger: {
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          traceSummary: 'prior memory closure changes body voice face motion lipsync',
          replayLine: 'body voice face motion lipsync carried continuity memory closure',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'embodiment',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:铃兰-phase1-0621c',
              selectedCandidateIds: ['fallback-memory-closure:铃兰-phase1-0621c'],
              reasonTags: ['memory-identity:fallback:铃兰-phase1-0621c'],
            },
          },
        },
      },
    }

    const selected = __alicizationTestOnly.selectRuntimeSamplingProvenanceTrace([
      genericTraceRecord as any,
      explicitTraceRecord as any,
    ])

    expect(selected).toBe(explicitTraceRecord)
    expect(__alicizationTestOnly.hasRuntimeSamplingTraceDownstreamStateEvidence([
      genericTraceRecord as any,
      {
        ...explicitTraceRecord,
        eventKinds: ['governance-normalized' as const, 'dialogue-emitted' as const],
      } as any,
    ]))
      .toBe(true)
  })

  it('accepts quiet-companionship resident fields as concrete cross-modal runtime surface evidence', () => {
    const traceRecord = {
      decisionTraceId: 'mind:runtime:quiet-companionship-cross-modal-surface',
      turnId: 'turn-runtime-quiet-companionship-cross-modal-surface',
      sessionId: 'session-runtime-quiet-companionship-cross-modal-surface',
      origin: 'user-turn' as const,
      activeThreadId: 'thread-runtime-quiet-companionship-cross-modal-surface',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['governance-normalized' as const, 'persistence-written' as const, 'dialogue-emitted' as const],
      governance: {
        digitalLifeSpine: {
          memory: {
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [{ summary: 'why recall surfaced now: quiet-companionship cross-modal surface should stay traceable.' }],
              nextInfluence: {
                initiative: {
                  reason: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
                  restraint: 'measured-return',
                  preferredTiming: 'after-payoff',
                },
                execution: {
                  carry: 'prior memory closure carries quiet-companionship cross-modal surface into the next execution callback.',
                },
                emotion: {
                  afterglow: 'prior memory closure changes the next emotional afterglow.',
                },
                embodiment: {
                  reason: 'prior memory closure changes body voice face motion lipsync into quiet-companionship carry.',
                  cadence: 'body voice face motion lipsync quiet-companionship',
                },
              },
              memoryIdentity: {
                continuityKey: 'fallback:quiet-companionship-cross-modal',
                selectedCandidateIds: ['fallback-memory-closure:quiet-companionship-cross-modal'],
                reasonTags: ['memory-identity:fallback:quiet-companionship-cross-modal'],
              },
              reasonTags: ['memory-closure-trace', 'fallback-memory-closure', 'why-surfaced'],
            },
          },
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'quiet-companionship' },
          face: { residentMode: 'quiet-companionship', emotion: 'thinking', facialCue: 'relaxed' },
          motion: { residentMode: 'quiet-companionship' },
          lipSync: { residentMode: 'quiet-companionship' },
          bodyContinuity: { bodyLine: 'continuity body continuity stays present' },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-quiet-companionship-cross-modal-surface',
          previousEmotion: 'focused',
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: {
            valence: 0.04,
            arousal: -0.08,
            guardedness: -0.04,
            closenessDrive: 0.02,
            repairNeed: -0.03,
            initiativePressure: -0.06,
          },
          changedAxes: ['arousal', 'repairNeed', 'initiativePressure'],
          sourceTags: ['memory-closure-trace', 'runtime-derived-downstream-state', 'fallback-memory-closure'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'prior memory closure keeps the emotional afterglow available',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'prior memory closure changes the next proactive opening',
            memoryClosureCausality: {
              causalSource: 'memory-closure-trace',
              affectedLane: 'initiative',
              causedByMemoryClosure: true,
              memoryIdentity: {
                continuityKey: 'fallback:quiet-companionship-cross-modal',
                selectedCandidateIds: ['fallback-memory-closure:quiet-companionship-cross-modal'],
                reasonTags: ['memory-identity:fallback:quiet-companionship-cross-modal'],
              },
            },
          },
          traceSummary: 'prior memory closure changed next-turn emotional state',
          replayLine: 'prior memory closure carried emotional afterglow forward',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'emotion',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:quiet-companionship-cross-modal',
              selectedCandidateIds: ['fallback-memory-closure:quiet-companionship-cross-modal'],
              reasonTags: ['memory-identity:fallback:quiet-companionship-cross-modal'],
            },
          },
        },
        learningExecutionState: {
          nextLearningAction: 'verify',
          shouldReflect: true,
          shouldVerify: true,
          activeLearningFocuses: ['memory-closure', 'execution-callback'],
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'execution',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:quiet-companionship-cross-modal',
              selectedCandidateIds: ['fallback-memory-closure:quiet-companionship-cross-modal'],
              reasonTags: ['memory-identity:fallback:quiet-companionship-cross-modal'],
            },
          },
        },
        embodimentContinuityLedger: {
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          traceSummary: 'prior memory closure changes body voice face motion lipsync',
          replayLine: 'body voice face motion lipsync carried continuity memory closure',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'embodiment',
            causedByMemoryClosure: true,
            memoryIdentity: {
              continuityKey: 'fallback:quiet-companionship-cross-modal',
              selectedCandidateIds: ['fallback-memory-closure:quiet-companionship-cross-modal'],
              reasonTags: ['memory-identity:fallback:quiet-companionship-cross-modal'],
            },
          },
        },
      },
    }

    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: true,
        execution: true,
        embodiment: true,
        memoryIdentity: true,
        missingLanes: [],
      })
  })

  it('does not accept emotional causality without concrete emotional state movement', () => {
    const traceRecord = {
      decisionTraceId: 'mind:runtime:trace-only-emotion',
      turnId: 'turn-runtime-trace-only-emotion',
      sessionId: 'session-runtime-trace-only-emotion',
      origin: 'user-turn' as const,
      activeThreadId: 'thread-runtime-trace-only-emotion',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['persistence-written' as const],
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-trace-only-emotion',
          previousEmotion: 'measured-companionship',
          nextEmotion: 'measured-companionship',
          transitionKind: 'stable',
          axisDeltas: {
            valence: 0,
            arousal: 0,
            guardedness: 0,
            closenessDrive: 0,
            repairNeed: 0,
            initiativePressure: 0,
          },
          changedAxes: [],
          sourceTags: ['runtime-derived-downstream-state'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'Text says emotional afterglow stayed available.',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'Return with restraint.',
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'Body voice face motion lipsync express the current state.',
          },
          traceSummary: 'emotional afterglow stayed smooth',
          replayLine: 'emotional afterglow and callback residue stayed continuity',
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'emotion',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause claims the prior recall changed this emotional state',
          },
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: false,
        initiative: false,
        execution: false,
        embodiment: false,
        memoryIdentity: true,
        missingLanes: ['emotion', 'initiative', 'execution', 'embodiment'],
      })
  })

  it('does not close downstream state when lanes point at different memory identities', () => {
    const causalityFor = (
      affectedLane: 'emotion' | 'initiative' | 'execution' | 'embodiment',
      continuityKey: string,
    ) => ({
      causalSource: 'memory-closure-trace',
      affectedLane,
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', `memory-identity:${continuityKey}`],
      memoryIdentity: {
        selectedCandidateIds: [continuityKey],
        continuityKey,
        reasonTags: [`memory-identity:${continuityKey}`],
      },
      summary: `structured cause links ${affectedLane} to ${continuityKey}`,
    })

    const traceRecord = {
      decisionTraceId: 'mind:runtime:split-downstream-memory-identity',
      turnId: 'turn-runtime-split-downstream-memory-identity',
      sessionId: 'session-runtime-split-downstream-memory-identity',
      origin: 'subconscious-proactive' as const,
      activeThreadId: 'thread-runtime-split-downstream-memory-identity',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: [
        'governance-normalized' as const,
        'persistence-written' as const,
        'memory-reconsolidated' as const,
      ],
      memoryReconsolidated: {
        source: 'execution-result-feedback',
        memoryClosureExecution: {
          authority: 'memory-os',
          carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
          reasonTags: ['memory-os', 'execution-feedback'],
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: {
            residentMode: 'continuity-face-line',
            emotion: 'measured-companionship',
            facialCue: 'soft-gaze',
          },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: {
            bodyLine: 'body stays with the continuity renderer line',
          },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-split-downstream-memory-identity',
          previousEmotion: 'focused',
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: {
            valence: 0,
            arousal: -0.1,
            guardedness: 0,
            closenessDrive: 0,
            repairNeed: 0,
            initiativePressure: -0.1,
          },
          changedAxes: ['arousal', 'initiativePressure'],
          sourceTags: ['runtime-derived-downstream-state'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'Keep the later recall state available.',
          },
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'Return with restraint.',
            memoryClosureCausality: causalityFor('initiative', 'memory-identity-initiative'),
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'Body voice face motion lipsync express the current state.',
          },
          traceSummary: 'emotional afterglow stayed smooth',
          replayLine: 'emotional afterglow and callback residue stayed continuity',
          memoryClosureCausality: causalityFor('emotion', 'memory-identity-emotion'),
        },
        learningExecutionState: {
          currentTaskId: 'learning-task-split-identity',
          currentStatus: 'scheduled',
          currentAttemptCount: 0,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['indexing-callback-evidence'],
          queuedTaskCount: 1,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: [],
          lastCompletedTaskId: null,
          lastCompletedAction: null,
          lastCompletedSummary: 'structured state says execution callback carry exists',
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_700_000_000_001,
          memoryClosureCausality: causalityFor('execution', 'memory-identity-execution'),
        },
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-split-downstream-memory-identity',
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'cross-modal-continuity',
            reason: 'Body voice face motion lipsync carried together.',
          },
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
          replayLine: 'body voice face motion lipsync stayed continuity',
          sourceTags: ['runtime-derived-downstream-state'],
          memoryClosureCausality: causalityFor('embodiment', 'memory-identity-embodiment'),
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.hasRuntimeSamplingTraceDownstreamStateEvidence([traceRecord as any]))
      .toBe(false)
    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: true,
        initiative: true,
        execution: true,
        embodiment: true,
        memoryIdentity: false,
        missingLanes: ['memoryIdentity'],
      })
  })

  it('surfaces a repair target when downstream lanes split memory identity', () => {
    const causalityFor = (
      affectedLane: 'emotion' | 'initiative' | 'execution' | 'embodiment',
      continuityKey: string,
    ) => ({
      causalSource: 'memory-closure-trace',
      affectedLane,
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      reasonTags: ['memory-closure-trace', `memory-identity:${continuityKey}`],
      memoryIdentity: {
        selectedCandidateIds: [continuityKey],
        continuityKey,
        reasonTags: [`memory-identity:${continuityKey}`],
      },
      summary: `memory closure causally shaped ${affectedLane}`,
    })
    const traceRecord = {
      decisionTraceId: 'mind:runtime:split-downstream-repair',
      turnId: 'turn-split-downstream-repair',
      sessionId: 'session-split-downstream-repair',
      origin: 'subconscious-proactive' as const,
      activeThreadId: 'thread-split-downstream-repair',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['memory-reconsolidated' as const, 'persistence-written' as const],
      memoryReconsolidated: {
        source: 'execution-result-feedback',
        memoryClosureExecution: {
          authority: 'memory-os',
          carry: 'Carry the callback result into the next same-person reply.',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
        },
      },
      embodimentAuthority: {
        digitalLife: {
          voice: { residentMode: 'continuity-voice-line' },
          face: {
            residentMode: 'continuity-face-line',
            emotion: 'measured-companionship',
            facialCue: 'soft-gaze',
          },
          motion: { residentMode: 'continuity-motion-line' },
          lipSync: { residentMode: 'continuity-lipsync-line' },
          bodyContinuity: {
            bodyLine: 'body stays with the continuity renderer line',
          },
        },
      },
      governance: {
        digitalLifeSpine: {
          memory: {
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [{
                summary: 'why recall surfaced now: corrected memory must shape proactive opening, execution callback, emotional afterglow, and body voice face motion lipsync expression.',
              }],
              nextInfluence: {
                initiative: {
                  reason: 'corrected memory keeps the next proactive opening lower-pressure',
                },
                execution: {
                  carry: 'corrected memory keeps execution callback from resetting',
                },
                emotion: {
                  afterglow: 'corrected memory makes emotional afterglow quieter',
                },
                embodiment: {
                  reason: 'corrected memory changes body voice face motion lipsync expression',
                  cadence: 'body voice face motion lipsync measured-return',
                },
              },
              reasonTags: ['memory-closure-trace', 'proactive-opening', 'execution-callback', 'emotional_transition:execution-callback-afterglow', 'body-voice-face-motion-lipsync'],
            },
          },
        },
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        emotionalTransitionLedger: {
          version: 'emotional-transition-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-split-downstream-repair',
          previousEmotion: 'focused',
          nextEmotion: 'measured-companionship',
          transitionKind: 'softened',
          axisDeltas: { arousal: -0.1 },
          changedAxes: ['arousal'],
          sourceTags: ['runtime-derived-downstream-state'],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'emotional-continuity',
            reason: 'emotional afterglow stayed available for later recall',
          },
          embodimentDrive: {
            shouldDrive: true,
            tone: 'measured-return',
            reason: 'body voice face motion lipsync express the current state',
          },
          traceSummary: 'memory closure emotional transition stayed smooth',
          replayLine: 'emotional afterglow stayed continuity',
          memoryClosureCausality: causalityFor('emotion', 'memory-identity-emotion'),
          initiativeSuppression: {
            shouldSuppress: false,
            mode: 'measured-return',
            reason: 'proactive opening stays lower-pressure',
            memoryClosureCausality: causalityFor('initiative', 'memory-identity-initiative'),
          },
        },
        learningExecutionState: {
          currentTaskId: 'learning-task-split-downstream-repair',
          currentStatus: 'scheduled',
          currentAttemptCount: 0,
          currentMaxAttempts: 1,
          currentNextRetryAt: null,
          currentBlockedReason: null,
          currentFailureKind: null,
          nextLearningAction: 'verify',
          shouldRecord: false,
          shouldReflect: true,
          shouldVerify: true,
          shouldRevise: false,
          shouldInternalize: false,
          activeLearningFocuses: ['indexing-callback-evidence'],
          queuedTaskCount: 1,
          runningTaskCount: 0,
          blockedTaskCount: 0,
          recentTaskIds: [],
          lastCompletedTaskId: null,
          lastCompletedAction: null,
          lastCompletedSummary: 'execution callback carry stays active',
          lastFailureTaskId: null,
          lastFailureKind: null,
          lastFailureReason: null,
          lastFailureNextRetryAt: null,
          updatedAt: 1_700_000_000_001,
          memoryClosureCausality: causalityFor('execution', 'memory-identity-execution'),
        },
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-split-downstream-repair',
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'cross-modal-continuity',
            reason: 'body voice face motion lipsync stayed together',
          },
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
          replayLine: 'body voice face motion lipsync stayed continuity',
          sourceTags: ['runtime-derived-downstream-state'],
          memoryClosureCausality: causalityFor('embodiment', 'memory-identity-embodiment'),
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.buildRuntimeSamplingRepairTargets({
      sessions: [{
        sessionId: 'session-split-downstream-repair',
        turns: [{
          turnId: 'turn-split-downstream-repair',
          sessionId: 'session-split-downstream-repair',
          createdAt: 1_700_000_000_001,
          memoryIdentityKeys: [],
          tracePointer: {
            kind: 'decision-trace',
            decisionTraceId: 'mind:runtime:split-downstream-repair',
            turnId: 'turn-split-downstream-repair',
            sessionId: 'session-split-downstream-repair',
          },
        }],
      } as any],
      traceEventCoverage: {
        decisionTraceTurnCount: 1,
        verifiedTraceEventTurnCount: 1,
        missingTraceEventTurnCount: 0,
        allRuntimeDecisionTracesVerified: true,
        runtimeRoleCompleteTraceTurnCount: 1,
        missingRuntimeRoleTraceTurnCount: 0,
        allRuntimeDecisionTracesRoleComplete: true,
        runtimeDownstreamStateTraceTurnCount: 0,
        missingRuntimeDownstreamStateTraceTurnCount: 1,
        allRuntimeDecisionTracesDownstreamStateComplete: false,
      },
      verifiedDecisionTraceIds: new Set(['mind:runtime:split-downstream-repair']),
      roleCompleteDecisionTraceIds: new Set(['mind:runtime:split-downstream-repair']),
      downstreamStateCompleteDecisionTraceIds: new Set<string>(),
      traceRecordsByDecisionTraceId: new Map([
        ['mind:runtime:split-downstream-repair', [traceRecord as any]],
      ]),
      shouldAddTraceEventRepair: false,
      shouldAddTraceRoleRepair: false,
      shouldAddTraceDownstreamStateRepair: true,
    } as any)).toEqual([
      expect.objectContaining({
        lane: 'memory',
        missingTurnCount: 1,
        missingTransitionCount: 0,
        affectedSessionIds: ['session-split-downstream-repair'],
        sampleTurnIds: ['turn-split-downstream-repair'],
        reasons: expect.arrayContaining([
          'memory-identity-mismatch',
          'missing-downstream-memory-identity',
        ]),
      }),
    ])
  })

  it('does not accept trace-only embodiment ledger claims without runtime authority surface evidence', () => {
    const traceRecord = {
      decisionTraceId: 'mind:runtime:trace-only-embodiment',
      turnId: 'turn-runtime-trace-only-embodiment',
      sessionId: 'session-runtime-trace-only-embodiment',
      origin: 'user-turn' as const,
      activeThreadId: 'thread-runtime-trace-only-embodiment',
      createdAt: 1_700_000_000_000,
      lastUpdatedAt: 1_700_000_000_001,
      eventKinds: ['persistence-written' as const],
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 1_700_000_000_001,
        embodimentContinuityLedger: {
          version: 'embodiment-continuity-ledger-v1',
          createdAt: 1_700_000_000_001,
          turnId: 'turn-runtime-trace-only-embodiment',
          continuityPhase: 'fully-rejoined',
          carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          droppedLanes: [],
          rejoinedLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
          pendingRejoinLanes: [],
          memoryWriteback: {
            shouldWrite: true,
            lane: 'cross-modal-continuity',
            reason: 'Body voice face motion lipsync carried together.',
          },
          traceSummary: 'phase=fully-rejoined | carrying=body,voice,face,motion,lipsync',
          replayLine: 'body voice face motion lipsync stayed continuity',
          sourceTags: ['runtime-derived-downstream-state'],
          memoryClosureCausality: {
            causalSource: 'memory-closure-trace',
            affectedLane: 'embodiment',
            causedByMemoryClosure: true,
            traceAuthority: 'memory-os',
            reasonTags: ['memory-closure-trace', 'runtime-derived-downstream-state'],
            summary: 'structured cause links the prior recall to this embodied state',
          },
        },
        summary: 'source=main-runtime',
      },
    }

    expect(__alicizationTestOnly.readRuntimeSamplingTraceDownstreamStateLanes([traceRecord as any]))
      .toEqual({
        emotion: false,
        initiative: false,
        execution: false,
        embodiment: false,
        memoryIdentity: true,
        missingLanes: ['emotion', 'initiative', 'execution', 'embodiment'],
      })
  })

  it('keeps presence gate open until runtime memory closure long-run causal identity closes', () => {
    const shipGate = __alicizationTestOnly.buildReplayBenchmarkShipGate({
      report: {
        gate: {
          passed: true,
          failingKeys: [],
        },
        telemetryPatch: {
          retrievalHealth: {
            semanticLatencyMs: 50,
            graphLatencyMs: 50,
            wrongThreadRate: 0,
            staleSelfModelVetoRate: 0,
            relationshipEraConfusionRate: 0,
            templateLeakageFailCount: 0,
            quietCompanionshipCoverage: 1,
            silentPresenceNuisanceRate: 0,
            continuityMindCarryRate: 1,
            longRunContinuityClosureRate: 1,
            longRunContinuitySessionClosureRate: 1,
            runtimeLongRunContinuitySessionClosureRate: 1,
            runtimeMemoryClosureLongRunClosureRate: 0,
          },
        },
        datasetFeedback: {
          humanRatingRubric: {
            dimensions: [{}],
          },
          paritySummary: null,
          authoritySummary: null,
          memoryClosureLongRun: {
            status: 'insufficient',
            turnCount: 3,
            requiredTurnCount: 3,
            stableMemoryIdentity: false,
            dominantMemoryIdentityKey: null,
            dominantMemoryIdentityKeys: [],
            transitionBreaks: ['turn-a->turn-b'],
            failureReasons: ['missing-causal-memory-identity'],
            turnDiagnostics: [],
          },
        },
      } as any,
      finalReplayGate: {
        passed: true,
        failingKeys: [],
      } as any,
    })

    expect(shipGate).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'presence-qa-gate',
        status: 'fail',
        detail: expect.stringContaining('runtimeMemoryClosureLongRunClosureRate=0'),
      }),
      expect.objectContaining({
        key: 'presence-qa-gate',
        detail: expect.stringContaining('missingRealDesktopMemoryClosureProof'),
      }),
    ]))
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
  }, 120_000)

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

  it('fails learning self-revision roundtrip when Memory OS execution carry reconsolidates but replay turns do not consume it', async () => {
    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-memory-os-execution-roundtrip-gap-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-memory-os-execution-roundtrip-gap-1',
        userText: '刚才执行回调已经回来，这轮有没有把 Memory OS 的携带吃进去？',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-memory-os-execution-roundtrip-gap-1',
          decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-gap:1',
          sessionId: 'session-memory-os-execution-roundtrip-gap-1',
          activeThreadId: 'thread-memory-os-execution-roundtrip-gap-1',
        },
        replayTurn: {
          turnId: 'turn-memory-os-execution-roundtrip-gap-1',
          userText: '刚才执行回调已经回来，这轮有没有把 Memory OS 的携带吃进去？',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-memory-os-execution-roundtrip-gap-1',
            decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-gap:1',
            sessionId: 'session-memory-os-execution-roundtrip-gap-1',
            activeThreadId: 'thread-memory-os-execution-roundtrip-gap-1',
          },
          sampledCategories: ['procedure-carry', 'long-horizon'],
          organicMemoryContext: {
            hostAttitude: 'focused',
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
              dominantTrajectory: 'execution feedback should become memory closure authority',
              relationshipDoctrine: 'verify execution callbacks before widening initiative',
              latestInflection: 'Memory OS reconsolidated the execution callback carry',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'hold',
              nextLearningReason: 'the replay turn failed to consume the execution carry',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: false,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['self-revision-policy-feedback'],
              sourceSignals: ['memory-os:execution-feedback'],
              summary: 'the execution callback carry is not active in this replay turn',
            },
            learningExecutionState: {
              currentTaskId: null,
              currentStatus: null,
              currentAttemptCount: 0,
              currentMaxAttempts: 0,
              currentNextRetryAt: null,
              currentBlockedReason: null,
              currentFailureKind: null,
              nextLearningAction: 'hold',
              shouldRecord: false,
              shouldReflect: false,
              shouldVerify: false,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['self-revision-policy-feedback'],
              queuedTaskCount: 0,
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
            id: 'evt-memory-os-execution-roundtrip-gap-1',
            decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-gap:1',
            turnId: 'turn-memory-os-execution-roundtrip-gap-1',
            sessionId: 'session-memory-os-execution-roundtrip-gap-1',
            origin: 'user-turn',
            kind: 'memory-reconsolidated',
            payload: {
              source: 'execution-result-feedback',
              memoryClosureExecution: {
                authority: 'memory-os',
                carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
                nextLearningAction: 'verify',
                shouldVerify: true,
                shouldReflect: true,
                activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
                reasonTags: ['memory-os', 'execution-feedback'],
              },
            },
            createdAt: 1_700_000_000_000,
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

  it('keeps learning self-revision roundtrip passing when replay turns consume Memory OS execution carry', async () => {
    const replayTurns = await replayMainChatSession({
      turns: [
        {
          turnId: 'turn-memory-os-execution-roundtrip-closed-1',
          userText: '刚才执行回调已经回来，这轮有没有把 Memory OS 的携带吃进去？',
          organicMemoryContext: {
            hostAttitude: 'focused',
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
              dominantTrajectory: 'execution feedback should become memory closure authority',
              relationshipDoctrine: 'verify execution callbacks before widening initiative',
              latestInflection: 'Memory OS reconsolidated the execution callback carry',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'verify',
              nextLearningReason: 'the execution callback carry is being actively verified',
              shouldRecord: false,
              shouldReflect: true,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['memory closure authority'],
              sourceSignals: ['memory-os:execution-feedback'],
              summary: 'the execution callback carry is active in this replay turn',
            } as any,
            learningExecutionState: {
              currentTaskId: 'learning-task-memory-os-execution-closed-1',
              currentStatus: 'scheduled',
              currentAttemptCount: 0,
              currentMaxAttempts: 1,
              currentNextRetryAt: null,
              currentBlockedReason: null,
              currentFailureKind: null,
              nextLearningAction: 'verify',
              shouldRecord: false,
              shouldReflect: true,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['memory closure authority'],
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
    expect(replayTurns[0]?.turnGraph.learning.activeLearningFocuses).toEqual(['memory closure authority'])

    const meta = new Map<string, string>()
    meta.set(replayBenchmarkRuntimeSamplingBacklogKey, JSON.stringify([
      {
        id: 'runtime-memory-os-execution-roundtrip-closed-1',
        packId: 'sampled-humanlike-memory-v1',
        turnId: 'turn-memory-os-execution-roundtrip-closed-1',
        userText: '刚才执行回调已经回来，这轮有没有把 Memory OS 的携带吃进去？',
        failingDimensions: [],
        tracePointer: {
          kind: 'decision-trace',
          packId: 'sampled-humanlike-memory-v1',
          turnId: 'turn-memory-os-execution-roundtrip-closed-1',
          decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-closed:1',
          sessionId: 'session-memory-os-execution-roundtrip-closed-1',
          activeThreadId: 'thread-memory-os-execution-roundtrip-closed-1',
        },
        replayTurn: {
          turnId: 'turn-memory-os-execution-roundtrip-closed-1',
          userText: '刚才执行回调已经回来，这轮有没有把 Memory OS 的携带吃进去？',
          tracePointer: {
            kind: 'decision-trace',
            packId: 'sampled-humanlike-memory-v1',
            turnId: 'turn-memory-os-execution-roundtrip-closed-1',
            decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-closed:1',
            sessionId: 'session-memory-os-execution-roundtrip-closed-1',
            activeThreadId: 'thread-memory-os-execution-roundtrip-closed-1',
          },
          sampledCategories: ['procedure-carry', 'long-horizon'],
          organicMemoryContext: {
            hostAttitude: 'focused',
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
              dominantTrajectory: 'execution feedback should become memory closure authority',
              relationshipDoctrine: 'verify execution callbacks before widening initiative',
              latestInflection: 'Memory OS reconsolidated the execution callback carry',
              burdenLine: null,
              trustMeaning: null,
              nextLearningAction: 'verify',
              nextLearningReason: 'the execution callback carry is being actively verified',
              shouldRecord: false,
              shouldReflect: true,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['memory closure authority'],
              sourceSignals: ['memory-os:execution-feedback'],
              summary: 'the execution callback carry is active in this replay turn',
            },
            learningExecutionState: {
              currentTaskId: 'learning-task-memory-os-execution-closed-1',
              currentStatus: 'scheduled',
              currentAttemptCount: 0,
              currentMaxAttempts: 1,
              currentNextRetryAt: null,
              currentBlockedReason: null,
              currentFailureKind: null,
              nextLearningAction: 'verify',
              shouldRecord: false,
              shouldReflect: true,
              shouldVerify: true,
              shouldRevise: false,
              shouldInternalize: false,
              activeLearningFocuses: ['memory closure authority'],
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
            id: 'evt-memory-os-execution-roundtrip-closed-1',
            decisionTraceId: 'mind:runtime:memory-os-execution-roundtrip-closed:1',
            turnId: 'turn-memory-os-execution-roundtrip-closed-1',
            sessionId: 'session-memory-os-execution-roundtrip-closed-1',
            origin: 'user-turn',
            kind: 'memory-reconsolidated',
            payload: {
              source: 'execution-result-feedback',
              memoryClosureExecution: {
                authority: 'memory-os',
                carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
                nextLearningAction: 'verify',
                shouldVerify: true,
                shouldReflect: true,
                activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
                reasonTags: ['memory-os', 'execution-feedback'],
              },
            },
            createdAt: 1_700_000_000_000,
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
    expect(result.finalReplayGate.failingKeys).not.toContain('learning-self-revision-roundtrip')
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
