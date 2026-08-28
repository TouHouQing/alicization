// @vitest-environment jsdom

import type { ChatAssistantMessage, ChatRecoveryAction } from '../../../types/chat'

import { describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

import History from './history.vue'

describe('chat history recovery actions', () => {
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
