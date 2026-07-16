import { describe, expect, it } from 'vitest'

import { buildPrioritizedProjectStateContinuityLines } from './runtime-governance'

describe('runtime-governance project-state continuity values', () => {
  it('keeps dynamic continuity values without authored framing', () => {
    const identity = 'Alicization remains one local digital life.'
    const phase = 'Phase 1 local desktop runtime.'
    const landed = 'Working memory is connected to the dialogue turn.'
    const open = 'Long-term recall quality still needs scale testing.'

    const result = buildPrioritizedProjectStateContinuityLines({
      projectStateContinuityAnchors: [
        `continuity_anchor=${identity}`,
        `phase=${phase}`,
        `landed=${landed}`,
        `open=${open}`,
      ],
    })

    expect(result).toEqual([
      identity,
      phase,
      landed,
      open,
    ])
    expect(result.join(' ')).not.toMatch(
      /Use this continuity evidence|evidence is present|Keep this hold detail|Avoid this drift pattern/u,
    )
  })

  it('deduplicates dynamic values while preserving source order', () => {
    const identity = 'One persisted identity.'
    const activeThread = 'Review the current memory search result.'

    const result = buildPrioritizedProjectStateContinuityLines({
      projectStateContinuityAnchors: [
        `continuity_anchor=${identity}`,
        `hold=${activeThread}`,
        `open=${activeThread}`,
        identity,
      ],
    })

    expect(result).toEqual([
      identity,
      activeThread,
    ])
  })

  it('keeps the bounded explicit values ahead of a generic dynamic carry', () => {
    const explicitValues = Array.from(
      { length: 10 },
      (_, index) => `fact-${index + 1}`,
    )

    const result = buildPrioritizedProjectStateContinuityLines({
      projectStateContinuityAnchors: explicitValues.map(
        (value, index) => `field_${index + 1}=${value}`,
      ),
      projectStateContinuityCarry: 'generic dynamic carry',
    })

    expect(result).toEqual(explicitValues)
    expect(result).not.toContain('generic dynamic carry')
  })
})
