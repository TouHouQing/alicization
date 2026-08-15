import { describe, expect, it } from 'vitest'

import {
  AlicizationToolEventDeliveryError,
  createAlicizationRuntimeToolProjectionReducer,
} from './alicization-runtime-projection'

describe('alicization runtime tool projection', () => {
  it('preserves canonical tool identity in delivery failures', () => {
    const cause = new Error('renderer projection failed')
    const error = new AlicizationToolEventDeliveryError(cause, {
      type: 'tool-progress',
      toolCallId: 'tool-call-delivery',
      toolName: 'coding_agent',
    })

    expect(error).toMatchObject({
      name: 'AlicizationToolEventDeliveryError',
      code: 'ALICIZATION_TOOL_EVENT_DELIVERY_FAILED',
      eventType: 'tool-progress',
      toolCallId: 'tool-call-delivery',
      toolName: 'coding_agent',
      cause,
    })
  })

  it('upserts all progress under one canonical toolCallId', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    const started = reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    const running = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 1_200,
      itemType: 'reasoning',
    })
    const command = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 1_600,
      itemType: 'command_execution',
      command: 'pnpm test',
      commandStatus: 'running',
    })

    expect(started.card.toolCallId).toBe('tool-call-1')
    expect(running.card.toolCallId).toBe('tool-call-1')
    expect(command.card.toolCallId).toBe('tool-call-1')
    expect(reducer.listCards()).toHaveLength(1)
    expect(reducer.listCards()[0]).toMatchObject({
      toolCallId: 'tool-call-1',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'running',
      terminal: false,
      step: {
        itemType: 'command_execution',
        command: 'pnpm test',
        commandStatus: 'running',
      },
    })
  })

  it('uses selectedChannel before legacy tool-name mapping', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    const projected = reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-selected-channel',
      toolName: 'executor_run_cli',
      selectedChannel: 'claude-code',
    })

    expect(projected.card.selectedChannel).toBe('claude-code')
  })

  it('does not infer selectedChannel from an arbitrary tool result field', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-result-channel',
      toolName: 'coding_agent',
    })
    const projected = reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-result-channel',
      toolName: 'coding_agent',
      result: {
        status: 'completed',
        channel: 'codex',
      },
    })

    expect(projected.card.selectedChannel).toBeNull()
  })

  it('keeps the previously confirmed channel ahead of a legacy tool-name alias', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-channel-order',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    const projected = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-channel-order',
      toolName: 'executor_run_cli',
      phase: 'running',
      elapsedMs: 100,
    })

    expect(projected.card.selectedChannel).toBe('codex')
  })

  it('does not replace a previously confirmed channel with a conflicting typed fact', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-channel-conflict',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    const projected = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-channel-conflict',
      toolName: 'coding_agent',
      selectedChannel: 'cli',
      phase: 'running',
      elapsedMs: 100,
    })

    expect(projected.card.selectedChannel).toBe('codex')
  })

  it('allows the first typed channel to replace an earlier unconfirmed inference', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-channel-inferred',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    }, {
      confirmSelectedChannel: false,
    })
    const confirmed = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-channel-inferred',
      toolName: 'coding_agent',
      selectedChannel: 'cli',
      phase: 'running',
      elapsedMs: 100,
    })
    const conflict = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-channel-inferred',
      toolName: 'coding_agent',
      selectedChannel: 'browser',
      phase: 'running',
      elapsedMs: 200,
    })

    expect(confirmed.card.selectedChannel).toBe('cli')
    expect(conflict.card.selectedChannel).toBe('cli')
  })

  it('ignores late progress after terminal settlement', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-terminal',
      toolName: 'codex',
      selectedChannel: 'codex',
    })
    const completed = reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-terminal',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'completed',
      result: { status: 'completed' },
    })
    const lateProgress = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-terminal',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 4_000,
      summary: 'late heartbeat',
    })

    expect(completed.card).toMatchObject({
      phase: 'completed',
      terminal: true,
    })
    expect(lateProgress).toMatchObject({
      accepted: false,
      traceOnly: true,
    })
    expect(lateProgress.card).toEqual(completed.card)
    expect(reducer.listCards()).toEqual([completed.card])
  })

  it('renders CLI, Codex and Claude Code without channel cross-talk', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    const cli = reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-cli',
      toolName: 'coding_agent',
      selectedChannel: 'cli',
    })
    const codex = reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-codex',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    const claude = reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-claude',
      toolName: 'coding_agent',
      selectedChannel: 'claude-code',
    })

    reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-codex',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 800,
      summary: 'Codex is editing',
    })

    expect(cli.card.selectedChannel).toBe('cli')
    expect(codex.card.selectedChannel).toBe('codex')
    expect(claude.card.selectedChannel).toBe('claude-code')
    expect(reducer.listCards()).toEqual([
      expect.objectContaining({
        toolCallId: 'tool-call-cli',
        selectedChannel: 'cli',
      }),
      expect.objectContaining({
        toolCallId: 'tool-call-codex',
        selectedChannel: 'codex',
      }),
      expect.objectContaining({
        toolCallId: 'tool-call-claude',
        selectedChannel: 'claude-code',
      }),
    ])
  })

  it('keeps progress monotonic when an older event arrives late', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-order',
      toolName: 'codex',
      selectedChannel: 'codex',
    })
    const newest = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-order',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 2_000,
      occurredAt: 200,
      eventId: 'event-2',
      summary: 'newest',
    })
    const late = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-order',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 1_000,
      occurredAt: 100,
      eventId: 'event-1',
      summary: 'old',
    })

    expect(newest.card.step?.summary).toBe('newest')
    expect(late).toMatchObject({
      accepted: false,
      traceOnly: true,
      card: newest.card,
    })
    expect(reducer.getCard('tool-call-order')?.step?.summary).toBe('newest')
  })

  it('does not let a conflicting late result replace a terminal phase', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-conflict',
      toolName: 'codex',
      selectedChannel: 'codex',
    })
    reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-conflict',
      toolName: 'codex',
      phase: 'completed',
      elapsedMs: 1_000,
      signal: 'terminal',
    })
    const late = reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-conflict',
      toolName: 'codex',
      phase: 'failed',
      result: { status: 'failed' },
    })

    expect(late).toMatchObject({
      accepted: false,
      traceOnly: true,
    })
    expect(reducer.getCard('tool-call-conflict')).toMatchObject({
      phase: 'completed',
      result: undefined,
    })
  })

  it('accepts a matching formal result after terminal progress without reopening the card', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-terminal-result',
      toolName: 'codex',
      selectedChannel: 'codex',
    })
    const terminalProgress = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-terminal-result',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'completed',
      signal: 'terminal',
      elapsedMs: 1_000,
      errorCode: 'LOCKED_DIAGNOSTIC',
    })
    const formalResult = reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-terminal-result',
      toolName: 'codex',
      selectedChannel: 'cli',
      phase: 'completed',
      result: {
        status: 'completed',
        summary: '真实工具结果',
      },
    })

    expect(formalResult).toMatchObject({
      accepted: true,
      traceOnly: false,
      card: {
        phase: 'completed',
        terminal: true,
        selectedChannel: 'codex',
        errorCode: 'LOCKED_DIAGNOSTIC',
        result: {
          status: 'completed',
          summary: '真实工具结果',
        },
      },
    })
    expect(formalResult.card.revision).toBe(terminalProgress.card.revision + 1)
  })

  it('returns isolated result snapshots from canonical projection reads', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-isolated-result',
      toolName: 'codex',
      phase: 'completed',
      result: {
        nested: {
          value: 'canonical',
        },
      },
    })

    const first = reducer.getCard('tool-call-isolated-result')
    if (!first || !first.result || typeof first.result !== 'object') {
      throw new Error('expected canonical result object')
    }
    ;(first.result as any).nested.value = 'mutated'

    expect(reducer.getCard('tool-call-isolated-result')?.result).toEqual({
      nested: {
        value: 'canonical',
      },
    })
  })

  it('keeps terminal fields immutable while accepting one matching formal result', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    reducer.reduce({
      type: 'tool-call',
      toolCallId: 'tool-call-terminal-immutable',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
    })
    const terminal = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'tool-call-terminal-immutable',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      phase: 'cancelled',
      signal: 'terminal',
      elapsedMs: 1_000,
      errorCode: 'TOOL_CANCELLED',
      errorMessage: 'cancelled by user',
    })

    const lateFacts = [
      reducer.reduce({
        type: 'tool-call',
        toolCallId: 'tool-call-terminal-immutable',
        toolName: 'executor_run_cli',
        selectedChannel: 'cli',
      }),
      reducer.reduce({
        type: 'tool-progress',
        toolCallId: 'tool-call-terminal-immutable',
        toolName: 'executor_run_cli',
        selectedChannel: 'cli',
        phase: 'completed',
        elapsedMs: 2_000,
        summary: 'late completion',
      }),
      reducer.reduce({
        type: 'tool-result',
        toolCallId: 'tool-call-terminal-immutable',
        toolName: 'executor_run_cli',
        selectedChannel: 'cli',
        phase: 'cancelled',
        result: { status: 'cancelled', late: true },
      }),
    ]

    expect(lateFacts).toEqual([
      expect.objectContaining({
        accepted: false,
        traceOnly: true,
        card: terminal.card,
      }),
      expect.objectContaining({
        accepted: false,
        traceOnly: true,
        card: terminal.card,
      }),
      expect.objectContaining({
        accepted: true,
        traceOnly: false,
        card: expect.objectContaining({
          ...terminal.card,
          revision: terminal.card.revision + 1,
          result: {
            status: 'cancelled',
            late: true,
          },
        }),
      }),
    ])
    expect(reducer.getCard('tool-call-terminal-immutable')).toEqual({
      ...terminal.card,
      revision: terminal.card.revision + 1,
      result: {
        status: 'cancelled',
        late: true,
      },
    })
  })

  it('records an invalid tool fact as trace-only instead of throwing', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    expect(() => reducer.reduce({
      type: 'tool-progress',
      toolCallId: '',
      toolName: 'codex',
      phase: 'running',
      elapsedMs: 40,
    })).not.toThrow()

    expect(reducer.listTrace()).toContainEqual(expect.objectContaining({
      factType: 'tool-progress',
      accepted: false,
      traceOnly: true,
      card: expect.objectContaining({
        errorCode: 'TOOL_PROJECTION_INVALID',
      }),
    }))
    expect(reducer.listCards()).toHaveLength(0)
  })

  it('preserves dead-lettered as a distinct terminal phase', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    const projected = reducer.reduce({
      type: 'tool-result',
      toolCallId: 'tool-call-dead-lettered',
      toolName: 'coding_agent',
      selectedChannel: 'codex',
      result: {
        finalStatus: 'dead-lettered',
        errorCode: 'SIDE_EFFECT_RECONCILIATION_EXHAUSTED',
        errorMessage: 'The applied side effect could not be verified safely.',
      },
    })

    expect(projected.card).toMatchObject({
      phase: 'dead-lettered',
      terminal: true,
      result: {
        finalStatus: 'dead-lettered',
      },
    })
  })

  it('records a forced trace-only fact without mutating canonical cards', () => {
    const reducer = createAlicizationRuntimeToolProjectionReducer()

    const traced = reducer.reduce({
      type: 'tool-progress',
      toolCallId: 'late-after-run-finish',
      toolName: 'codex',
      selectedChannel: 'codex',
      phase: 'running',
      elapsedMs: 1_200,
      summary: 'late progress',
    }, {
      traceOnly: true,
    })

    expect(traced).toMatchObject({
      factType: 'tool-progress',
      accepted: false,
      traceOnly: true,
      card: {
        toolCallId: 'late-after-run-finish',
        toolName: 'codex',
        selectedChannel: 'codex',
        phase: 'running',
      },
    })
    expect(reducer.listCards()).toHaveLength(0)
    expect(reducer.listTrace()).toEqual([traced])
  })
})
