import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationRuntimeCardScopeLifecycle } from './runtime-card-scope-lifecycle'

function createActivePersonaArtifact(cardId: string): AlicizationPersonaTrainingArtifact {
  return {
    schemaVersion: 'alicization-persona-training-artifact-v1',
    artifactId: `artifact-${cardId}`,
    runId: `run-${cardId}`,
    kind: 'lora-adapter',
    path: `/tmp/${cardId}/adapter.safetensors`,
    sha256: 'a'.repeat(64),
    sizeBytes: 1024,
    baseModel: 'base-model-v1',
    compatibility: {
      status: 'compatible',
      baseModel: 'base-model-v1',
      reason: null,
    },
    activation: {
      status: 'active',
      loaderId: 'persona-loader',
      receiptId: `receipt-${cardId}`,
      activatedAt: 100,
      reason: 'active before clear',
    },
  }
}

describe('runtime card scope lifecycle', () => {
  it('deletes the default card only after stopping training and unloading active LoRA', async () => {
    let activeCardId = 'default'
    const lifecycle: string[] = []
    const removeCardScopeRoot = vi.fn(async () => {
      lifecycle.push('remove')
    })
    const reinitializeDefaultScope = vi.fn(async () => {
      lifecycle.push('reinitialize')
      activeCardId = 'default'
    })

    const runtime = createAlicizationRuntimeCardScopeLifecycle({
      now: () => 5_000,
      getActiveCardId: () => activeCardId,
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      listKnownCardIds: async () => ['default'],
      switchCardScope: async (nextCardIdRaw) => {
        lifecycle.push(`switch:${String(nextCardIdRaw)}`)
        activeCardId = String(nextCardIdRaw)
      },
      abortAllTurnWrites: async () => {
        lifecycle.push('abort')
      },
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
      turnWriteAbortControllers: new Map(),
      alicizationDb: {
        clearConversationData: async () => {},
        listActivePersonaTrainingArtifacts: async ({ cardId }) => {
          lifecycle.push(`list:${cardId}`)
          return [createActivePersonaArtifact(cardId)]
        },
        setMetaValue: async () => {},
        stopPersonaTraining: async () => {
          lifecycle.push('stop')
        },
        close: async () => {
          lifecycle.push('close')
        },
      },
      unloadPersonaTrainingArtifact: async () => {
        lifecycle.push('unload')
      },
      activeSessionIdByCard: new Map([['default', 'session-default']]),
      subconsciousStateByCard: new Map([['default', {}]]),
      proactiveLoopStateByCard: new Map([['default', {}]]),
      perceptionStateByCard: new Map([['default', {}]]),
      visualPresenceStateByCard: new Map([['default', {}]]),
      visualPresenceCapturePersistMetaByCard: new Map([['default', {}]]),
      screenSemanticCacheByCard: new Map([['default', {}]]),
      pendingDurabilityPulseByCard: new Map([['default', {}]]),
      foregroundProbeTimeoutStreakByPid: new Map(),
      resetSubconsciousTickInFlight: () => {},
      resetSoulLifecycleState: () => {},
      removeCardScopeRoot,
      removeAlicizationsRoot: async () => {},
      resetProviderConfig: () => {},
      resetKillSwitches: () => {},
      reinitializeDefaultScope,
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

    await runtime.deleteCardScopeData('default', 'renderer')

    expect(lifecycle).toEqual([
      'abort',
      'switch:default',
      'stop',
      'list:default',
      'unload',
      'close',
      'remove',
      'reinitialize',
    ])
    expect(removeCardScopeRoot).toHaveBeenCalledWith('default')
  })

  it('preserves a card scope when LoRA unload fails', async () => {
    let activeCardId = 'card-a'
    const removeCardScopeRoot = vi.fn(async () => {})

    const runtime = createAlicizationRuntimeCardScopeLifecycle({
      now: () => 7_000,
      getActiveCardId: () => activeCardId,
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      listKnownCardIds: async () => ['card-a'],
      switchCardScope: async (nextCardIdRaw) => {
        activeCardId = String(nextCardIdRaw)
      },
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
      turnWriteAbortControllers: new Map(),
      alicizationDb: {
        clearConversationData: async () => {},
        listActivePersonaTrainingArtifacts: async ({ cardId }) => [createActivePersonaArtifact(cardId)],
        setMetaValue: async () => {},
        stopPersonaTraining: async () => {},
        close: async () => {},
      },
      unloadPersonaTrainingArtifact: async () => {
        throw new Error('loader unavailable')
      },
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      perceptionStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      visualPresenceCapturePersistMetaByCard: new Map(),
      screenSemanticCacheByCard: new Map(),
      pendingDurabilityPulseByCard: new Map(),
      foregroundProbeTimeoutStreakByPid: new Map(),
      resetSubconsciousTickInFlight: () => {},
      resetSoulLifecycleState: () => {},
      removeCardScopeRoot,
      removeAlicizationsRoot: async () => {},
      resetProviderConfig: () => {},
      resetKillSwitches: () => {},
      reinitializeDefaultScope: async () => {},
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

    await expect(runtime.deleteCardScopeData('card-a', 'renderer')).rejects.toThrow('loader unavailable')
    expect(removeCardScopeRoot).not.toHaveBeenCalled()
    expect(activeCardId).toBe('card-a')
  })

  it('clears conversation state across known cards and restores the previous active card', async () => {
    let activeCardId = 'card-a'
    const personaLifecycle: string[] = []
    const switchCardScope = vi.fn(async (nextCardIdRaw: unknown) => {
      activeCardId = String(nextCardIdRaw)
    })
    const clearConversationData = vi.fn(async () => {
      personaLifecycle.push(`clear:${activeCardId}`)
    })
    const stopPersonaTraining = vi.fn(async () => {
      personaLifecycle.push(`stop:${activeCardId}`)
    })
    const unloadPersonaTrainingArtifact = vi.fn(async () => {
      personaLifecycle.push(`unload:${activeCardId}`)
    })
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
        listActivePersonaTrainingArtifacts: async ({ cardId }) => [createActivePersonaArtifact(cardId)],
        setMetaValue,
        stopPersonaTraining,
        close: async () => {},
      },
      unloadPersonaTrainingArtifact,
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
      removeCardScopeRoot: async () => {},
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
    expect(personaLifecycle).toEqual([
      'stop:card-a',
      'unload:card-a',
      'clear:card-a',
      'stop:card-b',
      'unload:card-b',
      'clear:card-b',
    ])
    expect(unloadPersonaTrainingArtifact).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-a',
      artifact: expect.objectContaining({ artifactId: 'artifact-card-a' }),
      operationId: expect.stringContaining('artifact-card-a'),
      receipt: expect.objectContaining({ receiptId: 'receipt-card-a' }),
    }))
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
        listActivePersonaTrainingArtifacts: async ({ cardId }) => [createActivePersonaArtifact(cardId)],
        setMetaValue: async () => {},
        stopPersonaTraining: async () => {},
        close: async () => {},
      },
      unloadPersonaTrainingArtifact: async () => {},
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
      removeCardScopeRoot: async () => {},
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

  it('preserves card recovery evidence when active LoRA unload fails', async () => {
    let activeCardId = 'card-a'
    const clearConversationData = vi.fn(async () => {})
    const removeAlicizationsRoot = vi.fn(async () => {})
    const unloadPersonaTrainingArtifact = vi.fn(async () => {
      throw new Error('loader unavailable')
    })

    const runtime = createAlicizationRuntimeCardScopeLifecycle({
      now: () => 30_000,
      getActiveCardId: () => activeCardId,
      defaultAlicizationCardId: 'default',
      normalizeCardId: raw => String(raw ?? '').trim() || 'default',
      listKnownCardIds: async () => ['card-a'],
      switchCardScope: async (nextCardIdRaw) => {
        activeCardId = String(nextCardIdRaw)
      },
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
      turnWriteAbortControllers: new Map(),
      alicizationDb: {
        clearConversationData,
        listActivePersonaTrainingArtifacts: async ({ cardId }) => [createActivePersonaArtifact(cardId)],
        setMetaValue: async () => {},
        stopPersonaTraining: async () => {},
        close: async () => {},
      },
      unloadPersonaTrainingArtifact,
      activeSessionIdByCard: new Map(),
      subconsciousStateByCard: new Map(),
      proactiveLoopStateByCard: new Map(),
      perceptionStateByCard: new Map(),
      visualPresenceStateByCard: new Map(),
      visualPresenceCapturePersistMetaByCard: new Map(),
      screenSemanticCacheByCard: new Map(),
      pendingDurabilityPulseByCard: new Map(),
      foregroundProbeTimeoutStreakByPid: new Map(),
      resetSubconsciousTickInFlight: () => {},
      resetSoulLifecycleState: () => {},
      removeCardScopeRoot: async () => {},
      removeAlicizationsRoot,
      resetProviderConfig: () => {},
      resetKillSwitches: () => {},
      reinitializeDefaultScope: async () => {},
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

    await expect(runtime.clearAllConversationData('unload-failed')).rejects.toThrow('loader unavailable')
    expect(clearConversationData).not.toHaveBeenCalled()

    await expect(runtime.deleteAllAlicizationData('unload-failed')).rejects.toThrow('loader unavailable')
    expect(removeAlicizationsRoot).not.toHaveBeenCalled()
  })
})
