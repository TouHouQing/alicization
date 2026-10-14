import type { StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import { normalizeAlicizationEmbodimentScript } from '@proj-alicization/stage-shared'
import { useIntervalFn } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'

import { projectStageInteractionPerformance } from './stage-interaction-performance'

export function useStageInteractionIntent(options: { cardId: Readonly<Ref<string>>, paused: Readonly<Ref<boolean>>, taskActive: Readonly<Ref<boolean>>, performance: Readonly<Ref<StageEmbodimentPerformanceState>> }) {
  const script = shallowRef<ReturnType<typeof normalizeAlicizationEmbodimentScript>>(null)
  const now = shallowRef(Date.now())
  const playbackNow = shallowRef(globalThis.performance.now())
  const timer = useIntervalFn(() => {
    now.value = Date.now()
    playbackNow.value = globalThis.performance.now()
    if ((script.value?.state.interactionIntent?.expiresAt ?? 0) <= now.value)
      clear()
  }, 50, { immediate: false })
  function clear() {
    timer.pause()
    script.value = null
  }
  function accept(raw: unknown) {
    const incoming = normalizeAlicizationEmbodimentScript(raw)
    const intent = incoming?.state.interactionIntent
    const timestamp = Date.now()
    const suppliedIntent = (raw as { state?: { interactionIntent?: unknown } } | null)?.state?.interactionIntent
    if (suppliedIntent != null && !intent)
      return false
    if (incoming && !intent && incoming.turnId !== script.value?.turnId)
      clear()
    if (!incoming || !intent || options.paused.value || (options.taskActive.value && !intent.target) || intent.cardId !== options.cardId.value || intent.expiresAt <= timestamp || intent.createdAt > timestamp + 100)
      return false
    const current = script.value?.state.interactionIntent
    if (current && (intent.createdAt < current.createdAt || (intent.createdAt === current.createdAt && intent.turnId !== current.turnId)))
      return false
    script.value = incoming
    now.value = timestamp
    playbackNow.value = globalThis.performance.now()
    timer.resume()
    return true
  }
  watch([options.cardId, options.paused], clear, { flush: 'sync' })
  watch(options.taskActive, (active) => {
    if (active && !script.value?.state.interactionIntent?.target)
      clear()
  }, { flush: 'sync' })
  watch(() => options.performance.value.phase, (phase, previous) => {
    if (phase === 'idle' && (previous === 'speaking' || previous === 'cooldown'))
      clear()
  }, { flush: 'sync' })
  return { accept, clear, intent: computed(() => script.value?.state.interactionIntent ?? null), performance: computed(() => projectStageInteractionPerformance(options.performance.value, script.value?.state.interactionIntent ?? null, { cardId: options.cardId.value, now: now.value, playbackNow: playbackNow.value, paused: options.paused.value, taskActive: options.taskActive.value, viewport: typeof window !== 'undefined' ? { left: window.screenX, top: window.screenY, width: window.innerWidth, height: window.innerHeight } : undefined })) }
}
