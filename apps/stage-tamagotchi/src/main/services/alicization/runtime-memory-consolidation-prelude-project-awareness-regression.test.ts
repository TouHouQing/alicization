import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime memory consolidation prelude project awareness regression', () => {
  it('injects a memory-consolidation-specific project self-brief before refinement generation so autobiographical shaping stays on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildMemoryConsolidationProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_MEMORY_CONSOLIDATION_SELF_BRIEF]')
    expect(source).toContain('context_role=reflection_refinement')
    expect(source).toContain('short_term_owner=${facts.shortTermOwner}')
    expect(source).toContain('long_term_recall_owner=${facts.longTermRecallOwner}')
    expect(source).toContain('visible_governance_entry=${facts.visibleGovernanceEntry}')
    expect(source).toContain('failure_surface=${facts.failureSurface}')
    expect(source).toContain('template_policy=${facts.templatePolicy}')
    expect(source).not.toContain('project_context=phase1_local_digital_life')
    expect(source).not.toContain('Do not let consolidation refinement collapse')
    expect(source).toContain('buildMemoryConsolidationProjectSelfBriefSystemBlock()')
  })
})
