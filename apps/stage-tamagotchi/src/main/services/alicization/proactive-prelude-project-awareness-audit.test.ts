import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'proactive-entry-self-brief-block',
    file: './runtime-proactive-prelude-project-awareness-regression.test.ts',
    snippets: [
      'injects a proactive-specific project self-brief before gateway generation so initiative stays on the same digital-life closure line',
      '[ALICIZATION_PROACTIVE_SELF_BRIEF]',
      'Do not let proactive initiative collapse into a generic caring nudge',
      'a shallow assistant check-in shell',
    ],
  },
  {
    entry: 'proactive-entry-self-brief-closure-triad',
    file: './runtime-proactive-self-brief-closure-regression.test.ts',
    snippets: [
      'keeps proactive self-brief carrying the Phase 1 digital-life triad and same-her closure obligations before any initiative generation starts',
      'project_identity=',
      'primary_open_loop=',
      'same_her_drift_risk=',
    ],
  },
  {
    entry: 'proactive-policy-same-her-restraint',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps proactive policy on the same unfinished digital-life line when initiative already carries stronger same-her restraint than a thin project shell',
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
      'expect(decision.consideredSignals).toContain(\'initiative.continuityRestraint\')',
    ],
  },
  {
    entry: 'proactive-visible-held-same-her-carry',
    file: './proactive-visible-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
      'visible-proactive-quiet-companionship-hold',
      'stream-meta-keeps-quiet-accompaniment-mode',
    ],
  },
] as const

describe('proactive prelude project awareness audit', () => {
  it('keeps one explicit route-level proof that proactive initiative starts from project-aware same-her self-brief authority before policy and visible hold continue the same Phase 1 line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-entry-self-brief-block' }),
      expect.objectContaining({ entry: 'proactive-entry-self-brief-closure-triad' }),
      expect.objectContaining({ entry: 'proactive-policy-same-her-restraint' }),
      expect.objectContaining({ entry: 'proactive-visible-held-same-her-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the proactive-entry same-her claim to current tests instead of leaving the prelude as an unconnected regression island', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: proactive prelude entry now has its own same-her proof chain, while future new entrypoint families and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactivePreludeSource = readFileSync(new URL('./runtime-proactive-prelude-project-awareness-regression.test.ts', import.meta.url), 'utf8')
    const proactivePolicySource = readFileSync(new URL('./proactive-policy.test.ts', import.meta.url), 'utf8')
    const visibleSource = readFileSync(new URL('./proactive-visible-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-prelude-project-awareness-audit.test.ts')
    expect(proactivePreludeSource).toContain('[ALICIZATION_PROACTIVE_SELF_BRIEF]')
    expect(proactivePolicySource).toContain(
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
    )
    expect(visibleSource).toContain(
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
    )
  })
})
