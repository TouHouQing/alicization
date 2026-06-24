import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime dream autobiographical prelude project awareness regression', () => {
  it('injects the dream-specific project self-brief before autobiographical synthesis so retained life summaries stay on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildDreamProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_DREAM_SELF_BRIEF]')
    expect(source).toContain('project_identity=')
    expect(source).toContain('current_phase=')
    expect(source).toContain('pre_dialogue_awareness=')
    expect(source).toContain('same_her_line=')
    expect(source).toContain('Dream metabolism must stay inside the same digital life project line')
    expect(source).toContain('Do not let dream metabolism collapse into detached trait optimization')
    expect(source).toContain('extraSystemBlocks: buildAlicizationProjectStateExtraSystemBlocks().concat(')
    expect(source).toContain('buildDreamProjectSelfBriefSystemBlock(),')
  })
})
