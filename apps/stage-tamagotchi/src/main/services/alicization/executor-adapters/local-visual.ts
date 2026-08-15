import type {
  AlicizationExecutionEventInput,
  AlicizationLocalVisualCommandInput,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import type {
  AlicizationLocalBrowserClickElementInput,
  AlicizationLocalBrowserNavigateInput,
  AlicizationLocalBrowserOpenUrlInput,
  AlicizationLocalBrowserReadPageInput,
  AlicizationLocalBrowserScrollInput,
  AlicizationLocalBrowserSearchWebInput,
  AlicizationLocalBrowserTypeTextInput,
  AlicizationLocalBrowserWaitInput,
  AlicizationLocalDesktopClickElementInput,
  AlicizationLocalDesktopListInteractablesInput,
  AlicizationLocalDesktopOpenApplicationInput,
  AlicizationLocalDesktopPressKeysInput,
  AlicizationLocalDesktopTypeTextInput,
  AlicizationLocalDesktopWaitInput,
} from '../local-browser-automation'
import type { AlicizationLocalDesktopInspectSceneInput } from '../local-desktop-inspection'

import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import { resolveAdapterFailureDisposition } from './failure-settlement'
import { resolveThreadPermissionMode } from './thread-permission'

type LocalVisualToolName
  = | 'browser_open_url'
    | 'browser_search_web'
    | 'browser_read_page'
    | 'browser_click_element'
    | 'browser_type_text'
    | 'browser_navigate'
    | 'browser_scroll'
    | 'browser_wait'
    | 'desktop_list_interactables'
    | 'desktop_click_element'
    | 'desktop_type_text'
    | 'desktop_press_keys'
    | 'desktop_open_application'
    | 'desktop_wait'

export interface AlicizationLocalVisualDispatchSurface {
  desktopInspectScene?: (input: AlicizationLocalDesktopInspectSceneInput) => Promise<unknown>
  browserOpenUrl?: (input: AlicizationLocalBrowserOpenUrlInput) => Promise<unknown>
  browserSearchWeb?: (input: AlicizationLocalBrowserSearchWebInput) => Promise<unknown>
  browserReadPage?: (input: AlicizationLocalBrowserReadPageInput) => Promise<unknown>
  browserClickElement?: (input: AlicizationLocalBrowserClickElementInput) => Promise<unknown>
  browserTypeText?: (input: AlicizationLocalBrowserTypeTextInput) => Promise<unknown>
  browserNavigate?: (input: AlicizationLocalBrowserNavigateInput) => Promise<unknown>
  browserScroll?: (input: AlicizationLocalBrowserScrollInput) => Promise<unknown>
  browserWait?: (input: AlicizationLocalBrowserWaitInput) => Promise<unknown>
  desktopListInteractables?: (input: AlicizationLocalDesktopListInteractablesInput) => Promise<unknown>
  desktopClickElement?: (input: AlicizationLocalDesktopClickElementInput) => Promise<unknown>
  desktopTypeText?: (input: AlicizationLocalDesktopTypeTextInput) => Promise<unknown>
  desktopPressKeys?: (input: AlicizationLocalDesktopPressKeysInput) => Promise<unknown>
  desktopOpenApplication?: (input: AlicizationLocalDesktopOpenApplicationInput) => Promise<unknown>
  desktopWait?: (input: AlicizationLocalDesktopWaitInput) => Promise<unknown>
}

export interface AlicizationLocalVisualAdapterInput {
  thread: AlicizationTaskThreadRecord
  channel: 'browser' | 'software' | 'desktop'
  command: AlicizationLocalVisualCommandInput
  surface: AlicizationLocalVisualDispatchSurface
  abortSignal?: AbortSignal
  now?: () => number
}

export interface AlicizationLocalVisualAdapterResult {
  ok: boolean
  summary: string
  output: string | null
  errorCode?: string
  errorMessage?: string
  sideEffectState?: LocalVisualSideEffectState
  finalStatus: AlicizationTaskThreadStatus
  events: AlicizationExecutionEventInput[]
}

interface LocalVisualActionExecutionResult {
  autoContinuation: Record<string, unknown>
  latestResult: Record<string, unknown> | null
}

type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'
type LocalVisualSideEffectState = 'unknown' | 'applied-unverified'

const supportedToolNames = new Set<LocalVisualToolName>([
  'browser_open_url',
  'browser_search_web',
  'browser_read_page',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'browser_scroll',
  'browser_wait',
  'desktop_list_interactables',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
  'desktop_wait',
])

const mutatingLocalVisualToolNames = new Set<LocalVisualToolName>([
  'browser_open_url',
  'browser_search_web',
  'browser_click_element',
  'browser_type_text',
  'browser_navigate',
  'desktop_click_element',
  'desktop_type_text',
  'desktop_press_keys',
  'desktop_open_application',
])

const deferredCodingAgentToolName = 'coding_agent'
const legacyCodingAgentNames = new Map<string, 'cli' | 'codex' | 'claude-code' | null>([
  ['executor_run_codex', 'codex'],
  ['executor_run_claude_code', 'claude-code'],
  ['executor_run_cli', 'cli'],
  ['executor_run_coding_agent', null],
])
const deferredCodingAgentToolNames = new Set([
  deferredCodingAgentToolName,
  ...legacyCodingAgentNames.keys(),
])

class LocalVisualAbortError extends Error {
  readonly sideEffectState?: 'unknown'

  constructor(
    message = 'Local visual host execution was cancelled.',
    sideEffectState?: 'unknown',
  ) {
    super(message)
    this.name = 'AbortError'
    this.sideEffectState = sideEffectState
  }
}

function resolveLocalVisualFailureDisposition(input: {
  cancelled: boolean
  sideEffectState: LocalVisualSideEffectState | undefined
  thread: AlicizationTaskThreadRecord
}) {
  return resolveAdapterFailureDisposition({
    effect: resolveThreadEffect(input.thread),
    failureKind: 'remote',
    cancelled: input.cancelled,
    sideEffectState: input.sideEffectState ?? 'none',
    replaySafety: input.sideEffectState ? 'unsafe' : 'unknown',
    retry: {
      attempted: 0,
      exhausted: false,
    },
    recovery: input.sideEffectState === 'applied-unverified'
      ? {
          attempted: true,
          outcome: 'exhausted',
        }
      : {
          attempted: false,
          outcome: 'pending',
        },
  })
}

function isAbortLikeError(error: unknown) {
  if (error instanceof LocalVisualAbortError)
    return true
  if (!error || typeof error !== 'object')
    return false

  const record = error as Record<string, unknown>
  return record.name === 'AbortError'
    || record.code === 'ABORT_ERR'
    || record.code === 'ERR_ABORTED'
}

function errorMessageFromLocalVisualHost(error: unknown) {
  if (error instanceof Error && error.message.trim())
    return error.message.trim()
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim())
      return message.trim()
  }
  return 'Local visual host execution failed.'
}

async function invokeLocalVisualHost<T>(input: {
  abortSignal?: AbortSignal
  invoke: () => Promise<T>
  mutation?: boolean
  operation: string
}): Promise<T | Record<string, unknown>> {
  if (input.abortSignal?.aborted)
    throw new LocalVisualAbortError()

  try {
    const value = await input.invoke()
    if (input.abortSignal?.aborted) {
      throw new LocalVisualAbortError(
        undefined,
        input.mutation ? 'unknown' : undefined,
      )
    }
    return value
  }
  catch (error) {
    if (input.abortSignal?.aborted || isAbortLikeError(error)) {
      throw new LocalVisualAbortError(
        errorMessageFromLocalVisualHost(error),
        error instanceof LocalVisualAbortError
          ? error.sideEffectState
          : undefined,
      )
    }

    const errorMessage = errorMessageFromLocalVisualHost(error)
    return {
      status: 'failed',
      operation: input.operation,
      errorCode: 'LOCAL_VISUAL_HOST_FAILED',
      errorMessage,
      output: errorMessage,
      ...(input.mutation ? { sideEffectState: 'unknown' } : {}),
    }
  }
}

const browserLikePagePhases = new Set([
  'login',
  'search-results',
  'social-feed',
  'form-entry',
  'upload-flow',
  'content-detail',
])

const safeAwaitHostInputToolNames = new Set<LocalVisualToolName>([
  'browser_read_page',
  'browser_type_text',
  'browser_wait',
  'desktop_list_interactables',
  'desktop_type_text',
  'desktop_wait',
])

const highImpactActionPattern = /publish|send|share|delete|remove|trash|erase|clear all|pay|payment|purchase|buy now|checkout|order now|transfer|withdraw|post now|create post|create thread|create topic|create discussion|start discussion|upload|发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|提现|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论|上传/iu
const nonUploadHighImpactActionPattern = /publish|send|share|delete|remove|trash|erase|clear all|pay|payment|purchase|buy now|checkout|order now|transfer|withdraw|post now|create post|create thread|create topic|create discussion|start discussion|发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|提现|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论/iu
const uploadBridgeActionPattern = /upload(?: image| photo| file)?|attach|choose file|select file|browse|media|上传图片|上传照片|上传文件|添加图片|添加照片|添加附件|选择图片|选择文件|选图|相册|图片|照片/u
const localVisualVisitedActionKeysField = '__localVisualVisitedActionKeys'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (value === undefined || value === null)
        return false
      if (Array.isArray(value) && value.length <= 0)
        return false
      return true
    }),
  ) as Record<string, unknown>
}

function sanitizeStringList(raw: unknown) {
  const normalized = Array.isArray(raw)
    ? raw.map(value => sanitizeText(value, 120)).filter(Boolean)
    : []
  return [...new Set(normalized)]
}

function asStringArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(value => sanitizeText(value, 120)).filter(Boolean)
    : []
}

function safeJsonStringify(raw: unknown) {
  try {
    return JSON.stringify(raw)
  }
  catch {
    return ''
  }
}

function normalizeAutoContinueStepCount(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return 1
  return Math.max(1, Math.min(3, Math.floor(raw)))
}

const localVisualOpaqueTextKeys = new Set([
  'command',
  'code',
  'filePath',
  'path',
  'script',
  'source',
  'url',
])

function isWordCharacter(value: string | undefined) {
  return Boolean(value && /\w/u.test(value))
}

function normalizeStandaloneCapabilityTokens(raw: string) {
  const legacyNames = [...legacyCodingAgentNames.keys()]
    .sort((left, right) => right.length - left.length)
  let normalized = ''
  let cursor = 0
  let insideInlineCode = false

  while (cursor < raw.length) {
    const character = raw[cursor]
    if (character === '`') {
      insideInlineCode = !insideInlineCode
      normalized += character
      cursor += 1
      continue
    }

    if (insideInlineCode) {
      normalized += character
      cursor += 1
      continue
    }

    const match = legacyNames.find(name => raw.startsWith(name, cursor))
    if (!match) {
      normalized += character
      cursor += 1
      continue
    }

    const previous = raw[cursor - 1]
    const next = raw[cursor + match.length]
    const isStandalone = !isWordCharacter(previous) && !isWordCharacter(next)
    const isPathSegment = previous === '/' || previous === '\\' || next === '/' || next === '\\'
    if (isStandalone && !isPathSegment) {
      normalized += deferredCodingAgentToolName
      cursor += match.length
      continue
    }

    normalized += match
    cursor += match.length
  }

  return normalized
}

export function normalizeLocalVisualCrossLayerValue(
  raw: unknown,
  memo = new WeakMap<object, unknown>(),
  opaqueText = false,
): unknown {
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(raw)
        return JSON.stringify(normalizeLocalVisualCrossLayerValue(parsed, new WeakMap()))
      }
      catch {
        // Fall through to exact legacy token projection for non-JSON text.
      }
    }
    return opaqueText ? raw : normalizeStandaloneCapabilityTokens(raw)
  }

  if (Array.isArray(raw)) {
    const existing = memo.get(raw)
    if (existing)
      return existing

    const normalized: unknown[] = []
    memo.set(raw, normalized)
    for (const value of raw)
      normalized.push(normalizeLocalVisualCrossLayerValue(value, memo))
    return normalized
  }

  const record = asRecord(raw)
  if (!record)
    return raw

  const existing = memo.get(record)
  if (existing)
    return existing

  const normalized: Record<string, unknown> = {}
  memo.set(record, normalized)
  const originalToolName = sanitizeText(record.toolName, 80)

  for (const [key, value] of Object.entries(record)) {
    if (key === 'toolName' && legacyCodingAgentNames.has(originalToolName)) {
      normalized[key] = deferredCodingAgentToolName
      continue
    }
    normalized[key] = normalizeLocalVisualCrossLayerValue(
      value,
      memo,
      typeof value === 'string' && localVisualOpaqueTextKeys.has(key),
    )
  }

  if (legacyCodingAgentNames.has(originalToolName)) {
    const agent = legacyCodingAgentNames.get(originalToolName)
    const argumentsRecord = asRecord(normalized.arguments)
    if (argumentsRecord) {
      if (agent)
        argumentsRecord.agent = agent
    }
    else {
      normalized.arguments = agent ? { agent } : {}
    }
  }

  return normalized
}

function extractSuggestedActionRecords(raw: unknown) {
  return Array.isArray(raw)
    ? raw
        .map(value => asRecord(normalizeLocalVisualCrossLayerValue(value)))
        .filter((value): value is Record<string, unknown> => Boolean(value))
    : []
}

function isImmediateRepeatedFollowUpAction(input: {
  currentPayload: Record<string, unknown>
  currentToolName: LocalVisualToolName
  suggestedAction: Record<string, unknown>
}) {
  const suggestedToolName = sanitizeText(input.suggestedAction.toolName, 80) as LocalVisualToolName
  if (suggestedToolName !== input.currentToolName)
    return false

  const suggestedArguments = asRecord(input.suggestedAction.arguments)
  if (input.currentToolName === 'desktop_press_keys') {
    return sanitizeText(suggestedArguments?.shortcut, 80).toLowerCase()
      === sanitizeText(input.currentPayload.shortcut, 80).toLowerCase()
  }

  if (input.currentToolName === 'desktop_open_application') {
    return sanitizeText(suggestedArguments?.appName, 160)
      === sanitizeText(input.currentPayload.appName, 160)
      && sanitizeText(suggestedArguments?.path, 320)
      === sanitizeText(input.currentPayload.path, 320)
  }

  if (input.currentToolName === 'browser_scroll') {
    const currentAction = sanitizeText(input.currentPayload.action, 80).toLowerCase() || 'down'
    const suggestedAction = sanitizeText(suggestedArguments?.action, 80).toLowerCase() || 'down'
    return currentAction === suggestedAction
  }

  if (input.currentToolName === 'browser_click_element') {
    const currentBrowser = sanitizeText(input.currentPayload.browser, 32).toLowerCase()
    const suggestedBrowser = sanitizeText(suggestedArguments?.browser, 32).toLowerCase()
    const currentText = sanitizeText(input.currentPayload.text, 160).toLowerCase()
    const suggestedText = sanitizeText(suggestedArguments?.text, 160).toLowerCase()
    const currentTargetType = sanitizeText(input.currentPayload.targetType, 80).toLowerCase()
    const suggestedTargetType = sanitizeText(suggestedArguments?.targetType, 80).toLowerCase()
    const currentSelector = sanitizeText(input.currentPayload.selector, 240)
    const suggestedSelector = sanitizeText(suggestedArguments?.selector, 240)
    const sameBrowser = !currentBrowser || !suggestedBrowser || currentBrowser === suggestedBrowser
    const sameSelector = Boolean(currentSelector || suggestedSelector) && currentSelector === suggestedSelector
    const sameVisibleTarget = Boolean(currentText || suggestedText)
      && currentText === suggestedText
      && (!currentTargetType || !suggestedTargetType || currentTargetType === suggestedTargetType)
    return sameBrowser && (sameSelector || sameVisibleTarget)
  }

  if (input.currentToolName === 'browser_navigate') {
    const currentAction = sanitizeText(input.currentPayload.action, 80).toLowerCase() || 'reload'
    const suggestedAction = sanitizeText(suggestedArguments?.action, 80).toLowerCase() || 'reload'
    const currentBrowser = sanitizeText(input.currentPayload.browser, 32).toLowerCase()
    const suggestedBrowser = sanitizeText(suggestedArguments?.browser, 32).toLowerCase()
    return currentAction === suggestedAction
      && (!currentBrowser || !suggestedBrowser || currentBrowser === suggestedBrowser)
  }

  return false
}

function buildRepeatableLocalVisualActionKey(toolName: LocalVisualToolName, payload: Record<string, unknown>) {
  if (toolName === 'browser_navigate') {
    const browser = sanitizeText(payload.browser, 32).toLowerCase()
    const action = sanitizeText(payload.action, 80).toLowerCase() || 'reload'
    return `browser_navigate:${browser}:${action}`
  }

  if (toolName === 'browser_click_element') {
    const browser = sanitizeText(payload.browser, 32).toLowerCase()
    const selector = sanitizeText(payload.selector, 240)
    if (selector)
      return `browser_click_element:${browser}:selector:${selector}`

    const text = sanitizeText(payload.text, 160).toLowerCase()
    const targetType = sanitizeText(payload.targetType, 80).toLowerCase()
    return text ? `browser_click_element:${browser}:text:${targetType}:${text}` : null
  }

  if (toolName === 'browser_scroll') {
    const browser = sanitizeText(payload.browser, 32).toLowerCase()
    const action = sanitizeText(payload.action, 80).toLowerCase() || 'down'
    return `browser_scroll:${browser}:${action}`
  }

  if (toolName === 'desktop_press_keys') {
    const shortcut = sanitizeText(payload.shortcut, 80).toLowerCase()
    return shortcut ? `desktop_press_keys:${shortcut}` : null
  }

  if (toolName === 'desktop_open_application') {
    const appName = sanitizeText(payload.appName, 160).toLowerCase()
    const path = sanitizeText(payload.path, 320).toLowerCase()
    return appName || path ? `desktop_open_application:${appName}:${path}` : null
  }

  return null
}

function readVisitedLocalVisualActionKeys(payload: Record<string, unknown>) {
  return new Set(asStringArray(payload[localVisualVisitedActionKeysField]))
}

function stripLocalVisualInternalArguments(payload: Record<string, unknown>) {
  if (!(localVisualVisitedActionKeysField in payload))
    return payload

  const next = { ...payload }
  delete next[localVisualVisitedActionKeysField]
  return next
}

function matchesHighImpactActionPattern(...fields: unknown[]) {
  const combined = fields
    .map(field => sanitizeText(field, 200))
    .filter(Boolean)
    .join(' ')
  return Boolean(combined) && highImpactActionPattern.test(combined)
}

function isLowRiskBrowserDesktopHandoffBridgeAction(action: Record<string, unknown>) {
  const toolName = sanitizeText(action.toolName, 80)
  const argumentsRecord = asRecord(action.arguments)
  if (toolName !== 'browser_click_element')
    return false

  if (sanitizeText(argumentsRecord?.expectedPhase, 80) !== 'browser-desktop-handoff')
    return false

  const bridgeTargetCombined = [
    argumentsRecord?.text,
    argumentsRecord?.targetText,
  ]
    .map(field => sanitizeText(field, 200))
    .filter(Boolean)
    .join(' ')

  const fallbackCombined = [
    bridgeTargetCombined,
    action.title,
  ]
    .map(field => sanitizeText(field, 200))
    .filter(Boolean)
    .join(' ')

  if (!fallbackCombined || !uploadBridgeActionPattern.test(fallbackCombined))
    return false

  const highImpactCheckTarget = bridgeTargetCombined || fallbackCombined
  return !nonUploadHighImpactActionPattern.test(highImpactCheckTarget)
}

function isHighImpactAutoContinuationAction(action: Record<string, unknown>) {
  const toolName = sanitizeText(action.toolName, 80)
  const argumentsRecord = asRecord(action.arguments)
  if (toolName === 'browser_click_element' || toolName === 'desktop_click_element') {
    const expectedPhase = sanitizeText(argumentsRecord?.expectedPhase, 80)
    if (expectedPhase === 'form-entry')
      return false
    if (isLowRiskBrowserDesktopHandoffBridgeAction(action))
      return false
    if (toolName === 'desktop_click_element' && expectedPhase === 'upload-flow')
      return false
    return matchesHighImpactActionPattern(
      argumentsRecord?.text,
      argumentsRecord?.targetText,
      argumentsRecord?.inspectionQuestion,
      action.title,
      action.rationale,
    )
  }

  if (toolName !== 'browser_type_text' && toolName !== 'desktop_type_text')
    return false

  if (argumentsRecord?.submit !== true)
    return false

  return matchesHighImpactActionPattern(
    action.title,
    argumentsRecord?.inspectionQuestion,
    argumentsRecord?.targetText,
    argumentsRecord?.text,
    action.rationale,
  )
}

function normalizeLocalToolResult(raw: unknown, operation: string) {
  return asRecord(normalizeLocalVisualCrossLayerValue(raw)) ?? {
    status: 'completed',
    operation,
    result: normalizeLocalVisualCrossLayerValue(raw),
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

  const value = (metadataTask as Record<string, unknown>)[key]
  return typeof value === 'string'
    ? value.trim().slice(0, 80) || null
    : null
}

function buildBlockedDispatchSafetyGate(thread: AlicizationTaskThreadRecord, errorCode: string) {
  if (errorCode !== 'LOCAL_VISUAL_PERMISSION_REQUIRED')
    return null

  const effect = resolveThreadEffect(thread)
  const permissionMode = resolveThreadPermissionMode(thread)
  const riskPolicy = effect === 'high-impact'
    ? 'explicit-confirmation-required'
    : 'implicit-or-explicit-confirmation-required'

  return {
    effect,
    permissionMode,
    riskBudget: readTaskMetadataText(thread, 'riskBudget'),
    justification: readTaskMetadataText(thread, 'justification'),
    confirmationRequired: true,
    riskPolicy,
    auditability: 'blocked-before-local-visual-dispatch',
    interruptibility: 'no-network-request-started',
  }
}

function buildFailureSummary(thread: AlicizationTaskThreadRecord, message: string) {
  const goal = sanitizeText(thread.goal, 140) || 'the current GUI task'
  const reason = sanitizeText(message, 200) || 'unknown error'
  return `Local visual execution failed for ${goal}: ${reason}`
}

function buildLocalVisualCommandSpec(input: AlicizationLocalVisualAdapterInput) {
  if (!input.surface.desktopInspectScene) {
    return {
      ok: false as const,
      errorCode: 'LOCAL_VISUAL_SURFACE_UNAVAILABLE',
      errorMessage: 'Local desktop inspection surface is not configured for GUI task-thread dispatch.',
    }
  }

  const permissionMode = resolveThreadPermissionMode(input.thread)
  const effect = resolveThreadEffect(input.thread)
  if (effect === 'high-impact' && permissionMode !== 'explicit') {
    return {
      ok: false as const,
      errorCode: 'LOCAL_VISUAL_PERMISSION_REQUIRED',
      errorMessage: 'High-impact local visual dispatch requires explicit permission before execution.',
    }
  }
  if (effect === 'mutate' && permissionMode === 'none') {
    return {
      ok: false as const,
      errorCode: 'LOCAL_VISUAL_PERMISSION_REQUIRED',
      errorMessage: 'Mutating local visual dispatch requires at least implicit permission before execution.',
    }
  }

  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
  const instruction = sanitizeText(input.command.instruction, 2_000)
    || sanitizeText(input.thread.goal, 2_000)
  if (!instruction) {
    return {
      ok: false as const,
      errorCode: 'LOCAL_VISUAL_INSTRUCTION_REQUIRED',
      errorMessage: 'Local visual dispatch requires an embodied instruction or resumable thread goal.',
    }
  }

  return {
    ok: true as const,
    spec: {
      instruction,
      instructionPreview: sanitizeText(instruction, 220),
      runtimeContext,
    },
  }
}

function resolveInitialAutoContinuationRequested(input: AlicizationLocalVisualAdapterInput) {
  if (resolveThreadEffect(input.thread) === 'observe')
    return false

  const meta = asRecord(input.command.meta)
  return meta?.autoContinueSuggestedActions !== false
}

function resolveInitialAutoContinuationStepCount(command: AlicizationLocalVisualCommandInput) {
  const meta = asRecord(command.meta)
  return normalizeAutoContinueStepCount(meta?.maxAutoContinueSteps)
}

function collectAutoContinuationSummaryLines(
  autoContinuation: Record<string, unknown>,
  seen = new Set<string>(),
) {
  const lines: string[] = []
  const pushLine = (line: string) => {
    if (!line || seen.has(line))
      return
    seen.add(line)
    lines.push(line)
  }

  if (sanitizeText(autoContinuation.stoppedReason, 120) === 'high-impact-action-requires-confirmation')
    pushLine('Auto-continuation paused before a high-impact action requiring confirmation.')

  const executedSteps = Array.isArray(autoContinuation.executedSteps)
    ? autoContinuation.executedSteps.filter(value => Boolean(asRecord(value)))
    : []
  const executedToolNames = executedSteps
    .map(step => sanitizeText(asRecord(step)?.toolName, 80))
    .filter(Boolean)

  if (executedToolNames.length > 0)
    pushLine(`Auto-continued with ${executedToolNames.join(', ')}.`)

  for (const step of executedSteps) {
    const nestedAutoContinuation = asRecord(asRecord(asRecord(step)?.result)?.autoContinuation)
    if (!nestedAutoContinuation)
      continue
    lines.push(...collectAutoContinuationSummaryLines(nestedAutoContinuation, seen))
  }

  return lines
}

function buildAutoContinuationSummary(autoContinuation: Record<string, unknown>) {
  return collectAutoContinuationSummaryLines(autoContinuation).join(' ')
}

function buildLocalVisualActionVerificationFailure(input: {
  actionResult: Record<string, unknown>
  failureField: 'autoWaitResult' | 'postActionInspection'
  failureResult: Record<string, unknown>
  toolName: LocalVisualToolName
  workflowContinuation: Record<string, unknown>
}) {
  const errorCode = sanitizeText(input.failureResult.errorCode, 80) || 'LOCAL_VISUAL_FAILED'
  const errorMessage = sanitizeText(input.failureResult.errorMessage, 220)
    || sanitizeText(input.failureResult.summary, 220)
    || 'Local visual action verification failed.'
  const autoWaitResult = input.failureField === 'autoWaitResult'
    ? input.failureResult
    : undefined
  const postActionInspection = input.failureField === 'postActionInspection'
    ? input.failureResult
    : null
  const output = safeJsonStringify(compactRecord({
    actionResult: input.actionResult,
    autoWaitResult,
    postActionInspection,
    workflowContinuation: input.workflowContinuation,
  })) || null

  return {
    ...input.actionResult,
    status: 'failed',
    errorCode,
    errorMessage,
    ...(mutatingLocalVisualToolNames.has(input.toolName)
      ? { sideEffectState: 'applied-unverified' }
      : {}),
    actionResult: input.actionResult,
    autoWaitResult,
    postActionInspection,
    workflowContinuation: input.workflowContinuation,
    output,
  }
}

async function maybeFollowUpLocalVisualAction(input: {
  abortSignal?: AbortSignal
  commandRuntimeContext: AlicizationLocalVisualCommandInput['runtimeContext']
  payload: Record<string, unknown>
  result: Record<string, unknown>
  surface: AlicizationLocalVisualDispatchSurface
  thread: AlicizationTaskThreadRecord
  toolName: LocalVisualToolName
}): Promise<Record<string, unknown>> {
  const status = sanitizeText(input.result.status, 60).toLowerCase()
  const expectedPhase = sanitizeText(input.payload.expectedPhase, 80)
  const reinspectAfterAction = input.payload.reinspectAfterAction === true
  const inspectionQuestionCandidate = sanitizeText(input.payload.inspectionQuestion, 220)
  const autoContinueSuggestedActions = input.payload.autoContinueSuggestedActions === true
  const entryWorkflowOperation = input.toolName === 'browser_open_url'
    || input.toolName === 'browser_search_web'
    || input.toolName === 'browser_navigate'
    || input.toolName === 'desktop_press_keys'
    || input.toolName === 'desktop_open_application'
  const shouldInspectAfterAction = entryWorkflowOperation
    ? (reinspectAfterAction || autoContinueSuggestedActions || Boolean(inspectionQuestionCandidate))
    : Boolean(inspectionQuestionCandidate)
      || (Boolean(expectedPhase) && reinspectAfterAction)
      || autoContinueSuggestedActions
  if (status !== 'completed' || !shouldInspectAfterAction || !input.surface.desktopInspectScene)
    return input.result

  let autoWaitResult: Record<string, unknown> | null = null
  const shouldAutoWait = input.toolName === 'browser_click_element'
    || input.toolName === 'browser_open_url'
    || input.toolName === 'browser_search_web'
    || input.toolName === 'browser_navigate'
    || (input.toolName === 'browser_type_text' && input.payload.submit === true)
  if (shouldAutoWait && input.surface.browserWait) {
    autoWaitResult = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: 'browser_wait',
      invoke: async () => await input.surface.browserWait!({
        abortSignal: input.abortSignal,
        browser: sanitizeText(input.payload.browser, 32) || undefined,
        state: 'complete',
        timeoutMs: 5_000,
      }),
    }), 'browser_wait')
    const waitStatus = sanitizeText(autoWaitResult.status, 60).toLowerCase()
    if (waitStatus && waitStatus !== 'completed') {
      const workflowContinuation = compactRecord({
        expectedPhase: expectedPhase || undefined,
        autoWaitApplied: true,
        autoWaitStatus: waitStatus,
      })
      return buildLocalVisualActionVerificationFailure({
        actionResult: input.result,
        failureField: 'autoWaitResult',
        failureResult: autoWaitResult,
        toolName: input.toolName,
        workflowContinuation,
      })
    }
  }

  const inspectionMaxSuggestedActionsRaw = input.payload.inspectionMaxSuggestedActions
  const inspectionMaxSuggestedActions = typeof inspectionMaxSuggestedActionsRaw === 'number' && Number.isFinite(inspectionMaxSuggestedActionsRaw)
    ? Math.max(1, Math.floor(inspectionMaxSuggestedActionsRaw))
    : 3

  const inspectionResultRaw = await invokeLocalVisualHost({
    abortSignal: input.abortSignal,
    operation: 'desktop_inspect_scene',
    invoke: async () => await input.surface.desktopInspectScene!({
      abortSignal: input.abortSignal,
      question: inspectionQuestionCandidate || undefined,
      forceRefresh: true,
      maxSuggestedActions: inspectionMaxSuggestedActions,
    }),
  })
  const postActionInspection = asRecord(
    normalizeLocalVisualCrossLayerValue(inspectionResultRaw),
  ) ?? {}
  const postActionInspectionStatus = sanitizeText(postActionInspection.status, 60).toLowerCase()
  if (postActionInspectionStatus && postActionInspectionStatus !== 'completed') {
    return buildLocalVisualActionVerificationFailure({
      actionResult: input.result,
      failureField: 'postActionInspection',
      failureResult: postActionInspection,
      toolName: input.toolName,
      workflowContinuation: compactRecord({
        expectedPhase: expectedPhase || undefined,
        autoWaitApplied: shouldAutoWait,
        autoWaitStatus: sanitizeText(autoWaitResult?.status, 80) || undefined,
        postActionInspectionStatus,
      }),
    })
  }
  const observedPhase = sanitizeText(postActionInspection.pagePhase, 80) || undefined
  const nextActionIntent = sanitizeText(postActionInspection.nextActionIntent, 80) || undefined
  const browserPageContext = asRecord(postActionInspection.browserPageContext)
  const workflowPlan = asRecord(postActionInspection.workflowPlan)
  const blockingSignals = sanitizeStringList(postActionInspection.blockingSignals)
  const executionStrategy = asRecord(postActionInspection.executionStrategy)
  const visitedActionKeys = readVisitedLocalVisualActionKeys(input.payload)
  const inspectedSuggestedActions = extractSuggestedActionRecords(postActionInspection.suggestedActions)
    .filter(action => !isImmediateRepeatedFollowUpAction({
      currentPayload: input.payload,
      currentToolName: input.toolName,
      suggestedAction: action,
    }))
    .filter((action) => {
      const toolName = sanitizeText(action.toolName, 80) as LocalVisualToolName
      const actionArguments = asRecord(action.arguments) ?? {}
      const actionKey = buildRepeatableLocalVisualActionKey(toolName, actionArguments)
      return !actionKey || !visitedActionKeys.has(actionKey)
    })
  const matchedExpectedPhase = expectedPhase
    ? Boolean(observedPhase && observedPhase === expectedPhase)
    : undefined
  const hasExecutableSuggestedAction = inspectedSuggestedActions.some(action => Boolean(sanitizeText(action.toolName, 80)))
  const navigationLikeBrowserFollowUp = input.toolName === 'browser_click_element'
    || input.toolName === 'browser_open_url'
    || input.toolName === 'browser_search_web'
    || input.toolName === 'browser_navigate'
    || input.toolName === 'browser_scroll'
    || input.toolName === 'browser_wait'
    || (input.toolName === 'browser_type_text' && input.payload.submit === true)
  const noExecutableSuggestedActions = !inspectedSuggestedActions.length || !hasExecutableSuggestedAction
  const browserFollowUpRecommended = sanitizeText(executionStrategy?.recommendedChannel, 80) === 'browser'
    || Boolean(browserPageContext)
    || Boolean(observedPhase && browserLikePagePhases.has(observedPhase))
  const shouldFallbackToDesktopRelist = noExecutableSuggestedActions
    && (input.toolName === 'desktop_click_element'
      || input.toolName === 'desktop_type_text'
      || input.toolName === 'desktop_press_keys'
      || input.toolName === 'desktop_open_application')
    && reinspectAfterAction
    && autoContinueSuggestedActions
    && (!expectedPhase || matchedExpectedPhase === true)
    && Boolean(input.surface.desktopListInteractables)
  const shouldFallbackToBrowserRead = noExecutableSuggestedActions
    && navigationLikeBrowserFollowUp
    && reinspectAfterAction
    && autoContinueSuggestedActions
    && (!expectedPhase || matchedExpectedPhase === true)
    && browserFollowUpRecommended
    && Boolean(input.surface.browserReadPage)
  const suggestedActions = shouldFallbackToDesktopRelist
    ? [
        {
          kind: 'desktop-relist-after-follow-up-click',
          title: '重新列出当前桌面控件确认最新状态',
          rationale: '点击桌面控件后，当前重检还没有稳定暴露出后续动作。先重新列出前台控件，确认设置是否已经生效，或者界面是否进入了新的稳定场景。',
          toolName: 'desktop_list_interactables',
          arguments: compactRecord({
            maxItems: 12,
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: inspectionQuestionCandidate || undefined,
            inspectionMaxSuggestedActions,
          }),
        } satisfies Record<string, unknown>,
      ]
    : shouldFallbackToBrowserRead
      ? [
            {
              kind: 'browser-reread-after-follow-up-action',
              title: '读取当前页面正文确认最新状态',
              rationale: '浏览器动作后的重检还没有稳定给出下一步可执行动作。先低风险读取当前页面正文和状态，再决定是否继续点击、翻页或转入别的桥接步骤。',
              toolName: 'browser_read_page',
              arguments: compactRecord({
                browser: sanitizeText(input.payload.browser, 32) || sanitizeText(browserPageContext?.browser, 32) || undefined,
                format: 'text',
                autoContinueSuggestedActions: true,
                reinspectAfterAction: true,
                inspectionQuestion: inspectionQuestionCandidate || undefined,
                inspectionMaxSuggestedActions,
                maxAutoContinueSteps: 1,
              }),
            } satisfies Record<string, unknown>,
        ]
      : inspectedSuggestedActions
  const continuationSummary = expectedPhase
    ? matchedExpectedPhase
      ? `Workflow advanced to ${observedPhase} after follow-up inspection.`
      : observedPhase
        ? `Workflow re-inspected after action and observed ${observedPhase} instead of ${expectedPhase}.`
        : `Workflow re-inspection did not confirm ${expectedPhase}.`
    : observedPhase
      ? `Workflow inspected after action and observed ${observedPhase}.`
      : 'Workflow inspection after action did not detect a stable phase.'
  const workflowContinuation = compactRecord({
    expectedPhase: expectedPhase || undefined,
    observedPhase,
    matchedExpectedPhase,
    autoWaitApplied: shouldAutoWait,
    autoWaitStatus: sanitizeText(autoWaitResult?.status, 80) || undefined,
  })

  const outputPayload = compactRecord({
    output: input.result.output,
    pagePhase: observedPhase,
    nextActionIntent,
    workflowPlan,
    blockingSignals,
    suggestedActions,
    workflowContinuation,
    postActionInspection,
  })

  const mergedResult = compactRecord({
    ...input.result,
    pagePhase: observedPhase,
    nextActionIntent,
    workflowPlan,
    blockingSignals,
    suggestedActions,
    summary: [sanitizeText(input.result.summary, 220), continuationSummary, sanitizeText(postActionInspection.summary, 220)]
      .filter(Boolean)
      .join(' '),
    workflowContinuation,
    postActionInspection,
    output: safeJsonStringify(outputPayload) || null,
  })

  const shouldAutoContinue = autoContinueSuggestedActions && (expectedPhase ? matchedExpectedPhase === true : true)
  if (!shouldAutoContinue)
    return mergedResult

  const continuation = await executeAutoContinuation({
    abortSignal: input.abortSignal,
    commandRuntimeContext: input.commandRuntimeContext,
    continuationMode: sanitizeText(workflowPlan?.continuationMode, 80) || undefined,
    blockingSignals,
    maxSteps: normalizeAutoContinueStepCount(input.payload.maxAutoContinueSteps),
    suggestedActions,
    surface: input.surface,
    thread: input.thread,
    visitedActionKeys,
  })
  const continuationSummaryText = buildAutoContinuationSummary(continuation.autoContinuation)
  const nextOutputPayload = compactRecord({
    ...outputPayload,
    autoContinuation: continuation.autoContinuation,
  })

  return compactRecord({
    ...mergedResult,
    autoContinuation: continuation.autoContinuation,
    summary: [
      sanitizeText(mergedResult.summary, 220),
      continuationSummaryText,
    ].filter(Boolean).join(' '),
    output: safeJsonStringify(nextOutputPayload) || null,
  })
}

async function executeLocalVisualAction(input: {
  action: Record<string, unknown>
  abortSignal?: AbortSignal
  commandRuntimeContext: AlicizationLocalVisualCommandInput['runtimeContext']
  remainingStepsAfterThis: number
  surface: AlicizationLocalVisualDispatchSurface
  thread: AlicizationTaskThreadRecord
  visitedActionKeys: Set<string>
}): Promise<Record<string, unknown> | null> {
  const toolName = sanitizeText(input.action.toolName, 80) as LocalVisualToolName
  if (!supportedToolNames.has(toolName))
    return null

  const argumentsRecord = asRecord(input.action.arguments) ?? {}
  const recursiveArgumentsBase = input.remainingStepsAfterThis > 0
    ? {
        ...argumentsRecord,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: input.remainingStepsAfterThis,
      }
    : argumentsRecord
  const recursiveArguments = input.visitedActionKeys.size > 0
    ? {
        ...recursiveArgumentsBase,
        [localVisualVisitedActionKeysField]: [...input.visitedActionKeys],
      }
    : recursiveArgumentsBase
  const toolArguments = stripLocalVisualInternalArguments(recursiveArguments)

  if (toolName === 'browser_read_page' && input.surface.browserReadPage) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: toolName,
      invoke: async () => await input.surface.browserReadPage!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalBrowserReadPageInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_open_url' && input.surface.browserOpenUrl) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.browserOpenUrl!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalBrowserOpenUrlInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_search_web' && input.surface.browserSearchWeb) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.browserSearchWeb!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as unknown as AlicizationLocalBrowserSearchWebInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_click_element' && input.surface.browserClickElement) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.browserClickElement!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalBrowserClickElementInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_type_text' && input.surface.browserTypeText) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.browserTypeText!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as unknown as AlicizationLocalBrowserTypeTextInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_navigate' && input.surface.browserNavigate) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.browserNavigate!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as unknown as AlicizationLocalBrowserNavigateInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_scroll' && input.surface.browserScroll) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: toolName,
      invoke: async () => await input.surface.browserScroll!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as unknown as AlicizationLocalBrowserScrollInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'browser_wait' && input.surface.browserWait) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: toolName,
      invoke: async () => await input.surface.browserWait!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalBrowserWaitInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_list_interactables' && input.surface.desktopListInteractables) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: toolName,
      invoke: async () => await input.surface.desktopListInteractables!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalDesktopListInteractablesInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_click_element' && input.surface.desktopClickElement) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.desktopClickElement!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalDesktopClickElementInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_type_text' && input.surface.desktopTypeText) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.desktopTypeText!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as unknown as AlicizationLocalDesktopTypeTextInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_press_keys' && input.surface.desktopPressKeys) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.desktopPressKeys!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalDesktopPressKeysInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_open_application' && input.surface.desktopOpenApplication) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      mutation: true,
      operation: toolName,
      invoke: async () => await input.surface.desktopOpenApplication!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalDesktopOpenApplicationInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  if (toolName === 'desktop_wait' && input.surface.desktopWait) {
    const result = normalizeLocalToolResult(await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: toolName,
      invoke: async () => await input.surface.desktopWait!({
        ...toolArguments,
        abortSignal: input.abortSignal,
      } as AlicizationLocalDesktopWaitInput),
    }), toolName)
    return await maybeFollowUpLocalVisualAction({
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      payload: recursiveArguments,
      result,
      surface: input.surface,
      thread: input.thread,
      toolName,
    })
  }
  return null
}

async function executeAutoContinuation(input: {
  abortSignal?: AbortSignal
  commandRuntimeContext: AlicizationLocalVisualCommandInput['runtimeContext']
  continuationMode?: string
  blockingSignals: string[]
  maxSteps: number
  suggestedActions: Array<Record<string, unknown>>
  surface: AlicizationLocalVisualDispatchSurface
  thread: AlicizationTaskThreadRecord
  visitedActionKeys?: Set<string>
}): Promise<LocalVisualActionExecutionResult> {
  const awaitingHostInput = input.continuationMode === 'await-host-input'
    || input.blockingSignals.includes('awaiting-input')
  const executedSteps: Array<Record<string, unknown>> = []
  let stoppedReason = 'no-suggested-actions'
  let currentSuggestedActions = [...input.suggestedActions]
  let remainingSteps = input.maxSteps
  let latestResult: Record<string, unknown> | null = null
  let deferredSuggestedActions: Array<Record<string, unknown>> = []
  const visitedActionKeys = new Set(input.visitedActionKeys ?? [])

  while (remainingSteps > 0) {
    const candidateIndex = currentSuggestedActions.findIndex((action) => {
      const toolName = sanitizeText(action.toolName, 80) as LocalVisualToolName
      if (!toolName || !supportedToolNames.has(toolName))
        return false
      const actionKey = buildRepeatableLocalVisualActionKey(toolName, asRecord(action.arguments) ?? {})
      return !actionKey || !visitedActionKeys.has(actionKey)
    })
    if (candidateIndex < 0) {
      deferredSuggestedActions = currentSuggestedActions
        .filter(action => deferredCodingAgentToolNames.has(sanitizeText(action.toolName, 80)))
        .map(action => compactRecord({
          toolName: deferredCodingAgentToolName,
          title: sanitizeText(action.title, 160),
          rationale: sanitizeText(action.rationale, 320),
          arguments: asRecord(action.arguments) ?? undefined,
        }))
      stoppedReason = executedSteps.length > 0
        ? 'no-follow-up-action'
        : deferredSuggestedActions.length > 0
          ? 'executor-continuation-deferred-to-model'
          : 'no-suggested-actions'
      break
    }

    const [candidate] = currentSuggestedActions.splice(candidateIndex, 1)
    if (!candidate) {
      stoppedReason = executedSteps.length > 0
        ? 'no-follow-up-action'
        : 'no-suggested-actions'
      break
    }

    const candidateToolName = sanitizeText(candidate.toolName, 80) as LocalVisualToolName
    if (awaitingHostInput && !safeAwaitHostInputToolNames.has(candidateToolName)) {
      stoppedReason = 'await-host-input'
      break
    }
    if (isHighImpactAutoContinuationAction(candidate)) {
      stoppedReason = 'high-impact-action-requires-confirmation'
      break
    }

    const candidateArguments = asRecord(candidate.arguments) ?? {}
    const candidateActionKey = buildRepeatableLocalVisualActionKey(candidateToolName, candidateArguments)
    if (candidateActionKey)
      visitedActionKeys.add(candidateActionKey)

    const result = await executeLocalVisualAction({
      action: candidate,
      abortSignal: input.abortSignal,
      commandRuntimeContext: input.commandRuntimeContext,
      remainingStepsAfterThis: remainingSteps - 1,
      surface: input.surface,
      thread: input.thread,
      visitedActionKeys,
    })
    if (!result) {
      stoppedReason = 'unsupported-action'
      break
    }

    latestResult = result
    executedSteps.push(compactRecord({
      toolName: sanitizeText(candidate.toolName, 80),
      title: sanitizeText(candidate.title, 160),
      rationale: sanitizeText(candidate.rationale, 320),
      result,
    }))

    const resultWorkflowPlan = asRecord(result.workflowPlan)
    const resultBlockingSignals = sanitizeStringList(result.blockingSignals)
    const shouldPauseForHostInput = sanitizeText(resultWorkflowPlan?.continuationMode, 80) === 'await-host-input'
      || resultBlockingSignals.includes('awaiting-input')
    if (shouldPauseForHostInput) {
      stoppedReason = 'await-host-input'
      break
    }

    const countsAgainstBudget = candidateToolName !== 'desktop_wait' && candidateToolName !== 'browser_wait'
    if (countsAgainstBudget)
      remainingSteps -= 1

    if (countsAgainstBudget && remainingSteps <= 0) {
      stoppedReason = 'step-limit-reached'
      break
    }

    const nestedAutoContinuation = asRecord(result.autoContinuation)
    const nestedExecutedSteps = Array.isArray(nestedAutoContinuation?.executedSteps)
      ? nestedAutoContinuation.executedSteps.filter(value => Boolean(asRecord(value)))
      : []
    const nestedStoppedReason = sanitizeText(nestedAutoContinuation?.stoppedReason, 80)
    const nestedContinuationConsumedSuggestedActions
      = nestedExecutedSteps.length > 0
        || nestedStoppedReason === 'await-host-input'
        || nestedStoppedReason === 'high-impact-action-requires-confirmation'
    if (!nestedContinuationConsumedSuggestedActions) {
      const nextSuggestedActions = extractSuggestedActionRecords(result.suggestedActions)
      if (nextSuggestedActions.length > 0)
        currentSuggestedActions = nextSuggestedActions
    }

    if (currentSuggestedActions.length <= 0) {
      stoppedReason = 'no-follow-up-action'
      break
    }
  }

  return {
    autoContinuation: compactRecord({
      requested: true,
      maxSteps: input.maxSteps,
      stoppedReason,
      executedSteps,
      deferredSuggestedActions,
    }),
    latestResult,
  }
}

function buildStepPayload(input: {
  instructionPreview: string
  resultRecord: Record<string, unknown>
  autoContinuation?: Record<string, unknown> | null
}) {
  return compactRecord({
    instruction: input.instructionPreview,
    transportChannel: 'local-visual',
    pagePhase: sanitizeText(input.resultRecord.pagePhase, 80) || null,
    nextActionIntent: sanitizeText(input.resultRecord.nextActionIntent, 80) || null,
    workflowPlan: asRecord(input.resultRecord.workflowPlan) ?? input.resultRecord.workflowPlan ?? null,
    suggestedActions: extractSuggestedActionRecords(input.resultRecord.suggestedActions),
    blockingSignals: sanitizeStringList(input.resultRecord.blockingSignals),
    autoContinuation: input.autoContinuation ?? asRecord(input.resultRecord.autoContinuation) ?? undefined,
  })
}

function buildSuccessfulLocalVisualResult(input: {
  thread: AlicizationTaskThreadRecord
  channel: 'browser' | 'software' | 'desktop'
  instructionPreview: string
  resultRecord: Record<string, unknown>
  autoContinuation?: Record<string, unknown> | null
}) {
  const stepPayload = buildStepPayload({
    instructionPreview: input.instructionPreview,
    resultRecord: input.resultRecord,
    autoContinuation: input.autoContinuation,
  })
  const outputPayload = compactRecord({
    output: input.resultRecord.output ?? null,
    pagePhase: stepPayload.pagePhase ?? null,
    nextActionIntent: stepPayload.nextActionIntent ?? null,
    workflowPlan: stepPayload.workflowPlan ?? null,
    suggestedActions: stepPayload.suggestedActions ?? [],
    blockingSignals: stepPayload.blockingSignals ?? [],
    autoContinuation: stepPayload.autoContinuation ?? undefined,
  })
  const rawOutputString = typeof input.resultRecord.output === 'string'
    ? input.resultRecord.output
    : ''
  const outputSnippet = rawOutputString.startsWith('{') || rawOutputString.startsWith('[')
    ? ''
    : sanitizeText(rawOutputString, 160)
  const autoContinuationSummary = input.autoContinuation
    ? buildAutoContinuationSummary(input.autoContinuation)
    : ''
  const baseSummary = sanitizeText(input.resultRecord.summary, 220) || `Local ${input.channel} visual dispatch completed.`
  const summary = [
    baseSummary && outputSnippet && !baseSummary.includes(outputSnippet)
      ? `${baseSummary} ${outputSnippet}`.trim()
      : baseSummary,
    autoContinuationSummary,
  ].filter(Boolean).join(' ')
  const output = safeJsonStringify(outputPayload) || safeJsonStringify(input.resultRecord) || null

  return {
    ok: true,
    summary,
    output,
    finalStatus: 'completed' as const,
    stepPayload,
  }
}

export async function executeLocalVisualTaskThread(
  input: AlicizationLocalVisualAdapterInput,
): Promise<AlicizationLocalVisualAdapterResult> {
  const now = input.now ?? Date.now
  const thread = input.thread
  const normalized = buildLocalVisualCommandSpec(input)
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
        channel: input.channel,
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          adapter: 'local-visual',
          transportChannel: 'local-visual',
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

  if (input.abortSignal?.aborted) {
    const createdAt = now()
    return {
      ok: false,
      summary: 'Local visual execution was cancelled before dispatch began.',
      output: null,
      errorCode: 'LOCAL_VISUAL_ABORTED',
      errorMessage: 'Dispatch aborted before local GUI execution started.',
      finalStatus: 'cancelled',
      events: [{
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: input.channel,
        kind: 'cancel',
        threadStatus: 'cancelled',
        payload: {
          adapter: 'local-visual',
          transportChannel: 'local-visual',
        },
        createdAt,
      }],
    }
  }

  const spec = normalized.spec
  const dispatchCreatedAt = now()
  const dispatchEvent: AlicizationExecutionEventInput = {
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: input.channel,
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      instruction: spec.instructionPreview,
      transportChannel: 'local-visual',
      inspectionSurface: 'desktop_inspect_scene',
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
    },
    createdAt: dispatchCreatedAt,
  }

  let rawInspectionResult: unknown
  try {
    rawInspectionResult = await invokeLocalVisualHost({
      abortSignal: input.abortSignal,
      operation: 'desktop_inspect_scene',
      invoke: async () => await input.surface.desktopInspectScene!({
        abortSignal: input.abortSignal,
        question: spec.instruction,
        forceRefresh: false,
        maxSuggestedActions: 5,
      }),
    })
  }
  catch (error) {
    if (!isAbortLikeError(error))
      throw error

    const createdAt = now()
    return {
      ok: false,
      summary: 'Local visual execution was cancelled during desktop inspection.',
      output: null,
      errorCode: 'LOCAL_VISUAL_ABORTED',
      errorMessage: errorMessageFromLocalVisualHost(error),
      finalStatus: 'cancelled',
      events: [dispatchEvent, {
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: input.channel,
        kind: 'cancel',
        threadStatus: 'cancelled',
        payload: {
          adapter: 'local-visual',
          transportChannel: 'local-visual',
          errorCode: 'LOCAL_VISUAL_ABORTED',
          errorMessage: errorMessageFromLocalVisualHost(error),
        },
        createdAt,
      }],
    }
  }
  const normalizedInspectionResult = normalizeLocalVisualCrossLayerValue(rawInspectionResult)
  const inspectionResult = asRecord(normalizedInspectionResult)
  const inspectionStatus = sanitizeText(inspectionResult?.status, 60).toLowerCase()
  if (!inspectionResult || inspectionStatus !== 'completed') {
    const baseErrorMessage = sanitizeText(inspectionResult?.errorMessage, 220)
      || sanitizeText(inspectionResult?.summary, 220)
      || 'unknown local visual error'
    const summary = buildFailureSummary(thread, baseErrorMessage)
    const resultEvent: AlicizationExecutionEventInput = {
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: input.channel,
      kind: 'result',
      threadStatus: 'failed',
      payload: {
        instruction: spec.instructionPreview,
        transportChannel: 'local-visual',
        errorCode: sanitizeText(inspectionResult?.errorCode, 80) || 'LOCAL_VISUAL_FAILED',
        errorMessage: baseErrorMessage,
        reply: sanitizeText(inspectionResult?.summary, 160) || null,
      },
      createdAt: dispatchCreatedAt + 1,
    }
    return {
      ok: false,
      summary,
      output: typeof inspectionResult?.output === 'string'
        ? inspectionResult.output
        : safeJsonStringify(normalizedInspectionResult) || null,
      errorCode: sanitizeText(inspectionResult?.errorCode, 80) || 'LOCAL_VISUAL_FAILED',
      errorMessage: baseErrorMessage,
      finalStatus: 'failed',
      events: [dispatchEvent, resultEvent],
    }
  }

  const initialSuggestedActions = extractSuggestedActionRecords(inspectionResult.suggestedActions)
  const initialBlockingSignals = sanitizeStringList(inspectionResult.blockingSignals)
  const shouldAutoContinue = resolveInitialAutoContinuationRequested(input)
  let initialContinuation: LocalVisualActionExecutionResult | null = null
  try {
    initialContinuation = shouldAutoContinue
      ? await executeAutoContinuation({
          abortSignal: input.abortSignal,
          commandRuntimeContext: spec.runtimeContext,
          continuationMode: sanitizeText(asRecord(inspectionResult.workflowPlan)?.continuationMode, 80) || undefined,
          blockingSignals: initialBlockingSignals,
          maxSteps: resolveInitialAutoContinuationStepCount(input.command),
          suggestedActions: initialSuggestedActions,
          surface: input.surface,
          thread,
        })
      : null
  }
  catch (error) {
    if (!isAbortLikeError(error))
      throw error

    const createdAt = now()
    const sideEffectState = error instanceof LocalVisualAbortError
      ? error.sideEffectState
      : undefined
    const failureDisposition = resolveLocalVisualFailureDisposition({
      cancelled: true,
      sideEffectState,
      thread,
    })
    const finalStatus = failureDisposition.kind === 'terminal'
      ? failureDisposition.finalStatus
      : 'cancelled'
    return {
      ok: false,
      summary: 'Local visual execution was cancelled while applying a host action.',
      output: null,
      errorCode: 'LOCAL_VISUAL_ABORTED',
      errorMessage: errorMessageFromLocalVisualHost(error),
      ...(sideEffectState ? { sideEffectState } : {}),
      finalStatus,
      events: [dispatchEvent, {
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: input.channel,
        kind: 'cancel',
        threadStatus: finalStatus,
        payload: {
          adapter: 'local-visual',
          transportChannel: 'local-visual',
          errorCode: 'LOCAL_VISUAL_ABORTED',
          errorMessage: errorMessageFromLocalVisualHost(error),
          ...(sideEffectState ? { sideEffectState } : {}),
          failureDisposition,
        },
        createdAt,
      }],
    }
  }

  const finalRecord = initialContinuation?.latestResult ?? inspectionResult
  const finalStatus = sanitizeText(finalRecord.status, 60).toLowerCase()
  if (finalStatus !== 'completed') {
    const errorCode = sanitizeText(finalRecord.errorCode, 80) || 'LOCAL_VISUAL_FAILED'
    const errorMessage = sanitizeText(finalRecord.errorMessage, 220)
      || sanitizeText(finalRecord.summary, 220)
      || 'Local visual host execution failed.'
    const sideEffectStateRaw = sanitizeText(finalRecord.sideEffectState, 40)
    const sideEffectState: LocalVisualSideEffectState | undefined
      = sideEffectStateRaw === 'unknown' || sideEffectStateRaw === 'applied-unverified'
        ? sideEffectStateRaw
        : undefined
    const failureDisposition = resolveLocalVisualFailureDisposition({
      cancelled: false,
      sideEffectState,
      thread,
    })
    const terminalStatus = failureDisposition.kind === 'terminal'
      ? failureDisposition.finalStatus
      : 'failed'
    const normalizedOutput = safeJsonStringify(finalRecord) || null
    const resultEvent: AlicizationExecutionEventInput = {
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: input.channel,
      kind: 'result',
      threadStatus: terminalStatus,
      payload: compactRecord({
        instruction: spec.instructionPreview,
        transportChannel: 'local-visual',
        errorCode,
        errorMessage,
        sideEffectState,
        failureDisposition,
      }),
      createdAt: dispatchCreatedAt + 1,
    }
    return {
      ok: false,
      summary: buildFailureSummary(thread, errorMessage),
      output: normalizedOutput,
      errorCode,
      errorMessage,
      ...(sideEffectState ? { sideEffectState } : {}),
      finalStatus: terminalStatus,
      events: [dispatchEvent, resultEvent],
    }
  }
  const successfulResult = buildSuccessfulLocalVisualResult({
    thread,
    channel: input.channel,
    instructionPreview: spec.instructionPreview,
    resultRecord: compactRecord({
      ...finalRecord,
      autoContinuation: initialContinuation?.autoContinuation,
    }),
    autoContinuation: initialContinuation?.autoContinuation ?? null,
  })

  const stepEvent: AlicizationExecutionEventInput = {
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: input.channel,
    kind: 'step',
    threadStatus: 'running',
    payload: successfulResult.stepPayload,
    createdAt: dispatchCreatedAt + 1,
  }
  const resultEvent: AlicizationExecutionEventInput = {
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: input.channel,
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      instruction: spec.instructionPreview,
      transportChannel: 'local-visual',
      reply: sanitizeText(finalRecord.summary, 160) || null,
      pagePhase: successfulResult.stepPayload.pagePhase ?? null,
      nextActionIntent: successfulResult.stepPayload.nextActionIntent ?? null,
      workflowPlan: successfulResult.stepPayload.workflowPlan ?? null,
      suggestedActions: successfulResult.stepPayload.suggestedActions ?? [],
      blockingSignals: successfulResult.stepPayload.blockingSignals ?? [],
      autoContinuation: successfulResult.stepPayload.autoContinuation ?? null,
    },
    createdAt: dispatchCreatedAt + 2,
  }

  return {
    ok: successfulResult.ok,
    summary: successfulResult.summary,
    output: successfulResult.output,
    finalStatus: successfulResult.finalStatus,
    events: [dispatchEvent, stepEvent, resultEvent],
  }
}
