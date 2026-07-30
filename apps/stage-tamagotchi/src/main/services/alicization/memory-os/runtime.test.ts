import { describe, expect, it, vi } from 'vitest'

import { runAlicizationMemoryOsTurnRuntime } from './runtime'

describe('memory-os runtime', () => {
  it('does not pass reply governance fields into memory context tuning', async () => {
    const context = {
      hostAttitude: 'focused',
      coreIncarnation: '',
      activeThoughts: [],
      retrievedFacts: [],
      recalledFragments: [],
    } as any
    const recallGovernor = {
      mode: 'thread',
    }
    const tuneContext = vi.fn(async input => input.context)

    await runAlicizationMemoryOsTurnRuntime({
      recallSeed: '继续当前记忆链路',
      recallGovernor,
      personaKernelMode: 'muted',
      resolveContext: async () => context,
      tuneContext,
      nowMs: () => 1,
    } as any)

    expect(tuneContext).toHaveBeenCalledWith({
      context,
      recallGovernor,
    })
  })
})
