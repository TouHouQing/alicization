import { describe, expect, it } from 'vitest'

import { deriveMainChatActionObligation } from './main-chat-action-obligation'

describe('main chat action obligation', () => {
  it('keeps capability questions and tool names on the model-owned answer path', () => {
    const result = deriveMainChatActionObligation({
      userText: '你可以使用 Codex 吗',
    })

    expect(result).toMatchObject({
      kind: 'answer',
      source: 'dialogue-governance',
    })
    expect(result).not.toHaveProperty('routingIntent')
  })

  it('does not turn an imperative user sentence into a routing authority', () => {
    const result = deriveMainChatActionObligation({
      userText: '帮我执行 ls ~/Desktop',
    })

    expect(result.kind).toBe('answer')
    expect(result).not.toHaveProperty('routingIntent')
  })

  it('keeps structured clarification pressure visible to the main model', () => {
    const result = deriveMainChatActionObligation({
      userText: '这个任务',
      runtimeSurface: {
        dialogue: {
          dialogueEncounter: {
            shouldAskClarifyingQuestion: true,
            summary: '需要补充任务目标',
            confidence: 0.8,
            mustRepairFirst: false,
          },
          currentConsciousFrame: {
            consciousNeed: '需要补充任务目标',
            confidence: 0.7,
          },
          discourseState: {
            owedAction: 'clarify',
          },
        },
      },
    } as any)

    expect(result.kind).toBe('clarify')
    expect(result.reasonCodes).toContain('clarify-before-claiming')
    expect(result).not.toHaveProperty('routingIntent')
  })

  it('keeps structured scene inspection as a diagnostic without selecting a tool', () => {
    const result = deriveMainChatActionObligation({
      userText: '请看看现在的界面',
      runtimeSurface: {
        dialogue: {
          dialogueEncounter: {
            inspectionRequested: true,
            shouldAskClarifyingQuestion: false,
            summary: '当前轮需要场景事实',
            confidence: 0.8,
            inspectionState: 'requested',
          },
          discourseState: {
            owedAction: 'inspect-scene',
          },
          currentConsciousFrame: {
            consciousNeed: '当前轮需要场景事实',
            confidence: 0.7,
          },
        },
      },
    } as any)

    expect(result.kind).toBe('inspect')
    expect(result.reasonCodes).toContain('inspect-scene')
    expect(result).not.toHaveProperty('routingIntent')
  })
})
