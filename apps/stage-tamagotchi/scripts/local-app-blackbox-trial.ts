import type {
  LocalAppBlackboxChatTurnEvidence,
  LocalAppBlackboxMemoryAssertions,
} from './local-app-blackbox-trial-runtime'

import process from 'node:process'

import { existsSync } from 'node:fs'
import { join } from 'node:path'

import sqlite3 from 'sqlite3'

import { chromium } from 'playwright'

import {
  createPlaywrightLocalAppBlackboxAutomation,
  parseLocalAppBlackboxTrialArgs,
  readRuntimeDebugTraceSince,
  runLocalAppBlackboxTrial,
} from './local-app-blackbox-trial-runtime'

const help = `用法：
  pnpm -F @proj-alicization/stage-tamagotchi app:blackbox-trial [选项]

选项：
  --message <文本>           发送一轮真实对话；可重复提供多轮
  --app <path>               App 路径，默认 ~/Applications/Alicization Local.app
  --user-data-path <path>    用户数据目录
  --output <path>            trace 输出目录，默认在桌面创建时间戳目录
  --port <number>            远程调试端口，默认 9222
  --launch-timeout-ms <ms>   App 启动与窗口等待上限
  --turn-timeout-ms <ms>     每轮真实对话等待上限
  --attach                   连接已经以远程调试模式启动的 App
  --keep-open                完成后不关闭由本命令启动的 App
  --no-memory-workbench      跳过记忆页面检查
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

function findMemoryNeed(messages: string[], query: string) {
  const queryIndex = messages.lastIndexOf(query)
  const source = messages
    .slice(0, queryIndex)
    .reverse()
    .find(message => /记住|喜欢|偏好/u.test(message))
  if (!source)
    return ''
  const match = source.match(/(?<prefix>记住我|记住|喜欢|偏好)(?<value>[^。！？!?,，\n]{1,80})/u)
  return match?.groups?.value?.trim() ?? ''
}

async function inspectLocalAppMemory(input: {
  userDataPath: string
  messages: string[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
}): Promise<LocalAppBlackboxMemoryAssertions> {
  const cardId = 'default'
  const dbPath = join(input.userDataPath, 'alicizations', 'alicization.db')
  const recallQuery = findMemoryRecallQuery(input.messages)
  const memoryNeed = findMemoryNeed(input.messages, recallQuery)
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
        matchedIds: [],
        summaries: [],
      },
      errors: [`找不到黑盒 App 数据库：${dbPath}`],
    }
  }

  const database = await openDatabase(dbPath)
  try {
    const [checkpointRows, queueRows, factRows, reflectionRows, searchRows, vectorRows, recallRows] = await Promise.all([
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
      memoryNeed
        ? all<{ id: string, source: string, summary: string }>(
            database,
            `
            SELECT id, source, summary
            FROM long_term_memory_search_documents
            WHERE card_id = ?
              AND tombstoned = 0
              AND (summary LIKE ? OR search_text LIKE ?)
            ORDER BY updated_at DESC, id ASC
            LIMIT 8
            `,
            [cardId, `%${memoryNeed}%`, `%${memoryNeed}%`],
          )
        : Promise.resolve([]),
    ])

    const matchedIds = recallRows.map(row => `${row.source}:${row.id}`)
    const errors = input.chatTurns
      .filter(turn => turn.status !== 'completed')
      .map(turn => turn.error ?? `对话未完成：${turn.message}`)
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
      recall: {
        query: recallQuery,
        matched: !recallQuery || recallRows.length > 0,
        matchedIds,
        summaries: recallRows.map(row => `${row.source}: ${row.summary}`),
      },
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
  const report = await runLocalAppBlackboxTrial({
    args,
    automation,
    inspectMemory: async input => await inspectLocalAppMemory(input),
    readRuntimeDebugTrace: async input =>
      await readRuntimeDebugTraceSince(input.path, input.since),
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
