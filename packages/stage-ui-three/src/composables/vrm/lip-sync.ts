import type { StageEmbodimentSpeechRenderState } from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'
import type { Profile } from 'wlipsync'

import { useAsyncState } from '@vueuse/core'
import { onUnmounted, watch } from 'vue'
import { createWLipSyncNode } from 'wlipsync'

import profile from '../../assets/lip-sync-profile.json' with { type: 'json' }

import { useAudioContext } from '../../../../stage-ui/src/stores/audio'
import { createVrmLipSyncContinuityState, resolveVrmLipSyncContinuity } from './lip-sync-continuity'

export interface VrmLipSyncUpdateResult {
  active: boolean
  weights: Record<string, number>
}

function clampUnit(value: number, fallback: number = 0) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function clampRange(value: number, min: number, max: number, fallback: number = min) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

export function useVRMLipSync(speechRenderState: Ref<StageEmbodimentSpeechRenderState | null | undefined>) {
  const { audioContext } = useAudioContext()
  const { state: lipSyncNode, isReady } = useAsyncState(createWLipSyncNode(audioContext, profile as Profile), undefined)

  const RAW_KEYS = ['A', 'E', 'I', 'O', 'U', 'S'] as const
  type LipKey = 'A' | 'E' | 'I' | 'O' | 'U'
  const LIP_KEYS: LipKey[] = ['A', 'E', 'I', 'O', 'U']
  const BLENDSHAPE_MAP: Record<LipKey, string> = {
    A: 'aa',
    E: 'ee',
    I: 'ih',
    O: 'oh',
    U: 'ou',
  }
  const RAW_TO_LIP: Record<typeof RAW_KEYS[number], LipKey> = {
    A: 'A',
    E: 'E',
    I: 'I',
    O: 'O',
    U: 'U',
    S: 'I',
  }

  const smoothState: Record<LipKey, number> = { A: 0, E: 0, I: 0, O: 0, U: 0 }
  const continuityState = createVrmLipSyncContinuityState()
  const ATTACK = 50
  const RELEASE = 30
  const CAP = 0.7

  function disconnectSpeechNode(source?: AudioNode | null, target?: AudioNode | null) {
    if (!source || !target)
      return

    try {
      source.disconnect(target)
    }
    catch {}
  }

  function createEmptyWeights() {
    return {
      aa: 0,
      ee: 0,
      ih: 0,
      oh: 0,
      ou: 0,
    }
  }

  function createFallbackTarget() {
    const speech = speechRenderState.value
    if (!speech?.active)
      return { A: 0, E: 0, I: 0, O: 0, U: 0 } satisfies Record<LipKey, number>

    const digitalLifeLipSync = speech.item?.digitalLifeFrame?.lipSync
    if (digitalLifeLipSync?.mode === 'closed')
      return { A: 0, E: 0, I: 0, O: 0, U: 0 } satisfies Record<LipKey, number>

    const cueMouthWeight = clampUnit(speech.item?.cue?.mouthWeight ?? speech.dynamics.prosodyIntensity)
    const mouthOpen = clampUnit(speech.mouthOpenRatio)
    const speechEnergy = clampUnit(speech.dynamics.speechEnergy)
    const prosodyIntensity = clampUnit(speech.dynamics.prosodyIntensity)
    const emphasisLevel = clampUnit(speech.dynamics.emphasisLevel)
    const cadencePulse = clampUnit(speech.dynamics.cadencePulse)
    const mouthScale = clampRange(digitalLifeLipSync?.mouthScale ?? 1, 0.4, 1.35, 1)
    const openness = Math.max(mouthOpen, speechEnergy * 0.9, cueMouthWeight * 0.58) * mouthScale
    if (openness <= 0.01)
      return { A: 0, E: 0, I: 0, O: 0, U: 0 } satisfies Record<LipKey, number>

    const aa = Math.min(CAP, openness * (0.46 + emphasisLevel * 0.28 + cueMouthWeight * 0.1))
    const ee = Math.min(CAP * 0.72, openness * (0.14 + (1 - cadencePulse) * 0.22 + cueMouthWeight * 0.04))
    const ih = Math.min(CAP * 0.82, openness * (0.2 + cadencePulse * 0.2 + cueMouthWeight * 0.08))
    const oh = Math.min(CAP * 0.74, openness * (0.15 + prosodyIntensity * 0.18 + cueMouthWeight * 0.06))
    const ou = Math.min(CAP * 0.68, openness * (0.1 + (1 - emphasisLevel) * 0.16 + cueMouthWeight * 0.04))

    return { A: aa, E: ee, I: ih, O: oh, U: ou }
  }

  watch([isReady, () => lipSyncNode.value, () => speechRenderState.value?.currentAudioSource], ([ready, nextLipSyncNode, nextAudioSource], [, previousLipSyncNode, previousAudioSource]) => {
    const newAudioNode = nextAudioSource as AudioNode | undefined
    const oldAudioNode = previousAudioSource as AudioNode | undefined
    disconnectSpeechNode(oldAudioNode, previousLipSyncNode)
    if (!ready || !newAudioNode || !nextLipSyncNode)
      return

    try {
      newAudioNode.connect(nextLipSyncNode)
    }
    catch {}
  }, { immediate: true })

  onUnmounted(() => {
    disconnectSpeechNode(
      speechRenderState.value?.currentAudioSource as AudioNode | undefined,
      lipSyncNode.value,
    )
  })

  function update(delta = 0.016): VrmLipSyncUpdateResult {
    const node = lipSyncNode.value
    const speech = speechRenderState.value
    const fallbackTarget = createFallbackTarget()
    const digitalLifeLipSync = speech?.item?.digitalLifeFrame?.lipSync ?? null
    const lipSyncMode = digitalLifeLipSync?.mode ?? 'hybrid'
    if (lipSyncMode === 'closed')
      return { active: false, weights: createEmptyWeights() }
    const fallbackPeak = Math.max(...Object.values(fallbackTarget))
    const mouthOpen = clampUnit(speech?.mouthOpenRatio ?? 0)
    const speechEnergy = clampUnit(speech?.dynamics.speechEnergy ?? 0)
    const prosodyIntensity = clampUnit(speech?.dynamics.prosodyIntensity ?? 0)
    const emphasisLevel = clampUnit(speech?.dynamics.emphasisLevel ?? 0)
    const cueMouthWeight = clampUnit(speech?.item?.cue?.mouthWeight ?? prosodyIntensity)
    const mouthScale = clampRange(digitalLifeLipSync?.mouthScale ?? 1, 0.4, 1.35, 1)
    const visemeBias = lipSyncMode === 'viseme'
      ? 0.82
      : lipSyncMode === 'energy'
        ? 0.22
        : clampUnit(digitalLifeLipSync?.visemeBias ?? 0.66, 0.66)
    const energyBias = lipSyncMode === 'energy'
      ? 0.78
      : lipSyncMode === 'viseme'
        ? 0.18
        : clampUnit(digitalLifeLipSync?.energyBias ?? 0.34, 0.34)
    const weights: Record<string, number> = createEmptyWeights()

    if (!node) {
      for (const key of LIP_KEYS) {
        const from = smoothState[key]
        const to = fallbackTarget[key]
        const rate = 1 - Math.exp(-(to > from ? ATTACK : RELEASE) * delta)
        smoothState[key] = from + (to - from) * rate
        weights[BLENDSHAPE_MAP[key]] = smoothState[key] <= 0.01 ? 0 : smoothState[key] * 0.7
      }

      return {
        active: fallbackPeak > 0.02,
        weights,
      }
    }

    const vol = node.volume ?? 0
    const amp = Math.max(
      Math.min(vol * 0.9, 1) ** 0.7,
      speechEnergy * 0.9,
      mouthOpen * (0.55 + prosodyIntensity * 0.16),
      cueMouthWeight * 0.5,
    ) * mouthScale

    const projected: Record<LipKey, number> = { A: 0, E: 0, I: 0, O: 0, U: 0 }
    for (const raw of RAW_KEYS) {
      const lip = RAW_TO_LIP[raw]
      const rawVal = node.weights[raw] ?? 0
      projected[lip] = Math.max(projected[lip], rawVal * amp)
    }

    let winner: LipKey = 'I'
    let runner: LipKey = 'E'
    let winnerVal = -Infinity
    let runnerVal = -Infinity
    for (const key of LIP_KEYS) {
      const value = projected[key]
      if (value > winnerVal) {
        runnerVal = winnerVal
        runner = winner
        winnerVal = value
        winner = key
      }
      else if (value > runnerVal) {
        runnerVal = value
        runner = key
      }
    }

    const continuity = resolveVrmLipSyncContinuity(continuityState, {
      deltaSeconds: delta,
      fallbackSignal: Math.max(fallbackPeak, cueMouthWeight * 0.44),
      speechActive: speech?.active === true,
      speechPhase: speech?.phase,
      wlipsyncSignal: Math.max(amp, winnerVal),
    })
    const speechActive = continuity.active

    const target: Record<LipKey, number> = {
      A: fallbackTarget.A * (0.35 + continuity.drive * 0.08) * energyBias,
      E: fallbackTarget.E * (0.35 + continuity.drive * 0.06) * energyBias,
      I: fallbackTarget.I * (0.35 + continuity.drive * 0.08) * energyBias,
      O: fallbackTarget.O * (0.35 + continuity.drive * 0.07) * energyBias,
      U: fallbackTarget.U * (0.35 + continuity.drive * 0.06) * energyBias,
    }
    if (speechActive) {
      target[winner] = Math.max(target[winner], Math.min(CAP, winnerVal * (0.92 + emphasisLevel * 0.16 + cueMouthWeight * 0.08) * visemeBias))
      target[runner] = Math.max(target[runner], Math.min(CAP * 0.5, runnerVal * (0.54 + prosodyIntensity * 0.18 + cueMouthWeight * 0.04) * visemeBias))
    }

    for (const key of LIP_KEYS) {
      const from = smoothState[key]
      const to = target[key]
      const rate = 1 - Math.exp(-(to > from ? ATTACK : RELEASE) * delta)
      smoothState[key] = from + (to - from) * rate
      weights[BLENDSHAPE_MAP[key]] = (smoothState[key] <= 0.01 ? 0 : smoothState[key]) * 0.7
    }

    return {
      active: speechActive || Object.values(weights).some(weight => weight > 0.015),
      weights,
    }
  }

  return { update }
}
