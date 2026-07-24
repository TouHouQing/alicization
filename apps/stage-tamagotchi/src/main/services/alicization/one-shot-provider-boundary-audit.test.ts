import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const retiredSourceTokens = [
  ['Project', 'SelfBrief'].join(''),
  ['OWNER', 'BOUNDARY'].join('_'),
  ['Canonical', 'Project', 'State'].join(''),
] as const

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
    for (const token of retiredSourceTokens)
      expect(source).not.toContain(token)
  })

  it('anchors the boundary to behavior tests for caller-owned prompts, typed facts, and transparent failure', () => {
    const source = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')

    expect(source).toContain('drops caller-owned natural-language system context')
    expect(source).toContain('keeps only typed extra system facts')
    expect(source).toContain('reports Provider failure through diagnostics instead of fabricating a reply')
    expect(source).toContain('expect(systemTexts).toEqual([memoryFact])')
    expect(source).toContain('expect(result).toBeNull()')
  })
})
