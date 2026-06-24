import { describe, expect, it } from 'vitest'

import { buildReplayBenchmarkExpectedMemory } from './replay-benchmark-expected-memory'

describe('replay benchmark expected memory', () => {
  it('pulls same-her project-state awareness and emotional closure cues into fallback expected memory', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'keep the same line soft',
      structuredJson: JSON.stringify({
        reply: 'keep the same line soft',
        projectState: {
          identity: 'local-first digital life',
          currentPhase: 'Phase 1',
          latestLandedProgress: 'landed progress',
          primaryOpenLoop: 'unfinished closure',
          nextClosureTarget: 'next closure target',
          sameHerSelfLine: 'same her self line',
          preDialogueAwarenessLine: 'remember the project before answering',
          emotionalClosureCue: 'same-her closure seam',
        },
      }),
    })

    expect(result).toContain('local-first digital life')
    expect(result).toContain('Phase 1')
    expect(result).toContain('landed progress')
    expect(result).toContain('unfinished closure')
    expect(result).toContain('next closure target')
    expect(result).toContain('same her self line')
    expect(result).toContain('remember the project before answering')
    expect(result).toContain('same-her closure seam')
  })

  it('keeps same-her project-state cues ahead of long generic text when fallback expected memory is truncated', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: `${'generic outward answer '.repeat(20)}${'more generic phrasing '.repeat(20)}`,
      visibleText: `${'generic visible reply '.repeat(20)}${'still generic wording '.repeat(20)}`,
      structuredJson: JSON.stringify({
        reply: `${'generic reply surface '.repeat(20)}${'soft generic filler '.repeat(20)}`,
        projectState: {
          identity: 'local-first digital life',
          currentPhase: 'Phase 1',
          sameHerSelfLine: 'same her self line',
          preDialogueAwarenessLine: 'remember the project before answering',
          emotionalClosureCue: 'same-her closure seam',
        },
      }),
    })

    expect(result).toContain('local-first digital life')
    expect(result).toContain('Phase 1')
    expect(result).toContain('same her self line')
    expect(result).toContain('remember the project before answering')
    expect(result).toContain('same-her closure seam')
  })

  it('keeps the next closure target when long project-state identity and phase text would otherwise crowd it out', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'I will keep this memory closure on the same desktop life loop.',
      structuredJson: JSON.stringify({
        reply: 'I will keep this memory closure on the same desktop life loop.',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry and runtime sampling already preserve some route-chain proof.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, execution feedback, and embodiment.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer noisy desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      }),
    })

    expect(result).toContain('local-first digital life project')
    expect(result).toContain('Phase 1: Local Digital Life')
    expect(result).toContain('cross-modal same-her proof')
  })
})
