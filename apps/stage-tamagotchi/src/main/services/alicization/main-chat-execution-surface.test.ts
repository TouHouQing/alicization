import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { MainGatewayExecutionTaskThreadResult } from './main-chat-execution-surface'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import {
  buildExecutionCapabilitySystemBlocks,
  buildExecutionRoutingEnforcementSystemBlock,
  buildMainGatewayExecutionRoutingToolChoice,
  buildMainGatewayTools,
  detectMainGatewayExecutionRoutingIntent,

} from './main-chat-execution-surface'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createBuildExecutionRuntimeContext(
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>,
) {
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
    recentActions: [{
      kind: 'sensory',
      status: 'completed',
      label: 'sensory_capture_state',
      summary: 'capture healthy',
    }],
    sensorySnapshot: await getSensorySnapshot(),
  }))
}

describe('main chat execution surface', () => {
  it('builds focused capability blocks for capability questions', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: false, ready: false, sessionAffinity: true, reason: 'disabled' },
      { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
    ]

    const [capabilityBlock, routerBlock] = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      allowTools: true,
      inquiry: {
        capabilityQuestion: true,
        mentionedChannels: ['cli', 'codex'],
      },
    })

    expect(capabilityBlock).toContain('[ALICIZATION_EXECUTION_CAPABILITIES]')
    expect(capabilityBlock).toContain('Capability query focus: cli, codex.')
    expect(capabilityBlock).toContain('Never collapse multi-channel capability answers into a blanket "cannot".')
    expect(capabilityBlock).toContain('call executor_capability_snapshot first')
    expect(routerBlock).toContain('executor_run_cli')
    expect(routerBlock).toContain('executor_run_codex')
    expect(routerBlock).toContain('executor_run_claude_code')
    expect(routerBlock).toContain('executor_run_openclaw')
  })

  it('builds execution routing guard with required tool names', () => {
    const block = buildExecutionRoutingEnforcementSystemBlock({
      requestedChannels: ['cli', 'codex'],
      requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })

    expect(block).toContain('[ALICIZATION_EXECUTION_ROUTING_GUARD]')
    expect(block).toContain('executor_run_cli, executor_run_codex')
    expect(block).toContain('Do not pretend execution happened.')
  })

  it('detects main-gateway execution routing intent from action verbs and command literals', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我执行 `ls ~/Desktop` 看看结果',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: true,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['cli'],
      requiredToolNames: ['executor_run_cli'],
      reasonCodes: ['command-literal', 'action-verb', 'default-cli-from-command-literal'],
    })
  })

  it('builds required tool choice from routing intent', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['openclaw'],
      requiredToolNames: ['executor_run_openclaw'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })).toEqual({
      type: 'function',
      function: { name: 'executor_run_openclaw' },
    })
  })

  it('falls back to required mode when multiple executor tools remain available', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['cli', 'codex'],
      requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })).toBe('required')
  })

  it('builds main gateway tool registry including executor tools and mcp tools', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
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
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools
      .map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean)

    expect(toolNames).toContain('set_reminder')
    expect(toolNames).toContain('executor_capability_snapshot')
    expect(toolNames).toContain('sensory_capture_state')
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).toContain('executor_run_codex')
    expect(toolNames).toContain('executor_run_claude_code')
    expect(toolNames).toContain('executor_run_openclaw')
    expect(toolNames).toContain('mcp_list_tools')
    expect(toolNames).toContain('mcp_call_tool')
  })

  it('injects grounded sensory execution context into openclaw dispatches', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-openclaw-context-1',
        selectedChannel: 'openclaw',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 42,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-openclaw-context-1',
        decisionTraceId: 'trace-openclaw-context-1',
        sessionId: 'session-openclaw-context-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const openClawTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_openclaw') as any
    await openClawTool.execute({
      instruction: 'Dismiss the active desktop popup.',
      kind: 'desktop-automation',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      dispatch: expect.objectContaining({
        openclaw: expect.objectContaining({
          runtimeContext: expect.objectContaining({
            cardId: 'default',
            turnId: 'turn-openclaw-context-1',
            decisionTraceId: 'trace-openclaw-context-1',
            sessionId: 'session-openclaw-context-1',
            agentSessionId: 'agent-session-1',
            recentActions: [{
              kind: 'sensory',
              status: 'completed',
              label: 'sensory_capture_state',
              summary: 'capture healthy',
            }],
            sensory: expect.objectContaining({
              stale: false,
              foregroundWindow: {
                appName: 'Cursor',
                processName: 'cursor',
                title: 'airi-alice',
              },
              capture: expect.objectContaining({
                health: 'healthy',
                permission: 'granted',
                sourceCount: 2,
              }),
            }),
          }),
        }),
      }),
    }))
  })

  it('defaults Claude Code edit dispatches to tool-enabled mutate execution', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-default-tools-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 18,
      nextTickAt: 22,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 10,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-claude-default-tools-1',
        decisionTraceId: 'trace-claude-default-tools-1',
        sessionId: 'session-claude-default-tools-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const claudeTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_claude_code') as any
    await claudeTool.execute({
      prompt: 'Patch the runtime regression and update the failing tests.',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-edit',
        effect: 'mutate',
        requestedChannel: 'claude-code',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          allowTools: true,
        }),
      }),
    }))
  })

  it('defaults Claude Code investigation dispatches to observe-only planning unless tools are explicitly enabled', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-investigation-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 18,
      nextTickAt: 22,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 10,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-claude-investigation-1',
        decisionTraceId: 'trace-claude-investigation-1',
        sessionId: 'session-claude-investigation-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const claudeTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_claude_code') as any
    await claudeTool.execute({
      prompt: 'Inspect the runtime regression and summarize the root cause.',
      kind: 'codebase-investigation',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        effect: 'observe',
        requestedChannel: 'claude-code',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          allowTools: false,
        }),
      }),
    }))
  })

  it('returns live sensory capture state through the sensory tool facade', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 33,
      nextTickAt: 55,
      sample: {
        collectedAt: 11,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'degraded',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: 'inspection',
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 11,
        lastError: null,
        degradedReasons: ['window-thumbnail-stale'],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
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
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const sensoryTool = tools.find((entry: any) => String(entry?.function?.name) === 'sensory_capture_state') as any
    const result = await sensoryTool.execute({ includeSystemSample: false }) as any

    expect(result.foregroundWindow).toEqual({
      appName: 'Cursor',
      processName: 'cursor',
      title: 'airi-alice',
    })
    expect(result.capture).toEqual(expect.objectContaining({
      health: 'degraded',
      permission: 'granted',
      degradedReasons: ['window-thumbnail-stale'],
    }))
    expect(result.sample).toEqual({
      collectedAt: 11,
      time: {
        iso: '2026-04-04T00:00:00.000Z',
        local: '2026-04-04 08:00',
        timezone: 'Asia/Shanghai',
      },
    })
  })
})
