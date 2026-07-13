import { describe, expect, it } from 'vitest'

import { renderAlicizationMindSurface } from './mind-surface-renderer'

function createGovernance() {
  return {
    decisionTraceId: 'mind-surface:test',
    turnMode: 'answer',
    truthState: 'dialogue-grounded',
    personaKernelMode: 'full',
    openingStyle: 'direct-answer',
    relationshipPosture: 'warm',
    answerSubject: 'general',
    screenReferenceMode: 'avoid',
    answerAct: 'answer',
    evidenceMode: 'dialogue-grounded',
    repairState: 'none',
    liveSurface: null,
    focusAnchor: '你好',
    answerIntent: 'Answer the current dialogue turn.',
    openingMove: 'Answer naturally.',
    carriedThread: null,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: false,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    maxSentences: 3,
    mindMode: 'tracking',
    embodiedPresence: 'attentive',
    emotionalTension: 'calm',
    mustDo: [],
    mustNotDo: [],
  } as any
}

describe('mind surface renderer', () => {
  it('does not locally author visible dialogue moves', () => {
    const result = renderAlicizationMindSurface({
      governance: createGovernance(),
      userText: '你好',
      moves: [
        {
          kind: 'dialogue',
          mode: 'plain',
          focus: '你好',
        },
      ],
    })

    expect(result.reply).toContain('对话回复链路没有产出模型文本')
    expect(result.reply).toContain('本地 mind surface 不代写')
    expect(result.reply).not.toMatch(/我直接|我听见|我先|All right|I heard|I'll answer|I am bringing/iu)
  })

  it('does not locally author greeting identity capability or repair prose', () => {
    const riskyMoves = [
      { kind: 'greeting', salutation: '你好', presenceCheck: true },
      { kind: 'identity', name: 'Alice', repeated: true },
      { kind: 'capability', capabilities: ['读文件', '运行命令'] },
      { kind: 'presence-repair' },
    ] as const

    for (const move of riskyMoves) {
      const result = renderAlicizationMindSurface({
        governance: createGovernance(),
        userText: '你好',
        moves: [move as any],
      })

      expect(result.reply).toContain('没有产出模型文本')
      expect(result.reply).toContain('本地 mind surface 不代写')
      expect(result.reply).not.toMatch(/我接住|我是|我能|我把|I caught|I am Alice|I can|I am dropping/iu)
    }
  })

  it('does not locally author execution listing or execution detail replies', () => {
    const riskyMoves = [
      {
        kind: 'execution-listing',
        scope: 'desktop',
        count: 2,
        previewItems: ['secret.txt', 'project'],
        extraCount: 0,
        mode: 'callback',
      },
      {
        kind: 'execution-detail',
        status: 'completed',
        detail: '构建完成',
        summary: '构建完成',
        channelLabel: 'CLI',
        mode: 'callback',
      },
    ] as const

    for (const move of riskyMoves) {
      const result = renderAlicizationMindSurface({
        governance: createGovernance(),
        userText: '执行结果怎么样',
        moves: [move as any],
      })

      expect(result.reply).toContain('没有产出模型文本')
      expect(result.reply).toContain('本地 mind surface 不代写')
      expect(result.reply).not.toContain('secret.txt')
      expect(result.reply).not.toContain('构建完成')
    }
  })

  it('does not locally author follow-up or capability repair replies', () => {
    const riskyMoves = [
      {
        kind: 'follow-up',
        variant: 'continue',
        anchor: '继续刚才的话题',
      },
      {
        kind: 'repair',
        target: 'capability',
        capabilities: ['读文件', '运行命令'],
      },
    ] as const

    for (const move of riskyMoves) {
      const result = renderAlicizationMindSurface({
        governance: createGovernance(),
        userText: '继续',
        moves: [move as any],
      })

      expect(result.reply).toContain('没有产出模型文本')
      expect(result.reply).toContain('本地 mind surface 不代写')
      expect(result.reply).not.toMatch(/我能|I can|继续刚才/u)
    }
  })
})
