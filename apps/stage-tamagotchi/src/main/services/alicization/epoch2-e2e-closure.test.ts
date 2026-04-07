import type { ElectronMcpCallToolResult } from '../../../shared/eventa'
import type { McpStdioManager } from '../airi/mcp-servers/index'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationDialogueResponded,
  alicizationSafetyPermissionRequested,
  electronAlicizationAppendConversationTurn,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationSafetyResolvePermission,
  electronMcpCallTool,
} from '../../../shared/eventa'
import { setAlicizationKillSwitchState } from './state'

const invokeHandlers = new Map<unknown, (payload?: any) => Promise<any>>()
const sandboxDirs: string[] = []
const emittedEvents: Array<{ event: unknown, payload: any }> = []
const runtimeAuditLogs: any[] = []
let dialogueRespondedListener: ((payload: any) => void) | null = null
const metaStore = new Map<string, string>()

const eventaContext = {
  emit: vi.fn((event: unknown, payload: unknown) => {
    emittedEvents.push({ event, payload })
    if (event === alicizationDialogueResponded) {
      dialogueRespondedListener?.(payload)
    }
  }),
}

const dbStub = {
  dbPath: '',
  close: vi.fn().mockResolvedValue(undefined),
  appendAuditLog: vi.fn(async (input) => {
    runtimeAuditLogs.push(input)
  }),
  appendConversationTurn: vi.fn().mockResolvedValue(undefined),
  getMemoryStats: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  upsertMemoryFacts: vi.fn().mockResolvedValue(undefined),
  retrieveMemoryFacts: vi.fn().mockResolvedValue([]),
  runMemoryPrune: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  importLegacyMemory: vi.fn().mockResolvedValue({
    migrated: false,
    importedFacts: 0,
    importedArchive: 0,
    marker: 'legacy_memory_migrated_v1',
  }),
  overrideMemoryStats: vi.fn().mockResolvedValue({
    total: 0,
    active: 0,
    archived: 0,
    lastPrunedAt: null,
  }),
  listActiveThoughts: vi.fn().mockResolvedValue([]),
  replaceActiveThoughts: vi.fn().mockResolvedValue([]),
  appendSubconsciousFragments: vi.fn().mockResolvedValue([]),
  searchSubconsciousFragments: vi.fn().mockResolvedValue([]),
  listRecentSubconsciousFragments: vi.fn().mockResolvedValue([]),
  countSubconsciousFragments: vi.fn().mockResolvedValue(0),
  appendRelationshipDynamics: vi.fn().mockResolvedValue(undefined),
  getLatestRelationshipDynamics: vi.fn().mockResolvedValue(null),
  insertScheduledTask: vi.fn().mockResolvedValue({
    id: 'row:task-test',
    taskId: 'task-test',
    triggerAt: Date.now() + 60_000,
    message: 'test',
    status: 'pending',
    createdAt: Date.now(),
    claimedAt: null,
    completedAt: null,
    sourceTurnId: null,
    firedTurnId: null,
    lastError: null,
  }),
  claimDueScheduledTasks: vi.fn().mockResolvedValue([]),
  completeScheduledTask: vi.fn().mockResolvedValue(undefined),
  failScheduledTask: vi.fn().mockResolvedValue(undefined),
  requeueScheduledTask: vi.fn().mockResolvedValue(undefined),
  listPendingScheduledTasks: vi.fn().mockResolvedValue([]),
  getJournalMode: vi.fn().mockResolvedValue('wal'),
  getLatestConversationSessionId: vi.fn().mockResolvedValue(undefined),
  listConversationTurnsSince: vi.fn().mockResolvedValue([]),
  listConversationTurnsBySession: vi.fn().mockResolvedValue([]),
  appendMindTurnEvents: vi.fn().mockResolvedValue(undefined),
  listMindTurnEvents: vi.fn().mockResolvedValue([]),
  upsertTaskThread: vi.fn().mockResolvedValue(undefined),
  listTaskThreads: vi.fn().mockResolvedValue([]),
  appendExecutionEvents: vi.fn().mockResolvedValue(undefined),
  listExecutionEvents: vi.fn().mockResolvedValue([]),
  clearConversationData: vi.fn().mockResolvedValue(undefined),
  getMetaValue: vi.fn(async (key: string) => metaStore.get(key)),
  setMetaValue: vi.fn(async (key: string, value: string) => {
    metaStore.set(key, value)
  }),
}

vi.mock('@moeru/eventa', () => ({
  defineEventa: (name: string) => ({ name }),
  defineInvokeEventa: (name: string) => ({ name }),
  defineInvokeHandler: (_context: unknown, event: unknown, handler: (payload?: any) => Promise<any>) => {
    invokeHandlers.set(event, handler)
  },
}))

vi.mock('@moeru/eventa/adapters/electron/main', () => ({
  createContext: () => ({
    context: eventaContext,
  }),
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData')
        return '/tmp/alicization-user-data'
      if (name === 'documents')
        return '/tmp/documents'
      return '/tmp'
    }),
    getVersion: vi.fn(() => '0.0.0-test'),
  },
  globalShortcut: {
    register: vi.fn(() => true),
    isRegistered: vi.fn(() => false),
    unregister: vi.fn(),
  },
  powerMonitor: {
    on: vi.fn(),
    removeListener: vi.fn(),
  },
  webContents: {
    getAllWebContents: vi.fn(() => []),
  },
  ipcMain: {},
  shell: {
    openPath: vi.fn(async () => ''),
  },
}))

vi.mock('../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('./db', () => ({
  setupAlicizationDb: vi.fn(async () => dbStub),
}))

const { setupAlicizationRuntime } = await import('./runtime')
const { createAlicizationSensoryBus } = await import('./sensory-bus')
const { createMcpServersService } = await import('../airi/mcp-servers/index')

function createManager(overrides?: Partial<McpStdioManager>): McpStdioManager {
  return {
    ensureConfigFile: vi.fn(async () => ({ path: '/tmp/mcp.json' })),
    openConfigFile: vi.fn(),
    applyAndRestart: vi.fn(),
    listTools: vi.fn(async () => []),
    callTool: vi.fn(async () => ({ ok: true, isError: false })),
    stopAll: vi.fn(),
    getRuntimeStatus: vi.fn() as any,
    getCapabilitiesSnapshot: vi.fn() as any,
    ...overrides,
  }
}

function parseToolError(result: ElectronMcpCallToolResult) {
  const text = typeof result.content?.[0]?.text === 'string'
    ? result.content[0].text
    : ''
  return text ? JSON.parse(text) as { status: string, code: string, message: string } : null
}

function findLatestEmittedPayload<T>(event: unknown): T | undefined {
  for (let index = emittedEvents.length - 1; index >= 0; index -= 1) {
    if (emittedEvents[index]?.event === event)
      return emittedEvents[index]?.payload as T
  }
  return undefined
}

async function createSandboxPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-epoch2-e2e-'))
  sandboxDirs.push(dir)
  return dir
}

describe('epoch2 closure e2e', () => {
  beforeEach(() => {
    invokeHandlers.clear()
    emittedEvents.splice(0, emittedEvents.length)
    runtimeAuditLogs.splice(0, runtimeAuditLogs.length)
    dialogueRespondedListener = null
    metaStore.clear()
    vi.clearAllMocks()
    dbStub.appendConversationTurn.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    while (sandboxDirs.length > 0) {
      const dir = sandboxDirs.pop()
      if (dir) {
        await rm(dir, { recursive: true, force: true })
      }
    }
  })

  it('completes HitL denial loop and keeps dialogue/presence pipeline alive without unhandled rejections', async () => {
    const unhandledRejections: unknown[] = []
    const unhandledListener = (reason: unknown) => {
      unhandledRejections.push(reason)
    }
    process.on('unhandledRejection', unhandledListener)

    try {
      const sandboxPath = await createSandboxPath()
      await setupAlicizationRuntime({
        userDataPathOverride: sandboxPath,
      })
      createMcpServersService({
        context: eventaContext as any,
        manager: createManager(),
      })

      // Simulate M2.1 degraded sensory probe in closure pipeline.
      const timeoutError = Object.assign(new Error('probe timeout'), { code: 'PROBE_TIMEOUT' })
      const sensoryBus = createAlicizationSensoryBus({
        appendAuditLog: async (input) => {
          runtimeAuditLogs.push(input)
        },
        platformOverride: 'darwin',
        cpuWindowMs: 200,
        runCommand: vi.fn().mockRejectedValue(timeoutError),
      })
      const sensorySample = await sensoryBus.refreshNow({ timeoutMs: 500 })
      expect(sensorySample.degraded).toContain('battery-unavailable')

      const callTool = invokeHandlers.get(electronMcpCallTool)
      const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
      const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
      expect(callTool).toBeTypeOf('function')
      expect(resolvePermission).toBeTypeOf('function')
      expect(appendConversationTurn).toBeTypeOf('function')

      const rendererListener = vi.fn()
      dialogueRespondedListener = rendererListener

      const pendingDeniedToolResult = callTool!({
        name: 'filesystem::write_file',
        arguments: {
          path: '/tmp/outside/secrets.txt',
          content: 'classified',
        },
      })

      await vi.waitFor(() => {
        expect(findLatestEmittedPayload(alicizationSafetyPermissionRequested)).toBeTruthy()
      })

      const permissionRequest = findLatestEmittedPayload<any>(alicizationSafetyPermissionRequested)
      await resolvePermission!({
        token: permissionRequest.token,
        requestId: permissionRequest.requestId,
        allow: false,
        reason: 'user-denied',
      })

      const deniedResult = await pendingDeniedToolResult
      expect(deniedResult.isError).toBe(true)
      expect(parseToolError(deniedResult)).toEqual(expect.objectContaining({
        status: 'error',
        code: 'ALICIZATION_TOOL_DENIED_BY_HOST',
      }))

      await appendConversationTurn!({
        cardId: 'default',
        turnId: 'e2e-hitl-denied-turn',
        sessionId: 'epoch2-e2e-session',
        userText: '请帮我写入系统文件',
        assistantText: '抱歉，主人取消了这个操作。',
        structured: {
          thought: 'permission denied by owner',
          emotion: 'apologetic',
          reply: '抱歉，主人取消了这个操作。',
          parsePath: 'json',
        },
        createdAt: Date.now(),
      })

      expect(rendererListener).toBeCalledWith(expect.objectContaining({
        cardId: 'default',
        turnId: 'e2e-hitl-denied-turn',
        structured: expect.objectContaining({
          emotion: 'apologetic',
        }),
      }))

      const degradedAudit = runtimeAuditLogs.find(item => item.category === 'alicization.sensory' && item.action === 'sample-battery-timeout')
      expect(degradedAudit).toBeTruthy()

      const deniedAudit = runtimeAuditLogs.find(item => item.action === 'alicization.safety.permission.denied' && item.payload?.reason === 'user-denied')
      expect(deniedAudit).toBeTruthy()
      expect(deniedAudit.payload).toEqual(expect.objectContaining({
        path: expect.stringContaining('/.../secrets.txt'),
        argumentsSummary: expect.objectContaining({
          kind: 'object',
        }),
      }))

      await new Promise(resolve => setImmediate(resolve))
      expect(unhandledRejections).toHaveLength(0)
    }
    finally {
      dialogueRespondedListener = null
      process.off('unhandledRejection', unhandledListener)
    }
  })

  it('keeps renderer alicizationDialogueResponded listener silent when kill switch aborts turn in-flight', async () => {
    const sandboxPath = await createSandboxPath()
    await setupAlicizationRuntime({
      userDataPathOverride: sandboxPath,
    })

    const appendConversationTurn = invokeHandlers.get(electronAlicizationAppendConversationTurn)
    const suspend = invokeHandlers.get(electronAlicizationKillSwitchSuspend)
    const resume = invokeHandlers.get(electronAlicizationKillSwitchResume)
    expect(appendConversationTurn).toBeTypeOf('function')
    expect(suspend).toBeTypeOf('function')
    expect(resume).toBeTypeOf('function')

    const rendererListener = vi.fn()
    dialogueRespondedListener = rendererListener

    dbStub.appendConversationTurn.mockImplementationOnce(async () => {
      setAlicizationKillSwitchState('SUSPENDED', 'epoch2-e2e-stream-abort')
    })

    await appendConversationTurn!({
      cardId: 'default',
      turnId: 'e2e-stream-abort-turn',
      sessionId: 'epoch2-e2e-session',
      assistantText: '中断中',
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '中断中',
        parsePath: 'json',
      },
      createdAt: Date.now(),
    })

    expect(rendererListener).not.toBeCalled()
    setAlicizationKillSwitchState('ACTIVE', 'epoch2-e2e-cleanup')
  })
})
