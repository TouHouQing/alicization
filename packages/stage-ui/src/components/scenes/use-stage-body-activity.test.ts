import type { AlicizationActivityPresence, AlicizationBodyFrame } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'
import { effectScope, shallowRef } from 'vue'

import { useStageBodyActivity } from './use-stage-body-activity'

vi.mock('@vueuse/core', () => ({ useIntervalFn: (callback: () => void, delay: number) => {
  setInterval(callback, delay)
} }))

describe('model-frame activity observation', () => {
  it('reports real elapsed frames and releases an interrupted owner without inventing completion', async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const activity = shallowRef<AlicizationActivityPresence | null>({ id: 'daily:a', attemptId: '', kind: 'daily-life', behavior: 'stretch', phase: 'working', sequence: 1, phaseStartedAt: Date.now(), observedAt: Date.now() })
    let frame: AlicizationBodyFrame | null = null
    const emit = vi.fn()
    try {
      scope.run(() => useStageBodyActivity({ activity, cardId: () => 'alice', visible: () => true, visiblePixels: () => true, frame: () => frame, emit }))
      for (let index = 0; index <= 60; index++) {
        const angle = Math.sin(index / 60 * Math.PI)
        frame = { serial: index * 3, elapsedMs: index * 100, modelId: 'vrm:a', renderedAt: Date.now(), cue: 'stretch', motionOwnerId: 'daily:a', ...(index >= 50 ? { completedMotion: { id: 'daily:a', cue: 'stretch' } } : {}), rotations: [[0, 0, Math.sin(angle / 2), Math.cos(angle / 2)]] }
        await vi.advanceTimersByTimeAsync(100)
      }
      expect(emit.mock.calls.map(([receipt]) => receipt.state)).toEqual(['started', 'completed'])
      expect(emit.mock.lastCall?.[0]).toMatchObject({ modelId: 'vrm:a', observedFrames: 150, observedMs: 5000 })
      activity.value = { ...activity.value!, id: 'daily:b', phaseStartedAt: Date.now() }
      await vi.advanceTimersByTimeAsync(100)
      activity.value = null
      await vi.advanceTimersByTimeAsync(100)
      expect(emit.mock.lastCall?.[0]).toMatchObject({ activityId: 'daily:b', state: 'interrupted' })
    }
    finally {
      scope.stop()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})
