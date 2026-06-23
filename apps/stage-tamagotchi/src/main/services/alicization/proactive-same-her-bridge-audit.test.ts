import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'proactive-entry-self-brief-authority',
    file: './proactive-prelude-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive initiative starts from project-aware same-her self-brief authority before policy and visible hold continue the same Phase 1 line',
      'expect.objectContaining({ entry: \'proactive-entry-self-brief-block\' })',
      'expect.objectContaining({ entry: \'proactive-entry-self-brief-closure-triad\' })',
      'expect.objectContaining({ entry: \'proactive-policy-same-her-restraint\' })',
      'expect.objectContaining({ entry: \'proactive-visible-held-same-her-carry\' })',
    ],
  },
  {
    entry: 'proactive-hover-first-policy-restraint',
    file: './proactive-policy-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive policy preserves same-her Phase 1 restraint, canonical project-state fallback, landed/open/next closure pressure, later-opening anti-shell guardrails, and lower-pressure hover-first continuity instead of widening into a generic assistant nudge',
      'expect.objectContaining({ entry: \'proactive-policy-landed-progress-project-pressure\' })',
      'expect.objectContaining({ entry: \'proactive-policy-later-opening-hover-first\' })',
      'expect.objectContaining({ entry: \'proactive-policy-later-opening-anti-shell\' })',
      'expect.objectContaining({ entry: \'proactive-policy-next-closure-target-pressure\' })',
    ],
  },
  {
    entry: 'proactive-visible-quiet-hold-carry',
    file: './proactive-visible-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
      'expect.objectContaining({ entry: \'visible-proactive-quiet-companionship-hold\' })',
      'expect.objectContaining({ entry: \'visible-proactive-later-opening-next-closure-hold\' })',
      'expect.objectContaining({ entry: \'stream-meta-prefers-visible-proactive-same-her-carry\' })',
      'expect.objectContaining({ entry: \'stream-meta-keeps-quiet-accompaniment-mode\' })',
    ],
  },
  {
    entry: 'initiative-rejoins-active-self-same-line',
    file: './initiative-current-conscious-frame-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that initiative restraint rejoins the active self on the same Phase 1 digital-life line before the turn speaks',
      'expect.objectContaining({ entry: \'initiative-active-loop-memory-handoff-bridge\' })',
      'expect.objectContaining({ entry: \'memory-closure-to-restraint-bridge\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-project-triad\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-emotional-closure-seam\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-thin-shell-repair\' })',
    ],
  },
] as const

describe('proactive same-her bridge audit', () => {
  it('keeps one explicit colder bridge that proactive initiative stays on one same-her Phase 1 line from self-brief authority through hover-first policy, visible quiet hold, and current-conscious-frame rejoin before it opens outward', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-entry-self-brief-authority' }),
      expect.objectContaining({ entry: 'proactive-hover-first-policy-restraint' }),
      expect.objectContaining({ entry: 'proactive-visible-quiet-hold-carry' }),
      expect.objectContaining({ entry: 'initiative-rejoins-active-self-same-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive same-her bridge claim to current route-level audits instead of leaving self-brief, restraint, visible hold, and active-self rejoin as separate islands', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: proactive same-her closure is colder and easier to audit across these four route-level seams, but future runtime-owned dialogue families and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('proactive same-her bridge')
    expect(matrixSource).toContain('proactive-same-her-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-prelude-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('proactive-policy-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('proactive-visible-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('initiative-current-conscious-frame-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toContain('proactive same-her bridge now also ties proactive self-brief authority, hover-first policy restraint, visible quiet hold, and current-conscious-frame rejoin onto one colder same-her project-awareness line')
  })
})
