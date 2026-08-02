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

import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  sanitizeCharacterPerformanceManifest,
} from '@proj-alicization/stage-shared'
import { watch } from 'vue'

import { buildAlicizationEmbodimentScript } from '../../services/embodiment/director'
import { getAlicizationBridge, hasAlicizationBridge, normalizeAlicizationPerformancePayload } from '../../stores/alicization-bridge'
import { resolveStageEmbodimentMetaAuthority } from './runtime'
import { buildStageEmbodimentPerformancePlan } from './stage-embodiment-performance-plan'
import {
  resolveResidentSnapshot,
  resolveStageEmbodimentResidentPerformance,
} from './stage-embodiment-resident-performance'

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
  applyPreferredExpressionAliases?: (aliases: string[] | null | undefined) => void
  clampPerformance: (performance: AlicizationDialoguePerformancePayload) => AlicizationDialoguePerformancePayload
  enqueueEmotion: (emotion: EmotionPayload) => void
  performanceManifest: ComputedRef<CharacterPerformanceCapabilitiesManifest | null>
  resolveClampedPresencePulsePerformance: (payload: AlicizationPresencePulsePayload) => AlicizationDialoguePerformancePayload
  resolvePresenceIntensity: (emphasis: number | undefined, fallbackIntensity: number) => number
  speakFallback: (
    reply: string,
    performance: AlicizationDialoguePerformancePayload,
    metadata?: {
      embodimentScript?: AlicizationEmbodimentScriptV1 | null
      runtimeDigest?: AlicizationDialogueRespondedPayload['structured']['runtimeDigest'] | null
    } | null,
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
    optionsInput?: {
      dialoguePayload?: AlicizationDialogueRespondedPayload | null
    },
  ) {
    const residentSnapshot = source === 'dialogue' && options.visualPresenceState?.value
      ? resolveResidentSnapshot({
          activePresence: null,
          continuity: {
            previousActionCue: continuityState.previousActionCue,
            previousFacialCue: continuityState.previousFacialCue,
            variationToken,
          },
          digitalLifeSpine: null,
          performanceManifest: options.performanceManifest.value,
          presencePosture: null,
          visualPresenceState: options.visualPresenceState.value,
        })
      : null
    const residentResolution = source === 'dialogue' && options.visualPresenceState?.value
      ? resolveStageEmbodimentResidentPerformance({
          activePresence: null,
          continuity: {
            previousActionCue: continuityState.previousActionCue,
            previousFacialCue: continuityState.previousFacialCue,
            variationToken,
          },
          digitalLifeSpine: optionsInput?.dialoguePayload?.structured.digitalLifeSpine ?? null,
          performanceManifest: options.performanceManifest.value,
          presencePosture: null,
          visualPresenceState: options.visualPresenceState.value,
        })
      : null
    const residentSignature = source === 'dialogue'
      ? residentSnapshot?.signature?.trim() ?? options.visualPresenceState?.value?.residentPerformance?.signature?.trim() ?? ''
      : ''
    const cacheKey = `${source}:${variationToken?.trim() ?? ''}:${residentSignature}`
    const cached = plannedPerformanceCache.get(cacheKey)
    if (cached)
      return cached

    const residentPerformance = residentResolution?.performance ?? residentSnapshot?.performance
    const mergedPerformance = source === 'dialogue' && residentPerformance
      ? resolveResidentFallbackDialoguePerformance(performance, residentPerformance, residentSnapshot?.reasonTags ?? [])
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
    const embodiment = buildAuthoritativeDialogueEmbodimentSeed(
      payload,
      performance,
      authoritativePerformance
        ? {
            canonicalVariationToken: true,
            preferCurrentTurnVariationToken: true,
          }
        : undefined,
    )

    return buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: payload.structured.governance?.decisionTraceId ?? null,
        turnId: payload.turnId,
        replyText: payload.structured.reply,
        performance,
        embodiment,
        speechTimeline: resolveAuthoritativeSpeechTimeline(payload, authoritativePerformance) ?? null,
        digitalLife: payload.structured.digitalLife ?? null,
        digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
      },
      manifest: options.performanceManifest.value,
      residentPerformance: options.visualPresenceState?.value?.residentPerformance ?? null,
      rendererTarget,
    })
  }

  function matchesEmbodimentScriptAuthorityPerformance(
    left: AlicizationDialoguePerformancePayload,
    right: AlicizationDialoguePerformancePayload,
  ) {
    const normalizedLeft = normalizeAlicizationPerformancePayload(left, left.baseEmotion)
    const normalizedRight = normalizeAlicizationPerformancePayload(right, right.baseEmotion)

    return normalizedLeft.baseEmotion === normalizedRight.baseEmotion
      && normalizedLeft.facialCue === normalizedRight.facialCue
      && normalizedLeft.actionCue === normalizedRight.actionCue
      && normalizedLeft.delivery === normalizedRight.delivery
      && normalizedLeft.emphasis === normalizedRight.emphasis
  }

  function isNeutralQuietFallbackPerformanceCandidate(
    performance: AlicizationDialoguePerformancePayload | null | undefined,
  ) {
    if (!performance)
      return false

    const normalized = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
    return normalized.baseEmotion === 'neutral'
      && normalized.delivery === 'calm'
      && normalized.emphasis === 0
      && (!normalized.actionCue || !normalized.facialCue)
  }

  function shouldBiasQuietAccompanimentDialogueFallback(
    performance: AlicizationDialoguePerformancePayload,
    residentPerformance: AlicizationDialoguePerformancePayload | null | undefined,
  ) {
    const candidate = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
    const resident = residentPerformance
      ? normalizeAlicizationPerformancePayload(residentPerformance, residentPerformance.baseEmotion)
      : null
    const visualPresenceState = options.visualPresenceState?.value

    return candidate.baseEmotion === 'neutral'
      && candidate.delivery === 'calm'
      && candidate.emphasis === 0
      && visualPresenceState?.currentBodyState === 'accompanying'
      && visualPresenceState?.continuityMode === 'quiet-accompaniment'
      && Number(visualPresenceState?.quietLineMs ?? 0) >= 120_000
      && resident?.delivery === 'gentle'
      && resident?.baseEmotion === 'thinking'
      && (
        visualPresenceState?.privateThought?.shouldSpeak === false
        || (
          visualPresenceState?.residentPerformance?.stance === 'accompany'
          && visualPresenceState?.residentPerformance?.embodiedPresence === 'attentive'
        )
      )
  }

  function shouldRefreshDialogueAuthorityFromPerformance(
    payload: AlicizationDialogueRespondedPayload,
    authoritativePerformance: AlicizationDialoguePerformancePayload,
  ) {
    const performanceMismatch
      = !matchesEmbodimentScriptAuthorityPerformance(authoritativePerformance, payload.structured.performance)
        || (
          !!payload.structured.embodiment?.performance
          && !matchesEmbodimentScriptAuthorityPerformance(
            authoritativePerformance,
            payload.structured.embodiment.performance,
          )
        )
    if (!performanceMismatch)
      return false

    if (!options.visualPresenceState?.value)
      return false

    if (!isNeutralQuietFallbackPerformanceCandidate(payload.structured.performance))
      return false

    if (
      payload.structured.embodiment?.performance
      && !isNeutralQuietFallbackPerformanceCandidate(payload.structured.embodiment.performance)
    ) {
      return false
    }

    return shouldBiasQuietAccompanimentDialogueFallback(
      payload.structured.performance,
      options.visualPresenceState.value.residentPerformance?.performance ?? authoritativePerformance,
    )
  }

  function resolveEmbodimentScriptMetadata(
    payload: AlicizationDialogueRespondedPayload,
    authoritativePerformance?: AlicizationDialoguePerformancePayload,
  ) {
    if (payload.structured.embodimentScript) {
      if (
        authoritativePerformance
        && shouldRefreshDialogueAuthorityFromPerformance(payload, authoritativePerformance)
      ) {
        return buildFallbackEmbodimentScript(payload, authoritativePerformance)
          ?? payload.structured.embodimentScript
      }

      return payload.structured.embodimentScript
    }

    return buildFallbackEmbodimentScript(payload, authoritativePerformance)
  }

  function resolveResidentFallbackDialoguePerformance(
    performance: AlicizationDialoguePerformancePayload,
    residentPerformance: AlicizationDialoguePerformancePayload,
    residentReasonTagsInput: string[] = [],
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
    const shouldBiasQuietFallback = shouldBiasQuietAccompanimentDialogueFallback(
      performance,
      residentPerformance,
    )
    const residentReasonTags = residentReasonTagsInput.length > 0
      ? residentReasonTagsInput
      : visualPresenceState?.residentPerformance?.reasonTags ?? []
    const durableRelationshipRhythm = residentReasonTags.includes('durable-relationship-rhythm')
    const restrainedCallbackHoldMode = residentReasonTags.includes('repair-before-closeness')
      ? 'repair-before-closeness'
      : residentReasonTags.includes('measured-return')
        ? 'measured-return'
        : null
    const quietFallbackActionCue = restrainedCallbackHoldMode === 'repair-before-closeness'
      ? 'idle_settle'
      : restrainedCallbackHoldMode === 'measured-return'
        ? durableRelationshipRhythm
          ? 'steady_focus'
          : 'observe_focus'
        : 'steady_focus'

    return normalizeAlicizationPerformancePayload({
      baseEmotion: mergedEmotion,
      emotion: mergedEmotion,
      facialCue: candidate.facialCue ?? resident.facialCue ?? null,
      actionCue: candidate.actionCue
        ?? (
          shouldBiasQuietFallback
            ? quietFallbackActionCue
            : resident.actionCue
        )
        ?? null,
      delivery: candidateNeutralBaseline ? resident.delivery : candidate.delivery,
      emphasis: candidateNeutralBaseline ? resident.emphasis : candidate.emphasis,
    }, mergedEmotion)
  }

  function buildDialogueVariationToken(payload: AlicizationDialogueRespondedPayload) {
    const authoritativeVariationToken = resolveAuthoritativeDialogueDigitalLife(payload)?.variationToken?.trim()
      ?? resolveAuthoritativeDialogueVariationToken(payload)
    if (authoritativeVariationToken)
      return authoritativeVariationToken

    return [
      payload.turnId,
      payload.structured.reply.slice(0, 64),
      payload.structured.thought.slice(0, 64),
      String(payload.structured.performance.emphasis ?? 0),
    ].join('|')
  }

  function resolveAuthoritativeDialogueVariationToken(
    payload: AlicizationDialogueRespondedPayload,
    optionsInput?: {
      preferCurrentTurnSources?: boolean
    },
  ) {
    if (optionsInput?.preferCurrentTurnSources) {
      return payload.structured.speechTimeline?.variationToken?.trim()
        ?? payload.structured.embodiment?.variationToken?.trim()
        ?? payload.structured.digitalLife?.variationToken?.trim()
        ?? null
    }

    return payload.structured.digitalLife?.variationToken?.trim()
      ?? payload.structured.speechTimeline?.variationToken?.trim()
      ?? payload.structured.embodiment?.variationToken?.trim()
      ?? null
  }

  function buildAuthoritativeDialogueEmbodimentSeed(
    payload: AlicizationDialogueRespondedPayload,
    performance: AlicizationDialoguePerformancePayload,
    optionsInput?: {
      canonicalVariationToken?: boolean
      preferCurrentTurnVariationToken?: boolean
    },
  ) {
    const embodiment = payload.structured.embodiment
    if (!embodiment)
      return null

    return {
      ...embodiment,
      emotion: performance.baseEmotion,
      performance,
      variationToken: optionsInput?.canonicalVariationToken
        ? resolveAuthoritativeDialogueVariationToken(payload, {
          preferCurrentTurnSources: optionsInput.preferCurrentTurnVariationToken,
        }) ?? embodiment.variationToken
        : embodiment.variationToken,
    }
  }

  function resolveAuthoritativeSpeechTimeline(
    payload: AlicizationDialogueRespondedPayload,
    authoritativePerformance?: AlicizationDialoguePerformancePayload,
  ) {
    const rawTimeline = payload.structured.speechTimeline ?? null
    if (!rawTimeline)
      return null

    if (
      !authoritativePerformance
      || !shouldRefreshDialogueAuthorityFromPerformance(payload, authoritativePerformance)
    ) {
      return rawTimeline
    }

    return buildAlicizationDialogueSpeechTimeline({
      reply: payload.structured.reply,
      candidateEmotion: authoritativePerformance.baseEmotion,
      candidatePerformance: authoritativePerformance,
      embodiment: buildAuthoritativeDialogueEmbodimentSeed(payload, authoritativePerformance, {
        canonicalVariationToken: true,
        preferCurrentTurnVariationToken: true,
      }),
      digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
      performanceManifest: options.performanceManifest.value,
    }) ?? rawTimeline
  }

  function resolvePreferredLive2dMotionFromEmbodimentScript(
    payload: AlicizationDialogueRespondedPayload,
    plannedPerformance: AlicizationDialoguePerformancePayload,
  ) {
    const embodimentScript = resolveEmbodimentScriptMetadata(payload, plannedPerformance)
    const preferredMotionAliases = embodimentScript?.motionPlan.actionBursts.find(item => item.actionCue)?.segmentId
      ? embodimentScript.speechPlan.segments.find(segment =>
        embodimentScript.motionPlan.actionBursts.some(item =>
          item.segmentId === segment.id
          && item.actionCue,
        ),
      )?.rendererHints?.preferredMotionAliases
      : embodimentScript?.speechPlan.segments[0]?.rendererHints?.preferredMotionAliases
    const preferredMotionGroup = preferredMotionAliases?.find(alias => typeof alias === 'string' && alias.trim())
    if (!preferredMotionGroup)
      return null

    const matchedCapability = options.live2dActionCapabilities.value.find(item => item.motionName === preferredMotionGroup)
    return matchedCapability
      ? {
          group: matchedCapability.motionName,
          index: matchedCapability.motionIndex,
        }
      : {
          group: preferredMotionGroup,
        }
  }

  function resolveEmbodimentScriptRendererHints(
    payload: AlicizationDialogueRespondedPayload,
    plannedPerformance: AlicizationDialoguePerformancePayload,
  ) {
    const embodimentScript = resolveEmbodimentScriptMetadata(payload, plannedPerformance)
    if (!embodimentScript)
      return null

    const preferredSegmentId = embodimentScript.motionPlan.actionBursts.find(item =>
      item.actionCue === plannedPerformance.actionCue
      || item.actionCue,
    )?.segmentId
    const hintedSegment = preferredSegmentId
      ? embodimentScript.speechPlan.segments.find(segment => segment.id === preferredSegmentId)
      : embodimentScript.speechPlan.segments[0]

    return hintedSegment?.rendererHints ?? null
  }

  function applyPreferredExpressionAliasesFromRendererHints(
    rendererHints: ReturnType<typeof resolveEmbodimentScriptRendererHints>,
  ) {
    const aliases = rendererHints?.preferredExpressionAliases?.filter(alias =>
      typeof alias === 'string' && alias.trim(),
    ) ?? []
    options.applyPreferredExpressionAliases?.(aliases.length > 0 ? aliases : null)
  }

  function resolveAuthoritativeDialogueDigitalLife(
    payload: AlicizationDialogueRespondedPayload,
    plannedPerformance?: AlicizationDialoguePerformancePayload,
  ): AlicizationDigitalLifeEnvelope | null {
    if (plannedPerformance) {
      const shouldRefreshCurrentTurnDigitalLife = shouldRefreshDialogueAuthorityFromPerformance(
        payload,
        plannedPerformance,
      )
      if (shouldRefreshCurrentTurnDigitalLife) {
        const rebuiltDigitalLife = buildAlicizationDigitalLifeEnvelope({
          embodiment: buildAuthoritativeDialogueEmbodimentSeed(payload, plannedPerformance, {
            canonicalVariationToken: true,
            preferCurrentTurnVariationToken: true,
          }),
          speechTimeline: resolveAuthoritativeSpeechTimeline(payload, plannedPerformance),
          digitalLifeSpine: payload.structured.digitalLifeSpine ?? null,
          performanceManifest: options.performanceManifest.value,
        })
        if (rebuiltDigitalLife)
          return rebuiltDigitalLife
      }
    }

    if (payload.structured.digitalLife)
      return payload.structured.digitalLife

    const embodimentScript = plannedPerformance
      ? resolveEmbodimentScriptMetadata(payload, plannedPerformance)
      : payload.structured.embodimentScript ?? null
    return embodimentScript?.digitalLife ?? null
  }

  function resolveAuthoritativeSpeechStyle(
    payload: AlicizationDialogueRespondedPayload,
    plannedPerformance?: AlicizationDialoguePerformancePayload,
  ): StageEmbodimentSpeechStyleProfile | null {
    return resolveAuthoritativeDialogueDigitalLife(payload, plannedPerformance)?.speechStyle
      ?? payload.structured.embodiment?.speechStyle
      ?? null
  }

  function resolveAuthoritativeEmbodimentEnvelope(
    payload: AlicizationDialogueRespondedPayload,
    plannedPerformance: AlicizationDialoguePerformancePayload,
  ) {
    const embodiment = payload.structured.embodiment
    if (!embodiment)
      return null

    const embodimentScript = resolveEmbodimentScriptMetadata(payload, plannedPerformance)
    const speechTimeline = resolveAuthoritativeSpeechTimeline(payload, plannedPerformance)
    const authoritativeMeta = resolveStageEmbodimentMetaAuthority({
      embodiment,
      embodimentScript,
      digitalLife: resolveAuthoritativeDialogueDigitalLife(payload, plannedPerformance),
      speechTimeline,
    })

    return {
      ...embodiment,
      rendererHints: authoritativeMeta.rendererHints ?? null,
      speechStyle: authoritativeMeta.speechStyle ?? embodiment.speechStyle,
      variationToken: authoritativeMeta.variationToken ?? embodiment.variationToken,
    }
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
      {
        dialoguePayload: payload,
      },
    )
    return buildFallbackEmbodimentScript(payload, plannedPerformance)
  }))

  cleanups.push(watch(options.performanceManifest, async (manifest) => {
    if (!hasAlicizationBridge())
      return

    await getAlicizationBridge().setPerformanceManifest?.(
      sanitizeCharacterPerformanceManifest(manifest),
    )
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
          {
            dialoguePayload: payload,
          },
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
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
        {
          dialoguePayload: payload,
        },
      )
      options.applyRuntimeEmbodimentEnvelope?.(resolveAuthoritativeEmbodimentEnvelope(payload, plannedPerformance))
      await options.primeDigitalLifeEnvelope?.(resolveAuthoritativeDialogueDigitalLife(payload, plannedPerformance))
      await options.primeSpeechTimeline?.(resolveAuthoritativeSpeechTimeline(payload, plannedPerformance))
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, resolveAuthoritativeSpeechStyle(payload, plannedPerformance))
      applyPreferredExpressionAliasesFromRendererHints(
        resolveEmbodimentScriptRendererHints(payload, plannedPerformance),
      )
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })

      const preferredMotion = resolvePreferredLive2dMotionFromEmbodimentScript(payload, plannedPerformance)
      if (preferredMotion) {
        options.currentMotion.value = preferredMotion
        return
      }

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
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
        {
          dialoguePayload: payload,
        },
      )
      options.applyRuntimeEmbodimentEnvelope?.(resolveAuthoritativeEmbodimentEnvelope(payload, plannedPerformance))
      await options.primeDigitalLifeEnvelope?.(resolveAuthoritativeDialogueDigitalLife(payload, plannedPerformance))
      await options.primeSpeechTimeline?.(resolveAuthoritativeSpeechTimeline(payload, plannedPerformance))
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, resolveAuthoritativeSpeechStyle(payload, plannedPerformance))
      const rendererHints = resolveEmbodimentScriptRendererHints(payload, plannedPerformance)
      applyPreferredExpressionAliasesFromRendererHints(rendererHints)
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })

      if (rendererHints?.preferredMotionAliases?.length) {
        const preferredMotionGroup = rendererHints.preferredMotionAliases.find(alias => typeof alias === 'string' && alias.trim())
        if (preferredMotionGroup)
          options.currentMotion.value = { group: preferredMotionGroup }
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
    },
  }))

  cleanups.push(options.dispatcher.registerEmbodimentController({
    channel: 'tts',
    speak: async (reply, performance, payload) => {
      const variationToken = buildDialogueVariationToken(payload)
      const plannedPerformance = resolvePlannedPerformance(
        performance,
        variationToken,
        'dialogue',
        {
          dialoguePayload: payload,
        },
      )
      options.applyRuntimeEmbodimentEnvelope?.(resolveAuthoritativeEmbodimentEnvelope(payload, plannedPerformance))
      await options.primeDigitalLifeEnvelope?.(resolveAuthoritativeDialogueDigitalLife(payload, plannedPerformance))
      await options.primeSpeechTimeline?.(resolveAuthoritativeSpeechTimeline(payload, plannedPerformance))
      const emotionName = options.normalizePresenceEmotionName(plannedPerformance.baseEmotion)
      options.applyEmotionSpeechStyle(emotionName, resolveAuthoritativeSpeechStyle(payload, plannedPerformance))
      applyPreferredExpressionAliasesFromRendererHints(
        resolveEmbodimentScriptRendererHints(payload, plannedPerformance),
      )
      await options.armPerformance?.(plannedPerformance, {
        source: 'dialogue',
        variationToken,
      })

      const embodimentScript = resolveEmbodimentScriptMetadata(payload, plannedPerformance)
      const runtimeDigest = payload.structured.runtimeDigest ?? null
      await options.speakFallback(reply, plannedPerformance, {
        ...(runtimeDigest ? { runtimeDigest } : {}),
        ...(embodimentScript ? { embodimentScript } : {}),
      })
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
