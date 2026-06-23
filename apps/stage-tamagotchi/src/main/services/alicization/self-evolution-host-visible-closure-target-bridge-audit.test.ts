import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-long-run-follow-through-anchor',
    file: './self-evolution-long-run-follow-through-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution governance can stay on the same-her line through session-runtime follow-through, longer-run continuity, noisy-desktop initiative restraint, and noisy-desktop life-loop unity, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the broader long-run desktop line while silently losing the same living callback closure target before it reforms beyond devtools governance',
      'self-evolution governance now bridges into same-thread follow-through and longer-run noisy-desktop continuity, but still does not prove full long-run closure',
      'noisy-desktop initiative restraint, and noisy-desktop life-loop unity',
    ],
  },
  {
    entry: 'planner-to-host-visible-answer-anchor',
    file: './proactive-feedback-host-visible-answer-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line all the way into host-visible answer shaping after the long-horizon self-carry boundary',
      'expect.objectContaining({ entry: \'visible-reply-final-gate-route\' })',
      'expect.objectContaining({ entry: \'host-visible-fast-path-answer-anti-shell-carry\' })',
    ],
  },
  {
    entry: 'desktop-execution-noisy-same-her-closure-anchor',
    file: './desktop-execution-noisy-same-her-closure-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through noisy-desktop subsystem unity into host-visible same-her closure instead of stopping before the answer contract states what Alicization is, what Phase 1 has landed, and what remains open',
      'expect.objectContaining({ entry: \'planner-to-host-visible-answer-anti-shell-bridge\' })',
      'expect.objectContaining({ entry: \'noisy-desktop-same-her-closure-target\' })',
    ],
  },
  {
    entry: 'noisy-desktop-closure-target-anchor',
    file: './noisy-desktop-same-her-closure-audit.test.ts',
    snippets: [
      'keeps the desktop continuity target explicit as what the project is, how far phase 1 has landed, and what is still open',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
      'Emotion, memory, initiative, and embodiment still need to close as one same-life seam.',
    ],
  },
] as const

describe('self evolution host-visible closure target bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution long-run follow-through can stay on the same-her line through host-visible answer anti-shell carry, desktop execution noisy same-her closure, and the explicit closure-target answer contract, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the outward project-state answer chain while silently losing the same living callback closure target before the outward closure-target answers reform', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-long-run-follow-through-anchor' }),
      expect.objectContaining({ entry: 'planner-to-host-visible-answer-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-same-her-closure-anchor' }),
      expect.objectContaining({ entry: 'noisy-desktop-closure-target-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to host-visible closure-target claim to current cold audits instead of only broader long-run or answer-shaping prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her governance now reaches the outward closure-target answer contract, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution host-visible closure target bridge')
    expect(matrixSource).toContain('self-evolution-long-run-follow-through-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-host-visible-answer-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-noisy-same-her-closure-bridge-audit.test.ts')
    expect(matrixSource).toContain('noisy-desktop-same-her-closure-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution host-visible closure target bridge')
    expect(auditSource).toContain('self-evolution host-visible closure target bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('devtools governance, longer-run continuity, host-visible answer carry, and closure-target answer contract')
  })
})
