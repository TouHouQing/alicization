import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'

import { projectStageExecutionGaze } from './stage-execution-gaze'
import { useStageExecutionGaze } from './use-stage-execution-gaze'

function activity(): AlicizationActivityPresence {
  return { id: 'work', attemptId: 'current-attempt', kind: 'execution', phase: 'working', sequence: 1, phaseStartedAt: 1000, observedAt: 1000, work: { mode: 'reading', causeId: 'actual-effect', source: 'execution-effect', target: { space: 'screen-dip', x: -1600, y: 300, display: { x: -1920, y: 0, width: 1920, height: 1080 }, observationId: 'observed-window', observedAt: 1000, expiresAt: 4000 } } }
}
const geometry = { screenOrigin: { x: -1920, y: 0 }, anchor: { x: 1300, y: 700 }, stage: { width: 1920, height: 1080 }, visible: true }

afterEach(() => vi.useRealTimers())

describe('committed execution gaze without speech or gesture generation', () => {
  it('looks toward the actual target relative to the body on its own display', () => {
    const point = projectStageExecutionGaze(activity(), geometry, 1100)!
    expect(point.x).toBeLessThan(geometry.anchor.x)
    expect(point.y).toBeLessThan(geometry.anchor.y)
    // Subtracting the absolute anchor adds sub-pixel floating point roundoff.
    expect(Math.abs(point.x - geometry.anchor.x)).toBeLessThanOrEqual(1920 * 0.12 + 1e-9)
    expect(Math.abs(point.y - geometry.anchor.y)).toBeLessThanOrEqual(1080 * 0.08 + 1e-9)
    expect(projectStageExecutionGaze(activity(), { ...geometry, screenOrigin: { x: 0, y: 0 } }, 1100)).toBeNull()
  })

  it.each(['finished', 'failed', 'interrupted', 'blocked'] as const)('releases the look for %s state', (phase) => {
    expect(projectStageExecutionGaze({ ...activity(), phase }, geometry, 1100)).toBeNull()
  })

  it('expires without a heartbeat, refuses stale replay after pause, and clears on hidden stage or attempt removal', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1100)
    const scope = effectScope()
    const current = ref<AlicizationActivityPresence | null>(activity())
    const paused = ref(false)
    let visible = true
    const gaze = scope.run(() => useStageExecutionGaze({ activity: current, paused, geometry: () => ({ ...geometry, visible }) }))!
    try {
      expect(gaze.point.value).not.toBeNull()
      paused.value = true
      expect(gaze.point.value).toBeNull()
      paused.value = false
      expect(gaze.point.value).toBeNull()
      current.value = { ...activity(), work: { ...activity().work!, target: { ...activity().work!.target!, observationId: 'fresh-observation' } } }
      expect(gaze.point.value).not.toBeNull()
      visible = false
      vi.advanceTimersByTime(100)
      expect(gaze.point.value).toBeNull()
      visible = true
      current.value = { ...current.value, sequence: 2 }
      expect(gaze.point.value).toBeNull()
      current.value = { ...activity(), attemptId: 'next-attempt', work: { ...activity().work!, target: { ...activity().work!.target!, observationId: 'next-attempt-observation' } } }
      expect(gaze.point.value).not.toBeNull()
      vi.advanceTimersByTime(3000)
      expect(gaze.point.value).toBeNull()
      current.value = null
      expect(gaze.point.value).toBeNull()
    }
    finally {
      gaze.clear()
      scope.stop()
    }
  })
})
