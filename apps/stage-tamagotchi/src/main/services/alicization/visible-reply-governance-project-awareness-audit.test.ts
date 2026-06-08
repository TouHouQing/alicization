import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'visible-reply-governance-structured-mind-authority',
    file: './visible-reply/governance-audit.test.ts',
    snippets: [
      'uses explicit LLM authority names instead of assistant-structured',
      'visibleReplyAuthority: \'llm-mind-structured\'',
      'visibleReplyRealizationAuthority: \'llm-mind\'',
    ],
  },
  {
    entry: 'visible-reply-governance-rewrite-takeover-authority',
    file: './visible-reply/governance-audit.test.ts',
    snippets: [
      'marks takeover as second-pass rewrite request',
      'visibleReplyAuthority: \'llm-second-pass-rewrite-request\'',
      'visibleReplyRealizationAuthority: \'llm-second-pass-rewrite\'',
    ],
  },
] as const

describe('visible reply governance project awareness audit', () => {
  it('keeps one explicit route-level proof that visible-reply governance keeps normal mind authority distinct from rewrite takeover authority', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'visible-reply-governance-structured-mind-authority' }),
      expect.objectContaining({ entry: 'visible-reply-governance-rewrite-takeover-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the visible-reply-governance authority claim to current behavior tests instead of broader reply/governance prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: visible-reply governance now has dedicated authority proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('visible-reply-governance-project-awareness-audit.test.ts')
    expect(auditSource).toContain('visible-reply-governance-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('visible-reply-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
