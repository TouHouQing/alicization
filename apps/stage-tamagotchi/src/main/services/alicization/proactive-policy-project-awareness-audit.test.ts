import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'proactive-policy-phase1-open-loop-restraint',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps proactive initiative tied to the shared Phase 1 digital-life open loop instead of widening into a generic nudge',
      'expect(decision.consideredSignals).toContain(\'projectState.currentPhase\')',
      'expect(decision.reasonCodes).toContain(\'project-phase1-life-loop-open\')',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-canonical-project-state-fallback',
    file: './proactive-policy.test.ts',
    snippets: [
      'falls back to the canonical project-state brief when an explicit proactive projectState is present but too thin to keep the Phase 1 digital-life restraint alive',
      'expect(String(decision.whyNotLater ?? \'\')).not.toContain(\'project_next_closure=pressure\')',
      'expect(decision.reasonCodes).toContain(\'project-phase1-life-loop-open\')',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-landed-progress-project-pressure',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats landed project progress as part of the same Phase 1 proactive restraint instead of needing only an open-loop phrase',
      'expect(decision.consideredSignals).toContain(\'projectState.latestLandedProgress\')',
      'expect(decision.consideredSignals).toContain(\'projectState.nextClosureTarget\')',
      'expect(decision.consideredSignals).toContain(\'projectState.sameHerSelfLine\')',
      'expect(decision.reasonCodes).toContain(\'project-continuity-pressure\')',
    ],
  },
  {
    entry: 'proactive-policy-later-opening-hover-first',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats a later-opening next closure target as a presence-only hold even when initiative and style would otherwise lean outward',
      'expect(decision.presenceOnlyHold).toBe(true)',
      'expect(decision.whyNotLater).toMatch(/project identity|unfinished closure|同一条生命线|measured-return/i)',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-later-opening-anti-shell',
    file: './proactive-policy.test.ts',
    snippets: [
      'forces proactive style back to silent-observe when the next closure target explicitly says wait for a later opening',
      'expect(decision.consideredSignals).toContain(\'projectState.nextClosureTarget\')',
      'expect(decision.whyNotLater).toContain(\'project_next_closure=hover_first\')',
      'expect(decision.whyNow).toContain(\'project_cadence=measured-return\')',
    ],
  },
  {
    entry: 'proactive-policy-thin-open-loop-upgrade-via-same-her-line',
    file: './proactive-policy.test.ts',
    snippets: [
      'upgrades thin project open-loop wording into measured-return proactive restraint when same-her unfinished closure is still explicit on the living line',
      'expect(decision.reasonCodes).toContain(\'project-continuity-pressure\')',
      'expect(decision.reasonCodes).toContain(\'project-measured-return-pressure\')',
      'expect(decision.whyNotLater).toContain(\'measured-return\')',
    ],
  },
  {
    entry: 'proactive-policy-canonical-brief-alone-not-enough',
    file: './proactive-policy.test.ts',
    snippets: [
      'does not let canonical same-her brief text alone upgrade a generic Phase 1 closure carry into same-her proactive pressure',
      'expect(decision.reasonCodes).not.toContain(\'project-continuity-pressure\')',
      'expect(decision.reasonCodes).not.toContain(\'project-measured-return-pressure\')',
      'expect(decision.reasonCodes).toContain(\'project-phase1-life-loop-open\')',
    ],
  },
  {
    entry: 'proactive-policy-richer-phase1-unfinished-closure-governance',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats richer Phase 1 unfinished-closure carry as lower-pressure proactive governance even without the older same-her-baseline mode',
      'summary: \'continuity_hold=lower-pressure; project_state_continuity=active; evidence_id=active-governance-project-state.\'',
      'expect(decision.whyNow).toContain(\'continuity_governance=lower_pressure\')',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-next-closure-target-pressure',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps the next closure target explicit in proactive restraint reasoning when the same-her return still needs to follow one living line',
      'expect(decision.reasonCodes).toContain(\'project-next-closure-pressure\')',
      'expect(decision.whyNow).toContain(\'project_next_closure=pressure\')',
      'expect(decision.whyNow).toContain(\'project_next_closure=hover_first\')',
    ],
  },
] as const

describe('proactive policy project awareness audit', () => {
  it('keeps one explicit route-level proof that proactive policy preserves same-her Phase 1 restraint, canonical project-state fallback, landed/open/next closure pressure, later-opening anti-shell guardrails, and lower-pressure hover-first continuity instead of widening into a generic assistant nudge', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-policy-phase1-open-loop-restraint' }),
      expect.objectContaining({ entry: 'proactive-policy-canonical-project-state-fallback' }),
      expect.objectContaining({ entry: 'proactive-policy-landed-progress-project-pressure' }),
      expect.objectContaining({ entry: 'proactive-policy-later-opening-hover-first' }),
      expect.objectContaining({ entry: 'proactive-policy-later-opening-anti-shell' }),
      expect.objectContaining({ entry: 'proactive-policy-thin-open-loop-upgrade-via-same-her-line' }),
      expect.objectContaining({ entry: 'proactive-policy-canonical-brief-alone-not-enough' }),
      expect.objectContaining({ entry: 'proactive-policy-richer-phase1-unfinished-closure-governance' }),
      expect.objectContaining({ entry: 'proactive-policy-next-closure-target-pressure' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the proactive-policy same-her restraint claim to current behavior tests instead of only broader prelude, visible-hold, or noisy-desktop initiative prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: proactive policy now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactivePolicySource = readFileSync(new URL('./proactive-policy.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-policy-project-awareness-audit.test.ts')
    expect(proactivePolicySource).toContain(
      'keeps proactive initiative tied to the shared Phase 1 digital-life open loop instead of widening into a generic nudge',
    )
    expect(proactivePolicySource).toContain(
      'falls back to the canonical project-state brief when an explicit proactive projectState is present but too thin to keep the Phase 1 digital-life restraint alive',
    )
    expect(proactivePolicySource).toContain(
      'treats landed project progress as part of the same Phase 1 proactive restraint instead of needing only an open-loop phrase',
    )
    expect(proactivePolicySource).toContain(
      'forces proactive style back to silent-observe when the next closure target explicitly says wait for a later opening',
    )
    expect(proactivePolicySource).toContain(
      'does not let canonical same-her brief text alone upgrade a generic Phase 1 closure carry into same-her proactive pressure',
    )
    expect(proactivePolicySource).toContain(
      'treats richer Phase 1 unfinished-closure carry as lower-pressure proactive governance even without the older same-her-baseline mode',
    )
    expect(proactivePolicySource).toContain(
      'keeps the next closure target explicit in proactive restraint reasoning when the same-her return still needs to follow one living line',
    )
  })
})
