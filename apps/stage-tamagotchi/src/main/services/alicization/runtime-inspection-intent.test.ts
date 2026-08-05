import type { AlicizationPerceptionState } from './attention-anchor'

import { describe, expect, it } from 'vitest'

import { createAlicizationInspectionIntentRuntime } from './runtime-inspection-intent'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createInspectionIntentRuntime() {
  return createAlicizationInspectionIntentRuntime({
    normalizeOrganicRecallText: raw => String(raw ?? '').trim(),
    readLatestAssistantMessageText: (messages) => {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const message = messages[index]
        if (message?.role === 'assistant')
          return String(message.content ?? '')
      }
      return ''
    },
    readTransportContentAsText: (content) => {
      if (typeof content === 'string')
        return content
      return ''
    },
  })
}

function createInspectionCarryState(): AlicizationPerceptionState {
  return {
    attentionAnchor: null,
    lastNonSelfForegroundTarget: null,
    recentObservations: [],
    invitedInspection: {
      requestedAt: 1_000,
      activeUntil: 5_000,
      hintText: '帮我看看 Cursor 里面这个 diff 有什么问题',
    },
    recentSceneResidue: {
      observedAt: 1_500,
      source: 'invited-inspection',
      workloadKind: 'coding',
      contentKind: 'diff',
      summary: 'Cursor diff review',
      confidence: 0.86,
      focusTarget: {
        appName: 'Cursor',
        processName: 'Cursor',
        title: 'main.ts - diff',
      },
      focusSource: 'capture-source',
      captureSourceName: 'main.ts - diff',
      captureStrategy: 'window-title',
    },
    updatedAt: 1_500,
  }
}

describe('runtime inspection intent', () => {
  it('releases inspection carry when the new turn only contains a weak observe filler', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '看看',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '看看' },
      ],
      perceptionState: createInspectionCarryState(),
      visualPresenceState,
      currentForeground: {
        appName: 'Alicization',
        processName: 'Codex',
        title: 'Chat Overlay',
      },
    })

    expect(result.active).toBe(false)
    expect(result.releaseCarry).toBe(true)
    expect(result.inspectionState).toBe('dialogue-first')
    expect(result.reasonCodes).toContain('dialogue-pivot-away-from-inspection')
  })

  it('keeps inspection active when the new turn still asks about the anchored diff', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '你看看这个 diff 哪里错了',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '你看看这个 diff 哪里错了' },
      ],
      perceptionState: createInspectionCarryState(),
      visualPresenceState,
      currentForeground: {
        appName: 'Alicization',
        processName: 'Codex',
        title: 'Chat Overlay',
      },
    })

    expect(result.active).toBe(true)
    expect(result.releaseCarry).toBe(false)
    expect(result.inspectionState).not.toBe('dialogue-first')
    expect(result.reasonCodes).toContain('observation-verb')
  })

  it('releases inspection carry for a Codex capability question instead of hijacking dialogue', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '你可以使用 Codex 吗',
      messages: [
        { role: 'user', content: '帮我看看屏幕上的 Codex 窗口' },
        { role: 'assistant', content: '我在看着当前画面。' },
        { role: 'user', content: '你可以使用 Codex 吗' },
      ],
      perceptionState: {
        ...createInspectionCarryState(),
        invitedInspection: {
          requestedAt: 1_000,
          activeUntil: 5_000,
          hintText: '帮我看看屏幕上的 Codex 窗口',
        },
        recentSceneResidue: {
          ...createInspectionCarryState().recentSceneResidue!,
          summary: 'Codex Chat Overlay',
          focusTarget: {
            appName: 'Codex',
            processName: 'Codex',
            title: 'Codex Chat Overlay',
          },
        },
      },
      visualPresenceState,
      currentForeground: {
        appName: 'Codex',
        processName: 'Codex',
        title: 'Codex Chat Overlay',
      },
    })

    expect(result.active).toBe(false)
    expect(result.releaseCarry).toBe(true)
    expect(result.inspectionState).toBe('dialogue-first')
    expect(result.reasonCodes).toContain('dialogue-pivot-away-from-inspection')
  })
})
