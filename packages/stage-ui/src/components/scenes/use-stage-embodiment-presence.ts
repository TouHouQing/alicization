import type { AlicizationEmbodimentScriptV1, StageEmbodimentSpeechStyleProfile } from '@proj-alicization/stage-shared'
import type { ComputedRef, Ref } from 'vue'

import type { EmotionPayload } from '../../constants/emotions'
import type {
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDigitalLifeEnvelope,
  AlicizationPresencePulsePayload,
  AlicizationVisualPresenceStateSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../stores/alicization-bridge'
import type { useAlicizationPresenceDispatcherStore } from '../../stores/alicization-presence-dispatcher'
import type { StageModelRenderer } from '../../stores/settings'

import { watch } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge, normalizeAlicizationPerformancePayload } from '../../stores/alicization-bridge'
import { buildStageEmbodimentPerformancePlan } from './stage-embodiment-performance-plan'
import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'

interface Live2DActionCapability {
  actionKey: string
  motionName: string
  motionIndex: number
}

export interface UseStageEmbodimentPresenceOptions {
  applyAttentionPerformance?: (performance: AlicizationDialoguePerformancePayload, payload: AlicizationDialogueRespondedPayload) => Promise<void> | void
  applyAttentionPresencePulse?: (payload: AlicizationPresencePulsePayload) => Promise<void> | void
  applyRuntimeEmbodimentEnvelope?: (embodiment: AlicizationDialogueEmbodimentEnvelope | null | undefined) => void
  armPerformance?: (
    performance: AlicizationDialoguePerformancePayload,
    options?: { source?: 'dialogue' | 'presence-pulse', variationToken?: string | null },
  ) => Promise<void> | void
  primeDigitalLifeEnvelope?: (digitalLife: AlicizationDigitalLifeEnvelope | null | undefined) => Promise<void> | void
  primeSpeechTimeline?: (timeline: AlicizationDialogueSpeechTimeline | null | undefined) => Promise<void> | void
  currentMotion: Ref<{ group: string, index?: number }>
  dispatcher: ReturnType<typeof useAlicizationPresenceDispatcherStore>
  live2dActionCapabilities: ComputedRef<Live2DActionCapability[]>
  normalizePresenceEmotionName: (rawEmotion: string) => EmotionPayload['name']
  applyEmotionSpeechStyle: (
    emotionName: EmotionPayload['name'],
    speechStyle?: StageEmbodimentSpeechStyleProfile | null,
  ) => void
  clampPerformance: (performance: AlicizationDialoguePerformancePayload) => AlicizationDialoguePerformancePayload
  enqueueEmotion: (emotion: EmotionPayload) => void
  performanceManifest: ComputedRef<CharacterPerformanceCapabilitiesManifest | null>
  resolveClampedPresencePulsePerformance: (payload: AlicizationPresencePulsePayload) => AlicizationDialoguePerformancePayload
  resolvePresenceIntensity: (emphasis: number | undefined, fallbackIntensity: number) => number
  speakFallback: (
    reply: string,
    performance: AlicizationDialoguePerformancePayload,
    metadata?: { embodimentScript?: AlicizationEmbodimentScriptV1 | null } | null,
  ) => Promise<void> | void
  stageModelRenderer: Ref<StageModelRenderer>
  visualPresenceState?: Readonly<Ref<AlicizationVisualPresenceStateSnapshot | null | undefined>>
}

export function useStageEmbodimentPresence(options: UseStageEmbodimentPresenceOptions) {
  const cleanups: Array<() => void> = []
  const plannedPerformanceCache = new Map<string, AlicizationDialoguePerformancePayload>()
  const plannedPerformanceCacheOrder: string[] = []
  const continuityState = {
    previousActionCue: null as string | null,
    previousFacialCue: null as string | null,
  }

  function rememberPlannedPerformance(cacheKey: string, performance: AlicizationDialoguePerformancePayload) {
    if (plannedPerformanceCache.has(cacheKey))
      return

    plannedPerformanceCacheOrder.push(cacheKey)
    while (plannedPerformanceCacheOrder.length > 64) {
      const oldest = plannedPerformanceCacheOrder.shift()
      if (oldest)
        plannedPerformanceCache.delete(oldest)
    }

    plannedPerformanceCache.set(cacheKey, performance)
  }

  function resolvePlannedPerformance(
    performance: AlicizationDialoguePerformancePayload,
    variationToken?: string | null,
    source: 'dialogue' | 'presence-pulse' = 'dialogue',
  ) {
    const residentSignature = source === 'dialogue'
      ? options.visualPresenceState?.value?.residentPerformance?.signature?.trim() ?? ''
      : ''
    const cacheKey = `${source}:${variationToken?.trim() ?? ''}:${residentSignature}`
    const cached = plannedPerformanceCache.get(cacheKey)
    if (cached)
      return cached

    const residentPerformance = options.visualPresenceState?.value?.residentPerformance?.performance
    const mergedPerformance = source === 'dialogue' && residentPerformance
      ? resolveResidentFallbackDialoguePerformance(performance, residentPerformance)
      : performance
    const plan = buildStageEmbodimentPerformancePlan({
      manifest: options.performanceManifest.value,
      performance: options.clampPerformance(mergedPerformance),
      continuity: {
        previousActionCue: continuityState.previousActionCue,
        previousFacialCue: continuityState.previousFacialCue,
        variationToken,
      },
    })
    continuityState.previousActionCue = plan.plannedActionCue
    continuityState.previousFacialCue = plan.plannedFacialCue
    rememberPlannedPerformance(cacheKey, plan.performance)
    return plan.performance
  }

  function buildFallbackEmbodimentScript(
    payload: AlicizationDialogueRespondedPayload,
    authoritativePerformance?: AlicizationDialoguePerformancePayload,
  ) {
    const rendererTarget = options.stageModelRenderer.value
    if (rendererTarget !== 'live2d' && rendererTarget !== 'vrm')
      return null

    const performance = authoritativePerformance ?? payload.structured.performance
    const embodiment = payload.structured.embodiment
      ? {
          ...payload.structured.embodiment,
          emotion: performance.baseEmotion,
          performance,
        }
      : null

    return buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: payload.structured.governance?.decisionTraceId ?? null,
        turnId: payload.turnId,
        replyText: payload.structured.reply,
        performance,
        embodiment,
        speechTimeline: payload.structured.speechTimeline ?? null,
        digitalLife: payload.structured.digitalLife ?? null,
        digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
      },
      manifest: options.performanceManifest.value,
      residentPerformance: options.visualPresenceState?.value?.residentPerformance ?? null,
      rendererTarget,
    })
  }

  function resolveEmbodimentScriptMetadata(
    payload: AlicizationDialogueRespondedPayload,
    authoritativePerformance?: AlicizationDialoguePerformancePayload,
  ) {
    if (payload.structured.embodimentScript)
      return payload.structured.embodimentScript

    return buildFallbackEmbodimentScript(payload, authoritativePerformance)
  }

  function resolveResidentFallbackDialoguePerformance(
    performance: AlicizationDialoguePerformancePayload,
    residentPerformance: AlicizationDialoguePerformancePayload,
  ) {
    const candidate = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
    const resident = normalizeAlicizationPerformancePayload(
      residentPerformance,
      residentPerformance.baseEmotion,
    )
    const candidateSparse = !candidate.actionCue || !candidate.facialCue
    const candidateNeutralBaseline = candidate.baseEmotion === 'neutral'
      && candidate.delivery === 'calm'
      && candidate.emphasis === 0
    if (!candidateSparse && !candidateNeutralBaseline)
      return candidate

    const mergedEmotion = candidateNeutralBaseline
      ? resident.baseEmotion
      : candidate.baseEmotion

    const visualPresenceState = options.visualPresenceState?.value
    const shouldBiasQuietAccompanimentDialogueFallback = candidateNeutralBaseline
      && visualPresenceState?.currentBodyState === 'accompanying'
      && visualPresenceState?.continuityMode === 'quiet-accompaniment'
      && Number(visualPresenceState?.quietLineMs ?? 0) >= 120_000
      && resident.delivery === 'gentle'
      && resident.baseEmotion === 'thinking'
      && (
        visualPresenceState?.privateThought?.shouldSpeak === false
        || (
          visualPresenceState?.residentPerformance?.stance === 'accompany'
          && visualPresenceState?.residentPerformance?.embodiedPresence === 'attentive'
        )
      )

    return normalizeAlicizationPerformancePayload({
      baseEmotion: mergedEmotion,
      emotion: mergedEmotion,
      facialCue: candidate.facialCue ?? resident.facialCue ?? null,
      actionCue: candidate.actionCue
        ?? (
          shouldBiasQuietAccompanimentDialogueFallback
            ? 'steady_focus'
            : resident.actionCue
        )
        ?? null,
      delivery: candidateNeutralBaseline ? resident.delivery : candidate.delivery,
      emphasis: candidateNeutralBaseline ? resident.emphasis : candidate.emphasis,
    }, mergedEmotion)
  }

  function buildDialogueVariationToken(payload: AlicizationDialogueRespondedPayload) {
    const runtimeVariationToken = payload.structured.embodiment?.variationToken?.trim()
    if (runtimeVariationToken)
      return runtimeVariationToken

    return [
      payload.turnId,
      payload.structured.reply.slice(0, 64),
      payload.structured.thought.slice(0, 64),
      String(payload.structured.performance.emphasis ?? 0),
    ].join('|')
  }

  function buildPulseVariationToken(payload: AlicizationPresencePulsePayload) {
    return [
      payload.watchMode,
      payload.scenario,
      payload.embodiedPresence,
      payload.currentBodyState ?? 'none',
      payload.continuityMode ?? 'none',
      typeof payload.quietLineMs === 'number' ? String(Math.max(0, Math.round(payload.quietLineMs))) : '0',
      String(payload.expiresAt),
    ].join('|')
  }

  cleanups.push(options.dispatcher.setEmbodimentScriptBuilder((payload) => {
    const variationToken = buildDialogueVariationToken(payload)
    const plannedPerformance = resolvePlannedPerformance(
      payload.structured.performance,
      variationToken,
      'dialogue',
    )
    return buildFallbackEmbodimentScript(payload, plannedPerformance)
  }))

  cleanups.push(watch(options.performanceManifest, async (manifest) => {
    if (!hasAlicizationBridge())
      return

    await getAlicizationBridge().setPerformanceManifest?.(manifest)
  }, { immediate: true, deep: true }))

  if (options.applyAttentionPerformance || options.applyAttentionPresencePulse) {
    cleanups.push(options.dispatcher.registerEmbodimentController({
      channel: 'attention',
      applyPerformance: async (performance, payload) => {
        const variationToken = buildDialogueVariationToken(payload)
        const plannedPerformance = resolvePlannedPerformance(
          performance,
          variationToken,
          'dialogue',
        )
        await options.applyAttentionPerformance?.(plannedPerformance, payload)
      },
      applyPresencePulse: async (payload) => {
        await options.applyAttentionPresencePulse?.(payload)
      },
    }))
  }

  cleanups.push(options.dispatcher.registerEmbodimentController({
    channel: 'live2d',
    isActive: () => options.stageModelRenderer.value === 'live2d',
    applyPerformance: async (performance, payload) => {
      options.applyRuntimeEmbodimentEnvelope?.(payload.structured.embodiment)
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
      )
      await options.primeDigitalLifeEnvelope?.(payload.structured.digitalLife)
      await options.primeSpeechTimeline?.(payload.structured.speechTimeline)
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, payload.structured.embodiment?.speechStyle)
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })

      const mappedAction = options.live2dActionCapabilities.value.find(item => item.actionKey === plannedPerformance.actionCue)
      if (mappedAction) {
        options.currentMotion.value = {
          group: mappedAction.motionName,
          index: mappedAction.motionIndex,
        }
      }
    },
    applyPresencePulse: async (payload) => {
      const variationToken = buildPulseVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        options.resolveClampedPresencePulsePerformance(payload),
        variationToken,
        'presence-pulse',
      )
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName)
      await options.armPerformance?.(plannedPerformance, {
        source: 'presence-pulse',
        variationToken,
      })

      const mappedAction = options.live2dActionCapabilities.value.find(item => item.actionKey === plannedPerformance.actionCue)
      if (mappedAction) {
        options.currentMotion.value = {
          group: mappedAction.motionName,
          index: mappedAction.motionIndex,
        }
      }
    },
  }))

  cleanups.push(options.dispatcher.registerEmbodimentController({
    channel: 'vrm',
    isActive: () => options.stageModelRenderer.value === 'vrm',
    applyPerformance: async (performance, payload) => {
      options.applyRuntimeEmbodimentEnvelope?.(payload.structured.embodiment)
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
      )
      await options.primeDigitalLifeEnvelope?.(payload.structured.digitalLife)
      await options.primeSpeechTimeline?.(payload.structured.speechTimeline)
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, payload.structured.embodiment?.speechStyle)
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })
    },
    applyPresencePulse: async (payload) => {
      const variationToken = buildPulseVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        options.resolveClampedPresencePulsePerformance(payload),
        variationToken,
        'presence-pulse',
      )
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName)
      await options.armPerformance?.(plannedPerformance, {
        source: 'presence-pulse',
        variationToken,
      })
    },
  }))

  cleanups.push(options.dispatcher.registerEmbodimentController({
    channel: 'tts',
    speak: async (reply, performance, payload) => {
      options.applyRuntimeEmbodimentEnvelope?.(payload.structured.embodiment)
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
      )
      await options.primeDigitalLifeEnvelope?.(payload.structured.digitalLife)
      await options.primeSpeechTimeline?.(payload.structured.speechTimeline)
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, payload.structured.embodiment?.speechStyle)
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })

      const embodimentScript = resolveEmbodimentScriptMetadata(payload, plannedPerformance)
      await options.speakFallback(reply, plannedPerformance, embodimentScript ? {
        embodimentScript,
      } : null)
    },
  }))

  function dispose() {
    plannedPerformanceCache.clear()
    plannedPerformanceCacheOrder.length = 0
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop()
      cleanup?.()
    }
  }

  return {
    dispose,
  }
}
