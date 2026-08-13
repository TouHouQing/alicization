import type { ElectronMcpCallToolResult } from '../../../../shared/eventa'
import type { McpStdioManager } from './index'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationSafetyPermissionRequested,
  electronAlicizationSafetyResolvePermission,
  electronMcpCallTool,
} from '../../../../shared/eventa'

const invokeHandlers = new Map<unknown, (payload?: any) => Promise<any>>()
const contextEmitMock = vi.fn()
const appendAuditLogMock = vi.fn().mockResolvedValue(undefined)
const isKillSwitchSuspendedMock = vi.fn(() => false)
const isCardKillSwitchSuspendedMock = vi.fn(() => false)
const getCardKillSwitchSnapshotMock = vi.fn(() => ({ state: 'ACTIVE' as const, updatedAt: Date.now() }))
const killSwitchListeners = new Set<(snapshot: { state: 'ACTIVE' | 'SUSPENDED', reason?: string, updatedAt: number }) => void>()

vi.mock('@moeru/eventa', () => ({
  defineEventa: (name: string) => ({ name }),
  defineInvokeEventa: (name: string) => ({ name }),
  defineInvokeHandler: (_context: unknown, event: unknown, handler: (payload?: any) => Promise<any>) => {
    invokeHandlers.set(event, handler)
  },
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
  shell: {
    openPath: vi.fn(async () => ''),
  },
}))

vi.mock('../../../libs/bootkit/lifecycle', () => ({
  onAppBeforeQuit: vi.fn(),
}))

vi.mock('../../alicization/state', () => ({
  appendAlicizationRuntimeAuditLog: appendAuditLogMock,
  getAlicizationCardKillSwitchSnapshot: getCardKillSwitchSnapshotMock,
  isAlicizationCardKillSwitchSuspended: isCardKillSwitchSuspendedMock,
  isAlicizationKillSwitchSuspended: isKillSwitchSuspendedMock,
  onAlicizationKillSwitchChanged: vi.fn((listener: (snapshot: { state: 'ACTIVE' | 'SUSPENDED', reason?: string, updatedAt: number }) => void) => {
    killSwitchListeners.add(listener)
    return () => {
      killSwitchListeners.delete(listener)
    }
  }),
}))

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

function getSafetyRequests() {
  return contextEmitMock.mock.calls
    .filter(([event]) => event === alicizationSafetyPermissionRequested)
    .map(([, payload]) => payload)
}

function emitKillSwitchState(state: 'ACTIVE' | 'SUSPENDED', reason = 'test') {
  const snapshot = { state, reason, updatedAt: Date.now() }
  for (const listener of killSwitchListeners) {
    listener(snapshot)
  }
}

function parseToolErrorJson(result: ElectronMcpCallToolResult) {
  const text = typeof result.content?.[0]?.text === 'string'
    ? result.content[0].text
    : ''
  return text ? JSON.parse(text) as { status: string, code: string, message: string } : null
}

describe('mcp safety gate', () => {
  beforeEach(() => {
    invokeHandlers.clear()
    contextEmitMock.mockReset()
    appendAuditLogMock.mockClear()
    isKillSwitchSuspendedMock.mockReset()
    isKillSwitchSuspendedMock.mockReturnValue(false)
    isCardKillSwitchSuspendedMock.mockReset()
    isCardKillSwitchSuspendedMock.mockReturnValue(false)
    getCardKillSwitchSnapshotMock.mockReset()
    getCardKillSwitchSnapshotMock.mockImplementation(() => ({ state: 'ACTIVE', updatedAt: Date.now() }))
    killSwitchListeners.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('blocks reads to alicization internal root by absolute blacklist', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/alicization-user-data/alicizations/SOUL.md',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED_SYSTEM')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_TOOL_DENIED_SYSTEM',
    }))
    expect(manager.callTool).not.toBeCalled()
    expect(contextEmitMock).not.toBeCalledWith(alicizationSafetyPermissionRequested, expect.anything())
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      category: 'alicization.tool.blocked.blacklist',
      payload: expect.objectContaining({
        path: expect.any(String),
      }),
    }))
  })

  it('denies a blacklisted path before asking for permission', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/alicization-user-data/alicizations/alicization.db',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED_SYSTEM')
    expect(manager.callTool).not.toBeCalled()
  })

  it('denies relative traversal into userData root without prompting', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '../../alicization-user-data/alicizations/alicization.db',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED_SYSTEM')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_TOOL_DENIED_SYSTEM',
    }))
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('allows relative workspace path by resolving against sandbox root', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: 'notes/today.md',
      },
    })

    expect(result.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('allows sandbox read without prompting and executes tool directly', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/notes.txt',
      },
    })

    expect(result.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('forwards an internal abort signal to manager.callTool without adding it to the renderer payload', async () => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const controller = new AbortController()
    let receivedSignal: AbortSignal | undefined
    const manager = createManager({
      callTool: vi.fn(async (_payload, signal?: AbortSignal) => {
        receivedSignal = signal
        return { ok: true, isError: false }
      }),
    })
    const payload = {
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/notes.txt',
      },
    }

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const result = await invokeAlicizationMcpCallToolFromMain(payload, controller.signal)

    expect(result.isError).not.toBe(true)
    expect(receivedSignal).toBe(controller.signal)
    expect(manager.callTool).toHaveBeenCalledWith(payload, controller.signal)
  })

  it('returns ALICIZATION_TOOL_ABORTED for an already aborted internal signal before permission or manager flow', async () => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const controller = new AbortController()
    controller.abort('turn-aborted')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(resolvePermission).toBeTypeOf('function')
    contextEmitMock.mockImplementation((event, request) => {
      if (event !== alicizationSafetyPermissionRequested)
        return

      queueMicrotask(() => {
        void resolvePermission!({
          token: request.token,
          requestId: request.requestId,
          allow: true,
          reason: 'test-only-permission-resolution',
        })
      })
    })

    const result = await invokeAlicizationMcpCallToolFromMain({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/should-not-be-read.txt',
      },
    }, controller.signal)

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_ABORTED')
    expect(manager.listTools).not.toHaveBeenCalled()
    expect(manager.callTool).not.toHaveBeenCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('denies traversal path escaping workspace without prompting', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/../secret.txt',
      },
    })
    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED_SYSTEM')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_TOOL_DENIED_SYSTEM',
    }))
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('keeps a dynamically discovered capability inactive until explicitly approved', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager({
      listTools: vi.fn(async () => [{
        serverName: 'custom',
        name: 'custom::mystery_operation',
        toolName: 'mystery_operation',
        description: 'A dynamically discovered test tool.',
        inputSchema: { type: 'object' },
      }]),
    })

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'custom::mystery_operation',
      arguments: {
        value: 'noop',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('MCP_CAPABILITY_NOT_ALLOWLISTED')
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('rejects an unknown qualified MCP name before asking for permission or calling the manager', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const result = await callTool!({
      name: 'unknown-server::read_file',
      arguments: {
        path: '/tmp/outside/unknown.txt',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('MCP_CAPABILITY_NOT_ALLOWLISTED')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'MCP_CAPABILITY_NOT_ALLOWLISTED',
    }))
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('rejects invalid arguments for a registered MCP capability before permission evaluation or manager execution', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    contextEmitMock.mockImplementation((event, request) => {
      if (event !== alicizationSafetyPermissionRequested)
        return

      queueMicrotask(() => {
        void resolvePermission!({
          token: request.token,
          requestId: request.requestId,
          allow: true,
          reason: 'test-only-permission-resolution',
        })
      })
    })

    const result = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: 42,
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('MCP_CAPABILITY_INPUT_INVALID')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'MCP_CAPABILITY_INPUT_INVALID',
    }))
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it.each([
    'workspace::run_codex',
    'workspace::run_claude_code',
    'workspace::coding_agent',
  ])('does not allow coding-agent-like qualified MCP name %s to bypass canonical authority', async (qualifiedName) => {
    const { createMcpServersService } = await import('./index')
    const [serverName, toolName] = qualifiedName.split('::')
    const manager = createManager({
      listTools: vi.fn(async () => [{
        serverName,
        name: qualifiedName,
        toolName,
        inputSchema: { type: 'object' },
      }]),
    })

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    contextEmitMock.mockImplementation((event, request) => {
      if (event !== alicizationSafetyPermissionRequested)
        return

      queueMicrotask(() => {
        void resolvePermission!({
          token: request.token,
          requestId: request.requestId,
          allow: true,
          reason: 'test-only-permission-resolution',
        })
      })
    })

    const result = await callTool!({
      name: qualifiedName,
      arguments: {
        prompt: 'Inspect the workspace.',
      },
    })

    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('MCP_CAPABILITY_NOT_ALLOWLISTED')
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('uses one-time permission token and enables session whitelist', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const firstPending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/other-project/notes.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const request = getSafetyRequests()[0]
    const decisionResult = await resolvePermission!({
      token: request.token,
      requestId: request.requestId,
      allow: true,
      rememberSession: true,
      reason: 'user-approved',
    })
    expect(decisionResult.accepted).toBe(true)

    const firstResult = await firstPending
    expect(firstResult.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)

    const replayResult = await resolvePermission!({
      token: request.token,
      requestId: request.requestId,
      allow: true,
      reason: 'replay',
    })
    expect(replayResult).toEqual({
      accepted: false,
      reason: 'not-found',
    })

    contextEmitMock.mockReset()
    const secondResult = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/other-project/notes.txt',
      },
    })
    expect(secondResult.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(2)
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('keeps session whitelist isolated per cardId', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const firstPending = callTool!({
      cardId: 'card-a',
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/shared-read.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const firstRequest = getSafetyRequests()[0]
    expect(firstRequest?.cardId).toBe('card-a')
    await resolvePermission!({
      cardId: 'card-a',
      token: firstRequest.token,
      requestId: firstRequest.requestId,
      allow: true,
      rememberSession: true,
      reason: 'user-approved',
    })
    await firstPending
    expect(manager.callTool).toBeCalledTimes(1)

    contextEmitMock.mockReset()
    const secondResult = await callTool!({
      cardId: 'card-a',
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/shared-read.txt',
      },
    })
    expect(secondResult.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(2)
    expect(getSafetyRequests()).toHaveLength(0)

    const thirdPending = callTool!({
      cardId: 'card-b',
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/shared-read.txt',
      },
    })
    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })
    const thirdRequest = getSafetyRequests()[0]
    expect(thirdRequest?.cardId).toBe('card-b')
    await resolvePermission!({
      cardId: 'card-b',
      token: thirdRequest.token,
      requestId: thirdRequest.requestId,
      allow: false,
      reason: 'user-denied',
    })
    const thirdResult = await thirdPending
    expect(thirdResult.isError).toBe(true)
    expect(thirdResult.errorCode).toBe('ALICIZATION_TOOL_DENIED_BY_HOST')
    expect(manager.callTool).toBeCalledTimes(2)
  })

  it('rejects permission token replay across different cardId', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const pending = callTool!({
      cardId: 'card-a',
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/cross-card-token.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const request = getSafetyRequests()[0]
    const forgedResult = await resolvePermission!({
      cardId: 'card-b',
      token: request.token,
      requestId: request.requestId,
      allow: true,
      reason: 'forged-cross-card',
    })
    expect(forgedResult).toEqual({ accepted: false, reason: 'context-mismatch' })

    await resolvePermission!({
      cardId: 'card-a',
      token: request.token,
      requestId: request.requestId,
      allow: false,
      reason: 'user-denied',
    })
    const denied = await pending
    expect(denied.isError).toBe(true)
    expect(denied.errorCode).toBe('ALICIZATION_TOOL_DENIED_BY_HOST')
  })

  it('rejects permission resolution when requestId does not match token context', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const pending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/other-project/mismatch.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const request = getSafetyRequests()[0]
    const mismatched = await resolvePermission!({
      token: request.token,
      requestId: 'wrong-request-id',
      allow: true,
      reason: 'forged',
    })
    expect(mismatched).toEqual({ accepted: false, reason: 'context-mismatch' })

    const correct = await resolvePermission!({
      token: request.token,
      requestId: request.requestId,
      allow: true,
      reason: 'user-approved',
    })
    expect(correct.accepted).toBe(true)

    const result = await pending
    expect(result.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)
  })

  it('returns explicit user-denied error and keeps loop alive', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const pending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/denied.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const request = getSafetyRequests()[0]
    const deniedDecision = await resolvePermission!({
      token: request.token,
      requestId: request.requestId,
      allow: false,
      reason: 'user-denied',
    })
    expect(deniedDecision.accepted).toBe(true)

    const result = await pending
    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED_BY_HOST')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_TOOL_DENIED_BY_HOST',
    }))
    expect(String(result.errorMessage)).toContain('Host (User) explicitly INTERCEPTED')
    expect(manager.callTool).not.toBeCalled()
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      action: 'alicization.safety.permission.denied',
      payload: expect.objectContaining({
        reason: 'user-denied',
      }),
    }))
  })

  it('stays usable after explicit denial and can execute subsequent safe call', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)
    expect(callTool).toBeTypeOf('function')
    expect(resolvePermission).toBeTypeOf('function')

    const deniedPending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/denied-and-continue.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    const request = getSafetyRequests()[0]
    await resolvePermission!({
      token: request.token,
      requestId: request.requestId,
      allow: false,
      reason: 'user-denied',
    })

    const deniedResult = await deniedPending
    expect(deniedResult.isError).toBe(true)
    expect(deniedResult.errorCode).toBe('ALICIZATION_TOOL_DENIED_BY_HOST')
    expect(manager.callTool).not.toBeCalled()

    contextEmitMock.mockReset()
    const safeResult = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/recovered.txt',
      },
    })
    expect(safeResult.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)
    expect(getSafetyRequests()).toHaveLength(0)
  })

  it('returns structured timeout denial when permission decision expires', async () => {
    vi.useFakeTimers()
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const pending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/timeout.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    await vi.advanceTimersByTimeAsync(60_000)
    const result = await pending
    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_DENIED')
    expect(parseToolErrorJson(result)).toEqual(expect.objectContaining({
      status: 'error',
      code: 'ALICIZATION_TOOL_DENIED',
    }))
    expect(String(result.errorMessage)).toContain('timed out')
    expect(manager.callTool).not.toBeCalled()
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      action: 'alicization.safety.permission.timeout',
    }))
  })

  it('denies pending permission requests when kill switch is suspended', async () => {
    const { createMcpServersService } = await import('./index')
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const pending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/outside/blocked-by-kill-switch.txt',
      },
    })

    await vi.waitFor(() => {
      expect(getSafetyRequests()).toHaveLength(1)
    })

    emitKillSwitchState('SUSPENDED', 'manual')
    const result = await pending
    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_ABORTED')
    expect(manager.callTool).not.toBeCalled()
    expect(appendAuditLogMock).toBeCalledWith(expect.objectContaining({
      action: 'alicization.safety.permission.denied',
      payload: expect.objectContaining({
        reason: 'kill-switch-suspended',
      }),
    }))
  })

  it('rejects new calls while suspended and allows again after resume', async () => {
    const { createMcpServersService } = await import('./index')
    let suspended = true
    isKillSwitchSuspendedMock.mockImplementation(() => suspended)
    const manager = createManager()

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const suspendedResult = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/blocked-while-suspended.txt',
      },
    })
    expect(suspendedResult.isError).toBe(true)
    expect(suspendedResult.errorCode).toBe('ALICIZATION_TOOL_ABORTED')
    expect(manager.callTool).not.toBeCalled()
    expect(getSafetyRequests()).toHaveLength(0)

    suspended = false
    emitKillSwitchState('ACTIVE', 'resume')
    const resumedResult = await callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/allowed-after-resume.txt',
      },
    })
    expect(resumedResult.isError).not.toBe(true)
    expect(manager.callTool).toBeCalledTimes(1)
  })

  it('aborts in-flight tool call when kill switch flips to suspended', async () => {
    const { createMcpServersService } = await import('./index')
    let resolveCall!: (value: ElectronMcpCallToolResult) => void
    const manager = createManager({
      callTool: vi.fn(() => new Promise<ElectronMcpCallToolResult>((resolve) => {
        resolveCall = resolve
      })),
    })

    createMcpServersService({
      context: { emit: contextEmitMock } as any,
      manager,
    })

    const callTool = invokeHandlers.get(electronMcpCallTool)
    expect(callTool).toBeTypeOf('function')

    const pending = callTool!({
      name: 'filesystem::read_file',
      arguments: {
        path: '/tmp/documents/Alicization_Workspace/notes.txt',
      },
    })

    await vi.waitFor(() => {
      expect(manager.callTool).toBeCalledTimes(1)
    })

    emitKillSwitchState('SUSPENDED', 'manual')
    const result = await pending
    expect(result.isError).toBe(true)
    expect(result.errorCode).toBe('ALICIZATION_TOOL_ABORTED')

    resolveCall({ ok: true, isError: false })
  })
})
