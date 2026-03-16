import type { ChatAssistantMessage } from '../types/chat'

import { describe, expect, it } from 'vitest'

import {
  clampStageDialogueOrbRect,
  clampStageDialoguePanelRect,
  resolveStageBubblePlacement,
  resolveStageBubbleText,
  resolveStageDialogueDefaultPanelRect,
} from './stage-dialogue'

function createAssistantMessage(overrides: Partial<ChatAssistantMessage> = {}): ChatAssistantMessage {
  return {
    role: 'assistant',
    content: '',
    slices: [],
    tool_results: [],
    ...overrides,
  }
}

describe('stage dialogue utils', () => {
  it('prefers structured reply for the bubble body', () => {
    const message = createAssistantMessage({
      content: 'raw content',
      structured: {
        thought: 'internal',
        emotion: 'neutral',
        reply: '结构化对白',
        format: 'fallback-v1',
      },
    })

    expect(resolveStageBubbleText(message)).toBe('结构化对白')
  })

  it('keeps only readable text slices and ignores tool metadata', () => {
    const message = createAssistantMessage({
      slices: [
        { type: 'tool-call', toolCall: { toolName: 'weather', args: { city: 'Tokyo' }, toolCallId: 'call-1' } as any },
        { type: 'text', text: '先看了一眼天气。' },
        { type: 'tool-call-result', id: 'call-1', result: { ok: true } },
        { type: 'execution-status', phase: 'tool-running', label: 'Running tool' },
        { type: 'text', text: '现在可以继续聊。' },
      ],
    })

    expect(resolveStageBubbleText(message)).toBe('先看了一眼天气。现在可以继续聊。')
  })

  it('falls back to reply parsed from structured payload text when needed', () => {
    const message = createAssistantMessage({
      content: '{"thought":"hidden","emotion":"neutral","reply":"只展示 reply。"}',
    })

    expect(resolveStageBubbleText(message)).toBe('只展示 reply。')
  })

  it('returns empty text for non assistant messages', () => {
    expect(resolveStageBubbleText({ role: 'user', content: 'hello' })).toBe('')
  })

  it('places the bubble on the right when the model is near or left of center', () => {
    expect(resolveStageBubblePlacement(-24)).toBe('top-right')
    expect(resolveStageBubblePlacement(0)).toBe('top-right')
    expect(resolveStageBubblePlacement(8)).toBe('top-right')
  })

  it('places the bubble on the left when the model is pushed to the right', () => {
    expect(resolveStageBubblePlacement(18)).toBe('top-left')
  })

  it('places the default panel on the right lane without crossing the character safe area', () => {
    const rect = resolveStageDialogueDefaultPanelRect({
      containerWidth: 1200,
      containerHeight: 800,
      characterOffsetX: 0,
      placement: 'top-right',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBeGreaterThan(700)
    expect(rect.width).toBeGreaterThan(300)
  })

  it('keeps dragged panels inside the stage while allowing free horizontal movement', () => {
    const rect = clampStageDialoguePanelRect({
      x: 650,
      y: -30,
      width: 420,
      height: 520,
    }, {
      containerWidth: 1200,
      containerHeight: 800,
      characterOffsetX: 12,
      placement: 'top-left',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBe(650)
    expect(rect.y).toBeGreaterThanOrEqual(18)
    expect(rect.height).toBeLessThanOrEqual(420)
  })

  it('lets the minimized orb travel horizontally across the stage bounds', () => {
    const rect = clampStageDialogueOrbRect({
      x: 1600,
      y: 84,
      width: 340,
      height: 280,
    }, {
      containerWidth: 1200,
      containerHeight: 800,
      characterOffsetX: 18,
      placement: 'top-left',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBe(1110)
    expect(rect.y).toBe(84)
    expect(rect.width).toBe(72)
    expect(rect.height).toBe(72)
  })
})
