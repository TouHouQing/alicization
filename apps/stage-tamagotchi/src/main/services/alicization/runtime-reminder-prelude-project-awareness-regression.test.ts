import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime reminder prelude project awareness regression', () => {
  it('injects a reminder-specific project self-brief before gateway generation so reminder proactive delivery cannot drift into a detached utility shell', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildReminderProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_REMINDER_SELF_BRIEF]')
    expect(source).toContain('context_role=scheduled_memory_delivery')
    expect(source).toContain('short_term_owner=${facts.shortTermOwner}')
    expect(source).toContain('long_term_recall_owner=${facts.longTermRecallOwner}')
    expect(source).toContain('visible_governance_entry=${facts.visibleGovernanceEntry}')
    expect(source).toContain('failure_surface=${facts.failureSurface}')
    expect(source).toContain('template_policy=${facts.templatePolicy}')
    expect(source).not.toContain('project_context=phase1_local_digital_life')
    expect(source).not.toContain('Do not let reminder delivery collapse')
    expect(source).toContain('...buildAlicizationProviderFacingProjectStateExtraSystemBlocks(),')
    expect(source).toContain('buildReminderProjectSelfBriefSystemBlock(),')
  })
})
