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

it('releases a real inspection carry for explicit same-person conversation retrieval', () => {
  const userText = '请用 life_search_sessions 查找我之前发出的只读测试请求，告诉我当时授权的操作是什么。'
  const visualPresenceState = createDefaultVisualPresenceState(2000)
  visualPresenceState.watchMode = 'invited-inspection'
  const result = createInspectionIntentRuntime().resolveInspectionIntentForChatTurn({ now: 2000, userText, messages: [{ role: 'user', content: '看看当前屏幕。' }, { role: 'assistant', content: '我在看。' }, { role: 'user', content: userText }], perceptionState: createInspectionCarryState(), visualPresenceState })
  expect(result.active).toBe(false)
  expect(result.releaseCarry).toBe(true)
  expect(result.reasonCodes).toContain('bounded-agent-read')
})

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
  it('keeps a current explicit screenshot source available for creative writing', () => {
    const userText = '请帮我看看当前屏幕上的照片，并根据照片写一篇雨天散文。'
    const visualPresenceState = createDefaultVisualPresenceState(2000)
    visualPresenceState.watchMode = 'invited-inspection'
    const result = createInspectionIntentRuntime().resolveInspectionIntentForChatTurn({ now: 2000, userText, messages: [{ role: 'user', content: userText }], perceptionState: createInspectionCarryState(), visualPresenceState })
    expect(result.active).toBe(true)
    expect(result.releaseCarry).toBe(false)
  })
  it.each([
    '请写一篇八百字的雨天绘画散文，细致描述窗边的光、纸张、颜料和雨声。',
    '请用六个短句描述一个安静的雨天画画的下午，不用分点，像平常聊天一样。',
    'Write a short story about a quiet rainy afternoon with drawing paper by the window.',
  ])('releases shared screen carry for a standalone creative request: %s', (userText) => {
    const perceptionState = createInspectionCarryState()
    perceptionState.invitedInspection!.hintText = '看看这张雨天窗边画作。'
    perceptionState.recentSceneResidue!.summary = '雨天窗边的光线、画纸、绘画颜料和雨声。A quiet rainy afternoon with drawing paper by the window.'
    perceptionState.recentSceneResidue!.focusTarget = { appName: 'Paint', processName: 'mspaint', title: 'Rainy afternoon artwork' }
    const visualPresenceState = createDefaultVisualPresenceState(2000)
    visualPresenceState.watchMode = 'invited-inspection'
    const result = createInspectionIntentRuntime().resolveInspectionIntentForChatTurn({ now: 2000, userText, messages: [{ role: 'user', content: '看看这张雨天窗边画作。' }, { role: 'assistant', content: '我在看着窗边的画纸。' }, { role: 'user', content: userText }], perceptionState, visualPresenceState })
    expect(result.active).toBe(false)
    expect(result.releaseCarry).toBe(true)
    expect(result.inspectionState).toBe('dialogue-first')
  })

  it('cannot create shared desktop attention from an earlier quoted workflow question', () => {
    const state = createInspectionCarryState()
    state.invitedInspection = null
    state.recentSceneResidue = null
    const result = createInspectionIntentRuntime().resolveInspectionIntentForChatTurn({ now: 2000, userText: '这个呢？', messages: [{ role: 'user', content: '执行参数：{"kind":"user-review","question":"帮我看看当前页面有什么？"}' }, { role: 'assistant', content: '任务已受理。' }, { role: 'user', content: '这个呢？' }], perceptionState: state, visualPresenceState: createDefaultVisualPresenceState(2000) })
    expect(result.active).toBe(false)
  })

  it('releases desktop inspection carry for a structured browser task without a screen directive', () => {
    const runtime = createInspectionIntentRuntime()
    const plan = { goal: '本地下载报告', criteria: [{ kind: 'user-review', question: '下载的这份报告符合要求吗？' }], steps: [{ capabilityId: 'tool.browser_read_page', input: { format: 'interactables' } }] }
    const userText = `请使用 life_execute_work_plan 执行这份受管浏览器下载计划，逐项沿用参数。参数：${JSON.stringify(plan)}`
    const visualPresenceState = createDefaultVisualPresenceState(2000)
    visualPresenceState.watchMode = 'invited-inspection'
    const result = runtime.resolveInspectionIntentForChatTurn({ now: 2000, userText, messages: [{ role: 'user', content: '看看当前屏幕。' }, { role: 'assistant', content: '我在看。' }, { role: 'user', content: userText }], perceptionState: createInspectionCarryState(), visualPresenceState })
    expect(result.active).toBe(false)
    expect(result.releaseCarry).toBe(true)
    expect(result.reasonCodes).toContain('structured-action-without-screen-directive')
  })

  it('releases stale screen attention for a bounded file action with a hypothetical confirmation reference', () => {
    const runtime = createInspectionIntentRuntime()
    const userText = '请写入 C:/Users/QA/Desktop/proof.txt。如果我在确认界面拒绝，就停止；如实告诉我结果。'
    const visualPresenceState = createDefaultVisualPresenceState(2000)
    visualPresenceState.watchMode = 'invited-inspection'
    const result = runtime.resolveInspectionIntentForChatTurn({ now: 2000, userText, messages: [{ role: 'user', content: '看看当前屏幕。' }, { role: 'assistant', content: '我在看。' }, { role: 'user', content: userText }], perceptionState: createInspectionCarryState(), visualPresenceState })
    expect(result.active).toBe(false)
    expect(result.releaseCarry).toBe(true)
    expect(result.reasonCodes).toContain('bounded-file-action')
  })

  it('releases screen carry for an answer-only uncertainty instruction', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '如果你不确定某件事，不要猜，直接说不确定。',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '如果你不确定某件事，不要猜，直接说不确定。' },
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

  it('releases screen carry when the user explicitly asks for dialogue without tools', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '不调用工具，只用对话回答。',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '不调用工具，只用对话回答。' },
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
  })

  it('releases screen carry for the blackbox dialogue-only wording', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '现在先不要执行任何工具，只和我聊天。',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '现在先不要执行任何工具，只和我聊天。' },
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

  it('does not turn a current preference recall question into screen inspection', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '最后再问一次：我现在喜欢什么颜色？',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '最后再问一次：我现在喜欢什么颜色？' },
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

  it('releases screen carry when the user pivots back to a non-visual project topic', () => {
    const runtime = createInspectionIntentRuntime()
    const visualPresenceState = createDefaultVisualPresenceState(2_000)
    visualPresenceState.watchMode = 'invited-inspection'

    const result = runtime.resolveInspectionIntentForChatTurn({
      now: 2_000,
      userText: '继续回到数字生命项目：短期记忆的 owner 应该是谁？',
      messages: [
        { role: 'user', content: '帮我看看 Cursor 里面这个 diff 有什么问题' },
        { role: 'assistant', content: '我在看着。' },
        { role: 'user', content: '继续回到数字生命项目：短期记忆的 owner 应该是谁？' },
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
