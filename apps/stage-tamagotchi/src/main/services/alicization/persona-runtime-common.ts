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
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { basename, dirname } from 'node:path'
import { kill as killProcess } from 'node:process'

import { errorMessageFrom } from '@moeru/std'

export const defaultPersonaRuntimeHost = '127.0.0.1'
export const defaultPersonaRuntimePort = 18_181
export const defaultPersonaRuntimeModelAlias = 'alicization-persona'
export const defaultPersonaRuntimeStartupTimeoutMs = 120_000
export const personaRuntimePollIntervalMs = 100
export const defaultPersonaRuntimeTerminationTimeoutMs = 3_000
export const defaultPersonaRuntimeProbeRequestTimeoutMs = 15_000
export const maxPersonaRuntimeStderrChars = 8_000
export const personaRuntimeConnectionProbeMaxTokens = 1

export class PersonaRuntimeTerminalProbeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PersonaRuntimeTerminalProbeError'
  }
}

export interface AlicizationPersonaRuntimeRoute {
  providerId: 'llama.cpp-persona' | 'mlx-persona'
  model: string
  baseUrl: string
  headers?: Record<string, string>
}

export interface PersonaRuntimeSnapshot {
  configured: boolean
  config: AlicizationPersonaRuntimeConfig | null
  active: boolean
  artifactId: string | null
  routeBaseUrl: string | null
  error: string | null
}

export interface PersonaRuntimeBackendDefinition {
  backend: NonNullable<AlicizationPersonaRuntimeConfig['backend']>
  loaderId: string
  providerId: AlicizationPersonaRuntimeRoute['providerId']
  executableLabel: string
  artifactCheck: (artifact: AlicizationPersonaTrainingArtifact, config: AlicizationPersonaRuntimeConfig) => Promise<void>
  connectionCheck?: (config: AlicizationPersonaRuntimeConfig) => Promise<void>
  buildArgs: (config: AlicizationPersonaRuntimeConfig, artifact: AlicizationPersonaTrainingArtifact, instanceId: string) => string[]
  buildConnectionArgs: (config: AlicizationPersonaRuntimeConfig, instanceId: string) => string[]
  processMatchesState: (command: string, state: PersonaRuntimeProcessState) => boolean
  probeHealth: (
    route: AlicizationPersonaRuntimeRoute,
    signal: AbortSignal,
    timeoutMs: number,
    selection?: {
      modelAlias: string
      modelPath: string
    },
  ) => Promise<string | null>
  probeChatCompletion: (route: AlicizationPersonaRuntimeRoute, model: string, signal: AbortSignal, timeoutMs: number) => Promise<void>
}

export interface PersonaRuntimeProcessState {
  version: 1
  pid: number
  backend: NonNullable<AlicizationPersonaRuntimeConfig['backend']>
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

export function normalizePersonaRuntimeConfig(raw: unknown): AlicizationPersonaRuntimeConfig {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('persona runtime is not configured')
  const input = raw as Partial<AlicizationPersonaRuntimeConfig>
  const backend = input.backend == null
    ? 'llama.cpp'
    : input.backend === 'llama.cpp' || input.backend === 'mlx-runtime'
      ? input.backend
      : (() => {
          throw new Error('persona runtime backend is unsupported')
        })()
  const host = normalizePersonaRuntimeText(input.host ?? defaultPersonaRuntimeHost, 'persona runtime host', 255)
  if (!['127.0.0.1', 'localhost', '::1'].includes(host))
    throw new Error('persona runtime host must be local')
  const port = Number(input.port ?? defaultPersonaRuntimePort)
  if (!Number.isSafeInteger(port) || port < 1_024 || port > 65_535)
    throw new Error('persona runtime port must be between 1024 and 65535')
  const startupTimeoutMs = Number(input.startupTimeoutMs ?? defaultPersonaRuntimeStartupTimeoutMs)
  if (!Number.isSafeInteger(startupTimeoutMs) || startupTimeoutMs < 1_000 || startupTimeoutMs > 10 * 60 * 1_000)
    throw new Error('persona runtime startup timeout must be between 1s and 10m')
  return {
    backend,
    executable: normalizePersonaRuntimeAbsolutePath(input.executable, 'persona runtime executable'),
    modelPath: normalizePersonaRuntimeAbsolutePath(input.modelPath, 'persona runtime model path'),
    host,
    port,
    modelAlias: normalizePersonaRuntimeText(input.modelAlias ?? defaultPersonaRuntimeModelAlias, 'persona runtime model alias', 120),
    startupTimeoutMs,
  }
}

export function normalizePersonaRuntimeText(value: unknown, label: string, maxLength: number) {
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

export function normalizePersonaRuntimeAbsolutePath(value: unknown, label: string) {
  const normalized = normalizePersonaRuntimeText(value, label, 4_096)
  if (!normalized.startsWith('/'))
    throw new Error(`${label} must be an absolute path`)
  return normalized
}

export function personaRuntimeRouteForConfig(
  config: AlicizationPersonaRuntimeConfig,
  providerId: AlicizationPersonaRuntimeRoute['providerId'],
  model = config.modelAlias,
): AlicizationPersonaRuntimeRoute {
  return {
    providerId,
    model,
    baseUrl: `http://${config.host}:${config.port}/v1/`,
  }
}

export function personaRuntimeBaseModelMatches(
  artifact: AlicizationPersonaTrainingArtifact,
  config: AlicizationPersonaRuntimeConfig,
) {
  return artifact.baseModel === config.modelPath
    || basename(artifact.baseModel) === basename(config.modelPath)
}

export function signalPersonaRuntimeProcess(child: ReturnType<typeof spawn>, signal: NodeJS.Signals) {
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

export async function waitForPersonaRuntimeProcessExit(
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

export async function waitForPersonaRuntimePidExit(pid: number, timeoutMs: number) {
  const deadline = Date.now() + Math.max(0, timeoutMs)
  while (true) {
    try {
      killProcess(pid, 0)
    }
    catch {
      return true
    }
    if (Date.now() >= deadline)
      return false
    await new Promise(resolve => setTimeout(resolve, Math.min(50, Math.max(1, deadline - Date.now()))))
  }
}

export async function findAvailablePersonaRuntimePort(host: string) {
  const server = createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, host, () => resolve())
  })
  const address = server.address()
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error)
        reject(error)
      else
        resolve()
    })
  })
  if (!address || typeof address === 'string' || !address.port)
    throw new Error('persona runtime could not allocate a temporary port')
  return address.port
}

export async function fetchPersonaRuntimeWithTimeout(
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
    return await fetch(input, { ...init, signal: controller.signal })
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

export async function readPersonaRuntimeResponseText(
  response: Response,
  signal: AbortSignal,
  timeoutMs: number,
  label: string,
) {
  const timeoutError = new Error(`${label} timed out after ${timeoutMs}ms`)
  let timeout: ReturnType<typeof setTimeout> | undefined
  let abortListener: (() => void) | undefined
  const cancelBody = () => void response.body?.cancel().catch(() => {})
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

export async function readPersonaRuntimeProcessIdentity(pid: number) {
  const processInspector = spawn('ps', ['e', '-p', String(pid), '-o', 'lstart=', '-o', 'command='], {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  let output = ''
  processInspector.stdout?.on('data', chunk => output += String(chunk))
  return await new Promise<{ startedAt: string, command: string } | null>((resolve, reject) => {
    processInspector.once('error', reject)
    processInspector.once('close', (code) => {
      if (code !== 0)
        return resolve(null)
      const normalized = output.trim()
      const match = normalized.match(/^(.{24})\s+(.+)$/)
      if (!match)
        return resolve(null)
      resolve({ startedAt: match[1]!.trim(), command: match[2]!.trim() })
    })
  })
}

export function personaRuntimeProcessMatchesState(
  command: string,
  state: PersonaRuntimeProcessState,
  backend: PersonaRuntimeBackendDefinition,
) {
  return command.includes(state.executable)
    && backend.processMatchesState(command, state)
    && command.includes(`ALICIZATION_PERSONA_RUNTIME_INSTANCE_ID=${state.instanceId}`)
}

export function createPersonaRuntimeLifecycle(input: {
  backend: PersonaRuntimeBackendDefinition
  getConfig?: () => AlicizationPersonaRuntimeConfig | null
  now?: () => number
  probeRequestTimeoutMs?: number
  processTerminationTimeoutMs?: number
  processStatePath?: string
}) {
  const backend = input.backend
  let config = input.getConfig?.() ?? null
  let child: ReturnType<typeof spawn> | null = null
  let activeArtifact: AlicizationPersonaTrainingArtifact | null = null
  let activeReceipt: PersonaTrainingArtifactLoaderReceipt | null = null
  let activeModel: string | null = null
  let lastError: string | null = null
  let activeProcessInstanceId: string | null = null
  const receiptsByOperationId = new Map<string, PersonaTrainingArtifactLoaderReceipt>()
  let lifecycleQueue: Promise<unknown> = Promise.resolve()
  const now = input.now ?? (() => Date.now())
  const probeRequestTimeoutMs = input.probeRequestTimeoutMs ?? defaultPersonaRuntimeProbeRequestTimeoutMs
  const processTerminationTimeoutMs = input.processTerminationTimeoutMs ?? defaultPersonaRuntimeTerminationTimeoutMs
  const processStatePath = input.processStatePath
    ? normalizePersonaRuntimeAbsolutePath(input.processStatePath, 'persona runtime process state path')
    : null
  const routeForConfig = (
    runtimeConfig: AlicizationPersonaRuntimeConfig,
    model = activeModel ?? runtimeConfig.modelAlias,
  ) => personaRuntimeRouteForConfig(runtimeConfig, backend.providerId, model)

  async function clearProcessStateIfMatches(identity: Pick<PersonaRuntimeProcessState, 'pid' | 'instanceId'>) {
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
    const typed = state as Partial<PersonaRuntimeProcessState>
    if (typed.version !== 1 || typed.pid !== identity.pid || typed.instanceId !== identity.instanceId)
      return
    await unlink(processStatePath).catch((error) => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        throw error
    })
  }

  async function persistProcessState(spawned: ReturnType<typeof spawn>, artifact: AlicizationPersonaTrainingArtifact, instanceId: string) {
    if (!processStatePath)
      return
    if (!config || !spawned.pid)
      throw new Error(`${backend.executableLabel} did not expose a process id for recovery state`)
    const identity = await readPersonaRuntimeProcessIdentity(spawned.pid)
    if (!identity)
      throw new Error(`${backend.executableLabel} process identity was unavailable`)
    const state: PersonaRuntimeProcessState = {
      version: 1,
      pid: spawned.pid,
      backend: backend.backend,
      executable: config.executable,
      modelPath: config.modelPath,
      host: config.host,
      port: config.port,
      modelAlias: config.modelAlias,
      artifactId: artifact.artifactId,
      artifactPath: artifact.path,
      instanceId,
      startedAt: identity.startedAt,
      updatedAt: now(),
    }
    const temporaryPath = `${processStatePath}.${spawned.pid}.tmp`
    await mkdir(dirname(processStatePath), { recursive: true })
    try {
      await writeFile(temporaryPath, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 })
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
    const state = rawState as Partial<PersonaRuntimeProcessState>
    if (
      state.version !== 1
      || state.backend !== backend.backend
      || !Number.isSafeInteger(state.pid)
      || typeof state.executable !== 'string'
      || typeof state.modelPath !== 'string'
      || typeof state.host !== 'string'
      || !Number.isSafeInteger(state.port)
      || typeof state.modelAlias !== 'string'
      || typeof state.artifactId !== 'string'
      || typeof state.artifactPath !== 'string'
      || typeof state.instanceId !== 'string'
      || typeof state.startedAt !== 'string'
    ) {
      await unlink(processStatePath).catch((error) => {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
          throw error
      })
      return
    }
    const recoveredState = state as PersonaRuntimeProcessState
    const recoveredPid = recoveredState.pid
    const identity = await readPersonaRuntimeProcessIdentity(recoveredPid)
    if (!identity || identity.startedAt !== recoveredState.startedAt || !personaRuntimeProcessMatchesState(identity.command, recoveredState, backend)) {
      await clearProcessStateIfMatches(recoveredState)
      return
    }
    try {
      killProcess(-recoveredPid, 'SIGTERM')
    }
    catch {
      try {
        killProcess(recoveredPid, 'SIGTERM')
      }
      catch {}
    }
    if (!await waitForPersonaRuntimePidExit(recoveredPid, processTerminationTimeoutMs)) {
      try {
        killProcess(recoveredPid, 'SIGKILL')
      }
      catch {}
      await waitForPersonaRuntimePidExit(recoveredPid, processTerminationTimeoutMs)
    }
    if (await waitForPersonaRuntimePidExit(recoveredPid, 0))
      await clearProcessStateIfMatches(recoveredState)
  }

  function getRoute() {
    return config && activeArtifact && child ? routeForConfig(config) : null
  }

  function getSnapshot(): PersonaRuntimeSnapshot {
    return {
      configured: config != null,
      config: config ? { ...config } : null,
      active: activeArtifact != null && child != null,
      artifactId: activeArtifact?.artifactId ?? null,
      routeBaseUrl: getRoute()?.baseUrl ?? null,
      error: lastError,
    }
  }

  async function stopServer() {
    const current = child
    const currentInstanceId = activeProcessInstanceId
    child = null
    activeProcessInstanceId = null
    activeArtifact = null
    activeReceipt = null
    activeModel = null
    receiptsByOperationId.clear()
    if (!current)
      return
    signalPersonaRuntimeProcess(current, 'SIGTERM')
    await waitForPersonaRuntimeProcessExit(current, processTerminationTimeoutMs)
    if (current.exitCode === null && current.signalCode === null)
      signalPersonaRuntimeProcess(current, 'SIGKILL')
    await waitForPersonaRuntimeProcessExit(current, processTerminationTimeoutMs)
    if (
      current.pid
      && currentInstanceId
      && await waitForPersonaRuntimePidExit(current.pid, 0)
    ) {
      await clearProcessStateIfMatches({ pid: current.pid, instanceId: currentInstanceId })
    }
  }

  async function startServer(artifact: AlicizationPersonaTrainingArtifact, signal: AbortSignal) {
    if (!config)
      throw new Error(`${backend.executableLabel} Persona runtime is not configured`)
    await backend.artifactCheck(artifact, config)
    await access(config.executable)
    await access(config.modelPath)
    await recoverOrphanedServer()
    const route = routeForConfig(config)
    const instanceId = randomUUID()
    const spawned = spawn(config.executable, backend.buildArgs(config, artifact, instanceId), {
      argv0: `${config.executable} --alicization-instance=${instanceId}`,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ALICIZATION_PERSONA_RUNTIME_INSTANCE_ID: instanceId,
      },
    })
    child = spawned
    activeProcessInstanceId = instanceId
    let spawnError: unknown = null
    let stderr = ''
    spawned.once('error', error => spawnError = error)
    spawned.stderr?.on('data', chunk => stderr = `${stderr}${String(chunk)}`.slice(-maxPersonaRuntimeStderrChars))
    spawned.once('exit', (code, signalCode) => {
      if (child !== spawned)
        return
      child = null
      activeProcessInstanceId = null
      activeArtifact = null
      activeReceipt = null
      receiptsByOperationId.clear()
      lastError = `${backend.executableLabel} exited unexpectedly with ${signalCode ? `signal ${signalCode}` : `code ${code ?? 'unknown'}`}${stderr ? `: ${stderr}` : ''}`
    })
    const deadline = Date.now() + config.startupTimeoutMs
    let lastErrorDuringProbe: string | null = null
    try {
      await persistProcessState(spawned, artifact, instanceId)
      while (Date.now() < deadline) {
        if (signal.aborted)
          throw signal.reason ?? new Error('Persona runtime load was cancelled')
        if (spawnError)
          throw new Error(`${backend.executableLabel} failed to start: ${errorMessageFrom(spawnError) ?? String(spawnError)}`)
        if (spawned.exitCode !== null || spawned.signalCode !== null)
          throw new Error(`${backend.executableLabel} exited before becoming healthy${stderr ? `: ${stderr}` : ''}`)
        try {
          const discoveredModel = await backend.probeHealth(
            route,
            signal,
            Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now())),
            {
              modelAlias: config.modelAlias,
              modelPath: config.modelPath,
            },
          )
          const model = discoveredModel?.trim() || config.modelAlias
          const resolvedRoute = routeForConfig(config, model)
          await backend.probeChatCompletion(
            resolvedRoute,
            model,
            signal,
            Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now())),
          )
          activeModel = model
          activeArtifact = artifact
          lastError = null
          return instanceId
        }
        catch (error) {
          if (error instanceof PersonaRuntimeTerminalProbeError)
            throw error
          lastErrorDuringProbe = errorMessageFrom(error) ?? String(error)
          await new Promise(resolve => setTimeout(resolve, personaRuntimePollIntervalMs))
        }
      }
      throw new Error(`${backend.executableLabel} did not become healthy within ${config.startupTimeoutMs}ms${lastErrorDuringProbe ? `: ${lastErrorDuringProbe}` : ''}`)
    }
    catch (error) {
      await stopServer()
      lastError = errorMessageFrom(error) ?? String(error)
      throw error
    }
  }

  const loader: PersonaTrainingArtifactLoader = {
    load: async ({ artifact, operationId, signal }) => enqueueLifecycle(async () => {
      const existingReceipt = receiptsByOperationId.get(operationId)
      if (existingReceipt)
        return existingReceipt
      if (!config)
        throw new Error(`${backend.executableLabel} Persona runtime is not configured`)
      if (activeArtifact?.artifactId === artifact.artifactId && child && activeReceipt) {
        receiptsByOperationId.set(operationId, activeReceipt)
        return activeReceipt
      }
      await stopServer()
      const processInstanceId = await startServer(artifact, signal)
      const receipt: PersonaTrainingArtifactLoaderReceipt = {
        loaderId: backend.loaderId,
        receiptId: `${backend.loaderId}:${artifact.artifactId}:${artifact.sha256.slice(0, 16)}:${config.port}:${processInstanceId}`,
        activatedAt: now(),
        reason: `${backend.executableLabel} active at ${routeForConfig(config).baseUrl}`,
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
        activeArtifact?.artifactId === artifact.artifactId
        && (
          !requestedReceiptId
          || activeReceipt?.receiptId === requestedReceiptId
        )
      ) {
        await stopServer()
      }
      receiptsByOperationId.set(operationId, {
        loaderId: backend.loaderId,
        receiptId: `${backend.loaderId}:unloaded:${artifact.artifactId}`,
        activatedAt: now(),
        reason: `${backend.executableLabel} Persona adapter unloaded`,
      })
    }),
  }

  function enqueueLifecycle<T>(operation: () => Promise<T>) {
    const next = lifecycleQueue.then(operation, operation)
    lifecycleQueue = next.then(() => undefined, () => undefined)
    return next
  }

  return {
    loader,
    getRoute,
    getSnapshot,
    setConfig: async (nextConfig: AlicizationPersonaRuntimeConfig | null) => enqueueLifecycle(async () => {
      const normalizedNextConfig = nextConfig ? normalizePersonaRuntimeConfig(nextConfig) : null
      if (config && normalizedNextConfig && JSON.stringify(config) === JSON.stringify(normalizedNextConfig))
        return getSnapshot()
      const previousArtifact = activeArtifact
      await stopServer()
      config = normalizedNextConfig
      lastError = null
      receiptsByOperationId.clear()
      if (previousArtifact && config) {
        try {
          const processInstanceId = await startServer(previousArtifact, new AbortController().signal)
          activeReceipt = {
            loaderId: backend.loaderId,
            receiptId: `${backend.loaderId}:config-reload:${previousArtifact.artifactId}:${previousArtifact.sha256.slice(0, 16)}:${config.port}:${processInstanceId}`,
            activatedAt: now(),
            reason: `${backend.executableLabel} reloaded at ${routeForConfig(config).baseUrl}`,
          }
        }
        catch {}
      }
      return getSnapshot()
    }),
    dispose: async () => enqueueLifecycle(async () => await stopServer()),
    testConnection: async (rawConfig: AlicizationPersonaRuntimeConfig | null): Promise<AlicizationPersonaRuntimeConnectionResult> => enqueueLifecycle(async () => {
      if (!rawConfig)
        return { ok: false, executable: '', baseUrl: null, error: `${backend.executableLabel} Persona runtime is not configured` }
      let probe: ReturnType<typeof spawn> | null = null
      let probeStderr = ''
      try {
        const normalized = normalizePersonaRuntimeConfig(rawConfig)
        if ((normalized.backend ?? 'llama.cpp') !== backend.backend)
          throw new Error(`${backend.executableLabel} does not support backend "${normalized.backend ?? 'llama.cpp'}"`)
        await access(normalized.executable)
        await access(normalized.modelPath)
        await backend.connectionCheck?.(normalized)
        const reusesActiveRuntime = Boolean(
          getRoute()
          && config
          && JSON.stringify(config) === JSON.stringify(normalized),
        )
        const probeConfig = reusesActiveRuntime
          ? normalized
          : {
              ...normalized,
              port: await findAvailablePersonaRuntimePort(normalized.host),
            }
        const route = routeForConfig(probeConfig)
        if (reusesActiveRuntime) {
          const signal = new AbortController().signal
          const discoveredModel = await backend.probeHealth(route, signal, probeRequestTimeoutMs, {
            modelAlias: normalized.modelAlias,
            modelPath: normalized.modelPath,
          })
          const model = discoveredModel?.trim() || normalized.modelAlias
          await backend.probeChatCompletion(routeForConfig(normalized, model), model, signal, probeRequestTimeoutMs)
          return { ok: true, executable: normalized.executable, baseUrl: route.baseUrl, error: null }
        }

        const instanceId = randomUUID()
        probe = spawn(probeConfig.executable, backend.buildConnectionArgs(probeConfig, instanceId), {
          argv0: `${probeConfig.executable} --alicization-instance=${instanceId}`,
          detached: true,
          stdio: ['ignore', 'ignore', 'pipe'],
          env: {
            ...process.env,
            ALICIZATION_PERSONA_RUNTIME_INSTANCE_ID: instanceId,
          },
        })
        let spawnError: unknown = null
        probe.once('error', error => spawnError = error)
        probe.stderr?.on('data', chunk => probeStderr = `${probeStderr}${String(chunk)}`.slice(-maxPersonaRuntimeStderrChars))
        const deadline = Date.now() + probeConfig.startupTimeoutMs
        let lastProbeError: string | null = null
        while (Date.now() < deadline) {
          if (spawnError)
            throw new Error(`${backend.executableLabel} failed to start: ${errorMessageFrom(spawnError) ?? String(spawnError)}`)
          if (probe.exitCode !== null || probe.signalCode !== null)
            throw new Error(`${backend.executableLabel} exited before becoming healthy${probeStderr ? `: ${probeStderr}` : ''}`)
          try {
            const timeoutMs = Math.min(probeRequestTimeoutMs, Math.max(50, deadline - Date.now()))
            const signal = new AbortController().signal
            const discoveredModel = await backend.probeHealth(route, signal, timeoutMs, {
              modelAlias: probeConfig.modelAlias,
              modelPath: probeConfig.modelPath,
            })
            const model = discoveredModel?.trim() || probeConfig.modelAlias
            await backend.probeChatCompletion(routeForConfig(probeConfig, model), model, signal, timeoutMs)
            return { ok: true, executable: probeConfig.executable, baseUrl: route.baseUrl, error: null }
          }
          catch (error) {
            if (error instanceof PersonaRuntimeTerminalProbeError)
              throw error
            const nextProbeError = errorMessageFrom(error) ?? String(error)
            if (!lastProbeError || nextProbeError.includes('timed out'))
              lastProbeError = nextProbeError
            await new Promise(resolve => setTimeout(resolve, personaRuntimePollIntervalMs))
          }
        }
        throw new Error(`${backend.executableLabel} did not become healthy within ${probeConfig.startupTimeoutMs}ms${lastProbeError ? `: ${lastProbeError}` : ''}`)
      }
      catch (error) {
        return {
          ok: false,
          executable: typeof rawConfig.executable === 'string' ? rawConfig.executable : '',
          baseUrl: null,
          error: errorMessageFrom(error) ?? String(error),
        }
      }
      finally {
        if (probe) {
          if (probe.exitCode === null && probe.signalCode === null)
            signalPersonaRuntimeProcess(probe, 'SIGTERM')
          await waitForPersonaRuntimeProcessExit(probe, processTerminationTimeoutMs)
          if (probe.exitCode === null && probe.signalCode === null)
            signalPersonaRuntimeProcess(probe, 'SIGKILL')
          await waitForPersonaRuntimeProcessExit(probe, processTerminationTimeoutMs)
        }
      }
    }),
  }
}
