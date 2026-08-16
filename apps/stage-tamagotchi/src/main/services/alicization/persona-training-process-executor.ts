import type {
  PersonaTrainingExecutorInput,
  PersonaTrainingExecutorOutput,
} from './persona-training-pipeline-gate'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, createReadStream } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { env as processEnv } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

const artifactSchemaVersion = 'alicization-persona-training-artifact-v1'
const defaultTerminationGraceMs = 3_000
const maxProtocolBytes = 256 * 1024
const maxProtocolLineBytes = 64 * 1024
const maxStderrBytes = 64 * 1024
const reservedProtocolArguments = new Set([
  '--probe',
  '--manifest',
  '--dataset',
  '--output-dir',
  '--artifact-manifest',
  '--base-model',
])

export interface PersonaTrainingProcessConfig {
  executable: string
  fixedArguments: string[]
  baseModel: string
  timeoutMs: number
}

export interface PersonaTrainingProcessProgress {
  runId: string
  progress: number
  message: string | null
}

export interface PersonaTrainingArtifact {
  schemaVersion: typeof artifactSchemaVersion
  artifactId: string
  runId: string
  kind: 'lora-adapter'
  path: string
  sha256: string
  sizeBytes: number
  baseModel: string
  compatibility: {
    status: 'compatible'
    baseModel: string
  }
  activation: {
    status: 'unsupported'
    reason: string
  }
}

export interface PersonaTrainingProcessConnectionResult {
  ok: boolean
  executable: string
  error: string | null
}

interface ArtifactManifest {
  schemaVersion: typeof artifactSchemaVersion
  artifactId: string
  runId: string
  kind: 'lora-adapter'
  path: string
  sha256: string
  baseModel: string
}

interface ProtocolState {
  ready: boolean
  artifact: boolean
}

interface RunChildProcessOptions {
  executable: string
  argv: string[]
  timeoutMs: number
  terminationGraceMs: number
  signal?: AbortSignal
  onEvent?: (event: Record<string, unknown>) => void
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
  const value = input as Partial<PersonaTrainingProcessConfig>
  const executable = normalizeNonEmptyText(value.executable, 'persona training executable', 4_096)
  if (!isAbsolute(executable))
    throw new Error('persona training executable must be an absolute path')
  const baseModel = normalizeNonEmptyText(value.baseModel, 'persona training base model', 1_024)
  const fixedArguments = Array.isArray(value.fixedArguments)
    ? value.fixedArguments.map((argument, index) => normalizeNonEmptyText(argument, `persona training fixed argument ${index + 1}`, 4_096))
    : []
  if (fixedArguments.length > 64)
    throw new Error('persona training fixed arguments exceed the supported limit')
  const reservedArgument = fixedArguments.find(argument => reservedProtocolArguments.has(argument))
  if (reservedArgument)
    throw new Error(`persona training fixed arguments must not contain reserved protocol argument: ${reservedArgument}`)
  const timeoutMs = Number(value.timeoutMs)
  if (!Number.isFinite(timeoutMs) || timeoutMs < 10 || timeoutMs > 24 * 60 * 60 * 1_000)
    throw new Error('persona training timeout must be between 10ms and 24h')
  return {
    executable,
    fixedArguments,
    baseModel,
    timeoutMs: Math.floor(timeoutMs),
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

  const terminate = (error: Error) => {
    if (!terminalError)
      terminalError = error
    if (child.exitCode != null || child.signalCode != null)
      return
    child.kill('SIGTERM')
    if (!terminationTimer) {
      terminationTimer = setTimeout(() => {
        if (child.exitCode == null && child.signalCode == null)
          child.kill('SIGKILL')
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
    options.onEvent?.(record)
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
    })
  })
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
  return {
    schemaVersion: value.schemaVersion,
    artifactId: normalizeNonEmptyText(value.artifactId, 'persona training artifact id', 160),
    runId: normalizeNonEmptyText(value.runId, 'persona training artifact run id', 160),
    kind: value.kind,
    path: normalizeNonEmptyText(value.path, 'persona training artifact path', 4_096),
    sha256: normalizeNonEmptyText(value.sha256, 'persona training artifact hash', 128).toLowerCase(),
    baseModel: normalizeNonEmptyText(value.baseModel, 'persona training artifact base model', 1_024),
  }
}

function assertSafeArtifactId(artifactId: string) {
  if (!/^(?!_)\w[\w.-]{0,159}$/.test(artifactId) || artifactId === '.' || artifactId === '..')
    throw new Error('persona training artifact id is not filesystem-safe')
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

async function createRunDirectories(cardRootDir: string, runId: string) {
  assertSafeArtifactId(runId)
  await mkdir(cardRootDir, { recursive: true, mode: 0o700 })
  const cardRootLstat = await lstat(cardRootDir)
  if (cardRootLstat.isSymbolicLink() || !cardRootLstat.isDirectory())
    throw new Error('persona training card root must be a real directory, not a symbolic link')
  const cardRootRealPath = await realpath(cardRootDir)
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
  const runDir = join(runsRoot, runId)
  await mkdir(runDir, { mode: 0o700 }).catch((error) => {
    throw new Error(`persona training run directory cannot be created: ${errorMessageFrom(error) ?? String(error)}`)
  })
  const runDirLstat = await lstat(runDir)
  if (runDirLstat.isSymbolicLink() || !runDirLstat.isDirectory())
    throw new Error('persona training run directory must be a real directory')
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
  const candidateStat = await stat(candidateRealPath)
  if (!candidateStat.isFile())
    throw new Error('persona training artifact is not a file')
  const actualHash = await hashFile(candidateRealPath)
  if (actualHash !== manifest.sha256)
    throw new Error('persona training artifact hash mismatch')

  const artifactRootLstat = await lstat(input.artifactRoot)
  const artifactRootRealPath = await realpath(input.artifactRoot)
  if (artifactRootLstat.isSymbolicLink() || artifactRootRealPath !== input.artifactRoot)
    throw new Error('persona training artifact root must not be a symbolic link')
  const acceptedDir = join(artifactRootRealPath, manifest.artifactId)
  await stat(acceptedDir).then(
    () => {
      throw new Error('persona training artifact id already exists')
    },
    () => {},
  )
  const relativeArtifactPath = relative(outputRoot, candidateRealPath)
  await rename(outputRoot, acceptedDir)
  const acceptedPath = join(acceptedDir, relativeArtifactPath)

  return {
    acceptedDir,
    artifact: {
      schemaVersion: artifactSchemaVersion,
      artifactId: manifest.artifactId,
      runId: input.runId,
      kind: 'lora-adapter',
      path: acceptedPath,
      sha256: actualHash,
      sizeBytes: candidateStat.size,
      baseModel: manifest.baseModel,
      compatibility: {
        status: 'compatible',
        baseModel: manifest.baseModel,
      },
      activation: {
        status: 'unsupported',
        reason: 'No PersonaAdapterLoader receipt is available; the artifact is stored but inactive.',
      },
    } satisfies PersonaTrainingArtifact,
  }
}

export function createPersonaTrainingProcessExecutor(options: {
  cardRootDir: string
  terminationGraceMs?: number
  onProgress?: (progress: PersonaTrainingProcessProgress) => void | Promise<void>
}) {
  const activeProcesses = new Set<string>()
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
    } = await createRunDirectories(options.cardRootDir, input.runId)
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
    await writeFile(
      datasetPath,
      `${input.manifest.examples.map(example => JSON.stringify(example)).join('\n')}\n`,
      {
        encoding: 'utf8',
        flag: 'wx',
        mode: 0o600,
      },
    )

    const argv = [
      ...config.fixedArguments,
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
    ]
    await input.onProgress?.({
      stage: 'spawning',
      progress: 0.05,
      message: null,
    })
    activeProcesses.add(input.runId)
    try {
      let progressQueue = Promise.resolve()
      const protocol = await runChildProcess({
        executable,
        argv,
        timeoutMs: config.timeoutMs,
        terminationGraceMs,
        signal: input.signal,
        onEvent: (event) => {
          if (event.type === 'ready') {
            progressQueue = progressQueue.then(async () => {
              await input.onProgress?.({
                stage: 'training',
                progress: 0.1,
                message: null,
              })
            })
            return
          }
          if (event.type !== 'progress')
            return
          const progress = Number(event.progress)
          const message = typeof event.message === 'string'
            ? event.message.trim().slice(0, 1_000) || null
            : null
          void options.onProgress?.({
            runId: input.runId,
            progress,
            message,
          })
          progressQueue = progressQueue.then(async () => {
            await input.onProgress?.({
              stage: 'training',
              progress: 0.1 + progress * 0.8,
              message,
            })
          })
        },
      })
      await progressQueue
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
      try {
        await input.assertCurrent()
      }
      catch (error) {
        await rm(accepted.acceptedDir, { recursive: true, force: true }).catch(() => {})
        throw error
      }
      await input.onProgress?.({
        stage: 'finalizing',
        progress: 0.98,
        message: null,
      })
      return {
        artifact: accepted.artifact,
      }
    }
    finally {
      activeProcesses.delete(input.runId)
    }
  }

  return {
    execute,
    activeProcessCount: () => activeProcesses.size,
  }
}

export async function testPersonaTrainingProcessConnection(
  rawConfig: PersonaTrainingProcessConfig,
): Promise<PersonaTrainingProcessConnectionResult> {
  let executable = ''
  try {
    const config = normalizePersonaTrainingProcessConfig(rawConfig)
    executable = await resolveExecutable(config.executable)
    const protocol = await runChildProcess({
      executable,
      argv: [...config.fixedArguments, '--probe'],
      timeoutMs: Math.min(config.timeoutMs, 30_000),
      terminationGraceMs: defaultTerminationGraceMs,
    })
    if (!protocol.ready)
      throw new Error('persona training probe exited before the ready protocol event')
    return {
      ok: true,
      executable,
      error: null,
    }
  }
  catch (error) {
    return {
      ok: false,
      executable,
      error: errorMessageFrom(error) ?? String(error),
    }
  }
}
