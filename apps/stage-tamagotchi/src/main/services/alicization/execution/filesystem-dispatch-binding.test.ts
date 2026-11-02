import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

import { expect, it, vi } from 'vitest'

import { callLocalFilesystem, inspectFilesystemWritePrecondition, localFilesystemTools } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { buildMainGatewayTools } from '../main-chat-execution-surface'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch, withMainFilesystemReadDispatch } from './action-dispatch-context'
import { mainFilesystemSearchDispatchInput } from './filesystem-dispatch-input'
import { createExecutionResourceBroker } from './resource-broker'

it.each(['path', 'query', 'recursive', 'maxResults', 'maxReturnBytes', 'caseSensitive', 'regex', 'includeGlobs', 'excludeGlobs', 'pathMode'] as const)('rejects a changed native search %s after the approved main read projection', async (field) => {
  const root = await mkdtemp(join(tmpdir(), 'native-search-parameters-'))
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const parameters = { path: root, query: 'needle', maxResults: 25, maxReturnBytes: 10000 }
  try {
    await life.admit({ cardId: 'alice', turnId: 'lookup', conversationId: 'qa', messages: [{ role: 'user', content: 'Search only these approved inputs.' }] }, signal)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'lookup', actionId: field, capabilityId: 'tool.filesystem_search_files', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_search_files')!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const arguments_: Record<string, unknown> = mainFilesystemSearchDispatchInput(parameters)
    arguments_[field] = field === 'path' ? join(root, 'other') : field === 'query' ? 'different' : field === 'maxResults' ? 50 : field === 'maxReturnBytes' ? 20000 : field === 'pathMode' ? 'relative' : field === 'includeGlobs' || field === 'excludeGlobs' ? ['*.txt'] : true
    await expect(withActionDispatch(action.assertDispatchCurrent, () => withMainFilesystemReadDispatch(() => callLocalFilesystem({ toolName: 'search_files', arguments: arguments_, workspace: root, signal })))).rejects.toThrow(/input changed/iu)
    expect((await database.getLifeEffect(action.id))?.payload.parameters).toEqual(parameters)
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

it('retains the native read byte budget outside the main facade projection', async () => {
  const root = await mkdtemp(join(tmpdir(), 'native-read-budget-'))
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const parameters = { path: join(root, 'bounded.txt'), maxReturnBytes: 1000 }
  try {
    await writeFile(parameters.path, '原文'.repeat(1000))
    await life.admit({ cardId: 'alice', turnId: 'lookup', conversationId: 'qa', messages: [{ role: 'user', content: 'Read within the native byte budget.' }] }, signal)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'lookup', actionId: 'read', capabilityId: 'tool.filesystem_read_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_read_file')!.effects }, signal)
    await action.authorizeDispatch(parameters)
    await expect(withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'read_file', arguments: parameters, workspace: root, signal }))).rejects.toThrow('within the read budget')
    expect((await database.getLifeEffect(action.id))?.payload.parameters).toEqual(parameters)
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

it.skipIf(platform !== 'win32' || arch !== 'x64').each(['read_file', 'list_directory', 'search_files'] as const)('settles the actual main %s facade through its native adapter without changing the approved source input', async (operation) => {
  const root = await mkdtemp(join(tmpdir(), 'main-filesystem-dispatch-'))
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  try {
    const target = join(workspace, 'observed.txt')
    await writeFile(target, `needle ${'保持完整原文。'.repeat(100)}\r\n`)
    const parameters = operation === 'read_file' ? { path: target, maxReturnBytes: 1000 } : operation === 'list_directory' ? { path: workspace } : { path: workspace, query: 'needle', recursive: true, maxResults: 25, maxReturnBytes: 10000 }
    const registry = createCanonicalToolRegistry()
    await life.admit({ cardId: 'alice', turnId: 'lookup', conversationId: 'qa', messages: [{ role: 'user', content: '只查阅测试目录中的资料。' }] }, signal)
    const capabilityId = `tool.filesystem_${operation}`
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'lookup', actionId: operation, capabilityId, parameters, effectContract: registry.resolveActive(capabilityId)!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const offered = await buildMainGatewayTools({
      toolSurface: 'main-chat',
      toolRegistry: registry,
      context: { cardId: 'alice', turnId: 'lookup' },
      executionCapabilityChannels: [],
      buildExecutionRuntimeContext: async () => ({ generatedAt: Date.now(), sensory: { collectedAt: null, running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } }),
      executeTaskThread: vi.fn(),
      getSensorySnapshot: vi.fn(),
      resolveTaskPlanningCapabilities: async () => [],
      scheduleReminderTask: vi.fn(),
      invokeMcpListTools: async () => localFilesystemTools,
      invokeMcpCallTool: async payload => callLocalFilesystem({ toolName: payload.name.split('::')[1]!, arguments: payload.arguments ?? {}, workspace, signal: payload.abortSignal, searchRuntime: { executable: fileURLToPath(new URL('../../../../../resources/third-party/ripgrep/win32-x64/rg.exe', import.meta.url)), processJobsRoot: join(root, 'jobs') } }),
    })
    const tool = offered.find(tool => tool.function.name === `filesystem_${operation}`)!
    const result = await withActionDispatch(action.assertDispatchCurrent, () => tool.execute(parameters, { messages: [], toolCallId: operation, abortSignal: signal })) as Record<string, unknown>
    expect(result.status).toBe('completed')
    if (operation === 'read_file') {
      expect(result.truncated).toBe(true)
      expect(Buffer.byteLength(String(result.content))).toBeLessThanOrEqual(1000)
      expect(String(result.content)).not.toContain('\uFFFD')
    }
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
    expect(await database.getLifeEffect(action.id)).toMatchObject({ status: 'settled', payload: { parameters }, receipt: { outcome: 'success' } })
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
}, 30000)

it.each(['path', 'content', 'operation'])('rejects a different filesystem %s at the actual adapter boundary', async (fault) => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-filesystem-dispatch-'))
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const target = join(root, 'accepted.txt')
  const other = join(root, 'other.txt')
  const parameters = { path: target, content: 'the accepted content' }
  try {
    await writeFile(target, 'original file')
    await life.admit({ cardId: 'alice', turnId: 'save', conversationId: 'qa', messages: [{ role: 'user', content: 'Save only the accepted file and content' }] }, signal)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'save', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
    await action.authorizeDispatch(parameters)
    const arguments_ = fault === 'path' ? { ...parameters, path: other } : fault === 'content' ? { ...parameters, content: 'a different content' } : { path: target }
    const writePrecondition = await inspectFilesystemWritePrecondition(String(arguments_.path))
    await expect(withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: fault === 'operation' ? 'read_file' : 'write_file', arguments: arguments_, workspace: root, signal, writePrecondition }))).rejects.toThrow(/dispatch|input|capability/iu)
    expect(await readFile(target, 'utf8')).toBe('original file')
    await expect(stat(other)).rejects.toMatchObject({ code: 'ENOENT' })
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})

it.each(['tool.filesystem_write_file', 'mcp.filesystem::write_file'])('preserves the exact admitted filesystem operation: %s', async (capabilityId) => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-filesystem-dispatch-'))
  const database = await setupAlicizationDb(join(root, 'life'), { cardId: 'alice' })
  const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, resourceBroker: createExecutionResourceBroker(), now: Date.now })
  const signal = new AbortController().signal
  const parameters = { path: join(root, 'accepted.txt'), content: 'accepted 中文🙂' }
  try {
    await life.admit({ cardId: 'alice', turnId: 'save', conversationId: 'qa', messages: [{ role: 'user', content: 'Save this exact content' }] }, signal)
    const registry = createCanonicalToolRegistry({ mcpAllowlist: ['filesystem::write_file'] })
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'save', actionId: 'write', capabilityId, parameters, effectContract: registry.resolveActive(capabilityId)!.effects }, signal)
    await action.authorizeDispatch(parameters)
    expect((await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal }))).ok).toBe(true)
    expect(await readFile(parameters.path, 'utf8')).toBe(parameters.content)
  }
  finally {
    await database.close()
    await rm(root, { recursive: true, force: true })
  }
})
