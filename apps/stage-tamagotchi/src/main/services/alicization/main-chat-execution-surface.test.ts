import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import {
  buildExecutionCapabilitySystemBlocks,
  buildMainGatewayTools,
} from './main-chat-execution-surface'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
] as const

const sensorySnapshot = {
  running: true,
  stale: false,
  ageMs: 100,
  nextTickAt: 200,
  sample: {
    collectedAt: 100,
    time: {
      iso: '2026-08-05T00:00:00.000Z',
      local: '2026-08-05 08:00',
      timezone: 'Asia/Shanghai',
    },
  },
  capture: null,
} as any

function createBuildExecutionRuntimeContext() {
  return vi.fn(async (context: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    turnId: string
  }) => buildAlicizationExecutionRuntimeContext({
    agentSessionId: 'agent-session-1',
    cardId: context.cardId,
    turnId: context.turnId,
    decisionTraceId: context.decisionTraceId ?? null,
    sessionId: context.sessionId ?? 'session-1',
    recentActions: [],
    sensorySnapshot,
  }))
}

describe('main chat execution surface', () => {
  it('separates unobserved provider support from tools offered for the current turn', () => {
    const [capabilityBlock] = buildExecutionCapabilitySystemBlocks(
      [],
      executionChannels,
      { toolsOfferedThisTurn: true },
    )
    const parsed = JSON.parse(capabilityBlock!)

    expect(parsed.data).toMatchObject({
      providerToolsSupported: null,
      toolsOfferedThisTurn: true,
      source: 'unobserved',
      checkedAt: null,
      lastError: null,
    })
  })

  it('exposes only structured capability state without question or routing fields', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: false, ready: false, sessionAffinity: true, reason: 'disabled' },
      { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
    ]

    const [capabilityBlock] = buildExecutionCapabilitySystemBlocks(
      capabilities,
      executionChannels,
      {
        toolsOfferedThisTurn: false,
        providerToolCapabilityObservation: {
          supported: false,
          source: 'observed-provider-error',
          checkedAt: 1_786_000_000_000,
          lastError: 'Authorization: Bearer secret-token user_input=private-message',
        },
      },
    )
    const parsed = JSON.parse(capabilityBlock!)

    expect(parsed).toEqual({
      type: 'alicization-execution-capabilities',
      data: {
        providerToolsSupported: false,
        toolsOfferedThisTurn: false,
        source: 'observed-provider-error',
        checkedAt: 1_786_000_000_000,
        lastError: 'provider-tools-unsupported',
        channels: executionChannels.map((channel) => {
          const capability = capabilities.find(item => item.channel === channel)
          return {
            channel,
            available: capability?.available === true,
            enabled: capability?.enabled === true,
            ready: capability?.ready === true,
            reason: capability
              ? capability.reason ?? null
              : 'capability-not-reported',
          }
        }),
      },
    })
    expect(Object.keys(parsed.data)).toEqual([
      'providerToolsSupported',
      'toolsOfferedThisTurn',
      'source',
      'checkedAt',
      'lastError',
      'channels',
    ])
  })

  it('offers the complete provider tool registry for model-owned selection', async () => {
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      })) as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools
      .map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean)

    expect(toolNames).toEqual(expect.arrayContaining([
      'executor_run_codex',
      'executor_run_cli',
      'browser_open_url',
      'desktop_inspect_scene',
      'set_reminder',
    ]))
  })

  it('keeps capability snapshots as explicit tools rather than hidden text routing', async () => {
    const resolveTaskPlanningCapabilities = vi.fn(async () => [
      {
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
        reason: null,
      },
    ] as AlicizationChannelCapability[])
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-1',
        decisionTraceId: null,
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn() as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities,
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const capabilityTool = tools.find((entry: any) => entry.function?.name === 'executor_capability_snapshot') as any
    expect(capabilityTool).toBeDefined()
    expect(capabilityTool.function?.description).not.toMatch(/when the host|always call|must use/iu)
  })

  it('requires the model to choose a structured local visual channel', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-local-visual-1',
        selectedChannel: 'browser',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-local-visual-1',
        decisionTraceId: 'trace-local-visual-1',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const localVisualTool = tools.find((entry: any) => entry.function?.name === 'executor_run_local_visual') as any
    expect(localVisualTool.function.parameters.required).toContain('channel')

    await localVisualTool.execute({
      channel: 'browser',
      instruction: 'Inspect the current browser page.',
      kind: 'browser-automation',
    }, {})

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        requestedChannel: 'browser',
      }),
    }))
  })

  it('keeps the openclaw tool pinned to the openclaw channel', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-openclaw-1',
        selectedChannel: 'openclaw',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-openclaw-1',
        decisionTraceId: 'trace-openclaw-1',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const openclawTool = tools.find((entry: any) => entry.function?.name === 'executor_run_openclaw') as any
    expect(openclawTool.function.parameters.properties).not.toHaveProperty('transport')

    await openclawTool.execute({
      instruction: 'Inspect and operate the current page through OpenClaw.',
      kind: 'browser-automation',
    }, {})

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      dispatch: expect.objectContaining({
        localVisual: undefined,
        openclaw: expect.any(Object),
      }),
      task: expect.objectContaining({
        requestedChannel: 'openclaw',
      }),
    }))
  })
})
