import type { ChatAssistantMessage } from '../types/chat'

import { describe, expect, it } from 'vitest'

import {
  clampStageDialogueOrbRect,
  clampStageDialoguePanelRect,
  resolveStageBubblePlacement,
  resolveStageBubbleText,
  resolveStageDialogueAnchoredPanelRect,
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

const leftCharacterFrame = {
  left: 180,
  right: 520,
  top: 160,
  bottom: 880,
  centerX: 350,
  anchorY: 300,
}

const rightCharacterFrame = {
  left: 980,
  right: 1320,
  top: 150,
  bottom: 900,
  centerX: 1150,
  anchorY: 290,
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

  it('places the bubble on the right when the character is on the left half', () => {
    expect(resolveStageBubblePlacement(leftCharacterFrame, 1600)).toBe('top-right')
  })

  it('places the bubble on the left when the character is on the right half', () => {
    expect(resolveStageBubblePlacement(rightCharacterFrame, 1600)).toBe('top-left')
  })

  it('places the default panel beside the character head on the chosen side', () => {
    const rect = resolveStageDialogueDefaultPanelRect({
      containerWidth: 1600,
      containerHeight: 960,
      characterFrame: leftCharacterFrame,
      placement: 'top-right',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBeGreaterThan(leftCharacterFrame.right)
    expect(rect.y).toBeLessThan(leftCharacterFrame.anchorY)
  })

  it('clamps dragged panels only to the full desktop bounds', () => {
    const rect = clampStageDialoguePanelRect({
      x: 1400,
      y: -32,
      width: 460,
      height: 520,
    }, {
      containerWidth: 1600,
      containerHeight: 900,
      characterFrame: rightCharacterFrame,
      placement: 'top-left',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBeLessThanOrEqual(1600 - 18 - rect.width)
    expect(rect.y).toBe(18)
    expect(rect.height).toBeLessThanOrEqual(420)
  })

  it('keeps the same relative offset when the character moves', () => {
    const firstRect = resolveStageDialogueAnchoredPanelRect({
      containerWidth: 1600,
      containerHeight: 960,
      characterFrame: leftCharacterFrame,
      placement: 'top-right',
      quickReplyEnabled: true,
    }, {
      offset: { x: 32, y: -14 },
      size: { width: 360, height: 280 },
    })

    const movedRect = resolveStageDialogueAnchoredPanelRect({
      containerWidth: 1600,
      containerHeight: 960,
      characterFrame: {
        ...leftCharacterFrame,
        left: leftCharacterFrame.left + 120,
        right: leftCharacterFrame.right + 120,
        centerX: leftCharacterFrame.centerX + 120,
      },
      placement: 'top-right',
      quickReplyEnabled: true,
    }, {
      offset: { x: 32, y: -14 },
      size: { width: 360, height: 280 },
    })

    expect(movedRect.x - firstRect.x).toBe(120)
    expect(movedRect.y).toBe(firstRect.y)
  })

  it('lets the minimized orb travel anywhere inside the desktop bounds', () => {
    const rect = clampStageDialogueOrbRect({
      x: 2000,
      y: 84,
      width: 340,
      height: 280,
    }, {
      containerWidth: 1600,
      containerHeight: 900,
      characterFrame: rightCharacterFrame,
      placement: 'top-left',
      quickReplyEnabled: true,
    })

    expect(rect.x).toBe(1510)
    expect(rect.y).toBe(84)
    expect(rect.width).toBe(72)
    expect(rect.height).toBe(72)
  })
})
