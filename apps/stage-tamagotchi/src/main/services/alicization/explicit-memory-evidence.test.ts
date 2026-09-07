import { describe, expect, it } from 'vitest'

import { extractExplicitLongTermMemoryEvidence } from './explicit-memory-evidence'
import { createAlicizationKnowledgeAssimilationRuntime } from './knowledge-assimilation-runtime'
import { rankAlicizationMemoryFacts } from './memory-fact-retrieval'

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

  it('extracts an explicit compound memory request containing a project and companionship preference', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '请记住：我最近在做一个本地数字生命项目，晚上更喜欢安静的陪伴。',
      assistantText: '记住了。',
    })).toEqual(expect.objectContaining({
      kind: 'episode',
      summary: expect.stringContaining('本地数字生命项目'),
      evidenceSnippets: ['请记住：我最近在做一个本地数字生命项目，晚上更喜欢安静的陪伴。'],
    }))
  })

  it('does not turn questions, assistant text, or infrastructure failures into memory', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我喜欢什么颜色？',
      assistantText: '我还不知道。',
    })).toBeNull()
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我现在更喜欢什么时候工作？如果不确定请明确说不确定。',
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
    expect(extractExplicitLongTermMemoryEvidence({
      userText: 'Remember that our first shared project was a local digital life experiment.',
    })).toEqual(expect.objectContaining({
      kind: 'episode',
      summary: 'The user our first shared project was a local digital life experiment.',
      evidenceSnippets: ['Remember that our first shared project was a local digital life experiment.'],
    }))
  })

  it('treats a changed preference as a replacement and excludes the expired-tail explanation', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '我改口了，我更喜欢早上工作，之前更喜欢晚上工作。',
    })).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '用户更喜欢早上工作。',
      evidenceSnippets: ['我改口了，我更喜欢早上工作，之前更喜欢晚上工作。'],
      supersedesText: ['晚上工作'],
      claim: {
        subject: 'user',
        predicate: 'prefers',
        object: '用户更喜欢早上工作。',
      },
    }))
  })

  it('turns a natural-language preference correction into a canonical replacement fact', () => {
    const evidence = extractExplicitLongTermMemoryEvidence({
      userText: '我更正一下：我不是喜欢蓝色，我现在更喜欢绿色，蓝色是以前的偏好。',
    })

    expect(evidence).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '用户现在更喜欢绿色。',
      supersedesText: ['蓝色'],
      claim: {
        subject: 'user',
        predicate: 'prefers',
        object: '用户现在更喜欢绿色。',
      },
    }))

    const assimilation = createAlicizationKnowledgeAssimilationRuntime().assimilateMemoryFactsDetailed({
      source: 'rule',
      existingFacts: [{
        id: 'fact-preference-blue',
        subject: 'user',
        predicate: 'prefers',
        object: '用户喜欢蓝色。',
        confidence: 0.94,
        source: 'rule',
        dedupeKey: 'user|prefers|用户喜欢蓝色。',
        createdAt: 1,
        updatedAt: 10,
        lastAccessAt: 11,
        accessCount: 1,
        validationCount: 0,
        contradictionCount: 0,
        memoryDomain: 'relationship',
        knowledgeStage: 'working-understanding',
        validationStatus: 'provisional',
        sourceLabel: 'working-memory-owner:turn-blue',
      }],
      facts: [{
        subject: 'user',
        predicate: 'prefers',
        object: evidence?.summary ?? '',
        confidence: evidence?.confidence ?? 0,
        memoryDomain: 'relationship',
        sourceLabel: 'working-memory-owner:turn-green',
      }],
    })

    expect(assimilation.facts[0]).toEqual(expect.objectContaining({
      object: '用户现在更喜欢绿色。',
      conflictsWith: ['fact-preference-blue'],
      supersedes: ['fact-preference-blue'],
    }))
    expect(assimilation.corrections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetFactId: 'fact-preference-blue',
        nextValidationStatus: 'superseded',
      }),
    ]))

    const ranked = rankAlicizationMemoryFacts({
      query: '我现在喜欢什么颜色',
      limit: 2,
      currentTs: 20,
      facts: [
        {
          id: 'fact-preference-green',
          subject: 'user',
          predicate: 'prefers',
          object: '用户现在更喜欢绿色。',
          confidence: 0.94,
          source: 'rule',
          dedupeKey: 'user|prefers|用户现在更喜欢绿色。',
          createdAt: 20,
          updatedAt: 20,
          lastAccessAt: null,
          accessCount: 0,
          validationStatus: 'provisional',
          knowledgeStage: 'working-understanding',
        },
        {
          id: 'fact-preference-blue',
          subject: 'user',
          predicate: 'prefers',
          object: '用户喜欢蓝色。',
          confidence: 0.94,
          source: 'rule',
          dedupeKey: 'user|prefers|用户喜欢蓝色。',
          createdAt: 1,
          updatedAt: 10,
          lastAccessAt: 11,
          accessCount: 1,
          validationStatus: 'superseded',
          knowledgeStage: 'working-understanding',
        },
      ],
    })

    expect(ranked[0]?.fact.id).toBe('fact-preference-green')
  })

  it('extracts a project fact correction instead of dropping it when the sentence has no preference verb', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '更正一下：项目界面强调色已经从蓝色改成绿色，蓝色是旧信息。',
    })).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '项目界面强调色现在是绿色。',
      evidenceSnippets: ['更正一下：项目界面强调色已经从蓝色改成绿色，蓝色是旧信息。'],
      supersedesText: ['蓝色'],
      claim: {
        subject: '项目界面强调色',
        predicate: 'is',
        object: '绿色',
      },
    }))
  })

  it('extracts a natural correction that names the new value without repeating the old value', () => {
    expect(extractExplicitLongTermMemoryEvidence({
      userText: '刚才说的测试颜色不对，我的测试颜色改成绿色。',
    })).toEqual(expect.objectContaining({
      kind: 'correction',
      summary: '测试颜色现在是绿色。',
      evidenceSnippets: ['刚才说的测试颜色不对，我的测试颜色改成绿色。'],
      claim: {
        subject: '测试颜色',
        predicate: 'is',
        object: '绿色',
      },
    }))
  })
})
