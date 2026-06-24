import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-noisy-life-loop-unity-bridge',
    file: './desktop-execution-noisy-life-loop-unity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through next start, dream carry, long-horizon self-carry, and later noisy-desktop subsystem unity instead of stopping before personality, memory, initiative, and embodiment reconverge',
      'expect.objectContaining({ entry: \'long-horizon-self-carry-into-noisy-desktop-pressure\' })',
      'expect.objectContaining({ entry: \'noisy-desktop-life-loop-unity\' })',
    ],
  },
  {
    entry: 'planner-to-host-visible-answer-anti-shell-bridge',
    file: './proactive-feedback-host-visible-answer-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line all the way into host-visible answer shaping after the long-horizon self-carry boundary',
      'expect.objectContaining({ entry: \'visible-reply-final-gate-route\' })',
      'expect.objectContaining({ entry: \'host-visible-fast-path-answer-anti-shell-carry\' })',
    ],
  },
  {
    entry: 'noisy-desktop-same-her-closure-target',
    file: './noisy-desktop-same-her-closure-audit.test.ts',
    snippets: [
      'keeps the desktop continuity target explicit as what the project is, how far phase 1 has landed, and what is still open',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
      'Emotion, memory, initiative, and embodiment still need to close as one same-life seam.',
    ],
  },
] as const

describe('desktop execution noisy same-her closure bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue through noisy-desktop subsystem unity into host-visible same-her closure instead of stopping before the answer contract states what Alicization is, what Phase 1 has landed, and what remains open', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-noisy-life-loop-unity-bridge' }),
      expect.objectContaining({ entry: 'planner-to-host-visible-answer-anti-shell-bridge' }),
      expect.objectContaining({ entry: 'noisy-desktop-same-her-closure-target' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-host-visible same-her closure claim to current execution unity, host-visible answer shaping, and closure-target audits instead of only broader noisy-desktop continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution noisy same-her closure bridge as repo truth while keeping fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('desktop-execution-noisy-same-her-closure-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('desktop execution noisy same-her closure bridge')

    expect(matrixSource).toContain('desktop-execution-noisy-same-her-closure-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution noisy same-her closure bridge')
    expect(auditSource).toContain('desktop execution noisy same-her closure bridge now also ties execution callback continuity through noisy-desktop subsystem unity into host-visible same-her closure')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
