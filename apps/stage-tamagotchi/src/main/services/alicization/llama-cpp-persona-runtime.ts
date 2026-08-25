import type {
  AlicizationPersonaRuntimeConfig,
  AlicizationPersonaRuntimeConnectionResult,
  AlicizationPersonaTrainingArtifact,
} from '@proj-alicization/stage-shared'

import type {
  PersonaTrainingArtifactLoader,
  PersonaTrainingArtifactLoaderReceipt,
} from './persona-training-pipeline-gate'

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname } from 'node:path'
import { kill as killProcess } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

import { findAvailablePersonaRuntimePort } from './persona-runtime-common'

const defaultHost = '127.0.0.1'
const defaultPort = 18_181
const defaultModelAlias = 'alicization-persona'
const defaultStartupTimeoutMs = 120_000
const pollIntervalMs = 100
const defaultProcessTerminationTimeoutMs = 3_000
const defaultProbeRequestTimeoutMs = 15_000
const maxStderrChars = 8_000
const connectionProbeMaxTokens = 1

export interface AlicizationPersonaRuntimeRoute {
  providerId: 'llama.cpp-persona'
  model: string
  baseUrl: string
  headers?: Record<string, string>
}

export interface LlamaCppPersonaRuntimeSnapshot {
  configured: boolean
  config: AlicizationPersonaRuntimeConfig | null
  active: boolean
  artifactId: string | null
  routeBaseUrl: string | null
  error: string | null
}

function normalizeText(value: unknown, label: string, maxLength: number) {
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

function normalizeAbsolutePath(value: unknown, label: string) {
  const normalized = normalizeText(value, label, 4_096)
  if (!normalized.startsWith('/'))
    throw new Error(`${label} must be an absolute path`)
  return normalized
}

export function normalizeAlicizationPersonaRuntimeConfig(
  raw: unknown,
): AlicizationPersonaRuntimeConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('persona runtime is not configured')
  const input = raw as Partial<AlicizationPersonaRuntimeConfig>
  const host = normalizeText(input.host ?? defaultHost, 'persona runtime host', 255)
  if (!['127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('persona runtime host must be local')

  const port = Number(input.port ?? defaultPort)
  if (!Number.isSafeInteger(port) || port < 1_024 || port > 65_535)
    throw new Error('persona runtime port must be between 1024 and 65535')

  const startupTimeoutMs = Number(input.startupTimeoutMs ?? defaultStartupTimeoutMs)
  if (
    !Number.isSafeInteger(startupTimeoutMs)
    || startupTimeoutMs < 1_000
    || startupTimeoutMs > 10 * 60 * 1_000
  ) {
    throw new Error('persona runtime startup timeout must be between 1s and 10m')
  }

  return {
    executable: normalizeAbsolutePath(input.executable, 'persona runtime executable'),
    modelPath: normalizeAbsolutePath(input.modelPath, 'persona runtime model path'),
    host,
    port,
    modelAlias: normalizeText(input.modelAlias ?? defaultModelAlias, 'persona runtime model alias', 120),
    startupTimeoutMs,
  }
}

function routeForConfig(config: AlicizationPersonaRuntimeConfig): AlicizationPersonaRuntimeRoute {
  return {
    providerId: 'llama.cpp-persona',
    model: config.modelAlias,
    baseUrl: `http://${config.host}:${config.port}/v1/`,
  }
}

function baseModelMatches(
  artifact: AlicizationPersonaTrainingArtifact,
  config: AlicizationPersonaRuntimeConfig,
) {
  return artifact.baseModel === config.modelPath
    || basename(artifact.baseModel) === basename(config.modelPath)
}

async function assertLlamaArtifactCompatible(
  artifact: AlicizationPersonaTrainingArtifact,
  config: AlicizationPersonaRuntimeConfig,
) {
  if (extname(artifact.path).toLowerCase() !== '.gguf') {
    throw new Error(
      `llama.cpp Persona adapter requires a GGUF adapter artifact; received "${basename(artifact.path)}"`,
    )
  }
  if (!baseModelMatches(artifact, config)) {
    throw new Error(
      `Persona adapter base model "${artifact.baseModel}" does not match llama.cpp model "${config.modelPath}"`,
    )
  }
  const artifactStat = await stat(artifact.path)
  if (!artifactStat.isFile())
    throw new Error('Persona adapter artifact is not a regular file')
}

function signalProcess(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
) {
  if (child.pid) {
    try {
      killProcess(-child.pid, signal)
      return
    }
    catch {
      // Fall back to the child process when a process group is unavailable.
    }
  }
  child.kill(signal)
}

async function waitForExit(
  child: ReturnType<typeof spawn>,
  timeoutMs: number,
) {
  if (child.exitCode !== null || child.signalCode !== null)
    return
  await new Promise<void>((resolve) => {
    let settled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      if (settled)
        return
      settled = true
      if (timeout)
        clearTimeout(timeout)
      resolve()
    }
    timeout = setTimeout(finish, timeoutMs)
    child.once('exit', finish)
  })
}

async function probeLlamaServer(
  route: AlicizationPersonaRuntimeRoute,
  signal: AbortSignal,
  timeoutMs: number,
): Promise<string | null> {
  const response = await fetchWithTimeout(
    new URL('../health', route.baseUrl),
    { signal },
    signal,
    timeoutMs,
    'llama-server health',
  )
  if (!response.ok)
    throw new Error(`llama-server health returned HTTP ${response.status}`)
  return null
}

interface LlamaAdapterInfo {
  id: number
  path: string
}

interface LlamaCppPersonaRuntimeProcessState {
  version: 1
  pid: number
  executable: string
  modelPath: string
  host: string
  port: number
  modelAlias: string
  artifactId: string
  artifactPath: string
  instanceId: string
  startedAt: string
  updatedAt: number
}

function isLlamaCppPersonaRuntimeProcessState(
  value: unknown,
): value is LlamaCppPersonaRuntimeProcessState {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return false
  const state = value as Partial<LlamaCppPersonaRuntimeProcessState>
  return state.version === 1
    && Number.isSafeInteger(state.pid)
    && (state.pid ?? 0) > 0
    && typeof state.executable === 'string'
    && typeof state.modelPath === 'string'
    && typeof state.host === 'string'
    && Number.isSafeInteger(state.port)
    && typeof state.modelAlias === 'string'
    && typeof state.artifactId === 'string'
    && typeof state.artifactPath === 'string'
    && typeof state.instanceId === 'string'
    && state.instanceId.length > 0
    && typeof state.startedAt === 'string'
    && state.startedAt.length > 0
    && Number.isFinite(state.updatedAt)
}

async function readProcessIdentity(pid: number) {
  const processInspector = spawn('ps', [
    'e',
    '-p',
    String(pid),
    '-o',
    'lstart=',
    '-o',
    'command=',
  ], {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  let output = ''
  processInspector.stdout?.on('data', (chunk) => {
    output += String(chunk)
  })
  return await new Promise<{ startedAt: string, command: string } | null>((resolve, reject) => {
    processInspector.once('error', reject)
    processInspector.once('close', (code) => {
      if (code !== 0)
        return resolve(null)
      const normalized = output.trim()
      if (!normalized)
        return resolve(null)
      const match = normalized.match(/^(.{24})\s+(.+)$/)
      if (!match)
        return resolve(null)
      resolve({
        startedAt: match[1]!.trim(),
        command: match[2]!.trim(),
      })
    })
  })
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function commandContainsToken(command: string, value: string) {
  return new RegExp(`(?:^|\\s)${escapeRegExp(value)}(?=\\s|$)`).test(command)
}

function commandContainsOption(command: string, option: string, value: string) {
  return new RegExp(
    `(?:^|\\s)${escapeRegExp(option)}(?:\\s+|=)${escapeRegExp(value)}(?=\\s|$)`,
  ).test(command)
}

function commandContainsEnvironment(command: string, name: string, value: string) {
  return commandContainsToken(command, `${name}=${value}`)
}

function processCommandMatchesState(
  command: string,
  state: LlamaCppPersonaRuntimeProcessState,
) {
  return commandContainsToken(command, state.executable)
    && commandContainsOption(command, '--model', state.modelPath)
    && commandContainsOption(command, '--host', state.host)
    && commandContainsOption(command, '--port', String(state.port))
    && commandContainsOption(command, '--alias', state.modelAlias)
    && commandContainsOption(command, '--lora', state.artifactPath)
    && commandContainsEnvironment(
      command,
      'ALICIZATION_PERSONA_RUNTIME_INSTANCE_ID',
      state.instanceId,
    )
}

function signalProcessByPid(pid: number, signal: NodeJS.Signals) {
  try {
    killProcess(-pid, signal)
    return
  }
  catch {
    // Fall back to the process itself when the detached process group is unavailable.
  }
  killProcess(pid, signal)
}

async function isProcessAlive(pid: number) {
  try {
    killProcess(pid, 0)
    return true
  }
  catch {
    return false
  }
}

async function waitForPidExit(pid: number, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (!await isProcessAlive(pid))
      return true
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
  }
  return !await isProcessAlive(pid)
}

function boundedTimeoutMs(value: number | undefined, label: string, defaultValue: number) {
  if (value === undefined)
    return defaultValue
  if (!Number.isSafeInteger(value) || value < 50 || value > 10 * 60 * 1_000)
    throw new Error(`${label} must be between 50ms and 10m`)
  return value
}

async function fetchWithTimeout(
  input: URL,
  init: RequestInit,
  signal: AbortSignal,
  timeoutMs: number,
  label: string,
) {
  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal.reason)
  if (signal.aborted)
    abortFromCaller()
  else
    signal.addEventListener('abort', abortFromCaller, { once: true })

  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort(new Error(`${label} request timed out after ${timeoutMs}ms`))
  }, timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  }
  catch (error) {
    if (timedOut)
      throw new Error(`${label} request timed out after ${timeoutMs}ms`)
    throw error
  }
  finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abortFromCaller)
  }
}

async function readResponseTextWithTimeout(
  response: Response,
  signal: AbortSignal,
  timeoutMs: number,
  label: string,
) {
  const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`)
  let timeout: ReturnType<typeof setTimeout> | undefined
  let abortListener: (() => void) | undefined
  const cancelBody = () => {
    void response.body?.cancel().catch(() => {})
  }
  try {
    const bodyPromise = response.text()
    void bodyPromise.catch(() => {})
    return await Promise.race([
      bodyPromise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          cancelBody()
          reject(timeoutError)
        }, timeoutMs)
      }),
      new Promise<never>((_resolve, reject) => {
        abortListener = () => {
          cancelBody()
          reject(signal.reason ?? new Error(`${label} was aborted`))
        }
        if (signal.aborted)
          abortListener()
        else
          signal.addEventListener('abort', abortListener, { once: true })
      }),
    ])
  }
  finally {
    if (timeout)
      clearTimeout(timeout)
    if (abortListener)
      signal.removeEventListener('abort', abortListener)
  }
}

async function listLlamaAdapters(
  route: AlicizationPersonaRuntimeRoute,
  signal: AbortSignal,
  timeoutMs: number,
) {
  const response = await fetchWithTimeout(
    new URL('../lora-adapters', route.baseUrl),
    { signal },
    signal,
    timeoutMs,
    'llama-server adapter list',
  )
  if (!response.ok) {
    const body = await readResponseTextWithTimeout(
      response,
      signal,
      timeoutMs,
      'llama-server adapter list request',
    )
    throw new Error(
      `llama-server adapter list returned HTTP ${response.status}: ${body.slice(0, 2_000)}`,
    )
  }
  const body = await readResponseTextWithTimeout(
    response,
    signal,
    timeoutMs,
    'llama-server adapter list request',
  )
  let payload: unknown
  try {
    payload = JSON.parse(body)
  }
  catch {
    throw new Error('llama-server adapter list returned invalid JSON')
  }
  const adapters = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { adapters?: unknown }).adapters)
      ? (payload as { adapters: unknown[] }).adapters
      : null
  if (!adapters)
    throw new Error('llama-server adapter list returned an invalid payload')
  return adapters.flatMap((adapter): LlamaAdapterInfo[] => {
    if (!adapter || typeof adapter !== 'object')
      return []
    const id = Number((adapter as { id?: unknown }).id)
    const path = (adapter as { path?: unknown }).path
    return Number.isSafeInteger(id) && typeof path === 'string' && path.trim()
      ? [{ id, path: path.trim() }]
      : []
  })
}

async function applyLlamaAdapter(
  route: AlicizationPersonaRuntimeRoute,
  artifact: AlicizationPersonaTrainingArtifact,
  signal: AbortSignal,
  timeoutMs: number,
) {
  const adapters = await listLlamaAdapters(route, signal, timeoutMs)
  const adapterPath = adapters.find(adapter =>
    adapter.path === artifact.path || basename(adapter.path) === basename(artifact.path),
  )
  if (!adapterPath) {
    throw new Error(
      `llama-server did not expose Persona adapter "${basename(artifact.path)}"`,
    )
  }
  const response = await fetchWithTimeout(
    new URL('../lora-adapters', route.baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ id: adapterPath.id, scale: 1 }]),
    },
    signal,
    timeoutMs,
    'llama-server adapter activation',
  )
  if (!response.ok) {
    const body = await readResponseTextWithTimeout(
      response,
      signal,
      timeoutMs,
      'llama-server adapter activation request',
    )
    throw new Error(
      `llama-server rejected Persona adapter with HTTP ${response.status}: ${body.slice(0, 2_000)}`,
    )
  }
}

async function probeLlamaChatCompletion(
  route: AlicizationPersonaRuntimeRoute,
  model: string,
  signal: AbortSignal,
  timeoutMs: number,
) {
  const response = await fetchWithTimeout(
    new URL('chat/completions', route.baseUrl),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: connectionProbeMaxTokens,
        stream: false,
        temperature: 0,
      }),
    },
    signal,
    timeoutMs,
    'llama-server chat probe',
  )
  const body = await readResponseTextWithTimeout(
    response,
    signal,
    timeoutMs,
    'llama-server chat probe request',
  )
  if (!response.ok) {
    throw new Error(
      `llama-server chat probe returned HTTP ${response.status}: ${body.slice(0, 2_000)}`,
    )
  }
  let payload: unknown
  try {
    payload = JSON.parse(body)
  }
  catch {
    throw new Error('llama-server chat probe returned invalid JSON')
  }
  const content = payload
    && typeof payload === 'object'
    && Array.isArray((payload as { choices?: unknown }).choices)
    ? (payload as {
        choices: Array<{
          message?: {
            content?: unknown
          }
        }>
      }).choices[0]?.message?.content
    : null
  if (typeof content !== 'string' || !content.trim())
    throw new Error('llama-server chat probe returned no assistant content')
}

export function createLlamaCppPersonaRuntime(input?: {
  getConfig?: () => AlicizationPersonaRuntimeConfig | null
  now?: () => number
  probeRequestTimeoutMs?: number
  processTerminationTimeoutMs?: number
  processStatePath?: string
}) {
  let config = input?.getConfig?.() ?? null
  let child: ReturnType<typeof spawn> | null = null
  let activeArtifact: AlicizationPersonaTrainingArtifact | null = null
  let activeReceipt: PersonaTrainingArtifactLoaderReceipt | null = null
  let lastError: string | null = null
  let activeProcessInstanceId: string | null = null
  const receiptsByOperationId = new Map<string, PersonaTrainingArtifactLoaderReceipt>()
  let lifecycleQueue: Promise<unknown> = Promise.resolve()
  let stderr = ''

  const now = input?.now ?? (() => Date.now())
  const probeRequestTimeoutMs = boundedTimeoutMs(
    input?.probeRequestTimeoutMs,
    'llama-server probe request timeout',
    defaultProbeRequestTimeoutMs,
  )
  const processTerminationTimeoutMs = boundedTimeoutMs(
    input?.processTerminationTimeoutMs,
    'llama-server process termination timeout',
    defaultProcessTerminationTimeoutMs,
  )
  const processStatePath = input?.processStatePath
    ? normalizeAbsolutePath(input.processStatePath, 'persona runtime process state path')
    : null

  async function clearProcessStateIfMatches(stateIdentity: Pick<
    LlamaCppPersonaRuntimeProcessState,
    'pid' | 'instanceId'
  >) {
    if (!processStatePath)
      return
    let state: unknown
    try {
      state = JSON.parse(await readFile(processStatePath, 'utf8'))
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return
      throw error
    }
    if (
      !isLlamaCppPersonaRuntimeProcessState(state)
      || state.pid !== stateIdentity.pid
      || state.instanceId !== stateIdentity.instanceId
    ) {
      return
    }
    await unlink(processStatePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw error
    })
  }

  async function persistProcessState(
    spawned: ReturnType<typeof spawn>,
    artifact: AlicizationPersonaTrainingArtifact,
    instanceId: string,
  ) {
    if (!processStatePath)
      return
    if (!config || !spawned.pid)
      throw new Error('llama-server did not expose a process id for recovery state')
    const state: LlamaCppPersonaRuntimeProcessState = {
      version: 1,
      pid: spawned.pid,
      executable: config.executable,
      modelPath: config.modelPath,
      host: config.host,
      port: config.port,
      modelAlias: config.modelAlias,
      artifactId: artifact.artifactId,
      artifactPath: artifact.path,
      instanceId,
      startedAt: (await readProcessIdentity(spawned.pid))?.startedAt
        ?? (() => {
          throw new Error('llama-server process identity was unavailable')
        })(),
      updatedAt: now(),
    }
    const temporaryPath = `${processStatePath}.${spawned.pid}.tmp`
    await mkdir(dirname(processStatePath), { recursive: true })
    try {
      await writeFile(temporaryPath, JSON.stringify(state), {
        encoding: 'utf8',
        mode: 0o600,
      })
      await rename(temporaryPath, processStatePath)
    }
    catch (error) {
      await unlink(temporaryPath).catch(() => {})
      throw error
    }
  }

  async function recoverOrphanedServer() {
    if (!processStatePath)
      return
    let rawState: unknown
    try {
      rawState = JSON.parse(await readFile(processStatePath, 'utf8'))
    }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        return
      throw error
    }
    if (!isLlamaCppPersonaRuntimeProcessState(rawState)) {
      await unlink(processStatePath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw error
      })
      return
    }

    const identity = await readProcessIdentity(rawState.pid)
    if (!identity) {
      await clearProcessStateIfMatches(rawState)
      return
    }
    if (
      identity.startedAt !== rawState.startedAt
      || !processCommandMatchesState(identity.command, rawState)
    ) {
      // The PID may have been reused or the state may belong to another runtime.
      // Preserve the live process and discard only this stale recovery record.
      await clearProcessStateIfMatches(rawState)
      return
    }

    try {
      signalProcessByPid(rawState.pid, 'SIGTERM')
    }
    catch {
      // The process may have exited between inspection and signalling.
    }
    const exited = await waitForPidExit(rawState.pid, processTerminationTimeoutMs)
    if (!exited) {
      try {
        signalProcessByPid(rawState.pid, 'SIGKILL')
      }
      catch {
        // Preserve the eventual startup/port error if the process cannot be signalled.
      }
      await waitForPidExit(rawState.pid, processTerminationTimeoutMs)
    }
    if (!await waitForPidExit(rawState.pid, 0))
      return
    await clearProcessStateIfMatches(rawState)
  }

  function getRoute() {
    return config && activeArtifact && child
      ? routeForConfig(config)
      : null
  }

  function getSnapshot(): LlamaCppPersonaRuntimeSnapshot {
    return {
      configured: config != null,
      config: config ? { ...config } : null,
      active: activeArtifact != null && child != null,
      artifactId: activeArtifact?.artifactId ?? null,
      routeBaseUrl: getRoute()?.baseUrl ?? null,
      error: lastError,
    }
  }

  async function stopServer(reason: string) {
    const current = child
    const currentInstanceId = activeProcessInstanceId
    child = null
    activeProcessInstanceId = null
    activeArtifact = null
    activeReceipt = null
    receiptsByOperationId.clear()
    if (!current)
      return
    signalProcess(current, 'SIGTERM')
    await waitForExit(current, processTerminationTimeoutMs)
    if (current.exitCode === null && current.signalCode === null)
      signalProcess(current, 'SIGKILL')
    await waitForExit(current, processTerminationTimeoutMs)
    const currentExited = current.pid
      ? await waitForPidExit(current.pid, 0)
      : current.exitCode !== null || current.signalCode !== null
    if (currentExited) {
      if (current.pid && currentInstanceId) {
        await clearProcessStateIfMatches({
          pid: current.pid,
          instanceId: currentInstanceId,
        })
      }
    }
    if (reason)
      lastError = null
  }

  async function startServer(
    artifact: AlicizationPersonaTrainingArtifact,
    signal: AbortSignal,
  ) {
    if (!config)
      throw new Error('llama.cpp Persona runtime is not configured')
    await assertLlamaArtifactCompatible(artifact, config)
    await access(config.executable)
    await access(config.modelPath)

    const route = routeForConfig(config)
    await recoverOrphanedServer()
    stderr = ''
    const processInstanceId = randomUUID()
    const args = [
      '--model',
      config.modelPath,
      '--host',
      config.host,
      '--port',
      String(config.port),
      '--alias',
      config.modelAlias,
      '--lora',
      artifact.path,
      '--lora-init-without-apply',
    ]
    const spawned = spawn(config.executable, args, {
      argv0: `${config.executable} --alicization-instance=${processInstanceId}`,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ALICIZATION_PERSONA_RUNTIME_INSTANCE_ID: processInstanceId,
      },
    })
    child = spawned
    activeProcessInstanceId = processInstanceId
    let spawnError: unknown = null
    spawned.once('error', (error) => {
      spawnError = error
    })
    spawned.once('exit', (code, signalCode) => {
      if (child !== spawned)
        return
      child = null
      activeProcessInstanceId = null
      activeArtifact = null
      activeReceipt = null
      receiptsByOperationId.clear()
      const exitReason = signalCode
        ? `signal ${signalCode}`
        : `code ${code ?? 'unknown'}`
      lastError = `llama-server exited unexpectedly with ${exitReason}${stderr ? `: ${stderr}` : ''}`
      if (spawned.pid) {
        void clearProcessStateIfMatches({
          pid: spawned.pid,
          instanceId: processInstanceId,
        })
      }
    })
    spawned.stderr?.on('data', (chunk) => {
      stderr = `${stderr}${String(chunk)}`.slice(-maxStderrChars)
    })

    const deadline = now() + config.startupTimeoutMs
    let lastHealthError: string | null = null
    try {
      await persistProcessState(spawned, artifact, processInstanceId)
      while (now() < deadline) {
        if (signal.aborted)
          throw signal.reason ?? new Error('Persona runtime load was cancelled')
        if (spawnError)
          throw new Error(`llama-server failed to start: ${errorMessageFrom(spawnError) ?? String(spawnError)}`)
        if (spawned.exitCode !== null || spawned.signalCode !== null) {
          throw new Error(
            `llama-server exited before becoming healthy${stderr ? `: ${stderr}` : ''}`,
          )
        }
        try {
          await probeLlamaServer(
            route,
            signal,
            Math.min(probeRequestTimeoutMs, Math.max(50, deadline - now())),
          )
        }
        catch (error) {
          const nextHealthError = errorMessageFrom(error) ?? String(error)
          if (!lastHealthError || nextHealthError.includes('timed out'))
            lastHealthError = nextHealthError
          await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
          continue
        }
        await applyLlamaAdapter(
          route,
          artifact,
          signal,
          Math.min(probeRequestTimeoutMs, Math.max(50, deadline - now())),
        )
        activeArtifact = artifact
        lastError = null
        return processInstanceId
      }
      throw new Error(
        `llama-server did not become healthy within ${config.startupTimeoutMs}ms${lastHealthError ? `: ${lastHealthError}` : ''}`,
      )
    }
    catch (error) {
      await stopServer('load-failed')
      lastError = errorMessageFrom(error) ?? String(error)
      throw error
    }
  }

  function enqueueLifecycle<T>(operation: () => Promise<T>) {
    const next = lifecycleQueue.then(operation, operation)
    lifecycleQueue = next.then(() => undefined, () => undefined)
    return next
  }

  const loader: PersonaTrainingArtifactLoader = {
    load: async ({ artifact, operationId, signal }) => enqueueLifecycle(async () => {
      const existingReceipt = receiptsByOperationId.get(operationId)
      if (existingReceipt)
        return existingReceipt

      if (!config)
        throw new Error('llama.cpp Persona runtime is not configured')
      if (activeArtifact?.artifactId === artifact.artifactId && child && activeReceipt) {
        receiptsByOperationId.set(operationId, activeReceipt)
        return activeReceipt
      }

      await stopServer('switch-adapter')
      const processInstanceId = await startServer(artifact, signal)

      const receipt: PersonaTrainingArtifactLoaderReceipt = {
        loaderId: 'llama.cpp',
        receiptId: `llama.cpp:${artifact.artifactId}:${artifact.sha256.slice(0, 16)}:${config.port}:${processInstanceId}`,
        activatedAt: now(),
        reason: `llama-server active at ${routeForConfig(config).baseUrl}`,
      }
      activeReceipt = receipt
      receiptsByOperationId.set(operationId, receipt)
      return receipt
    }),
    unload: async ({ artifact, operationId, receipt }) => enqueueLifecycle(async () => {
      if (receiptsByOperationId.has(operationId))
        return
      const requestedReceiptId = receipt?.receiptId?.trim() ?? ''
      if (
        activeArtifact
        && activeArtifact.artifactId === artifact.artifactId
        && (
          !requestedReceiptId
          || activeReceipt?.receiptId === requestedReceiptId
        )
      ) {
        await stopServer('unload')
      }
      receiptsByOperationId.set(operationId, {
        loaderId: 'llama.cpp',
        receiptId: `llama.cpp:unloaded:${artifact.artifactId}`,
        activatedAt: now(),
        reason: 'llama-server Persona adapter unloaded',
      })
    }),
  }

  return {
    loader,
    getRoute,
    getSnapshot,
    setConfig: async (nextConfig: AlicizationPersonaRuntimeConfig | null) => enqueueLifecycle(async () => {
      const normalizedNextConfig = nextConfig
        ? normalizeAlicizationPersonaRuntimeConfig(nextConfig)
        : null
      if (
        config
        && normalizedNextConfig
        && JSON.stringify(config) === JSON.stringify(normalizedNextConfig)
      ) {
        return getSnapshot()
      }
      const previousArtifact = activeArtifact
      await stopServer('config-changed')
      config = normalizedNextConfig
      lastError = null
      receiptsByOperationId.clear()
      if (previousArtifact && config) {
        try {
          const processInstanceId = await startServer(previousArtifact, new AbortController().signal)
          activeReceipt = {
            loaderId: 'llama.cpp',
            receiptId: `llama.cpp:config-reload:${previousArtifact.artifactId}:${previousArtifact.sha256.slice(0, 16)}:${config.port}:${processInstanceId}`,
            activatedAt: now(),
            reason: `llama-server reloaded at ${routeForConfig(config).baseUrl} after configuration change`,
          }
        }
        catch {
          // startServer records the concrete failure in lastError; the route stays unavailable.
        }
      }
      return getSnapshot()
    }),
    dispose: async () => enqueueLifecycle(async () => {
      await stopServer('dispose')
    }),
    testConnection: async (
      rawConfig: AlicizationPersonaRuntimeConfig | null,
    ): Promise<AlicizationPersonaRuntimeConnectionResult> => enqueueLifecycle(async () => {
      if (!rawConfig) {
        return {
          ok: false,
          executable: '',
          baseUrl: null,
          error: 'llama.cpp Persona runtime is not configured',
        }
      }
      let normalized: AlicizationPersonaRuntimeConfig
      let probe: ReturnType<typeof spawn> | null = null
      let probeStderr = ''
      try {
        normalized = normalizeAlicizationPersonaRuntimeConfig(rawConfig)
        const activeRoute = getRoute()
        const activeConfig = config
          ? normalizeAlicizationPersonaRuntimeConfig(config)
          : null
        const reusesActiveRuntime = Boolean(
          activeRoute
          && activeConfig
          && JSON.stringify(activeConfig) === JSON.stringify(normalized),
        )
        const probeConfig = reusesActiveRuntime
          ? normalized
          : {
              ...normalized,
              port: await findAvailablePersonaRuntimePort(normalized.host),
            }
        const deadline = Date.now() + probeConfig.startupTimeoutMs
        if (reusesActiveRuntime) {
          if (!activeRoute)
            throw new Error('llama-server active route was unavailable')
          const activeProbeController = new AbortController()
          const activeProbeTimeoutMs = Math.min(
            probeRequestTimeoutMs,
            Math.max(50, deadline - Date.now()),
          )
          await probeLlamaServer(
            activeRoute,
            activeProbeController.signal,
            activeProbeTimeoutMs,
          )
          await probeLlamaChatCompletion(
            activeRoute,
            normalized.modelAlias,
            activeProbeController.signal,
            Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now())),
          )
          return {
            ok: true,
            executable: normalized.executable,
            baseUrl: activeRoute.baseUrl,
            error: null,
          }
        }

        await access(probeConfig.executable)
        await access(probeConfig.modelPath)
        const route = routeForConfig(probeConfig)
        const probeController = new AbortController()
        let probeError: unknown = null
        probe = spawn(probeConfig.executable, [
          '--model',
          probeConfig.modelPath,
          '--host',
          probeConfig.host,
          '--port',
          String(probeConfig.port),
          '--alias',
          probeConfig.modelAlias,
        ], {
          argv0: `${probeConfig.executable} --alicization-instance=${randomUUID()}`,
          detached: true,
          stdio: ['ignore', 'ignore', 'pipe'],
        })
        probe.once('error', (error) => {
          probeError = error
        })
        probe.stderr?.on('data', (chunk) => {
          probeStderr = `${probeStderr}${String(chunk)}`.slice(-maxStderrChars)
        })

        let healthy = false
        let lastHealthError: string | null = null
        while (Date.now() < deadline) {
          if (probeError) {
            throw new Error(
              `llama-server failed to start: ${errorMessageFrom(probeError) ?? String(probeError)}`,
            )
          }
          if (probe.exitCode !== null || probe.signalCode !== null) {
            throw new Error(
              `llama-server exited before becoming healthy${probeStderr ? `: ${probeStderr}` : ''}`,
            )
          }
          try {
            await probeLlamaServer(
              route,
              probeController.signal,
              Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now())),
            )
            healthy = true
            break
          }
          catch (error) {
            const nextHealthError = errorMessageFrom(error) ?? String(error)
            if (!lastHealthError || nextHealthError.includes('timed out'))
              lastHealthError = nextHealthError
            await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
          }
        }
        if (!healthy) {
          throw new Error(
            `llama-server did not become healthy within ${probeConfig.startupTimeoutMs}ms${lastHealthError ? `: ${lastHealthError}` : ''}`,
          )
        }
        await probeLlamaChatCompletion(
          route,
          probeConfig.modelAlias,
          probeController.signal,
          Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now())),
        )
        return {
          ok: true,
          executable: probeConfig.executable,
          baseUrl: route.baseUrl,
          error: null,
        }
      }
      catch (error) {
        return {
          ok: false,
          executable: rawConfig.executable ?? '',
          baseUrl: null,
          error: errorMessageFrom(error) ?? String(error),
        }
      }
      finally {
        if (probe) {
          if (probe.exitCode === null && probe.signalCode === null)
            signalProcess(probe, 'SIGTERM')
          await waitForExit(probe, processTerminationTimeoutMs)
          if (probe.exitCode === null && probe.signalCode === null)
            signalProcess(probe, 'SIGKILL')
          await waitForExit(probe, processTerminationTimeoutMs)
        }
      }
    }),
  }
}
