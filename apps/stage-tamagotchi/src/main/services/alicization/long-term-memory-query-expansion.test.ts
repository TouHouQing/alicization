import { describe, expect, it } from 'vitest'

import {
  buildCjkCharGramQueries,
  expandLongTermMemoryQuery,
} from './long-term-memory-query-expansion'

describe('long-term memory query expansion', () => {
  it('extracts stable Chinese phrase and char-gram queries for fixed-template corrections', () => {
    const expansion = expandLongTermMemoryQuery({
      rawQuery: '你还记得我不要固定模板回复吗？我需要她数字生命自身的人格回复。',
    })

    expect(expansion.phraseQueries).toEqual(expect.arrayContaining([
      '不要固定模板回复',
      '固定模板',
      '数字生命自身的人格',
    ]))
    expect(expansion.charGramQueries).toEqual(expect.arrayContaining([
      '固定模板',
      '模板回复',
    ]))
    expect(expansion.entityHints.join(' ')).toContain('Alicization 人格 固定模板')
  })

  it('preserves negative cues for same-her versus progress-pressure disambiguation', () => {
    const expansion = expandLongTermMemoryQuery({
      rawQuery: '继续，但这不是催进度，是看她是不是同一个她。',
    })

    expect(expansion.negativeCues).toEqual(expect.arrayContaining(['催进度']))
    expect(expansion.phraseQueries).toEqual(expect.arrayContaining([
      '不是催进度',
      '看她是不是同一个她',
      '同一个她',
    ]))
    expect(expansion.entityHints.join(' ')).toContain('same-her')
  })

  it('does not need whitespace tokenization to make Chinese phrases searchable', () => {
    expect(buildCjkCharGramQueries('不要固定模板回复')).toEqual(expect.arrayContaining([
      '不要固定',
      '固定模板',
      '模板回复',
    ]))
  })
})
