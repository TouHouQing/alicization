import type {
  AlicizationClaudeCodeCommandInput,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import { execFile } from 'node:child_process'
import { isAbsolute, relative, resolve } from 'node:path'
import { cwd as processCwd } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import {
  buildAlicizationExecutionEnv,
  resolveAlicizationExecutionBinary,
} from '../execution-command-env'

const claudeCodeDefaultTimeoutMs = 120_000
const claudeCodeMaxTimeoutMs = 900_000
const claudeCodeEventChunkChars = 1_500
const claudeCodeMaxPreviewChars = 4_000
const claudeCodeMaxBufferBytes = 2 * 1024 * 1024

type AlicizationTaskPermissionMode = 'none' | 'implicit' | 'explicit'
type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'
type AlicizationClaudePermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'delegate' | 'dontAsk' | 'plan'

interface AlicizationClaudeCodeCommandSpec {
  rawPrompt: string
  prompt: string
  promptPreview: string
  cwd: string
  timeoutMs: number
  model: string | null
  allowTools: boolean
  permissionMode: AlicizationClaudePermissionMode
  runtimeContext: AlicizationExecutionRuntimeContext | null
}

interface AlicizationClaudeCodeExecutionRuntimeResult {
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

export interface AlicizationClaudeCodeAdapterInput {
  thread: AlicizationTaskThreadRecord
  command: AlicizationClaudeCodeCommandInput
  abortSignal?: AbortSignal
  workspaceRoot?: string
  now?: () => number
}

export interface AlicizationClaudeCodeAdapterResult {
  ok: boolean
  summary: string
  output: string | null
  errorCode?: string
  errorMessage?: string
  finalStatus: AlicizationTaskThreadStatus
  events: AlicizationExecutionEventInput[]
}

function normalizeText(raw: unknown, maxChars = claudeCodeMaxPreviewChars) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function segmentOutput(raw: string) {
  if (!raw)
    return []

  const segments: string[] = []
  for (let index = 0; index < raw.length; index += claudeCodeEventChunkChars)
    segments.push(raw.slice(index, index + claudeCodeEventChunkChars))
  return segments
}

function isWithinRoot(root: string, target: string) {
  const rel = relative(root, target)
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('../') && !rel.startsWith('..\\'))
}

function normalizeTimeoutMs(raw: unknown) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return claudeCodeDefaultTimeoutMs
  return Math.max(300, Math.min(claudeCodeMaxTimeoutMs, Math.floor(numeric)))
}

function normalizeOptionalText(raw: unknown, maxChars = 120) {
  if (typeof raw !== 'string')
    return null
  const value = raw.trim().slice(0, maxChars)
  return value || null
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
      errorCode: 'CLAUDE_CODE_CWD_OUTSIDE_BOUNDARY',
      errorMessage: 'Claude Code working directory is outside the current workspace boundary.',
    }
  }

  return {
    ok: true as const,
    cwd: resolved,
  }
}

function resolveThreadPermissionMode(thread: AlicizationTaskThreadRecord): AlicizationTaskPermissionMode {
  const metadataTask = thread.metadata?.task
  if (metadataTask && typeof metadataTask === 'object' && 'permissionMode' in metadataTask) {
    const permissionMode = (metadataTask as { permissionMode?: unknown }).permissionMode
    if (permissionMode === 'explicit' || permissionMode === 'implicit' || permissionMode === 'none')
      return permissionMode
  }

  return thread.origin === 'user-turn' ? 'implicit' : 'none'
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

function normalizeClaudePermissionMode(raw: unknown): AlicizationClaudePermissionMode | null {
  if (
    raw === 'default'
    || raw === 'acceptEdits'
    || raw === 'bypassPermissions'
    || raw === 'delegate'
    || raw === 'dontAsk'
    || raw === 'plan'
  ) {
    return raw
  }
  return null
}

function deriveDefaultPermissionMode(permissionMode: AlicizationTaskPermissionMode): AlicizationClaudePermissionMode {
  if (permissionMode === 'explicit')
    return 'dontAsk'
  if (permissionMode === 'implicit')
    return 'acceptEdits'
  return 'plan'
}

function buildClaudeCodeCommandSpec(input: AlicizationClaudeCodeAdapterInput) {
  const workspaceRoot = resolve(input.workspaceRoot ?? processCwd())
  const rawPrompt = typeof input.command.prompt === 'string'
    ? input.command.prompt.trim()
    : ''
  if (!rawPrompt) {
    return {
      ok: false as const,
      errorCode: 'CLAUDE_CODE_PROMPT_REQUIRED',
      errorMessage: 'Claude Code dispatch requires a non-empty prompt.',
    }
  }

  const normalizedCwd = normalizeWorkingDirectory(input.command.cwd, workspaceRoot)
  if (!normalizedCwd.ok)
    return normalizedCwd

  const permissionMode = resolveThreadPermissionMode(input.thread)
  const effect = resolveThreadEffect(input.thread)
  const allowTools = input.command.allowTools === true
  if (allowTools && effect === 'observe') {
    return {
      ok: false as const,
      errorCode: 'CLAUDE_CODE_EFFECT_MISMATCH',
      errorMessage: 'Observe-only task threads cannot enable Claude Code tools.',
    }
  }
  if (allowTools && effect === 'high-impact' && permissionMode !== 'explicit') {
    return {
      ok: false as const,
      errorCode: 'CLAUDE_CODE_PERMISSION_REQUIRED',
      errorMessage: 'High-impact Claude Code dispatch requires explicit permission before execution.',
    }
  }
  if (allowTools && effect === 'mutate' && permissionMode === 'none') {
    return {
      ok: false as const,
      errorCode: 'CLAUDE_CODE_PERMISSION_REQUIRED',
      errorMessage: 'Mutating Claude Code dispatch requires at least implicit permission before execution.',
    }
  }

  const explicitPermissionMode = normalizeClaudePermissionMode(input.command.permissionMode)
  const resolvedPermissionMode: AlicizationClaudePermissionMode = allowTools
    ? (explicitPermissionMode ?? deriveDefaultPermissionMode(permissionMode))
    : 'plan'
  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(input.command.runtimeContext)
  const runtimeContextBlock = buildAlicizationExecutionRuntimeContextBlock(runtimeContext)
  const prompt = runtimeContextBlock
    ? [
        runtimeContextBlock,
        '',
        '[ALICIZATION_EXECUTION_TASK]',
        rawPrompt,
      ].join('\n')
    : rawPrompt

  return {
    ok: true as const,
    spec: {
      rawPrompt,
      prompt,
      promptPreview: normalizeText(rawPrompt, 260),
      cwd: normalizedCwd.cwd,
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs),
      model: normalizeOptionalText(input.command.model, 80),
      allowTools,
      permissionMode: resolvedPermissionMode,
      runtimeContext,
    } satisfies AlicizationClaudeCodeCommandSpec,
  }
}

function isClaudeCodeTimeoutError(error: unknown) {
  const message = errorMessageFrom(error) ?? ''
  return /timed out|timeout|SIGTERM|killed/i.test(message)
    || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
}

function buildClaudeCodeExecArgs(spec: AlicizationClaudeCodeCommandSpec) {
  const args = [
    '--print',
    '--output-format',
    'text',
    '--permission-mode',
    spec.permissionMode,
  ]
  if (!spec.allowTools)
    args.push('--tools', '')
  if (spec.model)
    args.push('--model', spec.model)
  args.push('--', spec.prompt)
  return args
}

async function runClaudeCodeCommand(
  spec: AlicizationClaudeCodeCommandSpec,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
): Promise<AlicizationClaudeCodeExecutionRuntimeResult> {
  const startedAt = now()
  const args = buildClaudeCodeExecArgs(spec)
  const env = buildAlicizationExecutionEnv()
  const command = await resolveAlicizationExecutionBinary('claude', {
    pathValue: env.PATH,
  })
  return await new Promise<AlicizationClaudeCodeExecutionRuntimeResult>((resolveResult) => {
    let aborted = abortSignal?.aborted === true
    let settled = false
    const child = execFile(command, args, {
      cwd: spec.cwd,
      env,
      timeout: spec.timeoutMs,
      maxBuffer: claudeCodeMaxBufferBytes,
      windowsHide: true,
    }, (error, stdout, stderr) => {
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
          errorCode: 'CLAUDE_CODE_ABORTED',
          errorMessage: 'Claude Code dispatch was aborted by kill switch.',
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
        const timedOut = isClaudeCodeTimeoutError(error)

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
            ? 'CLAUDE_CODE_TIMEOUT'
            : errorCode === 'ENOENT'
              ? 'CLAUDE_CODE_COMMAND_NOT_FOUND'
              : 'CLAUDE_CODE_EXECUTE_FAILED',
          errorMessage: errorMessageFrom(error) ?? 'Claude Code execution failed.',
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
    })

    const abortExecution = () => {
      if (settled)
        return
      aborted = true
      child.kill('SIGTERM')
      const killTimer = setTimeout(() => {
        if (!settled)
          child.kill('SIGKILL')
      }, 250)
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
  return parts.join('\n').slice(0, claudeCodeMaxPreviewChars)
}

function buildFailureSummary(thread: AlicizationTaskThreadRecord, errorMessage: string) {
  const goal = normalizeText(thread.goal, 140) || 'the current task'
  return `Claude Code execution failed while acting on ${goal}: ${normalizeText(errorMessage, 220) || 'unknown error'}.`
}

export async function executeClaudeCodeTaskThread(input: AlicizationClaudeCodeAdapterInput): Promise<AlicizationClaudeCodeAdapterResult> {
  const now = input.now ?? Date.now
  const thread = input.thread
  const normalized = buildClaudeCodeCommandSpec(input)
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
        channel: 'claude-code',
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          adapter: 'claude-code',
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
    channel: 'claude-code',
    kind: 'dispatch',
    threadStatus: 'running',
    payload: {
      adapter: 'claude-code',
      hasRuntimeContext: spec.runtimeContext !== null,
      runtimeContext: spec.runtimeContext,
      promptPreview: spec.promptPreview,
      cwd: spec.cwd,
      timeoutMs: spec.timeoutMs,
      allowTools: spec.allowTools,
      permissionMode: spec.permissionMode,
      model: spec.model,
    },
    createdAt: dispatchCreatedAt,
  }

  const runtimeResult = await runClaudeCodeCommand(spec, input.abortSignal, now)
  const output = composeCombinedOutput(runtimeResult.stdout, runtimeResult.stderr)
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
      channel: 'claude-code',
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
      channel: 'claude-code',
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

  if (runtimeResult.aborted) {
    const cancelAt = stepBaseAt + stdoutSegments.length + stderrSegments.length
    return {
      ok: false,
      summary: 'Claude Code execution was cancelled because the kill switch changed while the process was running.',
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
          channel: 'claude-code',
          kind: 'cancel',
          threadStatus: 'cancelled',
          payload: {
            adapter: 'claude-code',
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

  const success = runtimeResult.ok && runtimeResult.exitCode === 0
  const resultAt = stepBaseAt + stdoutSegments.length + stderrSegments.length
  return {
    ok: success,
    summary: success
      ? normalizeText(output, 220) || `Claude Code execution completed for ${normalizeText(thread.goal, 140) || 'the current task'}.`
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
        channel: 'claude-code',
        kind: 'result',
        threadStatus: success ? 'completed' : 'failed',
        payload: {
          adapter: 'claude-code',
          hasRuntimeContext: spec.runtimeContext !== null,
          runtimeContext: spec.runtimeContext,
          promptPreview: spec.promptPreview,
          cwd: spec.cwd,
          timeoutMs: spec.timeoutMs,
          allowTools: spec.allowTools,
          permissionMode: spec.permissionMode,
          model: spec.model,
          durationMs: runtimeResult.durationMs,
          exitCode: runtimeResult.exitCode,
          signal: runtimeResult.signal,
          timedOut: runtimeResult.timedOut,
          stdout: normalizeText(runtimeResult.stdout),
          stderr: normalizeText(runtimeResult.stderr),
          errorCode: runtimeResult.errorCode,
          errorMessage: runtimeResult.errorMessage,
        },
        createdAt: resultAt,
      },
    ],
  }
}
