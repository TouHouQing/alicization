// @vitest-environment jsdom

import type { ChatAssistantMessage, ChatRecoveryAction } from '../../../types/chat'

import { describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

import AssistantItem from './assistant-item.vue'

function message(status: Record<string, unknown>): ChatAssistantMessage {
  return {
    role: 'assistant',
    content: '',
    slices: [{ type: 'execution-status', ...status } as any],
    tool_results: [],
  }
}

function recoveryAction(kind: ChatRecoveryAction['kind'] = 'resume'): ChatRecoveryAction {
  return {
    kind,
    threadId: 'thread-1',
    expectedChannel: 'codex',
    expectedUpdatedAt: 42,
    safety: 'inspect-before-replay',
    reasonCode: 'RECOVERY_REQUIRED',
  }
}

async function mountMessage(
  currentMessage: ChatAssistantMessage,
  onRecoveryAction?: (action: ChatRecoveryAction) => void | Promise<void>,
) {
  const root = document.createElement('div')
  document.body.append(root)
  const app = createApp(AssistantItem, {
    message: currentMessage,
    label: 'Tool',
    onRecoveryAction,
  })
  app.use(createI18n({
    legacy: false,
    locale: 'zh-Hans',
    messages: {
      'zh-Hans': {
        stage: {
          chat: {
            'tool-recovery': {
              continue: '确认后继续',
              resume: '核对后恢复',
              retry: '重试只读任务',
            },
          },
        },
      },
    },
  }))
  app.mount(root)
  await nextTick()
  return { app, root }
}

describe('chat assistant recovery actions', () => {
  it('shows available actions only when a recovery callback is provided and awaits it', async () => {
    let resolveCallback: (() => void) | undefined
    const callback = vi.fn(() => new Promise<void>((resolve) => {
      resolveCallback = resolve
    }))
    const { app, root } = await mountMessage(message({
      phase: 'tool-failed',
      label: 'Tool failed',
      recovery: {
        state: 'available',
        reasonCode: 'RECOVERY_REQUIRED',
        actions: [recoveryAction('resume'), recoveryAction('retry')],
      },
    }), callback)

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-recovery-action]'))
    expect(buttons).toHaveLength(2)
    expect(buttons.map(button => button.textContent?.trim())).toEqual(['核对后恢复', '重试只读任务'])

    buttons[0]?.click()
    await nextTick()
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ kind: 'resume' }))
    expect(buttons[0]?.disabled).toBe(true)

    resolveCallback?.()
    await nextTick()
    app.unmount()
    root.remove()
  })

  it('does not show actions for blocked recovery or while execution is running', async () => {
    const callback = vi.fn()
    const blocked = await mountMessage(message({
      phase: 'tool-failed',
      label: 'Tool failed',
      errorMessage: 'Existing failure reason',
      recovery: {
        state: 'blocked',
        reasonCode: 'RECOVERY_BLOCKED',
        actions: [recoveryAction()],
      },
    }), callback)
    expect(blocked.root.querySelector('[data-recovery-action]')).toBeNull()
    expect(blocked.root.textContent).toContain('Existing failure reason')
    blocked.app.unmount()
    blocked.root.remove()

    const running = await mountMessage(message({
      phase: 'tool-running',
      label: 'Tool running',
      recovery: {
        state: 'available',
        reasonCode: 'RECOVERY_REQUIRED',
        actions: [recoveryAction()],
      },
    }), callback)
    const button = running.root.querySelector<HTMLButtonElement>('[data-recovery-action]')
    expect(button).not.toBeNull()
    expect(button?.disabled).toBe(true)
    running.app.unmount()
    running.root.remove()
  })
})
