import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-host-visible-closure-target-anchor',
    file: './self-evolution-host-visible-closure-target-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution long-run follow-through can stay on the same-her line through host-visible answer anti-shell carry, desktop execution noisy same-her closure, and the explicit closure-target answer contract, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the outward project-state answer chain while silently losing the same living callback closure target before the outward closure-target answers reform',
      'self-evolution same-her governance now reaches the outward closure-target answer contract, but still does not prove full long-run closure',
      'host-visible answer anti-shell carry, desktop execution noisy same-her closure, and the explicit closure-target answer contract',
    ],
  },
  {
    entry: 'project-state-answer-governance-anchor',
    file: './project-state-answer-governance-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that project-state answer governance preserves same-her merge-readiness boundaries across authority, fast-path follow-up classification, provider-facing rebuild, executive answer briefing, and host-visible normalization',
      'keeps one explicit route-level proof that project-state answer governance preserves same-her completion-timing and language-drift follow-ups across semantics classification, fast-path follow-up classification, answer planning, response charter shaping, executive answer briefing, provider-facing runtime rebuild, and host-visible normalization',
      'future project-status answer surfaces still remain open',
    ],
  },
  {
    entry: 'runtime-governance-project-awareness-anchor',
    file: './runtime-governance-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime-governance preserves same-her project continuity and bounded rewrite carry before visible reply wording widens outward',
      'preserves stronger same-her project continuity carry inside governed rewrite requests instead of flattening back to a thinner pre-dialogue reminder',
      'runtime-governance now has dedicated same-her project-awareness proof while long-run closure still remains open',
    ],
  },
  {
    entry: 'visible-reply-governance-authority-anchor',
    file: './visible-reply-governance-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that visible-reply governance keeps normal mind authority distinct from rewrite takeover authority',
      'visible-reply governance now has dedicated authority proof while long-run closure still remains open',
      'rewrite takeover authority',
    ],
  },
] as const

describe('self evolution answer governance bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution host-visible closure-target carry can stay on the same-her line through project-state answer governance, runtime-governance rewrite carry, and visible-reply governance authority, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the outward answer-governance chain while silently losing the same living callback closure target before the chain reforms', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-host-visible-closure-target-anchor' }),
      expect.objectContaining({ entry: 'project-state-answer-governance-anchor' }),
      expect.objectContaining({ entry: 'runtime-governance-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'visible-reply-governance-authority-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to answer-governance claim to current cold audits instead of only broader host-visible or reply-governance prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the outward answer-governance chain, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution answer governance bridge')
    expect(matrixSource).toContain('self-evolution-host-visible-closure-target-bridge-audit.test.ts')
    expect(matrixSource).toContain('project-state-answer-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('visible-reply-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution answer governance bridge')
    expect(auditSource).toContain('self-evolution answer governance bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('host-visible closure-target carry, answer governance, runtime rewrite carry, and visible-reply authority')
  })
})
