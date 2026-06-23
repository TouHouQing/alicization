import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'rest-protective-feedback-continuity-signal',
    file: './runtime-session-continuity-builders.test.ts',
    snippets: [
      'keeps rest-protective quiet-companionship closure explicit when settled proactive feedback becomes next-session continuity',
      'expect(signal.summary).toContain(\'cadence=rest-protective\')',
      'expect(signal.summary).toContain(\'resident=quiet-companionship\')',
      'projectStateEmotionalClosureCue: cue',
    ],
  },
] as const

describe('proactive feedback rest-protective next-session carry audit', () => {
  it('keeps one explicit compact proof that settled proactive feedback carries rest-protective quiet-companionship closure into the next-session continuity signal instead of flattening it back to generic measured-return bookkeeping', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'rest-protective-feedback-continuity-signal' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the rest-protective proactive-feedback next-session carry claim to the current continuity builder behavior', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the rest-protective proactive-feedback carry as repo truth while keeping full noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-feedback-rest-protective-next-session-carry-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'rest-protective proactive-feedback next-session carry',
    )

    expect(matrixSource).toContain('proactive-feedback-rest-protective-next-session-carry-audit.test.ts')
    expect(matrixSource).toContain('rest-protective proactive feedback next-session carry')
    expect(auditSource).toContain(
      'rest-protective proactive-feedback next-session carry now also preserves quiet-companionship closure in the settled feedback continuity signal',
    )
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
