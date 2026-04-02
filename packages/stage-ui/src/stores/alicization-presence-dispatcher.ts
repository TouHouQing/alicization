import type {
  AlicizationAuditLogInput,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationPresencePulsePayload,
} from './alicization-bridge'

import { defineStore } from 'pinia'
import { ref } from 'vue'

import { normalizeAlicizationEmotion } from './alicization-bridge'

type DialogueListener = (payload: AlicizationDialogueRespondedPayload) => void
type PresenceAuditLogger = (input: AlicizationAuditLogInput) => Promise<void> | void
type AlicizationPresenceChannel = 'live2d' | 'vrm' | 'tts' | string

export interface AlicizationPresenceVisualController {
  applyPerformance: (performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
  applyPresencePulse?: (payload: AlicizationPresencePulsePayload) => Promise<void> | void
}

export interface AlicizationPresenceLive2DController extends AlicizationPresenceVisualController {}

export interface AlicizationPresenceVRMController extends AlicizationPresenceVisualController {}

export interface AlicizationPresenceTTSController {
  speak: (reply: string, performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
}

export interface AlicizationPresenceEmbodimentController {
  channel: AlicizationPresenceChannel
  isActive?: () => boolean
  applyPerformance?: (performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
  applyPresencePulse?: (payload: AlicizationPresencePulsePayload) => Promise<void> | void
  speak?: (reply: string, performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
}

const maxRememberedTurnIds = 512

export const useAlicizationPresenceDispatcherStore = defineStore('alicization-presence-dispatcher', () => {
  const listeners = new Set<DialogueListener>()
  const seenTurnIds = new Set<string>()
  const turnIdOrder: string[] = []
  const embodimentControllers = new Set<AlicizationPresenceEmbodimentController>()
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

  function resolveDispatchFailureAction(channel: AlicizationPresenceChannel, kind: 'performance' | 'tts') {
    if (kind === 'tts' || channel === 'tts')
      return 'tts-dispatch-failed'

    if (channel === 'vrm')
      return 'vrm-dispatch-failed'

    if (channel === 'live2d')
      return 'live2d-dispatch-failed'

    return 'embodiment-dispatch-failed'
  }

  function resolveDispatchFailureMessage(channel: AlicizationPresenceChannel, kind: 'performance' | 'tts') {
    if (kind === 'tts' || channel === 'tts')
      return 'TTS presence dispatch failed and was degraded silently.'

    if (channel === 'vrm')
      return 'VRM presence dispatch failed and was degraded silently.'

    if (channel === 'live2d')
      return 'Live2D presence dispatch failed and was degraded silently.'

    return 'Embodiment presence dispatch failed and was degraded silently.'
  }

  function resolveActiveEmbodimentControllers() {
    const active: AlicizationPresenceEmbodimentController[] = []
    for (const controller of embodimentControllers) {
      try {
        if (controller.isActive && !controller.isActive())
          continue
      }
      catch {
        // NOTICE: isActive guard failures should degrade silently to keep chat flow resilient.
        continue
      }

      active.push(controller)
    }

    return active
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

    const activeControllers = resolveActiveEmbodimentControllers()
    const dispatchTasks: Array<{ channel: AlicizationPresenceChannel, kind: 'performance' | 'tts', promise: Promise<void> }> = []
    for (const controller of activeControllers) {
      if (controller.applyPerformance) {
        dispatchTasks.push({
          channel: controller.channel,
          kind: 'performance',
          promise: Promise.resolve(
            controller.applyPerformance(normalizedPayload.structured.performance, normalizedPayload),
          ),
        })
      }

      if (controller.speak) {
        dispatchTasks.push({
          channel: controller.channel,
          kind: 'tts',
          promise: Promise.resolve(
            controller.speak(normalizedPayload.structured.reply ?? '', normalizedPayload.structured.performance, normalizedPayload),
          ),
        })
      }
    }

    if (dispatchTasks.length > 0) {
      const results = await Promise.allSettled(dispatchTasks.map(task => task.promise))
      for (const [index, result] of results.entries()) {
        if (result.status !== 'rejected')
          continue

        const task = dispatchTasks[index]
        if (!task)
          continue

        await appendWarning(
          resolveDispatchFailureAction(task.channel, task.kind),
          resolveDispatchFailureMessage(task.channel, task.kind),
          {
            turnId: payload.turnId,
            channel: task.channel,
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

  async function dispatchPresencePulse(payload: AlicizationPresencePulsePayload) {
    if (!payload || payload.embodiedPresence === 'none' || payload.expiresAt <= Date.now())
      return

    const activeControllers = resolveActiveEmbodimentControllers()
    const tasks = activeControllers
      .filter(controller => typeof controller.applyPresencePulse === 'function')
      .map(controller => ({
        channel: controller.channel,
        promise: Promise.resolve(controller.applyPresencePulse!(payload)),
      }))

    if (tasks.length === 0)
      return

    const results = await Promise.allSettled(tasks.map(task => task.promise))
    for (const [index, result] of results.entries()) {
      if (result.status !== 'rejected')
        continue

      const task = tasks[index]
      if (!task)
        continue

      await appendWarning(
        'presence-pulse-dispatch-failed',
        'Silent Alicization presence pulse failed and was degraded silently.',
        {
          channel: task.channel,
          watchMode: payload.watchMode,
          embodiedPresence: payload.embodiedPresence,
          reason: result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        },
      )
    }
  }

  function onDialogueResponded(listener: DialogueListener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function registerEmbodimentController(controller: AlicizationPresenceEmbodimentController) {
    embodimentControllers.add(controller)
    return () => {
      embodimentControllers.delete(controller)
    }
  }

  function registerLive2DController(controller: AlicizationPresenceLive2DController) {
    return registerEmbodimentController({
      channel: 'live2d',
      ...controller,
    })
  }

  function registerVRMController(controller: AlicizationPresenceVRMController) {
    return registerEmbodimentController({
      channel: 'vrm',
      ...controller,
    })
  }

  function registerTTSController(controller: AlicizationPresenceTTSController) {
    return registerEmbodimentController({
      channel: 'tts',
      speak: controller.speak,
    })
  }

  function setAuditLogger(logger: PresenceAuditLogger | null) {
    auditLogger.value = logger
  }

  function resetDispatcher() {
    listeners.clear()
    seenTurnIds.clear()
    turnIdOrder.splice(0, turnIdOrder.length)
    embodimentControllers.clear()
    auditLogger.value = null
  }

  return {
    dispatchDialogueResponded,
    dispatchPresencePulse,
    onDialogueResponded,
    registerEmbodimentController,
    registerLive2DController,
    registerVRMController,
    registerTTSController,
    setAuditLogger,
    resetDispatcher,
  }
})
