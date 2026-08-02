import { describe, expect, it } from 'vitest'

import { buildReplayBenchmarkExpectedMemory } from './replay-benchmark-expected-memory'

describe('replay benchmark expected memory', () => {
  it('uses only Provider-visible surfaces as expected memory evidence', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'assistant surface evidence',
      visibleText: 'visible surface evidence',
      structuredJson: JSON.stringify({
        reply: 'structured Provider reply evidence',
        internalMetadata: {
          text: 'must not become expected memory evidence',
        },
      }),
    })

    expect(result).toContain('assistant surface evidence')
    expect(result).toContain('visible surface evidence')
    expect(result).toContain('structured Provider reply evidence')
    expect(result).not.toContain('must not become expected memory evidence')
  })

  it('ignores invalid structured payloads without losing available visible text', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'available assistant text',
      structuredJson: '{invalid-json',
    })

    expect(result).toBe('available assistant text')
  })

  it('deduplicates overlapping visible surfaces within the replay budget', () => {
    const result = buildReplayBenchmarkExpectedMemory({
      assistantText: 'same visible evidence',
      visibleText: 'same visible evidence',
      structuredJson: JSON.stringify({
        reply: 'same visible evidence',
      }),
    })

    expect(result).toBe('same visible evidence')
  })
})
