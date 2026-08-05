export const reminderDueTimerSlackMs = 120
export const reminderDueDeferredAfterInFlightMs = 5_000
export const reminderDueStartupGraceMs = 30_000
export const reminderDueMaxTimeoutMs = 2_147_000_000

export function resolveReminderDueTimerDelay(input: {
  nowMs: number
  triggerAt: number
  deferredBecauseTickInFlight?: boolean
  startupGrace?: boolean
}) {
  if (input.deferredBecauseTickInFlight)
    return reminderDueDeferredAfterInFlightMs

  const dueInMs = Math.max(0, input.triggerAt - input.nowMs)
  if (input.startupGrace && dueInMs < reminderDueStartupGraceMs)
    return reminderDueStartupGraceMs

  return Math.min(reminderDueMaxTimeoutMs, dueInMs + reminderDueTimerSlackMs)
}
