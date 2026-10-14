import { describe, expect, it } from 'vitest'

import { parseImportedCard } from './card-import'

describe('card file import boundary', () => {
  it.each([{}, null, [], { name: '' }, { name: '  ' }, { name: 42 }, { data: {} }, { data: { name: 'QA', alternate_greetings: 'bad' } }, { name: 'QA', data: null }])('rejects malformed files before storage: %j', (input) => {
    expect(() => parseImportedCard(input)).toThrow()
  })
  it('preserves supported plain and wrapped card data including extension metadata', () => {
    const plain = { name: 'QA', version: '1', extensions: { custom: { value: 1 } } }
    const wrapped = { spec: 'chara_card_v3', data: { name: 'QA', alternate_greetings: ['你好'], extensions: { custom: { value: 2 } } } }
    expect(parseImportedCard(plain)).toBe(plain)
    expect(parseImportedCard(wrapped)).toBe(wrapped)
  })
})
