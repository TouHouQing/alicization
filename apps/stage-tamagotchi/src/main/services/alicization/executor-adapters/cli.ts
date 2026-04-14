import type {
  AlicizationCliCommandInput,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import { Buffer } from 'node:buffer'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir as osHomedir } from 'node:os'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { cwd as processCwd, env as processEnv } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import { buildAlicizationExecutionEnv } from '../execution-command-env'

const cliDefaultTimeoutMs = 300_000
const cliMaxTimeoutMs = 1_800_000
const cliEventChunkChars = 1_500
const cliMaxPreviewChars = 4_000
const cliMaxCapturedOutputBytes = 2 * 1024 * 1024
const cliForceKillDelayMs = 300
const cliSystemBinaryPrefixes = [
  '/bin/',
  '/usr/bin/',
  '/usr/local/bin/',
  '/opt/homebrew/bin/',
  'C:\\Windows\\System32\\',
]
const safeReadCommands = new Set([
  'pwd',
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'stat',
  'basename',
  'dirname',
  'find',
  'rg',
  'grep',
  'echo',
  'printf',
  'true',
  'false',
])
const sensitiveWriteCommands = new Set([
  'mkdir',
  'touch',
  'cp',
  'mv',
])
const dangerousCommands = new Set([
  'rm',
  'sudo',
  'dd',
  'mkfs',
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'diskutil',
  'launchctl',
  'kill',
  'killall',
  'chmod',
  'chown',
])
const networkCommands = new Set([
  'curl',
  'wget',
  'ssh',
  'scp',
  'nc',
  'ncat',
])
const packageManagerCommands = new Set([
  'pnpm',
  'npm',
  'yarn',
  'bun',
  'npx',
  'tsx',
  'tsc',
  'vitest',
  'eslint',
  'prettier',
  'node',
  'git',
])
const cliHomeAliasExactTokens = new Set([
  '~',
  '$HOME',
  '${HOME}',
  '%USERPROFILE%',
])
const cliHomeAliasPrefixes = [
  '~/',
  '~\\',
  '$HOME/',
  '$HOME\\',
  '${HOME}/',
  '${HOME}\\',
  '%USERPROFILE%/',
  '%USERPROFILE%\\',
]
const cliDesktopSegmentPattern = /(^|[\\/])(Desktop|桌面)(?=([\\/]|$))/u
const cliUriEncodedTokenPattern = /^(?:%[0-9A-Fa-f]{2}){2,}$/u

type AlicizationCliRiskLevel = 'safe' | 'sensitive' | 'danger'
type AlicizationCliActionCategory = 'read' | 'write' | 'delete' | 'execute' | 'network'
type AlicizationCliExecutionMode = 'exec-file' | 'shell'

interface AlicizationCliCommandSpec {
  mode: AlicizationCliExecutionMode
  command: string
  args: string[]
  cwd: string
  timeoutMs: number
  riskLevel: AlicizationCliRiskLevel
  actionCategory: AlicizationCliActionCategory
  commandLabel: string
  aliasExpansionCount: number
  runtimeContext: AlicizationExecutionRuntimeContext | null
}

interface AlicizationCliExecutionRuntimeResult {
  ok: boolean
  stdout: string
  stderr: string
  outputTruncated: boolean
  exitCode: number | null
  signal: string | null
  durationMs: number
  aborted: boolean
  timedOut: boolean
  errorCode?: string
  errorMessage?: string
}

export interface AlicizationCliAdapterInput {
  thread: AlicizationTaskThreadRecord
  command: AlicizationCliCommandInput
  abortSignal?: AbortSignal
  workspaceRoot?: string
  now?: () => number
}

export interface AlicizationCliAdapterResult {
  ok: boolean
  summary: string
  output: string | null
  errorCode?: string
  errorMessage?: string
  finalStatus: AlicizationTaskThreadStatus
  events: AlicizationExecutionEventInput[]
}

function normalizeText(raw: unknown, maxChars = cliMaxPreviewChars) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function segmentOutput(raw: string) {
  if (!raw)
    return []

  const segments: string[] = []
  for (let index = 0; index < raw.length; index += cliEventChunkChars) {
    segments.push(raw.slice(index, index + cliEventChunkChars))
  }
  return segments
}

function isWithinRoot(root: string, target: string) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('../') && !rel.startsWith('..\\'))
}

function normalizeArgs(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(Boolean)
    .slice(0, 128)
}

function normalizeTimeoutMs(raw: unknown) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return cliDefaultTimeoutMs
  return Math.max(300, Math.min(cliMaxTimeoutMs, Math.floor(numeric)))
}

function resolveCliHomeDirectory() {
  const homeFromEnv = typeof processEnv.HOME === 'string' && processEnv.HOME.trim()
    ? processEnv.HOME.trim()
    : typeof processEnv.USERPROFILE === 'string' && processEnv.USERPROFILE.trim()
      ? processEnv.USERPROFILE.trim()
      : osHomedir().trim()
  return homeFromEnv ? resolve(homeFromEnv) : ''
}

function applyCliDesktopAliasFallback(pathValue: string) {
  if (!cliDesktopSegmentPattern.test(pathValue))
    return pathValue
  if (existsSync(pathValue))
    return pathValue

  const fallback = pathValue.replace(
    cliDesktopSegmentPattern,
    (_match, separator: string, segment: string) => `${separator}${segment === 'Desktop' ? '桌面' : 'Desktop'}`,
  )
  if (fallback !== pathValue && existsSync(fallback))
    return fallback
  return pathValue
}

function expandCliHomeAliasPath(value: string, homeDirectory: string) {
  const normalized = value.trim()
  if (!normalized || !homeDirectory)
    return null
  if (cliHomeAliasExactTokens.has(normalized))
    return resolve(homeDirectory)
  for (const prefix of cliHomeAliasPrefixes) {
    if (!normalized.startsWith(prefix))
      continue
    return resolve(homeDirectory, normalized.slice(prefix.length))
  }
  return null
}

function normalizeCliPathValueAliases(value: string, homeDirectory: string) {
  const expanded = expandCliHomeAliasPath(value, homeDirectory)
  if (!expanded) {
    return {
      value,
      expanded: false,
    }
  }

  return {
    value: applyCliDesktopAliasFallback(expanded),
    expanded: true,
  }
}

function splitCliOptionAssignment(value: string) {
  const separatorIndex = value.indexOf('=')
  if (separatorIndex <= 0 || !value.startsWith('-'))
    return null
  return {
    prefix: value.slice(0, separatorIndex + 1),
    body: value.slice(separatorIndex + 1),
  }
}

function normalizeCliPathTokenAliases(token: string, homeDirectory: string) {
  const optionAssignment = splitCliOptionAssignment(token)
  if (!optionAssignment)
    return normalizeCliPathValueAliases(token, homeDirectory)

  const normalizedBody = normalizeCliPathValueAliases(optionAssignment.body, homeDirectory)
  if (!normalizedBody.expanded) {
    return {
      value: token,
      expanded: false,
    }
  }
  return {
    value: `${optionAssignment.prefix}${normalizedBody.value}`,
    expanded: true,
  }
}

function parseCommandWords(raw: string) {
  const words: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  for (const char of raw) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true
      continue
    }
    if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }
    if (!inSingleQuote && !inDoubleQuote && /\s/.test(char)) {
      if (current) {
        words.push(current)
        current = ''
      }
      continue
    }
    current += char
  }

  if (escaped || inSingleQuote || inDoubleQuote)
    return null

  if (current)
    words.push(current)

  return words
}

function splitCompoundCommandSegments(commandText: string) {
  const segments: string[] = []
  let current = ''
  let inSingleQuote = false
  let inDoubleQuote = false
  let escaped = false

  const flushCurrent = () => {
    const normalized = current.trim()
    if (normalized)
      segments.push(normalized)
    current = ''
  }

  for (let index = 0; index < commandText.length; index += 1) {
    const char = commandText[index]
    const next = commandText[index + 1] ?? ''

    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && !inSingleQuote) {
      escaped = true
      current += char
      continue
    }
    if (char === '\'' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      current += char
      continue
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      current += char
      continue
    }
    if (!inSingleQuote && !inDoubleQuote) {
      if ((char === '&' && next === '&') || (char === '|' && next === '|')) {
        flushCurrent()
        index += 1
        continue
      }
      if (char === ';' || char === '|' || char === '\n') {
        flushCurrent()
        continue
      }
    }
    current += char
  }

  flushCurrent()
  return segments
}

function requiresShellExecution(commandText: string) {
  return /&&|\|\||[|;\n`<>]|\$\(/.test(commandText)
}

function isShellControlToken(token: string) {
  return ['&&', '||', '|', ';', '&', '>', '>>', '<', '2>', '2>>'].includes(token)
}

function requiresShellExecutionFromArgs(args: string[]) {
  return args.some((arg) => {
    const normalized = arg.trim()
    if (!normalized)
      return false
    return isShellControlToken(normalized) || requiresShellExecution(normalized)
  })
}

function quoteShellToken(token: string) {
  if (!token)
    return '\'\''
  if (/^[\w./:@%+=,-]+$/.test(token))
    return token
  return `'${token.replace(/'/g, `'"'"'`)}'`
}

function serializeShellExpressionTokens(tokens: string[]) {
  return tokens
    .map((token) => {
      const normalized = token.trim()
      if (!normalized)
        return ''
      if (isShellControlToken(normalized))
        return normalized
      return quoteShellToken(normalized)
    })
    .filter(Boolean)
    .join(' ')
}

function buildShellCommandExpression(input: {
  rawCommand: string
  rawArgs: string[]
  parsedCommandWords: string[] | null
}) {
  const rawCommand = input.rawCommand.trim()
  if (!rawCommand)
    return ''
  if (input.rawArgs.length === 0)
    return rawCommand

  if (requiresShellExecution(rawCommand)) {
    const serializedArgs = serializeShellExpressionTokens(input.rawArgs)
    return [rawCommand, serializedArgs].filter(Boolean).join(' ').trim()
  }

  const baseTokens = input.parsedCommandWords?.length
    ? input.parsedCommandWords
    : [rawCommand]
  return serializeShellExpressionTokens([
    ...baseTokens,
    ...input.rawArgs,
  ])
}

function normalizeCommandPath(command: string, workspaceRoot: string) {
  if (!command.includes('/') && !command.includes('\\')) {
    return {
      ok: true as const,
      command,
      commandLabel: command,
    }
  }

  const resolved = isAbsolute(command)
    ? resolve(command)
    : resolve(workspaceRoot, command)
  const allowedAbsolute = cliSystemBinaryPrefixes.some(prefix => resolved.startsWith(prefix))
  if (!isWithinRoot(workspaceRoot, resolved) && !allowedAbsolute) {
    return {
      ok: false as const,
      errorCode: 'CLI_COMMAND_OUTSIDE_BOUNDARY',
      errorMessage: 'CLI command path is outside the allowed workspace or trusted system binary roots.',
    }
  }

  return {
    ok: true as const,
    command: resolved,
    commandLabel: command,
  }
}

function normalizeWorkingDirectory(raw: unknown, workspaceRoot: string, homeDirectory: string) {
  const requested = typeof raw === 'string' && raw.trim()
    ? raw.trim()
    : workspaceRoot
  const normalizedRequested = normalizeCliPathValueAliases(requested, homeDirectory)
  const resolved = isAbsolute(normalizedRequested.value)
    ? resolve(normalizedRequested.value)
    : resolve(workspaceRoot, normalizedRequested.value)

  if (!isWithinRoot(workspaceRoot, resolved)) {
    return {
      ok: false as const,
      errorCode: 'CLI_CWD_OUTSIDE_BOUNDARY',
      errorMessage: 'CLI working directory is outside the current workspace boundary.',
    }
  }

  return {
    ok: true as const,
    cwd: resolved,
    aliasExpanded: normalizedRequested.expanded,
  }
}

function readPrimarySubcommand(args: string[]) {
  for (const arg of args) {
    const normalized = arg.trim().toLowerCase()
    if (!normalized)
      continue
    if (normalized.startsWith('-'))
      continue
    return normalized
  }
  return ''
}

function classifyGitAction(args: string[]) {
  const subcommand = readPrimarySubcommand(args)
  if (['status', 'diff', 'log', 'show', 'branch', 'rev-parse', 'ls-files', 'grep'].includes(subcommand))
    return { riskLevel: 'safe' as const, actionCategory: 'read' as const }
  if (['fetch', 'pull', 'clone'].includes(subcommand))
    return { riskLevel: 'danger' as const, actionCategory: 'network' as const }
  if (['reset', 'clean', 'push', 'commit', 'tag', 'rm'].includes(subcommand))
    return { riskLevel: 'danger' as const, actionCategory: subcommand === 'rm' ? 'delete' as const : 'write' as const }
  return { riskLevel: 'sensitive' as const, actionCategory: 'write' as const }
}

function classifyPackageManagerAction(baseCommand: string, args: string[]) {
  if (baseCommand === 'git')
    return classifyGitAction(args)

  const subcommand = readPrimarySubcommand(args)
  if (['test', 'lint', 'typecheck', 'build'].includes(subcommand))
    return { riskLevel: 'sensitive' as const, actionCategory: 'execute' as const }
  if (['install', 'add', 'remove', 'publish', 'dlx', 'create'].includes(subcommand))
    return { riskLevel: 'danger' as const, actionCategory: 'network' as const }
  return { riskLevel: 'sensitive' as const, actionCategory: 'execute' as const }
}

function classifyCliCommand(command: string, args: string[]) {
  const baseCommand = basename(command).toLowerCase()

  if (safeReadCommands.has(baseCommand))
    return { riskLevel: 'safe' as const, actionCategory: 'read' as const }
  if (networkCommands.has(baseCommand))
    return { riskLevel: 'danger' as const, actionCategory: 'network' as const }
  if (dangerousCommands.has(baseCommand))
    return { riskLevel: 'danger' as const, actionCategory: baseCommand === 'rm' ? 'delete' as const : 'write' as const }
  if (sensitiveWriteCommands.has(baseCommand))
    return { riskLevel: 'sensitive' as const, actionCategory: 'write' as const }
  if (packageManagerCommands.has(baseCommand))
    return classifyPackageManagerAction(baseCommand, args)

  return { riskLevel: 'sensitive' as const, actionCategory: 'execute' as const }
}

function rankRiskLevel(riskLevel: AlicizationCliRiskLevel) {
  if (riskLevel === 'danger')
    return 2
  if (riskLevel === 'sensitive')
    return 1
  return 0
}

function rankActionCategory(actionCategory: AlicizationCliActionCategory) {
  if (actionCategory === 'delete')
    return 4
  if (actionCategory === 'network')
    return 3
  if (actionCategory === 'write')
    return 2
  if (actionCategory === 'execute')
    return 1
  return 0
}

function aggregateClassifications(classifications: Array<{
  riskLevel: AlicizationCliRiskLevel
  actionCategory: AlicizationCliActionCategory
}>) {
  if (classifications.length === 0) {
    return {
      riskLevel: 'sensitive' as const,
      actionCategory: 'execute' as const,
    }
  }

  return classifications.reduce((current, next) => {
    const riskLevel = rankRiskLevel(next.riskLevel) > rankRiskLevel(current.riskLevel)
      ? next.riskLevel
      : current.riskLevel
    const actionCategory = rankActionCategory(next.actionCategory) > rankActionCategory(current.actionCategory)
      ? next.actionCategory
      : current.actionCategory
    return {
      riskLevel,
      actionCategory,
    }
  })
}

function resolveThreadPermissionMode(thread: AlicizationTaskThreadRecord) {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'permissionMode' in metadataTask) {
    const permissionMode = (metadataTask as { permissionMode?: unknown }).permissionMode
    if (permissionMode === 'explicit' || permissionMode === 'implicit' || permissionMode === 'none')
      return permissionMode
  }

  return thread.origin === 'user-turn' ? 'implicit' : 'none'
}

function resolveThreadEffect(thread: AlicizationTaskThreadRecord) {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'effect' in metadataTask) {
    const effect = (metadataTask as { effect?: unknown }).effect
    if (effect === 'observe' || effect === 'mutate' || effect === 'high-impact')
      return effect
  }

  return 'mutate'
}

function buildCliCommandSpec(input: AlicizationCliAdapterInput) {
  const workspaceRoot = resolve(input.workspaceRoot ?? processCwd())
  const homeDirectory = resolveCliHomeDirectory()
  const rawCommand = typeof input.command.command === 'string'
    ? input.command.command.trim()
    : ''
  if (!rawCommand) {
    return {
      ok: false as const,
      errorCode: 'CLI_COMMAND_REQUIRED',
      errorMessage: 'CLI execution requires a non-empty command.',
    }
  }

  const normalizedCwd = normalizeWorkingDirectory(input.command.cwd, workspaceRoot, homeDirectory)
  if (!normalizedCwd.ok)
    return normalizedCwd

  const rawArgs = normalizeArgs(input.command.args)
  let aliasExpansionCount = normalizedCwd.aliasExpanded ? 1 : 0
  const normalizedArgs = rawArgs.map((arg) => {
    const normalized = normalizeCliPathTokenAliases(arg, homeDirectory)
    if (normalized.expanded)
      aliasExpansionCount += 1
    return normalized.value
  })
  const parsedCommandWords = parseCommandWords(rawCommand)
  const normalizedParsedCommandWords = parsedCommandWords?.map((word) => {
    const normalized = normalizeCliPathTokenAliases(word, homeDirectory)
    if (normalized.expanded)
      aliasExpansionCount += 1
    return normalized.value
  }) ?? null
  const shellExecutionRequired = requiresShellExecution(rawCommand)
    || requiresShellExecutionFromArgs(normalizedArgs)
  const shellCommandExpression = shellExecutionRequired
    ? buildShellCommandExpression({
        rawCommand,
        rawArgs: normalizedArgs,
        parsedCommandWords: normalizedParsedCommandWords,
      })
    : ''

  const mode: AlicizationCliExecutionMode = shellExecutionRequired ? 'shell' : 'exec-file'
  let executableCommand = rawCommand
  let executableArgs = [...normalizedArgs]
  let commandLabel = rawCommand
  if (mode === 'exec-file') {
    if (parsedCommandWords == null && rawArgs.length > 0) {
      return {
        ok: false as const,
        errorCode: 'CLI_COMMAND_PARSE_FAILED',
        errorMessage: 'CLI command contains unmatched quotes or escapes and cannot be normalized with explicit args.',
      }
    }

    if (parsedCommandWords && parsedCommandWords.length > 0) {
      const normalizedWords = normalizedParsedCommandWords ?? parsedCommandWords
      executableCommand = normalizedWords[0]
      executableArgs = [...normalizedWords.slice(1), ...normalizedArgs]
      commandLabel = [...parsedCommandWords, ...rawArgs].join(' ').trim()
    }
    else {
      const normalizedCommand = normalizeCliPathTokenAliases(rawCommand, homeDirectory)
      if (normalizedCommand.expanded)
        aliasExpansionCount += 1
      executableCommand = normalizedCommand.value
      executableArgs = [...normalizedArgs]
      commandLabel = [rawCommand, ...rawArgs].join(' ').trim()
    }
  }

  const normalizedPath = mode === 'exec-file'
    ? normalizeCommandPath(executableCommand, workspaceRoot)
    : null
  if (normalizedPath && !normalizedPath.ok)
    return normalizedPath

  const classification = mode === 'shell'
    ? aggregateClassifications(
        splitCompoundCommandSegments(shellCommandExpression)
          .map((segment) => {
            const words = parseCommandWords(segment) ?? segment.split(/\s+/).filter(Boolean)
            if (words.length === 0)
              return null
            return classifyCliCommand(words[0], words.slice(1))
          })
          .filter((item): item is ReturnType<typeof classifyCliCommand> => Boolean(item)),
      )
    : classifyCliCommand(normalizedPath?.command ?? executableCommand, executableArgs)

  const permissionMode = resolveThreadPermissionMode(input.thread)
  const effect = resolveThreadEffect(input.thread)
  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)

  if (classification.riskLevel === 'danger' && permissionMode !== 'explicit') {
    return {
      ok: false as const,
      errorCode: 'CLI_PERMISSION_REQUIRED',
      errorMessage: 'Dangerous CLI execution requires explicit permission before dispatch.',
    }
  }

  if (classification.riskLevel === 'sensitive' && permissionMode === 'none') {
    return {
      ok: false as const,
      errorCode: 'CLI_PERMISSION_REQUIRED',
      errorMessage: 'Sensitive CLI execution requires at least implicit permission before dispatch.',
    }
  }

  if (
    effect === 'observe'
    && (classification.actionCategory === 'write' || classification.actionCategory === 'delete' || classification.actionCategory === 'network')
  ) {
    return {
      ok: false as const,
      errorCode: 'CLI_EFFECT_MISMATCH',
      errorMessage: 'Observe-only task threads cannot dispatch mutating CLI commands.',
    }
  }

  return {
    ok: true as const,
    spec: {
      mode,
      command: mode === 'shell' ? shellCommandExpression : (normalizedPath?.command ?? executableCommand),
      args: mode === 'shell' ? [] : executableArgs,
      cwd: normalizedCwd.cwd,
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs),
      riskLevel: classification.riskLevel,
      actionCategory: classification.actionCategory,
      aliasExpansionCount,
      commandLabel: mode === 'shell'
        ? shellCommandExpression
        : commandLabel || [normalizedPath?.commandLabel ?? executableCommand, ...rawArgs].join(' ').trim(),
      runtimeContext,
    } satisfies AlicizationCliCommandSpec,
  }
}

function buildCliRuntimeEnv(runtimeContext: AlicizationExecutionRuntimeContext | null) {
  if (!runtimeContext)
    return buildAlicizationExecutionEnv(processEnv)

  return buildAlicizationExecutionEnv(processEnv, {
    ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON: JSON.stringify(runtimeContext),
    ALICIZATION_EXECUTION_CONTEXT_GENERATED_AT: String(runtimeContext.generatedAt),
    ALICIZATION_EXECUTION_FOREGROUND_WINDOW: [
      runtimeContext.sensory.foregroundWindow?.appName,
      runtimeContext.sensory.foregroundWindow?.processName,
      runtimeContext.sensory.foregroundWindow?.title,
    ].filter(Boolean).join(' | '),
  })
}

function createCliTruncatedNotice(input: {
  capturedBytes: number
  maxBytes: number
  stream: 'stdout' | 'stderr'
}) {
  return [
    '',
    `[ALICIZATION_NOTICE] ${input.stream} output was truncated after ${input.maxBytes} bytes.`,
    `captured_bytes=${input.capturedBytes}`,
  ].join('\n')
}

function captureCliStreamChunk(input: {
  chunks: Buffer[]
  maxBytes: number
  totalBytes: number
  truncated: boolean
  chunk: Buffer
}) {
  let nextTotalBytes = input.totalBytes
  let nextTruncated = input.truncated
  if (input.chunk.byteLength === 0) {
    return {
      totalBytes: nextTotalBytes,
      truncated: nextTruncated,
    }
  }

  const availableBytes = Math.max(0, input.maxBytes - nextTotalBytes)
  if (availableBytes > 0) {
    if (input.chunk.byteLength <= availableBytes) {
      input.chunks.push(input.chunk)
      nextTotalBytes += input.chunk.byteLength
    }
    else {
      input.chunks.push(input.chunk.subarray(0, availableBytes))
      nextTotalBytes += availableBytes
      nextTruncated = true
    }
  }
  else {
    nextTruncated = true
  }

  return {
    totalBytes: nextTotalBytes,
    truncated: nextTruncated,
  }
}

function finalizeCapturedCliStream(input: {
  chunks: Buffer[]
  capturedBytes: number
  truncated: boolean
  stream: 'stdout' | 'stderr'
}) {
  const base = Buffer.concat(input.chunks).toString('utf8')
  if (!input.truncated)
    return base
  return `${base}${createCliTruncatedNotice({
    capturedBytes: input.capturedBytes,
    maxBytes: cliMaxCapturedOutputBytes,
    stream: input.stream,
  })}`
}

async function runCliCommand(
  spec: AlicizationCliCommandSpec,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
): Promise<AlicizationCliExecutionRuntimeResult> {
  const startedAt = now()
  return await new Promise<AlicizationCliExecutionRuntimeResult>((resolveResult) => {
    let aborted = abortSignal?.aborted === true
    let timedOut = false
    let settled = false
    let stdoutBytes = 0
    let stderrBytes = 0
    let stdoutTruncated = false
    let stderrTruncated = false
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    const runtimeEnv = buildCliRuntimeEnv(spec.runtimeContext)

    const child = spec.mode === 'shell'
      ? spawn(spec.command, {
          cwd: spec.cwd,
          env: runtimeEnv,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })
      : spawn(spec.command, spec.args, {
          cwd: spec.cwd,
          env: runtimeEnv,
          shell: false,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        })

    const finalizeAndResolve = (input: {
      ok: boolean
      exitCode: number | null
      signal: string | null
      errorCode?: string
      errorMessage?: string
    }) => {
      if (settled)
        return
      settled = true
      cleanup()
      const durationMs = Math.max(0, now() - startedAt)
      const stdout = finalizeCapturedCliStream({
        chunks: stdoutChunks,
        capturedBytes: stdoutBytes,
        truncated: stdoutTruncated,
        stream: 'stdout',
      })
      const stderr = finalizeCapturedCliStream({
        chunks: stderrChunks,
        capturedBytes: stderrBytes,
        truncated: stderrTruncated,
        stream: 'stderr',
      })
      resolveResult({
        ok: input.ok,
        stdout,
        stderr,
        outputTruncated: stdoutTruncated || stderrTruncated,
        exitCode: input.exitCode,
        signal: input.signal,
        durationMs,
        aborted,
        timedOut,
        errorCode: input.errorCode,
        errorMessage: input.errorMessage,
      })
    }

    const killProcess = (reason: 'abort' | 'timeout') => {
      if (settled)
        return
      if (reason === 'abort')
        aborted = true
      else
        timedOut = true
      child.kill('SIGTERM')
      const hardKillTimer = setTimeout(() => {
        if (!settled)
          child.kill('SIGKILL')
      }, cliForceKillDelayMs)
      hardKillTimer.unref?.()
    }

    const timeoutTimer = setTimeout(() => {
      killProcess('timeout')
    }, spec.timeoutMs)
    timeoutTimer.unref?.()

    child.stdout?.on('data', (chunk: Buffer | string) => {
      const captured = captureCliStreamChunk({
        chunks: stdoutChunks,
        maxBytes: cliMaxCapturedOutputBytes,
        totalBytes: stdoutBytes,
        truncated: stdoutTruncated,
        chunk: Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
      })
      stdoutBytes = captured.totalBytes
      stdoutTruncated = captured.truncated
    })

    child.stderr?.on('data', (chunk: Buffer | string) => {
      const captured = captureCliStreamChunk({
        chunks: stderrChunks,
        maxBytes: cliMaxCapturedOutputBytes,
        totalBytes: stderrBytes,
        truncated: stderrTruncated,
        chunk: Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
      })
      stderrBytes = captured.totalBytes
      stderrTruncated = captured.truncated
    })

    child.on('error', (error) => {
      const errorCode = typeof error === 'object' && error != null && 'code' in error && typeof (error as { code?: unknown }).code === 'string'
        ? String((error as { code?: string }).code)
        : ''
      finalizeAndResolve({
        ok: false,
        exitCode: null,
        signal: null,
        errorCode: aborted
          ? 'CLI_ABORTED'
          : timedOut
            ? 'CLI_TIMEOUT'
            : errorCode === 'ENOENT'
              ? 'CLI_COMMAND_NOT_FOUND'
              : 'CLI_EXECUTE_FAILED',
        errorMessage: aborted
          ? 'CLI execution was aborted by kill switch.'
          : timedOut
            ? `CLI execution timed out after ${spec.timeoutMs}ms.`
            : errorMessageFrom(error) ?? 'CLI execution failed.',
      })
    })

    child.on('close', (exitCode, signal) => {
      if (aborted) {
        finalizeAndResolve({
          ok: false,
          exitCode: exitCode ?? null,
          signal: signal ? String(signal) : 'SIGTERM',
          errorCode: 'CLI_ABORTED',
          errorMessage: 'CLI execution was aborted by kill switch.',
        })
        return
      }

      if (timedOut) {
        finalizeAndResolve({
          ok: false,
          exitCode: exitCode ?? null,
          signal: signal ? String(signal) : null,
          errorCode: 'CLI_TIMEOUT',
          errorMessage: `CLI execution timed out after ${spec.timeoutMs}ms.`,
        })
        return
      }

      const resolvedExitCode = typeof exitCode === 'number' ? exitCode : null
      const success = resolvedExitCode === 0
      finalizeAndResolve({
        ok: success,
        exitCode: resolvedExitCode,
        signal: signal ? String(signal) : null,
        errorCode: success ? undefined : 'CLI_EXECUTE_FAILED',
        errorMessage: success
          ? undefined
          : normalizeText(finalizeCapturedCliStream({
            chunks: stderrChunks,
            capturedBytes: stderrBytes,
            truncated: stderrTruncated,
            stream: 'stderr',
          }), 260)
          || `CLI exited with code ${resolvedExitCode ?? 'unknown'}.`,
      })
    })

    const abortExecution = () => killProcess('abort')

    function cleanup() {
      clearTimeout(timeoutTimer)
      if (abortSignal)
        abortSignal.removeEventListener('abort', abortExecution)
    }

    if (abortSignal) {
      if (abortSignal.aborted)
        abortExecution()
      else
        abortSignal.addEventListener('abort', abortExecution, { once: true })
    }
  })
}

function composeCombinedOutput(stdout: string, stderr: string) {
  const parts = [stdout.trim(), stderr.trim()].filter(Boolean)
  if (parts.length === 0)
    return null
  return parts.join('\n').slice(0, cliMaxPreviewChars)
}

function decodeCliDisplayToken(token: string) {
  if (!cliUriEncodedTokenPattern.test(token))
    return token

  try {
    const decoded = decodeURIComponent(token)
    const normalized = decoded.trim()
    if (!normalized || normalized === token)
      return token
    return `${token} (${normalized})`
  }
  catch {
    return token
  }
}

function parseLsEntryName(line: string) {
  const normalizedLine = line.trim()
  if (!normalizedLine || /^total\s+\d+/iu.test(normalizedLine))
    return ''

  const longListingNameMatch = normalizedLine.match(/^(?:\S+\s+){8}(.+)$/u)
  if (longListingNameMatch?.[1]) {
    const name = longListingNameMatch[1].trim()
    if (name && name !== '.' && name !== '..')
      return name
  }

  const fallbackToken = normalizedLine.split(/\s+/u).at(-1)?.trim() ?? ''
  if (!fallbackToken || fallbackToken === '.' || fallbackToken === '..')
    return ''
  return fallbackToken
}

function buildLsOutputSummary(stdout: string, args: string[]) {
  const names = stdout
    .split(/\r?\n/u)
    .map(parseLsEntryName)
    .filter(Boolean)

  const uniqueNames = [...new Set(names)]
  if (uniqueNames.length === 0)
    return ''

  const previewItems = uniqueNames
    .slice(0, 6)
    .map(decodeCliDisplayToken)
    .join(', ')
  const extraCount = Math.max(0, uniqueNames.length - 6)
  const targetScope = args.some(arg => cliDesktopSegmentPattern.test(arg))
    ? 'desktop entries'
    : 'entries'

  return `Listed ${targetScope} (${uniqueNames.length}): ${previewItems}${extraCount > 0 ? `, +${extraCount} more` : ''}`
}

function buildCliSuccessSummary(input: {
  output: string | null
  spec: AlicizationCliCommandSpec
  stdout: string
}) {
  if (basename(input.spec.command).toLowerCase() === 'ls') {
    const lsSummary = buildLsOutputSummary(input.stdout, input.spec.args)
    if (lsSummary)
      return normalizeText(lsSummary, 260)
  }
  return normalizeText(input.output, 260)
}

function buildFailureSummary(thread: AlicizationTaskThreadRecord, errorMessage: string) {
  const goal = normalizeText(thread.goal, 140) || 'the current task'
  return `CLI execution failed while acting on ${goal}: ${normalizeText(errorMessage, 220) || 'unknown error'}.`
}

export async function executeCliTaskThread(input: AlicizationCliAdapterInput): Promise<AlicizationCliAdapterResult> {
  const now = input.now ?? Date.now
  const thread = input.thread
  const normalized = buildCliCommandSpec(input)
  if (!normalized.ok) {
    const createdAt = now()
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
        channel: 'cli',
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          command: input.command.command,
          args: input.command.args ?? [],
          errorCode: normalized.errorCode,
          errorMessage: normalized.errorMessage,
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
    channel: 'cli',
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      command: spec.commandLabel,
      args: spec.args,
      cwd: spec.cwd,
      timeoutMs: spec.timeoutMs,
      riskLevel: spec.riskLevel,
      actionCategory: spec.actionCategory,
      aliasExpansionCount: spec.aliasExpansionCount,
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
    },
    createdAt: dispatchCreatedAt,
  }
  const runtimeResult = await runCliCommand(spec, input.abortSignal, now)
  const stepBaseAt = Math.max(dispatchCreatedAt + 1, now())
  const stdoutSegments = segmentOutput(runtimeResult.stdout)
  const stderrSegments = segmentOutput(runtimeResult.stderr)
  const stepEvents: AlicizationExecutionEventInput[] = [
    ...stdoutSegments.map((segment, index): AlicizationExecutionEventInput => ({
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'cli',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'stdout',
        index,
        text: segment,
      },
      createdAt: stepBaseAt + index,
    })),
    ...stderrSegments.map((segment, index): AlicizationExecutionEventInput => ({
      threadId: thread.id,
      decisionTraceId: thread.decisionTraceId,
      turnId: thread.turnId,
      sessionId: thread.sessionId,
      origin: thread.origin,
      channel: 'cli',
      kind: 'step',
      threadStatus: 'running',
      payload: {
        stream: 'stderr',
        index,
        text: segment,
      },
      createdAt: stepBaseAt + stdoutSegments.length + index,
    })),
  ]
  const output = composeCombinedOutput(runtimeResult.stdout, runtimeResult.stderr)

  if (runtimeResult.aborted) {
    const cancelAt = stepBaseAt + stdoutSegments.length + stderrSegments.length
    return {
      ok: false,
      summary: 'CLI execution was cancelled because the kill switch changed while the process was running.',
      output,
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
          channel: 'cli',
          kind: 'cancel',
          threadStatus: 'cancelled',
          payload: {
            command: spec.commandLabel,
            args: spec.args,
            cwd: spec.cwd,
            durationMs: runtimeResult.durationMs,
            errorCode: runtimeResult.errorCode,
            errorMessage: runtimeResult.errorMessage,
            aliasExpansionCount: spec.aliasExpansionCount,
            hasRuntimeContext: spec.runtimeContext !== null,
            runtimeContext: spec.runtimeContext,
          },
          createdAt: cancelAt,
        },
      ],
    }
  }

  const resultAt = stepBaseAt + stdoutSegments.length + stderrSegments.length
  const success = runtimeResult.ok && runtimeResult.exitCode === 0
  const successSummary = success
    ? buildCliSuccessSummary({
        output,
        spec,
        stdout: runtimeResult.stdout,
      })
    : ''
  const finalSummary = success
    ? successSummary || `CLI execution completed for ${normalizeText(thread.goal, 140) || 'the current task'}.`
    : buildFailureSummary(thread, runtimeResult.errorMessage ?? 'unknown error')
  return {
    ok: success,
    summary: finalSummary,
    output,
    errorCode: success ? undefined : runtimeResult.errorCode,
    errorMessage: success ? undefined : runtimeResult.errorMessage,
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
        channel: 'cli',
        kind: 'result',
        threadStatus: success ? 'completed' : 'failed',
        payload: {
          command: spec.commandLabel,
          args: spec.args,
          cwd: spec.cwd,
          durationMs: runtimeResult.durationMs,
          exitCode: runtimeResult.exitCode,
          signal: runtimeResult.signal,
          timedOut: runtimeResult.timedOut,
          outputTruncated: runtimeResult.outputTruncated,
          summary: finalSummary,
          stdout: normalizeText(runtimeResult.stdout),
          stderr: normalizeText(runtimeResult.stderr),
          aliasExpansionCount: spec.aliasExpansionCount,
          errorCode: runtimeResult.errorCode,
          errorMessage: runtimeResult.errorMessage,
          hasRuntimeContext: spec.runtimeContext !== null,
          runtimeContext: spec.runtimeContext,
        },
        createdAt: resultAt,
      },
    ],
  }
}
