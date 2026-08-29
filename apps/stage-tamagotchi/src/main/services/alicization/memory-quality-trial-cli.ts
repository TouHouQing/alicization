import type { MemoryProductionTrialReport } from './memory-production-trial-runner'

import process, { env, platform } from 'node:process'

import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { alicizationPrimaryConversationSessionId } from '@proj-alicization/stage-shared'

import { setupAlicizationDb } from './db'

export type MemoryQualityTrialCliMode = 'historical-replay' | 'live-provider'

export interface MemoryQualityTrialCliArgs {
  userDataPath: string
  databasePath: string | null
  cardId: string
  mode: MemoryQualityTrialCliMode
  reportPath: string | null
  sessionId: string | null
  readOnly?: boolean
}

export interface MemoryQualityTrialCliOperationalFailureReport {
  version: 'memory-quality-trial-cli-v1'
  cardId: string
  createdAt: number
  passed: false
  status: 'not-run'
  error: string
  summary: {
    notRunStageIds: ['dialogue-replay']
    lastError: string
  }
}

export interface MemoryQualityTrialCliDb {
  runMemoryWorkbenchProductionTrial: (input: {
    cardId: string
    mode: MemoryQualityTrialCliMode
    sessionId: string
    readOnly?: boolean
  }) => Promise<MemoryProductionTrialReport>
  close: () => Promise<void>
}

export interface MemoryQualityTrialCliDependencies {
  setupDb: (input: {
    userDataPath: string
    databasePath: string | null
    cardId: string
    readOnly?: boolean
  }) => Promise<MemoryQualityTrialCliDb>
  writeReport: (path: string, content: string) => Promise<void>
  writeOutput: (content: string) => void
  now?: () => number
}

export interface MemoryQualityTrialCliResult {
  exitCode: 0 | 1 | 2
  report: MemoryProductionTrialReport | MemoryQualityTrialCliOperationalFailureReport | null
  reportPath: string | null
  error: string | null
}

export interface MemoryQualityTrialCliParseDefaults {
  defaultUserDataPath?: string
  defaultReadOnly?: boolean
}

export function resolveDefaultMemoryQualityTrialUserDataPath(input: {
  platform?: NodeJS.Platform
  homeDir?: string
  env?: NodeJS.ProcessEnv
  pathExists?: (path: string) => boolean
} = {}) {
  const currentPlatform = input.platform ?? platform
  const currentHomeDir = input.homeDir ?? homedir()
  const currentEnv = input.env ?? env
  const pathExists = input.pathExists ?? existsSync
  const candidates = currentPlatform === 'darwin'
    ? [
        join(currentHomeDir, 'Library', 'Application Support', 'com.tohoqing.alicization'),
        join(currentHomeDir, 'Library', 'Application Support', 'Alicization'),
      ]
    : currentPlatform === 'win32'
      ? [
          join(currentEnv.APPDATA || join(currentHomeDir, 'AppData', 'Roaming'), 'com.tohoqing.alicization'),
          join(currentEnv.APPDATA || join(currentHomeDir, 'AppData', 'Roaming'), 'Alicization'),
        ]
      : [
          join(currentEnv.XDG_CONFIG_HOME || join(currentHomeDir, '.config'), 'com.tohoqing.alicization'),
          join(currentEnv.XDG_CONFIG_HOME || join(currentHomeDir, '.config'), 'Alicization'),
        ]

  return candidates.find(candidate =>
    pathExists(join(candidate, 'alicizations', 'alicization.db'))
    || pathExists(join(candidate, 'alicizations', 'cards', 'default', 'alicization.db')),
  ) ?? candidates[0]!
}

function requireOptionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith('--'))
    throw new Error(`选项 ${name} 需要一个值。`)
  return value
}

export function parseMemoryQualityTrialCliArgs(
  rawArgs: string[],
  defaults: MemoryQualityTrialCliParseDefaults = {},
): MemoryQualityTrialCliArgs {
  let userDataPath = defaults.defaultUserDataPath
    ?? resolveDefaultMemoryQualityTrialUserDataPath()
  let databasePath: string | null = null
  let cardId = 'default'
  let mode: MemoryQualityTrialCliMode = 'historical-replay'
  let reportPath: string | null = null
  let sessionId: string | null = null
  let readOnly = defaults.defaultReadOnly ?? rawArgs.length === 0
  let userDataPathProvided = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]
    if (!argument)
      continue

    const [rawName, inlineValue] = argument.split('=', 2)
    const name = rawName.trim()
    const value = inlineValue?.trim() || null
    const readValue = () => value ?? requireOptionValue(rawArgs, index++, name)

    if (name === '--')
      continue

    if (name === '--user-data-path') {
      userDataPath = readValue()
      userDataPathProvided = true
      continue
    }
    if (name === '--database-path' || name === '--db') {
      databasePath = readValue()
      continue
    }
    if (name === '--card-id') {
      cardId = readValue()
      continue
    }
    if (name === '--mode') {
      const parsed = readValue()
      if (parsed !== 'historical-replay' && parsed !== 'live-provider')
        throw new Error(`选项 --mode 不支持值 ${parsed}。`)
      mode = parsed
      continue
    }
    if (name === '--report') {
      reportPath = readValue()
      continue
    }
    if (name === '--session-id') {
      sessionId = readValue()
      continue
    }
    if (name === '--read-only' || name === '--dry-run') {
      readOnly = true
      continue
    }
    if (name === '--help' || name === '-h')
      continue
    throw new Error(`不支持的选项：${name}。`)
  }

  if (!cardId)
    throw new Error('--card-id 不能为空。')
  if (databasePath && !userDataPathProvided)
    userDataPath = dirname(resolve(databasePath))

  return {
    userDataPath: userDataPath || dirname(resolve(databasePath!)),
    databasePath,
    cardId,
    mode,
    reportPath,
    sessionId,
    readOnly,
  }
}

export function createMemoryQualityTrialCliReport(input: {
  cardId: string
  error: string
  createdAt: number
}): MemoryQualityTrialCliOperationalFailureReport {
  return {
    version: 'memory-quality-trial-cli-v1',
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: false,
    status: 'not-run',
    error: input.error,
    summary: {
      notRunStageIds: ['dialogue-replay'],
      lastError: input.error,
    },
  }
}

async function writeJsonReport(
  path: string,
  content: string,
) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, {
    encoding: 'utf8',
    mode: 0o600,
  })
}

export async function runMemoryQualityTrialCli(
  input: {
    args: MemoryQualityTrialCliArgs
  } & Partial<MemoryQualityTrialCliDependencies>,
): Promise<MemoryQualityTrialCliResult> {
  const now = input.now ?? (() => Date.now())
  const createdAt = now()
  const reportRoot = input.args.databasePath
    ? dirname(resolve(input.args.databasePath))
    : join(input.args.userDataPath, 'alicizations')
  const reportPath = input.args.reportPath
    ?? join(
      reportRoot,
      'quality-reports',
      `memory-quality-trial-${createdAt}.json`,
    )
  const primarySessionId = alicizationPrimaryConversationSessionId(input.args.cardId)
  if (input.args.sessionId && input.args.sessionId !== primarySessionId) {
    return {
      exitCode: 1,
      report: null,
      reportPath: null,
      error: `只允许回放当前机体的主对话会话：${primarySessionId}。`,
    }
  }

  const setupDb = input.setupDb ?? (async setupInput =>
    await setupAlicizationDb(setupInput.userDataPath, {
      cardId: setupInput.cardId,
      ...(setupInput.databasePath
        ? { rootDir: dirname(resolve(setupInput.databasePath)) }
        : {}),
      readOnly: setupInput.readOnly === true,
    }))
  const writeOutput = input.writeOutput ?? ((content: string) => process.stdout.write(`${content}\n`))
  const writeReport = input.writeReport ?? writeJsonReport

  let db: MemoryQualityTrialCliDb | null = null
  try {
    db = await setupDb({
      userDataPath: input.args.userDataPath,
      databasePath: input.args.databasePath,
      cardId: input.args.cardId,
      readOnly: input.args.readOnly === true,
    })
    const report = await db.runMemoryWorkbenchProductionTrial({
      cardId: input.args.cardId,
      mode: input.args.mode,
      sessionId: primarySessionId,
      readOnly: input.args.readOnly === true,
    })
    const serialized = `${JSON.stringify(report, null, 2)}\n`
    await writeReport(reportPath, serialized)
    writeOutput(serialized)
    return {
      exitCode: report.passed ? 0 : 2,
      report,
      reportPath,
      error: null,
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const report = createMemoryQualityTrialCliReport({
      cardId: input.args.cardId,
      createdAt,
      error: message,
    })
    const serialized = `${JSON.stringify(report, null, 2)}\n`
    await writeReport(reportPath, serialized)
    writeOutput(serialized)
    return {
      exitCode: 1,
      report,
      reportPath,
      error: message,
    }
  }
  finally {
    await db?.close()
  }
}
