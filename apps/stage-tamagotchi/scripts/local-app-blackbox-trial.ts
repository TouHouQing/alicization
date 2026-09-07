import type {
  LocalAppBlackboxChatTurnEvidence,
  LocalAppBlackboxMemoryAssertions,
} from './local-app-blackbox-trial-runtime'

import process from 'node:process'

import { existsSync } from 'node:fs'

import sqlite3 from 'sqlite3'

import { chromium } from 'playwright'

import { runMemoryQualityTrialCli } from '../src/main/services/alicization/memory-quality-trial-cli'
import {
  assessFailedTurnMemoryLeaks,
  assessLocalAppCompressionEvidence,
  assessLocalAppProviderRequestEvidence,
  assessLocalAppSingleSession,
  createPlaywrightLocalAppBlackboxAutomation,
  findMemoryRecallQuery,
  parseLocalAppBlackboxTrialArgs,
  readLocalAppMemoryClosureSnapshot,
  readLocalAppProviderRequestEvidence,
  readLocalAppRuntimeRecall,
  readRuntimeDebugTraceSince,
  resolveLocalAppMemoryDatabasePath,
  runLocalAppBlackboxTrial,
  runLocalAppProductionTrial,
  validateLocalAppProductionMessageCount,
  waitForLocalAppMemoryClosure,
} from './local-app-blackbox-trial-runtime'

const help = `用法：
  pnpm -F @proj-alicization/stage-tamagotchi app:blackbox-trial [选项]

选项：
  --message <文本>           发送一轮真实对话；可重复提供多轮
  --app <path>               App 路径，默认 ~/Applications/Alicization Local.app
  --user-data-path <path>    用户数据目录
  --card-id <id>             当前机体，默认 default
  --output <path>            trace 输出目录，默认在桌面创建时间戳目录
  --port <number>            远程调试端口，默认 9222
  --launch-timeout-ms <ms>   App 启动与窗口等待上限
  --turn-timeout-ms <ms>     每轮真实对话等待上限
  --attach                   连接已经以远程调试模式启动的 App
  --keep-open                完成后不关闭由本命令启动的 App
  --no-memory-workbench      跳过记忆页面检查
  --quality-trial             黑盒回放结束后运行同一机体的 DB 质量试用
  --quality-mode <mode>       historical-replay 或 live-provider，默认 historical-replay
  --quality-read-only         质量试用只读，不写入 gold pack 或质量状态
  --help                     显示帮助

示例：
  pnpm -F @proj-alicization/stage-tamagotchi app:blackbox-trial --message "你好" --message "记住我喜欢蓝色" --message "我喜欢什么颜色？"
`

function openDatabase(path: string) {
  return new Promise<sqlite3.Database>((resolve, reject) => {
    const database = new sqlite3.Database(
      path,
      sqlite3.OPEN_READONLY,
      (error: Error | null) => {
        if (error)
          reject(error)
        else
          resolve(database)
      },
    )
  })
}

function all<T>(database: sqlite3.Database, sql: string, params: unknown[] = []) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows?: T[]) => {
      if (error)
        reject(error)
      else
        resolve(rows ?? [])
    })
  })
}

function closeDatabase(database: sqlite3.Database) {
  return new Promise<void>((resolve, reject) => {
    database.close((error: Error | null) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
}

function countByStatus(rows: Array<{ status: string, count: number }>, ...statuses: string[]) {
  const statusSet = new Set(statuses)
  return rows
    .filter(row => statusSet.has(row.status))
    .reduce((total, row) => total + Number(row.count || 0), 0)
}

export async function inspectLocalAppMemory(input: {
  userDataPath: string
  cardId: string
  messages: string[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
  runtimeDebugTrace?: Array<Record<string, unknown>>
}): Promise<LocalAppBlackboxMemoryAssertions> {
  const cardId = input.cardId.trim() || 'default'
  const dbPath = resolveLocalAppMemoryDatabasePath({
    userDataPath: input.userDataPath,
    cardId,
  })
  const recallQuery = findMemoryRecallQuery(input.messages)
  const failedTurns = input.chatTurns.filter(turn => turn.status !== 'completed')
  if (!existsSync(dbPath)) {
    return {
      cardId,
      checkpointCount: 0,
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
        query: recallQuery,
        matched: false,
        status: recallQuery ? 'unknown' : 'not-requested',
        turnId: null,
        matchedIds: [],
        summaries: [],
        evidence: [],
        events: [],
        errors: [],
      },
      failedTurnCount: failedTurns.length,
      failedTurnMemoryLeakCount: 0,
      failureIsolationStatus: failedTurns.length === 0 ? 'passed' : 'unknown',
      failureIsolationIndeterminateTurnCount: failedTurns.length,
      failureIsolationPassed: failedTurns.length === 0 ? true : null,
      errors: [`找不到黑盒 App 数据库：${dbPath}`],
    }
  }

  const database = await openDatabase(dbPath)
  try {
    const closureWait = await waitForLocalAppMemoryClosure({
      readSnapshot: async () => await readLocalAppMemoryClosureSnapshot(database, cardId),
    })
    const [checkpointRows, queueRows, factRows, reflectionRows, searchRows, vectorRows] = await Promise.all([
      all<{ count: number }>(
        database,
        'SELECT COUNT(*) AS count FROM working_memory_checkpoints WHERE card_id = ?',
        [cardId],
      ),
      all<{ status: string, count: number }>(
        database,
        'SELECT status, COUNT(*) AS count FROM working_memory_long_term_transactions WHERE card_id = ? GROUP BY status',
        [cardId],
      ),
      all<{ count: number }>(
        database,
        'SELECT COUNT(*) AS count FROM memory_facts WHERE card_id = ?',
        [cardId],
      ),
      all<{ count: number }>(
        database,
        'SELECT COUNT(*) AS count FROM memory_reflections WHERE card_id = ? AND status = \'confirmed\'',
        [cardId],
      ),
      all<{ count: number }>(
        database,
        'SELECT COUNT(*) AS count FROM long_term_memory_search_documents WHERE card_id = ? AND tombstoned = 0',
        [cardId],
      ),
      all<{ count: number }>(
        database,
        'SELECT COUNT(*) AS count FROM long_term_memory_vectors WHERE card_id = ? AND status = \'indexed\'',
        [cardId],
      ),
    ])

    const expectedTurnIds = [...new Set(input.chatTurns
      .map(turn => turn.turnId?.trim() ?? '')
      .filter(Boolean))]
    const runtimeEventRows = expectedTurnIds.length > 0
      ? await all<{
          event_id: string
          event_type: string
          turn_id: string
          conversation_id: string
          occurred_at: number
          sequence: number
          payload_json: string
        }>(
          database,
          `
          SELECT event_id, event_type, turn_id, conversation_id, occurred_at, sequence, payload_json
          FROM alicization_runtime_events
          WHERE card_id = ?
            AND turn_id IN (${expectedTurnIds.map(() => '?').join(', ')})
          ORDER BY occurred_at ASC, sequence ASC, event_id ASC
          `,
          [cardId, ...expectedTurnIds],
        )
      : []
    const runtimeEvents = runtimeEventRows.map((row) => {
      let payload: Record<string, unknown> = {}
      try {
        const parsed = JSON.parse(row.payload_json)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
          payload = parsed as Record<string, unknown>
      }
      catch {
        payload = {}
      }
      return {
        eventId: row.event_id,
        eventType: row.event_type,
        turnId: row.turn_id,
        conversationId: row.conversation_id,
        occurredAt: row.occurred_at,
        sequence: row.sequence,
        payload,
      }
    })
    const singleSession = assessLocalAppSingleSession({
      expectedTurnIds,
      events: runtimeEventRows.map(row => ({
        turnId: row.turn_id,
        conversationId: row.conversation_id,
      })),
    })
    const providerRequests = readLocalAppProviderRequestEvidence({
      events: input.runtimeDebugTrace ?? [],
      cardId,
    })
    const compression = assessLocalAppCompressionEvidence({
      runtimeEvents,
      providerRequests,
      expectedTurnCount: input.chatTurns.length,
    })
    const recall = await readLocalAppRuntimeRecall({
      database,
      cardId,
      query: recallQuery,
      chatTurns: input.chatTurns,
    })
    const providerRequestAssessment = assessLocalAppProviderRequestEvidence(
      providerRequests,
      recall.turnId && recall.status
        ? {
            requiredRecall: {
              turnId: recall.turnId,
              status: recall.status,
              matchedIds: recall.matchedIds,
            },
          }
        : undefined,
    )
    const errors = [...(recall.errors ?? [])]
    const failureIsolation = await assessFailedTurnMemoryLeaks({
      database,
      cardId,
      failedTurns,
    })
    return {
      cardId,
      closureWait,
      checkpointCount: Number(checkpointRows[0]?.count ?? 0),
      queue: {
        pending: countByStatus(queueRows, 'pending-cleaning', 'admitted'),
        review: countByStatus(queueRows, 'needs-user-review'),
        applied: countByStatus(queueRows, 'applied'),
        failed: countByStatus(queueRows, 'failed'),
        deadLettered: countByStatus(queueRows, 'dead-lettered'),
      },
      longTerm: {
        factCount: Number(factRows[0]?.count ?? 0),
        reflectionCount: Number(reflectionRows[0]?.count ?? 0),
        searchDocumentCount: Number(searchRows[0]?.count ?? 0),
        vectorCount: Number(vectorRows[0]?.count ?? 0),
      },
      recall,
      singleSession,
      providerRequests,
      providerRequestAssessment,
      compression,
      failedTurnCount: failedTurns.length,
      failedTurnMemoryLeakCount: failureIsolation.leakedCount,
      failureIsolationStatus: failureIsolation.status,
      failureIsolationIndeterminateTurnCount: failureIsolation.indeterminateTurnCount,
      failureIsolationPassed: failureIsolation.status === 'passed'
        ? true
        : failureIsolation.status === 'failed'
          ? false
          : null,
      errors: closureWait.settled
        ? errors
        : [
            ...errors,
            `记忆闭环在 ${closureWait.waitedMs}ms 内未收敛：activeQueue=${closureWait.snapshot?.activeQueueCount ?? 'unknown'} activeIngest=${closureWait.snapshot?.activeIngestCount ?? 'unknown'} activeReindex=${closureWait.snapshot?.activeReindexCount ?? 'unknown'}`,
          ],
    }
  }
  finally {
    await closeDatabase(database)
  }
}

async function main() {
  const rawArgs = process.argv.slice(2)
  if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
    process.stdout.write(help)
    return
  }

  const args = parseLocalAppBlackboxTrialArgs(rawArgs)
  validateLocalAppProductionMessageCount(args.messages.length)
  const automation = createPlaywrightLocalAppBlackboxAutomation({
    args,
    connectOverCDP: async endpoint => await chromium.connectOverCDP(endpoint),
  })
  const report = await runLocalAppProductionTrial({
    args,
    runBlackbox: async () =>
      await runLocalAppBlackboxTrial({
        args,
        automation,
        inspectMemory: async input => await inspectLocalAppMemory(input),
        readRuntimeDebugTrace: async input =>
          await readRuntimeDebugTraceSince(input.path, input.since),
      }),
    runQualityTrial: args.runQualityTrial
      ? async (qualityInput) => {
        const result = await runMemoryQualityTrialCli({
          args: {
            userDataPath: qualityInput.userDataPath,
            databasePath: null,
            cardId: qualityInput.cardId,
            mode: qualityInput.mode,
            reportPath: qualityInput.reportPath,
            sessionId: null,
            readOnly: qualityInput.readOnly,
          },
          writeOutput: () => {},
        })
        const qualityReport = result.report?.version === 'memory-production-trial-runner-v1'
          ? result.report
          : null
        return {
          report: qualityReport,
          error: result.error
            ?? (result.report && 'error' in result.report ? result.report.error : null),
        }
      }
      : undefined,
  })
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  process.stderr.write(`黑盒 trace 已写入：${args.outputDir}\n`)
  if (!report.passed)
    process.exitCode = 2
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
