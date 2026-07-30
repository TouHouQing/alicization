import { describe, expect, it } from 'vitest'

import {
  extractOrganicRecallTerms,
  isRetrospectiveRecallQuery,
  selectPromptActiveThoughts,
} from './runtime-organic-recall'

describe('runtime organic recall helpers', () => {
  it('detects retrospective dialogue recall questions', () => {
    expect(isRetrospectiveRecallQuery('前几天我们聊过什么来着')).toBe(true)
    expect(isRetrospectiveRecallQuery('what did we talk about a few days ago')).toBe(true)
    expect(isRetrospectiveRecallQuery('现在屏幕上是什么')).toBe(false)
  })

  it('extracts temporal recall anchors without collapsing them into stopwords', () => {
    const terms = extractOrganicRecallTerms('前几天我们聊过 runtime continuity 和 proactive feedback')
    expect(terms).toEqual(expect.arrayContaining(['前几天我们聊过', 'runtime', 'continuity', 'proactive', 'feedback']))
  })

  it('keeps recent working-memory thoughts when the long-term recall seed does not match', () => {
    const activeThoughts = [
      { id: 'thought-1', text: '先继续当前对话。', createdAt: 1, updatedAt: 10 },
      { id: 'thought-2', text: '用户刚才在确认短期记忆。', createdAt: 2, updatedAt: 20 },
      { id: 'thought-3', text: '保持当前任务线索。', createdAt: 3, updatedAt: 30 },
    ]

    expect(selectPromptActiveThoughts({
      activeThoughts,
      recallSeed: '完全无关的远期项目历史',
      recalledFragments: [],
    })).toEqual([
      activeThoughts[2],
      activeThoughts[1],
      activeThoughts[0],
    ])
  })

  it('ranks matching thoughts first without dropping recent unmatched working memory', () => {
    const activeThoughts = [
      { id: 'thought-match', text: '继续检查 embedding provider 连接。', createdAt: 1, updatedAt: 10 },
      { id: 'thought-recent-1', text: '用户刚刚补充了一个当前要求。', createdAt: 2, updatedAt: 40 },
      { id: 'thought-recent-2', text: '短期对话仍然需要保持连续。', createdAt: 3, updatedAt: 30 },
      { id: 'thought-old', text: '较早的一条无关思绪。', createdAt: 4, updatedAt: 5 },
    ]

    expect(selectPromptActiveThoughts({
      activeThoughts,
      recallSeed: 'embedding provider',
      recalledFragments: [],
    })).toEqual([
      activeThoughts[0],
      activeThoughts[1],
      activeThoughts[2],
    ])
  })
})
