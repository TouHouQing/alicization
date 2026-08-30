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

  it('extracts clear natural-language preferences and future reply preferences', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我喜欢蓝色',
      assistantText: '好的。',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户喜欢蓝色。',
      evidenceSnippets: ['我喜欢蓝色'],
    }))
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '请记住，我最近更喜欢用中文交流，回答尽量直接。',
      assistantText: '记住了。',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户最近更喜欢用中文交流，回答尽量直接。',
      evidenceSnippets: ['请记住，我最近更喜欢用中文交流，回答尽量直接。'],
    }))
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '以后回答直接一点',
      assistantText: '好。',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户希望以后回答直接一点。',
      evidenceSnippets: ['以后回答直接一点'],
    }))
  })

  it('extracts a preference when the user asks to remember it as a long-term preference', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '请把这件事作为长期偏好记住：我喜欢蓝色。',
      assistantText: '已记住：你喜欢蓝色。',
    })).toEqual(expect.objectContaining({
      kind: 'preference',
      summary: '用户喜欢蓝色。',
      reason: '用户明确要求长期记住这项偏好。',
      evidenceSnippets: ['请把这件事作为长期偏好记住：我喜欢蓝色。'],
    }))
  })

  it('does not turn questions, assistant text, or infrastructure failures into memory', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我喜欢什么颜色？',
      assistantText: '我还不知道。',
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
