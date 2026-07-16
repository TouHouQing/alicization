import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import {
  asAlicizationInlineExecutionSurfaceInput,
  buildAlicizationMinimalContextRecoveryMessages,
  readAlicizationInlineExecutionReceipt,
} from './main-chat-background-rules'

vi.mock('./runtime-soul', () => ({
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : fallback,
}))

describe('main chat background rules', () => {
  it('builds minimal timeout recovery context without dropping core prompt authority or recent dialogue', () => {
    const messages: Message[] = [
      { role: 'system', content: 'core-1' },
      { role: 'system', content: 'core-2' },
      { role: 'system', content: 'core-3' },
      { role: 'system', content: 'dynamic-memory' },
      { role: 'user', content: 'first old user turn' },
      { role: 'assistant', content: 'first old assistant turn' },
      { role: 'user', content: 'second old user turn' },
      { role: 'assistant', content: 'second old assistant turn' },
      { role: 'user', content: 'latest user turn' },
    ]

    const compact = buildAlicizationMinimalContextRecoveryMessages(messages)

    expect(compact.map(message => message.content)).toEqual([
      'core-1',
      'core-2',
      'core-3',
      'dynamic-memory',
      'first old assistant turn',
      'second old user turn',
      'second old assistant turn',
      'latest user turn',
    ])
  })
  it('keeps typed memory context without giving legacy governance markers recovery priority', () => {
    const typedMemoryContext = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-1'],
      },
    })
    const messages: Message[] = [
      { role: 'system', content: 'core-1' },
      { role: 'system', content: 'core-2' },
      { role: 'system', content: typedMemoryContext },
      { role: 'system', content: '[ALICIZATION_PROJECT_STATE]' },
      { role: 'user', content: 'older user turn' },
      { role: 'assistant', content: 'older assistant turn' },
      { role: 'user', content: 'latest user turn' },
    ]

    const compact = buildAlicizationMinimalContextRecoveryMessages(messages)
    const systemTexts = compact
      .filter(message => message.role === 'system')
      .map(message => String(message.content))

    expect(systemTexts).toContain(typedMemoryContext)
    expect(systemTexts).not.toContain('[ALICIZATION_PROJECT_STATE]')
  })

  it('reads inline execution receipts only from terminal executor thread states', () => {
    expect(readAlicizationInlineExecutionReceipt({
      threadStatus: 'completed',
      sessionId: 'session-1',
      threadId: 'thread-1',
      completedAt: 12_345.8,
    })).toEqual({
      completedAt: 12_345,
      sessionId: 'session-1',
      threadId: 'thread-1',
    })
    expect(readAlicizationInlineExecutionReceipt({
      threadStatus: 'running',
      sessionId: 'session-1',
      threadId: 'thread-1',
      completedAt: 12_345,
    })).toBeNull()
    expect(readAlicizationInlineExecutionReceipt({
      threadStatus: 'completed',
      sessionId: '',
      threadId: 'thread-1',
      completedAt: 12_345,
    })).toBeNull()
  })

  it('normalizes executor surface input without letting deterministic text become final visible speech', () => {
    expect(asAlicizationInlineExecutionSurfaceInput('executor_run_codex', {
      threadStatus: 'completed',
      goal: 'finish the test',
      summary: 'tests passed',
      output: {
        command: 'pnpm test',
        ok: true,
      },
    })).toEqual({
      channel: 'codex',
      status: 'completed',
      goal: 'finish the test',
      summary: 'tests passed',
      outcome: '{"command":"pnpm test","ok":true}',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('unknown_tool', {
      ok: false,
      summary: 'executor failed',
    })).toEqual({
      channel: 'executor',
      status: 'failed',
      goal: 'executor failed',
      summary: 'executor failed',
      outcome: '',
    })
  })

  it('normalizes local browser and desktop tool results into execution payoff surfaces', () => {
    expect(asAlicizationInlineExecutionSurfaceInput('browser_search_web', {
      status: 'completed',
      summary: 'Searched the web for Alicization 数字生命.',
      output: 'https://www.baidu.com/s?wd=Alicization+%E6%95%B0%E5%AD%97%E7%94%9F%E5%91%BD',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Searched the web for Alicization 数字生命.',
      summary: 'Searched the web for Alicization 数字生命.',
      outcome: 'https://www.baidu.com/s?wd=Alicization+%E6%95%B0%E5%AD%97%E7%94%9F%E5%91%BD',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('browser_type_text', {
      status: 'completed',
      summary: 'Typed text into browser field 搜索.',
      output: 'Alicization',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Typed text into browser field 搜索.',
      summary: 'Typed text into browser field 搜索.',
      outcome: 'Alicization',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('browser_navigate', {
      status: 'completed',
      summary: 'Navigated the browser back.',
      output: 'https://example.com/previous',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Navigated the browser back.',
      summary: 'Navigated the browser back.',
      outcome: 'https://example.com/previous',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('browser_scroll', {
      status: 'completed',
      summary: 'Scrolled browser down.',
      output: 'https://example.com/feed',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Scrolled browser down.',
      summary: 'Scrolled browser down.',
      outcome: 'https://example.com/feed',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('browser_wait', {
      status: 'completed',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/feed',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Waited for browser page readiness.',
      summary: 'Waited for browser page readiness.',
      outcome: 'https://example.com/feed',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('desktop_open_application', {
      status: 'completed',
      summary: 'Opened application Cursor.',
      output: 'Cursor',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Opened application Cursor.',
      summary: 'Opened application Cursor.',
      outcome: 'Cursor',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('desktop_wait', {
      status: 'completed',
      summary: 'Waited for desktop target Cursor.',
      output: 'Cursor',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Waited for desktop target Cursor.',
      summary: 'Waited for desktop target Cursor.',
      outcome: 'Cursor',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('desktop_inspect_scene', {
      status: 'completed',
      summary: 'Inspected current desktop scene around Google Chrome.',
      output: '{"question":"帮我判断下一步该点什么","suggestedActions":[]}',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Inspected current desktop scene around Google Chrome.',
      summary: 'Inspected current desktop scene around Google Chrome.',
      outcome: '{"question":"帮我判断下一步该点什么","suggestedActions":[]}',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('desktop_list_interactables', {
      status: 'completed',
      summary: 'Listed desktop interactables from Cursor.',
      output: '[{"ordinal":1,"role":"button","text":"继续"}]',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Listed desktop interactables from Cursor.',
      summary: 'Listed desktop interactables from Cursor.',
      outcome: '[{"ordinal":1,"role":"button","text":"继续"}]',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('desktop_press_keys', {
      status: 'completed',
      summary: 'Pressed desktop shortcut command+l.',
      output: 'command+l',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Pressed desktop shortcut command+l.',
      summary: 'Pressed desktop shortcut command+l.',
      outcome: 'command+l',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('executor_run_local_visual', {
      status: 'completed',
      kind: 'browser-automation',
      goal: 'Run local visual task: continue the current page flow',
      summary: 'Continued the browser upload flow through the local GUI thread.',
      output: 'returned to https://weibo.com',
    })).toEqual({
      channel: 'browser',
      status: 'completed',
      goal: 'Run local visual task: continue the current page flow',
      summary: 'Continued the browser upload flow through the local GUI thread.',
      outcome: 'returned to https://weibo.com',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('executor_run_local_visual', {
      status: 'completed',
      kind: 'software-automation',
      summary: 'Continued the local software setup flow.',
      output: 'Cursor preferences opened',
    })).toEqual({
      channel: 'software',
      status: 'completed',
      goal: 'Continued the local software setup flow.',
      summary: 'Continued the local software setup flow.',
      outcome: 'Cursor preferences opened',
    })

    expect(asAlicizationInlineExecutionSurfaceInput('executor_run_local_visual', {
      status: 'completed',
      kind: 'desktop-automation',
      summary: 'Dismissed the blocking desktop popup through the local GUI thread.',
      output: 'popup dismissed',
    })).toEqual({
      channel: 'desktop',
      status: 'completed',
      goal: 'Dismissed the blocking desktop popup through the local GUI thread.',
      summary: 'Dismissed the blocking desktop popup through the local GUI thread.',
      outcome: 'popup dismissed',
    })
  })
})
