import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-answer-governance-anchor',
    file: './self-evolution-answer-governance-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution host-visible closure-target carry can stay on the same-her line through project-state answer governance, runtime-governance rewrite carry, and visible-reply governance authority, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the outward answer-governance chain while silently losing the same living callback closure target before the chain reforms',
      'self-evolution same-her carry now reaches the outward answer-governance chain, but still does not prove full long-run closure',
      'project-state answer governance, runtime-governance rewrite carry, and visible-reply governance authority',
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

describe('self evolution reply planning governance bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution answer-governance carry can stay on the same-her line through answer planning, response charter shaping, and executive answer briefing, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the reply-planning governance chain while silently losing the same living callback closure target before the outward planning chain reforms', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-answer-governance-anchor' }),
      expect.objectContaining({ entry: 'answer-planner-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'response-charter-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'executive-answer-brief-project-awareness-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to reply-planning governance claim to current cold audits instead of only broader answer-governance or downstream-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the reply-planning governance chain, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution reply-planning governance bridge')
    expect(matrixSource).toContain('self-evolution-answer-governance-bridge-audit.test.ts')
    expect(matrixSource).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('response-charter-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution reply-planning governance bridge')
    expect(auditSource).toContain('self-evolution reply-planning governance bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('answer governance, answer planning, response charter shaping, and executive answer briefing')
  })
})
