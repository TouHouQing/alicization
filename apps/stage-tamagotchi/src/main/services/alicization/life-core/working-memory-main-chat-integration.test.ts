import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import { buildWorkingMemorySnapshot } from './working-memory-builder'
import {
  buildWorkingMemoryPromptView,
  buildWorkingMemorySystemBlock,
  injectWorkingMemorySystemBlock,
} from './working-memory-prompt-view'

describe('working memory main chat integration helpers', () => {
  it('builds an injectable block from runtime-surface-like state and keeps failure text out', () => {
    const snapshot = buildWorkingMemorySnapshot({
      cardId: 'default',
      sessionId: 'session-main',
      now: 10_000,
      currentUserText: '继续，不要固定模板',
      recentTurns: [{
        turnId: 'turn-old',
        userText: '你是谁',
        assistantText: '超时了。',
        createdAt: 9000,
      }],
      conversationState: {
        jointThread: 'B 线 WorkingMemory',
        hostMove: '继续，不要固定模板',
        primaryTurnAnchor: 'WorkingMemory',
        primaryTurnAnchorSource: 'user-text',
        activeProject: 'WorkingMemory integration',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: ['把短期记忆注入主回复链路'],
        relationFrame: 'repair',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['WorkingMemory'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the current WorkingMemory line.',
        consciousTension: 'No fixed template.',
        speakingIntention: 'Continue the implementation thread.',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.8,
        reasonTags: [],
        updatedAt: 10_000,
      },
    })
    const block = buildWorkingMemorySystemBlock(buildWorkingMemoryPromptView(snapshot))
    const messages = injectWorkingMemorySystemBlock([
      { role: 'system', content: 'SOUL' },
      { role: 'user', content: '继续' },
    ] satisfies Message[], block)

    expect(messages[0]).toEqual({ role: 'system', content: 'SOUL' })
    expect(messages[1]?.role).toBe('system')
    expect(String(messages[1]?.content)).toContain('WorkingMemory short-term memory evidence.')
    expect(String(messages[1]?.content)).toContain('Owner: WorkingMemory. Scope: short-term dialogue.')
    expect(String(messages[1]?.content)).toContain('B 线 WorkingMemory')
    expect(String(messages[1]?.content)).toContain('不要固定模板')
    expect(String(messages[1]?.content)).not.toContain('[ALICIZATION_WORKING_MEMORY]')
    expect(String(messages[1]?.content)).not.toContain('超时了。')
    expect(messages[2]).toEqual({ role: 'user', content: '继续' })
  })
})
