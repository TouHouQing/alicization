import { describe, expect, it } from 'vitest'

import { boundLifeProviderRequest, lifeProviderOutputOptions, resolveLifeProviderRequestLimits } from './life-provider-budget'

describe('final life provider budget', () => {
  it('uses the same configured output cap for context reservation and exactly one real provider parameter', () => {
    const limits = resolveLifeProviderRequestLimits({ contextWindowTokens: 8192, maxOutputTokens: 1024, completionTokenField: 'maxCompletionTokens' })
    expect(limits).toMatchObject({ contextTokens: 8192, outputReserve: 1024, contextSource: 'configured' })
    expect(lifeProviderOutputOptions(limits)).toEqual({ maxCompletionTokens: 1024, maxTokens: undefined })
    expect(lifeProviderOutputOptions(resolveLifeProviderRequestLimits())).toEqual({ maxTokens: 4096, maxCompletionTokens: undefined })
    expect(() => resolveLifeProviderRequestLimits({ contextWindowTokens: 4096, maxOutputTokens: 4096 })).toThrow()
    expect(() => resolveLifeProviderRequestLimits({ completionTokenField: 'ignored-field' })).toThrow()
  })
  it('reserves schemas and output, removes complete old exchanges and preserves identity, evidence and the current input', () => {
    const current = '首先不能遗漏这个条件。'.repeat(30)
    const messages = [{ role: 'system' as const, content: 'SOUL exact identity' }, { role: 'user' as const, content: 'old'.repeat(1500) }, { role: 'assistant' as const, content: 'old result' }, { role: 'system' as const, content: JSON.stringify({ lifeRevision: 7, goal: 'unknown' }) }, { role: 'user' as const, content: current }]
    const result = boundLifeProviderRequest(messages, [{ parameters: { description: 'schema'.repeat(100) } }], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })
    expect(result.messages).toEqual([messages[0], messages[3], messages[4]])
    expect(result.report.toolTokens).toBeGreaterThan(600)
    expect(result.report.afterTokens + result.report.toolTokens + 768).toBeLessThanOrEqual(4096)
    expect(result.report.droppedHistory).toHaveLength(2)
  })
  it('fails before generation when protected content cannot fit instead of truncating the start of the user request', () => {
    expect(() => boundLifeProviderRequest([{ role: 'system', content: 'identity' }, { role: 'user', content: '条件'.repeat(1000) }], [], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
  })
  it('identifies protected message sizes without exposing their contents', () => {
    try {
      boundLifeProviderRequest([{ role: 'system', content: 'PRIVATE_IDENTITY'.repeat(1000) }, { role: 'user', content: 'PRIVATE_REQUEST' }], [], { contextTokens: 4096, outputReserve: 512, safetyReserve: 256 })
      throw new Error('The protected request must exceed this budget')
    }
    catch (error) {
      expect(String(error)).toMatch(/budget=\d+, required=\d+, tools=\d+, messages=\[system#0=\d+,user#1=\d+\]/u)
      expect(String(error)).not.toContain('PRIVATE_IDENTITY')
      expect(String(error)).not.toContain('PRIVATE_REQUEST')
    }
  })
})
