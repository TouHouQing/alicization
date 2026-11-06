import { describe, expect, it } from 'vitest'

import { selectSkills } from '../third-party/codex-skill-selector'
import { canonicalizeToolArguments, repeatedToolReminder } from '../third-party/deepseek-repeat-tool'

describe('adapted Codex skill retrieval', () => {
  const documents = [
    { id: 0, name: 'calendar', shortDescription: 'Schedule meetings', description: 'Calendar events and reminders' },
    { id: 1, name: 'spreadsheet', shortDescription: 'Edit spreadsheets', description: 'Read formulas and workbook cells' },
    { id: 2, name: 'file-save', shortDescription: 'Write files', description: '保存 文件 文档 写入 document' },
  ]
  it('uses field weights and both channels for exact and partial names', () => {
    expect(selectSkills('spreadsheet', documents)[0]).toMatchObject({ id: 1, channels: ['bm25', 'character'] })
    expect(selectSkills('spreadshee', documents)[0]).toMatchObject({ id: 1, channels: ['character'] })
    const weighted = selectSkills('calendar', [documents[0]!, { ...documents[1]!, description: 'calendar '.repeat(50) }])
    expect(weighted[0]?.id).toBe(0)
  })
  it('recalls Chinese intentions without whitespace while excluding unrelated conversation', () => {
    expect(selectSkills('请保存这份文件', documents)[0]?.id).toBe(2)
    expect(selectSkills('今天有点想你', documents)).toEqual([])
    expect(selectSkills('please use the', documents)).toEqual([])
  })
  it('bounds query, candidates, results and UTF8 at deterministic boundaries', () => {
    expect(selectSkills(`${'x'.repeat(4096)} calendar`, documents)).toEqual([])
    expect(selectSkills('calendar', [...Array.from({ length: 1000 }, (_, id) => ({ ...documents[1]!, id })), { ...documents[0]!, id: 1000 }])).toEqual([])
    expect(selectSkills('calendar', Array.from({ length: 80 }, (_, id) => ({ ...documents[0]!, id })), 100)).toHaveLength(50)
    expect(selectSkills('calendar', documents, 0)).toEqual([])
    expect(selectSkills(`${'文'.repeat(1365)}😀 calendar`, documents)).toEqual([])
  })
})

describe('adapted DeepSeek repetition reminder', () => {
  const call = { name: 'inspect', argumentsKey: 'input-hash', observationKey: 'same-output' }
  it('canonicalizes nested JSON property order without losing special keys', () => {
    expect(canonicalizeToolArguments({ b: [{ z: 1, a: 2 }], a: 0 })).toBe('{"a":0,"b":[{"a":2,"z":1}]}')
    expect(canonicalizeToolArguments(JSON.parse('{"__proto__":{"x":1},"a":2}'))).toContain('"__proto__"')
  })
  it('advises at 3, 5 and 8 identical settled observations without disabling tools', () => {
    for (const count of [3, 5, 8])
      expect(repeatedToolReminder(Array.from({ length: count }, () => call))).toMatchObject({ toolName: 'inspect', consecutiveCalls: count })
    expect(repeatedToolReminder([call, call])).toBeNull()
    expect(repeatedToolReminder([call, call, call, call])).toBeNull()
  })
  it('resets when polling makes progress or the input changes', () => {
    expect(repeatedToolReminder([call, call, { ...call, observationKey: 'new-value' }])).toBeNull()
    expect(repeatedToolReminder([call, call, { ...call, argumentsKey: 'new-input' }])).toBeNull()
  })
})
