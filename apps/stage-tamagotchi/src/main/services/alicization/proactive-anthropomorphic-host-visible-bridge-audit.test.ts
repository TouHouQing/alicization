import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-same-her-outward-line',
    file: './proactive-same-her-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive initiative stays on one same-her Phase 1 line from self-brief authority through hover-first policy, visible quiet hold, and current-conscious-frame rejoin before it opens outward',
      'expect.objectContaining({ entry: \'proactive-entry-self-brief-authority\' })',
      'expect.objectContaining({ entry: \'proactive-hover-first-policy-restraint\' })',
      'expect.objectContaining({ entry: \'proactive-visible-quiet-hold-carry\' })',
      'expect.objectContaining({ entry: \'initiative-rejoins-active-self-same-line\' })',
    ],
  },
  {
    entry: 'proactive-feedback-rest-protective-host-visible-line',
    file: './proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that rest-protective proactive feedback can stay on the same living line from next-session continuity signal through subconscious carry, runtime resident presence, and the stronger host-visible quiet-companionship lane summaries instead of cooling back into a generic lower-pressure shell',
      'expect.objectContaining({ entry: \'rest-protective-runtime-resident-carry\' })',
      'expect.objectContaining({ entry: \'rest-protective-host-visible-resident-presence\' })',
      'expect.objectContaining({ entry: \'rest-protective-quiet-companionship-lane-summaries\' })',
    ],
  },
  {
    entry: 'rest-protective-quiet-companionship-host-visible-line',
    file: './rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through host-visible embodiment recovery into rest-protective emotional closure writeback, self-continuity inward authority, proactive companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries instead of cooling noisy-desktop recovery back into a generic lower-pressure shell',
      'expect.objectContaining({ entry: \'self-continuity-rest-protective-quiet-companionship-authority\' })',
      'expect.objectContaining({ entry: \'visible-rest-protective-companionship-carry\' })',
      'expect.objectContaining({ entry: \'stream-meta-quiet-companionship-cross-modal-host-line\' })',
    ],
  },
  {
    entry: 'same-living-self-host-visible-inward-carry-line',
    file: './same-living-self-host-visible-inward-carry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that restored-session/browser-local reopen persistence handoff, speech-boundary awareness rebuilding, front-stage quick-reply closure, and the dialogue-panel hidden diagnostic boundary all keep the same-her inward project-awareness line available without leaking diagnostic cues into the main bubble',
      'expect.objectContaining({ entry: \'quick-reply-host-visible-same-her-carry\' })',
      'expect.objectContaining({ entry: \'dialogue-panel-hidden-diagnostic-boundary\' })',
      'responsibility).toContain(\'renderer-rejoin-without-body stronger same-her fact\')',
      'responsibility).toContain(\'living audio thread\')',
      'responsibility).toContain(\'quieter living line\')',
    ],
  },
  {
    entry: 'self-evolution-anthropomorphic-host-visible-line',
    file: './self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution desktop-execution long-run continuity can stay on the same-her line through noisy cross-modal convergence, host-visible embodiment recovery, and rest-protective quiet-companionship host-visible carry with callback next-closure-target carry still explicit at the reopened visible-reply segment instead of stopping before the more anthropomorphic same living line reforms outwardly',
      'expect.objectContaining({ entry: \'desktop-execution-noisy-cross-modal-convergence-anchor\' })',
      'expect.objectContaining({ entry: \'rest-protective-quiet-companionship-host-visible-anchor\' })',
      'expect.objectContaining({ entry: \'proactive-feedback-rest-protective-host-visible-anchor\' })',
      'expect(matrixSource).toContain(\'self-evolution anthropomorphic host-visible bridge now also keeps callback next-closure-target carry explicit\')',
    ],
  },
] as const

describe('proactive anthropomorphic host visible bridge audit', () => {
  it('keeps one explicit colder bridge that proactive same-her outward line can stay on the same anthropomorphic host-visible line through rest-protective proactive feedback, quiet-companionship host-visible carry, same-living-self inward carry, and self-evolution anthropomorphic host-visible recovery instead of preserving only project-state facts or a generic lower-pressure shell while the more lived outward line reforms', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-same-her-outward-line' }),
      expect.objectContaining({ entry: 'proactive-feedback-rest-protective-host-visible-line' }),
      expect.objectContaining({ entry: 'rest-protective-quiet-companionship-host-visible-line' }),
      expect.objectContaining({ entry: 'same-living-self-host-visible-inward-carry-line' }),
      expect.objectContaining({ entry: 'self-evolution-anthropomorphic-host-visible-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive to anthropomorphic host-visible continuity claim to current cold audits instead of only broader proactive, embodiment, or companionship prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive anthropomorphic host-visible bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-anthropomorphic-host-visible-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive anthropomorphic host-visible bridge',
    )

    expect(matrixSource).toContain('proactive anthropomorphic host-visible bridge')
    expect(matrixSource).toContain('proactive-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-same-her-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('same-living-self-host-visible-inward-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toContain('proactive anthropomorphic host-visible bridge now also ties proactive same-her outward carry into rest-protective proactive feedback, quiet-companionship host-visible lane summaries, same-living-self host-visible inward carry, and the more anthropomorphic same living host-visible line')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
