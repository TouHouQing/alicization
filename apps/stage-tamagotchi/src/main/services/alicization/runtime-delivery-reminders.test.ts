import { describe, expect, it, vi } from 'vitest'

import { createAlicizationDeliveryReminderRuntime } from './runtime-delivery-reminders'

describe('runtime delivery reminders', () => {
  it('skips subconscious callback persistence when the same execution result becomes inline-surfaced mid-flight', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-inline::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-inline',
      decisionTraceId: 'trace-inline',
      turnId: 'turn-inline',
      channel: 'cli',
      status: 'completed',
      goal: 'List desktop files requested by user.',
      summary: 'Listed desktop entries (8): 小砖猿, GIT, +6 more',
      outcome: 'Listed desktop entries (8): 小砖猿, GIT, +6 more',
      signature: 'thread-inline:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const isInlineSurfaced = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const appendConversationTurnWithGuards = vi.fn(async () => true)
    const markDelivered = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine,
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced,
        takeNext: vi.fn(() => pendingDelivery),
        requeue: vi.fn(),
        markDelivered,
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:cli',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(() => ({
        format: 'subconscious-proactive-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from deterministic',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        parsePath: 'json',
      })),
      selectExecutionDeliveryReplySurface: vi.fn(() => ({
        reply: 'reply from deterministic',
        source: 'llm-repaired' as const,
        reason: 'missing-llm-reply',
      })),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'deliver-now' as const,
        tone: 'balanced' as const,
        reasonTags: ['result-mode:deliver-now'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake: vi.fn(),
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(markDelivered).toHaveBeenCalledWith(pendingDelivery)
    expect(persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('execution-delivery.skipped-inline-surfaced', expect.objectContaining({
      stage: 'pre-persist',
      threadId: 'thread-inline',
    }))
  })

  it('holds finished execution delivery when learned rhythm says the opening is too tight', async () => {
    const pendingDelivery = {
      key: 'default::session-1::thread-hold::123456::completed',
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-hold',
      decisionTraceId: 'trace-hold',
      turnId: 'turn-hold',
      channel: 'codex',
      status: 'completed',
      goal: 'Patch the runtime line.',
      summary: 'patched runtime line',
      outcome: 'patched runtime line',
      signature: 'thread-hold:event',
      queuedAt: 123460,
      completedAt: 123456,
    }
    const requeue = vi.fn()
    const persistExecutionDeliveryState = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const appendConversationTurnWithGuards = vi.fn(async () => true)

    const runtime = createAlicizationDeliveryReminderRuntime({
      getActiveCardId: () => 'default',
      isAlicizationKillSwitchSuspended: () => false,
      getAlicizationCardKillSwitchState: () => 'ACTIVE',
      appendRuntimeDebugLine: vi.fn(async () => {}),
      clearReminderDueTimer: vi.fn(),
      getAlicizationDb: () => ({
        listPendingScheduledTasks: vi.fn(async () => []),
        claimDueScheduledTasks: vi.fn(async () => []),
      }),
      scheduleNextReminderDueCheck: vi.fn(async () => {}),
      reminderClaimBatchSize: 4,
      reminderOverdueTierThresholdMinutes: 10,
      reminderLlmRetryDelayMs: 5_000,
      getSoulSnapshot: vi.fn(),
      bootstrap: vi.fn(async () => ({})),
      generateReminderStructuredWithGateway: vi.fn(async () => null),
      appendAuditLog: vi.fn(async () => {}),
      buildReminderContinuitySignal: vi.fn(),
      ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
      appendConversationTurnWithGuards,
      sanitizeBriefText: (raw: string) => raw,
      buildReminderSessionMirrorAction: vi.fn(),
      syncAgentTurnSessionMirror: vi.fn(),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
      getActiveSessionIdByCard: () => 'session-1',
      executionDeliveryRuntime: {
        isInlineSurfaced: vi.fn(() => false),
        takeNext: vi.fn(() => pendingDelivery),
        requeue,
        markDelivered: vi.fn(),
      },
      buildExecutionDeliveryAction: vi.fn(() => ({
        kind: 'executor',
        status: 'completed',
        label: 'callback:codex',
      })),
      generateExecutionCallbackStructuredWithGateway: vi.fn(async () => ({
        format: 'subconscious-proactive-llm-v1',
        thought: 'thought',
        emotion: 'thinking',
        reply: 'reply from llm',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })),
      buildExecutionDeliveryDeterministicStructured: vi.fn(),
      selectExecutionDeliveryReplySurface: vi.fn(),
      resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
        mode: 'hold-for-opening' as const,
        tone: 'cautious' as const,
        reasonTags: ['result-mode:hold-for-opening'],
      })),
      persistExecutionDeliveryState,
      queueSubconsciousWake,
      executionCallbackRuntime: {
        markSurfaced: vi.fn(),
      },
      errorMessageFrom: () => 'error',
    })

    const processed = await runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(requeue).toHaveBeenCalledWith(pendingDelivery)
    expect(appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-hold:thread-hold', 3 * 60_000)
  })
})
