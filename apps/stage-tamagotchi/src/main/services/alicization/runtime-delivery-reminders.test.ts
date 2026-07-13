import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationDeliveryReminderRuntime,
} from './runtime-delivery-reminders'

type DeliveryReminderRuntimeOptions = Parameters<typeof createAlicizationDeliveryReminderRuntime>[0]
type AppendConversationTurnPayload = Parameters<DeliveryReminderRuntimeOptions['appendConversationTurnWithGuards']>[0]

function createPendingDelivery(providerSettlementAttempts = 0) {
  return {
    key: 'default::session-1::thread-1::123456::completed',
    cardId: 'default',
    sessionId: 'session-1',
    threadId: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    channel: 'codex',
    status: 'completed' as const,
    goal: 'Patch the runtime line.',
    summary: 'patched runtime line',
    outcome: 'patched runtime line',
    signature: 'thread-1:event',
    queuedAt: 123_460,
    completedAt: 123_456,
    providerSettlementAttempts,
  }
}

function createHarness(input: {
  providerStructured: Record<string, unknown> | null
  selection:
    | {
      status: 'pending-provider-settlement'
      reason: string
    }
    | {
      status: 'settled'
      source: 'llm'
      visibleReply: string
    }
  providerSettlementAttempts?: number
}) {
  const pendingDelivery = createPendingDelivery(input.providerSettlementAttempts)
  const appendConversationTurnWithGuards = vi.fn(async () => true)
  const appendAuditLog = vi.fn(async () => {})
  const markDelivered = vi.fn()
  const persistExecutionDeliveryState = vi.fn(async () => {})
  const queueSubconsciousWake = vi.fn()
  const requeue = vi.fn()

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
    appendAuditLog,
    buildReminderContinuitySignal: vi.fn(),
    ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
    appendConversationTurnWithGuards,
    sanitizeBriefText: (raw: string) => raw,
    buildReminderSessionMirrorAction: vi.fn(),
    syncAgentTurnSessionMirror: vi.fn(),
    syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
    hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
    buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
    normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
    getActiveSessionIdByCard: () => 'session-1',
    executionDeliveryRuntime: {
      isInlineSurfaced: vi.fn(() => false),
      takeNext: vi.fn(() => pendingDelivery),
      requeue,
      markDelivered,
    },
    buildExecutionDeliveryAction: vi.fn(() => ({
      kind: 'executor',
      status: 'completed',
      label: 'callback:codex',
    })),
    generateExecutionCallbackStructuredWithGateway: vi.fn(async () => input.providerStructured),
    selectExecutionDeliveryReplySurface: vi.fn(() => input.selection),
    resolveExecutionResultDeliveryPolicy: vi.fn(async () => ({
      mode: 'deliver-now' as const,
      tone: 'balanced' as const,
      reasonTags: ['result-mode:deliver-now'],
    })),
    persistExecutionDeliveryState,
    queueSubconsciousWake,
    executionCallbackRuntime: {
      markSurfaced: vi.fn(),
    },
    errorMessageFrom: () => 'error',
  } as DeliveryReminderRuntimeOptions)

  return {
    appendAuditLog,
    appendConversationTurnWithGuards,
    markDelivered,
    pendingDelivery,
    persistExecutionDeliveryState,
    queueSubconsciousWake,
    requeue,
    runtime,
  }
}

function firstPersistedPayload(mock: { mock: { calls: unknown[][] } }) {
  return mock.mock.calls[0]?.[0] as AppendConversationTurnPayload | undefined
}

describe('runtime delivery reminders', () => {
  it('keeps execution callback pending when provider callback text is unavailable', async () => {
    const harness = createHarness({
      providerStructured: null,
      selection: {
        status: 'pending-provider-settlement',
        reason: 'missing-provider-reply',
      },
    })

    const processed = await harness.runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(harness.requeue).toHaveBeenCalledWith(expect.objectContaining({
      key: harness.pendingDelivery.key,
      providerSettlementAttempts: 1,
    }))
    expect(harness.appendConversationTurnWithGuards).not.toHaveBeenCalled()
    expect(harness.markDelivered).not.toHaveBeenCalled()
    expect(harness.persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(harness.queueSubconsciousWake).toHaveBeenCalledWith(
      'default',
      'execution-delivery-requeue:thread-1',
      1_500,
    )
    expect(harness.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'pending-provider-settlement',
      payload: expect.objectContaining({
        settlementStatus: 'pending-provider-settlement',
        reason: 'missing-provider-reply',
      }),
    }))
  })

  it('persists a callback only after the Provider settles visible text', async () => {
    const providerReply = '运行结果已经返回。'
    const harness = createHarness({
      providerStructured: {
        format: 'mind-turn-v1',
        thought: 'provider thought',
        emotion: 'thinking',
        reply: providerReply,
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      },
      selection: {
        status: 'settled',
        source: 'llm',
        visibleReply: providerReply,
      },
    })

    const processed = await harness.runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(harness.requeue).not.toHaveBeenCalled()
    expect(harness.markDelivered).toHaveBeenCalledWith(harness.pendingDelivery)
    const persisted = firstPersistedPayload(harness.appendConversationTurnWithGuards)
    expect(persisted?.assistantText).toBe(providerReply)
    expect(persisted?.structured?.reply).toBe(providerReply)
    expect(persisted?.structured?.visibleReplyAuthority).toBe('llm-mind')
  })

  it('surfaces a transparent failure after the Provider settlement retry budget is exhausted', async () => {
    const harness = createHarness({
      providerStructured: null,
      selection: {
        status: 'pending-provider-settlement',
        reason: 'missing-provider-reply',
      },
      providerSettlementAttempts: 2,
    })

    const processed = await harness.runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(true)
    expect(harness.requeue).not.toHaveBeenCalled()
    expect(harness.markDelivered).toHaveBeenCalledWith(harness.pendingDelivery)
    const persisted = firstPersistedPayload(harness.appendConversationTurnWithGuards)
    expect(persisted?.structured).toMatchObject({
      kind: 'structured-contract',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
    })
    expect(harness.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'provider-settlement-failed',
    }))
  })
})
