import type {
  AlicizationAuditLogInput,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
} from './alicization-bridge'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { normalizeAlicizationEmotion } from './alicization-bridge'

type DialogueListener = (payload: AlicizationDialogueRespondedPayload) => void
type PresenceAuditLogger = (input: AlicizationAuditLogInput) => Promise<void> | void

export interface AlicizationPresenceLive2DController {
  applyPerformance: (performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
}

export interface AlicizationPresenceTTSController {
  speak: (reply: string, performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
}

const maxRememberedTurnIds = 512

export const useAlicizationPresenceDispatcherStore = defineStore('alicization-presence-dispatcher', () => {
  const listeners = new Set<DialogueListener>()
  const seenTurnIds = new Set<string>()
  const turnIdOrder: string[] = []
  const live2dController = ref<AlicizationPresenceLive2DController | null>(null)
  const ttsController = ref<AlicizationPresenceTTSController | null>(null)
  const auditLogger = ref<PresenceAuditLogger | null>(null)

  async function appendWarning(action: string, message: string, payload?: Record<string, unknown>) {
    const logger = auditLogger.value
    if (!logger)
      return

    await Promise.resolve(logger({
      level: 'warning',
      category: 'alicization.presence',
      action,
      message,
      payload,
    })).catch(() => {})
  }

  function rememberTurnId(turnId: string) {
    if (seenTurnIds.has(turnId))
      return false

    seenTurnIds.add(turnId)
    turnIdOrder.push(turnId)

    while (turnIdOrder.length > maxRememberedTurnIds) {
      const oldest = turnIdOrder.shift()
      if (oldest)
        seenTurnIds.delete(oldest)
    }

    return true
  }

  async function dispatchDialogueResponded(payload: AlicizationDialogueRespondedPayload) {
    if (!payload?.turnId)
      return

    if (!rememberTurnId(payload.turnId))
      return

    const normalizedEmotion = normalizeAlicizationEmotion(payload.structured?.emotion)
    const normalizedPayload: AlicizationDialogueRespondedPayload = {
      ...payload,
      structured: {
        ...payload.structured,
        emotion: normalizedEmotion.emotion,
        performance: {
          ...payload.structured.performance,
          baseEmotion: normalizedEmotion.emotion,
          emotion: normalizedEmotion.emotion,
        },
        rawEmotion: normalizedEmotion.downgraded
          ? normalizedEmotion.rawEmotion
          : payload.structured.rawEmotion,
      },
    }

    if (normalizedEmotion.downgraded) {
      await appendWarning(
        'emotion-downgraded',
        'Presence dispatcher downgraded unsupported emotion to neutral.',
        {
          turnId: payload.turnId,
          rawEmotion: normalizedEmotion.rawEmotion,
        },
      )
    }

    const dispatchTasks: Array<{ target: 'live2d' | 'tts', promise: Promise<void> }> = []
    if (live2dController.value) {
      dispatchTasks.push({
        target: 'live2d',
        promise: Promise.resolve(
          live2dController.value.applyPerformance(normalizedPayload.structured.performance, normalizedPayload),
        ),
      })
    }
    if (ttsController.value) {
      dispatchTasks.push({
        target: 'tts',
        promise: Promise.resolve(
          ttsController.value.speak(normalizedPayload.structured.reply ?? '', normalizedPayload.structured.performance, normalizedPayload),
        ),
      })
    }

    if (dispatchTasks.length > 0) {
      const results = await Promise.allSettled(dispatchTasks.map(task => task.promise))
      for (const [index, result] of results.entries()) {
        if (result.status !== 'rejected')
          continue
        const target = dispatchTasks[index]?.target
        if (!target)
          continue

        await appendWarning(
          target === 'live2d' ? 'live2d-dispatch-failed' : 'tts-dispatch-failed',
          target === 'live2d'
            ? 'Live2D presence dispatch failed and was degraded silently.'
            : 'TTS presence dispatch failed and was degraded silently.',
          {
            turnId: payload.turnId,
            reason: result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
          },
        )
      }
    }

    for (const listener of listeners) {
      try {
        listener(normalizedPayload)
      }
      catch {
        // NOTICE: Presence listeners should degrade silently and never block chat flow.
      }
    }
  }

  function onDialogueResponded(listener: DialogueListener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function registerLive2DController(controller: AlicizationPresenceLive2DController) {
    live2dController.value = controller
    return () => {
      if (live2dController.value === controller)
        live2dController.value = null
    }
  }

  function registerTTSController(controller: AlicizationPresenceTTSController) {
    ttsController.value = controller
    return () => {
      if (ttsController.value === controller)
        ttsController.value = null
    }
  }

  function setAuditLogger(logger: PresenceAuditLogger | null) {
    auditLogger.value = logger
  }

  function resetDispatcher() {
    listeners.clear()
    seenTurnIds.clear()
    turnIdOrder.splice(0, turnIdOrder.length)
    live2dController.value = null
    ttsController.value = null
    auditLogger.value = null
  }

  return {
    dispatchDialogueResponded,
    onDialogueResponded,
    registerLive2DController,
    registerTTSController,
    setAuditLogger,
    resetDispatcher,
  }
})
