import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible reply second-pass data boundary', () => {
  it('does not restore project-state or persona guidance after the first Provider candidate', () => {
    const source = readFileSync(new URL('./visible-reply/second-pass-rewrite.ts', import.meta.url), 'utf8')
    const testSource = readFileSync(new URL('./visible-reply/second-pass-rewrite.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('candidate: string')
    expect(source).toContain('reasonCodes: AlicizationSecondPassReasonCode[]')
    expect(source).toContain('toolFacts: unknown[]')
    expect(source).not.toContain('mustPreserve')
    expect(source).not.toContain('buildProjectStateRewriteGuidance')
    expect(source).not.toContain('buildSecondPassCanonicalProjectStateSystemMessages')
    expect(testSource).toContain('sends only typed dynamic context and the original candidate')
  })
})
