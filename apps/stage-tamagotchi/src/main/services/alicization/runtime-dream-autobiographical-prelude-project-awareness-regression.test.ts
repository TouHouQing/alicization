import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime dream autobiographical prelude project awareness regression', () => {
  it('injects the dream-specific project self-brief before autobiographical synthesis so retained life summaries stay on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildDreamProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_DREAM_SELF_BRIEF]')
    expect(source).toContain('context_role=memory_metabolism')
    expect(source).toContain('short_term_owner=${facts.shortTermOwner}')
    expect(source).toContain('long_term_recall_owner=${facts.longTermRecallOwner}')
    expect(source).toContain('visible_governance_entry=${facts.visibleGovernanceEntry}')
    expect(source).toContain('failure_surface=${facts.failureSurface}')
    expect(source).toContain('template_policy=${facts.templatePolicy}')
    expect(source).not.toContain('project_context=phase1_local_digital_life')
    expect(source).not.toContain('Do not let dream metabolism collapse')
    expect(source).toContain('extraSystemBlocks: buildAlicizationProviderFacingProjectStateExtraSystemBlocks().concat(')
    expect(source).toContain('buildDreamProjectSelfBriefSystemBlock(),')
  })
})
