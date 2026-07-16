import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const removedSelfBriefToken = ['Project', 'SelfBrief'].join('')
const removedOwnerBoundaryToken = ['OWNER', 'BOUNDARY'].join('_')
const removedCanonicalProjectStateToken = ['Canonical', 'ProjectState'].join('')

describe('one-shot Provider boundary audit', () => {
  it('keeps the wrapper source-tagged and auxiliary system context typed-fact-only', () => {
    const source = readFileSync(new URL('./runtime-main-gateway-one-shot.ts', import.meta.url), 'utf8')

    expect(source).toContain('source: AlicizationMainGatewaySource')
    expect(source).toContain('function sanitizeOneShotProviderSystemBlock')
    expect(source).toContain('const parsed = JSON.parse(text)')
    expect(source).toContain('typeof parsed.type !== \'string\'')
    expect(source).toContain('parsed.data === undefined')
    expect(source).toContain('main-gateway.one-shot-missing-source')
    expect(source).toContain('action: \'unregistered-main-gateway-source\'')
    expect(source).not.toContain(removedSelfBriefToken)
    expect(source).not.toContain(removedOwnerBoundaryToken)
    expect(source).not.toContain(removedCanonicalProjectStateToken)
  })

  it('anchors the boundary to behavior tests for caller-owned prompts, typed facts, and transparent failure', () => {
    const source = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('sends only caller-owned system context and returns Provider text without project-state wrapping')
    expect(source).toContain('keeps explicit extra system facts but does not append project governance blocks')
    expect(source).toContain('reports Provider failure through diagnostics instead of fabricating a reply')
    expect(source).toContain('expect(systemTexts).toEqual([memoryFact, \'Return JSON.\'])')
    expect(source).toContain('expect(result).toBeNull()')
  })
})
