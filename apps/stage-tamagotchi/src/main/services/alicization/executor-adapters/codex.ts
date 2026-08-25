import type {
  AlicizationCodexCommandInput,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import nodeProcess, {
  cwd as processCwd,
  env as processEnv,
  kill as processKill,
  platform as processPlatform,
} from 'node:process'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, relative, resolve } from 'node:path'
import { StringDecoder } from 'node:string_decoder'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationExecutionRuntimeContextBlock,
  buildAlicizationProviderFactBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import { parse as parseToml } from 'smol-toml'

import {
  buildAlicizationExecutionEnv,
  resolveAlicizationExecutionBinary,
} from '../execution-command-env'
import {
  isLowRiskAutonomousCodeAgentSelfStartThread,
  resolveThreadPermissionMode,
} from './thread-permission'

const codexObserveTotalTimeoutMs = 30 * 60_000
const codexMutatingTotalTimeoutMs = 60 * 60_000
const codexMaxTotalTimeoutMs = 4 * 60 * 60_000
const codexStartupTimeoutMs = 120_000
const codexActiveStepTimeoutMs = 30 * 60_000
const codexProviderRecoveryTimeoutMs = 45_000
const codexProviderStreamIdleTimeoutMs = 45_000
const codexProviderRetryMaxRetries = 5
const codexProviderRetryBaseDelayMs = 500
const codexProviderRetryMaxDelayMs = 10_000
const codexActivityHeartbeatMs = 10_000
const codexEventChunkChars = 1_500
const codexMaxPreviewChars = 4_000
const codexMaxBufferBytes = 2 * 1024 * 1024
const codexTerminationGraceMs = 750
const codexTerminalReapDelayMs = 250
const codexPostExitDrainTimeoutMs = 2_000
const codexExecutionEventDrainTimeoutMs = 1_000
const activeCodexProcessGroupPids = new Set<number>()
let codexProcessExitCleanupRegistered = false

type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'
type AlicizationCodexSandboxMode = 'read-only' | 'workspace-write'

interface AlicizationCodexCommandSpec {
  rawPrompt: string
  prompt: string
  promptPreview: string
  cwd: string
  effect: AlicizationTaskEffect
  timeoutMs: number
  sandbox: AlicizationCodexSandboxMode
  model: string | null
  profile: string | null
  runtimeContext: AlicizationExecutionRuntimeContext | null
}

interface AlicizationCodexExecutionRuntimeResult {
  ok: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  signal: string | null
  durationMs: number
  aborted: boolean
  timedOut: boolean
  timeoutKind?: 'startup' | 'active-step' | 'execution'
  timedOutActiveWork?: {
    itemId: string | null
    itemType: string
    summary: string
  }
  outputReady?: boolean
  assistantOutput?: string
  errorCode?: string
  errorMessage?: string
}

interface AlicizationCodexStructuredFailure {
  errorCode: string
  errorMessage: string
}

interface AlicizationCodexRuntimeProgress {
  type: string
  semanticProgress: boolean
  semanticKey: string | null
  activeWorkPhase: 'started' | 'updated' | 'completed' | null
  activeWorkKey: string | null
  startsWorkingPhase: boolean
  terminal: boolean
  terminalStatus: 'completed' | 'failed' | null
  externalThreadId: string | null
  itemId: string | null
  itemType: string | null
  message: string | null
  summary: string
  assistantText: string | null
  interruptedCommand: boolean
  command?: string | null
  status?: string | null
  exitCode?: number | null
  outputPreview?: string | null
}

interface AlicizationCodexInheritedConfig {
  model: string | null
  modelAutoCompactTokenLimit: number | null
  modelCatalogJson: string | null
  modelContextWindow: number | null
  modelProvider: string | null
  modelReasoningEffort: string | null
  approvalPolicy: string | null
  disableResponseStorage: boolean | null
  provider: {
    baseUrl: string | null
    envKey: string | null
    name: string | null
    requestMaxRetries: number | null
    requiresOpenAiAuth: boolean | null
    streamIdleTimeoutMs: number | null
    streamMaxRetries: number | null
    supportsWebsockets: boolean | null
    wireApi: string | null
  } | null
}

type AlicizationCodexConfigLoadResult
  = | {
    ok: true
    config: AlicizationCodexInheritedConfig | null
  }
  | {
    ok: false
    errorCode: 'CODEX_CONFIG_INVALID' | 'CODEX_PROFILE_INVALID'
    errorMessage: string
  }

export interface AlicizationCodexAdapterInput {
  thread: AlicizationTaskThreadRecord
  command: AlicizationCodexCommandInput
  abortSignal?: AbortSignal
  onExecutionEvent?: (event: AlicizationExecutionEventInput) => Promise<void> | void
  workspaceRoot?: string
  now?: () => number
  lifecycle?: {
    startupTimeoutMs?: number
    activeStepTimeoutMs?: number
    providerRecoveryTimeoutMs?: number
    totalTimeoutMs?: number
    executionEventDrainTimeoutMs?: number
  }
}

export interface AlicizationCodexAdapterResult {
  ok: boolean
  summary: string
  output: string | null
  externalSessionId?: string | null
  errorCode?: string
  errorMessage?: string
  finalStatus: AlicizationTaskThreadStatus
  events: AlicizationExecutionEventInput[]
}

function normalizeText(raw: unknown, maxChars = codexMaxPreviewChars) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function segmentOutput(raw: string) {
  if (!raw)
    return []

  const segments: string[] = []
  for (let index = 0; index < raw.length; index += codexEventChunkChars)
    segments.push(raw.slice(index, index + codexEventChunkChars))
  return segments
}

function isWithinRoot(root: string, target: string) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('../') && !rel.startsWith('..\\'))
}

function normalizeTimeoutMs(raw: unknown, effect: AlicizationTaskEffect) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric)) {
    return effect === 'observe'
      ? codexObserveTotalTimeoutMs
      : codexMutatingTotalTimeoutMs
  }
  return Math.max(300, Math.min(codexMaxTotalTimeoutMs, Math.floor(numeric)))
}

function normalizeLifecycleTimeoutMs(raw: unknown, fallback: number) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return fallback
  return Math.max(300, Math.min(4 * 60 * 60_000, Math.floor(numeric)))
}

function normalizeExecutionEventDrainTimeoutMs(raw: unknown) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return codexExecutionEventDrainTimeoutMs
  return Math.max(1, Math.min(60_000, Math.floor(numeric)))
}

function normalizeOptionalText(raw: unknown, maxChars = 120) {
  if (typeof raw !== 'string')
    return null
  const value = raw.trim().slice(0, maxChars)
  return value || null
}

function readRecord(raw: unknown) {
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readCodexEventMessage(event: Record<string, unknown>) {
  const error = readRecord(event.error)
  const item = readRecord(event.item)
  return normalizeOptionalText(
    error?.message
    ?? event.message
    ?? item?.message
    ?? item?.text,
    800,
  )
}

function normalizeCodexItemType(raw: unknown) {
  const value = normalizeOptionalText(raw, 80)
  if (!value)
    return null
  return value.replace(/[A-Z]/g, match => `_${match.toLowerCase()}`)
}

function isCodexActiveWorkItemType(itemType: string | null) {
  return itemType === 'command_execution'
    || itemType === 'mcp_tool_call'
    || itemType === 'collab_tool_call'
    || itemType === 'web_search'
    || itemType === 'file_change'
}

function buildCodexProgressSummary(input: {
  type: string
  item: Record<string, unknown> | null
  itemType: string | null
  message: string | null
}) {
  if (input.type === 'thread.started')
    return 'Codex task thread started.'
  if (input.type === 'turn.started')
    return 'Codex turn started.'
  if (input.type === 'turn.completed')
    return 'Codex turn completed.'
  if (input.type === 'turn.failed')
    return input.message ? `Codex turn failed: ${input.message}` : 'Codex turn failed.'
  if (input.type === 'error')
    return input.message ? `Codex reported: ${input.message}` : 'Codex reported an execution event.'

  const phase = input.type === 'item.started'
    ? 'started'
    : input.type === 'item.failed'
      ? 'failed'
      : input.type === 'item.completed'
        ? 'completed'
        : 'updated'
  if (input.itemType === 'command_execution') {
    const command = normalizeOptionalText(input.item?.command, 220)
    return command
      ? `Codex command ${phase}: ${command}`
      : `Codex command ${phase}.`
  }
  if (input.itemType === 'agent_message')
    return phase === 'completed' ? 'Codex produced an assistant result.' : 'Codex is producing an assistant result.'
  if (input.itemType === 'error')
    return input.message ? `Codex reported: ${input.message}` : `Codex error ${phase}.`
  if (input.itemType === 'reasoning')
    return `Codex reasoning ${phase}.`
  if (input.itemType === 'file_change')
    return `Codex file change ${phase}.`
  if (input.itemType === 'mcp_tool_call')
    return `Codex MCP tool call ${phase}.`
  if (input.itemType === 'web_search')
    return `Codex web search ${phase}.`
  if (input.itemType)
    return `Codex ${input.itemType.replace(/_/g, ' ')} ${phase}.`
  return `Codex ${input.type}.`
}

function parseCodexJsonlProgress(rawLine: string): AlicizationCodexRuntimeProgress | null {
  const line = rawLine.trim()
  if (!line)
    return null

  try {
    const event = readRecord(JSON.parse(line))
    const type = normalizeOptionalText(event?.type, 120)
    if (!event || !type)
      return null

    const item = readRecord(event.item)
    const itemType = normalizeCodexItemType(item?.type)
    const message = readCodexEventMessage(event)
    const externalThreadId = normalizeOptionalText(event.thread_id ?? event.threadId, 200)
    const itemId = normalizeOptionalText(item?.id ?? event.item_id ?? event.itemId, 200)
    const itemCommand = normalizeOptionalText(item?.command, 1_000)
    const activeWorkPhase = isCodexActiveWorkItemType(itemType)
      && (type === 'item.started' || type === 'item.updated' || type === 'item.completed' || type === 'item.failed')
      ? type === 'item.completed' || type === 'item.failed'
        ? 'completed' as const
        : type === 'item.started'
          ? 'started' as const
          : 'updated' as const
      : null
    const activeWorkKey = activeWorkPhase
      ? `${itemType}:${itemId ?? itemCommand ?? 'unknown'}`
      : null
    const itemHasSemanticProgress = itemType === 'agent_message'
      ? Boolean(normalizeOptionalText(item?.text, 8_000))
      : itemType === 'reasoning'
        ? (Array.isArray(item?.summary) && item.summary.some(value => Boolean(normalizeOptionalText(value, 8_000))))
        : itemType === 'command_execution'
          || itemType === 'mcp_tool_call'
          || itemType === 'collab_tool_call'
          || itemType === 'web_search'
          || itemType === 'todo_list'
          || (itemType === 'file_change' && Array.isArray(item?.changes) && item.changes.length > 0)
    const semanticProgress = type === 'turn.started'
      || type === 'turn.completed'
      || type === 'turn.failed'
      || (
        (type === 'item.started' || type === 'item.updated' || type === 'item.completed' || type === 'item.failed')
        && itemHasSemanticProgress
      )
    const terminalStatus = type === 'turn.completed'
      ? 'completed' as const
      : type === 'turn.failed'
        ? 'failed' as const
        : null
    const assistantText = itemType === 'agent_message'
      ? normalizeOptionalText(item?.text, codexMaxBufferBytes)
      : null
    const itemStatus = normalizeOptionalText(item?.status, 80)
    const itemExitCode = typeof item?.exit_code === 'number' && Number.isFinite(item.exit_code)
      ? Math.floor(item.exit_code)
      : null
    const itemOutputPreview = itemType === 'command_execution'
      ? normalizeOptionalText(item?.aggregated_output ?? item?.output, 1_200)
      : null
    const reasoningSummary = Array.isArray(item?.summary)
      ? item.summary
          .map(value => normalizeOptionalText(value, 2_000))
          .filter((value): value is string => Boolean(value))
          .join('\n')
      : null
    const semanticKey = semanticProgress
      ? [
          type,
          externalThreadId ?? '',
          itemId ?? '',
          itemType ?? '',
          itemStatus ?? '',
          itemCommand ?? '',
          itemExitCode ?? '',
          assistantText ?? '',
          reasoningSummary ?? '',
          message ?? '',
        ].join(':')
      : null

    return {
      type,
      semanticProgress,
      semanticKey,
      activeWorkPhase,
      activeWorkKey,
      startsWorkingPhase: type === 'turn.started'
        || (
          (type === 'item.started' || type === 'item.updated' || type === 'item.completed' || type === 'item.failed')
          && itemHasSemanticProgress
        ),
      terminal: terminalStatus !== null,
      terminalStatus,
      externalThreadId,
      itemId,
      itemType,
      message,
      summary: buildCodexProgressSummary({
        type,
        item,
        itemType,
        message,
      }),
      assistantText,
      interruptedCommand: itemType === 'command_execution'
        && type === 'item.completed'
        && itemExitCode === 130,
      command: itemType === 'command_execution' ? itemCommand : null,
      status: itemStatus,
      exitCode: itemExitCode,
      outputPreview: itemOutputPreview,
    }
  }
  catch {
    return null
  }
}

function normalizeCodexConfigKey(raw: unknown) {
  const value = normalizeOptionalText(raw, 120)
  return value && /^[\w-]+$/.test(value)
    ? value
    : null
}

function normalizePositiveInteger(raw: unknown) {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw > 0
    ? raw
    : null
}

function normalizeNonNegativeInteger(raw: unknown) {
  return typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= 0
    ? raw
    : null
}

function normalizeProviderBaseUrl(raw: unknown) {
  const value = normalizeOptionalText(raw, 1_000)
  if (!value)
    return null

  try {
    const url = new URL(value)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:')
      || url.username
      || url.password
      || url.search
      || url.hash
    ) {
      return null
    }
    const isLoopback = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname === '::1'
    if (url.protocol === 'http:' && !isLoopback)
      return null
    return url.toString().replace(/\/$/, '')
  }
  catch {
    return null
  }
}

async function readCodexConfigLayer(path: string) {
  try {
    const parsed = readRecord(parseToml(await readFile(path, 'utf8')))
    return parsed
      ? {
          status: 'valid' as const,
          value: parsed,
        }
      : {
          status: 'invalid' as const,
        }
  }
  catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''
    return code === 'ENOENT'
      ? {
          status: 'missing' as const,
        }
      : {
          status: 'invalid' as const,
        }
  }
}

function mergeCodexConfigLayers(
  base: Record<string, unknown> | null,
  profile: Record<string, unknown> | null,
) {
  if (!base && !profile)
    return null

  const merged: Record<string, unknown> = {
    ...base,
    ...profile,
  }
  const baseProviders = readRecord(base?.model_providers)
  const profileProviders = readRecord(profile?.model_providers)
  if (baseProviders || profileProviders) {
    const providerIds = new Set([
      ...Object.keys(baseProviders ?? {}),
      ...Object.keys(profileProviders ?? {}),
    ])
    merged.model_providers = Object.fromEntries(
      [...providerIds].map((providerId) => {
        const baseProvider = readRecord(baseProviders?.[providerId])
        const profileProvider = readRecord(profileProviders?.[providerId])
        return [
          providerId,
          baseProvider || profileProvider
            ? {
                ...baseProvider,
                ...profileProvider,
              }
            : profileProviders?.[providerId] ?? baseProviders?.[providerId],
        ]
      }),
    )
  }
  return merged
}

async function readInheritedCodexConfig(
  profileName: string | null,
): Promise<AlicizationCodexConfigLoadResult> {
  const configuredHome = normalizeOptionalText(processEnv.CODEX_HOME, 1_000)
  const codexHome = configuredHome
    ? resolve(configuredHome)
    : resolve(homedir(), '.codex')
  const baseLayer = await readCodexConfigLayer(resolve(codexHome, 'config.toml'))
  if (baseLayer.status === 'invalid') {
    return {
      ok: false,
      errorCode: 'CODEX_CONFIG_INVALID',
      errorMessage: 'Codex configuration could not be read or parsed.',
    }
  }

  const profileLayer = profileName
    ? await readCodexConfigLayer(resolve(codexHome, `${profileName}.config.toml`))
    : null
  if (profileName && profileLayer?.status !== 'valid') {
    return {
      ok: false,
      errorCode: 'CODEX_PROFILE_INVALID',
      errorMessage: `Codex profile "${profileName}" could not be read or parsed.`,
    }
  }

  const base = baseLayer.status === 'valid' ? baseLayer.value : null
  const profile = profileLayer?.status === 'valid' ? profileLayer.value : null
  const parsed = mergeCodexConfigLayers(base, profile)
  if (!parsed) {
    return {
      ok: true,
      config: null,
    }
  }

  const modelProvider = normalizeCodexConfigKey(parsed.model_provider)
  const modelProviders = readRecord(parsed.model_providers)
  const selectedProvider = modelProvider && modelProviders
    ? readRecord(modelProviders[modelProvider])
    : null

  return {
    ok: true,
    config: {
      model: normalizeOptionalText(parsed.model, 120),
      modelAutoCompactTokenLimit: normalizePositiveInteger(parsed.model_auto_compact_token_limit),
      modelCatalogJson: normalizeOptionalText(parsed.model_catalog_json, 1_000),
      modelContextWindow: normalizePositiveInteger(parsed.model_context_window),
      modelProvider,
      modelReasoningEffort: normalizeOptionalText(parsed.model_reasoning_effort, 40),
      approvalPolicy: normalizeOptionalText(parsed.approval_policy, 80),
      disableResponseStorage: typeof parsed.disable_response_storage === 'boolean'
        ? parsed.disable_response_storage
        : null,
      provider: selectedProvider
        ? {
            baseUrl: normalizeProviderBaseUrl(selectedProvider.base_url),
            envKey: normalizeCodexConfigKey(selectedProvider.env_key),
            name: normalizeOptionalText(selectedProvider.name, 120),
            requestMaxRetries: normalizeNonNegativeInteger(selectedProvider.request_max_retries),
            requiresOpenAiAuth: typeof selectedProvider.requires_openai_auth === 'boolean'
              ? selectedProvider.requires_openai_auth
              : null,
            streamIdleTimeoutMs: normalizePositiveInteger(selectedProvider.stream_idle_timeout_ms),
            streamMaxRetries: normalizeNonNegativeInteger(selectedProvider.stream_max_retries),
            supportsWebsockets: typeof selectedProvider.supports_websockets === 'boolean'
              ? selectedProvider.supports_websockets
              : null,
            wireApi: normalizeOptionalText(selectedProvider.wire_api, 80),
          }
        : null,
    },
  }
}

function appendCodexConfigOverride(args: string[], key: string, value: string | number | boolean | null) {
  if (value === null)
    return
  args.push(
    '-c',
    `${key}=${typeof value === 'string' ? JSON.stringify(value) : String(value)}`,
  )
}

function normalizeWorkingDirectory(raw: unknown, workspaceRoot: string) {
  const requested = typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : workspaceRoot
  const resolved = isAbsolute(requested)
    ? resolve(requested)
    : resolve(workspaceRoot, requested)

  if (!isWithinRoot(workspaceRoot, resolved)) {
    return {
      ok: false as const,
      errorCode: 'CODEX_CWD_OUTSIDE_BOUNDARY',
      errorMessage: 'Codex working directory is outside the current workspace boundary.',
    }
  }

  return {
    ok: true as const,
    cwd: resolved,
  }
}

function resolveThreadEffect(thread: AlicizationTaskThreadRecord): AlicizationTaskEffect {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'effect' in metadataTask) {
    const effect = (metadataTask as { effect?: unknown }).effect
    if (effect === 'observe' || effect === 'mutate' || effect === 'high-impact')
      return effect
  }

  return 'mutate'
}

function readTaskMetadataText(thread: AlicizationTaskThreadRecord, key: 'riskBudget' | 'justification') {
  const metadataTask = thread.metadata?.task
  if (!metadataTask || typeof metadataTask !== 'object')
    return null

  return normalizeOptionalText((metadataTask as Record<string, unknown>)[key], 80)
}

function buildBlockedDispatchSafetyGate(thread: AlicizationTaskThreadRecord, errorCode: string) {
  const effect = resolveThreadEffect(thread)
  const permissionMode = resolveThreadPermissionMode(thread)
  const riskPolicy = errorCode === 'CODEX_EFFECT_MISMATCH'
    ? 'observe-only-sandbox-required'
    : effect === 'high-impact'
      ? 'explicit-confirmation-required'
      : 'implicit-or-explicit-confirmation-required'

  return {
    effect,
    permissionMode,
    riskBudget: readTaskMetadataText(thread, 'riskBudget'),
    justification: readTaskMetadataText(thread, 'justification'),
    confirmationRequired: true,
    riskPolicy,
    auditability: 'blocked-before-dispatch',
    interruptibility: 'no-process-started',
  }
}

function resolveCodexSandbox(effect: AlicizationTaskEffect, requested: unknown) {
  const requestedSandbox = requested === 'read-only' || requested === 'workspace-write'
    ? requested
    : null
  const defaultSandbox: AlicizationCodexSandboxMode = effect === 'observe'
    ? 'read-only'
    : 'workspace-write'
  const sandbox = requestedSandbox ?? defaultSandbox

  if (effect === 'observe' && sandbox !== 'read-only') {
    return {
      ok: false as const,
      errorCode: 'CODEX_EFFECT_MISMATCH',
      errorMessage: 'Observe-only task threads must use Codex read-only sandbox mode.',
    }
  }

  return {
    ok: true as const,
    sandbox,
  }
}

function buildCodexCommandSpec(input: AlicizationCodexAdapterInput) {
  const workspaceRoot = resolve(input.workspaceRoot ?? processCwd())
  const rawPrompt = typeof input.command.prompt === 'string'
    ? input.command.prompt.trim()
    : ''
  if (!rawPrompt) {
    return {
      ok: false as const,
      errorCode: 'CODEX_PROMPT_REQUIRED',
      errorMessage: 'Codex dispatch requires a non-empty prompt.',
    }
  }

  const normalizedCwd = normalizeWorkingDirectory(input.command.cwd, workspaceRoot)
  if (!normalizedCwd.ok)
    return normalizedCwd

  const permissionMode = resolveThreadPermissionMode(input.thread)
  const effect = resolveThreadEffect(input.thread)
  if (effect === 'high-impact' && permissionMode !== 'explicit') {
    return {
      ok: false as const,
      errorCode: 'CODEX_PERMISSION_REQUIRED',
      errorMessage: 'High-impact Codex dispatch requires explicit permission before execution.',
    }
  }
  if (effect === 'mutate' && permissionMode === 'none' && !isLowRiskAutonomousCodeAgentSelfStartThread(input.thread)) {
    return {
      ok: false as const,
      errorCode: 'CODEX_PERMISSION_REQUIRED',
      errorMessage: 'Mutating Codex dispatch requires at least implicit permission before execution.',
    }
  }

  const sandbox = resolveCodexSandbox(effect, input.command.sandbox)
  if (!sandbox.ok)
    return sandbox

  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
  const runtimeContextBlock = buildAlicizationExecutionRuntimeContextBlock(runtimeContext)
  const taskBlock = buildAlicizationProviderFactBlock('alicization-execution-task', {
    instruction: rawPrompt,
  })
  const prompt = runtimeContextBlock
    ? [
        runtimeContextBlock,
        taskBlock,
      ].join('\n\n')
    : rawPrompt

  return {
    ok: true as const,
    spec: {
      rawPrompt,
      prompt,
      promptPreview: normalizeText(rawPrompt, 260),
      cwd: normalizedCwd.cwd,
      effect,
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs, effect),
      sandbox: sandbox.sandbox,
      model: normalizeOptionalText(input.command.model, 80),
      profile: normalizeCodexConfigKey(input.command.profile),
      runtimeContext,
    } satisfies AlicizationCodexCommandSpec,
  }
}

function isCodexTimeoutError(error: unknown) {
  const message = errorMessageFrom(error) ?? ''
  return /timed out|timeout|SIGTERM|killed/i.test(message)
    || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
}

function readCodexProviderUnavailableMessage(raw: unknown) {
  const message = typeof raw === 'string'
    ? raw.trim()
    : ''
  if (!message)
    return null

  // Codex writes transport diagnostics to stderr before it emits the
  // corresponding JSONL error event. Treat the retry loop as Provider
  // activity, but do not mistake the optional plugin catalog warning for the
  // requested model transport.
  if (/remote\s+(?:\S.*)?plugin\s+catalog/iu.test(message))
    return null

  const statusUnavailable = /\b(?:502|503|504)\b/iu.test(message)
  const unavailableTransport = /\b(?:service unavailable|temporarily unavailable|upstream|gateway|reconnect(?:ing)?)\b/iu.test(message)
  const reconnectAttempt = /\breconnect(?:ing)?(?:\.\.\.)?(?:\s+\d+\/\d+)?\b/iu.test(message)
  const resetTransport = /\b(?:connection\s+reset|econnreset|broken\s+pipe|unexpected\s+eof|connection\s+(?:closed|lost)|network\s+error)\b/iu.test(message)
  const transportRequestTimeout = /\b(?:request|stream)\s+timed?\s*out\b/iu.test(message)
    && (
      unavailableTransport
      || /\b(?:falling\s+back|websockets?|https?\s+transport|transport)\b/iu.test(message)
    )
  const disconnectedTransport = /\bstream\s+disconnected\b[\s\S]{0,160}\b(?:retry|retrying|reconnect(?:ing)?)\b/iu.test(message)
  const finalDisconnectedTransport = /\bstream\s+disconnected\b[\s\S]{0,160}\b(?:before\s+completion|idle\s+timeout|waiting\s+for\s+sse)\b/iu.test(message)
  return (statusUnavailable && unavailableTransport)
    || (reconnectAttempt && resetTransport)
    || transportRequestTimeout
    || disconnectedTransport
    || finalDisconnectedTransport
    ? normalizeText(message, 800)
    : null
}

function classifyCodexFatalError(raw: unknown) {
  const message = typeof raw === 'string'
    ? raw.trim()
    : ''
  if (!message || readCodexProviderUnavailableMessage(message))
    return null

  const normalizedMessage = message.toLowerCase()
  if (
    normalizedMessage.includes('model')
    && (
      normalizedMessage.includes('not supported')
      || normalizedMessage.includes('not found')
      || normalizedMessage.includes('unsupported')
    )
  ) {
    return 'CODEX_MODEL_UNAVAILABLE'
  }

  if (
    /\b(?:401|403)\b/u.test(normalizedMessage)
    || /\b(?:authentication|unauthorized|forbidden|invalid\s+(?:api|provider)\s*key|api\s*key)\b/u.test(normalizedMessage)
  ) {
    return 'CODEX_PROVIDER_AUTH_FAILED'
  }

  return 'CODEX_EXECUTE_FAILED'
}

function classifyCodexItemError(raw: unknown) {
  const message = typeof raw === 'string'
    ? raw.trim()
    : ''
  if (!message)
    return null

  const normalizedMessage = message.toLowerCase()
  if (
    normalizedMessage.includes('model')
    && (
      normalizedMessage.includes('not supported')
      || normalizedMessage.includes('not found')
      || normalizedMessage.includes('unsupported')
    )
  ) {
    return 'CODEX_MODEL_UNAVAILABLE'
  }

  if (
    /\b(?:401|403)\b/u.test(normalizedMessage)
    || /\b(?:authentication|unauthorized|forbidden|invalid\s+(?:api|provider)\s*key|api\s*key)\b/u.test(normalizedMessage)
  ) {
    return 'CODEX_PROVIDER_AUTH_FAILED'
  }

  return null
}

function parseCodexProviderDiagnostic(rawLine: string): AlicizationCodexRuntimeProgress | null {
  const message = normalizeOptionalText(rawLine, 800)
  if (!message || !readCodexProviderUnavailableMessage(message))
    return null

  return {
    type: 'provider.diagnostic',
    semanticProgress: false,
    semanticKey: `provider.diagnostic:${message}`,
    activeWorkPhase: null,
    activeWorkKey: null,
    startsWorkingPhase: false,
    terminal: false,
    terminalStatus: null,
    externalThreadId: null,
    itemId: null,
    itemType: 'error',
    message,
    summary: `Codex Provider diagnostic: ${message}`,
    assistantText: null,
    interruptedCommand: false,
  }
}

function signalCodexProcessTree(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
) {
  const pid = typeof child.pid === 'number' && Number.isFinite(child.pid)
    ? child.pid
    : null

  if (processPlatform !== 'win32' && pid && pid > 0) {
    try {
      processKill(-pid, signal)
      return
    }
    catch {
      // Fall through to the direct child signal when the process group is gone.
    }
  }

  try {
    child.kill(signal)
  }
  catch {
    // Settlement has its own deadline even when the OS rejects the signal.
  }
}

function isCodexProcessGroupAlive(child: ReturnType<typeof spawn>) {
  const pid = typeof child.pid === 'number' && Number.isFinite(child.pid)
    ? child.pid
    : null
  if (processPlatform === 'win32' || !pid || pid <= 0)
    return null

  try {
    processKill(-pid, 0)
    return true
  }
  catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : ''
    return code !== 'ESRCH'
  }
}

function registerCodexProcessGroup(child: ReturnType<typeof spawn>) {
  if (
    processPlatform === 'win32'
    || typeof child.pid !== 'number'
    || !Number.isFinite(child.pid)
    || child.pid <= 0
  ) {
    return () => {}
  }

  activeCodexProcessGroupPids.add(child.pid)
  if (!codexProcessExitCleanupRegistered) {
    codexProcessExitCleanupRegistered = true
    nodeProcess.once('exit', () => {
      for (const pid of activeCodexProcessGroupPids) {
        try {
          processKill(-pid, 'SIGTERM')
        }
        catch {
          // The process group may already have completed.
        }
      }
      activeCodexProcessGroupPids.clear()
    })
  }

  return () => {
    activeCodexProcessGroupPids.delete(child.pid!)
  }
}

function buildCodexExecArgs(
  spec: AlicizationCodexCommandSpec,
  inheritedConfig: AlicizationCodexInheritedConfig | null,
) {
  const args = [
    'exec',
    // NOTICE: Alicization owns the executor lifecycle. Do not inherit the host
    // Codex app's MCP/plugin graph or persisted session state, because those
    // processes can block a local task before the requested prompt runs.
    '--ignore-user-config',
    '--ephemeral',
    '--disable',
    'plugins',
    '--disable',
    'apps',
    '--skip-git-repo-check',
    '--json',
    '--sandbox',
    spec.sandbox,
    '-C',
    spec.cwd,
  ]
  // The executor deliberately ignores the host Codex session, but it must
  // preserve the configured model/provider pair. Passing only
  // `model_provider` creates an incomplete custom-provider route when
  // `--ignore-user-config` is active, which can surface as a long reconnect
  // timeout before Codex produces its first semantic event. The
  // provider-facing tool does not expose `model`: the main dialogue model
  // must never leak into a separate Coding Agent provider.
  const model = spec.model ?? inheritedConfig?.model
  if (model)
    args.push('--model', model)

  const modelProvider = inheritedConfig?.modelProvider ?? null
  appendCodexConfigOverride(args, 'model_provider', modelProvider)
  const reasoningEffort = spec.profile
    ? inheritedConfig?.modelReasoningEffort ?? null
    : spec.effect === 'observe'
      ? 'medium'
      : 'high'
  appendCodexConfigOverride(args, 'model_reasoning_effort', reasoningEffort)
  appendCodexConfigOverride(args, 'model_catalog_json', inheritedConfig?.modelCatalogJson ?? null)
  appendCodexConfigOverride(args, 'model_context_window', inheritedConfig?.modelContextWindow ?? null)
  appendCodexConfigOverride(args, 'model_auto_compact_token_limit', inheritedConfig?.modelAutoCompactTokenLimit ?? null)
  appendCodexConfigOverride(args, 'approval_policy', inheritedConfig?.approvalPolicy ?? null)
  appendCodexConfigOverride(args, 'disable_response_storage', inheritedConfig?.disableResponseStorage ?? null)
  if (modelProvider && inheritedConfig?.provider) {
    const providerKey = `model_providers.${modelProvider}`
    appendCodexConfigOverride(args, `${providerKey}.name`, inheritedConfig.provider.name)
    appendCodexConfigOverride(args, `${providerKey}.wire_api`, inheritedConfig.provider.wireApi)
    appendCodexConfigOverride(args, `${providerKey}.requires_openai_auth`, inheritedConfig.provider.requiresOpenAiAuth)
    appendCodexConfigOverride(args, `${providerKey}.base_url`, inheritedConfig.provider.baseUrl)
    appendCodexConfigOverride(args, `${providerKey}.env_key`, inheritedConfig.provider.envKey)
    // NOTICE: The Alicization adapter owns the outer retry and timeout
    // lifecycle. Letting Codex silently apply its own reconnect storm makes a
    // failed Provider look like a hung tool and prevents the UI from showing
    // the real boundary that failed.
    appendCodexConfigOverride(
      args,
      `${providerKey}.supports_websockets`,
      inheritedConfig.provider.supportsWebsockets ?? false,
    )
    appendCodexConfigOverride(
      args,
      `${providerKey}.request_max_retries`,
      inheritedConfig.provider.requestMaxRetries ?? 0,
    )
    appendCodexConfigOverride(
      args,
      `${providerKey}.stream_max_retries`,
      inheritedConfig.provider.streamMaxRetries ?? 0,
    )
    appendCodexConfigOverride(
      args,
      `${providerKey}.stream_idle_timeout_ms`,
      inheritedConfig.provider.streamIdleTimeoutMs ?? codexProviderStreamIdleTimeoutMs,
    )
  }
  args.push(spec.prompt)
  return args
}

function readCodexStructuredFailure(
  stdout: string,
  stderr = '',
): AlicizationCodexStructuredFailure | null {
  const candidates = `${stdout}\n${stderr}`
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .reverse()

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        message?: unknown
        error?: {
          message?: unknown
        }
      }
      const message = typeof parsed.error?.message === 'string'
        ? parsed.error.message
        : typeof parsed.message === 'string'
          ? parsed.message
          : ''
      if (!message)
        continue

      const normalizedMessage = message.toLowerCase()
      const modelUnavailable = normalizedMessage.includes('model')
        && (
          normalizedMessage.includes('not supported')
          || normalizedMessage.includes('not found')
          || normalizedMessage.includes('unsupported')
        )
      return {
        errorCode: modelUnavailable
          ? 'CODEX_MODEL_UNAVAILABLE'
          : 'CODEX_EXECUTE_FAILED',
        errorMessage: normalizeText(message, 800),
      }
    }
    catch {
      // Codex may mix non-JSON diagnostics into stdout; keep scanning JSONL.
    }
  }

  return null
}

type AlicizationCodexPreflightResult
  = | {
    ok: true
    args: string[]
    command: string
    env: NodeJS.ProcessEnv
  }
  | {
    ok: false
    aborted: boolean
    timedOut: boolean
    errorCode: string
    errorMessage: string
  }

async function runCodexPreflight(input: {
  spec: AlicizationCodexCommandSpec
  abortSignal?: AbortSignal
  timeoutMs: number
}): Promise<AlicizationCodexPreflightResult> {
  return await new Promise<AlicizationCodexPreflightResult>((resolveResult) => {
    let settled = false
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined
    let abortHandler = () => {}
    const finish = (result: AlicizationCodexPreflightResult) => {
      if (settled)
        return
      settled = true
      if (timeoutTimer)
        clearTimeout(timeoutTimer)
      input.abortSignal?.removeEventListener('abort', abortHandler)
      resolveResult(result)
    }
    abortHandler = () => {
      finish({
        ok: false,
        aborted: true,
        timedOut: false,
        errorCode: 'CODEX_ABORTED',
        errorMessage: 'Codex dispatch was aborted before the process started.',
      })
    }
    timeoutTimer = setTimeout(() => {
      finish({
        ok: false,
        aborted: false,
        timedOut: true,
        errorCode: 'CODEX_EXECUTION_TIMEOUT',
        errorMessage: `Codex preflight exceeded the total execution limit of ${input.timeoutMs}ms.`,
      })
    }, input.timeoutMs)
    timeoutTimer.unref?.()

    if (input.abortSignal?.aborted) {
      abortHandler()
      return
    }
    input.abortSignal?.addEventListener('abort', abortHandler, { once: true })

    void (async () => {
      const inheritedConfigResult = await readInheritedCodexConfig(input.spec.profile)
      if (!inheritedConfigResult.ok) {
        finish({
          ok: false,
          aborted: false,
          timedOut: false,
          errorCode: inheritedConfigResult.errorCode,
          errorMessage: inheritedConfigResult.errorMessage,
        })
        return
      }

      const env = buildAlicizationExecutionEnv()
      const command = await resolveAlicizationExecutionBinary('codex', {
        pathValue: env.PATH,
      })
      finish({
        ok: true,
        args: buildCodexExecArgs(input.spec, inheritedConfigResult.config),
        command,
        env,
      })
    })().catch((error) => {
      const errorCode = typeof error === 'object' && error != null && 'code' in error
        ? String((error as { code?: unknown }).code ?? '')
        : ''
      finish({
        ok: false,
        aborted: false,
        timedOut: false,
        errorCode: errorCode === 'ENOENT'
          ? 'CODEX_COMMAND_NOT_FOUND'
          : 'CODEX_PREFLIGHT_FAILED',
        errorMessage: errorMessageFrom(error) ?? 'Codex preflight failed.',
      })
    })
  })
}

async function runCodexCommandAttempt(
  spec: AlicizationCodexCommandSpec,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
  onProgress?: (progress: AlicizationCodexRuntimeProgress) => void,
  lifecycle?: AlicizationCodexAdapterInput['lifecycle'],
): Promise<AlicizationCodexExecutionRuntimeResult> {
  const startedAt = now()
  const startupTimeoutMs = normalizeLifecycleTimeoutMs(
    lifecycle?.startupTimeoutMs,
    codexStartupTimeoutMs,
  )
  const activeStepTimeoutMs = normalizeLifecycleTimeoutMs(
    lifecycle?.activeStepTimeoutMs,
    codexActiveStepTimeoutMs,
  )
  const providerRecoveryTimeoutMs = normalizeLifecycleTimeoutMs(
    lifecycle?.providerRecoveryTimeoutMs,
    codexProviderRecoveryTimeoutMs,
  )
  const totalTimeoutMs = normalizeLifecycleTimeoutMs(
    lifecycle?.totalTimeoutMs,
    spec.timeoutMs,
  )
  if (abortSignal?.aborted) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      signal: null,
      durationMs: Math.max(0, now() - startedAt),
      aborted: true,
      timedOut: false,
      errorCode: 'CODEX_ABORTED',
      errorMessage: 'Codex dispatch was aborted before the process started.',
    }
  }

  const preflight = await runCodexPreflight({
    spec,
    abortSignal,
    timeoutMs: totalTimeoutMs,
  })
  if (!preflight.ok) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      signal: null,
      durationMs: Math.max(0, now() - startedAt),
      aborted: preflight.aborted,
      timedOut: preflight.timedOut,
      timeoutKind: preflight.timedOut ? 'execution' : undefined,
      errorCode: preflight.errorCode,
      errorMessage: preflight.errorMessage,
    }
  }

  const { args, command, env } = preflight
  if (abortSignal?.aborted) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      signal: null,
      durationMs: Math.max(0, now() - startedAt),
      aborted: true,
      timedOut: false,
      errorCode: 'CODEX_ABORTED',
      errorMessage: 'Codex dispatch was aborted before the process started.',
    }
  }
  const remainingExecutionTimeoutMs = totalTimeoutMs - Math.max(0, now() - startedAt)
  if (remainingExecutionTimeoutMs <= 0) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      exitCode: null,
      signal: null,
      durationMs: Math.max(0, now() - startedAt),
      aborted: false,
      timedOut: true,
      timeoutKind: 'execution',
      errorCode: 'CODEX_EXECUTION_TIMEOUT',
      errorMessage: `Codex execution exceeded the total limit of ${totalTimeoutMs}ms.`,
    }
  }
  return await new Promise<AlicizationCodexExecutionRuntimeResult>((resolveResult) => {
    let terminationReason: 'abort' | 'startup-timeout' | 'active-step-timeout' | 'provider-recovery-timeout' | 'execution-timeout' | null = null
    let lifecyclePhase: 'spawning' | 'protocol-ready' | 'working' | 'provider-recovery' | 'terminal' | 'reap' = 'spawning'
    let settled = false
    let exitObserved = false
    let stdoutEnded = false
    let stderrEnded = false
    let observedExitCode: number | null = null
    let observedSignal: string | null = null
    let stdoutBuffer = ''
    let stderrBuffer = ''
    let stdoutLineBuffer = ''
    let stderrLineBuffer = ''
    const stdoutDecoder = new StringDecoder('utf8')
    const stderrDecoder = new StringDecoder('utf8')
    let streamDecodersFlushed = false
    let latestAssistantOutput = ''
    let latestProviderUnavailableMessage: string | null = null
    let providerRecoveryStartedAt: number | null = null
    const observedSemanticKeys = new Set<string>()
    const activeWorkItems = new Map<string, {
      itemId: string | null
      itemType: string
      summary: string
      startedAt: number
      deadlineAt: number
    }>()
    let timedOutActiveWork: {
      itemId: string | null
      itemType: string
      summary: string
    } | undefined
    let interruptedCommand = false
    let terminalOutcome: {
      status: 'completed' | 'failed'
      message: string | null
      errorCode?: string
    } | null = null
    let startupDeadlineTimer: ReturnType<typeof setTimeout> | null = null
    let activeStepDeadlineTimer: ReturnType<typeof setTimeout> | null = null
    let executionDeadlineTimer: ReturnType<typeof setTimeout> | null = null
    let providerRecoveryTimer: ReturnType<typeof setTimeout> | null = null
    let forceKillTimer: ReturnType<typeof setTimeout> | null = null
    let forcedSettlementTimer: ReturnType<typeof setTimeout> | null = null
    let exitDrainTimer: ReturnType<typeof setTimeout> | null = null
    let terminalDrainTimer: ReturnType<typeof setTimeout> | null = null
    let activityHeartbeatTimer: ReturnType<typeof setInterval> | null = null
    let unregisterProcessGroup = () => {}
    let terminalReapStarted = false
    let processReapFailed = false
    let child: ReturnType<typeof spawn> | null = null

    const resolveOnce = (result: AlicizationCodexExecutionRuntimeResult) => {
      if (settled)
        return
      settled = true
      cleanup()
      resolveResult(result)
    }

    const settleFromProcessState = (
      error?: unknown,
      callbackStdout?: string,
      callbackStderr?: string,
    ) => {
      const stdout = callbackStdout !== undefined
        ? callbackStdout
        : stdoutBuffer
      const stderr = callbackStderr !== undefined
        ? callbackStderr
        : stderrBuffer
      const durationMs = Math.max(0, now() - startedAt)

      if (terminationReason === 'abort') {
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal ?? 'SIGTERM',
          durationMs,
          aborted: true,
          timedOut: false,
          errorCode: 'CODEX_ABORTED',
          errorMessage: 'Codex dispatch was aborted by kill switch.',
        })
        return
      }

      if (
        terminationReason === 'startup-timeout'
        || terminationReason === 'active-step-timeout'
        || terminationReason === 'execution-timeout'
      ) {
        const timeoutKind = terminationReason === 'startup-timeout'
          ? 'startup'
          : terminationReason === 'active-step-timeout'
            ? 'active-step'
            : 'execution'
        const providerUnavailableMessage = timeoutKind === 'active-step'
          ? null
          : latestProviderUnavailableMessage
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal ?? 'SIGTERM',
          durationMs,
          aborted: false,
          timedOut: true,
          timeoutKind,
          errorCode: providerUnavailableMessage
            ? 'CODEX_PROVIDER_UNAVAILABLE'
            : timeoutKind === 'startup'
              ? 'CODEX_STARTUP_TIMEOUT'
              : timeoutKind === 'active-step'
                ? 'CODEX_ACTIVE_STEP_TIMEOUT'
                : 'CODEX_EXECUTION_TIMEOUT',
          errorMessage: providerUnavailableMessage
            ? `Codex Provider reported ${providerUnavailableMessage} and did not recover before the ${timeoutKind} deadline.`
            : timeoutKind === 'startup'
              ? `Codex did not begin a turn within ${startupTimeoutMs}ms.`
              : timeoutKind === 'active-step'
                ? `Codex active work item ${timedOutActiveWork?.itemType ?? 'unknown'} (${timedOutActiveWork?.itemId ?? 'unknown'}) exceeded its ${activeStepTimeoutMs}ms deadline: ${timedOutActiveWork?.summary ?? 'unknown work item'}.`
                : `Codex execution exceeded the total limit of ${totalTimeoutMs}ms.`,
          timedOutActiveWork,
        })
        return
      }

      if (terminationReason === 'provider-recovery-timeout') {
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal ?? 'SIGTERM',
          durationMs,
          aborted: false,
          timedOut: false,
          errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
          errorMessage: `Codex Provider did not recover within ${providerRecoveryTimeoutMs}ms: ${latestProviderUnavailableMessage ?? 'the transport stopped responding'}.`,
        })
        return
      }

      if (terminalOutcome?.status === 'failed') {
        const structuredFailure = readCodexStructuredFailure(stdout, stderr)
        const providerUnavailableMessage = latestProviderUnavailableMessage
          ?? readCodexProviderUnavailableMessage(structuredFailure?.errorMessage)
          ?? readCodexProviderUnavailableMessage(terminalOutcome.message)
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal,
          durationMs,
          aborted: false,
          timedOut: false,
          errorCode: providerUnavailableMessage
            ? 'CODEX_PROVIDER_UNAVAILABLE'
            : terminalOutcome.errorCode ?? structuredFailure?.errorCode ?? 'CODEX_EXECUTE_FAILED',
          errorMessage: providerUnavailableMessage
            ?? structuredFailure?.errorMessage
            ?? terminalOutcome.message
            ?? 'Codex turn failed.',
        })
        return
      }

      if (terminalOutcome?.status === 'completed') {
        resolveOnce({
          ok: true,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal,
          durationMs,
          aborted: false,
          timedOut: false,
          outputReady: true,
          assistantOutput: latestAssistantOutput,
        })
        return
      }

      if (processReapFailed) {
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal ?? 'SIGKILL',
          durationMs,
          aborted: false,
          timedOut: false,
          errorCode: 'CODEX_PROCESS_REAP_FAILED',
          errorMessage: 'Codex produced an assistant response, but its process did not exit after SIGTERM and SIGKILL.',
        })
        return
      }

      if (error) {
        const errorCode = typeof error === 'object' && error != null && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
          ? String((error as { code?: string }).code)
          : undefined
        const exitCode = typeof error === 'object' && error != null && 'code' in error && typeof (error as { code?: unknown }).code === 'number'
          ? Number((error as { code?: number }).code)
          : null
        const signal = typeof error === 'object' && error != null && 'signal' in error && typeof (error as { signal?: unknown }).signal === 'string'
          ? String((error as { signal?: string }).signal)
          : null
        const timedOut = isCodexTimeoutError(error)
        const structuredFailure = readCodexStructuredFailure(stdout, stderr)
        const providerUnavailableMessage = latestProviderUnavailableMessage
          ?? readCodexProviderUnavailableMessage(structuredFailure?.errorMessage)
          ?? readCodexProviderUnavailableMessage(errorMessageFrom(error))

        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode,
          signal,
          durationMs,
          aborted: false,
          timedOut,
          errorCode: providerUnavailableMessage
            ? 'CODEX_PROVIDER_UNAVAILABLE'
            : timedOut
              ? 'CODEX_TIMEOUT'
              : structuredFailure?.errorCode
                ?? (errorCode === 'ENOENT'
                  ? 'CODEX_COMMAND_NOT_FOUND'
                  : 'CODEX_EXECUTE_FAILED'),
          errorMessage: providerUnavailableMessage
            ?? structuredFailure?.errorMessage
            ?? errorMessageFrom(error)
            ?? 'Codex execution failed.',
        })
        return
      }

      if (exitObserved && observedExitCode !== 0) {
        const structuredFailure = readCodexStructuredFailure(stdout, stderr)
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal,
          durationMs,
          aborted: false,
          timedOut: false,
          errorCode: structuredFailure?.errorCode ?? 'CODEX_EXECUTE_FAILED',
          errorMessage: structuredFailure?.errorMessage
            ?? (observedSignal
              ? `Codex exited after receiving ${observedSignal}.`
              : `Codex exited with code ${observedExitCode ?? 'unknown'}.`),
        })
        return
      }

      if (interruptedCommand) {
        resolveOnce({
          ok: false,
          stdout,
          stderr,
          exitCode: observedExitCode,
          signal: observedSignal,
          durationMs,
          aborted: false,
          timedOut: false,
          errorCode: 'CODEX_INTERRUPTED',
          errorMessage: 'Codex command execution was interrupted before the turn emitted a terminal event.',
          assistantOutput: latestAssistantOutput,
        })
        return
      }

      resolveOnce({
        ok: false,
        stdout,
        stderr,
        exitCode: observedExitCode,
        signal: observedSignal,
        durationMs,
        aborted: false,
        timedOut: false,
        errorCode: 'CODEX_PROTOCOL_INCOMPLETE',
        errorMessage: 'Codex exited without emitting turn.completed or turn.failed.',
        assistantOutput: latestAssistantOutput,
      })
    }

    const scheduleForcedReap = () => {
      if (settled || forceKillTimer || !child)
        return
      forceKillTimer = setTimeout(() => {
        if (settled || !child)
          return
        const processGroupAlive = isCodexProcessGroupAlive(child)
        if (processGroupAlive === false || (processGroupAlive === null && exitObserved)) {
          settleFromProcessState()
          return
        }
        signalCodexProcessTree(child, 'SIGKILL')
        forcedSettlementTimer = setTimeout(() => {
          if (settled || !child)
            return
          const processGroupStillAlive = isCodexProcessGroupAlive(child)
          if (processGroupStillAlive === false || (processGroupStillAlive === null && exitObserved)) {
            settleFromProcessState()
            return
          }
          if (!terminationReason)
            processReapFailed = true
          settleFromProcessState()
        }, codexTerminationGraceMs)
        forcedSettlementTimer.unref?.()
      }, codexTerminationGraceMs)
      forceKillTimer.unref?.()
    }

    const terminateExecution = (
      reason: 'abort' | 'startup-timeout' | 'active-step-timeout' | 'provider-recovery-timeout' | 'execution-timeout',
    ) => {
      if (settled || terminationReason || terminalOutcome || terminalReapStarted)
        return
      terminationReason = reason
      if (!child) {
        settleFromProcessState()
        return
      }
      if (!terminalReapStarted)
        signalCodexProcessTree(child, 'SIGTERM')
      scheduleForcedReap()
    }

    const startTerminalReap = () => {
      if (settled || exitObserved || terminationReason || terminalReapStarted || !child)
        return
      terminalReapStarted = true
      lifecyclePhase = 'reap'
      if (terminalDrainTimer) {
        clearTimeout(terminalDrainTimer)
        terminalDrainTimer = null
      }
      if (activeStepDeadlineTimer) {
        clearTimeout(activeStepDeadlineTimer)
        activeStepDeadlineTimer = null
      }
      if (startupDeadlineTimer) {
        clearTimeout(startupDeadlineTimer)
        startupDeadlineTimer = null
      }
      if (providerRecoveryTimer) {
        clearTimeout(providerRecoveryTimer)
        providerRecoveryTimer = null
      }
      signalCodexProcessTree(child, 'SIGTERM')
      scheduleForcedReap()
    }

    function abortExecution() {
      if (terminalOutcome) {
        startTerminalReap()
        return
      }
      terminateExecution('abort')
    }

    function cleanup() {
      if (startupDeadlineTimer)
        clearTimeout(startupDeadlineTimer)
      if (activeStepDeadlineTimer)
        clearTimeout(activeStepDeadlineTimer)
      if (executionDeadlineTimer)
        clearTimeout(executionDeadlineTimer)
      if (providerRecoveryTimer)
        clearTimeout(providerRecoveryTimer)
      if (forceKillTimer)
        clearTimeout(forceKillTimer)
      if (forcedSettlementTimer)
        clearTimeout(forcedSettlementTimer)
      if (exitDrainTimer)
        clearTimeout(exitDrainTimer)
      if (terminalDrainTimer)
        clearTimeout(terminalDrainTimer)
      if (activityHeartbeatTimer)
        clearInterval(activityHeartbeatTimer)
      activeWorkItems.clear()
      if (abortSignal)
        abortSignal.removeEventListener('abort', abortExecution)
      if (!child || isCodexProcessGroupAlive(child) !== true)
        unregisterProcessGroup()
    }

    const scheduleActiveStepDeadline = () => {
      if (activeStepDeadlineTimer) {
        clearTimeout(activeStepDeadlineTimer)
        activeStepDeadlineTimer = null
      }
      if (
        settled
        || terminationReason
        || terminalOutcome
        || activeWorkItems.size === 0
      ) {
        return
      }

      const nextDeadline = [...activeWorkItems.values()]
        .sort((left, right) => left.deadlineAt - right.deadlineAt)[0]
      if (!nextDeadline)
        return

      activeStepDeadlineTimer = setTimeout(() => {
        const currentTime = now()
        const expiredWork = [...activeWorkItems.values()]
          .filter(work => work.deadlineAt <= currentTime)
          .sort((left, right) => left.deadlineAt - right.deadlineAt)[0]
        if (!expiredWork) {
          scheduleActiveStepDeadline()
          return
        }
        timedOutActiveWork = {
          itemId: expiredWork.itemId,
          itemType: expiredWork.itemType,
          summary: expiredWork.summary,
        }
        terminateExecution('active-step-timeout')
      }, Math.max(0, nextDeadline.deadlineAt - now()))
      activeStepDeadlineTimer.unref?.()
    }

    const beginProviderRecovery = () => {
      if (
        settled
        || terminationReason
        || terminalOutcome
        || providerRecoveryTimer
      ) {
        return
      }

      lifecyclePhase = 'provider-recovery'
      providerRecoveryStartedAt = now()
      if (startupDeadlineTimer) {
        clearTimeout(startupDeadlineTimer)
        startupDeadlineTimer = null
      }
      if (activeStepDeadlineTimer) {
        clearTimeout(activeStepDeadlineTimer)
        activeStepDeadlineTimer = null
      }
      providerRecoveryTimer = setTimeout(() => {
        providerRecoveryTimer = null
        terminateExecution('provider-recovery-timeout')
      }, providerRecoveryTimeoutMs)
      providerRecoveryTimer.unref?.()
    }

    const resumeFromProviderRecovery = () => {
      if (providerRecoveryTimer) {
        clearTimeout(providerRecoveryTimer)
        providerRecoveryTimer = null
      }
      const recoveryDurationMs = providerRecoveryStartedAt === null
        ? 0
        : Math.max(0, now() - providerRecoveryStartedAt)
      providerRecoveryStartedAt = null
      if (lifecyclePhase === 'provider-recovery') {
        lifecyclePhase = 'working'
        if (recoveryDurationMs > 0) {
          for (const work of activeWorkItems.values())
            work.deadlineAt += recoveryDurationMs
        }
        scheduleActiveStepDeadline()
      }
    }

    const scheduleTerminalReap = () => {
      if (settled || terminationReason || terminalDrainTimer || terminalReapStarted)
        return
      if (activeStepDeadlineTimer) {
        clearTimeout(activeStepDeadlineTimer)
        activeStepDeadlineTimer = null
      }
      if (startupDeadlineTimer) {
        clearTimeout(startupDeadlineTimer)
        startupDeadlineTimer = null
      }
      if (executionDeadlineTimer) {
        clearTimeout(executionDeadlineTimer)
        executionDeadlineTimer = null
      }
      terminalDrainTimer = setTimeout(() => {
        terminalDrainTimer = null
        startTerminalReap()
      }, codexTerminalReapDelayMs)
      terminalDrainTimer.unref?.()
    }

    const observeCodexProgress = (progress: AlicizationCodexRuntimeProgress) => {
      // A turn's terminal event closes the adapter's observation window. JSONL
      // can still drain from stdout after that point, but those events belong
      // to the completed turn and must not resurrect execution state.
      if (terminalOutcome || terminationReason || terminalReapStarted)
        return

      const providerUnavailableMessage = readCodexProviderUnavailableMessage(progress.message)
      if (providerUnavailableMessage) {
        latestProviderUnavailableMessage = providerUnavailableMessage
        beginProviderRecovery()
      }
      else if (progress.semanticProgress && progress.type !== 'turn.failed') {
        latestProviderUnavailableMessage = null
        resumeFromProviderRecovery()
      }
      if (progress.assistantText)
        latestAssistantOutput = progress.assistantText
      if (progress.interruptedCommand)
        interruptedCommand = true
      onProgress?.(progress)
      if (progress.terminalStatus) {
        lifecyclePhase = 'terminal'
        activeWorkItems.clear()
        if (activeStepDeadlineTimer) {
          clearTimeout(activeStepDeadlineTimer)
          activeStepDeadlineTimer = null
        }
        if (providerRecoveryTimer) {
          clearTimeout(providerRecoveryTimer)
          providerRecoveryTimer = null
        }
        terminalOutcome ??= {
          status: progress.terminalStatus,
          message: progress.message,
        }
        scheduleTerminalReap()
        return
      }
      const isCodexItemError = progress.itemType === 'error'
        && (
          progress.type === 'item.completed'
          || progress.type === 'item.failed'
        )
      if (progress.type === 'error' || isCodexItemError) {
        const fatalErrorCode = progress.type === 'error'
          ? classifyCodexFatalError(progress.message)
          : classifyCodexItemError(progress.message)
        if (fatalErrorCode) {
          lifecyclePhase = 'terminal'
          terminalOutcome ??= {
            status: 'failed',
            message: progress.message,
            errorCode: fatalErrorCode,
          }
          scheduleTerminalReap()
        }
        return
      }
      if (progress.type === 'thread.started' && lifecyclePhase === 'spawning')
        lifecyclePhase = 'protocol-ready'
      if (progress.startsWorkingPhase && lifecyclePhase !== 'working') {
        lifecyclePhase = 'working'
        if (startupDeadlineTimer) {
          clearTimeout(startupDeadlineTimer)
          startupDeadlineTimer = null
        }
      }
      if (!progress.semanticProgress && !progress.activeWorkPhase)
        return

      if (progress.activeWorkPhase && progress.activeWorkKey) {
        if (progress.activeWorkPhase === 'completed') {
          const removed = activeWorkItems.delete(progress.activeWorkKey)
          if (removed) {
            scheduleActiveStepDeadline()
          }
        }
        else {
          const currentTime = now()
          const existingWork = activeWorkItems.get(progress.activeWorkKey)
          if (existingWork) {
            // Codex `item.updated` is the semantic progress signal for a
            // long-running command. Refresh the idle deadline while keeping
            // the original start time for diagnostics and UI elapsed time.
            existingWork.itemId = progress.itemId ?? existingWork.itemId
            existingWork.itemType = progress.itemType ?? existingWork.itemType
            existingWork.summary = progress.summary || existingWork.summary
            existingWork.deadlineAt = currentTime + activeStepTimeoutMs
          }
          else {
            activeWorkItems.set(progress.activeWorkKey, {
              itemId: progress.itemId,
              itemType: progress.itemType ?? 'unknown',
              summary: progress.summary,
              startedAt: currentTime,
              deadlineAt: currentTime + activeStepTimeoutMs,
            })
          }
          scheduleActiveStepDeadline()
        }
      }

      const semanticKey = progress.semanticKey
      if (!semanticKey || observedSemanticKeys.has(semanticKey))
        return
      observedSemanticKeys.add(semanticKey)
    }

    const consumeStdoutLines = (flush = false) => {
      const lines = stdoutLineBuffer.split(/\r?\n/)
      const trailing = lines.pop() ?? ''
      stdoutLineBuffer = flush ? '' : trailing
      if (flush && trailing)
        lines.push(trailing)

      for (const line of lines) {
        const progress = parseCodexJsonlProgress(line)
        if (progress)
          observeCodexProgress(progress)
      }
    }

    const consumeStderrLines = (flush = false) => {
      const lines = stderrLineBuffer.split(/\r?\n/)
      const trailing = lines.pop() ?? ''
      stderrLineBuffer = flush ? '' : trailing
      if (flush && trailing)
        lines.push(trailing)

      for (const line of lines) {
        const progress = parseCodexJsonlProgress(line)
          ?? parseCodexProviderDiagnostic(line)
        if (progress)
          observeCodexProgress(progress)
      }
    }

    const appendStdout = (text: string) => {
      if (!text)
        return
      stdoutBuffer = (stdoutBuffer + text).slice(-codexMaxBufferBytes)
      stdoutLineBuffer = (stdoutLineBuffer + text).slice(-codexMaxBufferBytes)
      consumeStdoutLines()
    }

    const appendStderr = (text: string) => {
      if (!text)
        return
      stderrBuffer = (stderrBuffer + text).slice(-codexMaxBufferBytes)
      stderrLineBuffer = (stderrLineBuffer + text).slice(-codexMaxBufferBytes)
      consumeStderrLines()
    }

    const flushStreamDecoders = () => {
      if (streamDecodersFlushed)
        return
      streamDecodersFlushed = true
      appendStdout(stdoutDecoder.end())
      appendStderr(stderrDecoder.end())
      consumeStdoutLines(true)
      consumeStderrLines(true)
    }

    const settleAfterStreamDrain = () => {
      if (!exitObserved || !stdoutEnded || !stderrEnded)
        return
      flushStreamDecoders()
      settleFromProcessState()
    }

    child = spawn(command, args, {
      cwd: spec.cwd,
      detached: processPlatform !== 'win32',
      env,
      // The prompt is already an argv value. Keeping stdin ignored prevents
      // Codex from entering its appended-stdin input mode while still leaving
      // stdout/stderr available for diagnostics.
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    const spawnedChild = child
    unregisterProcessGroup = registerCodexProcessGroup(spawnedChild)
    activityHeartbeatTimer = setInterval(() => {
      if (
        settled
        || terminationReason
        || terminalOutcome
        || (lifecyclePhase !== 'working' && lifecyclePhase !== 'provider-recovery')
      ) {
        return
      }

      const activeWork = [...activeWorkItems.values()]
        .sort((left, right) => left.startedAt - right.startedAt)[0]
      onProgress?.({
        type: 'heartbeat',
        semanticProgress: false,
        semanticKey: null,
        activeWorkPhase: null,
        activeWorkKey: null,
        startsWorkingPhase: false,
        terminal: false,
        terminalStatus: null,
        externalThreadId: null,
        itemId: activeWork?.itemId ?? null,
        itemType: activeWork?.itemType ?? 'turn',
        message: null,
        summary: lifecyclePhase === 'provider-recovery'
          ? `Codex Provider 正在恢复：${latestProviderUnavailableMessage ?? '暂时没有新的响应'}`
          : activeWork
            ? `${activeWork.summary.replace(/^Codex command (?:started|updated):\s*/u, 'Codex command still running: ')}`
            : 'Codex is still processing the current task.',
        assistantText: null,
        interruptedCommand: false,
      })
    }, codexActivityHeartbeatMs)
    activityHeartbeatTimer.unref?.()

    spawnedChild.stdout?.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      appendStdout(stdoutDecoder.write(buffer))
    })
    spawnedChild.stdout?.once('end', () => {
      stdoutEnded = true
      settleAfterStreamDrain()
    })
    spawnedChild.stderr?.on('data', (chunk) => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      appendStderr(stderrDecoder.write(buffer))
    })
    spawnedChild.stderr?.once('end', () => {
      stderrEnded = true
      settleAfterStreamDrain()
    })
    spawnedChild.once('error', (error) => {
      flushStreamDecoders()
      settleFromProcessState(error)
    })
    spawnedChild.once?.('exit', (exitCode, signal) => {
      exitObserved = true
      observedExitCode = typeof exitCode === 'number' ? exitCode : null
      observedSignal = typeof signal === 'string' ? signal : null
      settleAfterStreamDrain()
      if (settled)
        return
      exitDrainTimer = setTimeout(() => {
        if (!child || isCodexProcessGroupAlive(child) !== true) {
          flushStreamDecoders()
          settleFromProcessState()
          return
        }
        scheduleForcedReap()
      }, terminalOutcome ? codexTerminalReapDelayMs : codexPostExitDrainTimeoutMs)
      exitDrainTimer.unref?.()
    })
    spawnedChild.once?.('close', (exitCode, signal) => {
      flushStreamDecoders()
      exitObserved = true
      observedExitCode = typeof exitCode === 'number' ? exitCode : observedExitCode
      observedSignal = typeof signal === 'string' ? signal : observedSignal
      if (child && isCodexProcessGroupAlive(child) === true) {
        scheduleForcedReap()
        return
      }
      settleFromProcessState()
    })

    if (abortSignal) {
      if (abortSignal.aborted)
        abortExecution()
      else
        abortSignal.addEventListener('abort', abortExecution, { once: true })
    }

    startupDeadlineTimer = setTimeout(() => {
      terminateExecution('startup-timeout')
    }, startupTimeoutMs)
    startupDeadlineTimer.unref?.()
    executionDeadlineTimer = setTimeout(() => {
      terminateExecution('execution-timeout')
    }, remainingExecutionTimeoutMs)
    executionDeadlineTimer.unref?.()
  })
}

function shouldRetryCodexProviderFailure(input: {
  abortSignal?: AbortSignal
  result: AlicizationCodexExecutionRuntimeResult
  spec: AlicizationCodexCommandSpec
}) {
  return input.spec.effect === 'observe'
    && !input.abortSignal?.aborted
    && !input.result.ok
    && !input.result.aborted
    && input.result.errorCode === 'CODEX_PROVIDER_UNAVAILABLE'
}

async function waitForCodexProviderRetry(
  delayMs: number,
  abortSignal?: AbortSignal,
) {
  if (delayMs <= 0 || abortSignal?.aborted)
    return !abortSignal?.aborted

  return await new Promise<boolean>((resolveResult) => {
    let settled = false
    const finish = (result: boolean) => {
      if (settled)
        return
      settled = true
      clearTimeout(timer)
      abortSignal?.removeEventListener('abort', onAbort)
      resolveResult(result)
    }
    const onAbort = () => finish(false)
    const timer = setTimeout(() => finish(true), delayMs)
    timer.unref?.()
    abortSignal?.addEventListener('abort', onAbort, { once: true })
  })
}

async function runCodexCommand(
  spec: AlicizationCodexCommandSpec,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
  onProgress?: (progress: AlicizationCodexRuntimeProgress) => void,
  lifecycle?: AlicizationCodexAdapterInput['lifecycle'],
): Promise<AlicizationCodexExecutionRuntimeResult> {
  const startedAt = now()
  const totalTimeoutMs = normalizeLifecycleTimeoutMs(
    lifecycle?.totalTimeoutMs,
    spec.timeoutMs,
  )
  const deadlineAt = startedAt + totalTimeoutMs
  let retries = 0
  let lastResult: AlicizationCodexExecutionRuntimeResult | null = null

  while (true) {
    if (abortSignal?.aborted) {
      return {
        ok: false,
        stdout: lastResult?.stdout ?? '',
        stderr: lastResult?.stderr ?? '',
        exitCode: lastResult?.exitCode ?? null,
        signal: lastResult?.signal ?? null,
        durationMs: Math.max(0, now() - startedAt),
        aborted: true,
        timedOut: false,
        errorCode: 'CODEX_ABORTED',
        errorMessage: 'Codex dispatch was aborted by kill switch.',
      }
    }

    const remainingExecutionTimeoutMs = deadlineAt - now()
    if (remainingExecutionTimeoutMs <= 0) {
      return {
        ok: false,
        stdout: lastResult?.stdout ?? '',
        stderr: lastResult?.stderr ?? '',
        exitCode: lastResult?.exitCode ?? null,
        signal: lastResult?.signal ?? null,
        durationMs: Math.max(0, now() - startedAt),
        aborted: false,
        timedOut: true,
        timeoutKind: 'execution',
        errorCode: lastResult?.errorCode === 'CODEX_PROVIDER_UNAVAILABLE'
          ? 'CODEX_PROVIDER_UNAVAILABLE'
          : 'CODEX_EXECUTION_TIMEOUT',
        errorMessage: lastResult?.errorCode === 'CODEX_PROVIDER_UNAVAILABLE'
          ? `Codex Provider remained unavailable before the ${totalTimeoutMs}ms execution deadline.`
          : `Codex execution exceeded the total limit of ${totalTimeoutMs}ms.`,
      }
    }

    const result = await runCodexCommandAttempt(
      spec,
      abortSignal,
      now,
      onProgress,
      {
        ...lifecycle,
        totalTimeoutMs: remainingExecutionTimeoutMs,
      },
    )
    lastResult = result
    if (
      !shouldRetryCodexProviderFailure({
        abortSignal,
        result,
        spec,
      })
      || retries >= codexProviderRetryMaxRetries
    ) {
      return {
        ...result,
        durationMs: Math.max(0, now() - startedAt),
      }
    }

    const retryDelayMs = Math.min(
      codexProviderRetryMaxDelayMs,
      codexProviderRetryBaseDelayMs * (2 ** retries),
    )
    const nextAttempt = retries + 2
    onProgress?.({
      type: 'provider.retry',
      semanticProgress: false,
      semanticKey: null,
      activeWorkPhase: null,
      activeWorkKey: null,
      startsWorkingPhase: false,
      terminal: false,
      terminalStatus: null,
      externalThreadId: null,
      itemId: null,
      itemType: 'error',
      message: result.errorMessage ?? 'Codex Provider became unavailable.',
      summary: `Codex Provider unavailable; retrying attempt ${nextAttempt}/${codexProviderRetryMaxRetries + 1} after ${retryDelayMs}ms.`,
      assistantText: null,
      interruptedCommand: false,
    })
    retries += 1
    if (!await waitForCodexProviderRetry(retryDelayMs, abortSignal))
      continue
  }
}

function composeCombinedOutput(assistantOutput: string, stdout: string, stderr: string) {
  const parts = [assistantOutput.trim(), stdout.trim(), stderr.trim()].filter(Boolean)
  if (parts.length === 0)
    return null
  return parts.join('\n').slice(0, codexMaxPreviewChars)
}

function buildFailureSummary(thread: AlicizationTaskThreadRecord, errorMessage: string) {
  const goal = normalizeText(thread.goal, 140) || 'the current task'
  return `Codex execution failed while acting on ${goal}: ${normalizeText(errorMessage, 220) || 'unknown error'}.`
}

export async function executeCodexTaskThread(input: AlicizationCodexAdapterInput): Promise<AlicizationCodexAdapterResult> {
  const now = input.now ?? Date.now
  const thread = input.thread
  const normalized = buildCodexCommandSpec(input)
  if (!normalized.ok) {
    const createdAt = now()
    const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
    return {
      ok: false,
      summary: buildFailureSummary(thread, normalized.errorMessage),
      output: null,
      errorCode: normalized.errorCode,
      errorMessage: normalized.errorMessage,
      finalStatus: 'failed',
      events: [{
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: 'codex',
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          adapter: 'codex',
          errorCode: normalized.errorCode,
          errorMessage: normalized.errorMessage,
          safetyGate: buildBlockedDispatchSafetyGate(thread, normalized.errorCode),
          hasRuntimeContext: runtimeContext !== null,
          runtimeContext,
        },
        createdAt,
      }],
    }
  }

  const spec = normalized.spec
  const progressEvents: AlicizationExecutionEventInput[] = []
  const progressObserverDiagnostics: string[] = []
  const pendingProgressObservers = new Set<Promise<void>>()
  const executionRunId = randomUUID()
  let progressSequence = 0
  let externalSessionId: string | null = null
  const recordProgress = (progress: AlicizationCodexRuntimeProgress) => {
    if (progress.externalThreadId)
      externalSessionId = progress.externalThreadId
    progressSequence += 1
    const event: AlicizationExecutionEventInput = {
      id: `${thread.id}:codex:${executionRunId}:${progressSequence}`,
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'codex-jsonl',
        codexEventType: progress.type,
        semanticProgress: progress.semanticProgress,
        semanticKey: progress.semanticKey,
        startsWorkingPhase: progress.startsWorkingPhase,
        terminal: progress.terminal,
        terminalStatus: progress.terminalStatus,
        externalThreadId: progress.externalThreadId,
        itemId: progress.itemId,
        itemType: progress.itemType,
        message: progress.message,
        summary: progress.summary,
        command: progress.command,
        status: progress.status,
        exitCode: progress.exitCode,
        outputPreview: progress.outputPreview,
        executionRunId,
        sequence: progressSequence,
      },
      createdAt: now(),
    }
    progressEvents.push(event)
    if (input.onExecutionEvent) {
      try {
        const observer = Promise.resolve(input.onExecutionEvent(event))
          .catch((error) => {
            progressObserverDiagnostics.push(
              `Execution event observer failed: ${errorMessageFrom(error)}`,
            )
          })
        pendingProgressObservers.add(observer)
        void observer.finally(() => {
          pendingProgressObservers.delete(observer)
        })
      }
      catch (error) {
        progressObserverDiagnostics.push(
          `Execution event observer failed: ${errorMessageFrom(error)}`,
        )
      }
    }
  }

  const dispatchCreatedAt = now()
  const dispatchEvent: AlicizationExecutionEventInput = {
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: 'codex',
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      adapter: 'codex',
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
      promptPreview: spec.promptPreview,
      cwd: spec.cwd,
      timeoutMs: spec.timeoutMs,
      startupTimeoutMs: normalizeLifecycleTimeoutMs(
        input.lifecycle?.startupTimeoutMs,
        codexStartupTimeoutMs,
      ),
      activeStepTimeoutMs: normalizeLifecycleTimeoutMs(
        input.lifecycle?.activeStepTimeoutMs,
        codexActiveStepTimeoutMs,
      ),
      totalTimeoutMs: normalizeLifecycleTimeoutMs(
        input.lifecycle?.totalTimeoutMs,
        spec.timeoutMs,
      ),
      providerRecoveryTimeoutMs: normalizeLifecycleTimeoutMs(
        input.lifecycle?.providerRecoveryTimeoutMs,
        codexProviderRecoveryTimeoutMs,
      ),
      sandbox: spec.sandbox,
      model: spec.model,
      profile: spec.profile,
    },
    createdAt: dispatchCreatedAt,
  }

  const runtimeResult = await runCodexCommand(
    spec,
    input.abortSignal,
    now,
    recordProgress,
    input.lifecycle,
  )
  if (pendingProgressObservers.size > 0) {
    const drainTimeoutMs = normalizeExecutionEventDrainTimeoutMs(
      input.lifecycle?.executionEventDrainTimeoutMs,
    )
    let drainTimer: ReturnType<typeof setTimeout> | undefined
    const drainCompleted = await Promise.race([
      Promise.all(pendingProgressObservers).then(() => true),
      new Promise<false>((resolve) => {
        drainTimer = setTimeout(() => resolve(false), drainTimeoutMs)
        drainTimer.unref?.()
      }),
    ])
    if (drainTimer)
      clearTimeout(drainTimer)
    if (!drainCompleted) {
      progressObserverDiagnostics.push(
        `Execution event observer drain timed out after ${drainTimeoutMs}ms with ${pendingProgressObservers.size} callback(s) still pending.`,
      )
    }
  }
  const assistantOutput = runtimeResult.assistantOutput ?? ''
  const diagnosticOutput = composeCombinedOutput(assistantOutput, runtimeResult.stdout, runtimeResult.stderr)
  const stepBaseAt = Math.max(dispatchCreatedAt + 1, now())
  const assistantSegments = segmentOutput(assistantOutput)
  const stdoutSegments = segmentOutput(runtimeResult.stdout)
  const stderrSegments = segmentOutput(runtimeResult.stderr)
  const stepEvents: AlicizationExecutionEventInput[] = [
    ...progressEvents,
    ...progressObserverDiagnostics.map((message, index): AlicizationExecutionEventInput => ({
      id: `${thread.id}:codex:${executionRunId}:observer-diagnostic:${index + 1}`,
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'diagnostic',
        diagnosticType: 'execution-event-observer',
        status: 'degraded',
        message,
        executionRunId,
      },
      createdAt: stepBaseAt + progressEvents.length + index,
    })),
    ...assistantSegments.map((segment, index): AlicizationExecutionEventInput => ({
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'assistant',
        index,
        text: segment,
      },
      createdAt: stepBaseAt + index,
    })),
    ...stdoutSegments.map((segment, index): AlicizationExecutionEventInput => ({
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'stdout',
        index,
        text: segment,
      },
      createdAt: stepBaseAt + assistantSegments.length + index,
    })),
    ...stderrSegments.map((segment, index): AlicizationExecutionEventInput => ({
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'codex',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'stderr',
        index,
        text: segment,
      },
      createdAt: stepBaseAt + assistantSegments.length + stdoutSegments.length + index,
    })),
  ]

  if (runtimeResult.aborted) {
    const cancelAt = stepBaseAt + assistantSegments.length + stdoutSegments.length + stderrSegments.length
    return {
      ok: false,
      summary: 'Codex execution was cancelled because the kill switch changed while the process was running.',
      output: diagnosticOutput,
      externalSessionId,
      errorCode: runtimeResult.errorCode,
      errorMessage: runtimeResult.errorMessage,
      finalStatus: 'cancelled',
      events: [
        dispatchEvent,
        ...stepEvents,
        {
          threadId: thread.id,
          decisionTraceId: thread.decisionTraceId,
          turnId: thread.turnId,
          sessionId: thread.sessionId,
          origin: thread.origin,
          channel: 'codex',
          kind: 'cancel',
          threadStatus: 'cancelled',
          payload: {
            adapter: 'codex',
            hasRuntimeContext: spec.runtimeContext !== null,
            runtimeContext: spec.runtimeContext,
            promptPreview: spec.promptPreview,
            durationMs: runtimeResult.durationMs,
            errorCode: runtimeResult.errorCode,
            errorMessage: runtimeResult.errorMessage,
          },
          createdAt: cancelAt,
        },
      ],
    }
  }

  const hasAssistantOutput = Boolean(assistantOutput.trim())
  const emptyOutput = runtimeResult.ok
    && runtimeResult.exitCode === 0
    && !hasAssistantOutput
  const success = runtimeResult.ok
    && (runtimeResult.exitCode === 0 || runtimeResult.outputReady === true)
    && !emptyOutput
  const output = success
    ? assistantOutput.trim().slice(0, codexMaxPreviewChars)
    : diagnosticOutput
  const resultErrorCode = emptyOutput
    ? 'CODEX_EMPTY_OUTPUT'
    : runtimeResult.errorCode
  const resultErrorMessage = emptyOutput
    ? 'Codex exited successfully without producing an assistant response.'
    : runtimeResult.errorMessage
  const resultAt = stepBaseAt + assistantSegments.length + stdoutSegments.length + stderrSegments.length
  return {
    ok: success,
    summary: success
      ? normalizeText(assistantOutput || output, 220) || `Codex execution completed for ${normalizeText(thread.goal, 140) || 'the current task'}.`
      : buildFailureSummary(thread, resultErrorMessage ?? 'unknown error'),
    output,
    externalSessionId,
    errorCode: success ? undefined : resultErrorCode,
    errorMessage: success ? undefined : resultErrorMessage,
    finalStatus: success ? 'completed' : 'failed',
    events: [
      dispatchEvent,
      ...stepEvents,
      {
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: 'codex',
        kind: 'result',
        threadStatus: success ? 'completed' : 'failed',
        payload: {
          adapter: 'codex',
          hasRuntimeContext: spec.runtimeContext !== null,
          runtimeContext: spec.runtimeContext,
          promptPreview: spec.promptPreview,
          cwd: spec.cwd,
          timeoutMs: spec.timeoutMs,
          sandbox: spec.sandbox,
          model: spec.model,
          profile: spec.profile,
          durationMs: runtimeResult.durationMs,
          exitCode: runtimeResult.exitCode,
          signal: runtimeResult.signal,
          timedOut: runtimeResult.timedOut,
          timeoutKind: runtimeResult.timeoutKind ?? null,
          timedOutActiveWork: runtimeResult.timedOutActiveWork ?? null,
          outputReady: runtimeResult.outputReady === true,
          assistant: normalizeText(assistantOutput),
          stdout: normalizeText(runtimeResult.stdout),
          stderr: normalizeText(runtimeResult.stderr),
          errorCode: resultErrorCode,
          errorMessage: resultErrorMessage,
        },
        createdAt: resultAt,
      },
    ],
  }
}
