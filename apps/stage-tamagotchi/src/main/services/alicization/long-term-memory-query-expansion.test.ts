import { describe, expect, it } from 'vitest'

import {
  buildCjkCharGramQueries,
  expandLongTermMemoryQuery,
} from './long-term-memory-query-expansion'

describe('long-term memory query expansion', () => {
  it('keeps working-memory hints and generic Chinese char-grams without authoring persona-governance queries', () => {
    const expansion = expandLongTermMemoryQuery({
      rawQuery: '你还记得我不要固定模板回复吗？我需要她数字生命自身的人格回复。',
      workingMemoryQueryHints: ['上一轮明确偏好'],
    })

    expect(expansion.phraseQueries).toEqual(['上一轮明确偏好'])
    expect(expansion.charGramQueries).toEqual(expect.arrayContaining([
      '固定模板',
      '模板回复',
    ]))
    expect(expansion.entityHints.join(' ')).not.toMatch(/Alicization 人格|固定模板|身份连续性|关系连续性/u)
  })

  it('preserves negation, temporal, and task signals without expanding continuity slogans', () => {
    const expansion = expandLongTermMemoryQuery({
      rawQuery: '继续昨天的编译任务，但这不是催进度，也不要把用户确认映射成固定检索词。',
    })

    expect(expansion.negativeCues).toEqual(expect.arrayContaining(['催进度']))
    expect(expansion.phraseQueries).toEqual([])
    expect(expansion.entityHints).toEqual(expect.arrayContaining(['开发任务 代码 文档 测试']))
    expect(expansion.entityHints.join(' ')).not.toMatch(/身份连续性|关系连续性|continuity/u)
    expect(expansion.temporalHints).toEqual(expect.arrayContaining(['最近 上次 昨天']))
    expect(expansion.procedureHints).toEqual(expect.arrayContaining(['继续 上次任务 未完成事项']))
  })

  it('does not need whitespace tokenization to make Chinese phrases searchable', () => {
    expect(buildCjkCharGramQueries('不要固定模板回复')).toEqual(expect.arrayContaining([
      '不要固定',
      '固定模板',
      '模板回复',
    ]))
  })
})
