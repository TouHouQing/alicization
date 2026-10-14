import type { ChatAssistantMessage } from '../types/chat'

import { describe, expect, it } from 'vitest'

import {
  clampStageDialogueOrbRect,
  clampStageDialoguePanelRect,
  resolveStageBubblePlacement,
  resolveStageBubbleText,
  resolveStageDialogueAnchoredPanelRect,
  resolveStageDialogueDefaultPanelRect,
  resolveStageProactiveFeedbackTarget,
} from './stage-dialogue'

function createAssistantMessage(
  overrides: Partial<ChatAssistantMessage> & { id?: string, createdAt?: number } = {},
): ChatAssistantMessage & { id?: string, createdAt?: number } {
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

  it('returns proactive feedback target only for fresh subconscious proactive bubbles', () => {
    const target = resolveStageProactiveFeedbackTarget(createAssistantMessage({
      id: 'turn-proactive',
      origin: 'subconscious-proactive',
      createdAt: 1_000,
      structured: {
        thought: 'internal',
        emotion: 'neutral',
        reply: '先停一下。',
        format: 'subconscious-proactive-v1',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.92,
          reasonCodes: ['coding-focus'],
          urgency: 'low',
          style: 'light-nudge',
          cooldownMs: 600_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
        },
      },
    }), {
      now: 80_000,
    })

    expect(target).toEqual({
      turnId: 'turn-proactive',
      expiresAt: 91_000,
      feedbackWindowMs: 90_000,
    })
  })

  it('hides proactive feedback target when bubble is stale or lacks proactive metadata', () => {
    const stale = resolveStageProactiveFeedbackTarget(createAssistantMessage({
      id: 'turn-stale',
      origin: 'subconscious-proactive',
      createdAt: 1_000,
      structured: {
        thought: 'internal',
        emotion: 'neutral',
        reply: '提醒一下。',
        format: 'subconscious-proactive-v1',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.84,
          reasonCodes: ['media-playback'],
          urgency: 'low',
          style: 'light-nudge',
          cooldownMs: 600_000,
          scenario: 'media',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
        },
      },
    }), {
      now: 92_000,
    })
    const reminder = resolveStageProactiveFeedbackTarget(createAssistantMessage({
      id: 'turn-reminder',
      origin: 'subconscious-proactive',
      createdAt: 1_000,
      structured: {
        thought: 'internal',
        emotion: 'neutral',
        reply: '该休息了。',
        format: 'subconscious-reminder-v1',
      },
    }), {
      now: 20_000,
    })

    expect(stale).toBeNull()
    expect(reminder).toBeNull()
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

  it('keeps the default dialogue clear of an actual horizontal body and its face', () => {
    const frame = { left: 130, right: 770, top: 320, bottom: 490, centerX: 450, anchorY: 350, head: { x: 160, y: 305, width: 90, height: 90 } }
    for (const placement of ['top-left', 'top-right'] as const) {
      const rect = resolveStageDialogueAnchoredPanelRect({ containerWidth: 900, containerHeight: 760, characterFrame: frame, placement, quickReplyEnabled: true })
      expect(rect.y + rect.height <= frame.top || rect.y >= frame.bottom || rect.x + rect.width <= frame.left || rect.x >= frame.right).toBe(true)
      expect(rect.y + rect.height <= frame.head.y || rect.y >= frame.head.y + frame.head.height || rect.x + rect.width <= frame.head.x || rect.x >= frame.head.x + frame.head.width).toBe(true)
    }
  })

  it('protects the face in a narrow desktop while keeping manual relative offsets usable', () => {
    const frame = { left: 90, right: 360, top: 140, bottom: 500, centerX: 225, anchorY: 180, head: { x: 180, y: 135, width: 90, height: 90 } }
    const input = { containerWidth: 450, containerHeight: 600, characterFrame: frame, placement: 'top-right' as const, quickReplyEnabled: true }
    const rect = resolveStageDialogueAnchoredPanelRect(input, { size: { width: 220, height: 220 } })
    expect(rect.y + rect.height <= frame.head.y || rect.y >= frame.head.y + frame.head.height || rect.x + rect.width <= frame.head.x || rect.x >= frame.head.x + frame.head.width).toBe(true)
    const customized = resolveStageDialogueAnchoredPanelRect(input, { size: { width: 220, height: 220 }, offset: { x: -20, y: -20 } })
    expect(customized.x).toBe(rect.x - 20)
    expect(customized.y).toBe(rect.y - 20)
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
