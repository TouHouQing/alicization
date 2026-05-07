import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import {
  asAlicizationInlineExecutionSurfaceInput,
  buildAlicizationMinimalContextRecoveryMessages,
  readAlicizationInlineExecutionReceipt,
  shouldUseAlicizationExecutionFirstFastPath,
} from './main-chat-background-rules'

vi.mock('./runtime-soul', () => ({
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : fallback,
}))

function createPrepared(overrides?: Partial<any>): any {
  return {
    waitForTools: true,
    runtimeSurface: {
      action: {
        kind: 'execute',
      },
      tooling: {
        routingRequired: true,
      },
    },
    ...overrides,
  }
}

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

  it('allows execution-first fast path only for a single required executor tool on routed execution turns', () => {
    expect(shouldUseAlicizationExecutionFirstFastPath({
      enforcedExecutionTools: ['executor_run_codex'],
      prepared: createPrepared(),
    })).toBe(true)

    expect(shouldUseAlicizationExecutionFirstFastPath({
      enforcedExecutionTools: ['filesystem_read_file'],
      prepared: createPrepared(),
    })).toBe(false)
    expect(shouldUseAlicizationExecutionFirstFastPath({
      enforcedExecutionTools: ['executor_run_codex', 'executor_run_cli'],
      prepared: createPrepared(),
    })).toBe(false)
    expect(shouldUseAlicizationExecutionFirstFastPath({
      enforcedExecutionTools: ['executor_run_codex'],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          tooling: {
            routingRequired: true,
          },
        },
      }),
    })).toBe(false)
  })
})
