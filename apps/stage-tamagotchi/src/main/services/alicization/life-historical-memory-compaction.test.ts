import { describe, expect, it } from 'vitest'

import { compactLifeHistoricalMemory } from './life-historical-memory-compaction'

function envelope(timeline: unknown[]) {
  return { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', compressedTimeline: timeline } } }
}

describe('lossless historical memory text projection', () => {
  it('leaves source identity, chronology and similarly named literal objects intact', () => {
    const text = 'Same recorded words, without claiming the two events are the same. '.repeat(20)
    const original = envelope([{ summary: text, sourceTurnIds: [text], occurredAt: 12, corrections: [text], extra: { historicalTextRef: 99 } }, { summary: text, sourceTurnIds: ['other-source'], occurredAt: 24, corrections: ['different correction'] }])
    const result = compactLifeHistoricalMemory(JSON.stringify(original))!
    const projected = JSON.parse(result.content)
    expect(projected.data.historicalTextDictionary.values).toEqual([text])
    expect(projected.data.workingMemory.compressedTimeline).toEqual([{ summary: { h: 0 }, sourceTurnIds: [text], occurredAt: 12, corrections: [{ h: 0 }], extra: { historicalTextRef: 99 } }, { summary: { h: 0 }, sourceTurnIds: ['other-source'], occurredAt: 24, corrections: ['different correction'] }])
    expect(result).toMatchObject({ dictionaryEntries: 1, references: 3 })
    expect(compactLifeHistoricalMemory(result.content)).toBeNull()
  })

  it('does not rewrite unknown protocols, unprofitable dictionaries, or unique facts', () => {
    expect(compactLifeHistoricalMemory('not JSON')).toBeNull()
    expect(compactLifeHistoricalMemory('null')).toBeNull()
    const long = 'Only one actual historical statement. '.repeat(30)
    expect(compactLifeHistoricalMemory(JSON.stringify(envelope([{ summary: long }])))).toBeNull()
    expect(compactLifeHistoricalMemory(JSON.stringify(envelope([{ summary: long, thread: long, corrections: [{ historicalTextRef: 7 }] }])))).toBeNull()
    expect(compactLifeHistoricalMemory(JSON.stringify(envelope([{ summary: 'x'.repeat(80), thread: 'x'.repeat(80) }])))).toBeNull()
    const unknown = envelope([{ summary: long, thread: long }])
    unknown.data.workingMemory.version = 'unknown-version'
    expect(compactLifeHistoricalMemory(JSON.stringify(unknown))).toBeNull()
  })
})
