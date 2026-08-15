import { describe, expect, it, vi } from 'vitest'

import {
  createWorkingMemoryHistoryOwner,
  workingMemoryHistoryFallbackTurnBudget,
} from './working-memory-history-owner'

describe('working memory history owner', () => {
  it('owns the fallback budget, filtering, and mapping for persisted turns', async () => {
    const listConversationTurnsBySession = vi.fn(async () => [
      {
        turnId: 'turn-outside-budget-1',
        sessionId: 'session-owner',
        userText: '预算外一',
        assistantText: '预算外回答一',
        structuredJson: null,
        createdAt: 1,
      },
      {
        turnId: 'turn-outside-budget-2',
        sessionId: 'session-owner',
        userText: '预算外二',
        assistantText: '预算外回答二',
        structuredJson: null,
        createdAt: 2,
      },
      {
        turnId: 'turn-clean-provider',
        sessionId: 'session-owner',
        userText: '保留普通对话',
        assistantText: '普通 Provider 回复',
        structuredJson: JSON.stringify({
          origin: 'provider',
          learningPolicy: {
            allowLongTermCondensation: true,
            allowPersonaLearning: true,
            allowTraining: true,
          },
        }),
        createdAt: 3,
      },
      {
        turnId: 'turn-failure-surface',
        sessionId: 'session-owner',
        userText: '失败轮',
        assistantText: 'Provider 请求失败',
        structuredJson: JSON.stringify({
          origin: 'failure-surface',
          kind: 'provider-request',
        }),
        createdAt: 4,
      },
      {
        turnId: 'turn-memory-side-failure',
        sessionId: 'session-owner',
        userText: null,
        assistantText: '记忆副作用失败',
        structuredJson: JSON.stringify({
          artifactRole: 'memory-side-failure',
        }),
        createdAt: 5,
      },
      {
        turnId: 'turn-authorization',
        sessionId: 'session-owner',
        userText: '需要授权',
        assistantText: '等待用户授权',
        structuredJson: JSON.stringify({
          origin: 'authorization-surface',
          learningPolicy: {
            allowLongTermCondensation: false,
            allowPersonaLearning: false,
            allowTraining: true,
          },
        }),
        createdAt: 6,
      },
      {
        turnId: 'turn-clean-legacy',
        sessionId: 'session-owner',
        userText: '保留旧格式对话',
        assistantText: '旧格式回答',
        structuredJson: null,
        createdAt: 7,
      },
      {
        turnId: 'turn-empty',
        sessionId: 'session-owner',
        userText: null,
        assistantText: null,
        structuredJson: null,
        createdAt: 8,
      },
    ])
    const owner = createWorkingMemoryHistoryOwner({
      listConversationTurnsBySession,
    })

    const turns = await owner.loadFallback('session-owner')

    expect(listConversationTurnsBySession).toHaveBeenCalledWith(
      'session-owner',
      {
        limit: workingMemoryHistoryFallbackTurnBudget,
      },
    )
    expect(turns.map(turn => turn.turnId)).toEqual([
      'turn-clean-provider',
      'turn-authorization',
      'turn-clean-legacy',
    ])
    expect(turns[0]).toMatchObject({
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
    })
    expect(turns[1]).toMatchObject({
      origin: 'authorization-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
    })
  })
})
