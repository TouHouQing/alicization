import { describe, expect, it } from 'vitest'

import {
  expandOpenClawBackedCapabilities,
  resolveExecutionTransportChannel,
  resolveOpenClawEventChannel,
} from './embodied-channel'

describe('embodied execution channel helpers', () => {
  it('expands openclaw capability into browser/software/desktop facades', () => {
    const expanded = expandOpenClawBackedCapabilities({
      channel: 'openclaw',
      available: true,
      enabled: true,
      ready: true,
      sessionAffinity: true,
      reason: null,
    })

    expect(expanded).toEqual([
      expect.objectContaining({
        channel: 'openclaw',
        ready: true,
        sessionAffinity: true,
      }),
      expect.objectContaining({
        channel: 'browser',
        ready: true,
        sessionAffinity: true,
      }),
      expect.objectContaining({
        channel: 'software',
        ready: true,
        sessionAffinity: true,
      }),
      expect.objectContaining({
        channel: 'desktop',
        ready: true,
        sessionAffinity: false,
      }),
    ])
  })

  it('maps browser/software/desktop execution into openclaw transport while preserving event channel', () => {
    expect(resolveExecutionTransportChannel('browser')).toBe('openclaw')
    expect(resolveExecutionTransportChannel('software')).toBe('openclaw')
    expect(resolveExecutionTransportChannel('desktop')).toBe('openclaw')
    expect(resolveExecutionTransportChannel('codex')).toBe('codex')

    expect(resolveOpenClawEventChannel('browser')).toBe('browser')
    expect(resolveOpenClawEventChannel('software')).toBe('software')
    expect(resolveOpenClawEventChannel('desktop')).toBe('desktop')
    expect(resolveOpenClawEventChannel('openclaw')).toBe('openclaw')
  })
})
