import { describe, expect, it } from 'vitest'

import { buildAnswerPlanner } from './answer-planner'

function buildPlanner(overrides: Record<string, unknown> = {}) {
  return buildAnswerPlanner({
    now: 30_000,
    context: {},
    currentScene: null,
    inspectionRequested: false,
    ...overrides,
  } as any)
}

describe('answer planner project awareness regression', () => {
  it('ignores legacy project governance context while preserving dynamic answer planning', () => {
    const dynamicTurn = {
      conversationState: {
        primaryTurnAnchor: '用户正在询问当前记忆是否已经接上。',
        hostMove: '用户正在询问当前记忆是否已经接上。',
      },
    }

    const planner = buildPlanner(dynamicTurn)
    const plannerWithLegacyGovernance = buildPlanner({
      ...dynamicTurn,
      context: {
        projectState: {
          awarenessLine: '这段旧治理文本不应进入回答规划。',
          openingPolicy: '这段旧治理文本不应进入回答规划。',
          relationshipCadence: '这段旧治理文本不应进入回答规划。',
        },
        runtimeGovernance: {
          summary: '这段旧治理文本不应进入回答规划。',
        },
      },
    })

    expect(planner.act).toBe('answer')
    expect(planner.governingProject).toBeNull()
    expect(planner.governingFocus).toContain('用户正在询问当前记忆是否已经接上')
    expect(planner.answerIntent).toContain('用户正在询问当前记忆是否已经接上')
    expect(planner.openingMove).toBe('')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
    expect(planner.narrative).toEqual([])

    expect(plannerWithLegacyGovernance).toEqual(planner)
    expect(plannerWithLegacyGovernance.governingFocus).not.toContain('旧治理文本')
    expect(plannerWithLegacyGovernance.answerIntent).not.toContain('旧治理文本')
    expect(plannerWithLegacyGovernance.openingMove).toBe('')
  })
})
