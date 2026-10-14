import type { AlicizationActivityPresence, AlicizationBodyActivityReceipt, AlicizationBodyFrame } from '@proj-alicization/stage-shared'
import type { Ref } from 'vue'

import { useIntervalFn } from '@vueuse/core'
import { onScopeDispose, watch } from 'vue'

/** Observe the actual model loop, with no dependence on wall-clock animation promises. */
export function useStageBodyActivity(options: {
  activity: Readonly<Ref<AlicizationActivityPresence | null>>
  cardId: () => string | undefined
  visible: () => boolean
  frame: () => AlicizationBodyFrame | null
  emit: (receipt: AlicizationBodyActivityReceipt) => void
  visiblePixels: () => boolean
}) {
  let current: { activity: AlicizationActivityPresence, cardId: string, frame: AlicizationBodyFrame | null, frames: number, ms: number, movement: number, first: number[][], done: boolean, started: boolean } | null = null
  function send(state: AlicizationBodyActivityReceipt['state']) {
    if (!current || current.done)
      return
    const pixels = options.visiblePixels()
    if (state === 'completed' && !pixels)
      state = 'hidden'
    options.emit({ cardId: current.cardId, activityId: current.activity.id, activitySequence: current.activity.sequence, renderer: 'vrm', modelId: current.frame?.modelId ?? 'unavailable', state, observedFrames: current.frames, observedMs: Math.round(current.ms), movementRadians: current.movement, cue: current.activity.behavior === 'stretch' ? 'stretch' : 'rest_settle', occurredAt: Date.now(), visiblePixels: pixels, motionCompleted: current.frame?.completedMotion?.id === current.activity.id && current.frame.completedMotion.cue === (current.activity.behavior === 'stretch' ? 'stretch' : 'rest_settle') })
    if (state !== 'started')
      current.done = true
  }
  watch(options.activity, (activity) => {
    if (current && (activity?.id !== current.activity.id || activity.phase !== 'working'))
      send('interrupted')
    if (activity?.kind === 'daily-life' && activity.phase === 'working' && current?.activity.id !== activity.id)
      current = { activity, cardId: options.cardId() ?? '', frame: null, frames: 0, ms: 0, movement: 0, first: [], done: false, started: false }
  }, { immediate: true })
  useIntervalFn(() => {
    if (!current || current.done)
      return
    if (!options.visible()) {
      send('hidden')
      return
    }
    const frame = options.frame()
    if (!frame || Date.now() - frame.renderedAt > 1000) {
      if (Date.now() - current.activity.phaseStartedAt > 90000)
        send('unsupported')
      return
    }
    if (current.frame?.modelId && current.frame.modelId !== frame.modelId) {
      send('interrupted')
      return
    }
    if (current.frame?.serial === frame.serial)
      return
    const cue = current.activity.behavior === 'stretch' ? 'stretch' : 'rest_settle'
    if (!current.started && frame.motionOwnerId === current.activity.id && frame.cue === cue) {
      current.frame = frame
      current.first = frame.rotations.map(values => [...values])
      current.started = true
      send('started')
    }
    if (current.frame) {
      const dt = frame.elapsedMs - current.frame.elapsedMs
      if (dt < 0 || dt > 1000) {
        send('interrupted')
        return
      }
      if ((frame.motionOwnerId === current.activity.id && frame.cue === cue) || (frame.completedMotion?.id === current.activity.id && frame.completedMotion.cue === cue)) {
        current.frames += frame.serial - current.frame.serial
        current.ms += dt
        for (let i = 0; i < frame.rotations.length; i++) {
          const a = frame.rotations[i]
          const b = current.first[i]
          if (a?.length === 4 && b?.length === 4) {
            const dot = Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0))
            current.movement = Math.max(current.movement, 2 * Math.acos(Math.min(1, dot)))
          }
        }
      }
    }
    else {
      current.first = frame.rotations.map(values => [...values])
      current.frame = frame
    }
    current.frame = frame
    if (current.activity.behavior === 'stretch' && current.frame?.completedMotion?.id === current.activity.id && current.frame.completedMotion.cue === 'stretch' && current.ms >= 4000 && current.frames >= 30 && current.movement >= 0.2)
      send('completed')
    if (Date.now() - current.activity.phaseStartedAt > 90000 && current.activity.behavior === 'stretch')
      send('interrupted')
  }, 100)
  onScopeDispose(() => send('interrupted'))
}
