import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('performance visualizer runtime identity-continuity', () => {
  it('exposes the sampled runtime identity-continuity', () => {
    const source = readFileSync(new URL('./performance-visualizer.vue', import.meta.url), 'utf8')

    expect(source).toContain('async function runRuntimeSameHerSessionProof()')
    expect(source).toContain('await replayStore.runSameHerSessionProof()')
    expect(source).toContain('await selfEvolutionInspector.refresh()')
    expect(source).toContain('benchmarkRuntimeSameHerProofSummary')
    expect(source).toContain('benchmarkSupported')
    expect(source).toContain('benchmarkLoading')
    expect(source).toContain('runtime same-her desktop proof')
    expect(source).toContain('runtime-same-her-proof:run-button')
    expect(source).toContain('runtime-same-her-proof:status')
    expect(source).toContain('runtime-same-her-proof:detail')
    expect(source).toContain('runtime-same-her-proof:next-repair-target')
  })
})
