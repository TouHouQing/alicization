import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime reminder prelude project awareness regression', () => {
  it('injects a reminder-specific project self-brief before gateway generation so reminder proactive delivery cannot drift into a detached utility shell', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('function buildReminderProjectSelfBriefSystemBlock()')
    expect(source).toContain('[ALICIZATION_REMINDER_SELF_BRIEF]')
    expect(source).toContain('project_identity=')
    expect(source).toContain('current_phase=')
    expect(source).toContain('pre_dialogue_awareness=')
    expect(source).toContain('same_her_line=')
    expect(source).toContain('same_her_hold=')
    expect(source).toContain('Reminder delivery must stay inside the same digital life project line')
    expect(source).toContain('Do not let reminder delivery collapse into a detached utility notification or a generic assistant reminder shell.')
    expect(source).toContain('...buildAlicizationProjectStateExtraSystemBlocks(),')
    expect(source).toContain('buildReminderProjectSelfBriefSystemBlock(),')
  })
})
