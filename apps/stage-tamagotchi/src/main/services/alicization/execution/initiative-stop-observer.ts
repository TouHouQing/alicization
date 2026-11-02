import type { AlicizationExecutionEventInput, AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { taskDidNotStart } from './task-no-dispatch-proof'
import { isVerifiedWindowsProcessJobStop } from './windows-process-job'

/** Only stopped read-only initiative may yield without independent effect recovery. */
export function createInitiativeStopObserver(thread?: AlicizationTaskThreadRecord) {
  const task = thread?.metadata?.task
  const eligible = thread?.origin === 'subconscious-proactive'
    && task && typeof task === 'object' && !Array.isArray(task) && (task as { effect?: unknown }).effect === 'observe'
    && ['codex', 'claude-code', 'cli'].includes(thread.selectedChannel ?? '')
  let stopped = false
  return {
    observe(events: AlicizationExecutionEventInput[]) {
      if (!eligible || !thread)
        return
      for (const event of events) {
        if (event.threadId !== thread.id || (event.attemptId ?? null) !== (thread.attemptId ?? null)
          || event.turnId !== thread.turnId || event.channel !== thread.selectedChannel
          || event.origin !== thread.origin || (event.kind !== 'cancel' && event.kind !== 'result')
          || event.payload?.adapter !== thread.selectedChannel) {
          continue
        }
        if (taskDidNotStart(event.payload, thread) || isVerifiedWindowsProcessJobStop(event.payload.processTree, `${thread.id}:${thread.turnId ?? 'none'}`))
          stopped = true
      }
    },
    confirmStopped: async () => stopped,
  }
}
