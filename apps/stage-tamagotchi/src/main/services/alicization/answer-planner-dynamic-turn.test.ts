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

describe('answer planner dynamic turn', () => {
  it('derives answer planning from the current conversation state', () => {
    const dynamicTurn = {
      conversationState: {
        primaryTurnAnchor: '用户正在询问当前记忆是否已经接上。',
        hostMove: '用户正在询问当前记忆是否已经接上。',
      },
    }

    const planner = buildPlanner(dynamicTurn)
    expect(planner.act).toBe('answer')
    expect(planner.governingProject).toBeNull()
    expect(planner.governingFocus).toContain('用户正在询问当前记忆是否已经接上')
    expect(planner.answerIntent).toContain('用户正在询问当前记忆是否已经接上')
    expect(planner.openingMove).toBe('')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
    expect(planner.narrative).toEqual([])
  })
})
