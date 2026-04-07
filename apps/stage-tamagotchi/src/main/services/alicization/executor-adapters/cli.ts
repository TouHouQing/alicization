import type { Buffer } from 'node:buffer'

import type {
  AlicizationCliCommandInput,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import { exec, execFile } from 'node:child_process'
import { basename, isAbsolute, relative, resolve } from 'node:path'
import { cwd as processCwd, env as processEnv } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import { normalizeAlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import { buildAlicizationExecutionEnv } from '../execution-command-env'

const cliDefaultTimeoutMs = 20_000
const cliMaxTimeoutMs = 120_000
const cliEventChunkChars = 1_500
const cliMaxPreviewChars = 4_000
const cliMaxBufferBytes = 512 * 1024
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
  runtimeContext: AlicizationExecutionRuntimeContext | null
}

interface AlicizationCliExecutionRuntimeResult {
  ok: boolean
  stdout: string
  stderr: string
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
      errorCode: 'CLI_CWD_OUTSIDE_BOUNDARY',
      errorMessage: 'CLI working directory is outside the current workspace boundary.',
    }
  }

  return {
    ok: true as const,
    cwd: resolved,
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

  const normalizedCwd = normalizeWorkingDirectory(input.command.cwd, workspaceRoot)
  if (!normalizedCwd.ok)
    return normalizedCwd

  const rawArgs = normalizeArgs(input.command.args)
  const parsedCommandWords = parseCommandWords(rawCommand)
  const shellExecutionRequired = requiresShellExecution(rawCommand)
    || requiresShellExecutionFromArgs(rawArgs)
  const shellCommandExpression = shellExecutionRequired
    ? buildShellCommandExpression({
        rawCommand,
        rawArgs,
        parsedCommandWords,
      })
    : ''

  const mode: AlicizationCliExecutionMode = shellExecutionRequired ? 'shell' : 'exec-file'
  let executableCommand = rawCommand
  let executableArgs = [...rawArgs]
  if (mode === 'exec-file') {
    if (parsedCommandWords == null && rawArgs.length > 0) {
      return {
        ok: false as const,
        errorCode: 'CLI_COMMAND_PARSE_FAILED',
        errorMessage: 'CLI command contains unmatched quotes or escapes and cannot be normalized with explicit args.',
      }
    }

    if (parsedCommandWords && parsedCommandWords.length > 0) {
      executableCommand = parsedCommandWords[0]
      executableArgs = [...parsedCommandWords.slice(1), ...rawArgs]
    }
    else {
      executableCommand = rawCommand
      executableArgs = [...rawArgs]
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
      commandLabel: mode === 'shell'
        ? shellCommandExpression
        : [normalizedPath?.commandLabel ?? executableCommand, ...executableArgs].join(' ').trim(),
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

function isCliTimeoutError(error: unknown) {
  const message = errorMessageFrom(error) ?? ''
  return /timed out|timeout|SIGTERM|killed/i.test(message)
    || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
}

async function runCliCommand(
  spec: AlicizationCliCommandSpec,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
): Promise<AlicizationCliExecutionRuntimeResult> {
  const startedAt = now()
  return await new Promise<AlicizationCliExecutionRuntimeResult>((resolveResult) => {
    let aborted = abortSignal?.aborted === true
    let settled = false

    const child = (spec.mode === 'shell'
      ? exec(spec.command, {
          cwd: spec.cwd,
          timeout: spec.timeoutMs,
          maxBuffer: cliMaxBufferBytes,
          env: buildCliRuntimeEnv(spec.runtimeContext),
          windowsHide: true,
        }, onCompleted)
      : execFile(spec.command, spec.args, {
          cwd: spec.cwd,
          timeout: spec.timeoutMs,
          maxBuffer: cliMaxBufferBytes,
          env: buildCliRuntimeEnv(spec.runtimeContext),
          windowsHide: true,
        }, onCompleted))

    function onCompleted(error: unknown, stdout: string | Buffer, stderr: string | Buffer) {
      if (settled)
        return
      settled = true
      cleanup()
      const durationMs = Math.max(0, now() - startedAt)

      if (aborted) {
        resolveResult({
          ok: false,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          exitCode: null,
          signal: 'SIGTERM',
          durationMs,
          aborted: true,
          timedOut: false,
          errorCode: 'CLI_ABORTED',
          errorMessage: 'CLI execution was aborted by kill switch.',
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
        const timedOut = isCliTimeoutError(error)

        resolveResult({
          ok: false,
          stdout: String(stdout ?? ''),
          stderr: String(stderr ?? ''),
          exitCode,
          signal,
          durationMs,
          aborted: false,
          timedOut,
          errorCode: timedOut
            ? 'CLI_TIMEOUT'
            : errorCode === 'ENOENT'
              ? 'CLI_COMMAND_NOT_FOUND'
              : 'CLI_EXECUTE_FAILED',
          errorMessage: errorMessageFrom(error) ?? 'CLI execution failed.',
        })
        return
      }

      resolveResult({
        ok: true,
        stdout: String(stdout ?? ''),
        stderr: String(stderr ?? ''),
        exitCode: 0,
        signal: null,
        durationMs,
        aborted: false,
        timedOut: false,
      })
    }

    const abortExecution = () => {
      if (settled)
        return
      aborted = true
      child.kill('SIGTERM')
      const killTimer = setTimeout(() => {
        if (!settled)
          child.kill('SIGKILL')
      }, 200)
      killTimer.unref?.()
    }

    function cleanup() {
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
  return {
    ok: success,
    summary: success
      ? normalizeText(output, 220) || `CLI execution completed for ${normalizeText(thread.goal, 140) || 'the current task'}.`
      : buildFailureSummary(thread, runtimeResult.errorMessage ?? 'unknown error'),
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
          stdout: normalizeText(runtimeResult.stdout),
          stderr: normalizeText(runtimeResult.stderr),
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
