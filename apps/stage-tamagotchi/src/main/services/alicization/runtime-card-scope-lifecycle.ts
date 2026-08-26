import type { AlicizationPersonaTrainingArtifact } from '@proj-alicization/stage-shared'

import type { AlicizationAuditLogInput, AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'
import type { PersonaTrainingArtifactLoader } from './persona-training-pipeline-gate'

interface CreateAlicizationRuntimeCardScopeLifecycleOptions {
  now: () => number
  getActiveCardId: () => string
  defaultAlicizationCardId: string
  normalizeCardId: (raw: unknown) => string
  listKnownCardIds: () => Promise<string[]>
  switchCardScope: (nextCardIdRaw: unknown) => Promise<void>
  abortAllTurnWrites: (reason: string) => Promise<void>
  clearReminderDueTimer: () => void
  clearAllPendingDialogueDeliveries: () => void
  clearQueuedSubconsciousWake: () => void
  clearExecutionDeliveryStateAll: () => void
  clearExecutionDeliveryStateCard: (cardId: string) => void
  clearMainChatFinishedRuns: () => void
  clearMainChatRunsAll: () => void
  clearDialogueDeliveryCardState: (cardId: string) => void
  clearDialogueDeliveryAllState: () => void
  clearDialogueSessionMirrorCard: (cardId: string) => void
  clearDialogueSessionMirrorAll: () => void
  clearPendingDialogueDeliveriesByCard: (cardId: string) => void
  stopWatch: () => void
  stopSensoryBus: (reason: string) => void
  clearPruneTimer: () => void
  clearSubconsciousTimer: () => void
  clearDreamTimer: () => void
  turnWriteAbortControllers: Map<string, AbortController>
  alicizationDb: {
    clearConversationData: () => Promise<void>
    listActivePersonaTrainingArtifacts: (input: { cardId: string }) => Promise<AlicizationPersonaTrainingArtifact[]>
    setMetaValue: (key: string, value: string) => Promise<void>
    stopPersonaTraining: (reason: string) => Promise<void>
    close: () => Promise<void>
  }
  unloadPersonaTrainingArtifact: PersonaTrainingArtifactLoader['unload']
  activeSessionIdByCard: Map<string, string>
  subconsciousStateByCard: Map<string, unknown>
  proactiveLoopStateByCard: Map<string, unknown>
  perceptionStateByCard: Map<string, unknown>
  visualPresenceStateByCard: Map<string, unknown>
  visualPresenceCapturePersistMetaByCard: Map<string, unknown>
  screenSemanticCacheByCard: Map<string, unknown>
  pendingDurabilityPulseByCard: Map<string, unknown>
  foregroundProbeTimeoutStreakByPid: Map<number, number>
  resetSubconsciousTickInFlight: () => void
  resetSoulLifecycleState: () => void
  removeCardScopeRoot: (cardId: string) => Promise<void>
  removeAlicizationsRoot: () => Promise<void>
  resetProviderConfig: () => void
  resetKillSwitches: () => void
  reinitializeDefaultScope: () => Promise<void>
  emitVisualPresenceState: (cardIdRaw: unknown, state: AlicizationVisualPresenceStateSnapshot | null) => void
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  scheduleNextReminderDueCheck: (reason: string) => Promise<void>
  activeSessionMetaKey: string
  dialogueAckStateMetaKey: string
  dialogueReplyFeedbackAckMetaKey: string
  proactiveLoopStateMetaKey: string
  executionDeliveryStateMetaKey: string
  perceptionStateMetaKey: string
  visualPresenceStateMetaKey: string
}

export function createAlicizationRuntimeCardScopeLifecycle(
  options: CreateAlicizationRuntimeCardScopeLifecycleOptions,
) {
  async function preparePersonaTrainingDataClear(cardId: string, reason: string) {
    await options.alicizationDb.stopPersonaTraining(`persona-data-clear:${reason}`)
    const activeArtifacts = await options.alicizationDb.listActivePersonaTrainingArtifacts({ cardId })
    for (const artifact of activeArtifacts) {
      const receipt = artifact.activation.status === 'active'
        ? {
            loaderId: artifact.activation.loaderId,
            receiptId: artifact.activation.receiptId,
            activatedAt: artifact.activation.activatedAt,
            reason: artifact.activation.reason,
          }
        : null
      await options.unloadPersonaTrainingArtifact({
        cardId,
        artifact,
        reason: `persona-data-clear:${reason}`,
        operationId: [
          'persona-training-data-clear',
          cardId,
          artifact.runId,
          artifact.artifactId,
          'unload',
        ].map(encodeURIComponent).join(':'),
        receipt,
      })
    }
  }

  function clearCardRuntimeState(cardId: string) {
    options.activeSessionIdByCard.delete(cardId)
    options.subconsciousStateByCard.delete(cardId)
    options.proactiveLoopStateByCard.delete(cardId)
    options.perceptionStateByCard.delete(cardId)
    options.visualPresenceStateByCard.delete(cardId)
    options.visualPresenceCapturePersistMetaByCard.delete(cardId)
    options.emitVisualPresenceState(cardId, null)
    options.screenSemanticCacheByCard.delete(cardId)
    options.pendingDurabilityPulseByCard.delete(cardId)
    options.clearDialogueDeliveryCardState(cardId)
    options.clearDialogueSessionMirrorCard(cardId)
    options.clearExecutionDeliveryStateCard(cardId)
    options.clearPendingDialogueDeliveriesByCard(cardId)
  }

  function quiesceActiveCardRuntime() {
    options.clearReminderDueTimer()
    options.stopWatch()
    options.stopSensoryBus('manual')
    options.clearPruneTimer()
    options.clearSubconsciousTimer()
    options.clearDreamTimer()
    options.clearAllPendingDialogueDeliveries()
    options.clearQueuedSubconsciousWake()
    options.turnWriteAbortControllers.clear()
    options.clearMainChatRunsAll()
    options.resetSubconsciousTickInFlight()
    options.resetSoulLifecycleState()
  }

  async function deleteCardScopeData(cardIdRaw: string, reason: string) {
    const startedAt = options.now()
    const targetCardId = options.normalizeCardId(cardIdRaw)
    const previousCardId = options.normalizeCardId(options.getActiveCardId())
    await options.appendRuntimeDebugLine('delete-card-scope.started', {
      reason,
      previousCardId,
      targetCardId,
    })

    await options.abortAllTurnWrites(`delete-card-scope:${targetCardId}:${reason}`).catch(() => {})
    let personaDataPrepared = false
    try {
      await options.switchCardScope(targetCardId)
      await preparePersonaTrainingDataClear(targetCardId, `delete-card-scope:${reason}`)
      personaDataPrepared = true
    }
    finally {
      if (!personaDataPrepared)
        await options.switchCardScope(previousCardId).catch(() => {})
    }

    if (targetCardId === options.defaultAlicizationCardId) {
      quiesceActiveCardRuntime()
      await options.alicizationDb.close()
      await options.removeCardScopeRoot(targetCardId)
      clearCardRuntimeState(targetCardId)
      options.resetKillSwitches()
      await options.reinitializeDefaultScope()
    }
    else {
      const restoreCardId = previousCardId === targetCardId
        ? options.defaultAlicizationCardId
        : previousCardId
      await options.switchCardScope(restoreCardId)
      await options.removeCardScopeRoot(targetCardId)
      clearCardRuntimeState(targetCardId)
    }

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.runtime',
      action: 'delete-card-scope-completed',
      message: 'Deleted Alicization card scope after stopping persona training and unloading active artifacts.',
      payload: {
        reason,
        targetCardId,
        elapsedMs: options.now() - startedAt,
      },
    }, options.getActiveCardId())
    await options.appendRuntimeDebugLine('delete-card-scope.finished', {
      reason,
      targetCardId,
      elapsedMs: options.now() - startedAt,
      activeCardId: options.getActiveCardId(),
    })
  }

  async function clearAllConversationData(reason: string) {
    const startedAt = options.now()
    const previousCardId = options.normalizeCardId(options.getActiveCardId())
    const cardIds = await options.listKnownCardIds()
    await options.appendRuntimeDebugLine('conversation-clear-all.started', {
      reason,
      previousCardId,
      cardCount: cardIds.length,
      cardIds,
    })

    await options.abortAllTurnWrites(`conversation-clear-all:${reason}`).catch(() => {})
    options.clearReminderDueTimer()
    options.clearAllPendingDialogueDeliveries()
    options.clearExecutionDeliveryStateAll()
    options.clearMainChatFinishedRuns()
    options.clearQueuedSubconsciousWake()

    try {
      for (const cardId of cardIds) {
        await options.switchCardScope(cardId)
        await preparePersonaTrainingDataClear(cardId, `conversation-clear-all:${reason}`)
        await options.alicizationDb.clearConversationData()
        await options.alicizationDb.setMetaValue(options.activeSessionMetaKey, '').catch(() => {})
        await options.alicizationDb.setMetaValue(options.dialogueAckStateMetaKey, '{}').catch(() => {})
        await options.alicizationDb.setMetaValue(options.dialogueReplyFeedbackAckMetaKey, '').catch(() => {})
        await options.alicizationDb.setMetaValue(options.proactiveLoopStateMetaKey, '').catch(() => {})
        await options.alicizationDb.setMetaValue(options.executionDeliveryStateMetaKey, '').catch(() => {})
        await options.alicizationDb.setMetaValue(options.perceptionStateMetaKey, '').catch(() => {})
        await options.alicizationDb.setMetaValue(options.visualPresenceStateMetaKey, '').catch(() => {})
        options.activeSessionIdByCard.delete(cardId)
        options.clearDialogueDeliveryCardState(cardId)
        options.proactiveLoopStateByCard.delete(cardId)
        options.perceptionStateByCard.delete(cardId)
        options.visualPresenceStateByCard.delete(cardId)
        options.visualPresenceCapturePersistMetaByCard.delete(cardId)
        options.emitVisualPresenceState(cardId, null)
        options.screenSemanticCacheByCard.delete(cardId)
        options.clearDialogueSessionMirrorCard(cardId)
        options.clearExecutionDeliveryStateCard(cardId)
        options.clearPendingDialogueDeliveriesByCard(cardId)
        await options.appendAuditLog({
          level: 'notice',
          category: 'conversation',
          action: 'clear-all',
          message: 'Cleared all conversation turns and scheduled reminder tasks for card scope.',
          payload: {
            reason,
          },
        }, cardId)
      }
    }
    finally {
      await options.switchCardScope(previousCardId).catch(() => {})
      await options.scheduleNextReminderDueCheck(`conversation-clear-all:${reason}`).catch(() => {})
      await options.appendRuntimeDebugLine('conversation-clear-all.finished', {
        reason,
        elapsedMs: options.now() - startedAt,
        restoredCardId: options.getActiveCardId(),
      })
    }
  }

  async function deleteAllAlicizationData(reason: string) {
    const startedAt = options.now()
    const previousCardId = options.normalizeCardId(options.getActiveCardId())
    const cardIds = [...new Set([
      previousCardId,
      ...await options.listKnownCardIds(),
    ].map(options.normalizeCardId))]
    await options.appendRuntimeDebugLine('delete-all-data.started', {
      reason,
      activeCardId: options.getActiveCardId(),
      cardCount: cardIds.length,
      cardIds,
    })

    await options.abortAllTurnWrites(`delete-all-data:${reason}`).catch(() => {})
    let personaDataPrepared = false
    try {
      for (const cardId of cardIds) {
        await options.switchCardScope(cardId)
        await preparePersonaTrainingDataClear(cardId, `delete-all-data:${reason}`)
      }
      personaDataPrepared = true
    }
    finally {
      if (!personaDataPrepared)
        await options.switchCardScope(previousCardId).catch(() => {})
    }
    options.clearReminderDueTimer()
    options.stopWatch()
    options.stopSensoryBus('manual')
    options.clearPruneTimer()
    options.clearSubconsciousTimer()
    options.clearDreamTimer()
    options.clearAllPendingDialogueDeliveries()
    options.clearExecutionDeliveryStateAll()
    options.turnWriteAbortControllers.clear()
    options.clearMainChatRunsAll()
    options.clearDialogueSessionMirrorAll()
    options.clearQueuedSubconsciousWake()
    options.activeSessionIdByCard.clear()
    options.clearDialogueDeliveryAllState()
    options.subconsciousStateByCard.clear()
    options.proactiveLoopStateByCard.clear()
    options.perceptionStateByCard.clear()
    options.visualPresenceStateByCard.clear()
    options.visualPresenceCapturePersistMetaByCard.clear()
    options.screenSemanticCacheByCard.clear()
    options.pendingDurabilityPulseByCard.clear()
    options.foregroundProbeTimeoutStreakByPid.clear()
    options.resetSubconsciousTickInFlight()
    options.resetSoulLifecycleState()

    await options.alicizationDb.close()
    await options.removeAlicizationsRoot()

    options.resetProviderConfig()
    options.resetKillSwitches()
    await options.reinitializeDefaultScope()

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.runtime',
      action: 'delete-all-data-completed',
      message: 'Deleted all Alicization runtime data and reinitialized default scope.',
      payload: {
        reason,
        elapsedMs: options.now() - startedAt,
      },
    }, options.defaultAlicizationCardId)
    await options.appendRuntimeDebugLine('delete-all-data.finished', {
      reason,
      elapsedMs: options.now() - startedAt,
      activeCardId: options.getActiveCardId(),
    })
  }

  return {
    clearAllConversationData,
    deleteCardScopeData,
    deleteAllAlicizationData,
  }
}

export type AlicizationRuntimeCardScopeLifecycle = ReturnType<typeof createAlicizationRuntimeCardScopeLifecycle>
