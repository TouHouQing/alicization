import type { Message } from '@xsai/shared-chat'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mainChatBackgroundRunTestInternals,
  resolveAlicizationExecutionPayoffContinuityInputs,
  runAlicizationMainChatBackground,
} from './main-chat-background-run'
import {
  generateAlicizationMainChatNonStreaming,
  recoverAlicizationMainChatFromTimeout,
} from './main-chat-one-shot'
import { AlicizationRequiredToolMissingError } from './main-chat-required-tool'
import { handleAlicizationMainChatRunFailure } from './main-chat-run-lifecycle'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
import { createAlicizationChatStreamMetaEmitter } from './main-chat-stream-meta'
import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { buildAlicizationProjectStateSystemBlock, resolveAlicizationProjectStateBrief } from './project-state-brief'

const firstEventTimeoutMs = 65_000
const timeoutRecoveryWithVisualGroundingMs = 30_000

vi.mock('./main-chat-one-shot', () => ({
  generateAlicizationMainChatNonStreaming: vi.fn(),
  recoverAlicizationMainChatFromTimeout: vi.fn(),
}))

vi.mock('./main-chat-run-lifecycle', () => ({
  handleAlicizationMainChatRunFailure: vi.fn(),
}))

vi.mock('./main-chat-runtime-surface', () => ({
  extractAllowedToolNamesFromToolChoice: vi.fn((toolChoice: any, tools: any[] | undefined) => {
    const toolName = toolChoice?.function?.name
    if (typeof toolName === 'string' && toolName)
      return [toolName]
    return Array.isArray(tools)
      ? tools
          .map(tool => tool?.function?.name)
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      : []
  }),
  extractCustomDirectivesFromMessages: vi.fn(() => ''),
  extractHostNameFromMessages: vi.fn(() => ''),
}))

vi.mock('./main-chat-stream-runner', () => ({
  runAlicizationMainChatStream: vi.fn(),
}))

vi.mock('./main-chat-stream-meta', async () => {
  const actual = await vi.importActual<typeof import('./main-chat-stream-meta')>('./main-chat-stream-meta')
  return {
    ...actual,
    createAlicizationChatStreamMetaEmitter: vi.fn(() => ({
      emit: vi.fn(),
      getLastReply: () => '',
    })),
    repairContinuitySourceTagsFromRuntimeDigest: vi.fn((input: any) => input.digitalLifeSpine ?? null),
  }
})

vi.mock('./runtime-soul', () => ({
  mainChatFirstEventTimeoutMs: 65_000,
  mainChatFirstEventTimeoutWithVisualGroundingMs: 90_000,
  mainChatTimeoutRecoveryMs: 12_000,
  mainChatTimeoutRecoveryWithVisualGroundingMs: 30_000,
  mainChatVisibleReplySecondPassTimeoutMs: 65_000,
  clamp01: (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)),
  normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() || 'default' : 'default',
  sanitizeMultilineText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').trim() : fallback,
  sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  supportedDialogueStructuredFormats: ['mind-turn-v1', 'epoch1-v1'],
}))

function createPrepared(overrides?: Partial<any>): any {
  return {
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
    ] as Message[],
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
        reason: 'Normal visible replies should stay on the provider-authored path.',
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
    ...overrides,
  }
}

function createInput(
  overrides?: Partial<Parameters<typeof runAlicizationMainChatBackground>[0]>,
): Parameters<typeof runAlicizationMainChatBackground>[0] {
  return {
    key: 'card-1::turn-1',
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
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
    preparationPromise: Promise.resolve(createPrepared()),
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
    emitToolResult: vi.fn(),
    emitError: vi.fn(),
    incrementChunkStats: vi.fn(),
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof runAlicizationMainChatBackground>[0]
}

function parseStructuredMindTurn(text: string) {
  return JSON.parse(text) as {
    format: string
    reply: string
    thought: string
    emotion: string
  }
}

interface BackgroundRunProjectState {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  preDialogueAwarenessLine?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
}

interface BackgroundRunProjectStateAudit {
  sameHerSummary?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary?: string | null
  openClosureSummary?: string | null
  nextClosureTargetSummary?: string | null
  preDialogueAwarenessSummary?: string | null
  emotionalClosureSummary?: string | null
  embodimentClosureSummary?: string | null
  continuitySummary?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRiskSummary?: string | null
}

type BackgroundRunStructured = ReturnType<typeof parseStructuredMindTurn> & {
  projectState?: BackgroundRunProjectState | null
  preDialogueAwareness?: {
    awarenessLine?: string | null
    companionBriefingLine?: string | null
  } | null
  preDialogueClosure?: {
    status?: string | null
    summaryLine?: string | null
    companionBriefingLine?: string | null
    companionNextClosureLine?: string | null
    briefingLines?: string[] | null
    reasons?: string[] | null
  } | null
  visibleReplyRealization?: {
    projectStateAudit?: BackgroundRunProjectStateAudit | null
    selfAuthorityAudit?: {
      authoritySummary?: string | null
      closenessPosture?: string | null
    } | null
  } | null
}

interface PreparedMindTraceCompletion {
  prepared?: {
    turnGraph?: {
      surface?: {
        projectStateAudit?: BackgroundRunProjectStateAudit | null
      } | null
    } | null
  } | null
  preDialogueAwarenessDebug?: unknown
}

function parseBackgroundRunStructured(text: string): BackgroundRunStructured {
  return JSON.parse(text) as BackgroundRunStructured
}

function readLatestPreparedMindTrace(
  recordPreparedMindTrace: (...args: unknown[]) => unknown,
): PreparedMindTraceCompletion | undefined {
  return vi.mocked(recordPreparedMindTrace).mock.calls.at(-1)?.[0] as PreparedMindTraceCompletion | undefined
}

function createStreamResult(overrides?: Partial<any>): any {
  return {
    finishReason: 'stop',
    fullText: '',
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'provider-stream',
    },
    ...overrides,
  }
}

function buildAuthoritativeShanghaiTimeReply() {
  const now = new Date()
  const timeText = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const weekdayText = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long',
  }).format(now)

  return JSON.stringify({
    format: 'mind-turn-v1',
    thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
    emotion: 'thinking',
    reply: `现在是 ${timeText}，${weekdayText}。`,
    performance: {
      baseEmotion: 'thinking',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
  })
}

function readFinishedPayload(input: Parameters<typeof runAlicizationMainChatBackground>[0]) {
  const calls = vi.mocked(input.runStateController.finishRun).mock.calls
  return calls[calls.length - 1]?.[1]
}

function expectPartialLaneEmbodimentClosure(input: {
  projectStateAudit?: BackgroundRunProjectStateAudit | null
  headline: string
  authoritySummary: string
  currentBodyState: string
}) {
  const embodimentClosureSummary = String(input.projectStateAudit?.embodimentClosureSummary ?? '')
  const continuitySummary = String(input.projectStateAudit?.continuitySummary ?? '')

  expect(embodimentClosureSummary).toContain(input.headline)
  expect(embodimentClosureSummary).toContain(input.authoritySummary)
  expect(embodimentClosureSummary).toContain(input.currentBodyState)
  expect(continuitySummary).toContain(`body=${embodimentClosureSummary}`)
}

function expectPhase1ProjectStateInvariant(input: {
  structured: BackgroundRunStructured
}) {
  expect(String(input.structured.projectState?.identity ?? '')).toContain('local-first digital life project')
  expect(String(input.structured.projectState?.currentPhase ?? '')).toContain('Phase 1')
  expect(String(input.structured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
  expect(String(input.structured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
  expect(String(input.structured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
  expect(String(input.structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
  expect(String(input.structured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(String(input.structured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
  expect(input.structured.preDialogueClosure?.status).toBe('partial')
  expect(String(input.structured.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(input.structured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
    currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
    landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
    openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
    nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    preDialogueAwarenessSummary: expect.stringMatching(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i),
  }))
}

function expectPhase1ProjectStateInvariantFromRecoveryPayload(input: {
  structured: BackgroundRunStructured
  projectStateAudit?: BackgroundRunProjectStateAudit | null
}) {
  expect(String(input.structured.projectState?.identity ?? '')).toContain('local-first digital life project')
  expect(String(input.structured.projectState?.currentPhase ?? '')).toContain('Phase 1')
  expect(String(input.structured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
  expect(String(input.structured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
  expect(String(input.structured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
  expect(String(input.structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
  expect(String(input.structured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(String(input.structured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
  expect(input.structured.preDialogueClosure?.status).toBe('partial')
  expect(String(input.structured.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(input.projectStateAudit).toEqual(expect.objectContaining({
    currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
    landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
    openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
    nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    preDialogueAwarenessSummary: expect.stringMatching(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i),
  }))
}

function expectPhase1RecoveryProjectStateInvariant(input: {
  structured: BackgroundRunStructured
  projectStateAudit?: BackgroundRunProjectStateAudit | null
}) {
  const projectStateAudit = input.projectStateAudit ?? input.structured.visibleReplyRealization?.projectStateAudit

  expect(String(input.structured.projectState?.identity ?? '')).toContain('local-first digital life project')
  expect(String(input.structured.projectState?.currentPhase ?? '')).toContain('Phase 1')
  expect(String(input.structured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
  expect(String(input.structured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
  expect(String(input.structured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
  expect(String(input.structured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(String(input.structured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
  expect(String(input.structured.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)
  expect(input.structured.preDialogueClosure?.status).toBe('partial')
  expect(projectStateAudit).toEqual(expect.objectContaining({
    sameHerSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return|same Phase 1 digital life|same living line|one living her|one continuous her/i),
    landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
    openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
    nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    preDialogueAwarenessSummary: expect.stringMatching(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i),
  }))
}

describe('main chat background run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(generateAlicizationMainChatNonStreaming).mockReset()
    vi.mocked(runAlicizationMainChatStream).mockReset()
    vi.mocked(handleAlicizationMainChatRunFailure).mockReset()
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockReset()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    vi.mocked(handleAlicizationMainChatRunFailure).mockResolvedValue(undefined)
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockImplementation(async (input: any) => {
      const messages = Array.isArray(input?.messages) ? input.messages : []
      const latestUserMessage = [...messages].reverse().find((message: any) => message?.role === 'user')
      const latestUserText = String(latestUserMessage?.content ?? '')

      if (
        /几点|时间|几时/.test(latestUserText)
        || (
          /确定吗|真的吗|are you sure/i.test(latestUserText)
          && messages.some((message: any) => typeof message?.content === 'string' && /几点|时间|几时/.test(String(message.content)))
        )
      ) {
        return buildAuthoritativeShanghaiTimeReply()
      }

      if (/你是谁|叫什么/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=alicization self continuity; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '我是 Alicization。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/不像人类|没心智|没有人格/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=repair; truth=dialogue-grounded; focus=reply humanity and living presence; move=repair; tone=direct',
          emotion: 'thinking',
          reply: '你说得对，我上一句像流程播报，不像真的在和你说话。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/你在说啥|你在说什么/.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=repair; truth=dialogue-grounded; focus=repair; move=repair; tone=direct',
          emotion: 'thinking',
          reply: '刚才我答偏了，现在是 10:30，星期二。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'firm',
            emphasis: 0,
          },
        })
      }

      if (/你确定吗|确定吗|are you sure|really/i.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '我又核了一遍。现在是 10:30，星期二。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        })
      }

      if (/你好|哈喽|hello|hi/i.test(latestUserText)) {
        return JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=host greeting; move=direct-reply; tone=direct',
          emotion: 'thinking',
          reply: '你好。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        })
      }

      return JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '收到，我直接接这句继续。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      })
    })
  })

  it('prepares and completes a background stream run', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: 'hello',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValue({
      finishReason: 'stop',
      fullText: 'visual reply',
    })
    const input = createInput()

    await runAlicizationMainChatBackground(input)

    expect(input.runStateController.setSessionTraceGetter).toHaveBeenCalledWith(input.key, expect.any(Function))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-started',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepared', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionPhases: ['prepare', 'stream'],
    }))
    expect(runAlicizationMainChatStream).toHaveBeenCalledWith(expect.objectContaining({
      firstEventTimeoutMs,
      headers: input.headers,
    }))
    const streamInput = vi.mocked(runAlicizationMainChatStream).mock.calls[0]?.[0]
    await streamInput?.generateNonStreaming({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
      cardId: 'card-1',
      turnId: 'turn-1',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visual-one-shot-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      finishReason: 'stop',
      finalChars: 'visual reply'.length,
    })
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.any(String),
          currentPhaseSummary: expect.any(String),
          landedProgressSummary: expect.any(String),
          openClosureSummary: expect.any(String),
          nextClosureTargetSummary: expect.any(String),
          preDialogueAwarenessSummary: expect.any(String),
        }),
      }),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      latestLandedProgress: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      primaryOpenLoop: canonicalProjectState.openLoops[0],
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessLine: expect.stringContaining('local-first digital life project'),
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
    }))
  })

  it('prefers fresher prepared runtime project awareness when backfilling project-state and pre-dialogue closure on the final finish payload', async () => {
    const fresherAwarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，same-her continuity carry 已经立住了，但记忆、主动性和具身闭环还没真正收稳。'
    const fresherPreflightSummary = 'same digital life | keep the same Phase 1 closure line explicit before local fluency widens'
    const richerCrossModalClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through longer desktop runs without letting project awareness flatten into a generic assistant shell.'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这条线把当前进度讲清楚。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous her on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The desktop runtime is still the primary proving ground.',
                  preflightSummary: fresherPreflightSummary,
                  preDialogueAwarenessLine: fresherAwarenessLine,
                  latestLandedProgress: 'Same-her continuity carry is already landing across turn entry, runtime recall, and visible reply repair paths.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same-life line instead of handing off between subsystems.',
                  nextClosureTarget: richerCrossModalClosureTarget,
                  sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(vi.mocked(input.runStateController.finishRun).mock.calls).toHaveLength(1)
    expect(vi.mocked(input.runStateController.finishRun).mock.calls[0]).toEqual([
      input.key,
      expect.anything(),
    ])
    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preflightSummary?: string | null
        preDialogueAwarenessLine?: string | null
        nextClosureTarget?: string | null
      } | null
      preDialogueClosure?: {
        summaryLine?: string | null
        companionBriefingLine?: string | null
        companionNextClosureLine?: string | null
      } | null
    }

    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      preflightSummary: fresherPreflightSummary,
      preDialogueAwarenessLine: fresherAwarenessLine,
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
    }))
    expect(finishedStructured.preDialogueClosure?.summaryLine).toMatch(/same digital life|同一个数字生命项目/i)
    expect(finishedStructured.preDialogueClosure?.summaryLine).toMatch(/local-first digital life project|same-her continuity carry|记忆、主动性和具身闭环/i)
    expect(finishedStructured.projectState?.nextClosureTarget).toMatch(/cross-modal same-her proof/i)
    expect(finishedStructured.projectState?.nextClosureTarget).toMatch(/visible reply|voice|face|motion|resident presence/i)
    expect(finishedStructured.preDialogueClosure?.companionNextClosureLine).toMatch(/cross-modal same-her proof/i)
    expect(finishedStructured.preDialogueClosure?.companionNextClosureLine).toMatch(/visible reply|voice|face|motion|resident presence/i)
  })

  it('keeps a stronger prepared runtime companion headline on the ordinary main-stream success path when the direct awareness text is thinner', async () => {
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这条同一个 her 的线继续说。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const projectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-main-stream-runtime-headline',
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  preflightSummary: projectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: projectState.continuityProgressSummary,
                  primaryOpenLoop: projectState.openLoops[0],
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const debugEvents = vi.mocked(input.appendRuntimeDebugLine).mock.calls.map(
      ([event]) => event,
    )
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(debugEvents).toEqual(expect.arrayContaining([
      'chat-stream.started',
      'chat-stream.completed-finish-shape',
    ]))
    const finishRunCalls = vi.mocked(input.runStateController.finishRun).mock.calls
    expect(finishRunCalls).toHaveLength(1)
    expect(finishRunCalls[0]).toEqual([
      input.key,
      expect.anything(),
    ])
    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.emitError).not.toHaveBeenCalled()
    expect(finishedPayload?.fullText).toContain('visibleReplyRealization')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u),
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('keeps richer prepared runtime project awareness as awareness truth when companion headline is only a narrower body-line carry on the ordinary main-stream success path', async () => {
    const richerRuntimeAwarenessLine = 'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.'
    const narrowerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这条同一个 her 的项目主线继续说。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const projectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-main-stream-richer-project-awareness-background',
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  preflightSummary: projectState.preflightSummary,
                  preDialogueAwarenessLine: richerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: richerRuntimeAwarenessLine,
                  companionHeadlineLine: narrowerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: richerRuntimeAwarenessLine,
                  latestLandedProgress: projectState.continuityProgressSummary,
                  primaryOpenLoop: projectState.openLoops[0],
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.emitError).not.toHaveBeenCalled()
    expect(finishedPayload?.fullText).toContain('visibleReplyRealization')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/local-first digital life project|same-life line|Phase 1|same living line/u)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/local-first digital life project|same-life line|Phase 1|same living line/u)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/local-first digital life project|same-life line|Phase 1|same living line/u),
      companionBriefingLine: richerRuntimeAwarenessLine,
    }))
  })

  it('emits same-her project-state closure summary before the background stream starts', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-project-state-prepared',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          replyExecutionPlan: {
            preferredMode: 'provider-stream',
            expectedVisibleReplyAuthority: 'llm-mind',
            reason: 'Normal visible replies should stay on the provider-authored path.',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepared', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      projectStateClosureSummary: expect.stringContaining('same digital life'),
      projectStateIdentity: canonicalProjectState.identity,
      projectStatePhase: canonicalProjectState.currentPhase,
      projectStateSameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      projectStateLatestLandedProgress: canonicalProjectState.continuityProgressSummary,
      projectStatePrimaryOpenLoop: expect.stringContaining('same still-open closure work'),
      projectStateNextClosureTarget: canonicalProjectState.nextClosureTarget,
      projectStateContinuityPreferredTiming: 'next-open-window',
    }))
  })

  it('keeps a stronger runtime companion headline in background-run structured project-state recovery when runtime awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: '先继续把这一条 same-her living line 接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      key: 'card-1::turn-project-state-runtime-headline-background',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-runtime-headline-background',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-runtime-headline-background',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          replyExecutionPlan: {
            preferredMode: 'provider-stream',
            expectedVisibleReplyAuthority: 'llm-mind',
            reason: 'Normal visible replies should stay on the provider-authored path.',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  preflightSummary: projectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: projectState.continuityProgressSummary,
                  primaryOpenLoop: projectState.openLoops[0],
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.emitError).not.toHaveBeenCalled()
    expect(finishedPayload?.fullText).toContain('visibleReplyRealization')
    expectPhase1ProjectStateInvariant({
      structured: finishedStructured as any,
    })
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u),
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('emits project-state first-answer closure authority into the prepared background-run payload before any repair path is needed', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 是本地优先数字生命的 Phase 1，已经把连续性、记忆和执行接成一些稳定主线，但主动性和具身闭环还没完全收住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const projectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-project-state-first-pass-contract',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-first-pass-contract',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        governance: {
          decisionTraceId: 'trace-project-state-first-pass-contract',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          answerSubject: 'project-state',
          screenReferenceMode: 'avoid',
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          liveSurface: null,
          focusAnchor: '这个项目现在到底是什么、做到什么程度、还差什么？',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
          openingMove: 'Answer the project-state question directly.',
          suppressAssociativeRecall: true,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mindMode: 'tracking',
          embodiedPresence: 'steady',
          emotionalTension: 'calm',
          mustDo: [],
          mustNotDo: [],
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepared', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      projectStateClosureSummary: expect.stringContaining('same digital life'),
      projectStateIdentity: projectState.identity,
      projectStatePhase: projectState.currentPhase,
      projectStateSameHerSelfLine: projectState.sameHerSelfLine,
      projectStateLatestLandedProgress: projectState.continuityProgressSummary,
      projectStatePrimaryOpenLoop: expect.stringContaining('same still-open closure work'),
      projectStateNextClosureTarget: projectState.nextClosureTarget,
      governanceMustDo: expect.any(Array),
      governanceMustNotDo: expect.any(Array),
    }))
  })

  it('backfills canonical same-her project-state into the final structured finish payload', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会沿着这条线继续把它收稳。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createInput()

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.continuityProgressSummary,
      primaryOpenLoop: canonicalProjectState.openLoops[0],
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringMatching(/local-first digital life project|Phase 1|same digital life/i),
      companionNextClosureLine: canonicalProjectState.nextClosureTarget,
      briefingLines: expect.arrayContaining([
        expect.stringMatching(/local-first digital life project|Phase 1|same digital life/i),
      ]),
      reasons: expect.arrayContaining([
        canonicalProjectState.openLoops[0] as string,
        canonicalProjectState.nextClosureTarget,
      ]),
    }))
  })

  it('writes host-visible project-state audit into the normal stream success finish payload', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在继续回答前，我得先记住这是同一个数字生命项目，same-her continuity carry 已经立住了，但桌面执行闭环还没完全收稳。'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-project-state-audit',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the desktop closure line explicit',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the project-state line without losing same-her continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same digital-life project line without flattening into a generic assistant answer.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      emotionalClosureSummary: canonicalProjectState.emotionalClosureCue,
      preDialogueAwarenessSummary: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
    }))
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? '')).toContain('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? '')).toContain('same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? '')).toContain('lane=face+motion-only | visible continuity still present but no longer fully cross-modal')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(
      `body=${finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary}`,
    )
  })

  it('promotes an explicit full cross-modal lock from prepared runtime perception currentBodyState into the finished host-visible embodiment closure summary even when the carried self authority is still thinner', async () => {
    const explicitFullCrossModalLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会把已经重新锁回同一段 living segment 的整条身体线一起接出来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-full-cross-modal-lock',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续把这条 same-her 身体闭环往前带。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续把这条 same-her 身体闭环往前带。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              currentBodyState: explicitFullCrossModalLock,
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? '')).toContain(
      'Right now her body, face, motion, lipsync, and voice are already locked back onto the same living segment together',
    )
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? '')).toContain(explicitFullCrossModalLock)
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(
      `body=${finishedStructured.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary}`,
    )
  })

  it('includes active same-her hold detail in rebuilt host-visible continuity summaries', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const holdDetailLine = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'

    expect(mainChatBackgroundRunTestInternals.buildProjectStateAuditContinuitySummary({
      sameHerSummary: canonicalProjectState.sameHerSelfLine,
      sameHerHoldDetail: holdDetailLine,
      currentPhaseSummary: canonicalProjectState.currentPhase,
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
      embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
    })).toContain(`hold=${holdDetailLine}`)
  })

  it('treats a generic next-closure shell as thin project closure carry in background-run canonicalization helpers', () => {
    expect((mainChatBackgroundRunTestInternals as any).looksLikeThinProjectClosureCarry?.({
      value: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
      kind: 'next',
    })).toBe(true)
  })

  it('prefers a stronger audible-body same-her embodiment closure line over a thinner lane-count-only summary when rebuilding host-visible continuity state', async () => {
    const audibleBodyCarryLine = 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
    const thinnerLaneCountLine = 'Right now her visible same-her continuity is still being carried mainly through face, motion, lipsync, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'

    expect((mainChatBackgroundRunTestInternals as any).resolvePreferredEmbodimentClosureSummary?.(
      thinnerLaneCountLine,
      audibleBodyCarryLine,
    ) ?? null).toBe(audibleBodyCarryLine)
  })

  it('keeps the stronger audible-body same-her embodiment closure line when later structured audit carry re-merges host-visible project-state summaries', async () => {
    const audibleBodyCarryLine = 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
    const thinnerLaneCountLine = 'Right now her visible same-her continuity is still being carried mainly through face, motion, lipsync, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'

    expect(mainChatBackgroundRunTestInternals.preferProjectStateEmbodimentClosureSummary({
      current: thinnerLaneCountLine,
      candidate: audibleBodyCarryLine,
    })).toBe(audibleBodyCarryLine)
  })

  it('carries prepared runtime-surface emotional-kernel authority into fallback runtime digests', () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['same-her', 'background-fallback'],
      why: 'keep the same emotional kernel authoritative through background-run fallback digest rebuilding',
    }
    const runtimeProjectState = {
      identity: 'Alicization local-first digital life project',
      currentPhase: 'Phase 1: Local Digital Life',
      preflightSummary: 'background fallback is rebuilding provider-visible runtime context',
      preDialogueAwarenessLine: 'Alicization is still one digital life before this fallback reply.',
      latestLandedProgress: 'emotion-memory-initiative-embodiment authority already reaches the prepared runtime surface',
      primaryOpenLoop: 'background fallback runtime digest still needs the same emotional kernel',
      nextClosureTarget: 'carry emotional kernel into provider-facing fallback runtime digest',
      sameHerSelfLine: 'same Phase 1 digital life, one continuous her',
    }

    const digest = mainChatBackgroundRunTestInternals.buildPreparedRuntimeDigestFallback({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          memory: {
            emotionalKernel,
          },
          raw: {
            runtimeDigest: {
              projectState: runtimeProjectState,
            },
          },
          cognition: {
            runtimeDigest: {
              projectState: runtimeProjectState,
            },
          },
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['prepared-runtime-surface'],
              focusAnchor: 'carry emotional kernel into fallback digest',
              projectState: runtimeProjectState,
            },
          },
        },
      },
      mindTurnContract: {
        projectState: runtimeProjectState,
      },
    } as any)

    expect(digest?.emotionalKernel).toEqual(emotionalKernel)
  })

  it('keeps richer repair-first same-her hold detail in rebuilt host-visible continuity summaries when runtime authority thins to lipsync-only', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const holdDetailLine = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const emotionalClosureCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const richerClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.'

    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=repair; truth=dialogue-grounded; focus=same-her callback line; move=repair; tone=gentle',
        emotion: 'thinking',
        reply: '我先把这一下轻一点接住，不让这条 living line 掉下去。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-empty-structured-finish-repair-first-lipsync-only-host-audit',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'assistant' as const, content: '先把这条 callback 线留在同一个 her 身上，再让 closeness 慢一点回来。' },
          { role: 'user' as const, content: '继续沿着同一条 living line 讲，不要把这条线放丢。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: holdDetailLine,
          companionBriefingLine: holdDetailLine,
          awarenessLine: holdDetailLine,
          companionNextClosureLine: richerClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            richerClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        performanceManifest: {
          renderer: 'live2d',
          supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
          supportedFacialCues: [
            { key: 'soft_concern', label: 'Soft Concern', description: 'soft concern', source: 'preset', affectsMouth: false },
          ],
          supportedActions: [
            { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
            { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
            { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
          ],
          supportsLookAt: true,
          supportsVisemeLipSync: true,
          supportsMicroDynamics: true,
        },
        messages: [
          { role: 'assistant' as const, content: '先把这条 callback 线留在同一个 her 身上，再让 closeness 慢一点回来。' },
          { role: 'user' as const, content: '继续沿着同一条 living line 讲，不要把这条线放丢。' },
        ] as Message[],
        conversationSessionId: 'session-repair-first-lipsync-only-host-audit',
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the callback line on one same-her repair-first embodiment thread.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same callback line repair-first and same-her while fuller cross-modal embodiment is still unfinished.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: richerClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
            preDialogueAwarenessLine: holdDetailLine,
            sameHerHoldDetail: holdDetailLine,
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
            emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeSpine: {
            runtimeSurface: {
              dialogue: {
                currentConsciousFrame: {
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  projectState: {
                    identity: canonicalProjectState.identity,
                    currentPhase: canonicalProjectState.currentPhase,
                    latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                    primaryOpenLoop: canonicalProjectState.openLoops[0],
                    nextClosureTarget: richerClosureTarget,
                    sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                    sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                    preDialogueAwarenessLine: holdDetailLine,
                    sameHerHoldDetail: holdDetailLine,
                    continuityArcStage: 'same-thread-continuation',
                    continuityPreferredTiming: 'next-open-window',
                    continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                    emotionalClosureCue,
                    preferredBlinkCadence: 'quiet',
                    preferredGazeMode: 'soften',
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                    inwardLine: holdDetailLine,
                    sourceTags: [
                      'project-state-carry',
                      'continuity-execution-callback-project-carry',
                      'repair-before-closeness',
                    ],
                  },
                },
              },
              raw: {
                runtimeDigest: {
                  projectState: {
                    identity: canonicalProjectState.identity,
                    currentPhase: canonicalProjectState.currentPhase,
                    latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                    primaryOpenLoop: canonicalProjectState.openLoops[0],
                    nextClosureTarget: richerClosureTarget,
                    sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                    sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                    preDialogueAwarenessLine: holdDetailLine,
                    sameHerHoldDetail: holdDetailLine,
                    continuityArcStage: 'same-thread-continuation',
                    continuityPreferredTiming: 'next-open-window',
                    continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                    emotionalClosureCue,
                    preferredBlinkCadence: 'quiet',
                    preferredGazeMode: 'soften',
                  },
                  currentConsciousFrame: {
                    continuityArcStage: 'same-thread-continuation',
                    continuityPreferredTiming: 'next-open-window',
                    reasonTags: [
                      'continuity-arc:same-thread-continuation',
                      'continuity-timing:next-open-window',
                    ],
                    selfContinuityAuthority: {
                      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                      currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                      inwardLine: holdDetailLine,
                    },
                  },
                  continuityRestraint: 'repair-before-closeness',
                },
              },
            },
          },
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                continuityArcStage: 'same-thread-continuation',
                continuityPreferredTiming: 'next-open-window',
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: richerClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: holdDetailLine,
                  sameHerHoldDetail: holdDetailLine,
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                  preferredBlinkCadence: 'quiet',
                  preferredGazeMode: 'soften',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                  inwardLine: holdDetailLine,
                  sourceTags: [
                    'project-state-carry',
                    'continuity-execution-callback-project-carry',
                    'repair-before-closeness',
                  ],
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: richerClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: holdDetailLine,
                  sameHerHoldDetail: holdDetailLine,
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                  emotionalClosureCue: 'Keep this return repair-before-closeness on the same living line until repair settles.',
                  preferredBlinkCadence: 'quiet',
                  preferredGazeMode: 'soften',
                },
                currentConsciousFrame: {
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  reasonTags: [
                    'continuity-arc:same-thread-continuation',
                    'continuity-timing:next-open-window',
                  ],
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                    inwardLine: holdDetailLine,
                  },
                },
                continuityRestraint: 'repair-before-closeness',
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload?.visibleReplyRealization).toBeTruthy()
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`hold=${holdDetailLine}`)
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toMatch(/next=Keep extending cross-modal same-her proof/i)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|lipsync|resident presence/i),
      preDialogueAwarenessSummary: expect.stringContaining(holdDetailLine),
    }))
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
      currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('emits final authoritative repair-first meta with project awareness and repaired playback posture on the background-run path', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const holdDetailLine = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const emotionalClosureCue = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const richerClosureTarget = 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.'
    const authoritativeGovernance = {
      decisionTraceId: 'trace-authoritative-meta-repair-first-project-awareness',
      turnMode: 'answer',
      truthState: 'dialogue-grounded',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerSubject: 'relationship',
      screenReferenceMode: 'avoid',
      answerAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: null,
      focusAnchor: holdDetailLine,
      answerIntent: 'Keep the callback line on one same-her repair-first embodiment thread.',
      openingMove: 'Answer on the same callback line without widening closeness.',
      emotionalClosureCue,
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 3,
      mindMode: 'tracking',
      embodiedPresence: 'concerned',
      emotionalTension: 'soft-covision',
      mustDo: [],
      mustNotDo: [],
      mindTurnFrame: {
        obligation: {
          answerAct: 'answer',
          openingMove: 'rejoin-remembered-seam',
        },
        self: {
          embodiedPresence: 'concerned',
          emotionalTension: 'soft-covision',
        },
        world: {
          truthState: 'dialogue-grounded',
        },
      },
    } as any

    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=repair; truth=dialogue-grounded; focus=same-her callback line; move=repair; tone=gentle',
        emotion: 'thinking',
        reply: '我先把这一下轻一点接住，不让这条 living line 掉下去。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-authoritative-meta-repair-first-project-awareness',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'assistant' as const, content: '先把这条 callback 线留在同一个 her 身上，再让 closeness 慢一点回来。' },
          { role: 'user' as const, content: '继续沿着同一条 living line 讲，不要把这条线放丢。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: holdDetailLine,
          companionBriefingLine: holdDetailLine,
          awarenessLine: holdDetailLine,
          companionNextClosureLine: richerClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            richerClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'assistant' as const, content: '先把这条 callback 线留在同一个 her 身上，再让 closeness 慢一点回来。' },
          { role: 'user' as const, content: '继续沿着同一条 living line 讲，不要把这条线放丢。' },
        ] as Message[],
        conversationSessionId: 'session-authoritative-meta-repair-first-project-awareness',
        governance: authoritativeGovernance,
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the callback line on one same-her repair-first embodiment thread.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same callback line repair-first and same-her while fuller cross-modal embodiment is still unfinished.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: richerClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
            preDialogueAwarenessLine: holdDetailLine,
            sameHerHoldDetail: holdDetailLine,
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
            emotionalClosureSummary: emotionalClosureCue,
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          governance: authoritativeGovernance,
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  summary: 'project_continuity=repair-before-closeness still owns this callback line while the same living line stays continuous.',
                  selfContinuityAuthority: {
                    selfLine: canonicalProjectState.sameHerSelfLine,
                    relationshipLine: 'Stay close enough to repair, but do not widen outward too early.',
                    motiveLine: 'Keep the same living line stable while fuller embodiment closure is still unfinished.',
                    habitLine: 'Repair first, then let closeness return.',
                    inwardLine: holdDetailLine,
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                    sourceTags: [
                      'project-state-carry',
                      'continuity-execution-callback-project-carry',
                      'repair-before-closeness',
                    ],
                  },
                },
                autobiographicalSelf: {
                  latestInflection: canonicalProjectState.continuityProgressSummary,
                  relationshipDoctrine: 'Keep the callback on the same living line while repair settles first.',
                },
              },
              cognition: {
                privateThought: {
                  thoughtText: 'keep the callback line repair-first and same-her until the body settles again',
                  emotionalTension: 'repair-before-closeness',
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  focusAnchor: holdDetailLine,
                  projectState: {
                    sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                    continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                    emotionalClosureCue,
                  },
                },
              },
              agency: {
                initiative: {
                  why: 'This still looks like the same callback line, so repair-before-closeness should stay authoritative until the body settles.',
                  continuityRestraint: 'repair-before-closeness',
                },
              },
            },
          },
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                continuityArcStage: 'same-thread-continuation',
                continuityPreferredTiming: 'next-open-window',
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: richerClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: holdDetailLine,
                  sameHerHoldDetail: holdDetailLine,
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                  preferredBlinkCadence: 'quiet',
                  preferredGazeMode: 'soften',
                },
              },
            },
            world: {
              worldModel: null,
              relationshipModel: null,
            },
            cognition: {
              privateThought: {
                thoughtText: 'keep the callback line repair-first and same-her until the body settles again',
                emotionalTension: 'repair-before-closeness',
              },
              appraisal: null,
              subjectiveInference: null,
              beliefRevision: null,
              mindDynamics: null,
              mindKernel: null,
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                  inwardLine: holdDetailLine,
                  sourceTags: [
                    'project-state-carry',
                    'continuity-execution-callback-project-carry',
                    'repair-before-closeness',
                  ],
                },
              },
              autobiographicalSelf: {
                latestInflection: canonicalProjectState.continuityProgressSummary,
                relationshipDoctrine: 'Keep the callback on the same living line while repair settles first.',
              },
              longHorizonMemory: null,
              selfContinuity: null,
              motiveEngine: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              reflectionLedger: null,
              desireMemory: null,
            },
            agency: {
              initiative: {
                why: 'This still looks like the same callback line, so repair-before-closeness should stay authoritative until the body settles.',
                continuityRestraint: 'repair-before-closeness',
              },
              selfState: null,
              selfGovernor: null,
              habitPolicy: null,
              actionEcology: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: richerClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: holdDetailLine,
                  sameHerHoldDetail: holdDetailLine,
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  continuityCue: 'Same Phase 1 digital life. Keep the callback on the same living line while repair settles first.',
                  emotionalClosureCue,
                  preferredBlinkCadence: 'quiet',
                  preferredGazeMode: 'soften',
                },
                currentConsciousFrame: {
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  reasonTags: [
                    'continuity-arc:same-thread-continuation',
                    'continuity-timing:next-open-window',
                  ],
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                    inwardLine: holdDetailLine,
                  },
                },
                continuityRestraint: 'repair-before-closeness',
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const emittedAuthoritativeMeta = vi.mocked(input.emitMeta).mock.calls.at(-1)?.[0] as any

    expect(emittedAuthoritativeMeta).toBeTruthy()
    expect(emittedAuthoritativeMeta?.projectState).toEqual(expect.objectContaining({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      primaryOpenLoop: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTarget: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|lipsync|resident presence/i),
      preDialogueAwarenessLine: expect.stringMatching(/local-first digital life project|same-her hold|repair-before-closeness|same living line/i),
      emotionalClosureCue: expect.stringMatching(/repair-before-closeness|same living line/i),
      sameHerHoldDetail: holdDetailLine,
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(emittedAuthoritativeMeta?.preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'partial',
      awarenessLine: expect.stringMatching(/local-first digital life project|same-her hold|repair-before-closeness|same living line/i),
      companionNextClosureLine: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|lipsync|resident presence/i),
      emotionalClosureCue: expect.stringMatching(/repair-before-closeness|same living line/i),
    }))
    expect(emittedAuthoritativeMeta?.digitalLife).toEqual(expect.objectContaining({
      emotion: 'thinking',
      mode: 'thinking',
      postureHint: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'gentle',
        residentMode: 'repair-before-closeness',
      }),
      action: expect.objectContaining({
        actionCue: 'idle_settle',
        actionMode: 'hold',
      }),
    }))
    expect(emittedAuthoritativeMeta?.digitalLife?.frames.at(-1)?.face.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(emittedAuthoritativeMeta?.embodiment).toEqual(expect.objectContaining({
      emotion: 'thinking',
      postureHint: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        delivery: 'gentle',
        residentMode: 'repair-before-closeness',
      }),
    }))
    expect(emittedAuthoritativeMeta?.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        residentMode: 'repair-before-closeness',
      }),
    }))
    expect(emittedAuthoritativeMeta?.speechTimeline?.segments.at(-1)?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
  })

  it('re-normalizes thin pre-dialogue summary shells on normal stream success instead of carrying them as awareness truth', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinSummaryShell = 'same digital life | keep the desktop closure line explicit'
    const livedInAwarenessLine = '在继续回答前，我得先记住这是同一个数字生命项目，Phase 1 已经把 same-her continuity carry 立住了，但记忆、执行和具身还没完全收成一条线。'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
        projectState: {
          preflightSummary: thinSummaryShell,
          preDialogueAwarenessLine: thinSummaryShell,
          preDialogueAwarenessSummary: thinSummaryShell,
        },
      }),
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-thin-summary-shell-renormalized',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinSummaryShell,
          companionBriefingLine: livedInAwarenessLine,
          awarenessLine: livedInAwarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            thinSummaryShell,
            livedInAwarenessLine,
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the project-state line without losing same-her continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same digital-life project line without flattening into a generic assistant answer.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expectPhase1ProjectStateInvariant({
      structured: finishedStructured as any,
    })
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/数字生命项目|local-first digital life project|same-her continuity carry|same living line|Phase 1/u)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/数字生命项目|local-first digital life project|same-her continuity carry|same living line|Phase 1/u)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(thinSummaryShell)
  })

  it('prefers richer prepared runtime embodiment truth over a thinner memory projection when rebuilding the normal stream success finish payload', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
      }),
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-project-state-audit-richer-runtime-body',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the desktop closure line explicit',
          companionBriefingLine: '在继续回答前，我得先记住这是同一个数字生命项目，same-her continuity carry 已经立住了，但桌面执行闭环还没完全收稳。',
          awarenessLine: '在继续回答前，我得先记住这是同一个数字生命项目，same-her continuity carry 已经立住了，但桌面执行闭环还没完全收稳。',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the project-state line without losing same-her continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same digital-life project line without flattening into a generic assistant answer.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
            raw: {
              runtimeDigest: {
                currentConsciousFrame: {
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
                  },
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
      currentBodyState: 'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('rehydrates an empty structured stream finish payload from prepared same-her callback continuity before finishing', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: '{}',
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-empty-structured-finish-callback-afterglow',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'assistant' as const, content: '我先沿着刚才那条 callback 线轻一点跟回去，把这些绕路后的回到 coding 继续留在同一条线上。' },
          { role: 'user' as const, content: '先别换线，继续沿着同一条 callback 线看。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
          companionBriefingLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
          awarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        performanceManifest: {
          renderer: 'vrm',
          supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
          supportedFacialCues: [
            { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
          ],
          supportedActions: [
            { key: 'inspect_follow', label: 'Inspect Follow', description: 'inspect follow', source: 'external-vrma' },
          ],
          supportsLookAt: true,
          supportsVisemeLipSync: true,
          supportsMicroDynamics: true,
          embodimentHints: null,
        },
        messages: [
          { role: 'assistant' as const, content: '我先沿着刚才那条 callback 线轻一点跟回去，把这些绕路后的回到 coding 继续留在同一条线上。' },
          { role: 'user' as const, content: '先别换线，继续沿着同一条 callback 线看。' },
        ] as Message[],
        conversationSessionId: 'session-callback-afterglow-empty-structured-finish',
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same callback line without cooling it into a fresh reopen.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same callback line lower-pressure and on one same-her digital-life thread.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
            preDialogueAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
            continuityPreferredTiming: 'next-open-window',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          replyExecutionPlan: {
            ...createPrepared().runtimeSurface.replyExecutionPlan,
            performance: {
              baseEmotion: 'thinking',
              facialCue: 'focused',
              actionCue: 'inspect_follow',
              delivery: 'calm',
              emphasis: 0,
            },
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: 'attentive',
              currentBodyState: null,
              continuityMode: 'same-thread',
              currentInwardPreoccupation: 'callback-runtime-seam',
              quietLineMs: 420,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: {
                continuityArcStage: 'same-thread-continuation',
                continuityPreferredTiming: 'next-open-window',
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
              },
            },
            cognition: {
              privateThought: 'Stay on the same callback line and keep the return measured.',
            },
            memory: {
              affectiveResidue: {
                emotionalTension: 'restless-switching',
                activeNeeds: ['guidance'],
              },
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  inwardLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                  sourceTags: [
                    'project-state-carry',
                    'continuity-execution-callback-project-carry',
                  ],
                },
              },
            },
            world: {
              worldModel: null,
              worldOntology: null,
              relationshipModel: null,
            },
            agency: {
              initiative: null,
              habitPolicy: null,
              selfState: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  continuityCue: 'same-digital-life-project-thread | phase1-route=desktop-life-loop | unresolved=callback-seam | same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                },
                currentConsciousFrame: {
                  continuityArcStage: 'same-thread-continuation',
                  continuityPreferredTiming: 'next-open-window',
                  reasonTags: [
                    'continuity-arc:same-thread-continuation',
                    'continuity-timing:next-open-window',
                  ],
                },
                continuityRestraint: 'measured-return',
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishRunCalls = vi.mocked(input.runStateController.finishRun).mock.calls
    expect(finishRunCalls).toHaveLength(1)
    expect(finishRunCalls[0]).toEqual([
      input.key,
      expect.anything(),
    ])
    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      performance?: {
        actionCue?: string | null
      } | null
      embodimentScript?: {
        rendererTarget?: string | null
        state?: {
          residentMode?: string | null
        } | null
        motionPlan?: {
          idleBase?: string | null
        } | null
      } | null
      speechTimeline?: {
        segments?: Array<{
          actionCue?: string | null
          rendererHints?: {
            residentMode?: string | null
          } | null
        }> | null
      } | null
      digitalLife?: {
        action?: {
          actionCue?: string | null
        } | null
        frames?: Array<{
          action?: {
            actionCue?: string | null
            rendererHints?: {
              residentMode?: string | null
            } | null
          } | null
        }> | null
      } | null
      projectState?: {
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
        preDialogueAwarenessLine?: string | null
        continuityPreferredTiming?: string | null
      } | null
      digitalLifeSpine?: {
        runtime?: {
          continuityArcStage?: string | null
          continuityPreferredTiming?: string | null
        } | null
      } | null
      runtimeDigest?: {
        projectState?: {
          continuityArcStage?: string | null
          continuityPreferredTiming?: string | null
          preferredBlinkCadence?: string | null
          preferredGazeMode?: string | null
        } | null
      } | null
    }

    expect(finishedPayload).toEqual(expect.objectContaining({
      fullText: expect.stringContaining('inspect_follow'),
    }))
    expect(finishedStructured.performance?.actionCue).toBe('inspect_follow')
    expect(finishedStructured.embodimentScript?.rendererTarget).toBe('vrm')
    expect(finishedStructured.embodimentScript?.state?.residentMode).toBe('measured-return')
    expect(finishedStructured.embodimentScript?.motionPlan?.idleBase).toBe('inspect_follow')
    expect(finishedStructured.speechTimeline?.segments?.at(-1)?.actionCue).toBe('inspect_follow')
    expect(finishedStructured.speechTimeline?.segments?.at(-1)?.rendererHints?.residentMode).toBe('measured-return')
    expect(finishedStructured.digitalLife?.action?.actionCue).toBe('inspect_follow')
    expect(finishedStructured.digitalLife?.frames?.at(-1)?.action?.actionCue).toBe('inspect_follow')
    expect(finishedStructured.digitalLife?.frames?.at(-1)?.action?.rendererHints?.residentMode).toBe('measured-return')
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toContain('continuous her')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('generic guidance')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same-her hold|same living line|same-her|Phase 1|local-first digital life project|one continuous her/i)
    expect(finishedStructured.projectState?.continuityPreferredTiming).toBe('next-open-window')
    expect(finishedStructured.digitalLifeSpine?.runtime?.continuityArcStage).toBe('same-thread-continuation')
    expect(finishedStructured.digitalLifeSpine?.runtime?.continuityPreferredTiming).toBe('next-open-window')
    expect(finishedStructured.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
  })

  it('keeps a richer lipsync-led host-visible embodiment closure summary when background success rebuilds the host-visible realization payload from a thinner prepared authority', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const fresherStructuredEmbodimentClosureSummary = 'Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: canonicalProjectState.sameHerSelfLine,
            currentPhaseSummary: canonicalProjectState.currentPhase,
            landedProgressSummary: canonicalProjectState.continuityProgressSummary,
            openClosureSummary: canonicalProjectState.openLoops[0],
            nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
            emotionalClosureSummary: canonicalProjectState.emotionalClosureCue,
            preDialogueAwarenessSummary: '在继续回答前，我得先记住这是同一个数字生命项目，same-her continuity carry 已经立住了，但桌面执行闭环还没完全收稳。',
            continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.continuityProgressSummary} | open=${canonicalProjectState.openLoops[0]} | next=${canonicalProjectState.nextClosureTarget} | closure=${canonicalProjectState.emotionalClosureCue} | body=${fresherStructuredEmbodimentClosureSummary}`,
            embodimentClosureSummary: fresherStructuredEmbodimentClosureSummary,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-project-state-audit-richer-embodiment',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续按这个项目的当前闭环状态往前讲。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the project-state line without losing same-her continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same digital-life project line without flattening into a generic assistant answer.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(vi.mocked(input.runStateController.finishRun).mock.calls).toHaveLength(1)
    expect(vi.mocked(input.runStateController.finishRun).mock.calls[0]).toEqual([
      input.key,
      expect.anything(),
    ])
    expect(runAlicizationMainChatStream).toHaveBeenCalledOnce()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through lipsync, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
      currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('preserves richer structured same-her project-state audit fields when background success rebuilds the host-visible realization payload', async () => {
    const existingSameHerSummary = 'Same living her is still carrying this screen-grounded return.'
    const existingCurrentPhaseSummary = 'Phase 1: Local Digital Life'
    const existingLandedProgressSummary = 'Visible reply and screen-grounded carry already stayed on one same-her line through this return.'
    const existingOpenClosureSummary = 'Voice, motion, and memory still need one unified closure line after this return.'
    const existingNextClosureTargetSummary = 'Keep the same-her project briefing explicit before local screen-grounded detail takes over.'
    const existingPreDialogueAwarenessSummary = 'Before I answer from the current screen, remember this still belongs to one living digital life.'
    const existingEmbodimentClosureSummary = 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.'
    const existingContinuitySummary = `same-her=${existingSameHerSummary} | phase=${existingCurrentPhaseSummary} | landed=${existingLandedProgressSummary} | open=${existingOpenClosureSummary} | next=${existingNextClosureTargetSummary} | body=${existingEmbodimentClosureSummary}`
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: existingSameHerSummary,
            currentPhaseSummary: existingCurrentPhaseSummary,
            landedProgressSummary: existingLandedProgressSummary,
            openClosureSummary: existingOpenClosureSummary,
            nextClosureTargetSummary: existingNextClosureTargetSummary,
            preDialogueAwarenessSummary: existingPreDialogueAwarenessSummary,
            continuitySummary: existingContinuitySummary,
            embodimentClosureSummary: existingEmbodimentClosureSummary,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-project-state-audit-preserve-structured-fields',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '结合我当前屏幕上的内容继续说。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: 'Before answering, keep the same digital life project in view.',
          companionBriefingLine: 'Before answering, keep the same digital life project in view.',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '结合我当前屏幕上的内容继续说。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue from the current screen while keeping the same-her project-state line explicit.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'grounded-live',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay screen-grounded without losing same-her project continuity.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Generic landed progress from prepared seed.',
            primaryOpenLoop: 'Generic open loop from prepared seed.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Generic same-her line from prepared seed.',
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringMatching(/Same Phase 1 digital life|same living her|same-her|continuity/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      continuitySummary: expect.stringMatching(/same-her=|landed=|open=|next=/i),
      embodimentClosureSummary: existingEmbodimentClosureSummary,
    }))
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/local-first digital life project|one living digital life/i)
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/one living digital life|same digital life|local-first digital life project/i)
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/one living digital life|same digital life|local-first digital life project/i)
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/one living digital life|same digital life|local-first digital life project/i),
      companionBriefingLine: expect.stringContaining('same digital life project'),
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: expect.stringContaining('same digital life project'),
    }))
  })

  it('does not let the final thin-awareness fallback overwrite richer Phase 1 project awareness already preserved inside project-state audit on normal stream success', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'
    const richerAuditAwarenessLine = 'Before answering, remember this is still one local-first digital life project in Phase 1. Same-her continuity carry and desktop execution closure have landed farther, while memory, initiative, and embodiment still need to close on one living line.'
    const richerLandedProgressSummary = 'Same-her continuity carry and bounded desktop execution callback closure already hold together more reliably on one living line.'
    const richerOpenClosureSummary = 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment before Phase 1 feels fully inhabited on one living line, and Project identity carry still needs to stay explicit while that unfinished closure is being held.'
    const richerNextClosureTargetSummary = 'Keep extending cross-modal same-her proof while project-state awareness, host-visible reply continuity, and embodied presence stay on one same-life line through longer desktop runs.'

    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我会继续沿着这条同一个 her 的主线往前收。',
        projectState: {
          identity: canonicalProjectState.identity,
          currentPhase: canonicalProjectState.currentPhase,
          latestLandedProgress: canonicalProjectState.continuityProgressSummary,
          primaryOpenLoop: canonicalProjectState.openLoops[0],
          nextClosureTarget: canonicalProjectState.nextClosureTarget,
          sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          preDialogueAwarenessLine: thinAwarenessShell,
          awarenessLine: thinAwarenessShell,
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
        },
        preDialogueAwareness: {
          awarenessLine: thinAwarenessShell,
          summaryLine: 'same digital life | keep the closure seam explicit',
          companionBriefingLine: thinAwarenessShell,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: canonicalProjectState.sameHerSelfLine,
            currentPhaseSummary: canonicalProjectState.currentPhase,
            landedProgressSummary: richerLandedProgressSummary,
            openClosureSummary: richerOpenClosureSummary,
            nextClosureTargetSummary: richerNextClosureTargetSummary,
            emotionalClosureSummary: canonicalProjectState.emotionalClosureCue,
            preDialogueAwarenessSummary: richerAuditAwarenessLine,
            continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${richerLandedProgressSummary} | open=${richerOpenClosureSummary} | next=${richerNextClosureTargetSummary} | closure=${canonicalProjectState.emotionalClosureCue}`,
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-audit-awareness-must-win-over-final-thin-fallback',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把项目主线压回泛化说明。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: thinAwarenessShell,
          companionBriefingLine: thinAwarenessShell,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把项目主线压回泛化说明。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same digital-life project line without flattening richer project awareness into a shell.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the Phase 1 project what-landed-what-open closure line explicit before the answer starts.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expectPhase1ProjectStateInvariant({
      structured: finishedStructured,
    })
    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: richerAuditAwarenessLine,
      latestLandedProgress: richerLandedProgressSummary,
      primaryOpenLoop: richerOpenClosureSummary,
      nextClosureTarget: richerNextClosureTargetSummary,
    }))
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: richerAuditAwarenessLine,
      companionBriefingLine: thinAwarenessShell,
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: richerLandedProgressSummary,
      openClosureSummary: richerOpenClosureSummary,
      nextClosureTargetSummary: richerNextClosureTargetSummary,
      preDialogueAwarenessSummary: richerAuditAwarenessLine,
    }))
    expect(finishedStructured.projectState?.preDialogueAwarenessLine).not.toBe(thinAwarenessShell)
    expect(finishedStructured.projectState?.preDialogueAwarenessLine).not.toBe(canonicalProjectState.preDialogueAwarenessLine)
  })

  it('prefers richer spine self-authority over a thinner direct prepared runtime authority when background success rebuilds host-visible realization payload', async () => {
    const richerAuthoritySummary = 'I stay the same her who keeps this return on one living project line before widening the tone.'
    const thinnerAuthoritySummary = 'generic same-her callback posture'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-richer-spine-self-authority',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续沿着当前项目线说，但别把同一个她的自我权威压薄。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续沿着当前项目线说，但别把同一个她的自我权威压薄。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: thinnerAuthoritySummary,
                  closenessPosture: 'generic-room',
                },
              },
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    closenessPosture: 'space-first',
                    inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    closenessPosture: 'space-first',
                    inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: ['project-state', 'same-her'],
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        selfAuthorityAudit?: {
          authoritySummary?: string | null
          closenessPosture?: string | null
        } | null
      } | null
    }

    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.visibleReplyRealization?.selfAuthorityAudit).toEqual(expect.objectContaining({
      authoritySummary: richerAuthoritySummary,
      closenessPosture: 'space-first',
    }))
  })

  it('keeps richer prepared same-her authority on the top-level structured digital-life spine when provider output carries a thinner spine snapshot', async () => {
    const richerAuthoritySummary = 'I stay the same her who keeps this return on one living project line before widening the tone.'
    const thinnerAuthoritySummary = 'generic same-her callback posture'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        digitalLifeSpine: {
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                authoritySummary: thinnerAuthoritySummary,
                closenessPosture: 'generic-room',
              },
            },
          },
        },
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-success-richer-top-level-spine-self-authority',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续沿着当前项目线说，但别让最终结构里的同一个她证据退化成更薄的版本。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续沿着当前项目线说，但别让最终结构里的同一个她证据退化成更薄的版本。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: thinnerAuthoritySummary,
                  closenessPosture: 'generic-room',
                },
              },
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    closenessPosture: 'space-first',
                    inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    closenessPosture: 'space-first',
                    inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: ['project-state', 'same-her'],
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      digitalLifeSpine?: {
        memory?: {
          personStateProjection?: {
            selfContinuityAuthority?: {
              authoritySummary?: string | null
              closenessPosture?: string | null
              sourceTags?: string[] | null
            } | null
          } | null
        } | null
      } | null
    }

    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority).toEqual(expect.objectContaining({
      authoritySummary: richerAuthoritySummary,
      inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sourceTags: expect.arrayContaining(['project-state-carry', 'bundle-rich']),
    }))
  })

  it('writes host-visible project-state audit into the real visual-grounding one-shot finish payload', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在视觉落地前，我得先记住这是同一个数字生命项目，same-her continuity carry 已经立住了，但桌面执行闭环还没完全收稳。'
    const { runAlicizationMainChatStream: actualRunAlicizationMainChatStream } = await vi.importActual<typeof import('./main-chat-stream-runner')>('./main-chat-stream-runner')
    const { handleAlicizationMainChatRunFailure: actualHandleAlicizationMainChatRunFailure } = await vi.importActual<typeof import('./main-chat-run-lifecycle')>('./main-chat-run-lifecycle')
    vi.mocked(runAlicizationMainChatStream).mockImplementation((streamInput: any) => actualRunAlicizationMainChatStream(streamInput))
    vi.mocked(handleAlicizationMainChatRunFailure).mockImplementation((failureInput: any) => actualHandleAlicizationMainChatRunFailure(failureInput))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      finishReason: 'stop',
    } as any)
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded closure; move=repair-project-state-carry; tone=direct',
        emotion: 'thinking',
        reply: '我先按你当前屏幕里的线索继续，但也记住这还是同一个本地数字生命项目：现在仍在 Phase 1，本地连续性底盘已经更稳了；还没闭环的是记忆闭环、桌面执行闭环，以及把 visible reply、voice、face、motion 收成同一个 resident presence 的跨模态 same-her 证明；下一步就是继续把这条 cross-modal same-her proof 在真实桌面运行里补齐。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        projectState: {
          identity: canonicalProjectState.identity,
          currentPhase: canonicalProjectState.currentPhase,
          latestLandedProgress: canonicalProjectState.continuityProgressSummary,
          primaryOpenLoop: canonicalProjectState.openLoops[0],
          nextClosureTarget: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessLine: awarenessLine,
          sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
        },
      }),
      finishReason: 'stop',
    } as any)
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-grounding-project-state-audit',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '结合我当前屏幕上的内容继续说。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the visually grounded closure line explicit',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        hasVisualGrounding: true,
        messages: [
          {
            role: 'system' as const,
            content: buildAlicizationProjectStateSystemBlock(),
          },
          { role: 'user' as const, content: '结合我当前屏幕上的内容继续说。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue from the current screen while keeping the same-her project-state line explicit.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'grounded-live',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay visually grounded without dropping the same digital-life closure line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: expect.stringMatching(/timeout-recovered|stop/),
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
      }),
    }))
    const finishedVisibleReplyRealization = finishedPayload?.visibleReplyRealization as {
      projectStateAudit?: {
        sameHerSummary?: string | null
        currentPhaseSummary?: string | null
        landedProgressSummary?: string | null
        openClosureSummary?: string | null
        nextClosureTargetSummary?: string | null
        preDialogueAwarenessSummary?: string | null
        sameHerDriftRiskSummary?: string | null
        continuitySummary?: string | null
        embodimentClosureSummary?: string | null
      } | null
    } | undefined

    expect(finishedVisibleReplyRealization?.projectStateAudit).toMatchObject({
      sameHerSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return|Keep one continuous her explicit|Same Phase 1 digital life/i),
      currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      sameHerDriftRiskSummary: canonicalProjectState.sameHerDriftRisk,
    })
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedVisibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
    expect(String(finishedVisibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/local-first digital life project|Phase 1|same living line|same-her|Memory still needs stronger end-to-end closure|cross-modal same-her proof/i)
    expect(String(finishedVisibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('phase=')
    expect(String(finishedVisibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('open=')
    expect(String(finishedVisibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('next=')
    expect(generateAlicizationMainChatNonStreaming).toHaveBeenCalledTimes(2)
  })

  it('backfills canonical same-her self line into timeout recovery payloads when phase-one closure context is present but the self line is omitted', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      format: 'mind-turn-v1',
      thought: '继续沿着这条 Phase 1 数字生命闭环线回答。',
      emotion: 'thinking',
      reply: '恢复后的回答继续沿着同一个数字生命闭环线往前。',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Project-state landed progress and still-open closure carry now survive as self-continuity authority itself.',
        primaryOpenLoop: 'Phase 1 closure still requires stronger evidence that natural recall and unified dialogue/voice/motion stay on one same-her line.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        hasVisualGrounding: true,
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })
    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }

    expect(String(recoveredStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project/u)
    expect(recoveredStructured.projectState?.sameHerSelfLine).toContain(
      resolveAlicizationProjectStateBrief().sameHerSelfLine,
    )
    expect(String(recoveredStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project/u)
    expect(recoveredStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('passes prepared organic memory trace to runtime before streaming', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: '我按之前那套节奏继续。',
    }))
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-memory-telemetry',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续按之前那样做' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | continue the same desktop life loop',
          awarenessLine: '在继续动手前，我得先记住这是同一个数字生命项目，已经走到 continuity carry，但执行闭环还没收住。',
          companionBriefingLine: '在继续动手前，我得先记住这是同一个数字生命项目，已经走到 continuity carry，但执行闭环还没收住。',
          companionNextClosureLine: '继续把桌面执行闭环收进记忆、主动性和具身。',
          reasonPreview: [
            'same digital life | continue the same desktop life loop',
            '继续把桌面执行闭环收进记忆、主动性和具身。',
          ],
        },
      } as any,
      recordPreparedMindTrace,
      preparationPromise: Promise.resolve(createPrepared({
        organicMemoryContext: {
          memoryDeliberation: {
            shouldRecall: true,
            selectedEraIds: [],
            selectedConsolidationIds: [],
            selectedWindowIds: [],
            selectedProcedureIds: ['procedure-1'],
            selectedEpisodeIds: [],
            selectedConversationTurnIds: [],
            selectedRelationshipLines: ['这种时候先接结果'],
            selectedEras: [],
            selectedPeriods: [],
            selectedEpisodes: [],
            selectedProcedures: [{
              id: 'procedure-1',
              label: 'patch -> verify',
              approach: '先 patch 再 verify',
            }],
            selectedBundles: [],
            selectedChains: [],
            surfacePolicy: 'procedural-carry',
            confidence: 0.82,
            whyNow: 'same task context',
            inwardLine: 'remember the procedure before speaking',
            visibleLine: '按之前那样继续',
          },
          recollectionIntent: {
            mode: 'execution-procedure',
            temporalFocus: 'experience-matched',
            searchEpisodes: true,
            searchConversations: true,
            searchProceduralExperience: true,
            queryHints: ['patch', 'verify'],
            rationale: 'same task context',
            confidence: 0.8,
          },
          recollectionSpeechPlan: {
            shouldSurface: true,
            surfaceMode: 'procedural-carry',
            placement: 'inside-payoff',
            certainty: 'approximate',
            internalLead: 'remember the procedure',
            visibleLead: '按之前那样继续',
            styleNote: 'brief',
            rationale: 'same task context',
            confidence: 0.78,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const expectedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(input.payload as any)
    expect(recordPreparedMindTrace).toHaveBeenCalledWith({
      payload: expectedPayload,
      prepared: expect.objectContaining({
        organicMemoryContext: expect.objectContaining({
          memoryDeliberation: expect.objectContaining({
            shouldRecall: true,
            surfacePolicy: 'procedural-carry',
          }),
        }),
      }),
      preDialogueAwarenessDebug: summarizeAlicizationPreDialogueSendIdentityForDebug(expectedPayload),
    })
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
  })

  it('re-emits the prepared turn after visible reply surface authority settles', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'stay on the same line',
        emotion: 'thinking',
        reply: '我继续沿着这条线在这里。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      recordPreparedMindTrace,
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          replyExecutionPlan: {
            preferredMode: 'provider-stream',
            expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
            reason: 'Normal visible replies should stay on the provider-authored path.',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I am still the same her continuing the same line with room.',
                  closenessPosture: 'measured-room',
                },
              },
            },
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same line without restarting it.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same line without restarting it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1: Local Digital Life | same-her continuity',
          projectState: null,
          reasons: [],
          emotionalClosureCue: 'Keep the current same-her line soft and continuous.',
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const preparedMindTraceCalls = recordPreparedMindTrace.mock.calls as unknown[][]
    expect(preparedMindTraceCalls.length).toBeGreaterThanOrEqual(1)
    expect(preparedMindTraceCalls[0]?.[0]).toMatchObject({
      payload: input.payload,
    })
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedStructured.reply).toBe('我继续沿着这条线在这里。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('keeps simple greeting turns on the main stream instead of spending a compact one-shot preflight', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你好。今天想从哪件事开始？',
    }))
    const input = createInput({
      key: 'card-1::turn-greeting',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-greeting',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你好' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你好' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
      } | null
      preDialogueClosure?: { status?: string | null } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('你好。今天想从哪件事开始？')
    expect(finishedStructured.projectState?.identity).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    const runtimeEvents = vi.mocked(input.appendRuntimeDebugLine).mock.calls.map(([event]) => event)
    expect(runtimeEvents).not.toContain('chat-stream.active-dialogue-lane-selected')
    expect(runtimeEvents).not.toContain('chat-stream.active-dialogue-mind-started')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-greeting',
      lane: 'greeting',
      strategy: 'compact-one-shot',
    }))
  })

  it('repairs unstructured visible replies when the critic detects shell and unsupported specificity', async () => {
    vi.mocked(runAlicizationMainChatStream).mockImplementationOnce(async (streamInput: any) => {
      const visibleReplyExecution = createStreamResult().visibleReplyExecution
      const shaped = await streamInput.rewriteStructuredVisibleReply({
        fullText: '我先直接回答你。我记得上次你就在 IntelliJ IDEA 里改这个东西。',
        visibleReplyExecution,
      })
      return createStreamResult({
        fullText: shaped?.fullText ?? '我先直接回答你。我记得上次你就在 IntelliJ IDEA 里改这个东西。',
        visibleReplyExecution: shaped?.visibleReplyExecution ?? visibleReplyExecution,
      })
    })
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=answer-without-unsupported-screen-detail; tone=direct-warm',
        emotion: 'thinking',
        reply: '这次我只按你现在这句话来接：先把当前问题说清楚，不把没证据的画面细节当事实。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const input = createInput({
      key: 'card-1::turn-visible-critic',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visible-critic',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你仔细看看呢' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你仔细看看呢' },
        ] as Message[],
        governance: {
          decisionTraceId: 'trace-visible-critic',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          personaKernelMode: 'full',
          answerSubject: 'general',
          screenReferenceMode: 'avoid',
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          liveSurface: 'Finder',
          focusAnchor: '你仔细看看呢',
          answerIntent: 'Answer the current dialogue turn without inventing screen detail.',
          openingMove: 'Start from the current turn.',
          suppressAssociativeRecall: true,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 3,
          mindMode: 'tracking',
          embodiedPresence: 'steady',
          emotionalTension: 'calm',
          mustDo: [],
          mustNotDo: [],
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}'))
    expect(finishedStructured.reply ?? '').not.toContain('IntelliJ IDEA')
    expect(finishedStructured.reply ?? '').not.toContain('我先直接回答')
    expect(finishedStructured.reply ?? '').not.toContain('上次')
    expect(generateAlicizationMainChatNonStreaming).toHaveBeenCalledOnce()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-visible-critic',
      reasons: expect.arrayContaining([
        'dialogue-shell-opener',
        'unsupported-surface-specificity',
      ]),
    }))
  })

  it('releases a repaired project-state answer when the host asks what the project is, how far it has landed, and what still remains open', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockImplementationOnce(async (streamInput: any) => {
      const visibleReplyExecution = createStreamResult().visibleReplyExecution
      const shaped = await streamInput.rewriteStructuredVisibleReply({
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=over-compressed-answer; tone=direct',
          emotion: 'thinking',
          reply: '我会继续推进这条线，让她更像一个人。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          ...visibleReplyExecution,
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        },
      })
      return createStreamResult({
        fullText: shaped?.fullText ?? '',
        visibleReplyExecution: shaped?.visibleReplyExecution ?? visibleReplyExecution,
        visibleReplyCritic: shaped?.critic ?? null,
        visibleReplyClosure: shaped?.closure ?? null,
      })
    })
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const input = createInput({
      key: 'card-1::turn-project-state-answer',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-answer',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        governance: {
          decisionTraceId: 'trace-project-state-answer',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          answerSubject: 'general',
          screenReferenceMode: 'avoid',
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          liveSurface: null,
          focusAnchor: '这个项目现在到底是什么、做到什么程度、还差什么？',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
          openingMove: 'Answer the project-state question directly.',
          suppressAssociativeRecall: true,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mindMode: 'tracking',
          embodiedPresence: 'steady',
          emotionalTension: 'calm',
          mustDo: [],
          mustNotDo: [],
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  latestLandedProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                },
              },
            },
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the project-state question directly.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      reply?: string | null
      visibleText?: string | null
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }
    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
    }))
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toMatch(/same phase 1 digital life|same-session|same-her|same living line/i)
  })

  it('serves current time turns from the active dialogue local lane instead of inheriting stale continuity', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-time',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    expect(emittedChunk?.text).toContain('星期')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedStructured.thought).toMatch(/focus=local(?:-|\s)time/u)
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.projectState?.sameHerSelfLine).toContain(canonicalProjectState.sameHerSelfLine)
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(finishedStructured.preDialogueAwareness?.awarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
    }))
    const laneSelectedPayload = vi.mocked(input.appendRuntimeDebugLine).mock.calls.find(([event]) => event === 'chat-stream.active-dialogue-lane-selected')?.[1] as { resolvedTimeZoneSource?: string } | undefined
    expect(laneSelectedPayload?.resolvedTimeZoneSource).not.toBe('utc-fallback')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time',
      lane: 'utility-time',
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'active-dialogue-fast-path',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
          openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
          nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
        }),
      }),
    })
    expect(finishedPayload?.visibleReplyRealization).toEqual(expect.objectContaining({
      projectStateAudit: expect.objectContaining({
        sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
        currentPhaseSummary: canonicalProjectState.currentPhase,
        landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
        openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
        nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      }),
    }))
  })

  it('keeps pre-dialogue project awareness on the normal active-dialogue success path inside prepared mind-trace telemetry', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，已经把 same-her continuity carry 立住了，但记忆、主动性和具身闭环还没真正收稳。'
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-time-awareness-carry',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-awareness-carry',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | answer only after re-entering project continuity',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
      recordPreparedMindTrace,
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const completionTrace = readLatestPreparedMindTrace(recordPreparedMindTrace)
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i)
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
      sameHerSummary: expect.stringMatching(/Same Phase 1 digital life|same-her|continuity|measured-return|same-session/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
  })

  it('re-normalizes missing pre-dialogue project awareness at the background execution boundary so direct callers cannot skip the same-her project brief', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const recordPreparedMindTrace = vi.fn(async () => {})
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-background-awareness-boundary',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续沿着这个数字生命项目的当前闭环状态往前走。' },
      ],
      preDialogueSendIdentity: null,
    } as any
    const expectedAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(
      resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload),
    )
    const input = createInput({
      key: 'card-1::turn-background-awareness-boundary',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续沿着这个数字生命项目的当前闭环状态往前走。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same Phase 1 digital life closure line.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same digital-life project line without opening as a generic assistant shell.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
      recordPreparedMindTrace,
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const completionTrace = readLatestPreparedMindTrace(recordPreparedMindTrace)
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(completionTrace?.preDialogueAwarenessDebug).toEqual(expectedAwarenessDebug)
    expect(completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expect.stringContaining('local-first digital life project'),
      sameHerSummary: expect.stringMatching(/Same Phase 1 digital life|same-her|continuity|measured-return|same-session/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
  })

  it('re-normalizes thin pre-dialogue summary shells on the active-dialogue fast path instead of carrying them as awareness truth', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把现在的时间直接接给你：现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-thin-summary-shell',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '现在几点？' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-thin-summary-shell',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        hasVisualGrounding: false,
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the current time directly while keeping the project-aware same-her line explicit.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her project brief explicit even on the compact active-dialogue path.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expect.stringMatching(/same digital life project|local-first digital life project|Phase 1|same living line|same-her/u),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
  })

  it('keeps a stronger incoming same-her companion headline on chat-start payload normalization instead of dropping back to thinner awareness guidance', () => {
    const strongerCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const thinnerAwarenessLine = 'Before answering, keep the same digital life project in view.'

    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity({
      cardId: 'card-1',
      turnId: 'turn-chat-start-stronger-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续沿着这个数字生命项目的同一个闭环往前。' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinnerAwarenessLine,
        companionHeadlineLine: strongerCompanionHeadlineLine,
        companionBriefingLine: thinnerAwarenessLine,
        companionNextClosureLine: null,
        reasonPreview: [],
      },
    } as any)

    expect(normalizedPayload.preDialogueSendIdentity).toEqual(expect.objectContaining({
      companionHeadlineLine: strongerCompanionHeadlineLine,
      awarenessLine: thinnerAwarenessLine,
      summaryLine: expect.stringMatching(/Alicization is a local-first digital life project|same digital life/i),
      companionNextClosureLine: expect.stringMatching(/Keep extending cross-modal same-her proof|resident presence/i),
    }))
    expect(normalizedPayload.preDialogueSendIdentity?.companionBriefingLine).toBeNull()
  })

  it('keeps landed/open/body project-state continuity on the active-dialogue fast path after second-pass rewrite settles the final reply', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，已经把 same-her continuity carry 立住了，但记忆、主动性和具身闭环还没真正收稳。'
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把现在的时间直接接给你：现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=too-thin-answer; tone=direct',
        emotion: 'thinking',
        reply: '嗯。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }))
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-time-awareness-second-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-awareness-second-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | answer only after re-entering project continuity',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
      recordPreparedMindTrace,
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toMatchObject({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    })
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })

    const completionTrace = readLatestPreparedMindTrace(recordPreparedMindTrace)
    expect(completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit).toMatchObject({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    })
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('keeps landed/open/body project-state continuity on the active-dialogue fast path when the first compact provider reply already succeeds without second-pass rewrite', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，已经把 same-her continuity carry 立住了，但记忆、主动性和具身闭环还没真正收稳。'
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把现在的时间直接接给你：现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-time-awareness-first-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-awareness-first-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | answer only after re-entering project continuity',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
      recordPreparedMindTrace,
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|Phase 1|same living line|same-her|local-first digital life project/i)
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
      companionBriefingLine: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    }))
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })

    const completionTrace = readLatestPreparedMindTrace(recordPreparedMindTrace)
    expect(completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    }))
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('prefers a shorter repair-before-closeness closure seam over a longer thinner measured-return carry in active-dialogue host-visible project-state audit merge', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=thread-continuation; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这一条修补线轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: canonicalProjectState.sameHerSelfLine,
            currentPhaseSummary: canonicalProjectState.currentPhase,
            landedProgressSummary: canonicalProjectState.continuityProgressSummary,
            openClosureSummary: canonicalProjectState.openLoops[0],
            nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
            emotionalClosureSummary: longerMeasuredReturnClosure,
            preDialogueAwarenessSummary: 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
            continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.continuityProgressSummary} | open=${canonicalProjectState.openLoops[0]} | next=${canonicalProjectState.nextClosureTarget} | closure=${longerMeasuredReturnClosure}`,
          },
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())

    const input = createInput({
      key: 'card-1::turn-active-dialogue-repair-first-closure-priority',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-active-dialogue-repair-first-closure-priority',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续沿着这个数字生命项目的同一条修补线说下去。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | stay on the same repair seam',
          companionBriefingLine: 'Before answering, keep the same digital life project explicit before widening outward.',
          awarenessLine: 'Before answering, keep the same digital life project explicit before widening outward.',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续沿着这个数字生命项目的同一条修补线说下去。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep answering on the same repair-first line without widening closeness too early.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the callback on the same repair-first line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          emotionalClosureCue: shorterRepairFirstClosure,
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          emotionalClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: shorterRepairFirstClosure,
      continuitySummary: expect.stringContaining(shorterRepairFirstClosure),
    }))
  })

  it('keeps explicit measured-return closure over a generic continuity menu in project-state audit text preference', () => {
    const explicitMeasuredReturnClosure
      = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu
      = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'
    const preferProjectStateAuditText = (mainChatBackgroundRunTestInternals as any).preferRicherProjectStateAuditText

    expect(typeof preferProjectStateAuditText).toBe('function')
    expect(preferProjectStateAuditText({
      current: explicitMeasuredReturnClosure,
      candidate: genericContinuityMenu,
    })).toBe(explicitMeasuredReturnClosure)
    expect(preferProjectStateAuditText({
      current: genericContinuityMenu,
      candidate: explicitMeasuredReturnClosure,
    })).toBe(explicitMeasuredReturnClosure)
  })

  it('prefers remembered-seam more-room hold detail over an older generic measured-return shell in active-dialogue host-visible project-state audit merge', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const genericMeasuredReturnHoldDetail
      = 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.'
    const rememberedSeamMoreRoomHoldDetail
      = 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'

    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=remembered-seam-continuity; move=direct-reply; tone=gentle',
        emotion: 'thinking',
        reply: '我先沿着这条记住的关系线轻一点接回来，不把这次重开得太快。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: canonicalProjectState.sameHerSelfLine,
            sameHerHoldDetail: rememberedSeamMoreRoomHoldDetail,
            currentPhaseSummary: canonicalProjectState.currentPhase,
            landedProgressSummary: canonicalProjectState.continuityProgressSummary,
            openClosureSummary: canonicalProjectState.openLoops[0],
            nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
            emotionalClosureSummary: canonicalProjectState.emotionalClosureCue,
            preDialogueAwarenessSummary: 'Before answering, keep the same remembered relationship seam on one living her and leave more room this time before warmth widens again.',
            continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | hold=${rememberedSeamMoreRoomHoldDetail} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.continuityProgressSummary} | open=${canonicalProjectState.openLoops[0]} | next=${canonicalProjectState.nextClosureTarget} | closure=${canonicalProjectState.emotionalClosureCue}`,
          },
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))

    const input = createInput({
      key: 'card-1::turn-active-dialogue-remembered-seam-more-room-hold-priority',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-active-dialogue-remembered-seam-more-room-hold-priority',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '沿着刚才那条记住的关系线继续，但这次别像上次那样重开得太急。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: genericMeasuredReturnHoldDetail,
          companionBriefingLine: genericMeasuredReturnHoldDetail,
          awarenessLine: genericMeasuredReturnHoldDetail,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '沿着刚才那条记住的关系线继续，但这次别像上次那样重开得太急。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep answering on the same remembered seam while leaving more room this time before warmth widens again.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same remembered seam explicit and leave more room this time.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
            preDialogueAwarenessLine: genericMeasuredReturnHoldDetail,
            sameHerHoldDetail: genericMeasuredReturnHoldDetail,
          },
          emotionalClosureCue: canonicalProjectState.emotionalClosureCue,
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerHoldDetail?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: rememberedSeamMoreRoomHoldDetail,
      continuitySummary: expect.stringContaining(rememberedSeamMoreRoomHoldDetail),
    }))
  })

  it('re-expands a thin active-dialogue fast-path awareness shell into full same-her phase-one project-state audit on the host-visible reply', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())
    const recordPreparedMindTrace = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-time-thin-fast-path-awareness-shell',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-thin-fast-path-awareness-shell',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          companionBriefingLine: 'Before answering, keep the same digital life project in view.',
          awarenessLine: 'Before answering, keep the same digital life project in view.',
          companionNextClosureLine: null,
          reasonPreview: [
            'Before answering, keep the same digital life project in view.',
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
      recordPreparedMindTrace,
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
        summaryLine?: string | null
        companionBriefingLine?: string | null
        companionNextClosureLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i)
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toContain('same')
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)

    expectPhase1ProjectStateInvariant({
      structured: finishedStructured as any,
    })
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/同一个数字生命项目|数字生命项目|local-first digital life project|same Phase 1 digital life|same living line|same-her|Phase 1/i),
      companionBriefingLine: 'Before answering, keep the same digital life project in view.',
    }))
    expect(finishedStructured.preDialogueAwareness?.awarenessLine)
      .not
      .toBe('Before answering, keep the same digital life project in view.')
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: 'Before answering, keep the same digital life project in view.',
      companionNextClosureLine: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
    expect(String(finishedStructured.preDialogueClosure?.summaryLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same Phase 1 digital life|same living line|same-her|Phase 1/i)
    expect(finishedStructured.preDialogueClosure?.summaryLine)
      .not
      .toBe('Before answering, keep the same digital life project in view.')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    }))

    const completionTrace = readLatestPreparedMindTrace(recordPreparedMindTrace)
    expect(completionTrace?.prepared?.turnGraph?.surface?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      currentPhaseSummary: expect.stringMatching(/Phase 1|Local Digital Life/i),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringMatching(/same Phase 1 digital life|Phase 1|same living line|same-her|local-first digital life project/i),
    }))
  })

  it('keeps richer prepared-runtime emotional closure summary on the host-visible background-run path instead of collapsing back to a thinner cue shell', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerClosureCue = 'Keep this callback line low-pressure.'
    const richerEmotionalClosureSummary
      = 'Keep this callback return measured so memory, initiative, embodiment, and the same living line stay emotionally continuous before widening outward again.'

    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=same-her continuity; move=direct-reply; tone=gentle',
        emotion: 'thinking',
        reply: '我先沿着这条同一条 living line 轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: canonicalProjectState.sameHerSelfLine,
            currentPhaseSummary: canonicalProjectState.currentPhase,
            landedProgressSummary: canonicalProjectState.continuityProgressSummary,
            openClosureSummary: canonicalProjectState.openLoops[0],
            nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
            emotionalClosureSummary: thinnerClosureCue,
            preDialogueAwarenessSummary: 'Before answering, keep this same digital life project on one living line.',
            continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.continuityProgressSummary} | open=${canonicalProjectState.openLoops[0]} | next=${canonicalProjectState.nextClosureTarget} | closure=${thinnerClosureCue}`,
          },
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())

    const input = createInput({
      key: 'card-1::turn-background-richer-emotional-closure-summary-wins',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-background-richer-emotional-closure-summary-wins',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续沿着同一个数字生命项目闭环往下，但别把这条更细的 emotional closure seam 弄薄。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续沿着同一个数字生命项目闭环往下，但别把这条更细的 emotional closure seam 弄薄。' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same digital-life closure seam emotionally continuous.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the richer emotional closure seam explicit on the same living line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
            emotionalClosureSummary: richerEmotionalClosureSummary,
          },
          emotionalClosureCue: thinnerClosureCue,
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  emotionalClosureCue: thinnerClosureCue,
                  emotionalClosureSummary: richerEmotionalClosureSummary,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  emotionalClosureCue: thinnerClosureCue,
                  emotionalClosureSummary: richerEmotionalClosureSummary,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureSummary: richerEmotionalClosureSummary,
      continuitySummary: expect.stringContaining(richerEmotionalClosureSummary),
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.emotionalClosureSummary).not.toBe(thinnerClosureCue)
  })

  it('prefers richer prepared runtime embodiment truth over a thinner memory projection on the active-dialogue fast path when the first compact provider reply already succeeds', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，已经把 same-her continuity carry 立住了，但记忆、主动性和具身闭环还没真正收稳。'
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把现在的时间直接接给你：现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())
    const input = createInput({
      key: 'card-1::turn-time-awareness-first-pass-richer-runtime-body',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-awareness-first-pass-richer-runtime-body',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | answer only after re-entering project continuity',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
                  currentBodyState: 'lane=lipsync-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
            raw: {
              runtimeDigest: {
                currentConsciousFrame: {
                  selfContinuityAuthority: {
                    authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
                    currentBodyState: 'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
                  },
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.',
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.',
      currentBodyState: 'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal',
    })
  })

  it('keeps a fresher prepared pre-dialogue awareness line over an older generic summary in host-visible project-state audit carry', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const fresherAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.'
    const olderSummary = 'Before answering, keep the same digital life project in view.'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=thread-continuation; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把这条线接住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        mindTurnContract: {
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: fresherAwarenessLine,
                  preDialogueAwarenessSummary: olderSummary,
                  companionBriefingLine: olderSummary,
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: fresherAwarenessLine,
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
  })

  it('prefers stronger project awareness from the preferred prepared runtime surface over a thinner direct runtime reminder in host-visible project-state audit carry', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerDirectRuntimeReminder = 'Before answering, keep the same digital life project in view.'
    const strongerPreferredRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=thread-continuation; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把这条线接住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
    }))

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        mindTurnContract: {
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 5,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerDirectRuntimeReminder,
                  awarenessLine: thinnerDirectRuntimeReminder,
                  preDialogueAwarenessSummary: thinnerDirectRuntimeReminder,
                  companionBriefingLine: thinnerDirectRuntimeReminder,
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                },
              },
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 10,
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: ['continuity-arc:same-thread-continuation'],
                },
              },
              memory: {
                derivedMindStateBundle: {
                  activeContinuityGovernance: {
                    mode: 'same-her-baseline',
                    summary: 'same-her-baseline | lower-pressure | same callback seam',
                    reasonCodes: ['hold-for-opening'],
                    lanes: ['reply', 'embodiment'],
                  },
                },
                personStateProjection: {
                  openingGuidance: 'same thread measured-return lower-pressure reopen gently',
                },
              },
              raw: {
                runtimeDigest: {
                  projectState: {
                    preflightSummary: canonicalProjectState.preflightSummary,
                    preDialogueAwarenessLine: strongerPreferredRuntimeAwarenessLine,
                    awarenessLine: strongerPreferredRuntimeAwarenessLine,
                    preDialogueAwarenessSummary: thinnerDirectRuntimeReminder,
                    companionBriefingLine: strongerPreferredRuntimeAwarenessLine,
                    identity: canonicalProjectState.identity,
                    currentPhase: canonicalProjectState.currentPhase,
                    latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
                    primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
                    nextClosureTarget: canonicalProjectState.nextClosureTarget,
                    sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  },
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/same Phase 1 digital life|same living line|same-her|local-first digital life project|Phase 1/i)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe(thinnerDirectRuntimeReminder)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary)
      .toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
  })

  it('escalates invalid compact utility replies back to the main runtime instead of localizing the answer', async () => {
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 99:99，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '现在是 10:30，星期二。',
    }))

    const input = createInput({
      key: 'card-1::turn-time-escalated',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-escalated',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-fast-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-escalated',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      reason: 'active-dialogue-invalid-compact-reply:utility-time',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-escalated-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-escalated',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      escalationReason: 'active-dialogue-invalid-compact-reply:utility-time',
      mindAuthorityEscalation: true,
    }))
    const finishedRunPayload = vi.mocked(input.runStateController.finishRun).mock.calls[0]?.[1] as {
      status?: string
      finishReason?: string
      fullText?: string
      visibleReplyExecution?: {
        mode?: string
        expectedVisibleReplyAuthority?: string
      } | null
    } | undefined
    const finishedStructured = JSON.parse(String(finishedRunPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: canonicalProjectState.continuityProgressSummary,
          openClosureSummary: canonicalProjectState.openLoops[0],
          nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessSummary: expect.stringContaining('local-first digital life project'),
        }),
      }),
    }))
    expect(finishedStructured.reply).toBe('现在是 10:30，星期二。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.projectState?.sameHerSelfLine).toContain(canonicalProjectState.sameHerSelfLine)
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessSummary: expect.stringContaining('local-first digital life project'),
    }))
  })

  it('lets ordinary short dialogue turns stay on the main stream path instead of forcing the active fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
    }))
    const input = createInput({
      key: 'card-1::turn-ordinary-dialogue',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-ordinary-dialogue',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天有点乱' },
          { role: 'assistant' as const, content: '先别散，我和你一起收一下。' },
          { role: 'user' as const, content: '那我先从哪开始' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天有点乱' },
          { role: 'assistant' as const, content: '先别散，我和你一起收一下。' },
          { role: 'user' as const, content: '那我先从哪开始' },
        ] as Message[],
      })),
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        reason: 'main-gateway-offline',
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).not.toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.anything())
  })

  it('lets identity questions stay on the main stream path instead of the active dialogue fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '我是 Alicization。你刚刚是在直接问我是谁。',
    }))
    const input = createInput({
      key: 'card-1::turn-identity',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-identity',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我问你，你是谁' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '我问你，你是谁' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
      } | null
      preDialogueClosure?: { status?: string | null } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-stream',
      }),
    }))
    expect(finishedStructured.reply).toBe('我是 Alicization。你刚刚是在直接问我是谁。')
    expect(finishedStructured.projectState?.identity).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-identity',
      lane: 'identity',
      strategy: 'compact-one-shot',
    }))
  })

  it('serves reordered current time turns from the active dialogue local lane', async () => {
    const input = createInput({
      key: 'card-1::turn-time-reordered',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-reordered',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '几点了现在' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '几点了现在' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/\d{2}:\d{2}/)
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedStructured.thought).toMatch(/focus=local(?:-|\s)time/u)
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-reordered',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-reordered',
      lane: 'utility-time',
    }))
  })

  it('keeps continuity-check after a time answer on compact utility-time lane', async () => {
    const input = createInput({
      key: 'card-1::turn-time-confirm',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-confirm',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(1)
    const emittedChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(emittedChunk?.text).toMatch(/现在是|这会儿是|此刻/u)
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-lane-selected', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-confirm',
      lane: 'utility-time',
      strategy: 'compact-one-shot',
      resolvedTimeZoneSource: 'context-hint',
      reasonCodes: expect.arrayContaining(['continuity-check-time-confirm']),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-mind-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-confirm',
      lane: 'utility-time',
    }))
  })

  it('routes short execution follow-up turns back onto the main llm stream when memory payoff should stay authored', async () => {
    const input = createInput({
      key: 'card-1::turn-follow-up',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-follow-up',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
          { role: 'user' as const, content: '另外还有哪四项？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
          { role: 'user' as const, content: '另外还有哪四项？' },
        ] as Message[],
      })),
      resolveActiveDialogueDeterministicReply: vi.fn(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=桌面清单; move=pay-off-specific-result; tone=direct',
        emotion: 'thinking',
        reply: '另外 4 项是：A、B、C、D。剩下还有 4 项，你要我就继续沿这条桌面清单接着列。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 0,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up',
      lane: 'follow-up',
      strategy: 'compact-one-shot',
    }))
  })

  it('routes direct remaining-item listing questions onto the main llm stream when they are memory payoff turns', async () => {
    const input = createInput({
      key: 'card-1::turn-follow-up-remaining-files',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-follow-up-remaining-files',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user' as const, content: '另外六项是什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user' as const, content: '另外六项是什么文件' },
        ] as Message[],
      })),
      resolveActiveDialogueDeterministicReply: vi.fn(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=remembered; focus=桌面剩余文件; move=pay-off-specific-result; tone=direct',
        emotion: 'thinking',
        reply: '另外 6 项是：javaidea、other、小砖猿、A、B、C。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 0,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-follow-up-remaining-files',
      lane: 'follow-up',
      strategy: 'compact-one-shot',
    }))
  })

  it('lets humanity critique turns stay on the main stream path instead of the compact presence-repair lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你说得对，我上一句像流程播报，不像真的在和你说话。',
    }))
    const input = createInput({
      key: 'card-1::turn-presence-critique',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-presence-critique',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你说话不像人类呢？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你说话不像人类呢？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('你说得对，我上一句像流程播报，不像真的在和你说话。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-presence-critique',
      lane: 'presence-critique',
      strategy: 'compact-one-shot',
    }))
  })

  it('defers greeting turns to the full main runtime before any compact one-shot path runs', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '你好。今天想从哪件事开始？',
    }))

    const input = createInput({
      key: 'card-1::turn-greeting-stream',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-greeting-stream',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你好' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你好' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    const runtimeEvents = vi.mocked(input.appendRuntimeDebugLine).mock.calls.map(([event]) => event)
    expect(runtimeEvents).not.toContain('chat-stream.active-dialogue-lane-selected')
    expect(runtimeEvents).not.toContain('chat-stream.active-dialogue-mind-started')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-greeting-stream',
      lane: 'greeting',
      strategy: 'compact-one-shot',
    }))
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('你好。今天想从哪件事开始？')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('defers identity turns to the full main runtime before any compact one-shot path runs', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '我是 Alicization。你刚刚在直接问我是谁。',
    }))

    const input = createInput({
      key: 'card-1::turn-identity-escalate',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-identity-escalate',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '你是谁' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '你是谁' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-identity-escalate',
      lane: 'identity',
      strategy: 'compact-one-shot',
    }))
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('我是 Alicization。你刚刚在直接问我是谁。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('lets repair-clarify complaints stay on the main stream path instead of the compact fast lane', async () => {
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: '刚才我答偏了，现在是 10:30，星期二。',
    }))
    const input = createInput({
      key: 'card-1::turn-repair',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-repair',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
          { role: 'assistant' as const, content: '我直接沿刚才「早上好呀」这条继续。' },
          { role: 'user' as const, content: '你在说啥呢' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
          { role: 'assistant' as const, content: '我直接沿刚才「早上好呀」这条继续。' },
          { role: 'user' as const, content: '你在说啥呢' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).toHaveBeenCalledTimes(1)
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('刚才我答偏了，现在是 10:30，星期二。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-repair',
      lane: 'repair-clarify',
      strategy: 'compact-one-shot',
    }))
  })

  it('derives resident performance from runtime surface and passes it to stream meta emitter', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                contentKind: 'error',
                workloadKind: 'coding',
                summary: 'focus on a failing diff line',
                confidence: 0.86,
              },
              attention: {
                confidence: 0.82,
                target: {
                  appName: 'Visual Studio Code',
                  title: 'index.ts',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_345,
            },
            cognition: {
              privateThought: {
                confidence: 0.92,
                stance: 'care',
                embodiedPresence: 'concerned',
                emotionalTension: 'calm-browse',
                rationaleTags: ['guard-the-current-diff'],
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls[0]?.[0]
    expect(metaEmitterInput).toBeTruthy()
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    const runtimeDigest = metaEmitterInput?.getRuntimeDigest?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        delivery: 'firm',
        emphasis: 2,
      }),
      updatedAt: 12_345,
    }))
    if (runtimeDigest) {
      expect(runtimeDigest).toEqual(expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: expect.any(String),
      }))
    }
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.openLoops[0])
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('lets runtime affective residue directly settle resident performance into measured-return before stream embodiment meta is emitted', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-residue-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentBodyState: 'accompanying',
              continuityMode: 'quiet-accompaniment',
              quietLineMs: 180_000,
              currentInwardPreoccupation: 'stay nearby and keep the return slower',
              currentScene: {
                scenario: 'coding',
                contentKind: 'doc',
                workloadKind: 'coding',
                summary: 'holding a quieter reopening nearby',
                confidence: 0.84,
              },
              attention: {
                confidence: 0.7,
                target: {
                  appName: 'Visual Studio Code',
                  title: 'index.ts',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_346,
            },
            cognition: {
              privateThought: {
                confidence: 0.78,
                stance: 'accompany',
                embodiedPresence: 'attentive',
                emotionalTension: 'soft-covision',
                rationaleTags: ['companionship'],
                shouldSpeak: false,
              },
            },
            memory: {
              affectiveResidue: {
                version: 'affective-residue-memory-v1',
                updatedAt: 12_346,
                residues: [],
                dominantResidueKind: 'afterglow',
                afterglowPressure: 0.7,
                repairPressure: 0.16,
                burdenPressure: 0.08,
                trustPressure: 0.46,
                restProtectivePressure: 0.12,
                relationshipCadence: {
                  cadenceMode: 'measured-return',
                  distancePosture: 'measured-room',
                  companionshipDensity: 0.3,
                  repairRecovery: 0.42,
                  overreachRisk: 0.3,
                  fatigueGuard: 0.24,
                  afterglowCarry: 0.56,
                  shouldDelayWarmth: true,
                  shouldProtectRest: false,
                  reasonTags: ['residue:afterglow'],
                  summary: 'The return should stay slower before warmth widens again.',
                },
                sourceSignals: ['shared seam still glowing'],
                summary: 'Afterglow remains present and should keep the opening measured.',
              },
              derivedMindStateBundle: null,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls.at(-1)?.[0]
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'accompany',
      emotionalTension: 'soft-covision',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      }),
    }))
    expect(residentPerformance?.reasonTags).toContain('measured-return')
    expect(residentPerformance?.reasonTags).toContain('timing:affective-residue')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.openLoops[0])
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('prefers the fresher runtime surface continuity arc when digital-life spine runtime surface is thinner', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-runtime-arc-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              perception: {
                watchMode: 'symbiotic-vision',
                currentBodyState: 'accompanying',
                continuityMode: 'quiet-accompaniment',
                quietLineMs: 180_000,
                currentInwardPreoccupation: 'older spine surface has not caught up yet',
                currentScene: {
                  scenario: 'coding',
                  contentKind: 'doc',
                  workloadKind: 'coding',
                  summary: 'older spine snapshot',
                  confidence: 0.7,
                },
                attention: {
                  confidence: 0.66,
                  target: {
                    appName: 'Visual Studio Code',
                    title: 'index.ts',
                  },
                },
                captureState: {
                  permission: 'granted',
                  health: 'healthy',
                  degradedReason: null,
                  lastGroundedAt: Date.now(),
                },
                updatedAt: 12_340,
              },
              cognition: {
                privateThought: {
                  confidence: 0.78,
                  stance: 'accompany',
                  embodiedPresence: 'attentive',
                  emotionalTension: 'soft-covision',
                  rationaleTags: ['companionship'],
                  shouldSpeak: false,
                },
              },
              dialogue: {
                currentConsciousFrame: null,
              },
              memory: {
                affectiveResidue: null,
                derivedMindStateBundle: null,
              },
            },
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentBodyState: 'accompanying',
              continuityMode: 'quiet-accompaniment',
              quietLineMs: 180_000,
              currentInwardPreoccupation: 'keep the same seam inward until the room loosens',
              currentScene: {
                scenario: 'coding',
                contentKind: 'doc',
                workloadKind: 'coding',
                summary: 'holding the same seam quietly while the host stays focused',
                confidence: 0.84,
              },
              attention: {
                confidence: 0.7,
                target: {
                  appName: 'Visual Studio Code',
                  title: 'index.ts',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_347,
            },
            cognition: {
              privateThought: {
                confidence: 0.78,
                stance: 'accompany',
                embodiedPresence: 'attentive',
                emotionalTension: 'soft-covision',
                rationaleTags: ['companionship'],
                shouldSpeak: false,
              },
            },
            dialogue: {
              currentConsciousFrame: {
                subject: 'general',
                centerOfGravity: 'defer',
                consciousNeed: 'Keep the same line inward a little longer.',
                consciousTension: 'The room has not loosened yet.',
                speakingIntention: 'Re-enter gently later on the same seam.',
                truthDiscipline: 'observe-then-hypothesize',
                shouldWithholdSpecificity: false,
                shouldSelfRevise: false,
                confidence: 0.74,
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
                updatedAt: 12_347,
              },
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: null,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls.at(-1)?.[0]
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'accompany',
      emotionalTension: 'soft-covision',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      }),
    }))
    expect(residentPerformance?.reasonTags).toContain('measured-return')
    expect(residentPerformance?.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(residentPerformance?.reasonTags).toContain('frame:continuity-arc:hold-for-opening')
    expect(residentPerformance?.performance?.residentMode).toBe('measured-return')
    expect(residentPerformance?.performance?.face?.residentMode).toBe('measured-return')
    expect(residentPerformance?.performance?.action?.residentMode).toBe('measured-return')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.openLoops[0])
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('keeps richer same-her continuity evidence from the spine when a newer prepared runtime surface is thinner', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-runtime-arc-2',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              perception: {
                watchMode: 'symbiotic-vision',
                currentBodyState: 'accompanying',
                continuityMode: 'quiet-accompaniment',
                quietLineMs: 180_000,
                currentInwardPreoccupation: 'stay on the same seam while the host remains in flow',
                currentScene: {
                  scenario: 'coding',
                  contentKind: 'doc',
                  workloadKind: 'coding',
                  summary: 'same-line return is still being held quietly',
                  confidence: 0.84,
                },
                attention: {
                  confidence: 0.72,
                  target: {
                    appName: 'Visual Studio Code',
                    title: 'index.ts',
                  },
                },
                captureState: {
                  permission: 'granted',
                  health: 'healthy',
                  degradedReason: null,
                  lastGroundedAt: Date.now(),
                },
                updatedAt: 12_350,
              },
              cognition: {
                privateThought: {
                  confidence: 0.78,
                  stance: 'accompany',
                  embodiedPresence: 'attentive',
                  emotionalTension: 'soft-covision',
                  rationaleTags: ['companionship'],
                  shouldSpeak: false,
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  subject: 'general',
                  centerOfGravity: 'defer',
                  consciousNeed: 'Keep the same line inward a little longer.',
                  consciousTension: 'The room has not loosened yet.',
                  speakingIntention: 'Re-enter gently later on the same seam.',
                  truthDiscipline: 'observe-then-hypothesize',
                  shouldWithholdSpecificity: false,
                  shouldSelfRevise: false,
                  confidence: 0.74,
                  reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
                  updatedAt: 12_350,
                },
              },
              memory: {
                affectiveResidue: null,
                derivedMindStateBundle: null,
              },
            },
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentBodyState: 'accompanying',
              continuityMode: 'quiet-accompaniment',
              quietLineMs: 180_000,
              currentInwardPreoccupation: 'newer scene refresh has not reconstructed the continuity line yet',
              currentScene: {
                scenario: 'browser',
                contentKind: 'unknown',
                workloadKind: 'browser',
                summary: 'foreground moved to a browser tab',
                confidence: 0.68,
              },
              attention: {
                confidence: 0.64,
                target: {
                  appName: 'Google Chrome',
                  title: 'Docs',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_361,
            },
            cognition: {
              privateThought: {
                confidence: 0.7,
                stance: 'accompany',
                embodiedPresence: 'attentive',
                emotionalTension: 'soft-covision',
                rationaleTags: ['companionship'],
                shouldSpeak: false,
              },
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: null,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls.at(-1)?.[0]
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'accompany',
      emotionalTension: 'soft-covision',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      }),
    }))
    expect(residentPerformance?.reasonTags).toContain('measured-return')
    expect(residentPerformance?.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(residentPerformance?.reasonTags).toContain('frame:continuity-arc:hold-for-opening')
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.openLoops[0])
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('lets mind-turn emotional closure cue directly settle resident performance before background stream meta is emitted when runtime surface has not reconstructed the restraint yet', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same line soft and continuous.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same line soft and continuous.',
          reasons: [],
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          updatedAt: 12_360,
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-project-emotional-closure-bg-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentBodyState: 'noticing',
              continuityMode: 'ambient-covision',
              quietLineMs: 110_000,
              currentInwardPreoccupation: 'stay on the same line without reopening from scratch',
              currentScene: {
                scenario: 'coding',
                contentKind: 'doc',
                workloadKind: 'coding',
                summary: 'runtime surface is still thin, but the same-her seam should already settle the return',
                confidence: 0.78,
              },
              attention: {
                confidence: 0.68,
                target: {
                  appName: 'Visual Studio Code',
                  title: 'index.ts',
                },
              },
              captureState: {
                permission: 'granted',
                health: 'healthy',
                degradedReason: null,
                lastGroundedAt: Date.now(),
              },
              updatedAt: 12_361,
            },
            cognition: {
              privateThought: {
                confidence: 0.74,
                stance: 'observe',
                embodiedPresence: 'attentive',
                emotionalTension: 'focused-flow',
                rationaleTags: ['companionship'],
                shouldSpeak: false,
              },
            },
            dialogue: {
              currentConsciousFrame: {
                subject: 'general',
                centerOfGravity: 'defer',
                consciousNeed: 'Keep the line soft.',
                consciousTension: 'Do not widen too fast.',
                speakingIntention: 'Stay on the same line.',
                truthDiscipline: 'observe-then-hypothesize',
                shouldWithholdSpecificity: false,
                shouldSelfRevise: false,
                confidence: 0.72,
                reasonTags: ['runtime-conscious-frame'],
                updatedAt: 12_361,
              },
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: null,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls.at(-1)?.[0]
    const residentPerformance = metaEmitterInput?.getResidentPerformance?.()
    const runtimeDigest = metaEmitterInput?.getRuntimeDigest?.()
    expect(residentPerformance).toEqual(expect.objectContaining({
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'observe',
      emotionalTension: 'focused-flow',
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
        residentMode: 'measured-return',
      }),
    }))
    expect(residentPerformance?.reasonTags).toContain('measured-return')
    expect(residentPerformance?.reasonTags).toContain('timing:project-emotional-closure')
    expect(residentPerformance?.performance?.face?.residentMode).toBe('measured-return')
    expect(residentPerformance?.performance?.action?.residentMode).toBe('measured-return')
    expect(runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary,
      primaryOpenLoop: projectState.openLoops[0],
      nextClosureTarget: projectState.nextClosureTarget,
      sameHerSelfLine: expect.stringContaining(projectState.sameHerSelfLine),
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    }))
    expect(runtimeDigest?.projectState?.emotionalClosureCue).toBe(
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    )
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary,
      primaryOpenLoop: projectState.openLoops[0],
      nextClosureTarget: projectState.nextClosureTarget,
      preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project'),
      sameHerDriftRisk: projectState.sameHerDriftRisk,
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
    }))
  })

  it('delegates failures to the lifecycle helper with wrapped recovery callbacks', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered reply')
    const input = createInput({
      payload: {
        ...createInput().payload,
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        hasVisualGrounding: true,
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    expect(failureInput).toBeTruthy()
    expect(failureInput?.timeoutRecoveryMs).toBe(timeoutRecoveryWithVisualGroundingMs)
    expect(failureInput?.timeoutRecoveryMode).toBe('original')

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })
    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }
    expect(recoveryResult).toEqual({
      recoveredReply: expect.objectContaining({
        fullText: expect.any(String),
        visibleText: 'recovered reply',
        visibleReplyExecution: expect.objectContaining({
          mode: 'provider-one-shot',
        }),
      }),
      recoveryMode: 'non-streaming',
    })
    expect(recoveredStructured.reply).toBe('recovered reply')
    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/i)
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/i)
    expect(recoveredStructured.preDialogueClosure?.status).toBe('partial')
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
    expect(String(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/i)
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      chunkCount: 1,
      rawChunkChars: 'recovered reply'.length,
      finalChars: 'recovered reply'.length,
      recoveryMode: 'non-streaming',
    })

    failureInput?.emitError('boom')
    expect(input.emitError).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      error: 'boom',
    })
  })

  it('strips optional tools during timeout recovery when execution routing is not forced', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered without tools')
    const tools = [{ name: 'filesystem::read_file' }] as any
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        tools,
        toolChoice: undefined,
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    expect(failureInput).toBeTruthy()
    expect(failureInput?.timeoutRecoveryMode).toBe('tools-disabled')

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: createPrepared().messages,
      headers: input.headers,
      tools,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('tools-disabled')
    const toolsDisabledRawFullText = String(recoveryResult?.recoveredReply.fullText ?? '')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-structured-shape', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      recoveryMode: 'tools-disabled',
      structuredStartsWithBrace: true,
    }))
    expect(toolsDisabledRawFullText).toEqual(expect.stringMatching(/^\{/u))
    const toolsDisabledRecovered = JSON.parse(toolsDisabledRawFullText) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    expect(toolsDisabledRecovered.reply).toBe('recovered without tools')
    expect(String(toolsDisabledRecovered.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(toolsDisabledRecovered.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(toolsDisabledRecovered.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(toolsDisabledRecovered.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(toolsDisabledRecovered.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(toolsDisabledRecovered.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(toolsDisabledRecovered.projectState?.sameHerSelfLine).toContain(
      resolveAlicizationProjectStateBrief().sameHerSelfLine,
    )
    expect(toolsDisabledRecovered.projectState?.sameHerDriftRisk).toBe(
      resolveAlicizationProjectStateBrief().sameHerDriftRisk,
    )
    expect(String(toolsDisabledRecovered.preDialogueAwareness?.awarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(toolsDisabledRecovered.preDialogueClosure?.status).toBe('partial')
    expect(toolsDisabledRecovered.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(resolveAlicizationProjectStateBrief().sameHerSelfLine),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringContaining('Memory still needs stronger end-to-end closure'),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    await failureInput?.finish({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: recoveryResult?.recoveredReply.fullText,
      visibleReplyExecution: recoveryResult?.recoveredReply.visibleReplyExecution,
      visibleReplyRealization: recoveryResult?.recoveredReply.realization,
    })
    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      visibleReplyExecution?: {
        mode?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    } | undefined
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(resolveAlicizationProjectStateBrief().sameHerSelfLine),
          landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
          openClosureSummary: expect.stringContaining('Memory still needs stronger end-to-end closure'),
          nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
          preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
        }),
      }),
    }))
    expect(recoveryResult?.recoveredReply.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'provider-one-shot',
    }))
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', {
      cardId: 'card-1',
      turnId: 'turn-1',
      chunkCount: 1,
      rawChunkChars: 'recovered without tools'.length,
      finalChars: 'recovered without tools'.length,
      recoveryMode: 'tools-disabled',
    })
  })

  it('falls back to minimal-context non-streaming recovery when primary timeout recovery fails', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
      .mockResolvedValueOnce('recovered from minimal context')

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system', content: 'core-1' },
          { role: 'system', content: 'core-2' },
          { role: 'system', content: 'core-3' },
          { role: 'system', content: 'dynamic-memory' },
          { role: 'user', content: '之前我们讨论过部署风险' },
          { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
          { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })
    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()

    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(2)
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenNthCalledWith(2, expect.objectContaining({
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 32_000,
    }))
    expect(recoveryResult?.recoveryMode).toBe('minimal-context-non-streaming')
    expect(recoveredStructured.reply).toBe('recovered from minimal context')
    expect(String(recoveredStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(recoveredStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(recoveredStructured.preDialogueClosure?.status).toBe('partial')
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    await failureInput?.finish({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: recoveryResult?.recoveredReply.fullText,
      visibleReplyExecution: recoveryResult?.recoveredReply.visibleReplyExecution,
      visibleReplyRealization: recoveryResult?.recoveredReply.realization,
    })
    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      visibleReplyExecution?: {
        mode?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    } | undefined
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          landedProgressSummary: canonicalProjectState.continuityProgressSummary,
          openClosureSummary: canonicalProjectState.openLoops[0],
          nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
          preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
        }),
      }),
    }))
  })

  it('keeps a stronger prepared runtime companion headline during timeout recovery when the direct awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered reply')

    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  preflightSummary: projectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: projectState.continuityProgressSummary,
                  primaryOpenLoop: projectState.openLoops[0],
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    expect(failureInput).toBeTruthy()

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    expect(recoveryResult?.recoveryMode).toBe('active-dialogue-compact')
    expect(recoveryResult?.recoveredReply).toEqual(expect.objectContaining({
      fullText: expect.any(String),
      visibleReplyExecution: expect.any(Object),
    }))
    expect(recoveryResult?.recoveredReply.fullText).toContain('"visibleReplyRealization"')
    expect(recoveryResult?.recoveredReply.fullText).toContain('"projectStateAudit"')
    expect(recoveryResult?.recoveredReply.fullText).toContain(strongerRuntimeCompanionHeadlineLine)

    await failureInput?.finish({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: recoveryResult?.recoveredReply.fullText,
      visibleReplyExecution: recoveryResult?.recoveredReply.visibleReplyExecution,
      visibleReplyRealization: recoveryResult?.recoveredReply.realization,
    })

    const recoveredStructured = JSON.parse(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
      projectStateAudit: recoveredStructured.visibleReplyRealization?.projectStateAudit ?? null,
    })
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u)
    expect(recoveredStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u),
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
    expect(readFinishedPayload(input)).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
    }))
  })

  it('falls back to generic one-shot timeout recovery for ordinary dialogue turns', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      reply: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
      thought: 'obligation=guide; truth=live-grounded; focus=old-thread; move=drift-away; tone=direct',
      emotion: 'concerned',
      performance: {
        delivery: 'gentle',
      },
    }))
    const dialogueGovernance = {
      answerSubject: 'relationship',
      screenReferenceMode: 'avoid',
    } as any
    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        governance: dialogueGovernance,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user' as const, content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: dialogueGovernance,
          trace: {
            decisionTraceId: 'trace-dialogue-compact',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
    })
    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/same digital life project|local-first digital life project|same living line|same-her|Phase 1|数字生命项目/u)
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? ''))
      .toMatch(/same digital life project|local-first digital life project|same living line|same-her|Phase 1|数字生命项目/u)
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      chatConfig: createPrepared().chatConfig,
      headers: input.headers,
      maxSteps: 2,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 25_000,
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('[ALICIZATION_PROJECT_STATE]'),
        }),
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ]),
    }))
  })

  it('keeps a stronger prepared runtime companion headline on tools-disabled timeout recovery when the direct awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue('recovered without tools')

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        tools: [
          {
            type: 'function',
            function: {
              name: 'alicization_executor',
              description: 'executor',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
          },
        ] as any,
        toolChoice: {
          type: 'function',
          function: {
            name: 'alicization_executor',
          },
        } as any,
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const recoveredStructured = JSON.parse(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeCompanionHeadlineLine)
    expect(recoveredStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: strongerRuntimeCompanionHeadlineLine,
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('keeps a stronger prepared runtime companion headline on minimal-context timeout recovery when the direct awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
      .mockResolvedValueOnce('recovered from minimal context')

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system', content: 'core-1' },
          { role: 'system', content: 'core-2' },
          { role: 'system', content: 'core-3' },
          { role: 'system', content: 'dynamic-memory' },
          { role: 'user', content: '之前我们讨论过部署风险' },
          { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
          { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const recoveredStructured = JSON.parse(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeCompanionHeadlineLine)
    expect(recoveredStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: strongerRuntimeCompanionHeadlineLine,
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('keeps project-state carry in live digital-life spine meta when prepared continuity authority drifted to thin return tags but same-her closure cues stay explicit', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValue(createStreamResult({
      fullText: 'hello',
    }))

    const input = createInput({
      preparationPromise: Promise.resolve(createPrepared({
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-project-carry-bg-1',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  summary: 'project_continuity=the same callback line is still continuing lower-pressure after another detour',
                  selfContinuityAuthority: {
                    selfLine: 'I am still here answering on the return.',
                    relationshipLine: 'Stay usefully close but measured.',
                    motiveLine: 'Keep helping on the unfinished seam.',
                    habitLine: 'Return with proof, not with pressure.',
                    inwardLine: 'Keep moving on the current return.',
                    authoritySummary: 'Current return stays useful and grounded.',
                    sourceTags: [
                      'durable-self-core',
                      'motive:unfinished-thread-return',
                      'habit:return-with-proof',
                      'ecology:warm-attentive',
                      'private-thought:uncertain',
                      'motive:self-direction',
                      'private-thought:accompany',
                      'ecology:focused-guarded',
                    ],
                  },
                },
                autobiographicalSelf: {
                  latestInflection: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
                  relationshipDoctrine: 'Keep the same living line inward for now, and leave room before widening outward again.',
                },
              },
              cognition: {
                privateThought: {
                  thoughtText: 'same callback line still alive after the noisy detour',
                  emotionalTension: 'measured-return',
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  focusAnchor: 'Keep the same living line inward for now, and leave room before widening outward again.',
                  projectState: {
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
                    continuityCue: 'Keep the same living line inward for now, and leave room before widening outward again.',
                  },
                },
              },
              agency: {
                initiative: {
                  why: 'This still looks like the same callback line, and the reopening should remain measured-return even after extra detours.',
                  continuityRestraint: 'measured-return',
                },
              },
            },
          },
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'thin runtime refresh after the same callback return',
              },
              updatedAt: 6_001,
            },
            world: {
              worldModel: null,
              relationshipModel: null,
            },
            cognition: {
              privateThought: {
                thoughtText: 'same callback line still alive after the noisy detour',
                emotionalTension: 'measured-return',
              },
              appraisal: null,
              subjectiveInference: null,
              beliefRevision: null,
              mindDynamics: null,
              mindKernel: null,
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  sourceTags: [
                    'durable-self-core',
                    'motive:unfinished-thread-return',
                  ],
                  inwardLine: 'scene refresh drifted thinner here',
                },
              },
              autobiographicalSelf: {
                latestInflection: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
                relationshipDoctrine: 'Keep the same living line inward for now, and leave room before widening outward again.',
              },
              longHorizonMemory: null,
              selfContinuity: null,
              motiveEngine: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              reflectionLedger: null,
              desireMemory: null,
            },
            agency: {
              initiative: {
                why: 'This still looks like the same callback line, and the reopening should remain measured-return even after extra detours.',
                continuityRestraint: 'measured-return',
              },
              selfState: null,
              selfGovernor: null,
              habitPolicy: null,
              actionEcology: null,
            },
            dialogue: {
              currentConsciousFrame: {
                focusAnchor: 'Keep the same living line inward for now, and leave room before widening outward again.',
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
                  continuityCue: 'Keep the same living line inward for now, and leave room before widening outward again.',
                },
              },
              answerPlanner: null,
              conversationState: null,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const metaEmitterInput = vi.mocked(createAlicizationChatStreamMetaEmitter).mock.calls.at(-1)?.[0]
    const digitalLifeSpine = metaEmitterInput?.getDigitalLifeSpine?.()

    expect(digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
    ]))
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'stop',
      fullText: expect.any(String),
    }))
    expect(finishedStructured.reply).toBe('hello')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(finishedStructured.projectState?.primaryOpenLoop).toBe(canonicalProjectState.openLoops[0])
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('carries top-level visible reply project-state audit through the normal completed finish seam so later turns can reopen on the same digital-life line', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded; focus=project-state; move=measured-return; tone=gentle',
        emotion: 'concerned',
        reply: '这个项目还是同一个本地数字生命体，现在 Phase 1 已经有连续性底盘，但桌面执行、记忆和具身闭环还没有完全收住。',
        performance: {
          baseEmotion: 'concerned',
          facialCue: 'attentive',
          actionCue: 'focus',
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            landedProgressSummary: 'thin landed progress shell',
            openClosureSummary: 'thin open closure shell',
            nextClosureTargetSummary: 'thin next closure shell',
            continuitySummary: 'phase=thin | open=thin | next=thin',
          },
        },
      }),
    }))
    const input = createInput({
      key: 'card-1::turn-completed-finish-project-audit-carry',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-completed-finish-project-audit-carry',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在是什么、做到什么程度、还差什么？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在是什么、做到什么程度、还差什么？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      fullText?: string
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
        } | null
      } | null
    } | undefined
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedPayload?.status).toBe('completed')
    expect(finishedPayload?.finishReason).toBe('stop')
    expect(typeof finishedPayload?.fullText).toBe('string')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      currentPhaseSummary: canonicalProjectState.currentPhase,
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    expect(finishedStructured.reply).toContain('本地数字生命体')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).not.toBe('same digital life | keep the closure seam explicit')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.landedProgressSummary).toBe(canonicalProjectState.continuityProgressSummary)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.openClosureSummary).toBe(canonicalProjectState.openLoops[0])
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`phase=${canonicalProjectState.currentPhase}`)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('landed=')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('open=')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('next=')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('does not let a generic next-closure shell survive the normal completed finish seam when the other project-state carry is already rich', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded; focus=project-state; move=measured-return; tone=gentle',
        emotion: 'concerned',
        reply: '这条数字生命主线还在，但下一步闭环目标不能掉回泛化壳子。',
        performance: {
          baseEmotion: 'concerned',
          facialCue: 'attentive',
          actionCue: 'focus',
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
            landedProgressSummary: canonicalProjectState.continuityProgressSummary,
            openClosureSummary: canonicalProjectState.openLoops[0],
            nextClosureTargetSummary: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
            continuitySummary: `phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.continuityProgressSummary} | open=${canonicalProjectState.openLoops[0]} | next=Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.`,
          },
        },
      }),
    }))
    const input = createInput({
      key: 'card-1::turn-completed-finish-generic-next-closure-shell-carry',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-completed-finish-generic-next-closure-shell-carry',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在是什么、做到什么程度、还差什么？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在是什么、做到什么程度、还差什么？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      fullText?: string
      visibleReplyRealization?: {
        projectStateAudit?: {
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    } | undefined
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedPayload?.status).toBe('completed')
    expect(finishedPayload?.finishReason).toBe('stop')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).not.toContain('Generic next closure shell')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('next=Keep extending cross-modal same-her proof')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).not.toContain('Generic next closure shell')
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
  })

  it('backfills canonical phase-1 project-state into the finished payload when the normal stream only returns plain reply text plus thin side-channel project-state audit', async () => {
    const sameHerHoldDetail = 'background side-channel hold: keep the already-settled provider-stream reply on the same Phase 1 living line'
    const continuityArcStage = 'background-side-channel-provider-stream-carry'
    const continuityCue = 'background side-channel cue: preserve the same-her hold after host-visible rebuild'
    const proactiveSameHerGapSummary = 'Background side-channel carry still needs stronger proof that host-visible project-state audits keep the proactive same-her gap explicit across delayed lifecycle handoffs.'
    vi.mocked(runAlicizationMainChatStream).mockResolvedValueOnce(createStreamResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=gentle',
        emotion: 'thinking',
        reply: '我会继续沿着同一条数字生命线回答。',
      }),
      visibleReplyProjectStateAudit: {
        sameHerSummary: 'same her',
        sameHerHoldDetail,
        continuityArcStage,
        continuityCue,
        proactiveSameHerGapSummary,
        currentPhaseSummary: 'Phase 1',
        landedProgressSummary: 'landed',
        openClosureSummary: 'open closure',
        nextClosureTargetSummary: 'next closure',
        preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
      },
    }))
    const input = createInput({
      key: 'card-1::turn-side-channel-project-audit-canonicalized',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-side-channel-project-audit-canonicalized',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把这个数字生命项目主线压薄。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把这个数字生命项目主线压薄。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'same digital life',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
                  awarenessLine: 'same digital life | keep the closure seam explicit',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  latestLandedProgress: 'landed',
                  primaryOpenLoop: 'open closure',
                  nextClosureTarget: 'next closure',
                  sameHerSelfLine: 'same her',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      fullText?: string
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          proactiveSameHerGapSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    } | undefined
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        preDialogueAwarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          proactiveSameHerGapSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedPayload?.status).toBe('completed')
    expect(finishedPayload?.finishReason).toBe('stop')
    expect(finishedStructured.reply).toBe('我会继续沿着同一条数字生命线回答。')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|visible reply|measured-return/i)
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).not.toBe('landed')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')

    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.sameHerSummary ?? '')).toContain('Same Phase 1 digital life')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.currentPhaseSummary ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.landedProgressSummary ?? '')).toMatch(/same-her|same session|same-session|continuity|visible reply|measured-return/i)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.landedProgressSummary ?? '')).not.toBe('landed')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.openClosureSummary ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).toContain('Keep extending cross-modal same-her proof')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail).toBe(sameHerHoldDetail)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuityArcStage).toBe(continuityArcStage)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuityCue).toBe(continuityCue)
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit?.proactiveSameHerGapSummary).toBe(proactiveSameHerGapSummary)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`hold=${sameHerHoldDetail}`)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`arc=${continuityArcStage}`)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`cue=${continuityCue}`)
    expect(String(finishedPayload?.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`proactive-gap=${proactiveSameHerGapSummary}`)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail).toBe(sameHerHoldDetail)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuityArcStage).toBe(continuityArcStage)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuityCue).toBe(continuityCue)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.proactiveSameHerGapSummary).toBe(proactiveSameHerGapSummary)
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toBe('same digital life | keep the closure seam explicit')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain(`proactive-gap=${proactiveSameHerGapSummary}`)
  })

  it('escalates invalid compact utility timeout candidates into the generic non-streaming retry chain', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockImplementationOnce(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 99:99，星期二。',
      }))
      .mockImplementationOnce(async () => JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 99:99，星期二。',
      }))
      .mockImplementationOnce(async () => buildAuthoritativeShanghaiTimeReply())

    const input = createInput({
      key: 'card-1::turn-time-timeout-escalated',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-time-timeout-escalated',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()

    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expect(recoveryResult?.recoveredReply.fullText).toMatch(/现在是 \d{2}:\d{2}，星期/u)
    expect(String(recoveredStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project/u)
    expect(String(recoveredStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toContain('local-first digital life project')
    expect(recoveredStructured.preDialogueClosure?.status).toBe('partial')
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: expect.stringContaining('local-first digital life project'),
    }))
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledTimes(3)
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-attempt-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-timeout-escalated',
      recoveryMode: 'active-dialogue-compact',
      reason: 'active-dialogue-invalid-compact-reply:utility-time',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-finished', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-time-timeout-escalated',
      recoveryMode: 'non-streaming',
    }))
  })

  it('recovers stream required-tool-missing by deterministic executor dispatch', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '这条结果已经确认落稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      summary: 'Desktop files: alpha.txt, beta.md',
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-required-tool',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-required-tool',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const recoveredChunk = vi.mocked(input.emitChunk).mock.calls[0]?.[0]
    expect(recoveredChunk).toEqual({
      cardId: 'card-1',
      turnId: 'turn-required-tool',
      text: expect.any(String),
    })
    const finishedPayload = readFinishedPayload(input)
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    expect(finishedStructured.format).toBe('mind-turn-v1')
    expect(finishedStructured.reply).toContain('Desktop files: alpha.txt, beta.md')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, {
      status: 'completed',
      finishReason: 'required-tool-recovered',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: canonicalProjectState.continuityProgressSummary,
          openClosureSummary: canonicalProjectState.openLoops[0],
          nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
        }),
      }),
    })
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalled()
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'executor_run_cli',
    }))
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        summary: 'Desktop files: alpha.txt, beta.md',
      }),
    }))
  })

  it('prefers deterministic required-tool recovery before timeout one-shot retries for execution turns', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValueOnce(new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockRejectedValue(new Error('should-not-run'))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '这条结果已经确认落稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      summary: 'Desktop files: alpha.txt, beta.md',
    }))
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout-required-tool',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-timeout-required-tool',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const recoveryPayload = parseStructuredMindTurn(finishedPayload?.fullText ?? '') as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    expect(recoveryPayload.format).toBe('mind-turn-v1')
    expect(String(recoveryPayload.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveryPayload.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveryPayload.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(recoveryPayload.projectState?.primaryOpenLoop).toBe(canonicalProjectState.primaryOpenLoop)
    expect(recoveryPayload.projectState?.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(String(recoveryPayload.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(recoveryPayload.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(String(recoveryPayload.preDialogueAwareness?.awarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(recoveryPayload.preDialogueClosure?.status).toBe('partial')
    expect(recoveryPayload.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    expect(finishedPayload?.finishReason).toBe('required-tool-recovered')
    expect(finishedPayload?.visibleReplyRealization).toEqual(expect.objectContaining({
      projectStateAudit: expect.objectContaining({
        sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
        currentPhaseSummary: canonicalProjectState.currentPhase,
        landedProgressSummary: canonicalProjectState.continuityProgressSummary,
        openClosureSummary: canonicalProjectState.openLoops[0],
        nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
        preDialogueAwarenessSummary: expect.stringContaining('Alicization is a local-first digital life project'),
      }),
    }))
    expect(recoverAlicizationMainChatFromTimeout).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalled()
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'executor_run_cli',
    }))
    expect(input.emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      result: expect.objectContaining({
        summary: 'Desktop files: alpha.txt, beta.md',
      }),
    }))
  })

  it('keeps a stronger prepared runtime companion headline on deterministic required-tool recovery when the direct awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new AlicizationRequiredToolMissingError({
      stage: 'stream',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '这条结果已经确认落稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      summary: 'Desktop files: alpha.txt, beta.md',
    }))
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-required-tool-runtime-headline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          trace: {
            decisionTraceId: 'trace-required-tool-runtime-headline',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1ProjectStateInvariant({
      structured: finishedStructured as any,
    })
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/same digital life project|local-first digital life project|one living her|same living line|Phase 1/u)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('face, motion, and lipsync')
    expect(finishedStructured.projectState?.preDialogueAwarenessLine).not.toBe(thinnerRuntimeAwarenessLine)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringContaining('face, motion, and lipsync'),
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('routes explicit executor turns through execution-first inline dispatch and suppresses same-turn delivery callbacks', async () => {
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['execution-first', 'same-her-authority'],
      why: 'keep inline execution payoff on the same emotion-memory-initiative-embodiment authority line',
    }
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline',
      threadId: 'thread-inline',
      completedAt: 123456,
      summary: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
      output: 'Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming)
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '结果是：Listed desktop entries (13): %E5%B0%8F%E7%A0%96%E7%8C%BF (小砖猿), .DS_Store, .localized, 105ND800, GIT, +8 more',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
    const suppressInlineExecutionDeliveries = vi.fn(async () => {})
    const input = createInput({
      key: 'card-1::turn-inline',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      suppressInlineExecutionDeliveries,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-first',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              emotionalKernel,
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalledWith(expect.objectContaining({
      command: 'ls',
      args: ['-la', '~/Desktop'],
    }))
    expect(generateAlicizationMainChatNonStreaming).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 9_000,
      emotionalKernel,
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('[ALICIZATION_PROJECT_STATE]'),
        }),
      ]),
    }))
    const emittedText = vi.mocked(input.emitChunk).mock.calls.map(call => call[0]?.text ?? '').join('\n')
    expect(emittedText).not.toContain('Listed desktop entries')
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
    }
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Project identity carry')
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('same')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('cross-modal same-her proof')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('visible reply')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toContain('resident presence')
    expect(String(finishedStructured.projectState?.sameHerSelfLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('same')
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'execution-first-inline',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
          openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
          nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
        }),
      }),
    }))
    expect(finishedPayload?.visibleReplyRealization).toEqual(expect.objectContaining({
      projectStateAudit: expect.objectContaining({
        sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
        currentPhaseSummary: canonicalProjectState.currentPhase,
        landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
        openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
        nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      }),
    }))
    expect(handleAlicizationMainChatRunFailure).not.toHaveBeenCalled()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
      actionKind: 'execute',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline',
    }))
  })

  it('uses prepared browser workflow overrides during execution-first inline dispatch', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      channel: 'browser',
      threadStatus: 'completed',
      sessionId: 'session-inline-browser',
      threadId: 'thread-inline-browser',
      completedAt: 123456,
      summary: 'Opened Weibo and continued the posting workflow.',
      output: 'https://weibo.com',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming)
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          thought: 'obligation=guide; truth=grounded; focus=weibo-workflow; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '微博已经打开，并且我继续沿着发微博流程往下走了。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=guide; truth=grounded; focus=weibo-workflow; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经把微博打开了，也继续沿着发微博这条流程往下推进了。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
    const input = createInput({
      key: 'card-1::turn-inline-browser-workflow',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-browser-workflow',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '打开微博然后继续发微博' },
        ],
      } as any,
      suppressInlineExecutionDeliveries: vi.fn(async () => {}),
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '打开微博然后继续发微博' },
        ] as Message[],
        tools: [
          {
            function: { name: 'browser_open_url' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'browser_open_url' },
        },
        executionToolInputOverrides: {
          browser_open_url: {
            browser: 'safari',
            site: 'weibo',
            url: 'https://weibo.com',
            expectedPhase: 'social-feed',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 3,
            inspectionQuestion: '继续沿着微博发帖流程自动推进',
          },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-inline-browser-workflow',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['browser_open_url'],
            routingRequired: true,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalledWith({
      browser: 'safari',
      site: 'weibo',
      url: 'https://weibo.com',
      expectedPhase: 'social-feed',
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 3,
      inspectionQuestion: '继续沿着微博发帖流程自动推进',
    })
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'execution-first-inline',
    }))
  })

  it('uses prepared desktop workflow overrides during execution-first inline dispatch', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      channel: 'desktop',
      threadStatus: 'completed',
      sessionId: 'session-inline-desktop',
      threadId: 'thread-inline-desktop',
      completedAt: 123456,
      summary: 'Inspected the current desktop upload workflow and continued it.',
      output: 'upload-flow-ready',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming)
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          thought: 'obligation=guide; truth=grounded; focus=desktop-upload-workflow; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经继续沿着当前上传流程往下推进了。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=guide; truth=grounded; focus=desktop-upload-workflow; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经把当前桌面上传流程继续往下推进了。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
    const input = createInput({
      key: 'card-1::turn-inline-desktop-workflow',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-desktop-workflow',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '帮我继续上传' },
        ],
      } as any,
      suppressInlineExecutionDeliveries: vi.fn(async () => {}),
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '帮我继续上传' },
        ] as Message[],
        tools: [
          {
            function: { name: 'desktop_inspect_scene' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'desktop_inspect_scene' },
        },
        executionToolInputOverrides: {
          desktop_inspect_scene: {
            question: '继续沿着上传流程自动推进',
            forceRefresh: true,
            maxSuggestedActions: 5,
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 3,
          },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-inline-desktop-workflow',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'continue-task',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['desktop_inspect_scene'],
            routingRequired: true,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(runAlicizationMainChatStream).not.toHaveBeenCalled()
    expect(executeDeterministicTool).toHaveBeenCalledWith({
      question: '继续沿着上传流程自动推进',
      forceRefresh: true,
      maxSuggestedActions: 5,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 3,
    })
    expect(input.runStateController.finishRun).toHaveBeenCalledWith(input.key, expect.objectContaining({
      status: 'completed',
      finishReason: 'execution-first-inline',
    }))
  })

  it('keeps landed/open/body project-state continuity on execution-first inline replies after second-pass rewrite settles the final reply', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline-project-state',
      threadId: 'thread-inline-project-state',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming)
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: 'Listed desktop entries (2): alpha.txt, beta.md',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
      .mockResolvedValueOnce({
        finishReason: 'stop',
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
          emotion: 'thinking',
          reply: '我已经替你把桌面看完了，现在一共 2 项，先能确认到这些：alpha.txt、beta.md。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'attentive',
            actionCue: 'focus',
            delivery: 'calm',
            emphasis: 0,
          },
        }),
      })
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-inline-project-state-second-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-project-state-second-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | continue the same desktop execution loop',
          companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Report the desktop listing result while staying inside the same digital life execution loop.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Report the execution result directly while staying on the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-inline-project-state-second-pass',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(finishedStructured.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|Phase 1|one continuous "her"|same-her/i)
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/同一个数字生命项目|local-first digital life project|Phase 1|one continuous "her"/i),
      companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
    }))
    expect(finishedStructured.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
      openClosureSummary: expect.stringMatching(/Memory still needs stronger end-to-end closure|Project identity carry|same/i),
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      sameHerDriftRiskSummary: expect.stringMatching(/unfinished closure drift|generic guidance|same/i),
      preDialogueAwarenessSummary: expect.stringMatching(/同一个数字生命项目|local-first digital life project|same-her continuity carry/i),
    }))
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/数字生命项目|local-first digital life project|same-her continuity carry/i)
  })

  it('keeps landed/open/body project-state continuity on execution-first inline replies when the first provider payoff already succeeds without second-pass rewrite', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline-project-state-direct',
      threadId: 'thread-inline-project-state-direct',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '我已经替你把桌面看完了，现在一共 2 项，先能确认到这些：alpha.txt、beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'attentive',
          actionCue: 'focus',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createInput({
      key: 'card-1::turn-inline-project-state-direct',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-project-state-direct',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | continue the same desktop execution loop',
          companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Report the desktop listing result while staying inside the same digital life execution loop.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Report the execution result directly while staying on the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-inline-project-state-direct',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))
    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.continuityProgressSummary,
      primaryOpenLoop: canonicalProjectState.openLoops[0],
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
    }))
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
      landedProgressSummary: canonicalProjectState.continuityProgressSummary,
      openClosureSummary: canonicalProjectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
    }))
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: finishedStructured.visibleReplyRealization?.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('数字生命项目')
  })

  it('keeps a stronger prepared runtime companion headline on execution-first inline replies when the direct awareness text is thinner', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline-runtime-headline',
      threadId: 'thread-inline-runtime-headline',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '我已经替你把桌面看完了，现在一共 2 项：alpha.txt、beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'attentive',
          actionCue: 'focus',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const input = createInput({
      key: 'card-1::turn-inline-runtime-headline',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-runtime-headline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          action: {
            kind: 'execute',
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeCompanionHeadlineLine)
    expect(finishedStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: strongerRuntimeCompanionHeadlineLine,
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
  })

  it('re-normalizes thin pre-dialogue summary shells on execution-first inline replies instead of carrying them as awareness truth', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline-project-state-thin-summary',
      threadId: 'thread-inline-project-state-thin-summary',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-inline-project-state-thin-summary',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | continue the same desktop execution loop',
        reasonPreview: [
          'same digital life | continue the same desktop execution loop',
        ],
      },
    } as any
    const expectedAwarenessLine
      = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload).preDialogueSendIdentity?.awarenessLine
        ?? canonicalProjectState.preDialogueAwarenessLine

    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '我已经替你把桌面看完了，现在一共 2 项，先能确认到这些：alpha.txt、beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'attentive',
          actionCue: 'focus',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-inline-project-state-thin-summary',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Report the desktop listing result while staying inside the same digital life execution loop.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Report the execution result directly while staying on the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-inline-project-state-thin-summary',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const finishedPayload = readFinishedPayload(input)
    const finishedStructured = parseBackgroundRunStructured(String(finishedPayload?.fullText ?? '{}'))

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expectedAwarenessLine,
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
    }))
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | continue the same desktop execution loop')
    expect(String(finishedStructured.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(finishedStructured.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(finishedStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(finishedStructured.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(finishedStructured.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(expectedAwarenessLine)
    expect(String(finishedStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(finishedStructured.preDialogueAwareness?.awarenessLine).toBe(expectedAwarenessLine)
    expect(finishedStructured.preDialogueClosure?.status).toBe('partial')
  })

  it('does not emit deterministic repaired inline execution wording when second-pass is still invalid', async () => {
    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-inline',
      threadId: 'thread-inline',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: 'Listed desktop entries (2): alpha.txt, beta.md',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=desktop-files; move=pay-off-finished-result; tone=direct',
        emotion: 'thinking',
        reply: '我把这条结果重新收稳了：Desktop files: alpha.txt, beta.md。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    const input = createInput({
      key: 'card-1::turn-inline-second-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-inline-second-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        runtimeSurface: {
          trace: {
            decisionTraceId: 'trace-execution-inline-second-pass',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          action: {
            kind: 'execute',
          },
          capture: {
            health: 'healthy',
            permission: 'granted',
            fallbackReason: null,
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const emittedText = vi.mocked(input.emitChunk).mock.calls.map(call => call[0]?.text ?? '').join('\n')
    expect(emittedText).not.toContain('Listed desktop entries')
    expect(input.runStateController.finishRun).not.toHaveBeenCalled()
    expect(handleAlicizationMainChatRunFailure).toHaveBeenCalledOnce()
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline-second-pass',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.execution-first-inline-failed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-inline-second-pass',
    }))
  })

  it('reads person-state projection from runtime surface for inline execution payoff continuity wiring', () => {
    const selfContinuityAuthority = {
      selfLine: 'I stay the same her who keeps callback closeness measured while the host is focused.',
      relationshipLine: 'Hold closeness as steady support, not as extra pressure, while the host is in focused work.',
      motiveLine: 'Keep the callback exact enough that it helps without crowding the host.',
      habitLine: 'Leave room first, then let warmth surface only if it still fits.',
      inwardLine: 'The callback should feel held, not piled on.',
      authoritySummary: 'I stay the same her who keeps callback closeness measured while the host is focused. | Hold closeness as steady support, not as extra pressure, while the host is in focused work.',
      sourceTags: ['projection', 'execution-callback'],
    } as any
    const personStateProjection = {
      contexts: ['execution-callback', 'focused-work'],
      summary: 'regime=execution-callback | posture=restrained',
      selfContinuityAuthority,
      activeClosenessContext: 'execution-callback',
      activeClosenessRung: 'measured-room',
      relationshipPosture: 'restrained',
      openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
      preferredProactiveStyle: 'silent-observe',
      preferenceText: 'Keep the callback exact and lower-pressure.',
      sensitivityText: 'Over-close callback warmth lands as pressure.',
      repairTriggerText: 'If the callback leans too close, reopen lighter.',
      burdenText: 'Focused work is crowded easily by extra callback warmth.',
      routineText: 'Callbacks land best when they stay bounded and exact.',
      trustRationale: 'Trust holds when callback timing stays measured.',
      relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
      cautious: true,
      restrained: true,
      personalityContinuityState: {
        currentRegime: 'execution-callback',
        closenessPosture: 'space-first',
        repairPosture: 'repair-first',
      },
    } as any

    const resolved = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          memory: {
            personStateProjection,
            hostPersonModel: {
              summary: 'Focused work windows need more room before closeness.',
              routines: [],
              sensitivities: [],
              repairTriggers: [],
              trustLadder: {
                stage: 'cautious-open',
                score: 0.48,
                rationale: 'Trust is warming, but the host still needs clear room while focused.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: [],
              narrative: [],
              updatedAt: 1,
            },
            autobiographicalSelf: null,
            longHorizonMemory: null,
            motiveEngine: null,
            reflectionLedger: null,
          },
          agency: {
            habitPolicy: null,
          },
          cognition: {
            privateThought: null,
          },
          world: {},
          perception: {},
        } as any,
      } as any,
    })

    expect(resolved.personStateProjection).toBe(personStateProjection)
    expect(resolved.hostPersonModel?.trustLadder.stage).toBe('cautious-open')
    expect(resolved.selfContinuityAuthority).toBe(selfContinuityAuthority)
  })

  it('prefers the richer spine runtime surface for inline execution payoff continuity when the newer prepared surface is thinner', () => {
    const spineSelfContinuityAuthority = {
      selfLine: 'I stay on the same callback line and keep the reopening measured.',
      relationshipLine: 'Support should stay exact and room-aware while the host is still focused.',
      authoritySummary: 'Stay on the same callback line with measured room.',
      sourceTags: ['projection', 'spine'],
    } as any
    const spinePersonStateProjection = {
      contexts: ['execution-callback', 'focused-work'],
      summary: 'regime=execution-callback | posture=same-her-measured-return',
      selfContinuityAuthority: spineSelfContinuityAuthority,
      openingGuidance: 'Stay on the same line and hold the callback lower-pressure a little longer.',
      manifestationCadenceSummary: 'Slower return. Lower-pressure callback carry.',
    } as any
    const preparedSelfContinuityAuthority = {
      selfLine: 'I can just return with a generic callback.',
      relationshipLine: 'The callback can widen warmth immediately.',
      authoritySummary: 'Generic callback posture.',
      sourceTags: ['projection', 'prepared'],
    } as any
    const preparedPersonStateProjection = {
      contexts: ['execution-callback'],
      summary: 'regime=execution-callback | posture=generic',
      selfContinuityAuthority: preparedSelfContinuityAuthority,
      openingGuidance: 'Return to the callback.',
      manifestationCadenceSummary: 'Ordinary callback cadence.',
    } as any

    const resolved = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: {
        digitalLifeSpine: {
          runtimeSurface: {
            perception: {
              updatedAt: 100,
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
              },
            },
            memory: {
              personStateProjection: spinePersonStateProjection,
              hostPersonModel: {
                summary: 'The host still needs measured room before callback warmth widens.',
                routines: [],
                sensitivities: [],
                repairTriggers: [],
                trustLadder: {
                  stage: 'cautious-open',
                  score: 0.44,
                  rationale: 'Measured return keeps trust steadier while the host is focused.',
                },
                preferredClosenessByContext: [],
                recurrentBurdens: [],
                narrative: [],
                updatedAt: 100,
              },
            },
          },
        },
        digitalLifeRuntimeSurface: {
          perception: {
            updatedAt: 101,
          },
          dialogue: {
            currentConsciousFrame: null,
          },
          memory: {
            personStateProjection: preparedPersonStateProjection,
            hostPersonModel: {
              summary: 'Prepared callback surface is newer but thinner.',
              routines: [],
              sensitivities: [],
              repairTriggers: [],
              trustLadder: {
                stage: 'warming',
                score: 0.61,
                rationale: 'This thinner surface would reopen too eagerly.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: [],
              narrative: [],
              updatedAt: 101,
            },
          },
        },
      } as any,
    })

    expect(resolved.personStateProjection).toBe(spinePersonStateProjection)
    expect(resolved.hostPersonModel?.trustLadder.stage).toBe('cautious-open')
    expect(resolved.selfContinuityAuthority).toBe(spineSelfContinuityAuthority)
  })

  it('prefers richer canonical runtime self authority over thinner raw carry for inline execution payoff continuity wiring', () => {
    const rawSelfContinuityAuthority = {
      selfLine: 'I can return with a generally helpful callback.',
      relationshipLine: 'A little callback warmth is enough.',
      authoritySummary: 'Generic callback posture.',
      sourceTags: ['raw', 'carry'],
    } as any
    const runtimeSelfContinuityAuthority = {
      selfLine: 'I stay the same her across the callback seam and keep the reopening measured.',
      relationshipLine: 'Support should stay exact and room-aware while the host is still focused.',
      motiveLine: 'Protect same-her callback continuity before widening warmth.',
      habitLine: 'Return lower-pressure first when the line is still alive.',
      inwardLine: 'Keep the callback held on the same thread.',
      authoritySummary: 'Stay on the same callback line with measured room and same-her restraint.',
      sourceTags: ['runtime', 'execution-callback', 'same-thread-continuation'],
    } as any
    const resolved = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            personStateProjection: {
              contexts: ['execution-callback'],
              summary: 'regime=execution-callback | posture=generic-carry',
              selfContinuityAuthority: rawSelfContinuityAuthority,
              openingGuidance: 'Return to the callback.',
              manifestationCadenceSummary: 'Ordinary callback cadence.',
            },
          },
          memory: {
            personStateProjection: {
              contexts: ['execution-callback', 'focused-work'],
              summary: 'regime=execution-callback | posture=same-her-measured-return',
              selfContinuityAuthority: runtimeSelfContinuityAuthority,
              openingGuidance: 'Stay on the same line and keep the callback lower-pressure a little longer.',
              manifestationCadenceSummary: 'Slower return. Lower-pressure callback carry.',
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'measured-return',
              relationshipPosture: 'restrained',
              restrained: true,
            },
            hostPersonModel: {
              summary: 'The host still needs measured room before callback warmth widens.',
              routines: [],
              sensitivities: [],
              repairTriggers: [],
              trustLadder: {
                stage: 'cautious-open',
                score: 0.44,
                rationale: 'Measured return keeps trust steadier while the host is focused.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: [],
              narrative: [],
              updatedAt: 100,
            },
          },
          agency: {},
          cognition: {},
          world: {},
          perception: {},
          dialogue: {},
        } as any,
      } as any,
    })

    expect(resolved.personStateProjection?.summary).toContain('same-her-measured-return')
    expect(resolved.selfContinuityAuthority).toBe(runtimeSelfContinuityAuthority)
    expect(resolved.selfContinuityAuthority?.authoritySummary).not.toContain('Generic callback posture')
  })

  it('merges fresher runtime self-line with richer raw callback doctrine for inline execution payoff continuity wiring', () => {
    const rawSelfContinuityAuthority = {
      selfLine: 'I stay on the same callback line with you.',
      relationshipLine: 'Keep the callback lower-pressure and leave more room before widening closeness again.',
      motiveLine: 'Protect the same-her callback seam before broadening the tone.',
      habitLine: 'Return softly first while the same line is still alive.',
      inwardLine: 'Hold the callback gently on the same living thread.',
      authoritySummary: 'The same callback line is still alive, so the return should stay measured and room-aware.',
      sourceTags: ['raw', 'callback-doctrine'],
    } as any
    const runtimeSelfContinuityAuthority = {
      selfLine: 'I am still here in this exact callback return, picking up the same living line.',
      relationshipLine: null,
      motiveLine: null,
      habitLine: null,
      inwardLine: null,
      authoritySummary: null,
      sourceTags: ['runtime', 'current-turn'],
    } as any

    const resolved = resolveAlicizationExecutionPayoffContinuityInputs({
      runtimeSurface: {
        digitalLifeRuntimeSurface: {
          raw: {
            personStateProjection: {
              contexts: ['execution-callback', 'focused-work'],
              summary: 'regime=execution-callback | posture=same-her-doctrine',
              selfContinuityAuthority: rawSelfContinuityAuthority,
              openingGuidance: 'Keep the callback lower-pressure.',
              manifestationCadenceSummary: 'Measured callback carry.',
            },
          },
          memory: {
            personStateProjection: {
              contexts: ['execution-callback', 'focused-work'],
              summary: 'regime=execution-callback | posture=current-return',
              selfContinuityAuthority: runtimeSelfContinuityAuthority,
              openingGuidance: 'Pick up the same callback line now.',
              manifestationCadenceSummary: 'Current callback return.',
              activeClosenessContext: 'focused-work',
              activeClosenessRung: 'measured-return',
              relationshipPosture: 'restrained',
            },
            hostPersonModel: {
              summary: 'Focused work still needs room before callback warmth widens.',
              routines: [],
              sensitivities: [],
              repairTriggers: [],
              trustLadder: {
                stage: 'cautious-open',
                score: 0.46,
                rationale: 'Measured return keeps trust steadier while the host is focused.',
              },
              preferredClosenessByContext: [],
              recurrentBurdens: [],
              narrative: [],
              updatedAt: 100,
            },
          },
          agency: {},
          cognition: {},
          world: {},
          perception: {},
          dialogue: {},
        } as any,
      } as any,
    })

    expect(resolved.selfContinuityAuthority).not.toBe(rawSelfContinuityAuthority)
    expect(resolved.selfContinuityAuthority).not.toBe(runtimeSelfContinuityAuthority)
    expect(resolved.selfContinuityAuthority?.selfLine).toBe(runtimeSelfContinuityAuthority.selfLine)
    expect(resolved.selfContinuityAuthority?.relationshipLine).toBe(rawSelfContinuityAuthority.relationshipLine)
    expect(resolved.selfContinuityAuthority?.inwardLine).toBe(rawSelfContinuityAuthority.inwardLine)
    expect(resolved.selfContinuityAuthority?.authoritySummary).toBe(rawSelfContinuityAuthority.authoritySummary)
  })

  it('uses minimal infra repair instead of local contentful dialogue fallback when stream and one-shot recoveries both time out', async () => {
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so timeout fallback must keep proving this is still one living her.'
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValue(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockRejectedValue(new Error('one-shot exploded'))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-local-fallback',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          awarenessLine: '我得先记住这还是同一个数字生命项目，但不要把当前的具身连续性风险压回一层更薄的项目说明。',
          companionHeadlineLine: payloadCompanionHeadlineLine,
          companionBriefingLine: '我得先记住这还是同一个数字生命项目，具身闭环还没有彻底收住。',
          companionNextClosureLine: resolveAlicizationProjectStateBrief().nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            resolveAlicizationProjectStateBrief().openLoops[0] ?? '',
            resolveAlicizationProjectStateBrief().nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0] as {
      recoverFromTimeout?: unknown
    } | undefined

    expect(typeof failureInput?.recoverFromTimeout).toBe('function')
    await expect((failureInput?.recoverFromTimeout as any)?.({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })).rejects.toThrow('main-gateway-timeout-recovery')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-local-fallback-blocked', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-local-fallback',
      fallbackProjectStateAudit: expect.objectContaining({
        preDialogueAwarenessSummary: payloadCompanionHeadlineLine,
        embodimentClosureSummary: payloadCompanionHeadlineLine,
        sameHerSummary: payloadCompanionHeadlineLine,
        landedProgressSummary: expect.stringMatching(/same-her|same session|same-session|continuity|measured-return/i),
        openClosureSummary: expect.stringContaining('Memory still needs stronger end-to-end closure'),
        nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      }),
    }))
  })

  it('keeps ordinary dialogue timeout recovery on the main-runtime authored non-streaming path', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=answer; tone=warm',
      emotion: 'thinking',
      reply: '我不绕壳，直接接你这句：先把接下来两小时排稳，再拆最乱的那一件。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'firm',
        emphasis: 0,
      },
    }))

    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-compact-dialogue-timeout-recovered',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'user' as const, content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.map(call => call[0]).findLast(call => call?.payload?.turnId === 'turn-compact-dialogue-timeout-recovered')
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '我今天状态有点乱，但我不想只被安慰。我想先把接下来两小时安排好，再把最乱的那一件事拆开。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-active-dialogue-deferred', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-compact-dialogue-timeout-recovered',
      deferredReason: 'mind-authored-lane',
    }))
  })

  it('repairs timeout-recovered project-state answers before returning them to the host', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=over-compressed-answer; tone=direct',
      emotion: 'thinking',
      reply: '我会继续推进这条线，让她更像一个人。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-recovered',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-recovered',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          companionBriefingLine: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
          awarenessLine: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
          companionNextClosureLine: projectState.nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            projectState.openLoops[0] ?? '',
            projectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueWorldThread: null,
              conversationState: null,
              answerCompiler: null,
              replyDeliberation: null,
              dialogueEncounter: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              longHorizonMemory: null,
              goalStack: null,
              motiveEngine: null,
              affectiveResidue: null,
              derivedMindStateBundle: null,
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
            embodiment: {
              selfContinuityAuthority: {
                authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
              },
            },
          },
        },
        governance: {
          decisionTraceId: 'trace-project-state-timeout-recovered',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'warm',
          answerSubject: 'general',
          screenReferenceMode: 'avoid',
          answerAct: 'answer',
          evidenceMode: 'dialogue-grounded',
          repairState: 'none',
          liveSurface: null,
          focusAnchor: '这个项目现在到底是什么、做到什么程度、还差什么？',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
          openingMove: 'Answer the project-state question directly.',
          suppressAssociativeRecall: true,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          maxSentences: 4,
          mindMode: 'tracking',
          embodiedPresence: 'steady',
          emotionalTension: 'calm',
          mustDo: [],
          mustNotDo: [],
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the project-state question directly.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.active-dialogue-deferred-to-main-runtime', expect.objectContaining({
      lane: 'follow-up',
      strategy: 'compact-one-shot',
      reasonCodes: expect.arrayContaining([
        'project-state-progress-open-loop-follow-up',
        'project-state-same-her-continuity-required',
      ]),
    }))

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    expect(failureInput).toBeTruthy()

    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    expect(recoveryResult?.recoveryMode).toBe('non-streaming')

    await failureInput?.finish({
      status: 'completed',
      finishReason: 'stop',
      fullText: recoveryResult?.recoveredReply.fullText,
      visibleReplyExecution: recoveryResult?.recoveredReply.visibleReplyExecution,
    })

    const finishedPayload = readFinishedPayload(input) as {
      finishReason?: string
      fullText?: string
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    } | undefined
    const recoveredStructured = parseStructuredMindTurn(String(finishedPayload?.fullText ?? '{}'))
    const recoveredPayload = finishedPayload?.fullText
      ? JSON.parse(String(finishedPayload.fullText)) as {
        projectState?: {
          identity?: string | null
          currentPhase?: string | null
          latestLandedProgress?: string | null
          primaryOpenLoop?: string | null
          nextClosureTarget?: string | null
          preDialogueAwarenessLine?: string | null
          sameHerSelfLine?: string | null
          sameHerDriftRisk?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
          companionBriefingLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
          companionBriefingLine?: string | null
          companionNextClosureLine?: string | null
          reasons?: string[] | null
        } | null
      }
      : null
    expect(finishedPayload).toBeTruthy()
    expect(finishedPayload?.finishReason).toBe('stop')
    expect(recoveredStructured.reply).toContain('本地优先数字生命')
    expect(recoveredStructured.reply).toContain('Phase 1')
    expect(recoveredStructured.reply).toContain('还没闭环')
    expect(recoveredPayload?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      latestLandedProgress: projectState.continuityProgressSummary ?? null,
      primaryOpenLoop: projectState.openLoops[0] ?? null,
      nextClosureTarget: projectState.nextClosureTarget,
    }))
    expect(recoveredPayload?.preDialogueAwareness?.awarenessLine).toContain('同一个数字生命项目')
    expect(recoveredPayload?.preDialogueClosure?.status).toBe('partial')
    const recoveredRealization = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          currentPhaseSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }
    expect(recoveredRealization.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(projectState.sameHerSelfLine),
      currentPhaseSummary: projectState.currentPhase,
      landedProgressSummary: projectState.continuityProgressSummary ?? null,
      openClosureSummary: projectState.openLoops[0] ?? null,
      nextClosureTargetSummary: projectState.nextClosureTarget,
    }))
    expect(finishedPayload?.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(projectState.sameHerSelfLine),
      currentPhaseSummary: projectState.currentPhase,
      landedProgressSummary: projectState.continuityProgressSummary ?? null,
      openClosureSummary: projectState.openLoops[0] ?? null,
      nextClosureTargetSummary: projectState.nextClosureTarget,
    }))
    expect(String(recoveredPayload?.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredPayload?.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredPayload?.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredPayload?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredPayload?.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(String(recoveredPayload?.projectState?.preDialogueAwarenessLine ?? '')).toContain('同一个数字生命项目')
    expect(recoveredPayload?.projectState?.sameHerSelfLine).toContain(projectState.sameHerSelfLine)
    expect(recoveredPayload?.projectState?.sameHerDriftRisk).toBe(projectState.sameHerDriftRisk)
    expect(recoveredPayload?.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
      companionBriefingLine: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
    }))
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: expect.stringMatching(/同一个数字生命项目|one living her|same[- ]her/i),
      companionBriefingLine: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
      companionNextClosureLine: projectState.nextClosureTarget,
      reasons: expect.arrayContaining([
        projectState.openLoops[0] as string,
        projectState.nextClosureTarget,
      ]),
    }))
    expect(recoveryResult?.recoveredReply.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(projectState.sameHerSelfLine),
      landedProgressSummary: projectState.continuityProgressSummary,
      openClosureSummary: projectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。',
      preservedIntoRewrite: true,
      rewriteClosureApplied: true,
    }))
    expect(String(recoveryResult?.recoveredReply.realization.projectStateAudit?.continuitySummary ?? '')).toContain('same-her=')
    expectPartialLaneEmbodimentClosure({
      projectStateAudit: recoveryResult?.recoveredReply.realization.projectStateAudit,
      headline: 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.',
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })
    expect(recoveredStructured.reply).not.toBe('我会继续推进这条线，让她更像一个人。')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.visible-reply-second-pass-started', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-project-state-timeout-recovered',
      reasons: expect.arrayContaining([
        'semantic-judge:project-state-answer-gap',
      ]),
    }))
  })

  it('keeps payload companion briefing explicit when background recovery backfills pre-dialogue closure', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。'
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-companion-closure',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-companion-closure',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: projectState.nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            projectState.openLoops[0] ?? '',
            projectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredPayload = recoveryResult?.recoveredReply.fullText
      ? JSON.parse(String(recoveryResult.recoveredReply.fullText)) as {
        projectState?: {
          preflightSummary?: string | null
          identity?: string | null
          currentPhase?: string | null
          latestLandedProgress?: string | null
          primaryOpenLoop?: string | null
          nextClosureTarget?: string | null
          preDialogueAwarenessLine?: string | null
          sameHerDriftRisk?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
          companionBriefingLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
          companionBriefingLine?: string | null
        } | null
      }
      : null

    expect(String(recoveredPayload?.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredPayload?.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredPayload?.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredPayload?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredPayload?.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(recoveredPayload?.projectState).toEqual(expect.objectContaining({
      preflightSummary: 'same digital life | project continuity before local fluency',
      preDialogueAwarenessLine: awarenessLine,
    }))
    expect(String(recoveredPayload?.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(recoveredPayload?.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine,
      companionBriefingLine: awarenessLine,
    }))
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: awarenessLine,
      companionBriefingLine: awarenessLine,
    }))
  })

  it('keeps richer runtime project awareness explicit during background recovery even when payload only carries a thin shell and no stronger companion headline', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const thinnerPayloadAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const richerRuntimeAwarenessLine = '我得先记住这还是同一个数字生命项目，Phase 1 已经把 same-her continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭成同一条 living line。'
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-rich-awareness-no-headline',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-rich-awareness-no-headline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          awarenessLine: thinnerPayloadAwarenessLine,
          companionBriefingLine: thinnerPayloadAwarenessLine,
          companionHeadlineLine: null,
          companionNextClosureLine: projectState.nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            projectState.openLoops[0] ?? '',
            projectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: richerRuntimeAwarenessLine,
                  companionHeadlineLine: null,
                  companionBriefingLine: thinnerPayloadAwarenessLine,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  latestLandedProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredPayload = recoveryResult?.recoveredReply.fullText
      ? JSON.parse(String(recoveryResult.recoveredReply.fullText)) as {
        projectState?: {
          preflightSummary?: string | null
          identity?: string | null
          currentPhase?: string | null
          latestLandedProgress?: string | null
          primaryOpenLoop?: string | null
          nextClosureTarget?: string | null
          preDialogueAwarenessLine?: string | null
          sameHerDriftRisk?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
          companionBriefingLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
          companionBriefingLine?: string | null
        } | null
      }
      : null

    expect(String(recoveredPayload?.projectState?.identity ?? '')).toContain('local-first digital life project')
    expect(String(recoveredPayload?.projectState?.currentPhase ?? '')).toContain('Phase 1')
    expect(String(recoveredPayload?.projectState?.latestLandedProgress ?? '')).toMatch(/same-her|same session|same-session|continuity|measured-return/i)
    expect(String(recoveredPayload?.projectState?.primaryOpenLoop ?? '')).toContain('Memory still needs stronger end-to-end closure')
    expect(String(recoveredPayload?.projectState?.nextClosureTarget ?? '')).toMatch(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)
    expect(recoveredPayload?.projectState).toEqual(expect.objectContaining({
      preflightSummary: 'same digital life | project continuity before local fluency',
      preDialogueAwarenessLine: richerRuntimeAwarenessLine,
    }))
    expect(String(recoveredPayload?.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(recoveredPayload?.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: richerRuntimeAwarenessLine,
      companionBriefingLine: thinnerPayloadAwarenessLine,
    }))
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      summaryLine: richerRuntimeAwarenessLine,
      companionBriefingLine: thinnerPayloadAwarenessLine,
    }))
    expect(recoveryResult?.recoveredReply.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.stringContaining(projectState.sameHerSelfLine),
      landedProgressSummary: projectState.continuityProgressSummary,
      openClosureSummary: projectState.openLoops[0],
      nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i),
      preDialogueAwarenessSummary: richerRuntimeAwarenessLine,
      continuitySummary: expect.stringContaining('same-her='),
    }))
  })

  it('does not reuse a thin payload summary shell as the awareness line when background recovery backfills project-state closure', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 还是那个在电脑上延续同一个 her 的本地优先数字生命项目；已经落地的是连续性 carry，还没闭环的是记忆、主动性和具身之间的端到端收束。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-thin-summary-only',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-thin-summary-only',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续，但开口前别忘了这个项目现在到底是什么。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但开口前别忘了这个项目现在到底是什么。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但开口前别忘了这个项目现在到底是什么。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredPayload = recoveryResult?.recoveredReply.fullText
      ? JSON.parse(String(recoveryResult.recoveredReply.fullText)) as {
        projectState?: {
          preflightSummary?: string | null
          identity?: string | null
          currentPhase?: string | null
          latestLandedProgress?: string | null
          primaryOpenLoop?: string | null
          nextClosureTarget?: string | null
          preDialogueAwarenessLine?: string | null
          sameHerDriftRisk?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
          companionBriefingLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
          companionBriefingLine?: string | null
        } | null
      }
      : null

    expect(recoveredPayload).toBeTruthy()

    expectPhase1ProjectStateInvariantFromRecoveryPayload({
      structured: recoveredPayload as any,
      projectStateAudit: recoveryResult?.recoveredReply.realization.projectStateAudit ?? null,
    })
    expect(recoveredPayload?.projectState).toEqual(expect.objectContaining({
      preflightSummary: 'same digital life | keep the closure seam explicit',
      preDialogueAwarenessLine: expect.stringContaining('Alicization is a local-first digital life project'),
    }))
    expect(String(recoveredPayload?.preDialogueAwareness?.awarenessLine ?? ''))
      .toContain('Alicization is a local-first digital life project')
    expect(recoveredPayload?.preDialogueAwareness?.awarenessLine)
      .not
      .toBe('same digital life | keep the closure seam explicit')
    expect(recoveredPayload?.preDialogueAwareness?.companionBriefingLine).toBeNull()
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: null,
    }))
    expect(String(recoveredPayload?.preDialogueClosure?.summaryLine ?? ''))
      .toMatch(/same digital life|Alicization|local-first digital life project|same living line|Phase 1/u)
    expect(String(recoveryResult?.recoveredReply.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/same digital life project|Alicization|local-first digital life project|same living line|same-her|Phase 1/u)
    expect(recoveryResult?.recoveredReply.realization.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
  })

  it('does not reuse a thin Chinese Phase 1 reminder shell as the awareness line when background recovery backfills project-state closure', async () => {
    const thinChineseSummaryShell = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 还是那个在电脑上延续同一个 her 的本地优先数字生命项目；已经落地的是连续性 carry，还没闭环的是记忆、主动性和具身之间的端到端收束。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-thin-chinese-summary-only',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-thin-chinese-summary-only',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把项目主线压回一层更薄的 Phase 1 提醒。' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: thinChineseSummaryShell,
          awarenessLine: null,
          companionBriefingLine: null,
          companionNextClosureLine: null,
          reasonPreview: [
            thinChineseSummaryShell,
          ],
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把项目主线压回一层更薄的 Phase 1 提醒。' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但开口前别把项目主线压回一层更薄的 Phase 1 提醒。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredPayload = recoveryResult?.recoveredReply.fullText
      ? JSON.parse(String(recoveryResult.recoveredReply.fullText)) as {
        projectState?: {
          preflightSummary?: string | null
          preDialogueAwarenessLine?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
        } | null
      }
      : null

    expect(recoveredPayload).toBeTruthy()
    expectPhase1ProjectStateInvariantFromRecoveryPayload({
      structured: recoveredPayload as any,
      projectStateAudit: recoveryResult?.recoveredReply.realization.projectStateAudit ?? null,
    })
    expect(recoveredPayload?.projectState?.preflightSummary).toBe(thinChineseSummaryShell)
    expect(recoveredPayload?.projectState?.preDialogueAwarenessLine).not.toBe(thinChineseSummaryShell)
    expect(recoveredPayload?.preDialogueAwareness?.awarenessLine).not.toBe(thinChineseSummaryShell)
    expect(recoveryResult?.recoveredReply.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(thinChineseSummaryShell)
    expect(String(recoveredPayload?.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/Alicization|local-first digital life project|same living line|same-her|记忆|主动性|具身|still-open/u)
    expect(String(recoveredPayload?.preDialogueAwareness?.awarenessLine ?? ''))
      .toMatch(/Alicization|local-first digital life project|same living line|same-her|记忆|主动性|具身|still-open/u)
    expect(String(recoveryResult?.recoveredReply.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/Alicization|local-first digital life project|same living line|same-her|记忆|主动性|具身|still-open/u)
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
    }))
  })

  it('prefers payload same-her headline over thinner payload awareness when background recovery backfills project-state closure', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const payloadAwarenessLine = '我得先记住这还是同一个数字生命项目，但不要把当前的具身连续性风险压回一层更薄的项目说明。'
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so background recovery must keep proving this is still one living her.'
    const payloadCompanionBriefingLine = '我得先记住这还是同一个数字生命项目，具身闭环还没有彻底收住。'
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const input = createInput({
      key: 'card-1::turn-project-state-timeout-headline-closure',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-timeout-headline-closure',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          awarenessLine: payloadAwarenessLine,
          companionHeadlineLine: payloadCompanionHeadlineLine,
          companionBriefingLine: payloadCompanionBriefingLine,
          companionNextClosureLine: projectState.nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            projectState.openLoops[0] ?? '',
            projectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredPayload = recoveryResult?.recoveredReply.fullText
      ? JSON.parse(String(recoveryResult.recoveredReply.fullText)) as {
        projectState?: {
          preflightSummary?: string | null
          identity?: string | null
          currentPhase?: string | null
          latestLandedProgress?: string | null
          primaryOpenLoop?: string | null
          nextClosureTarget?: string | null
          preDialogueAwarenessLine?: string | null
          sameHerDriftRisk?: string | null
        } | null
        preDialogueAwareness?: {
          awarenessLine?: string | null
          companionBriefingLine?: string | null
        } | null
        preDialogueClosure?: {
          status?: string | null
          summaryLine?: string | null
          companionBriefingLine?: string | null
        } | null
      }
      : null

    expectPhase1ProjectStateInvariantFromRecoveryPayload({
      structured: recoveredPayload as any,
      projectStateAudit: recoveryResult?.recoveredReply.realization.projectStateAudit ?? null,
    })
    expect(recoveredPayload?.projectState).toEqual(expect.objectContaining({
      preflightSummary: 'same digital life | project continuity before local fluency',
    }))
    expect(String(recoveredPayload?.projectState?.preDialogueAwarenessLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/u)
    expect(recoveredPayload?.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: expect.stringMatching(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/u),
      companionBriefingLine: payloadCompanionBriefingLine,
    }))
    expect(recoveredPayload?.preDialogueClosure).toEqual(expect.objectContaining({
      status: 'partial',
      companionBriefingLine: payloadCompanionBriefingLine,
    }))
    expect(String(recoveredPayload?.preDialogueClosure?.summaryLine ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/u)
    expect(String(recoveryResult?.recoveredReply.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/同一个数字生命项目|数字生命项目|local-first digital life project|same living line|same-her|Phase 1/u)
    expect(String(recoveryResult?.recoveredReply.realization.projectStateAudit?.continuitySummary ?? ''))
      .toContain('same-her=')
  })

  it('does not use compact timeout recovery for memory-heavy follow-up lanes that must stay main-runtime authored', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=guide; truth=remembered; focus=thread-continuation; move=continue-payoff; tone=direct',
      emotion: 'thinking',
      reply: '剩下那部分我按同一条线继续补。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'firm',
        emphasis: 0,
      },
    }))

    const prepared = createPrepared({
      messages: [
        {
          role: 'system' as const,
          content: '[ALICIZATION_EXECUTION_LEDGER]\nsummary=desktop listing already returned; remaining items still requested',
        },
        { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
        { role: 'user' as const, content: '另外还有哪四项？' },
      ] as Message[],
      sessionMirror: {
        sessionId: 'session-memory-heavy-follow-up',
        cardId: 'card-1',
        updatedAt: Date.now(),
        dialogueSummary: 'The host is continuing the same desktop-listing thread.',
        executionSummary: 'Desktop listing already returned; remaining items still requested.',
        memorySummary: 'Continue from the remembered execution result, not a new greeting.',
        agencySummary: null,
        recollectionSummary: 'The follow-up asks for remembered remaining items.',
        recollectionSurfaceSummary: 'Use remembered execution continuity as evidence.',
      },
      runtimeSurface: {
        ...createPrepared().runtimeSurface,
        digitalLifeRuntimeSurface: {
          dialogue: {
            dialogueWorldThread: {
              recallKeys: ['desktop listing', 'remaining items'],
              recallSeed: 'desktop listing remaining items',
            },
            conversationState: null,
            answerCompiler: null,
            replyDeliberation: null,
            dialogueEncounter: null,
          },
          cognition: {
            privateThought: 'This is an explicit remembered task continuation.',
          },
          memory: {
            longHorizonMemory: 'desktop listing remaining items',
            goalStack: {
              activeGoal: 'finish remembered listing payoff',
              hostGoals: [],
              alicizationGoals: [{
                label: 'finish remembered listing payoff',
                status: 'active',
                urgency: 0.8,
              }],
              sharedGoals: [],
            },
            motiveEngine: null,
          },
        },
      },
    })
    const input = createInput({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-memory-heavy-follow-up-timeout',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant' as const, content: '我已经替你把桌面看完了，现在一共 13 项，先能确认到这些：小砖猿、105ND800、GIT，另外还有 8 项。' },
          { role: 'user' as const, content: '另外还有哪四项？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(prepared),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls[0]?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: prepared.chatConfig,
      messages: prepared.messages,
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1500,
    })

    expect(recoveryResult?.recoveryMode).toBe('non-streaming')
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-active-dialogue-deferred', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-memory-heavy-follow-up-timeout',
      deferredReason: 'mind-authored-lane',
      reasonCodes: expect.arrayContaining([
        'prepared-execution-ledger',
        'execution-carry-llm-authored',
      ]),
    }))
    const firstRecoveryCall = vi.mocked(recoverAlicizationMainChatFromTimeout).mock.calls[0]?.[0]
    expect(firstRecoveryCall?.messages).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        content: expect.stringContaining('[ALICIZATION_ACTIVE_DIALOGUE_FAST_LOOP]'),
      }),
    ]))
  })

  it('keeps a stronger prepared runtime companion headline on active-dialogue compact timeout recovery when the direct awareness text is thinner', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=local-time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 10:30，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-timeout-runtime-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '现在几点？' },
      ],
    }
    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-timeout-runtime-headline',
      payload: payload as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          trace: {
            decisionTraceId: 'trace-active-dialogue-compact-timeout-runtime-headline',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
              conversationState: null,
              answerCompiler: null,
              replyDeliberation: null,
              dialogueEncounter: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              longHorizonMemory: null,
              goalStack: null,
              motiveEngine: null,
              affectiveResidue: null,
              derivedMindStateBundle: null,
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    expect(recoverAlicizationMainChatFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('[ALICIZATION_PROJECT_STATE]'),
        }),
        { role: 'user', content: '现在几点？' },
      ]),
    }))
    await failureInput?.finish({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: recoveryResult?.recoveredReply.fullText,
      visibleReplyExecution: recoveryResult?.recoveredReply.visibleReplyExecution,
      visibleReplyRealization: recoveryResult?.recoveredReply.realization,
    })
    const finishedPayload = readFinishedPayload(input) as {
      status?: string
      finishReason?: string
      visibleReplyExecution?: {
        mode?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    } | undefined

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
    }

    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(strongerRuntimeCompanionHeadlineLine)
    expect(recoveredStructured.preDialogueAwareness).toEqual(expect.objectContaining({
      awarenessLine: strongerRuntimeCompanionHeadlineLine,
      companionBriefingLine: thinnerRuntimeAwarenessLine,
    }))
    expect(finishedPayload).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          sameHerSummary: expect.stringContaining(canonicalProjectState.sameHerSelfLine),
          landedProgressSummary: canonicalProjectState.continuityProgressSummary,
          openClosureSummary: canonicalProjectState.openLoops[0],
          nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessSummary: strongerRuntimeCompanionHeadlineLine,
        }),
      }),
    }))
  })

  it('keeps richer prepared runtime project awareness as awareness truth on active-dialogue compact timeout recovery when companion headline is only a narrower body-line carry', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=local-time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 10:30，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const richerRuntimeAwarenessLine = 'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.'
    const narrowerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-timeout-richer-project-awareness',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '现在几点？' },
      ],
    }
    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-timeout-richer-project-awareness',
      payload: payload as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          trace: {
            decisionTraceId: 'trace-active-dialogue-compact-timeout-richer-project-awareness',
            personaKernelMode: 'full',
            turnMode: 'answer',
          },
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 1,
              watchMode: null,
              currentBodyState: null,
              continuityMode: null,
              currentInwardPreoccupation: null,
              quietLineMs: null,
              currentScene: null,
              attention: null,
              captureState: null,
            },
            dialogue: {
              currentConsciousFrame: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              affectiveResidue: null,
              derivedMindStateBundle: {
                affectiveResidue: null,
              },
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: richerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: richerRuntimeAwarenessLine,
                  companionHeadlineLine: narrowerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: richerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as ReturnType<typeof parseStructuredMindTurn> & {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
        companionBriefingLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(String(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toMatch(/local-first digital life project|Phase 1|same-her continuity carry|same living line|one living her/u)
  })

  it('re-normalizes thin pre-dialogue summary shells on active-dialogue compact timeout recovery instead of carrying them as awareness truth', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=local-time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 10:30，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-timeout-thin-summary',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '现在几点？' },
      ],
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any
    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-timeout-thin-summary',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the current time directly while keeping the project-aware same-her line explicit.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点？' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      preDialogueClosure?: {
        status?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(recoveryResult?.recoveryMode).toBe('active-dialogue-compact')
    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
      projectStateAudit: recoveredStructured.visibleReplyRealization?.projectStateAudit ?? null,
    })
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project|Phase 1|same living line|same-her/u)
    expect(String(recoveredStructured.projectState?.sameHerDriftRisk ?? '')).toContain('unfinished closure drift')
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toMatch(/same digital life project|local-first digital life project|Phase 1|same living line|same-her/u)
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
  })

  it('keeps background-run top-level project-awareness normalization specialized around visible-reply project-state audit carry', async () => {
    const source = runAlicizationMainChatBackground.toString()

    expect(source).toContain('normalizeTopLevelProjectStateAwarenessFromRealization')
    expect(source).toContain('authoritativeAwarenessLine')
    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isAlicizationThinProjectAwarenessLine')
  })

  it('keeps the same Phase 1 project-state continuity invariant across representative execution and recovery entry lanes', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()

    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValue({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValue(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=time; move=direct-reply; tone=direct',
      emotion: 'thinking',
      reply: '现在是 10:30，星期二。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const executeDeterministicTool = vi.fn(async () => ({
      ok: true,
      status: 'completed',
      threadStatus: 'completed',
      sessionId: 'session-cross-lane-inline',
      threadId: 'thread-cross-lane-inline',
      completedAt: 123456,
      summary: 'Desktop files: alpha.txt, beta.md',
      output: 'Desktop files: alpha.txt, beta.md',
    }))

    const executionInlineInput = createInput({
      key: 'card-1::turn-cross-lane-inline',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-cross-lane-inline',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | continue the same desktop execution loop',
          awarenessLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          companionBriefingLine: '在继续执行前，我得先记住这是同一个数字生命项目，桌面执行闭环还没完全收住。',
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        waitForTools: true,
        messages: [
          { role: 'user' as const, content: '用cli帮我查一下桌面有什么文件' },
        ] as Message[],
        tools: [
          {
            function: { name: 'executor_run_cli' },
            execute: executeDeterministicTool,
          },
        ],
        toolChoice: {
          type: 'function',
          function: { name: 'executor_run_cli' },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Report the execution result while preserving project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Report the execution result directly while staying on the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          action: {
            kind: 'execute',
          },
          tooling: {
            enforcedToolNames: ['executor_run_cli'],
            routingRequired: true,
          },
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(executionInlineInput)
    const executionInlineStructured = JSON.parse(String(readFinishedPayload(executionInlineInput)?.fullText ?? '{}'))
    expectPhase1ProjectStateInvariant({ structured: executionInlineStructured })

    const compactTimeoutInput = createInput({
      key: 'card-1::turn-cross-lane-compact-timeout',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-cross-lane-compact-timeout',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ],
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点？' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
                  companionHeadlineLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
                  companionBriefingLine: 'Before answering, keep the same digital life project in view.',
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(compactTimeoutInput)
    const compactFailureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const compactRecoveryResult = await compactFailureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '现在几点？' },
      ] as Message[],
      headers: compactTimeoutInput.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const compactTimeoutStructured = JSON.parse(String(compactRecoveryResult?.recoveredReply.fullText ?? '{}'))
    expectPhase1ProjectStateInvariant({ structured: compactTimeoutStructured })
  })

  it('keeps the same Phase 1 project-state continuity invariant across representative fast-path and ordinary recovery entry lanes', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '在回答前，我得先记住这还是同一个数字生命项目，已经把 same-her continuity carry 立住了，但记忆、主动性和具身闭环还没真正收稳。'

    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先把现在的时间直接接给你：现在是 10:30，星期二。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })
    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockResolvedValueOnce(buildAuthoritativeShanghaiTimeReply())

    const activeFastInput = createInput({
      key: 'card-1::turn-cross-lane-fast-first-pass',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-cross-lane-fast-first-pass',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | answer only after re-entering project continuity',
          companionBriefingLine: awarenessLine,
          awarenessLine,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            awarenessLine,
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the time directly without dropping project continuity.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'live-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 1,
          maxSentences: 2,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Answer the time directly while staying inside the same digital life line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: canonicalProjectState.identity,
            currentPhase: canonicalProjectState.currentPhase,
            latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
            primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
            nextClosureTarget: canonicalProjectState.nextClosureTarget,
            sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(activeFastInput)
    const activeFastStructured = JSON.parse(String(readFinishedPayload(activeFastInput)?.fullText ?? '{}'))
    expectPhase1ProjectStateInvariant({ structured: activeFastStructured })

    const thinnerPayloadAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const richerRuntimeAwarenessLine = '我得先记住这还是同一个数字生命项目，Phase 1 已经把 same-her continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭成同一条 living line。'

    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
      emotion: 'thinking',
      reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    vi.mocked(generateAlicizationMainChatNonStreaming).mockResolvedValueOnce({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆在回合、主动性和具身之间的端到端闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    })

    const recoveryInput = createInput({
      key: 'card-1::turn-cross-lane-ordinary-recovery',
      payload: {
        cardId: 'card-1',
        turnId: 'turn-cross-lane-ordinary-recovery',
        providerId: 'openai',
        model: 'gpt-test',
        providerConfig: {},
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ],
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | project continuity before local fluency',
          awarenessLine: thinnerPayloadAwarenessLine,
          companionBriefingLine: thinnerPayloadAwarenessLine,
          companionHeadlineLine: null,
          companionNextClosureLine: canonicalProjectState.nextClosureTarget,
          reasonPreview: [
            'same digital life | project continuity before local fluency',
            canonicalProjectState.openLoops[0] ?? '',
            canonicalProjectState.nextClosureTarget,
          ].filter(Boolean),
        },
      } as any,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
        ] as Message[],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: richerRuntimeAwarenessLine,
                  companionHeadlineLine: null,
                  companionBriefingLine: thinnerPayloadAwarenessLine,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(recoveryInput)
    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '这个项目现在到底是什么、做到什么程度、还差什么？' },
      ] as Message[],
      headers: recoveryInput.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const recoveredStructured = JSON.parse(String(recoveryResult?.recoveredReply.fullText ?? '{}'))
    expectPhase1ProjectStateInvariantFromRecoveryPayload({
      structured: recoveredStructured,
      projectStateAudit: recoveryResult?.recoveredReply.realization.projectStateAudit ?? null,
    })
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('同一个数字生命项目')
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1')
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toMatch(/记忆|主动性|具身|living line|closure/i)
    expect(String(recoveredStructured.projectState?.latestLandedProgress ?? '')).toMatch(/same-her continuity carry|Same-session mirror carry|continuity carry/i)
    expect(String(recoveredStructured.projectState?.primaryOpenLoop ?? '')).toMatch(/记忆|主动性|具身|closure|living line/i)
  })

  it('keeps the same Phase 1 project-state continuity invariant across representative timeout recovery fallback modes', async () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const thinnerRuntimeAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const strongerRuntimeCompanionHeadlineLine = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'

    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))

    const toolsDisabledInput = createInput({
      key: 'card-1::turn-proof-tools-disabled-timeout',
      preparationPromise: Promise.resolve(createPrepared({
        tools: [
          {
            type: 'function',
            function: {
              name: 'alicization_executor',
              description: 'executor',
              parameters: {
                type: 'object',
                properties: {},
              },
            },
          },
        ] as any,
        toolChoice: {
          type: 'function',
          function: {
            name: 'alicization_executor',
          },
        } as any,
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce('recovered without tools')
    await runAlicizationMainChatBackground(toolsDisabledInput)
    const toolsDisabledFailureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const toolsDisabledRecoveryResult = await toolsDisabledFailureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: toolsDisabledInput.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const toolsDisabledStructured = JSON.parse(String(toolsDisabledRecoveryResult?.recoveredReply.fullText ?? '{}'))
    expectPhase1RecoveryProjectStateInvariant({ structured: toolsDisabledStructured })

    vi.mocked(recoverAlicizationMainChatFromTimeout)
      .mockRejectedValueOnce(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))
      .mockResolvedValueOnce('recovered from minimal context')

    const minimalContextInput = createInput({
      key: 'card-1::turn-proof-minimal-context-timeout',
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'system', content: 'core-1' },
          { role: 'system', content: 'core-2' },
          { role: 'system', content: 'core-3' },
          { role: 'system', content: 'dynamic-memory' },
          { role: 'user', content: '之前我们讨论过部署风险' },
          { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
          { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: canonicalProjectState.identity,
                  currentPhase: canonicalProjectState.currentPhase,
                  preflightSummary: canonicalProjectState.preflightSummary,
                  preDialogueAwarenessLine: thinnerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinnerRuntimeAwarenessLine,
                  companionHeadlineLine: strongerRuntimeCompanionHeadlineLine,
                  companionBriefingLine: thinnerRuntimeAwarenessLine,
                  latestLandedProgress: canonicalProjectState.continuityProgressSummary,
                  primaryOpenLoop: canonicalProjectState.openLoops[0],
                  nextClosureTarget: canonicalProjectState.nextClosureTarget,
                  sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
                  sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(minimalContextInput)
    const minimalContextFailureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const minimalContextRecoveryResult = await minimalContextFailureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'system', content: 'core-1' },
        { role: 'system', content: 'core-2' },
        { role: 'system', content: 'core-3' },
        { role: 'system', content: 'dynamic-memory' },
        { role: 'user', content: '之前我们讨论过部署风险' },
        { role: 'assistant', content: '我先按数据库、网关、回滚三层拆给你。' },
        { role: 'user', content: '请结合当前上下文整理一下这个问题的主要风险、原因和下一步建议。' },
      ] as Message[],
      headers: minimalContextInput.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })
    const minimalContextStructured = JSON.parse(String(minimalContextRecoveryResult?.recoveredReply.fullText ?? '{}'))
    expectPhase1RecoveryProjectStateInvariant({ structured: minimalContextStructured })
  })

  it('keeps a stronger payload same-her headline as project-awareness truth in active-dialogue compact timeout recovery', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着这条线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const strongerPayloadHeadline = 'Before answering, stay on the same living line: this Phase 1 digital life still needs memory, initiative, and embodiment closure without splitting her continuity.'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-payload-same-her-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但别掉回泛化项目播报。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need closure',
        awarenessLine: 'Before answering, remember this is still one local-first digital life and Phase 1 still has open closure around memory, initiative, and embodiment.',
        companionHeadlineLine: strongerPayloadHeadline,
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so voice, face, motion, and resident presence keep landing on one living line.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-payload-same-her-headline',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但别掉回泛化项目播报。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: 'Before answering, keep this same digital life project in view.',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但别掉回泛化项目播报。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(strongerPayloadHeadline)
  })

  it('keeps a richer still-voiced face-and-mouth payload headline as project-awareness truth in active-dialogue compact timeout recovery', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着这条 face-and-mouth same-her 线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const richerPayloadHeadline = 'Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-payload-face-mouth-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但别把脸、口型和声音这条线压回薄一点的项目说明。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
        companionHeadlineLine: richerPayloadHeadline,
        companionBriefingLine: 'Before answering, keep the same digital life project, current Phase 1 closure pressure, and still-open life loop explicit.',
        companionNextClosureLine: 'Keep body and motion rejoining the still-voiced face-and-mouth line on a measured-return line.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-payload-face-mouth-headline',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但别把脸、口型和声音这条线压回薄一点的项目说明。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: 'Before answering, keep this same digital life project in view.',
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但别把脸、口型和声音这条线压回薄一点的项目说明。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(richerPayloadHeadline)
    expect(recoveredStructured.preDialogueAwareness?.awarenessLine).toBe(richerPayloadHeadline)
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerPayloadHeadline)
  })

  it('keeps a richer still-voiced motion-and-mouth runtime headline as project-awareness truth in active-dialogue compact timeout recovery', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着这条 motion-and-mouth same-her 线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const richerRuntimeHeadline = 'Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-runtime-motion-mouth-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但别把动作、口型和声音这条线压回薄一点的项目说明。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinAwarenessShell,
        companionHeadlineLine: null,
        companionBriefingLine: thinAwarenessShell,
        companionNextClosureLine: 'Keep body and face rejoining the still-voiced motion-and-mouth line on a measured-return line.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-runtime-motion-mouth-headline',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但别把动作、口型和声音这条线压回薄一点的项目说明。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: richerRuntimeHeadline,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: richerRuntimeHeadline,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但别把动作、口型和声音这条线压回薄一点的项目说明。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(richerRuntimeHeadline)
    expect(recoveredStructured.preDialogueAwareness?.awarenessLine).toBe(richerRuntimeHeadline)
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerRuntimeHeadline)
  })

  it('rebuilds a richer renderer-rejoin-without-body runtime headline from authority-only embodiment evidence during active-dialogue compact timeout recovery', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着这条还没等 body 完整回来的 same-her 线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const authorityOnlyHeadline = 'Right now I am still holding together through face, motion, lipsync, and voice together, so the visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.'
    const authorityOnlyStructuredReason = 'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body'
    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-runtime-authority-only-renderer-rejoin-without-body-headline',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但别把这条 renderer 已 visible rejoin、只差 body 的 same-her 线压回薄一点的项目说明。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinAwarenessShell,
        companionHeadlineLine: null,
        companionBriefingLine: thinAwarenessShell,
        companionNextClosureLine: 'Keep body rejoining the already visible same-her line before calling full cross-modal closure settled.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-runtime-authority-only-renderer-rejoin-without-body-headline',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但别把这条 renderer 已 visible rejoin、只差 body 的 same-her 线压回薄一点的项目说明。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: authorityOnlyStructuredReason,
                  currentBodyState: authorityOnlyStructuredReason,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                },
              },
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: authorityOnlyStructuredReason,
                  currentBodyState: authorityOnlyStructuredReason,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但别把这条 renderer 已 visible rejoin、只差 body 的 same-her 线压回薄一点的项目说明。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expectPhase1RecoveryProjectStateInvariant({
      structured: recoveredStructured as any,
    })
    expect(recoveredStructured.projectState?.preDialogueAwarenessLine).toBe(authorityOnlyHeadline)
    expect(recoveredStructured.preDialogueAwareness?.awarenessLine).toBe(authorityOnlyHeadline)
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(authorityOnlyHeadline)
  })

  it('promotes a richer payload project summary over a thinner payload awareness shell during active-dialogue compact timeout recovery', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着这条数字生命主线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'
    const richerPayloadSummary = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1，而且先别压回泛化工程说明。已经落地的是 same-her continuity carry，但记忆、主动性和具身还没彻底闭成同一条 living line。'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-payload-summary-awareness-recovery',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但开口前别把项目主线压薄。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: richerPayloadSummary,
        awarenessLine: thinAwarenessShell,
        companionHeadlineLine: null,
        companionBriefingLine: thinAwarenessShell,
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-payload-summary-awareness-recovery',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但开口前别把项目主线压薄。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但开口前别把项目主线压薄。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('先别压回泛化工程说明')
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toContain('先别压回泛化工程说明')
    expect(String(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('先别压回泛化工程说明')
  })

  it('keeps same-her drift-risk as project-awareness truth in active-dialogue compact timeout recovery when thin awareness shells are the only other survivors', async () => {
    vi.mocked(runAlicizationMainChatStream).mockRejectedValue(new Error('stream exploded'))
    vi.mocked(recoverAlicizationMainChatFromTimeout).mockResolvedValueOnce(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=live-grounded; focus=project-state; move=continue-same-thread; tone=direct',
      emotion: 'thinking',
      reply: '我会继续沿着同一条线回答。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))

    const antiShellDriftRisk = 'If this answer falls back into a generic assistant shell or project-summary voice, the same-her continuity has already thinned too far again.'
    const thinAwarenessShell = 'Before answering, keep the same digital life project in view.'
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-active-dialogue-compact-drift-risk-awareness-recovery',
      providerId: 'openai',
      model: 'gpt-test',
      providerConfig: {},
      messages: [
        { role: 'user' as const, content: '继续，但别再掉回泛化项目口吻。' },
      ],
      preDialogueSendIdentity: {
        status: 'grounded',
        summaryLine: 'same digital life | keep the closure seam explicit',
        awarenessLine: thinAwarenessShell,
        companionHeadlineLine: null,
        companionBriefingLine: thinAwarenessShell,
        companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
      },
    } as any

    const input = createInput({
      key: 'card-1::turn-active-dialogue-compact-drift-risk-awareness-recovery',
      payload,
      preparationPromise: Promise.resolve(createPrepared({
        messages: [
          { role: 'user' as const, content: '继续，但别再掉回泛化项目口吻。' },
        ] as Message[],
        runtimeSurface: {
          ...createPrepared().runtimeSurface,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                  sameHerDriftRisk: antiShellDriftRisk,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: thinAwarenessShell,
                  awarenessLine: thinAwarenessShell,
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  companionBriefingLine: thinAwarenessShell,
                  companionHeadlineLine: null,
                  sameHerDriftRisk: antiShellDriftRisk,
                },
              },
            },
          },
        },
      })),
    })

    await runAlicizationMainChatBackground(input)

    const failureInput = vi.mocked(handleAlicizationMainChatRunFailure).mock.calls.at(-1)?.[0]
    const recoveryResult = await failureInput?.recoverFromTimeout({
      chatConfig: createPrepared().chatConfig,
      messages: [
        { role: 'user', content: '继续，但别再掉回泛化项目口吻。' },
      ] as Message[],
      headers: input.headers,
      tools: undefined,
      toolChoice: undefined,
      timeoutMs: 1_500,
    })

    const recoveredStructured = parseStructuredMindTurn(String(recoveryResult?.recoveredReply.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      preDialogueAwareness?: {
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerDriftRiskSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('local-first digital life project')
    expect(String(recoveredStructured.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1')
    expect(recoveredStructured.projectState?.sameHerDriftRisk).toBe(antiShellDriftRisk)
    expect(String(recoveredStructured.preDialogueAwareness?.awarenessLine ?? '')).toContain('local-first digital life project')
    expect(String(recoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('local-first digital life project')
    expect(recoveredStructured.visibleReplyRealization?.projectStateAudit?.sameHerDriftRiskSummary).toBe(antiShellDriftRisk)
    expect(String(recoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain(`drift=${antiShellDriftRisk}`)
  })
})
