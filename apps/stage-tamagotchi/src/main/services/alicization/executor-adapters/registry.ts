import type {
  AlicizationDispatchTaskThreadInput,
  AlicizationExecutionChannel,
  AlicizationLocalVisualCommandInput,
  AlicizationTaskThreadRecord,
} from '@proj-alicization/stage-shared'

import type { AlicizationClaudeCodeAdapterResult } from './claude-code'
import type { AlicizationCliAdapterResult } from './cli'
import type { AlicizationCodexAdapterResult } from './codex'
import type {
  AlicizationLocalVisualAdapterResult,
  AlicizationLocalVisualDispatchSurface,
} from './local-visual'
import type { AlicizationOpenClawAdapterResult } from './openclaw'

import { executeClaudeCodeTaskThread } from './claude-code'
import { executeCliTaskThread } from './cli'
import { executeCodexTaskThread } from './codex'
import { resolveExecutionTransportChannel } from './embodied-channel'
import { executeLocalVisualTaskThread } from './local-visual'
import { executeOpenClawTaskThread } from './openclaw'

type AlicizationDispatchCommandInput = Pick<AlicizationDispatchTaskThreadInput, 'cli' | 'codex' | 'claudeCode' | 'localVisual' | 'openclaw'>

export type AlicizationDispatchExecutableChannel = 'cli' | 'codex' | 'claude-code' | 'openclaw' | 'browser' | 'software' | 'desktop'
type AlicizationRegisteredDispatchExecutableChannel = Exclude<AlicizationDispatchExecutableChannel, 'browser' | 'software' | 'desktop'>

export type AlicizationDispatchAdapterResult
  = | AlicizationCliAdapterResult
    | AlicizationCodexAdapterResult
    | AlicizationClaudeCodeAdapterResult
    | AlicizationLocalVisualAdapterResult
    | AlicizationOpenClawAdapterResult

interface AlicizationDispatchRuntimeInput {
  abortSignal?: AbortSignal
  workspaceRoot?: string
  now?: () => number
}

interface AlicizationDispatchAdapter<Channel extends AlicizationDispatchExecutableChannel> {
  channel: Channel
  missingPayload: {
    summary: string
    errorCode: string
    errorMessage: string
  }
  pickCommand: (input: AlicizationDispatchCommandInput) => unknown
  execute: (input: {
    thread: AlicizationTaskThreadRecord
    command: unknown
    abortSignal?: AbortSignal
    workspaceRoot?: string
    now?: () => number
  }) => Promise<AlicizationDispatchAdapterResult>
}

type AlicizationDispatchAdapterRegistry = {
  [K in AlicizationRegisteredDispatchExecutableChannel]: AlicizationDispatchAdapter<K>
}

const dispatchAdapterRegistry = {
  'cli': {
    channel: 'cli',
    missingPayload: {
      summary: 'CLI dispatch requires a concrete command contract.',
      errorCode: 'TASK_THREAD_CLI_INPUT_REQUIRED',
      errorMessage: 'Missing CLI command payload for dispatch.',
    },
    pickCommand: input => input.cli,
    execute: async input => await executeCliTaskThread({
      thread: input.thread,
      command: input.command as NonNullable<AlicizationDispatchTaskThreadInput['cli']>,
      abortSignal: input.abortSignal,
      workspaceRoot: input.workspaceRoot,
      now: input.now,
    }),
  },
  'codex': {
    channel: 'codex',
    missingPayload: {
      summary: 'Codex dispatch requires a concrete prompt contract.',
      errorCode: 'TASK_THREAD_CODEX_INPUT_REQUIRED',
      errorMessage: 'Missing Codex prompt payload for dispatch.',
    },
    pickCommand: input => input.codex,
    execute: async input => await executeCodexTaskThread({
      thread: input.thread,
      command: input.command as NonNullable<AlicizationDispatchTaskThreadInput['codex']>,
      abortSignal: input.abortSignal,
      workspaceRoot: input.workspaceRoot,
      now: input.now,
    }),
  },
  'claude-code': {
    channel: 'claude-code',
    missingPayload: {
      summary: 'Claude Code dispatch requires a concrete prompt contract.',
      errorCode: 'TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED',
      errorMessage: 'Missing Claude Code prompt payload for dispatch.',
    },
    pickCommand: input => input.claudeCode,
    execute: async input => await executeClaudeCodeTaskThread({
      thread: input.thread,
      command: input.command as NonNullable<AlicizationDispatchTaskThreadInput['claudeCode']>,
      abortSignal: input.abortSignal,
      workspaceRoot: input.workspaceRoot,
      now: input.now,
    }),
  },
  'openclaw': {
    channel: 'openclaw',
    missingPayload: {
      summary: 'OpenClaw dispatch requires a concrete embodied instruction contract.',
      errorCode: 'TASK_THREAD_OPENCLAW_INPUT_REQUIRED',
      errorMessage: 'Missing OpenClaw instruction payload for dispatch.',
    },
    pickCommand: input => input.openclaw,
    execute: async input => await executeOpenClawTaskThread({
      thread: input.thread,
      command: input.command as NonNullable<AlicizationDispatchTaskThreadInput['openclaw']>,
      abortSignal: input.abortSignal,
      now: input.now,
    }),
  },
} satisfies AlicizationDispatchAdapterRegistry

function isExecutableDispatchChannel(
  channel: AlicizationExecutionChannel | null | undefined,
): channel is AlicizationRegisteredDispatchExecutableChannel {
  return channel === 'cli' || channel === 'codex' || channel === 'claude-code' || channel === 'openclaw'
}

export type AlicizationPreparedTaskThreadDispatch
  = | {
    ok: true
    channel: AlicizationDispatchExecutableChannel
    sessionTrackingChannel: AlicizationExecutionChannel | null
    run: (runtime: AlicizationDispatchRuntimeInput) => Promise<AlicizationDispatchAdapterResult>
  }
  | {
    ok: false
    summary: string
    errorCode: string
    errorMessage: string
  }

export function prepareTaskThreadDispatch(input: {
  thread: AlicizationTaskThreadRecord
  dispatchInput: AlicizationDispatchCommandInput
  localVisualSurface?: AlicizationLocalVisualDispatchSurface
}): AlicizationPreparedTaskThreadDispatch {
  const selectedChannel = input.thread.selectedChannel
  const semanticGuiChannel = selectedChannel === 'browser' || selectedChannel === 'software' || selectedChannel === 'desktop'
    ? selectedChannel
    : null
  if (
    semanticGuiChannel
    && input.localVisualSurface?.desktopInspectScene
  ) {
    const localVisualSurface = input.localVisualSurface
    const command = resolveLocalVisualCommand(input.dispatchInput)
    if (!command) {
      return {
        ok: false,
        summary: `Task thread is assigned to ${semanticGuiChannel}, but no embodied continuation payload was provided for local GUI dispatch.`,
        errorCode: 'TASK_THREAD_LOCAL_VISUAL_INPUT_REQUIRED',
        errorMessage: 'Missing local GUI continuation payload for dispatch.',
      }
    }

    return {
      ok: true,
      channel: semanticGuiChannel,
      sessionTrackingChannel: null,
      run: async runtime => await executeLocalVisualTaskThread({
        thread: input.thread,
        channel: semanticGuiChannel,
        command,
        surface: localVisualSurface,
        abortSignal: runtime.abortSignal,
        now: runtime.now,
      }),
    }
  }

  if (semanticGuiChannel) {
    const command = input.dispatchInput.openclaw
    if (!command) {
      return {
        ok: false,
        summary: 'OpenClaw fallback dispatch requires a concrete embodied instruction contract.',
        errorCode: 'TASK_THREAD_OPENCLAW_INPUT_REQUIRED',
        errorMessage: 'Missing OpenClaw instruction payload for fallback GUI dispatch.',
      }
    }

    return {
      ok: true,
      channel: semanticGuiChannel,
      sessionTrackingChannel: 'openclaw',
      run: async runtime => await executeOpenClawTaskThread({
        thread: input.thread,
        command,
        abortSignal: runtime.abortSignal,
        now: runtime.now,
      }),
    }
  }

  const transportChannel = resolveExecutionTransportChannel(selectedChannel)
  if (!isExecutableDispatchChannel(transportChannel)) {
    return {
      ok: false,
      summary: `Task thread is assigned to ${selectedChannel ?? 'no channel'}, which has no dispatcher yet.`,
      errorCode: 'TASK_THREAD_CHANNEL_UNSUPPORTED',
      errorMessage: 'Dispatch adapter is not implemented for this channel yet.',
    }
  }

  const adapter = dispatchAdapterRegistry[transportChannel]
  const command = adapter.pickCommand(input.dispatchInput)
  if (!command) {
    return {
      ok: false,
      summary: adapter.missingPayload.summary,
      errorCode: adapter.missingPayload.errorCode,
      errorMessage: adapter.missingPayload.errorMessage,
    }
  }

  return {
    ok: true,
    channel: adapter.channel,
    sessionTrackingChannel: adapter.channel,
    run: async runtime => await adapter.execute({
      thread: input.thread,
      command,
      abortSignal: runtime.abortSignal,
      workspaceRoot: runtime.workspaceRoot,
      now: runtime.now,
    }),
  }
}

function resolveLocalVisualCommand(input: AlicizationDispatchCommandInput): AlicizationLocalVisualCommandInput | null {
  if (input.localVisual)
    return input.localVisual

  if (!input.openclaw)
    return null

  return {
    instruction: input.openclaw.instruction,
    meta: input.openclaw.meta ?? null,
    runtimeContext: input.openclaw.runtimeContext ?? null,
  }
}
