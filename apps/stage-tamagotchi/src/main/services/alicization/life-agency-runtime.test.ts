import { describe, expect, it } from 'vitest'

import { decideLifeAgency } from './life-agency-runtime'

describe('initiative attention and resource closure', () => {
  const input = { previous: null, now: 100, evidenceKey: 'one', force: false, foregroundActive: false, suspended: false, cpuUsage: 10, fullscreen: false }
  it('stays quiet without new evidence across ticks and a long sleep', () => {
    const first = decideLifeAgency(input)
    expect(first.allowed).toBe(true)
    const repeat = decideLifeAgency({ ...input, previous: first.next, now: 200 })
    expect(repeat.reason).toBe('no-new-evidence')
    expect(repeat.next.cycles).toBe(1)
    const resumed = decideLifeAgency({ ...input, previous: repeat.next, now: 100 + 24 * 60 * 60_000 })
    expect(resumed.allowed).toBe(false)
    expect(resumed.next.cycles).toBe(0)
    expect(decideLifeAgency({ ...input, previous: resumed.next, now: resumed.next.observedAt + 1, evidenceKey: 'new' }).allowed).toBe(true)
  })
  it('prioritizes foreground, honors suspension and caps real cognition cycles', () => {
    expect(decideLifeAgency({ ...input, force: true, foregroundActive: true }).reason).toBe('foreground-priority')
    expect(decideLifeAgency({ ...input, force: true, suspended: true }).reason).toBe('suspended')
    const first = decideLifeAgency(input)
    expect(decideLifeAgency({ ...input, previous: first.next, evidenceKey: 'new', maximumCycles: 1 }).reason).toBe('cycle-budget-exhausted')
    const backward = decideLifeAgency({ ...input, previous: first.next, now: 0, evidenceKey: 'new' })
    expect(backward.next.observedAt).toBe(100)
    expect(backward.next.cycles).toBe(2)
    expect(decideLifeAgency({ ...input, cpuUsage: 90 }).reason).toBe('resource-pressure')
  })
})
