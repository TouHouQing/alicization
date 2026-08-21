import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingArtifactReconciliationInput,
  PersonaTrainingExecutorInput,
  PersonaTrainingExecutorOutput,
} from './persona-training-pipeline-gate'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { constants, createReadStream } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { kill as killProcess, env as processEnv, platform as processPlatform } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import { PersonaTrainingExecutorArtifactError } from './persona-training-pipeline-gate'
import { buildPersonaTrainingRuntimeDiagnostic } from './persona-training-runtime-diagnostics'

const artifactSchemaVersion = 'alicization-persona-training-artifact-v1'
const artifactPublicationSchemaVersion = 'alicization-persona-training-publication-v1'
const artifactPublicationReceiptFile = '.alicization-publication.json'
const defaultTerminationGraceMs = 3_000
const maxProtocolBytes = 256 * 1024
const maxProtocolLineBytes = 64 * 1024
const maxStderrBytes = 64 * 1024

export const personaTrainingInputLimits = {
  maxExamples: 1_024,
  maxLineBytes: 64 * 1_024,
  maxTotalBytes: 8 * 1_024 * 1_024,
} as const

export interface PersonaTrainingProcessConfig {
  executable: string
  baseModel: string
  timeoutMs: number
  backend?: 'external' | 'mlx-lm'
  iterations?: number
  learningRate?: number
  loraLayers?: number
  batchSize?: number
  maxSeqLength?: number
  maskPrompt?: boolean
  seed?: number
}

export interface PersonaTrainingProcessProgress {
  runId: string
  progress: number
  message: string | null
}

export type PersonaTrainingArtifact = AlicizationPersonaTrainingArtifact

export interface PersonaTrainingProcessConnectionResult {
  ok: boolean
  executable: string
  backend: 'external' | 'mlx-lm'
  status: 'ready' | 'executable-missing' | 'model-unreadable' | 'mlx-lm-missing' | 'protocol-failure' | 'invalid-config'
  error: string | null
  diagnostic?: {
    action: 'none' | 'install-mlx-lm' | 'choose-readable-model' | 'configure-executable' | 'repair-protocol' | 'fix-configuration'
    command: string | null
  }
}

interface ArtifactManifest {
  schemaVersion: typeof artifactSchemaVersion
  artifactId: string
  runId: string
  kind: 'lora-adapter'
  path: string
  sha256: string
  baseModel: string
  trainingReady?: boolean
  dialogueReady?: boolean
  compatibilityReason?: string | null
  format?: 'gguf' | 'mlx-safetensors' | 'unknown'
  producerBackend?: 'mlx-lm' | 'external' | 'unknown'
  loaderTarget?: 'llama.cpp' | 'mlx-runtime' | 'unknown'
  conversion?: {
    status: 'not-required' | 'required' | 'completed' | 'failed'
    sourceArtifactId?: string | null
    tool?: string | null
    version?: string | null
  }
}

interface ProtocolState {
  ready: boolean
  artifact: boolean
}

interface FileIdentity {
  dev: number | bigint | string
  ino: number | bigint | string
}

interface PersistedFileIdentity {
  dev: string
  ino: string
}

interface ArtifactPublicationReceipt {
  schemaVersion: typeof artifactPublicationSchemaVersion
  artifactId: string
  runId: string
  relativeArtifactPath: string
  sha256: string
  sizeBytes: number
  baseModel: string
  trainingReady?: boolean
  dialogueReady?: boolean
  compatibilityReason?: string | null
  format?: ArtifactManifest['format']
  producerBackend?: ArtifactManifest['producerBackend']
  loaderTarget?: ArtifactManifest['loaderTarget']
  conversion?: ArtifactManifest['conversion']
  artifactIdentity: PersistedFileIdentity
  publicationDirectoryIdentity: PersistedFileIdentity
}

interface RunChildProcessOptions {
  executable: string
  argv: string[]
  timeoutMs: number
  terminationGraceMs: number
  signal?: AbortSignal
  onEvent?: (event: Record<string, unknown>) => void | Promise<void>
}

function signalTrainerProcess(child: ReturnType<typeof spawn>, signal: NodeJS.Signals) {
  if (processPlatform !== 'win32' && child.pid) {
    try {
      killProcess(-child.pid, signal)
      return
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ESRCH')
        throw error
    }
  }
  child.kill(signal)
}

function normalizeNonEmptyText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string')
    throw new Error(`${label} must be a string`)
  const normalized = value.trim()
  if (!normalized)
    throw new Error(`${label} is required`)
  if (normalized.length > maxLength)
    throw new Error(`${label} is too long`)
  if (normalized.includes('\0'))
    throw new Error(`${label} contains a null byte`)
  return normalized
}

export function normalizePersonaTrainingProcessConfig(input: unknown): PersonaTrainingProcessConfig {
  if (!input || typeof input !== 'object')
    throw new Error('persona training executor is not configured')
  const value = input as Partial<PersonaTrainingProcessConfig> & {
    fixedArguments?: unknown
  }
  const executable = normalizeNonEmptyText(value.executable, 'persona training executable', 4_096)
  if (!isAbsolute(executable))
    throw new Error('persona training executable must be an absolute path')
  const baseModel = normalizeNonEmptyText(value.baseModel, 'persona training base model', 1_024)
  const timeoutMs = Number(value.timeoutMs)
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10 || timeoutMs > 24 * 60 * 60 * 1_000)
    throw new Error('persona training timeout must be between 10ms and 24h')
  const backend = value.backend === 'mlx-lm' ? 'mlx-lm' : 'external'
  const integerOption = (raw: unknown, label: string, min: number, max: number, fallback: number) => {
    if (raw == null)
      return fallback
    const normalized = Number(raw)
    if (!Number.isSafeInteger(normalized) || normalized < min || normalized > max)
      throw new Error(`${label} must be an integer between ${min} and ${max}`)
    return normalized
  }
  const floatOption = (raw: unknown, label: string, min: number, max: number, fallback: number) => {
    if (raw == null)
      return fallback
    const normalized = Number(raw)
    if (!Number.isFinite(normalized) || normalized < min || normalized > max)
      throw new Error(`${label} must be between ${min} and ${max}`)
    return normalized
  }
  const iterations = integerOption(value.iterations, 'persona training iterations', 1, 100_000, 600)
  const learningRate = floatOption(value.learningRate, 'persona training learning rate', 0.0000001, 1, 1e-5)
  const loraLayers = integerOption(value.loraLayers, 'persona training LoRA layers', 1, 256, 8)
  const batchSize = integerOption(value.batchSize, 'persona training batch size', 1, 128, 1)
  const maxSeqLength = integerOption(value.maxSeqLength, 'persona training max sequence length', 64, 32_768, 2_048)
  const seed = integerOption(value.seed, 'persona training seed', 0, 2_147_483_647, 42)
  return {
    executable,
    baseModel,
    timeoutMs: Math.floor(timeoutMs),
    backend,
    iterations,
    learningRate,
    loraLayers,
    batchSize,
    maxSeqLength,
    maskPrompt: value.maskPrompt === true,
    seed,
  }
}

async function resolveExecutable(executable: string) {
  const configured = normalizeNonEmptyText(executable, 'persona training executable', 4_096)
  if (!isAbsolute(configured))
    throw new Error('persona training executable must be an absolute path')
  const resolved = await realpath(configured).catch((error) => {
    throw new Error(`persona training executable cannot be resolved: ${errorMessageFrom(error) ?? String(error)}`)
  })
  const executableStat = await stat(resolved)
  if (!executableStat.isFile())
    throw new Error('persona training executable is not a file')
  await access(resolved, constants.X_OK).catch(() => {
    throw new Error('persona training executable is not executable')
  })
  return resolved
}

function createSafeChildEnvironment() {
  const allowedKeys = [
    'HOME',
    'LANG',
    'LC_ALL',
    'LC_CTYPE',
    'LOGNAME',
    'PATH',
    'SHELL',
    'TEMP',
    'TMP',
    'TMPDIR',
    'USER',
  ] as const
  const childEnv: NodeJS.ProcessEnv = {}
  for (const key of allowedKeys) {
    const value = processEnv[key]
    if (value)
      childEnv[key] = value
  }
  return childEnv
}

function abortReason(signal: AbortSignal) {
  if (typeof signal.reason === 'string' && signal.reason.trim())
    return signal.reason.trim()
  return errorMessageFrom(signal.reason) ?? 'persona training was cancelled'
}

async function runChildProcess(options: RunChildProcessOptions) {
  const state: ProtocolState = {
    ready: false,
    artifact: false,
  }
  const child = spawn(options.executable, options.argv, {
    detached: processPlatform !== 'win32',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: createSafeChildEnvironment(),
  })
  let stdoutBuffer = ''
  let stdoutBytes = 0
  let stderr = ''
  let settled = false
  let terminationTimer: ReturnType<typeof setTimeout> | undefined
  let terminalError: Error | null = null
  let eventQueue = Promise.resolve()

  const terminate = (error: Error) => {
    if (!terminalError)
      terminalError = error
    if (child.exitCode != null || child.signalCode != null)
      return
    signalTrainerProcess(child, 'SIGTERM')
    if (!terminationTimer) {
      terminationTimer = setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null)
          signalTrainerProcess(child, 'SIGKILL')
      }, options.terminationGraceMs)
      terminationTimer.unref?.()
    }
  }

  const parseLine = (rawLine: string) => {
    if (!rawLine.trim())
      return
    if (Buffer.byteLength(rawLine, 'utf8') > maxProtocolLineBytes)
      throw new Error('persona training protocol line exceeded the size limit')
    let event: unknown
    try {
      event = JSON.parse(rawLine)
    }
    catch {
      throw new Error('persona training protocol emitted malformed JSONL')
    }
    if (!event || typeof event !== 'object')
      throw new Error('persona training protocol event must be an object')
    const record = event as Record<string, unknown>
    if (record.type === 'ready') {
      state.ready = true
    }
    else if (record.type === 'artifact') {
      state.artifact = true
    }
    else if (record.type === 'progress') {
      const progress = Number(record.progress)
      if (!Number.isFinite(progress) || progress < 0 || progress > 1)
        throw new Error('persona training progress must be between 0 and 1')
    }
    else if (record.type === 'error') {
      throw new Error(normalizeNonEmptyText(record.message, 'persona training protocol error', 4_096))
    }
    else {
      throw new Error(`persona training protocol event type is unsupported: ${String(record.type)}`)
    }
    eventQueue = eventQueue
      .then(async () => {
        if (!terminalError)
          await options.onEvent?.(record)
      })
      .catch((error) => {
        terminate(error instanceof Error ? error : new Error(String(error)))
      })
  }

  child.stdout.on('data', (chunk: Buffer | string) => {
    if (terminalError)
      return
    const text = chunk.toString()
    stdoutBytes += Buffer.byteLength(text, 'utf8')
    if (stdoutBytes > maxProtocolBytes) {
      terminate(new Error('persona training protocol output exceeded the size limit'))
      return
    }
    stdoutBuffer += text
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() ?? ''
    try {
      for (const line of lines)
        parseLine(line)
    }
    catch (error) {
      terminate(error instanceof Error ? error : new Error(String(error)))
    }
  })
  child.stderr.on('data', (chunk: Buffer | string) => {
    if (Buffer.byteLength(stderr, 'utf8') >= maxStderrBytes)
      return
    stderr += chunk.toString()
    if (Buffer.byteLength(stderr, 'utf8') > maxStderrBytes)
      stderr = Buffer.from(stderr, 'utf8').subarray(0, maxStderrBytes).toString('utf8')
  })

  const onAbort = () => terminate(new Error(abortReason(options.signal!)))
  if (options.signal) {
    if (options.signal.aborted)
      onAbort()
    else
      options.signal.addEventListener('abort', onAbort, { once: true })
  }
  const timeoutTimer = setTimeout(() => {
    terminate(new Error(`persona training process timed out after ${options.timeoutMs}ms`))
  }, options.timeoutMs)
  timeoutTimer.unref?.()

  return await new Promise<ProtocolState>((resolvePromise, reject) => {
    child.once('error', (error) => {
      terminalError = new Error(`persona training process failed to start: ${errorMessageFrom(error) ?? String(error)}`)
    })
    child.once('close', (code, signal) => {
      if (settled)
        return
      settled = true
      void (async () => {
        if (timeoutTimer)
          clearTimeout(timeoutTimer)
        if (terminationTimer)
          clearTimeout(terminationTimer)
        options.signal?.removeEventListener('abort', onAbort)

        if (!terminalError && stdoutBuffer.trim()) {
          try {
            parseLine(stdoutBuffer)
          }
          catch (error) {
            terminalError = error instanceof Error ? error : new Error(String(error))
          }
        }
        await eventQueue
        if (terminalError) {
          reject(terminalError)
          return
        }
        if (code !== 0) {
          const detail = stderr.trim()
          reject(new Error(`persona training process exited with code ${code ?? 'null'}${signal ? ` (${signal})` : ''}${detail ? `: ${detail}` : ''}`))
          return
        }
        resolvePromise(state)
      })().catch(reject)
    })
  })
}

async function writeBoundedDatasetJsonl(
  datasetPath: string,
  examples: PersonaTrainingExecutorInput['manifest']['examples'],
) {
  if (examples.length > personaTrainingInputLimits.maxExamples) {
    throw new Error(
      `persona training dataset example count exceeds ${personaTrainingInputLimits.maxExamples}`,
    )
  }
  const file = await open(datasetPath, 'wx', 0o600)
  let totalBytes = 0
  try {
    for (const example of examples) {
      const line = `${JSON.stringify(example)}\n`
      const lineBytes = Buffer.byteLength(line, 'utf8')
      if (lineBytes > personaTrainingInputLimits.maxLineBytes) {
        throw new Error(
          `persona training dataset single JSONL line UTF-8 bytes exceed ${personaTrainingInputLimits.maxLineBytes}`,
        )
      }
      totalBytes += lineBytes
      if (totalBytes > personaTrainingInputLimits.maxTotalBytes) {
        throw new Error(
          `persona training dataset total JSONL bytes exceed ${personaTrainingInputLimits.maxTotalBytes}`,
        )
      }
      await file.write(line)
    }
  }
  catch (error) {
    const cleanupErrors: unknown[] = []
    try {
      await file.close()
    }
    catch (cleanupError) {
      cleanupErrors.push(cleanupError)
    }
    try {
      await rm(datasetPath, { force: true })
    }
    catch (cleanupError) {
      cleanupErrors.push(cleanupError)
    }
    throw errorWithCleanupFailures(
      error,
      cleanupErrors,
      'persona training dataset input cleanup failed',
    )
  }
  await file.close()
}

async function hashFile(path: string) {
  const hash = createHash('sha256')
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(path)
    stream.on('data', chunk => hash.update(chunk))
    stream.once('error', reject)
    stream.once('end', resolvePromise)
  })
  return hash.digest('hex')
}

function parseArtifactManifest(raw: string): ArtifactManifest {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw new Error('persona training artifact manifest is malformed JSON')
  }
  if (!parsed || typeof parsed !== 'object')
    throw new Error('persona training artifact manifest must be an object')
  const value = parsed as Partial<ArtifactManifest>
  if (value.schemaVersion !== artifactSchemaVersion)
    throw new Error('persona training artifact manifest schema is unsupported')
  if (value.kind !== 'lora-adapter')
    throw new Error('persona training artifact kind is unsupported')
  const format = value.format == null
    ? undefined
    : ['gguf', 'mlx-safetensors', 'unknown'].includes(String(value.format))
        ? value.format
        : (() => {
            throw new Error('persona training artifact format is unsupported')
          })()
  const producerBackend = value.producerBackend == null
    ? undefined
    : ['mlx-lm', 'external', 'unknown'].includes(String(value.producerBackend))
        ? value.producerBackend
        : (() => {
            throw new Error('persona training artifact producer backend is unsupported')
          })()
  const loaderTarget = value.loaderTarget == null
    ? undefined
    : ['llama.cpp', 'mlx-runtime', 'unknown'].includes(String(value.loaderTarget))
        ? value.loaderTarget
        : (() => {
            throw new Error('persona training artifact loader target is unsupported')
          })()
  const trainingReady = value.trainingReady == null
    ? undefined
    : typeof value.trainingReady === 'boolean'
      ? value.trainingReady
      : (() => {
          throw new Error('persona training artifact trainingReady must be a boolean')
        })()
  const dialogueReady = value.dialogueReady == null
    ? undefined
    : typeof value.dialogueReady === 'boolean'
      ? value.dialogueReady
      : (() => {
          throw new Error('persona training artifact dialogueReady must be a boolean')
        })()
  const compatibilityReason = Object.prototype.hasOwnProperty.call(value, 'compatibilityReason')
    ? value.compatibilityReason === null
      ? null
      : value.compatibilityReason === undefined
        ? undefined
        : normalizeNonEmptyText(
            value.compatibilityReason,
            'persona training artifact compatibility reason',
            2_048,
          )
    : undefined
  return {
    schemaVersion: value.schemaVersion,
    artifactId: normalizeNonEmptyText(value.artifactId, 'persona training artifact id', 160),
    runId: normalizeNonEmptyText(value.runId, 'persona training artifact run id', 160),
    kind: value.kind,
    path: normalizeNonEmptyText(value.path, 'persona training artifact path', 4_096),
    sha256: normalizeNonEmptyText(value.sha256, 'persona training artifact hash', 128).toLowerCase(),
    baseModel: normalizeNonEmptyText(value.baseModel, 'persona training artifact base model', 1_024),
    ...(trainingReady == null ? {} : { trainingReady }),
    ...(dialogueReady == null ? {} : { dialogueReady }),
    ...(compatibilityReason === undefined ? {} : { compatibilityReason }),
    ...(format ? { format } : {}),
    ...(producerBackend ? { producerBackend } : {}),
    ...(loaderTarget ? { loaderTarget } : {}),
    ...(value.conversion ? { conversion: value.conversion } : {}),
  }
}

function resolvePersonaTrainingArtifactCompatibility(input: {
  baseModel: string
  trainingReady?: boolean
  dialogueReady?: boolean
  format?: ArtifactManifest['format']
  loaderTarget?: ArtifactManifest['loaderTarget']
}) {
  if (input.trainingReady === false) {
    return {
      status: 'incompatible' as const,
      baseModel: input.baseModel,
      reason: 'The artifact is not training-ready yet.',
    }
  }
  if (input.dialogueReady === false) {
    return {
      status: 'incompatible' as const,
      baseModel: input.baseModel,
      reason: 'The artifact is not dialogue-ready yet.',
    }
  }
  if (input.format === 'unknown') {
    return {
      status: 'incompatible' as const,
      baseModel: input.baseModel,
      reason: 'The artifact format is unknown.',
    }
  }
  if (input.loaderTarget === 'unknown') {
    return {
      status: 'incompatible' as const,
      baseModel: input.baseModel,
      reason: 'The artifact loader target is unknown.',
    }
  }
  if (input.format === 'mlx-safetensors' && input.loaderTarget !== 'mlx-runtime') {
    return {
      status: 'incompatible' as const,
      baseModel: input.baseModel,
      reason: 'MLX safetensors is a training output and requires the MLX runtime loader target before dialogue activation.',
    }
  }
  return {
    status: 'compatible' as const,
    baseModel: input.baseModel,
  }
}

function assertSafeArtifactId(artifactId: string) {
  if (!/^(?!_)\w[\w.-]{0,159}$/.test(artifactId) || artifactId === '.' || artifactId === '..')
    throw new Error('persona training artifact id is not filesystem-safe')
}

function fileIdentity(stat: Awaited<ReturnType<typeof lstat>>): FileIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
  }
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity) {
  return String(left.dev) === String(right.dev) && String(left.ino) === String(right.ino)
}

function errorWithCleanupFailures(
  operationError: unknown,
  cleanupErrors: unknown[],
  context: string,
) {
  const operationMessage = errorMessageFrom(operationError) ?? String(operationError)
  if (cleanupErrors.length === 0)
    return operationError instanceof Error ? operationError : new Error(operationMessage)
  const cleanupMessage = cleanupErrors
    .map(error => errorMessageFrom(error) ?? String(error))
    .join('; ')
  return new Error(`${operationMessage}; ${context}: ${cleanupMessage}`, {
    cause: operationError,
  })
}

function persistFileIdentity(identity: FileIdentity): PersistedFileIdentity {
  return {
    dev: String(identity.dev),
    ino: String(identity.ino),
  }
}

function parsePersistedFileIdentity(value: unknown, label: string): PersistedFileIdentity {
  if (!value || typeof value !== 'object')
    throw new Error(`${label} is missing`)
  const identity = value as Partial<PersistedFileIdentity>
  const dev = normalizeNonEmptyText(identity.dev, `${label}.dev`, 80)
  const ino = normalizeNonEmptyText(identity.ino, `${label}.ino`, 80)
  if (!/^\d+$/.test(dev) || !/^\d+$/.test(ino))
    throw new Error(`${label} is invalid`)
  return { dev, ino }
}

function parseArtifactPublicationReceipt(raw: string): ArtifactPublicationReceipt {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    throw new Error('persona training artifact publication receipt is malformed JSON')
  }
  if (!parsed || typeof parsed !== 'object')
    throw new Error('persona training artifact publication receipt must be an object')
  const value = parsed as Partial<ArtifactPublicationReceipt>
  if (value.schemaVersion !== artifactPublicationSchemaVersion)
    throw new Error('persona training artifact publication receipt schema is unsupported')
  const sizeBytes = Number(value.sizeBytes)
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0)
    throw new Error('persona training artifact publication receipt size is invalid')
  const sha256 = normalizeNonEmptyText(value.sha256, 'persona training publication hash', 64).toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(sha256))
    throw new Error('persona training artifact publication receipt hash is invalid')
  return {
    schemaVersion: value.schemaVersion,
    artifactId: normalizeNonEmptyText(value.artifactId, 'persona training publication artifact id', 160),
    runId: normalizeNonEmptyText(value.runId, 'persona training publication run id', 160),
    relativeArtifactPath: normalizeNonEmptyText(value.relativeArtifactPath, 'persona training publication relative path', 4_096),
    sha256,
    sizeBytes,
    baseModel: normalizeNonEmptyText(value.baseModel, 'persona training publication base model', 1_024),
    ...(typeof value.trainingReady === 'boolean' ? { trainingReady: value.trainingReady } : {}),
    ...(typeof value.dialogueReady === 'boolean' ? { dialogueReady: value.dialogueReady } : {}),
    ...(Object.prototype.hasOwnProperty.call(value, 'compatibilityReason')
      ? {
          compatibilityReason: value.compatibilityReason === null
            ? null
            : normalizeNonEmptyText(
                value.compatibilityReason,
                'persona training publication compatibility reason',
                2_048,
              ),
        }
      : {}),
    ...(value.format ? { format: value.format } : {}),
    ...(value.producerBackend ? { producerBackend: value.producerBackend } : {}),
    ...(value.loaderTarget ? { loaderTarget: value.loaderTarget } : {}),
    ...(value.conversion ? { conversion: value.conversion } : {}),
    artifactIdentity: parsePersistedFileIdentity(value.artifactIdentity, 'persona training publication artifact identity'),
    publicationDirectoryIdentity: parsePersistedFileIdentity(
      value.publicationDirectoryIdentity,
      'persona training publication directory identity',
    ),
  }
}

async function ensureTrustedCardRoot(input: {
  cardsRootDir: string
  cardRootDir: string
}) {
  const configuredCardsRoot = resolve(input.cardsRootDir)
  const configuredCardRoot = resolve(input.cardRootDir)
  const relativeCardRoot = relative(configuredCardsRoot, configuredCardRoot)
  if (
    !relativeCardRoot
    || isAbsolute(relativeCardRoot)
    || relativeCardRoot.split(/[\\/]+/).includes('..')
  ) {
    throw new Error('persona training card root must stay inside the trusted cards root')
  }

  await mkdir(configuredCardsRoot, { recursive: true, mode: 0o700 })
  const cardsRootLstat = await lstat(configuredCardsRoot)
  if (cardsRootLstat.isSymbolicLink() || !cardsRootLstat.isDirectory())
    throw new Error('persona training cards root must be a real directory, not a symbolic link')

  let parentRealPath = await realpath(configuredCardsRoot)
  let configuredPath = configuredCardsRoot
  for (const segment of relativeCardRoot.split(/[\\/]+/).filter(Boolean)) {
    configuredPath = join(configuredPath, segment)
    await mkdir(configuredPath, { mode: 0o700 }).catch(async (error) => {
      const existing = await lstat(configuredPath).catch(() => null)
      if (!existing)
        throw error
    })
    const component = await lstat(configuredPath)
    if (component.isSymbolicLink() || !component.isDirectory())
      throw new Error('persona training card root ancestor must be a real directory, not a symbolic link')
    const componentRealPath = await realpath(configuredPath)
    const expectedRealPath = join(parentRealPath, segment)
    if (componentRealPath !== expectedRealPath)
      throw new Error('persona training card root ancestor resolves outside the trusted cards root')
    parentRealPath = componentRealPath
  }
  return parentRealPath
}

async function ensureRealChildDirectory(input: {
  parentRealPath: string
  name: string
  label: string
}) {
  const path = join(input.parentRealPath, input.name)
  await mkdir(path, { recursive: true, mode: 0o700 })
  const directoryLstat = await lstat(path)
  if (directoryLstat.isSymbolicLink() || !directoryLstat.isDirectory())
    throw new Error(`${input.label} must be a real directory, not a symbolic link`)
  const directoryRealPath = await realpath(path)
  if (directoryRealPath !== path)
    throw new Error(`${input.label} resolves outside its parent directory`)
  return directoryRealPath
}

async function resolvePersonaTrainingStorageRoots(cardsRootDir: string, cardRootDir: string) {
  const cardRootRealPath = await ensureTrustedCardRoot({
    cardsRootDir,
    cardRootDir,
  })
  const trainingRoot = await ensureRealChildDirectory({
    parentRealPath: cardRootRealPath,
    name: 'persona-training',
    label: 'persona training root',
  })
  const runsRoot = await ensureRealChildDirectory({
    parentRealPath: trainingRoot,
    name: 'runs',
    label: 'persona training runs root',
  })
  const artifactRoot = await ensureRealChildDirectory({
    parentRealPath: trainingRoot,
    name: 'artifacts',
    label: 'persona training artifact root',
  })
  return {
    artifactRoot,
    runsRoot,
  }
}

async function createRunDirectories(cardsRootDir: string, cardRootDir: string, runId: string) {
  assertSafeArtifactId(runId)
  const {
    artifactRoot,
    runsRoot,
  } = await resolvePersonaTrainingStorageRoots(cardsRootDir, cardRootDir)
  const runDir = join(runsRoot, runId)
  let runDirIdentity: FileIdentity | null = null
  try {
    await mkdir(runDir, { mode: 0o700 }).catch((error) => {
      throw new Error(`persona training run directory cannot be created: ${errorMessageFrom(error) ?? String(error)}`)
    })
    const runDirLstat = await lstat(runDir)
    if (runDirLstat.isSymbolicLink() || !runDirLstat.isDirectory())
      throw new Error('persona training run directory must be a real directory')
    runDirIdentity = fileIdentity(runDirLstat)
    const runDirRealPath = await realpath(runDir)
    if (runDirRealPath !== runDir)
      throw new Error('persona training run directory resolves outside the runs root')
    const outputDir = await ensureRealChildDirectory({
      parentRealPath: runDirRealPath,
      name: 'output',
      label: 'persona training output directory',
    })
    return {
      artifactRoot,
      outputDir,
      runDir: runDirRealPath,
      runDirIdentity,
      runsRoot,
    }
  }
  catch (error) {
    const cleanupErrors: unknown[] = []
    if (runDirIdentity) {
      try {
        await quarantineAndRemoveDirectory({
          rootDir: runsRoot,
          directoryName: runId,
          expectedIdentity: runDirIdentity,
          label: 'persona training run directory',
        })
      }
      catch (cleanupError) {
        cleanupErrors.push(cleanupError)
      }
    }
    throw errorWithCleanupFailures(
      error,
      cleanupErrors,
      'persona training partial run-directory cleanup failed',
    )
  }
}

async function validatePublishedArtifact(input: {
  rootDir: string
  relativeArtifactPath: string
  expectedHash: string
  expectedIdentity: FileIdentity
}) {
  const rootLstat = await lstat(input.rootDir)
  if (rootLstat.isSymbolicLink() || !rootLstat.isDirectory())
    throw new Error('persona training published artifact root must be a real directory')
  const rootRealPath = await realpath(input.rootDir)
  if (rootRealPath !== input.rootDir)
    throw new Error('persona training published artifact root changed during publication')

  let currentPath = rootRealPath
  for (const segment of input.relativeArtifactPath.split(/[\\/]+/).filter(Boolean)) {
    currentPath = join(currentPath, segment)
    const component = await lstat(currentPath).catch((error) => {
      throw new Error(`persona training published artifact is missing: ${errorMessageFrom(error) ?? String(error)}`)
    })
    if (component.isSymbolicLink())
      throw new Error('persona training published artifact path must not contain symbolic links')
  }
  const artifactPath = join(rootRealPath, input.relativeArtifactPath)
  const artifactRealPath = await realpath(artifactPath)
  if (!artifactRealPath.startsWith(`${rootRealPath}${sep}`))
    throw new Error('persona training published artifact resolves outside its publication root')
  const artifactStat = await lstat(artifactRealPath)
  if (!artifactStat.isFile() || artifactStat.isSymbolicLink())
    throw new Error('persona training published artifact is not a regular file')
  if (!sameFileIdentity(fileIdentity(artifactStat), input.expectedIdentity))
    throw new Error('persona training published artifact inode changed during publication')
  const publishedHash = await hashFile(artifactRealPath)
  if (publishedHash !== input.expectedHash)
    throw new Error('persona training published artifact hash changed during publication')
  return {
    artifactPath: artifactRealPath,
    artifactIdentity: fileIdentity(artifactStat),
    sizeBytes: artifactStat.size,
  }
}

async function validateAndAcceptArtifact(input: {
  artifactRoot: string
  runId: string
  outputDir: string
  expectedOutputRealPath: string
  artifactManifestPath: string
  expectedBaseModel: string
}) {
  const manifest = parseArtifactManifest(await readFile(input.artifactManifestPath, 'utf8').catch((error) => {
    throw new Error(`persona training artifact manifest is missing: ${errorMessageFrom(error) ?? String(error)}`)
  }))
  assertSafeArtifactId(manifest.artifactId)
  if (manifest.runId !== input.runId)
    throw new Error('persona training artifact run id does not match the active run')
  if (manifest.baseModel !== input.expectedBaseModel)
    throw new Error('persona training artifact base model is incompatible with the configured base model')
  if (isAbsolute(manifest.path) || manifest.path.split(/[\\/]+/).includes('..'))
    throw new Error('persona training artifact path must stay inside the run output directory')

  const outputLstat = await lstat(input.outputDir)
  if (outputLstat.isSymbolicLink() || !outputLstat.isDirectory())
    throw new Error('persona training output directory must remain a real directory')
  const outputRoot = await realpath(input.outputDir)
  if (outputRoot !== input.expectedOutputRealPath)
    throw new Error('persona training output directory changed during execution')
  const candidatePath = resolve(outputRoot, manifest.path)
  if (candidatePath !== outputRoot && !candidatePath.startsWith(`${outputRoot}${sep}`))
    throw new Error('persona training artifact path escapes the run output directory')
  let currentPath = outputRoot
  for (const segment of manifest.path.split(/[\\/]+/).filter(Boolean)) {
    currentPath = join(currentPath, segment)
    const component = await lstat(currentPath).catch((error) => {
      throw new Error(`persona training artifact file is missing: ${errorMessageFrom(error) ?? String(error)}`)
    })
    if (component.isSymbolicLink())
      throw new Error('persona training artifact path must not contain symbolic links')
  }
  const candidateRealPath = await realpath(candidatePath).catch((error) => {
    throw new Error(`persona training artifact file is missing: ${errorMessageFrom(error) ?? String(error)}`)
  })
  if (candidateRealPath !== outputRoot && !candidateRealPath.startsWith(`${outputRoot}${sep}`))
    throw new Error('persona training artifact resolves outside the run output directory')
  const candidateLstat = await lstat(candidatePath)
  if (candidateLstat.isSymbolicLink())
    throw new Error('persona training artifact must not be a symbolic link')
  const candidateStat = await lstat(candidateRealPath)
  if (!candidateStat.isFile())
    throw new Error('persona training artifact is not a file')
  const candidateIdentity = fileIdentity(candidateStat)
  const actualHash = await hashFile(candidateRealPath)
  if (actualHash !== manifest.sha256)
    throw new Error('persona training artifact hash mismatch')

  const artifactRootLstat = await lstat(input.artifactRoot)
  const artifactRootRealPath = await realpath(input.artifactRoot)
  if (artifactRootLstat.isSymbolicLink() || artifactRootRealPath !== input.artifactRoot)
    throw new Error('persona training artifact root must not be a symbolic link')
  const artifactRootIdentity = fileIdentity(artifactRootLstat)
  const acceptedDir = join(artifactRootRealPath, manifest.artifactId)
  const relativeArtifactPath = relative(outputRoot, candidateRealPath)
  const stagingDir = await mkdtemp(join(artifactRootRealPath, '.staging-'))
  const stagingLstat = await lstat(stagingDir)
  const stagingIdentity = fileIdentity(stagingLstat)
  let acceptedIdentity: FileIdentity | null = null
  try {
    const currentArtifactRoot = await lstat(artifactRootRealPath)
    if (
      currentArtifactRoot.isSymbolicLink()
      || !sameFileIdentity(fileIdentity(currentArtifactRoot), artifactRootIdentity)
    ) {
      throw new Error('persona training artifact root changed during publication')
    }

    const stagingOutputDir = join(stagingDir, 'output')
    await rename(outputRoot, stagingOutputDir)
    await validatePublishedArtifact({
      rootDir: stagingOutputDir,
      relativeArtifactPath,
      expectedHash: actualHash,
      expectedIdentity: candidateIdentity,
    })

    await mkdir(acceptedDir, { mode: 0o700 }).catch((error) => {
      throw new Error(`persona training artifact id already exists: ${errorMessageFrom(error) ?? String(error)}`)
    })
    const acceptedLstat = await lstat(acceptedDir)
    if (acceptedLstat.isSymbolicLink() || !acceptedLstat.isDirectory())
      throw new Error('persona training artifact publication directory must be a real directory')
    acceptedIdentity = fileIdentity(acceptedLstat)
    const acceptedOutputDir = join(acceptedDir, 'output')
    await rename(stagingOutputDir, acceptedOutputDir)

    const acceptedAfterPublish = await lstat(acceptedDir)
    if (
      acceptedAfterPublish.isSymbolicLink()
      || !sameFileIdentity(fileIdentity(acceptedAfterPublish), acceptedIdentity)
    ) {
      throw new Error('persona training artifact publication directory changed during publication')
    }
    const published = await validatePublishedArtifact({
      rootDir: acceptedOutputDir,
      relativeArtifactPath,
      expectedHash: actualHash,
      expectedIdentity: candidateIdentity,
    })
    const compatibility = resolvePersonaTrainingArtifactCompatibility({
      baseModel: manifest.baseModel,
      trainingReady: manifest.trainingReady,
      dialogueReady: manifest.dialogueReady,
      format: manifest.format,
      loaderTarget: manifest.loaderTarget,
    })
    const compatibilityReason = compatibility.status === 'incompatible'
      ? compatibility.reason
      : manifest.compatibilityReason ?? null
    const publicationReceipt: ArtifactPublicationReceipt = {
      schemaVersion: artifactPublicationSchemaVersion,
      artifactId: manifest.artifactId,
      runId: input.runId,
      relativeArtifactPath,
      sha256: actualHash,
      sizeBytes: published.sizeBytes,
      baseModel: manifest.baseModel,
      trainingReady: manifest.trainingReady ?? true,
      dialogueReady: manifest.dialogueReady ?? true,
      compatibilityReason,
      ...(manifest.format ? { format: manifest.format } : {}),
      ...(manifest.producerBackend ? { producerBackend: manifest.producerBackend } : {}),
      ...(manifest.loaderTarget ? { loaderTarget: manifest.loaderTarget } : {}),
      ...(manifest.conversion ? { conversion: manifest.conversion } : {}),
      artifactIdentity: persistFileIdentity(published.artifactIdentity),
      publicationDirectoryIdentity: persistFileIdentity(acceptedIdentity),
    }
    await writeFile(
      join(acceptedDir, artifactPublicationReceiptFile),
      JSON.stringify(publicationReceipt, null, 2),
      {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      },
    )
    await quarantineAndRemoveDirectory({
      rootDir: artifactRootRealPath,
      directoryName: relative(artifactRootRealPath, stagingDir),
      expectedIdentity: stagingIdentity,
    })

    return {
      acceptedDir,
      acceptedIdentity,
      artifact: {
        schemaVersion: artifactSchemaVersion,
        artifactId: manifest.artifactId,
        runId: input.runId,
        kind: 'lora-adapter',
        path: published.artifactPath,
        sha256: actualHash,
        sizeBytes: published.sizeBytes,
        baseModel: manifest.baseModel,
        trainingReady: manifest.trainingReady ?? true,
        dialogueReady: manifest.dialogueReady ?? true,
        compatibilityReason,
        ...(manifest.format ? { format: manifest.format } : {}),
        ...(manifest.producerBackend ? { producerBackend: manifest.producerBackend } : {}),
        ...(manifest.loaderTarget ? { loaderTarget: manifest.loaderTarget } : {}),
        ...(manifest.conversion ? { conversion: manifest.conversion } : {}),
        compatibility,
        activation: {
          status: 'unsupported',
          reason: 'No PersonaAdapterLoader receipt is available; the artifact is stored but inactive.',
        },
      } satisfies PersonaTrainingArtifact,
    }
  }
  catch (error) {
    const cleanupErrors: unknown[] = []
    if (acceptedIdentity) {
      try {
        await quarantineAndRemoveDirectory({
          rootDir: artifactRootRealPath,
          directoryName: manifest.artifactId,
          expectedIdentity: acceptedIdentity,
        })
      }
      catch (cleanupError) {
        cleanupErrors.push(cleanupError)
      }
    }
    try {
      await quarantineAndRemoveDirectory({
        rootDir: artifactRootRealPath,
        directoryName: relative(artifactRootRealPath, stagingDir),
        expectedIdentity: stagingIdentity,
      })
    }
    catch (cleanupError) {
      cleanupErrors.push(cleanupError)
    }
    throw errorWithCleanupFailures(
      error,
      cleanupErrors,
      'persona training artifact publication cleanup failed',
    )
  }
}

async function quarantineAndRemoveDirectory(input: {
  rootDir: string
  directoryName: string
  expectedIdentity?: FileIdentity
  label?: string
}) {
  const label = input.label ?? 'persona training artifact publication directory'
  const directoryPath = join(input.rootDir, input.directoryName)
  const current = await lstat(directoryPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT')
      return null
    throw error
  })
  if (!current)
    return
  if (current.isSymbolicLink()) {
    await rm(directoryPath, { force: true })
    return
  }
  if (!current.isDirectory())
    throw new Error(`${label} entry is not a directory`)
  const currentIdentity = fileIdentity(current)
  if (input.expectedIdentity && !sameFileIdentity(currentIdentity, input.expectedIdentity))
    throw new Error(`${label} inode changed before cleanup`)

  const quarantineName = `.discard-${randomUUID()}`
  const quarantinePath = join(input.rootDir, quarantineName)
  await rename(directoryPath, quarantinePath)
  const quarantined = await lstat(quarantinePath)
  if (!sameFileIdentity(fileIdentity(quarantined), currentIdentity)) {
    try {
      await rename(quarantinePath, directoryPath)
    }
    catch (rollbackError) {
      throw new Error(
        `persona training artifact cleanup lost its owned directory identity; `
        + `cleanup rollback failed: ${errorMessageFrom(rollbackError) ?? String(rollbackError)}`,
        { cause: rollbackError },
      )
    }
    throw new Error('persona training artifact cleanup lost its owned directory identity')
  }
  await rm(quarantinePath, { recursive: true, force: true })
}

async function validateStoredArtifact(input: {
  cardsRootDir: string
  cardRootDir: string
  artifact: AlicizationPersonaTrainingArtifact
}) {
  assertSafeArtifactId(input.artifact.artifactId)
  const { artifactRoot } = await resolvePersonaTrainingStorageRoots(
    input.cardsRootDir,
    input.cardRootDir,
  )
  const acceptedDir = join(artifactRoot, input.artifact.artifactId)
  const acceptedLstat = await lstat(acceptedDir).catch((error) => {
    throw new Error(`persona training artifact publication is missing: ${errorMessageFrom(error) ?? String(error)}`)
  })
  if (acceptedLstat.isSymbolicLink() || !acceptedLstat.isDirectory())
    throw new Error('persona training artifact publication must be a real directory')
  const acceptedRealPath = await realpath(acceptedDir)
  if (acceptedRealPath !== acceptedDir)
    throw new Error('persona training artifact publication resolves outside its card scope')

  const receipt = parseArtifactPublicationReceipt(
    await readFile(join(acceptedDir, artifactPublicationReceiptFile), 'utf8').catch((error) => {
      throw new Error(`persona training artifact publication receipt is missing: ${errorMessageFrom(error) ?? String(error)}`)
    }),
  )
  if (receipt.artifactId !== input.artifact.artifactId || receipt.runId !== input.artifact.runId)
    throw new Error('persona training artifact publication receipt owner does not match the artifact')
  if (receipt.sha256 !== input.artifact.sha256 || receipt.sizeBytes !== input.artifact.sizeBytes)
    throw new Error('persona training artifact publication receipt does not match persisted metadata')
  if (!sameFileIdentity(fileIdentity(acceptedLstat), receipt.publicationDirectoryIdentity))
    throw new Error('persona training artifact publication directory inode changed after publication')
  if (
    isAbsolute(receipt.relativeArtifactPath)
    || receipt.relativeArtifactPath.split(/[\\/]+/).includes('..')
  ) {
    throw new Error('persona training artifact publication receipt path escapes its card scope')
  }

  const outputDir = join(acceptedRealPath, 'output')
  const outputLstat = await lstat(outputDir)
  if (outputLstat.isSymbolicLink() || !outputLstat.isDirectory())
    throw new Error('persona training artifact output root must be a real directory')
  const outputRealPath = await realpath(outputDir)
  if (outputRealPath !== outputDir)
    throw new Error('persona training artifact output root resolves outside its publication directory')
  const configuredArtifactPath = resolve(input.artifact.path)
  if (
    configuredArtifactPath !== outputRealPath
    && !configuredArtifactPath.startsWith(`${outputRealPath}${sep}`)
  ) {
    throw new Error('persona training artifact path is outside its card-scoped publication root')
  }
  const relativeArtifactPath = relative(outputRealPath, configuredArtifactPath)
  if (relativeArtifactPath !== receipt.relativeArtifactPath)
    throw new Error('persona training artifact path no longer matches its publication receipt')

  const published = await validatePublishedArtifact({
    rootDir: outputRealPath,
    relativeArtifactPath,
    expectedHash: receipt.sha256,
    expectedIdentity: receipt.artifactIdentity,
  })
  if (published.artifactPath !== configuredArtifactPath)
    throw new Error('persona training artifact real path no longer matches persisted metadata')
  if (published.sizeBytes !== receipt.sizeBytes)
    throw new Error('persona training artifact size changed after publication')
}

async function discardStoredArtifact(input: {
  cardsRootDir: string
  cardRootDir: string
  artifact: AlicizationPersonaTrainingArtifact
}) {
  assertSafeArtifactId(input.artifact.artifactId)
  const { artifactRoot } = await resolvePersonaTrainingStorageRoots(
    input.cardsRootDir,
    input.cardRootDir,
  )
  const acceptedDir = join(artifactRoot, input.artifact.artifactId)
  const acceptedLstat = await lstat(acceptedDir).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT')
      return null
    throw error
  })
  if (!acceptedLstat)
    return
  if (acceptedLstat.isSymbolicLink() || !acceptedLstat.isDirectory())
    throw new Error('persona training artifact publication cannot be safely discarded')

  const receipt = parseArtifactPublicationReceipt(
    await readFile(join(acceptedDir, artifactPublicationReceiptFile), 'utf8').catch((error) => {
      throw new Error(`persona training artifact cleanup receipt is missing: ${errorMessageFrom(error) ?? String(error)}`)
    }),
  )
  if (receipt.artifactId !== input.artifact.artifactId || receipt.runId !== input.artifact.runId)
    throw new Error('persona training artifact cleanup receipt owner does not match the artifact')
  if (receipt.sha256 !== input.artifact.sha256 || receipt.sizeBytes !== input.artifact.sizeBytes)
    throw new Error('persona training artifact cleanup receipt does not match persisted metadata')
  if (!sameFileIdentity(fileIdentity(acceptedLstat), receipt.publicationDirectoryIdentity))
    throw new Error('persona training artifact publication directory inode changed before cleanup')
  await quarantineAndRemoveDirectory({
    rootDir: artifactRoot,
    directoryName: input.artifact.artifactId,
    expectedIdentity: fileIdentity(acceptedLstat),
  })
}

async function reconcileStoredArtifacts(input: {
  cardsRootDir: string
  cardRootDir: string
  reconciliation: PersonaTrainingArtifactReconciliationInput
}) {
  const {
    artifactRoot,
    runsRoot,
  } = await resolvePersonaTrainingStorageRoots(input.cardsRootDir, input.cardRootDir)
  const availableArtifacts = new Map(
    input.reconciliation.availableArtifacts.map(artifact => [artifact.artifactId, artifact]),
  )
  const cleanupErrors: unknown[] = []
  for (const artifact of availableArtifacts.values()) {
    try {
      await validateStoredArtifact({
        cardsRootDir: input.cardsRootDir,
        cardRootDir: input.cardRootDir,
        artifact,
      })
    }
    catch (error) {
      cleanupErrors.push(new Error(
        `persona training available artifact ${artifact.artifactId} failed final reconciliation validation: `
        + `${errorMessageFrom(error) ?? String(error)}`,
        { cause: error },
      ))
    }
  }
  const artifactEntries = await readdir(artifactRoot, { withFileTypes: true })
  for (const entry of artifactEntries) {
    const availableArtifact = availableArtifacts.get(entry.name)
    if (availableArtifact)
      continue
    const entryPath = join(artifactRoot, entry.name)
    let orphanArtifact: AlicizationPersonaTrainingArtifact | null = null
    try {
      if (!entry.isDirectory())
        throw new Error(`persona training artifact recovery entry is not a directory: ${entry.name}`)
      const entryLstat = await lstat(entryPath)
      if (!entry.name.startsWith('.staging-') && !entry.name.startsWith('.discard-')) {
        const receipt = parseArtifactPublicationReceipt(
          await readFile(join(entryPath, artifactPublicationReceiptFile), 'utf8').catch((error) => {
            throw new Error(
              `persona training orphan artifact cleanup receipt is missing: ${errorMessageFrom(error) ?? String(error)}`,
            )
          }),
        )
        if (receipt.artifactId !== entry.name)
          throw new Error('persona training orphan artifact cleanup receipt owner does not match its directory')
        assertSafeArtifactId(receipt.artifactId)
        const outputRoot = join(entryPath, 'output')
        const artifactPath = resolve(outputRoot, receipt.relativeArtifactPath)
        if (
          artifactPath !== outputRoot
          && !artifactPath.startsWith(`${outputRoot}${sep}`)
        ) {
          throw new Error('persona training orphan artifact cleanup receipt path escapes its publication directory')
        }
        const compatibility = resolvePersonaTrainingArtifactCompatibility({
          baseModel: receipt.baseModel,
          trainingReady: receipt.trainingReady,
          dialogueReady: receipt.dialogueReady,
          format: receipt.format,
          loaderTarget: receipt.loaderTarget,
        })
        const reconciledCompatibility = compatibility.status === 'compatible' && receipt.compatibilityReason !== undefined
          ? {
              ...compatibility,
              reason: receipt.compatibilityReason,
            }
          : compatibility
        orphanArtifact = {
          schemaVersion: artifactSchemaVersion,
          artifactId: receipt.artifactId,
          runId: receipt.runId,
          kind: 'lora-adapter',
          path: artifactPath,
          sha256: receipt.sha256,
          sizeBytes: receipt.sizeBytes,
          baseModel: receipt.baseModel,
          ...(receipt.trainingReady == null ? {} : { trainingReady: receipt.trainingReady }),
          ...(receipt.dialogueReady == null ? {} : { dialogueReady: receipt.dialogueReady }),
          ...(receipt.compatibilityReason === undefined
            ? {}
            : { compatibilityReason: receipt.compatibilityReason }),
          ...(receipt.format ? { format: receipt.format } : {}),
          ...(receipt.producerBackend ? { producerBackend: receipt.producerBackend } : {}),
          ...(receipt.loaderTarget ? { loaderTarget: receipt.loaderTarget } : {}),
          ...(receipt.conversion ? { conversion: receipt.conversion } : {}),
          compatibility: reconciledCompatibility,
          activation: {
            status: 'unsupported',
            reason: 'No PersonaAdapterLoader receipt is available; the artifact is stored but inactive.',
          },
        }
        if (!sameFileIdentity(fileIdentity(entryLstat), receipt.publicationDirectoryIdentity))
          throw new Error('persona training orphan artifact publication directory inode changed before cleanup')
      }
      await quarantineAndRemoveDirectory({
        rootDir: artifactRoot,
        directoryName: entry.name,
        expectedIdentity: fileIdentity(entryLstat),
      })
    }
    catch (error) {
      if (orphanArtifact) {
        try {
          await input.reconciliation.onOrphanCleanupFailure({
            artifact: orphanArtifact,
            error,
          })
        }
        catch (recoveryError) {
          cleanupErrors.push(errorWithCleanupFailures(
            error,
            [recoveryError],
            'persona training orphan artifact recovery intent persistence failed',
          ))
          continue
        }
      }
      cleanupErrors.push(error)
    }
  }

  const runEntries = await readdir(runsRoot, { withFileTypes: true })
  for (const entry of runEntries) {
    const entryPath = join(runsRoot, entry.name)
    try {
      if (entry.isDirectory()) {
        const entryLstat = await lstat(entryPath)
        await quarantineAndRemoveDirectory({
          rootDir: runsRoot,
          directoryName: entry.name,
          expectedIdentity: fileIdentity(entryLstat),
        })
      }
      else {
        await rm(entryPath, { force: true })
      }
    }
    catch (error) {
      cleanupErrors.push(error)
    }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      cleanupErrors,
      `persona training artifact reconciliation failed: ${
        cleanupErrors.map(error => errorMessageFrom(error) ?? String(error)).join('; ')
      }`,
    )
  }
}

export function createPersonaTrainingProcessExecutor(options: {
  cardsRootDir?: string
  cardRootDir: string
  terminationGraceMs?: number
  onProgress?: (progress: PersonaTrainingProcessProgress) => void | Promise<void>
}) {
  const activeProcesses = new Set<string>()
  const cardsRootDir = options.cardsRootDir ?? resolve(options.cardRootDir, '..')
  const terminationGraceMs = Math.max(10, Math.floor(options.terminationGraceMs ?? defaultTerminationGraceMs))

  async function execute(
    input: PersonaTrainingExecutorInput,
    rawConfig: PersonaTrainingProcessConfig,
  ): Promise<PersonaTrainingExecutorOutput> {
    const config = normalizePersonaTrainingProcessConfig(rawConfig)
    const executable = await resolveExecutable(config.executable)
    await input.assertCurrent()

    const {
      artifactRoot,
      outputDir,
      runDir,
      runDirIdentity,
      runsRoot,
    } = await createRunDirectories(
      cardsRootDir,
      options.cardRootDir,
      input.runId,
    )
    let publishedArtifact: AlicizationPersonaTrainingArtifact | null = null
    let result: PersonaTrainingExecutorOutput | null = null
    let executionError: unknown = null
    try {
      const manifestPath = join(runDir, 'manifest.json')
      const datasetPath = join(runDir, 'dataset.jsonl')
      const artifactManifestPath = join(runDir, 'artifact-manifest.json')
      await input.onProgress?.({
        stage: 'writing-input',
        progress: 0.02,
        message: null,
      })
      const expectedOutputRealPath = await realpath(outputDir)
      await writeFile(manifestPath, JSON.stringify({
        ...input.manifest,
        runId: input.runId,
        basePersonaRevision: input.basePersonaRevision,
      }, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      })
      await writeBoundedDatasetJsonl(datasetPath, input.manifest.examples)

      const argv = [
        '--manifest',
        manifestPath,
        '--dataset',
        datasetPath,
        '--output-dir',
        outputDir,
        '--artifact-manifest',
        artifactManifestPath,
        '--base-model',
        config.baseModel,
        '--backend',
        config.backend ?? 'external',
        '--iterations',
        String(config.iterations ?? 600),
        '--learning-rate',
        String(config.learningRate ?? 1e-5),
        '--lora-layers',
        String(config.loraLayers ?? 8),
        '--batch-size',
        String(config.batchSize ?? 1),
        '--max-seq-length',
        String(config.maxSeqLength ?? 2_048),
        '--mask-prompt',
        String(config.maskPrompt ?? false),
        '--seed',
        String(config.seed ?? 42),
      ]
      await input.onProgress?.({
        stage: 'spawning',
        progress: 0.05,
        message: null,
      })
      activeProcesses.add(input.runId)
      try {
        const protocol = await runChildProcess({
          executable,
          argv,
          timeoutMs: config.timeoutMs,
          terminationGraceMs,
          signal: input.signal,
          onEvent: async (event) => {
            if (event.type === 'ready') {
              await input.onProgress?.({
                stage: 'training',
                progress: 0.1,
                message: null,
              })
              return
            }
            if (event.type !== 'progress')
              return
            const progress = Number(event.progress)
            const message = typeof event.message === 'string'
              ? event.message.trim().slice(0, 1_000) || null
              : null
            await options.onProgress?.({
              runId: input.runId,
              progress,
              message,
            })
            await input.onProgress?.({
              stage: 'training',
              progress: 0.1 + progress * 0.8,
              message,
            })
          },
        })
        if (!protocol.ready)
          throw new Error('persona training process exited before the ready protocol event')
        if (!protocol.artifact)
          throw new Error('persona training process exited before the artifact protocol event')
        await input.assertCurrent()
        await input.onProgress?.({
          stage: 'validating-artifact',
          progress: 0.92,
          message: null,
        })
        const accepted = await validateAndAcceptArtifact({
          artifactRoot,
          runId: input.runId,
          outputDir,
          expectedOutputRealPath,
          artifactManifestPath,
          expectedBaseModel: config.baseModel,
        })
        publishedArtifact = accepted.artifact
        try {
          await input.assertCurrent()
        }
        catch (error) {
          try {
            await quarantineAndRemoveDirectory({
              rootDir: artifactRoot,
              directoryName: accepted.artifact.artifactId,
              expectedIdentity: accepted.acceptedIdentity,
            })
            publishedArtifact = null
          }
          catch (cleanupError) {
            throw errorWithCleanupFailures(
              error,
              [cleanupError],
              'persona training invalidated artifact cleanup failed',
            )
          }
          throw error
        }
        await input.onProgress?.({
          stage: 'finalizing',
          progress: 0.98,
          message: null,
        })
        result = {
          artifact: accepted.artifact,
        }
      }
      finally {
        activeProcesses.delete(input.runId)
      }
    }
    catch (error) {
      executionError = error
    }

    let cleanupError: unknown = null
    try {
      await quarantineAndRemoveDirectory({
        rootDir: runsRoot,
        directoryName: input.runId,
        expectedIdentity: runDirIdentity,
        label: 'persona training run directory',
      })
    }
    catch (error) {
      cleanupError = error
    }

    if (cleanupError) {
      const combined = executionError
        ? errorWithCleanupFailures(
            executionError,
            [cleanupError],
            'persona training run-directory cleanup failed',
          )
        : cleanupError
      if (publishedArtifact) {
        throw new PersonaTrainingExecutorArtifactError(
          errorMessageFrom(combined) ?? String(combined),
          publishedArtifact,
          { cause: combined },
        )
      }
      throw combined
    }
    if (executionError) {
      if (publishedArtifact) {
        throw new PersonaTrainingExecutorArtifactError(
          errorMessageFrom(executionError) ?? String(executionError),
          publishedArtifact,
          { cause: executionError },
        )
      }
      throw executionError
    }
    if (!result)
      throw new Error('persona training executor completed without a result')
    return result
  }

  return {
    execute,
    validateArtifact: async (artifact: AlicizationPersonaTrainingArtifact) => await validateStoredArtifact({
      cardsRootDir,
      cardRootDir: options.cardRootDir,
      artifact,
    }),
    discardArtifact: async (artifact: AlicizationPersonaTrainingArtifact) => await discardStoredArtifact({
      cardsRootDir,
      cardRootDir: options.cardRootDir,
      artifact,
    }),
    reconcileArtifacts: async (reconciliation: PersonaTrainingArtifactReconciliationInput) => await reconcileStoredArtifacts({
      cardsRootDir,
      cardRootDir: options.cardRootDir,
      reconciliation,
    }),
    activeProcessCount: () => activeProcesses.size,
  }
}

export async function testPersonaTrainingProcessConnection(
  rawConfig: PersonaTrainingProcessConfig,
): Promise<PersonaTrainingProcessConnectionResult> {
  let executable = ''
  let backend: PersonaTrainingProcessConnectionResult['backend'] = rawConfig?.backend === 'mlx-lm'
    ? 'mlx-lm'
    : 'external'
  const failure = (
    status: Exclude<PersonaTrainingProcessConnectionResult['status'], 'ready'>,
    error: unknown,
  ): PersonaTrainingProcessConnectionResult => {
    const message = errorMessageFrom(error) ?? String(error)
    return {
      ok: false,
      executable,
      backend,
      status,
      error: message,
      diagnostic: buildPersonaTrainingRuntimeDiagnostic({
        backend,
        status,
        error: message,
      }),
    }
  }
  try {
    const config = normalizePersonaTrainingProcessConfig(rawConfig)
    backend = config.backend ?? 'external'
    if (backend === 'mlx-lm') {
      const modelStat = await stat(config.baseModel).catch((error) => {
        throw new Error(`persona training base model cannot be read: ${errorMessageFrom(error) ?? String(error)}`, {
          cause: error,
        })
      })
      if (!modelStat.isDirectory())
        throw new Error('persona training MLX base model must be a readable directory')
      await access(config.baseModel)
    }
    executable = await resolveExecutable(config.executable)
    const protocol = await runChildProcess({
      executable,
      argv: ['--probe'],
      timeoutMs: Math.min(config.timeoutMs, 30_000),
      terminationGraceMs: defaultTerminationGraceMs,
    })
    if (!protocol.ready)
      return failure('protocol-failure', 'persona training probe exited before the ready protocol event')
    return {
      ok: true,
      executable,
      backend,
      status: 'ready',
      error: null,
      diagnostic: buildPersonaTrainingRuntimeDiagnostic({
        backend,
        status: 'ready',
        error: null,
      }),
    }
  }
  catch (error) {
    const message = errorMessageFrom(error) ?? String(error)
    if (message.includes('base model cannot be read') || message.includes('MLX base model must be a readable directory'))
      return failure('model-unreadable', message)
    if (message.includes('mlx-lm is not installed'))
      return failure('mlx-lm-missing', message)
    if (message.includes('cannot be resolved') || message.includes('is not a file') || message.includes('is not executable'))
      return failure('executable-missing', message)
    if (message.includes('probe') || message.includes('protocol'))
      return failure('protocol-failure', message)
    if (message.includes('must be') || message.includes('is required') || message.includes('is too long'))
      return failure('invalid-config', message)
    return failure('protocol-failure', message)
  }
}
