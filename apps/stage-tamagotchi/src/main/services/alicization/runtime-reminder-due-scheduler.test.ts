import { describe, expect, it } from 'vitest'

import {
  reminderDueDeferredAfterInFlightMs,
  resolveReminderDueTimerDelay,
} from './runtime-reminder-due-scheduler'

describe('runtime reminder due scheduler', () => {
  it('does not spin the due reminder timer every 120ms while a background tick is in flight', () => {
    expect(resolveReminderDueTimerDelay({
      nowMs: 10_000,
      triggerAt: 1_000,
      deferredBecauseTickInFlight: true,
    })).toBe(reminderDueDeferredAfterInFlightMs)
  })

  it('keeps normal due checks close to the scheduled trigger time', () => {
    expect(resolveReminderDueTimerDelay({
      nowMs: 1_000,
      triggerAt: 3_000,
    })).toBe(2_120)
  })
})
