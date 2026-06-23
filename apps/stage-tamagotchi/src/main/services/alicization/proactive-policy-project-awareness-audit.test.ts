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
      'expect(decision.reasonCodes).toContain(\'project-next-closure-pressure\')',
      'expect(String(decision.whyNotLater ?? \'\')).toMatch(/数字生命 Phase 1|闭环|人格连续性|记忆与主动性/i)',
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
      'expect(decision.reasonCodes).toContain(\'project-same-her-pressure\')',
    ],
  },
  {
    entry: 'proactive-policy-later-opening-hover-first',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats a later-opening next closure target as a presence-only hold even when initiative and style would otherwise lean outward',
      'expect(decision.presenceOnlyHold).toBe(true)',
      'expect(decision.whyNotLater).toMatch(/later opening|same living line|measured-return/i)',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-later-opening-anti-shell',
    file: './proactive-policy.test.ts',
    snippets: [
      'forces proactive style back to silent-observe when the next closure target explicitly says wait for a later opening',
      'expect(decision.consideredSignals).toContain(\'projectState.nextClosureTarget\')',
      'expect(decision.whyNotLater).toMatch(/landed|unfinished closure|next closure target|同一条生命线/i)',
      'expect(decision.whyNow).toMatch(/还没有真正闭环|life loop|未闭环|unfinished closure|still-open closure/i)',
    ],
  },
  {
    entry: 'proactive-policy-thin-open-loop-upgrade-via-same-her-line',
    file: './proactive-policy.test.ts',
    snippets: [
      'upgrades thin project open-loop wording into measured-return proactive restraint when same-her unfinished closure is still explicit on the living line',
      'expect(decision.reasonCodes).toContain(\'project-same-her-pressure\')',
      'expect(decision.reasonCodes).toContain(\'project-measured-return-pressure\')',
      'expect(String(decision.whyNotLater ?? \'\')).toMatch(/cross-modal same-her proof|同一条生命线|same living line|Phase 1/i)',
    ],
  },
  {
    entry: 'proactive-policy-canonical-brief-alone-not-enough',
    file: './proactive-policy.test.ts',
    snippets: [
      'does not let canonical same-her brief text alone upgrade a generic Phase 1 closure carry into same-her proactive pressure',
      'expect(decision.reasonCodes).not.toContain(\'project-same-her-pressure\')',
      'expect(decision.reasonCodes).not.toContain(\'project-measured-return-pressure\')',
      'expect(decision.reasonCodes).toContain(\'project-phase1-life-loop-open\')',
    ],
  },
  {
    entry: 'proactive-policy-richer-phase1-unfinished-closure-governance',
    file: './proactive-policy.test.ts',
    snippets: [
      'treats richer Phase 1 unfinished-closure carry as lower-pressure proactive governance even without the older same-her-baseline mode',
      'summary: \'Phase 1: Local Digital Life | project identity carry is still live, and memory, initiative, and embodiment still belong to one same living line of unfinished closure before any wider reopening.\'',
      'expect(String(decision.whyNow ?? \'\')).toMatch(/same living line|same digital life|unfinished closure|更像还是同一个她/i)',
      'expect(decision.style).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'proactive-policy-next-closure-target-pressure',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps the next closure target explicit in proactive restraint reasoning when the same-her return still needs to follow one living line',
      'expect(decision.reasonCodes).toContain(\'project-next-closure-pressure\')',
      'expect(decision.whyNow).toContain(\'next closure target\')',
      'expect(decision.whyNow).toContain(\'hover-first initiative\')',
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
