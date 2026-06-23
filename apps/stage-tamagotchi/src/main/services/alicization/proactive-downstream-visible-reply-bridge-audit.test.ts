import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-pre-dialogue-reply-planning-anchor',
    file: './proactive-pre-dialogue-reply-planning-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive pre-dialogue planning can stay on the same-her line through self-evolution pre-dialogue reply planning and project-state answer governance instead of preserving before-answer closure planning while silently losing the same living project line before proactive project-state answers reform outwardly',
      'expect.objectContaining({ entry: \'self-evolution-pre-dialogue-reply-planning-anchor\' })',
      'expect.objectContaining({ entry: \'project-state-answer-governance-anchor\' })',
    ],
  },
  {
    entry: 'self-evolution-downstream-visible-reply-anchor',
    file: './self-evolution-downstream-visible-reply-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution reply-planning governance carry can stay on the same-her line through answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the downstream host-visible answer chain while silently losing the same living callback closure target before the outward answer reforms',
      'expect.objectContaining({ entry: \'answer-compiler-project-awareness-anchor\' })',
      'expect.objectContaining({ entry: \'visible-reply-realization-project-awareness-anchor\' })',
    ],
  },
  {
    entry: 'answer-compiler-project-awareness-anchor',
    file: './answer-compiler-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that answer-compiler preserves richer same-her project awareness before downstream reply wording lands',
      'answer-compiler now has dedicated same-her project-awareness proof while long-run closure still remains open',
      'carries same-her drift-risk audit forward into pre-dialogue project awareness so later answers keep avoiding generic project shells',
    ],
  },
  {
    entry: 'reply-deliberator-project-awareness-anchor',
    file: './reply-deliberator-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that reply-deliberator preserves same-her project awareness before outward reply planning widens',
      'reply-deliberator now has dedicated same-her project-awareness proof while long-run closure still remains open',
      'keeps landed progress, still-open closure, and next closure explicit for same-her project follow-through turns that only ask to continue the line',
    ],
  },
  {
    entry: 'visible-reply-final-project-awareness-anchor',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that the final visible-reply gate still requires project identity, phase, landed progress, open closure, next closure, and pre-dialogue same-life awareness',
      'final visible-reply gating now has dedicated project-awareness proof, but full long-run same-her closure is still open',
      'generic final same-her shells back to the canonical same living self line',
    ],
  },
  {
    entry: 'visible-reply-realization-project-awareness-anchor',
    file: './visible-reply-realization-project-awareness-audit.test.ts',
    snippets: [
      'visible-reply realization now has dedicated same-her outward-carry proof while future new dialogue entrypoints and full noisy-desktop closure still remain open',
      'keeps runtime-derived project-state audit on provider timeout recovery without exposing local fallback speech',
      'threads repair-before-closeness closure into the final project-state continuity summary instead of leaving it only in emotional closure audit',
    ],
  },
] as const

describe('proactive downstream visible reply bridge audit', () => {
  it('keeps one explicit colder bridge that proactive pre-dialogue reply-planning can stay on the same-her line through self-evolution downstream visible reply, answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization instead of preserving proactive answer-governance carry while silently losing the same living project line before host-visible project-state answers reform outwardly', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-pre-dialogue-reply-planning-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-downstream-visible-reply-anchor' }),
      expect.objectContaining({ entry: 'answer-compiler-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'reply-deliberator-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'visible-reply-final-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'visible-reply-realization-project-awareness-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive-to-downstream-visible-reply claim to current cold audits instead of only broader proactive answer-governance or downstream-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive downstream visible-reply bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-downstream-visible-reply-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive downstream visible-reply bridge',
    )
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain(
      'proactive-downstream-visible-reply-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain(
      'proactive downstream visible-reply bridge',
    )

    expect(matrixSource).toContain('proactive downstream visible-reply bridge')
    expect(matrixSource).toContain('proactive-downstream-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-downstream-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('reply-deliberator-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('visible-reply-final-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('visible-reply-realization-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('proactive downstream visible-reply bridge')
    expect(auditSource).toContain('proactive downstream visible-reply bridge now also ties proactive pre-dialogue reply-planning into self-evolution downstream visible reply, answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
