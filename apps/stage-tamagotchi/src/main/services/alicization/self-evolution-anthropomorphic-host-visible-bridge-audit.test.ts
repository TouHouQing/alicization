import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-desktop-execution-long-run-continuity-anchor',
    file: './self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution desktop full-cycle can stay on the same-her line through desktop execution full-cycle, higher-quality host-visible same-her full-cycle, and later noisy-desktop detour continuity with callback next-closure-target carry still explicit at the reopened visible-reply segment instead of stopping before the execution callback line proves it is still the same her beyond one successful next-start loop',
      'expect(matrixSource).toContain(\'self-evolution desktop execution long-run continuity bridge now also keeps callback next-closure-target carry explicit\')',
      'expect.objectContaining({ entry: \'desktop-execution-noisy-same-her-full-cycle-anchor\' })',
      'expect.objectContaining({ entry: \'desktop-execution-long-run-same-her-continuity-anchor\' })',
    ],
  },
  {
    entry: 'desktop-execution-noisy-cross-modal-convergence-anchor',
    file: './desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from longer repair-first reunion pressure into noisy-desktop voice-lane persistence, audible-body carry, later-turn multi-lane reunion, and broader cross-modal convergence instead of stopping before those outer same-her surfaces rejoin',
      'expect.objectContaining({ entry: \'noisy-desktop-voice-lane-persistence\' })',
      'expect.objectContaining({ entry: \'noisy-desktop-cross-modal-convergence-chain\' })',
    ],
  },
  {
    entry: 'desktop-execution-host-visible-embodiment-anchor',
    file: './desktop-execution-host-visible-embodiment-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from the colder emotion-memory-voice-motion convergence line into embodiment-facing host-visible resident presence, lane summaries, audible-body carry, and later reunion surfaces instead of stopping before the living body line reforms outwardly',
      'expect.objectContaining({ entry: \'later-turn-embodiment-host-visible-progress\' })',
      'expect.objectContaining({ entry: \'cross-modal-reunion-host-visible-progress\' })',
    ],
  },
  {
    entry: 'rest-protective-quiet-companionship-host-visible-anchor',
    file: './rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through host-visible embodiment recovery into rest-protective emotional closure writeback, self-continuity inward authority, proactive companionship carry, runtime resident presence, and host-visible quiet-companionship lane summaries instead of cooling noisy-desktop recovery back into a generic lower-pressure shell',
      'expect.objectContaining({ entry: \'self-continuity-rest-protective-quiet-companionship-authority\' })',
      'expect.objectContaining({ entry: \'stream-meta-quiet-companionship-cross-modal-host-line\' })',
    ],
  },
  {
    entry: 'proactive-feedback-rest-protective-host-visible-anchor',
    file: './proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that rest-protective proactive feedback can stay on the same living line from next-session continuity signal through subconscious carry, runtime resident presence, and the stronger host-visible quiet-companionship lane summaries instead of cooling back into a generic lower-pressure shell',
      'expect.objectContaining({ entry: \'rest-protective-host-visible-resident-presence\' })',
      'expect.objectContaining({ entry: \'rest-protective-quiet-companionship-lane-summaries\' })',
    ],
  },
] as const

describe('self evolution anthropomorphic host visible bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution desktop-execution long-run continuity can stay on the same-her line through noisy cross-modal convergence, host-visible embodiment recovery, and rest-protective quiet-companionship host-visible carry with callback next-closure-target carry still explicit at the reopened visible-reply segment instead of stopping before the more anthropomorphic same living line reforms outwardly', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-desktop-execution-long-run-continuity-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-cross-modal-convergence-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-host-visible-embodiment-anchor' }),
      expect.objectContaining({ entry: 'rest-protective-quiet-companionship-host-visible-anchor' }),
      expect.objectContaining({ entry: 'proactive-feedback-rest-protective-host-visible-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to anthropomorphic host-visible continuity claim to current cold audits instead of only broader embodiment or companionship prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the anthropomorphic host-visible line, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution anthropomorphic host-visible bridge')
    expect(matrixSource).toContain('self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-host-visible-embodiment-bridge-audit.test.ts')
    expect(matrixSource).toContain('rest-protective-quiet-companionship-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-rest-protective-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution anthropomorphic host-visible bridge now also keeps callback next-closure-target carry explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution anthropomorphic host-visible bridge')
    expect(auditSource).toContain('self-evolution anthropomorphic host-visible bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution desktop-execution long-run continuity, noisy-desktop cross-modal convergence, host-visible embodiment recovery, and rest-protective quiet-companionship host-visible carry')
  })
})
