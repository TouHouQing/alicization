import { describe, expect, it } from 'vitest'

import { buildReplayBenchmarkExpectedMemory } from './replay-benchmark-expected-memory'

describe('replay benchmark expected memory', () => {
  it('pulls identity-continuity', () => {
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
          sameHerSelfLine: 'identity-continuity',
          preDialogueAwarenessLine: 'remember the project before reply',
          emotionalClosureCue: 'identity-continuity',
        },
      }),
    })

    expect(result).toContain('local-first digital life')
    expect(result).toContain('Phase 1')
    expect(result).toContain('landed progress')
    expect(result).toContain('unfinished closure')
    expect(result).toContain('next closure target')
    expect(result).toContain('identity-continuity')
    expect(result).toContain('remember the project before reply')
    expect(result).toContain('identity-continuity')
  })

  it('keeps identity-continuity', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: `${'generic outward answer '.repeat(20)}${'more generic phrasing '.repeat(20)}`,
      visibleText: `${'generic visible reply '.repeat(20)}${'still generic wording '.repeat(20)}`,
      structuredJson: JSON.stringify({
        reply: `${'generic reply surface '.repeat(20)}${'soft generic filler '.repeat(20)}`,
        projectState: {
          identity: 'local-first digital life',
          currentPhase: 'Phase 1',
          sameHerSelfLine: 'identity-continuity',
          preDialogueAwarenessLine: 'remember the project before reply',
          emotionalClosureCue: 'identity-continuity',
        },
      }),
    })

    expect(result).toContain('local-first digital life')
    expect(result).toContain('Phase 1')
    expect(result).toContain('identity-continuity')
    expect(result).toContain('remember the project before reply')
    expect(result).toContain('identity-continuity')
  })

  it('keeps the next closure target when long project-state identity and phase text would otherwise crowd it out', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'I will keep this memory closure on the same desktop life loop.',
      structuredJson: JSON.stringify({
        reply: 'I will keep this memory closure on the same desktop life loop.',
        projectState: {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry and runtime sampling already preserve some route-chain proof.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, execution feedback, and embodiment.',
          nextClosureTarget: 'Keep extending cross-modal identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
        },
      }),
    })

    expect(result).toContain('local-first digital life project')
    expect(result).toContain('Phase 1: Local Digital Life')
    expect(result).toContain('cross-modal identity-continuity')
  })
})
