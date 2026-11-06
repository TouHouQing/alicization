import type { Message, Tool } from '@xsai/shared-chat'

import type { AlicizationActionRuntimeState } from '../turn-os/runtime-state'

import { tool } from '@xsai/tool'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { runAlicizationMainChatProviderStep } from '../main-chat-stream-runner'
import { encodeOpenAICompatibleSse, startProviderHttpFaultServer } from '../provider-http-fault-server.test-support'
import { searchHermesCatalog } from '../third-party/hermes-tool-catalog'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { capabilityDescribeName, capabilitySearchName, createCapabilityDiscoveryTools, discloseCapabilities } from './capability-disclosure'

async function fixture() {
  const registry = createCanonicalToolRegistry()
  const execute = vi.fn(async () => ({ status: 'completed', observed: 'verified scene' }))
  const tools: Tool[] = []
  for (let index = 0; index < 40; index++) {
    const name = index === 39 ? 'rare_scan_archive' : `catalog_test_${index}`
    const built = await tool({ name, description: `${index === 39 ? 'Inspect archive contents 读取 归档' : 'General utility'} ${'bounded interface description '.repeat(25)}`, parameters: z.object({ path: z.string().min(1) }).strict(), execute })
    registry.register({ ...registry.resolveActive('tool.filesystem_read_file')!, effects: undefined, capabilityId: `test.${name}`, providerToolName: name, adapterToolName: name, inputSchema: built.function.parameters, version: '1', kind: 'tool', evaluationStatus: 'passed', activationStatus: 'active' })
    tools.push(built)
  }
  tools.push(...await Promise.all(createCapabilityDiscoveryTools(() => tools, registry)))
  return { registry, tools, execute }
}

function settled(toolCallId: string, output: unknown): AlicizationActionRuntimeState {
  return { actionId: `turn:action:${toolCallId}`, toolCallId, status: 'completed', terminalObservationId: 'obs', lastObservation: { actionId: `turn:action:${toolCallId}`, observationId: 'obs', toolCallId, terminal: true, outcome: 'success', output }, outcome: 'success', pendingTerminalStatus: null, completionPendingObservation: false, restoredFromCheckpoint: false, lateEventCount: 0, lastSequence: 8 }
}

describe('live capability discovery through the existing life executor', () => {
  it('offers local content search and full file read for a Chinese request without loading historical values', async () => {
    const { tools, registry } = await fixture()
    for (const name of ['filesystem_read_file', 'filesystem_search_files']) {
      tools.push(await tool({ name, description: name === 'filesystem_read_file' ? 'Read a UTF-8 file.' : 'Search local file content.', parameters: z.object({ path: z.string() }), execute: vi.fn() }))
    }
    const messages: Message[] = [{ role: 'user', content: '请在本地目录用内容搜索找到这个文本文件，然后完整读取全文。' }]
    const disclosure = discloseCapabilities({ tools, registry, messages, actions: {} })
    expect(disclosure.tools!.map(tool => tool.function.name)).toEqual(expect.arrayContaining(['filesystem_read_file', 'filesystem_search_files']))
    const search = tools.find(tool => tool.function.name === capabilitySearchName)!
    const result = await search.execute({ query: '读取文件', limit: 3 }, { messages, toolCallId: 'chinese-read' }) as { tools: Array<{ name: string }> }
    expect(result.tools[0].name).toBe('filesystem_read_file')
    registry.setActivationStatus('tool.filesystem_read_file', 'revoked')
    expect(discloseCapabilities({ tools, registry, messages, actions: {} }).tools!.some(tool => tool.function.name === 'filesystem_read_file')).toBe(false)
  })

  it('rejects irrelevant partial keyword matches and deterministically finds bilingual operations', () => {
    const entries = [
      { name: 'incident_email', description: 'Read incident email', parameters: {} },
      { name: 'send_gmail_email', description: 'Send Gmail email 发送 邮件', parameters: {} },
    ]
    expect(searchHermesCatalog(entries, 'send gmail email').map(item => item.name)).toEqual(['send_gmail_email'])
    expect(searchHermesCatalog(entries, 'send unknownprovider email')).toEqual([])
    expect(searchHermesCatalog(entries, '邮件').map(item => item.name)).toEqual(['send_gmail_email'])
    expect(searchHermesCatalog(entries, 'incident_email').map(item => item.name)[0]).toBe('incident_email')
  })

  it('reduces interfaces, loads only settled same-turn descriptions and detects revocation/schema changes', async () => {
    const { tools, registry, execute } = await fixture()
    const messages: Message[] = [{ role: 'user', content: '你好' }]
    const project = (actions = {}) => discloseCapabilities({ tools, registry, messages, actions })
    const initial = project()
    expect(initial.report!.afterBytes).toBeLessThan(initial.report!.beforeBytes / 4)
    expect(initial.tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
    const describe = tools.find(item => item.function.name === capabilityDescribeName)!
    const output = await describe.execute({ names: ['rare_scan_archive'] }, { messages, toolCallId: 'load-1' })
    expect(execute).not.toHaveBeenCalled()
    messages.push({ role: 'assistant', content: '', tool_calls: [{ type: 'function', id: 'load-1', function: { name: capabilityDescribeName, arguments: '{"names":["rare_scan_archive"]}' } }] })
    const actions = { a: settled('load-1', output) }
    expect(project(actions).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(true)
    expect(project({ a: { ...actions.a, status: 'failed' } }).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
    expect(project({ a: settled('foreign-call', output) }).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
    const changed = tools.find(item => item.function.name === 'rare_scan_archive')!
    const originalDescription = changed.function.description
    changed.function.description = 'Changed live interface'
    expect(project(actions).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
    changed.function.description = originalDescription
    const registration = registry.get('test.rare_scan_archive')!
    registry.replace({ ...registration, version: '2' })
    expect(project(actions).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
    registry.replace(registration)
    registry.setActivationStatus('test.rare_scan_archive', 'revoked')
    await expect(describe.execute({ names: ['rare_scan_archive'] }, { messages, toolCallId: 'load-2' })).rejects.toThrow('unavailable')
    expect(project(actions).tools!.some(item => item.function.name === 'rare_scan_archive')).toBe(false)
  })

  it('uses actual xsAI SSE search → describe → operation proposals without bypassing admission', async () => {
    const { tools, registry, execute } = await fixture()
    const messages: Message[] = [{ role: 'user', content: '你好' }]
    const actions: Record<string, AlicizationActionRuntimeState> = {}
    const steps = [
      { name: capabilitySearchName, arguments: { query: 'archive' } },
      { name: capabilityDescribeName, arguments: { names: ['rare_scan_archive'] } },
      { name: 'rare_scan_archive', arguments: { path: 'test-only/archive.zip' } },
    ]
    const server = await startProviderHttpFaultServer({ respond: ({ attempt }) => {
      const requestIndex = attempt - 1
      const step = steps[requestIndex]!
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse([
        { choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `call-${requestIndex}`, type: 'function', function: { name: step.name, arguments: JSON.stringify(step.arguments) } }] }, finish_reason: null }] },
        { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
      ]) }
    } })
    try {
      for (let index = 0; index < steps.length; index++) {
        const disclosure = discloseCapabilities({ tools, registry, messages, actions })
        const result = await runAlicizationMainChatProviderStep({
          payload: { cardId: 'card-1', turnId: 'turn', providerId: 'openai-compatible' } as any,
          prepared: { chatConfig: { apiKey: 'test', baseURL: server.baseUrl, model: 'test' }, tools: disclosure.tools, toolRegistry: registry, toolChoice: 'auto' } as any,
          messages,
          controller: new AbortController(),
          firstEventTimeoutMs: 2000,
          providerContinuationTimeoutMs: 2000,
          providerRetryPolicy: { maxRetries: 0 },
          isRunActive: () => true,
          nonProgressEventTypes: new Set(),
          emitToolCall: vi.fn(),
          useResponseSchema: false,
        })
        expect(result.kind).toBe('action')
        if (result.kind !== 'action')
          throw new Error('Expected governed proposal')
        expect(execute).not.toHaveBeenCalled()
        // Only metadata is executed here. The real operation remains a proposal
        // for the existing EventLoop's beforeAction/authorizeDispatch path.
        if (index < 2) {
          const output = await tools.find(item => item.function.name === result.action.providerToolName)!.execute(result.action.input, { messages, toolCallId: result.action.toolCallId! })
          actions[result.action.actionId] = settled(result.action.toolCallId!, output)
          messages.push({ role: 'tool', tool_call_id: result.action.toolCallId!, content: JSON.stringify(output) })
        }
      }
      expect(server.requests).toHaveLength(3)
      expect(execute).not.toHaveBeenCalled()
    }
    finally { await server.close() }
  })
})
