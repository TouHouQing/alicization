import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import type { StageExecutionGazeGeometry } from './stage-execution-gaze'

import { useIntervalFn } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'

import { projectStageExecutionGaze } from './stage-execution-gaze'

/** No personhood state: a short-lived projection, released on task/visibility loss. */
export function useStageExecutionGaze(options: {
  activity: Readonly<Ref<AlicizationActivityPresence | null>>
  paused: Readonly<Ref<boolean>>
  geometry?: () => StageExecutionGazeGeometry | null
}) {
  const now = shallowRef(Date.now())
  const point = shallowRef<{ x: number, y: number } | null>(null)
  let revokedObservation: string | undefined
  const timer = useIntervalFn(refresh, 100, { immediate: false })
  function clear() {
    revokedObservation = options.activity.value?.work?.target?.observationId
    timer.pause()
    point.value = null
  }
  function refresh() {
    now.value = Date.now()
    const geometry = options.geometry?.()
    const target = options.activity.value?.work?.target
    if (options.paused.value || geometry?.visible === false)
      revokedObservation = target?.observationId
    point.value = options.paused.value || target?.observationId === revokedObservation ? null : projectStageExecutionGaze(options.activity.value, geometry, now.value)
    if (!point.value)
      timer.pause()
  }
  watch([options.activity, options.paused], () => {
    refresh()
    if (point.value)
      timer.resume()
  }, { immediate: true, flush: 'sync' })
  return { point: computed(() => point.value), clear }
}
