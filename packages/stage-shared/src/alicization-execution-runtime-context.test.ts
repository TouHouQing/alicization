import { describe, expect, it } from 'vitest'

import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from './alicization-execution-runtime-context'

describe('alicization execution runtime context', () => {
  it('normalizes sensory execution context into a compact shared contract', () => {
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-1',
      decisionTraceId: 'trace-ctx-1',
      sessionId: 'session-ctx-1',
      agentSessionId: 'agent-session-ctx-1',
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }, {
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }],
      sensory: {
        collectedAt: 1_710_000_000_123,
        running: true,
        stale: false,
        ageMs: 33,
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        capture: {
          health: 'healthy',
          permission: 'granted',
          sourceCount: 2,
          lastUpdatedAt: 1_710_000_000_100,
          lastError: null,
          degradedReasons: ['window-thumbnail-stale', 'window-thumbnail-stale'],
        },
      },
    })

    expect(context).toEqual({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-1',
      decisionTraceId: 'trace-ctx-1',
      sessionId: 'session-ctx-1',
      agentSessionId: 'agent-session-ctx-1',
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }, {
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }],
      sensory: {
        collectedAt: 1_710_000_000_123,
        running: true,
        stale: false,
        ageMs: 33,
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        capture: {
          health: 'healthy',
          permission: 'granted',
          sourceCount: 2,
          lastUpdatedAt: 1_710_000_000_100,
          lastError: null,
          degradedReasons: ['window-thumbnail-stale'],
        },
      },
    })
  })

  it('renders a reusable execution context block for embodied runtimes', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-2',
      decisionTraceId: 'trace-ctx-2',
      sessionId: 'session-ctx-2',
      agentSessionId: 'agent-session-ctx-2',
      recentActions: [{
        kind: 'sensory',
        status: 'completed',
        label: 'sensory_capture_state',
        summary: 'capture healthy',
      }],
      sensory: {
        collectedAt: 1_710_000_000_123,
        running: true,
        stale: true,
        ageMs: 4800,
        foregroundWindow: {
          appName: 'Chrome',
          processName: 'chrome',
          title: 'Docs',
        },
        capture: {
          health: 'degraded',
          permission: 'granted',
          sourceCount: 1,
          lastUpdatedAt: 1_710_000_000_120,
          lastError: 'thumbnail stale',
          degradedReasons: ['window-thumbnail-stale'],
        },
      },
    })

    expect(block).toContain('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]')
    expect(block).toContain('conversation_session_id=session-ctx-2')
    expect(block).toContain('agent_session_id=agent-session-ctx-2')
    expect(block).toContain('recent_runtime_actions=sensory/completed:sensory_capture_state -> capture healthy')
    expect(block).toContain('foreground_window=Chrome | chrome | Docs')
    expect(block).toContain('capture_health=degraded')
    expect(block).toContain('capture_degraded_reasons=window-thumbnail-stale')
    expect(block).toContain('avoid confident hidden-state claims')
  })
})
