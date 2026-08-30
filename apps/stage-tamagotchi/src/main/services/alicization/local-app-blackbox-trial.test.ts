import type { LocalAppBlackboxTrialReport } from '../../../../scripts/local-app-blackbox-trial-runtime'
import type { MemoryProductionTrialReport } from './memory-production-trial-runner'

import { EventEmitter } from 'node:events'

import sqlite3 from 'sqlite3'

import { describe, expect, it, vi } from 'vitest'

import {
  buildLocalAppProductionTrialReport,
  countFailedTurnMemoryLeaks,
  createPlaywrightLocalAppBlackboxAutomation,
  isLocalAppMainRendererUrl,
  localAppIconButtonXPath,
  navigateLocalAppPageToHashRoute,
  parseLocalAppBlackboxTrialArgs,
  readLocalAppRuntimeRecall,
  readRuntimeDebugTraceSince,
  resolveLocalAppChatRuntimeEvidence,
  resolveLocalAppChatTurnState,
  resolveLocalAppMemoryDatabasePath,
  runLocalAppBlackboxTrial,
  runLocalAppProductionTrial,
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

describe('local macOS app blackbox trial', () => {
  it('filters runtime debug JSONL by trial start and preserves malformed evidence', async () => {
    const trace = await readRuntimeDebugTraceSince(
      '/tmp/runtime-debug.log',
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
        appPath: '/Users/alice/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        cardId: 'card-a',
        outputDir: '/tmp/blackbox',
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
      '/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization',
      [
        '--user-data-dir',
        '/tmp/alicization',
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          ALICIZATION_USER_DATA_PATH: '/tmp/alicization',
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: '9333',
        }),
      }),
    )

    await automation.close()
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
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
        appPath: '/Users/alice/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        cardId: 'card-a',
        outputDir: '/tmp/blackbox',
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
      '/tmp/alicization/alicizations/cards/default/alicization.db',
      '/tmp/alicization/alicizations/alicization.db',
    ])

    expect(resolveLocalAppMemoryDatabasePath({
      userDataPath: '/tmp/alicization',
      cardId: 'default',
      pathExists: path => existing.has(path),
    })).toBe('/tmp/alicization/alicizations/cards/default/alicization.db')
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

  it('projects real recall evidence and terminal status from the corresponding turn events', async () => {
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
        'recall-evidence-event',
        'long_term_memory.recall.evidence',
        'turn-natural-question',
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

  it('combines the real App blackbox evidence with the DB quality trial', () => {
    const blackbox = {
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      startedAt: 10,
      finishedAt: 20,
      appPath: '/Applications/Alicization Local.app',
      userDataPath: '/tmp/alicization',
      cardId: 'card-a',
      outputDir: '/tmp/blackbox',
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
      userDataPath: '/tmp/alicization',
      cardId: 'card-a',
      outputDir: '/tmp/blackbox',
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
      '/tmp/alicization',
      '--card-id',
      'card-a',
    ])).toMatchObject({
      userDataPath: '/tmp/alicization',
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
      userDataPath: '/tmp/alicization',
      cardId: 'card-a',
      outputDir: '/tmp/blackbox',
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
        userDataPath: '/tmp/alicization',
        mode: 'historical-replay',
        reportPath: '/tmp/blackbox/quality-report.json',
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
        userDataPath: '/tmp/alicization',
        cardId: 'card-a',
        outputDir: '/tmp/blackbox',
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
      '/tmp/blackbox/production-report.json',
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
      homeDir: '/Users/alice',
      now: () => Date.parse('2026-08-29T06:00:00.000Z'),
    })).toEqual({
      appPath: '/Users/alice/Applications/Alicization Local.app',
      userDataPath: '/Users/alice/Library/Application Support/com.tohoqing.alicization',
      cardId: 'default',
      outputDir: '/Users/alice/Desktop/Alicization-Blackbox-Traces/2026-08-29T06-00-00-000Z',
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
        path: '/tmp/blackbox/chat.png',
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
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        outputDir: '/tmp/blackbox',
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
      '/tmp/blackbox/runtime-debug.jsonl',
      expect.stringContaining('"event":"chat-start.accepted"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/report.json',
      expect.stringContaining('"version": "alicization-local-app-blackbox-trial-v1"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/app-process.log',
      '[stdout] app ready\n',
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/renderer-console.jsonl',
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
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        outputDir: '/tmp/blackbox',
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
        userDataPath: '/tmp/alicization',
        cardId: 'default',
        outputDir: '/tmp/blackbox',
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
    expect(report.runtimeDebugTrace).toEqual([
      expect.objectContaining({
        event: 'chat-stream.provider-request-failed',
        error: 'HTTP 500',
      }),
    ])
  })
})
