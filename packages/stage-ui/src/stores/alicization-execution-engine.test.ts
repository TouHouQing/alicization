import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAlicizationBridge, setAlicizationBridge } from './alicization-bridge'
import { useAlicizationExecutionEngineStore } from './alicization-execution-engine'
import { clearMcpToolBridge, setMcpToolBridge } from './mcp-tool-bridge'

function createAlicizationBridgeStub(overrides?: Partial<Parameters<typeof setAlicizationBridge>[0]>) {
  return {
    bootstrap: vi.fn(),
    getSoul: vi.fn(),
    initializeGenesis: vi.fn(),
    updateSoul: vi.fn(),
    updatePersonality: vi.fn(),
    getKillSwitchState: vi.fn(),
    suspendKillSwitch: vi.fn(),
    resumeKillSwitch: vi.fn(),
    getMemoryStats: vi.fn(),
    runMemoryPrune: vi.fn(),
    updateMemoryStats: vi.fn(),
    retrieveMemoryFacts: vi.fn(),
    upsertMemoryFacts: vi.fn(),
    importLegacyMemory: vi.fn(),
    appendAuditLog: vi.fn(),
    realtimeExecute: vi.fn(),
    getSensorySnapshot: vi.fn().mockResolvedValue({
      sample: {
        collectedAt: Date.now(),
        time: { iso: '', local: '', timezone: 'UTC' },
        cpu: { usagePercent: 0, windowMs: 1000 },
        memory: { freeMB: 0, totalMB: 0, usagePercent: 0 },
      },
      stale: false,
      ageMs: 0,
      nextTickAt: null,
      running: true,
    }),
    ...overrides,
  } as any
}

describe('alicization execution engine', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    clearAlicizationBridge()
    clearMcpToolBridge()
  })

  afterEach(() => {
    clearAlicizationBridge()
    clearMcpToolBridge()
    vi.restoreAllMocks()
  })

  it('handles realtime weather query with builtin execution', async () => {
    const realtimeExecute = vi.fn().mockResolvedValue({
      category: 'weather',
      source: 'builtin',
      ok: true,
      summary: 'weather ; title=United States ; lead=United States 现在 晴朗 ; fields=温度=22.0°C, 体感=21.0°C, 湿度=48%, 风速=11.0 km/h',
      surface: {
        kind: 'weather',
        title: 'United States',
        lead: 'United States 现在 晴朗',
        fields: [
          { label: '温度', value: '22.0°C' },
          { label: '体感', value: '21.0°C' },
          { label: '湿度', value: '48%' },
          { label: '风速', value: '11.0 km/h' },
        ],
      },
      durationMs: 120,
    })
    setAlicizationBridge(createAlicizationBridgeStub({ realtimeExecute }))

    setMcpToolBridge({
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({ isError: true, ok: false }),
      getCapabilitiesSnapshot: vi.fn().mockResolvedValue({
        path: '',
        updatedAt: Date.now(),
        servers: [],
        tools: [],
        healthyServers: 0,
      }),
    })

    const store = useAlicizationExecutionEngineStore()
    const output = await store.executeRealtimeQueryTurn({
      origin: 'ui-user',
      message: '帮我查一下今天美国天气',
    })

    expect(output.handled).toBe(true)
    expect(output.evidences).toHaveLength(1)
    expect(output.failedCategories).toHaveLength(0)
    expect(output.reply).toContain('United States 现在 晴朗')
    expect(output.reply).not.toContain('内置源')
    expect(output.trace.toolEvidence.verifiedToolResult).toBe(true)
    expect(realtimeExecute).toHaveBeenCalledTimes(1)
  })

  it('falls back honestly when no verified evidence exists', async () => {
    const realtimeExecute = vi.fn().mockResolvedValue({
      category: 'news',
      source: 'builtin',
      ok: false,
      errorCode: 'NO_DATA',
      errorMessage: 'empty',
      durationMs: 90,
    })
    setAlicizationBridge(createAlicizationBridgeStub({ realtimeExecute }))

    setMcpToolBridge({
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({ isError: true, ok: false }),
      getCapabilitiesSnapshot: vi.fn().mockResolvedValue({
        path: '',
        updatedAt: Date.now(),
        servers: [],
        tools: [],
        healthyServers: 0,
      }),
    })

    const audits: string[] = []
    const store = useAlicizationExecutionEngineStore()
    const output = await store.executeRealtimeQueryTurn({
      origin: 'ui-user',
      message: '今天美国发生了什么',
      onAudit: async (entry) => {
        audits.push(entry.action)
      },
    })

    expect(output.handled).toBe(true)
    expect(output.trace.fallbackApplied).toBe(true)
    expect(output.evidences).toHaveLength(0)
    expect(output.failedCategories).toContain('news')
    expect(output.reply).toContain('这轮没拿到可靠的实时新闻结果')
    expect(audits).toContain('unverified-fallback')
  })

  it('does not treat mcp isError result as verified evidence', async () => {
    const realtimeExecute = vi.fn().mockResolvedValue({
      category: 'weather',
      source: 'builtin',
      ok: false,
      errorCode: 'NO_DATA',
      errorMessage: 'empty',
      durationMs: 20,
    })
    setAlicizationBridge(createAlicizationBridgeStub({ realtimeExecute }))

    setMcpToolBridge({
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({
        isError: true,
        ok: false,
        content: [{ type: 'text', text: 'upstream failed' }],
      }),
      getCapabilitiesSnapshot: vi.fn().mockResolvedValue({
        path: '',
        updatedAt: Date.now(),
        servers: [{ name: 'weather', state: 'running', command: 'node', args: [], pid: 1 }],
        tools: [{
          serverName: 'weather',
          name: 'weather::get_weather',
          toolName: 'get_weather',
          description: 'weather lookup',
          inputSchema: {},
        }],
        healthyServers: 1,
      }),
    })

    const store = useAlicizationExecutionEngineStore()
    const output = await store.executeRealtimeQueryTurn({
      origin: 'ui-user',
      message: '今天美国天气',
    })

    expect(output.handled).toBe(true)
    expect(output.trace.toolEvidence.verifiedToolResult).toBe(false)
    expect(output.trace.fallbackApplied).toBe(true)
    expect(output.failedCategories).toContain('weather')
  })

  it('passes through non-realtime messages', async () => {
    setAlicizationBridge(createAlicizationBridgeStub({
      realtimeExecute: vi.fn(),
    }))
    setMcpToolBridge({
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({}),
      getCapabilitiesSnapshot: vi.fn().mockResolvedValue({
        path: '',
        updatedAt: Date.now(),
        servers: [],
        tools: [],
        healthyServers: 0,
      }),
    })

    const store = useAlicizationExecutionEngineStore()
    const output = await store.executeRealtimeQueryTurn({
      origin: 'ui-user',
      message: '帮我写一个 TypeScript 函数',
    })

    expect(output.handled).toBe(false)
    expect(output.intent.needsRealtime).toBe(false)
    expect(output.evidences).toHaveLength(0)
  })
})
