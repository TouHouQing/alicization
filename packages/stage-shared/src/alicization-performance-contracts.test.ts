import { describe, expect, it } from 'vitest'

import { normalizeAlicizationPerformancePayload } from './index'

describe('alicization performance contracts', () => {
  it('preserves quiet-accompaniment as a low-pressure same-her resident performance mode', () => {
    const performance = normalizeAlicizationPerformancePayload({
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'quiet-accompaniment',
      face: {
        residentMode: 'quiet-accompaniment',
      },
      action: {
        residentMode: 'quiet-accompaniment',
      },
    })

    expect(performance.residentMode).toBe('quiet-accompaniment')
    expect(performance.face?.residentMode).toBe('quiet-accompaniment')
    expect(performance.action?.residentMode).toBe('quiet-accompaniment')
  })

  it('preserves same-thread-continuation as an explicit same-her resident carry mode during performance payload normalization', () => {
    const performance = normalizeAlicizationPerformancePayload({
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'same-thread-continuation',
      face: {
        residentMode: 'same-thread-continuation',
      },
      action: {
        residentMode: 'same-thread-continuation',
      },
    })

    expect(performance.residentMode).toBe('same-thread-continuation')
    expect(performance.face?.residentMode).toBe('same-thread-continuation')
    expect(performance.action?.residentMode).toBe('same-thread-continuation')
  })
})
