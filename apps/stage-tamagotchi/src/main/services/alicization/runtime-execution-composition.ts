import type { AlicizationExecutionCallbackCursor } from './execution-callback-runtime'

import { createAlicizationExecutionCallbackRuntime } from './execution-callback-runtime'
import { createAlicizationMemoryLedgerRuntime } from './memory-ledger-runtime'

type ExecutionCallbackRuntimeOptions = Parameters<typeof createAlicizationExecutionCallbackRuntime>[0]

export function createAlicizationRuntimeExecutionComposition(input: {
  alicizationDb: {
    getMetaValue: (key: string) => Promise<string | undefined>
    setMetaValue: (key: string, value: string) => Promise<void>
    compareAndSetMetaValue?: (
      key: string,
      expectedValue: string | undefined,
      nextValue: string,
    ) => Promise<boolean>
    listExecutionEvents: ExecutionCallbackRuntimeOptions['listExecutionEvents']
    listTaskThreads: ExecutionCallbackRuntimeOptions['listTaskThreads']
  }
}) {
  const callbackCursorMetaKey = 'execution_callback_surfaced_cursor_v1'
  const callbackCursorMetaKeyForSession = (sessionId: string) =>
    `execution_callback_surfaced_cursor_v2:${encodeURIComponent(sessionId)}`

  const readCursor = (raw: string | undefined): number | AlicizationExecutionCallbackCursor => {
    if (!raw)
      return 0
    try {
      const parsed = JSON.parse(raw) as { activityAt?: unknown, threadId?: unknown }
      if (Number.isFinite(parsed.activityAt)) {
        return {
          activityAt: Math.max(0, Math.floor(Number(parsed.activityAt))),
          threadId: typeof parsed.threadId === 'string' && parsed.threadId.trim()
            ? parsed.threadId.trim()
            : null,
        }
      }
    }
    catch {
      return 0
    }
    return 0
  }

  const memoryLedgerRuntime = createAlicizationMemoryLedgerRuntime({
    listExecutionEvents: input.alicizationDb.listExecutionEvents,
    listTaskThreads: input.alicizationDb.listTaskThreads,
  })

  const executionCallbackRuntime = createAlicizationExecutionCallbackRuntime({
    listExecutionEvents: input.alicizationDb.listExecutionEvents,
    listTaskThreads: input.alicizationDb.listTaskThreads,
    cursorStore: {
      get: async (sessionId) => {
        const sessionRaw = await input.alicizationDb.getMetaValue(callbackCursorMetaKeyForSession(sessionId))
        if (sessionRaw)
          return readCursor(sessionRaw)

        const legacyRaw = await input.alicizationDb.getMetaValue(callbackCursorMetaKey)
        if (!legacyRaw)
          return 0
        try {
          const parsed = JSON.parse(legacyRaw) as { cursors?: Record<string, unknown> }
          const legacyCursor = parsed?.cursors?.[sessionId]
          if (Number.isFinite(legacyCursor))
            return Math.max(0, Math.floor(Number(legacyCursor)))
          if (!legacyCursor || typeof legacyCursor !== 'object')
            return 0
          return readCursor(JSON.stringify(legacyCursor))
        }
        catch {
          return 0
        }
      },
      set: async (sessionId, cursor) => {
        await input.alicizationDb.setMetaValue(
          callbackCursorMetaKeyForSession(sessionId),
          JSON.stringify(cursor),
        )
      },
      compareAndSet: input.alicizationDb.compareAndSetMetaValue
        ? async (sessionId, expected, next) => {
          const compareAndSetMetaValue = input.alicizationDb.compareAndSetMetaValue
          if (!compareAndSetMetaValue)
            return false
          const key = callbackCursorMetaKeyForSession(sessionId)
          const expectedRaw = await input.alicizationDb.getMetaValue(key)
          let expectedCursor: AlicizationExecutionCallbackCursor = {
            activityAt: 0,
            threadId: null,
          }
          if (expectedRaw) {
            const parsed = readCursor(expectedRaw)
            expectedCursor = typeof parsed === 'number'
              ? {
                  activityAt: Math.max(0, Math.floor(parsed)),
                  threadId: null,
                }
              : parsed
          }
          else {
            const legacyRaw = await input.alicizationDb.getMetaValue(callbackCursorMetaKey)
            if (legacyRaw) {
              try {
                const parsed = JSON.parse(legacyRaw) as { cursors?: Record<string, unknown> }
                const legacyCursor = parsed?.cursors?.[sessionId]
                if (Number.isFinite(legacyCursor)) {
                  const legacyActivityAt = Math.max(0, Math.floor(Number(legacyCursor)))
                  const legacyExpectedActivityAt = Math.max(0, legacyActivityAt - 1)
                  if (
                    expected.activityAt !== legacyExpectedActivityAt
                    || expected.threadId !== null
                  ) {
                    return false
                  }
                  return await compareAndSetMetaValue(
                    key,
                    undefined,
                    JSON.stringify(next),
                  )
                }
                if (legacyCursor && typeof legacyCursor === 'object') {
                  const legacyExpectedCursor = readCursor(JSON.stringify(legacyCursor))
                  if (
                    typeof legacyExpectedCursor === 'number'
                    || legacyExpectedCursor.activityAt !== expected.activityAt
                    || legacyExpectedCursor.threadId !== expected.threadId
                  ) {
                    return false
                  }
                  return await compareAndSetMetaValue(
                    key,
                    undefined,
                    JSON.stringify(next),
                  )
                }
              }
              catch {
                return false
              }
            }
          }
          if (
            expectedCursor.activityAt !== expected.activityAt
            || expectedCursor.threadId !== expected.threadId
          ) {
            return false
          }
          return await compareAndSetMetaValue(
            key,
            expectedRaw,
            JSON.stringify(next),
          )
        }
        : undefined,
    },
  })

  return {
    memoryLedgerRuntime,
    executionCallbackRuntime,
  }
}
