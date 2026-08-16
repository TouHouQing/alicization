import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

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
  mkdtemp,
  open,
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

export const personaTrainingInputLimits = {
  maxExamples: 1_024,
  maxLineBytes: 64 * 1_024,
  maxTotalBytes: 8 * 1_024 * 1_024,
} as const

export interface PersonaTrainingProcessConfig {
  executable: string
  baseModel: string
  timeoutMs: number
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

interface FileIdentity {
  dev: number | bigint
  ino: number | bigint
}

interface RunChildProcessOptions {
  executable: string
  argv: string[]
  timeoutMs: number
  terminationGraceMs: number
  signal?: AbortSignal
  onEvent?: (event: Record<string, unknown>) => void | Promise<void>
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
  return {
    executable,
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
  let eventQueue = Promise.resolve()

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
    await file.close().catch(() => {})
    await rm(datasetPath, { force: true }).catch(() => {})
    throw error
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

function fileIdentity(stat: Awaited<ReturnType<typeof lstat>>): FileIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
  }
}

function sameFileIdentity(left: FileIdentity, right: FileIdentity) {
  return left.dev === right.dev && left.ino === right.ino
}

async function removeOwnedDirectory(path: string, identity: FileIdentity | null) {
  if (!identity)
    return
  const current = await lstat(path).catch(() => null)
  if (current && sameFileIdentity(fileIdentity(current), identity))
    await rm(path, { recursive: true, force: true }).catch(() => {})
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

async function createRunDirectories(cardsRootDir: string, cardRootDir: string, runId: string) {
  assertSafeArtifactId(runId)
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
    await removeOwnedDirectory(stagingDir, stagingIdentity)

    return {
      acceptedDir,
      artifact: {
        schemaVersion: artifactSchemaVersion,
        artifactId: manifest.artifactId,
        runId: input.runId,
        kind: 'lora-adapter',
        path: published.artifactPath,
        sha256: actualHash,
        sizeBytes: published.sizeBytes,
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
  catch (error) {
    await removeOwnedDirectory(acceptedDir, acceptedIdentity)
    await removeOwnedDirectory(stagingDir, stagingIdentity)
    throw error
  }
}

export function createPersonaTrainingProcessExecutor(options: {
  cardsRootDir?: string
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
    } = await createRunDirectories(
      options.cardsRootDir ?? resolve(options.cardRootDir, '..'),
      options.cardRootDir,
      input.runId,
    )
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
      argv: ['--probe'],
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
