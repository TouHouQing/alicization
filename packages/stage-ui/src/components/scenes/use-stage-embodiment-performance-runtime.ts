import type {
  StageEmbodimentPerformanceState,
  StageEmbodimentSpeechPlaybackItem,
  StageEmbodimentSpeechRenderState,
} from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationDigitalLifeSpineDigest,
} from '../../stores/alicization-bridge'

import {
  createIdleStageEmbodimentPerformanceState,
  normalizeAlicizationPerformancePayload,

} from '@proj-alicization/stage-shared'
import { onScopeDispose, readonly, ref, watch } from 'vue'

type StageEmbodimentPerformanceActionPulseReason = StageEmbodimentPerformanceState['actionPulse']['reason']

export interface UseStageEmbodimentPerformanceRuntimeOptions {
  digitalLifeSpineDigest?: Readonly<Ref<AlicizationDigitalLifeSpineDigest | null | undefined>>
  speechRenderState: Readonly<Ref<StageEmbodimentSpeechRenderState | null | undefined>>
  upcomingSpeechSegment?: Readonly<Ref<StageEmbodimentSpeechPlaybackItem | null | undefined>>
}

export interface StageEmbodimentPerformanceArmOptions {
  source?: 'dialogue' | 'presence-pulse'
  variationToken?: string | null
}

export interface StageEmbodimentPerformanceResidentSyncOptions {
  allowWhileActive?: boolean
  variationToken?: string | null
}

const cooldownMs = 720
const rearmDedupWindowMs = 120
const dialogueActionPulseGapMs = 420
const segmentActionPulseGapMs = 920
const segmentBeatPulseGapMs = 240
const segmentFacialCueHoldMs = 260
const segmentActionCueHoldMs = 180
const segmentEmotionCueHoldMs = 240

function clamp01(value: number | null | undefined, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  const finiteValue = value as number
  return Math.min(1, Math.max(0, finiteValue))
}

function clampSigned(value: number, min: number, max: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function roundTenths(value: number) {
  return Math.round(clamp01(value) * 10) / 10
}

function clampFactor(value: number, fallback = 1, bounds: { min: number, max: number } = { min: 0.72, max: 1.26 }) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(bounds.max, Math.max(bounds.min, value))
}

function resolveSpinePerformanceBias(digest: AlicizationDigitalLifeSpineDigest | null | undefined) {
  const mode = digest?.architecture?.operatingMode
  const watchMode = digest?.runtime.watchMode
  const dominantSystem = digest?.architecture?.dominantSystem
  const recallMode = (digest?.memory?.recallMode ?? '').trim().toLowerCase()
  const confidence = clamp01(digest?.proactive?.confidence ?? 0.5, 0.5)

  let expressionBias = 1
  let actionBias = 1
  let prosodyBias = 1
  let breathBias = 1
  let focusBias = 1

  switch (mode) {
    case 'acting':
      actionBias += 0.12
      focusBias -= 0.06
      prosodyBias += 0.04
      break
    case 'thinking':
      focusBias += 0.12
      actionBias -= 0.08
      prosodyBias -= 0.04
      break
    case 'speaking':
      expressionBias += 0.04
      prosodyBias += 0.1
      break
    case 'observing':
      focusBias += 0.06
      actionBias -= 0.06
      break
    case 'remembering':
      focusBias += 0.08
      breathBias += 0.08
      prosodyBias -= 0.06
      break
    default:
      break
  }

  if (watchMode === 'recovering') {
    expressionBias -= 0.12
    actionBias -= 0.14
    breathBias += 0.12
  }

  switch (dominantSystem) {
    case 'dialogue':
      prosodyBias += 0.08
      expressionBias += 0.04
      break
    case 'perception':
      focusBias += 0.08
      actionBias += 0.02
      break
    case 'proactive':
    case 'control':
      actionBias += 0.1
      focusBias += 0.04
      break
    case 'memory':
      focusBias += 0.08
      breathBias += 0.08
      prosodyBias -= 0.08
      break
    case 'runtime':
      focusBias += 0.04
      break
    case 'mind':
      expressionBias += 0.06
      break
    default:
      break
  }

  if (recallMode.includes('working')) {
    focusBias += 0.08
  }
  else if (recallMode.includes('subconscious') || recallMode.includes('dream')) {
    breathBias += 0.08
    actionBias -= 0.06
  }
  else if (recallMode.includes('episodic')) {
    expressionBias += 0.04
    focusBias += 0.04
  }

  const confidenceBias = (confidence - 0.5) * 0.12
  actionBias += confidenceBias
  focusBias += confidenceBias * 0.8
  expressionBias += confidenceBias * 0.6

  return {
    actionBias: clampFactor(actionBias),
    breathBias: clampFactor(breathBias),
    expressionBias: clampFactor(expressionBias),
    focusBias: clampFactor(focusBias),
    prosodyBias: clampFactor(prosodyBias),
  }
}

function resolveSegmentCueHoldMs(
  value: number | null | undefined,
  fallback: number,
  bounds: { min: number, max: number },
) {
  if (!Number.isFinite(value))
    return fallback

  return Math.round(clampSigned(Number(value), bounds.min, bounds.max, fallback))
}

function resolvePerformanceBaseIntensity(performance: AlicizationDialoguePerformancePayload) {
  const emphasisBias = performance.emphasis === 2
    ? 0.92
    : performance.emphasis === 1
      ? 0.8
      : 0.66

  switch (performance.delivery) {
    case 'energetic':
      return clamp01(emphasisBias + 0.08)
    case 'firm':
      return clamp01(emphasisBias + 0.04)
    case 'hesitant':
      return clamp01(emphasisBias - 0.08, 0.52)
    case 'gentle':
      return clamp01(emphasisBias - 0.03, 0.54)
    case 'teasing':
      return clamp01(emphasisBias + 0.05)
    case 'calm':
    default:
      return emphasisBias
  }
}

function resolvePerformanceFocusBase(performance: AlicizationDialoguePerformancePayload) {
  const emphasisBoost = performance.emphasis === 2
    ? 0.18
    : performance.emphasis === 1
      ? 0.1
      : 0

  switch (performance.baseEmotion) {
    case 'thinking':
      return 0.72 + emphasisBoost
    case 'concerned':
    case 'apologetic':
      return 0.62 + emphasisBoost * 0.8
    case 'angry':
      return 0.66 + emphasisBoost
    case 'surprised':
      return 0.58 + emphasisBoost
    case 'happy':
      return 0.5 + emphasisBoost * 0.7
    case 'sad':
    case 'tired':
      return 0.42 + emphasisBoost * 0.5
    case 'neutral':
    default:
      return 0.46 + emphasisBoost * 0.6
  }
}

function syncSpeechSnapshot(speech: {
  active: boolean
  dynamics: {
    speechEnergy: number
    prosodyIntensity: number
    emphasisLevel: number
    cadencePulse: number
  }
  item: StageEmbodimentSpeechPlaybackItem | null
  phase: 'idle' | 'starting' | 'playing' | 'stopping'
  visemeIntensity: number
} | StageEmbodimentSpeechRenderState | null | undefined) {
  return {
    active: speech?.active === true,
    phase: speech?.phase ?? 'idle',
    item: speech?.item
      ? {
          ...speech.item,
          cue: speech.item.cue ? { ...speech.item.cue } : null,
        }
      : null,
    visemeIntensity: clamp01(speech?.visemeIntensity ?? 0),
    dynamics: {
      speechEnergy: clamp01(speech?.dynamics.speechEnergy ?? 0),
      prosodyIntensity: clamp01(speech?.dynamics.prosodyIntensity ?? 0),
      emphasisLevel: clamp01(speech?.dynamics.emphasisLevel ?? 0),
      cadencePulse: clamp01(speech?.dynamics.cadencePulse ?? 0),
    },
  }
}

function syncUpcomingSegmentSnapshot(segment: StageEmbodimentSpeechPlaybackItem | null | undefined) {
  if (!segment)
    return null

  return {
    ...segment,
    cue: segment.cue ? { ...segment.cue } : null,
  } satisfies StageEmbodimentSpeechPlaybackItem
}

function cloneActiveCue(cue: StageEmbodimentPerformanceState['activeCue']) {
  if (!cue)
    return null

  return {
    ...cue,
    rendererSettle: cue.rendererSettle
      ? {
          live2dFacialReleaseMs: cue.rendererSettle.live2dFacialReleaseMs,
          live2dMotionFollowThroughMs: cue.rendererSettle.live2dMotionFollowThroughMs,
          vrmActionFadeMs: cue.rendererSettle.vrmActionFadeMs,
          vrmExpressionBlendMs: cue.rendererSettle.vrmExpressionBlendMs,
        }
      : null,
    rendererHints: cue.rendererHints
      ? {
          preferredExpressionAliases: cue.rendererHints.preferredExpressionAliases
            ? [...cue.rendererHints.preferredExpressionAliases]
            : undefined,
          preferredMotionAliases: cue.rendererHints.preferredMotionAliases
            ? [...cue.rendererHints.preferredMotionAliases]
            : undefined,
        }
      : null,
  }
}

function shouldAllowDenseActionPulsePair(
  previousReason: StageEmbodimentPerformanceActionPulseReason,
  nextReason: StageEmbodimentPerformanceActionPulseReason,
) {
  return (
    (previousReason === 'segment-start' && nextReason === 'segment-beat')
    || (previousReason === 'segment-start' && nextReason === 'segment-preview')
    || (previousReason === 'segment-shift' && nextReason === 'segment-preview')
    || (previousReason === 'segment-beat' && nextReason === 'segment-preview')
    || (previousReason === 'dialogue' && nextReason === 'segment-start')
    || (previousReason === 'dialogue' && nextReason === 'segment-preview')
    || (previousReason === 'segment-preview' && nextReason === 'segment-start')
  )
}

export function useStageEmbodimentPerformanceRuntime(options: UseStageEmbodimentPerformanceRuntimeOptions) {
  const state = ref(createIdleStageEmbodimentPerformanceState())
  let lastTickAt = 0
  let lastActionPulseAt: number | null = null
  let lastActionPulseReason: StageEmbodimentPerformanceActionPulseReason = null
  let lastArmedAt = 0
  let lastArmSignature = ''
  let lastResidentSyncedAt = 0
  let lastResidentSignature = ''
  let lastSegmentId = ''
  let lastBeatPulseSegmentKey = ''
  let lastPreviewPulseSegmentId = ''
  let lastCadencePeakActive = false
  let heldSegmentFacialCue: string | null = null
  let heldSegmentFacialCueUntil = 0
  let heldSegmentActionCue: string | null = null
  let heldSegmentActionCueUntil = 0
  let heldSegmentCue: StageEmbodimentPerformanceState['activeCue'] = null
  let heldSegmentCueUntil = 0
  let cooldownTimer: ReturnType<typeof setTimeout> | undefined

  function clearCooldownTimer() {
    if (cooldownTimer) {
      clearTimeout(cooldownTimer)
      cooldownTimer = undefined
    }
  }

  function reset(now = performance.now()) {
    clearCooldownTimer()
    lastTickAt = now
    lastArmSignature = ''
    lastActionPulseAt = null
    lastActionPulseReason = null
    lastSegmentId = ''
    lastBeatPulseSegmentKey = ''
    lastPreviewPulseSegmentId = ''
    lastCadencePeakActive = false
    heldSegmentFacialCue = null
    heldSegmentFacialCueUntil = 0
    heldSegmentActionCue = null
    heldSegmentActionCueUntil = 0
    heldSegmentCue = null
    heldSegmentCueUntil = 0
    state.value = {
      ...createIdleStageEmbodimentPerformanceState(),
      revision: state.value.revision + 1,
      updatedAt: now,
    }
  }

  function scheduleCooldownExpiry(now: number) {
    clearCooldownTimer()
    const remainingMs = Math.max(0, (state.value.cooldownUntil ?? now) - now)
    cooldownTimer = setTimeout(() => {
      if (state.value.phase !== 'cooldown')
        return

      const currentNow = performance.now()
      if ((state.value.cooldownUntil ?? 0) > currentNow) {
        scheduleCooldownExpiry(currentNow)
        return
      }

      reset(currentNow)
    }, remainingMs)
  }

  function issueActionPulse(
    reason: StageEmbodimentPerformanceActionPulseReason,
    now: number,
    minimumGapMs: number,
    cueOverride?: string | null,
  ) {
    const cue = cueOverride?.trim()
      || state.value.activeActionCue
      || state.value.performance.actionCue
      || state.value.residentPerformance.actionCue
      || null
    if (!cue)
      return
    if (
      lastActionPulseAt != null
      && now - lastActionPulseAt < minimumGapMs
      && !shouldAllowDenseActionPulsePair(lastActionPulseReason, reason)
    ) {
      return
    }

    lastActionPulseAt = now
    lastActionPulseReason = reason
    state.value.actionPulse = {
      revision: state.value.actionPulse.revision + 1,
      cue,
      issuedAt: now,
      reason,
      segmentId: state.value.activeSegment?.segmentId ?? null,
    }
    state.value.motionPulse = 1
  }

  function resolveTransientCueLayer(
    now: number,
    options: {
      holdMs: number
      heldCue: string | null
      heldUntil: number
      residentCue: string | null
      segmentCue: string | null
    },
  ) {
    const segmentCue = options.segmentCue?.trim() ?? ''
    const residentCue = options.residentCue?.trim() ?? ''

    if (segmentCue) {
      return {
        cue: segmentCue,
        source: 'segment' as const,
        heldCue: segmentCue,
        heldUntil: now + options.holdMs,
      }
    }

    if (options.heldCue && options.heldUntil > now) {
      return {
        cue: options.heldCue,
        source: 'segment' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    return {
      cue: residentCue || null,
      source: residentCue ? 'resident' as const : 'none' as const,
      heldCue: null,
      heldUntil: 0,
    }
  }

  function resolveTransientActiveCueLayer(
    now: number,
    options: {
      holdMs: number
      heldCue: StageEmbodimentPerformanceState['activeCue']
      heldUntil: number
      previewCue: StageEmbodimentPerformanceState['activeCue']
      segmentCue: StageEmbodimentPerformanceState['activeCue']
    },
  ) {
    if (options.previewCue) {
      return {
        cue: cloneActiveCue(options.previewCue),
        source: 'preview' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    if (options.segmentCue) {
      const nextCue = cloneActiveCue(options.segmentCue)
      return {
        cue: nextCue,
        source: 'segment' as const,
        heldCue: nextCue,
        heldUntil: now + options.holdMs,
      }
    }

    if (options.heldCue && options.heldUntil > now) {
      return {
        cue: cloneActiveCue(options.heldCue),
        source: 'segment' as const,
        heldCue: options.heldCue,
        heldUntil: options.heldUntil,
      }
    }

    return {
      cue: null,
      source: 'none' as const,
      heldCue: null,
      heldUntil: 0,
    }
  }

  function updateFromSpeech(now = performance.now()) {
    const speech = syncSpeechSnapshot(options.speechRenderState.value)
    const previewAhead = !speech.active || speech.phase === 'stopping'
    const upcomingSegment = previewAhead
      ? syncUpcomingSegmentSnapshot(options.upcomingSpeechSegment?.value)
      : null
    const deltaSeconds = clampSigned((now - lastTickAt) / 1000, 1 / 240, 0.2, 1 / 60)
    lastTickAt = now

    const motionDecay = 1 - Math.exp(-deltaSeconds * 7)
    state.value.motionPulse += (0 - state.value.motionPulse) * motionDecay
    state.value.motionPulse = clamp01(state.value.motionPulse)

    const previousSegmentId = lastSegmentId
    const segmentId = speech.item?.segmentId ?? ''
    const segmentCue = speech.item?.cue ?? null
    const segmentLife = speech.item?.digitalLifeFrame ?? null
    const residentPerformance = state.value.residentPerformance
    const segmentChanged = Boolean(segmentId) && segmentId !== lastSegmentId
    const segmentGestureWeight = Math.max(
      clamp01(segmentCue?.gestureWeight),
      clamp01(segmentLife?.action.intensity),
    )
    if (segmentChanged) {
      lastSegmentId = segmentId
      lastPreviewPulseSegmentId = segmentId
      if (speech.active && ((segmentCue?.actionWindow !== 'none') || segmentGestureWeight >= 0.34)) {
        issueActionPulse(
          previousSegmentId ? 'segment-shift' : 'segment-start',
          now,
          segmentActionPulseGapMs,
          segmentLife?.action.actionCue ?? segmentCue?.actionCue,
        )
      }
    }
    else if (!speech.active && !segmentId) {
      lastSegmentId = ''
    }

    const previewSegmentId = upcomingSegment?.segmentId ?? ''
    const previewCue = upcomingSegment?.cue ?? null
    const previewLife = upcomingSegment?.digitalLifeFrame ?? null
    const previewGestureWeight = Math.max(
      clamp01(previewCue?.gestureWeight),
      clamp01(previewLife?.action.intensity),
    )
    if (previewAhead && previewSegmentId) {
      if (
        previewSegmentId !== lastPreviewPulseSegmentId
        && (previewCue?.actionWindow === 'segment-start' || previewGestureWeight >= 0.34)
      ) {
        issueActionPulse(
          'segment-preview',
          now,
          segmentActionPulseGapMs,
          previewLife?.action.actionCue ?? previewCue?.actionCue,
        )
      }
      lastPreviewPulseSegmentId = previewSegmentId
    }
    else if (!previewSegmentId) {
      lastPreviewPulseSegmentId = ''
    }

    const cadencePeakActive = Boolean(
      speech.active
      && segmentCue?.actionWindow === 'cadence-peak'
      && Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity)) >= 0.44
      && speech.dynamics.cadencePulse >= Math.max(0.46, 0.68 - Math.max(clamp01(segmentCue.beatWeight), clamp01(segmentLife?.action.intensity)) * 0.18),
    )
    if (cadencePeakActive && !lastCadencePeakActive) {
      const beatSegmentKey = `${segmentId}:${state.value.actionPulse.revision}`
      if (beatSegmentKey !== lastBeatPulseSegmentKey) {
        issueActionPulse('segment-beat', now, segmentBeatPulseGapMs, segmentLife?.action.actionCue ?? segmentCue?.actionCue)
        lastBeatPulseSegmentKey = beatSegmentKey
      }
    }
    lastCadencePeakActive = cadencePeakActive

    const facialCueLayer = previewAhead && previewCue?.facialCue
      ? {
          cue: previewCue.facialCue,
          source: 'preview' as const,
          heldCue: null,
          heldUntil: 0,
        }
      : resolveTransientCueLayer(now, {
          holdMs: resolveSegmentCueHoldMs(
            segmentCue?.facialHoldMs,
            segmentFacialCueHoldMs,
            { min: 90, max: 920 },
          ),
          heldCue: heldSegmentFacialCue,
          heldUntil: heldSegmentFacialCueUntil,
          residentCue: residentPerformance.facialCue ?? null,
          segmentCue: segmentCue?.facialCue ?? null,
        })
    heldSegmentFacialCue = facialCueLayer.heldCue
    heldSegmentFacialCueUntil = facialCueLayer.heldUntil

    const actionCueLayer = previewAhead && previewCue?.actionCue
      ? {
          cue: previewCue.actionCue,
          source: 'preview' as const,
          heldCue: null,
          heldUntil: 0,
        }
      : resolveTransientCueLayer(now, {
          holdMs: resolveSegmentCueHoldMs(
            segmentCue?.actionHoldMs,
            segmentActionCueHoldMs,
            { min: 70, max: 720 },
          ),
          heldCue: heldSegmentActionCue,
          heldUntil: heldSegmentActionCueUntil,
          residentCue: residentPerformance.actionCue ?? null,
          segmentCue: segmentCue?.actionCue ?? null,
        })
    heldSegmentActionCue = actionCueLayer.heldCue
    heldSegmentActionCueUntil = actionCueLayer.heldUntil

    const activeCueLayer = resolveTransientActiveCueLayer(now, {
      holdMs: resolveSegmentCueHoldMs(
        segmentCue?.emotionHoldMs,
        segmentEmotionCueHoldMs,
        { min: 80, max: 960 },
      ),
      heldCue: heldSegmentCue,
      heldUntil: heldSegmentCueUntil,
      previewCue,
      segmentCue,
    })
    heldSegmentCue = activeCueLayer.heldCue
    heldSegmentCueUntil = activeCueLayer.heldUntil

    if (speech.active) {
      clearCooldownTimer()
      if (state.value.phase === 'idle')
        state.value.phase = 'armed'
      state.value.phase = 'speaking'
      state.value.cooldownUntil = null
      if (state.value.speakingStartedAt == null)
        state.value.speakingStartedAt = now
    }
    else if (state.value.phase === 'speaking') {
      state.value.phase = 'cooldown'
      state.value.cooldownUntil = now + cooldownMs
      scheduleCooldownExpiry(now)
    }

    const transientCue = activeCueLayer.cue
    const performance = {
      ...residentPerformance,
      baseEmotion: transientCue?.emotion ?? residentPerformance.baseEmotion,
      emotion: transientCue?.emotion ?? residentPerformance.emotion,
      facialCue: facialCueLayer.cue,
      actionCue: actionCueLayer.cue,
    } satisfies AlicizationDialoguePerformancePayload
    const baseIntensity = resolvePerformanceBaseIntensity(performance)
    const transientCueScale = previewAhead
      ? transientCue ? 0.74 : 1
      : 1
    const transientLife = speech.active ? segmentLife : previewLife
    const cueGesture = clamp01(Math.max(transientCue?.gestureWeight ?? 0, transientLife?.action.intensity ?? 0) * transientCueScale)
    const cueFacial = clamp01(Math.max(transientCue?.facialWeight ?? 0, transientLife?.face.intensity ?? 0) * transientCueScale)
    const cueProsody = clamp01(Math.max(transientCue?.prosodyWeight ?? 0, transientLife?.voice.cadence ?? 0) * transientCueScale)
    const cueBeat = clamp01(Math.max(transientCue?.beatWeight ?? 0, transientLife?.action.intensity ?? 0) * transientCueScale)
    const cueMouth = clamp01(((transientCue?.mouthWeight ?? cueProsody) * (transientLife?.lipSync.mouthScale ?? 1)) * transientCueScale)
    const cueHead = clamp01(Math.max(transientCue?.headWeight ?? cueGesture, transientLife?.action.intensity ?? 0) * transientCueScale)
    const voiceEnergyScale = clampSigned(transientLife?.voice.energy ?? 1, 0.4, 1.25, 1)
    const speechDrive = clamp01(Math.max(
      speech.dynamics.speechEnergy * 0.9,
      speech.dynamics.prosodyIntensity * 0.8,
      speech.visemeIntensity * 0.72,
      cueMouth * 0.54,
    ) * voiceEnergyScale)
    const focusBase = resolvePerformanceFocusBase(performance)
    const spineBias = resolveSpinePerformanceBias(options.digitalLifeSpineDigest?.value)
    const motionPulse = clamp01(state.value.motionPulse)
    const releaseFactor = state.value.phase === 'cooldown'
      ? clamp01(((state.value.cooldownUntil ?? now) - now) / cooldownMs, 0)
      : 1
    const activeFactor = speech.active ? 1 : state.value.phase === 'idle' ? 0 : releaseFactor

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      performance,
      activeFacialCue: facialCueLayer.cue,
      activeFacialCueSource: facialCueLayer.source,
      activeActionCue: actionCueLayer.cue,
      activeActionCueSource: actionCueLayer.source,
      speechActive: speech.active,
      speechPhase: speech.phase,
      activeCue: cloneActiveCue(transientCue),
      activeCueSource: activeCueLayer.source,
      activeSegment: speech.item,
      expressionIntensity: roundTenths(clamp01((baseIntensity + speechDrive * 0.16 + motionPulse * 0.1 + cueFacial * 0.12 + cueMouth * 0.06) * spineBias.expressionBias * activeFactor)),
      facialCueIntensity: roundTenths(clamp01((baseIntensity * 0.88 + speechDrive * 0.22 + motionPulse * 0.14 + cueFacial * 0.18 + cueMouth * 0.08) * spineBias.expressionBias * activeFactor)),
      actionIntensity: roundTenths(clamp01((0.34 + performance.emphasis * 0.12 + motionPulse * 0.18 + cueGesture * 0.16 + cueHead * 0.2 + cueBeat * 0.14) * spineBias.actionBias * activeFactor)),
      motionPulse,
      prosodyDrive: roundTenths(clamp01(Math.max(speechDrive, speech.dynamics.cadencePulse * (0.62 + cueProsody * 0.18), cueProsody * 0.46) * spineBias.prosodyBias * activeFactor)),
      breathDrive: roundTenths(clamp01((speech.dynamics.cadencePulse * 0.44 + speech.dynamics.speechEnergy * 0.3 + motionPulse * 0.14 + cueBeat * 0.1 + cueMouth * 0.12) * spineBias.breathBias * activeFactor)),
      focusDrive: roundTenths(clamp01((focusBase + motionPulse * 0.14 + speechDrive * 0.08 + cueFacial * 0.06 + cueHead * 0.08) * spineBias.focusBias * activeFactor)),
      updatedAt: now,
    }
  }

  function armPerformance(
    input: AlicizationDialoguePerformancePayload,
    armOptions: StageEmbodimentPerformanceArmOptions = {},
  ) {
    const now = performance.now()
    const performancePayload = normalizeAlicizationPerformancePayload(input, input.baseEmotion)
    const variationToken = armOptions.variationToken?.trim() ?? ''
    const signature = JSON.stringify([
      armOptions.source ?? 'dialogue',
      variationToken,
      performancePayload.baseEmotion,
      performancePayload.facialCue,
      performancePayload.actionCue,
      performancePayload.delivery,
      performancePayload.emphasis,
    ])

    if (signature === lastArmSignature && now - lastArmedAt < rearmDedupWindowMs) {
      updateFromSpeech(now)
      return
    }

    lastArmSignature = signature
    lastArmedAt = now
    clearCooldownTimer()
    lastSegmentId = ''
    lastBeatPulseSegmentKey = ''
    lastPreviewPulseSegmentId = ''
    lastCadencePeakActive = false
    heldSegmentFacialCue = null
    heldSegmentFacialCueUntil = 0
    heldSegmentActionCue = null
    heldSegmentActionCueUntil = 0
    heldSegmentCue = null
    heldSegmentCueUntil = 0

    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      phase: state.value.speechActive ? 'speaking' : 'armed',
      residentPerformance: {
        ...performancePayload,
      },
      performance: performancePayload,
      activeFacialCue: performancePayload.facialCue ?? null,
      activeFacialCueSource: performancePayload.facialCue ? 'resident' : 'none',
      activeActionCue: performancePayload.actionCue ?? null,
      activeActionCueSource: performancePayload.actionCue ? 'resident' : 'none',
      variationToken: variationToken || null,
      activeCue: null,
      activeCueSource: 'none',
      armedAt: now,
      speakingStartedAt: state.value.speechActive ? (state.value.speakingStartedAt ?? now) : null,
      cooldownUntil: null,
      updatedAt: now,
    }

    issueActionPulse(armOptions.source ?? 'dialogue', now, dialogueActionPulseGapMs)
    updateFromSpeech(now)
  }

  function syncResidentPerformance(
    input: AlicizationDialoguePerformancePayload,
    syncOptions: StageEmbodimentPerformanceResidentSyncOptions = {},
  ) {
    const now = performance.now()
    if (!syncOptions.allowWhileActive && state.value.phase !== 'idle')
      return

    const performancePayload = normalizeAlicizationPerformancePayload(input, input.baseEmotion)
    const variationToken = syncOptions.variationToken?.trim() ?? ''
    const signature = JSON.stringify([
      variationToken,
      performancePayload.baseEmotion,
      performancePayload.facialCue,
      performancePayload.actionCue,
      performancePayload.delivery,
      performancePayload.emphasis,
    ])

    if (signature === lastResidentSignature && now - lastResidentSyncedAt < rearmDedupWindowMs) {
      updateFromSpeech(now)
      return
    }

    lastResidentSignature = signature
    lastResidentSyncedAt = now
    state.value = {
      ...state.value,
      revision: state.value.revision + 1,
      residentPerformance: {
        ...performancePayload,
      },
      performance: state.value.phase === 'idle'
        ? {
            ...performancePayload,
          }
        : state.value.performance,
      activeFacialCue: state.value.phase === 'idle'
        ? performancePayload.facialCue ?? null
        : state.value.activeFacialCue,
      activeFacialCueSource: state.value.phase === 'idle'
        ? (performancePayload.facialCue ? 'resident' : 'none')
        : state.value.activeFacialCueSource,
      activeActionCue: state.value.phase === 'idle'
        ? performancePayload.actionCue ?? null
        : state.value.activeActionCue,
      activeActionCueSource: state.value.phase === 'idle'
        ? (performancePayload.actionCue ? 'resident' : 'none')
        : state.value.activeActionCueSource,
      variationToken: variationToken || state.value.variationToken,
      updatedAt: now,
    }

    updateFromSpeech(now)
  }

  watch(
    [
      () => options.speechRenderState.value?.revision ?? 0,
      () => options.upcomingSpeechSegment?.value?.segmentId ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.id ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.emotion ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredExpressionAliases?.join('|') ?? '',
      () => options.upcomingSpeechSegment?.value?.cue?.rendererHints?.preferredMotionAliases?.join('|') ?? '',
      () => options.upcomingSpeechSegment?.value?.text ?? '',
      () => options.digitalLifeSpineDigest?.value?.architecture?.operatingMode ?? '',
      () => options.digitalLifeSpineDigest?.value?.architecture?.dominantSystem ?? '',
      () => options.digitalLifeSpineDigest?.value?.proactive?.confidence ?? 0,
      () => options.digitalLifeSpineDigest?.value?.memory?.recallMode ?? '',
    ],
    () => {
      updateFromSpeech()
    },
    { immediate: true },
  )

  function dispose() {
    clearCooldownTimer()
  }

  onScopeDispose(() => {
    dispose()
  })

  return {
    armPerformance,
    clear: reset,
    dispose,
    syncResidentPerformance,
    state: readonly(state) as Readonly<Ref<StageEmbodimentPerformanceState>>,
  }
}
