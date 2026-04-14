import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionCapabilityInquiry,
  AlicizationExecutionChannel,
  AlicizationExecutionRoutingIntent,
  AlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import type { ToolChoice } from '@xsai/shared-chat'

import type {
  AlicizationDispatchTaskThreadPayload,
  AlicizationSensoryCacheSnapshot,
} from '../../../shared/eventa'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import * as nodePath from 'node:path'

import { detectAlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'
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

export interface BuildExecutionCapabilitySystemBlocksOptions {
  allowTools?: boolean
  inquiry?: {
    capabilityQuestion: boolean
    mentionedChannels: AlicizationExecutionCapabilityChannel[]
  }
}

export interface BuildMainGatewayToolsOptions {
  buildExecutionRuntimeContext: (context: MainGatewayExecutionToolContext) => Promise<AlicizationExecutionRuntimeContext>
  context: MainGatewayExecutionToolContext
  executeTaskThread: (input: {
    context: MainGatewayExecutionToolContext
    dispatch: Pick<AlicizationDispatchTaskThreadPayload, 'claudeCode' | 'cli' | 'codex' | 'openclaw'>
    task: AlicizationClawTaskIntent
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
  'executor_run_openclaw',
] as const

type MainGatewayExecutorToolName = typeof mainGatewayExecutorToolNames[number]

const filesystemToolDefaultMaxReturnBytes = 128 * 1024
const filesystemToolMaxReturnBytes = 512 * 1024
const filesystemToolEditableMaxBytes = 512 * 1024
const filesystemToolDefaultPatchPreviewBytes = 32 * 1024
const filesystemToolDefaultMaxSearchResults = 200
const filesystemToolMaxSearchResults = 1_000

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

export function detectMainGatewayExecutionRoutingIntent(input: {
  userText: string
  capabilityInquiry: AlicizationExecutionCapabilityInquiry
}): AlicizationExecutionRoutingIntent | null {
  const userText = input.userText.trim()
  if (!userText)
    return null

  return detectAlicizationExecutionRoutingIntent({
    message: userText,
    capabilityInquiry: input.capabilityInquiry,
  })
}

export function buildMainGatewayExecutionRoutingToolChoice(intent: AlicizationExecutionRoutingIntent): ToolChoice {
  const requiredToolNames = [...new Set(intent.requiredToolNames
    .map(name => sanitizeText(name))
    .filter(Boolean))]

  if (requiredToolNames.length === 1) {
    return {
      type: 'function',
      function: { name: requiredToolNames[0] },
    }
  }

  return 'required'
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

function toMainGatewayExecutorToolResult(result: MainGatewayExecutionTaskThreadResult) {
  const fabricMetadata = asRecord(asRecord(result.thread.metadata)?.fabric)
  const routeExperience = asRecord(fabricMetadata?.experience)
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
    routeNarrative: asStringArray(result.plan.narrative),
    routeAffirmationReasonCodes: asStringArray(result.plan.affirmationReasonCodes),
    routeBlockedReasonCodes: asStringArray(result.plan.blockedReasonCodes),
    routeExperience,
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

export function buildExecutionRoutingEnforcementSystemBlock(intent: AlicizationExecutionRoutingIntent) {
  return [
    '[ALICIZATION_EXECUTION_ROUTING_GUARD]',
    `Detected explicit execution request for channels: ${intent.requestedChannels.join(', ')}.`,
    `Before writing any natural-language answer, you MUST call one of: ${intent.requiredToolNames.join(', ')}.`,
    'Do not pretend execution happened. If execution fails, report the tool failure honestly with its reason.',
    'Do not switch to screenshot narration when this execution guard is active.',
  ].join('\n')
}

export function buildExecutionCapabilitySystemBlocks(
  capabilities: AlicizationChannelCapability[],
  executionCapabilityChannels: readonly AlicizationExecutionCapabilityChannel[],
  options?: BuildExecutionCapabilitySystemBlocksOptions,
) {
  const capabilityMap = new Map(capabilities.map(item => [item.channel, item]))
  const inquiryChannels = Array.isArray(options?.inquiry?.mentionedChannels)
    ? options.inquiry.mentionedChannels
    : []
  const focusedChannels = inquiryChannels.filter(channel => executionCapabilityChannels.includes(channel))
  const displayChannels = focusedChannels.length > 0
    ? [
        ...focusedChannels,
        ...executionCapabilityChannels.filter(channel => !focusedChannels.includes(channel)),
      ]
    : [...executionCapabilityChannels]

  const rows = displayChannels.map((channel) => {
    const capability = capabilityMap.get(channel)
    const ready = capability?.ready !== false && capability?.available !== false && capability?.enabled !== false
    return [
      `- ${channel}: available=${capability?.available !== false ? 'true' : 'false'}`,
      `enabled=${capability?.enabled !== false ? 'true' : 'false'}`,
      `ready=${ready ? 'true' : 'false'}`,
      capability?.reason ? `reason=${capability.reason}` : '',
    ].filter(Boolean).join(', ')
  })

  const capabilityBlock = [
    '[ALICIZATION_EXECUTION_CAPABILITIES]',
    'Use this capability snapshot as the source of truth when answering whether you can execute through Alicization channels.',
    ...rows,
    focusedChannels.length > 0
      ? `Capability query focus: ${focusedChannels.join(', ')}.`
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'Never collapse multi-channel capability answers into a blanket "cannot".'
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'Answer each focused channel separately with yes/no and one short reason from this snapshot.'
      : '',
    options?.inquiry?.capabilityQuestion
      ? 'If any focused channel has ready=true, explicitly state that this channel is available now.'
      : '',
    options?.inquiry?.capabilityQuestion && options.allowTools
      ? 'When capability question is asked, call executor_capability_snapshot first if you need to re-check status before answering.'
      : '',
    'When user asks if you can use CLI/Codex/Claude Code/OpenClaw, answer strictly from this snapshot and never claim unavailable when ready=true.',
    'If ready=false, explain it is currently unavailable and suggest next setup/check step.',
  ].filter(Boolean).join('\n')

  const routerBlock = [
    '[ALICIZATION_EXECUTION_ROUTER]',
    'When the host asks you to execute real actions, route through executor tools instead of generic refusal.',
    '- Shell/terminal command tasks should call executor_run_cli when CLI is ready.',
    '- Codebase investigation/edit tasks should call executor_run_codex or executor_run_claude_code when the channel is ready.',
    '- Browser/software/desktop or mixed visual action tasks should call executor_run_openclaw when OpenClaw is ready.',
    '- For direct file reads/writes/edits/patching/listing/searching, prefer filesystem_read_file/filesystem_write_file/filesystem_edit_file/filesystem_patch_file/filesystem_list_directory/filesystem_search_files before generic mcp_call_tool.',
    '- OpenClaw dispatch automatically carries the latest Alicization sensory snapshot; call sensory_capture_state first when you need to inspect the surface before deciding the next action.',
    '- If you need to know whether live desktop capture is available or which window is foreground, call sensory_capture_state.',
    '- Use mcp_call_tool as an escape hatch only when no first-class filesystem/executor tool covers the requested operation.',
    '- If requested channel is not ready, say which channel is unavailable and propose the nearest ready structured channel.',
    '- If required arguments are missing, ask one concise clarification question instead of refusing capability.',
  ].join('\n')

  return [capabilityBlock, routerBlock]
}

export async function buildMainGatewayTools(options: BuildMainGatewayToolsOptions) {
  const { context } = options

  const executorRunToolSpecs = [
    defineMainGatewayExecutorToolSpec({
      name: 'executor_run_cli',
      description: 'Plan and execute a CLI task thread through Alicization executor governance. Use this for local command execution.',
      parameters: z.object({
        command: z.string().min(1),
        args: z.array(z.string()).default([]),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ command, args, cwd, timeoutMs, goal, effect, permissionMode }, toolContext) => {
        const commandLabel = [command, ...(Array.isArray(args) ? args : [])].join(' ').trim()
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
              command,
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
        prompt: z.string().min(1),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        profile: z.string().optional(),
        sandbox: z.enum(['read-only', 'workspace-write']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ prompt, kind, cwd, timeoutMs, model, profile, sandbox, goal, effect, permissionMode }, toolContext) => {
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: kind ?? 'codebase-edit',
            goal: sanitizeText(goal) || `Run Codex task: ${sanitizeBriefText(prompt, 220)}`,
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
              prompt,
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
        prompt: z.string().min(1),
        kind: z.enum(['codebase-edit', 'codebase-investigation']).optional(),
        cwd: z.string().optional(),
        timeoutMs: z.coerce.number().optional(),
        model: z.string().optional(),
        allowTools: z.boolean().optional(),
        claudePermissionMode: z.enum(['default', 'acceptEdits', 'bypassPermissions', 'delegate', 'dontAsk', 'plan']).optional(),
        goal: z.string().optional(),
        effect: z.enum(['observe', 'mutate', 'high-impact']).optional(),
        permissionMode: z.enum(['none', 'implicit', 'explicit']).optional(),
      }).strict(),
      execute: async ({ prompt, kind, cwd, timeoutMs, model, allowTools, claudePermissionMode, goal, effect, permissionMode }, toolContext) => {
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
            goal: sanitizeText(goal) || `Run Claude Code task: ${sanitizeBriefText(prompt, 220)}`,
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
              prompt,
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
      name: 'executor_run_openclaw',
      description: 'Plan and execute an OpenClaw embodied task thread through Alicization executor governance for browser, software, desktop, or mixed visual actions. Alicization will attach the latest grounded sensory context automatically.',
      parameters: z.object({
        instruction: z.string().min(1),
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
      execute: async ({ instruction, kind, timeoutMs, senderId, roleName, channelId, conversationId, contentParts, images, audios, files, meta, sessionAffinityKey, goal, effect, permissionMode, justification, riskBudget, requiresVisualGrounding }, toolContext) => {
        const resolvedKind = kind ?? 'browser-automation'
        const visualKinds = new Set(['browser-automation', 'software-automation', 'desktop-automation', 'mixed', 'unknown'])
        const runtimeContext = await options.buildExecutionRuntimeContext(toolContext)
        return await options.executeTaskThread({
          context: toolContext,
          task: {
            kind: resolvedKind,
            goal: sanitizeText(goal) || `Run OpenClaw task: ${sanitizeBriefText(instruction, 220)}`,
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
            openclaw: {
              instruction,
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
    execute: async input => toMainGatewayExecutorToolResult(await spec.execute(input as never, context)),
  }))

  const fileReadStateByPath = new Map<string, MainGatewayFileReadState>()

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
  }) => {
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

    for (const [index, change] of input.changes.entries()) {
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

    for (const [index, change] of input.changes.entries()) {
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

  return await Promise.all([
    tool({
      name: 'set_reminder',
      description: '用于在系统后台设定一个真实的倒计时闹钟。注意：调用此工具后，真实的物理系统会在未来唤醒你。因此，你在本轮的 reply 中，【只允许】回复“已为你定好闹钟”等确认语句。绝对禁止在本轮回复中直接给出提醒内容！',
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
      execute: async ({ path, oldText, newText, replaceAll, expectedHash }) => {
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
  ])
}
