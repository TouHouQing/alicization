// @vitest-environment jsdom

import type { ChatAssistantMessage, ChatRecoveryAction } from '../../../types/chat'

import { describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import { createI18n } from 'vue-i18n'

import History from './history.vue'

describe('chat history recovery actions', () => {
  it('renders exactly one advancing bubble when durable replay arrives before or during presentation', async () => {
    const full = '我在这里陪你。'
    const replay = { role: 'assistant' as const, id: 'chat:session:turn:gw1', createdAt: 123, content: full, slices: [{ type: 'text' as const, text: full }], tool_results: [] }
    const state = reactive({ messages: [replay], sending: true, streamingMessage: { ...replay, id: 'chat:session:turn', content: '', slices: [] as typeof replay.slices, createdAt: 100 } })
    const root = document.createElement('div')
    document.body.append(root)
    const app = createApp({ render: () => h(History, { ...state, assistantLabel: '她', userLabel: '我', errorLabel: '系统' }) })
    app.use(createI18n({ legacy: false, locale: 'en', messages: { en: {} }, missingWarn: false, fallbackWarn: false }))
    app.directive('auto-animate', {})
    app.mount(root)
    try {
      await nextTick()
      expect(root.querySelectorAll('[data-chat-message-role="assistant"]')).toHaveLength(1)
      expect(root.textContent).not.toContain(full)
      for (const prefix of ['我', '我在这里', full]) {
        state.streamingMessage.content = prefix
        state.streamingMessage.slices = [{ type: 'text', text: prefix }]
        await vi.waitFor(() => {
          expect(root.querySelectorAll('[data-chat-message-role="assistant"]')).toHaveLength(1)
          expect(root.textContent).toContain(prefix)
        })
        if (prefix !== full)
          expect(root.textContent).not.toContain(full)
      }
      state.sending = false
      await nextTick()
      expect(root.querySelectorAll('[data-chat-message-role="assistant"]')).toHaveLength(1)
      expect(root.textContent).toContain(full)
    }
    finally {
      app.unmount()
      root.remove()
    }
  })
  it('passes the recovery callback through to assistant messages', async () => {
    const action: ChatRecoveryAction = {
      kind: 'retry',
      threadId: 'thread-1',
      expectedChannel: 'codex',
      expectedUpdatedAt: 42,
      safety: 'safe-observe-retry',
      reasonCode: 'RETRY_ALLOWED',
    }
    const callback = vi.fn()
    const message: ChatAssistantMessage = {
      role: 'assistant',
      content: '',
      slices: [{
        type: 'execution-status',
        phase: 'tool-failed',
        label: 'Tool failed',
        recovery: { state: 'available', reasonCode: action.reasonCode, actions: [action] },
      }],
      tool_results: [],
    }
    const root = document.createElement('div')
    document.body.append(root)
    const app = createApp(History, {
      messages: [message],
      onRecoveryAction: callback,
    })
    app.use(createI18n({
      legacy: false,
      locale: 'en',
      messages: {
        en: {
          stage: {
            chat: {
              'message': {
                'character-name': {
                  'airi': 'ALICIZATION',
                  'core-system': 'Core System',
                  'you': 'You',
                },
              },
              'tool-recovery': {
                retry: 'Retry read-only task',
              },
            },
          },
        },
      },
    }))
    app.directive('auto-animate', {})
    app.mount(root)
    await nextTick()

    root.querySelector<HTMLButtonElement>('[data-recovery-action]')?.click()
    await nextTick()
    expect(callback).toHaveBeenCalledWith(action)

    app.unmount()
    root.remove()
  })
})
