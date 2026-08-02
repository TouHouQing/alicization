import { describe, expect, it } from 'vitest'

import { buildAnswerPlanner } from './answer-planner'

function buildCompiledPlanner() {
  return buildAnswerPlanner({
    now: 1,
    context: {} as any,
    currentScene: null,
    inspectionRequested: false,
    conversationState: {
      primaryTurnAnchor: '用户当前正在问记忆为什么没有接上。',
      hostMove: '用户当前正在问记忆为什么没有接上。',
    } as any,
    replyDeliberation: {
      openingBeat: '从当前问题开始。',
      whyThisReplyNow: '用户当前正在问记忆为什么没有接上。',
    } as any,
    answerCompiler: {
      recommendedAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.82,
      relationshipPosture: 'warm',
      openingClaim: '用户当前正在问记忆为什么没有接上。',
      openingDirective: '固定 opening 模板不应进入 planner。',
      nextMove: '固定 next move 模板不应进入 planner。',
      mustDo: ['固定 mustDo 不应进入 planner。'],
      mustNotDo: ['固定 mustNotDo 不应进入 planner。'],
      narrative: ['固定 narrative 不应进入 planner。'],
    } as any,
  })
}

describe('answer-planner template independence', () => {
  it('keeps only dynamic turn anchors in the compiled planner', () => {
    const planner = buildCompiledPlanner()

    expect(planner.governingProject).toBeNull()
    expect(planner.governingFocus).toContain('用户当前正在问记忆为什么没有接上')
    expect(planner.openingMove).toBe('从当前问题开始。')
    expect(planner.answerIntent).toContain('用户当前正在问记忆为什么没有接上')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
    expect(planner.narrative).toEqual([])
  })

  it('does not synthesize fixed emotional opening or rule text without a dynamic plan', () => {
    const planner = buildAnswerPlanner({
      now: 2,
      context: {} as any,
      currentScene: null,
      inspectionRequested: false,
      privateThought: {
        shouldSpeak: true,
        stance: 'care',
        emotionalTension: 'late-night-drain',
        confidence: 0.72,
      } as any,
      dialogueObligation: {
        kind: 'care',
        summary: '用户说自己很累。',
        mustAnswerDirectly: true,
      } as any,
      conversationState: {
        primaryTurnAnchor: '用户说自己很累。',
        hostMove: '用户说自己很累。',
      } as any,
    })

    expect(planner.act).toBe('care')
    expect(planner.governingFocus).toContain('用户说自己很累')
    expect(planner.openingMove).toBe('')
    expect(planner.answerIntent).toContain('用户说自己很累')
    expect(planner.mustDo).toEqual([])
    expect(planner.mustNotDo).toEqual([])
    expect(planner.narrative).toEqual([])
  })
})
