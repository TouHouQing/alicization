import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionChannel,
  AlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import type { Tool } from '@xsai/shared-chat'

import type {
  AlicizationDispatchTaskThreadPayload,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'
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
} from './local-browser-automation'
import type { AlicizationLocalDesktopInspectSceneInput } from './local-desktop-inspection'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

import * as nodePath from 'node:path'

import {
  buildAlicizationProviderFactBlock,
} from '@proj-alicization/stage-shared'
import { tool } from '@xsai/tool'
import { z } from 'zod'

import { sanitizeBriefText } from './runtime-realtime'
import { sanitizeText } from './runtime-soul'

export interface MainGatewayExecutionToolContext {
  cardId: string
  decisionTraceId?: string | null
  sessionId?: string | null
  turnId: string
}

export interface MainGatewayExecutionTaskThreadResult {
  createdEventKinds?: string[]
  errorCode?: string
  errorMessage?: string
  ok: boolean
  output?: unknown | null
  plan: {
    state: string
    proposedChannel?: AlicizationExecutionChannel | null
    reasonTags?: string[]
    narrative?: string[]
    affirmationReasonCodes?: string[]
    blockedReasonCodes?: string[]
  }
  stage: 'plan' | 'dispatch'
  summary: string
  thread: {
    completedAt?: number | null
    id: string
    sessionId?: string | null
    selectedChannel: AlicizationExecutionChannel | null
    status?: string | null
    metadata?: Record<string, unknown> | null
  }
}

export interface BuildMainGatewayToolsOptions {
  browserClickElement?: (input: AlicizationLocalBrowserClickElementInput) => Promise<unknown>
  browserNavigate?: (input: AlicizationLocalBrowserNavigateInput) => Promise<unknown>
  browserOpenUrl?: (input: AlicizationLocalBrowserOpenUrlInput) => Promise<unknown>
  browserReadPage?: (input: AlicizationLocalBrowserReadPageInput) => Promise<unknown>
  browserScroll?: (input: AlicizationLocalBrowserScrollInput) => Promise<unknown>
  browserSearchWeb?: (input: AlicizationLocalBrowserSearchWebInput) => Promise<unknown>
  browserTypeText?: (input: AlicizationLocalBrowserTypeTextInput) => Promise<unknown>
  browserWait?: (input: AlicizationLocalBrowserWaitInput) => Promise<unknown>
  buildExecutionRuntimeContext: (context: MainGatewayExecutionToolContext) => Promise<AlicizationExecutionRuntimeContext>
  context: MainGatewayExecutionToolContext
  desktopClickElement?: (input: AlicizationLocalDesktopClickElementInput) => Promise<unknown>
  desktopInspectScene?: (input: AlicizationLocalDesktopInspectSceneInput) => Promise<unknown>
  desktopListInteractables?: (input: AlicizationLocalDesktopListInteractablesInput) => Promise<unknown>
  desktopOpenApplication?: (input: AlicizationLocalDesktopOpenApplicationInput) => Promise<unknown>
  desktopPressKeys?: (input: AlicizationLocalDesktopPressKeysInput) => Promise<unknown>
  desktopTypeText?: (input: AlicizationLocalDesktopTypeTextInput) => Promise<unknown>
  desktopWait?: (input: AlicizationLocalDesktopWaitInput) => Promise<unknown>
  executeTaskThread: (input: {
    context: MainGatewayExecutionToolContext
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'claudeCode' | 'cli' | 'codex' | 'localVisual' | 'openclaw'>
    task: AlicizationClawTaskIntent
  }) => Promise<MainGatewayExecutionTaskThreadResult>
  resumeTaskThread?: (input: {
    context: MainGatewayExecutionToolContext
    threadId: string
  }) => Promise<MainGatewayExecutionTaskThreadResult>
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[]
  invokeMcpCallTool: (payload: {
    arguments?: Record<string, unknown>
    cardId?: string
    name: string
  }) => Promise<unknown>
  invokeMcpListTools: () => Promise<unknown>
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot> | AlicizationSensoryCacheSnapshot
  resolveTaskPlanningCapabilities: () => Promise<AlicizationChannelCapability[]>
  scheduleReminderTask: (
    cardId: string,
    payload: {
      message: string
      minutes: number
    },
    source: 'tool',
  ) => Promise<unknown>
}

export const mainGatewayExecutorToolNames = [
  'executor_run_cli',
  'executor_run_codex',
  'executor_run_claude_code',
  'executor_run_local_visual',
  'executor_run_openclaw',
] as const

type MainGatewayExecutorToolName = typeof mainGatewayExecutorToolNames[number]

const filesystemToolDefaultMaxReturnBytes = 128 * 1024
const filesystemToolMaxReturnBytes = 512 * 1024
const filesystemToolEditableMaxBytes = 512 * 1024
const filesystemToolDefaultPatchPreviewBytes = 32 * 1024
const filesystemToolDefaultMaxSearchResults = 200
const filesystemToolMaxSearchResults = 1_000
const localVisualExecutorKindValues = [
  'browser-automation',
  'software-automation',
  'desktop-automation',
  'mixed',
  'unknown',
] as const
const browserLikePagePhases = new Set([
  'login',
  'search-results',
  'social-feed',
  'form-entry',
  'upload-flow',
  'content-detail',
])

interface NormalizedMcpToolCallResult {
  content?: Array<Record<string, unknown>>
  durationMs?: number
  errorCode?: string
  errorMessage?: string
  isError: boolean
  ok: boolean
  structuredContent?: Record<string, unknown>
  toolResult?: unknown
}

interface MainGatewayMcpCallAttempt {
  arguments: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  toolName: string
}

interface MainGatewayMcpCallOutcome {
  attempts: MainGatewayMcpCallAttempt[]
  arguments: Record<string, unknown> | null
  result: NormalizedMcpToolCallResult
  toolName: string | null
}

interface MainGatewayFileReadState {
  byteLength: number
  content: string
  contentHash: string
  readAt: number
}

interface MainGatewayFilesystemSearchMatch {
  column?: number
  line?: number
  path: string
  snippet?: string
}

type MainGatewayFilesystemSearchPathMode = 'absolute' | 'raw' | 'relative'
type MainGatewayToolResultObject = Record<string, unknown>

interface MainGatewayExecutorFollowUpInput {
  autoContinueSuggestedActions?: boolean
  inspectionMaxSuggestedActions?: number
  inspectionQuestion?: string
  maxAutoContinueSteps?: number
  reinspectAfterAction?: boolean
}

function normalizeFilesystemReturnLimit(raw: number | undefined) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return filesystemToolDefaultMaxReturnBytes
  return Math.max(64, Math.min(filesystemToolMaxReturnBytes, Math.floor(raw)))
}

function hashTextContent(content: string) {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

function truncateTextByByteLimit(input: {
  content: string
  maxBytes: number
  operation: 'list_directory' | 'patch_preview' | 'read_file' | 'search_files'
}) {
  const buffer = Buffer.from(input.content, 'utf8')
  if (buffer.byteLength <= input.maxBytes) {
    return {
      content: input.content,
      byteLength: buffer.byteLength,
      truncated: false,
    }
  }
  const clipped = buffer.subarray(0, input.maxBytes).toString('utf8')
  return {
    content: [
      clipped,
      '',
      `[ALICIZATION_NOTICE] ${input.operation} output was truncated to ${input.maxBytes} bytes in tool response.`,
    ].join('\n'),
    byteLength: buffer.byteLength,
    truncated: true,
  }
}

function normalizeMcpToolCallResult(raw: unknown): NormalizedMcpToolCallResult {
  const payload = asRecord(raw)
  if (!payload) {
    return {
      isError: true,
      ok: false,
      errorCode: 'MCP_CALL_MALFORMED_RESULT',
      errorMessage: 'MCP tool returned a malformed payload.',
    }
  }

  const normalized: NormalizedMcpToolCallResult = {
    isError: payload.isError === true,
    ok: payload.ok !== false && payload.isError !== true,
  }
  if (typeof payload.errorCode === 'string')
    normalized.errorCode = payload.errorCode
  if (typeof payload.errorMessage === 'string')
    normalized.errorMessage = payload.errorMessage
  if (typeof payload.durationMs === 'number' && Number.isFinite(payload.durationMs))
    normalized.durationMs = payload.durationMs
  if (Array.isArray(payload.content))
    normalized.content = payload.content as Array<Record<string, unknown>>
  if (asRecord(payload.structuredContent))
    normalized.structuredContent = payload.structuredContent as Record<string, unknown>
  if ('toolResult' in payload)
    normalized.toolResult = payload.toolResult

  return normalized
}

function extractTextFromMcpResult(result: NormalizedMcpToolCallResult) {
  const contentTexts = Array.isArray(result.content)
    ? result.content
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'text' in entry && typeof entry.text === 'string')
            return entry.text
          return ''
        })
        .filter(Boolean)
    : []

  const structured = result.structuredContent
  const structuredText = structured
    ? [
        typeof structured.text === 'string' ? structured.text : '',
        typeof structured.content === 'string' ? structured.content : '',
        typeof structured.message === 'string' ? structured.message : '',
      ].filter(Boolean).join('\n')
    : ''

  const toolResultText = typeof result.toolResult === 'string'
    ? result.toolResult
    : ''

  const merged = [structuredText, ...contentTexts, toolResultText]
    .filter(Boolean)
    .join('\n')
    .trim()

  if (merged)
    return merged

  if (structured)
    return JSON.stringify(structured)
  if (result.toolResult && typeof result.toolResult === 'object')
    return JSON.stringify(result.toolResult)
  if (Array.isArray(result.content))
    return JSON.stringify(result.content)
  return ''
}

function normalizeMcpErrorMessage(result: NormalizedMcpToolCallResult) {
  return sanitizeText(result.errorMessage)
    || sanitizeText(extractTextFromMcpResult(result))
    || 'MCP tool call failed.'
}

function isRecoverableMcpCandidateError(result: NormalizedMcpToolCallResult) {
  if (!result.isError)
    return false

  const errorCode = sanitizeText(result.errorCode)
  if (
    errorCode === 'ALICIZATION_TOOL_ABORTED'
    || errorCode === 'ALICIZATION_TOOL_DENIED'
    || errorCode === 'ALICIZATION_TOOL_DENIED_BY_HOST'
    || errorCode === 'ALICIZATION_TOOL_DENIED_SYSTEM'
    || errorCode === 'MCP_CALL_UNAVAILABLE'
  ) {
    return false
  }

  const message = normalizeMcpErrorMessage(result)
  return /\b(?:tool|method)\b[\s\S]{0,80}\bnot\s+found\b/i.test(message)
    || /\binvalid\s+(?:params?|arguments?)\b/i.test(message)
    || /\bmissing\s+required\b/i.test(message)
    || /\binput\s+validation\s+error\b/i.test(message)
}

function extractDirectoryEntriesFromStructured(raw: unknown) {
  const source = asRecord(raw)
  if (!source)
    return []

  const candidateList = Array.isArray(source.entries)
    ? source.entries
    : Array.isArray(source.items)
      ? source.items
      : Array.isArray(source.files)
        ? source.files
        : []

  return candidateList
    .map((entry) => {
      if (typeof entry === 'string')
        return sanitizeText(entry)
      if (!entry || typeof entry !== 'object')
        return ''
      const record = entry as Record<string, unknown>
      return sanitizeText(record.path) || sanitizeText(record.name) || sanitizeText(record.file) || ''
    })
    .filter(Boolean)
}

function normalizeFinitePositiveInteger(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return undefined
  const normalized = Math.floor(raw)
  return normalized > 0 ? normalized : undefined
}

function sanitizeStringList(raw: unknown) {
  const normalized = Array.isArray(raw)
    ? raw.map(value => sanitizeText(value)).filter(Boolean)
    : []
  return [...new Set(normalized)]
}

function normalizeAutoContinueStepCount(raw: unknown) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return 1
  return Math.max(1, Math.min(3, Math.floor(raw)))
}

function normalizeLocalToolResult(raw: unknown, operation: string): MainGatewayToolResultObject {
  return asRecord(raw) ?? {
    status: 'completed',
    operation,
    result: raw,
  }
}

function extractSuggestedActionRecords(raw: unknown) {
  return Array.isArray(raw)
    ? raw.filter(value => Boolean(asRecord(value))).map(value => asRecord(value)!).filter(Boolean)
    : []
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

function toPortablePath(raw: string) {
  return raw.replaceAll('\\', '/')
}

function normalizeSearchPathForGlob(input: {
  path: string
  rootPath: string
}) {
  const matchPath = sanitizeText(input.path)
  if (!matchPath)
    return ''

  const normalizedRootPath = nodePath.resolve(input.rootPath)
  if (nodePath.isAbsolute(matchPath)) {
    const relativePath = nodePath.relative(normalizedRootPath, matchPath)
    if (relativePath && !relativePath.startsWith('..') && !nodePath.isAbsolute(relativePath))
      return toPortablePath(relativePath)
    return toPortablePath(nodePath.normalize(matchPath))
  }

  return toPortablePath(matchPath).replace(/^\.?\//, '')
}

function normalizeSearchResultPath(input: {
  path: string
  pathMode: MainGatewayFilesystemSearchPathMode
  rootPath: string
}) {
  const matchPath = sanitizeText(input.path)
  if (!matchPath)
    return ''

  if (input.pathMode === 'raw')
    return matchPath

  const normalizedRootPath = nodePath.resolve(input.rootPath)
  const pathIsAbsolute = nodePath.isAbsolute(matchPath)
  if (input.pathMode === 'absolute') {
    if (pathIsAbsolute)
      return toPortablePath(nodePath.normalize(matchPath))
    return toPortablePath(nodePath.resolve(normalizedRootPath, matchPath))
  }

  if (!pathIsAbsolute)
    return toPortablePath(matchPath).replace(/^\.?\//, '')

  const relativePath = nodePath.relative(normalizedRootPath, matchPath)
  if (relativePath && !relativePath.startsWith('..') && !nodePath.isAbsolute(relativePath))
    return toPortablePath(relativePath)
  return toPortablePath(nodePath.normalize(matchPath))
}

function escapeRegExpCharacter(char: string) {
  return /[|\\{}()[\]^$+*?.]/.test(char) ? `\\${char}` : char
}

function compileSimpleGlob(globPattern: string) {
  const normalizedPattern = toPortablePath(globPattern).trim()
  if (!normalizedPattern)
    return null

  let pattern = '^'
  for (let index = 0; index < normalizedPattern.length; index += 1) {
    const char = normalizedPattern[index]
    if (char === '*') {
      const next = normalizedPattern[index + 1]
      const nextNext = normalizedPattern[index + 2]
      if (next === '*') {
        if (nextNext === '/') {
          pattern += '(?:.*/)?'
          index += 2
          continue
        }
        pattern += '.*'
        index += 1
        continue
      }
      pattern += '[^/]*'
      continue
    }
    if (char === '?') {
      pattern += '[^/]'
      continue
    }
    pattern += escapeRegExpCharacter(char)
  }
  pattern += '$'
  return new RegExp(pattern)
}

function compileSimpleGlobList(globs: string[]) {
  return globs
    .map(pattern => compileSimpleGlob(pattern))
    .filter((regex): regex is RegExp => regex !== null)
}

function matchesAnyGlob(path: string, globList: RegExp[]) {
  if (globList.length <= 0)
    return false
  return globList.some(pattern => pattern.test(path))
}

function parseFilesystemSearchLine(rawLine: string): MainGatewayFilesystemSearchMatch | null {
  const line = sanitizeText(rawLine)
  if (!line)
    return null

  const fourPartPattern = /^(.*?):(\d+):(\d+):(.*)$/.exec(line)
  if (fourPartPattern) {
    const path = sanitizeText(fourPartPattern[1])
    if (!path)
      return null
    const lineNumber = normalizeFinitePositiveInteger(Number(fourPartPattern[2]))
    const columnNumber = normalizeFinitePositiveInteger(Number(fourPartPattern[3]))
    const snippet = sanitizeText(fourPartPattern[4]) || undefined
    return {
      path,
      line: lineNumber,
      column: columnNumber,
      snippet,
    }
  }

  const threePartPattern = /^(.*?):(\d+):(.*)$/.exec(line)
  if (threePartPattern) {
    const path = sanitizeText(threePartPattern[1])
    if (!path)
      return null
    const lineNumber = normalizeFinitePositiveInteger(Number(threePartPattern[2]))
    const snippet = sanitizeText(threePartPattern[3]) || undefined
    return {
      path,
      line: lineNumber,
      snippet,
    }
  }

  return {
    path: line,
  }
}

function extractSearchMatchesFromStructured(raw: unknown): MainGatewayFilesystemSearchMatch[] {
  const source = asRecord(raw)
  if (!source)
    return []

  const candidateList = Array.isArray(source.matches)
    ? source.matches
    : Array.isArray(source.results)
      ? source.results
      : Array.isArray(source.items)
        ? source.items
        : Array.isArray(source.entries)
          ? source.entries
          : []

  return candidateList
    .map((entry) => {
      if (typeof entry === 'string')
        return parseFilesystemSearchLine(entry)
      if (!entry || typeof entry !== 'object')
        return null
      const record = entry as Record<string, unknown>
      const path = sanitizeText(record.path)
        || sanitizeText(record.filePath)
        || sanitizeText(record.file)
        || sanitizeText(record.name)
      if (!path)
        return null
      const line = normalizeFinitePositiveInteger(
        typeof record.line === 'number'
          ? record.line
          : typeof record.lineNumber === 'number'
            ? record.lineNumber
            : typeof record.row === 'number'
              ? record.row
              : Number.NaN,
      )
      const column = normalizeFinitePositiveInteger(
        typeof record.column === 'number'
          ? record.column
          : typeof record.col === 'number'
            ? record.col
            : Number.NaN,
      )
      const snippet = sanitizeText(record.snippet)
        || sanitizeText(record.preview)
        || sanitizeText(record.text)
        || sanitizeText(record.lineText)
        || undefined
      return {
        path,
        line,
        column,
        snippet,
      }
    })
    .filter((entry): entry is MainGatewayFilesystemSearchMatch => entry !== null)
}

function normalizeExecutorTimeoutMs(raw: number | undefined) {
  if (typeof raw !== 'number' || !Number.isFinite(raw))
    return undefined
  return raw
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asStringArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(value => sanitizeText(value)).filter(Boolean)
    : []
}

function toSensoryCaptureStateResult(snapshot: AlicizationSensoryCacheSnapshot, includeSystemSample: boolean) {
  return {
    generatedAt: Date.now(),
    running: snapshot.running,
    stale: snapshot.stale,
    ageMs: snapshot.ageMs,
    nextTickAt: snapshot.nextTickAt,
    foregroundWindow: snapshot.sample.foregroundWindow ?? null,
    capture: snapshot.capture
      ? {
          health: snapshot.capture.health,
          permission: snapshot.capture.permission,
          sourceCount: snapshot.capture.sourceCount,
          sessionPhase: snapshot.capture.sessionPhase,
          sessionReason: snapshot.capture.sessionReason,
          leaseStatus: snapshot.capture.leaseStatus,
          degradedReasons: snapshot.capture.degradedReasons,
          lastUpdatedAt: snapshot.capture.lastUpdatedAt,
          lastError: snapshot.capture.lastError,
        }
      : null,
    sample: includeSystemSample
      ? snapshot.sample
      : {
          collectedAt: snapshot.sample.collectedAt,
          time: snapshot.sample.time,
        },
  }
}

function toMainGatewayExecutorToolResult(result: MainGatewayExecutionTaskThreadResult): MainGatewayToolResultObject {
  return {
    status: result.ok ? 'completed' : result.stage === 'plan' ? 'not-routed' : 'failed',
    stage: result.stage,
    threadId: result.thread.id,
    threadStatus: sanitizeText(result.thread.status) || 'unknown',
    selectedChannel: result.thread.selectedChannel,
    sessionId: sanitizeText(result.thread.sessionId) || null,
    completedAt: typeof result.thread.completedAt === 'number' && Number.isFinite(result.thread.completedAt)
      ? Math.floor(result.thread.completedAt)
      : null,
    planState: result.plan.state,
    proposedChannel: result.plan.proposedChannel ?? null,
    routeReasonTags: asStringArray(result.plan.reasonTags),
    routeAffirmationReasonCodes: asStringArray(result.plan.affirmationReasonCodes),
    routeBlockedReasonCodes: asStringArray(result.plan.blockedReasonCodes),
    summary: result.summary,
    output: result.output ?? null,
    errorCode: result.errorCode,
    errorMessage: result.errorMessage,
    createdEventKinds: result.createdEventKinds ?? [],
  }
}

function defineMainGatewayExecutorToolSpec<TSchema extends z.ZodTypeAny>(spec: {
  description: string
  execute: (input: z.infer<TSchema>, context: MainGatewayExecutionToolContext) => Promise<MainGatewayExecutionTaskThreadResult>
  name: MainGatewayExecutorToolName
  parameters: TSchema
}) {
  return spec
}

export function buildExecutionCapabilitySystemBlocks(
  capabilities: AlicizationChannelCapability[],
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[],
) {
  const capabilityMap = new Map(capabilities.map(item => [item.channel, item]))
  const channels = executionCapabilityChannels.map((channel) => {
    const capability = capabilityMap.get(channel)
    const ready = capability?.ready !== false && capability?.available !== false && capability?.enabled !== false
    return {
      channel,
      available: capability?.available !== false,
      enabled: capability?.enabled !== false,
      ready,
      reason: capability?.reason ?? null,
    }
  })

  return [buildAlicizationProviderFactBlock('alicization-execution-capabilities', {
    channels,
  })]
}

export async function buildMainGatewayTools(options: BuildMainGatewayToolsOptions) {
  const { context } = options
  let maybeFollowUpExecutorWorkflow: (input: {
    payload: MainGatewayExecutorFollowUpInput
    result: MainGatewayToolResultObject
  }) => Promise<MainGatewayToolResultObject>

  const executorRunToolSpecs = [
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_cli',
      description: 'Plan and execute a CLI task thread through Alicization executor governance. Use this for local command execution.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        threadId: z.string().optional(),
        command: z.string().min(1).optional(),
        args: z.array(z.string()).default([]),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ threadId, command, args, cwd, timeoutMs, goal, effect, permissionMode }, toolContext) => {
        const resumedThreadId = sanitizeText(threadId) || ''
        if (resumedThreadId && options.resumeTaskThread)
          return await options.resumeTaskThread({ context: toolContext, threadId: resumedThreadId })
        const resolvedCommand = sanitizeText(command)
        if (!resolvedCommand)
          throw new Error('executor_run_cli requires either threadId or command.')
        const commandLabel = [resolvedCommand, ...(Array.isArray(args) ? args : [])].join(' ').trim()
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: 'run-command',
            goal: sanitizeText(goal) || `Run CLI command: ${sanitizeBriefText(commandLabel, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'cli',
            prefersPersistentSession: false,
            requiresVisualGrounding: false,
          },
          dispatch: {
            cli: {
              command: resolvedCommand,
              args,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_codex',
      description: 'Plan and execute a Codex task thread through Alicization executor governance for codebase edits or investigation.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        threadId: z.string().optional(),
        prompt: z.string().min(1).optional(),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        profile: z.string().optional(),
        sandbox: z.enum(['read-only', 'workspace-write']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ threadId, prompt, kind, cwd, timeoutMs, model, profile, sandbox, goal, effect, permissionMode }, toolContext) => {
        const resumedThreadId = sanitizeText(threadId) || ''
        if (resumedThreadId && options.resumeTaskThread)
          return await options.resumeTaskThread({ context: toolContext, threadId: resumedThreadId })
        const resolvedPrompt = sanitizeText(prompt)
        if (!resolvedPrompt)
          throw new Error('executor_run_codex requires either threadId or prompt.')
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: kind ?? 'codebase-edit',
            goal: sanitizeText(goal) || `Run Codex task: ${sanitizeBriefText(resolvedPrompt, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'codex',
            prefersPersistentSession: true,
            requiresVisualGrounding: false,
          },
          dispatch: {
            codex: {
              prompt: resolvedPrompt,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              model: sanitizeText(model) || undefined,
              profile: sanitizeText(profile) || undefined,
              sandbox,
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_claude_code',
      description: 'Plan and execute a Claude Code task thread through Alicization executor governance for codebase edits or investigation. Edit tasks enable Claude Code tools by default unless allowTools=false is set explicitly.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        threadId: z.string().optional(),
        prompt: z.string().min(1).optional(),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        allowTools: z.boolean().optional(),
        claudePermissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'delegate', 'dontAsk', 'plan']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ threadId, prompt, kind, cwd, timeoutMs, model, allowTools, claudePermissionMode, goal, effect, permissionMode }, toolContext) => {
        const resumedThreadId = sanitizeText(threadId) || ''
        if (resumedThreadId && options.resumeTaskThread)
          return await options.resumeTaskThread({ context: toolContext, threadId: resumedThreadId })
        const resolvedPrompt = sanitizeText(prompt)
        if (!resolvedPrompt)
          throw new Error('executor_run_claude_code requires either threadId or prompt.')
        const resolvedKind = kind ?? 'codebase-edit'
        const resolvedEffect = effect ?? (resolvedKind === 'codebase-investigation' ? 'observe' : 'mutate')
        const resolvedAllowTools = typeof allowTools === 'boolean'
          ? allowTools
          : resolvedEffect !== 'observe'
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run Claude Code task: ${sanitizeBriefText(resolvedPrompt, 220)}`,
            origin: 'user',
            effect: resolvedEffect,
            permissionMode: permissionMode ?? 'implicit',
            justification: 'grounded',
            riskBudget: 'medium',
            requestedChannel: 'claude-code',
            prefersPersistentSession: true,
            requiresVisualGrounding: false,
          },
          dispatch: {
            claudeCode: {
              prompt: resolvedPrompt,
              cwd: sanitizeText(cwd) || undefined,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              model: sanitizeText(model) || undefined,
              allowTools: resolvedAllowTools,
              permissionMode: claudePermissionMode,
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_local_visual',
      description: 'Plan and execute a governed local visual task thread through Alicization executor governance for browser, software, desktop, or mixed GUI actions. This always uses the host-local GUI chain and never forces OpenClaw transport.',
      parameters: z.object({
        threadId: z.string().optional(),
        instruction: z.string().min(1).optional(),
        channel: z.enum(['browser', 'software', 'desktop']),
        kind: z.enum(localVisualExecutorKindValues).optional(),
        senderId: z.string().optional(),
        roleName: z.string().optional(),
        channelId: z.string().optional(),
        conversationId: z.string().optional(),
        contentParts: z.array(z.object({
          type: z.enum(['text', 'image', 'audio', 'file', 'video']),
          text: z.string().optional(),
          image_url: z.string().optional(),
          video_url: z.string().optional(),
          data: z.string().optional(),
          format: z.string().optional(),
          file_url: z.string().optional(),
          filename: z.string().optional(),
          file_id: z.string().optional(),
        }).strict()).optional(),
        images: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        audios: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        files: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        sessionAffinityKey: z.string().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        justification: z.enum(['weak', 'grounded', 'explicit']).optional(),
        riskBudget: z.enum(['low', 'medium', 'high']).optional(),
        requiresVisualGrounding: z.boolean().optional(),
      }).strict(),
      execute: async ({ threadId, instruction, channel, kind, senderId, roleName, channelId, conversationId, contentParts, images, audios, files, meta, sessionAffinityKey, goal, effect, permissionMode, justification, riskBudget, requiresVisualGrounding }, toolContext) => {
        const resumedThreadId = sanitizeText(threadId) || ''
        if (resumedThreadId && options.resumeTaskThread)
          return await options.resumeTaskThread({ context: toolContext, threadId: resumedThreadId })
        const resolvedInstruction = sanitizeText(instruction)
        if (!resolvedInstruction)
          throw new Error('executor_run_local_visual requires either threadId or instruction.')
        const resolvedKind = kind ?? 'browser-automation'
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        const normalizedMeta = meta && typeof meta === 'object' && !Array.isArray(meta)
          ? { ...meta }
          : {}
        if (sanitizeText(senderId))
          normalizedMeta.senderId = sanitizeText(senderId)
        if (sanitizeText(roleName))
          normalizedMeta.roleName = sanitizeText(roleName)
        if (sanitizeText(channelId))
          normalizedMeta.channelId = sanitizeText(channelId)
        if (sanitizeText(conversationId))
          normalizedMeta.conversationId = sanitizeText(conversationId)
        if (sanitizeText(sessionAffinityKey))
          normalizedMeta.sessionAffinityKey = sanitizeText(sessionAffinityKey)
        if (Array.isArray(contentParts) && contentParts.length > 0)
          normalizedMeta.contentParts = contentParts
        if (Array.isArray(images) && images.length > 0)
          normalizedMeta.images = images
        if (Array.isArray(audios) && audios.length > 0)
          normalizedMeta.audios = audios
        if (Array.isArray(files) && files.length > 0)
          normalizedMeta.files = files
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run local visual task: ${sanitizeBriefText(resolvedInstruction, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: justification ?? 'grounded',
            riskBudget: riskBudget ?? 'medium',
            requestedChannel: channel,
            prefersPersistentSession: true,
            requiresVisualGrounding: typeof requiresVisualGrounding === 'boolean'
              ? requiresVisualGrounding
              : true,
          },
          dispatch: {
            localVisual: {
              instruction: resolvedInstruction,
              meta: Object.keys(normalizedMeta).length > 0 ? normalizedMeta : undefined,
              runtimeContext,
            },
          },
        })
      },
    }),
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_openclaw',
      description: 'Plan and execute an OpenClaw embodied task thread through Alicization executor governance for browser, software, desktop, or mixed visual actions. Alicization will attach the latest grounded sensory context automatically.',
      parameters: z.object({
        threadId: z.string().optional(),
        instruction: z.string().min(1).optional(),
        kind: z.enum(['run-command', 'codebase-edit', 'codebase-investigation', 'browser-automation', 'software-automation', 'desktop-automation', 'agent-delegation', 'mixed', 'unknown']).optional(),
        timeoutMs: z.coerce.number().optional(),
        senderId: z.string().optional(),
        roleName: z.string().optional(),
        channelId: z.string().optional(),
        conversationId: z.string().optional(),
        contentParts: z.array(z.object({
          type: z.enum(['text', 'image', 'audio', 'file', 'video']),
          text: z.string().optional(),
          image_url: z.string().optional(),
          video_url: z.string().optional(),
          data: z.string().optional(),
          format: z.string().optional(),
          file_url: z.string().optional(),
          filename: z.string().optional(),
          file_id: z.string().optional(),
        }).strict()).optional(),
        images: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        audios: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        files: z.array(z.union([z.string(), z.record(z.string(), z.unknown())])).optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        sessionAffinityKey: z.string().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
        justification: z.enum(['weak', 'grounded', 'explicit']).optional(),
        riskBudget: z.enum(['low', 'medium', 'high']).optional(),
        requiresVisualGrounding: z.boolean().optional(),
      }).strict(),
      execute: async ({ threadId, instruction, kind, timeoutMs, senderId, roleName, channelId, conversationId, contentParts, images, audios, files, meta, sessionAffinityKey, goal, effect, permissionMode, justification, riskBudget, requiresVisualGrounding }, toolContext) => {
        const resumedThreadId = sanitizeText(threadId) || ''
        if (resumedThreadId && options.resumeTaskThread)
          return await options.resumeTaskThread({ context: toolContext, threadId: resumedThreadId })
        const resolvedInstruction = sanitizeText(instruction)
        if (!resolvedInstruction)
          throw new Error('executor_run_openclaw requires either threadId or instruction.')
        const resolvedKind = kind ?? 'browser-automation'
        const visualKinds = new Set(['browser-automation', 'software-automation', 'desktop-automation', 'mixed', 'unknown'])
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        const normalizedMeta = meta && typeof meta === 'object' && !Array.isArray(meta)
          ? { ...meta }
          : {}
        if (sanitizeText(senderId))
          normalizedMeta.senderId = sanitizeText(senderId)
        if (sanitizeText(roleName))
          normalizedMeta.roleName = sanitizeText(roleName)
        if (sanitizeText(channelId))
          normalizedMeta.channelId = sanitizeText(channelId)
        if (sanitizeText(conversationId))
          normalizedMeta.conversationId = sanitizeText(conversationId)
        if (sanitizeText(sessionAffinityKey))
          normalizedMeta.sessionAffinityKey = sanitizeText(sessionAffinityKey)
        if (Array.isArray(contentParts) && contentParts.length > 0)
          normalizedMeta.contentParts = contentParts
        if (Array.isArray(images) && images.length > 0)
          normalizedMeta.images = images
        if (Array.isArray(audios) && audios.length > 0)
          normalizedMeta.audios = audios
        if (Array.isArray(files) && files.length > 0)
          normalizedMeta.files = files
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run OpenClaw task: ${sanitizeBriefText(resolvedInstruction, 220)}`,
            origin: 'user',
            effect: effect ?? 'mutate',
            permissionMode: permissionMode ?? 'implicit',
            justification: justification ?? 'grounded',
            riskBudget: riskBudget ?? 'medium',
            requestedChannel: 'openclaw',
            prefersPersistentSession: true,
            requiresVisualGrounding: typeof requiresVisualGrounding === 'boolean'
              ? requiresVisualGrounding
              : visualKinds.has(resolvedKind),
          },
          dispatch: {
            localVisual: undefined,
            openclaw: {
              instruction: resolvedInstruction,
              timeoutMs: normalizeExecutorTimeoutMs(timeoutMs),
              senderId: sanitizeText(senderId) || undefined,
              roleName: sanitizeText(roleName) || undefined,
              channelId: sanitizeText(channelId) || undefined,
              conversationId: sanitizeText(conversationId) || undefined,
              contentParts,
              images,
              audios,
              files,
              meta,
              sessionAffinityKey: sanitizeText(sessionAffinityKey) || undefined,
              runtimeContext,
            },
          },
        })
      },
    }),
  ] as const

  const executorRunTools = executorRunToolSpecs.map(spec => tool({
    name: spec.name,
    description: spec.description,
    parameters: spec.parameters,
    execute: async (input) => {
      const result = toMainGatewayExecutorToolResult(await spec.execute(input as never, context))
      return await maybeFollowUpExecutorWorkflow({
        payload: input as MainGatewayExecutorFollowUpInput,
        result,
      })
    },
  }))
  const autoContinuationExecutorToolNames = new Set<MainGatewayExecutorToolName>([
    'executor_run_cli',
    'executor_run_codex',
    'executor_run_claude_code',
  ])

  const fileReadStateByPath = new Map<string, MainGatewayFileReadState>()
  let maybeFollowUpVisualWorkflow: (input: {
    operation: 'browser_open_url' | 'browser_search_web' | 'browser_click_element' | 'browser_type_text' | 'browser_navigate' | 'browser_scroll' | 'browser_wait' | 'desktop_click_element' | 'desktop_type_text' | 'desktop_press_keys' | 'desktop_open_application'
    payload:
      | AlicizationLocalBrowserOpenUrlInput
      | AlicizationLocalBrowserSearchWebInput
      | AlicizationLocalBrowserClickElementInput
      | AlicizationLocalBrowserTypeTextInput
      | AlicizationLocalBrowserNavigateInput
      | AlicizationLocalBrowserScrollInput
      | AlicizationLocalBrowserWaitInput
      | AlicizationLocalDesktopClickElementInput
      | AlicizationLocalDesktopTypeTextInput
      | AlicizationLocalDesktopPressKeysInput
      | AlicizationLocalDesktopOpenApplicationInput
    result: MainGatewayToolResultObject
  }) => Promise<MainGatewayToolResultObject>

  const executeAutoContinuationAction = async (action: Record<string, unknown>, remainingStepsAfterThis: number): Promise<MainGatewayToolResultObject | null> => {
    const toolName = sanitizeText(action.toolName)
    const argumentsRecord = asRecord(action.arguments) ?? {}
    const recursiveArguments = remainingStepsAfterThis > 0
      ? {
          ...argumentsRecord,
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: remainingStepsAfterThis,
        }
      : argumentsRecord

    if (toolName === 'browser_read_page' && options.browserReadPage)
      return normalizeLocalToolResult(await options.browserReadPage(argumentsRecord as AlicizationLocalBrowserReadPageInput), 'browser_read_page')
    if (toolName === 'desktop_list_interactables' && options.desktopListInteractables)
      return normalizeLocalToolResult(await options.desktopListInteractables(argumentsRecord as AlicizationLocalDesktopListInteractablesInput), 'desktop_list_interactables')
    if (toolName === 'desktop_wait' && options.desktopWait)
      return normalizeLocalToolResult(await options.desktopWait(argumentsRecord as AlicizationLocalDesktopWaitInput), 'desktop_wait')
    if (toolName === 'desktop_list_interactables' && options.desktopListInteractables)
      return normalizeLocalToolResult(await options.desktopListInteractables(argumentsRecord as AlicizationLocalDesktopListInteractablesInput), 'desktop_list_interactables')
    if (autoContinuationExecutorToolNames.has(toolName as MainGatewayExecutorToolName)) {
      const executorToolName = toolName as MainGatewayExecutorToolName
      const executorToolSpec = executorRunToolSpecs.find(spec => spec.name === executorToolName) ?? null
      if (!executorToolSpec)
        return null
      const result = toMainGatewayExecutorToolResult(await executorToolSpec.execute(recursiveArguments as never, context))
      return await maybeFollowUpExecutorWorkflow({
        payload: recursiveArguments as MainGatewayExecutorFollowUpInput,
        result,
      })
    }

    if (toolName === 'browser_click_element' && options.browserClickElement) {
      const result = normalizeLocalToolResult(await options.browserClickElement(recursiveArguments as AlicizationLocalBrowserClickElementInput), 'browser_click_element')
      return await maybeFollowUpVisualWorkflow({
        operation: 'browser_click_element',
        payload: recursiveArguments as AlicizationLocalBrowserClickElementInput,
        result,
      })
    }
    if (toolName === 'browser_type_text' && options.browserTypeText) {
      const result = normalizeLocalToolResult(await options.browserTypeText(recursiveArguments as unknown as AlicizationLocalBrowserTypeTextInput), 'browser_type_text')
      return await maybeFollowUpVisualWorkflow({
        operation: 'browser_type_text',
        payload: recursiveArguments as unknown as AlicizationLocalBrowserTypeTextInput,
        result,
      })
    }
    if (toolName === 'browser_navigate' && options.browserNavigate) {
      const result = normalizeLocalToolResult(await options.browserNavigate(recursiveArguments as unknown as AlicizationLocalBrowserNavigateInput), 'browser_navigate')
      return await maybeFollowUpVisualWorkflow({
        operation: 'browser_navigate',
        payload: recursiveArguments as unknown as AlicizationLocalBrowserNavigateInput,
        result,
      })
    }
    if (toolName === 'browser_scroll' && options.browserScroll) {
      const result = normalizeLocalToolResult(await options.browserScroll(recursiveArguments as unknown as AlicizationLocalBrowserScrollInput), 'browser_scroll')
      return await maybeFollowUpVisualWorkflow({
        operation: 'browser_scroll',
        payload: recursiveArguments as unknown as AlicizationLocalBrowserScrollInput,
        result,
      })
    }
    if (toolName === 'browser_wait' && options.browserWait) {
      const result = normalizeLocalToolResult(await options.browserWait(recursiveArguments as AlicizationLocalBrowserWaitInput), 'browser_wait')
      return await maybeFollowUpVisualWorkflow({
        operation: 'browser_wait',
        payload: recursiveArguments as AlicizationLocalBrowserWaitInput,
        result,
      })
    }
    if (toolName === 'desktop_click_element' && options.desktopClickElement) {
      const result = normalizeLocalToolResult(await options.desktopClickElement(recursiveArguments as AlicizationLocalDesktopClickElementInput), 'desktop_click_element')
      return await maybeFollowUpVisualWorkflow({
        operation: 'desktop_click_element',
        payload: recursiveArguments as AlicizationLocalDesktopClickElementInput,
        result,
      })
    }
    if (toolName === 'desktop_type_text' && options.desktopTypeText) {
      const result = normalizeLocalToolResult(await options.desktopTypeText(recursiveArguments as unknown as AlicizationLocalDesktopTypeTextInput), 'desktop_type_text')
      return await maybeFollowUpVisualWorkflow({
        operation: 'desktop_type_text',
        payload: recursiveArguments as unknown as AlicizationLocalDesktopTypeTextInput,
        result,
      })
    }
    if (toolName === 'desktop_press_keys' && options.desktopPressKeys) {
      const result = normalizeLocalToolResult(await options.desktopPressKeys(recursiveArguments as AlicizationLocalDesktopPressKeysInput), 'desktop_press_keys')
      return await maybeFollowUpVisualWorkflow({
        operation: 'desktop_press_keys',
        payload: recursiveArguments as AlicizationLocalDesktopPressKeysInput,
        result,
      })
    }
    if (toolName === 'desktop_open_application' && options.desktopOpenApplication) {
      const result = normalizeLocalToolResult(await options.desktopOpenApplication(recursiveArguments as AlicizationLocalDesktopOpenApplicationInput), 'desktop_open_application')
      return await maybeFollowUpVisualWorkflow({
        operation: 'desktop_open_application',
        payload: recursiveArguments as AlicizationLocalDesktopOpenApplicationInput,
        result,
      })
    }

    return null
  }

  const executeAutoContinuation = async (input: {
    blockingSignals?: string[]
    continuationMode?: string | null
    requested: boolean
    maxSteps: number
    suggestedActions: Array<Record<string, unknown>>
  }) => {
    if (!input.requested)
      return null

    const continuationMode = sanitizeText(input.continuationMode)
    const blockingSignals = Array.isArray(input.blockingSignals)
      ? sanitizeStringList(input.blockingSignals)
      : []
    const awaitingHostInput = continuationMode === 'await-host-input'
      || blockingSignals.includes('awaiting-input')

    const supportedToolNames = new Set([
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
      'executor_run_cli',
      'executor_run_codex',
      'executor_run_claude_code',
    ])
    const safeAwaitHostInputToolNames = new Set([
      'browser_read_page',
      'browser_type_text',
      'browser_navigate',
      'browser_scroll',
      'browser_wait',
      'desktop_list_interactables',
      'desktop_type_text',
      'desktop_press_keys',
      'desktop_open_application',
      'desktop_wait',
    ])
    const highImpactActionPattern = /publish|send|share|delete|remove|trash|erase|clear all|pay|payment|purchase|buy now|checkout|order now|transfer|withdraw|post now|create post|create thread|create topic|create discussion|start discussion|upload|发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|提现|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论|上传/iu
    const nonUploadHighImpactActionPattern = /publish|send|share|delete|remove|trash|erase|clear all|pay|payment|purchase|buy now|checkout|order now|transfer|withdraw|post now|create post|create thread|create topic|create discussion|start discussion|发布|发送|分享|删除|移除|清空|付款|支付|购买|下单|转账|提现|创建帖子|发布帖子|创建主题|发布主题|创建讨论|发布讨论/iu
    const uploadBridgeActionPattern = /upload(?: image| photo| file)?|attach|choose file|select file|browse|media|上传图片|上传照片|上传文件|添加图片|添加照片|添加附件|选择图片|选择文件|选图|相册|图片|照片/u
    const matchesHighImpactActionPattern = (...fields: unknown[]) => {
      const combined = fields
        .map(field => sanitizeText(field))
        .filter(Boolean)
        .join(' ')
      return Boolean(combined) && highImpactActionPattern.test(combined)
    }
    const isLowRiskBrowserDesktopHandoffBridgeAction = (action: Record<string, unknown>) => {
      const toolName = sanitizeText(action.toolName)
      const argumentsRecord = asRecord(action.arguments)
      if (toolName !== 'browser_click_element')
        return false

      if (sanitizeText(argumentsRecord?.expectedPhase) !== 'browser-desktop-handoff')
        return false

      const bridgeTargetCombined = [
        argumentsRecord?.text,
        argumentsRecord?.targetText,
      ]
        .map(field => sanitizeText(field))
        .filter(Boolean)
        .join(' ')

      const fallbackCombined = [
        bridgeTargetCombined,
        action.title,
      ]
        .map(field => sanitizeText(field))
        .filter(Boolean)
        .join(' ')

      if (!fallbackCombined || !uploadBridgeActionPattern.test(fallbackCombined))
        return false

      const highImpactCheckTarget = bridgeTargetCombined || fallbackCombined
      return !nonUploadHighImpactActionPattern.test(highImpactCheckTarget)
    }
    const isHighImpactAutoContinuationAction = (action: Record<string, unknown>) => {
      const toolName = sanitizeText(action.toolName)
      const argumentsRecord = asRecord(action.arguments)
      if (toolName === 'browser_click_element' || toolName === 'desktop_click_element') {
        const expectedPhase = sanitizeText(argumentsRecord?.expectedPhase)
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
    const executedSteps: Array<Record<string, unknown>> = []
    let stoppedReason = 'no-suggested-actions'
    let currentSuggestedActions = [...input.suggestedActions]
    let remainingSteps = input.maxSteps
    let skippedHighImpactAction = false

    while (remainingSteps > 0) {
      const candidateIndex = currentSuggestedActions.findIndex((action) => {
        const toolName = sanitizeText(action.toolName)
        return Boolean(toolName) && supportedToolNames.has(toolName)
      })
      if (candidateIndex < 0) {
        stoppedReason = executedSteps.length > 0
          ? 'no-follow-up-action'
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
      const candidateToolName = sanitizeText(candidate.toolName)
      if (awaitingHostInput && !safeAwaitHostInputToolNames.has(candidateToolName)) {
        stoppedReason = 'await-host-input'
        break
      }
      if (isHighImpactAutoContinuationAction(candidate)) {
        skippedHighImpactAction = true
        stoppedReason = 'high-impact-action-requires-confirmation'
        break
      }

      const result = await executeAutoContinuationAction(candidate, remainingSteps - 1)
      if (!result) {
        stoppedReason = 'unsupported-action'
        break
      }

      executedSteps.push(compactRecord({
        toolName: sanitizeText(candidate.toolName),
        title: sanitizeText(candidate.title),
        rationale: sanitizeBriefText(sanitizeText(candidate.rationale), 320),
        result,
      }))
      const toolName = sanitizeText(candidate.toolName)
      const resultStatus = sanitizeText(result.status).toLowerCase()
      const shouldRetryNextExecutorCandidate = toolName.startsWith('executor_run_')
        && resultStatus !== 'completed'
      if (shouldRetryNextExecutorCandidate) {
        if (currentSuggestedActions.length <= 0) {
          stoppedReason = 'no-follow-up-action'
          break
        }
        continue
      }

      const resultWorkflowPlan = asRecord(result.workflowPlan)
      const resultBlockingSignals = Array.isArray(result.blockingSignals)
        ? sanitizeStringList(result.blockingSignals)
        : []
      const shouldPauseForHostInput = sanitizeText(resultWorkflowPlan?.continuationMode) === 'await-host-input'
        || resultBlockingSignals.includes('awaiting-input')
      if (shouldPauseForHostInput) {
        stoppedReason = 'await-host-input'
        break
      }

      const countsAgainstBudget = candidateToolName !== 'desktop_wait'
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
      const nestedStoppedReason = sanitizeText(nestedAutoContinuation?.stoppedReason)
      const nestedContinuationConsumedSuggestedActions
        = nestedExecutedSteps.length > 0
          || nestedStoppedReason === 'await-host-input'
          || nestedStoppedReason === 'high-impact-action-requires-confirmation'
      if (!nestedContinuationConsumedSuggestedActions) {
        const nextSuggestedActions = extractSuggestedActionRecords(result.suggestedActions)
        if (nextSuggestedActions.length > 0)
          currentSuggestedActions = nextSuggestedActions
      }
      else {
        // Nested continuation already advanced the freshly inspected workflow.
        // Drop sibling suggestions from the older parent inspection so we do not
        // replay stale follow-up actions against the updated GUI state.
        currentSuggestedActions = []
      }

      if (currentSuggestedActions.length <= 0) {
        stoppedReason = skippedHighImpactAction
          ? 'high-impact-action-requires-confirmation'
          : 'no-follow-up-action'
        break
      }
    }

    return compactRecord({
      requested: true,
      maxSteps: input.maxSteps,
      stoppedReason,
      executedSteps,
    })
  }
  const hasHighImpactPauseInAutoContinuation = (autoContinuation: Record<string, unknown>): boolean => {
    if (sanitizeText(autoContinuation.stoppedReason) === 'high-impact-action-requires-confirmation')
      return true

    const executedSteps = Array.isArray(autoContinuation.executedSteps)
      ? autoContinuation.executedSteps.filter(value => Boolean(asRecord(value)))
      : []
    return executedSteps.some((step) => {
      const nestedAutoContinuation = asRecord(asRecord(asRecord(step)?.result)?.autoContinuation)
      return nestedAutoContinuation ? hasHighImpactPauseInAutoContinuation(nestedAutoContinuation) : false
    })
  }

  const buildAutoContinuationSummary = (autoContinuation: Record<string, unknown>) => {
    const parts: string[] = []
    if (hasHighImpactPauseInAutoContinuation(autoContinuation))
      parts.push('Auto-continuation paused before a high-impact action requiring confirmation.')
    const seenToolNames = new Set<string>()
    const pushToolName = (toolNames: string[], toolName: string) => {
      if (!toolName || seenToolNames.has(toolName))
        return
      seenToolNames.add(toolName)
      toolNames.push(toolName)
    }

    const executedSteps = Array.isArray(autoContinuation.executedSteps)
      ? autoContinuation.executedSteps.filter(value => Boolean(asRecord(value)))
      : []
    const toolNames: string[] = []
    for (const step of executedSteps) {
      const toolName = sanitizeText(asRecord(step)?.toolName)
      pushToolName(toolNames, toolName)
    }

    if (executedSteps.length === 1) {
      const firstStep = asRecord(executedSteps[0])
      const nestedAutoContinuation = asRecord(asRecord(firstStep?.result)?.autoContinuation)
      const nestedExecutedSteps = Array.isArray(nestedAutoContinuation?.executedSteps)
        ? nestedAutoContinuation.executedSteps.filter(value => Boolean(asRecord(value)))
        : []
      for (const nestedStep of nestedExecutedSteps) {
        const nestedToolName = sanitizeText(asRecord(nestedStep)?.toolName)
        pushToolName(toolNames, nestedToolName)
      }
    }

    if (toolNames.length > 0)
      parts.push(`Auto-continued with ${toolNames.join(', ')}.`)
    return parts.join(' ')
  }

  maybeFollowUpExecutorWorkflow = async (input: {
    payload: MainGatewayExecutorFollowUpInput
    result: MainGatewayToolResultObject
  }): Promise<MainGatewayToolResultObject> => {
    const status = sanitizeText(input.result.status).toLowerCase()
    const inspectionQuestionCandidate = sanitizeText(input.payload.inspectionQuestion)
    const autoContinueSuggestedActions = input.payload.autoContinueSuggestedActions === true
    const reinspectAfterAction = input.payload.reinspectAfterAction === true
    const shouldInspectAfterAction = autoContinueSuggestedActions || reinspectAfterAction || Boolean(inspectionQuestionCandidate)
    if (status !== 'completed' || !shouldInspectAfterAction || !options.desktopInspectScene)
      return input.result

    const inspectionMaxSuggestedActionsRaw = input.payload.inspectionMaxSuggestedActions
    const inspectionMaxSuggestedActions = typeof inspectionMaxSuggestedActionsRaw === 'number' && Number.isFinite(inspectionMaxSuggestedActionsRaw)
      ? Math.max(1, Math.floor(inspectionMaxSuggestedActionsRaw))
      : 3
    const inspectionResultRaw = await options.desktopInspectScene({
      cardId: context.cardId,
      question: inspectionQuestionCandidate || undefined,
      forceRefresh: true,
      maxSuggestedActions: inspectionMaxSuggestedActions,
    })
    const postActionInspection = asRecord(inspectionResultRaw)
    const observedPhase = sanitizeText(postActionInspection?.pagePhase) || undefined
    const nextActionIntent = sanitizeText(postActionInspection?.nextActionIntent) || undefined
    const browserPageContext = asRecord(postActionInspection?.browserPageContext)
    const hasBlockingSignals = Array.isArray(postActionInspection?.blockingSignals)
    const blockingSignals = sanitizeStringList(postActionInspection?.blockingSignals)
    const guiStructure = asRecord(postActionInspection?.guiStructure)
    const workflowState = asRecord(postActionInspection?.workflowState)
    const workflowPlan = asRecord(postActionInspection?.workflowPlan)
    const executionStrategy = asRecord(postActionInspection?.executionStrategy)
    const screenSemanticSummary = asRecord(postActionInspection?.screenSemanticSummary)
    const hasSuggestedActions = Array.isArray(postActionInspection?.suggestedActions)
    const suggestedActions = Array.isArray(postActionInspection?.suggestedActions)
      ? postActionInspection?.suggestedActions.filter(value => Boolean(asRecord(value))) as Array<Record<string, unknown>>
      : []
    const unavailableReason = sanitizeText(postActionInspection?.unavailableReason) || undefined
    const maxAutoContinueSteps = normalizeAutoContinueStepCount(input.payload.maxAutoContinueSteps)
    const progressState = sanitizeText(workflowState?.progressState) || undefined
    const continuationSummary = observedPhase
      ? `Post-executor inspection observed ${observedPhase}.`
      : 'Post-executor inspection did not detect a stable phase.'
    const workflowContinuation = compactRecord({
      observedPhase,
      progressState,
      postExecutorInspection: true,
    })
    const outputPayload = compactRecord({
      output: input.result.output,
      browserPageContext,
      guiStructure,
      pagePhase: observedPhase,
      nextActionIntent,
      workflowPlan,
      workflowState,
      executionStrategy,
      screenSemanticSummary,
      unavailableReason,
      workflowContinuation,
      postActionInspection,
    })
    if (hasBlockingSignals)
      outputPayload.blockingSignals = blockingSignals
    if (hasSuggestedActions)
      outputPayload.suggestedActions = suggestedActions

    const mergedResult = compactRecord({
      ...input.result,
      browserPageContext,
      guiStructure,
      pagePhase: observedPhase,
      nextActionIntent,
      workflowPlan,
      workflowState,
      executionStrategy,
      screenSemanticSummary,
      unavailableReason,
      summary: [sanitizeText(input.result.summary), continuationSummary].filter(Boolean).join(' '),
      workflowContinuation,
      postActionInspection,
      output: JSON.stringify(outputPayload),
    })
    if (hasBlockingSignals)
      mergedResult.blockingSignals = blockingSignals
    if (hasSuggestedActions)
      mergedResult.suggestedActions = suggestedActions

    const autoContinuation = await executeAutoContinuation({
      continuationMode: sanitizeText(workflowPlan?.continuationMode) || undefined,
      blockingSignals,
      requested: autoContinueSuggestedActions,
      maxSteps: maxAutoContinueSteps,
      suggestedActions,
    })
    if (autoContinuation) {
      outputPayload.autoContinuation = autoContinuation
      mergedResult.autoContinuation = autoContinuation
      const autoContinuationSummary = buildAutoContinuationSummary(autoContinuation)
      if (autoContinuationSummary)
        mergedResult.summary = [sanitizeText(mergedResult.summary), autoContinuationSummary].filter(Boolean).join(' ')
    }
    mergedResult.output = JSON.stringify(outputPayload)
    return mergedResult
  }

  maybeFollowUpVisualWorkflow = async (input: {
    operation: 'browser_open_url' | 'browser_search_web' | 'browser_click_element' | 'browser_type_text' | 'browser_navigate' | 'browser_scroll' | 'browser_wait' | 'desktop_click_element' | 'desktop_type_text' | 'desktop_press_keys' | 'desktop_open_application'
    payload:
      | AlicizationLocalBrowserOpenUrlInput
      | AlicizationLocalBrowserSearchWebInput
      | AlicizationLocalBrowserClickElementInput
      | AlicizationLocalBrowserTypeTextInput
      | AlicizationLocalBrowserNavigateInput
      | AlicizationLocalBrowserScrollInput
      | AlicizationLocalBrowserWaitInput
      | AlicizationLocalDesktopClickElementInput
      | AlicizationLocalDesktopTypeTextInput
      | AlicizationLocalDesktopPressKeysInput
      | AlicizationLocalDesktopOpenApplicationInput
    result: MainGatewayToolResultObject
  }): Promise<MainGatewayToolResultObject> => {
    const status = sanitizeText(input.result.status).toLowerCase()
    const expectedPhase = sanitizeText((input.payload as { expectedPhase?: unknown }).expectedPhase)
    const reinspectAfterAction = (input.payload as { reinspectAfterAction?: unknown }).reinspectAfterAction === true
    const inspectionQuestionCandidate = sanitizeText((input.payload as { inspectionQuestion?: unknown }).inspectionQuestion)
    const autoContinueSuggestedActions = (input.payload as { autoContinueSuggestedActions?: unknown }).autoContinueSuggestedActions === true
    const entryWorkflowOperation = input.operation === 'browser_open_url' || input.operation === 'browser_search_web'
    const directReinspectWorkflowOperation = input.operation === 'browser_navigate'
      || input.operation === 'browser_scroll'
      || input.operation === 'desktop_press_keys'
      || input.operation === 'desktop_open_application'
    const shouldInspectAfterAction = entryWorkflowOperation || directReinspectWorkflowOperation
      ? (reinspectAfterAction || autoContinueSuggestedActions || Boolean(inspectionQuestionCandidate))
      : Boolean(expectedPhase) && reinspectAfterAction
    if (status !== 'completed' || !shouldInspectAfterAction || !options.desktopInspectScene)
      return input.result

    let autoWaitResult: Record<string, unknown> | null = null
    if (
      (input.operation === 'browser_click_element'
        || input.operation === 'browser_open_url'
        || input.operation === 'browser_search_web'
        || input.operation === 'browser_navigate'
        || (input.operation === 'browser_type_text' && (input.payload as { submit?: unknown }).submit === true))
      && options.browserWait
    ) {
      const waitResult = await options.browserWait({
        browser: sanitizeText((input.payload as { browser?: unknown }).browser) || undefined,
        state: 'complete',
        timeoutMs: 5_000,
      })
      autoWaitResult = asRecord(waitResult)
      const waitStatus = sanitizeText(autoWaitResult?.status).toLowerCase()
      if (waitStatus && waitStatus !== 'completed') {
        const workflowContinuation = compactRecord({
          expectedPhase,
          autoWaitApplied: true,
          autoWaitStatus: waitStatus,
        })
        return {
          ...input.result,
          workflowContinuation,
          postActionInspection: null,
          output: JSON.stringify(compactRecord({
            output: input.result.output,
            workflowContinuation,
            postActionInspection: null,
          })),
        }
      }
    }

    const inspectionQuestion = inspectionQuestionCandidate || undefined
    const inspectionMaxSuggestedActionsRaw = (input.payload as { inspectionMaxSuggestedActions?: unknown }).inspectionMaxSuggestedActions
    const inspectionMaxSuggestedActions = typeof inspectionMaxSuggestedActionsRaw === 'number' && Number.isFinite(inspectionMaxSuggestedActionsRaw)
      ? Math.max(1, Math.floor(inspectionMaxSuggestedActionsRaw))
      : 3
    const inspectionResultRaw = await options.desktopInspectScene({
      cardId: context.cardId,
      question: inspectionQuestion,
      forceRefresh: true,
      maxSuggestedActions: inspectionMaxSuggestedActions,
    })
    const postActionInspection = asRecord(inspectionResultRaw)
    const observedPhase = sanitizeText(postActionInspection?.pagePhase) || undefined
    const nextActionIntent = sanitizeText(postActionInspection?.nextActionIntent) || undefined
    const browserPageContext = asRecord(postActionInspection?.browserPageContext)
    const hasBlockingSignals = Array.isArray(postActionInspection?.blockingSignals)
    const blockingSignals = sanitizeStringList(postActionInspection?.blockingSignals)
    const guiStructure = asRecord(postActionInspection?.guiStructure)
    const workflowState = asRecord(postActionInspection?.workflowState)
    const workflowPlan = asRecord(postActionInspection?.workflowPlan)
    const executionStrategy = asRecord(postActionInspection?.executionStrategy)
    const screenSemanticSummary = asRecord(postActionInspection?.screenSemanticSummary)
    const inspectedSuggestedActions = Array.isArray(postActionInspection?.suggestedActions)
      ? postActionInspection?.suggestedActions.filter(value => Boolean(asRecord(value))) as Array<Record<string, unknown>>
      : []
    const matchedExpectedPhase = expectedPhase
      ? Boolean(observedPhase && observedPhase === expectedPhase)
      : undefined
    const hasExecutableSuggestedAction = inspectedSuggestedActions.some(action => Boolean(sanitizeText(action.toolName)))
    const navigationLikeBrowserFollowUp = input.operation === 'browser_click_element'
      || input.operation === 'browser_open_url'
      || input.operation === 'browser_search_web'
      || input.operation === 'browser_navigate'
      || input.operation === 'browser_scroll'
      || input.operation === 'browser_wait'
      || (input.operation === 'browser_type_text' && (input.payload as { submit?: unknown }).submit === true)
    const noExecutableSuggestedActions = inspectedSuggestedActions.length === 0 || !hasExecutableSuggestedAction
    const browserFollowUpRecommended = sanitizeText(executionStrategy?.recommendedChannel) === 'browser'
      || Boolean(browserPageContext)
      || Boolean(observedPhase && browserLikePagePhases.has(observedPhase))
    const shouldFallbackToDesktopRelist = noExecutableSuggestedActions
      ? input.operation === 'desktop_click_element'
      && reinspectAfterAction
      && autoContinueSuggestedActions
      && (!expectedPhase || matchedExpectedPhase === true)
      && Boolean(options.desktopListInteractables)
      : false
    const shouldFallbackToBrowserRead = noExecutableSuggestedActions
      ? navigationLikeBrowserFollowUp
      && reinspectAfterAction
      && autoContinueSuggestedActions
      && (!expectedPhase || matchedExpectedPhase === true)
      && browserFollowUpRecommended
      && Boolean(options.browserReadPage)
      : false
    const suggestedActions = shouldFallbackToDesktopRelist
      ? [
          {
            kind: 'desktop-relist-after-follow-up-click',
            title: '重新列出当前桌面控件确认最新状态',
            rationale: '点击桌面控件后，当前重检还没有稳定暴露出后续动作。先重新列出前台控件，确认设置是否已经生效，或者界面是否进入了新的稳定场景。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
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
                  browser: sanitizeText((input.payload as { browser?: unknown }).browser) || sanitizeText(browserPageContext?.browser) || undefined,
                  format: 'text',
                }),
              } satisfies Record<string, unknown>,
          ]
        : inspectedSuggestedActions
    const hasSuggestedActions = suggestedActions.length > 0
    const unavailableReason = sanitizeText(postActionInspection?.unavailableReason) || undefined
    const maxAutoContinueSteps = normalizeAutoContinueStepCount((input.payload as { maxAutoContinueSteps?: unknown }).maxAutoContinueSteps)
    const progressState = sanitizeText(workflowState?.progressState) || undefined
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
      expectedPhase,
      observedPhase,
      progressState,
      matchedExpectedPhase,
      autoWaitApplied: input.operation === 'browser_click_element'
        || input.operation === 'browser_type_text'
        || input.operation === 'browser_open_url'
        || input.operation === 'browser_search_web'
        || input.operation === 'browser_navigate',
      autoWaitStatus: sanitizeText(autoWaitResult?.status) || undefined,
    })
    const outputPayload = compactRecord({
      output: input.result.output,
      browserPageContext,
      guiStructure,
      pagePhase: observedPhase,
      nextActionIntent,
      workflowPlan,
      workflowState,
      executionStrategy,
      screenSemanticSummary,
      unavailableReason,
      workflowContinuation,
      postActionInspection,
    })
    if (hasBlockingSignals)
      outputPayload.blockingSignals = blockingSignals
    if (hasSuggestedActions)
      outputPayload.suggestedActions = suggestedActions
    const output = JSON.stringify(outputPayload)

    const mergedResult = compactRecord({
      ...input.result,
      browserPageContext,
      guiStructure,
      pagePhase: observedPhase,
      nextActionIntent,
      workflowPlan,
      workflowState,
      executionStrategy,
      screenSemanticSummary,
      unavailableReason,
      summary: [sanitizeText(input.result.summary), continuationSummary].filter(Boolean).join(' '),
      workflowContinuation,
      postActionInspection,
      output,
    })
    if (hasBlockingSignals)
      mergedResult.blockingSignals = blockingSignals
    if (hasSuggestedActions)
      mergedResult.suggestedActions = suggestedActions

    const autoContinuation = await executeAutoContinuation({
      continuationMode: sanitizeText(workflowPlan?.continuationMode) || undefined,
      blockingSignals,
      requested: autoContinueSuggestedActions && (expectedPhase ? matchedExpectedPhase === true : true),
      maxSteps: maxAutoContinueSteps,
      suggestedActions,
    })
    if (autoContinuation) {
      outputPayload.autoContinuation = autoContinuation
      mergedResult.autoContinuation = autoContinuation
      const autoContinuationSummary = buildAutoContinuationSummary(autoContinuation)
      if (autoContinuationSummary)
        mergedResult.summary = [sanitizeText(mergedResult.summary), autoContinuationSummary].filter(Boolean).join(' ')
    }
    mergedResult.output = JSON.stringify(outputPayload)
    return mergedResult
  }

  const runOptionalLocalTool = async <TInput extends object>(input: {
    handler?: ((payload: TInput) => Promise<unknown>) | null
    missingErrorCode: string
    missingErrorMessage: string
    operation: string
    payload: TInput
  }): Promise<MainGatewayToolResultObject> => {
    if (!input.handler) {
      return {
        status: 'failed',
        operation: input.operation,
        errorCode: input.missingErrorCode,
        errorMessage: input.missingErrorMessage,
      }
    }

    const result = await input.handler(input.payload)
    const normalizedResult = asRecord(result) ?? {
      status: 'completed',
      operation: input.operation,
      result,
    }
    if (
      input.operation === 'browser_open_url'
      || input.operation === 'browser_search_web'
      || input.operation === 'browser_click_element'
      || input.operation === 'browser_type_text'
      || input.operation === 'browser_navigate'
      || input.operation === 'browser_scroll'
      || input.operation === 'browser_wait'
      || input.operation === 'desktop_click_element'
      || input.operation === 'desktop_type_text'
      || input.operation === 'desktop_press_keys'
      || input.operation === 'desktop_open_application'
    ) {
      return await maybeFollowUpVisualWorkflow({
        operation: input.operation as
        | 'browser_open_url'
        | 'browser_search_web'
        | 'browser_click_element'
        | 'browser_type_text'
        | 'browser_navigate'
        | 'browser_scroll'
        | 'browser_wait'
        | 'desktop_click_element'
        | 'desktop_type_text'
        | 'desktop_press_keys'
        | 'desktop_open_application',
        payload: input.payload as
        | AlicizationLocalBrowserOpenUrlInput
        | AlicizationLocalBrowserSearchWebInput
        | AlicizationLocalBrowserClickElementInput
        | AlicizationLocalBrowserTypeTextInput
        | AlicizationLocalBrowserNavigateInput
        | AlicizationLocalBrowserScrollInput
        | AlicizationLocalBrowserWaitInput
        | AlicizationLocalDesktopClickElementInput
        | AlicizationLocalDesktopTypeTextInput
        | AlicizationLocalDesktopPressKeysInput
        | AlicizationLocalDesktopOpenApplicationInput,
        result: normalizedResult,
      })
    }
    if (
      input.operation === 'browser_click_element'
      || input.operation === 'browser_type_text'
      || input.operation === 'browser_wait'
      || input.operation === 'desktop_click_element'
      || input.operation === 'desktop_type_text'
    ) {
      return normalizedResult
    }
    return normalizedResult
  }

  const invokeMcpWithCandidates = async (input: {
    argumentCandidates: Record<string, unknown>[]
    toolNameCandidates: string[]
  }): Promise<MainGatewayMcpCallOutcome> => {
    const attempts: MainGatewayMcpCallAttempt[] = []
    const toolNames = [...new Set(input.toolNameCandidates.map(value => sanitizeText(value)).filter(Boolean))]
    const argumentCandidates = input.argumentCandidates.length > 0
      ? input.argumentCandidates
      : [{}]
    let finalResult: NormalizedMcpToolCallResult | null = null
    let finalToolName: string | null = null
    let finalArguments: Record<string, unknown> | null = null

    for (const toolName of toolNames) {
      const seenArguments = new Set<string>()
      for (const argumentsObject of argumentCandidates) {
        const signature = JSON.stringify(argumentsObject)
        if (seenArguments.has(signature))
          continue
        seenArguments.add(signature)

        const normalizedResult = normalizeMcpToolCallResult(await options.invokeMcpCallTool({
          cardId: context.cardId,
          name: toolName,
          arguments: argumentsObject,
        }))

        finalResult = normalizedResult
        finalToolName = toolName
        finalArguments = argumentsObject
        if (!normalizedResult.isError) {
          return {
            attempts,
            toolName,
            arguments: argumentsObject,
            result: normalizedResult,
          }
        }

        const errorMessage = normalizeMcpErrorMessage(normalizedResult)
        attempts.push({
          toolName,
          arguments: argumentsObject,
          errorCode: normalizedResult.errorCode,
          errorMessage,
        })

        if (!isRecoverableMcpCandidateError(normalizedResult)) {
          return {
            attempts,
            toolName,
            arguments: argumentsObject,
            result: normalizedResult,
          }
        }
      }
    }

    return {
      attempts,
      toolName: finalToolName,
      arguments: finalArguments,
      result: finalResult ?? {
        isError: true,
        ok: false,
        errorCode: 'MCP_CALL_UNAVAILABLE',
        errorMessage: 'MCP tool invocation is unavailable.',
      },
    }
  }

  const readFileViaMcp = async (input: {
    path: string
    maxReturnBytes?: number
  }) => {
    const path = sanitizeText(input.path)
    if (!path) {
      return {
        status: 'failed',
        operation: 'read_file',
        path: '',
        errorCode: 'FILESYSTEM_INVALID_PATH',
        errorMessage: 'Path is required for filesystem_read_file.',
      } as const
    }

    const invocation = await invokeMcpWithCandidates({
      toolNameCandidates: [
        'filesystem::read_file',
        'filesystem::read-file',
      ],
      argumentCandidates: [
        { path },
        { filePath: path },
      ],
    })

    if (invocation.result.isError) {
      return {
        status: 'failed',
        operation: 'read_file',
        path,
        errorCode: invocation.result.errorCode ?? 'FILESYSTEM_READ_FAILED',
        errorMessage: normalizeMcpErrorMessage(invocation.result),
        mcpToolName: invocation.toolName,
        attempts: invocation.attempts,
      } as const
    }

    const fullContent = extractTextFromMcpResult(invocation.result)
    const contentHash = hashTextContent(fullContent)
    const maxReturnBytes = normalizeFilesystemReturnLimit(input.maxReturnBytes)
    const truncatedPayload = truncateTextByByteLimit({
      content: fullContent,
      maxBytes: maxReturnBytes,
      operation: 'read_file',
    })
    const fileReadState: MainGatewayFileReadState = {
      content: fullContent,
      contentHash,
      byteLength: truncatedPayload.byteLength,
      readAt: Date.now(),
    }
    fileReadStateByPath.set(path, fileReadState)

    return {
      status: 'completed',
      operation: 'read_file',
      path,
      content: truncatedPayload.content,
      contentHash,
      byteLength: truncatedPayload.byteLength,
      truncated: truncatedPayload.truncated,
      mcpToolName: invocation.toolName,
      attempts: invocation.attempts,
    } as const
  }

  const writeFileViaMcp = async (input: {
    content: string
    expectedHash?: string
    path: string
  }) => {
    const path = sanitizeText(input.path)
    if (!path) {
      return {
        status: 'failed',
        operation: 'write_file',
        path: '',
        errorCode: 'FILESYSTEM_INVALID_PATH',
        errorMessage: 'Path is required for filesystem_write_file.',
      } as const
    }
    const expectedHash = sanitizeText(input.expectedHash)
    if (expectedHash) {
      const cached = fileReadStateByPath.get(path)
      if (!cached) {
        return {
          status: 'failed',
          operation: 'write_file',
          path,
          errorCode: 'FILESYSTEM_EXPECTED_HASH_MISSING',
          errorMessage: 'expectedHash was provided but no prior filesystem_read_file state exists in this turn.',
        } as const
      }
      if (cached.contentHash !== expectedHash) {
        return {
          status: 'failed',
          operation: 'write_file',
          path,
          errorCode: 'FILESYSTEM_EXPECTED_HASH_CONFLICT',
          errorMessage: `expectedHash mismatch (expected ${expectedHash}, actual ${cached.contentHash}).`,
          expectedHash,
          actualHash: cached.contentHash,
        } as const
      }
    }

    const invocation = await invokeMcpWithCandidates({
      toolNameCandidates: [
        'filesystem::write_file',
        'filesystem::write-file',
      ],
      argumentCandidates: [
        { path, content: input.content },
        { filePath: path, content: input.content },
        { path, text: input.content },
      ],
    })

    if (invocation.result.isError) {
      return {
        status: 'failed',
        operation: 'write_file',
        path,
        errorCode: invocation.result.errorCode ?? 'FILESYSTEM_WRITE_FAILED',
        errorMessage: normalizeMcpErrorMessage(invocation.result),
        mcpToolName: invocation.toolName,
        attempts: invocation.attempts,
      } as const
    }

    const contentHash = hashTextContent(input.content)
    const byteLength = Buffer.byteLength(input.content, 'utf8')
    fileReadStateByPath.set(path, {
      content: input.content,
      contentHash,
      byteLength,
      readAt: Date.now(),
    })

    return {
      status: 'completed',
      operation: 'write_file',
      path,
      byteLength,
      contentHash,
      mcpToolName: invocation.toolName,
      attempts: invocation.attempts,
    } as const
  }

  const patchFileViaMcp = async (input: {
    changes: Array<{
      newText: string
      oldText: string
      replaceAll?: boolean
    }>
    dryRun?: boolean
    expectedHash?: string
    ignoreMissing?: boolean
    maxPreviewBytes?: number
    path: string
  }): Promise<MainGatewayToolResultObject> => {
    const normalizedPath = sanitizeText(input.path)
    if (!normalizedPath) {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: '',
        errorCode: 'FILESYSTEM_INVALID_PATH',
        errorMessage: 'Path is required for filesystem_patch_file.',
      } as const
    }

    if (!Array.isArray(input.changes) || input.changes.length <= 0) {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: normalizedPath,
        errorCode: 'FILESYSTEM_PATCH_EMPTY_CHANGES',
        errorMessage: 'changes must contain at least one patch instruction.',
      } as const
    }

    for (let index = 0; index < input.changes.length; index += 1) {
      const change = input.changes[index]!
      if (change.oldText.length <= 0) {
        return {
          status: 'failed',
          operation: 'patch_file',
          path: normalizedPath,
          errorCode: 'FILESYSTEM_PATCH_INVALID_CHANGE',
          errorMessage: `changes[${index}].oldText cannot be empty.`,
          changeIndex: index,
        } as const
      }
    }

    let readState = fileReadStateByPath.get(normalizedPath)
    if (!readState) {
      const readResult = await readFileViaMcp({
        path: normalizedPath,
        maxReturnBytes: filesystemToolEditableMaxBytes,
      })
      if (readResult.status !== 'completed') {
        return {
          status: 'failed',
          operation: 'patch_file',
          path: normalizedPath,
          errorCode: readResult.errorCode ?? 'FILESYSTEM_PATCH_READ_FAILED',
          errorMessage: readResult.errorMessage ?? 'Failed to read file before patch.',
          readFailure: readResult,
        } as const
      }
      if (readResult.truncated) {
        return {
          status: 'failed',
          operation: 'patch_file',
          path: normalizedPath,
          errorCode: 'FILESYSTEM_PATCH_INPUT_TRUNCATED',
          errorMessage: `File exceeds patch budget (${filesystemToolEditableMaxBytes} bytes).`,
          byteLength: readResult.byteLength,
        } as const
      }
      readState = fileReadStateByPath.get(normalizedPath)
    }

    if (!readState) {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: normalizedPath,
        errorCode: 'FILESYSTEM_PATCH_STATE_MISSING',
        errorMessage: 'Unable to recover read state for filesystem_patch_file.',
      } as const
    }

    const expectedHashValue = sanitizeText(input.expectedHash)
    if (expectedHashValue && expectedHashValue !== readState.contentHash) {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: normalizedPath,
        errorCode: 'FILESYSTEM_EXPECTED_HASH_CONFLICT',
        errorMessage: `expectedHash mismatch (expected ${expectedHashValue}, actual ${readState.contentHash}).`,
        expectedHash: expectedHashValue,
        actualHash: readState.contentHash,
      } as const
    }

    const ignoreMissing = input.ignoreMissing === true
    let nextContent = readState.content
    let totalReplacedCount = 0
    const changeResults: Array<{
      changeIndex: number
      replacedCount: number
      replaceAll: boolean
      skipped: boolean
    }> = []

    for (let index = 0; index < input.changes.length; index += 1) {
      const change = input.changes[index]!
      const oldText = change.oldText
      const newText = change.newText
      const occurrences = nextContent.split(oldText).length - 1
      if (occurrences <= 0) {
        if (!ignoreMissing) {
          return {
            status: 'failed',
            operation: 'patch_file',
            path: normalizedPath,
            errorCode: 'FILESYSTEM_PATCH_TARGET_NOT_FOUND',
            errorMessage: `changes[${index}] oldText was not found in current file content.`,
            changeIndex: index,
            contentHash: readState.contentHash,
          } as const
        }
        changeResults.push({
          changeIndex: index,
          replacedCount: 0,
          replaceAll: change.replaceAll === true,
          skipped: true,
        })
        continue
      }

      const replaceEveryMatch = change.replaceAll === true
      const replacedCount = replaceEveryMatch ? occurrences : 1
      nextContent = replaceEveryMatch
        ? nextContent.split(oldText).join(newText)
        : nextContent.replace(oldText, newText)
      totalReplacedCount += replacedCount
      changeResults.push({
        changeIndex: index,
        replacedCount,
        replaceAll: replaceEveryMatch,
        skipped: false,
      })
    }

    if (totalReplacedCount <= 0) {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: normalizedPath,
        errorCode: 'FILESYSTEM_PATCH_NO_CHANGES_APPLIED',
        errorMessage: 'Patch finished with zero replacements.',
      } as const
    }

    const dryRun = input.dryRun === true
    const nextHash = hashTextContent(nextContent)
    const nextByteLength = Buffer.byteLength(nextContent, 'utf8')
    if (dryRun) {
      const previewBudget = typeof input.maxPreviewBytes === 'number' && Number.isFinite(input.maxPreviewBytes)
        ? input.maxPreviewBytes
        : filesystemToolDefaultPatchPreviewBytes
      const previewPayload = truncateTextByByteLimit({
        content: nextContent,
        maxBytes: normalizeFilesystemReturnLimit(previewBudget),
        operation: 'patch_preview',
      })
      const appliedChanges = changeResults.filter(change => !change.skipped).length
      return {
        status: 'completed',
        operation: 'patch_file',
        dryRun: true,
        writeApplied: false,
        path: normalizedPath,
        totalChanges: input.changes.length,
        appliedChanges,
        skippedChanges: input.changes.length - appliedChanges,
        totalReplacedCount,
        changeResults,
        previousHash: readState.contentHash,
        nextHash,
        byteLength: nextByteLength,
        preview: previewPayload.content,
        previewByteLength: previewPayload.byteLength,
        previewTruncated: previewPayload.truncated,
      } as const
    }

    const writeResult = await writeFileViaMcp({
      path: normalizedPath,
      content: nextContent,
      expectedHash: readState.contentHash,
    })
    if (writeResult.status !== 'completed') {
      return {
        status: 'failed',
        operation: 'patch_file',
        path: normalizedPath,
        errorCode: writeResult.errorCode ?? 'FILESYSTEM_PATCH_WRITE_FAILED',
        errorMessage: writeResult.errorMessage ?? 'Failed to persist patch changes.',
        writeFailure: writeResult,
      } as const
    }

    const appliedChanges = changeResults.filter(change => !change.skipped).length
    return {
      status: 'completed',
      operation: 'patch_file',
      dryRun: false,
      writeApplied: true,
      path: normalizedPath,
      totalChanges: input.changes.length,
      appliedChanges,
      skippedChanges: input.changes.length - appliedChanges,
      totalReplacedCount,
      changeResults,
      previousHash: readState.contentHash,
      nextHash,
      byteLength: nextByteLength,
      mcpToolName: writeResult.mcpToolName,
    } as const
  }

  const tools: Array<Promise<Tool>> = [
    tool({
      name: 'set_reminder',
      description: '在系统后台创建倒计时提醒。工具成功表示任务已调度；提醒内容尚未触发，实际触发发生在倒计时结束后。',
      parameters: z.object({
        minutes: z.coerce.number(),
        message: z.string(),
      }).strict(),
      execute: async ({ minutes, message }) => {
        return await options.scheduleReminderTask(context.cardId, {
          minutes: Number(minutes),
          message,
        }, 'tool')
      },
    }),
    tool({
      name: 'executor_capability_snapshot',
      description: 'Return Alicization execution channel capability snapshot for CLI/Codex/Claude Code/OpenClaw/OpenFang/Browser/Software/Desktop.',
      parameters: z.object({
        channels: z.array(z.enum(options.executionCapabilityChannels)).optional(),
      }).strict(),
      execute: async ({ channels }) => {
        const channelFilter = new Set((Array.isArray(channels) ? channels : [])
          .filter((channel): channel is AlicizationExecutionCapabilityChannel => options.executionCapabilityChannels.includes(channel as AlicizationExecutionCapabilityChannel)))
        const capabilities = await options.resolveTaskPlanningCapabilities()
        const normalized = capabilities
          .filter((capability) => {
            if (channelFilter.size === 0)
              return true
            return channelFilter.has(capability.channel as AlicizationExecutionCapabilityChannel)
          })
        return {
          generatedAt: Date.now(),
          channels: normalized,
        }
      },
    }),
    tool({
      name: 'sensory_capture_state',
      description: 'Return the current Alicization sensory and desktop capture state, including foreground window, capture permission, and capture health.',
      parameters: z.object({
        includeSystemSample: z.boolean().optional(),
      }).strict(),
      execute: async ({ includeSystemSample }) => {
        const snapshot = await options.getSensorySnapshot()
        return toSensoryCaptureStateResult(snapshot, includeSystemSample === true)
      },
    }),
    tool({
      name: 'browser_open_url',
      description: 'Open a local browser directly, optionally visiting a URL, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
        site: z.string().min(1).optional(),
        url: z.string().min(1).optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, expectedPhase, inspectionMaxSuggestedActions, inspectionQuestion, maxAutoContinueSteps, reinspectAfterAction, site, url, browser }) => await runOptionalLocalTool({
        handler: options.browserOpenUrl,
        operation: 'browser_open_url',
        missingErrorCode: 'BROWSER_OPEN_URL_UNAVAILABLE',
        missingErrorMessage: 'Local browser_open_url handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          expectedPhase,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
          reinspectAfterAction,
          site,
          url,
          browser,
        },
      }),
    }),
    tool({
      name: 'browser_search_web',
      description: 'Run a direct local browser web search without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        query: z.string().min(1),
        reinspectAfterAction: z.boolean().optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        searchEngine: z.enum(['baidu', 'bing', 'duckduckgo', 'google']).optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, expectedPhase, inspectionMaxSuggestedActions, inspectionQuestion, maxAutoContinueSteps, query, reinspectAfterAction, browser, searchEngine }) => await runOptionalLocalTool({
        handler: options.browserSearchWeb,
        operation: 'browser_search_web',
        missingErrorCode: 'BROWSER_SEARCH_WEB_UNAVAILABLE',
        missingErrorMessage: 'Local browser_search_web handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          expectedPhase,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
          query,
          reinspectAfterAction,
          browser: browser ?? 'default',
          searchEngine,
        },
      }),
    }),
    tool({
      name: 'browser_read_page',
      description: 'Read the current local browser page directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        format: z.enum(['html', 'interactables', 'text']).optional(),
        maxChars: z.coerce.number().optional(),
      }).strict(),
      execute: async ({ browser, format, maxChars }) => await runOptionalLocalTool({
        handler: options.browserReadPage,
        operation: 'browser_read_page',
        missingErrorCode: 'BROWSER_READ_PAGE_UNAVAILABLE',
        missingErrorMessage: 'Local browser_read_page handler is not configured for this runtime.',
        payload: {
          browser,
          format,
          maxChars: normalizeFinitePositiveInteger(maxChars),
        },
      }),
    }),
    tool({
      name: 'browser_click_element',
      description: 'Click an element in a local browser directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        ordinal: z.coerce.number().int().min(1).optional(),
        reinspectAfterAction: z.boolean().optional(),
        selector: z.string().min(1).optional(),
        targetType: z.enum(['button', 'element', 'link']).optional(),
        text: z.string().min(1).optional(),
        exactText: z.boolean().optional(),
      }).strict().refine(input => Boolean(sanitizeText(input.selector) || sanitizeText(input.text) || input.ordinal), {
        message: 'selector, text, or ordinal is required',
      }),
      execute: async ({ autoContinueSuggestedActions, browser, ordinal, selector, targetType, text, exactText, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.browserClickElement,
        operation: 'browser_click_element',
        missingErrorCode: 'BROWSER_CLICK_ELEMENT_UNAVAILABLE',
        missingErrorMessage: 'Local browser_click_element handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          browser,
          ordinal: typeof ordinal === 'number' && Number.isFinite(ordinal)
            ? Math.max(1, Math.floor(ordinal))
            : undefined,
          selector,
          targetType,
          text,
          exactText,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'browser_type_text',
      description: 'Type text into the current local browser page directly, optionally matching or reusing a focused input first, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        text: z.string().min(1),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        targetText: z.string().min(1).optional(),
        selector: z.string().min(1).optional(),
        ordinal: z.coerce.number().int().min(1).optional(),
        exactText: z.boolean().optional(),
        clearExisting: z.boolean().optional(),
        reinspectAfterAction: z.boolean().optional(),
        submit: z.boolean().optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, text, browser, targetText, selector, ordinal, exactText, clearExisting, submit, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.browserTypeText,
        operation: 'browser_type_text',
        missingErrorCode: 'BROWSER_TYPE_TEXT_UNAVAILABLE',
        missingErrorMessage: 'Local browser_type_text handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          text,
          browser,
          targetText,
          selector,
          ordinal: typeof ordinal === 'number' && Number.isFinite(ordinal)
            ? Math.max(1, Math.floor(ordinal))
            : undefined,
          exactText,
          clearExisting,
          submit,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'browser_navigate',
      description: 'Navigate the current local browser page directly, supporting back, forward, and reload, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        action: z.enum(['back', 'forward', 'reload']),
        autoContinueSuggestedActions: z.boolean().optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ action, autoContinueSuggestedActions, browser, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.browserNavigate,
        operation: 'browser_navigate',
        missingErrorCode: 'BROWSER_NAVIGATE_UNAVAILABLE',
        missingErrorMessage: 'Local browser_navigate handler is not configured for this runtime.',
        payload: {
          action,
          autoContinueSuggestedActions,
          browser,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'browser_scroll',
      description: 'Scroll the current local browser page directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        action: z.enum(['down', 'up', 'top', 'bottom']),
        amount: z.coerce.number().int().min(1).max(10).optional(),
        autoContinueSuggestedActions: z.boolean().optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ action, amount, autoContinueSuggestedActions, browser, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.browserScroll,
        operation: 'browser_scroll',
        missingErrorCode: 'BROWSER_SCROLL_UNAVAILABLE',
        missingErrorMessage: 'Local browser_scroll handler is not configured for this runtime.',
        payload: {
          action,
          amount: typeof amount === 'number' && Number.isFinite(amount)
            ? Math.max(1, Math.floor(amount))
            : undefined,
          autoContinueSuggestedActions,
          browser,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'browser_wait',
      description: 'Wait for the current local browser page to reach a ready state or content condition directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
        state: z.enum(['complete', 'interactive']).optional(),
        text: z.string().min(1).optional(),
        urlIncludes: z.string().min(1).optional(),
        timeoutMs: z.coerce.number().int().min(100).max(15_000).optional(),
        browser: z.enum(['default', 'chrome', 'safari']).optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, state, text, urlIncludes, timeoutMs, browser, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.browserWait,
        operation: 'browser_wait',
        missingErrorCode: 'BROWSER_WAIT_UNAVAILABLE',
        missingErrorMessage: 'Local browser_wait handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          state,
          text,
          urlIncludes,
          timeoutMs: typeof timeoutMs === 'number' && Number.isFinite(timeoutMs)
            ? Math.max(100, Math.floor(timeoutMs))
            : undefined,
          browser,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'desktop_inspect_scene',
      description: 'Inspect the current local desktop scene directly and return foreground window, capture state, browser page context, page phase, next-action intent, blocking signals, workflow plan, workflow state, semantic summary, execution strategy, and suggested next actions without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        question: z.string().min(1).optional(),
        forceRefresh: z.boolean().optional(),
        maxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        autoContinueSuggestedActions: z.boolean().optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
      }).strict(),
      execute: async ({ question, forceRefresh, maxSuggestedActions, autoContinueSuggestedActions, maxAutoContinueSteps }) => {
        const payload: AlicizationLocalDesktopInspectSceneInput = {
          question,
          forceRefresh,
          autoContinueSuggestedActions,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
          maxSuggestedActions: typeof maxSuggestedActions === 'number' && Number.isFinite(maxSuggestedActions)
            ? maxSuggestedActions
            : undefined,
        }

        const result = await runOptionalLocalTool({
          handler: options.desktopInspectScene,
          operation: 'desktop_inspect_scene',
          missingErrorCode: 'DESKTOP_INSPECT_SCENE_UNAVAILABLE',
          missingErrorMessage: 'Local desktop_inspect_scene handler is not configured for this runtime.',
          payload,
        })

        const suggestedActions = extractSuggestedActionRecords(result.suggestedActions)
        const workflowPlan = asRecord(result.workflowPlan)
        const blockingSignals = Array.isArray(result.blockingSignals)
          ? sanitizeStringList(result.blockingSignals)
          : []
        const autoContinuation = await executeAutoContinuation({
          continuationMode: sanitizeText(workflowPlan?.continuationMode) || undefined,
          blockingSignals,
          requested: autoContinueSuggestedActions === true,
          maxSteps: normalizeAutoContinueStepCount(maxAutoContinueSteps),
          suggestedActions,
        })
        if (!autoContinuation)
          return result

        const mergedResult = compactRecord({
          ...result,
          autoContinuation,
          summary: [sanitizeText(result.summary), buildAutoContinuationSummary(autoContinuation)].filter(Boolean).join(' '),
        })
        const parsedOutput = (() => {
          if (typeof result.output !== 'string')
            return null
          try {
            return asRecord(JSON.parse(result.output))
          }
          catch {
            return null
          }
        })()
        const outputPayload = compactRecord({
          ...parsedOutput,
          output: result.output,
          autoContinuation,
        })
        mergedResult.output = JSON.stringify(outputPayload)
        return mergedResult
      },
    }),
    tool({
      name: 'desktop_list_interactables',
      description: 'List interactable elements from the current local desktop window directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        role: z.enum(['button', 'checkbox', 'element', 'input', 'link', 'list-item', 'menu-item', 'radio', 'select', 'tab']).optional(),
        maxItems: z.coerce.number().int().min(1).max(40).optional(),
      }).strict(),
      execute: async ({ role, maxItems }) => await runOptionalLocalTool({
        handler: options.desktopListInteractables,
        operation: 'desktop_list_interactables',
        missingErrorCode: 'DESKTOP_LIST_INTERACTABLES_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_list_interactables handler is not configured for this runtime.',
        payload: {
          role,
          maxItems: normalizeFinitePositiveInteger(maxItems),
        },
      }),
    }),
    tool({
      name: 'desktop_click_element',
      description: 'Click an interactable element in the current local desktop window directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        ordinal: z.coerce.number().int().min(1).optional(),
        reinspectAfterAction: z.boolean().optional(),
        role: z.enum(['button', 'checkbox', 'element', 'input', 'link', 'list-item', 'menu-item', 'radio', 'select', 'tab']).optional(),
        text: z.string().min(1).optional(),
        exactText: z.boolean().optional(),
      }).strict().refine(input => Boolean(sanitizeText(input.text) || input.ordinal), {
        message: 'text or ordinal is required',
      }),
      execute: async ({ autoContinueSuggestedActions, ordinal, role, text, exactText, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.desktopClickElement,
        operation: 'desktop_click_element',
        missingErrorCode: 'DESKTOP_CLICK_ELEMENT_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_click_element handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          ordinal: typeof ordinal === 'number' && Number.isFinite(ordinal)
            ? Math.max(1, Math.floor(ordinal))
            : undefined,
          role,
          text,
          exactText,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'desktop_type_text',
      description: 'Type text into the current local desktop window directly, optionally focusing a matching input first, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        text: z.string().min(1),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        targetText: z.string().min(1).optional(),
        ordinal: z.coerce.number().int().min(1).optional(),
        role: z.enum(['button', 'checkbox', 'element', 'input', 'link', 'list-item', 'menu-item', 'radio', 'select', 'tab']).optional(),
        exactText: z.boolean().optional(),
        clearExisting: z.boolean().optional(),
        reinspectAfterAction: z.boolean().optional(),
        submit: z.boolean().optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, text, targetText, ordinal, role, exactText, clearExisting, submit, expectedPhase, reinspectAfterAction, inspectionQuestion, inspectionMaxSuggestedActions, maxAutoContinueSteps }) => await runOptionalLocalTool({
        handler: options.desktopTypeText,
        operation: 'desktop_type_text',
        missingErrorCode: 'DESKTOP_TYPE_TEXT_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_type_text handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          text,
          targetText,
          ordinal: typeof ordinal === 'number' && Number.isFinite(ordinal)
            ? Math.max(1, Math.floor(ordinal))
            : undefined,
          role,
          exactText,
          clearExisting,
          submit,
          expectedPhase,
          reinspectAfterAction,
          inspectionQuestion,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'desktop_press_keys',
      description: 'Press a shortcut in the current local desktop window directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
        shortcut: z.string().min(1),
        repeat: z.coerce.number().int().min(1).max(10).optional(),
      }).strict(),
      execute: async ({ autoContinueSuggestedActions, expectedPhase, inspectionMaxSuggestedActions, inspectionQuestion, maxAutoContinueSteps, reinspectAfterAction, shortcut, repeat }) => await runOptionalLocalTool({
        handler: options.desktopPressKeys,
        operation: 'desktop_press_keys',
        missingErrorCode: 'DESKTOP_PRESS_KEYS_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_press_keys handler is not configured for this runtime.',
        payload: {
          autoContinueSuggestedActions,
          expectedPhase,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          inspectionQuestion,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
          reinspectAfterAction,
          shortcut,
          repeat: normalizeFinitePositiveInteger(repeat),
        },
      }),
    }),
    tool({
      name: 'desktop_open_application',
      description: 'Open a local desktop application directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        appName: z.string().min(1),
        path: z.string().optional(),
        args: z.array(z.string()).optional(),
        autoContinueSuggestedActions: z.boolean().optional(),
        expectedPhase: z.enum(['unknown', 'login', 'search-results', 'social-feed', 'browser-desktop-handoff', 'content-detail', 'form-entry', 'upload-flow']).optional(),
        inspectionMaxSuggestedActions: z.coerce.number().int().min(1).max(5).optional(),
        inspectionQuestion: z.string().min(1).optional(),
        maxAutoContinueSteps: z.coerce.number().int().min(1).max(3).optional(),
        reinspectAfterAction: z.boolean().optional(),
      }).strict(),
      execute: async ({ appName, path, args, autoContinueSuggestedActions, expectedPhase, inspectionMaxSuggestedActions, inspectionQuestion, maxAutoContinueSteps, reinspectAfterAction }) => await runOptionalLocalTool({
        handler: options.desktopOpenApplication,
        operation: 'desktop_open_application',
        missingErrorCode: 'DESKTOP_OPEN_APPLICATION_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_open_application handler is not configured for this runtime.',
        payload: {
          appName,
          path,
          args: Array.isArray(args) ? args : [],
          autoContinueSuggestedActions,
          expectedPhase,
          inspectionMaxSuggestedActions: typeof inspectionMaxSuggestedActions === 'number' && Number.isFinite(inspectionMaxSuggestedActions)
            ? Math.max(1, Math.floor(inspectionMaxSuggestedActions))
            : undefined,
          inspectionQuestion,
          maxAutoContinueSteps: typeof maxAutoContinueSteps === 'number' && Number.isFinite(maxAutoContinueSteps)
            ? Math.max(1, Math.floor(maxAutoContinueSteps))
            : undefined,
          reinspectAfterAction,
        },
      }),
    }),
    tool({
      name: 'desktop_wait',
      description: 'Wait for a local desktop application or window title to become frontmost directly, without escalating to a broader OpenClaw task thread.',
      parameters: z.object({
        appName: z.string().min(1).optional(),
        titleIncludes: z.string().min(1).optional(),
        timeoutMs: z.coerce.number().int().min(100).max(15_000).optional(),
      }).strict().refine(input => Boolean(sanitizeText(input.appName) || sanitizeText(input.titleIncludes)), {
        message: 'appName or titleIncludes is required',
      }),
      execute: async ({ appName, titleIncludes, timeoutMs }) => await runOptionalLocalTool({
        handler: options.desktopWait,
        operation: 'desktop_wait',
        missingErrorCode: 'DESKTOP_WAIT_UNAVAILABLE',
        missingErrorMessage: 'Local desktop_wait handler is not configured for this runtime.',
        payload: {
          appName,
          titleIncludes,
          timeoutMs: typeof timeoutMs === 'number' && Number.isFinite(timeoutMs)
            ? Math.max(100, Math.floor(timeoutMs))
            : undefined,
        },
      }),
    }),
    tool({
      name: 'filesystem_read_file',
      description: 'Read local file content through MCP filesystem bridge and return normalized text/hash/truncation metadata.',
      parameters: z.object({
        path: z.string().min(1),
        maxReturnBytes: z.coerce.number().optional(),
      }).strict(),
      execute: async ({ path, maxReturnBytes }) => {
        const normalizedMaxReturnBytes = typeof maxReturnBytes === 'number' && Number.isFinite(maxReturnBytes)
          ? maxReturnBytes
          : undefined
        return await readFileViaMcp({
          path,
          maxReturnBytes: normalizedMaxReturnBytes,
        })
      },
    }),
    tool({
      name: 'filesystem_write_file',
      description: 'Write local file content through MCP filesystem bridge with optional expectedHash guard from a prior read.',
      parameters: z.object({
        path: z.string().min(1),
        content: z.string(),
        expectedHash: z.string().optional(),
      }).strict(),
      execute: async ({ path, content, expectedHash }) => await writeFileViaMcp({
        path,
        content,
        expectedHash,
      }),
    }),
    tool({
      name: 'filesystem_edit_file',
      description: 'Edit a local file via deterministic read-modify-write replace flow, with optional expectedHash conflict guard.',
      parameters: z.object({
        path: z.string().min(1),
        oldText: z.string(),
        newText: z.string(),
        replaceAll: z.boolean().optional(),
        expectedHash: z.string().optional(),
      }).strict(),
      execute: async ({ path, oldText, newText, replaceAll, expectedHash }): Promise<MainGatewayToolResultObject> => {
        const normalizedPath = sanitizeText(path)
        if (!normalizedPath) {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: '',
            errorCode: 'FILESYSTEM_INVALID_PATH',
            errorMessage: 'Path is required for filesystem_edit_file.',
          }
        }
        if (!oldText) {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: normalizedPath,
            errorCode: 'FILESYSTEM_EDIT_EMPTY_OLD_TEXT',
            errorMessage: 'oldText cannot be empty for deterministic edit.',
          }
        }

        let readState = fileReadStateByPath.get(normalizedPath)
        if (!readState) {
          const readResult = await readFileViaMcp({
            path: normalizedPath,
            maxReturnBytes: filesystemToolEditableMaxBytes,
          })
          if (readResult.status !== 'completed') {
            return {
              status: 'failed',
              operation: 'edit_file',
              path: normalizedPath,
              errorCode: readResult.errorCode ?? 'FILESYSTEM_EDIT_READ_FAILED',
              errorMessage: readResult.errorMessage ?? 'Failed to read file before edit.',
              readFailure: readResult,
            }
          }
          if (readResult.truncated) {
            return {
              status: 'failed',
              operation: 'edit_file',
              path: normalizedPath,
              errorCode: 'FILESYSTEM_EDIT_INPUT_TRUNCATED',
              errorMessage: `File exceeds edit budget (${filesystemToolEditableMaxBytes} bytes).`,
              byteLength: readResult.byteLength,
            }
          }
          readState = fileReadStateByPath.get(normalizedPath)
        }

        if (!readState) {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: normalizedPath,
            errorCode: 'FILESYSTEM_EDIT_STATE_MISSING',
            errorMessage: 'Unable to recover read state for filesystem_edit_file.',
          }
        }

        const expectedHashValue = sanitizeText(expectedHash)
        if (expectedHashValue && expectedHashValue !== readState.contentHash) {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: normalizedPath,
            errorCode: 'FILESYSTEM_EXPECTED_HASH_CONFLICT',
            errorMessage: `expectedHash mismatch (expected ${expectedHashValue}, actual ${readState.contentHash}).`,
            expectedHash: expectedHashValue,
            actualHash: readState.contentHash,
          }
        }

        const occurrences = readState.content.split(oldText).length - 1
        if (occurrences <= 0) {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: normalizedPath,
            errorCode: 'FILESYSTEM_EDIT_TARGET_NOT_FOUND',
            errorMessage: 'oldText was not found in current file content.',
            contentHash: readState.contentHash,
          }
        }

        const replaceEveryMatch = replaceAll === true
        const nextContent = replaceEveryMatch
          ? readState.content.split(oldText).join(newText)
          : readState.content.replace(oldText, newText)
        const writeResult = await writeFileViaMcp({
          path: normalizedPath,
          content: nextContent,
          expectedHash: readState.contentHash,
        })
        if (writeResult.status !== 'completed') {
          return {
            status: 'failed',
            operation: 'edit_file',
            path: normalizedPath,
            errorCode: writeResult.errorCode ?? 'FILESYSTEM_EDIT_WRITE_FAILED',
            errorMessage: writeResult.errorMessage ?? 'Failed to persist edit.',
            writeFailure: writeResult,
          }
        }

        return {
          status: 'completed',
          operation: 'edit_file',
          path: normalizedPath,
          replacedCount: replaceEveryMatch ? occurrences : 1,
          previousHash: readState.contentHash,
          nextHash: writeResult.contentHash,
          byteLength: writeResult.byteLength,
          mcpToolName: writeResult.mcpToolName,
        }
      },
    }),
    tool({
      name: 'filesystem_patch_file',
      description: 'Apply deterministic sequential text patch changes to a local file through read-modify-write flow. Supports dryRun preview without persisting.',
      parameters: z.object({
        path: z.string().min(1),
        changes: z.array(z.object({
          oldText: z.string().min(1),
          newText: z.string(),
          replaceAll: z.boolean().optional(),
        }).strict()).min(1),
        expectedHash: z.string().optional(),
        ignoreMissing: z.boolean().optional(),
        dryRun: z.boolean().optional(),
        maxPreviewBytes: z.coerce.number().optional(),
      }).strict(),
      execute: async ({ path, changes, expectedHash, ignoreMissing, dryRun, maxPreviewBytes }) => await patchFileViaMcp({
        path,
        changes,
        expectedHash,
        ignoreMissing,
        dryRun,
        maxPreviewBytes: typeof maxPreviewBytes === 'number' && Number.isFinite(maxPreviewBytes)
          ? maxPreviewBytes
          : undefined,
      }),
    }),
    tool({
      name: 'filesystem_list_directory',
      description: 'List a directory through MCP filesystem bridge with fallback aliases and normalized entry output.',
      parameters: z.object({
        path: z.string().min(1),
        recursive: z.boolean().optional(),
        maxReturnBytes: z.coerce.number().optional(),
        maxEntries: z.coerce.number().optional(),
      }).strict(),
      execute: async ({ path, recursive, maxReturnBytes, maxEntries }) => {
        const normalizedPath = sanitizeText(path)
        if (!normalizedPath) {
          return {
            status: 'failed',
            operation: 'list_directory',
            path: '',
            errorCode: 'FILESYSTEM_INVALID_PATH',
            errorMessage: 'Path is required for filesystem_list_directory.',
          }
        }

        const invocation = await invokeMcpWithCandidates({
          toolNameCandidates: [
            'filesystem::list_directory',
            'filesystem::list-directory',
            'filesystem::list',
          ],
          argumentCandidates: [
            { path: normalizedPath, recursive: recursive === true },
            { path: normalizedPath },
            { directory: normalizedPath, recursive: recursive === true },
            { dirPath: normalizedPath, recursive: recursive === true },
          ],
        })
        if (invocation.result.isError) {
          return {
            status: 'failed',
            operation: 'list_directory',
            path: normalizedPath,
            errorCode: invocation.result.errorCode ?? 'FILESYSTEM_LIST_FAILED',
            errorMessage: normalizeMcpErrorMessage(invocation.result),
            mcpToolName: invocation.toolName,
            attempts: invocation.attempts,
          }
        }

        const normalizedMaxReturnBytes = typeof maxReturnBytes === 'number' && Number.isFinite(maxReturnBytes)
          ? maxReturnBytes
          : undefined
        const textOutput = extractTextFromMcpResult(invocation.result)
        const truncatedPayload = truncateTextByByteLimit({
          content: textOutput,
          maxBytes: normalizeFilesystemReturnLimit(normalizedMaxReturnBytes),
          operation: 'list_directory',
        })
        const structuredEntries = extractDirectoryEntriesFromStructured(invocation.result.structuredContent)
        const fallbackEntries = textOutput
          .split('\n')
          .map(line => sanitizeText(line))
          .filter(Boolean)
        const combinedEntries = structuredEntries.length > 0
          ? structuredEntries
          : fallbackEntries
        const normalizedMaxEntries = typeof maxEntries === 'number' && Number.isFinite(maxEntries)
          ? Math.max(1, Math.min(1_000, Math.floor(maxEntries)))
          : 200
        const entries = combinedEntries.slice(0, normalizedMaxEntries)

        return {
          status: 'completed',
          operation: 'list_directory',
          path: normalizedPath,
          entries,
          entryCount: entries.length,
          totalEntryCount: combinedEntries.length,
          output: truncatedPayload.content,
          byteLength: truncatedPayload.byteLength,
          truncated: truncatedPayload.truncated || combinedEntries.length > entries.length,
          mcpToolName: invocation.toolName,
          attempts: invocation.attempts,
        }
      },
    }),
    tool({
      name: 'filesystem_search_files',
      description: 'Search files by text query through MCP filesystem bridge with optional regex/case-sensitive/include/exclude controls and normalized match output.',
      parameters: z.object({
        path: z.string().min(1),
        query: z.string().min(1),
        recursive: z.boolean().optional(),
        maxResults: z.coerce.number().optional(),
        maxReturnBytes: z.coerce.number().optional(),
        caseSensitive: z.boolean().optional(),
        regex: z.boolean().optional(),
        includeGlobs: z.array(z.string()).optional(),
        excludeGlobs: z.array(z.string()).optional(),
        pathMode: z.enum(['absolute', 'raw', 'relative']).optional(),
      }).strict(),
      execute: async ({ path, query, recursive, maxResults, maxReturnBytes, caseSensitive, regex, includeGlobs, excludeGlobs, pathMode }) => {
        const normalizedPath = sanitizeText(path)
        if (!normalizedPath) {
          return {
            status: 'failed',
            operation: 'search_files',
            path: '',
            errorCode: 'FILESYSTEM_INVALID_PATH',
            errorMessage: 'Path is required for filesystem_search_files.',
          }
        }

        const normalizedQuery = sanitizeText(query)
        if (!normalizedQuery) {
          return {
            status: 'failed',
            operation: 'search_files',
            path: normalizedPath,
            query: '',
            errorCode: 'FILESYSTEM_INVALID_QUERY',
            errorMessage: 'Query is required for filesystem_search_files.',
          }
        }

        const normalizedMaxResults = typeof maxResults === 'number' && Number.isFinite(maxResults)
          ? Math.max(1, Math.min(filesystemToolMaxSearchResults, Math.floor(maxResults)))
          : filesystemToolDefaultMaxSearchResults
        const normalizedRecursive = recursive === true
        const normalizedCaseSensitive = caseSensitive === true
        const normalizedRegex = regex === true
        const normalizedIncludeGlobs = sanitizeStringList(includeGlobs)
        const normalizedExcludeGlobs = sanitizeStringList(excludeGlobs)
        const normalizedPathMode: MainGatewayFilesystemSearchPathMode = pathMode ?? 'raw'
        const includeGlobMatchers = compileSimpleGlobList(normalizedIncludeGlobs)
        const excludeGlobMatchers = compileSimpleGlobList(normalizedExcludeGlobs)
        const baseSearchOptions = {
          recursive: normalizedRecursive,
          maxResults: normalizedMaxResults,
          caseSensitive: normalizedCaseSensitive,
          regex: normalizedRegex,
          pathMode: normalizedPathMode,
        }

        const invocation = await invokeMcpWithCandidates({
          toolNameCandidates: [
            'filesystem::search_files',
            'filesystem::search-files',
            'filesystem::search',
            'filesystem::grep',
            'filesystem::find_files',
          ],
          argumentCandidates: [
            compactRecord({
              path: normalizedPath,
              query: normalizedQuery,
              ...baseSearchOptions,
              includeGlobs: normalizedIncludeGlobs,
              excludeGlobs: normalizedExcludeGlobs,
            }),
            compactRecord({
              path: normalizedPath,
              pattern: normalizedQuery,
              ...baseSearchOptions,
              includeGlobs: normalizedIncludeGlobs,
              excludeGlobs: normalizedExcludeGlobs,
              useRegex: normalizedRegex,
            }),
            compactRecord({
              directory: normalizedPath,
              query: normalizedQuery,
              ...baseSearchOptions,
              include: normalizedIncludeGlobs,
              exclude: normalizedExcludeGlobs,
            }),
            compactRecord({
              directory: normalizedPath,
              pattern: normalizedQuery,
              ...baseSearchOptions,
              include: normalizedIncludeGlobs,
              exclude: normalizedExcludeGlobs,
              isRegex: normalizedRegex,
            }),
            compactRecord({
              path: normalizedPath,
              text: normalizedQuery,
              ...baseSearchOptions,
              includePatterns: normalizedIncludeGlobs,
              excludePatterns: normalizedExcludeGlobs,
            }),
          ],
        })
        if (invocation.result.isError) {
          return {
            status: 'failed',
            operation: 'search_files',
            path: normalizedPath,
            query: normalizedQuery,
            errorCode: invocation.result.errorCode ?? 'FILESYSTEM_SEARCH_FAILED',
            errorMessage: normalizeMcpErrorMessage(invocation.result),
            mcpToolName: invocation.toolName,
            attempts: invocation.attempts,
          }
        }

        const normalizedMaxReturnBytes = typeof maxReturnBytes === 'number' && Number.isFinite(maxReturnBytes)
          ? maxReturnBytes
          : undefined
        const textOutput = extractTextFromMcpResult(invocation.result)
        const truncatedPayload = truncateTextByByteLimit({
          content: textOutput,
          maxBytes: normalizeFilesystemReturnLimit(normalizedMaxReturnBytes),
          operation: 'search_files',
        })
        const structuredMatches = extractSearchMatchesFromStructured(invocation.result.structuredContent)
        const fallbackMatches = textOutput
          .split('\n')
          .map(line => parseFilesystemSearchLine(line))
          .filter((entry): entry is MainGatewayFilesystemSearchMatch => entry !== null)
        const combinedMatches = structuredMatches.length > 0
          ? structuredMatches
          : fallbackMatches
        const postFilteredMatches = combinedMatches
          .filter((match) => {
            const normalizedMatchPath = normalizeSearchPathForGlob({
              path: match.path,
              rootPath: normalizedPath,
            })
            if (!normalizedMatchPath)
              return false
            if (includeGlobMatchers.length > 0 && !matchesAnyGlob(normalizedMatchPath, includeGlobMatchers))
              return false
            if (excludeGlobMatchers.length > 0 && matchesAnyGlob(normalizedMatchPath, excludeGlobMatchers))
              return false
            return true
          })
          .map((match) => {
            const normalizedMatchPath = normalizeSearchResultPath({
              path: match.path,
              rootPath: normalizedPath,
              pathMode: normalizedPathMode,
            })
            return {
              ...match,
              path: normalizedMatchPath || match.path,
            }
          })
        const matches = postFilteredMatches.slice(0, normalizedMaxResults)
        const filteredOutCount = Math.max(0, combinedMatches.length - postFilteredMatches.length)

        return {
          status: 'completed',
          operation: 'search_files',
          path: normalizedPath,
          query: normalizedQuery,
          recursive: normalizedRecursive,
          caseSensitive: normalizedCaseSensitive,
          regex: normalizedRegex,
          includeGlobs: normalizedIncludeGlobs,
          excludeGlobs: normalizedExcludeGlobs,
          pathMode: normalizedPathMode,
          matches,
          matchCount: matches.length,
          totalMatchCount: postFilteredMatches.length,
          filteredOutCount,
          output: truncatedPayload.content,
          byteLength: truncatedPayload.byteLength,
          truncated: truncatedPayload.truncated || postFilteredMatches.length > matches.length,
          mcpToolName: invocation.toolName,
          attempts: invocation.attempts,
        }
      },
    }),
    ...executorRunTools,
    tool({
      name: 'mcp_list_tools',
      description: 'List all tools available on the connected MCP servers.',
      parameters: z.object({}).strict(),
      execute: async () => await options.invokeMcpListTools(),
    }),
    tool({
      name: 'mcp_call_tool',
      description: 'Call a tool on MCP server by qualified tool name.',
      parameters: z.object({
        name: z.string().describe('Qualified MCP tool name, format: "<serverName>::<toolName>"'),
        parameters: z.array(z.object({
          name: z.string(),
          value: z.unknown(),
        }).strict()).default([]),
      }).strict(),
      execute: async ({ name, parameters = [] }) => {
        const argumentsObject = Object.fromEntries(parameters.map(entry => [entry.name, entry.value]))
        return await options.invokeMcpCallTool({
          cardId: context.cardId,
          name,
          arguments: argumentsObject,
        })
      },
    }),
  ]

  return await Promise.all(tools)
}
