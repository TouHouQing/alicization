import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeCardScopeLifecycle } from './runtime-card-scope-lifecycle'

describe('runtime card scope lifecycle', () => {
  it('clears conversation state across known cards and restores the previous active card', async () => {
    let activeCardId = 'card-a'
    const switchCardScope = vi.fn(async (nextCardIdRaw: unknown) => {
      activeCardId = String(nextCardIdRaw)
    })
    const clearConversationData = vi.fn(async () => {})
    const setMetaValue = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const emitVisualPresenceState = vi.fn()
    const scheduleNextReminderDueCheck = vi.fn(async () => {})
    const clearDialogueDeliveryCardState = vi.fn()
    const clearDialogueSessionMirrorCard = vi.fn()
    const clearExecutionDeliveryStateCard = vi.fn()
    const clearPendingDialogueDeliveriesByCard = vi.fn()

    const activeSessionIdByCard = new Map<string, string>([['card-a', 'session-a'], ['card-b', 'session-b']])
    const proactiveLoopStateByCard = new Map<string, unknown>([['card-b', {}]])
    const perceptionStateByCard = new Map<string, unknown>([['card-b', {}]])
    const visualPresenceStateByCard = new Map<string, unknown>([['card-b', {}]])
    const visualPresenceCapturePersistMetaByCard = new Map<string, unknown>([['card-b', {}]])
    const screenSemanticCacheByCard = new Map<string, unknown>([['card-b', {}]])

    const runtime = createAlicizationRuntimeCardScopeLifecycle({
      now: () => 10_000,
      getActiveCardId: () => activeCardId,
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      listKnownCardIds: async () => ['card-a', 'card-b'],
      switchCardScope,
      abortAllTurnWrites: async () => {},
      clearReminderDueTimer: () => {},
      clearAllPendingDialogueDeliveries: () => {},
      clearQueuedSubconsciousWake: () => {},
      clearExecutionDeliveryStateAll: () => {},
      clearExecutionDeliveryStateCard,
      clearMainChatFinishedRuns: () => {},
      clearMainChatRunsAll: () => {},
      clearDialogueDeliveryCardState,
      clearDialogueDeliveryAllState: () => {},
      clearDialogueSessionMirrorCard,
      clearDialogueSessionMirrorAll: () => {},
      clearPendingDialogueDeliveriesByCard,
      stopWatch: () => {},
      stopSensoryBus: () => {},
      clearPruneTimer: () => {},
      clearSubconsciousTimer: () => {},
      clearDreamTimer: () => {},
      turnWriteAbortControllers: new Map(),
      alicizationDb: {
        clearConversationData,
        setMetaValue,
        close: async () => {},
      },
      activeSessionIdByCard,
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard,
      perceptionStateByCard,
      visualPresenceStateByCard,
      visualPresenceCapturePersistMetaByCard,
      screenSemanticCacheByCard,
      pendingDurabilityPulseByCard: new Map(),
      foregroundProbeTimeoutStreakByPid: new Map(),
      resetSubconsciousTickInFlight: () => {},
      resetSoulLifecycleState: () => {},
      removeAlicizationsRoot: async () => {},
      resetProviderConfig: () => {},
      resetKillSwitches: () => {},
      reinitializeDefaultScope: async () => {},
      emitVisualPresenceState,
      appendRuntimeDebugLine: async () => {},
      appendAuditLog,
      scheduleNextReminderDueCheck,
      activeSessionMetaKey: 'active_session_id_v1',
      dialogueAckStateMetaKey: 'dialogue_ack_state_v1',
      dialogueReplyFeedbackAckMetaKey: 'dialogue_reply_feedback_ack_v1',
      proactiveLoopStateMetaKey: 'proactive_loop_state_v1',
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      perceptionStateMetaKey: 'perception_state_v1',
      visualPresenceStateMetaKey: 'visual_presence_state_v1',
    })

    await runtime.clearAllConversationData('test-clear')

    expect(clearConversationData).toHaveBeenCalledTimes(2)
    expect(setMetaValue).toHaveBeenCalledWith('active_session_id_v1', '')
    expect(setMetaValue).toHaveBeenCalledWith('dialogue_ack_state_v1', '{}')
    expect(clearDialogueDeliveryCardState).toHaveBeenCalledWith('card-a')
    expect(clearDialogueDeliveryCardState).toHaveBeenCalledWith('card-b')
    expect(clearDialogueSessionMirrorCard).toHaveBeenCalledWith('card-b')
    expect(clearExecutionDeliveryStateCard).toHaveBeenCalledWith('card-b')
    expect(clearPendingDialogueDeliveriesByCard).toHaveBeenCalledWith('card-b')
    expect(emitVisualPresenceState).toHaveBeenCalledWith('card-b', null)
    expect(activeSessionIdByCard.size).toBe(0)
    expect(proactiveLoopStateByCard.size).toBe(0)
    expect(perceptionStateByCard.size).toBe(0)
    expect(visualPresenceStateByCard.size).toBe(0)
    expect(visualPresenceCapturePersistMetaByCard.size).toBe(0)
    expect(screenSemanticCacheByCard.size).toBe(0)
    expect(scheduleNextReminderDueCheck).toHaveBeenCalledWith('conversation-clear-all:test-clear')
    expect(activeCardId).toBe('card-a')
    expect(appendAuditLog).toHaveBeenCalled()
  })

  it('deletes all data and reinitializes the default scope through the lifecycle facade', async () => {
    let activeCardId = 'card-a'
    const turnWriteAbortControllers = new Map<string, AbortController>([['turn-1', new AbortController()]])
    const activeSessionIdByCard = new Map<string, string>([['card-a', 'session-a']])
    const subconsciousStateByCard = new Map<string, unknown>([['card-a', {}]])
    const proactiveLoopStateByCard = new Map<string, unknown>([['card-a', {}]])
    const perceptionStateByCard = new Map<string, unknown>([['card-a', {}]])
    const visualPresenceStateByCard = new Map<string, unknown>([['card-a', {}]])
    const visualPresenceCapturePersistMetaByCard = new Map<string, unknown>([['card-a', {}]])
    const screenSemanticCacheByCard = new Map<string, unknown>([['card-a', {}]])
    const pendingDurabilityPulseByCard = new Map<string, unknown>([['card-a', {}]])
    const foregroundProbeTimeoutStreakByPid = new Map<number, number>([[1, 2]])

    const runtime = createAlicizationRuntimeCardScopeLifecycle({
      now: () => 20_000,
      getActiveCardId: () => activeCardId,
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      listKnownCardIds: async () => ['card-a'],
      switchCardScope: async () => {},
      abortAllTurnWrites: async () => {},
      clearReminderDueTimer: () => {},
      clearAllPendingDialogueDeliveries: () => {},
      clearQueuedSubconsciousWake: () => {},
      clearExecutionDeliveryStateAll: () => {},
      clearExecutionDeliveryStateCard: () => {},
      clearMainChatFinishedRuns: () => {},
      clearMainChatRunsAll: () => {},
      clearDialogueDeliveryCardState: () => {},
      clearDialogueDeliveryAllState: () => {},
      clearDialogueSessionMirrorCard: () => {},
      clearDialogueSessionMirrorAll: () => {},
      clearPendingDialogueDeliveriesByCard: () => {},
      stopWatch: () => {},
      stopSensoryBus: () => {},
      clearPruneTimer: () => {},
      clearSubconsciousTimer: () => {},
      clearDreamTimer: () => {},
      turnWriteAbortControllers,
      alicizationDb: {
        clearConversationData: async () => {},
        setMetaValue: async () => {},
        close: async () => {},
      },
      activeSessionIdByCard,
      subconsciousStateByCard,
      proactiveLoopStateByCard,
      perceptionStateByCard,
      visualPresenceStateByCard,
      visualPresenceCapturePersistMetaByCard,
      screenSemanticCacheByCard,
      pendingDurabilityPulseByCard,
      foregroundProbeTimeoutStreakByPid,
      resetSubconsciousTickInFlight: () => {},
      resetSoulLifecycleState: () => {},
      removeAlicizationsRoot: async () => {},
      resetProviderConfig: () => {},
      resetKillSwitches: () => {},
      reinitializeDefaultScope: async () => {
        activeCardId = 'default'
      },
      emitVisualPresenceState: () => {},
      appendRuntimeDebugLine: async () => {},
      appendAuditLog: async () => {},
      scheduleNextReminderDueCheck: async () => {},
      activeSessionMetaKey: 'active_session_id_v1',
      dialogueAckStateMetaKey: 'dialogue_ack_state_v1',
      dialogueReplyFeedbackAckMetaKey: 'dialogue_reply_feedback_ack_v1',
      proactiveLoopStateMetaKey: 'proactive_loop_state_v1',
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      perceptionStateMetaKey: 'perception_state_v1',
      visualPresenceStateMetaKey: 'visual_presence_state_v1',
    })

    await runtime.deleteAllAlicizationData('test-delete-all')

    expect(turnWriteAbortControllers.size).toBe(0)
    expect(activeSessionIdByCard.size).toBe(0)
    expect(subconsciousStateByCard.size).toBe(0)
    expect(proactiveLoopStateByCard.size).toBe(0)
    expect(perceptionStateByCard.size).toBe(0)
    expect(visualPresenceStateByCard.size).toBe(0)
    expect(visualPresenceCapturePersistMetaByCard.size).toBe(0)
    expect(screenSemanticCacheByCard.size).toBe(0)
    expect(pendingDurabilityPulseByCard.size).toBe(0)
    expect(foregroundProbeTimeoutStreakByPid.size).toBe(0)
    expect(activeCardId).toBe('default')
  })
})
