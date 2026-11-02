import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import type { WindowsProcessJobOutcome } from './windows-process-job'

import { randomUUID } from 'node:crypto'

import { assertActionDispatchCurrent, markActionNotStarted } from './action-dispatch-context'
import { markTaskNotStarted } from './task-no-dispatch-proof'
import { readWorkStepDelegation } from './work-step-delegation'

type Channel = 'cli' | 'codex' | 'claude-code'

/** Recheck after asynchronous preparation, immediately before creating a child. */
export async function inspectProcessDispatchAuthority(channel: Channel, signal: AbortSignal | undefined, startedAt: number, now: () => number) {
  try {
    signal?.throwIfAborted()
    await assertActionDispatchCurrent(false)
    await readWorkStepDelegation()?.assertCurrent()
    signal?.throwIfAborted()
    return null
  }
  catch {
    const aborted = signal?.aborted === true
    const prefix = channel.replaceAll('-', '_').toUpperCase()
    return {
      ok: false as const,
      stdout: '',
      stderr: '',
      exitCode: null,
      signal: null,
      durationMs: Math.max(0, now() - startedAt),
      aborted,
      timedOut: false,
      dispatchRefused: true as const,
      errorCode: `${prefix}_${aborted ? 'ABORTED' : 'DISPATCH_REVOKED'}`,
      errorMessage: aborted ? 'The request was cancelled before process dispatch.' : 'The current action authority changed before process dispatch.',
    }
  }
}

/** The target ran no instructions (including a verified suspended-child refusal). */
export function processDispatchRefusal(thread: AlicizationTaskThreadRecord, channel: Channel, refusal: { aborted: boolean, errorCode?: string, errorMessage?: string, processTree?: WindowsProcessJobOutcome }, now: () => number) {
  const finalStatus = refusal.aborted ? 'cancelled' as const : 'failed' as const
  const payload = markTaskNotStarted({ adapter: channel, phase: 'before-process-dispatch', errorCode: refusal.errorCode, processStarted: false, effectMayHaveOccurred: false, sideEffectState: 'none', ...(refusal.processTree ? { processTree: refusal.processTree } : {}) }, { ...thread, selectedChannel: channel })
  return markActionNotStarted({
    ok: false,
    finalStatus,
    summary: refusal.aborted ? '已取消这次操作，尚未执行命令。' : refusal.errorCode?.endsWith('PREPARATION_FAILED') ? '执行准备失败，尚未执行命令。' : '这次操作的授权已变化，尚未执行命令。',
    output: null,
    errorCode: refusal.errorCode,
    errorMessage: refusal.errorMessage,
    effectMayHaveOccurred: false as const,
    sideEffectState: 'none' as const,
    events: [{ id: `${thread.id}:dispatch-refused:${randomUUID()}`, threadId: thread.id, turnId: thread.turnId, sessionId: thread.sessionId, origin: thread.origin, decisionTraceId: thread.decisionTraceId, channel, kind: refusal.aborted ? 'cancel' as const : 'result' as const, threadStatus: finalStatus, createdAt: now(), payload }],
  })
}
