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
  countFailedTurnMemoryLeaks,
  createPlaywrightLocalAppBlackboxAutomation,
  parseLocalAppBlackboxTrialArgs,
  readLocalAppRuntimeRecall,
  readRuntimeDebugTraceSince,
  resolveLocalAppMemoryDatabasePath,
  runLocalAppBlackboxTrial,
  runLocalAppProductionTrial,
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

function findMemoryRecallQuery(messages: string[]) {
  return [...messages]
    .reverse()
    .find(message => /记得|之前|上次|以前|喜欢什么|偏好/u.test(message))
    ?? ''
}

async function inspectLocalAppMemory(input: {
  userDataPath: string
  cardId: string
  messages: string[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
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
        matched: !recallQuery,
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
      failureIsolationPassed: failedTurns.length === 0,
      errors: [`找不到黑盒 App 数据库：${dbPath}`],
    }
  }

  const database = await openDatabase(dbPath)
  try {
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

    const recall = await readLocalAppRuntimeRecall({
      database,
      cardId,
      query: recallQuery,
      chatTurns: input.chatTurns,
    })
    const errors = [...(recall.errors ?? [])]
    const failedTurnMemoryLeakCount = await countFailedTurnMemoryLeaks({
      database,
      cardId,
      failedTurns,
    })
    return {
      cardId,
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
      failedTurnCount: failedTurns.length,
      failedTurnMemoryLeakCount,
      failureIsolationPassed: failedTurnMemoryLeakCount === 0,
      errors,
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
