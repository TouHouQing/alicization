import type { Browser, Locator, Page } from 'playwright'
import type sqlite3 from 'sqlite3'

import type { MemoryProductionTrialReport } from '../src/main/services/alicization/memory-production-trial-runner'

import process from 'node:process'

import { spawn as spawnProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, join } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { URL } from 'node:url'

export interface LocalAppBlackboxTrialArgs {
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  remoteDebugPort: number
  launchTimeoutMs: number
  turnTimeoutMs: number
  messages: string[]
  attachOnly: boolean
  keepOpen: boolean
  openMemoryWorkbench: boolean
  runQualityTrial: boolean
  qualityMode: 'historical-replay' | 'live-provider'
  qualityReadOnly: boolean
}

export interface LocalAppBlackboxStartupEvidence {
  title: string
  url: string
  readyState: string
  stageReady: boolean
}

export interface LocalAppBlackboxWindowEvidence {
  title: string
  url: string
  visibleText?: string
}

export interface LocalAppBlackboxChatTurnEvidence {
  message: string
  status: 'completed' | 'failed' | 'timed-out'
  startedAt?: number
  finishedAt?: number
  turnId?: string | null
  accepted?: boolean
  acceptedAtMs?: number | null
  streamFinished?: boolean
  streamFinishedAtMs?: number | null
  firstUiChangeMs: number | null
  settledMs: number
  visibleText: string
  error: string | null
}

export interface LocalAppChatRuntimeEvidence {
  requestTurnId: string | null
  turnId: string | null
  accepted: boolean
  acceptedAtMs: number | null
  streamFinished: boolean
  streamFinishedAtMs: number | null
  status: 'completed' | 'failed' | 'timed-out' | 'aborted' | null
  error: string | null
}

export interface LocalAppBlackboxScreenshotEvidence {
  title: string
  url: string
  path: string
}

export interface LocalAppBlackboxDiagnostics {
  processOutput: string[]
  rendererConsole: Array<{
    type: string
    text: string
    url: string
  }>
  pageErrors: Array<{
    message: string
    url: string
  }>
}

export interface LocalAppBlackboxMemoryAssertions {
  cardId: string
  checkpointCount: number
  queue: {
    pending: number
    review: number
    applied: number
    failed: number
    deadLettered: number
  }
  longTerm: {
    factCount: number
    reflectionCount: number
    searchDocumentCount: number
    vectorCount: number
  }
  recall: LocalAppBlackboxMemoryRecall
  failedTurnCount: number
  failedTurnMemoryLeakCount: number
  failureIsolationPassed: boolean
  errors: string[]
}

export type LocalAppBlackboxRecallEventStatus = 'evidence' | 'abstained' | 'completed'

export interface LocalAppBlackboxRecallEvidence {
  id: string | null
  summary: string | null
  status: 'evidence'
  turnId: string
}

export interface LocalAppBlackboxRecallEvent {
  eventId: string
  eventType:
    | 'long_term_memory.recall.evidence'
    | 'long_term_memory.recall.abstained'
    | 'long_term_memory.recall.completed'
  status: LocalAppBlackboxRecallEventStatus
  turnId: string
  evidenceId: string | null
  summary: string | null
}

export interface LocalAppBlackboxMemoryRecall {
  query: string
  matched: boolean
  status?: 'not-requested' | 'unknown' | 'recalled' | 'empty' | 'failed'
  turnId?: string | null
  matchedIds: string[]
  summaries: string[]
  evidence?: LocalAppBlackboxRecallEvidence[]
  events?: LocalAppBlackboxRecallEvent[]
  errors?: string[]
}

export interface LocalAppRuntimeRecallEventRow {
  event_id: string
  event_type: string
  turn_id: string
  occurred_at: number
  sequence: number
  payload_json: string
}

function allDatabaseRows<T>(
  database: sqlite3.Database,
  sql: string,
  params: unknown[] = [],
) {
  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows?: T[]) => {
      if (error)
        reject(error)
      else
        resolve(rows ?? [])
    })
  })
}

function emptyLocalAppMemoryRecall(
  query: string,
  status: NonNullable<LocalAppBlackboxMemoryRecall['status']> = 'unknown',
) {
  return {
    query,
    matched: status === 'not-requested',
    status,
    turnId: null,
    matchedIds: [],
    summaries: [],
    evidence: [],
    events: [],
    errors: [],
  } satisfies LocalAppBlackboxMemoryRecall
}

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function recallEventStatus(eventType: LocalAppRuntimeRecallEventRow['event_type']) {
  if (eventType === 'long_term_memory.recall.evidence')
    return 'evidence' as const
  if (eventType === 'long_term_memory.recall.abstained')
    return 'abstained' as const
  return 'completed' as const
}

function recallProviderStatus(value: unknown): Exclude<
  NonNullable<LocalAppBlackboxMemoryRecall['status']>,
  'not-requested' | 'unknown'
> | null {
  return value === 'recalled' || value === 'empty' || value === 'failed'
    ? value
    : null
}

export async function readLocalAppRuntimeRecall(input: {
  database: sqlite3.Database
  cardId: string
  query: string
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
}): Promise<LocalAppBlackboxMemoryRecall> {
  const query = input.query.trim()
  if (!query)
    return emptyLocalAppMemoryRecall('', 'not-requested')

  const targetTurn = [...input.chatTurns]
    .reverse()
    .find(turn => turn.message.trim() === query)
    ?? input.chatTurns.at(-1)
  const turnId = targetTurn?.turnId?.trim() ?? ''
  const startedAt = targetTurn?.startedAt
  const finishedAt = targetTurn?.finishedAt
  const hasTimeWindow = Number.isFinite(startedAt) && Number.isFinite(finishedAt)
  if (!targetTurn || (!turnId && !hasTimeWindow)) {
    return {
      ...emptyLocalAppMemoryRecall(query),
      errors: [`无法将长期记忆召回查询关联到回放 turn：${query}`],
    }
  }

  const scopeCondition = turnId
    ? 'turn_id = ?'
    : '(occurred_at >= ? AND occurred_at <= ?)'
  const scopeParams = turnId
    ? [turnId]
    : [
        Math.max(0, Math.min(startedAt!, finishedAt!) - 1_000),
        Math.max(startedAt!, finishedAt!) + 1_000,
      ]
  const eventTypes = [
    'long_term_memory.recall.evidence',
    'long_term_memory.recall.abstained',
    'long_term_memory.recall.completed',
  ] as const
  const rows = await allDatabaseRows<LocalAppRuntimeRecallEventRow>(
    input.database,
    `
    SELECT event_id, event_type, turn_id, occurred_at, sequence, payload_json
    FROM alicization_runtime_events
    WHERE card_id = ?
      AND event_type IN (?, ?, ?)
      AND ${scopeCondition}
    ORDER BY occurred_at ASC, sequence ASC, event_id ASC
    `,
    [input.cardId, ...eventTypes, ...scopeParams],
  )

  const errors: string[] = []
  const parsedRows = rows.map((row) => {
    try {
      return {
        row,
        payload: jsonRecord(JSON.parse(row.payload_json)),
      }
    }
    catch {
      errors.push(`无法解析长期记忆召回事件 payload：${row.event_id}`)
      return {
        row,
        payload: null,
      }
    }
  })
  const eventRows = parsedRows.filter((
    item,
  ): item is {
    row: LocalAppRuntimeRecallEventRow
    payload: Record<string, unknown>
  } => item.payload !== null)
  const events = eventRows.map(({ row, payload }) => {
    const status = recallEventStatus(row.event_type)
    return {
      eventId: row.event_id,
      eventType: row.event_type as LocalAppBlackboxRecallEvent['eventType'],
      status,
      turnId: row.turn_id,
      evidenceId: status === 'evidence'
        ? nonEmptyString(payload.id)
        : null,
      summary: status === 'evidence'
        ? nonEmptyString(payload.summary)
        : null,
    }
  })
  const evidence = events
    .filter(event => event.status === 'evidence')
    .map(event => ({
      id: event.evidenceId,
      summary: event.summary,
      status: 'evidence' as const,
      turnId: event.turnId,
    }))
  const terminalStatus = [...eventRows]
    .reverse()
    .find(({ row }) => (
      row.event_type === 'long_term_memory.recall.completed'
      || row.event_type === 'long_term_memory.recall.abstained'
    ))
  const status = recallProviderStatus(terminalStatus?.payload.status)
    ?? (evidence.length > 0 ? 'recalled' : 'unknown')
  const usableEvidence = status === 'recalled' ? evidence : []
  const matchedIds = usableEvidence
    .map(item => item.id)
    .filter((id): id is string => id !== null)
  const summaries = usableEvidence
    .map(item => item.summary)
    .filter((summary): summary is string => summary !== null)

  return {
    query,
    matched: usableEvidence.length > 0,
    status,
    turnId: rows[0]?.turn_id ?? null,
    matchedIds,
    summaries,
    evidence: usableEvidence,
    events,
    errors,
  }
}

export async function countFailedTurnMemoryLeaks(input: {
  database: sqlite3.Database
  cardId: string
  failedTurns: LocalAppBlackboxChatTurnEvidence[]
}) {
  const failedTurns = input.failedTurns.filter(turn => turn.status !== 'completed')
  if (failedTurns.length === 0)
    return 0

  const turnIds = [...new Set(failedTurns
    .map(turn => turn.turnId?.trim() ?? '')
    .filter(Boolean))]
  const timestamps = failedTurns
    .flatMap(turn => [turn.startedAt, turn.finishedAt])
    .filter((value): value is number => Number.isFinite(value))
  const timeWindow = timestamps.length > 0
    ? {
        start: Math.max(0, Math.min(...timestamps) - 1_000),
        end: Math.max(...timestamps) + 1_000,
      }
    : null
  const leakedRows = new Set<string>()
  const sourceIds = new Set<string>()

  async function readTurnScopedRows(table: 'memory_reflections' | 'episodic_events' | 'persona_reinforcement_events' | 'person_state_evolution_log') {
    const conditions = ['card_id = ?']
    const params: unknown[] = [input.cardId]
    if (turnIds.length > 0) {
      if (timeWindow) {
        conditions.push(`(
          turn_id IN (${turnIds.map(() => '?').join(', ')})
          OR (turn_id IS NULL AND created_at >= ? AND created_at <= ?)
        )`)
        params.push(...turnIds, timeWindow.start, timeWindow.end)
      }
      else {
        conditions.push(`turn_id IN (${turnIds.map(() => '?').join(', ')})`)
        params.push(...turnIds)
      }
    }
    else if (timeWindow) {
      conditions.push('created_at >= ?', 'created_at <= ?')
      params.push(timeWindow.start, timeWindow.end)
    }
    else {
      return []
    }

    return await allDatabaseRows<{ id: string }>(
      input.database,
      `SELECT id FROM ${table} WHERE ${conditions.join(' AND ')}`,
      params,
    )
  }

  const linkedRows = await Promise.all([
    readTurnScopedRows('memory_reflections'),
    readTurnScopedRows('episodic_events'),
    readTurnScopedRows('persona_reinforcement_events'),
    readTurnScopedRows('person_state_evolution_log'),
  ])
  for (const [index, rows] of linkedRows.entries()) {
    const table = [
      'memory_reflections',
      'episodic_events',
      'persona_reinforcement_events',
      'person_state_evolution_log',
    ][index]!
    for (const row of rows) {
      leakedRows.add(`${table}:${row.id}`)
      if (table === 'memory_reflections' || table === 'episodic_events' || table === 'persona_reinforcement_events')
        sourceIds.add(row.id)
    }
  }

  if (sourceIds.size > 0) {
    const sourceIdList = [...sourceIds]
    const conditions = [
      'card_id = ?',
      `source_id IN (${sourceIdList.map(() => '?').join(', ')})`,
    ]
    const params: unknown[] = [input.cardId, ...sourceIdList]
    if (timeWindow) {
      conditions.push('created_at >= ?', 'created_at <= ?')
      params.push(timeWindow.start, timeWindow.end)
    }
    const personaRows = await allDatabaseRows<{ id: string }>(
      input.database,
      `
      SELECT id
      FROM persona_training_dataset_examples
      WHERE ${conditions.join(' AND ')}
      `,
      params,
    )
    for (const row of personaRows)
      leakedRows.add(`persona_training_dataset_examples:${row.id}`)
  }

  const consolidationRows = await allDatabaseRows<{
    id: string
    derived_event_ids_json: string | null
  }>(
    input.database,
    `
    SELECT id, derived_event_ids_json
    FROM memory_consolidations
    WHERE card_id = ?
    `,
    [input.cardId],
  )
  for (const eventId of linkedRows[1]!.map(row => row.id)) {
    const matchingConsolidations = consolidationRows.filter((row) => {
      if (!row.derived_event_ids_json)
        return false
      try {
        const derivedEventIds = JSON.parse(row.derived_event_ids_json)
        return Array.isArray(derivedEventIds)
          && derivedEventIds.includes(eventId)
      }
      catch {
        return false
      }
    })
    for (const row of matchingConsolidations)
      leakedRows.add(`memory_consolidations:${row.id}`)
  }
  // Facts and relationship outcomes are deliberate failure audit records.
  return leakedRows.size
}

export interface LocalAppChatDomSnapshot {
  assistantCount: number
  assistantText: string
  errorCount: number
  errorText: string
}

export interface LocalAppBlackboxAutomation {
  launch: () => Promise<{ pid: number | null }>
  connect: () => Promise<void>
  waitForStartup: () => Promise<LocalAppBlackboxStartupEvidence>
  openChat: () => Promise<LocalAppBlackboxWindowEvidence>
  sendChatMessage: (message: string, timeoutMs: number) => Promise<LocalAppBlackboxChatTurnEvidence>
  openMemoryWorkbench: () => Promise<LocalAppBlackboxWindowEvidence>
  captureScreenshots: (outputDir: string) => Promise<LocalAppBlackboxScreenshotEvidence[]>
  collectDiagnostics?: () => Promise<LocalAppBlackboxDiagnostics>
  close: () => Promise<void>
}

export interface LocalAppBlackboxStage {
  id: string
  status: 'succeeded' | 'failed' | 'not-run'
  startedAt: number
  finishedAt: number
  error: string | null
  details: Record<string, unknown>
}

export interface LocalAppBlackboxTrialReport {
  version: 'alicization-local-app-blackbox-trial-v1'
  passed: boolean
  startedAt: number
  finishedAt: number
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  summary: {
    requestedMessageCount: number
    completedMessageCount: number
    failedMessageCount: number
    runtimeTraceEventCount: number
    screenshotCount: number
    rendererConsoleEventCount: number
    pageErrorCount: number
    memoryAssertionPassed: boolean | null
    failedStageIds: string[]
    lastError: string | null
  }
  stages: LocalAppBlackboxStage[]
  chatTurns: LocalAppBlackboxChatTurnEvidence[]
  memoryAssertions: LocalAppBlackboxMemoryAssertions | null
  runtimeDebugTrace: Array<Record<string, unknown>>
  screenshots: LocalAppBlackboxScreenshotEvidence[]
  diagnostics: LocalAppBlackboxDiagnostics
}

export interface LocalAppProductionTrialReport {
  version: 'alicization-local-app-production-trial-v1'
  passed: boolean
  startedAt: number
  finishedAt: number
  appPath: string
  userDataPath: string
  cardId: string
  outputDir: string
  summary: {
    blackboxPassed: boolean
    qualityTrialPassed: boolean | null
    qualityTrialStatus: 'passed' | 'failed' | 'not-run' | null
    lastError: string | null
  }
  blackbox: LocalAppBlackboxTrialReport
  qualityTrial: MemoryProductionTrialReport | null
  qualityTrialError: string | null
}

export interface LocalAppProductionTrialQualityResult {
  report: MemoryProductionTrialReport | null
  error: string | null
}

export interface LocalAppBlackboxTrialDependencies {
  automation: LocalAppBlackboxAutomation
  readRuntimeDebugTrace: (input: {
    path: string
    since: number
  }) => Promise<Array<Record<string, unknown>>>
  writeText?: (path: string, content: string) => Promise<void>
  ensureOutputDir?: (path: string) => Promise<void>
  inspectMemory?: (input: {
    userDataPath: string
    cardId: string
    messages: string[]
    chatTurns: LocalAppBlackboxChatTurnEvidence[]
  }) => Promise<LocalAppBlackboxMemoryAssertions>
  now?: () => number
}

function classifyQualityTrial(report: MemoryProductionTrialReport | null) {
  if (!report)
    return null
  const stages = Array.isArray(report.stages) ? report.stages : []
  if (stages.length > 0 && stages.every(stage => stage.status === 'not-run'))
    return 'not-run' as const
  if (report.passed)
    return 'passed' as const
  return 'failed' as const
}

function optionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith('--'))
    throw new Error(`选项 ${name} 需要一个值。`)
  return value
}

function positiveInteger(value: string, name: string) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`选项 ${name} 必须是正整数。`)
  return parsed
}

export function parseLocalAppBlackboxTrialArgs(
  rawArgs: string[],
  defaults: {
    homeDir?: string
    now?: () => number
  } = {},
): LocalAppBlackboxTrialArgs {
  const home = defaults.homeDir ?? homedir()
  const timestamp = new Date((defaults.now ?? (() => Date.now()))())
    .toISOString()
    .replace(/[.:]/g, '-')
  let appPath = join(home, 'Applications', 'Alicization Local.app')
  let userDataPath = join(home, 'Library', 'Application Support', 'com.tohoqing.alicization')
  let cardId = 'default'
  let outputDir = join(home, 'Desktop', 'Alicization-Blackbox-Traces', timestamp)
  let remoteDebugPort = 9222
  let launchTimeoutMs = 45_000
  let turnTimeoutMs = 120_000
  const messages: string[] = []
  let attachOnly = false
  let keepOpen = false
  let openMemoryWorkbench = true
  let runQualityTrial = false
  let qualityMode: 'historical-replay' | 'live-provider' = 'historical-replay'
  let qualityReadOnly = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]
    if (!argument || argument === '--')
      continue

    const [rawName, inlineValue] = argument.split('=', 2)
    const name = rawName.trim()
    const value = inlineValue?.trim() || null
    const readValue = () => value ?? optionValue(rawArgs, index++, name)

    if (name === '--app') {
      appPath = readValue()
      continue
    }
    if (name === '--user-data-path') {
      userDataPath = readValue()
      continue
    }
    if (name === '--card-id') {
      cardId = readValue()
      continue
    }
    if (name === '--output') {
      outputDir = readValue()
      continue
    }
    if (name === '--port') {
      remoteDebugPort = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--launch-timeout-ms') {
      launchTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--turn-timeout-ms') {
      turnTimeoutMs = positiveInteger(readValue(), name)
      continue
    }
    if (name === '--message') {
      messages.push(readValue())
      continue
    }
    if (name === '--attach') {
      attachOnly = true
      continue
    }
    if (name === '--keep-open') {
      keepOpen = true
      continue
    }
    if (name === '--no-memory-workbench') {
      openMemoryWorkbench = false
      continue
    }
    if (name === '--quality-trial') {
      runQualityTrial = true
      continue
    }
    if (name === '--quality-mode') {
      const parsed = readValue()
      if (parsed !== 'historical-replay' && parsed !== 'live-provider')
        throw new Error(`选项 --quality-mode 不支持值 ${parsed}。`)
      qualityMode = parsed
      runQualityTrial = true
      continue
    }
    if (name === '--quality-read-only') {
      qualityReadOnly = true
      runQualityTrial = true
      continue
    }
    if (name === '--help' || name === '-h')
      continue
    throw new Error(`不支持的选项：${name}。`)
  }

  if (remoteDebugPort > 65535)
    throw new Error('选项 --port 必须小于或等于 65535。')

  return {
    appPath,
    userDataPath,
    cardId,
    outputDir,
    remoteDebugPort,
    launchTimeoutMs,
    turnTimeoutMs,
    messages,
    attachOnly,
    keepOpen,
    openMemoryWorkbench,
    runQualityTrial,
    qualityMode,
    qualityReadOnly,
  }
}

export function resolveLocalAppMemoryDatabasePath(input: {
  userDataPath: string
  cardId: string
  pathExists?: (path: string) => boolean
}) {
  const pathExists = input.pathExists ?? existsSync
  const cardId = input.cardId.trim() || 'default'
  const candidates = [
    join(input.userDataPath, 'alicizations', 'cards', cardId, 'alicization.db'),
    join(input.userDataPath, 'alicizations', 'alicization.db'),
  ]
  return candidates.find(pathExists) ?? candidates[0]!
}

export function buildLocalAppProductionTrialReport(input: {
  blackbox: LocalAppBlackboxTrialReport
  qualityTrial: MemoryProductionTrialReport | null
  qualityTrialError?: string | null
  cardId?: string
  startedAt?: number
  finishedAt?: number
}) {
  const qualityTrialError = input.qualityTrialError?.trim() || null
  const qualityTrialStatus = classifyQualityTrial(input.qualityTrial)
    ?? (qualityTrialError ? 'failed' as const : null)
  const qualityTrialPassed = qualityTrialStatus === null
    ? null
    : qualityTrialStatus === 'passed'
  const lastError = qualityTrialError
    ?? input.qualityTrial?.summary.lastError
    ?? input.blackbox.summary.lastError
    ?? null
  return {
    version: 'alicization-local-app-production-trial-v1' as const,
    passed: input.blackbox.passed
      && (qualityTrialStatus === null || qualityTrialStatus === 'passed'),
    startedAt: input.startedAt ?? input.blackbox.startedAt,
    finishedAt: input.finishedAt ?? input.blackbox.finishedAt,
    appPath: input.blackbox.appPath,
    userDataPath: input.blackbox.userDataPath,
    cardId: input.cardId ?? input.blackbox.cardId,
    outputDir: input.blackbox.outputDir,
    summary: {
      blackboxPassed: input.blackbox.passed,
      qualityTrialPassed,
      qualityTrialStatus,
      lastError,
    },
    blackbox: input.blackbox,
    qualityTrial: input.qualityTrial,
    qualityTrialError,
  } satisfies LocalAppProductionTrialReport
}

export async function runLocalAppProductionTrial(input: {
  args: LocalAppBlackboxTrialArgs
  runBlackbox: () => Promise<LocalAppBlackboxTrialReport>
  runQualityTrial?: (input: {
    cardId: string
    userDataPath: string
    mode: 'historical-replay' | 'live-provider'
    reportPath: string
    readOnly: boolean
  }) => Promise<LocalAppProductionTrialQualityResult>
  writeText?: (path: string, content: string) => Promise<void>
  now?: () => number
}): Promise<LocalAppProductionTrialReport> {
  const now = input.now ?? (() => Date.now())
  const writeText = input.writeText ?? (async (path, content) => {
    await writeFile(path, content, {
      encoding: 'utf8',
      mode: 0o600,
    })
  })
  const startedAt = now()
  const blackbox = await input.runBlackbox()
  let qualityTrial: MemoryProductionTrialReport | null = null
  let qualityTrialError: string | null = null

  if (input.args.runQualityTrial) {
    if (!input.runQualityTrial) {
      qualityTrialError = '质量阶段已请求但没有配置 DB 质量试用运行器。'
    }
    else {
      try {
        const result = await input.runQualityTrial({
          cardId: input.args.cardId,
          userDataPath: input.args.userDataPath,
          mode: input.args.qualityMode,
          reportPath: join(input.args.outputDir, 'quality-report.json'),
          readOnly: input.args.qualityReadOnly,
        })
        qualityTrial = result.report
        qualityTrialError = result.error
      }
      catch (error) {
        qualityTrialError = errorMessage(error)
      }
    }
  }

  const report = buildLocalAppProductionTrialReport({
    blackbox,
    qualityTrial,
    qualityTrialError,
    cardId: input.args.cardId,
    startedAt,
    finishedAt: now(),
  })
  await writeText(
    join(input.args.outputDir, 'production-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  return report
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function readRuntimeDebugTraceSince(
  path: string,
  since: number,
  readText: (path: string) => Promise<string> = async inputPath =>
    await readFile(inputPath, 'utf8'),
) {
  let content = ''
  try {
    content = await readText(path)
  }
  catch (error) {
    const code = (error as NodeJS.ErrnoException | null)?.code
    if (code === 'ENOENT')
      return []
    throw error
  }

  return content
    .split(/\r?\n/u)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>
        const timestamp = typeof parsed.ts === 'string'
          ? Date.parse(parsed.ts)
          : Number.NaN
        if (Number.isFinite(timestamp) && timestamp < since)
          return null
        return parsed
      }
      catch {
        return {
          event: 'runtime-debug.parse-failed',
          raw: line,
        }
      }
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null)
}

function runtimeDebugEventName(event: Record<string, unknown>) {
  return typeof event.event === 'string' ? event.event : ''
}

function runtimeDebugTurnId(event: Record<string, unknown>) {
  return typeof event.turnId === 'string' && event.turnId.trim()
    ? event.turnId.trim()
    : null
}

function runtimeDebugCardId(event: Record<string, unknown>) {
  return typeof event.cardId === 'string' && event.cardId.trim()
    ? event.cardId.trim()
    : null
}

function runtimeDebugTimestamp(event: Record<string, unknown>) {
  if (typeof event.ts === 'string') {
    const timestamp = Date.parse(event.ts)
    if (Number.isFinite(timestamp))
      return timestamp
  }
  for (const key of ['occurredAt', 'occurred_at', 'timestamp']) {
    const value = event[key]
    if (typeof value === 'number' && Number.isFinite(value))
      return value
  }
  return null
}

function runtimeDebugError(event: Record<string, unknown>) {
  for (const key of ['error', 'reason', 'message']) {
    const value = event[key]
    if (typeof value === 'string' && value.trim())
      return value.trim()
  }
  return null
}

function runtimeDebugStatus(event: Record<string, unknown>) {
  const value = event.status
  return value === 'completed'
    || value === 'failed'
    || value === 'timed-out'
    || value === 'aborted'
    ? value
    : null
}

function isRuntimeFailureEvent(eventName: string) {
  return eventName === 'chat-start.invoke-failed'
    || eventName === 'chat-start.prepare-failed'
    || eventName === 'chat-stream.failed'
    || eventName === 'chat-stream.provider-request-failed'
    || eventName === 'chat-stream.timeout-failed'
}

function isRuntimeChatRequestEvent(eventName: string) {
  return eventName === 'chat-start.invoke-requested'
    || eventName === 'chat-start.direct-requested'
}

export function resolveLocalAppChatRuntimeEvidence(input: {
  events: Array<Record<string, unknown>>
  cardId?: string
  startedAt?: number
}): LocalAppChatRuntimeEvidence {
  const cardId = input.cardId?.trim() || null
  const events = input.events.filter((event) => {
    const timestamp = runtimeDebugTimestamp(event)
    const afterStart = input.startedAt === undefined
      || timestamp === null
      || timestamp >= input.startedAt
    if (cardId === null) {
      return afterStart
    }
    const eventCardId = runtimeDebugCardId(event)
    return (eventCardId === null || eventCardId === cardId) && afterStart
  })
  const requestIndex = events.reduce((latestIndex, event, index) => {
    return isRuntimeChatRequestEvent(runtimeDebugEventName(event))
      ? index
      : latestIndex
  }, -1)
  const requestEvent = requestIndex >= 0 ? events[requestIndex] : null
  const requestTurnId = requestEvent ? runtimeDebugTurnId(requestEvent) : null
  if (!requestEvent || !requestTurnId) {
    return {
      requestTurnId,
      turnId: null,
      accepted: false,
      acceptedAtMs: null,
      streamFinished: false,
      streamFinishedAtMs: null,
      status: null,
      error: null,
    }
  }

  const relatedEvents = events
    .slice(requestIndex)
    .filter(event => runtimeDebugTurnId(event) === requestTurnId)
  let accepted = false
  let acceptedAtMs: number | null = null
  let streamFinished = false
  let streamFinishedAtMs: number | null = null
  let status: LocalAppChatRuntimeEvidence['status'] = null
  let error: string | null = null

  for (const event of relatedEvents) {
    const eventName = runtimeDebugEventName(event)
    const timestamp = runtimeDebugTimestamp(event)
    const elapsedMs = timestamp === null || input.startedAt === undefined
      ? null
      : Math.max(0, timestamp - input.startedAt)

    if (eventName === 'chat-start.accepted') {
      accepted = true
      if (acceptedAtMs === null)
        acceptedAtMs = elapsedMs
      continue
    }

    if (
      eventName === 'chat-start.invoke-resolved'
      || eventName === 'chat-start.direct-resolved'
    ) {
      if (event.accepted === true) {
        accepted = true
        if (acceptedAtMs === null)
          acceptedAtMs = elapsedMs
      }
      else if (event.accepted === false && error === null) {
        error = runtimeDebugError(event)
      }
      continue
    }

    if (isRuntimeFailureEvent(eventName)) {
      status = runtimeDebugStatus(event)
        ?? (eventName.includes('timeout') ? 'timed-out' : 'failed')
      error = runtimeDebugError(event) ?? error
      continue
    }

    if (eventName === 'chat-stream.finished') {
      streamFinished = true
      streamFinishedAtMs = elapsedMs
      status = runtimeDebugStatus(event)
      if (status === 'completed')
        error = null
      else
        error = runtimeDebugError(event) ?? error
    }
  }

  return {
    requestTurnId,
    turnId: requestTurnId,
    accepted,
    acceptedAtMs,
    streamFinished,
    streamFinishedAtMs,
    status,
    error,
  }
}

interface LocalAppBlackboxChildProcess {
  pid?: number
  killed: boolean
  exitCode?: number | null
  signalCode?: NodeJS.Signals | null
  stdout: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  stderr: {
    on: (event: 'data', listener: (chunk: unknown) => void) => unknown
  }
  once: (event: 'close' | 'exit' | 'error', listener: (...args: unknown[]) => void) => unknown
  kill: (signal?: NodeJS.Signals | number) => boolean
}

type SpawnLike = (
  command: string,
  args: readonly string[],
  options: {
    env: NodeJS.ProcessEnv
    stdio: ['ignore', 'pipe', 'pipe']
  },
) => LocalAppBlackboxChildProcess

function sanitizeArtifactName(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^\w-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || fallback
}

function textTail(value: string, maxChars = 6_000) {
  const normalized = value.trim()
  return normalized.length <= maxChars
    ? normalized
    : normalized.slice(normalized.length - maxChars)
}

async function waitForLocalAppProcessExit(
  child: LocalAppBlackboxChildProcess,
  timeoutMs = 15_000,
) {
  if (child.exitCode !== undefined && child.exitCode !== null)
    return
  if (child.signalCode !== undefined && child.signalCode !== null)
    return

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined
  await new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled)
        return
      settled = true
      if (timeoutHandle)
        clearTimeout(timeoutHandle)
      resolve()
    }

    child.once('close', finish)
    child.once('exit', finish)
    child.once('error', finish)
    timeoutHandle = setTimeout(() => {
      child.kill('SIGKILL')
      finish()
    }, timeoutMs)
  })
}

export function resolveLocalAppChatTurnState(input: {
  before: LocalAppChatDomSnapshot
  current: LocalAppChatDomSnapshot
  inputValue: string
  stopVisible: boolean
  stableForMs: number
  runtime?: LocalAppChatRuntimeEvidence
}) {
  const errorChanged = input.current.errorCount > input.before.errorCount
  const currentError = input.current.errorText.trim()
  if (errorChanged && currentError) {
    return {
      status: 'failed' as const,
      error: currentError,
    }
  }

  if (input.inputValue !== '' || input.stopVisible || input.stableForMs < 750) {
    return {
      status: 'pending' as const,
      error: null,
    }
  }

  const runtime = input.runtime
  const runtimeBound = runtime === undefined
    || (
      runtime.requestTurnId !== null
      && runtime.turnId === runtime.requestTurnId
    )
  if (!runtimeBound) {
    return {
      status: 'pending' as const,
      error: null,
    }
  }

  const runtimeFailed = runtime === undefined
    || (
      runtime.status !== null
      && runtime.status !== 'completed'
    )
  if (
    runtimeFailed
    && (errorChanged || Boolean(runtime?.error) || Boolean(runtime?.status))
  ) {
    return {
      status: 'failed' as const,
      error: currentError
        || runtime?.error
        || `本轮对话以 ${runtime?.status ?? 'failed'} 状态结束。`,
    }
  }

  const assistantChanged = input.current.assistantCount > input.before.assistantCount
  const currentAssistant = input.current.assistantText.trim()
  const runtimeCompleted = runtime === undefined
    || (
      runtime.accepted
      && runtime.streamFinished
      && runtime.status === 'completed'
    )
  if (assistantChanged && currentAssistant && runtimeCompleted) {
    return {
      status: 'completed' as const,
      error: null,
    }
  }

  return {
    status: 'pending' as const,
    error: null,
  }
}

export function isLocalAppMainRendererUrl(value: string) {
  try {
    const url = new URL(value)
    return url.pathname.endsWith('/index.html')
      && (url.hash === '' || url.hash === '#' || url.hash === '#/')
  }
  catch {
    return false
  }
}

export function localAppIconButtonXPath(iconAttribute: string) {
  return `xpath=//button[descendant::*[@*[name()="${iconAttribute}"]]]`
}

export async function navigateLocalAppPageToHashRoute(
  page: Page,
  route: string,
  timeoutMs: number,
) {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`
  const expectedHash = `#${normalizedRoute}`
  await page.waitForLoadState('domcontentloaded', {
    timeout: timeoutMs,
  })
  await page.waitForFunction(
    () => {
      const scope = globalThis as unknown as {
        document: {
          querySelector: (selector: string) => {
            childElementCount: number
          } | null
        }
      }
      return (scope.document.querySelector('#app')?.childElementCount ?? 0) > 0
    },
    undefined,
    { timeout: timeoutMs },
  )
  await page.evaluate((hash) => {
    const scope = globalThis as unknown as {
      location: {
        hash: string
      }
    }
    scope.location.hash = hash
  }, expectedHash)
  await page.waitForURL(
    url => url.hash === expectedHash,
    { timeout: timeoutMs },
  )
  if (new URL(page.url()).hash !== expectedHash)
    throw new Error(`页面未停留在目标路由：${expectedHash}`)
}

export function createPlaywrightLocalAppBlackboxAutomation(input: {
  args: LocalAppBlackboxTrialArgs
  spawn?: SpawnLike
  pathExists?: (path: string) => boolean
  connectOverCDP: (endpoint: string) => Promise<Browser>
  sleep?: (ms: number) => Promise<unknown>
  readRuntimeDebugTrace?: (input: {
    path: string
    since: number
  }) => Promise<Array<Record<string, unknown>>>
}): LocalAppBlackboxAutomation {
  const spawn = input.spawn ?? ((command, args, options) =>
    spawnProcess(command, args, options) as LocalAppBlackboxChildProcess)
  const pathExists = input.pathExists ?? existsSync
  const wait = input.sleep ?? (async ms => await sleep(ms))
  const readRuntimeDebugTrace = input.readRuntimeDebugTrace
    ?? (async traceInput => await readRuntimeDebugTraceSince(
      traceInput.path,
      traceInput.since,
    ))
  const runtimeDebugPath = join(
    input.args.userDataPath,
    'alicizations',
    'runtime-debug.log',
  )
  const endpoint = `http://127.0.0.1:${input.args.remoteDebugPort}`
  const executablePath = join(
    input.args.appPath,
    'Contents',
    'MacOS',
    'alicization',
  )
  const processOutput: string[] = []
  const rendererConsole: LocalAppBlackboxDiagnostics['rendererConsole'] = []
  const pageErrors: LocalAppBlackboxDiagnostics['pageErrors'] = []
  const boundPages = new WeakSet<object>()
  let appProcess: LocalAppBlackboxChildProcess | null = null
  let browser: Browser | null = null

  const bindPage = (page: Page) => {
    if (boundPages.has(page))
      return
    boundPages.add(page)
    page.on('console', (message) => {
      rendererConsole.push({
        type: message.type(),
        text: message.text(),
        url: page.url(),
      })
    })
    page.on('pageerror', (error) => {
      pageErrors.push({
        message: error.message,
        url: page.url(),
      })
    })
  }

  const pages = () => {
    const result = browser?.contexts().flatMap(context => context.pages()) ?? []
    for (const page of result)
      bindPage(page)
    return result
  }

  const waitForPage = async (
    predicate: (page: Page) => boolean,
    timeoutMs = input.args.launchTimeoutMs,
  ) => {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      const page = pages().find(predicate)
      if (page)
        return page
      await wait(100)
    }
    throw new Error(`等待 App 窗口超时（${timeoutMs}ms）。`)
  }

  const summarizePage = async (page: Page) => ({
    title: await page.title(),
    url: page.url(),
  })

  const mainPage = async () => await waitForPage(page =>
    isLocalAppMainRendererUrl(page.url()),
  )

  const readChatDomSnapshot = async (page: Page): Promise<LocalAppChatDomSnapshot> => {
    const assistantMessages = page.locator('[data-chat-message-role="assistant"]')
    const errorMessages = page.locator('[data-chat-message-role="error"]')
    const [assistantCount, errorCount] = await Promise.all([
      assistantMessages.count(),
      errorMessages.count(),
    ])
    const readLastMessageText = async (
      locator: Locator,
      count: number,
    ) => {
      if (count === 0)
        return ''
      return await locator.last().textContent({
        timeout: 1_000,
      }).catch(() => '')
    }
    const [assistantText, errorText] = await Promise.all([
      readLastMessageText(assistantMessages, assistantCount),
      readLastMessageText(errorMessages, errorCount),
    ])
    return {
      assistantCount,
      assistantText: assistantText?.trim() ?? '',
      errorCount,
      errorText: errorText?.trim() ?? '',
    }
  }

  return {
    async launch() {
      if (!pathExists(executablePath))
        throw new Error(`找不到可执行的本地 App：${executablePath}`)

      // Electron reads this switch before app code starts, so the trial is
      // isolated from the user's normal profile and its database.
      await mkdir(input.args.userDataPath, {
        recursive: true,
        mode: 0o700,
      })
      appProcess = spawn(executablePath, [
        '--user-data-dir',
        input.args.userDataPath,
      ], {
        env: {
          ...process.env,
          ALICIZATION_USER_DATA_PATH: input.args.userDataPath,
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: String(input.args.remoteDebugPort),
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      appProcess.stdout.on('data', chunk =>
        processOutput.push(`[stdout] ${String(chunk).trimEnd()}`))
      appProcess.stderr.on('data', chunk =>
        processOutput.push(`[stderr] ${String(chunk).trimEnd()}`))
      return {
        pid: appProcess.pid ?? null,
      }
    },

    async connect() {
      const deadline = Date.now() + input.args.launchTimeoutMs
      let lastError: unknown = null
      while (Date.now() < deadline) {
        try {
          browser = await input.connectOverCDP(endpoint)
          for (const context of browser.contexts()) {
            context.on('page', bindPage)
            for (const page of context.pages())
              bindPage(page)
          }
          return
        }
        catch (error) {
          lastError = error
          await wait(200)
        }
      }
      throw new Error([
        `无法连接 App 远程调试端点：${endpoint}`,
        lastError ? errorMessage(lastError) : '未发现可调试窗口。',
      ].join('\n'))
    },

    async waitForStartup() {
      const page = await mainPage()
      await page.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      await page.waitForFunction(
        () => {
          const scope = globalThis as unknown as {
            document: {
              readyState: string
              documentElement: {
                dataset: Record<string, string | undefined>
              }
            }
          }
          return scope.document.readyState === 'complete'
            && scope.document.documentElement.dataset.alicizationStagePageReady === 'true'
        },
        undefined,
        { timeout: input.args.launchTimeoutMs },
      )
      const state = await page.evaluate(() => {
        const scope = globalThis as unknown as {
          document: {
            readyState: string
            documentElement: {
              dataset: Record<string, string | undefined>
            }
          }
        }
        return {
          readyState: scope.document.readyState,
          stageReady: scope.document.documentElement.dataset.alicizationStagePageReady === 'true',
        }
      })
      return {
        ...(await summarizePage(page)),
        readyState: state.readyState,
        stageReady: state.stageReady,
      }
    },

    async openChat() {
      const existing = pages().find(page => page.url().includes('#/chat'))
      if (existing)
        return await summarizePage(existing)

      const page = await mainPage()
      const expandButton = page.locator(
        localAppIconButtonXPath('i-solar:alt-arrow-up-line-duotone'),
      )
      await expandButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatButton = page.locator(
        localAppIconButtonXPath('i-solar:chat-line-line-duotone'),
      )
      await chatButton.click({
        timeout: input.args.launchTimeoutMs,
      })
      const chatPage = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      await chatPage.waitForLoadState('domcontentloaded', {
        timeout: input.args.launchTimeoutMs,
      })
      return await summarizePage(chatPage)
    },

    async sendChatMessage(message, timeoutMs) {
      const page = await waitForPage(
        candidate => candidate.url().includes('#/chat'),
        input.args.launchTimeoutMs,
      )
      const textarea = page.locator('textarea').last()
      await textarea.waitFor({
        state: 'visible',
        timeout: input.args.launchTimeoutMs,
      })
      // Visible evidence must exclude hidden boot fallbacks and inline scripts.
      // eslint-disable-next-line unicorn/prefer-dom-node-text-content
      const beforeText = await page.locator('body').innerText()
      const beforeChat = await readChatDomSnapshot(page)
      const startedAt = Date.now()
      let firstUiChangeMs: number | null = null
      let stableSince: number | null = null
      let previousText = beforeText
      let previousChat = beforeChat
      let runtimeEvidence: LocalAppChatRuntimeEvidence = {
        requestTurnId: null,
        turnId: null,
        accepted: false,
        acceptedAtMs: null,
        streamFinished: false,
        streamFinishedAtMs: null,
        status: null,
        error: null,
      }
      await textarea.fill(message)
      await textarea.press('Enter')

      while (Date.now() - startedAt < timeoutMs) {
        const [bodyText, inputValue, stopVisible, currentChat, runtimeTrace] = await Promise.all([
          // eslint-disable-next-line unicorn/prefer-dom-node-text-content
          page.locator('body').innerText(),
          textarea.inputValue(),
          page
            .locator(localAppIconButtonXPath('i-solar:stop-circle-linear'))
            .isVisible()
            .catch(() => false),
          readChatDomSnapshot(page),
          readRuntimeDebugTrace({
            path: runtimeDebugPath,
            since: startedAt,
          }).catch(() => []),
        ])
        runtimeEvidence = resolveLocalAppChatRuntimeEvidence({
          events: runtimeTrace,
          cardId: input.args.cardId,
          startedAt,
        })
        const changed = bodyText !== beforeText || inputValue !== message || stopVisible
        if (changed && firstUiChangeMs === null)
          firstUiChangeMs = Date.now() - startedAt

        const chatChanged = currentChat.assistantCount !== previousChat.assistantCount
          || currentChat.assistantText !== previousChat.assistantText
          || currentChat.errorCount !== previousChat.errorCount
          || currentChat.errorText !== previousChat.errorText
        if (bodyText !== previousText || chatChanged) {
          previousText = bodyText
          previousChat = currentChat
          stableSince = Date.now()
        }

        const turnState = resolveLocalAppChatTurnState({
          before: beforeChat,
          current: currentChat,
          inputValue,
          stopVisible,
          stableForMs: stableSince === null ? 0 : Date.now() - stableSince,
          runtime: runtimeEvidence,
        })
        if (turnState.status !== 'pending') {
          const finishedAt = Date.now()
          return {
            message,
            status: turnState.status,
            startedAt,
            finishedAt,
            turnId: runtimeEvidence.turnId,
            accepted: runtimeEvidence.accepted,
            acceptedAtMs: runtimeEvidence.acceptedAtMs,
            streamFinished: runtimeEvidence.streamFinished,
            streamFinishedAtMs: runtimeEvidence.streamFinishedAtMs,
            firstUiChangeMs,
            settledMs: finishedAt - startedAt,
            visibleText: textTail(bodyText),
            error: turnState.error,
          }
        }

        await wait(200)
      }

      const [visibleText, finalRuntimeTrace] = await Promise.all([
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        page.locator('body').innerText(),
        readRuntimeDebugTrace({
          path: runtimeDebugPath,
          since: startedAt,
        }).catch(() => []),
      ])
      runtimeEvidence = resolveLocalAppChatRuntimeEvidence({
        events: finalRuntimeTrace,
        cardId: input.args.cardId,
        startedAt,
      })
      const finishedAt = Date.now()
      return {
        message,
        status: 'timed-out',
        startedAt,
        finishedAt,
        turnId: runtimeEvidence.turnId,
        accepted: runtimeEvidence.accepted,
        acceptedAtMs: runtimeEvidence.acceptedAtMs,
        streamFinished: runtimeEvidence.streamFinished,
        streamFinishedAtMs: runtimeEvidence.streamFinishedAtMs,
        firstUiChangeMs,
        settledMs: finishedAt - startedAt,
        visibleText: textTail(visibleText),
        error: [
          `等待对话完成超时（${timeoutMs}ms）。`,
          `accepted=${runtimeEvidence.accepted}`,
          `streamFinished=${runtimeEvidence.streamFinished}`,
          runtimeEvidence.turnId ? `turnId=${runtimeEvidence.turnId}` : 'turnId=unknown',
          runtimeEvidence.error ? `runtimeError=${runtimeEvidence.error}` : null,
        ].filter(Boolean).join(' '),
      }
    },

    async openMemoryWorkbench() {
      let settingsPage = pages().find(page => page.url().includes('#/settings'))
      if (!settingsPage) {
        const page = await mainPage()
        const settingsButton = page
          .locator(localAppIconButtonXPath('i-solar:settings-minimalistic-outline'))
          .last()
        await settingsButton.click({
          timeout: input.args.launchTimeoutMs,
        })
        settingsPage = await waitForPage(
          candidate => candidate.url().includes('#/settings'),
          input.args.launchTimeoutMs,
        )
      }
      bindPage(settingsPage)
      await navigateLocalAppPageToHashRoute(
        settingsPage,
        '/settings/modules/memory',
        input.args.launchTimeoutMs,
      )
      return {
        ...(await summarizePage(settingsPage)),
        // eslint-disable-next-line unicorn/prefer-dom-node-text-content
        visibleText: textTail(await settingsPage.locator('body').innerText()),
      }
    },

    async captureScreenshots(outputDir) {
      await mkdir(outputDir, {
        recursive: true,
        mode: 0o700,
      })
      const screenshots: LocalAppBlackboxScreenshotEvidence[] = []
      for (const [index, page] of pages().entries()) {
        const title = await page.title()
        const name = sanitizeArtifactName(
          title || basename(page.url()),
          `window-${index + 1}`,
        )
        const path = join(outputDir, `${index + 1}-${name}.png`)
        await page.screenshot({
          path,
          fullPage: true,
        })
        screenshots.push({
          title,
          url: page.url(),
          path,
        })
      }
      return screenshots
    },

    async collectDiagnostics() {
      return {
        processOutput: [...processOutput],
        rendererConsole: [...rendererConsole],
        pageErrors: [...pageErrors],
      }
    },

    async close() {
      const processToClose = appProcess
      appProcess = null
      const browserToClose = browser
      browser = null

      await browserToClose?.close().catch(() => {})

      if (processToClose && !processToClose.killed)
        processToClose.kill('SIGTERM')
      if (processToClose)
        await waitForLocalAppProcessExit(processToClose)
    },
  }
}

export async function runLocalAppBlackboxTrial(
  input: {
    args: LocalAppBlackboxTrialArgs
  } & LocalAppBlackboxTrialDependencies,
): Promise<LocalAppBlackboxTrialReport> {
  const now = input.now ?? (() => Date.now())
  const writeText = input.writeText ?? (async (path, content) => {
    await writeFile(path, content, {
      encoding: 'utf8',
      mode: 0o600,
    })
  })
  const ensureOutputDir = input.ensureOutputDir ?? (async path => await mkdir(path, {
    recursive: true,
    mode: 0o700,
  }))
  const stages: LocalAppBlackboxStage[] = []
  const chatTurns: LocalAppBlackboxChatTurnEvidence[] = []
  let memoryAssertions: LocalAppBlackboxMemoryAssertions | null = null
  let runtimeDebugTrace: Array<Record<string, unknown>> = []
  let screenshots: LocalAppBlackboxScreenshotEvidence[] = []
  let diagnostics: LocalAppBlackboxDiagnostics = {
    processOutput: [],
    rendererConsole: [],
    pageErrors: [],
  }
  const startedAt = now()

  await ensureOutputDir(input.args.outputDir)

  const stageDetails = (value: unknown): Record<string, unknown> => {
    if (value && typeof value === 'object' && !Array.isArray(value))
      return { ...value }
    return {
      value,
    }
  }

  const recordStage = async (
    id: string,
    action: () => Promise<unknown>,
  ) => {
    const stageStartedAt = now()
    try {
      const details = stageDetails(await action())
      stages.push({
        id,
        status: 'succeeded',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: null,
        details,
      })
      return true
    }
    catch (error) {
      stages.push({
        id,
        status: 'failed',
        startedAt: stageStartedAt,
        finishedAt: now(),
        error: errorMessage(error),
        details: {},
      })
      return false
    }
  }

  try {
    if (input.args.attachOnly) {
      stages.push({
        id: 'app-launch',
        status: 'not-run',
        startedAt,
        finishedAt: now(),
        error: null,
        details: {
          reason: 'attach-only',
        },
      })
    }
    else {
      await recordStage('app-launch', async () => await input.automation.launch())
    }

    const attached = await recordStage('remote-debug-attach', async () => {
      await input.automation.connect()
      return {
        endpoint: `http://127.0.0.1:${input.args.remoteDebugPort}`,
      }
    })
    if (attached) {
      await recordStage('stage-startup', async () => await input.automation.waitForStartup())
      const chatOpened = await recordStage('chat-window', async () => await input.automation.openChat())
      if (chatOpened) {
        for (const [index, message] of input.args.messages.entries()) {
          const stageId = `chat-message-${index + 1}`
          const stageStartedAt = now()
          try {
            const evidence = await input.automation.sendChatMessage(
              message,
              input.args.turnTimeoutMs,
            )
            chatTurns.push(evidence)
            stages.push({
              id: stageId,
              status: evidence.status === 'completed' ? 'succeeded' : 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: evidence.error,
              details: {
                message,
                status: evidence.status,
                accepted: evidence.accepted ?? null,
                acceptedAtMs: evidence.acceptedAtMs ?? null,
                turnId: evidence.turnId ?? null,
                streamFinished: evidence.streamFinished ?? null,
                streamFinishedAtMs: evidence.streamFinishedAtMs ?? null,
                firstUiChangeMs: evidence.firstUiChangeMs,
                settledMs: evidence.settledMs,
                visibleText: evidence.visibleText,
              },
            })
          }
          catch (error) {
            const messageText = errorMessage(error)
            chatTurns.push({
              message,
              status: 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              accepted: false,
              acceptedAtMs: null,
              turnId: null,
              streamFinished: false,
              streamFinishedAtMs: null,
              firstUiChangeMs: null,
              settledMs: Math.max(0, now() - stageStartedAt),
              visibleText: '',
              error: messageText,
            })
            stages.push({
              id: stageId,
              status: 'failed',
              startedAt: stageStartedAt,
              finishedAt: now(),
              error: messageText,
              details: {
                message,
                status: 'failed',
                accepted: false,
                acceptedAtMs: null,
                turnId: null,
                streamFinished: false,
                streamFinishedAtMs: null,
              },
            })
          }
        }
      }

      if (input.inspectMemory) {
        await recordStage('memory-closure', async () => {
          const assertions = await input.inspectMemory!({
            userDataPath: input.args.userDataPath,
            cardId: input.args.cardId,
            messages: [...input.args.messages],
            chatTurns: [...chatTurns],
          })
          memoryAssertions = assertions
          const assertionErrors = [
            ...assertions.errors,
            ...(!assertions.recall.matched
              ? [`长期记忆召回未命中：${assertions.recall.query}`]
              : []),
            ...(assertions.failureIsolationPassed
              ? []
              : [`失败对话污染了记忆层：${assertions.failedTurnMemoryLeakCount} 条。`]),
          ]
          if (assertionErrors.length > 0)
            throw new Error(assertionErrors.join('\n'))
          return {
            cardId: assertions.cardId,
            checkpointCount: assertions.checkpointCount,
            queue: assertions.queue,
            longTerm: assertions.longTerm,
            recallMatched: assertions.recall.matched,
          }
        })
      }

      if (input.args.openMemoryWorkbench) {
        await recordStage(
          'memory-workbench',
          async () => await input.automation.openMemoryWorkbench(),
        )
      }
      else {
        stages.push({
          id: 'memory-workbench',
          status: 'not-run',
          startedAt: now(),
          finishedAt: now(),
          error: null,
          details: {
            reason: 'disabled',
          },
        })
      }
    }

    await recordStage('runtime-debug-trace', async () => {
      runtimeDebugTrace = await input.readRuntimeDebugTrace({
        path: join(input.args.userDataPath, 'alicizations', 'runtime-debug.log'),
        since: startedAt,
      })
      await writeText(
        join(input.args.outputDir, 'runtime-debug.jsonl'),
        runtimeDebugTrace.map(entry => JSON.stringify(entry)).join('\n')
        + (runtimeDebugTrace.length > 0 ? '\n' : ''),
      )
      return {
        eventCount: runtimeDebugTrace.length,
      }
    })

    if (attached) {
      await recordStage('screenshots', async () => {
        screenshots = await input.automation.captureScreenshots(input.args.outputDir)
        return {
          screenshotCount: screenshots.length,
          paths: screenshots.map(screenshot => screenshot.path),
        }
      })
    }

    diagnostics = await input.automation.collectDiagnostics?.() ?? diagnostics
    await writeText(
      join(input.args.outputDir, 'app-process.log'),
      diagnostics.processOutput.join('\n')
      + (diagnostics.processOutput.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'renderer-console.jsonl'),
      diagnostics.rendererConsole.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.rendererConsole.length > 0 ? '\n' : ''),
    )
    await writeText(
      join(input.args.outputDir, 'page-errors.jsonl'),
      diagnostics.pageErrors.map(entry => JSON.stringify(entry)).join('\n')
      + (diagnostics.pageErrors.length > 0 ? '\n' : ''),
    )
  }
  finally {
    if (!input.args.keepOpen)
      await input.automation.close().catch(() => {})
  }

  const finishedAt = now()
  const failedStages = stages.filter(stage => stage.status === 'failed')
  const report: LocalAppBlackboxTrialReport = {
    version: 'alicization-local-app-blackbox-trial-v1',
    passed: failedStages.length === 0,
    startedAt,
    finishedAt,
    appPath: input.args.appPath,
    userDataPath: input.args.userDataPath,
    cardId: input.args.cardId,
    outputDir: input.args.outputDir,
    summary: {
      requestedMessageCount: input.args.messages.length,
      completedMessageCount: chatTurns.filter(turn => turn.status === 'completed').length,
      failedMessageCount: chatTurns.filter(turn => turn.status !== 'completed').length,
      runtimeTraceEventCount: runtimeDebugTrace.length,
      screenshotCount: screenshots.length,
      rendererConsoleEventCount: diagnostics.rendererConsole.length,
      pageErrorCount: diagnostics.pageErrors.length,
      memoryAssertionPassed: memoryAssertions
        ? failedStages.every(stage => stage.id !== 'memory-closure')
        : null,
      failedStageIds: failedStages.map(stage => stage.id),
      lastError: failedStages.at(-1)?.error ?? null,
    },
    stages,
    chatTurns,
    memoryAssertions,
    runtimeDebugTrace,
    screenshots,
    diagnostics,
  }
  await writeText(
    join(input.args.outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  )
  return report
}
