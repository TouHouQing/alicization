import { describe, expect, it } from 'vitest'

import { extractExplicitLongTermMemoryEvidence } from './explicit-memory-evidence'

describe('explicit long-term memory evidence', () => {
  it('extracts an explicitly requested user preference without using assistant text', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '记住我喜欢蓝色',
      assistantText: '记住了：你喜欢蓝色。',
    })).toEqual({
      version: 'provider-memory-evidence-v1',
      kind: 'preference',
      summary: '用户喜欢蓝色。',
      reason: '用户明确要求长期记住这项偏好。',
      evidenceSnippets: ['记住我喜欢蓝色'],
      salience: 0.86,
      sensitivity: 'personal',
      confidence: 0.94,
    })
  })

  it('does not turn ordinary conversation, assistant text, or infrastructure failures into memory', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我喜欢蓝色',
      assistantText: '好的。',
    })).toBeNull()
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '你好',
      assistantText: '记住我喜欢蓝色',
    })).toBeNull()
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '记住我喜欢蓝色',
      assistantText: 'Provider 请求失败（HTTP 503）。',
      providerSucceeded: false,
    })).toBeNull()
  })

  it('supports explicit negative preferences and English memory requests', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '请记住我不喜欢香菜',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户不喜欢香菜。',
      evidenceSnippets: ['请记住我不喜欢香菜'],
    }))
    expect(extractExplicitLongTermMemoryEvidence({
      userText: 'Remember that I prefer concise answers',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户偏好 concise answers。',
      evidenceSnippets: ['Remember that I prefer concise answers'],
    }))
  })
})
