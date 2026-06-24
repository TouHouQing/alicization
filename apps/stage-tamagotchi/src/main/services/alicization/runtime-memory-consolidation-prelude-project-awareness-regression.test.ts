import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime memory consolidation prelude project awareness regression', () => {
  it('injects a memory-consolidation-specific project self-brief before refinement generation so autobiographical shaping stays on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildMemoryConsolidationProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]')
    expect(source).toContain('project_identity=')
    expect(source).toContain('current_phase=')
    expect(source).toContain('pre_dialogue_awareness=')
    expect(source).toContain('same_her_line=')
    expect(source).toContain('same_her_hold=')
    expect(source).toContain('Memory consolidation refinement must stay inside the same digital life project line')
    expect(source).toContain('Do not let consolidation refinement collapse into generic summarization')
    expect(source).toContain('buildMemoryConsolidationProjectSelfBriefSystemBlock()')
  })
})
