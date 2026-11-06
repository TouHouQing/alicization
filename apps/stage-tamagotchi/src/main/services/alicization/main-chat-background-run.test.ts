import type { Message } from '@xsai/shared-chat'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { capabilityDescribeName, capabilitySearchName, createCapabilityDiscoveryTools } from './agent-harness/capability-disclosure'
import { createProgrammaticReadTool } from './agent-harness/programmatic-tool'
import { agentHarnessMaxModelSteps, prepareAgentContinuation } from './agent-harness/progress-context'
import { createProviderUsageLedger } from './agent-harness/provider-usage-ledger'
import { readToolObservation } from './agent-harness/tool-observation'
import { setupAlicizationDb } from './db'
import { actionDidNotStart, assertActionDispatchCurrent, markActionNotStartedError } from './execution/action-dispatch-context'
import { boundLifeProviderRequest } from './life-provider-budget'
import { AlicizationReplyGroundingUnavailableError } from './life-reply-grounding-error'
import { LifeStateConflictError } from './life-state-store'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { abortAlicizationDirectChatRun } from './main-chat-abort'
import {
  mainChatBackgroundRunTestInternals,
  runAlicizationMainChatBackground,
} from './main-chat-background-run'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatProviderStep } from './main-chat-stream-runner'
import { zeroPersonaEffects } from './persona-development/schema'
import { encodeOpenAICompatibleSse, startProviderHttpFaultServer } from './provider-http-fault-server.test-support'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

vi.mock('./main-chat-run-lifecycle', () => ({
  handleAlicizationMainChatRunFailure: vi.fn(),
}))

vi.mock('./main-chat-runtime-surface', () => ({
  extractCustomDirectivesFromMessages: vi.fn(() => ''),
  extractHostNameFromMessages: vi.fn(() => ''),
}))

vi.mock('./main-chat-stream-runner', async () => {
  const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>(
    './main-chat-stream-runner',
  )
  return {
    ...actual,
    runAlicizationMainChatProviderStep: vi.fn(),
  }
})

vi.mock('./main-chat-stream-meta', async () => {
  const actual = await vi.importActual<typeof import('./main-chat-stream-meta')>('./main-chat-stream-meta')
  return {
    ...actual,
    createAlicizationChatStreamMetaEmitter: vi.fn(() => ({
      compose: vi.fn(),
      emit: vi.fn(),
      getLastReply: () => '',
      snapshot: () => ({
        lastReply: '',
        lastSignature: null,
      }),
    })),
    repairContinuitySourceTagsFromRuntimeDigest: vi.fn((input: any) => input.digitalLifeSpine ?? null),
  }
})

vi.mock('./runtime-soul', () => ({
  mainChatFirstEventTimeoutMs: 65_000,
  mainChatPreparationTimeoutMs: 45_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  mainChatProviderContinuationTimeoutMs: 180_000,
  clamp01: (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)),
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeMultilineText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : fallback,
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  supportedDialogueStructuredFormats: ['mind-turn-v1', 'epoch1-v1'],
}))

function buildProviderReply(reply = 'Provider reply') {
  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'current turn',
    emotion: 'thinking',
    reply,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: null,
      longTermEvidenceIds: [],
    },
  })
}

function createPrepared(overrides?: Partial<any>): any {
  const toolRegistry = overrides?.toolRegistry ?? createCanonicalToolRegistry()
  for (const tool of overrides?.tools ?? []) {
    const adapterToolName = String(tool?.function?.name ?? '').trim()
    if (
      !adapterToolName
      || toolRegistry.resolveAdapterToolName(adapterToolName)
      || toolRegistry.isKnownProviderToolName(adapterToolName)
      || adapterToolName.startsWith('executor_run_')
    ) {
      continue
    }
    toolRegistry.register({
      capabilityId: `test.${adapterToolName}`,
      kind: 'tool',
      version: '1.0.0',
      description: adapterToolName,
      inputSchema: tool.function?.parameters ?? {
        type: 'object',
        additionalProperties: true,
      },
      outputSchema: { type: 'object' },
      scope: 'turn',
      permissions: [],
      risk: 'low',
      executionChannel: 'test',
      timeoutMs: 1_000,
      supportsProgress: false,
      supportsCancellation: true,
      idempotency: 'none',
      evaluationStatus: 'passed',
      activationStatus: 'active',
      providerToolName: adapterToolName,
      adapterToolName,
    })
  }
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user' as const, content: '你好' },
    ] as Message[],
    conversationSessionId: 'conversation-1',
    preludeTurnId: 'turn-1',
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      source: 'none',
      text: '',
    },
    hasVisualGrounding: false,
    governance: null,
    runtimeSurface: {
      trace: {
        decisionTraceId: 'trace-1',
        personaKernelMode: 'full',
        turnMode: 'answer',
      },
      replyExecutionPlan: {
        preferredMode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        reason: 'provider mainline',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        fallbackReason: null,
      },
    },
    getSessionTrace: () => ({
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    }),
    sessionTrace: {
      currentChain: [],
      currentDepth: 0,
      history: [],
      maxDepth: 12,
      phaseOrder: ['prepare', 'stream'],
    },
    toolRegistry,
    ...overrides,
  }
}

function createMemoryWriteItem() {
  return {
    id: 'queue-turn-1',
    sourceTurnIds: ['turn-1:user'],
    kind: 'preference',
    summary: '用户希望失败时不要污染长期记忆。',
    reason: 'candidate:preference',
    evidenceSnippets: ['失败时不要污染长期记忆。'],
    salience: 0.8,
    confidence: 0.86,
    sensitivity: 'personal',
    allowTraining: false,
    status: 'pending-cleaning',
    rejectionReasons: [],
    contaminationFlags: [],
    createdAt: 100,
    source: 'working-memory-owner',
  }
}

function createInMemoryPersistence() {
  const events: any[] = []
  return {
    appendRuntimeEvent: vi.fn(async (_scope, event) => {
      const persisted = {
        ...event,
        sequence: events.length + 1,
      }
      events.push(persisted)
      return persisted
    }),
    saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
  }
}

function createInput(
  userText = '你好',
  overrides?: Partial<Parameters<typeof runAlicizationMainChatBackground>[0]>,
): Parameters<typeof runAlicizationMainChatBackground>[0] {
  return {
    key: 'card-1::turn-1',
    reviewLifeReply: vi.fn(async () => ({ accepted: true, issues: [] })),
    life: { recordContextUse: vi.fn(async () => {}), admit: vi.fn(async () => {}), context: vi.fn(async () => ({ revision: 0, text: '{}', owners: [] })), beforeAction: vi.fn(async () => ({ id: 'effect', cached: null, authorizeDispatch: vi.fn(async () => {}), assertDispatchCurrent: vi.fn(async () => ({ expiresAt: null })) })), afterAction: vi.fn(async () => {}), settle: vi.fn(async () => {}), recover: vi.fn(async () => ({ cardId: 'card-1', revision: 0, owners: [], values: {}, obligations: [], ingress: [], effects: [], soulActivations: [] })) },
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: userText },
      ],
    },
    activeCardId: 'default',
    mainGateway: {
      providerId: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://example.test/v1/',
      headers: {
        authorization: 'Bearer test',
      },
      probeHeaders: {
        Authorization: 'Bearer test',
      },
      provider: {} as never,
    },
    runState: {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
    },
    prepareTurn: vi.fn(async () => createPrepared({
      messages: [
        { role: 'user' as const, content: userText },
      ],
    })),
    providerRetryPolicy: {},
    turnLoop: {
      conversationId: 'conversation-1',
      userId: 'local-user-stable',
      persistence: createInMemoryPersistence(),
    },
    headers: {
      authorization: 'Bearer test',
    },
    isRunActive: () => true,
    runStateController: {
      setSessionTraceGetter: vi.fn(),
      finishRun: vi.fn(),
    },
    emitMeta: vi.fn(),
    emitChunk: vi.fn(),
    emitToolCall: vi.fn(),
    emitToolProgress: vi.fn(),
    emitToolResult: vi.fn(),
    emitError: vi.fn(),
    incrementChunkStats: vi.fn(),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof runAlicizationMainChatBackground>[0]
}

describe('main chat background run', () => {
  it.each(['parallel', 'programmatic', 'blocked-write'] as const)('uses real SSE, SQLite ownership and native files for governed %s execution', async (mode) => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const root = await mkdtemp(join(tmpdir(), 'alicization-governed-reads-'))
    const database = await setupAlicizationDb(root, { cardId: 'card-1' })
    const paths = [join(root, 'first.txt'), join(root, 'second.txt')]
    await Promise.all(paths.map((path, index) => writeFile(path, `marker-${index}`)))
    const registry = createCanonicalToolRegistry()
    const bothEntered = Promise.withResolvers<void>()
    let active = 0
    let peak = 0
    const scope = { cardId: 'card-1', turnId: 'turn-1', conversationId: 'conversation-1', userId: 'local-user-stable' }
    const readTool = { type: 'function' as const, function: { name: 'filesystem_read_file', parameters: registry.get('tool.filesystem_read_file')!.inputSchema }, execute: async (input: unknown) => {
      const path = (input as { path: string }).path
      await assertActionDispatchCurrent(true, { capabilityId: 'tool.filesystem_read_file', parameters: input })
      expect((await database.listRuntimeEvents(scope)).some(event => event.eventType === 'model.tool_call.proposed')).toBe(true)
      peak = Math.max(peak, ++active)
      if (active === 2)
        bothEntered.resolve()
      let deadline: ReturnType<typeof setTimeout> | undefined
      try { await Promise.race([bothEntered.promise, new Promise((_resolve, reject) => { deadline = setTimeout(() => reject(new Error('Readers did not overlap')), 1000) })]) }
      finally { clearTimeout(deadline) }
      if (path === paths[0])
        await new Promise(resolve => setTimeout(resolve, 10))
      const content = await readFile(path, 'utf8')
      active--
      return { ok: true, finalStatus: 'completed', operation: 'read_file', content, truncated: false, contentHash: createHash('sha256').update(content).digest('hex') }
    } }
    const code = mode === 'blocked-write'
      ? `return await call('filesystem_write_file',{path:${JSON.stringify(paths[0])},content:'forbidden'});`
      : `const values=await Promise.all(${JSON.stringify(paths)}.map(path=>call('filesystem_read_file',{path}))); return values.map(value=>value.content);`
    const server = await startProviderHttpFaultServer({ respond: ({ attempt, body }) => {
      if (attempt > 1) {
        const messages = JSON.parse(body).messages.filter((message: Message) => message.role === 'tool')
        expect(messages.map((message: Extract<Message, { role: 'tool' }>) => message.tool_call_id)).toEqual(mode === 'parallel' ? ['native-read-0', 'native-read-1'] : ['native-program'])
        expect(messages[0].content).toContain(mode === 'blocked-write' ? 'canonical local read interface' : 'marker-0')
      }
      const calls = mode === 'parallel' ? paths.map((path, index) => ({ index, id: `native-read-${index}`, type: 'function', function: { name: 'filesystem_read_file', arguments: JSON.stringify({ path }) } })) : [{ index: 0, id: 'native-program', type: 'function', function: { name: 'life_programmatic_read', arguments: JSON.stringify({ code }) } }]
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(attempt === 1 ? [{ choices: [{ index: 0, delta: { tool_calls: calls }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }], usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110 } }] : [{ choices: [{ index: 0, delta: { content: buildProviderReply(mode === 'blocked-write' ? '这次没有写入文件。' : '两份文件的标记分别是 marker-0 和 marker-1。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 120, completion_tokens: 10, total_tokens: 130 } }]) }
    } })
    const prepared = createPrepared({ messages: [{ role: 'user', content: '检查这两个指定测试文件。' }], toolRegistry: registry, chatConfig: { apiKey: 'fixture', baseURL: server.baseUrl, model: 'gpt-test' }, tools: [readTool, await createProgrammaticReadTool()] })
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    const ledger = createProviderUsageLedger(database, 'card-1')
    const input = createInput('检查这两个指定测试文件。', { activeCardId: 'card-1', life, providerAccounting: ledger, providerRetryPolicy: { maxRetries: 0 }, prepareTurn: vi.fn(async () => prepared), turnLoop: { ...scope, persistence: database } })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actual.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
      const effects = await database.readLifeTurnExecutionEffects('turn-1')
      expect(effects).toHaveLength(mode === 'programmatic' ? 3 : mode === 'parallel' ? 2 : 1)
      expect(effects.every(effect => effect.status === 'settled')).toBe(true)
      expect(peak).toBe(mode === 'blocked-write' ? 0 : 2)
      expect(await readFile(paths[0]!, 'utf8')).toBe('marker-0')
      expect((await ledger.read()).summary).toMatchObject({ requestCount: 2, usageReported: 2, totals: { totalTokens: { knownSubtotal: 240, complete: true } } })
      expect((await database.listRuntimeEvents(scope)).filter(event => event.eventType === 'action.settlement.completed')).toHaveLength(mode === 'parallel' ? 2 : 1)
    }
    finally { await server.close(); await database.close(); await rm(root, { recursive: true, force: true }) }
  })
  it.each(['complete', 'revoke-tail', 'deny-tail'] as const)('settles a real SSE tool batch in SQLite with per-action admission: %s', async (mode) => {
    const actualRunner = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const directory = await mkdtemp(join(tmpdir(), 'alicization-harness-batch-'))
    if (!basename(directory).startsWith('alicization-harness-batch-'))
      throw new Error('Refusing to use an unowned test directory')
    const database = await setupAlicizationDb(directory, { allowUnboundScope: true })
    const scope = { cardId: 'card-1', turnId: 'turn-1', conversationId: 'conversation-1', userId: 'local-user-stable' }
    const registry = createCanonicalToolRegistry()
    const trace: string[] = []
    const execute = vi.fn(async ({ index }: { index: number }) => {
      const persisted = await database.listRuntimeEvents(scope)
      expect(persisted.filter(event => event.eventType === 'model.tool_call.proposed')).toHaveLength(2)
      if (index === 2)
        expect(persisted.filter(event => event.eventType === 'action.settlement.completed')).toHaveLength(1)
      trace.push(`execute-${index}`)
      if (index === 1 && mode === 'revoke-tail')
        registry.setActivationStatus('test.test_action', 'revoked')
      return { ok: true, value: index }
    })
    const server = await startProviderHttpFaultServer({ respond: ({ attempt, body }) => {
      const request = JSON.parse(body)
      if (attempt > 1) {
        expect(request.messages.filter((message: Message) => message.role === 'assistant' && message.tool_calls?.length)).toHaveLength(1)
        const results = request.messages.filter((message: Message) => message.role === 'tool')
        expect(results.map((message: Extract<Message, { role: 'tool' }>) => message.tool_call_id)).toEqual(['batch-1', 'batch-2'])
        expect(results[0].content).toContain('"value":1')
        expect(results[1].content).toContain(mode === 'complete' ? '"value":2' : mode === 'revoke-tail' ? 'invalid capability' : 'second action denied')
      }
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(attempt === 1
        ? [{ choices: [{ index: 0, delta: { tool_calls: [1, 2].map((index, position) => ({ index: position, id: `batch-${index}`, type: 'function', function: { name: 'test_action', arguments: JSON.stringify({ index }) } })) }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]
        : [{ choices: [{ index: 0, delta: { content: buildProviderReply(mode === 'complete' ? '两项观察已返回。' : '第一项返回了观察，第二项被阻止。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }]) }
    } })
    const prepared = createPrepared({ toolRegistry: registry, chatConfig: { apiKey: 'fixture-key', baseURL: server.baseUrl, model: 'gpt-test' }, tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'], additionalProperties: false } }, execute }] })
    const input = createInput('检查两项并根据观察回答。', { providerRetryPolicy: { maxRetries: 0 }, prepareTurn: vi.fn(async () => prepared), turnLoop: { ...scope, persistence: database } })
    vi.mocked(input.life.beforeAction).mockImplementation(async ({ parameters }) => {
      const index = (parameters as { index: number }).index
      trace.push(`admit-${index}`)
      const check = async () => ({ expiresAt: null, capabilityId: 'test.test_action', effectId: `effect-${index}`, cardId: scope.cardId, turnId: scope.turnId })
      return { id: `effect-${index}`, cached: null, authorizeDispatch: Object.assign(async (_parameters: unknown) => {
        trace.push(`authorize-${index}`)
        if (index === 2 && mode === 'deny-tail')
          throw markActionNotStartedError(new Error('second action denied'))
      }, { assertCurrent: check }), assertDispatchCurrent: check }
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actualRunner.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
      expect(execute).toHaveBeenCalledTimes(mode === 'complete' ? 2 : 1)
      expect(trace.slice(0, 3)).toEqual(['admit-1', 'authorize-1', 'execute-1'])
      if (mode === 'complete')
        expect(trace).toEqual(['admit-1', 'authorize-1', 'execute-1', 'admit-2', 'authorize-2', 'execute-2'])
      const events = await database.listRuntimeEvents(scope)
      expect(events.filter(event => event.eventType === 'model.step.started')).toHaveLength(2)
      expect(events.filter(event => event.eventType === 'action.settlement.completed')).toHaveLength(2)
      expect(events.filter(event => event.eventType === 'assistant.reply.committed')).toHaveLength(1)
      expect(events.some(event => event.eventType === 'turn.completed')).toBe(true)
      expect(server.requests).toHaveLength(2)
    }
    finally {
      await server.close()
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  }, 30000)

  it('reads a compacted observation back from SQLite over real local SSE without repeating the original action', async () => {
    const actualRunner = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const directory = await mkdtemp(join(tmpdir(), 'alicization-harness-receipts-'))
    const database = await setupAlicizationDb(directory, { allowUnboundScope: true })
    const original = `HEADER\n${'一行原始日志🙂\n'.repeat(1300)}TAIL: exact source evidence`
    const execute = vi.fn(async () => original)
    const scope = { cardId: 'card-1', turnId: 'turn-1', conversationId: 'conversation-1', userId: 'local-user-stable' }
    let reference: { toolCallId: string, expectedHash: string } | undefined
    let reconstructed = ''
    const server = await startProviderHttpFaultServer({ respond: ({ attempt, body }) => {
      const request = JSON.parse(body)
      let next: { name: string, arguments: string } | null = null
      if (attempt === 1) {
        next = { name: 'test_action', arguments: '{}' }
      }
      else if (attempt === 2) {
        const observed = request.messages.find((message: Message) => message.role === 'tool' && message.tool_call_id === 'source-call-1')
        const compact = JSON.parse(observed.content)
        expect(compact.type).toBe('alicization-tool-observation-reference')
        reference = { toolCallId: compact.toolCallId, expectedHash: compact.sourceHash }
        next = { name: 'life_read_tool_observation', arguments: JSON.stringify({ ...reference, offset: 0, maxBytes: 4096 }) }
      }
      else {
        const page = JSON.parse(request.messages.filter((message: Message) => message.role === 'tool').at(-1).content)
        if (page.ok !== true)
          throw new Error(`Receipt page did not resolve: ${JSON.stringify(page).slice(0, 1600)}`)
        expect(page.offset).toBe(Buffer.byteLength(reconstructed))
        reconstructed += page.content
        if (!page.complete)
          next = { name: 'life_read_tool_observation', arguments: JSON.stringify({ ...reference, offset: page.nextOffset, maxBytes: 4096 }) }
      }
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(next
        ? [{ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: `source-call-${attempt}`, type: 'function', function: next }] }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]
        : [{ choices: [{ index: 0, delta: { content: buildProviderReply('原始日志已读取。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }]) }
    } })
    const registry = createCanonicalToolRegistry()
    const reader = vi.fn(async (page: Record<string, unknown>) => readToolObservation(await database.listRuntimeEvents(scope), { ...scope, toolCallId: String(page.toolCallId), expectedHash: String(page.expectedHash), offset: Number(page.offset), maxBytes: Number(page.maxBytes) }))
    const prepared = createPrepared({ toolRegistry: registry, chatConfig: { apiKey: 'fixture-key', baseURL: server.baseUrl, model: 'gpt-test' }, tools: [
      { type: 'function', function: { name: 'test_action', description: 'Read the original log once', parameters: { type: 'object', properties: {} } }, execute },
      { type: 'function', function: { name: 'life_read_tool_observation', description: 'Read a stored receipt page', parameters: registry.get('tool.life_read_tool_observation')!.inputSchema }, execute: reader },
    ] })
    const input = createInput('读取原始日志，逐页查看，不要重复原始操作。', { providerRetryPolicy: { maxRetries: 0 }, prepareTurn: vi.fn(async () => prepared), turnLoop: { ...scope, persistence: database }, mainGateway: { ...createInput().mainGateway, providerBudget: { contextTokens: 16384, outputReserve: 1024, completionTokenField: 'maxTokens', contextSource: 'configured' } } })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actualRunner.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      const failure = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]?.error
      expect(failure ? String(failure) : null, String(failure)).toBeNull()
      expect(input.emitError).not.toHaveBeenCalled()
      expect(execute).toHaveBeenCalledOnce()
      expect(reader.mock.calls.length).toBeGreaterThan(2)
      expect(reconstructed).toBe(original)
      expect((await database.listRuntimeEvents(scope)).some(event => event.eventType === 'turn.completed')).toBe(true)
      expect(server.requests.every(request => JSON.parse(request.body).stream === true)).toBe(true)
    }
    finally {
      await server.close()
      await database.close()
      if (!basename(directory).startsWith('alicization-harness-receipts-'))
        throw new Error('Refusing to retire an unowned test directory')
      await rm(directory, { recursive: true, force: true })
    }
  }, 30000)
  it('finishes an eighteen-action observed task through the production loop without the old sixteen-step failure', async () => {
    const execute = vi.fn(async () => ({ ok: true, status: 'completed' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('请依次检查十八项实际结果', { prepareTurn: vi.fn(async () => prepared) })
    let count = 0
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(async ({ messages }) => {
      if (count === 18)
        return { kind: 'reply', fullText: buildProviderReply('这些观察已经返回。'), text: '这些观察已经返回。', finishReason: 'stop' }
      const id = `observed-step-${++count}`
      messages.push({ role: 'assistant', content: '', tool_calls: [{ id, type: 'function', function: { name: 'test_action', arguments: '{}' } }] })
      return { kind: 'action', action: { actionId: id, toolCallId: id, capabilityId: 'test.test_action', providerToolName: 'test_action', input: {} } }
    })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledTimes(18)
    expect(input.life.beforeAction).toHaveBeenCalledTimes(18)
    expect(input.life.afterAction).toHaveBeenCalledTimes(18)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(19)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.emitError).not.toHaveBeenCalled()
  })

  it('removes action authority after three unchanged failed attempts while allowing an honest final reply', async () => {
    const execute = vi.fn(async () => ({ ok: false, status: 'failed', errorCode: 'LOCAL_TARGET_UNAVAILABLE' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('检查这个当前目标', { prepareTurn: vi.fn(async () => prepared) })
    let count = 0
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(async ({ messages, prepared: current }) => {
      if (count === 3) {
        expect(current.tools).toBeUndefined()
        expect(current.toolChoice).toBe('none')
        expect(String(messages.at(-1)?.content)).toContain('no further action budget')
        return { kind: 'reply', fullText: buildProviderReply('当前目标不可用，操作没有完成。'), text: '当前目标不可用，操作没有完成。', finishReason: 'stop' }
      }
      const id = `failed-step-${++count}`
      messages.push({ role: 'assistant', content: '', tool_calls: [{ id, type: 'function', function: { name: 'test_action', arguments: '{}' } }] })
      return { kind: 'action', action: { actionId: id, toolCallId: id, capabilityId: 'test.test_action', providerToolName: 'test_action', input: {} } }
    })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledTimes(3)
    expect(input.life.afterAction).toHaveBeenCalledTimes(3)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })
  it.each([false, true])('preserves actual local admission-error provenance through the production life observation: %s', async (localRefusal) => {
    const execute = vi.fn(async () => {
      const error = Object.freeze(new Error('Work proposal was rejected'))
      throw localRefusal ? markActionNotStartedError(error) : error
    })
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'life_execute_work_plan', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('请处理这件事', { prepareTurn: vi.fn(async () => prepared) })
    const assertDispatchCurrent = vi.fn(async () => ({ capabilityId: 'tool.life_execute_work_plan', cardId: 'card-1', turnId: 'turn-1', effectId: 'effect', expiresAt: null }))
    const authorizeDispatch = Object.assign(vi.fn(async (_parameters: unknown) => {}), { assertCurrent: assertDispatchCurrent })
    vi.mocked(input.life.beforeAction).mockResolvedValue({ id: 'effect', cached: null, authorizeDispatch, assertDispatchCurrent })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({ kind: 'action', action: { actionId: 'admission', input: {}, providerToolName: 'life_execute_work_plan', capabilityId: 'tool.life_execute_work_plan', toolCallId: 'admission' } } as any)
      .mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('这次没有受理。'), text: '这次没有受理。', finishReason: 'stop' } as any)
    await runAlicizationMainChatBackground(input)
    expect(input.life.afterAction).toHaveBeenCalledOnce()
    const output = vi.mocked(input.life.afterAction).mock.calls[0][0].output
    expect(actionDidNotStart(output, 'card-1', 'effect')).toBe(localRefusal)
    expect(output).toMatchObject({ effectMayHaveOccurred: !localRefusal })
    expect(actionDidNotStart(JSON.parse(JSON.stringify(output)), 'card-1', 'effect')).toBe(false)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('settles an expired final authority check without entering the adapter or inventing an unknown side effect', async () => {
    const execute = vi.fn(async () => ({ ok: true }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('执行这个本地操作', { prepareTurn: vi.fn(async () => prepared) })
    const authorize = vi.fn(async () => {})
    const current = vi.fn(async (): Promise<{ expiresAt: number | null }> => { throw new Error('original-source-ended') })
    input.life.beforeAction = vi.fn().mockResolvedValue({ id: 'expired-effect', cached: null, authorizeDispatch: authorize, assertDispatchCurrent: current })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({ kind: 'action', action: { actionId: 'expired', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'expired' } } as any)
      .mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('操作尚未执行。'), text: '操作尚未执行。', finishReason: 'stop' })
    await runAlicizationMainChatBackground(input)
    expect(authorize).toHaveBeenCalledOnce()
    expect(current).toHaveBeenCalledOnce()
    expect(execute).not.toHaveBeenCalled()
    expect(input.life.afterAction).toHaveBeenCalledWith(expect.objectContaining({ id: 'expired-effect', outcome: 'failure', interrupted: false, output: expect.objectContaining({ effectMayHaveOccurred: false }) }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })
  it.each([
    { name: 'corrected first proposal', mode: 'corrected', calls: 3, executions: 1, success: true },
    { name: 'repeated invalid proposal', mode: 'invalid', calls: 2, executions: 0, success: false },
    { name: 'invalid proposal after an admitted action', mode: 'after-action', calls: 2, executions: 1, success: false },
  ])('keeps action ownership exact for $name', async ({ mode, calls, executions, success }) => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const execute = vi.fn(async () => ({ ok: true, status: 'completed' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', description: 'One owned test action', parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } }, execute }] })
    let generated = 0
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(request => actual.runAlicizationMainChatProviderStep({ ...request, streamTextImpl: () => {
      const index = ++generated
      const invalid = mode === 'invalid' || (mode === 'corrected' ? index === 1 : index === 2)
      return { fullStream: new ReadableStream({ start(controller) {
        if (index === 3) {
          controller.enqueue({ type: 'text-delta', text: buildProviderReply('收到。') })
          controller.enqueue({ type: 'finish', finishReason: 'stop' })
        }
        else {
          controller.enqueue({ type: 'tool-call', toolCallId: `candidate-${index}`, toolName: 'test_action', arguments: { value: 'same current request', ...(invalid ? { capabilityBindings: [] } : {}) } })
          controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
        }
        controller.close()
      } }) }
    } }))
    const input = createInput('请执行这个测试动作', { prepareTurn: vi.fn(async () => prepared) })
    await runAlicizationMainChatBackground(input)
    expect(generated).toBe(calls)
    expect(execute).toHaveBeenCalledTimes(executions)
    expect(input.life.beforeAction).toHaveBeenCalledTimes(executions)
    expect(input.life.afterAction).toHaveBeenCalledTimes(executions)
    if (success) {
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
      expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('life.tool-arguments-repair', expect.objectContaining({ actionAdmitted: false, toolReplayed: false }))
      const repair = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[1][0]
      expect(repair.messages.some(message => message.role === 'system' && String(message.content).includes('rejected-before-dispatch'))).toBe(true)
      expect(repair.providerRetryPolicy).toEqual({ maxRetries: 0 })
      const continuation = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[2][0].messages
      const calls = continuation.flatMap(message => message.role === 'assistant' ? message.tool_calls ?? [] : [])
      expect(calls.map(call => call.id)).toEqual(['candidate-2'])
      const toolResult = continuation.findIndex(message => message.role === 'tool' && message.tool_call_id === 'candidate-2')
      expect(toolResult).toBeGreaterThan(continuation.findIndex(message => message.role === 'assistant' && message.tool_calls?.some(call => call.id === 'candidate-2')))
    }
    else {
      expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    }
  })

  it('keeps all required context and tools by sending the same reduced output allocation to the actual provider boundary', async () => {
    const request = '请写一篇八百字的雨天绘画散文，保留我的完整要求。'
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { activeTask: 'current request' }, recentDialogue: [{ turnId: 'prior-user', role: 'user', text: 'Preserve this literal earlier conversation.' }], compressedTimeline: [], corrections: [{ text: 'Keep the current correction' }], emotionalPosture: { summary: 'continuous feeling' } }, longTermRecall: { evidence: [{ id: 'required-proof', summary: '保留有来源的实际记忆。'.repeat(80) }] } } }
    const tools = [{ type: 'function' as const, function: { name: 'filesystem_read_file', parameters: { type: 'object', properties: { path: { type: 'string' } } } }, execute: vi.fn() }]
    const prepared = createPrepared({ tools, messages: [{ role: 'system', content: 'Exact adopted identity' }, { role: 'system', content: JSON.stringify(memory) }, { role: 'user', content: request }] })
    const input = createInput(request, { prepareTurn: vi.fn(async () => prepared) })
    const cost = boundLifeProviderRequest(prepareAgentContinuation([...prepared.messages, { role: 'system', content: '{}' }], { hasTools: true }).messages, tools).report
    input.mainGateway.providerBudget = { contextTokens: cost.beforeTokens + cost.toolTokens + 4096 + 1024 - 147, outputReserve: 4096, completionTokenField: 'maxCompletionTokens', contextSource: 'configured' }
    await runAlicizationMainChatBackground(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    const call = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[0][0]
    expect(call.providerBudget).toMatchObject({ outputReserve: 3949, completionTokenField: 'maxCompletionTokens' })
    expect(call.messages).toContainEqual(prepared.messages[0])
    expect(call.messages).toContainEqual(prepared.messages[1])
    expect(call.messages).toContainEqual({ role: 'user', content: request })
    expect(call.prepared.tools).toBe(tools)
    expect(input.life.recordContextUse).toHaveBeenCalledOnce()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('life.provider-budget', expect.objectContaining({ outputReserve: 3949, outputReserveReduction: { requested: 4096, minimum: 2048, selected: 3949 } }))
    expect(tools[0].execute).not.toHaveBeenCalled()
  })
  it('fits an ordinary conversation by exact historical interning while retaining its tools, recent words and required proof', async () => {
    const request = '请写一篇雨天绘画散文，保留我当前的全部要求。'
    const repeated = 'A source-backed earlier painting scene, with the same words recorded in distinct events. '.repeat(8)
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', recentDialogue: [{ turnId: 'prior-user', text: 'Preserve our most recent literal conversation.' }], compressedTimeline: Array.from({ length: 5 }, (_, index) => ({ summary: `distinct event ${index}`, thread: repeated, sourceTurnIds: [`source-${index}`] })), corrections: [{ text: 'Keep the current correction' }] }, longTermRecall: { evidence: [{ id: 'current-proof', summary: 'Keep this exact evidence' }] } } }
    const execute = vi.fn()
    const tools = [{ type: 'function' as const, function: { name: 'filesystem_read_file', parameters: { type: 'object', properties: { path: { type: 'string' } } } }, execute }]
    const prepared = createPrepared({ tools, messages: [{ role: 'system', content: 'Exact adopted identity' }, { role: 'system', content: JSON.stringify(memory) }, { role: 'user', content: request }] })
    const input = createInput(request, { prepareTurn: vi.fn(async () => prepared) })
    const cost = boundLifeProviderRequest([...prepared.messages, { role: 'system', content: '{}' }], tools).report
    input.mainGateway.providerBudget = { contextTokens: cost.beforeTokens + cost.toolTokens + 512 + 1024 - 166, outputReserve: 512, completionTokenField: 'maxTokens', contextSource: 'configured' }
    await runAlicizationMainChatBackground(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    const call = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[0][0]
    const block = call.messages.find(message => message.role === 'system' && String(message.content).includes('alicization-turn-memory-context'))!
    const projected = JSON.parse(String(block.content))
    expect(projected.data.historicalTextDictionary.values).toEqual([repeated])
    expect(projected.data.workingMemory.recentDialogue).toEqual(memory.data.workingMemory.recentDialogue)
    expect(projected.data.workingMemory.corrections).toEqual(memory.data.workingMemory.corrections)
    expect(projected.data.longTermRecall).toEqual(memory.data.longTermRecall)
    expect(call.messages).toContainEqual({ role: 'user', content: request })
    expect(call.prepared.tools).toBe(tools)
    expect(input.life.recordContextUse).toHaveBeenCalledOnce()
    expect(execute).not.toHaveBeenCalled()
    const budget = vi.mocked(input.appendRuntimeDebugLine).mock.calls.find(([event]) => event === 'life.provider-budget')![1]
    expect(budget).toMatchObject({ deduplicatedHistoricalMemory: expect.any(Array) })
    expect(budget).not.toHaveProperty('compactedHistoricalMemory')
    expect(JSON.parse(prepared.messages[1].content)).toEqual(memory)
  })

  it.each([{ names: ['life_execute_work_plan'] }, { names: ['life_list_learned_procedures', 'life_use_learned_procedure'] }])('preserves full required context while offering the explicitly requested $names surface', async ({ names }) => {
    const work = names.map(name => ({ type: 'function' as const, function: { name, description: 'Use accepted work', parameters: { type: 'object', properties: {} } }, execute: vi.fn() }))
    const duplicate = { type: 'function' as const, function: { name: 'direct_browser_tool', description: 'unused schema'.repeat(3000), parameters: { type: 'object', properties: {} } }, execute: vi.fn() }
    const request = `请用 ${names.join(' 然后 ')} 完成这个本地工作。`
    const prepared = createPrepared({ tools: [...work, duplicate], messages: [{ role: 'user', content: request }] })
    const input = createInput(request, { prepareTurn: vi.fn(async () => prepared) })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({ prepared: expect.objectContaining({ tools: work }), messages: expect.arrayContaining([expect.objectContaining({ role: 'user', content: request })]) }))
    expect(input.life.recordContextUse).toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('keeps explicit-workflow history compaction available when rejected arguments add a second request near the context limit', async () => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const request = '请用 life_execute_work_plan 处理本地请求；保留原来的所有要求。'
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', current: { activeTask: 'exact current task' }, recentDialogue: [{ turnId: 'prior-dialogue', text: 'redundant historical wording '.repeat(300) }], compressedTimeline: [{ summary: 'source-backed earlier event', sourceTurnIds: ['prior-dialogue'] }], corrections: [{ text: 'preserve current correction' }], relationshipPosture: { summary: 'continuous relationship' }, emotionalPosture: { summary: 'continuous feeling' } }, longTermRecall: { evidence: [{ id: 'required-proof', summary: 'keep this exact proof' }] } } }
    const execute = vi.fn()
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'life_execute_work_plan', parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } }, execute }], messages: [{ role: 'system', content: 'exact adopted identity' }, { role: 'system', content: JSON.stringify(memory) }, { role: 'user', content: request }] })
    const input = createInput(request, { prepareTurn: vi.fn(async () => prepared) })
    const initialBudget = boundLifeProviderRequest(prepareAgentContinuation([...prepared.messages, { role: 'system', content: '{}' }], { hasTools: true }).messages, prepared.tools).report
    input.mainGateway.providerBudget = { contextTokens: initialBudget.beforeTokens + initialBudget.toolTokens + 512 + 1024 + 32, outputReserve: 512, completionTokenField: 'maxTokens', contextSource: 'configured' }
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(options => actual.runAlicizationMainChatProviderStep({ ...options, streamTextImpl: () => ({ fullStream: new ReadableStream({ start(controller) {
      controller.enqueue({ type: 'tool-call', toolCallId: 'rejected-candidate', toolName: 'life_execute_work_plan', arguments: { value: 'original request', capabilityBindings: [] } })
      controller.enqueue({ type: 'finish', finishReason: 'tool_calls' })
      controller.close()
    } }) }) })).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('我先核对这项请求。'), text: '我先核对这项请求。', finishReason: 'stop' })
    await runAlicizationMainChatBackground(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    const first = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[0][0]
    expect(first.messages).toContainEqual({ role: 'system', content: JSON.stringify(memory) })
    const repair = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[1][0]
    const projected = repair.messages.find(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('alicization-turn-memory-context'))!
    expect(JSON.parse(String(projected.content))).toEqual({ ...memory, data: { ...memory.data, workingMemory: { ...memory.data.workingMemory, recentDialogue: [] } } })
    expect(repair.messages).toContainEqual({ role: 'system', content: 'exact adopted identity' })
    expect(repair.messages).toContainEqual({ role: 'user', content: request })
    expect(JSON.parse(prepared.messages[1].content)).toEqual(memory)
    expect(execute).not.toHaveBeenCalled()
    expect(input.life.beforeAction).not.toHaveBeenCalled()
  })

  it('continues after one admitted action fills the request budget without replaying its effect or losing the result', async () => {
    const request = '请用 life_execute_work_plan 完成指定工作。'
    const historical = 'Previously accepted responsibility with an unchanged source and uncertainty. '.repeat(10)
    const memory = { type: 'alicization-turn-memory-context', data: { workingMemory: { version: 'working-memory-owner-context-v1', owner: 'working-memory', recentDialogue: [], compressedTimeline: Array.from({ length: 6 }, (_, index) => ({ summary: `event-${index}`, thread: historical, commitments: [historical], sourceTurnIds: [`source-${index}`] })), corrections: [{ text: 'Keep this correction' }] }, longTermRecall: { evidence: [{ id: 'exact-proof', summary: 'Preserve this evidence' }] } } }
    const receipt = { observedResult: 'Actual tool observation. '.repeat(60) }
    const execute = vi.fn(async () => receipt)
    const tools = [{ type: 'function', function: { name: 'life_execute_work_plan', parameters: { type: 'object', properties: {} } }, execute }]
    const prepared = createPrepared({ tools, messages: [{ role: 'system', content: 'exact identity' }, { role: 'system', content: JSON.stringify(memory) }, { role: 'user', content: request }] })
    const input = createInput(request, { prepareTurn: vi.fn(async () => prepared) })
    const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength
    input.mainGateway.providerBudget = { contextTokens: bytes([...prepared.messages, { role: 'system', content: '{}' }]) + bytes(tools) + 512 + 1024 + 32, outputReserve: 512, completionTokenField: 'maxTokens', contextSource: 'configured' }
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({ kind: 'action', action: { actionId: 'admitted-once', input: {}, providerToolName: 'life_execute_work_plan', capabilityId: 'tool.life_execute_work_plan', toolCallId: 'admitted-once' } } as any)
      .mockImplementationOnce(async ({ messages }) => {
        expect(execute).toHaveBeenCalledOnce()
        const memoryBlock = messages.find(message => message.role === 'system' && String(message.content).includes('alicization-turn-memory-context'))!
        const projected = JSON.parse(String(memoryBlock.content))
        expect(projected.data.historicalTextDictionary.values).toEqual([historical])
        expect(projected.data.workingMemory.corrections).toEqual(memory.data.workingMemory.corrections)
        expect(projected.data.longTermRecall).toEqual(memory.data.longTermRecall)
        expect(messages.some(message => message.role === 'tool' && String(message.content).includes(receipt.observedResult))).toBe(true)
        return { kind: 'reply', fullText: buildProviderReply('我会按实际结果继续。'), text: '我会按实际结果继续。', finishReason: 'stop' }
      })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.beforeAction).toHaveBeenCalledOnce()
    expect(input.life.afterAction).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('life.provider-budget', expect.objectContaining({ deduplicatedHistoricalMemory: expect.arrayContaining([expect.objectContaining({ references: 12 })]) }))
    expect(JSON.parse(prepared.messages[1].content)).toEqual(memory)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runAlicizationMainChatProviderStep).mockReset().mockResolvedValue({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider reply',
      text: 'Provider reply',
    } as any)
    vi.mocked(handleAlicizationMainChatRunFailure).mockResolvedValue(undefined)
  })

  it('fits a restarted historical reply with complete evidence while keeping mixed-request execution available', async () => {
    const question = '重启之前你自己实际做过哪些小活动？哪些已经完成，哪些只是想法？说具体发生过的事。'
    const evidence = JSON.stringify({ identity: 'adopted identity', verifiedContent: '来源'.repeat(6900) })
    const execute = vi.fn(async () => ({ ok: true }))
    const tools = [{ type: 'function', function: { name: 'test_action', description: 'schema'.repeat(3500), parameters: { type: 'object', properties: {} } }, execute }]
    const prepared = createPrepared({ messages: [{ role: 'system', content: evidence }, { role: 'user', content: question }], tools, toolChoice: 'required', waitForTools: true })
    const input = createInput(question, { prepareTurn: vi.fn(async () => prepared) })
    input.mainGateway.providerBudget = { contextTokens: 65536, outputReserve: 4096, completionTokenField: 'maxTokens', contextSource: 'unknown-conservative-default' }
    await runAlicizationMainChatBackground(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    const dispatched = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[0][0]
    expect(dispatched.messages).toContainEqual({ role: 'system', content: evidence })
    expect(dispatched.prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
    expect(prepared.tools).toBe(tools)
    expect(execute).not.toHaveBeenCalled()
    vi.mocked(runAlicizationMainChatProviderStep).mockClear()
    const mixed = `${question}帮我写入测试文件。`
    const mixedPrepared = createPrepared({ tools })
    await runAlicizationMainChatBackground(createInput(mixed, { prepareTurn: vi.fn(async () => mixedPrepared) }))
    expect(vi.mocked(runAlicizationMainChatProviderStep).mock.calls[0][0].prepared.tools).toBe(tools)
  })

  it('archives a recovered committed reply through the durable delivery port before streaming', async () => {
    const order: string[] = []
    const deliver = vi.fn(async () => { order.push('durable') })
    const input = createInput('继续原始输入', { deliverCommittedReply: deliver, emitChunk: () => { order.push('stream') } })
    input.reviewLifeReply = vi.fn(async () => ({ accepted: true, reviewId: 'actual-review', issues: [] }))
    await runAlicizationMainChatBackground(input)
    expect(deliver).toHaveBeenCalledWith({ artifact: expect.objectContaining({ visibleText: 'Provider reply', realization: expect.objectContaining({ providerMindExecuted: true, visibleReplyValidationStatus: 'approved' }) }), cardId: 'card-1', turnId: 'turn-1', text: 'Provider reply', conversationId: 'conversation-1', reviewId: 'actual-review', owners: [] })
    expect(order).toEqual(['durable', 'stream', 'stream'])
  })
  it('publishes a typed non-learning prefix before model and life review settlement', async () => {
    const input = createInput('你好')
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      expect(options.onReplyText?.('你好，')).toBe(true)
      expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: '你好，', delivery: { phase: 'append', sequence: 0, offset: 0 }, learningPolicy: { allowLongTermCondensation: false, allowPersonaLearning: false, allowTraining: false } }))
      expect(input.reviewLifeReply).not.toHaveBeenCalled()
      return { kind: 'reply', fullText: '你好，我在这里。', text: '你好，我在这里。', finishReason: 'stop' }
    })
    await runAlicizationMainChatBackground(input)
    const packets = vi.mocked(input.emitChunk).mock.calls.map(([event]) => event)
    expect(packets.filter(event => event.delivery?.phase === 'append').map(event => event.text).join('')).toBe('你好，我在这里。')
    expect(packets.at(-1)).toMatchObject({ text: '', delivery: { phase: 'complete', sequence: 2, offset: 8 } })
  })
  it('delivers accepted header emotion through the real emitter before the first public glyph with uncommitted governance', async () => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-meta')>('./main-chat-stream-meta')
    vi.mocked(createAlicizationChatStreamMetaEmitter).mockImplementationOnce(actual.createAlicizationChatStreamMetaEmitter)
    const input = createInput('请只回复：今天画画很开心。')
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      options.onReplyEmotion?.('happy')
      expect(vi.mocked(input.emitMeta).mock.calls.at(-1)?.[0]).toMatchObject({
        turnId: 'turn-1',
        governance: null,
        embodiment: { performance: { baseEmotion: 'happy' } },
      })
      expect(input.emitChunk).not.toHaveBeenCalled()
      expect(input.reviewLifeReply).not.toHaveBeenCalled()
      expect(options.onReplyText?.('今天')).toBe(true)
      return { kind: 'reply', fullText: buildProviderReply('今天画画很开心。'), text: '今天画画很开心。', finishReason: 'stop' }
    })
    await runAlicizationMainChatBackground(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.life.beforeAction).not.toHaveBeenCalled()
  })
  it.each([
    { name: 'accepted suffix', revised: '文件还没有保存。', accepted: true, completes: true },
    { name: 'repeated public prefix', revised: '你好，文件还没有保存。', accepted: true, completes: false },
    { name: 'still unsupported suffix', revised: '我已经保存了文件。', accepted: false, completes: false },
  ])('repairs only the unpublished remainder after a public prefix: $name', async ({ revised, accepted, completes }) => {
    const input = createInput('你好')
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      options.onReplyText?.('你好，')
      expect(options.onReplyText?.('我已经保存了文件。')).toBe(false)
      return { kind: 'reply', fullText: '你好，我已经保存了文件。', text: '你好，我已经保存了文件。', finishReason: 'stop' }
    }).mockImplementationOnce(async (options) => {
      expect(options.prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
      expect(options.providerRetryPolicy).toEqual({ maxRetries: 0 })
      const prefix = options.messages.find(message => message.role === 'system' && String(message.content).includes('alicization-public-reply-prefix'))!
      expect(JSON.parse(String(prefix.content)).data).toMatchObject({ text: '你好，', status: 'already-published-non-learning-prefix', replyMode: 'unpublished-continuation-v1' })
      // An unreviewed revision must not repeat the prefix or animate its claims.
      options.onReplyAttemptStart?.()
      options.onReplyEmotion?.('happy')
      options.onReplyText?.(revised)
      expect(vi.mocked(input.emitChunk).mock.calls.map(([event]) => event.text)).toEqual(['你好，'])
      return { kind: 'reply', fullText: buildProviderReply(revised), text: revised, finishReason: 'stop' }
    })
    input.reviewLifeReply = vi.fn().mockResolvedValueOnce({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION', quote: '我已经保存了文件。' }] }).mockResolvedValueOnce({ accepted, issues: accepted ? [] : [{ code: 'UNPROVEN_COMPLETION', quote: '我已经保存了文件。' }] })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    const packets = vi.mocked(input.emitChunk).mock.calls.map(([event]) => event)
    if (completes) {
      expect(packets.filter(event => event.delivery?.phase === 'append').map(event => event.text)).toEqual(['你好，', '文件还没有保存。'])
      expect(packets.at(-1)).toMatchObject({ text: '', cardId: 'card-1', turnId: 'turn-1', delivery: { phase: 'complete', sequence: 2, offset: '你好，'.length + revised.length } })
      expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: `你好，${revised}` }))
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    }
    else {
      expect(packets.map(event => event.text)).toEqual(['你好，'])
      expect(handleAlicizationMainChatRunFailure).toHaveBeenCalled()
    }
    expect(input.life.beforeAction).not.toHaveBeenCalled()
  })

  it.each([true, false])('completes a partial published word and reviews the full composition (structured=%s)', async (structured) => {
    const input = createInput('执行已授权计划')
    const deliver = vi.fn(async (_value: Parameters<NonNullable<typeof input.deliverCommittedReply>>[0]) => {})
    input.deliverCommittedReply = deliver
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      expect(options.onReplyText?.('计划已接')).toBe(true)
      expect(options.onReplyText?.('收，我已经完成下载。')).toBe(false)
      return { kind: 'reply', fullText: buildProviderReply('计划已接收，我已经完成下载。'), text: '计划已接收，我已经完成下载。', finishReason: 'stop' }
    }).mockResolvedValueOnce({ kind: 'reply', fullText: structured ? buildProviderReply('收，下载尚未完成。') : '收，下载尚未完成。', text: '收，下载尚未完成。', finishReason: 'stop' })
    input.reviewLifeReply = vi.fn().mockResolvedValueOnce({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION', quote: '我已经完成下载。' }] }).mockResolvedValueOnce({ accepted: true, reviewId: 'composed-review', issues: [] })
    await runAlicizationMainChatBackground(input)
    expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: '计划已接收，下载尚未完成。' }))
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ text: '计划已接收，下载尚未完成。', reviewId: 'composed-review', artifact: expect.objectContaining({ fullText: expect.any(String) }) }))
    expect(JSON.parse(deliver.mock.calls[0][0].artifact.fullText).reply).toBe('计划已接收，下载尚未完成。')
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual(['计划已接', '收，下载尚未完成。'])
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.life.beforeAction).not.toHaveBeenCalled()
  })

  it('never certifies a published prefix merely because its continuation is harmless', async () => {
    const input = createInput('执行了吗')
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      options.onReplyText?.('计划已接')
      options.onReplyText?.('收。')
      return { kind: 'reply', fullText: buildProviderReply('计划已接收。'), text: '计划已接收。', finishReason: 'stop' }
    }).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('收，先等待。'), text: '收，先等待。', finishReason: 'stop' })
    input.reviewLifeReply = vi.fn(async ({ text }) => ({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION' as const, quote: text }] }))
    await runAlicizationMainChatBackground(input)
    expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: '计划已接收，先等待。' }))
    expect(vi.mocked(input.emitChunk).mock.calls.map(([event]) => event.text)).toEqual(['计划已接'])
    expect(input.life.settle).toHaveBeenCalledWith({ cardId: 'card-1', turnId: 'turn-1', status: 'failed' })
    expect(input.life.settle).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }))
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
  })

  it('continues one already spoken introduction across an actual tool action without replay or a second bubble', async () => {
    const execute = vi.fn(async () => ({ status: 'completed', result: 'actual current observation' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('帮我看看这里', { prepareTurn: vi.fn(async () => prepared) })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      expect(options.onReplyText?.('我先看看。')).toBe(true)
      return { kind: 'action', action: { actionId: 'inspect-once', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'inspect-once' } }
    }).mockImplementationOnce(async (options) => {
      const prefix = options.messages.find(message => message.role === 'system' && String(message.content).includes('alicization-public-reply-prefix'))
      expect(prefix).toBeDefined()
      expect(JSON.parse(String(prefix!.content)).data).toMatchObject({ text: '我先看看。', replyMode: 'unpublished-continuation-v1' })
      options.onReplyAttemptStart?.()
      expect(options.onReplyText?.('已经取得这次观察结果。')).toBe(false)
      expect(vi.mocked(input.emitChunk).mock.calls.map(([event]) => event.text)).toEqual(['我先看看。'])
      return { kind: 'reply', fullText: buildProviderReply('已经取得这次观察结果。'), text: '已经取得这次观察结果。', finishReason: 'stop' }
    })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.beforeAction).toHaveBeenCalledOnce()
    expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: '我先看看。已经取得这次观察结果。' }))
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual(['我先看看。', '已经取得这次观察结果。'])
    expect(vi.mocked(input.emitChunk).mock.calls.at(-1)?.[0]).toMatchObject({ text: '', delivery: { phase: 'complete', offset: '我先看看。已经取得这次观察结果。'.length } })
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('continues actual HTTP SSE text across a tool result with one visible reply and one execution', async () => {
    const actualRunner = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const intro = '我先看看。'
    const continuation = '已经取得这次观察结果。'
    let releaseIntro!: () => void
    const introVisible = new Promise<void>((resolve) => { releaseIntro = resolve })
    const ordering: string[] = []
    const execute = vi.fn(async () => {
      ordering.push('execute')
      return { status: 'completed', result: 'actual current observation' }
    })
    const server = await startProviderHttpFaultServer({
      respond: ({ attempt }) => attempt === 1
        ? {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            stream: async (response) => {
              response.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { role: 'assistant', content: buildProviderReply(intro) }, finish_reason: null }] })}\n\n`)
              let timer: ReturnType<typeof setTimeout> | undefined
              try {
                await Promise.race([introVisible, new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Intro did not stream before the tool call')), 3000) })])
              }
              finally { clearTimeout(timer) }
              response.end(encodeOpenAICompatibleSse([
                { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'http-inspect-once', type: 'function', function: { name: 'test_action', arguments: '{}' } }] }, finish_reason: null }] },
                { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] },
              ]))
            },
          }
        : {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
            body: encodeOpenAICompatibleSse([
              { choices: [{ index: 0, delta: { content: buildProviderReply(continuation) }, finish_reason: null }] },
              { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
            ]),
          },
    })
    const prepared = createPrepared({
      chatConfig: { apiKey: 'test-key', baseURL: server.baseUrl, model: 'gpt-test' },
      tools: [{ type: 'function', function: { name: 'test_action', description: 'Inspect once', parameters: { type: 'object', properties: {} } }, execute }],
    })
    const input = createInput('帮我看看这里', { prepareTurn: vi.fn(async () => prepared) })
    vi.mocked(input.emitChunk).mockImplementation((event) => {
      if (event.text === intro) {
        ordering.push('intro-visible')
        releaseIntro()
      }
      else if (event.text === continuation) {
        ordering.push('result-visible')
      }
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actualRunner.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
      expect(server.requests).toHaveLength(2)
      expect(server.requests.map(request => JSON.parse(request.body).stream)).toEqual([true, true])
      const secondMessages = JSON.parse(server.requests[1].body).messages
      const providerCalls = secondMessages.flatMap((message: Message) => message.role === 'assistant' ? message.tool_calls ?? [] : [])
      expect(providerCalls).toEqual([{ id: 'http-inspect-once', type: 'function', function: { name: 'test_action', arguments: '{}' } }])
      const callIndex = secondMessages.findIndex((message: Message) => message.role === 'assistant' && message.tool_calls?.some(call => call.id === 'http-inspect-once'))
      const resultIndex = secondMessages.findIndex((message: Message) => message.role === 'tool' && message.tool_call_id === 'http-inspect-once')
      expect(callIndex).toBeGreaterThanOrEqual(0)
      expect(resultIndex).toBeGreaterThan(callIndex)
      const prefixFacts = secondMessages.filter((message: Message) => message.role === 'system' && String(message.content).includes('alicization-public-reply-prefix'))
      expect(prefixFacts).toHaveLength(1)
      expect(JSON.parse(prefixFacts[0].content).data.text).toBe(intro)
      expect(secondMessages.some((message: Message) => message.role === 'tool' && String(message.content).includes('actual current observation'))).toBe(true)
      expect(ordering).toEqual(['intro-visible', 'execute', 'result-visible'])
      expect(execute).toHaveBeenCalledOnce()
      expect(input.life.beforeAction).toHaveBeenCalledOnce()
      expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: intro + continuation }))
      expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual([intro, continuation])
      expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'complete')).toHaveLength(1)
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    }
    finally { await server.close() }
  })

  it.each(['complete', 'direct', 'revoke'] as const)('runs deferred discovery through actual SQLite life receipts and SSE: %s', async (mode) => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const directory = await mkdtemp(join(tmpdir(), 'alicization-capability-life-'))
    const database = await setupAlicizationDb(directory, { cardId: 'card-1' })
    const scope = { cardId: 'card-1', turnId: 'turn-1', conversationId: 'conversation-1', userId: 'local-user-stable' }
    const execute = vi.fn(async () => ({ status: 'completed', result: 'observed archive' }))
    const tools = Array.from({ length: 40 }, (_, index) => ({ type: 'function', function: { name: index === 39 ? 'rare_archive' : `test_catalog_${index}`, description: `${index === 39 ? 'Archive contents' : 'General utility'} ${'operation interface '.repeat(35)}`, parameters: { type: 'object', properties: {}, additionalProperties: false } }, execute }))
    const prepared = createPrepared({ tools })
    prepared.tools.push(...await Promise.all(createCapabilityDiscoveryTools(() => prepared.tools, prepared.toolRegistry)))
    const steps = [{ name: capabilitySearchName, args: { query: 'archive' } }, ...(mode === 'direct' ? [] : [{ name: capabilityDescribeName, args: { names: ['rare_archive'] } }]), { name: 'rare_archive', args: {} }]
    const server = await startProviderHttpFaultServer({ respond: ({ attempt, body }) => {
      const offered = JSON.parse(body).tools.map((item: any) => item.function.name)
      if (attempt === 1)
        expect(offered).not.toContain('rare_archive')
      if (attempt === 3 && mode === 'complete')
        expect(offered).toContain('rare_archive')
      const step = steps[attempt - 1]
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(step
        ? [{ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: `discovery-${attempt}`, type: 'function', function: { name: step.name, arguments: JSON.stringify(step.args) } }] }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]
        : [{ choices: [{ index: 0, delta: { content: buildProviderReply('这次观察已返回。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }]) }
    } })
    prepared.chatConfig = { apiKey: 'test', baseURL: server.baseUrl, model: 'test' }
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    const originalAfter = life.afterAction
    life.afterAction = async (result) => {
      await originalAfter(result)
      if (mode === 'revoke' && String(result.id).includes('discovery-2'))
        prepared.toolRegistry.setActivationStatus('test.rare_archive', 'revoked')
    }
    const input = createInput('帮我看看刚才的内容', { life, prepareTurn: vi.fn(async () => prepared), providerRetryPolicy: { maxRetries: 0 }, turnLoop: { ...scope, persistence: database } })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actual.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      expect(execute).toHaveBeenCalledTimes(mode === 'revoke' ? 0 : 1)
      expect(server.requests).toHaveLength(mode === 'complete' ? 4 : 3)
      const view = await database.readLifeState()
      expect(view.effects.filter(effect => effect.kind === 'execute')).toHaveLength(mode === 'complete' ? 3 : 2)
      expect(view.effects.filter(effect => effect.kind === 'execute').every(effect => effect.status === 'settled')).toBe(true)
      const events = await database.listRuntimeEvents(scope)
      expect(events.filter(event => event.eventType === 'action.settlement.completed')).toHaveLength(mode === 'complete' ? 3 : 2)
      if (mode !== 'revoke') {
        expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
        expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({ status: 'completed' }))
      }
      else {
        expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
      }
    }
    finally {
      await server.close()
      await database.close()
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('preserves an admitted action exactly once when repairing a factual follow-up', async () => {
    const execute = vi.fn(async () => ({ status: 'completed', actual: 'one result' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('执行这个本地操作', { prepareTurn: vi.fn(async () => prepared) })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({ kind: 'action', action: { actionId: 'actual-action', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'actual-action' } } as any)
      .mockImplementationOnce(async (options) => {
        options.onReplyAttemptStart?.()
        expect(options.onReplyText?.('你好，')).toBe(false)
        expect(options.onReplyText?.('我已经保存了文件。')).toBe(false)
        expect(input.emitChunk).not.toHaveBeenCalled()
        return { kind: 'reply', fullText: buildProviderReply('你好，我已经保存了文件。'), text: '你好，我已经保存了文件。', finishReason: 'stop' }
      })
      .mockImplementationOnce(async (options) => {
        expect(options.prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
        expect(options.messages.some(message => message.role === 'tool' && String(message.content).includes('one result'))).toBe(true)
        return { kind: 'reply', fullText: buildProviderReply('你好，操作已有结果，文件是否保存还没有证据。'), text: '你好，操作已有结果，文件是否保存还没有证据。', finishReason: 'stop' }
      })
    input.reviewLifeReply = vi.fn().mockResolvedValueOnce({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION', quote: '我已经保存了文件。' }] }).mockResolvedValueOnce({ accepted: true, issues: [] })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.beforeAction).toHaveBeenCalledOnce()
    expect(input.life.afterAction).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.reviewLifeReply).toHaveBeenLastCalledWith(expect.objectContaining({ text: '你好，操作已有结果，文件是否保存还没有证据。' }))
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text).join('')).toBe('你好，操作已有结果，文件是否保存还没有证据。')
  })

  it('rejects a tool action emitted during textual repair without publishing or dispatching it', async () => {
    const execute = vi.fn(async () => ({ status: 'completed' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('你好', { prepareTurn: vi.fn(async () => prepared) })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async (options) => {
        options.onReplyAttemptStart?.()
        options.onReplyText?.('你好，')
        options.onReplyText?.('我已经保存了文件。')
        return { kind: 'reply', fullText: buildProviderReply('你好，我已经保存了文件。'), text: '你好，我已经保存了文件。', finishReason: 'stop' }
      })
      .mockResolvedValueOnce({ kind: 'action', action: { actionId: 'repair-action', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'repair-action' } } as any)
    input.reviewLifeReply = vi.fn(async () => ({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' as const, quote: '我已经保存了文件。' }] }))
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    expect(vi.mocked(input.emitChunk).mock.calls.map(([event]) => event.text)).toEqual(['你好，'])
    expect(execute).not.toHaveBeenCalled()
    expect(input.life.beforeAction).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalled()
  })
  it('stops language repair on unavailable independent review without replaying tools or claiming invalid provider format', async () => {
    const input = createInput('查看已接收任务的状态')
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('计划已接收，等待确认。'), text: '计划已接收，等待确认。', finishReason: 'stop' })
    input.reviewLifeReply = vi.fn(async () => ({ accepted: false, reviewUnavailable: true as const, issues: [{ code: 'UNRELIABLE_REVIEW' as const, quote: '' }] }))

    await runAlicizationMainChatBackground(input)

    expect(input.reviewLifeReply).toHaveBeenCalledTimes(1)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(1)
    expect(input.life.beforeAction).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(AlicizationReplyGroundingUnavailableError) }))
  })
  it.each(['rebased', 'exhausted', 'cancelled', 'foreign-error'] as const)('handles a %s review read-set race without repeating the provider action', async (mode) => {
    let revision = 1
    let reviews = 0
    const execute = vi.fn(async () => ({ status: 'completed', actual: 'one observation' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('执行这个本地操作', { prepareTurn: vi.fn(async () => prepared) })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'cognition' as const, revision, contentHash: String(revision), metaKey: 'perception_state_v1' }] }))
    input.reviewLifeReply = vi.fn<typeof input.reviewLifeReply>(async (options) => {
      reviews += 1
      if (mode === 'rebased' && reviews > 1) {
        expect(options.owners.find(owner => owner.owner === 'cognition')?.revision).toBe(2)
        return { accepted: true, issues: [], reviewId: 'fresh-review' }
      }
      revision += 1
      if (mode === 'cancelled')
        input.runState.controller.abort(new Error('host-cancelled'))
      if (mode === 'foreign-error')
        throw new Error('Reply grounding read set is stale; context must be prepared again')
      throw new LifeStateConflictError('Reply grounding read set is stale; context must be prepared again')
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'action', action: { actionId: 'one-action-before-review', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'one-action-before-review' } }).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('已经取得这次观察结果。'), text: '已经取得这次观察结果。', finishReason: 'stop' })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.beforeAction).toHaveBeenCalledOnce()
    expect(input.life.afterAction).toHaveBeenCalledOnce()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    if (mode === 'rebased') {
      expect(input.prepareTurn).toHaveBeenCalledTimes(2)
      expect(reviews).toBe(2)
      expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual(['已经取得这次观察结果。'])
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    }
    else {
      expect(reviews).toBe(mode === 'exhausted' ? 3 : 1)
      expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append')).toHaveLength(0)
      if (mode === 'exhausted') {
        const calls = vi.mocked(input.reviewLifeReply).mock.calls
        expect(calls[1][0].signal).toBe(calls[2][0].signal)
      }
    }
  })

  it('keeps revoked memory evidence blocked when a review refresh revalidates the same draft', async () => {
    let revision = 1
    const input = createInput('继续刚才的记忆线', { prepareTurn: vi.fn(async () => createPrepared({ memoryContext: { workingMemory: { version: 'working-memory-v1' }, availableLongTermEvidenceIds: revision === 1 ? ['memory-known'] : [] } })) })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'memory' as const, revision, contentHash: String(revision), metaKey: 'life:memory-head' }] }))
    input.reviewLifeReply = vi.fn(async () => {
      revision = 2
      throw new LifeStateConflictError('Consumed life owner memory became stale before commit')
    })
    const payload = JSON.parse(buildProviderReply('还记得这条线索。'))
    payload.memoryUsage = { workingMemoryVersion: 'working-memory-v1', longTermEvidenceIds: ['memory-known'] }
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'reply', fullText: JSON.stringify(payload), text: payload.reply, finishReason: 'stop' })
    await runAlicizationMainChatBackground(input)
    expect(input.prepareTurn).toHaveBeenCalledTimes(2)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    expect(input.reviewLifeReply).toHaveBeenCalledOnce()
    expect(input.emitChunk).not.toHaveBeenCalled()
    expect(input.life.beforeAction).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ message: expect.stringContaining('provider-memory-usage-invalid') }) }))
  })

  it('can privately revise a factual draft after fresh review rejects it without replaying its action', async () => {
    let revision = 1
    const execute = vi.fn(async () => ({ status: 'completed', actual: 'only the returned observation' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('执行这个本地操作', { prepareTurn: vi.fn(async () => prepared) })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'cognition' as const, revision, contentHash: String(revision), metaKey: 'perception_state_v1' }] }))
    input.reviewLifeReply = vi.fn().mockImplementationOnce(async () => {
      revision = 2
      throw new LifeStateConflictError('Reply grounding read set is stale; context must be prepared again')
    }).mockResolvedValueOnce({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION', quote: '我已经保存了文件。' }] }).mockResolvedValueOnce({ accepted: true, issues: [] })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'action', action: { actionId: 'observed-once', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'observed-once' } }).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('我已经保存了文件。'), text: '我已经保存了文件。', finishReason: 'stop' }).mockImplementationOnce(async (options) => {
      expect(options.prepared.tools).toBeUndefined()
      expect(options.onReplyText).toBeUndefined()
      expect(options.messages.some(message => message.role === 'system' && String(message.content).includes('"revision":2'))).toBe(true)
      return { kind: 'reply', fullText: buildProviderReply('目前没有文件保存的证明。'), text: '目前没有文件保存的证明。', finishReason: 'stop' }
    })
    await runAlicizationMainChatBackground(input)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.beforeAction).toHaveBeenCalledOnce()
    expect(input.reviewLifeReply).toHaveBeenCalledTimes(3)
    expect(input.life.recordContextUse).toHaveBeenCalledTimes(3)
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual(['目前没有文件保存的证明。'])
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('revalidates one public reply against refreshed life state without replaying its text', async () => {
    let revision = 1
    const input = createInput()
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'cognition' as const, revision, contentHash: String(revision), metaKey: 'perception_state_v1' }] }))
    input.reviewLifeReply = vi.fn().mockImplementationOnce(async () => {
      revision = 2
      throw new LifeStateConflictError('Reply grounding read set is stale; context must be prepared again')
    }).mockResolvedValueOnce({ accepted: true, issues: [] })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async (options) => {
      options.onReplyAttemptStart?.()
      options.onReplyText?.('你好。')
      return { kind: 'reply', fullText: buildProviderReply('你好。'), text: '你好。', finishReason: 'stop' }
    })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    expect(input.reviewLifeReply).toHaveBeenCalledTimes(2)
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'append').map(([event]) => event.text)).toEqual(['你好。'])
    expect(vi.mocked(input.emitChunk).mock.calls.filter(([event]) => event.delivery?.phase === 'complete')).toHaveLength(1)
    expect(input.life.beforeAction).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it.each(['rebased', 'exhausted', 'cancelled', 'foreign-error'] as const)('handles a %s context-use race before provider dispatch with a fixed preparation budget', async (mode) => {
    let revision = 1
    let records = 0
    const execute = vi.fn(async () => ({ status: 'completed', actual: 'one observation' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', parameters: { type: 'object', properties: {} } }, execute }] })
    const input = createInput('执行这个本地操作', { prepareTurn: vi.fn(async () => prepared) })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'cognition' as const, revision, contentHash: String(revision), metaKey: 'perception_state_v1' }] }))
    input.life.recordContextUse = vi.fn(async () => {
      records += 1
      if (mode === 'rebased' && records > 1)
        return
      revision += 1
      if (mode === 'cancelled')
        input.runState.controller.abort(new Error('host-cancelled'))
      if (mode === 'foreign-error')
        throw new Error('Consumed life owner cognition became stale before commit')
      throw new LifeStateConflictError('Consumed life owner cognition became stale before commit')
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async ({ messages }) => {
      expect(records).toBe(2)
      expect(messages.some(message => message.role === 'system' && String(message.content).includes('"revision":2'))).toBe(true)
      return { kind: 'action', action: { actionId: 'fresh-context-action', input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: 'fresh-context-action' } }
    }).mockResolvedValueOnce({ kind: 'reply', fullText: buildProviderReply('已经取得这次观察结果。'), text: '已经取得这次观察结果。', finishReason: 'stop' })
    await runAlicizationMainChatBackground(input)
    if (mode === 'rebased') {
      expect(input.prepareTurn).toHaveBeenCalledTimes(2)
      expect(execute).toHaveBeenCalledOnce()
      expect(input.life.beforeAction).toHaveBeenCalledOnce()
      expect(input.life.afterAction).toHaveBeenCalledOnce()
      const recorded = vi.mocked(input.life.recordContextUse).mock.calls
      expect(recorded[0][1]).toBe(recorded[1][1])
      expect(vi.mocked(input.prepareTurn).mock.calls[1][0].abortSignal).toBe(recorded[0][1])
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    }
    else {
      expect(records).toBe(mode === 'exhausted' ? 3 : 1)
      expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
      expect(execute).not.toHaveBeenCalled()
      expect(input.life.beforeAction).not.toHaveBeenCalled()
      expect(input.life.settle).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }), expect.anything())
    }
  })

  it('reprepares a stale action before dispatch and preserves the tool observation without replaying an effect', async () => {
    let revision = 1
    const execute = vi.fn(async () => ({ ok: true, finalStatus: 'completed' }))
    const prepared = createPrepared({ tools: [{ type: 'function', function: { name: 'test_action', description: 'Test local action', parameters: { type: 'object', properties: {} } }, execute }] })
    const prepareTurn = vi.fn(async () => prepared)
    const input = createInput('执行这个本地操作', { prepareTurn, turnLoop: { conversationId: 'conversation-1', persistence: createInMemoryPersistence(), userId: 'host' } })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'habit' as const, revision, contentHash: String(revision), metaKey: 'mind-head:card-1:habit-policy' }] }))
    input.life.beforeAction = vi.fn().mockRejectedValueOnce(new LifeStateConflictError('Consumed life owner habit became stale before commit')).mockResolvedValue({ id: 'actual-effect', cached: null, authorizeDispatch: vi.fn(async () => {}), assertDispatchCurrent: vi.fn(async () => ({ expiresAt: null })) })
    const action = (id: string) => ({ kind: 'action', action: { actionId: id, input: {}, providerToolName: 'test_action', capabilityId: 'test.test_action', toolCallId: id } })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async () => {
        revision = 2
        return action('old-action') as any
      })
      .mockImplementationOnce(async ({ messages }) => {
        expect(messages.some(message => message.role === 'tool' && String(message.content).includes('noSideEffects'))).toBe(true)
        expect(execute).not.toHaveBeenCalled()
        return action('fresh-action') as any
      })
      .mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: '已核对实际结果。', text: '已核对实际结果。' } as any)
    await runAlicizationMainChatBackground(input)
    expect(prepareTurn).toHaveBeenCalledTimes(2)
    expect(execute).toHaveBeenCalledOnce()
    expect(input.life.afterAction).toHaveBeenCalledOnce()
    expect(input.runState.toolProgressListeners?.size).toBe(0)
    expect(input.emitError).not.toHaveBeenCalled()
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: '已核对实际结果。' }))
  })

  it.each([[true, true], [false, true], [true, false]])('requires a fresh model action after a rejected stale admission through actual HTTP SSE (honors required=%s, owners changed=%s)', async (honorsRequired, changesOwners) => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    let revision = 1
    const execute = vi.fn(async () => ({ status: 'completed', result: 'fresh admitted observation' }))
    const server = await startProviderHttpFaultServer({ respond: ({ attempt, body }) => {
      const request = JSON.parse(body)
      const action = attempt === 1 || (attempt === 2 && honorsRequired && request.tool_choice === 'required')
      if (attempt === 1 && changesOwners)
        revision = 2
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(action
        ? [{ choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: attempt === 1 ? 'stale-call' : 'fresh-call', type: 'function', function: { name: 'test_action', arguments: '{}' } }] }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]
        : [{ choices: [{ index: 0, delta: { content: buildProviderReply(attempt === 2 ? '我已经完成了。' : '已核对实际结果。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }]) }
    } })
    const prepared = createPrepared({ chatConfig: { apiKey: 'test-key', baseURL: server.baseUrl, model: 'gpt-test' }, tools: [{ type: 'function', function: { name: 'test_action', description: 'Inspect the owned request', parameters: { type: 'object', properties: {} } }, execute }] })
    const prepareTurn = vi.fn(async () => prepared)
    const input = createInput('执行这个本地操作', { prepareTurn, turnLoop: { conversationId: 'conversation-1', persistence: createInMemoryPersistence(), userId: 'host' } })
    input.life.context = vi.fn(async () => ({ revision, growthCandidateId: null, personaDevelopment: { format: 'persona-behavior-projection-v1' as const, soulHash: null, facets: [], effects: zeroPersonaEffects() }, text: JSON.stringify({ revision }), owners: [{ owner: 'habit' as const, revision, contentHash: String(revision), metaKey: 'mind-head:card-1:habit-policy' }] }))
    input.life.beforeAction = vi.fn().mockRejectedValueOnce(new LifeStateConflictError('Consumed life owner habit became stale before commit')).mockResolvedValue({ id: 'fresh-effect', cached: null, authorizeDispatch: vi.fn(async () => {}), assertDispatchCurrent: vi.fn(async () => ({ expiresAt: null })) })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actual.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      if (honorsRequired) {
        expect(execute).toHaveBeenCalledOnce()
        expect(input.life.beforeAction).toHaveBeenCalledTimes(2)
        expect(input.life.afterAction).toHaveBeenCalledOnce()
      }
      else {
        expect(execute).not.toHaveBeenCalled()
        expect(input.life.beforeAction).toHaveBeenCalledOnce()
        expect(input.life.afterAction).not.toHaveBeenCalled()
      }
      expect(prepareTurn).toHaveBeenCalledTimes(2)
      expect(server.requests).toHaveLength(honorsRequired ? 3 : 2)
      const replanning = JSON.parse(server.requests[1].body)
      expect(replanning.tool_choice).toBe('required')
      expect(replanning.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(['test_action'])
      expect(replanning.messages.some((message: Message) => message.role === 'tool' && String(message.content).includes('noSideEffects'))).toBe(true)
      expect(input.emitChunk).not.toHaveBeenCalledWith(expect.objectContaining({ text: '我已经完成了。' }))
      if (honorsRequired) {
        expect(JSON.parse(server.requests[2].body).tool_choice).not.toBe('required')
        expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: '已核对实际结果。' }))
        expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
      }
      else {
        expect(input.emitChunk).not.toHaveBeenCalledWith(expect.objectContaining({ text: '已核对实际结果。' }))
        expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
      }
    }
    finally { await server.close() }
  })

  it.each(['read', 'mutation', 'unknown', 'second-invalid'] as const)('corrects missing method identity after %s through actual HTTP without repeating an admitted action', async (prior) => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const read = prior === 'read' || prior === 'second-invalid'
    const firstName = read ? 'life_list_learned_procedures' : 'test_action'
    const first = vi.fn(async () => ({ status: 'completed', methods: [{ id: 'skill.owned', version: 'a'.repeat(64) }] }))
    const use = vi.fn(async () => ({ status: 'accepted', verified: false }))
    const valid = { id: 'skill.owned', version: 'a'.repeat(64), goal: 'Use the exact owned method', arguments: [{ name: 'input1', value: 'Fresh owned argument' }] }
    const server = await startProviderHttpFaultServer({ respond: ({ attempt }) => {
      const name = attempt === 1 ? firstName : 'life_use_learned_procedure'
      const arguments_ = attempt === 1 ? {} : attempt === 2 || prior === 'second-invalid' ? { goal: valid.goal, arguments: valid.arguments } : valid
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse(attempt < 4
        ? [{ choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `proposal-${attempt}`, type: 'function', function: { name, arguments: JSON.stringify(arguments_) } }] }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]
        : [{ choices: [{ index: 0, delta: { content: buildProviderReply('工作已受理，结果仍需核对。') }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] }]) }
    } })
    const registry = createCanonicalToolRegistry()
    const spec = (name: string) => registry.resolveActive(`tool.${name}`)!.inputSchema
    const userRequest = `先读取方法目录，然后使用 id=skill.owned、version=${valid.version} 的方法，参数 Fresh owned argument，目标 Use the exact owned method。`
    const prepared = createPrepared({ messages: [{ role: 'user', content: userRequest }], chatConfig: { apiKey: 'test-key', baseURL: server.baseUrl, model: 'gpt-test' }, tools: [
      { type: 'function', function: { name: firstName, description: 'Read the current method catalogue', parameters: read ? spec(firstName) : { type: 'object', properties: {}, additionalProperties: false } }, execute: first },
      { type: 'function', function: { name: 'life_use_learned_procedure', description: 'Use a governed exact method', parameters: spec('life_use_learned_procedure') }, execute: use },
    ] })
    if (prior === 'unknown') {
      const manifest = prepared.toolRegistry.resolveActive('test.test_action')!
      prepared.toolRegistry.replace({ ...manifest, effects: { version: 'life-capability-effects-v1', sideEffect: 'unknown', retryClass: 'manual-only', verifier: 'independent-goal-proof', compensation: 'manual-review' } })
    }
    const input = createInput(userRequest, { prepareTurn: vi.fn(async () => prepared), turnLoop: { conversationId: 'conversation-1', persistence: createInMemoryPersistence(), userId: 'host' } })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actual.runAlicizationMainChatProviderStep(options))
    try {
      await runAlicizationMainChatBackground(input)
      expect(first).toHaveBeenCalledOnce()
      expect(use).toHaveBeenCalledTimes(prior === 'read' ? 1 : 0)
      expect(server.requests).toHaveLength(prior === 'read' ? 4 : prior === 'second-invalid' ? 3 : 2)
      expect(input.life.beforeAction).toHaveBeenCalledTimes(prior === 'read' ? 2 : 1)
      if (read) {
        const repairing = JSON.parse(server.requests[2].body)
        expect(repairing.tool_choice).toBe('required')
        expect(repairing.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(['life_use_learned_procedure'])
        expect(repairing.messages.filter((message: Message) => message.role === 'tool')).toHaveLength(1)
        expect(repairing.messages.filter((message: Message) => message.role === 'user').map((message: Message) => message.content)).toEqual([userRequest])
        expect(repairing.messages.some((message: Message) => String(message.content).includes('rejected-before-dispatch'))).toBe(true)
      }
      expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledTimes(prior === 'read' ? 0 : 1)
    }
    finally { await server.close() }
  })

  it('shares one schema-correction budget across consecutive real read-only HTTP operations', async () => {
    const actual = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const list = vi.fn(async () => ({ methods: [] }))
    const verifiers = vi.fn(async () => ({ verifiers: [] }))
    const use = vi.fn()
    const registry = createCanonicalToolRegistry()
    const tools = Object.entries({ life_list_learned_procedures: list, life_list_execution_verifiers: verifiers, life_use_learned_procedure: use }).map(([name, execute]) => ({ type: 'function', function: { name, description: 'Current governed operation', parameters: registry.resolveActive(`tool.${name}`)!.inputSchema }, execute }))
    const server = await startProviderHttpFaultServer({ respond: ({ attempt }) => {
      const name = attempt === 1 ? 'life_list_learned_procedures' : attempt < 4 ? 'life_list_execution_verifiers' : 'life_use_learned_procedure'
      const args = attempt === 2 ? { unexpected: true } : {}
      return { status: 200, headers: { 'Content-Type': 'text/event-stream' }, body: encodeOpenAICompatibleSse([{ choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [{ index: 0, id: `read-budget-${attempt}`, type: 'function', function: { name, arguments: JSON.stringify(args) } }] }, finish_reason: null }] }, { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }]) }
    } })
    try {
      const prepared = createPrepared({ chatConfig: { apiKey: 'test-key', baseURL: server.baseUrl, model: 'gpt-test' }, tools })
      const input = createInput('读取现有方法和验证方式后再处理任务。', { prepareTurn: vi.fn(async () => prepared), turnLoop: { conversationId: 'conversation-1', persistence: createInMemoryPersistence(), userId: 'host' } })
      vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(options => actual.runAlicizationMainChatProviderStep(options))
      await runAlicizationMainChatBackground(input)
      expect(list).toHaveBeenCalledOnce()
      expect(verifiers).toHaveBeenCalledOnce()
      expect(use).not.toHaveBeenCalled()
      expect(server.requests).toHaveLength(4)
      expect(input.life.beforeAction).toHaveBeenCalledTimes(2)
      const repairs = vi.mocked(input.appendRuntimeDebugLine).mock.calls.filter(([event]) => event === 'life.tool-arguments-repair')
      expect(repairs).toHaveLength(1)
      expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    }
    finally { await server.close() }
  })

  it('repairs an unbound promise once before publishing any text and disables tools during repair', async () => {
    const input = createInput('晚点提醒我')
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: '我会在晚上提醒你。', text: '我会在晚上提醒你。' } as any).mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: '还没有设定提醒，想安排在几点？', text: '还没有设定提醒，想安排在几点？' } as any)
    input.reviewLifeReply = vi.fn().mockResolvedValueOnce({ accepted: false, issues: [{ code: 'UNBOUND_OBLIGATION', quote: '我会在晚上提醒你。' }] }).mockResolvedValueOnce({ accepted: true, issues: [] })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    expect(vi.mocked(runAlicizationMainChatProviderStep).mock.calls[1][0].prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
    expect(input.emitChunk).toHaveBeenCalledTimes(2)
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: '还没有设定提醒，想安排在几点？' }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('blocks publication and memory admission after the bounded repair also fails grounding', async () => {
    const input = createInput('完成了吗')
    input.reviewLifeReply = vi.fn(async () => ({ accepted: false, issues: [{ code: 'UNPROVEN_COMPLETION' as const, quote: 'Provider reply' }] }))
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    expect(input.emitChunk).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalled()
    expect(input.runStateController.finishRun).not.toHaveBeenCalledWith(input.key, expect.objectContaining({ finishReason: 'stop' }))
  })

  it.each([true, false])('keeps a receipt-guided correction under the original second review: accepted=%s', async (accepted) => {
    const input = createInput('按约定的本地步骤处理报告')
    const rejectedText = '第二步的来源文件缺失。'
    const receiptWording = '工作计划已受理。'
    const repairContext = buildAlicizationProviderFactBlock('alicization-reply-repair-evidence', { scope: 'current-admission-repair-only', receiptWording })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: rejectedText, text: rejectedText } as any)
      .mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: receiptWording, text: receiptWording } as any)
    input.reviewLifeReply = vi.fn()
      .mockResolvedValueOnce({ accepted: false, repairContext, repairMode: 'current-admission', issues: [{ code: 'UNPROVEN_COMPLETION', quote: rejectedText }] })
      .mockResolvedValueOnce({ accepted, issues: accepted ? [] : [{ code: 'UNPROVEN_COMPLETION', quote: receiptWording }] })
    await runAlicizationMainChatBackground(input)
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(2)
    expect(input.reviewLifeReply).toHaveBeenCalledTimes(2)
    const repair = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[1][0]
    expect(repair.messages).toContainEqual({ role: 'system', content: repairContext })
    expect(repair.messages).not.toContainEqual({ role: 'assistant', content: rejectedText })
    expect(repair.messages.some(message => message.role === 'system' && String(message.content).includes('use that wording verbatim'))).toBe(true)
    expect(repair.prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
    if (accepted) {
      expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: receiptWording }))
      expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    }
    else {
      expect(input.emitChunk).not.toHaveBeenCalled()
      expect(handleAlicizationMainChatRunFailure).toHaveBeenCalled()
    }
  })

  it('gives a chronological repair its actual event evidence while keeping tools disabled and publishing only the admitted revision', async () => {
    const input = createInput('刚才哪件事影响了你')
    const repairContext = '<alicization-reply-repair-evidence>{"conversationTimeline":[{"index":0,"text":"先前允许独立选择"},{"index":1,"text":"后来回来问近况"}]}</alicization-reply-repair-evidence>'
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: '你先问近况，后来允许我独立选择。', text: '你先问近况，后来允许我独立选择。' } as any).mockResolvedValueOnce({ kind: 'reply', finishReason: 'stop', fullText: '你先允许我独立选择，后来回来问近况。', text: '你先允许我独立选择，后来回来问近况。' } as any)
    input.reviewLifeReply = vi.fn().mockResolvedValueOnce({ accepted: false, repairContext, issues: [{ code: 'UNRELIABLE_REVIEW', quote: '你先问近况，后来允许我独立选择。' }] }).mockResolvedValueOnce({ accepted: true, issues: [] })
    await runAlicizationMainChatBackground(input)
    const repair = vi.mocked(runAlicizationMainChatProviderStep).mock.calls[1][0]
    expect(repair.messages).toContainEqual({ role: 'system', content: repairContext })
    expect(repair.messages).not.toContainEqual({ role: 'assistant', content: '你先问近况，后来允许我独立选择。' })
    const rejected = repair.messages.find(message => message.role === 'system' && typeof message.content === 'string' && message.content.includes('alicization-unpublished-reply'))!
    const unpublished = JSON.parse(String(rejected.content)).data
    expect(unpublished).toMatchObject({ status: 'rejected-unpublished-candidate' })
    expect(unpublished).not.toHaveProperty('draft')
    const firstConversation = repair.messages.findIndex(message => message.role !== 'system')
    expect(repair.messages.slice(firstConversation).every(message => message.role !== 'system')).toBe(true)
    expect(repair.prepared).toMatchObject({ tools: undefined, toolChoice: 'none', waitForTools: false })
    expect(input.emitChunk).toHaveBeenCalledTimes(2)
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({ text: '你先允许我独立选择，后来回来问近况。' }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it.each([
    ['greeting', '你好'],
    ['identity', '你是谁'],
    ['time', '现在几点了'],
    ['date', '今天几号'],
    ['dialogue', '今天有点累'],
    ['follow-up', '继续'],
  ])('routes %s turns through the EventLoop Provider step', async (_lane, userText) => {
    const input = createInput(userText)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({
      payload: input.payload,
      prepared: expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: userText }),
        ]),
      }),
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'user', content: userText }),
      ]),
    }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        finishReason: 'stop',
        origin: 'provider',
      }),
    )
  })

  it('keeps recalled long-term memory in the EventLoop participant context before Provider dispatch', async () => {
    const memoryContext = JSON.stringify({
      type: 'alicization-turn-memory-context',
      data: {
        version: 'alicization-main-chat-memory-context-v1',
        workingMemory: {
          version: 'working-memory-owner-context-v1',
          owner: 'working-memory',
          recentDialogue: [],
          compressedTimeline: [],
          rememberedItems: [],
          unresolvedQuestions: [],
          commitments: [],
          corrections: [],
        },
        longTermRecall: {
          owner: 'long-term-memory-recall',
          status: 'recalled',
          confidence: 0.91,
          evidence: [{
            id: 'memory-background-recalled',
            kind: 'fact',
            summary: '用户喜欢在晚上继续讨论长期记忆。',
            source: 'memory_facts',
            scope: {
              userId: 'local-user-stable',
              cardId: 'card-1',
            },
            provenance: 'remembered',
            confidence: 0.88,
            salience: null,
            updatedAt: null,
            occurredAt: null,
            threadId: null,
            threadAnchor: null,
            cues: [],
            entities: [],
            sensitivity: 'personal',
            retrievalScore: 0.91,
            queryMatches: ['长期记忆'],
            rankReasons: ['semantic match'],
            evidenceVersion: 'long-term-memory-evidence-v1',
            version: 'long-term-memory-evidence-v1',
          }],
        },
      },
    })
    const input = createInput('继续长期记忆', {
      prepareTurn: vi.fn(async () => createPrepared({
        messages: [
          { role: 'system', content: memoryContext },
          { role: 'user', content: '继续长期记忆' },
        ],
        memoryContext: {
          longTermRecall: {
            status: 'recalled',
            confidence: 0.91,
            evidence: [{
              id: 'memory-background-recalled',
              kind: 'fact',
              summary: '用户喜欢在晚上继续讨论长期记忆。',
              source: 'memory_facts',
              scope: {
                userId: 'local-user-stable',
                cardId: 'card-1',
              },
              provenance: 'remembered',
              confidence: 0.88,
              salience: null,
              updatedAt: null,
              occurredAt: null,
              threadId: null,
              threadAnchor: null,
              cues: [],
              entities: [],
              sensitivity: 'personal',
              retrievalScore: 0.91,
              queryMatches: ['长期记忆'],
              rankReasons: ['semantic match'],
              evidenceVersion: 'long-term-memory-evidence-v1',
              version: 'long-term-memory-evidence-v1',
            }],
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-provider-context.assembled',
      expect.objectContaining({
        messageProjectionPreserved: true,
        preparedLongTermRecall: expect.objectContaining({
          status: 'recalled',
          evidenceIds: ['memory-background-recalled'],
          evidenceCount: 1,
        }),
        participantLongTermRecall: expect.objectContaining({
          status: 'recalled',
          evidenceIds: ['memory-background-recalled'],
          evidenceCount: 1,
        }),
      }),
    )
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: memoryContext,
          }),
        ]),
      }),
    )
  })

  it('passes the active provider retry policy to the EventLoop Provider step', async () => {
    const providerRetryPolicy = {
      baseDelayMs: 17,
      maxDelayMs: 53,
      maxRetries: 2,
      maxTotalRetryWindowMs: 1_337,
    }
    const input = createInput('测试 provider retry policy', {
      providerRetryPolicy,
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({
      providerRetryPolicy,
    }))
  })

  it('routes the production turn through one EventLoop persistence owner', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const input = createInput('直接回答我', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toEqual(expect.arrayContaining([
      'turn.accepted',
      'context.assembly.completed',
      'model.text.delta',
      'assistant.reply.committed',
      'turn.completed',
    ]))
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        turnId: 'turn-1',
        cardId: 'card-1',
        userId: 'local-user-stable',
        conversationId: 'conversation-1',
      }),
    ]))
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: 'Provider reply',
    }))
  })

  it('refuses to run when the EventLoop owner is missing', async () => {
    const input = createInput('直接回答我', {
      turnLoop: undefined as any,
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('EventLoop'),
      }),
    }))
  })

  it('starts preparation only after the EventLoop owns context assembly', async () => {
    const eventTypes: string[] = []
    const prepareTurn = vi.fn(async () => {
      expect(eventTypes).toContain('context.assembly.started')
      return createPrepared()
    })
    const input = createInput('直接回答我', {
      prepareTurn,
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            eventTypes.push(event.eventType)
            return {
              ...event,
              sequence: eventTypes.length,
            }
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(prepareTurn).toHaveBeenCalledOnce()
    expect(eventTypes.indexOf('context.assembly.started')).toBeLessThan(
      eventTypes.indexOf('context.assembly.completed'),
    )
    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
  })

  it('registers EventLoop cancellation while the turn is active and removes its own entry after completion', async () => {
    let releaseProvider!: () => void
    const providerPending = new Promise<void>((resolve) => {
      releaseProvider = resolve
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      await providerPending
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })

    releaseProvider()
    await running

    expect(input.runState.cancelTurn).toBeUndefined()
  })

  it('does not clear a newer cancellation owner when the EventLoop turn finishes', async () => {
    let releaseProvider!: () => void
    const providerPending = new Promise<void>((resolve) => {
      releaseProvider = resolve
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      await providerPending
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()
    const newerCancelTurn = vi.fn(async () => true)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    input.runState.cancelTurn = newerCancelTurn

    releaseProvider()
    await running

    expect(input.runState.cancelTurn).toBe(newerCancelTurn)
  })

  it('keeps UI and durable state completed when abort races reply commit persistence', async () => {
    let releaseReplyCommit!: () => void
    let notifyReplyCommitStarted!: () => void
    const replyCommitStarted = new Promise<void>((resolve) => {
      notifyReplyCommitStarted = resolve
    })
    const replyCommitPending = new Promise<void>((resolve) => {
      releaseReplyCommit = resolve
    })
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'assistant.reply.committed') {
          notifyReplyCommitStarted()
          await replyCommitPending
        }
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const input = createInput('记住这轮', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await replyCommitStarted
    expect(input.emitChunk).toHaveBeenCalledTimes(2)

    const abortResult = await abortAlicizationDirectChatRun({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: reason => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    })

    expect(abortResult).toEqual({
      accepted: false,
      state: 'finished',
    })
    expect(input.runState.state).toBe('running')
    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(input.runStateController.finishRun).not.toHaveBeenCalled()

    releaseReplyCommit()
    await running

    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
        origin: 'provider',
      }),
    )
    expect(events.map(event => event.eventType)).toContain('turn.completed')
    expect(events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('does not route an EventLoop-owned cancellation through the failure lifecycle', async () => {
    const events: any[] = []
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    const abortResult = await abortAlicizationDirectChatRun({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: reason => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    })
    await running

    expect(abortResult).toEqual({
      accepted: true,
      state: 'aborted',
    })
    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'aborted',
      finishReason: 'manual',
    })
    expect(events.map(event => event.eventType)).toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).not.toContain('turn.failed')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('keeps the accepted EventLoop cancellation authoritative across concurrent abort requests', async () => {
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮')
    const abortInput = {
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
        reason: 'manual',
      },
      getRun: () => input.runState,
      mainChatRunState: {
        createKey: () => input.key,
        hasRecentlyFinished: () => false,
        finishRun: input.runStateController.finishRun,
      },
      createAbortError: (reason: string) => new DOMException(reason, 'AbortError'),
      appendRuntimeDebugLine: input.appendRuntimeDebugLine,
    }

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    const firstAbort = abortAlicizationDirectChatRun(abortInput)
    const secondAbort = abortAlicizationDirectChatRun(abortInput)
    const [firstResult, secondResult] = await Promise.all([firstAbort, secondAbort])
    await running

    expect([firstResult, secondResult]).toEqual(expect.arrayContaining([
      {
        accepted: true,
        state: 'aborted',
      },
      {
        accepted: false,
        state: 'finished',
      },
    ]))
    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('persists preparation failures as context failures before the Provider starts', async () => {
    const events: any[] = []
    const preparationFailure = new Error('working memory checkpoint failed')
    const input = createInput('继续刚才的任务', {
      prepareTurn: vi.fn(async () => {
        throw preparationFailure
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toEqual([
      'turn.accepted',
      'context.assembly.started',
      'turn.failed',
    ])
    expect(events.at(-1)?.payload).toEqual(expect.objectContaining({
      error: 'working memory checkpoint failed',
      surface: 'context',
    }))
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: preparationFailure,
    }))
  })

  it('preserves the original Provider failure across the EventLoop boundary', async () => {
    const providerFailure = new DOMException(
      'Alicization runtime aborted: chat-first-event-timeout',
      'AbortError',
    )
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    const events: any[] = []
    const input = createInput('你好', {
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0].error)
      .toBe(providerFailure)
  })

  it('finishes exactly once and resolves when the failure handler throws before finishing', async () => {
    const providerFailure = new Error('provider failed before failure settlement')
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    vi.mocked(handleAlicizationMainChatRunFailure).mockRejectedValueOnce(
      new Error('failure handler crashed before finish'),
    )
    const input = createInput()

    await expect(runAlicizationMainChatBackground(input)).resolves.toBeUndefined()

    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'failed',
        finishReason: 'failure-lifecycle-error',
        error: providerFailure.message,
      }),
    )
  })

  it('does not double-finish when the failure handler throws after finishing', async () => {
    const providerFailure = new Error('provider failed after failure settlement')
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    vi.mocked(handleAlicizationMainChatRunFailure).mockImplementationOnce(async (failureInput) => {
      failureInput.finish({
        status: 'failed',
        finishReason: 'provider-failure',
        error: 'provider failure was already surfaced',
      })
      throw new Error('failure handler crashed after finish')
    })
    const input = createInput()

    await expect(runAlicizationMainChatBackground(input)).resolves.toBeUndefined()

    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'failed',
        finishReason: 'provider-failure',
      }),
    )
  })

  it('does not write memory or persona data after six real HTTP Provider failures', async () => {
    const actualRunner = await vi.importActual<typeof import('./main-chat-stream-runner')>(
      './main-chat-stream-runner',
    )
    const server = await startProviderHttpFaultServer({
      respond: ({ attempt }) => ({
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            message: `provider unavailable on attempt ${attempt}`,
            type: 'server_error',
          },
        }),
      }),
    })
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => {})
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(
      input => actualRunner.runAlicizationMainChatProviderStep(input),
    )
    const input = createInput('请记住这轮', {
      prepareTurn: vi.fn(async () => createPrepared({
        chatConfig: {
          apiKey: 'test-key',
          baseURL: server.baseUrl,
          model: 'gpt-test',
        },
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      providerRetryPolicy: {
        baseDelayMs: 0,
        maxDelayMs: 0,
        maxRetries: 5,
        maxTotalRetryWindowMs: 5_000,
        random: () => 0,
      },
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })

    try {
      await runAlicizationMainChatBackground(input)

      expect(server.requests).toHaveLength(6)
      expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
      expect(input.runStateController.finishRun).not.toHaveBeenCalledWith(
        input.key,
        expect.objectContaining({
          status: 'completed',
          learningPolicy: expect.objectContaining({
            allowPersonaLearning: true,
          }),
        }),
      )
      expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
      expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
      expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
    }
    finally {
      await server.close()
    }
  })

  it('rejects memory writeback without committing it when the Provider fails', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => {})
    const providerFailure = new Error('provider unavailable')
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(providerFailure)
    const input = createInput('记住这轮', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('commits memory writeback when a tool failure still leads to a completed Provider reply', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [],
      compression: {
        level: 'none',
        sourceTurnIds: [],
        lastCompressedAt: null,
      },
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const prepared = createPrepared({
      commitMemoryWriteIntent,
      memoryWriteItems: [createMemoryWriteItem()],
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => {
          throw new Error('coding agent failed')
        }),
      }],
    })
    const input = createInput('检查项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:tool-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'tool-failure-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '工具失败后仍完成回复。',
        text: '工具失败后仍完成回复。',
      } as any)

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).toHaveBeenCalledOnce()
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '工具失败后仍完成回复。',
      deferPostCommit: true,
    })
    expect(events.map(event => event.eventType)).toContain('action.failed')
    expect(events.map(event => event.eventType)).toContain('memory.write.accepted')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.rejected')
  })

  it('rejects memory writeback without committing it when the turn is cancelled', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => {})
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(
      async () => await new Promise<never>(() => {}),
    )
    const input = createInput('停止这轮', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(input.runState.cancelTurn).toBeTypeOf('function')
      expect(runAlicizationMainChatProviderStep).toHaveBeenCalledOnce()
    })
    await input.runState.cancelTurn?.('user-cancelled')
    await running

    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('rejects memory writeback without committing it when the model step budget is exhausted', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => {})
    const prepared = createPrepared({
      commitMemoryWriteIntent,
      memoryWriteItems: [createMemoryWriteItem()],
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
        })),
      }],
    })
    const input = createInput('持续检查直到预算耗尽', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementation(
      async (_options: any) => {
        const index = vi.mocked(runAlicizationMainChatProviderStep).mock.calls.length
        return {
          kind: 'action',
          action: {
            actionId: `turn-1:action:budget-${index}`,
            input: {
              agent: 'codex',
              prompt: `inspect pass ${index}`,
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: `budget-call-${index}`,
          },
        } as any
      },
    )

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledTimes(agentHarnessMaxModelSteps)
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).toContain('runtime.timed_out')
    expect(events.map(event => event.eventType)).toContain('memory.write.rejected')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('commits the settled Provider reply before publishing WorkingMemory events', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [{
        id: 'episodelet-1',
        sourceTurnIds: ['turn-old:user'],
        summary: '旧对话已经压缩。',
      }],
      compression: {
        level: 'light',
        sourceTurnIds: ['turn-old:user'],
        lastCompressedAt: 100,
      },
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const input = createInput('记住成功回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '最终 Provider 回复',
      text: '最终 Provider 回复',
    })

    await runAlicizationMainChatBackground(input)

    expect(commitMemoryWriteIntent).toHaveBeenCalledOnce()
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
      deferPostCommit: true,
    })
    const eventTypes = events.map(event => event.eventType)
    expect(eventTypes.indexOf('turn.completed')).toBeLessThan(
      eventTypes.indexOf('memory.write.proposed'),
    )
    expect(eventTypes.indexOf('memory.write.accepted')).toBeLessThan(
      eventTypes.indexOf('working_memory.compression.completed'),
    )
    expect(eventTypes.indexOf('working_memory.compression.completed')).toBeLessThan(
      eventTypes.indexOf('working_memory.snapshot.created'),
    )
  })

  it('finishes the visible turn without waiting for deferred memory post-commit owners', async () => {
    let releasePostCommit = () => {}
    const postCommit = new Promise<any[]>((resolve) => {
      releasePostCommit = () => resolve([{
        owner: 'long-term-memory-drain',
        status: 'succeeded',
      }])
    })
    const trackedDeferredTasks: Promise<void>[] = []
    const trackDeferredTask = vi.fn((task: Promise<void>) => {
      trackedDeferredTasks.push(task)
    })
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
      ownerSettlements: [{
        owner: 'working-memory-checkpoint',
        status: 'succeeded',
      }, {
        owner: 'long-term-memory-queue',
        status: 'succeeded',
      }],
    }))
    const waitForDeferredMemoryPostCommit = vi.fn(() => postCommit)
    const persistence = createInMemoryPersistence()
    const input = createInput('记住成功回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        waitForDeferredMemoryPostCommit,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
      trackDeferredTask,
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '最终 Provider 回复',
      text: '最终 Provider 回复',
    })

    const run = runAlicizationMainChatBackground(input)
    const outcome = await Promise.race([
      run.then(() => 'finished' as const),
      new Promise<'still-waiting'>(resolve =>
        setTimeout(() => resolve('still-waiting'), 25)),
    ])

    expect(outcome).toBe('finished')
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
      deferPostCommit: true,
    })
    expect(waitForDeferredMemoryPostCommit).toHaveBeenCalledOnce()
    expect(trackDeferredTask).toHaveBeenCalledOnce()
    expect(trackedDeferredTasks).toHaveLength(1)
    expect(input.runStateController.finishRun).toHaveBeenCalledOnce()

    releasePostCommit()
    await trackedDeferredTasks[0]
    await vi.waitFor(() => {
      expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          eventType: 'memory.owner.settled',
          payload: expect.objectContaining({
            owner: 'long-term-memory-drain',
            status: 'succeeded',
          }),
        }),
      )
    })
  })

  it('publishes memory write events from the final settled candidates instead of prepare-time candidates', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const preparedItem = createMemoryWriteItem()
    const settledItem = {
      ...createMemoryWriteItem(),
      id: 'queue-final',
      sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      summary: '这条候选由最终成功回复凝练。',
    }
    const settledSnapshot = {
      version: 'working-memory-v1',
      updatedAt: 100,
      compressedTimeline: [],
      compression: {
        level: 'none',
        sourceTurnIds: [],
        lastCompressedAt: null,
      },
    }
    const resolvedIntent = {
      version: 'memory-write-intent-v1',
      workingMemorySnapshot: settledSnapshot,
      memoryWriteItems: [settledItem],
    }
    const resolveMemoryWriteIntent = vi.fn(() => resolvedIntent)
    const commitMemoryWriteIntent = vi.fn(async () => ({
      ...resolvedIntent,
      ownerSettlements: [{
        owner: 'working-memory-checkpoint',
        status: 'succeeded',
      }],
    }))
    const input = createInput('记住最终回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        resolveMemoryWriteIntent,
        commitMemoryWriteIntent,
        memoryWriteItems: [preparedItem],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: '最终 Provider 回复',
      text: '最终 Provider 回复',
    })

    await runAlicizationMainChatBackground(input)

    expect(resolveMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
    })
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '最终 Provider 回复',
      intent: resolvedIntent,
      deferPostCommit: true,
    })
    expect(events.find(event => event.eventType === 'memory.write.proposed')?.payload)
      .toMatchObject({
        itemCount: 1,
        sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      })
    expect(events.find(event => event.eventType === 'memory.write.accepted')?.payload)
      .toMatchObject({
        itemCount: 1,
        sourceTurnIds: ['turn-1:user', 'turn-1:alice'],
      })
    expect(JSON.stringify(events.filter(event =>
      event.eventType === 'memory.write.proposed'
      || event.eventType === 'memory.write.accepted',
    ))).not.toContain('用户希望失败时不要污染长期记忆。')
  })

  it('passes Provider memory evidence through the durable reply into WorkingMemory settlement', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const memoryEvidence = {
      version: 'provider-memory-evidence-v1',
      kind: 'preference',
      summary: '用户更喜欢先说结论。',
      reason: '用户明确提出了稳定的表达偏好。',
      evidenceSnippets: ['请记住我更喜欢先说结论。'],
      salience: 0.86,
      sensitivity: 'personal',
      confidence: 0.92,
    } as const
    const resolvedIntent = {
      version: 'memory-write-intent-v1' as const,
      workingMemorySnapshot: {
        version: 'working-memory-v1' as const,
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none' as const,
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
    }
    const resolveMemoryWriteIntent = vi.fn(() => resolvedIntent)
    const commitMemoryWriteIntent = vi.fn(async () => ({
      ...resolvedIntent,
      ownerSettlements: [],
    }))
    const input = createInput('请记住我的表达偏好', {
      prepareTurn: vi.fn(async () => createPrepared({
        resolveMemoryWriteIntent,
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'answer',
        emotion: 'neutral',
        reply: '我会记住你更喜欢先说结论。',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        memoryUsage: {
          workingMemoryVersion: null,
          longTermEvidenceIds: [],
        },
        memoryEvidence,
      }),
      text: '我会记住你更喜欢先说结论。',
    })

    await runAlicizationMainChatBackground(input)

    expect(resolveMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '我会记住你更喜欢先说结论。',
      memoryEvidence,
    })
    expect(commitMemoryWriteIntent).toHaveBeenCalledWith({
      assistantText: '我会记住你更喜欢先说结论。',
      intent: resolvedIntent,
      deferPostCommit: true,
    })
    expect(events.map(event => event.eventType)).toContain('memory.write.proposed')
  })

  it('does not complete or commit memory when the visible reply is no longer deliverable', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    let active = true
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
    }))
    const input = createInput('这轮已经失效', {
      isRunActive: () => active,
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      active = false
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: '这条回复不应投递。',
        text: '这条回复不应投递。',
      }
    })

    await runAlicizationMainChatBackground(input)

    expect(input.emitChunk).not.toHaveBeenCalled()
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(events.map(event => event.eventType)).not.toContain('assistant.reply.committed')
    expect(events.map(event => event.eventType)).not.toContain('turn.completed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
  })

  it('settles presented execution callbacks after an EventLoop Provider reply', async () => {
    const settlePresentedExecutionCallbacks = vi.fn(async () => {})
    const callback = {
      threadId: 'thread-callback-1',
      summary: 'callback result',
    }
    const events: any[] = []
    const input = createInput('刚才的结果呢', {
      prepareTurn: vi.fn(async () => createPrepared({
        messages: [{ role: 'user', content: '刚才的结果呢' }],
        presentedExecutionCallbacks: [callback],
      })),
      settlePresentedExecutionCallbacks,
      turnLoop: {
        conversationId: 'conversation-1',
        persistence: {
          appendRuntimeEvent: vi.fn(async (_scope, event) => {
            const persisted = {
              ...event,
              sequence: events.length + 1,
            }
            events.push(persisted)
            return persisted
          }),
          saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
        },
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(settlePresentedExecutionCallbacks).toHaveBeenCalledWith({
      cardId: input.payload.cardId,
      callbacks: [callback],
    })
  })

  it('passes the prepared tool surface to the EventLoop Provider step', async () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        action: {
          kind: 'answer',
        },
        tooling: {
          toolsOffered: true,
        },
      },
      tools: [{
        type: 'function',
        function: {
          name: 'executor_run_cli',
          description: 'Run a CLI command.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      }],
    })
    const input = createInput('执行测试命令', {
      prepareTurn: vi.fn(async () => prepared),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatProviderStep).toHaveBeenCalledWith(expect.objectContaining({
      prepared: expect.objectContaining({
        tools: prepared.tools,
      }),
      messages: expect.arrayContaining(prepared.messages),
    }))
    expect(input.emitToolCall).not.toHaveBeenCalled()
    expect(input.emitToolResult).not.toHaveBeenCalled()
  })

  it('persists canonical action identity while executing and rendering the Provider alias', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:canonical-tool-call',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'canonical-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'coding_agent',
    }))
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.started',
        payload: expect.objectContaining({
          capabilityId: 'coding_agent.codex',
        }),
      }),
    )
  })

  it('projects Provider tool calls only after model.tool_call.proposed is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: order.filter(item => item.startsWith('append:')).length,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const execute = vi.fn(async () => ({
      status: 'completed',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolCall: vi.fn(() => {
        order.push('emit:tool-call')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async (options: any) => {
        options.emitToolCall({
          cardId: 'card-1',
          turnId: 'turn-1',
          toolCallId: 'durable-tool-call',
          toolName: 'coding_agent',
          arguments: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
        })
        return {
          kind: 'action',
          action: {
            actionId: 'turn-1:action:durable-tool-call',
            input: {
              agent: 'codex',
              prompt: 'inspect the repository',
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: 'durable-tool-call',
          },
        } as any
      })
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolCall).toHaveBeenCalledOnce()
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'durable-tool-call',
      toolName: 'coding_agent',
      arguments: {
        agent: 'codex',
        prompt: 'inspect the repository',
      },
    }))
    expect(order.indexOf('append:model.tool_call.proposed')).toBeLessThan(
      order.indexOf('checkpoint:model.tool_call.proposed'),
    )
    expect(order.indexOf('checkpoint:model.tool_call.proposed')).toBeLessThan(
      order.indexOf('emit:tool-call'),
    )
  })

  it.each([
    'append',
    'checkpoint',
  ] as const)('does not emit a tool result when observation %s fails', async (failureStage) => {
    const events: any[] = []
    let lastAppendedEventType = ''
    const persistenceError = new Error(`observation ${failureStage} failed`)
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        if (
          failureStage === 'append'
          && event.eventType === 'action.observation'
        ) {
          throw persistenceError
        }
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        if (
          failureStage === 'checkpoint'
          && lastAppendedEventType === 'action.observation'
        ) {
          throw persistenceError
        }
        return checkpoint
      }),
    }
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
        })),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'action',
      action: {
        actionId: `turn-1:action:observation-${failureStage}-failure`,
        input: {
          agent: 'codex',
          prompt: 'inspect the repository',
        },
        providerToolName: 'coding_agent',
        capabilityId: 'coding_agent.codex',
        toolCallId: `observation-${failureStage}-failure`,
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolResult).not.toHaveBeenCalled()
  })

  it('emits a tool result only after action.observation is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    let sequence = 0
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: ++sequence,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
          summary: 'repository inspected',
        })),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolResult: vi.fn(() => {
        order.push('emit:tool-result')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:durable-observation',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'durable-observation',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(input.emitToolResult).toHaveBeenCalledOnce()
    expect(order.indexOf('append:action.observation')).toBeLessThan(
      order.indexOf('checkpoint:action.observation'),
    )
    expect(order.indexOf('checkpoint:action.observation')).toBeLessThan(
      order.indexOf('emit:tool-result'),
    )
  })

  it('canonicalizes optional undefined tool fields before persisting the observation', async () => {
    const persistence = createInMemoryPersistence()
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => ({
          status: 'completed',
          focusTarget: {
            appName: 'Codex',
            title: undefined,
          },
        })),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:json-safe-observation',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'json-safe-observation',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    const persistedEvents = vi.mocked(persistence.appendRuntimeEvent).mock.calls.map(([, event]) => event)
    const observation = persistedEvents.find(event => event.eventType === 'action.observation')
    const output = (observation?.payload as any)?.output
    expect(output?.focusTarget).toEqual({
      appName: 'Codex',
    })
    expect(Object.prototype.hasOwnProperty.call(output?.focusTarget ?? {}, 'title')).toBe(false)
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
  })

  it('keeps a successful tool observation when tool-result delivery fails', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const deliveryError = new Error('renderer tool-result delivery failed')
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolResult: vi.fn(() => {
        throw deliveryError
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:delivery-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'delivery-failure-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.observation',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:delivery-failure',
          outcome: 'success',
          output: {
            status: 'completed',
            summary: 'repository inspected',
          },
        }),
      }),
    )
    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.completed',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:delivery-failure',
        }),
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'action.failed',
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'tool.failed',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.delivery',
        action: 'tool-result-delivery-failed',
        payload: expect.objectContaining({
          toolCallId: 'delivery-failure-tool-call',
          reason: deliveryError.message,
        }),
      }),
    )
  })

  it('returns a thrown tool failure to the Provider as a structured tool observation', async () => {
    const persistence = createInMemoryPersistence()
    const providerMessages: Message[][] = []
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute: vi.fn(async () => {
          throw Object.assign(new Error('Codex produced no semantic progress'), {
            name: 'AlicizationToolExecutionError',
            failureKind: 'tool-execution',
            toolName: 'codex',
            errorCode: 'CODEX_TIMEOUT',
          })
        }),
      }],
    })
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementation(async (options: any) => {
        providerMessages.push(options.messages)
        if (providerMessages.length === 1) {
          return {
            kind: 'action',
            action: {
              actionId: 'turn-1:action:tool-failure-continuation',
              input: { agent: 'codex', prompt: 'inspect the repository' },
              providerToolName: 'coding_agent',
              capabilityId: 'coding_agent.codex',
              toolCallId: 'tool-failure-continuation',
            },
          } as any
        }
        return {
          kind: 'reply',
          finishReason: 'stop',
          fullText: buildProviderReply('我知道 Codex 超时了。'),
          text: buildProviderReply('我知道 Codex 超时了。'),
        } as any
      })

    await runAlicizationMainChatBackground(input)

    expect(providerMessages).toHaveLength(2)
    const toolMessage = providerMessages[1]?.find(message => message.role === 'tool')
    expect(toolMessage).toMatchObject({
      role: 'tool',
      tool_call_id: 'tool-failure-continuation',
    })
    expect(JSON.parse(String(toolMessage?.content))).toMatchObject({
      status: 'timeout',
      errorCode: 'CODEX_TIMEOUT',
      continuationPolicy: 'continue',
    })
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
      }),
    )
  })

  it('keeps the Provider action loop alive when tool-call delivery fails', async () => {
    const persistence = createInMemoryPersistence()
    const execute = vi.fn(async () => ({
      status: 'completed',
      summary: 'repository inspected',
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const deliveryError = new Error('renderer tool-call delivery failed')
    const input = createInput('检查当前项目', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolCall: vi.fn(() => {
        throw deliveryError
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockImplementationOnce(async (options: any) => {
        options.emitToolCall({
          cardId: 'card-1',
          turnId: 'turn-1',
          toolCallId: 'delivery-failure-tool-call',
          toolName: 'coding_agent',
        })
        return {
          kind: 'action',
          action: {
            actionId: 'turn-1:action:tool-call-delivery-failure',
            input: {
              agent: 'codex',
              prompt: 'inspect the repository',
            },
            providerToolName: 'coding_agent',
            capabilityId: 'coding_agent.codex',
            toolCallId: 'delivery-failure-tool-call',
          },
        } as any
      })
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(persistence.appendRuntimeEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'provider.failed',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.delivery',
        action: 'tool-call-delivery-failed',
        payload: expect.objectContaining({
          toolCallId: 'delivery-failure-tool-call',
          reason: deliveryError.message,
        }),
      }),
    )
  })

  it('persists online tool progress under the active Turn OS action scope', async () => {
    const persistence = createInMemoryPersistence()
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'canonical-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          timeoutMs: 180_000,
          occurredAt: 1_320,
          eventId: 'codex-progress-1',
          threadId: 'codex-thread-1',
          adapterEventType: 'item.completed',
          itemType: 'command_execution',
          summary: 'Inspected package metadata.',
          command: 'pnpm -v',
          commandStatus: 'completed',
          commandExitCode: 0,
          outputPreview: '10.14.0',
        })
      }
      return {
        status: 'completed',
        summary: 'repository inspected',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:canonical-tool-call',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'canonical-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(persistence.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        userId: 'local-user-stable',
        conversationId: 'conversation-1',
        turnId: 'turn-1',
      }),
      expect.objectContaining({
        eventType: 'action.progress',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:canonical-tool-call',
          toolCallId: 'canonical-tool-call',
          selectedChannel: 'codex',
          eventId: 'codex-progress-1',
          summary: 'Inspected package metadata.',
        }),
      }),
    )
    expect(runState.toolProgressListeners).toHaveLength(0)
  })

  it('projects action progress only after its runtime checkpoint is durable', async () => {
    const order: string[] = []
    let lastAppendedEventType = ''
    let sequence = 0
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        lastAppendedEventType = event.eventType
        order.push(`append:${event.eventType}`)
        return {
          ...event,
          sequence: ++sequence,
        }
      }),
      saveRuntimeCheckpoint: vi.fn(async (checkpoint) => {
        order.push(`checkpoint:${lastAppendedEventType}`)
        return checkpoint
      }),
    }
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'durable-progress-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          occurredAt: 1_320,
          eventId: 'durable-progress-1',
          summary: 'Inspected package metadata.',
        })
      }
      return {
        status: 'completed',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      emitToolProgress: vi.fn(() => {
        order.push('emit:tool-progress')
      }),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:durable-progress',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'durable-progress-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect((input as any).emitToolProgress).toHaveBeenCalledOnce()
    expect(order.indexOf('append:action.progress')).toBeLessThan(
      order.indexOf('checkpoint:action.progress'),
    )
    expect(order.indexOf('checkpoint:action.progress')).toBeLessThan(
      order.indexOf('emit:tool-progress'),
    )
  })

  it('projects a durable cancelled observation as a cancelled tool result', async () => {
    const execute = vi.fn(async (
      _input: unknown,
      options: { abortSignal: AbortSignal },
    ) => await new Promise<never>((_resolve, reject) => {
      options.abortSignal.addEventListener('abort', () => {
        reject(new DOMException('cancelled', 'AbortError'))
      }, { once: true })
    }))
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const emitToolProgress = vi.fn()
    const emitToolResult = vi.fn()
    const input = createInput('停止工具', {
      prepareTurn: vi.fn(async () => prepared),
      emitToolProgress,
      emitToolResult,
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'action',
      action: {
        actionId: 'turn-1:action:cancelled-observation',
        input: {
          agent: 'codex',
          prompt: 'inspect the repository',
        },
        providerToolName: 'coding_agent',
        capabilityId: 'coding_agent.codex',
        toolCallId: 'cancelled-observation-tool-call',
      },
    } as any)

    const running = runAlicizationMainChatBackground(input)
    await vi.waitFor(() => {
      expect(execute).toHaveBeenCalledOnce()
      expect(input.runState.cancelTurn).toBeTypeOf('function')
    })
    await input.runState.cancelTurn?.('user cancelled the tool')
    await running

    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'cancelled-observation-tool-call',
      toolName: 'coding_agent',
      phase: 'cancelled',
    }))
    expect(emitToolProgress).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'cancelled-observation-tool-call',
      toolName: 'coding_agent',
      phase: 'cancelled',
      signal: 'terminal',
      errorMessage: 'user cancelled the tool',
    }))
    expect(emitToolProgress.mock.invocationCallOrder[0]).toBeLessThan(
      emitToolResult.mock.invocationCallOrder[0]!,
    )
  })

  it('keeps a successful tool result when action progress persistence fails', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'action.progress')
          throw new Error('progress event store unavailable')
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const runState = {
      cardId: 'card-1',
      turnId: 'turn-1',
      controller: new AbortController(),
      sender: { id: 7 } as any,
      chunkCount: 0,
      rawChunkChars: 0,
      state: 'running' as const,
      toolProgressListeners: new Set<(event: any) => void>(),
    }
    const execute = vi.fn(async () => {
      for (const listener of runState.toolProgressListeners) {
        listener({
          toolCallId: 'progress-failure-tool-call',
          toolName: 'coding_agent',
          selectedChannel: 'codex',
          phase: 'running',
          signal: 'semantic-progress',
          elapsedMs: 320,
          timeoutMs: 180_000,
          occurredAt: 1_320,
          eventId: 'progress-failure-1',
          summary: 'Inspected package metadata.',
        })
      }
      return {
        status: 'completed',
        summary: 'repository inspected',
      }
    })
    const prepared = createPrepared({
      toolRegistry: createCanonicalToolRegistry(),
      tools: [{
        type: 'function',
        function: {
          name: 'coding_agent',
          description: 'Run a coding agent.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
        execute,
      }],
    })
    const input = createInput('检查当前项目', {
      runState,
      prepareTurn: vi.fn(async () => prepared),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep)
      .mockResolvedValueOnce({
        kind: 'action',
        action: {
          actionId: 'turn-1:action:progress-failure',
          input: {
            agent: 'codex',
            prompt: 'inspect the repository',
          },
          providerToolName: 'coding_agent',
          capabilityId: 'coding_agent.codex',
          toolCallId: 'progress-failure-tool-call',
        },
      } as any)
      .mockResolvedValueOnce({
        kind: 'reply',
        finishReason: 'stop',
        fullText: '检查完成。',
        text: '检查完成。',
      })

    await runAlicizationMainChatBackground(input)

    expect(execute).toHaveBeenCalledOnce()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      'card-1::turn-1',
      expect.objectContaining({
        status: 'completed',
        fullText: '检查完成。',
      }),
    )
    expect(events.map(event => event.eventType)).toContain('action.completed')
    expect(events.map(event => event.eventType)).not.toContain('action.failed')
    expect(events.map(event => event.eventType)).not.toContain('tool.failed')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith(
      'chat-stream.tool-progress-persistence-failed',
      expect.objectContaining({
        actionId: 'turn-1:action:progress-failure',
        toolCallId: 'progress-failure-tool-call',
        reason: 'progress event store unavailable',
      }),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        category: 'alicization.executor.persistence',
        action: 'tool-progress-persistence-failed',
        payload: expect.objectContaining({
          actionId: 'turn-1:action:progress-failure',
          toolCallId: 'progress-failure-tool-call',
          persistenceFailureOnly: true,
        }),
      }),
    )
  })

  it('settles through the failure lifecycle when preparation ignores the abort signal', async () => {
    let resolvePreparation!: (value: any) => void
    const preparationPromise = new Promise<any>((resolve) => {
      resolvePreparation = resolve
    })
    const input = createInput('请继续。', {
      prepareTurn: vi.fn(() => preparationPromise),
    })

    const pendingRun = runAlicizationMainChatBackground(input)
    input.runState.controller.abort(
      new DOMException('chat-preparation-timeout', 'AbortError'),
    )

    const outcome = await Promise.race([
      pendingRun.then(() => 'settled'),
      new Promise(resolve => setTimeout(() => resolve('pending'), 100)),
    ])
    expect(outcome).toBe('settled')
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        name: 'AbortError',
        message: 'chat-preparation-timeout',
      }),
    }))
    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()

    resolvePreparation(createPrepared())
    await Promise.resolve()
    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
  })

  it('persists an internal preparation deadline as timed-out without aborting the user cancellation controller', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const input = createInput('请继续。', {
      preparationTimeoutMs: 5,
      prepareTurn: vi.fn(() => new Promise(() => {})),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    } as any)

    await runAlicizationMainChatBackground(input)

    expect(input.runState.controller.signal.aborted).toBe(false)
    expect(events.map(event => event.eventType)).toContain('runtime.timed_out')
    expect(events.map(event => event.eventType)).not.toContain('runtime.cancelled')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.proposed')
    expect(events.map(event => event.eventType)).not.toContain('memory.write.accepted')
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        errorCode: 'ALICIZATION_RUNTIME_TIMEOUT',
        timeoutOrigin: 'runtime-watchdog',
        timeoutReason: 'chat-preparation-timeout',
      }),
    }))
    expect(runAlicizationMainChatProviderStep).not.toHaveBeenCalled()
  })

  it('emits prepared liveness meta before the Provider step', async () => {
    let preparedMetaEmitted = false
    let providerSawPreparedMeta = false
    const emit = vi.fn((_reply: string, options?: { force?: boolean }) => {
      if (options?.force)
        preparedMetaEmitted = true
    })
    const metaEmitterFactory = vi.mocked(createAlicizationChatStreamMetaEmitter)
    metaEmitterFactory.mockReset()
    metaEmitterFactory.mockImplementation(() => ({
      compose: vi.fn(),
      emit,
      getLastReply: () => '',
      snapshot: () => ({
        lastReply: '',
        lastSignature: null,
      }),
    }))
    vi.mocked(runAlicizationMainChatProviderStep).mockImplementationOnce(async () => {
      providerSawPreparedMeta = preparedMetaEmitted
      return {
        kind: 'reply',
        finishReason: 'stop',
        fullText: 'Provider reply',
        text: 'Provider reply',
      }
    })
    const input = createInput()

    try {
      await runAlicizationMainChatBackground(input)
      expect(preparedMetaEmitted).toBe(true)
      expect(providerSawPreparedMeta).toBe(true)
      expect(emit).toHaveBeenCalledWith('', { force: true })
    }
    finally {
      metaEmitterFactory.mockImplementation(() => ({
        compose: vi.fn(),
        emit: vi.fn(),
        getLastReply: () => '',
        snapshot: () => ({
          lastReply: '',
          lastSignature: null,
        }),
      }))
    }
  })

  it('passes presented execution callbacks to the runtime settlement owner', async () => {
    const callback = {
      createdAt: 1_726_000_000_000,
      sessionId: 'session-inline-callback',
      threadId: 'thread-inline-callback',
      status: 'completed',
      summary: 'command completed',
    }
    const prepared = createPrepared({
      presentedExecutionCallbacks: [callback],
    })
    const input = createInput('刚才的命令结果呢', {
      prepareTurn: vi.fn(async () => prepared),
      settlePresentedExecutionCallbacks: vi.fn(),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.settlePresentedExecutionCallbacks).toHaveBeenCalledOnce()
    expect(input.settlePresentedExecutionCallbacks).toHaveBeenCalledWith({
      cardId: 'card-1',
      callbacks: [callback],
    })
  })

  it('finishes EventLoop Provider reply data after a completed turn', async () => {
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider full text',
      text: 'Provider visible reply',
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload).toEqual(expect.objectContaining({
      status: 'completed',
      origin: 'provider',
      finishReason: 'stop',
      fullText: 'Provider full text',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    }))
    expect(finishPayload?.visibleReplyRealization).toEqual(expect.objectContaining({
      visibleText: 'Provider full text',
      actualAuthority: 'llm-mind',
      providerMindExecuted: true,
      mode: 'provider-stream',
    }))
  })

  it('publishes the Provider step reply and preserves the validated Provider artifact', async () => {
    const rawFullText = `{
  "memoryUsage": {
    "workingMemoryVersion": null,
    "longTermEvidenceIds": []
  },
  "performance": {
    "baseEmotion": "thinking",
    "facialCue": null,
    "actionCue": null,
    "delivery": "firm",
    "emphasis": 1
  },
  "reply": "Provider raw reply",
  "emotion": "thinking",
  "thought": "preserve background bytes",
  "format": "mind-turn-v1"
}`
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: rawFullText,
      text: 'Provider raw reply',
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Provider raw reply',
      origin: 'provider',
    }))
    expect(finishPayload).toEqual(expect.objectContaining({
      status: 'completed',
      fullText: rawFullText,
      origin: 'provider',
    }))
    expect(finishPayload?.fullText).toBe(rawFullText)
  })

  it('finishes plain Provider reply text as a Provider-authored visible reply', async () => {
    const input = createInput()
    const fullText = 'Provider returned plain text because this model lacks native JSON schema.'
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText,
      text: fullText,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(
      input.key,
      expect.objectContaining({
        status: 'completed',
        origin: 'provider',
        fullText,
        visibleReplyRealization: expect.objectContaining({
          visibleText: fullText,
        }),
      }),
    )
  })

  it('surfaces a structured Provider payload without reply as a protocol failure', async () => {
    const input = createInput()
    const malformedStructuredPayload = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'missing visible reply',
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValue({
      kind: 'reply',
      finishReason: 'stop',
      fullText: malformedStructuredPayload,
      text: malformedStructuredPayload,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('reply'),
      }),
    }))
    expect(input.emitChunk).not.toHaveBeenCalled()
  })

  it('blocks a structured Provider reply that claims unavailable long-term evidence', async () => {
    const input = createInput('继续刚才的记忆线', {
      prepareTurn: vi.fn(async () => createPrepared({
        memoryContext: {
          workingMemory: {
            version: 'working-memory-v1',
          },
          availableLongTermEvidenceIds: ['memory-known'],
        },
      })),
    })
    const invalidMemoryPayload = JSON.stringify({
      format: 'mind-turn-v1',
      thought: '',
      emotion: 'thinking',
      reply: '不应该发布。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: 'working-memory-v1',
        longTermEvidenceIds: ['memory-unknown'],
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: invalidMemoryPayload,
      text: invalidMemoryPayload,
    })

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({
        message: expect.stringContaining('provider-memory-usage-invalid'),
      }),
    }))
    expect(input.emitChunk).not.toHaveBeenCalled()
  })

  it('keeps memory side failures outside the visible Provider reply', async () => {
    const input = createInput('继续记忆任务', {
      prepareTurn: vi.fn(async () => createPrepared({
        memoryFailures: [{
          kind: 'recall-failure',
          reply: 'Long-term memory recall failed for this turn.',
          origin: 'failure-surface',
          allowLongTermCondensation: false,
          allowPersonaLearning: false,
          allowTraining: false,
          nonHumanAuthoredStatus: 'direct-infra-repair:recall-failure',
          visibleReplySource: 'infrastructure-failure',
          excludeFromPersonaLearning: true,
          excludeFromMemoryCondensation: true,
          auditCategory: 'alicization.chat-failure',
          stage: 'long-term-memory-recall',
          cardId: 'card-1',
          turnId: 'turn-1',
          occurredAt: 10,
          errorSummary: 'recall offline',
        }],
      })),
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: buildProviderReply(),
      text: buildProviderReply(),
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload?.fullText).toBe(buildProviderReply())
    expect(String(finishPayload?.fullText)).not.toContain('memoryFailures')
    expect(finishPayload?.memoryFailures).toEqual([
      expect.objectContaining({
        kind: 'recall-failure',
        stage: 'long-term-memory-recall',
        errorSummary: 'recall offline',
      }),
    ])
  })

  it('reports runtime memory event persistence failure without replacing the Provider reply', async () => {
    const events: any[] = []
    const persistence = {
      appendRuntimeEvent: vi.fn(async (_scope, event) => {
        if (event.eventType === 'memory.write.proposed')
          throw new Error('runtime event store unavailable')
        const persisted = {
          ...event,
          sequence: events.length + 1,
        }
        events.push(persisted)
        return persisted
      }),
      saveRuntimeCheckpoint: vi.fn(async checkpoint => checkpoint),
    }
    const commitMemoryWriteIntent = vi.fn(async () => ({
      workingMemorySnapshot: {
        version: 'working-memory-v1',
        updatedAt: 100,
        compressedTimeline: [],
        compression: {
          level: 'none',
          sourceTurnIds: [],
          lastCompressedAt: null,
        },
      },
      memoryWriteItems: [createMemoryWriteItem()],
      ownerSettlements: [],
    }))
    const input = createInput('记住成功回复', {
      prepareTurn: vi.fn(async () => createPrepared({
        commitMemoryWriteIntent,
        memoryWriteItems: [createMemoryWriteItem()],
      })),
      turnLoop: {
        conversationId: 'conversation-1',
        persistence,
        userId: 'local-user-stable',
      },
    })
    vi.mocked(runAlicizationMainChatProviderStep).mockResolvedValueOnce({
      kind: 'reply',
      finishReason: 'stop',
      fullText: 'Provider 正常回复。',
      text: 'Provider 正常回复。',
    })

    await runAlicizationMainChatBackground(input)

    const finishPayload = vi.mocked(input.runStateController.finishRun).mock.calls.at(-1)?.[1]
    expect(finishPayload).toMatchObject({
      status: 'completed',
      fullText: 'Provider 正常回复。',
      memoryFailures: [
        expect.objectContaining({
          kind: 'memory-persistence',
          stage: 'runtime-event-store',
          errorSummary: 'runtime event store unavailable',
        }),
      ],
    })
    expect(commitMemoryWriteIntent).not.toHaveBeenCalled()
    expect(input.emitChunk).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Provider 正常回复。',
      origin: 'provider',
    }))
  })

  it('builds the runtime digest fallback only from available emotional facts', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        digitalLifeRuntimeSurface: {
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['memory-available'],
              focusAnchor: '真实的当前对话焦点',
            },
          },
          memory: {
            emotionalKernel: {
              version: 'emotional-kernel-v1',
              dominantEmotion: 'calm',
              initiativeMode: 'responsive',
              memoryRecallMode: 'working-and-long-term',
              embodimentTone: 'steady',
            },
          },
        },
      },
    })

    const digest = mainChatBackgroundRunTestInternals.buildPreparedRuntimeDigestFallback(prepared)

    expect(digest?.currentConsciousFrame).toEqual(expect.objectContaining({ focusAnchor: '真实的当前对话焦点', reasonTags: ['memory-available'] }))
    expect(digest?.emotionalKernel).toEqual(expect.objectContaining({
      memoryRecallMode: 'working-and-long-term',
      embodimentTone: 'steady',
    }))
  })

  it('delegates failures without installing timeout reply recovery callbacks', async () => {
    const error = new DOMException('chat-first-event-timeout', 'AbortError')
    const input = createInput()
    vi.mocked(runAlicizationMainChatProviderStep).mockRejectedValueOnce(error)

    await runAlicizationMainChatBackground(input)

    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0] as unknown as Record<string, unknown>
    expect(failureInput.error).toBe(error)
    expect(failureInput).not.toHaveProperty('recoverFromTimeout')
    expect(failureInput).not.toHaveProperty('emitRecoveredText')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMode')
    expect(failureInput).not.toHaveProperty('timeoutRecoveryMs')
  })
})
