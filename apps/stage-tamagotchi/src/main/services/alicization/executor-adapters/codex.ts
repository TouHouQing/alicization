import type {
  AlicizationCodexCommandInput,
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '@proj-alicization/stage-shared'

import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, relative, resolve } from 'node:path'
import { cwd as processCwd } from 'node:process'

import { errorMessageFrom } from '@moeru/std'
import {
  buildAlicizationExecutionRuntimeContextBlock,
  buildAlicizationProviderFactBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import {
  buildAlicizationExecutionEnv,
  resolveAlicizationExecutionBinary,
} from '../execution-command-env'
import {
  isLowRiskAutonomousCodeAgentSelfStartThread,
  resolveThreadPermissionMode,
} from './thread-permission'

const codexDefaultTimeoutMs = 120_000
const codexMaxTimeoutMs = 900_000
const codexEventChunkChars = 1_500
const codexMaxPreviewChars = 4_000
const codexMaxBufferBytes = 2 * 1024 * 1024

type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'
type AlicizationCodexSandboxMode = 'read-only' | 'workspace-write'

interface AlicizationCodexCommandSpec {
  rawPrompt: string
  prompt: string
  promptPreview: string
  cwd: string
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
  errorCode?: string
  errorMessage?: string
}

export interface AlicizationCodexAdapterInput {
  thread: AlicizationTaskThreadRecord
  command: AlicizationCodexCommandInput
  abortSignal?: AbortSignal
  workspaceRoot?: string
  now?: () => number
}

export interface AlicizationCodexAdapterResult {
  ok: boolean
  summary: string
  output: string | null
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

function normalizeTimeoutMs(raw: unknown) {
  const numeric = Number(raw)
  if (!Number.isFinite(numeric))
    return codexDefaultTimeoutMs
  return Math.max(300, Math.min(codexMaxTimeoutMs, Math.floor(numeric)))
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
      timeoutMs: normalizeTimeoutMs(input.command.timeoutMs),
      sandbox: sandbox.sandbox,
      model: normalizeOptionalText(input.command.model, 80),
      profile: normalizeOptionalText(input.command.profile, 80),
      runtimeContext,
    } satisfies AlicizationCodexCommandSpec,
  }
}

function isCodexTimeoutError(error: unknown) {
  const message = errorMessageFrom(error) ?? ''
  return /timed out|timeout|SIGTERM|killed/i.test(message)
    || (typeof error === 'object' && error != null && 'killed' in error && (error as { killed?: unknown }).killed === true)
}

function buildCodexExecArgs(spec: AlicizationCodexCommandSpec, outputLastMessagePath: string) {
  const args = [
    'exec',
    '--skip-git-repo-check',
    '--sandbox',
    spec.sandbox,
    '-C',
    spec.cwd,
    '--output-last-message',
    outputLastMessagePath,
  ]
  if (spec.model)
    args.push('--model', spec.model)
  if (spec.profile)
    args.push('--profile', spec.profile)
  args.push(spec.prompt)
  return args
}

async function runCodexCommand(
  spec: AlicizationCodexCommandSpec,
  outputLastMessagePath: string,
  abortSignal?: AbortSignal,
  now: () => number = Date.now,
): Promise<AlicizationCodexExecutionRuntimeResult> {
  const startedAt = now()
  const args = buildCodexExecArgs(spec, outputLastMessagePath)
  const env = buildAlicizationExecutionEnv()
  const command = await resolveAlicizationExecutionBinary('codex', {
    pathValue: env.PATH,
  })
  return await new Promise<AlicizationCodexExecutionRuntimeResult>((resolveResult) => {
    let aborted = abortSignal?.aborted === true
    let settled = false
    const child = execFile(command, args, {
      cwd: spec.cwd,
      env,
      timeout: spec.timeoutMs,
      maxBuffer: codexMaxBufferBytes,
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
          errorCode: 'CODEX_ABORTED',
          errorMessage: 'Codex dispatch was aborted by kill switch.',
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
            ? 'CODEX_TIMEOUT'
            : errorCode === 'ENOENT'
              ? 'CODEX_COMMAND_NOT_FOUND'
              : 'CODEX_EXECUTE_FAILED',
          errorMessage: errorMessageFrom(error) ?? 'Codex execution failed.',
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

async function readCodexOutputMessage(outputPath: string) {
  try {
    const text = await readFile(outputPath, 'utf8')
    return typeof text === 'string' ? text : ''
  }
  catch {
    return ''
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
  const tempDir = await mkdtemp(resolve(tmpdir(), 'alicization-codex-'))
  const outputLastMessagePath = resolve(tempDir, 'last-message.txt')
  try {
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
        sandbox: spec.sandbox,
        model: spec.model,
        profile: spec.profile,
      },
      createdAt: dispatchCreatedAt,
    }

    const runtimeResult = await runCodexCommand(spec, outputLastMessagePath, input.abortSignal, now)
    const assistantOutput = await readCodexOutputMessage(outputLastMessagePath)
    const output = composeCombinedOutput(assistantOutput, runtimeResult.stdout, runtimeResult.stderr)
    const stepBaseAt = Math.max(dispatchCreatedAt + 1, now())
    const assistantSegments = segmentOutput(assistantOutput)
    const stdoutSegments = segmentOutput(runtimeResult.stdout)
    const stderrSegments = segmentOutput(runtimeResult.stderr)
    const stepEvents: AlicizationExecutionEventInput[] = [
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

    const success = runtimeResult.ok && runtimeResult.exitCode === 0
    const resultAt = stepBaseAt + assistantSegments.length + stdoutSegments.length + stderrSegments.length
    return {
      ok: success,
      summary: success
        ? normalizeText(assistantOutput || output, 220) || `Codex execution completed for ${normalizeText(thread.goal, 140) || 'the current task'}.`
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
            assistant: normalizeText(assistantOutput),
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
  finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}
