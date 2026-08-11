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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any
    expect(codexTool.function.parameters.properties).not.toHaveProperty('timeoutMs')
    expect(codexTool.function.parameters.properties).not.toHaveProperty('model')
  })

  it('offers one structured coding-agent facade on the main-chat tool surface', async () => {
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      codingAgentDelegation: {
        allowed: true,
        allowedAgents: ['codex'],
        evidenceId: 'cognition:turn-main-chat:investigation',
        turnId: 'turn-main-chat',
        sourceTurnId: 'turn-main-chat',
        allowInvestigation: true,
        allowEdit: false,
      },
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-main-chat',
        decisionTraceId: 'trace-main-chat',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-main-chat',
          selectedChannel: 'codex',
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

    expect(toolNames).toContain('executor_run_coding_agent')
    expect(toolNames).not.toContain('executor_run_cli')
    expect(toolNames).not.toContain('executor_run_codex')
    expect(toolNames).not.toContain('executor_run_claude_code')
    expect(toolNames).not.toContain('executor_run_openclaw')
    const codingAgentTool = tools.find((entry: any) => entry.function?.name === 'executor_run_coding_agent') as any
    expect(codingAgentTool.function.parameters.properties.agent).toEqual({
      type: 'string',
      const: 'codex',
    })
    expect(toolNames).toEqual(expect.arrayContaining([
      'browser_open_url',
      'desktop_inspect_scene',
      'set_reminder',
    ]))
  })

  it('routes an explicit agent choice through the single coding-agent facade', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-facade-codex',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'summary complete',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      codingAgentDelegation: {
        allowed: true,
        allowedAgents: ['codex'],
        evidenceId: 'cognition:turn-facade-codex:investigation',
        turnId: 'turn-facade-codex',
        sourceTurnId: 'turn-facade-codex',
        allowInvestigation: true,
        allowEdit: false,
      },
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-facade-codex',
        decisionTraceId: 'trace-facade-codex',
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
    const codingAgentTool = tools.find((entry: any) => entry.function?.name === 'executor_run_coding_agent') as any

    await codingAgentTool.execute({
      agent: 'codex',
      kind: 'codebase-investigation',
      prompt: '总结当前项目的架构，不要修改文件。',
    }, {
      toolCallId: 'facade-codex-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        requestedChannel: 'codex',
      }),
      dispatch: expect.objectContaining({
        codex: expect.objectContaining({
          sandbox: 'read-only',
        }),
      }),
    }))
  })

  it('rejects a second coding-agent executor in the same turn before dispatch', async () => {
    let releaseFirst!: (result: unknown) => void
    const executeTaskThread = vi.fn(() => new Promise((resolve) => {
      releaseFirst = resolve
    }))
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      codingAgentDelegation: {
        allowed: true,
        allowedAgents: ['codex'],
        evidenceId: 'cognition:turn-single-coding-agent:investigation',
        turnId: 'turn-single-coding-agent',
        sourceTurnId: 'turn-single-coding-agent',
        allowInvestigation: true,
        allowEdit: false,
      },
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-single-coding-agent',
        decisionTraceId: 'trace-single-coding-agent',
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
    const codingAgentTool = tools.find((entry: any) => entry.function?.name === 'executor_run_coding_agent') as any

    const first = codingAgentTool.execute({
      agent: 'codex',
      kind: 'codebase-investigation',
      prompt: '先检查项目结构。',
    }, {
      toolCallId: 'facade-codex-first',
    })
    await vi.waitFor(() => expect(executeTaskThread).toHaveBeenCalledTimes(1))

    const second = await codingAgentTool.execute({
      agent: 'claude-code',
      kind: 'codebase-investigation',
      prompt: '再检查记忆链路。',
    }, {
      toolCallId: 'facade-claude-second',
    })

    expect(second).toMatchObject({
      status: 'not-routed',
      errorCode: 'CODING_AGENT_CHANNEL_MISMATCH',
      continuationPolicy: 'continue',
    })
    expect(executeTaskThread).toHaveBeenCalledTimes(1)

    releaseFirst({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-single-coding-agent',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    })
    await first
  })

  it('does not expose Coding Agent on a main-chat turn without structured delegation', async () => {
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-no-delegation',
        decisionTraceId: 'trace-no-delegation',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unreachable',
          selectedChannel: 'codex',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unreachable',
        output: null,
      })) as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools.map((entry: any) => entry.function?.name)
    expect(toolNames).not.toContain('executor_run_coding_agent')
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).not.toContain('executor_run_openclaw')
  })

  it('keeps ordinary local command work on CLI and does not expose OpenClaw on the main-chat surface', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-main-chat-cli',
        selectedChannel: 'cli',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: 'airi-alice',
    }))
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-main-chat-cli',
        decisionTraceId: 'trace-main-chat-cli',
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

    const toolNames = tools.map((entry: any) => entry.function?.name)
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).not.toContain('executor_run_coding_agent')
    expect(toolNames).not.toContain('executor_run_openclaw')

    const cliTool = tools.find((entry: any) => entry.function?.name === 'executor_run_cli') as any
    await cliTool.execute({
      command: 'find',
      args: ['/Users/touhouqing/Desktop/GIT', '-mindepth', '1', '-maxdepth', '1', '-type', 'd'],
      cwd: '/Users/touhouqing/Desktop',
      effect: 'observe',
    }, {
      toolCallId: 'main-chat-cli-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'run-command',
        requestedChannel: 'cli',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        cli: expect.objectContaining({
          command: 'find',
          cwd: '/Users/touhouqing/Desktop',
        }),
      }),
    }))
  })

  it('exposes direct CLI instead of the coding-agent facade for a command-scoped delegation', async () => {
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      codingAgentDelegation: {
        allowed: true,
        allowedAgents: ['cli'],
        evidenceId: 'cognition:turn-command-cli:command',
        turnId: 'turn-command-cli',
        sourceTurnId: 'turn-command-cli',
        allowInvestigation: false,
        allowEdit: false,
        allowCommand: true,
      },
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-command-cli',
        decisionTraceId: 'trace-command-cli',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn() as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools.map((entry: any) => entry.function?.name)
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).not.toContain('executor_run_coding_agent')
    expect(toolNames).not.toContain('executor_run_openclaw')
  })

  it('does not expose CLI when the turn authority does not allow commands', async () => {
    const tools = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      codingAgentDelegation: {
        allowed: true,
        allowedAgents: ['cli'],
        evidenceId: 'cognition:turn-cli-scope-mismatch:investigation',
        turnId: 'turn-cli-scope-mismatch',
        sourceTurnId: 'turn-cli-scope-mismatch',
        allowInvestigation: true,
        allowEdit: false,
        allowCommand: false,
      },
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-cli-scope-mismatch',
        decisionTraceId: 'trace-cli-scope-mismatch',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn() as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools.map((entry: any) => entry.function?.name)
    expect(toolNames).not.toContain('executor_run_cli')
    expect(toolNames).not.toContain('executor_run_coding_agent')
    expect(toolNames).not.toContain('executor_run_openclaw')
  })

  it('normalizes an underspecified Codex project summary as read-only investigation', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-codex-summary',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'summary complete',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-codex-summary',
        decisionTraceId: 'trace-codex-summary',
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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: '总结当前项目的架构、记忆链路和主要模块，不要修改文件。',
    }, {
      toolCallId: 'codex-summary-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        effect: 'observe',
        permissionMode: 'implicit',
        requestedChannel: 'codex',
        requiresVisualGrounding: false,
      }),
      dispatch: expect.objectContaining({
        codex: expect.objectContaining({
          sandbox: 'read-only',
        }),
      }),
    }))
  })

  it('forces Claude Code investigation tasks to stay read-only without internal tools', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-summary',
        selectedChannel: 'claude-code',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'summary complete',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-claude-summary',
        decisionTraceId: 'trace-claude-summary',
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
    const claudeTool = tools.find((entry: any) => entry.function?.name === 'executor_run_claude_code') as any

    await claudeTool.execute({
      prompt: '总结当前项目，不要修改文件。',
      kind: 'codebase-investigation',
      effect: 'observe',
      allowTools: true,
      sandbox: 'workspace-write',
    }, {
      toolCallId: 'claude-summary-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
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

  it('keeps the Codex execution budget owned by runtime instead of model arguments', async () => {
    const executeTaskThread = vi.fn(async (_input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-codex-runtime-budget',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'completed',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-codex-runtime-budget',
        decisionTraceId: 'trace-codex-runtime-budget',
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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
      timeoutMs: 120_000,
      model: 'gpt-5.6-terra',
    }, {
      toolCallId: 'codex-runtime-budget-1',
    })

    const dispatch = executeTaskThread.mock.calls[0]?.[0]?.dispatch?.codex
    expect(dispatch).not.toHaveProperty('timeoutMs')
    expect(dispatch).not.toHaveProperty('model')
  })

  it('emits tool execution heartbeats while an executor is still running', async () => {
    vi.useFakeTimers()
    try {
      let releaseTask!: (result: unknown) => void
      const executeTaskThread = vi.fn(() => new Promise((resolve) => {
        releaseTask = resolve
      }))
      const emitToolExecutionProgress = vi.fn()
      const tools = await buildMainGatewayTools({
        buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
        context: {
          cardId: 'default',
          turnId: 'turn-tool-progress',
          decisionTraceId: 'trace-tool-progress',
          sessionId: 'session-1',
        },
        executionCapabilityChannels: executionChannels,
        executeTaskThread: executeTaskThread as any,
        emitToolExecutionProgress,
        getSensorySnapshot: () => sensorySnapshot,
        resolveTaskPlanningCapabilities: vi.fn(async () => []),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
      const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

      const pending = codexTool.execute({
        prompt: 'inspect the workspace',
      }, {
        toolCallId: 'codex-progress-1',
      })
      await Promise.resolve()

      expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
        toolCallId: 'codex-progress-1',
        toolName: 'executor_run_codex',
        phase: 'started',
        signal: 'liveness',
      }))

      await vi.advanceTimersByTimeAsync(10_000)
      expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
        toolCallId: 'codex-progress-1',
        toolName: 'executor_run_codex',
        phase: 'running',
        signal: 'liveness',
      }))

      releaseTask({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-progress',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'completed',
        output: null,
      })
      await pending

      expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
        toolCallId: 'codex-progress-1',
        toolName: 'executor_run_codex',
        phase: 'completed',
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not emit a late adapter heartbeat after a terminal executor result', async () => {
    vi.useFakeTimers()
    try {
      const emitToolExecutionProgress = vi.fn()
      const executeTaskThread = vi.fn(async (input: any) => {
        setTimeout(() => {
          void input.onExecutionEvent?.({
            id: 'codex-late-heartbeat-1',
            threadId: 'thread-codex-late-heartbeat',
            channel: 'codex',
            kind: 'step',
            threadStatus: 'running',
            payload: {
              codexEventType: 'heartbeat',
              semanticProgress: false,
              itemType: 'command_execution',
              summary: 'Codex command still running: pnpm test',
            },
            createdAt: 1_710_000_010_500,
          })
        }, 0)
        return {
          ok: true,
          stage: 'dispatch',
          thread: {
            id: 'thread-codex-late-heartbeat',
            selectedChannel: 'codex',
            status: 'completed',
          },
          plan: {
            state: 'routed',
          },
          summary: 'completed',
          output: null,
        }
      })
      const tools = await buildMainGatewayTools({
        buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
        context: {
          cardId: 'default',
          turnId: 'turn-codex-late-heartbeat',
          decisionTraceId: 'trace-codex-late-heartbeat',
          sessionId: 'session-1',
        },
        executionCapabilityChannels: executionChannels,
        executeTaskThread: executeTaskThread as any,
        emitToolExecutionProgress,
        getSensorySnapshot: () => sensorySnapshot,
        resolveTaskPlanningCapabilities: vi.fn(async () => []),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
      const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

      await codexTool.execute({
        prompt: 'inspect the workspace',
      }, {
        toolCallId: 'codex-late-heartbeat-call-1',
      })
      await vi.advanceTimersByTimeAsync(0)

      expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
        'started',
        'running',
        'completed',
      ])
      expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
        adapterEventType: 'executor.result-ready',
        signal: 'semantic-progress',
      }))
      expect(emitToolExecutionProgress).not.toHaveBeenCalledWith(expect.objectContaining({
        eventId: 'codex-late-heartbeat-1',
      }))
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('forwards persisted Codex semantic progress through the active tool call identity', async () => {
    const emitToolExecutionProgress = vi.fn()
    const executeTaskThread = vi.fn(async (input) => {
      await input.onExecutionEvent?.({
        id: 'codex-run-semantic-1:1',
        threadId: 'thread-codex-semantic-progress',
        channel: 'codex',
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'item.started',
          semanticProgress: true,
          itemId: 'command-1',
          itemType: 'command_execution',
          summary: 'Codex command started: git status --short',
          command: 'git status --short',
          status: 'in_progress',
        },
        createdAt: 1_710_000_000_500,
      })
      await input.onExecutionEvent?.({
        id: 'codex-run-semantic-1:2',
        threadId: 'thread-codex-semantic-progress',
        channel: 'codex',
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'heartbeat',
          semanticProgress: false,
          itemId: 'command-1',
          itemType: 'command_execution',
          summary: 'Codex command still running: git status --short',
          command: 'git status --short',
          status: 'in_progress',
        },
        createdAt: 1_710_000_010_500,
      })
      await input.onExecutionEvent?.({
        id: 'codex-run-semantic-1:3',
        threadId: 'thread-codex-semantic-progress',
        channel: 'codex',
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'item.completed',
          semanticProgress: true,
          itemId: 'command-1',
          itemType: 'command_execution',
          summary: 'Codex command completed: git status --short',
          command: 'git status --short',
          status: 'completed',
          exitCode: 0,
          outputPreview: '## main...origin/main',
        },
        createdAt: 1_710_000_015_500,
      })
      await input.onExecutionEvent?.({
        id: 'codex-run-semantic-1:4',
        threadId: 'thread-codex-semantic-progress',
        channel: 'codex',
        kind: 'result',
        threadStatus: 'completed',
        payload: {
          codexEventType: 'turn.completed',
          semanticProgress: true,
          terminal: true,
          summary: 'Codex turn completed.',
        },
        createdAt: 1_710_000_020_500,
      })
      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-codex-semantic-progress',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'completed',
        output: null,
      }
    })
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-codex-semantic-progress',
        decisionTraceId: 'trace-codex-semantic-progress',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
      kind: 'codebase-investigation',
      effect: 'observe',
    }, {
      toolCallId: 'codex-semantic-progress-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      onExecutionEvent: expect.any(Function),
    }))
    expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-semantic-progress-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'semantic-progress',
      threadId: 'thread-codex-semantic-progress',
      eventId: 'codex-run-semantic-1:1',
      adapterEventType: 'item.started',
      summary: 'Codex command started: git status --short',
      command: 'git status --short',
      commandStatus: 'in_progress',
    }))
    expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-semantic-progress-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'liveness',
      adapterEventType: 'heartbeat',
      summary: 'Codex command still running: git status --short',
      command: 'git status --short',
      commandStatus: 'in_progress',
    }))
    expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-semantic-progress-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'semantic-progress',
      adapterEventType: 'item.completed',
      command: 'git status --short',
      commandStatus: 'completed',
      commandExitCode: 0,
      outputPreview: '## main...origin/main',
    }))
    expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-semantic-progress-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'semantic-progress',
      adapterEventType: 'turn.completed',
    }))
    expect(emitToolExecutionProgress.mock.calls.filter(([event]) => event.signal === 'terminal')).toHaveLength(1)
  })

  it('forwards Codex Provider diagnostics as liveness without treating them as semantic progress', async () => {
    const emitToolExecutionProgress = vi.fn()
    const executeTaskThread = vi.fn(async (input) => {
      await input.onExecutionEvent?.({
        id: 'codex-run-provider-diagnostic-1:1',
        threadId: 'thread-codex-provider-diagnostic',
        channel: 'codex',
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'provider.diagnostic',
          semanticProgress: false,
          itemId: 'provider-transport-fallback',
          message: 'Falling back from WebSockets to HTTPS transport. request timed out',
          summary: 'Codex error completed: Falling back from WebSockets to HTTPS transport. request timed out',
        },
        createdAt: 1_710_000_000_500,
      })
      return {
        ok: false,
        finalStatus: 'failed',
        stage: 'dispatch',
        thread: {
          id: 'thread-codex-provider-diagnostic',
          selectedChannel: 'codex',
          status: 'failed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'Codex Provider unavailable.',
        output: null,
        errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
        errorMessage: 'Falling back from WebSockets to HTTPS transport. request timed out',
      }
    })
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-codex-provider-diagnostic',
        decisionTraceId: 'trace-codex-provider-diagnostic',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
      kind: 'codebase-investigation',
      effect: 'observe',
    }, {
      toolCallId: 'codex-provider-diagnostic-1',
    })

    expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'codex-provider-diagnostic-1',
      toolName: 'executor_run_codex',
      phase: 'running',
      signal: 'liveness',
      threadId: 'thread-codex-provider-diagnostic',
      eventId: 'codex-run-provider-diagnostic-1:1',
      adapterEventType: 'provider.diagnostic',
      summary: expect.stringContaining('Falling back from WebSockets'),
    }))
    expect(emitToolExecutionProgress).not.toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'codex-run-provider-diagnostic-1:1',
      signal: 'semantic-progress',
    }))
  })

  it('emits executor progress with a synthetic id when executeOptions omits toolCallId', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-progress-without-id',
        decisionTraceId: 'trace-tool-progress-without-id',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-progress-without-id',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'completed',
        output: null,
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {})

    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'running',
      'completed',
    ])
    expect(emitToolExecutionProgress.mock.calls[0]?.[0].toolCallId).toMatch(/^alicization-tool-call-\d+$/)
    expect(emitToolExecutionProgress.mock.calls.at(-1)?.[0].toolCallId).toBe(
      emitToolExecutionProgress.mock.calls[0]?.[0].toolCallId,
    )
  })

  it('derives an executor budget signal from the main chat abort signal', async () => {
    const controller = new AbortController()
    let forwardedSignal: AbortSignal | undefined
    const executeTaskThread = vi.fn(async (input: any) => {
      forwardedSignal = input.abortSignal
      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-abort-signal',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'completed',
        output: null,
      }
    })
    const tools = await buildMainGatewayTools({
      abortSignal: controller.signal,
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-abort-signal',
        decisionTraceId: 'trace-tool-abort-signal',
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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-abort-signal-1',
    })

    expect(forwardedSignal).toBeInstanceOf(AbortSignal)
    expect(forwardedSignal).not.toBe(controller.signal)
    expect(forwardedSignal?.aborted).toBe(false)
  })

  it('keeps user-invoked Codex inline until the executor returns its terminal result', async () => {
    const emitToolExecutionProgress = vi.fn()
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      finalStatus: 'completed',
      stage: 'dispatch',
      thread: {
        id: 'thread-background-codex',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'Codex task completed.',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-background-codex',
        decisionTraceId: 'trace-background-codex',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
      kind: 'codebase-investigation',
      effect: 'observe',
    }, {
      toolCallId: 'codex-background-1',
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.not.objectContaining({
      dispatchMode: 'background',
    }))
    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        toolCallId: 'codex-background-1',
      }),
    }))
    expect(result).toMatchObject({
      status: 'completed',
      finalStatus: 'completed',
      threadId: 'thread-background-codex',
      threadStatus: 'completed',
      continuationPolicy: 'continue',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'running',
      'completed',
    ])
  })

  it('derives the executor budget signal from the per-tool abort signal instead of the outer fallback', async () => {
    const outerController = new AbortController()
    const toolController = new AbortController()
    let forwardedSignal: AbortSignal | undefined
    const executeTaskThread = vi.fn(async (input: any) => {
      forwardedSignal = input.abortSignal
      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-specific-abort-signal',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'completed',
        output: null,
      }
    })
    const tools = await buildMainGatewayTools({
      abortSignal: outerController.signal,
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-specific-abort-signal',
        decisionTraceId: 'trace-tool-specific-abort-signal',
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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-specific-abort-signal-1',
      abortSignal: toolController.signal,
    })

    expect(forwardedSignal).toBeInstanceOf(AbortSignal)
    expect(forwardedSignal).not.toBe(toolController.signal)
    expect(forwardedSignal).not.toBe(outerController.signal)
    expect(forwardedSignal?.aborted).toBe(false)
  })

  it('derives the resume budget signal from the per-tool abort signal instead of the outer fallback', async () => {
    const outerController = new AbortController()
    const toolController = new AbortController()
    let forwardedSignal: AbortSignal | undefined
    const resumeTaskThread = vi.fn(async (input: any) => {
      forwardedSignal = input.abortSignal
      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-specific-resume-abort-signal',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'resumed',
        output: null,
      }
    })
    const tools = await buildMainGatewayTools({
      abortSignal: outerController.signal,
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-specific-resume-abort-signal',
        decisionTraceId: 'trace-tool-specific-resume-abort-signal',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unexpected-new-dispatch',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unexpected new dispatch',
        output: null,
      })) as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      resumeTaskThread: resumeTaskThread as any,
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      threadId: 'thread-tool-specific-resume-abort-signal',
    }, {
      toolCallId: 'codex-specific-resume-abort-signal-1',
      abortSignal: toolController.signal,
    })

    expect(resumeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-tool-specific-resume-abort-signal',
      expectedChannel: 'codex',
    }))
    expect(forwardedSignal).toBeInstanceOf(AbortSignal)
    expect(forwardedSignal).not.toBe(toolController.signal)
    expect(forwardedSignal).not.toBe(outerController.signal)
    expect(forwardedSignal?.aborted).toBe(false)
  })

  it('settles immediately when the per-tool abort signal fires even if the executor ignores cancellation', async () => {
    const toolController = new AbortController()
    const executeTaskThread = vi.fn(async () => await new Promise(() => {}))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-cancellation-race',
        decisionTraceId: 'trace-tool-cancellation-race',
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
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const pending = codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-cancellation-race-1',
      abortSignal: toolController.signal,
    })
    await vi.waitFor(() => expect(executeTaskThread).toHaveBeenCalledTimes(1))
    toolController.abort(new DOMException('host cancelled the task', 'AbortError'))

    const result = await Promise.race([
      pending,
      new Promise<'still-pending'>(resolve => setTimeout(() => resolve('still-pending'), 20)),
    ])
    expect(result).not.toBe('still-pending')
    expect(result).toMatchObject({
      status: 'failed',
      cancelled: true,
      continuationPolicy: 'stop',
    })
  })

  it('does not cut off a live Codex task at the former 330-second outer deadline', async () => {
    vi.useFakeTimers()
    try {
      const toolController = new AbortController()
      const emitToolExecutionProgress = vi.fn()
      const executeTaskThread = vi.fn(async () => await new Promise(() => {}))
      const tools = await buildMainGatewayTools({
        buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
        context: {
          cardId: 'default',
          turnId: 'turn-codex-long-running-budget',
          decisionTraceId: 'trace-codex-long-running-budget',
          sessionId: 'session-1',
        },
        executionCapabilityChannels: executionChannels,
        executeTaskThread: executeTaskThread as any,
        emitToolExecutionProgress,
        getSensorySnapshot: () => sensorySnapshot,
        resolveTaskPlanningCapabilities: vi.fn(async () => []),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
      const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

      const pending = codexTool.execute({
        prompt: 'inspect the workspace thoroughly',
      }, {
        toolCallId: 'codex-long-running-budget-1',
        abortSignal: toolController.signal,
      })
      await vi.waitFor(() => expect(executeTaskThread).toHaveBeenCalledTimes(1))
      await vi.advanceTimersByTimeAsync(330_000)

      expect(emitToolExecutionProgress).not.toHaveBeenCalledWith(expect.objectContaining({
        phase: 'timeout',
      }))
      toolController.abort(new DOMException('host cancelled the long task', 'AbortError'))
      await expect(pending).resolves.toMatchObject({
        cancelled: true,
        continuationPolicy: 'stop',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('times out executor planning and ignores adapter progress that arrives after the lifecycle closes', async () => {
    vi.useFakeTimers()
    try {
      let onExecutionEvent: ((event: any) => Promise<void> | void) | undefined
      let forwardedSignal: AbortSignal | undefined
      const emitToolExecutionProgress = vi.fn()
      const executeTaskThread = vi.fn(async (input: any) => {
        onExecutionEvent = input.onExecutionEvent
        forwardedSignal = input.abortSignal
        return await new Promise(() => {})
      })
      const tools = await buildMainGatewayTools({
        buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
        context: {
          cardId: 'default',
          turnId: 'turn-tool-planning-timeout',
          decisionTraceId: 'trace-tool-planning-timeout',
          sessionId: 'session-1',
        },
        executionCapabilityChannels: executionChannels,
        executeTaskThread: executeTaskThread as any,
        emitToolExecutionProgress,
        getSensorySnapshot: () => sensorySnapshot,
        resolveTaskPlanningCapabilities: vi.fn(async () => []),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
      const cliTool = tools.find((entry: any) => entry.function?.name === 'executor_run_cli') as any

      const pending = cliTool.execute({
        command: 'git',
        args: ['status', '--short'],
        timeoutMs: 1_000,
      }, {
        toolCallId: 'cli-planning-timeout-1',
      })
      await vi.waitFor(() => expect(executeTaskThread).toHaveBeenCalledTimes(1))
      await vi.advanceTimersByTimeAsync(31_000)

      await expect(pending).resolves.toMatchObject({
        status: 'failed',
        errorCode: 'TOOL_EXECUTION_TIMEOUT',
        continuationPolicy: 'stop',
      })
      expect(forwardedSignal?.aborted).toBe(true)
      expect(emitToolExecutionProgress.mock.calls.at(-1)?.[0]).toMatchObject({
        phase: 'timeout',
        signal: 'terminal',
        errorCode: 'TOOL_EXECUTION_TIMEOUT',
      })

      const progressCount = emitToolExecutionProgress.mock.calls.length
      await onExecutionEvent?.({
        id: 'late-progress-after-timeout',
        threadId: 'thread-tool-planning-timeout',
        channel: 'cli',
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'heartbeat',
          semanticProgress: false,
          summary: 'late progress',
        },
        createdAt: Date.now(),
      })
      expect(emitToolExecutionProgress).toHaveBeenCalledTimes(progressCount)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('times out follow-up inspection after reporting that the executor result is ready', async () => {
    vi.useFakeTimers()
    try {
      const emitToolExecutionProgress = vi.fn()
      const tools = await buildMainGatewayTools({
        buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
        context: {
          cardId: 'default',
          turnId: 'turn-tool-follow-up-timeout',
          decisionTraceId: 'trace-tool-follow-up-timeout',
          sessionId: 'session-1',
        },
        desktopInspectScene: vi.fn(async () => await new Promise(() => {})),
        executionCapabilityChannels: executionChannels,
        executeTaskThread: vi.fn(async () => ({
          ok: true,
          stage: 'dispatch',
          thread: {
            id: 'thread-tool-follow-up-timeout',
            selectedChannel: 'codex',
            status: 'completed',
          },
          plan: {
            state: 'routed',
          },
          summary: 'executor completed before inspection',
          output: null,
        })) as any,
        emitToolExecutionProgress,
        getSensorySnapshot: () => sensorySnapshot,
        resolveTaskPlanningCapabilities: vi.fn(async () => []),
        scheduleReminderTask: vi.fn(async () => ({ ok: true })),
        invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
        invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      })
      const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

      const pending = codexTool.execute({
        prompt: 'inspect the workspace',
        timeoutMs: 1_000,
        autoContinueSuggestedActions: true,
      }, {
        toolCallId: 'codex-follow-up-timeout-1',
      })
      await vi.waitFor(() => expect(emitToolExecutionProgress).toHaveBeenCalledWith(expect.objectContaining({
        adapterEventType: 'executor.result-ready',
      })))
      await vi.advanceTimersByTimeAsync(31_000)

      await expect(pending).resolves.toMatchObject({
        status: 'failed',
        errorCode: 'TOOL_EXECUTION_TIMEOUT',
        continuationPolicy: 'stop',
      })
      const phases = emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)
      expect(phases[0]).toBe('started')
      expect(phases.at(-1)).toBe('timeout')
      expect(phases.filter(phase => phase === 'running').length).toBeGreaterThanOrEqual(1)
      const resultReadyEvents = emitToolExecutionProgress.mock.calls
        .map(([event]) => event)
        .filter(event => event.adapterEventType === 'executor.result-ready')
      expect(resultReadyEvents).toHaveLength(1)
      expect(resultReadyEvents[0]).toMatchObject({
        adapterEventType: 'executor.result-ready',
        signal: 'semantic-progress',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('forwards Codex progress observers when resuming an executor task thread', async () => {
    const resumeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-codex-progress-resume',
        selectedChannel: 'codex',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'resumed',
      output: null,
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-codex-progress-resume',
        decisionTraceId: 'trace-codex-progress-resume',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unexpected-new-dispatch',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unexpected new dispatch',
        output: null,
      })) as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      resumeTaskThread: resumeTaskThread as any,
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      threadId: 'thread-codex-progress-resume',
    }, {
      toolCallId: 'codex-progress-resume-1',
    })

    expect(resumeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      dispatchMode: 'background',
      threadId: 'thread-codex-progress-resume',
      expectedChannel: 'codex',
    }))
  })

  it('emits timeout when an executor reports an active tool-step deadline', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-timeout',
        decisionTraceId: 'trace-tool-timeout',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => {
        throw Object.assign(new Error('Codex active command_execution (long-command) exceeded its 1800000ms deadline.'), {
          code: 'CODEX_ACTIVE_STEP_TIMEOUT',
        })
      }) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-timeout-1',
    })

    expect(result).toMatchObject({
      status: 'failed',
      errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'timeout',
    ])
  })

  it('emits cancelled when an executor throws an abort error', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-aborted',
        decisionTraceId: 'trace-tool-aborted',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => {
        throw Object.assign(new Error('The operation was aborted.'), {
          name: 'AbortError',
        })
      }) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-aborted-1',
    })

    expect(result).toMatchObject({
      status: 'failed',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'cancelled',
    ])
  })

  it('marks concrete Codex adapter failures as tool execution failures before returning to the Provider', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-empty-output',
        decisionTraceId: 'trace-tool-empty-output',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: false,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-empty-output',
          selectedChannel: 'codex',
          status: 'failed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'Codex exited successfully without producing an assistant response.',
        output: null,
        errorCode: 'CODEX_EMPTY_OUTPUT',
        errorMessage: 'Codex exited successfully without producing an assistant response.',
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-empty-output-1',
    })

    expect(result).toMatchObject({
      status: 'failed',
      failureKind: 'tool-execution',
      errorCode: 'CODEX_EMPTY_OUTPUT',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'failed',
    ])
  })

  it('preserves a cancelled dispatch final status in the executor tool result', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-cancelled-result',
        decisionTraceId: 'trace-tool-cancelled-result',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: false,
        finalStatus: 'cancelled',
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-cancelled-result',
          selectedChannel: 'codex',
          status: 'cancelled',
        },
        plan: {
          state: 'routed',
        },
        summary: 'Codex execution was cancelled.',
        output: null,
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'cancel this inspection',
    }, {
      toolCallId: 'codex-cancelled-result-1',
    })

    expect(result).toMatchObject({
      status: 'cancelled',
      finalStatus: 'cancelled',
      threadStatus: 'cancelled',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'cancelled',
    ])
  })

  it('marks every failed executor result as terminal for Provider continuation', async () => {
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-permission-required',
        decisionTraceId: 'trace-tool-permission-required',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: false,
        finalStatus: 'failed',
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-permission-required',
          selectedChannel: 'codex',
          status: 'failed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'Codex requires permission before it can continue.',
        output: null,
        errorCode: 'CODEX_PERMISSION_REQUIRED',
        errorMessage: 'Codex requires permission before it can continue.',
      })) as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await expect(codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-permission-required-1',
    })).resolves.toMatchObject({
      status: 'failed',
      finalStatus: 'failed',
      continuationPolicy: 'stop',
      errorCode: 'CODEX_PERMISSION_REQUIRED',
    })
  })

  it('does not label a failed executor result as timeout because its diagnostic message mentions timeout configuration', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-config-failure',
        decisionTraceId: 'trace-tool-config-failure',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: false,
        finalStatus: 'failed',
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-config-failure',
          selectedChannel: 'codex',
          status: 'failed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'Codex configuration is invalid; timeoutMs was ignored.',
        output: null,
        errorCode: 'CODEX_CONFIG_INVALID',
        errorMessage: 'Codex configuration is invalid; timeoutMs was ignored.',
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-config-failure-1',
    })

    expect(emitToolExecutionProgress.mock.calls.at(-1)?.[0]).toMatchObject({
      phase: 'failed',
      signal: 'terminal',
    })
  })

  it('emits only the final failed phase when executor follow-up inspection fails', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-follow-up-failure',
        decisionTraceId: 'trace-tool-follow-up-failure',
        sessionId: 'session-1',
      },
      desktopInspectScene: vi.fn(async () => {
        throw new Error('desktop inspection failed after executor completion')
      }),
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-tool-follow-up-failure',
          selectedChannel: 'codex',
          status: 'completed',
        },
        plan: {
          state: 'routed',
        },
        summary: 'executor completed before inspection',
        output: null,
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
      autoContinueSuggestedActions: true,
    }, {
      toolCallId: 'codex-follow-up-failure-1',
    })

    expect(result).toMatchObject({
      status: 'failed',
      failureKind: 'tool-execution',
      toolName: 'executor_run_codex',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'running',
      'failed',
    ])
    expect(emitToolExecutionProgress.mock.calls[1]?.[0]).toMatchObject({
      adapterEventType: 'executor.result-ready',
      signal: 'semantic-progress',
    })
  })

  it('does not report an unrouted executor request as completed', async () => {
    const emitToolExecutionProgress = vi.fn()
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-not-routed',
        decisionTraceId: 'trace-tool-not-routed',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: false,
        stage: 'plan',
        thread: {
          id: 'thread-tool-not-routed',
          selectedChannel: null,
          status: 'blocked',
        },
        plan: {
          state: 'blocked',
        },
        summary: 'No executor route is available.',
        output: null,
      })) as any,
      emitToolExecutionProgress,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const codexTool = tools.find((entry: any) => entry.function?.name === 'executor_run_codex') as any

    const result = await codexTool.execute({
      prompt: 'inspect the workspace',
    }, {
      toolCallId: 'codex-not-routed-1',
    })

    expect(result).toMatchObject({
      status: 'not-routed',
    })
    expect(emitToolExecutionProgress.mock.calls.map(([event]) => event.phase)).toEqual([
      'started',
      'failed',
    ])
  })

  it('returns executor failures as structured tool results instead of rejecting the provider stream', async () => {
    const executeTaskThread = vi.fn(async () => {
      throw new Error('Circular runtime call detected: tool:executor:cli -> tool:executor:cli')
    })
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-tool-failure',
        decisionTraceId: 'trace-tool-failure',
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
    const cliTool = tools.find((entry: any) => entry.function?.name === 'executor_run_cli') as any

    const result = await cliTool.execute({
      command: 'find',
      args: ['.'],
    }, {})

    expect(result).toMatchObject({
      status: 'failed',
      stage: 'tool',
      failureKind: 'tool-execution',
      toolName: 'executor_run_cli',
      errorCode: 'RUNTIME_CALL_CIRCULAR',
      errorMessage: 'Circular runtime call detected: tool:executor:cli -> tool:executor:cli',
      output: null,
    })
    expect(result.summary).toContain('executor_run_cli failed')
    expect(executeTaskThread).toHaveBeenCalledOnce()
  })

  it('defers executor suggested actions back to the model instead of nesting another executor', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-executor-defer',
        selectedChannel: 'cli',
        status: 'completed',
      },
      plan: {
        state: 'routed',
      },
      summary: 'CLI inspection completed.',
      output: null,
    }))
    const desktopInspectScene = vi.fn(async () => ({
      pagePhase: 'terminal',
      suggestedActions: [{
        toolName: 'executor_run_codex',
        title: 'Continue with Codex',
        arguments: {
          prompt: 'Inspect the repository findings.',
        },
      }],
    }))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(),
      context: {
        cardId: 'default',
        turnId: 'turn-executor-defer',
        decisionTraceId: 'trace-executor-defer',
        sessionId: 'session-1',
      },
      desktopInspectScene,
      executionCapabilityChannels: executionChannels,
      executeTaskThread: executeTaskThread as any,
      getSensorySnapshot: () => sensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })
    const cliTool = tools.find((entry: any) => entry.function?.name === 'executor_run_cli') as any

    const result = await cliTool.execute({
      command: 'find',
      args: ['.'],
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 3,
    }, {})
    const output = JSON.parse(String(result.output))

    expect(executeTaskThread).toHaveBeenCalledOnce()
    expect(desktopInspectScene).toHaveBeenCalledOnce()
    expect(result.autoContinuation).toMatchObject({
      requested: true,
      stoppedReason: 'executor-continuation-deferred-to-model',
    })
    expect(output.suggestedActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        toolName: 'executor_run_codex',
      }),
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
    expect(openclawTool.function.parameters.properties.kind.enum).not.toEqual(expect.arrayContaining([
      'run-command',
      'codebase-edit',
      'codebase-investigation',
    ]))

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
