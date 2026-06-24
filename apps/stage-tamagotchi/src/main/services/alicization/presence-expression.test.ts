import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationPresenceExpression } from './presence-expression'

describe('buildAlicizationPresenceExpression', () => {
  it('builds a presence-only expression snapshot from grounded generator output', async () => {
    const generate = vi.fn(async () => ({
      text: '嗯，先让这里慢下来一点。',
    }))

    const snapshot = await buildAlicizationPresenceExpression({
      trigger: 'presence-only-hold',
      previousState: {
        privateThought: { thoughtText: 'quiet' },
      },
      state: {
        privateThought: { thoughtText: 'quiet' },
        emotionalKernel: { version: 'emotional-kernel-v1' },
        initiative: { preferredStyle: 'silent-observe' },
      },
      now: 123,
      generate,
    })

    expect(generate).toHaveBeenCalled()
    expect(snapshot).toEqual({
      version: 'presence-expression-v1',
      trigger: 'presence-only-hold',
      text: '嗯，先让这里慢下来一点。',
      display: {
        mode: 'near-body-whisper',
        allowAutoShow: true,
      },
      grounding: {
        sourceRefs: expect.arrayContaining([
          'privateThought',
          'emotionalKernel',
          'initiative',
        ]),
      },
    })
  })

  it('returns null for the banned presence-only hold text', async () => {
    const snapshot = await buildAlicizationPresenceExpression({
      trigger: 'presence-only-hold',
      previousState: null,
      state: {
        privateThought: { thoughtText: 'quiet' },
        emotionalKernel: { version: 'emotional-kernel-v1' },
        initiative: { preferredStyle: 'silent-observe' },
      },
      now: 123,
      generate: vi.fn(async () => ({
        text: '我在旁边，先不打扰你。',
      })),
    })

    expect(snapshot).toBeNull()
  })
})
