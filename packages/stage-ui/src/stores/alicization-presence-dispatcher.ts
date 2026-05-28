import type {
  AlicizationAuditLogInput,
  AlicizationDigitalLifeEnvelope,
  AlicizationEmbodimentScriptV1,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationPresencePulsePayload,
} from './alicization-bridge'

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDialogueEmbodimentEnvelope,
  normalizeAlicizationDialogueSpeechTimeline,
  normalizeAlicizationDigitalLifeEnvelope,
  resolveAlicizationDialogueEmbodiment,
} from '@proj-alicization/stage-shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import { normalizeAlicizationEmotion, normalizeAlicizationPerformancePayload } from './alicization-bridge'

type DialogueListener = (payload: AlicizationDialogueRespondedPayload) => void
type PresenceAuditLogger = (input: AlicizationAuditLogInput) => Promise<void> | void
type AlicizationPresenceChannel = 'live2d' | 'vrm' | 'tts' | string
type AlicizationEmbodimentScriptBuilder = (payload: AlicizationDialogueRespondedPayload) => AlicizationEmbodimentScriptV1 | null
type AlicizationEmbodimentScriptBuilderRegistration = {
  id: symbol
  builder: AlicizationEmbodimentScriptBuilder
}

interface DialogueEmbodimentRoutingState {
  previousActionCue: string | null
  previousDelivery: string | null
  previousEmotion: string | null
  previousFacialCue: string | null
  previousVariationToken: string | null
}

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

export interface AlicizationSilentPresencePulseInput {
  label: string
  summary: string
  payload?: AlicizationPresencePulsePayload | null
}

const maxRememberedTurnIds = 512

export const useAlicizationPresenceDispatcherStore = defineStore('alicization-presence-dispatcher', () => {
  const listeners = new Set<DialogueListener>()
  const seenTurnIds = new Set<string>()
  const turnIdOrder: string[] = []
  const embodimentControllers = new Set<AlicizationPresenceEmbodimentController>()
  const auditLogger = ref<PresenceAuditLogger | null>(null)
  const embodimentScriptBuilderRegistrations = ref<AlicizationEmbodimentScriptBuilderRegistration[]>([])
  const dialogueEmbodimentRoutingState: DialogueEmbodimentRoutingState = {
    previousActionCue: null,
    previousDelivery: null,
    previousEmotion: null,
    previousFacialCue: null,
    previousVariationToken: null,
  }

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

  function shouldRouteSparseDialoguePerformance(performance: AlicizationDialoguePerformancePayload) {
    return !performance.actionCue || !performance.facialCue
  }

  function updateDialogueEmbodimentRoutingState(input: {
    performance: AlicizationDialoguePerformancePayload
    variationToken?: string | null
  }) {
    dialogueEmbodimentRoutingState.previousActionCue = input.performance.actionCue ?? null
    dialogueEmbodimentRoutingState.previousFacialCue = input.performance.facialCue ?? null
    dialogueEmbodimentRoutingState.previousEmotion = input.performance.baseEmotion
    dialogueEmbodimentRoutingState.previousDelivery = input.performance.delivery
    dialogueEmbodimentRoutingState.previousVariationToken = input.variationToken ?? null
  }

  function resolveEmbodimentScriptBuilder() {
    const activeRegistration = embodimentScriptBuilderRegistrations.value.at(-1)
    return activeRegistration?.builder ?? null
  }

  function buildLowPressurePresencePulseFromDialogue(
    payload: AlicizationDialogueRespondedPayload,
  ): AlicizationPresencePulsePayload | null {
    const proactive = payload.structured?.proactive
    if (
      payload.origin !== 'subconscious-proactive'
      || !proactive
      || proactive.style !== 'silent-observe'
      || proactive.shouldInterrupt
    ) {
      return null
    }

    return {
      watchMode: 'symbiotic-vision',
      embodiedPresence: 'attentive',
      scenario: proactive.scenario,
      stance: 'accompany',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 120_000,
      confidence: proactive.confidence,
      reasonTags: [
        'subconscious-proactive',
        proactive.style,
        'continuity:quiet-accompaniment',
        ...proactive.reasonCodes,
      ],
      emotionalTension: 'soft-covision',
      currentInwardPreoccupation: payload.structured?.thought?.trim() || null,
      expiresAt: Date.now() + Math.max(15_000, Math.min(proactive.cooldownMs, 180_000)),
    }
  }

  function mergeAuthoritativeDigitalLifeFace(
    provided: AlicizationDigitalLifeEnvelope['face'],
    authoritative: AlicizationDigitalLifeEnvelope['face'],
  ) {
    return {
      ...provided,
      emotion: authoritative.emotion,
      facialCue: authoritative.facialCue,
      expressionMode: authoritative.expressionMode,
      rendererHints: provided.rendererHints ?? authoritative.rendererHints,
    }
  }

  function mergeAuthoritativeDigitalLifeAction(
    provided: AlicizationDigitalLifeEnvelope['action'],
    authoritative: AlicizationDigitalLifeEnvelope['action'],
  ) {
    return {
      ...provided,
      actionCue: authoritative.actionCue,
      actionMode: authoritative.actionMode,
      rendererHints: provided.rendererHints ?? authoritative.rendererHints,
    }
  }

  function reconcileProvidedDigitalLifeWithAuthority(input: {
    provided: AlicizationDigitalLifeEnvelope
    authoritative: AlicizationDigitalLifeEnvelope
  }): AlicizationDigitalLifeEnvelope {
    const authoritativeFrames = input.authoritative.frames
    const providedFrames = input.provided.frames
    const providedFrameById = new Map(providedFrames.map(frame => [frame.id, frame] as const))

    return {
      ...input.provided,
      version: input.authoritative.version,
      variationToken: input.authoritative.variationToken,
      emotion: input.authoritative.emotion,
      mode: input.authoritative.mode,
      postureHint: input.authoritative.postureHint,
      performance: input.authoritative.performance,
      speechStyle: input.authoritative.speechStyle,
      rendererHints: input.provided.rendererHints ?? input.authoritative.rendererHints,
      face: mergeAuthoritativeDigitalLifeFace(input.provided.face, input.authoritative.face),
      action: mergeAuthoritativeDigitalLifeAction(input.provided.action, input.authoritative.action),
      frames: authoritativeFrames.map((authoritativeFrame, index) => {
        const providedFrame = providedFrameById.get(authoritativeFrame.id) ?? providedFrames[index]
        if (!providedFrame)
          return authoritativeFrame

        return {
          ...providedFrame,
          id: authoritativeFrame.id,
          index: authoritativeFrame.index,
          startOffset: authoritativeFrame.startOffset,
          endOffset: authoritativeFrame.endOffset,
          text: authoritativeFrame.text,
          mode: authoritativeFrame.mode,
          interruptPolicy: authoritativeFrame.interruptPolicy,
          settleMode: authoritativeFrame.settleMode,
          face: mergeAuthoritativeDigitalLifeFace(providedFrame.face, authoritativeFrame.face),
          action: mergeAuthoritativeDigitalLifeAction(providedFrame.action, authoritativeFrame.action),
        }
      }),
    }
  }

  async function dispatchDialogueResponded(payload: AlicizationDialogueRespondedPayload) {
    if (!payload?.turnId)
      return

    if (!rememberTurnId(payload.turnId))
      return

    const normalizedEmotion = normalizeAlicizationEmotion(payload.structured?.emotion)
    const normalizedPerformance = normalizeAlicizationPerformancePayload(
      payload.structured?.performance,
      normalizedEmotion.emotion,
    )
    let resolvedEmotion = normalizedEmotion.emotion
    let resolvedPerformance: AlicizationDialoguePerformancePayload = {
      ...normalizedPerformance,
      baseEmotion: normalizedEmotion.emotion,
      emotion: normalizedEmotion.emotion,
    }
    let resolvedEmbodiment: AlicizationDialogueEmbodimentEnvelope | null = normalizeAlicizationDialogueEmbodimentEnvelope(
      payload.structured?.embodiment,
      normalizedEmotion.emotion,
    )
    let resolvedSpeechTimeline = normalizeAlicizationDialogueSpeechTimeline(
      payload.structured?.speechTimeline,
    )
    let resolvedDigitalLife: ReturnType<typeof normalizeAlicizationDigitalLifeEnvelope> = null
    if (resolvedEmbodiment) {
      resolvedEmotion = resolvedEmbodiment.emotion
      resolvedPerformance = {
        ...resolvedEmbodiment.performance,
        baseEmotion: resolvedEmbodiment.emotion,
        emotion: resolvedEmbodiment.emotion,
      }
    }

    if (!resolvedEmbodiment || shouldRouteSparseDialoguePerformance(resolvedPerformance)) {
      resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
        candidateEmotion: resolvedEmotion,
        candidatePerformance: resolvedPerformance,
        governance: payload.structured?.governance,
        previous: {
          actionCue: dialogueEmbodimentRoutingState.previousActionCue,
          delivery: dialogueEmbodimentRoutingState.previousDelivery,
          emotion: dialogueEmbodimentRoutingState.previousEmotion,
          facialCue: dialogueEmbodimentRoutingState.previousFacialCue,
          variationToken: dialogueEmbodimentRoutingState.previousVariationToken,
        },
        reply: payload.structured?.reply ?? '',
        thought: payload.structured?.thought,
        turnId: payload.turnId,
      })
      resolvedEmotion = resolvedEmbodiment.emotion
      resolvedPerformance = {
        ...resolvedEmbodiment.performance,
        baseEmotion: resolvedEmbodiment.emotion,
        emotion: resolvedEmbodiment.emotion,
      }
    }

    if (!resolvedSpeechTimeline) {
      resolvedSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
        reply: payload.structured?.reply ?? '',
        candidateEmotion: resolvedEmotion,
        candidatePerformance: resolvedPerformance,
        embodiment: resolvedEmbodiment,
      })
    }
    const authoritativeDigitalLife = buildAlicizationDigitalLifeEnvelope({
      embodiment: resolvedEmbodiment,
      speechTimeline: resolvedSpeechTimeline,
      digitalLifeSpine: payload.structured?.digitalLifeSpine ?? null,
    })
    resolvedDigitalLife = normalizeAlicizationDigitalLifeEnvelope(
      payload.structured?.digitalLife,
      resolvedEmotion,
    )
    resolvedDigitalLife = resolvedDigitalLife && authoritativeDigitalLife
      ? reconcileProvidedDigitalLifeWithAuthority({
          provided: resolvedDigitalLife,
          authoritative: authoritativeDigitalLife,
        })
      : resolvedDigitalLife
    if (!resolvedDigitalLife)
      resolvedDigitalLife = authoritativeDigitalLife

    updateDialogueEmbodimentRoutingState({
      performance: resolvedPerformance,
      variationToken: resolvedEmbodiment?.variationToken ?? null,
    })

    const normalizedPayload: AlicizationDialogueRespondedPayload = {
      ...payload,
      structured: {
        ...payload.structured,
        emotion: resolvedEmotion,
        performance: resolvedPerformance,
        embodiment: resolvedEmbodiment,
        speechTimeline: resolvedSpeechTimeline,
        digitalLife: resolvedDigitalLife,
        rawEmotion: normalizedEmotion.downgraded
          ? normalizedEmotion.rawEmotion
          : payload.structured.rawEmotion,
      },
    }
    normalizedPayload.structured.embodimentScript
      = normalizedPayload.structured.embodimentScript
        ?? resolveEmbodimentScriptBuilder()?.(normalizedPayload)
        ?? null

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

    const derivedPresencePulse = buildLowPressurePresencePulseFromDialogue(normalizedPayload)
    if (derivedPresencePulse)
      await dispatchPresencePulse(derivedPresencePulse)

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

  async function dispatchSilentPresencePulse(input: AlicizationSilentPresencePulseInput) {
    const payload = input.payload
    if (!payload)
      return

    await dispatchPresencePulse(payload)
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

  function setEmbodimentScriptBuilder(builder: AlicizationEmbodimentScriptBuilder) {
    const registration: AlicizationEmbodimentScriptBuilderRegistration = {
      id: Symbol('alicization-embodiment-script-builder'),
      builder,
    }
    embodimentScriptBuilderRegistrations.value.push(registration)
    return () => {
      const registrationIndex = embodimentScriptBuilderRegistrations.value.findIndex(item => item.id === registration.id)
      if (registrationIndex < 0)
        return

      embodimentScriptBuilderRegistrations.value.splice(registrationIndex, 1)
    }
  }

  function resetDispatcher() {
    listeners.clear()
    seenTurnIds.clear()
    turnIdOrder.splice(0, turnIdOrder.length)
    embodimentControllers.clear()
    auditLogger.value = null
    embodimentScriptBuilderRegistrations.value = []
    dialogueEmbodimentRoutingState.previousActionCue = null
    dialogueEmbodimentRoutingState.previousFacialCue = null
    dialogueEmbodimentRoutingState.previousEmotion = null
    dialogueEmbodimentRoutingState.previousDelivery = null
    dialogueEmbodimentRoutingState.previousVariationToken = null
  }

  return {
    dispatchDialogueResponded,
    dispatchPresencePulse,
    dispatchSilentPresencePulse,
    onDialogueResponded,
    registerEmbodimentController,
    registerLive2DController,
    registerVRMController,
    registerTTSController,
    setAuditLogger,
    setEmbodimentScriptBuilder,
    resetDispatcher,
  }
})
