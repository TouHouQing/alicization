import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationDeliveryReminderRuntime,
} from './runtime-delivery-reminders'

type DeliveryReminderRuntimeOptions = Parameters<typeof createAlicizationDeliveryReminderRuntime>[0]
type AppendConversationTurnPayload = Parameters<DeliveryReminderRuntimeOptions['appendConversationTurnWithGuards']>[0]

function createPendingDelivery(
  providerSettlementAttempts = 0,
  patch: Record<string, unknown> = {},
) {
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
    ...patch,
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
  deliveryPolicy?: {
    mode: 'deliver-now' | 'hold-for-opening'
    tone: 'balanced'
    reasonTags: string[]
  }
  persistConversationTurn?: boolean
  pendingDeliveryPatch?: Record<string, unknown>
  providerError?: Error
  providerSettlementAttempts?: number
}) {
  const pendingDelivery = createPendingDelivery(
    input.providerSettlementAttempts,
    input.pendingDeliveryPatch,
  )
  const appendConversationTurnWithGuards = vi.fn(async () => input.persistConversationTurn ?? true)
  const appendAuditLog = vi.fn(async () => {})
  const generateExecutionCallbackStructuredWithGateway = vi.fn(async (_gatewayInput: Record<string, unknown>) => {
    if (input.providerError)
      throw input.providerError
    return input.providerStructured
  })
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
    generateExecutionCallbackStructuredWithGateway,
    selectExecutionDeliveryReplySurface: vi.fn(() => input.selection),
    resolveExecutionResultDeliveryPolicy: vi.fn(async () => input.deliveryPolicy ?? ({
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
    generateExecutionCallbackStructuredWithGateway,
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

function createReminderHarness() {
  const task = {
    taskId: 'reminder-1',
    triggerAt: Date.now(),
    message: '提醒我检查构建。',
    sourceTurnId: 'source-turn-1',
  }
  const appendConversationTurnWithGuards = vi.fn(async () => true)
  const completeScheduledTask = vi.fn(async () => {})
  const requeueScheduledTask = vi.fn(async () => {})
  const runtime = createAlicizationDeliveryReminderRuntime({
    getActiveCardId: () => 'default',
    isAlicizationKillSwitchSuspended: () => false,
    getAlicizationCardKillSwitchState: () => 'ACTIVE',
    appendRuntimeDebugLine: vi.fn(async () => {}),
    clearReminderDueTimer: vi.fn(),
    getAlicizationDb: () => ({
      listPendingScheduledTasks: vi.fn(async () => [task]),
      claimDueScheduledTasks: vi.fn(async () => [task]),
      requeueScheduledTask,
      completeScheduledTask,
      failScheduledTask: vi.fn(async () => {}),
    }),
    scheduleNextReminderDueCheck: vi.fn(async () => {}),
    reminderClaimBatchSize: 4,
    reminderOverdueTierThresholdMinutes: 10,
    reminderLlmRetryDelayMs: 5_000,
    getSoulSnapshot: vi.fn(() => ({
      frontmatter: {
        personality: '真实人格',
      },
    })),
    bootstrap: vi.fn(async () => ({})),
    generateReminderStructuredWithGateway: vi.fn(async () => ({
      format: 'mind-turn-v1',
      thought: 'provider thought',
      emotion: 'thinking',
      reply: '记得检查构建。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    })),
    appendAuditLog: vi.fn(async () => {}),
    buildReminderContinuitySignal: vi.fn(() => ({
      type: 'reminder',
    })),
    ensureActiveOrLatestSessionId: vi.fn(async () => 'session-1'),
    appendConversationTurnWithGuards,
    sanitizeBriefText: (raw: string) => raw,
    buildReminderSessionMirrorAction: vi.fn(() => ({
      kind: 'reminder',
    })),
    syncAgentTurnSessionMirror: vi.fn(),
    syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
    hydrateAgentTurnFromCurrentCardState: vi.fn(async () => {}),
    buildAgentRuntimeAuditSnapshot: vi.fn(() => null),
    normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw : '',
    getActiveSessionIdByCard: () => 'session-1',
    executionDeliveryRuntime: {
      isInlineSurfaced: vi.fn(() => false),
      takeNext: vi.fn(() => null),
      requeue: vi.fn(),
      markDelivered: vi.fn(),
    },
    buildExecutionDeliveryAction: vi.fn(),
    generateExecutionCallbackStructuredWithGateway: vi.fn(async () => null),
    selectExecutionDeliveryReplySurface: vi.fn(),
    resolveExecutionResultDeliveryPolicy: vi.fn(),
    persistExecutionDeliveryState: vi.fn(async () => {}),
    queueSubconsciousWake: vi.fn(),
    executionCallbackRuntime: {
      markSurfaced: vi.fn(),
    },
    errorMessageFrom: () => 'error',
  } as DeliveryReminderRuntimeOptions)

  return {
    appendConversationTurnWithGuards,
    completeScheduledTask,
    requeueScheduledTask,
    runtime,
  }
}

describe('runtime delivery reminders', () => {
  it('persists the Provider-authored reminder output', async () => {
    const harness = createReminderHarness()

    const result = await harness.runtime.processDueRemindersForCurrentCard('force')

    expect(result).toMatchObject({
      claimed: 1,
      completed: 1,
      failed: 0,
      requeued: 0,
    })
    const persisted = firstPersistedPayload(harness.appendConversationTurnWithGuards)
    expect(persisted?.assistantText).toBe('记得检查构建。')
    expect(persisted?.structured?.reply).toBe('记得检查构建。')
    expect(persisted?.structured?.visibleReplyAuthority).toBe('llm-mind')
    expect(persisted?.visibleReplyRealization).toEqual(persisted?.structured?.visibleReplyRealization)
    expect(harness.completeScheduledTask).toHaveBeenCalledTimes(1)
    expect(harness.requeueScheduledTask).not.toHaveBeenCalled()
  })

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
    expect(harness.requeue).toHaveBeenCalledWith({
      ...harness.pendingDelivery,
      providerSettlementAttempts: 1,
    })
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
    expect(persisted?.visibleReplyRealization).toEqual(persisted?.structured?.visibleReplyRealization)
  })

  it('requeues a settled callback when persistence is skipped', async () => {
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
      persistConversationTurn: false,
    })

    const processed = await harness.runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(harness.requeue.mock.calls[0]?.[0]).toBe(harness.pendingDelivery)
    expect(harness.markDelivered).not.toHaveBeenCalled()
    expect(harness.persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(harness.queueSubconsciousWake).toHaveBeenCalledWith(
      'default',
      'execution-delivery-retry:thread-1',
      1_500,
    )
    expect(harness.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'requeued',
    }))
  })

  it('requeues the current delivery entry after a Provider exception', async () => {
    const harness = createHarness({
      providerStructured: null,
      providerError: new Error('provider transport failed'),
      selection: {
        status: 'pending-provider-settlement',
        reason: 'provider-error',
      },
    })

    const processed = await harness.runtime.processPendingExecutionDeliveriesForCurrentCard('force')

    expect(processed).toBe(false)
    expect(harness.requeue.mock.calls[0]?.[0]).toBe(harness.pendingDelivery)
    expect(harness.persistExecutionDeliveryState).toHaveBeenCalledWith('default')
    expect(harness.queueSubconsciousWake).toHaveBeenCalledWith(
      'default',
      'execution-delivery-error:thread-1',
      2_500,
    )
    expect(harness.appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'delivery-failed',
      payload: expect.objectContaining({
        reason: 'error',
      }),
    }))
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
