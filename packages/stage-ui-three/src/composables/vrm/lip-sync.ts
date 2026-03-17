import type { Ref } from 'vue'
import type { Profile } from 'wlipsync'

import { useAsyncState } from '@vueuse/core'
import { onUnmounted, watch } from 'vue'
import { createWLipSyncNode } from 'wlipsync'

import profile from '../../assets/lip-sync-profile.json' with { type: 'json' }

import { useAudioContext } from '../../../../stage-ui/src/stores/audio'

export interface VrmLipSyncUpdateResult {
  active: boolean
  weights: Record<string, number>
}

export function useVRMLipSync(audioNode: Ref<AudioBufferSourceNode | undefined, AudioBufferSourceNode | undefined>) {
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
  const ATTACK = 50
  const RELEASE = 30
  const CAP = 0.7
  const SILENCE_VOL = 0.04
  const SILENCE_GAIN = 0.05
  const IDLE_MS = 160
  let lastActiveAt = 0

  watch([isReady, audioNode], ([ready, newAudioNode], [, oldAudioNode]) => {
    if (oldAudioNode && oldAudioNode !== newAudioNode) {
      try {
        oldAudioNode.disconnect()
      }
      catch {}
    }
    if (!ready || !newAudioNode || !lipSyncNode.value)
      return
    try {
      newAudioNode.connect(lipSyncNode.value)
    }
    catch {}
  }, { immediate: true })

  onUnmounted(() => audioNode.value?.disconnect())

  function update(delta = 0.016): VrmLipSyncUpdateResult {
    const node = lipSyncNode.value
    if (!node) {
      return {
        active: false,
        weights: {
          aa: 0,
          ee: 0,
          ih: 0,
          oh: 0,
          ou: 0,
        },
      }
    }

    const vol = node.volume ?? 0
    const amp = Math.min(vol * 0.9, 1) ** 0.7

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

    const now = performance.now()
    let silent = amp < SILENCE_VOL || winnerVal < SILENCE_GAIN
    if (!silent)
      lastActiveAt = now
    if (now - lastActiveAt > IDLE_MS)
      silent = true

    const target: Record<LipKey, number> = { A: 0, E: 0, I: 0, O: 0, U: 0 }
    if (!silent) {
      target[winner] = Math.min(CAP, winnerVal)
      target[runner] = Math.min(CAP * 0.5, runnerVal * 0.6)
    }

    const weights: Record<string, number> = {}
    for (const key of LIP_KEYS) {
      const from = smoothState[key]
      const to = target[key]
      const rate = 1 - Math.exp(-(to > from ? ATTACK : RELEASE) * delta)
      smoothState[key] = from + (to - from) * rate
      weights[BLENDSHAPE_MAP[key]] = (smoothState[key] <= 0.01 ? 0 : smoothState[key]) * 0.7
    }

    return {
      active: !silent || Object.values(weights).some(weight => weight > 0.015),
      weights,
    }
  }

  return { update }
}
