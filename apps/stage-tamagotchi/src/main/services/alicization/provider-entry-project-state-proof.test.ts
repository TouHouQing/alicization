import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('second-pass provider entry boundary', () => {
  it('keeps project-state guidance out of the data-only Provider retry', () => {
    const source = readFileSync(new URL('./visible-reply/second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(source).toContain('responseFormat: alicizationProviderResponseFormat')
    expect(source).toContain('type: \'alicization-second-pass-context\'')
    expect(source).toContain('memoryContext: input.prepared.memoryContext')
    expect(source).toContain('identityFacts: readDynamicIdentityFacts(input.prepared)')
    expect(source).toContain('relationshipFacts: readDynamicRelationshipFacts(input.prepared)')
    expect(source).toContain('emotionFacts: readDynamicEmotionFacts(input.prepared)')
    expect(source).toContain('toolFacts: input.toolFacts')
    expect(source).not.toContain('buildSecondPassCanonicalProjectStateSystemMessages')
    expect(source).not.toContain('buildProjectStateRewriteGuidance')
    expect(source).not.toContain('canonicalProjectStateSystemMessages')
  })
})
