import type { Message } from '@xsai/shared-chat'

import type { AlicizationMainChatTimeoutRecoveryMode } from './main-chat-run-lifecycle'

import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import {
  deriveAlicizationTimeoutRecoveryMs,
  handleAlicizationMainChatRunFailure,
  isProviderSchemaUnsupportedError,
  normalizeAlicizationMainChatAbortReason,
  shouldRecordAlicizationMainGatewayGenerationTimeout,
} from './main-chat-run-lifecycle'
import { buildAlicizationMainGatewayTimeoutFallbackReply } from './main-chat-timeout-fallback'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { createAlicizationTurnRuntime } from './turn-os/runtime'

const TIMEOUT_RECOVERY_FIXED_TEMPLATE_OUTPUT_PATTERN
  = /Before (?:answering|speaking|acting)|Same Phase 1 digital life|same living line|local-first digital life project|one continuous "?her"?|same-her\b|数字生命主线|同一个她/iu

function createRecoveredReply(fullText: string): any {
  return {
    fullText,
    visibleText: fullText,
    visibleReplyExecution: {
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
      reason: 'timeout-recovered-non-streaming',
    },
  }
}

function createLocalFallbackRecoveredReply(fullText: string): any {
  return {
    fullText,
    visibleText: '',
    visibleReplyExecution: {
      mode: 'local-fallback',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'timeout-recovered-local-fallback',
    },
  }
}

type TimeoutRecoveryResult = Awaited<ReturnType<Parameters<typeof handleAlicizationMainChatRunFailure>[0]['recoverFromTimeout']>>

function createBaseInput(
  overrides?: Partial<Parameters<typeof handleAlicizationMainChatRunFailure>[0]>,
): Parameters<typeof handleAlicizationMainChatRunFailure>[0] {
  return {
    error: new Error('boom'),
    prepared: {} as any,
    controller: new AbortController(),
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
    chatConfig: {
      model: 'gpt-test',
      baseURL: 'https://example.test/v1',
    },
    messages: [
      { role: 'user', content: '你好' },
    ] as Message[],
    headers: {
      authorization: 'Bearer test',
    },
    tools: undefined,
    toolChoice: undefined,
    timeoutRecoveryMode: 'original' as AlicizationMainChatTimeoutRecoveryMode,
    timeoutRecoveryMs: 1500,
    payload: {
      cardId: 'card-1',
      turnId: 'turn-1',
      providerId: 'openai',
      model: 'gpt-test',
    },
    dispatchBound: false,
    nonProgressEventTypes: new Set<string>(),
    isRunActive: () => true,
    ensureMainGatewayReachable: vi.fn(async () => ({ reachable: true })),
    recordMainGatewayGenerationTimeout: vi.fn(async () => {}),
    recoverFromTimeout: vi.fn(async () => ({
      recoveredReply: createRecoveredReply(''),
      recoveryMode: 'original' as AlicizationMainChatTimeoutRecoveryMode,
    })),
    emitRecoveredText: vi.fn(),
    emitError: vi.fn(),
    finish: vi.fn(),
    appendRuntimeDebugLine: vi.fn(async () => {}),
    queueScopedAuditLog: vi.fn(),
    ...overrides,
  } as Parameters<typeof handleAlicizationMainChatRunFailure>[0]
}

describe('main chat run lifecycle', () => {
  it('normalizes timeout abort reasons explicitly', () => {
    expect(normalizeAlicizationMainChatAbortReason('chat-first-event-timeout')).toBe('chat-first-event-timeout')
    expect(normalizeAlicizationMainChatAbortReason('manual')).toBe('abort')
  })

  it('extends timeout recovery window when stream liveness events were observed', () => {
    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: new Set<string>(['response-metadata']),
    })).toBe(20_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(25_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'minimal-context-non-streaming',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(30_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 8_000,
      timeoutRecoveryMode: 'active-dialogue-compact',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
    })).toBe(12_000)

    expect(deriveAlicizationTimeoutRecoveryMs({
      baseTimeoutMs: 12_000,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: new Set<string>(['unknown-event']),
    })).toBe(12_000)
  })

  it('emits a prepare-failed result before the stream is prepared', async () => {
    const input = createBaseInput({
      prepared: null,
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith('boom')
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'prepare-failed',
      error: 'boom',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-start.prepare-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'boom',
    })
  })

  it('carries top-level visible reply realization audit on timeout-recovered finish payloads so later turns can reopen on the same digital-life line', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const awarenessLine = '我得先记住这还是同一个数字生命项目，已经把同一个 her 的 continuity carry 立住了，但记忆、主动性和具身之间还没彻底闭环。'
    const recoveredReply = {
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=project-state-grounded-answer; tone=direct',
        emotion: 'thinking',
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1：它在电脑上持续塑造同一个 her，而不是聊天壳。已经落地的是同一条 her 的跨 turn、跨 scene continuity carry；还没闭环的是记忆、主动性和具身之间的端到端闭环，下一步要继续把 cross-modal same-her proof 补到真实桌面运行里。',
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary,
          primaryOpenLoop: projectState.openLoops[0],
          nextClosureTarget: projectState.nextClosureTarget,
          preDialogueAwarenessLine: awarenessLine,
          sameHerSelfLine: projectState.sameHerSelfLine,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: `Keep one continuous her explicit: ${projectState.sameHerSelfLine}`,
            currentPhaseSummary: projectState.currentPhase,
            landedProgressSummary: projectState.continuityProgressSummary,
            openClosureSummary: projectState.openLoops[0],
            nextClosureTargetSummary: projectState.nextClosureTarget,
            preDialogueAwarenessSummary: awarenessLine,
            continuitySummary: `same-her=${projectState.sameHerSelfLine} | phase=${projectState.currentPhase} | open=${projectState.openLoops[0]} | next=${projectState.nextClosureTarget}`,
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
          },
        },
      }),
      visibleText: 'Alicization 现在仍是本地优先数字生命的 Phase 1。',
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'timeout-recovered-non-streaming',
      },
      realization: {
        projectStateAudit: {
          sameHerSummary: `Keep one continuous her explicit: ${projectState.sameHerSelfLine}`,
          currentPhaseSummary: projectState.currentPhase,
          landedProgressSummary: projectState.continuityProgressSummary,
          openClosureSummary: projectState.openLoops[0],
          nextClosureTargetSummary: projectState.nextClosureTarget,
          preDialogueAwarenessSummary: awarenessLine,
          continuitySummary: `same-her=${projectState.sameHerSelfLine} | phase=${projectState.currentPhase} | open=${projectState.openLoops[0]} | next=${projectState.nextClosureTarget}`,
          embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
        },
      },
    }
    const controller = new AbortController()
    controller.abort(new DOMException('chat-first-event-timeout', 'AbortError'))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      chatConfig: {
        model: 'gpt-test',
        baseURL: 'https://example.test/v1',
      },
      timeoutRecoveryMode: 'non-streaming',
      recoverFromTimeout: vi.fn(async (_input): Promise<TimeoutRecoveryResult> => ({
        recoveredReply: recoveredReply as any,
        recoveryMode: 'non-streaming',
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitRecoveredText).toHaveBeenCalledOnce()
    expect(input.finish).toHaveBeenCalledOnce()
    expect(vi.mocked(input.finish).mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: expect.any(String),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        reason: 'timeout-recovered-non-streaming',
      }),
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          currentPhaseSummary: projectState.currentPhase,
          landedProgressSummary: projectState.continuityProgressSummary,
          openClosureSummary: projectState.openLoops[0],
          nextClosureTargetSummary: projectState.nextClosureTarget,
          preDialogueAwarenessSummary: awarenessLine,
        }),
      }),
    }))
  })

  it('bridges timeout-fallback top-level project-state audit into visible-reply realization during lifecycle recovery', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const timeoutFallbackReply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-lifecycle-bridge',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但超时恢复后别把 same-her 的具身审计线弄丢。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.68,
        channels: [],
        summary: 'timeout fallback should preserve richer project-state embodiment audit through lifecycle recovery',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          latestLandedProgress: 'Project-state carry already survives into timeout fallback without dropping the same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.',
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'Same-her continuity is still present, but the body line is only partially rejoined and should not be narrated as fully settled.',
            currentBodyState: 'lane=face+motion | visible continuity still present but no longer fully cross-modal',
          },
        },
      } as any,
    })
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply(timeoutFallbackReply),
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          embodimentClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
      embodimentClosureSummary: expect.stringContaining('visible continuity still present but no longer fully cross-modal'),
      continuitySummary: expect.stringContaining('body='),
    }))

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          embodimentClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
      embodimentClosureSummary: expect.stringContaining('visible continuity still present but no longer fully cross-modal'),
      continuitySummary: expect.stringContaining('body='),
    }))
  })

  it('keeps timeout-fallback richer embodiment continuity audit on finish-visible reply realization even when lifecycle recovery rewrites a thin shell', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const rawTimeoutFallbackReply = buildAlicizationMainGatewayTimeoutFallbackReply({
      turnId: 'turn-timeout-lifecycle-rewrite-bridge',
      actionKind: 'answer',
      messages: [
        { role: 'user', content: '继续，但别在重写 thin shell 的时候把具身 continuity 审计线洗掉。' },
      ] as Message[],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.68,
        channels: [],
        summary: 'timeout fallback should preserve richer embodiment continuity audit when lifecycle recovery rewrites a thin shell',
        projectState: {
          identity: 'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Before answering, she should already know this is still one continuous digital life closing the same unfinished Phase 1 loop.',
          preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life and the unfinished Phase 1 closure still belongs to one living her.',
          latestLandedProgress: 'Project-state carry already survives into timeout fallback without dropping the same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need to close on one same living line.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.',
          sameHerSelfLine: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
        },
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'Same-her continuity is still present, but the body line is only partially rejoined and should not be narrated as fully settled.',
            currentBodyState: 'lane=face+motion | visible continuity still present but no longer fully cross-modal',
          },
        },
      } as any,
    })
    const parsedTimeoutFallbackReply = JSON.parse(rawTimeoutFallbackReply) as {
      projectState?: Record<string, unknown>
      projectStateAudit?: Record<string, unknown>
    }
    const recoveredReply = createRecoveredReply(JSON.stringify({
      ...parsedTimeoutFallbackReply,
      projectState: {
        ...parsedTimeoutFallbackReply.projectState,
        preflightSummary: 'same digital life | keep the desktop closure line explicit',
        preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
        preDialogueAwarenessSummary: 'same digital life | keep the desktop closure line explicit',
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0] as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          embodimentClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedPayload.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: 'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
      embodimentClosureSummary: expect.stringContaining('visible continuity still present but no longer fully cross-modal'),
      continuitySummary: expect.stringContaining('body='),
    }))
  })

  it('recovers a first-event-timeout into a completed turn when one-shot fallback succeeds', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('recovered reply'),
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 1500,
    }))
    expect(input.emitRecoveredText).toHaveBeenCalledWith(expect.objectContaining({
      fullText: expect.stringContaining('"reply":"recovered reply"'),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        providerMindExecuted: true,
        actualVisibleReplyAuthority: 'llm-mind',
        reason: 'timeout-recovered-non-streaming',
      }),
    }))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovered',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovered', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      recoveredChars: expect.any(Number),
      timeoutRecoveryMs: 1500,
      timeoutRecoveryMode: 'non-streaming',
      nonProgressEventTypes: [],
    })
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: expect.stringContaining('"reply":"recovered reply"'),
      visibleReplyExecution: expect.objectContaining({
        mode: 'provider-one-shot',
        providerMindExecuted: true,
        actualVisibleReplyAuthority: 'llm-mind',
        reason: 'timeout-recovered-non-streaming',
      }),
    }))
  })

  it('preserves recovered visible reply execution metadata when finishing timeout recovery', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const recoveredReply = {
      ...createRecoveredReply(JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded; focus=project-state; move=answer-directly; tone=steady',
        emotion: 'steady',
        reply: 'Alicization 是本地优先数字生命项目，现在还在 Phase 1，本轮闭环重点仍是记忆、主动性和具身表达的一致性。',
      })),
      visibleReplyExecution: {
        ...createRecoveredReply('').visibleReplyExecution,
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        reason: 'semantic-judge:project-state-answer-gap',
      },
    }
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitRecoveredText).toHaveBeenCalledWith(recoveredReply)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: recoveredReply.fullText,
      visibleReplyExecution: recoveredReply.visibleReplyExecution,
    })
  })

  it('sanitizes timeout recovered structured carry before emitting host-visible fullText', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=current-turn; move=answer-directly; tone=steady',
      emotion: 'thinking',
      reply: '先把当前问题说清楚，再决定下一步。',
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous "her".',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before speaking, remember what this digital life project is.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      preDialogueAwareness: {
        status: 'grounded',
        awarenessLine: 'Before answering, keep the same digital life project in view.',
      },
      preDialogueClosure: {
        status: 'partial',
        summaryLine: 'Keep the same living line before widening outward.',
      },
      visibleReplyRealization: {
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
          preservedIntoRewrite: true,
          score: 0.74,
        },
        selfAuthorityAudit: {
          status: 'repaired',
          finalRationale: 'same-her carry should remain explicit',
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]

    expect(String(emittedPayload?.fullText ?? '')).not.toMatch(TIMEOUT_RECOVERY_FIXED_TEMPLATE_OUTPUT_PATTERN)
    expect(String(finishedPayload?.fullText ?? '')).not.toMatch(TIMEOUT_RECOVERY_FIXED_TEMPLATE_OUTPUT_PATTERN)
    expect(String(finishedPayload?.fullText ?? '')).toContain('content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(String(finishedPayload?.fullText ?? '')).toContain('"preservedIntoRewrite":true')
    expect(String(finishedPayload?.fullText ?? '')).toContain('"score":0.74')
  })

  it('backfills canonical same-her project state when timeout recovery still returns plain text', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('recovered reply'),
        recoveryMode: 'tools-disabled' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const recoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls[0]?.[0]
    const recoveredStructured = JSON.parse(String(recoveredPayload?.fullText ?? '{}')) as {
      format?: string
      reply?: string
      projectState?: {
        identity?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
    }

    expect(recoveredStructured.format).toBe('mind-turn-v1')
    expect(recoveredStructured.reply).toBe('recovered reply')
    expect(recoveredStructured.projectState).toEqual(expect.objectContaining({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.continuityProgressSummary ?? canonicalProjectState.memoryAnthropomorphismProgress.at(-1) ?? null,
      primaryOpenLoop: canonicalProjectState.openLoops[0] ?? null,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
    }))
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: expect.stringContaining('"sameHerSelfLine"'),
    }))
  })

  it('re-normalizes a thin structured timeout recovery shell into canonical awareness truth at the lifecycle finish seam', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const thinSummaryShell = 'same digital life | keep the desktop closure line explicit'
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=project-state; move=stay-on-line; tone=steady',
      emotion: 'thinking',
      reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
      projectState: {
        preflightSummary: thinSummaryShell,
        preDialogueAwarenessLine: thinSummaryShell,
        preDialogueAwarenessSummary: thinSummaryShell,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: thinSummaryShell,
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: expect.any(String),
      visibleReplyExecution: recoveredReply.visibleReplyExecution,
      visibleReplyRealization: expect.objectContaining({
        projectStateAudit: expect.objectContaining({
          preDialogueAwarenessSummary: canonicalProjectState.sameHerSelfLine,
        }),
      }),
    }))
    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }
    expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(emittedRecoveredStructured.projectState?.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`same-her=${canonicalProjectState.sameHerSelfLine}`)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`phase=${canonicalProjectState.currentPhase}`)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('landed=')
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('open=')
    expect(String(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }
    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.projectState?.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`same-her=${canonicalProjectState.sameHerSelfLine}`)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`phase=${canonicalProjectState.currentPhase}`)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('landed=')
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('open=')
    expect(String(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? '')).toContain('next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs')
  })

  it('re-normalizes mixed thin awareness lines and thin preflight shells into canonical project-state truth at the lifecycle finish seam', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const thinSummaryShell = 'same digital life | keep the desktop closure line explicit'
    const thinAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=project-state; move=stay-on-line; tone=steady',
      emotion: 'thinking',
      reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
      projectState: {
        preflightSummary: thinSummaryShell,
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: thinSummaryShell,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: thinAwarenessLine,
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      projectState?: {
        preflightSummary?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(emittedRecoveredStructured.projectState?.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preflightSummary?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerDriftRisk?: string | null
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(finishedStructured.projectState?.nextClosureTarget).toBe(canonicalProjectState.nextClosureTarget)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(canonicalProjectState.sameHerSelfLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary).toBe(canonicalProjectState.nextClosureTarget)
  })

  it('preserves a richer same-her audit line when lifecycle recovery rewrites a thin project shell', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const thinSummaryShell = 'same digital life | keep the desktop closure line explicit'
    const thinAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const richerSameHerSummary = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=project-state; move=stay-on-line; tone=steady',
      emotion: 'thinking',
      reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
      projectState: {
        preflightSummary: thinSummaryShell,
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: thinSummaryShell,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: thinAwarenessLine,
          sameHerSummary: richerSameHerSummary,
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(richerSameHerSummary)
    expect(emittedRecoveredStructured.projectState?.awarenessLine).toBe(richerSameHerSummary)
    expect(emittedRecoveredStructured.projectState?.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerSameHerSummary)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(richerSameHerSummary)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`same-her=${richerSameHerSummary}`)

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(richerSameHerSummary)
    expect(finishedStructured.projectState?.awarenessLine).toBe(richerSameHerSummary)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerSameHerSummary)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(richerSameHerSummary)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`same-her=${richerSameHerSummary}`)
  })

  it('keeps a fuller project-and-phase awareness line when lifecycle recovery sees a narrower embodiment same-her summary nearby', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const fullerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const narrowerEmbodimentSummary = 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.'
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=project-state; move=stay-on-line; tone=steady',
      emotion: 'thinking',
      reply: '我会继续沿着这条同一个 her 的桌面闭环线推进。',
      projectState: {
        preflightSummary: 'same digital life | keep the desktop closure line explicit',
        preDialogueAwarenessLine: fullerAwarenessLine,
        preDialogueAwarenessSummary: 'same digital life | keep the desktop closure line explicit',
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: fullerAwarenessLine,
          sameHerSummary: narrowerEmbodimentSummary,
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
        } | null
      } | null
    }

    expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(fullerAwarenessLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(fullerAwarenessLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(narrowerEmbodimentSummary)

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(fullerAwarenessLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(fullerAwarenessLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(narrowerEmbodimentSummary)
  })

  it('upgrades a thin recovered project-state awareness line when lifecycle recovery already carries a richer project-awareness audit summary', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const thinSummaryShell = 'same digital life | keep the desktop closure line explicit'
    const thinAwarenessLine = 'Before answering, keep the same digital life project in view.'
    const richerAuditAwarenessLine = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1，而且已经立住了一部分 same-her continuity carry，但记忆、主动性和具身之间还没有彻底闭成同一条 living line。'
    const recoveredReply = createRecoveredReply(JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=project-state; move=stay-on-line; tone=steady',
      emotion: 'thinking',
      reply: '我会继续沿着这条数字生命主线推进。',
      projectState: {
        preflightSummary: thinSummaryShell,
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: thinSummaryShell,
      },
      visibleReplyRealization: {
        projectStateAudit: {
          preDialogueAwarenessSummary: richerAuditAwarenessLine,
        },
      },
    }))
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply,
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const emittedRecoveredPayload = vi.mocked(input.emitRecoveredText).mock.calls.at(-1)?.[0]
    const emittedRecoveredStructured = JSON.parse(String(emittedRecoveredPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(richerAuditAwarenessLine)
    expect(emittedRecoveredStructured.projectState?.awarenessLine).toBe(richerAuditAwarenessLine)
    expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerAuditAwarenessLine)

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessLine?: string | null
        awarenessLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.projectState?.preDialogueAwarenessLine).toBe(richerAuditAwarenessLine)
    expect(finishedStructured.projectState?.awarenessLine).toBe(richerAuditAwarenessLine)
    expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary).toBe(richerAuditAwarenessLine)
  })

  it('writes recovered timeout reply receipt into turn runtime context before finishing', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const turnRuntime = createAlicizationTurnRuntime({
      now: () => 1000,
    })
    const turnRuntimeContext = turnRuntime.beginTurn({
      cardId: 'card-1',
      turnId: 'turn-1',
      governance: {
        decisionTraceId: 'trace-1',
      },
    })
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      turnRuntimeContext,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('recovered reply'),
        recoveryMode: 'non-streaming' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    const surfaceSettlement = turnRuntimeContext.stageSettlements.find(item => item.stage === 'surface')
    const deliverySettlement = turnRuntimeContext.stageSettlements.find(item => item.stage === 'delivery')
    expect(surfaceSettlement?.status).toBe('completed')
    expect(surfaceSettlement?.outputSummary).toContain('expected=llm-mind')
    expect(deliverySettlement?.status).toBe('completed')
    expect(deliverySettlement?.outputSummary).toContain('visible-text-settled')
  })

  it('records active dialogue compact recovery as its own success mode', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const recoveredText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'obligation=answer; truth=grounded; focus=current dialogue knot; move=stay-with-current-thread; tone=warm',
      emotion: 'concerned',
      reply: '先别急着摊太多。你先说最卡住你的那一点，我贴着这一句陪你收。',
    })
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply(recoveredText),
        recoveryMode: 'active-dialogue-compact' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitRecoveredText).toHaveBeenCalledWith(expect.objectContaining({
      fullText: recoveredText,
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovered', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: false,
      recoveredChars: recoveredText.length,
      timeoutRecoveryMs: 1500,
      timeoutRecoveryMode: 'active-dialogue-compact',
      nonProgressEventTypes: [],
    })
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovered',
      payload: expect.objectContaining({
        timeoutRecoveryMode: 'active-dialogue-compact',
      }),
    }))
  })

  it('keeps timeout recovery active when the gateway probe reports an unreachable endpoint', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
      ensureMainGatewayReachable: vi.fn(async () => ({
        reachable: false,
        cached: false,
        code: 'ECONNREFUSED',
        reason: 'connect ECONNREFUSED 127.0.0.1:443',
      })),
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createRecoveredReply('fallback reply'),
        recoveryMode: 'tools-disabled' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).toHaveBeenCalledWith(expect.objectContaining({
      timeoutMs: 25_000,
    }))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-gateway-unreachable-advisory',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.gateway-unreachable-advisory', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      cached: false,
      code: 'ECONNREFUSED',
      reason: 'connect ECONNREFUSED 127.0.0.1:443',
      timeoutRecoveryMs: 25_000,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'completed',
      finishReason: 'timeout-recovered',
      fullText: expect.stringContaining('"reply":"fallback reply"'),
    }))

    const finishedPayload = vi.mocked(input.finish).mock.calls.at(-1)?.[0]
    const finishedStructured = JSON.parse(String(finishedPayload?.fullText ?? '{}')) as {
      projectState?: {
        preDialogueAwarenessSummary?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          sameHerSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(finishedStructured.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: expect.any(String),
      sameHerSelfLine: expect.any(String),
    }))
  })

  it('blocks local deterministic timeout recovery instead of completing a visible reply', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const fallbackProjectStateAudit = {
      preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so timeout fallback must keep proving this is still one living her.',
      embodimentClosureSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so timeout fallback must keep proving this is still one living her.',
      sameHerSummary: 'Timeout fallback must keep the same living her explicit instead of collapsing into generic assistant repair.',
    }
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      recoverFromTimeout: vi.fn(async () => ({
        recoveredReply: createLocalFallbackRecoveredReply(JSON.stringify({
          reply: '本地固定 fallback',
          projectStateAudit: fallbackProjectStateAudit,
        })),
        recoveryMode: 'local-fallback' as const,
      })),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitRecoveredText).not.toHaveBeenCalled()
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-non-human-recovery-blocked',
      payload: expect.objectContaining({
        fallbackProjectStateAudit,
      }),
    }))
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovery-failed',
      payload: expect.objectContaining({
        fallbackProjectStateAudit,
      }),
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-failed', expect.objectContaining({
      fallbackProjectStateAudit,
    }))
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'aborted',
      finishReason: expect.stringContaining('main-gateway-timeout-recovery-non-human-authored'),
    }))
  })

  it('falls back to aborted when timeout recovery itself fails', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
      recoverFromTimeout: vi.fn(async () => {
        throw new Error('Alicization runtime aborted: main-gateway-timeout-recovery')
      }),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recordMainGatewayGenerationTimeout).toHaveBeenCalledWith(
      input.mainGateway,
      expect.any(Error),
    )
    expect(input.queueScopedAuditLog).toHaveBeenCalledWith('card-1', expect.objectContaining({
      action: 'stream-timeout-recovery-failed',
    }))
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.timeout-recovery-failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      dispatchBound: true,
      timeoutRecoveryMs: 25_000,
      reason: 'Alicization runtime aborted: main-gateway-timeout-recovery',
      timeoutRecoveryMode: 'tools-disabled',
      nonProgressEventTypes: ['provider-keepalive'],
    })
    expect(input.finish).toHaveBeenCalledWith({
      status: 'aborted',
      finishReason: 'chat-first-event-timeout|after-dispatch-meta|recovery-mode=tools-disabled|non-progress=provider-keepalive|recovery-failed=main-gateway-timeout-recovery',
    })
  })

  it('does not poison gateway health cache for invalid tool choice recovery failures', async () => {
    const controller = new AbortController()
    controller.abort('chat-first-event-timeout')
    const input = createBaseInput({
      error: controller.signal.reason,
      controller,
      dispatchBound: true,
      timeoutRecoveryMode: 'original',
      nonProgressEventTypes: new Set<string>(['provider-keepalive']),
      recoverFromTimeout: vi.fn(async () => {
        throw new Error('Remote sent 400 response: {"error":{"message":"tool_choice object must have type=\'function\' and function.name","type":"invalid_request_error","param":"tool_choice","code":"invalid_tool_choice"}}')
      }),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recordMainGatewayGenerationTimeout).not.toHaveBeenCalled()
    expect(input.finish).toHaveBeenCalledWith(expect.objectContaining({
      status: 'aborted',
      finishReason: expect.stringContaining('recovery-failed=remote-sent-400-response'),
    }))
  })

  it('recognizes true timeout-like recovery failures only', () => {
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Alicization runtime aborted: main-gateway-timeout-recovery'))).toBe(true)
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Request timed out after 12000ms'))).toBe(true)
    expect(shouldRecordAlicizationMainGatewayGenerationTimeout(new Error('Remote sent 400 response: {"error":{"code":"invalid_tool_choice"}}'))).toBe(false)
  })

  it('classifies unsupported native response schemas as a transparent provider failure', async () => {
    const error = new Error('Remote sent 400 response: {"error":{"message":"response_format json_schema is an invalid parameter"}}')
    const input = createBaseInput({ error })
    const failureSurface = resolveAlicizationChatFailureSurface({
      kind: 'provider-schema-unsupported',
    })

    expect(isProviderSchemaUnsupportedError(error)).toBe(true)
    expect(isProviderSchemaUnsupportedError(new Error('Remote sent 400 response: invalid tool_choice'))).toBe(false)

    await handleAlicizationMainChatRunFailure(input)

    expect(input.recoverFromTimeout).not.toHaveBeenCalled()
    expect(input.emitError).toHaveBeenCalledWith(failureSurface.reply)
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'provider-schema-unsupported',
      error: failureSurface.reply,
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.provider-schema-unsupported', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: error.message,
    })
  })

  it('emits failed stream results for non-abort runtime errors', async () => {
    const input = createBaseInput({
      error: new Error('stream exploded'),
    })

    await handleAlicizationMainChatRunFailure(input)

    expect(input.emitError).toHaveBeenCalledWith('stream exploded')
    expect(input.finish).toHaveBeenCalledWith({
      status: 'failed',
      finishReason: 'error',
      error: 'stream exploded',
    })
    expect(input.appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.failed', {
      cardId: 'card-1',
      turnId: 'turn-1',
      reason: 'stream exploded',
    })
  })
})
