import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime-subconscious-tick emotional transition regression', () => {
  it('threads emotional transition decay from mind-state ledger into proactive cadence and body authority', () => {
    const source = readFileSync(new URL('./runtime-subconscious-tick.ts', import.meta.url), 'utf8')
    const importBlock = source.slice(0, source.indexOf('function hasThinAffectiveResidueRoomMakingCue'))
    const cadenceStart = source.indexOf('proactiveLoopState = progressProactiveCadenceState({')
    const cadenceEnd = source.indexOf('\n    setProactiveLoopStateCache', cadenceStart)
    const cadenceBlock = cadenceStart >= 0 && cadenceEnd > cadenceStart
      ? source.slice(cadenceStart, cadenceEnd)
      : ''
    const bodyStart = source.indexOf('const nextPresenceStateWithBodyAuthority = bodyKernel.applyToVisualPresenceState({')
    const bodyEnd = source.indexOf('\n            })', bodyStart)
    const bodyBlock = bodyStart >= 0 && bodyEnd > bodyStart
      ? source.slice(bodyStart, bodyEnd)
      : ''

    expect(importBlock).toContain('resolveAlicizationEmotionalTransitionDecay')
    expect(source).toContain('const emotionalTransitionDecay = emotionalTransitionLedger')
    expect(source).toContain('ledger: emotionalTransitionLedger')
    expect(source).toContain('current: emotionalKernelForDecay')
    expect(cadenceBlock).toContain('emotionalTransitionDecay,')
    expect(bodyBlock).toContain('emotionalTransitionDecay')
  })
})
