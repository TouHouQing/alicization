import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import type { AlicizationPresencePulsePayload } from '../../stores/alicization-bridge'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { resolveStagePresencePulsePerformance } from './stage-presence-pulse-performance'
import { stageActivityNeedsBodyFocus, useStageActivityPresence } from './use-stage-activity-presence'

function pulse(overrides: Partial<AlicizationActivityPresence> = {}): AlicizationPresencePulsePayload {
  return { watchMode: 'mnemonic-passive', embodiedPresence: 'attentive', scenario: 'coding', stance: 'accompany', confidence: 1, reasonTags: ['committed-execution'], expiresAt: Date.now() + 6000, activity: { id: 'task', attemptId: 'attempt', kind: 'execution', phase: 'working', phaseStartedAt: Date.now(), observedAt: Date.now(), sequence: 1, ...overrides } }
}

afterEach(() => vi.useRealTimers())

describe('task body presentation admission and continuity', () => {
  it('projects a real daily rest or stretch without overriding an active execution or its emotional continuity', () => {
    vi.useFakeTimers()
    const presence = useStageActivityPresence()
    const rest = pulse({ id: 'daily', kind: 'daily-life', behavior: 'rest' })
    expect(presence.accept(rest)).toBe(true)
    expect(resolveStagePresencePulsePerformance(rest)).toMatchObject({ baseEmotion: 'tired', actionCue: 'rest_settle' })
    expect(resolveStagePresencePulsePerformance(rest, 'sad')).toMatchObject({ baseEmotion: 'sad' })
    presence.accept(pulse())
    expect(presence.accept(pulse({ id: 'stretch', kind: 'daily-life', behavior: 'stretch' }))).toBe(false)
    presence.clear()
    expect(presence.accept(pulse({ kind: 'daily-life', behavior: 'invented' as never }))).toBe(false)
    expect(resolveStagePresencePulsePerformance(pulse({ kind: 'daily-life', behavior: 'stretch' }))).toMatchObject({ actionCue: 'stretch', baseEmotion: 'neutral' })
    presence.clear()
  })

  it('refreshes liveness without replaying a gesture and expires an abandoned activity', () => {
    vi.useFakeTimers()
    const presence = useStageActivityPresence()
    presence.accept(pulse())
    expect(presence.shouldAnimate('vrm', pulse())).toBe(true)
    vi.advanceTimersByTime(1000)
    presence.accept(pulse())
    expect(presence.shouldAnimate('vrm', pulse())).toBe(false)
    expect(presence.shouldAnimate('live2d', pulse())).toBe(true)
    vi.advanceTimersByTime(6000)
    expect(presence.activity.value).toBeNull()
  })

  it('rejects stale phases, late old attempts and background projects taking foreground focus', () => {
    vi.useFakeTimers()
    const presence = useStageActivityPresence()
    presence.accept(pulse({ sequence: 3, phase: 'verifying' }))
    presence.accept(pulse({ sequence: 2 }))
    expect(presence.activity.value?.phase).toBe('verifying')
    vi.advanceTimersByTime(100)
    presence.accept(pulse({ id: 'project', kind: 'personal-project' }))
    expect(presence.activity.value?.id).toBe('task')
    presence.accept(pulse({ attemptId: 'new', observedAt: Date.now() }))
    presence.accept(pulse({ attemptId: 'attempt', observedAt: Date.now() - 100 }))
    expect(presence.activity.value?.attemptId).toBe('new')
    presence.clear()
  })

  it('retains the same personhood affect during a verified result and gives interruption a settling action', () => {
    expect(resolveStagePresencePulsePerformance(pulse({ phase: 'finished' }), 'sad')).toMatchObject({ baseEmotion: 'sad', actionCue: 'nod', facialCue: null })
    expect(resolveStagePresencePulsePerformance(pulse({ phase: 'finished' }), 'happy')).toMatchObject({ baseEmotion: 'happy', actionCue: 'celebrate_small' })
    expect(resolveStagePresencePulsePerformance(pulse({ phase: 'interrupted' }))).toMatchObject({ actionCue: 'idle_settle' })
  })

  it('keeps committed rest alive across a desktop tick without extending an execution lease', () => {
    vi.useFakeTimers()
    const presence = useStageActivityPresence()
    const rest = { ...pulse({ kind: 'daily-life', behavior: 'rest', phase: 'working' }), expiresAt: Date.now() + 65000 }
    expect(presence.accept(rest)).toBe(true)
    vi.advanceTimersByTime(60000)
    expect(presence.activity.value?.behavior).toBe('rest')
    presence.clear()
    expect(presence.accept({ ...pulse(), expiresAt: Date.now() + 65000 })).toBe(false)
    presence.clear()
  })

  it('releases body focus for terminal results and waiting states so the next dialogue can act', () => {
    expect(stageActivityNeedsBodyFocus(pulse({ phase: 'working' }).activity)).toBe(true)
    expect(stageActivityNeedsBodyFocus(pulse({ phase: 'verifying' }).activity)).toBe(true)
    for (const phase of ['blocked', 'finished', 'interrupted', 'failed'] as const)
      expect(stageActivityNeedsBodyFocus(pulse({ phase }).activity)).toBe(false)
  })

  it('rejects expired, fabricated phases and invalid sequence numbers', () => {
    vi.useFakeTimers()
    const presence = useStageActivityPresence()
    presence.accept({ ...pulse(), expiresAt: Date.now() - 1 })
    presence.accept(pulse({ sequence: Number.NaN }))
    presence.accept(pulse({ phase: 'invented' as never }))
    expect(presence.activity.value).toBeNull()
    presence.clear()
  })
})
