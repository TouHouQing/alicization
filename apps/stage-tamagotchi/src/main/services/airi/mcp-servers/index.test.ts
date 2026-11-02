import type { ElectronMcpCallToolResult } from '../../../../shared/eventa'
import type { LifeInterfaceRiskRequest } from '../../alicization/life-interface-risk'
import type { McpStdioManager } from './index'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  alicizationSafetyPermissionRequested,
  electronAlicizationSafetyResolvePermission,
  electronMcpCallTool,
} from '../../../../shared/eventa'
import { setupAlicizationDb } from '../../alicization/db'
import { isActionAwaitingHost } from '../../alicization/execution/action-approval-presence'
import { withActionDispatch } from '../../alicization/execution/action-dispatch-context'
import { createExecutionResourceBroker } from '../../alicization/execution/resource-broker'
import { createLifeTurnRuntime } from '../../alicization/life-turn-runtime'
import { buildMainGatewayTools, normalizeMcpToolCallResult } from '../../alicization/main-chat-execution-surface'
import { createCanonicalToolRegistry } from '../../alicization/turn-os/tool-registry'

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
    getAppPath: vi.fn(),
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
  it.each([
    { interrupted: false, kind: 'error' },
    { interrupted: true, kind: 'error' },
    { interrupted: false, kind: 'result' },
    { interrupted: true, kind: 'result' },
  ])('preserves an unknown native search stop through the main safety boundary: $kind interrupted=$interrupted', async ({ interrupted, kind }) => {
    const { app } = await import('electron')
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const { LocalSearchSettlementError } = await import('./local-search')
    const root = await mkdtemp(join(tmpdir(), 'life-search-unknown-stop-'))
    const getPath = vi.mocked(app.getPath)
    const previous = getPath.getMockImplementation()!
    getPath.mockImplementation(name => name === 'documents' ? join(root, 'documents') : name === 'userData' ? join(root, 'profile') : previous(name))
    const controller = new AbortController()
    let rejectInvocation: (error: Error) => void = () => {}
    let resolveInvocation: (result: ElectronMcpCallToolResult) => void = () => {}
    const callTool = vi.fn(() => new Promise<ElectronMcpCallToolResult>((resolve, reject) => {
      rejectInvocation = reject
      resolveInvocation = resolve
    }))
    try {
      createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager({ callTool }) })
      const pending = invokeAlicizationMcpCallToolFromMain({ cardId: 'default', name: 'filesystem::search_files', arguments: { path: join(root, 'documents', 'Alicization_Workspace'), query: 'owned-search' } }, controller.signal)
      await vi.waitFor(() => expect(callTool).toHaveBeenCalledOnce())
      if (interrupted)
        controller.abort(new DOMException('Owned search interrupted', 'AbortError'))
      if (kind === 'error')
        rejectInvocation(new LocalSearchSettlementError())
      else resolveInvocation({ ok: false, isError: true, effectMayHaveOccurred: false, executionStopped: false, errorCode: 'OWNED_NATIVE_SEARCH_STOP_UNKNOWN' })
      expect(await pending).toMatchObject({ ok: false, isError: true, effectMayHaveOccurred: false, executionStopped: false, errorCode: interrupted ? 'ALICIZATION_TOOL_ABORTED' : kind === 'error' ? 'MCP_CALL_FAILED' : 'OWNED_NATIVE_SEARCH_STOP_UNKNOWN' })
    }
    finally {
      getPath.mockImplementation(previous)
      await rm(root, { recursive: true, force: true })
    }
  })

  it.skipIf(platform !== 'win32' || arch !== 'x64')('advertises local search only while the fixed native resource can actually be verified', async () => {
    const { app } = await import('electron')
    const { createMcpStdioManager } = await import('./index')
    const manager = createMcpStdioManager()
    const appPath = fileURLToPath(new URL('../../../../../', import.meta.url))
    vi.mocked(app.getAppPath).mockReturnValueOnce(appPath)
    expect((await manager.listTools()).some(tool => tool.name === 'filesystem::search_files')).toBe(true)
    vi.mocked(app.getAppPath).mockReturnValueOnce(appPath)
    const offered = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      toolRegistry: createCanonicalToolRegistry(),
      context: { cardId: 'default', turnId: 'actual-local-catalog' },
      executionCapabilityChannels: [],
      buildExecutionRuntimeContext: async () => ({ generatedAt: Date.now(), sensory: { running: false, stale: true, capture: null, collectedAt: null, ageMs: 0, foregroundWindow: null } }),
      executeTaskThread: vi.fn(),
      getSensorySnapshot: () => ({ running: false, stale: true, capture: null, sample: null } as any),
      resolveTaskPlanningCapabilities: async () => [],
      scheduleReminderTask: vi.fn(),
      invokeMcpListTools: manager.listTools,
      invokeMcpCallTool: vi.fn(),
    })
    expect(offered.map(tool => tool.function.name)).toEqual(expect.arrayContaining(['filesystem_list_directory', 'filesystem_search_files']))
    vi.mocked(app.getAppPath).mockReturnValueOnce(join(tmpdir(), 'missing-search-resource'))
    const unavailable = await manager.listTools()
    expect(unavailable.some(tool => tool.name === 'filesystem::search_files')).toBe(false)
    expect(unavailable.some(tool => tool.name === 'filesystem::read_file')).toBe(true)
  })

  it.each([false, true])('settles an actual pre-write permission cancellation only when its private receipt survives normalization: serialized=%s', async (serialize) => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const root = await mkdtemp(join(tmpdir(), 'life-mcp-cancel-closure-'))
    const database = await setupAlicizationDb(root, { cardId: 'default' })
    const controller = new AbortController()
    try {
      const manager = createManager()
      createMcpServersService({ context: { emit: contextEmitMock } as any, manager })
      const broker = createExecutionResourceBroker()
      const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now, resourceBroker: broker })
      await life.admit({ cardId: 'default', turnId: 'cancel-permission', conversationId: 'owned-fixture', messages: [{ role: 'user', content: '仅创建指定自有回归文件，取消后不再写入。' }] }, controller.signal)
      const parameters = { path: join(root, 'must-not-exist.txt'), content: 'never approved' }
      const manifest = createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!
      const action = await life.beforeAction({ cardId: 'default', turnId: 'cancel-permission', actionId: 'write', capabilityId: manifest.capabilityId, parameters, effectContract: manifest.effects }, controller.signal)
      await action.authorizeDispatch(parameters)
      const pending = withActionDispatch(action.assertDispatchCurrent, () => invokeAlicizationMcpCallToolFromMain({ cardId: 'default', name: 'filesystem::write_file', arguments: parameters }, controller.signal))
      await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
      controller.abort(new Error('owned-fixture-user-cancelled'))
      const raw = await pending
      const result = normalizeMcpToolCallResult(serialize ? JSON.parse(JSON.stringify(raw)) : raw)
      expect(result).toMatchObject({ ok: false, errorCode: 'ALICIZATION_TOOL_ABORTED', effectMayHaveOccurred: false, sideEffectState: 'none' })
      await life.afterAction({ cardId: 'default', id: action.id, outcome: 'failure', output: result, interrupted: true })
      expect(await database.getLifeEffect(action.id)).toMatchObject({ status: serialize ? 'uncertain' : 'settled' })
      expect(broker.snapshot().length).toBe(serialize ? 1 : 0)
      expect(manager.callTool).not.toHaveBeenCalled()
      await expect(readFile(parameters.path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect((await database.readLifeState()).obligations.some(goal => goal.status === 'fulfilled')).toBe(false)
    }
    finally {
      controller.abort()
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  })
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

  it('refuses dispatch when the main-owned action expires during an actual permission wait', async () => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const root = await mkdtemp(join(tmpdir(), 'life-mcp-authority-'))
    let current = true
    try {
      const manager = createManager()
      createMcpServersService({ context: { emit: contextEmitMock } as any, manager })
      const pending = withActionDispatch(async () => {
        if (!current)
          throw new Error('The original execution lease expired')
        return { expiresAt: Date.now() + 60000 }
      }, () => invokeAlicizationMcpCallToolFromMain({ name: 'filesystem::write_file', arguments: { path: join(root, 'report.txt'), content: 'exact accepted content' } }))
      await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
      current = false
      const request = getSafetyRequests()[0]
      await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: request.cardId, requestId: request.requestId, token: request.token, allow: true })
      expect(await pending).toMatchObject({ isError: true, errorCode: 'ALICIZATION_ACTION_AUTHORITY_EXPIRED', effectMayHaveOccurred: false, executionStopped: true })
      expect(manager.callTool).not.toHaveBeenCalled()
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it.each(['read_file', 'write_file'])('rejects a redirected %s target after its actual approval', async (toolName) => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const root = await mkdtemp(join(tmpdir(), 'alicization-mcp-target-'))
    const controller = new AbortController()
    try {
      const original = join(root, 'original')
      const replacement = join(root, 'replacement')
      const alias = join(root, 'link')
      await mkdir(original)
      await mkdir(replacement)
      await writeFile(join(original, 'note.txt'), 'same')
      await writeFile(join(replacement, 'note.txt'), 'same')
      await symlink(original, alias, platform === 'win32' ? 'junction' : 'dir')
      const manager = createManager()
      createMcpServersService({ context: { emit: contextEmitMock } as any, manager })
      const pending = invokeAlicizationMcpCallToolFromMain({ name: `filesystem::${toolName}`, arguments: { path: join(alias, 'note.txt'), ...(toolName === 'write_file' ? { content: 'must not write' } : {}) } }, controller.signal)
      await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
      await unlink(alias)
      await symlink(replacement, alias, platform === 'win32' ? 'junction' : 'dir')
      const request = getSafetyRequests()[0]
      await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: request.cardId, requestId: request.requestId, token: request.token, allow: true })
      expect(await pending).toMatchObject({ isError: true, errorCode: 'ALICIZATION_TOOL_TARGET_CHANGED' })
      expect(manager.callTool).not.toHaveBeenCalled()
      expect(await readFile(join(original, 'note.txt'), 'utf8')).toBe('same')
      expect(await readFile(join(replacement, 'note.txt'), 'utf8')).toBe('same')
    }
    finally {
      controller.abort()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['approved content', `${'long approved 中文🙂 '.repeat(100)}exact tail`])('dispatches immutable approved content and binds its complete hash when the caller later mutates it: %s', async (content) => {
    const { createMcpServersService, invokeAlicizationMcpCallToolFromMain } = await import('./index')
    const root = await mkdtemp(join(tmpdir(), 'alicization-mcp-frozen-'))
    const controller = new AbortController()
    try {
      const manager = createManager()
      createMcpServersService({ context: { emit: contextEmitMock } as any, manager })
      const original = { name: 'filesystem::write_file', arguments: { path: join(root, 'approved.txt'), content } }
      const pending = invokeAlicizationMcpCallToolFromMain(original, controller.signal)
      await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
      original.arguments.path = join(root, 'different.txt')
      original.arguments.content = 'unapproved content'
      const request = getSafetyRequests()[0]
      expect(request.changePreview).toMatchObject({ text: content.slice(0, 600), sha256: createHash('sha256').update(content).digest('hex'), truncated: content.length > 600 })
      await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: request.cardId, requestId: request.requestId, token: request.token, allow: true })
      expect((await pending).isError).not.toBe(true)
      expect(vi.mocked(manager.callTool).mock.calls[0][0].arguments).toEqual({ path: join(root, 'approved.txt'), content })
    }
    finally {
      controller.abort()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('binds observed interface approval to the card and honors a human refusal', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const pending = requestAlicizationInterfaceApprovalFromMain({ cardId: 'card-a', operation: 'browser_click_element', targetId: 'http://127.0.0.1/payment', label: '付款', riskLevel: 'danger', actionCategory: 'network', reason: 'An observed payment button' })
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    const request = getSafetyRequests()[0]
    const resolvePermission = invokeHandlers.get(electronAlicizationSafetyResolvePermission)!
    expect(await resolvePermission({ cardId: 'card-b', token: request.token, requestId: request.requestId, allow: true })).toMatchObject({ accepted: false })
    await resolvePermission({ cardId: 'card-a', token: request.token, requestId: request.requestId, allow: false, reason: 'user-denied' })
    expect(await pending).toEqual({ allow: false, reason: 'host-denied' })
    expect(request).toMatchObject({ serverName: 'local-interface', supportsRememberSession: false, resourceLabel: '付款' })
  })
  it('limits the visible review to both the current action deadline and image deadline', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const now = Date.now()
    const authority = async () => ({ expiresAt: now + 4000, cardId: 'card-a', effectId: 'deadline-effect', turnId: 'current-turn' })
    const input: LifeInterfaceRiskRequest = { cardId: 'card-a', operation: 'desktop_pointer_action', targetId: 'owned-window', label: 'owned window', riskLevel: 'danger', actionCategory: 'execute', reason: 'Owned finite action', expiresAt: now + 2000 }
    const pending = withActionDispatch(authority, () => requestAlicizationInterfaceApprovalFromMain(input))
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    const request = getSafetyRequests()[0]
    expect(request.timeoutMs).toBeGreaterThan(0)
    expect(request.timeoutMs).toBeLessThanOrEqual(2000)
    await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: 'card-a', token: request.token, requestId: request.requestId, allow: false })
    await pending
    expect(await requestAlicizationInterfaceApprovalFromMain({ ...input, expiresAt: Date.now() - 1 })).toEqual({ allow: false, reason: 'interface-authority-expired' })
    expect(getSafetyRequests()).toHaveLength(1)
  })
  it('snapshots PNG bytes and markers before an authority wait and keeps the image out of safety audits', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2i0AAAAASUVORK5CYII=', 'base64')
    const original = png.toString('base64')
    const sha256 = createHash('sha256').update(png).digest('hex')
    const input: LifeInterfaceRiskRequest = { cardId: 'card-a', operation: 'desktop_pointer_action', targetId: 'owned-window', label: 'owned window', riskLevel: 'danger', actionCategory: 'execute', reason: 'Owned finite action', imagePreview: { png, sha256, markers: [{ x: 0, y: 0, label: '1' }], action: { kind: 'click', button: 'left' } } }
    const pending = requestAlicizationInterfaceApprovalFromMain(input)
    png.fill(0)
    input.imagePreview!.markers[0].x = 99
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    const request = getSafetyRequests()[0]
    expect(request.interfaceImagePreview).toMatchObject({ dataUrl: `data:image/png;base64,${original}`, sha256, markers: [{ x: 0, y: 0, label: '1' }], action: { kind: 'click', button: 'left' } })
    expect(JSON.stringify(appendAuditLogMock.mock.calls)).not.toContain(original)
    await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: 'card-a', token: request.token, requestId: request.requestId, allow: false })
    expect(await pending).toMatchObject({ allow: false })
  })

  it('registers the pending decision and body wait before emitting a prompt, accepting an immediate host response exactly once', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    let resolved!: Promise<unknown>
    contextEmitMock.mockImplementation((event, request) => {
      if (event !== alicizationSafetyPermissionRequested)
        return
      expect(isActionAwaitingHost('card-a', 'actual-effect')).toBe(true)
      resolved = invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: request.cardId, token: request.token, requestId: request.requestId, allow: true })
    })
    const authority = async () => ({ expiresAt: Date.now() + 60000, cardId: 'card-a', effectId: 'actual-effect', turnId: 'current-turn' })
    const decision = await withActionDispatch(authority, () => requestAlicizationInterfaceApprovalFromMain({ cardId: 'card-a', operation: 'browser_click_element', targetId: 'http://127.0.0.1/form', label: '确认', riskLevel: 'danger', actionCategory: 'network', reason: 'Current observed form' }))
    expect(decision.allow).toBe(true)
    expect(await resolved).toMatchObject({ accepted: true })
    expect(isActionAwaitingHost('card-a', 'actual-effect')).toBe(false)
    expect(getSafetyRequests()).toHaveLength(1)
  })

  it('denies a prompt that cannot be delivered without leaking its pending permission or body wait', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    let request: Record<string, unknown> | undefined
    contextEmitMock.mockImplementation((event, payload) => {
      if (event === alicizationSafetyPermissionRequested) {
        request = payload
      }
      throw new Error('renderer unavailable')
    })
    const authority = async () => ({ expiresAt: Date.now() + 60000, cardId: 'card-a', effectId: 'undelivered', turnId: 'current-turn' })
    const decision = await withActionDispatch(authority, () => requestAlicizationInterfaceApprovalFromMain({ cardId: 'card-a', operation: 'browser_click_element', targetId: 'http://127.0.0.1/form', label: '确认', riskLevel: 'danger', actionCategory: 'network', reason: 'Current observed form' }))
    expect(decision.allow).toBe(false)
    expect(decision.reason).toBe('delivery-failed')
    expect(isActionAwaitingHost('card-a', 'undelivered')).toBe(false)
    expect(await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: request!.cardId, token: request!.token, requestId: request!.requestId, allow: true })).toMatchObject({ accepted: false })
  })

  it('expires the real permission and body wait even when timeout audit storage never returns', async () => {
    vi.useFakeTimers()
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const authority = async () => ({ expiresAt: Date.now() + 60000, cardId: 'card-a', effectId: 'expired', turnId: 'current-turn' })
    const pending = withActionDispatch(authority, () => requestAlicizationInterfaceApprovalFromMain({ cardId: 'card-a', operation: 'browser_click_element', targetId: 'http://127.0.0.1/form', label: '确认', riskLevel: 'danger', actionCategory: 'network', reason: 'Current observed form' }))
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    expect(isActionAwaitingHost('card-a', 'expired')).toBe(true)
    appendAuditLogMock.mockImplementationOnce(() => new Promise(() => {}))
    await vi.advanceTimersByTimeAsync(60000)
    expect(await pending).toMatchObject({ allow: false, reason: 'timeout' })
    expect(isActionAwaitingHost('card-a', 'expired')).toBe(false)
  })

  it('shows the exact bounded interface input before approval without logging or silently truncating it', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const text = '受控的中文🙂浏览器输入'
    const input = { cardId: 'card-a', operation: 'browser_type_text', targetId: 'http://127.0.0.1/form', label: '留言', riskLevel: 'danger' as const, actionCategory: 'network' as const, reason: 'An observed external edit', previewText: text }
    const pending = requestAlicizationInterfaceApprovalFromMain(input)
    input.previewText = 'a later caller mutation'
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    const request = getSafetyRequests()[0]
    expect(request.interfacePreview).toEqual({ text, byteLength: new TextEncoder().encode(text).length, sha256: createHash('sha256').update(text).digest('hex') })
    expect(JSON.stringify(appendAuditLogMock.mock.calls)).not.toContain(text)
    await invokeHandlers.get(electronAlicizationSafetyResolvePermission)!({ cardId: 'card-a', token: request.token, requestId: request.requestId, allow: true })
    expect(await pending).toMatchObject({ allow: true, approvalRef: request.requestId })
    expect(await requestAlicizationInterfaceApprovalFromMain({ ...input, previewText: 'x'.repeat(16001) })).toEqual({ allow: false, reason: 'interface-preview-budget' })
    expect(getSafetyRequests()).toHaveLength(1)
  })

  it('interrupts a pending interface permission without reporting a human refusal', async () => {
    const { createMcpServersService, requestAlicizationInterfaceApprovalFromMain } = await import('./index')
    createMcpServersService({ context: { emit: contextEmitMock } as any, manager: createManager() })
    const controller = new AbortController()
    const pending = requestAlicizationInterfaceApprovalFromMain({ cardId: 'card-a', operation: 'desktop_click_element', targetId: 'owned-test-window', label: '删除', riskLevel: 'danger', actionCategory: 'delete', reason: 'An observed delete button' }, controller.signal)
    await vi.waitFor(() => expect(getSafetyRequests()).toHaveLength(1))
    controller.abort()
    expect(await pending).toEqual({ allow: false, reason: 'suspended-or-aborted' })
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
    expect(receivedSignal?.aborted).toBe(false)
    expect(vi.mocked(manager.callTool).mock.calls[0][0]).toEqual(payload)
    controller.abort('host-stopped')
    expect(receivedSignal?.aborted).toBe(true)
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
    expect(String(result.errorMessage)).toContain('The user declined this operation')
    expect(String(result.errorMessage)).not.toContain('They do not trust you')
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

  it('requests native stop immediately and reports its completion only after the actual operation settles', async () => {
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
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)
    resolveCall({ ok: true, isError: false })
    const result = await pending
    expect(result).toMatchObject({ isError: true, errorCode: 'ALICIZATION_TOOL_ABORTED', executionStopped: true, effectMayHaveOccurred: false })
  })
})
