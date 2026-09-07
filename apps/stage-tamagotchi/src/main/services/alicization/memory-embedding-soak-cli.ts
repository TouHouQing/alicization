import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'
import type {
  MemorySemanticScaleJobExecutor,
  MemorySemanticScaleJobTier,
} from './memory-semantic-scale-job-runtime'
import type {
  MemorySemanticScaleAcceptanceReport,
  MemorySemanticScaleOperationalProbeReport,
} from './memory-semantic-scale-soak-runtime'

import process, { env, platform } from 'node:process'

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import {
  resolveDefaultMemoryQualityTrialUserDataPath,
  resolvePersistedMemoryEmbeddingProvider,
} from './memory-quality-trial-cli'
import { executeMemorySemanticScaleJob } from './memory-semantic-scale-job-runtime'
import {
  applyMemorySemanticScaleAcceptanceGate,
  runMemorySemanticScaleOperationalProbes,
} from './memory-semantic-scale-soak-runtime'

const tierCorpusSizes: Record<MemorySemanticScaleJobTier, number> = {
  '10k': 10_000,
  '100k': 100_000,
}
const defaultMaxP95LatencyMs = 3_000
const defaultMaxP99LatencyMs = 5_000

export interface MemoryEmbeddingSoakCliArgs {
  userDataPath: string
  cardId: string
  tier: MemorySemanticScaleJobTier
  reportPath: string | null
  dimensions: number | null
  maxP95LatencyMs: number
  maxP99LatencyMs: number
}

export interface MemoryEmbeddingSoakReport extends MemorySemanticScaleAcceptanceReport {
  cli: {
    version: 'memory-embedding-soak-cli-v1'
    cardId: string
    tier: MemorySemanticScaleJobTier
    corpusSize: number
  }
  embedding: {
    configured: boolean
    provider: 'openai-compatible' | null
    modelId: string | null
    dimensions: number | null
    vectorSpaceId: string | null
    requestCount: number
    textCount: number
    failedRequestCount: number
  }
}

export interface MemoryEmbeddingSoakCliOperationalFailureReport {
  version: 'memory-embedding-soak-cli-v1'
  cardId: string
  tier: MemorySemanticScaleJobTier
  corpusSize: number
  createdAt: number
  passed: false
  status: 'not-run'
  error: string
}

export interface MemoryEmbeddingSoakCliDependencies {
  resolveProvider: (input: {
    userDataPath: string
  }) => Promise<LongTermMemoryEmbeddingProvider | null>
  executeJob: MemorySemanticScaleJobExecutor
  runOperationalProbes: (input: {
    cardId: string
    createdAt: number
  }) => Promise<MemorySemanticScaleOperationalProbeReport | null>
  writeReport: (path: string, content: string) => Promise<void>
  writeOutput: (content: string) => void
  createTempDir: (input: {
    cardId: string
    tier: MemorySemanticScaleJobTier
  }) => Promise<string>
  removeTempDir: (path: string) => Promise<void>
  now: () => number
}

export interface MemoryEmbeddingSoakCliResult {
  exitCode: 0 | 1 | 2
  report: MemoryEmbeddingSoakReport | MemoryEmbeddingSoakCliOperationalFailureReport
  reportPath: string
  error: string | null
}

function normalizeText(raw: unknown, maxChars = 500) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
    : ''
}

function normalizePositiveInteger(raw: unknown, fallback: number, maximum: number) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(1, Math.min(maximum, Math.floor(value)))
}

function readOptionValue(args: string[], index: number, name: string) {
  const value = args[index + 1]?.trim()
  if (!value || value.startsWith('--'))
    throw new Error(`选项 ${name} 需要一个值。`)
  return value
}

function normalizeTier(raw: string) {
  const value = raw.trim().toLowerCase().replace(/,/g, '')
  if (value === '10k' || value === '10000')
    return '10k' as const
  if (value === '100k' || value === '100000')
    return '100k' as const
  throw new Error(`--size 只支持 10k、100k、10000 或 100000，收到：${raw}`)
}

export function parseMemoryEmbeddingSoakCliArgs(
  rawArgs: string[],
  defaults: {
    defaultUserDataPath?: string
    defaultCardId?: string
  } = {},
): MemoryEmbeddingSoakCliArgs {
  let userDataPath = defaults.defaultUserDataPath
    ?? resolveDefaultMemoryQualityTrialUserDataPath({
      platform,
      homeDir: homedir(),
      env,
    })
  let cardId = defaults.defaultCardId ?? 'default'
  let tier: MemorySemanticScaleJobTier = '10k'
  let reportPath: string | null = null
  let dimensions: number | null = null
  let maxP95LatencyMs = defaultMaxP95LatencyMs
  let maxP99LatencyMs = defaultMaxP99LatencyMs

  for (let index = 0; index < rawArgs.length; index += 1) {
    const argument = rawArgs[index]
    if (!argument)
      continue

    const [rawName, inlineValue] = argument.split('=', 2)
    const name = rawName.trim()
    const readValue = () => inlineValue?.trim() || readOptionValue(rawArgs, index++, name)

    if (name === '--')
      continue
    if (name === '--user-data-path') {
      userDataPath = readValue()
      continue
    }
    if (name === '--card-id') {
      cardId = readValue()
      continue
    }
    if (name === '--size' || name === '--tier') {
      tier = normalizeTier(readValue())
      continue
    }
    if (name === '--dimensions') {
      dimensions = normalizePositiveInteger(readValue(), 1, 4_096)
      continue
    }
    if (name === '--report') {
      reportPath = resolve(readValue())
      continue
    }
    if (name === '--max-p95-ms') {
      maxP95LatencyMs = normalizePositiveInteger(
        readValue(),
        defaultMaxP95LatencyMs,
        60 * 60_000,
      )
      continue
    }
    if (name === '--max-p99-ms') {
      maxP99LatencyMs = normalizePositiveInteger(
        readValue(),
        defaultMaxP99LatencyMs,
        60 * 60_000,
      )
      continue
    }
    if (name === '--help' || name === '-h')
      continue
    throw new Error(`不支持的选项：${name}。`)
  }

  if (!normalizeText(userDataPath, 2_000))
    throw new Error('--user-data-path 不能为空。')
  if (!normalizeText(cardId, 200))
    throw new Error('--card-id 不能为空。')

  return {
    userDataPath: resolve(userDataPath),
    cardId: normalizeText(cardId, 200),
    tier,
    reportPath,
    dimensions,
    maxP95LatencyMs,
    maxP99LatencyMs: Math.max(maxP95LatencyMs, maxP99LatencyMs),
  }
}

async function defaultResolveProvider(input: {
  userDataPath: string
}) {
  return await resolvePersistedMemoryEmbeddingProvider({
    userDataPath: input.userDataPath,
    readText: async path => await readFile(path, 'utf8'),
  })
}

async function defaultWriteReport(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, {
    encoding: 'utf8',
    mode: 0o600,
  })
}

async function defaultCreateTempDir() {
  return await mkdtemp(join(tmpdir(), 'alicization-memory-embedding-soak-'))
}

function operationalFailureReport(input: {
  args: MemoryEmbeddingSoakCliArgs
  createdAt: number
  error: string
}): MemoryEmbeddingSoakCliOperationalFailureReport {
  return {
    version: 'memory-embedding-soak-cli-v1',
    cardId: input.args.cardId,
    tier: input.args.tier,
    corpusSize: tierCorpusSizes[input.args.tier],
    createdAt: input.createdAt,
    passed: false,
    status: 'not-run',
    error: input.error,
  }
}

function enrichReport(input: {
  args: MemoryEmbeddingSoakCliArgs
  report: MemorySemanticScaleAcceptanceReport
  provider: LongTermMemoryEmbeddingProvider | null
  requestCount: number
  textCount: number
  failedRequestCount: number
}): MemoryEmbeddingSoakReport {
  return {
    ...input.report,
    cli: {
      version: 'memory-embedding-soak-cli-v1',
      cardId: input.args.cardId,
      tier: input.args.tier,
      corpusSize: tierCorpusSizes[input.args.tier],
    },
    embedding: {
      configured: input.provider !== null,
      provider: input.provider ? 'openai-compatible' : null,
      modelId: input.provider?.modelId ?? null,
      dimensions: input.provider?.dimensions ?? input.args.dimensions,
      vectorSpaceId: input.provider?.vectorSpaceId ?? null,
      requestCount: input.requestCount,
      textCount: input.textCount,
      failedRequestCount: input.failedRequestCount,
    },
  }
}

export async function runMemoryEmbeddingSoakCli(
  input: {
    args: MemoryEmbeddingSoakCliArgs
  } & Partial<MemoryEmbeddingSoakCliDependencies>,
): Promise<MemoryEmbeddingSoakCliResult> {
  const now = input.now ?? (() => Date.now())
  const createdAt = now()
  const reportPath = input.args.reportPath
    ?? join(
      input.args.userDataPath,
      'alicizations',
      'quality-reports',
      `memory-embedding-soak-${createdAt}.json`,
    )
  const resolveProvider = input.resolveProvider ?? defaultResolveProvider
  const executeJob = input.executeJob ?? executeMemorySemanticScaleJob
  const runOperationalProbes = input.runOperationalProbes
    ?? runMemorySemanticScaleOperationalProbes
  const writeReport = input.writeReport ?? defaultWriteReport
  const writeOutput = input.writeOutput ?? ((content: string) => process.stdout.write(`${content}\n`))
  const createTempDir = input.createTempDir ?? (async () => await defaultCreateTempDir())
  const removeTempDir = input.removeTempDir ?? (async path =>
    await rm(path, { recursive: true, force: true }))
  const controller = new AbortController()
  const onSigint = () => {
    if (!controller.signal.aborted) {
      controller.abort(new DOMException(
        'embedding soak cancelled by user',
        'AbortError',
      ))
    }
  }
  process.once('SIGINT', onSigint)

  let provider: LongTermMemoryEmbeddingProvider | null = null
  let tempDir: string | null = null
  let requestCount = 0
  let textCount = 0
  let failedRequestCount = 0
  try {
    provider = await resolveProvider({
      userDataPath: input.args.userDataPath,
    })
    const instrumentedProvider = provider
      ? {
          ...provider,
          embedTexts: async (texts: string[], signal?: AbortSignal) => {
            requestCount += 1
            textCount += texts.length
            try {
              return await provider!.embedTexts(texts, signal)
            }
            catch (error) {
              failedRequestCount += 1
              throw error
            }
          },
        }
      : null
    tempDir = await createTempDir({
      cardId: input.args.cardId,
      tier: input.args.tier,
    })
    const soakReport = await executeJob({
      jobId: `cli-${input.args.tier}-${createdAt}`,
      cardId: input.args.cardId,
      tier: input.args.tier,
      corpusSize: tierCorpusSizes[input.args.tier],
      dimensions: input.args.dimensions ?? provider?.dimensions,
      embeddingProvider: instrumentedProvider,
      createdAt,
      tempDir,
      signal: controller.signal,
      onProgress: async (progress) => {
        process.stderr.write(
          `[embedding-soak] ${progress.phase} ${progress.indexedCount}/${progress.corpusSize} queries=${progress.queryCount}\n`,
        )
      },
    })
    const operationalProbes = await runOperationalProbes({
      cardId: input.args.cardId,
      createdAt,
    })
    const gatedReport = applyMemorySemanticScaleAcceptanceGate(soakReport, {
      tier: input.args.tier,
      maxP95LatencyMs: input.args.maxP95LatencyMs,
      maxP99LatencyMs: input.args.maxP99LatencyMs,
      operationalProbes,
      providerConfigured: provider !== null,
    })
    const report = enrichReport({
      args: input.args,
      report: gatedReport,
      provider,
      requestCount,
      textCount,
      failedRequestCount,
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
    const message = normalizeText(error instanceof Error ? error.message : error, 1_000)
      || 'embedding soak failed'
    const report = operationalFailureReport({
      args: input.args,
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
    process.removeListener('SIGINT', onSigint)
    if (tempDir)
      await removeTempDir(tempDir)
  }
}
