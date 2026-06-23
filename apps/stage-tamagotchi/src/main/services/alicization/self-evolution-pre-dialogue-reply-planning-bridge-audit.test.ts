import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'self-evolution-pre-dialogue-planning-anchor',
    file: './self-evolution-pre-dialogue-planning-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution durable self-recognition can stay on the same-her line through current-conscious-frame grounding and answer-planner pre-dialogue closure planning, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving host-facing self-recognition while silently losing the same living callback closure target before the formally planned outward turn keeps the same living line explicit',
      'self-evolution same-her carry now reaches current-conscious-frame grounding and answer-planner closure planning before the turn opens outward, but still does not prove full long-run closure',
      'expect.objectContaining({ entry: \'answer-planner-project-closure-route-anchor\' })',
    ],
  },
  {
    entry: 'self-evolution-answer-governance-anchor',
    file: './self-evolution-answer-governance-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution host-visible closure-target carry can stay on the same-her line through project-state answer governance, runtime-governance rewrite carry, and visible-reply governance authority, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the outward answer-governance chain while silently losing the same living callback closure target before the chain reforms',
      'project-state answer governance, runtime-governance rewrite carry, and visible-reply governance authority',
      'self-evolution same-her carry now reaches the outward answer-governance chain, but still does not prove full long-run closure',
    ],
  },
  {
    entry: 'answer-planner-project-awareness-anchor',
    file: './answer-planner-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that answer planning preserves same-her Phase 1 project closure, landed/open/next closure accounting, drift-risk guardrails, and same-thread callback continuation instead of flattening into a generic project-report shell',
      'answer planning now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open',
      'same-thread callback continuation',
    ],
  },
  {
    entry: 'response-charter-project-awareness-anchor',
    file: './response-charter-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that response-charter preserves same-her project continuity, drift-risk guardrails, and lower-pressure callback carry before final visible wording is shaped',
      'response-charter now has dedicated same-her project-awareness proof while full long-run closure still remains open',
      'lower-pressure callback carry',
    ],
  },
  {
    entry: 'executive-answer-brief-project-awareness-anchor',
    file: './executive-answer-brief-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that executive-answer-brief preserves same-her project awareness before visible reply wording begins',
      'executive-answer-brief now has dedicated same-her project-awareness proof while long-run closure still remains open',
      'prefers the live current-conscious-frame project awareness when building the executive system brief',
    ],
  },
] as const

describe('self evolution pre dialogue reply planning bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution pre-dialogue planning can stay on the same-her line through answer governance, answer planning, response charter shaping, and executive answer briefing instead of preserving before-answer closure planning while silently losing the same living project line before reply-planning governance reforms outwardly', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-pre-dialogue-planning-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-answer-governance-anchor' }),
      expect.objectContaining({ entry: 'answer-planner-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'response-charter-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'executive-answer-brief-project-awareness-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution pre-dialogue-to-reply-planning claim to current cold audits instead of only broader planning or answer-governance prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the self-evolution pre-dialogue reply-planning bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.proof).toContain(
      'self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'project-state-answer-governance-registration')?.responsibility).toContain(
      'self-evolution pre-dialogue reply-planning bridge',
    )

    expect(matrixSource).toContain('self-evolution pre-dialogue reply-planning bridge')
    expect(matrixSource).toContain('self-evolution-pre-dialogue-reply-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-pre-dialogue-planning-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-answer-governance-bridge-audit.test.ts')
    expect(matrixSource).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('response-charter-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution pre-dialogue reply-planning bridge')
    expect(auditSource).toContain('self-evolution pre-dialogue reply-planning bridge now also ties self-evolution pre-dialogue planning into self-evolution answer governance, answer planning, response charter shaping, and executive answer briefing')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
