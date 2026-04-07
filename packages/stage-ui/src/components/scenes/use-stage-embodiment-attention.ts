import type { StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import type { ComputedRef, Ref } from 'vue'

import type {
  AlicizationDialoguePerformancePayload,
  AlicizationEmbodiedPresenceState,
  AlicizationPerformanceDelivery,
  AlicizationPresencePulsePayload,
  AlicizationVisualPresenceStateSnapshot,
  AlicizationVisualTarget,
  AlicizationVisualWatchMode,
} from '../../stores/alicization-bridge'

import { computed, readonly, ref } from 'vue'

interface Point2D {
  x: number
  y: number
}

interface Size2D {
  width: number
  height: number
}

export interface StageEmbodimentAttentionPresenceState {
  source: 'performance' | 'presence-pulse' | 'runtime-visual-presence'
  embodiedPresence: AlicizationEmbodiedPresenceState
  confidence: number
  delivery: AlicizationPerformanceDelivery | null
  emphasis: 0 | 1 | 2
  expiresAt: number
}

export interface UseStageEmbodimentAttentionOptions {
  focusAt: Ref<Point2D>
  speechRenderState: Ref<StageEmbodimentSpeechRenderState | null | undefined>
  stageBounds: Ref<Size2D>
  visualPresenceState?: Ref<AlicizationVisualPresenceStateSnapshot | null | undefined>
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampMagnitude(value: number, magnitude: number) {
  return Math.min(magnitude, Math.max(-magnitude, value))
}

function normalizeStageSize(size: Size2D) {
  return {
    width: Math.max(0, size.width),
    height: Math.max(0, size.height),
  }
}

function normalizeFreshness(timestamp: number | null | undefined, windowMs: number, now: number) {
  if (!Number.isFinite(timestamp))
    return 0

  return clampUnit(1 - Math.max(0, now - Number(timestamp)) / windowMs)
}

function stableSignatureUnit(signature: string) {
  if (!signature)
    return 0

  let hash = 0
  for (let index = 0; index < signature.length; index += 1)
    hash = (hash * 31 + signature.charCodeAt(index)) | 0

  return ((Math.abs(hash) % 2000) / 1000) - 1
}

function buildVisualTargetSignature(target: AlicizationVisualTarget | null | undefined, watchMode: AlicizationVisualWatchMode, scenario?: string | null) {
  return [
    target?.appName?.trim(),
    target?.processName?.trim(),
    target?.title?.trim(),
    scenario?.trim(),
    watchMode,
  ]
    .filter(Boolean)
    .join('|')
}

type AlicizationVisualWorkloadKind = NonNullable<AlicizationVisualPresenceStateSnapshot['currentScene']>['workloadKind']

function resolveReadingWorkload(workloadKind: AlicizationVisualWorkloadKind | undefined) {
  return workloadKind === 'coding' || workloadKind === 'terminal' || workloadKind === 'document'
}

function resolveAmbientWorkload(workloadKind: AlicizationVisualWorkloadKind | undefined) {
  return workloadKind === 'media' || workloadKind === 'chat'
}

export function resolveStageEmbodimentPerformancePresence(
  performance: AlicizationDialoguePerformancePayload,
  now: number = Date.now(),
): StageEmbodimentAttentionPresenceState | null {
  const confidenceBase = performance.emphasis === 2
    ? 0.78
    : performance.emphasis === 1
      ? 0.62
      : 0.46

  if (performance.delivery === 'hesitant') {
    return {
      source: 'performance',
      embodiedPresence: 'hesitant',
      confidence: confidenceBase,
      delivery: performance.delivery,
      emphasis: performance.emphasis,
      expiresAt: now + 1100 + performance.emphasis * 260,
    }
  }

  if (performance.delivery === 'teasing') {
    return {
      source: 'performance',
      embodiedPresence: 'glance',
      confidence: confidenceBase * 0.92,
      delivery: performance.delivery,
      emphasis: performance.emphasis,
      expiresAt: now + 900 + performance.emphasis * 180,
    }
  }

  if (performance.delivery === 'firm' || performance.delivery === 'energetic') {
    return {
      source: 'performance',
      embodiedPresence: 'attentive',
      confidence: Math.min(1, confidenceBase + 0.08),
      delivery: performance.delivery,
      emphasis: performance.emphasis,
      expiresAt: now + 1200 + performance.emphasis * 320,
    }
  }

  if (performance.delivery === 'gentle' || performance.delivery === 'calm') {
    return {
      source: 'performance',
      embodiedPresence: 'attentive',
      confidence: Math.max(0.4, confidenceBase - 0.06),
      delivery: performance.delivery,
      emphasis: performance.emphasis,
      expiresAt: now + 1000 + performance.emphasis * 220,
    }
  }

  return null
}

function resolvePresenceBias(presence: StageEmbodimentAttentionPresenceState | null, cadenceCentered: number) {
  if (!presence || presence.embodiedPresence === 'none') {
    return { x: 0, y: 0 }
  }

  const confidence = clampUnit(presence.confidence)
  if (presence.embodiedPresence === 'attentive') {
    return {
      x: cadenceCentered * 0.004 * confidence,
      y: -0.016 * confidence,
    }
  }

  if (presence.embodiedPresence === 'concerned') {
    return {
      x: -0.01 * confidence + cadenceCentered * 0.003,
      y: -0.02 * confidence,
    }
  }

  if (presence.embodiedPresence === 'hesitant') {
    return {
      x: 0.012 * confidence,
      y: 0.014 * confidence,
    }
  }

  if (presence.embodiedPresence === 'glance') {
    const direction = cadenceCentered === 0 ? 1 : Math.sign(cadenceCentered)
    return {
      x: direction * (0.012 + (1 - confidence) * 0.006),
      y: -0.008 * confidence,
    }
  }

  return { x: 0, y: 0 }
}

export function resolveStageEmbodimentRuntimePresence(
  snapshot: AlicizationVisualPresenceStateSnapshot | null | undefined,
  now: number = Date.now(),
): StageEmbodimentAttentionPresenceState | null {
  if (!snapshot)
    return null

  const activeThought = snapshot.privateThought && snapshot.privateThought.expiresAt > now - 400
    ? snapshot.privateThought
    : null
  const attentionFreshness = normalizeFreshness(snapshot.attention?.lastConfirmedAt ?? snapshot.attention?.engagedAt, 60_000, now)
  const captureFreshness = normalizeFreshness(snapshot.captureState.lastGroundedAt, 90_000, now)
  const sceneFreshness = normalizeFreshness(snapshot.currentScene?.lastSeenAt, 75_000, now)
  const stateFreshness = normalizeFreshness(snapshot.updatedAt, 90_000, now)
  const freshness = Math.max(
    attentionFreshness,
    captureFreshness * 0.92,
    sceneFreshness * 0.85,
    stateFreshness * 0.72,
  )

  const embodiedPresence = (() => {
    if (activeThought?.embodiedPresence && activeThought.embodiedPresence !== 'none')
      return activeThought.embodiedPresence
    if (snapshot.watchMode === 'recovering')
      return 'concerned'
    if (snapshot.watchMode === 'symbiotic-vision' || snapshot.watchMode === 'invited-inspection')
      return 'attentive'
    if (freshness >= 0.34 && (snapshot.attention?.target || snapshot.currentScene?.target))
      return 'glance'
    return 'none'
  })()

  if (embodiedPresence === 'none')
    return null

  let confidence = 0
  confidence += activeThought ? activeThought.confidence * 0.34 : 0
  confidence += (snapshot.attention?.confidence ?? 0) * 0.18
  confidence += (snapshot.currentScene?.confidence ?? 0) * 0.08
  confidence += freshness * 0.1
  confidence += captureFreshness * 0.05
  confidence += snapshot.watchMode === 'invited-inspection'
    ? 0.11
    : snapshot.watchMode === 'symbiotic-vision'
      ? 0.08
      : snapshot.watchMode === 'recovering'
        ? 0.07
        : 0

  if (snapshot.captureState.permission === 'granted')
    confidence += 0.04
  else if (snapshot.captureState.permission === 'denied')
    confidence -= 0.07
  else if (snapshot.captureState.permission === 'prompt')
    confidence -= 0.025
  else
    confidence -= 0.01

  if (snapshot.captureState.degradedReason)
    confidence -= 0.06

  confidence = clampUnit(confidence)
  if (confidence < 0.24)
    return null

  return {
    source: 'runtime-visual-presence',
    embodiedPresence,
    confidence,
    delivery: null,
    emphasis: embodiedPresence === 'concerned' || snapshot.watchMode === 'invited-inspection' ? 1 : 0,
    expiresAt: activeThought
      ? Math.max(now + 600, activeThought.expiresAt)
      : now + 1200 + Math.round(freshness * 1600),
  }
}

export function resolveStageEmbodimentRuntimeAttentionBias(
  snapshot: AlicizationVisualPresenceStateSnapshot | null | undefined,
  now: number = Date.now(),
  runtimePresence: StageEmbodimentAttentionPresenceState | null = resolveStageEmbodimentRuntimePresence(snapshot, now),
) {
  if (!snapshot)
    return { engaged: false, confidence: 0, x: 0, y: 0 }

  const attentionFreshness = normalizeFreshness(snapshot.attention?.lastConfirmedAt ?? snapshot.attention?.engagedAt, 60_000, now)
  const captureFreshness = normalizeFreshness(snapshot.captureState.lastGroundedAt, 90_000, now)
  const anchorConfidence = clampUnit(
    (snapshot.attention?.confidence ?? 0) * 0.5
    + (snapshot.currentScene?.confidence ?? 0) * 0.18
    + attentionFreshness * 0.18
    + captureFreshness * 0.14,
  )
  const confidence = clampUnit((runtimePresence?.confidence ?? 0) * 0.58 + anchorConfidence * 0.42)
  if (!runtimePresence && confidence < 0.22)
    return { engaged: false, confidence, x: 0, y: 0 }

  const target = snapshot.attention?.target ?? snapshot.currentScene?.target ?? null
  const lateralSeed = stableSignatureUnit(buildVisualTargetSignature(target, snapshot.watchMode, snapshot.currentScene?.scenario ?? null))
  const workloadKind = snapshot.currentScene?.workloadKind
  let x = lateralSeed * (0.003 + confidence * 0.006)
  if (snapshot.watchMode === 'invited-inspection')
    x += 0.004
  else if (snapshot.watchMode === 'recovering')
    x -= 0.003

  if (resolveReadingWorkload(workloadKind))
    x += lateralSeed * 0.004

  if (snapshot.attention?.source === 'invited-inspection')
    x += 0.002

  let y = snapshot.watchMode === 'recovering'
    ? -0.018
    : snapshot.watchMode === 'invited-inspection'
      ? -0.022
      : snapshot.watchMode === 'symbiotic-vision'
        ? -0.014
        : -0.005

  if (resolveReadingWorkload(workloadKind))
    y += 0.004
  else if (resolveAmbientWorkload(workloadKind))
    y -= 0.002

  if (snapshot.captureState.degradedReason)
    y += 0.005
  if (snapshot.captureState.permission !== 'granted')
    y += 0.002

  y -= confidence * 0.004

  return {
    engaged: true,
    confidence,
    x: clampMagnitude(x, 0.02),
    y: clampMagnitude(y, 0.03),
  }
}

function resolveStageEmbodimentAttentionPresence(
  localPresence: StageEmbodimentAttentionPresenceState | null,
  runtimePresence: StageEmbodimentAttentionPresenceState | null,
  now: number,
) {
  if (localPresence?.source === 'presence-pulse' && localPresence.expiresAt > now)
    return localPresence
  if (!localPresence)
    return runtimePresence
  if (!runtimePresence)
    return localPresence

  return runtimePresence.confidence > localPresence.confidence + 0.06
    ? runtimePresence
    : localPresence
}

export function deriveStageEmbodimentAttentionScreenPoint(input: {
  basePoint: Point2D
  stageBounds: Size2D
  presence: StageEmbodimentAttentionPresenceState | null
  speechRenderState: StageEmbodimentSpeechRenderState | null | undefined
  visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null | undefined
}) {
  const now = Date.now()
  const stageSize = normalizeStageSize(input.stageBounds)
  const speechRenderState = input.speechRenderState
  const runtimePresence = resolveStageEmbodimentRuntimePresence(input.visualPresenceState, now)
  const resolvedPresence = resolveStageEmbodimentAttentionPresence(input.presence, runtimePresence, now)
  const runtimeBias = resolveStageEmbodimentRuntimeAttentionBias(input.visualPresenceState, now, runtimePresence)
  const engaged = Boolean(resolvedPresence) || speechRenderState?.active === true || runtimeBias.engaged
  if (!engaged) {
    return {
      engaged: false,
      point: { ...input.basePoint },
    }
  }

  const speechEnergy = clampUnit(speechRenderState?.dynamics.speechEnergy ?? 0)
  const prosodyIntensity = clampUnit(speechRenderState?.dynamics.prosodyIntensity ?? 0)
  const emphasisLevel = clampUnit(speechRenderState?.dynamics.emphasisLevel ?? 0)
  const cadencePulse = clampUnit(speechRenderState?.dynamics.cadencePulse ?? 0)
  const cadenceCentered = cadencePulse * 2 - 1
  const presenceBias = resolvePresenceBias(resolvedPresence, cadenceCentered)
  const speechBias = {
    x: cadenceCentered * (0.003 + prosodyIntensity * 0.004),
    y: -(speechEnergy * 0.008 + emphasisLevel * 0.006),
  }

  const normalizedOffset = {
    x: clampMagnitude(presenceBias.x + speechBias.x + runtimeBias.x, 0.045),
    y: clampMagnitude(presenceBias.y + speechBias.y + runtimeBias.y, 0.05),
  }

  return {
    engaged: true,
    point: {
      x: input.basePoint.x + stageSize.width * normalizedOffset.x,
      y: input.basePoint.y + stageSize.height * normalizedOffset.y,
    },
  }
}

export function useStageEmbodimentAttention(options: UseStageEmbodimentAttentionOptions) {
  const presenceState = ref<StageEmbodimentAttentionPresenceState | null>(null)
  let expireTimer: ReturnType<typeof setTimeout> | undefined

  function clearExpireTimer() {
    if (expireTimer) {
      clearTimeout(expireTimer)
      expireTimer = undefined
    }
  }

  function scheduleExpiry() {
    clearExpireTimer()
    const current = presenceState.value
    if (!current)
      return

    const delayMs = Math.max(0, current.expiresAt - Date.now())
    expireTimer = setTimeout(() => {
      if (presenceState.value?.expiresAt === current.expiresAt)
        presenceState.value = null
      expireTimer = undefined
    }, delayMs)
  }

  function commitPresenceState(next: StageEmbodimentAttentionPresenceState | null) {
    presenceState.value = next
    scheduleExpiry()
  }

  function applyPerformance(performance: AlicizationDialoguePerformancePayload) {
    const nextPresence = resolveStageEmbodimentPerformancePresence(performance)
    if (!nextPresence)
      return

    const activePresence = presenceState.value
    if (
      activePresence
      && activePresence.source === 'presence-pulse'
      && activePresence.expiresAt > Date.now()
    ) {
      return
    }

    commitPresenceState(nextPresence)
  }

  function applyPresencePulse(payload: AlicizationPresencePulsePayload) {
    if (payload.embodiedPresence === 'none') {
      commitPresenceState(null)
      return
    }

    commitPresenceState({
      source: 'presence-pulse',
      embodiedPresence: payload.embodiedPresence,
      confidence: clampUnit(payload.confidence),
      delivery: null,
      emphasis: 0,
      expiresAt: payload.expiresAt,
    })
  }

  const attentionScreenPoint = computed(() => {
    return deriveStageEmbodimentAttentionScreenPoint({
      basePoint: options.focusAt.value,
      stageBounds: options.stageBounds.value,
      presence: presenceState.value,
      speechRenderState: options.speechRenderState.value,
      visualPresenceState: options.visualPresenceState?.value,
    })
  })

  const activePresence = computed(() => {
    return resolveStageEmbodimentAttentionPresence(
      presenceState.value,
      resolveStageEmbodimentRuntimePresence(options.visualPresenceState?.value),
      Date.now(),
    )
  })

  const live2dFocusAt = computed(() => attentionScreenPoint.value.point)
  const vrmLookAtScreenPoint = computed(() => {
    return attentionScreenPoint.value.engaged
      ? attentionScreenPoint.value.point
      : null
  })

  function dispose() {
    clearExpireTimer()
    presenceState.value = null
  }

  return {
    activePresence: readonly(activePresence) as Readonly<ComputedRef<StageEmbodimentAttentionPresenceState | null>>,
    applyPerformance,
    applyPresencePulse,
    dispose,
    live2dFocusAt: live2dFocusAt as ComputedRef<Point2D>,
    vrmLookAtScreenPoint: vrmLookAtScreenPoint as ComputedRef<Point2D | null>,
  }
}
