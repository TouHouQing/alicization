import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime proactive prelude project awareness regression', () => {
  it('injects a proactive-specific project self-brief before gateway generation so initiative stays on the same digital-life closure line', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const blockStart = source.indexOf('function buildProactiveProjectSelfBriefSystemBlock() {')
    const blockEnd = source.indexOf('\n\n  function buildDreamProjectSelfBriefSystemBlock()', blockStart)
    const proactiveSelfBriefBlock = blockStart >= 0 && blockEnd > blockStart
      ? source.slice(blockStart, blockEnd)
      : ''

    expect(proactiveSelfBriefBlock).toContain('function buildProactiveProjectSelfBriefSystemBlock()')
    expect(proactiveSelfBriefBlock).toContain('[ALICIZATION_PROACTIVE_SELF_BRIEF]')
    expect(proactiveSelfBriefBlock).toContain('project_identity=')
    expect(proactiveSelfBriefBlock).toContain('current_phase=')
    expect(proactiveSelfBriefBlock).toContain('pre_dialogue_awareness=')
    expect(proactiveSelfBriefBlock).toContain('same_her_line=')
    expect(proactiveSelfBriefBlock).toContain('same_her_hold=')
    expect(proactiveSelfBriefBlock).toContain('latest_landed_progress=')
    expect(proactiveSelfBriefBlock).toContain('primary_open_loop=')
    expect(proactiveSelfBriefBlock).toContain('next_closure_target=')
    expect(proactiveSelfBriefBlock).toContain('same_her_drift_risk=')
    expect(proactiveSelfBriefBlock).toContain('Proactive initiative must stay inside the same digital life project line')
    expect(proactiveSelfBriefBlock).toContain('the same Phase 1 proving ground')
    expect(proactiveSelfBriefBlock).toContain('the same still-open closure work')
    expect(proactiveSelfBriefBlock).toContain('Do not let proactive initiative collapse into a generic caring nudge')
    expect(proactiveSelfBriefBlock).toContain('a detached productivity prompt')
    expect(proactiveSelfBriefBlock).toContain('a shallow assistant check-in shell')
    expect(source).toContain('buildProactiveProjectSelfBriefSystemBlock(),')
  })

  it('keeps proactive self-brief ordered as identity -> phase -> awareness -> same-her -> landed/open/next/drift-risk so initiative cannot reopen from a thinner shell', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')
    const blockStart = source.indexOf('function buildProactiveProjectSelfBriefSystemBlock() {')
    const blockEnd = source.indexOf('\n\n  function buildDreamProjectSelfBriefSystemBlock()', blockStart)
    const proactiveSelfBriefBlock = blockStart >= 0 && blockEnd > blockStart
      ? source.slice(blockStart, blockEnd)
      : ''

    const projectIdentityIndex = proactiveSelfBriefBlock.indexOf('project_identity=')
    const currentPhaseIndex = proactiveSelfBriefBlock.indexOf('current_phase=')
    const preDialogueAwarenessIndex = proactiveSelfBriefBlock.indexOf('pre_dialogue_awareness=')
    const sameHerLineIndex = proactiveSelfBriefBlock.indexOf('same_her_line=')
    const sameHerHoldIndex = proactiveSelfBriefBlock.indexOf('same_her_hold=')
    const landedIndex = proactiveSelfBriefBlock.indexOf('latest_landed_progress=')
    const openIndex = proactiveSelfBriefBlock.indexOf('primary_open_loop=')
    const nextIndex = proactiveSelfBriefBlock.indexOf('next_closure_target=')
    const driftRiskIndex = proactiveSelfBriefBlock.indexOf('same_her_drift_risk=')

    expect(projectIdentityIndex).toBeGreaterThanOrEqual(0)
    expect(currentPhaseIndex).toBeGreaterThan(projectIdentityIndex)
    expect(preDialogueAwarenessIndex).toBeGreaterThan(currentPhaseIndex)
    expect(sameHerLineIndex).toBeGreaterThan(preDialogueAwarenessIndex)
    expect(sameHerHoldIndex).toBeGreaterThan(sameHerLineIndex)
    expect(landedIndex).toBeGreaterThan(sameHerHoldIndex)
    expect(openIndex).toBeGreaterThan(landedIndex)
    expect(nextIndex).toBeGreaterThan(openIndex)
    expect(driftRiskIndex).toBeGreaterThan(nextIndex)
  })
})
