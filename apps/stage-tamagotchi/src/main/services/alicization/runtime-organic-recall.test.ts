import { describe, expect, it } from 'vitest'

import { extractOrganicRecallTerms, isRetrospectiveRecallQuery } from './runtime-organic-recall'

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
})
