import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { MainGatewayExecutionTaskThreadResult } from './main-chat-execution-surface'

import { Buffer } from 'node:buffer'

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
    expect(routerBlock).toContain('filesystem_patch_file')
    expect(routerBlock).toContain('filesystem_search_files')
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
      reasonCodes: expect.arrayContaining(['command-literal', 'action-verb', 'default-cli-from-command-structure']),
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
    expect(toolNames).toContain('filesystem_read_file')
    expect(toolNames).toContain('filesystem_write_file')
    expect(toolNames).toContain('filesystem_edit_file')
    expect(toolNames).toContain('filesystem_patch_file')
    expect(toolNames).toContain('filesystem_list_directory')
    expect(toolNames).toContain('filesystem_search_files')
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).toContain('executor_run_codex')
    expect(toolNames).toContain('executor_run_claude_code')
    expect(toolNames).toContain('executor_run_openclaw')
    expect(toolNames).toContain('mcp_list_tools')
    expect(toolNames).toContain('mcp_call_tool')
  })

  it('provides normalized filesystem read/edit/list tools with MCP fallback', async () => {
    const sourceContent = `alpha\\nbeta\\n${'x'.repeat(260)}`
    const invokeMcpCallTool = vi.fn(async (payload: any) => {
      if (payload?.name === 'filesystem::read_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: sourceContent }],
        }
      }
      if (payload?.name === 'filesystem::write_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: 'written' }],
        }
      }
      if (payload?.name === 'filesystem::list_directory') {
        return {
          ok: false,
          isError: true,
          errorCode: 'MCP_CALL_FAILED',
          errorMessage: 'method not found',
        }
      }
      if (payload?.name === 'filesystem::list') {
        return {
          ok: true,
          isError: false,
          structuredContent: {
            entries: [{ name: 'README.md' }, { name: 'src' }],
          },
        }
      }
      if (payload?.name === 'filesystem::search_files') {
        return {
          ok: false,
          isError: true,
          errorCode: 'MCP_CALL_FAILED',
          errorMessage: 'method not found',
        }
      }
      if (payload?.name === 'filesystem::search') {
        return {
          ok: true,
          isError: false,
          structuredContent: {
            matches: [
              { path: '/workspace/src/main.ts', line: 12, column: 4, snippet: 'const alpha = true' },
              { path: '/workspace/src/notes.md', line: 3, snippet: 'alpha checklist' },
            ],
          },
        }
      }
      return {
        ok: false,
        isError: true,
        errorCode: 'MCP_CALL_FAILED',
        errorMessage: 'method not found',
      }
    })

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 12,
      nextTickAt: 20,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 6,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-tools-1',
        decisionTraceId: 'trace-filesystem-tools-1',
        sessionId: 'session-filesystem-tools-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-tools-1',
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
      invokeMcpCallTool,
    })

    const readTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_read_file') as any
    const readResult = await readTool.execute({
      path: '/workspace/notes.txt',
      maxReturnBytes: 80,
    }) as any
    expect(readResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'read_file',
      path: '/workspace/notes.txt',
      truncated: true,
      byteLength: Buffer.byteLength(sourceContent, 'utf8'),
      contentHash: expect.any(String),
      mcpToolName: 'filesystem::read_file',
    }))

    const editTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_edit_file') as any
    const editResult = await editTool.execute({
      path: '/workspace/notes.txt',
      oldText: 'beta',
      newText: 'gamma',
    }) as any
    expect(editResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'edit_file',
      path: '/workspace/notes.txt',
      replacedCount: 1,
      mcpToolName: 'filesystem::write_file',
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::write_file',
      arguments: expect.objectContaining({
        path: '/workspace/notes.txt',
        content: expect.stringContaining('gamma'),
      }),
    }))

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/notes.txt',
      changes: [
        { oldText: 'gamma', newText: 'delta' },
        { oldText: 'alpha', newText: 'ALPHA' },
      ],
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'patch_file',
      path: '/workspace/notes.txt',
      totalChanges: 2,
      appliedChanges: 2,
      skippedChanges: 0,
      totalReplacedCount: 2,
      mcpToolName: 'filesystem::write_file',
      previousHash: expect.any(String),
      nextHash: expect.any(String),
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::write_file',
      arguments: expect.objectContaining({
        path: '/workspace/notes.txt',
        content: expect.stringContaining('delta'),
      }),
    }))

    const listTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_list_directory') as any
    const listResult = await listTool.execute({
      path: '/workspace',
      recursive: true,
    }) as any
    expect(listResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'list_directory',
      path: '/workspace',
      mcpToolName: 'filesystem::list',
      entries: ['README.md', 'src'],
      entryCount: 2,
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::list_directory',
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::list',
    }))

    const searchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_search_files') as any
    const searchResult = await searchTool.execute({
      path: '/workspace',
      query: 'alpha',
      recursive: true,
      maxResults: 1,
      caseSensitive: true,
      regex: true,
      includeGlobs: ['src/**', '  ', 'src/**'],
      excludeGlobs: ['**/*.spec.ts', '**/*.spec.ts'],
      pathMode: 'relative',
    }) as any
    expect(searchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'search_files',
      path: '/workspace',
      query: 'alpha',
      recursive: true,
      caseSensitive: true,
      regex: true,
      includeGlobs: ['src/**'],
      excludeGlobs: ['**/*.spec.ts'],
      pathMode: 'relative',
      mcpToolName: 'filesystem::search',
      matchCount: 1,
      totalMatchCount: 2,
      filteredOutCount: 0,
      truncated: true,
    }))
    expect(searchResult.matches).toEqual([
      {
        path: 'src/main.ts',
        line: 12,
        column: 4,
        snippet: 'const alpha = true',
      },
    ])
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::search_files',
      arguments: expect.objectContaining({
        caseSensitive: true,
        regex: true,
        includeGlobs: ['src/**'],
        excludeGlobs: ['**/*.spec.ts'],
        pathMode: 'relative',
      }),
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::search',
    }))
  })

  it('rejects filesystem_write_file expectedHash when no read state exists in the current turn', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 2,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-hash-guard-1',
        decisionTraceId: 'trace-filesystem-hash-guard-1',
        sessionId: 'session-filesystem-hash-guard-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-hash-guard-1',
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
      invokeMcpCallTool: vi.fn(async () => ({ ok: true, isError: false })),
    })

    const writeTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_write_file') as any
    const writeResult = await writeTool.execute({
      path: '/workspace/guarded.txt',
      content: 'hello',
      expectedHash: 'abc123',
    }) as any
    expect(writeResult).toEqual(expect.objectContaining({
      status: 'failed',
      operation: 'write_file',
      errorCode: 'FILESYSTEM_EXPECTED_HASH_MISSING',
    }))
  })

  it('rejects filesystem_patch_file when changes is empty', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 2,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-patch-empty-1',
        decisionTraceId: 'trace-filesystem-patch-empty-1',
        sessionId: 'session-filesystem-patch-empty-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-patch-empty-1',
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
      invokeMcpCallTool: vi.fn(async () => ({ ok: true, isError: false })),
    })

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/guarded.txt',
      changes: [],
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'failed',
      operation: 'patch_file',
      errorCode: 'FILESYSTEM_PATCH_EMPTY_CHANGES',
    }))
  })

  it('runs filesystem_patch_file in dryRun mode without persisting write', async () => {
    const sourceContent = 'alpha\\nbeta\\n'
    const invokeMcpCallTool = vi.fn(async (payload: any) => {
      if (payload?.name === 'filesystem::read_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: sourceContent }],
        }
      }
      if (payload?.name === 'filesystem::write_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: 'written' }],
        }
      }
      return {
        ok: false,
        isError: true,
        errorCode: 'MCP_CALL_FAILED',
        errorMessage: 'method not found',
      }
    })

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 1,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-patch-dry-run-1',
        decisionTraceId: 'trace-filesystem-patch-dry-run-1',
        sessionId: 'session-filesystem-patch-dry-run-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-patch-dry-run-1',
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
      invokeMcpCallTool,
    })

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/notes.txt',
      changes: [{ oldText: 'alpha', newText: 'omega' }],
      dryRun: true,
      maxPreviewBytes: 32,
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'patch_file',
      dryRun: true,
      writeApplied: false,
      path: '/workspace/notes.txt',
      totalChanges: 1,
      appliedChanges: 1,
      skippedChanges: 0,
      totalReplacedCount: 1,
      previousHash: expect.any(String),
      nextHash: expect.any(String),
      previewTruncated: false,
      preview: expect.stringContaining('omega'),
    }))

    const writeCalls = invokeMcpCallTool.mock.calls.filter((call: any[]) => call?.[0]?.name === 'filesystem::write_file')
    expect(writeCalls).toHaveLength(0)
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::read_file',
    }))
  })

  it('returns routing rationale and experience in executor tool result payload', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-routing-rationale-1',
        selectedChannel: 'claude-code',
        metadata: {
          fabric: {
            experience: {
              advisorChannel: 'claude-code',
              advisorConfidence: 0.9,
            },
          },
        },
      },
      plan: {
        state: 'routed',
        proposedChannel: 'claude-code',
        reasonTags: ['advisor:claude-code', 'advisor-channel'],
        narrative: ['Routing adopted the external channel assessor recommendation with confidence weighting.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 5,
      nextTickAt: 10,
      sample: {
        collectedAt: 1,
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
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-routing-rationale-1',
        decisionTraceId: 'trace-routing-rationale-1',
        sessionId: 'session-routing-rationale-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const cliTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_cli') as any
    const result = await cliTool.execute({
      command: 'echo',
      args: ['hello'],
    })

    expect(result).toEqual(expect.objectContaining({
      planState: 'routed',
      proposedChannel: 'claude-code',
      routeReasonTags: ['advisor:claude-code', 'advisor-channel'],
      routeNarrative: ['Routing adopted the external channel assessor recommendation with confidence weighting.'],
      routeExperience: expect.objectContaining({
        advisorChannel: 'claude-code',
        advisorConfidence: 0.9,
      }),
    }))
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

  it('resumes an existing pending thread when threadId is provided to an executor tool', async () => {
    const executeTaskThread = vi.fn(async () => {
      throw new Error('should not plan a new thread')
    })
    const resumeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-resume-1',
        selectedChannel: 'codex',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'codex',
      },
      summary: 'resumed existing thread',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 5,
      nextTickAt: 10,
      sample: {
        collectedAt: 1,
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
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-resume-1',
        decisionTraceId: 'trace-resume-1',
        sessionId: 'session-resume-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      resumeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const codexTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_codex') as any
    const result = await codexTool.execute({
      threadId: 'thread-resume-1',
      prompt: 'ignored because thread resume takes priority',
    })

    expect(result.summary).toBe('resumed existing thread')
    expect(resumeTaskThread).toHaveBeenCalledWith({
      context: {
        cardId: 'default',
        turnId: 'turn-resume-1',
        decisionTraceId: 'trace-resume-1',
        sessionId: 'session-resume-1',
      },
      threadId: 'thread-resume-1',
    })
    expect(executeTaskThread).not.toHaveBeenCalled()
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
