import type {
  LocalAppBlackboxTrialReport,
} from '../../../../scripts/local-app-blackbox-trial-runtime'
import type { MemoryProductionTrialReport } from './memory-production-trial-runner'

import { EventEmitter } from 'node:events'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { describe, expect, it, vi } from 'vitest'

import {
  assessFailedTurnMemoryLeaks,
  assessLocalAppCompressionEvidence,
  assessLocalAppMemoryExpectations,
  assessLocalAppProviderRequestEvidence,
  assessLocalAppSingleSession,
  buildLocalAppChatAbortRequest,
  buildLocalAppProductionTrialReport,
  countFailedTurnMemoryLeaks,
  createPlaywrightLocalAppBlackboxAutomation,
  findMemoryRecallQuery,
  isLocalAppMainRendererUrl,
  localAppIconButtonXPath,
  navigateLocalAppPageToHashRoute,
  parseLocalAppBlackboxTrialArgs,
  readLocalAppMemoryClosureSnapshot,
  readLocalAppProviderRequestEvidence,
  readLocalAppRuntimeRecall,
  readRuntimeDebugTraceSince,
  resolveLocalAppChatRuntimeEvidence,
  resolveLocalAppChatTurnState,
  resolveLocalAppMemoryDatabasePath,
  runLocalAppBlackboxTrial,
  runLocalAppProductionTrial,
  validateLocalAppProductionMessageCount,
  waitForLocalAppMemoryClosure,
} from '../../../../scripts/local-app-blackbox-trial-runtime'

function runSql(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<void>((resolve, reject) => {
    database.run(sql, params, (error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function closeSql(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

async function createRuntimeEventsTable(database: sqlite3.Database) {
  await runSql(database, `
    CREATE TABLE alicization_runtime_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      occurred_at INTEGER NOT NULL,
      sequence INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    )
  `)
}

async function createRecallProvenanceTables(
  database: sqlite3.Database,
  options: {
    omitTombstoneTable?: boolean
    omitVectorStatus?: boolean
  } = {},
) {
  await runSql(database, `
    CREATE TABLE memory_facts (
      id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      validation_status TEXT,
      PRIMARY KEY(card_id, id)
    )
  `)
  await runSql(database, `
    CREATE TABLE memory_reflections (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      status TEXT
    )
  `)
  await runSql(database, `
    CREATE TABLE episodic_events (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL
    )
  `)
  await runSql(database, `
    CREATE TABLE memory_consolidations (
      id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      PRIMARY KEY(card_id, id)
    )
  `)
  await runSql(database, `
    CREATE TABLE long_term_memory_search_documents (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      tombstoned INTEGER NOT NULL DEFAULT 0
    )
  `)
  await runSql(database, `
    CREATE TABLE long_term_memory_vectors (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source TEXT NOT NULL
      ${options.omitVectorStatus ? '' : ', status TEXT NOT NULL'}
    )
  `)
  if (!options.omitTombstoneTable) {
    await runSql(database, `
      CREATE TABLE long_term_memory_tombstones (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source TEXT NOT NULL
      )
    `)
  }
}

function buildProductionTrialMessages(count = 20) {
  return Array.from({ length: count }, (_, index) => `第 ${index + 1} 轮真实对话`)
}

function buildProviderRequestTrace(input: {
  messages: string[]
  compressedFromTurn?: number | null
  recalledWithoutEvidenceAtTurn?: number | null
  recallByTurn?: Record<number, {
    status: 'recalled' | 'empty'
    evidenceIds: string[]
  }>
}) {
  return input.messages.map((_, index) => {
    const turn = index + 1
    const configuredRecall = input.recallByTurn?.[turn]
    const falsePositive = input.recalledWithoutEvidenceAtTurn === turn
    const recall = configuredRecall ?? (falsePositive
      ? {
          status: 'recalled' as const,
          evidenceIds: [],
        }
      : {
          status: 'empty' as const,
          evidenceIds: [],
        })
    const compressionObserved = input.compressedFromTurn != null
      && turn >= input.compressedFromTurn
    return {
      ts: new Date(1_200 + index * 1_000).toISOString(),
      event: 'chat-provider-request.started',
      cardId: 'default',
      turnId: `turn-${turn}`,
      providerAttempt: 1,
      request: {
        version: 'alicization-provider-request-snapshot-v1',
        requestHash: `request-${turn}`,
        workingMemory: {
          present: true,
          version: 'working-memory-owner-context-v1',
          compressionObserved,
          compressedTimelineCount: compressionObserved ? 1 : 0,
          compressedSourceTurnCount: compressionObserved ? 6 : 0,
          recentDialogueCount: 5,
          correctionCount: 0,
          commitmentCount: 0,
          contentHash: `working-memory-${turn}`,
        },
        longTermRecall: {
          present: true,
          status: recall.status,
          confidence: recall.status === 'recalled' ? 0.8 : 0.1,
          evidenceIds: recall.evidenceIds,
          evidenceCount: recall.evidenceIds.length,
          contentHash: `recall-${turn}`,
        },
      },
    }
  })
}

describe('local macOS app blackbox trial', () => {
  it('requires a production replay to contain 20 to 50 messages', () => {
    expect(() => validateLocalAppProductionMessageCount(19)).toThrow('20')
    expect(() => validateLocalAppProductionMessageCount(51)).toThrow('50')
    expect(() => validateLocalAppProductionMessageCount(20)).not.toThrow()
    expect(() => validateLocalAppProductionMessageCount(50)).not.toThrow()
  })

  it('fails the production replay when turns span more than one conversation', () => {
    expect(assessLocalAppSingleSession({
      expectedTurnIds: ['turn-1', 'turn-2', 'turn-3'],
      events: [
        { turnId: 'turn-1', conversationId: 'conversation-a' },
        { turnId: 'turn-2', conversationId: 'conversation-a' },
        { turnId: 'turn-3', conversationId: 'conversation-b' },
      ],
    })).toMatchObject({
      status: 'failed',
      conversationIds: ['conversation-a', 'conversation-b'],
    })
  })

  it('does not accept recalled provider state when evidence is empty', () => {
    const requests = readLocalAppProviderRequestEvidence({
      events: [{
        event: 'chat-provider-request.started',
        cardId: 'default',
        turnId: 'turn-20',
        request: {
          workingMemory: {
            present: true,
            version: 'working-memory-owner-context-v1',
            compressionObserved: false,
            compressedTimelineCount: 0,
            compressedSourceTurnCount: 0,
          },
          longTermRecall: {
            present: true,
            status: 'recalled',
            confidence: 0.8,
            evidenceIds: [],
            evidenceCount: 0,
          },
        },
      }],
      cardId: 'default',
    })

    expect(assessLocalAppProviderRequestEvidence(requests)).toMatchObject({
      passed: false,
      errors: [expect.stringContaining('recalled')],
    })
  })

  it('requires posthoc recall evidence to be present in the same Provider turn', () => {
    const requests = readLocalAppProviderRequestEvidence({
      events: buildProviderRequestTrace({
        messages: buildProductionTrialMessages(2),
        recallByTurn: {
          1: {
            status: 'empty',
            evidenceIds: [],
          },
          2: {
            status: 'recalled',
            evidenceIds: ['fact-blue'],
          },
        },
      }),
      cardId: 'default',
    })

    expect(assessLocalAppProviderRequestEvidence(requests, {
      requiredRecall: {
        turnId: 'turn-2',
        status: 'recalled',
        matchedIds: ['fact-blue'],
      },
    })).toMatchObject({
      passed: true,
      recalledRequestCount: 1,
    })

    expect(assessLocalAppProviderRequestEvidence(requests, {
      requiredRecall: {
        turnId: 'turn-2',
        status: 'recalled',
        matchedIds: ['fact-green'],
      },
    })).toMatchObject({
      passed: false,
      errors: [expect.stringContaining('turn-2')],
    })
  })

  it('rejects a posthoc recall that never reached the matching Provider request', () => {
    const requests = readLocalAppProviderRequestEvidence({
      events: buildProviderRequestTrace({
        messages: buildProductionTrialMessages(2),
        recallByTurn: {
          1: {
            status: 'recalled',
            evidenceIds: ['fact-blue'],
          },
          2: {
            status: 'empty',
            evidenceIds: [],
          },
        },
      }),
      cardId: 'default',
    })

    expect(assessLocalAppProviderRequestEvidence(requests, {
      requiredRecall: {
        turnId: 'turn-2',
        status: 'recalled',
        matchedIds: ['fact-blue'],
      },
    })).toMatchObject({
      passed: false,
      errors: [expect.stringContaining('没有在同一轮 Provider 请求中')],
    })
  })

  it('proves compression reaches a later Provider request instead of stopping at a checkpoint', () => {
    const runtimeEvents = [
      {
        eventType: 'working_memory.compression.completed',
        turnId: 'turn-10',
        conversationId: 'conversation-a',
        payload: {
          version: 'working-memory-owner-context-v1',
          sessionId: 'conversation-a',
          compression: {
            level: 'compressed',
            sourceTurnIds: ['turn-1', 'turn-2', 'turn-3'],
          },
        },
      },
      {
        eventType: 'working_memory.snapshot.created',
        turnId: 'turn-10',
        conversationId: 'conversation-a',
        payload: {
          version: 'working-memory-owner-context-v1',
          sessionId: 'conversation-a',
          compressedTimeline: [{
            sourceTurnIds: ['turn-1', 'turn-2', 'turn-3'],
            summary: '压缩后的对话',
          }],
        },
      },
    ]
    const withoutProviderCompression = assessLocalAppCompressionEvidence({
      runtimeEvents,
      providerRequests: readLocalAppProviderRequestEvidence({
        cardId: 'default',
        events: buildProviderRequestTrace({
          messages: buildProductionTrialMessages(),
          compressedFromTurn: null,
        }),
      }),
      expectedTurnCount: 20,
    })
    expect(withoutProviderCompression).toMatchObject({
      passed: false,
      errors: [expect.stringContaining('Provider')],
    })

    const withProviderCompression = assessLocalAppCompressionEvidence({
      runtimeEvents,
      providerRequests: readLocalAppProviderRequestEvidence({
        cardId: 'default',
        events: buildProviderRequestTrace({
          messages: buildProductionTrialMessages(),
          compressedFromTurn: 11,
        }),
      }),
      expectedTurnCount: 20,
    })
    expect(withProviderCompression).toMatchObject({
      passed: true,
      compressedTurnId: 'turn-10',
      firstProviderTurnAfterCompression: 'turn-11',
    })
  })

  it('requires expected memory identities and answer evidence for recall scenarios', () => {
    const result = assessLocalAppMemoryExpectations({
      expectations: [{
        turnIndex: 20,
        kind: 'recall',
        expectedIds: ['fact-blue'],
        expectedAnswerIncludes: ['蓝色'],
      }],
      chatTurns: [{
        message: '我喜欢什么颜色？',
        status: 'completed',
        turnId: 'turn-20',
        assistantText: '我记得你喜欢绿色。',
        firstUiChangeMs: 1,
        settledMs: 10,
        visibleText: '我记得你喜欢绿色。',
        error: null,
      }],
      recalls: [{
        turnIndex: 20,
        recall: {
          query: '我喜欢什么颜色？',
          matched: true,
          status: 'recalled',
          turnId: 'turn-20',
          matchedIds: ['fact-green'],
          summaries: ['用户喜欢绿色。'],
          evidence: [],
          events: [],
          errors: [],
        },
      }],
    })

    expect(result).toMatchObject({
      passed: false,
      errors: [
        expect.stringContaining('fact-blue'),
        expect.stringContaining('蓝色'),
      ],
    })
  })

  it('accepts abstention only with an empty terminal recall and no usable evidence', () => {
    const result = assessLocalAppMemoryExpectations({
      expectations: [{
        turnIndex: 20,
        kind: 'abstain',
      }],
      chatTurns: [{
        message: '你知道我小时候住在哪里吗？',
        status: 'completed',
        turnId: 'turn-20',
        assistantText: '这件事我没有可靠的记忆。',
        firstUiChangeMs: 1,
        settledMs: 10,
        visibleText: '这件事我没有可靠的记忆。',
        error: null,
      }],
      recalls: [{
        turnIndex: 20,
        recall: {
          query: '你知道我小时候住在哪里吗？',
          matched: false,
          status: 'empty',
          turnId: 'turn-20',
          matchedIds: [],
          summaries: [],
          evidence: [],
          events: [{
            eventId: 'recall-abstained',
            eventType: 'long_term_memory.recall.abstained',
            status: 'abstained',
            turnId: 'turn-20',
            evidenceId: null,
            summary: null,
            source: null,
          }],
          errors: [],
        },
      }],
    })

    expect(result).toMatchObject({
      passed: true,
      errors: [],
    })
  })

  it('rejects correction, conflict, expiry, and tombstone scenarios that still surface forbidden ids', () => {
    const kinds = ['correction', 'conflict', 'expired', 'tombstone'] as const
    for (const kind of kinds) {
      const result = assessLocalAppMemoryExpectations({
        expectations: [{
          turnIndex: 20,
          kind,
          expectedIds: kind === 'correction' || kind === 'conflict'
            ? ['fact-new']
            : [],
          forbiddenIds: ['fact-old'],
        }],
        chatTurns: [{
          message: `验证 ${kind}`,
          status: 'completed',
          turnId: 'turn-20',
          assistantText: '我仍然记得旧内容。',
          firstUiChangeMs: 1,
          settledMs: 10,
          visibleText: '我仍然记得旧内容。',
          error: null,
        }],
        recalls: [{
          turnIndex: 20,
          recall: {
            query: `验证 ${kind}`,
            matched: true,
            status: 'recalled',
            turnId: 'turn-20',
            matchedIds: ['fact-old'],
            summaries: ['旧内容'],
            evidence: [],
            events: [],
            errors: [],
          },
        }],
      })
      expect(result.passed, kind).toBe(false)
      expect(result.errors.join('\n'), kind).toContain('fact-old')
    }
  })

  it('recognizes a natural Chinese question about what the user just asked it to remember', () => {
    expect(findMemoryRecallQuery([
      '请记住：我今天测试记忆闭环的标记是海棠。',
      '我刚才让你记住的测试标记是什么？',
    ])).toBe('我刚才让你记住的测试标记是什么？')
  })

  it('does not treat a Chinese memory request as a recall question', () => {
    expect(findMemoryRecallQuery([
      '请记住：我今天测试记忆闭环的标记是海棠。',
    ])).toBe('')
  })

  it('keeps Chinese memory writes and statements out of recall detection', () => {
    for (const message of [
      '请记住，我喜欢蓝色。',
      '请你记住我最近的偏好。',
      '记住这件事。',
      '我刚才让你记住了这件事。',
      '我之前告诉过你我喜欢蓝色。',
      '我记得你是做这个的。',
    ]) {
      expect(findMemoryRecallQuery([message])).toBe('')
    }
  })

  it('recognizes common Chinese recall questions and retrieval commands', () => {
    for (const message of [
      '你还记得我喜欢什么颜色吗？',
      '你记住了吗？',
      '你有没有记住我刚才说的内容？',
      '还记不记得我喜欢蓝色？',
      '我让你记住的内容是什么？',
      '我说过什么来着？',
      '回忆一下我们上次的约定。',
      '帮我找回刚才那条记忆。',
    ]) {
      expect(findMemoryRecallQuery([message])).toBe(message)
    }
  })

  it('does not classify a question about recall behavior as a memory lookup', () => {
    expect(findMemoryRecallQuery([
      '如果长期记忆召回不到相关内容，你应该怎样回答？',
    ])).toBe('')
  })

  it('does not mark an unrequested recall as matched', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '',
        chatTurns: [],
      })).resolves.toMatchObject({
        query: '',
        matched: false,
        status: 'not-requested',
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('waits for memory projections to become idle and stable before inspection', async () => {
    let currentTime = 0
    let readCount = 0
    const result = await waitForLocalAppMemoryClosure({
      readSnapshot: async () => {
        readCount += 1
        return readCount === 1
          ? {
              activeQueueCount: 1,
              activeIngestCount: 0,
              activeReindexCount: 0,
              projectionRevision: 'queue-pending',
            }
          : {
              activeQueueCount: 0,
              activeIngestCount: 0,
              activeReindexCount: 0,
              projectionRevision: 'projection-v1',
            }
      },
      timeoutMs: 100,
      pollMs: 10,
      minWaitMs: 0,
      stablePollsRequired: 2,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms
      },
    })

    expect(result).toMatchObject({
      settled: true,
      polls: 3,
      stablePolls: 2,
      snapshot: {
        activeQueueCount: 0,
        projectionRevision: 'projection-v1',
      },
    })
  })

  it('does not let another card keep the current memory closure open', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await runSql(database, `
        CREATE TABLE working_memory_long_term_transactions (
          card_id TEXT NOT NULL,
          status TEXT NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE memory_ingest_journal (
          operation_kind TEXT NOT NULL,
          card_id TEXT,
          payload_json TEXT NOT NULL,
          status TEXT NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE memory_embedding_reindex_jobs (
          card_id TEXT NOT NULL,
          status TEXT NOT NULL
        )
      `)
      await runSql(database, 'CREATE TABLE memory_facts (card_id TEXT, updated_at INTEGER)')
      await runSql(database, 'CREATE TABLE memory_reflections (card_id TEXT, updated_at INTEGER)')
      await runSql(database, 'CREATE TABLE episodic_events (card_id TEXT, created_at INTEGER)')
      await runSql(database, 'CREATE TABLE memory_consolidations (card_id TEXT, updated_at INTEGER)')
      await runSql(database, 'CREATE TABLE long_term_memory_search_documents (card_id TEXT, updated_at INTEGER)')
      await runSql(database, 'CREATE TABLE long_term_memory_vectors (card_id TEXT, updated_at INTEGER)')
      await runSql(database, `
        INSERT INTO memory_ingest_journal (operation_kind, payload_json, status)
        VALUES (?, ?, 'pending')
      `, [
        'append-episodic-events',
        JSON.stringify({
          kind: 'append-episodic-events',
          events: [{ cardId: 'card-other', id: 'event-other' }],
        }),
      ])

      await expect(readLocalAppMemoryClosureSnapshot(database, 'card-current')).resolves.toMatchObject({
        activeIngestCount: 0,
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('returns a timeout without pretending that memory closure succeeded', async () => {
    let currentTime = 0
    const result = await waitForLocalAppMemoryClosure({
      readSnapshot: async () => ({
        activeQueueCount: 1,
        activeIngestCount: 0,
        activeReindexCount: 0,
        projectionRevision: 'queue-pending',
      }),
      timeoutMs: 20,
      pollMs: 10,
      minWaitMs: 0,
      stablePollsRequired: 2,
      now: () => currentTime,
      sleep: async (ms) => {
        currentTime += ms
      },
    })

    expect(result).toMatchObject({
      settled: false,
      snapshot: {
        activeQueueCount: 1,
      },
    })
  })

  it('builds a card-scoped direct abort request for a timed-out chat turn', () => {
    expect(buildLocalAppChatAbortRequest({
      cardId: 'card-a',
      turnId: 'turn-timeout-1',
      reason: 'blackbox-turn-timeout',
    })).toEqual({
      channel: 'alicization:chat-abort',
      payload: {
        cardId: 'card-a',
        turnId: 'turn-timeout-1',
        reason: 'blackbox-turn-timeout',
      },
    })
  })

  it('filters runtime debug JSONL by trial start and preserves malformed evidence', async () => {
    const trace = await readRuntimeDebugTraceSince(
      join('/tmp/runtime-debug.log'),
      Date.parse('2026-08-29T06:00:00.000Z'),
      async () => [
        '{"ts":"2026-08-29T05:59:59.000Z","event":"old"}',
        '{"ts":"2026-08-29T06:00:01.000Z","event":"chat-start.accepted"}',
        'not-json',
      ].join('\n'),
    )

    expect(trace).toEqual([
      {
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-start.accepted',
      },
      {
        event: 'runtime-debug.parse-failed',
        raw: 'not-json',
      },
    ])
  })

  it('launches the installed app with remote debugging enabled and owns only the process it started', async () => {
    const child = new EventEmitter() as EventEmitter & {
      pid: number
      stdout: EventEmitter
      stderr: EventEmitter
      killed: boolean
      kill: ReturnType<typeof vi.fn>
    }
    child.pid = 1234
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.killed = false
    child.kill = vi.fn(() => {
      child.killed = true
      queueMicrotask(() => child.emit('close', 0, null))
      return true
    })
    const spawn = vi.fn(() => child as never)
    const automation = createPlaywrightLocalAppBlackboxAutomation({
      args: {
        appPath: join('/Users/alice/Applications/Alicization Local.app'),
        userDataPath: join('/tmp/alicization'),
        cardId: 'card-a',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9333,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: [],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      spawn,
      pathExists: () => true,
      connectOverCDP: vi.fn(),
    })

    await expect(automation.launch()).resolves.toEqual({ pid: 1234 })
    expect(spawn).toHaveBeenCalledWith(
      join('/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization'),
      [
        '--user-data-dir',
        join('/tmp/alicization'),
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          ALICIZATION_USER_DATA_PATH: join('/tmp/alicization'),
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: '9333',
        }),
      }),
    )

    await automation.close()
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('accepts a direct Electron executable path without appending the bundle suffix twice', async () => {
    const child = new EventEmitter() as EventEmitter & {
      pid: number
      stdout: EventEmitter
      stderr: EventEmitter
      killed: boolean
      kill: ReturnType<typeof vi.fn>
    }
    child.pid = 1234
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.killed = false
    child.kill = vi.fn(() => true)
    const spawn = vi.fn(() => child as never)
    const automation = createPlaywrightLocalAppBlackboxAutomation({
      args: {
        appPath: join('/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization'),
        userDataPath: join('/tmp/alicization'),
        cardId: 'card-a',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9334,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: [],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      spawn,
      pathExists: path => path === join('/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization'),
      connectOverCDP: vi.fn(),
    })

    await expect(automation.launch()).resolves.toEqual({ pid: 1234 })
    expect(spawn).toHaveBeenCalledWith(
      join('/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization'),
      expect.any(Array),
      expect.any(Object),
    )
  })

  it('waits for the owned App process to exit before closing the automation', async () => {
    const child = new EventEmitter() as EventEmitter & {
      pid: number
      stdout: EventEmitter
      stderr: EventEmitter
      killed: boolean
      kill: ReturnType<typeof vi.fn>
    }
    child.pid = 1234
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.killed = false
    let exited = false
    child.kill = vi.fn(() => {
      child.killed = true
      setTimeout(() => {
        exited = true
        child.emit('close', 0, null)
      }, 5)
      return true
    })
    const automation = createPlaywrightLocalAppBlackboxAutomation({
      args: {
        appPath: join('/Users/alice/Applications/Alicization Local.app'),
        userDataPath: join('/tmp/alicization'),
        cardId: 'card-a',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9333,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: [],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      spawn: vi.fn(() => child as never),
      pathExists: () => true,
      connectOverCDP: vi.fn(),
    })

    await automation.launch()
    await automation.close()

    expect(exited).toBe(true)
  })

  it('identifies only the stage root as the main renderer window', () => {
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/',
    )).toBe(true)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/beat-sync.html',
    )).toBe(false)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/chat',
    )).toBe(false)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/settings',
    )).toBe(false)
  })

  it('resolves the current card database before the legacy unbound database path', () => {
    const existing = new Set([
      join('/tmp/alicization/alicizations/cards/default/alicization.db'),
      join('/tmp/alicization/alicizations/alicization.db'),
    ])

    expect(resolveLocalAppMemoryDatabasePath({
      userDataPath: join('/tmp/alicization'),
      cardId: 'default',
      pathExists: path => existing.has(path),
    })).toBe(join('/tmp/alicization/alicizations/cards/default/alicization.db'))
  })

  it('does not treat a matching search document as recall for a natural Chinese question', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await runSql(database, `
        CREATE TABLE long_term_memory_search_documents (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source TEXT NOT NULL,
          summary TEXT NOT NULL,
          search_text TEXT NOT NULL
        )
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_search_documents (
          id,
          card_id,
          source,
          summary,
          search_text
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        'document-only',
        'card-a',
        'fact',
        '用户周末喜欢去海边。',
        '用户周末喜欢去海边。',
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '你还记得我之前提过，周末最喜欢去哪里吗？',
        chatTurns: [{
          message: '你还记得我之前提过，周末最喜欢去哪里吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-natural-question',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '她：让我想想。',
          error: null,
        }],
      })).resolves.toMatchObject({
        query: '你还记得我之前提过，周末最喜欢去哪里吗？',
        matched: false,
        status: 'unknown',
        turnId: null,
        evidence: [],
        events: [],
        matchedIds: [],
        summaries: [],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('does not treat an isolated recall evidence event as persisted long-term memory', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await runSql(database, `
        CREATE TABLE memory_facts (
          id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          PRIMARY KEY(card_id, id)
        )
      `)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id)
        VALUES ('memory-seaside', 'card-b')
      `)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'isolated-recall-evidence-event',
        'long_term_memory.recall.evidence',
        'turn-isolated-recall',
        'card-a',
        1_500,
        1,
        JSON.stringify({
          id: 'memory-seaside',
          summary: '你周末喜欢去海边。',
        }),
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'isolated-recall-completed-event',
        'long_term_memory.recall.completed',
        'turn-isolated-recall',
        'card-a',
        1_600,
        2,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 1,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '你还记得我之前提过，周末最喜欢去哪里吗？',
        chatTurns: [{
          message: '你还记得我之前提过，周末最喜欢去哪里吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-isolated-recall',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '她：你周末喜欢去海边。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'unknown',
        matchedIds: [],
        summaries: [],
        errors: [
          expect.stringContaining('memory-seaside'),
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('rejects persisted recall evidence when the runtime event omits its source', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await createRecallProvenanceTables(database)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, validation_status)
        VALUES ('memory-without-source', 'card-a', 'confirmed')
      `)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-without-source-evidence',
        'long_term_memory.recall.evidence',
        'turn-without-source',
        'card-a',
        1_500,
        1,
        JSON.stringify({
          id: 'memory-without-source',
          summary: '缺少来源的证据。',
        }),
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-without-source-completed',
        'long_term_memory.recall.completed',
        'turn-without-source',
        'card-a',
        1_600,
        2,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 1,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '缺少来源的记忆能通过吗？',
        chatTurns: [{
          message: '缺少来源的记忆能通过吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-without-source',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '不应通过。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'unknown',
        evidence: [],
        errors: [
          expect.stringContaining('缺少 source'),
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('keeps provenance isolated by source when different memory tables share an id', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await createRecallProvenanceTables(database)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, validation_status)
        VALUES ('shared-memory-id', 'card-a', 'confirmed')
      `)
      await runSql(database, `
        INSERT INTO memory_reflections (id, card_id, status)
        VALUES ('shared-memory-id', 'card-a', 'confirmed')
      `)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES
          (?, 'long_term_memory.recall.evidence', ?, ?, ?, 1, ?),
          (?, 'long_term_memory.recall.evidence', ?, ?, ?, 2, ?),
          (?, 'long_term_memory.recall.completed', ?, ?, ?, 3, ?)
      `, [
        'shared-fact-evidence',
        'turn-shared-id',
        'card-a',
        1_500,
        JSON.stringify({
          id: 'shared-memory-id',
          source: 'memory_facts',
          summary: '事实记忆。',
        }),
        'shared-reflection-evidence',
        'turn-shared-id',
        'card-a',
        1_510,
        JSON.stringify({
          id: 'shared-memory-id',
          source: 'memory_reflections',
          summary: '反思记忆。',
        }),
        'shared-id-completed',
        'turn-shared-id',
        'card-a',
        1_600,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 2,
        }),
      ])

      const result = await readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '检查同 ID 的两类记忆。',
        chatTurns: [{
          message: '检查同 ID 的两类记忆。',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-shared-id',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '两类证据。',
          error: null,
        }],
      })

      expect(result).toMatchObject({
        matched: true,
        status: 'recalled',
        evidence: [
          {
            id: 'shared-memory-id',
            source: 'memory_facts',
            provenance: {
              persisted: true,
              matches: [{
                table: 'memory_facts',
                source: 'memory_facts',
                sourceId: 'shared-memory-id',
              }],
            },
          },
          {
            id: 'shared-memory-id',
            source: 'memory_reflections',
            provenance: {
              persisted: true,
              matches: [{
                table: 'memory_reflections',
                source: 'memory_reflections',
                sourceId: 'shared-memory-id',
              }],
            },
          },
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('rejects superseded facts and unconfirmed reflections as active provenance', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await createRecallProvenanceTables(database)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, validation_status)
        VALUES ('superseded-fact', 'card-a', 'superseded')
      `)
      await runSql(database, `
        INSERT INTO memory_reflections (id, card_id, status)
        VALUES ('pending-reflection', 'card-a', 'candidate')
      `)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES
          (?, 'long_term_memory.recall.evidence', ?, ?, ?, 1, ?),
          (?, 'long_term_memory.recall.evidence', ?, ?, ?, 2, ?),
          (?, 'long_term_memory.recall.completed', ?, ?, ?, 3, ?)
      `, [
        'superseded-fact-evidence',
        'turn-inactive-memory',
        'card-a',
        1_500,
        JSON.stringify({
          id: 'superseded-fact',
          source: 'memory_facts',
          summary: '已经被新事实取代。',
        }),
        'pending-reflection-evidence',
        'turn-inactive-memory',
        'card-a',
        1_510,
        JSON.stringify({
          id: 'pending-reflection',
          source: 'memory_reflections',
          summary: '还没有确认。',
        }),
        'inactive-memory-completed',
        'turn-inactive-memory',
        'card-a',
        1_600,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 2,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '这些失效记忆还能召回吗？',
        chatTurns: [{
          message: '这些失效记忆还能召回吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-inactive-memory',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '不能。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'unknown',
        evidence: [],
        errors: [
          expect.stringContaining('superseded-fact'),
          expect.stringContaining('pending-reflection'),
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('rejects provenance when the long-term source has been tombstoned', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await createRecallProvenanceTables(database)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, validation_status)
        VALUES ('tombstoned-fact', 'card-a', 'confirmed')
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_search_documents (
          id,
          card_id,
          source,
          source_id,
          tombstoned
        ) VALUES (
          'ltm-doc:card-a:memory_facts:tombstoned-fact',
          'card-a',
          'memory_facts',
          'tombstoned-fact',
          1
        )
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_tombstones (
          id,
          card_id,
          source_id,
          source
        ) VALUES (
          'tombstone-fact',
          'card-a',
          'tombstoned-fact',
          'long_term_memory'
        )
      `)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES
          (?, 'long_term_memory.recall.evidence', ?, ?, ?, 1, ?),
          (?, 'long_term_memory.recall.completed', ?, ?, ?, 2, ?)
      `, [
        'tombstoned-fact-evidence',
        'turn-tombstoned-memory',
        'card-a',
        1_500,
        JSON.stringify({
          id: 'tombstoned-fact',
          source: 'memory_facts',
          summary: '已经删除的事实。',
        }),
        'tombstoned-fact-completed',
        'turn-tombstoned-memory',
        'card-a',
        1_600,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 1,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '已经删除的事实还能召回吗？',
        chatTurns: [{
          message: '已经删除的事实还能召回吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-tombstoned-memory',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '不能。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'unknown',
        evidence: [],
        errors: [
          expect.stringContaining('已被 tombstone'),
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('returns unknown when required provenance tables or columns are missing', async () => {
    for (const schema of ['missing-tombstone-table', 'missing-vector-status'] as const) {
      const database = new sqlite3.Database(':memory:')
      try {
        await createRuntimeEventsTable(database)
        await createRecallProvenanceTables(database, schema === 'missing-tombstone-table'
          ? { omitTombstoneTable: true }
          : { omitVectorStatus: true })
        await runSql(database, `
          INSERT INTO memory_facts (id, card_id, validation_status)
          VALUES ('schema-memory', 'card-a', 'confirmed')
        `)
        await runSql(database, `
          INSERT INTO alicization_runtime_events (
            event_id,
            event_type,
            turn_id,
            card_id,
            occurred_at,
            sequence,
            payload_json
          ) VALUES
            (?, 'long_term_memory.recall.evidence', ?, ?, ?, 1, ?),
            (?, 'long_term_memory.recall.completed', ?, ?, ?, 2, ?)
        `, [
          `${schema}-evidence`,
          `turn-${schema}`,
          'card-a',
          1_500,
          JSON.stringify({
            id: 'schema-memory',
            source: 'memory_facts',
            summary: 'schema 必须完整。',
          }),
          `${schema}-completed`,
          `turn-${schema}`,
          'card-a',
          1_600,
          JSON.stringify({
            status: 'recalled',
            evidenceCount: 1,
          }),
        ])

        const result = await readLocalAppRuntimeRecall({
          database,
          cardId: 'card-a',
          query: `检查 ${schema}`,
          chatTurns: [{
            message: `检查 ${schema}`,
            status: 'completed',
            startedAt: 1_000,
            finishedAt: 2_000,
            turnId: `turn-${schema}`,
            firstUiChangeMs: 100,
            settledMs: 1_000,
            visibleText: '不能宽松通过。',
            error: null,
          }],
        })

        expect(result).toMatchObject({
          matched: false,
          status: 'unknown',
          evidence: [],
          errors: [
            expect.stringContaining(schema === 'missing-tombstone-table'
              ? '缺少长期记忆表 long_term_memory_tombstones'
              : 'long_term_memory_vectors 缺少 provenance 列：status'),
          ],
        })
      }
      finally {
        await closeSql(database)
      }
    }
  })

  it('projects real recall evidence and terminal status from the corresponding turn events', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await createRecallProvenanceTables(database)
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, validation_status)
        VALUES ('memory-seaside', 'card-a', 'confirmed')
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_search_documents (
          id,
          card_id,
          source,
          source_id,
          tombstoned
        ) VALUES (?, ?, ?, ?, 0)
      `, [
        'ltm-doc:card-a:memory_facts:memory-seaside',
        'card-a',
        'memory_facts',
        'memory-seaside',
      ])
      await runSql(database, `
        INSERT INTO long_term_memory_vectors (
          id,
          card_id,
          source_id,
          source,
          status
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        'vector-memory-seaside',
        'card-a',
        'memory-seaside',
        'memory_facts',
        'indexed',
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-evidence-event',
        'long_term_memory.recall.evidence',
        'turn-natural-question',
        'card-a',
        1_500,
        1,
        JSON.stringify({
          id: 'memory-seaside',
          summary: '你周末喜欢去海边。',
          source: 'memory_facts',
        }),
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-completed-event',
        'long_term_memory.recall.completed',
        'turn-natural-question',
        'card-a',
        1_600,
        2,
        JSON.stringify({
          status: 'recalled',
          evidenceCount: 1,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '你还记得我之前提过，周末最喜欢去哪里吗？',
        chatTurns: [{
          message: '你还记得我之前提过，周末最喜欢去哪里吗？',
          status: 'completed',
          startedAt: 1_000,
          finishedAt: 2_000,
          turnId: 'turn-natural-question',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '她：你周末喜欢去海边。',
          error: null,
        }],
      })).resolves.toMatchObject({
        query: '你还记得我之前提过，周末最喜欢去哪里吗？',
        matched: true,
        status: 'recalled',
        turnId: 'turn-natural-question',
        matchedIds: ['memory-seaside'],
        summaries: ['你周末喜欢去海边。'],
        evidence: [{
          id: 'memory-seaside',
          summary: '你周末喜欢去海边。',
          status: 'evidence',
          turnId: 'turn-natural-question',
          provenance: {
            evidenceId: 'memory-seaside',
            persisted: true,
            matches: expect.arrayContaining([
              {
                table: 'memory_facts',
                source: 'memory_facts',
                sourceId: 'memory-seaside',
              },
              {
                table: 'long_term_memory_search_documents',
                source: 'memory_facts',
                sourceId: 'memory-seaside',
              },
              {
                table: 'long_term_memory_vectors',
                source: 'memory_facts',
                sourceId: 'memory-seaside',
              },
            ]),
            error: null,
          },
        }],
        events: [
          {
            eventId: 'recall-evidence-event',
            eventType: 'long_term_memory.recall.evidence',
            status: 'evidence',
            turnId: 'turn-natural-question',
            evidenceId: 'memory-seaside',
            summary: '你周末喜欢去海边。',
          },
          {
            eventId: 'recall-completed-event',
            eventType: 'long_term_memory.recall.completed',
            status: 'completed',
            turnId: 'turn-natural-question',
            evidenceId: null,
            summary: null,
          },
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('reports an abstained recall as empty without inventing evidence', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-abstained-event',
        'long_term_memory.recall.abstained',
        'turn-no-memory',
        'card-a',
        2_500,
        1,
        JSON.stringify({
          status: 'empty',
        }),
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-empty-completed-event',
        'long_term_memory.recall.completed',
        'turn-no-memory',
        'card-a',
        2_600,
        2,
        JSON.stringify({
          status: 'empty',
          evidenceCount: 0,
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '你还记得我之前说过的那件小事吗？',
        chatTurns: [{
          message: '你还记得我之前说过的那件小事吗？',
          status: 'completed',
          startedAt: 2_000,
          finishedAt: 3_000,
          turnId: 'turn-no-memory',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '她：我没有找到对应的记忆。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'empty',
        turnId: 'turn-no-memory',
        evidence: [],
        events: [
          {
            eventId: 'recall-abstained-event',
            eventType: 'long_term_memory.recall.abstained',
            status: 'abstained',
            turnId: 'turn-no-memory',
            evidenceId: null,
            summary: null,
          },
          {
            eventId: 'recall-empty-completed-event',
            eventType: 'long_term_memory.recall.completed',
            status: 'completed',
            turnId: 'turn-no-memory',
            evidenceId: null,
            summary: null,
          },
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('does not report staged evidence as recalled when the terminal event fails', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await createRuntimeEventsTable(database)
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-failed-evidence-event',
        'long_term_memory.recall.evidence',
        'turn-failed-recall',
        'card-a',
        3_500,
        1,
        JSON.stringify({
          id: 'memory-staged',
          summary: '这条证据随后未能完成验证。',
        }),
      ])
      await runSql(database, `
        INSERT INTO alicization_runtime_events (
          event_id,
          event_type,
          turn_id,
          card_id,
          occurred_at,
          sequence,
          payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'recall-failed-completed-event',
        'long_term_memory.recall.completed',
        'turn-failed-recall',
        'card-a',
        3_600,
        2,
        JSON.stringify({
          status: 'failed',
          evidenceCount: 1,
          error: 'embedding provider unavailable',
        }),
      ])

      await expect(readLocalAppRuntimeRecall({
        database,
        cardId: 'card-a',
        query: '你还记得那条信息吗？',
        chatTurns: [{
          message: '你还记得那条信息吗？',
          status: 'completed',
          startedAt: 3_000,
          finishedAt: 4_000,
          turnId: 'turn-failed-recall',
          firstUiChangeMs: 100,
          settledMs: 1_000,
          visibleText: '长期记忆召回失败。',
          error: null,
        }],
      })).resolves.toMatchObject({
        matched: false,
        status: 'failed',
        matchedIds: [],
        summaries: [],
        evidence: [],
        events: [
          expect.objectContaining({
            eventId: 'recall-failed-evidence-event',
            status: 'evidence',
          }),
          expect.objectContaining({
            eventId: 'recall-failed-completed-event',
            status: 'completed',
          }),
        ],
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('correlates failed-turn leakage by turn provenance instead of matching historical text', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await runSql(database, `
        CREATE TABLE memory_reflections (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE episodic_events (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE persona_reinforcement_events (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE person_state_evolution_log (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT,
          created_at INTEGER NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE persona_training_dataset_examples (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source_id TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE memory_consolidations (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          derived_event_ids_json TEXT
        )
      `)
      await runSql(database, `
        INSERT INTO memory_reflections (id, card_id, turn_id, created_at)
        VALUES ('old-reflection', 'card-a', 'old-turn', 10)
      `)

      await runSql(database, `
        INSERT INTO memory_reflections (id, card_id, turn_id, created_at)
        VALUES ('background-reflection', 'card-a', 'subconscious:tick-1', 210)
      `)
      await runSql(database, `
        INSERT INTO episodic_events (id, card_id, turn_id, created_at)
        VALUES ('background-episode', 'card-a', 'execution:job-1', 211)
      `)

      await expect(assessFailedTurnMemoryLeaks({
        database,
        cardId: 'card-a',
        failedTurns: [{
          message: '没有可靠归属的失败对话',
          status: 'timed-out',
          startedAt: 200,
          finishedAt: 220,
          turnId: null,
          firstUiChangeMs: null,
          settledMs: 20,
          visibleText: '',
          error: '等待对话完成超时',
        }],
      })).resolves.toEqual({
        status: 'unknown',
        leakedCount: 0,
        indeterminateTurnCount: 1,
      })
      await expect(countFailedTurnMemoryLeaks({
        database,
        cardId: 'card-a',
        failedTurns: [{
          message: '没有可靠归属的失败对话',
          status: 'timed-out',
          startedAt: 200,
          finishedAt: 220,
          turnId: null,
          firstUiChangeMs: null,
          settledMs: 20,
          visibleText: '',
          error: '等待对话完成超时',
        }],
      })).resolves.toBeNull()

      await expect(countFailedTurnMemoryLeaks({
        database,
        cardId: 'card-a',
        failedTurns: [{
          message: '同一段失败文本',
          status: 'failed',
          startedAt: 200,
          finishedAt: 220,
          turnId: 'failed-turn',
          firstUiChangeMs: null,
          settledMs: 20,
          visibleText: '',
          error: 'Provider failed',
        }],
      })).resolves.toBe(0)

      await runSql(database, `
        INSERT INTO memory_reflections (id, card_id, turn_id, created_at)
        VALUES ('failed-reflection', 'card-a', 'failed-turn', 210)
      `)
      await runSql(database, `
        INSERT INTO episodic_events (id, card_id, turn_id, created_at)
        VALUES ('failed-episode', 'card-a', 'failed-turn', 211)
      `)
      await runSql(database, `
        INSERT INTO persona_training_dataset_examples (id, card_id, source_id, created_at)
        VALUES ('failed-persona-example', 'card-a', 'failed-reflection', 212)
      `)
      await runSql(database, `
        INSERT INTO memory_consolidations (id, card_id, derived_event_ids_json)
        VALUES ('failed-consolidation', 'card-a', '["failed-episode"]')
      `)
      await runSql(database, `
        INSERT INTO memory_consolidations (id, card_id, derived_event_ids_json)
        VALUES ('near-match-consolidation', 'card-a', '["failed-episode-extended"]')
      `)

      await expect(countFailedTurnMemoryLeaks({
        database,
        cardId: 'card-a',
        failedTurns: [{
          message: '同一段失败文本',
          status: 'failed',
          startedAt: 200,
          finishedAt: 220,
          turnId: 'failed-turn',
          firstUiChangeMs: null,
          settledMs: 20,
          visibleText: '',
          error: 'Provider failed',
        }],
      })).resolves.toBe(4)
    }
    finally {
      await closeSql(database)
    }
  })

  it('audits failed-turn leakage across the queue, facts, relationship outcomes, index, and vectors', async () => {
    const database = new sqlite3.Database(':memory:')
    try {
      await runSql(database, `
        CREATE TABLE memory_reflections (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE episodic_events (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE persona_reinforcement_events (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE person_state_evolution_log (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE working_memory_long_term_transactions (
          id TEXT PRIMARY KEY,
          queue_item_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          status TEXT NOT NULL,
          queue_item_json TEXT NOT NULL,
          cleaned_candidate_json TEXT,
          projections_json TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE memory_facts (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source_label TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE persona_training_dataset_examples (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source_id TEXT NOT NULL
        )
      `)
      await runSql(database, `
        CREATE TABLE relationship_outcomes (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          turn_id TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE memory_consolidations (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          derived_event_ids_json TEXT
        )
      `)
      await runSql(database, `
        CREATE TABLE long_term_memory_search_documents (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source TEXT NOT NULL,
          source_id TEXT NOT NULL,
          source_ids_json TEXT NOT NULL,
          tombstoned INTEGER NOT NULL DEFAULT 0
        )
      `)
      await runSql(database, `
        CREATE TABLE long_term_memory_vectors (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL,
          source TEXT NOT NULL,
          source_id TEXT NOT NULL,
          status TEXT NOT NULL
        )
      `)

      await runSql(database, `
        INSERT INTO working_memory_long_term_transactions (
          id,
          queue_item_id,
          card_id,
          status,
          queue_item_json,
          cleaned_candidate_json,
          projections_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'wm-transaction-failed',
        'queue-failed',
        'card-a',
        'applied',
        JSON.stringify({
          id: 'queue-failed',
          sourceTurnIds: ['failed-turn'],
        }),
        JSON.stringify({
          id: 'cleaned-failed',
          sourceTurnIds: ['failed-turn'],
        }),
        JSON.stringify({
          memoryFacts: [{
            sourceLabel: 'working-memory-owner:cleaned-failed',
          }],
        }),
      ])
      await runSql(database, `
        INSERT INTO memory_facts (id, card_id, source_label)
        VALUES ('failed-fact', 'card-a', 'working-memory-owner:cleaned-failed')
      `)
      await runSql(database, `
        INSERT INTO relationship_outcomes (id, card_id, turn_id)
        VALUES ('failed-outcome', 'card-a', 'failed-turn')
      `)
      await runSql(database, `
        INSERT INTO persona_training_dataset_examples (id, card_id, source_id)
        VALUES ('failed-dataset-example', 'card-a', 'failed-fact')
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_search_documents (
          id,
          card_id,
          source,
          source_id,
          source_ids_json
        ) VALUES (
          'ltm-doc-failed',
          'card-a',
          'memory_facts',
          'failed-fact',
          '["failed-fact"]'
        )
      `)
      await runSql(database, `
        INSERT INTO long_term_memory_vectors (
          id,
          card_id,
          source,
          source_id,
          status
        ) VALUES (
          'vector-failed',
          'card-a',
          'memory_facts',
          'failed-fact',
          'indexed'
        )
      `)

      await expect(assessFailedTurnMemoryLeaks({
        database,
        cardId: 'card-a',
        failedTurns: [{
          message: '执行失败但不应进入长期记忆',
          status: 'failed',
          startedAt: 100,
          finishedAt: 200,
          turnId: 'failed-turn',
          firstUiChangeMs: null,
          settledMs: 100,
          visibleText: '',
          error: 'Provider failed',
        }],
      })).resolves.toEqual({
        status: 'failed',
        leakedCount: 6,
        indeterminateTurnCount: 0,
      })
    }
    finally {
      await closeSql(database)
    }
  })

  it('combines the real App blackbox evidence with the DB quality trial', () => {
    const blackbox = {
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      startedAt: 10,
      finishedAt: 20,
      appPath: '/Applications/Alicization Local.app',
      userDataPath: join('/tmp/alicization'),
      cardId: 'card-a',
      outputDir: join('/tmp/blackbox'),
      summary: {
        requestedMessageCount: 2,
        completedMessageCount: 2,
        failedMessageCount: 0,
        runtimeTraceEventCount: 3,
        screenshotCount: 1,
        rendererConsoleEventCount: 0,
        pageErrorCount: 0,
        memoryAssertionPassed: true,
        failedStageIds: [],
        lastError: null,
      },
      stages: [],
      chatTurns: [],
      memoryAssertions: {
        cardId: 'card-a',
        checkpointCount: 1,
        queue: {
          pending: 0,
          review: 0,
          applied: 1,
          failed: 0,
          deadLettered: 0,
        },
        longTerm: {
          factCount: 1,
          reflectionCount: 1,
          searchDocumentCount: 1,
          vectorCount: 1,
        },
        recall: {
          query: '你还记得吗？',
          matched: true,
          matchedIds: ['fact-1'],
          summaries: ['记忆'],
        },
        failedTurnCount: 0,
        failedTurnMemoryLeakCount: 0,
        failureIsolationStatus: 'passed' as const,
        failureIsolationIndeterminateTurnCount: 0,
        failureIsolationPassed: true,
        errors: [],
      },
      runtimeDebugTrace: [],
      screenshots: [],
      diagnostics: {
        processOutput: [],
        rendererConsole: [],
        pageErrors: [],
      },
    } as LocalAppBlackboxTrialReport

    const report = buildLocalAppProductionTrialReport({
      blackbox,
      qualityTrial: null,
      qualityTrialError: '质量阶段未运行',
    })

    expect(report).toMatchObject({
      version: 'alicization-local-app-production-trial-v1',
      passed: false,
      cardId: 'card-a',
      summary: {
        blackboxPassed: true,
        qualityTrialPassed: false,
        lastError: '质量阶段未运行',
      },
    })
  })

  it('does not pass when a requested quality trial reports only not-run stages', () => {
    const blackbox = {
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      startedAt: 10,
      finishedAt: 20,
      appPath: '/Applications/Alicization Local.app',
      userDataPath: join('/tmp/alicization'),
      cardId: 'card-a',
      outputDir: join('/tmp/blackbox'),
      summary: {
        requestedMessageCount: 1,
        completedMessageCount: 1,
        failedMessageCount: 0,
        runtimeTraceEventCount: 1,
        screenshotCount: 0,
        rendererConsoleEventCount: 0,
        pageErrorCount: 0,
        memoryAssertionPassed: true,
        failedStageIds: [],
        lastError: null,
      },
      stages: [],
      chatTurns: [],
      memoryAssertions: null,
      runtimeDebugTrace: [],
      screenshots: [],
      diagnostics: {
        processOutput: [],
        rendererConsole: [],
        pageErrors: [],
      },
    } as LocalAppBlackboxTrialReport
    const qualityTrial = {
      passed: true,
      stages: [
        { status: 'not-run' },
        { status: 'not-run' },
      ],
      summary: {
        lastError: 'not-run: no quality fixtures were available',
      },
    } as MemoryProductionTrialReport

    const report = buildLocalAppProductionTrialReport({
      blackbox,
      qualityTrial,
    })

    expect(report).toMatchObject({
      passed: false,
      summary: {
        blackboxPassed: true,
        qualityTrialPassed: false,
        qualityTrialStatus: 'not-run',
        lastError: 'not-run: no quality fixtures were available',
      },
    })
  })

  it('parses the card scope used by the real App database', () => {
    expect(parseLocalAppBlackboxTrialArgs([
      '--user-data-path',
      join('/tmp/alicization'),
      '--card-id',
      'card-a',
    ])).toMatchObject({
      userDataPath: join('/tmp/alicization'),
      cardId: 'card-a',
    })
  })

  it('runs the DB quality trial after the real App replay and writes one production report', async () => {
    const blackbox = {
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      startedAt: 10,
      finishedAt: 20,
      appPath: '/Applications/Alicization Local.app',
      userDataPath: join('/tmp/alicization'),
      cardId: 'card-a',
      outputDir: join('/tmp/blackbox'),
      summary: {
        requestedMessageCount: 1,
        completedMessageCount: 1,
        failedMessageCount: 0,
        runtimeTraceEventCount: 1,
        screenshotCount: 0,
        rendererConsoleEventCount: 0,
        pageErrorCount: 0,
        memoryAssertionPassed: true,
        failedStageIds: [],
        lastError: null,
      },
      stages: [],
      chatTurns: [],
      memoryAssertions: null,
      runtimeDebugTrace: [],
      screenshots: [],
      diagnostics: {
        processOutput: [],
        rendererConsole: [],
        pageErrors: [],
      },
    } satisfies LocalAppBlackboxTrialReport
    const writeText = vi.fn(async () => {})
    const qualityReport = {
      version: 'memory-production-trial-runner-v1',
      passed: true,
      summary: { lastError: null },
    } as MemoryProductionTrialReport
    const qualityTrial = vi.fn(async (input: {
      cardId: string
      userDataPath: string
      mode: 'historical-replay' | 'live-provider'
      reportPath: string
      readOnly: boolean
    }) => {
      expect(input).toEqual({
        cardId: 'card-a',
        userDataPath: join('/tmp/alicization'),
        mode: 'historical-replay',
        reportPath: join('/tmp/blackbox/quality-report.json'),
        readOnly: true,
      })
      return {
        report: qualityReport,
        error: null,
      }
    })

    const report = await runLocalAppProductionTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: join('/tmp/alicization'),
        cardId: 'card-a',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['你好'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: true,
        qualityMode: 'historical-replay',
        qualityReadOnly: true,
      },
      runBlackbox: vi.fn(async () => blackbox),
      runQualityTrial: qualityTrial,
      writeText,
      now: vi.fn()
        .mockReturnValueOnce(1)
        .mockReturnValueOnce(2),
    })

    expect(qualityTrial).toHaveBeenCalledOnce()
    expect(report).toMatchObject({
      passed: true,
      cardId: 'card-a',
      qualityTrial: qualityReport,
      qualityTrialError: null,
    })
    expect(writeText).toHaveBeenCalledWith(
      join('/tmp/blackbox/production-report.json'),
      expect.stringContaining('"version": "alicization-local-app-production-trial-v1"'),
    )
  })

  it('locates UnoCSS icon buttons by their rendered attribute name', () => {
    expect(localAppIconButtonXPath('i-solar:chat-line-line-duotone')).toBe(
      'xpath=//button[descendant::*[@*[name()="i-solar:chat-line-line-duotone"]]]',
    )
  })

  it('does not settle a turn when only the optimistic user bubble changed', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'pending',
      error: null,
    })
  })

  it('settles only after a new assistant reply or a new infrastructure error becomes stable', () => {
    const before = {
      assistantCount: 2,
      assistantText: '上一轮回复',
      errorCount: 0,
      errorText: '',
    }
    expect(resolveLocalAppChatTurnState({
      before,
      current: {
        assistantCount: 3,
        assistantText: '这一轮真实回复',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'completed',
      error: null,
    })
    expect(resolveLocalAppChatTurnState({
      before,
      current: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: 'Provider 请求失败（HTTP 503）。',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'failed',
      error: 'Provider 请求失败（HTTP 503）。',
    })
  })

  it('does not treat an unchanged pre-existing error bubble as the current turn failure', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: 'Provider 请求失败（HTTP 503）。',
        errorFingerprint: 'Provider 请求失败（HTTP 503）。',
      },
      current: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: 'Provider 请求失败（HTTP 503）。',
        errorFingerprint: 'Provider 请求失败（HTTP 503）。',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'pending',
      error: null,
    })
  })

  it('settles a renderer-side infrastructure error without a runtime turn', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: '对话模型尚未配置。',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
      runtime: {
        requestTurnId: null,
        turnId: null,
        accepted: false,
        acceptedAtMs: null,
        streamFinished: false,
        streamFinishedAtMs: null,
        status: null,
        error: null,
      },
    })).toEqual({
      status: 'failed',
      error: '对话模型尚未配置。',
    })
  })

  it('settles a renderer-side error even when the failed send restores the input value', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: '对话模型尚未配置。',
      },
      inputValue: '你好',
      stopVisible: false,
      stableForMs: 1_000,
      runtime: {
        requestTurnId: null,
        turnId: null,
        accepted: false,
        acceptedAtMs: null,
        streamFinished: false,
        streamFinishedAtMs: null,
        status: null,
        error: null,
      },
    })).toEqual({
      status: 'failed',
      error: '对话模型尚未配置。',
    })
  })

  it('does not let a previous assistant text refresh settle the next turn', () => {
    const result = resolveLocalAppChatTurnState({
      before: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 2,
        assistantText: '上一轮回复（重新同步）',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
      runtime: {
        requestTurnId: 'turn-2',
        turnId: 'turn-2',
        accepted: true,
        streamFinished: false,
        status: null,
        error: null,
      },
    } as never)

    expect(result).toEqual({
      status: 'pending',
      error: null,
    })
  })

  it('binds accepted and finished evidence to the newest request turn', () => {
    const startedAt = Date.parse('2026-08-29T06:00:00.000Z')
    expect(resolveLocalAppChatRuntimeEvidence({
      cardId: 'card-a',
      startedAt,
      events: [
        {
          ts: '2026-08-28T06:00:00.000Z',
          event: 'chat-start.invoke-requested',
          cardId: 'card-a',
          turnId: 'old-turn',
        },
        {
          ts: '2026-08-28T06:00:01.000Z',
          event: 'chat-stream.finished',
          cardId: 'card-a',
          turnId: 'old-turn',
          status: 'completed',
        },
        {
          ts: '2026-08-29T06:00:00.100Z',
          event: 'chat-start.invoke-requested',
          cardId: 'card-a',
          turnId: 'current-turn',
        },
        {
          ts: '2026-08-29T06:00:00.110Z',
          event: 'chat-start.accepted',
          cardId: 'card-a',
          turnId: 'current-turn',
        },
        {
          ts: '2026-08-29T06:00:00.120Z',
          event: 'chat-stream.finished',
          cardId: 'card-other',
          turnId: 'other-turn',
          status: 'failed',
          reason: 'other card failure',
        },
        {
          ts: '2026-08-29T06:00:00.800Z',
          event: 'chat-stream.finished',
          cardId: 'card-a',
          turnId: 'current-turn',
          status: 'completed',
        },
      ],
    })).toEqual({
      requestTurnId: 'current-turn',
      turnId: 'current-turn',
      accepted: true,
      acceptedAtMs: 110,
      streamFinished: true,
      streamFinishedAtMs: 800,
      status: 'completed',
      error: null,
    })
  })

  it('recognizes the direct chat lifecycle emitted by the packaged app', () => {
    const startedAt = Date.parse('2026-08-29T15:55:44.000Z')
    expect(resolveLocalAppChatRuntimeEvidence({
      cardId: 'default',
      startedAt,
      events: [
        {
          ts: '2026-08-29T15:55:44.450Z',
          event: 'chat-start.direct-requested',
          cardId: 'default',
          turnId: 'turn-direct',
        },
        {
          ts: '2026-08-29T15:55:44.456Z',
          event: 'chat-start.accepted',
          cardId: 'default',
          turnId: 'turn-direct',
        },
        {
          ts: '2026-08-29T15:55:44.581Z',
          event: 'chat-start.direct-resolved',
          cardId: 'default',
          turnId: 'turn-direct',
          accepted: true,
        },
        {
          ts: '2026-08-29T15:56:10.348Z',
          event: 'chat-stream.finished',
          cardId: 'default',
          turnId: 'turn-direct',
          status: 'completed',
        },
      ],
    })).toEqual({
      requestTurnId: 'turn-direct',
      turnId: 'turn-direct',
      accepted: true,
      acceptedAtMs: 456,
      streamFinished: true,
      streamFinishedAtMs: 26_348,
      status: 'completed',
      error: null,
    })
  })

  it('requires the current turn finished event before accepting a new assistant reply', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 1,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 2,
        assistantText: '本轮回复仍在流式输出',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
      runtime: {
        requestTurnId: 'current-turn',
        turnId: 'current-turn',
        accepted: true,
        acceptedAtMs: 100,
        streamFinished: false,
        streamFinishedAtMs: null,
        status: null,
        error: null,
      },
    })).toEqual({
      status: 'pending',
      error: null,
    })
  })

  it('accepts a completed turn when reconciliation updates the existing assistant bubble', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 3,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 3,
        assistantText: '本轮最终回复',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
      runtime: {
        requestTurnId: 'current-turn',
        turnId: 'current-turn',
        accepted: true,
        acceptedAtMs: 100,
        streamFinished: true,
        streamFinishedAtMs: 800,
        status: 'completed',
        error: null,
      },
    })).toEqual({
      status: 'completed',
      error: null,
    })
  })

  it('waits for a renderer mount before navigating its hash route', async () => {
    const calls: string[] = []
    const page = {
      waitForLoadState: vi.fn(async () => {
        calls.push('load')
      }),
      waitForFunction: vi.fn(async () => {
        calls.push('mount')
      }),
      evaluate: vi.fn(async () => {
        calls.push('navigate')
      }),
      waitForURL: vi.fn(async () => {
        calls.push('url')
      }),
      url: vi.fn(() => 'file:///app/index.html#/settings/modules/memory'),
    }

    await navigateLocalAppPageToHashRoute(
      page as never,
      '/settings/modules/memory',
      45_000,
    )

    expect(calls).toEqual(['load', 'mount', 'navigate', 'url'])
  })

  it('provides novice-safe installed app and artifact defaults', () => {
    expect(parseLocalAppBlackboxTrialArgs([], {
      homeDir: join('/Users/alice'),
      now: () => Date.parse('2026-08-29T06:00:00.000Z'),
    })).toEqual({
      appPath: join('/Users/alice/Applications/Alicization Local.app'),
      userDataPath: join('/Users/alice/Library/Application Support/Alicization'),
      cardId: 'default',
      outputDir: join('/Users/alice/Desktop/Alicization-Blackbox-Traces/2026-08-29T06-00-00-000Z'),
      remoteDebugPort: 9222,
      launchTimeoutMs: 45_000,
      turnTimeoutMs: 120_000,
      messages: [],
      attachOnly: false,
      keepOpen: false,
      openMemoryWorkbench: true,
      runQualityTrial: false,
      qualityMode: 'historical-replay',
      qualityReadOnly: false,
    })
  })

  it('runs startup, chat, memory workbench, screenshots, and runtime trace as one JSON report', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'completed' as const,
        startedAt: 100,
        finishedAt: 920,
        turnId: message === '你好' ? 'turn-report-1' : 'turn-report-2',
        accepted: true,
        acceptedAtMs: 40,
        streamFinished: true,
        streamFinishedAtMs: 800,
        firstUiChangeMs: 120,
        settledMs: 820,
        visibleText: `用户：${message}\n她：我记得。`,
        error: null,
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆 工作记忆 长期记忆 人格候选 健康与审计',
      })),
      captureScreenshots: vi.fn(async () => [{
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
        path: join('/tmp/blackbox/chat.png'),
      }]),
      collectDiagnostics: vi.fn(async () => ({
        processOutput: ['[stdout] app ready'],
        rendererConsole: [{
          type: 'info',
          text: 'renderer mounted',
          url: 'file:///app/index.html#/',
        }],
        pageErrors: [],
      })),
      close: vi.fn(async () => {}),
    }
    const writeText = vi.fn(async () => {})
    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: join('/tmp/alicization'),
        cardId: 'default',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['你好', '记住我喜欢蓝色'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => [{
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-start.accepted',
        turnId: 'turn-1',
      }]),
      writeText,
      now: vi.fn()
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:00.000Z'))
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:03.000Z')),
    })

    expect(report).toMatchObject({
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      summary: {
        requestedMessageCount: 2,
        completedMessageCount: 2,
        runtimeTraceEventCount: 1,
        screenshotCount: 1,
        rendererConsoleEventCount: 1,
      },
    })
    expect(report.chatTurns).toEqual([
      expect.objectContaining({
        turnId: 'turn-report-1',
        accepted: true,
        acceptedAtMs: 40,
        streamFinished: true,
        streamFinishedAtMs: 800,
        firstUiChangeMs: 120,
        settledMs: 820,
        status: 'completed',
      }),
      expect.objectContaining({
        turnId: 'turn-report-2',
        accepted: true,
        acceptedAtMs: 40,
        streamFinished: true,
        streamFinishedAtMs: 800,
        firstUiChangeMs: 120,
        settledMs: 820,
        status: 'completed',
      }),
    ])
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'chat-message-1',
        details: expect.objectContaining({
          accepted: true,
          turnId: 'turn-report-1',
          streamFinished: true,
          firstUiChangeMs: 120,
          settledMs: 820,
          status: 'completed',
        }),
      }),
    ]))
    expect(report.stages.map(stage => stage.id)).toEqual([
      'app-launch',
      'remote-debug-attach',
      'stage-startup',
      'chat-window',
      'chat-message-1',
      'chat-message-2',
      'memory-workbench',
      'runtime-debug-trace',
      'screenshots',
    ])
    expect(writeText).toHaveBeenCalledWith(
      join('/tmp/blackbox/runtime-debug.jsonl'),
      expect.stringContaining('"event":"chat-start.accepted"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      join('/tmp/blackbox/report.json'),
      expect.stringContaining('"version": "alicization-local-app-blackbox-trial-v1"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      join('/tmp/blackbox/app-process.log'),
      '[stdout] app ready\n',
    )
    expect(writeText).toHaveBeenCalledWith(
      join('/tmp/blackbox/renderer-console.jsonl'),
      expect.stringContaining('"text":"renderer mounted"'),
    )
    expect(automation.close).toHaveBeenCalledOnce()
  })

  it('records database-backed memory closure assertions in the blackbox report', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'completed' as const,
        firstUiChangeMs: 100,
        settledMs: 500,
        visibleText: '她：记住了。',
        error: null,
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆',
      })),
      captureScreenshots: vi.fn(async () => []),
      collectDiagnostics: vi.fn(async () => ({
        processOutput: [],
        rendererConsole: [],
        pageErrors: [],
      })),
      close: vi.fn(async () => {}),
    }
    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: join('/tmp/alicization'),
        cardId: 'default',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['记住我喜欢蓝色', '你还记得我喜欢什么颜色吗？'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => []),
      inspectMemory: vi.fn(async () => ({
        cardId: 'default',
        checkpointCount: 1,
        queue: {
          pending: 0,
          review: 0,
          applied: 1,
          failed: 0,
          deadLettered: 0,
        },
        longTerm: {
          factCount: 1,
          reflectionCount: 1,
          searchDocumentCount: 2,
          vectorCount: 2,
        },
        recall: {
          query: '你还记得我喜欢什么颜色吗？',
          matched: true,
          matchedIds: ['fact-blue'],
          summaries: ['用户喜欢蓝色。'],
        },
        failedTurnCount: 0,
        failedTurnMemoryLeakCount: 0,
        failureIsolationStatus: 'passed' as const,
        failureIsolationIndeterminateTurnCount: 0,
        failureIsolationPassed: true,
        errors: [],
      })),
      writeText: vi.fn(async () => {}),
    })

    expect(report).toMatchObject({
      passed: true,
      summary: {
        memoryAssertionPassed: true,
      },
      memoryAssertions: {
        cardId: 'default',
        checkpointCount: 1,
        recall: {
          matched: true,
        },
      },
    })
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'memory-closure',
        status: 'succeeded',
        details: expect.objectContaining({
          recallMatched: true,
        }),
      }),
    ]))
  })

  it('keeps a failed chat turn transparent and still collects evidence', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'failed' as const,
        firstUiChangeMs: null,
        settledMs: 10_000,
        visibleText: 'Provider 请求失败：HTTP 500',
        error: 'Provider 请求失败：HTTP 500',
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆',
      })),
      captureScreenshots: vi.fn(async () => []),
      close: vi.fn(async () => {}),
    }

    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: join('/tmp/alicization'),
        cardId: 'default',
        outputDir: join('/tmp/blackbox'),
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['你好'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
        runQualityTrial: false,
        qualityMode: 'historical-replay',
        qualityReadOnly: false,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => [{
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-stream.provider-request-failed',
        error: 'HTTP 500',
      }]),
      inspectMemory: vi.fn(async () => ({
        cardId: 'default',
        checkpointCount: 1,
        queue: {
          pending: 0,
          review: 0,
          applied: 0,
          failed: 0,
          deadLettered: 0,
        },
        longTerm: {
          factCount: 0,
          reflectionCount: 0,
          searchDocumentCount: 0,
          vectorCount: 0,
        },
        recall: {
          query: '',
          matched: false,
          status: 'not-requested' as const,
          turnId: null,
          matchedIds: [],
          summaries: [],
          evidence: [],
          events: [],
          errors: [],
        },
        failedTurnCount: 1,
        failedTurnMemoryLeakCount: 0,
        failureIsolationStatus: 'unknown' as const,
        failureIsolationIndeterminateTurnCount: 1,
        failureIsolationPassed: null,
        errors: [],
      })),
      writeText: vi.fn(async () => {}),
      now: vi.fn()
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:00.000Z'))
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:11.000Z')),
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failedStageIds).toContain('chat-message-1')
    expect(report.stages.find(stage => stage.id === 'chat-message-1')).toMatchObject({
      status: 'failed',
      error: 'Provider 请求失败：HTTP 500',
    })
    expect(report.stages.find(stage => stage.id === 'memory-closure')).toMatchObject({
      status: 'succeeded',
      details: expect.objectContaining({
        failureIsolationStatus: 'unknown',
        failureIsolationIndeterminateTurnCount: 1,
        failedTurnMemoryLeakCount: 0,
      }),
      error: null,
    })
    expect(report.summary.memoryAssertionPassed).toBeNull()
    expect(report.stages.find(stage => stage.id === 'memory-closure')?.error)
      .toBeNull()
    expect(report.runtimeDebugTrace).toEqual([
      expect.objectContaining({
        event: 'chat-stream.provider-request-failed',
        error: 'HTTP 500',
      }),
    ])
  })
})
