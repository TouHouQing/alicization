import type { Ref } from 'vue'

import type { AlicizationDigitalLifeSpineDigest, AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'

import { tryOnMounted, useIntervalFn } from '@vueuse/core'
import { computed, onScopeDispose, readonly, ref } from 'vue'

import { getAlicizationBridge, hasAlicizationBridge } from '../../stores/alicization-bridge'
import { buildAlicizationVisualPresenceStateFromSpineDigest } from '../../stores/alicization-visual-presence-spine'

export interface UseStageEmbodimentVisualPresenceOptions {
  minPollMs?: number
  maxPollMs?: number
}

function clampPollMs(value: number, minPollMs: number, maxPollMs: number) {
  if (!Number.isFinite(value))
    return maxPollMs

  return Math.min(maxPollMs, Math.max(minPollMs, Math.round(value)))
}

export function useStageEmbodimentVisualPresence(options: UseStageEmbodimentVisualPresenceOptions = {}) {
  const minPollMs = Math.max(400, Math.round(options.minPollMs ?? 1200))
  const maxPollMs = Math.max(minPollMs, Math.round(options.maxPollMs ?? 4000))
  const state = ref<AlicizationVisualPresenceStateSnapshot | null>(null)
  const digitalLifeSpineDigest = ref<AlicizationDigitalLifeSpineDigest | null>(null)
  const syncing = ref(false)
  let disposed = false
  let started = false
  let requestId = 0
  let stopPulseListener: (() => void) | undefined
  let stopStateListener: (() => void) | undefined

  function applySnapshot(snapshot: AlicizationVisualPresenceStateSnapshot | null) {
    if (disposed)
      return

    requestId += 1
    syncing.value = false
    state.value = snapshot
  }

  function applyTransientDigitalLifeSpine(digest: AlicizationDigitalLifeSpineDigest | null | undefined) {
    if (disposed || !digest)
      return state.value
    digitalLifeSpineDigest.value = digest

    const nextSnapshot = buildAlicizationVisualPresenceStateFromSpineDigest({
      digest,
      previous: state.value,
    })
    applySnapshot(nextSnapshot)
    return nextSnapshot
  }

  async function refresh() {
    if (disposed || syncing.value || !hasAlicizationBridge())
      return state.value

    const getVisualPresenceState = getAlicizationBridge().getVisualPresenceState
    if (typeof getVisualPresenceState !== 'function')
      return state.value

    const currentRequestId = ++requestId
    syncing.value = true

    try {
      const snapshot = await getVisualPresenceState()
      if (!disposed && currentRequestId === requestId)
        state.value = snapshot
    }
    catch {
      // NOTICE: Visual presence sync must degrade silently to avoid blocking stage rendering.
    }
    finally {
      if (!disposed && currentRequestId === requestId)
        syncing.value = false
    }

    return state.value
  }

  const pollMs = computed(() => {
    return clampPollMs(state.value?.nextSuggestedProbeMs ?? maxPollMs, minPollMs, maxPollMs)
  })

  const poll = useIntervalFn(() => {
    void refresh()
  }, pollMs, {
    immediate: false,
    immediateCallback: false,
  })

  function dispose() {
    disposed = true
    started = false
    requestId += 1
    stopPulseListener?.()
    stopStateListener?.()
    stopPulseListener = undefined
    stopStateListener = undefined
    syncing.value = false
    digitalLifeSpineDigest.value = null
    poll.pause()
  }

  function start() {
    if (disposed || started)
      return

    started = true
    if (hasAlicizationBridge()) {
      const bridge = getAlicizationBridge()
      stopStateListener = bridge.onVisualPresenceState?.((snapshot) => {
        applySnapshot(snapshot)
      })
      stopPulseListener = bridge.onVisualPresencePulse?.(() => {
        if (!stopStateListener)
          void refresh()
      })
    }
    poll.resume()
    void refresh()
  }

  tryOnMounted(() => {
    start()
  })

  onScopeDispose(dispose)

  return {
    applyTransientDigitalLifeSpine,
    dispose,
    digitalLifeSpineDigest: readonly(digitalLifeSpineDigest) as Readonly<Ref<AlicizationDigitalLifeSpineDigest | null>>,
    refresh,
    start,
    state: readonly(state) as Readonly<Ref<AlicizationVisualPresenceStateSnapshot | null>>,
    syncing: readonly(syncing) as Readonly<Ref<boolean>>,
  }
}
