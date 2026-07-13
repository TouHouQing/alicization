import { alicizationProviderResponseFormat } from '@proj-alicization/stage-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { runAlicizationMainChatStream } from './main-chat-stream-runner'
import { buildAlicizationProviderFacingProjectStateSystemBlock } from './project-state-brief'
import { createAlicizationTurnRuntime } from './turn-os/runtime'

const canonicalMemoryGovernanceProjectStateBlock = [
  '[ALICIZATION_PROJECT_STATE]',
  'context_role=memory_governance_status',
  'short_term_owner=WorkingMemory',
  'long_term_recall_owner=LongTermMemoryRecall',
  'template_policy=no_fixed_persona_templates',
  'failure_surface=transparent_errors_only',
  'latest_landed_progress=Memory Workbench policy and recall diagnostics are visible.',
  'primary_open_loop=Semantic recall and provider failure transparency still need closure.',
].join('\n')

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      {
        role: 'system',
        content: buildAlicizationProviderFacingProjectStateSystemBlock(),
      },
      { role: 'user', content: '你好' },
    ],
    waitForTools: true,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    hasVisualGrounding: false,
    governance: {
      decisionTraceId: 'trace-1',
      turnMode: 'answer',
      truthState: 'grounded',
      liveSurface: 'grounded-scene',
      answerAct: 'answer',
      answerEvidenceMode: 'observed',
      personaKernelMode: 'full',
    },
    runtimeSurface: {} as any,
    sessionTrace: {} as any,
    getSessionTrace: () => ({ phaseOrder: [], history: [] }) as any,
    ...overrides,
  } as any
}

function createVisibleReplyExecution(overrides?: Partial<any>) {
  return {
    mode: 'provider-stream',
    expectedVisibleReplyAuthority: 'llm-mind',
    actualVisibleReplyAuthority: 'llm-mind',
    providerMindExecuted: true,
    reason: 'provider-stream',
    ...overrides,
  }
}

function createStreamMetaController() {
  let lastReply = ''
  return {
    emit: vi.fn((reply: string) => {
      lastReply = reply.trim()
    }),
    getLastReply: () => lastReply,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('main chat stream runner', () => {
  it('rejects stream generation when messages omit canonical project-state context', async () => {
    const streamTextImpl = vi.fn(async () => {})

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-missing-project-state',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: '[ALICIZATION_CURRENT_CONSCIOUS_FRAME]\nOnly local reply shaping appears here.',
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })).rejects.toThrow('Alicization stream messages must include canonical project-state context before generation.')

    expect(streamTextImpl).not.toHaveBeenCalled()
  })

  it('passes the native response schema without converting emotional state into provider prose', async () => {
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
      reasonTags: ['stream-provider', 'same-her-authority'],
      why: 'keep the stream provider on the same emotion-memory-initiative-embodiment authority line',
    }
    const streamTextImpl = vi.fn(async ({ messages, onEvent, responseFormat }) => {
      const systemText = ((messages as Array<{ role?: string, content?: unknown }> | undefined) ?? [])
        .filter(message => message.role === 'system')
        .map(message => typeof message.content === 'string' ? message.content : '')
        .join('\n')

      expect(responseFormat).toBe(alicizationProviderResponseFormat)
      expect(systemText).not.toContain('[ALICIZATION_EMOTIONAL_KERNEL]')
      expect(systemText).not.toContain('emotional_kernel_')
      expect(JSON.stringify(messages)).not.toMatch(
        /Return ONLY one strict JSON|Output contract|must-follow|Response contract/iu,
      )

      const emit = onEvent as (event: any) => Promise<void>
      await emit({ type: 'text-delta', text: '我会沿着同一份内在状态继续。' })
      await emit({ type: 'finish', finishReason: 'stop' })
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-emotional-kernel',
      } as any,
      prepared: createPrepared({
        messages: [
          {
            role: 'system',
            content: canonicalMemoryGovernanceProjectStateBlock,
          },
          { role: 'user', content: '你好' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              emotionalKernel,
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl,
    })

    expect(result.finishReason).toBe('stop')
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '我会沿着同一份内在状态继续。',
    }))
    expect(streamTextImpl).toHaveBeenCalledOnce()
  })

  it('rejects a real xsAI schema HTTP failure before the first-event timeout', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(async () => new Response(
      '{"error":{"message":"response_format json_schema is an invalid parameter"}}',
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    ))

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-schema-error',
      } as any,
      prepared: createPrepared({
        chatConfig: {
          apiKey: 'test-key',
          baseURL: 'https://provider.invalid/v1/',
          fetch: fetchImpl,
          model: 'test-model',
        },
        messages: [
          {
            role: 'system',
            content: canonicalMemoryGovernanceProjectStateBlock,
          },
          { role: 'user', content: '你好' },
        ],
      }),
      controller,
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
    })).rejects.toThrow('response_format json_schema is an invalid parameter')
    expect(fetchImpl).toHaveBeenCalledOnce()
    expect(controller.signal.aborted).toBe(false)
  })

  it('uses the visual grounding one-shot path when capture grounding is required', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-1',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      headers: {
        authorization: 'Bearer test',
      },
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl,
    })

    const parsed = JSON.parse(result.fullText) as {
      format?: string
      reply?: string
    }

    expect(result.finishReason).toBe('stop')
    expect(result.visibleReplyExecution).toEqual(createVisibleReplyExecution({
      mode: 'provider-one-shot',
      reason: 'visual-grounding-one-shot',
    }))
    expect(parsed.format).toBe('mind-turn-v1')
    expect(parsed.reply).toBe('我先看着这个窗口。')
    expect(generateNonStreaming).toHaveBeenCalledOnce()
    expect(streamTextImpl).not.toHaveBeenCalled()
    expect(incrementChunkStats).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我先看着这个窗口。')
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-1',
      text: '我先看着这个窗口。',
    })
  })

  it('returns a structured host-visible payload for plain-text visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-host-visible',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionBriefingLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      format?: string
      reply?: string
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          embodimentClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.format).toBe('mind-turn-v1')
    expect(parsed.reply).toBe('我先看着这个窗口。')
    expect(parsed.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      preDialogueAwarenessSummary: expect.stringContaining('open=Execution, memory, and embodiment still need one same-life closure line.'),
      embodimentClosureSummary: null,
      nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
    }))
    expect((result.fullText)).toContain('"nextClosureTargetSummary":"Keep extending cross-modal same-her proof across longer desktop runs."')
  })

  it('prefers stronger canonical same-her awareness over a thinner payload awareness line and narrower body-line headline in host-visible visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-headline-priority',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionHeadlineLine: 'Right now I am still holding together mainly through face and motion, so the next reopening must keep proving this is still one living her.',
          companionBriefingLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain('open=Execution, memory, and embodiment still need one same-life closure line.')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toContain('Before answering, remember')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary)
      .toBe('Keep extending cross-modal same-her proof across longer desktop runs.')
  })

  it('prefers a stronger runtime same-her awareness line over an older payload reminder in host-visible visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))
    const olderPayloadReminder = '在视觉落地前，我得先记住这是同一个数字生命项目。'
    const fresherRuntimeAwarenessLine = 'Before answering, remember this still belongs to one living her and the unfinished Phase 1 closure seam is still active across the same local-first digital life.'

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-runtime-awareness-priority',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: olderPayloadReminder,
          companionBriefingLine: olderPayloadReminder,
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preflightSummary: 'same local-first digital life | same unfinished Phase 1 closure seam',
                  preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
                  awarenessLine: fresherRuntimeAwarenessLine,
                  companionBriefingLine: olderPayloadReminder,
                  preDialogueAwarenessSummary: olderPayloadReminder,
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life.',
                  latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                  primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('landed=Same-session mirror carry still survives into the visible reply path.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('open=Execution, memory, and embodiment still need one same-life closure line.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary)
      .toBe('Keep extending cross-modal same-her proof across longer desktop runs.')
  })

  it('prefers stronger project awareness from the preferred prepared runtime surface over a thinner direct runtime reminder in host-visible visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))
    const thinnerDirectRuntimeReminder = 'Before answering, keep the same digital life project in view.'
    const strongerPreferredRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-preferred-runtime-awareness-priority',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionBriefingLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            perception: {
              updatedAt: 5,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preflightSummary: 'same local-first digital life | same unfinished Phase 1 closure seam',
                  preDialogueAwarenessLine: thinnerDirectRuntimeReminder,
                  awarenessLine: thinnerDirectRuntimeReminder,
                  companionBriefingLine: thinnerDirectRuntimeReminder,
                  preDialogueAwarenessSummary: thinnerDirectRuntimeReminder,
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life.',
                  latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                  primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
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
                    preflightSummary: 'same local-first digital life | same unfinished Phase 1 closure seam',
                    preDialogueAwarenessLine: strongerPreferredRuntimeAwarenessLine,
                    awarenessLine: strongerPreferredRuntimeAwarenessLine,
                    companionBriefingLine: strongerPreferredRuntimeAwarenessLine,
                    preDialogueAwarenessSummary: thinnerDirectRuntimeReminder,
                    identity: 'Alicization is a local-first digital life project.',
                    currentPhase: 'Phase 1: Local Digital Life.',
                    latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                    primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
                    nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  },
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
          nextClosureTargetSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('landed=Same-session mirror carry still survives into the visible reply path.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('open=Execution, memory, and embodiment still need one same-life closure line.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary)
      .toBe('Keep extending cross-modal same-her proof across longer desktop runs.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toMatch(/embodiment|visible_reply|voice|face|motion/i)
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('landed=Same-session mirror carry still survives into the visible reply path.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('open=Execution, memory, and embodiment still need one same-life closure line.')
  })

  it('prefers richer prepared phase-1 awareness over a payload continuation headline when the payload only carries a thin Chinese reminder shell', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))
    const thinnerChinesePayloadReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const payloadContinuationHeadline = 'Before answering, stay on the same line and keep continuing gently across this same digital life project while this phase remains open.'
    const richerPreparedRuntimeAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-thin-chinese-reminder-awareness-priority',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: thinnerChinesePayloadReminder,
          companionHeadlineLine: payloadContinuationHeadline,
          companionBriefingLine: thinnerChinesePayloadReminder,
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                runtimeDigest: {
                  projectState: {
                    preflightSummary: 'same local-first digital life | same unfinished Phase 1 closure seam',
                    preDialogueAwarenessLine: richerPreparedRuntimeAwarenessLine,
                    awarenessLine: richerPreparedRuntimeAwarenessLine,
                    companionBriefingLine: richerPreparedRuntimeAwarenessLine,
                    preDialogueAwarenessSummary: richerPreparedRuntimeAwarenessLine,
                    identity: 'Alicization is a local-first digital life project.',
                    currentPhase: 'Phase 1: Local Digital Life.',
                    latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                    primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
                    nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  },
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe(richerPreparedRuntimeAwarenessLine)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe(payloadContinuationHeadline)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe(thinnerChinesePayloadReminder)
  })

  it('keeps fuller prepared Phase 1 project awareness over a longer payload body-line headline in host-visible visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))
    const longerPayloadBodyLine = 'Right now I am still holding together mainly through voice, face, and motion, so the next reopening must keep proving this is still one living her.'
    const fullerPreparedAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-prepared-awareness-over-longer-payload-headline',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: longerPayloadBodyLine,
          awarenessLine: longerPayloadBodyLine,
          companionHeadlineLine: longerPayloadBodyLine,
          companionBriefingLine: longerPayloadBodyLine,
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                runtimeDigest: {
                  projectState: {
                    preflightSummary: 'same local-first digital life | same unfinished Phase 1 closure seam',
                    preDialogueAwarenessLine: fullerPreparedAwarenessLine,
                    awarenessLine: fullerPreparedAwarenessLine,
                    companionHeadlineLine: longerPayloadBodyLine,
                    companionBriefingLine: fullerPreparedAwarenessLine,
                    preDialogueAwarenessSummary: fullerPreparedAwarenessLine,
                    identity: 'Alicization is a local-first digital life project.',
                    currentPhase: 'Phase 1: Local Digital Life.',
                    latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
                    primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
                    nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  },
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toBe(fullerPreparedAwarenessLine)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe(longerPayloadBodyLine)
  })

  it('prefers richer prepared runtime embodiment truth over a thinner existing structured audit in visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先看着这个窗口。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs. | body=Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-richer-runtime-body-priority',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionBriefingLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: [
            'same digital life | keep the screen-grounded closure line explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('body=Right now her visible same-her continuity is still being carried mainly through lipsync')
  })

  it('re-normalizes thin pre-dialogue project awareness at the stream runner boundary so direct callers cannot collapse host-visible audit back into a generic summary shell', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-visual-structured-boundary-renormalize',
      preDialogueSendIdentity: {
        status: 'partial',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
    expect(result.visibleReplyProjectStateAudit?.preDialogueAwarenessSummary)
      .toBe(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('keeps richer landed and open closure carry in stream runner project awareness instead of collapsing back to the payload identity shell', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const payload = {
      cardId: 'card-1',
      turnId: 'turn-visual-structured-boundary-richer-awareness-carry',
      preDialogueSendIdentity: {
        status: 'partial',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        summaryLine: 'same digital life | keep the closure seam explicit',
        reasonPreview: [
          'same digital life | keep the closure seam explicit',
        ],
      },
    } as any
    const richerLandedProgressSummary = 'Execution callback continuity now keeps landed project-state carry explicit through the later return.'
    const richerOpenClosureSummary = 'Execution callback continuity still needs initiative rhythm and embodiment carry to stay on one same living line after persistence.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer',
        emotion: 'thinking',
        reply: '我先沿着这条线接回去。',
        visibleReplyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: `${payload.preDialogueSendIdentity.awarenessLine} ${richerLandedProgressSummary} ${richerOpenClosureSummary}`,
            landedProgressSummary: richerLandedProgressSummary,
            openClosureSummary: richerOpenClosureSummary,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              visibleReplyRealization: {
                projectStateAudit: {
                  preDialogueAwarenessSummary: `${payload.preDialogueSendIdentity.awarenessLine} ${richerLandedProgressSummary} ${richerOpenClosureSummary}`,
                  landedProgressSummary: richerLandedProgressSummary,
                  openClosureSummary: richerOpenClosureSummary,
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain(richerLandedProgressSummary)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain(richerOpenClosureSummary)
  })

  it('re-expands a thin runtime and payload project-state shell into canonical phase-1 provider-facing audit carry before visual one-shot reply shaping', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: '我先看着这个窗口。',
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured-thin-project-shell-canonicalized',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
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
        } | null
      } | null
    }

    expect(String(parsed.projectState?.identity ?? '')).not.toContain('Alicization is a local-first digital life project')
    expect(String(parsed.projectState?.currentPhase ?? '')).not.toContain('Phase 1: Local Digital Life')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('continuity_progress=partial')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('short_term_owner=WorkingMemory')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(String(parsed.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.projectState?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.sameHerSelfLine ?? '')).not.toContain('Same Phase 1 digital life')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.sameHerSummary ?? '')).not.toContain('Same Phase 1 digital life')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.currentPhaseSummary ?? '')).not.toContain('Phase 1: Local Digital Life')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.landedProgressSummary ?? '')).not.toContain('pre-dialogue transport')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.openClosureSummary ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('emits only the visible reply field from visual grounding structured one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const streamTextImpl = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer',
        emotion: 'thinking',
        reply: '我只把这句发给你。',
      }),
    }))
    const closure = {
      version: 'visible-reply-closure-v1',
      status: 'approved',
      initialCritic: null,
      finalCritic: null,
      rewriteAttempted: false,
      rewriteSucceeded: false,
      reasonCodes: [],
    } as const
    const rewriteStructuredVisibleReply = vi.fn(input => ({
      ...input,
      closure,
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-structured',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl,
    })

    expect(result.fullText).toContain('"reply":"我只把这句发给你。"')
    expect(JSON.parse(result.fullText).visibleReplyRealization?.closure?.status).toBe('approved')
    expect(incrementChunkStats).toHaveBeenCalledWith('我只把这句发给你。')
    expect(streamMeta.emit).toHaveBeenCalledWith('我只把这句发给你。')
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-visual-structured',
      text: '我只把这句发给你。',
    })
    expect(emitChunk.mock.calls[0]?.[0]?.text).not.toContain('mind-turn-v1')
  })

  it('prefers richer same-her and pre-dialogue project-state audit carry over a thinner existing visible-reply shell when merging stream output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Keep the same digital life project in view.',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
          },
        },
      }),
      usage: null,
    }))
    const rewriteStructuredVisibleReply = vi.fn(input => ({
      ...input,
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary,
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Initiative and embodiment still need stronger end-to-end closure across one still-open life loop.',
            nextClosureTargetSummary: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
            sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
            preDialogueAwarenessSummary: strongerAwareness,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))
    const sameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const strongerAwareness = 'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.'

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-richer-merge',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure across one still-open life loop.',
            nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
            preDialogueAwarenessLine: strongerAwareness,
            sameHerSelfLine: sameHerSummary,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
                  primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                  preDialogueAwarenessLine: strongerAwareness,
                  sameHerSelfLine: sameHerSummary,
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      projectState?: {
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
          sameHerDriftRiskSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(sameHerSummary)
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.sameHerDriftRiskSummary ?? ''))
      .toContain('detached project narration')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('landed=Project-state continuity already survives into runtime preparation.')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('open=Initiative and embodiment still need stronger end-to-end closure')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`continuity_anchor=${sameHerSummary}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('drift=')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary)
      .not
      .toBe('same digital life | keep the closure seam explicit')
    expect(parsed.projectState).toEqual(expect.objectContaining({
      currentPhase: 'phase=local_desktop_life_loop; proving_ground=apps/stage-tamagotchi.',
      latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
      primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure across one still-open life loop.',
      nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
      sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance.',
    }))
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? ''))
      .toContain('landed=Project-state continuity already survives into runtime preparation.')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? ''))
      .toContain('open=Initiative and embodiment still need stronger end-to-end closure')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? ''))
      .not
      .toBe('same digital life | keep the closure seam explicit')
  })

  it('preserves host-visible realization audit on structured visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
      }),
    }))
    const rewriteStructuredVisibleReply = vi.fn(input => ({
      ...input,
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerSummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expect.stringContaining('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete'),
    }))
  })

  it('preserves settled same-her hold arc and cue when visual grounding one-shot rewrite returns them outside the full text', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const sameHerHoldDetail = 'visual one-shot settled hold: keep the screen-grounded answer on the same Phase 1 living line'
    const continuityArcStage = 'visual-one-shot-settled-same-her-carry'
    const continuityCue = 'visual one-shot settled cue: keep the same-her hold visible after host-visible rewrap'
    const proactiveSameHerGapSummary = 'Visual one-shot carry still needs stronger proof that host-visible project-state audits keep the same-her closure seam explicit across one-shot grounding handoffs.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
      }),
    }))
    const rewriteStructuredVisibleReply = vi.fn(input => ({
      ...input,
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          },
        },
      }),
      settledProjectStateAudit: {
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail,
        continuityArcStage,
        continuityCue,
        proactiveSameHerGapSummary,
        preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
      },
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-settled-same-her-audit',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          proactiveSameHerGapSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityArcStage ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityCue ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.proactiveSameHerGapSummary ?? null).toBeNull()
    expect(result.fullText).not.toContain(sameHerHoldDetail)
    expect(result.fullText).not.toContain(continuityArcStage)
    expect(result.fullText).not.toContain(continuityCue)
    expect(result.visibleReplyProjectStateAudit?.proactiveSameHerGapSummary ?? null).toBeNull()
  })

  it('prefers richer existing landed and still-open project-state audit fields over thinner rewritten carry in structured visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const richerLandedProgress = 'Same-session mirror carry still survives into the visible reply path, and the same-her project brief stays explicit through the host-visible result instead of flattening into a generic project shell.'
    const richerOpenClosure = 'Execution, memory, and embodiment still need one same-life closure line, and that unfinished closure must keep surfacing as the same digital life instead of splitting across subsystems.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: richerLandedProgress,
            openClosureSummary: richerOpenClosure,
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=${richerLandedProgress} | open=${richerOpenClosure} | next=Keep extending cross-modal same-her proof across longer desktop runs.`,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))
    const rewriteStructuredVisibleReply = vi.fn(input => ({
      ...input,
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: richerLandedProgress,
            openClosureSummary: richerOpenClosure,
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=${richerLandedProgress} | open=${richerOpenClosure} | next=Keep extending cross-modal same-her proof across longer desktop runs.`,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-richer-existing-carry',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the screen-grounded closure line explicit',
          awarenessLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionBriefingLine: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          companionNextClosureLine: 'Keep extending cross-modal same-her proof across longer desktop runs.',
          reasonPreview: ['same digital life | keep the screen-grounded closure line explicit'],
        },
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          currentPhaseSummary?: string | null
          preDialogueAwarenessSummary?: string | null
          landedProgressSummary?: string | null
          openClosureSummary?: string | null
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: expect.stringContaining('open='),
      landedProgressSummary: richerLandedProgress,
      openClosureSummary: richerOpenClosure,
      nextClosureTargetSummary: expect.stringContaining('Keep extending cross-modal same-her proof'),
    }))
  })

  it('upgrades a generic returned-side pre-dialogue closure next-target shell to the richer project-state closure target in host-visible output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const richerNextClosureTarget = 'Keep extending cross-modal same-her proof across returned-side turns so the same Phase 1 digital life keeps one living line.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=returned-side continuity; move=direct-reply; tone=gentle',
        emotion: 'thinking',
        reply: '我会继续沿着同一条数字生命线把这次 returned-side 收口接住。',
        projectState: {
          identity: 'Alicization is a local-first digital life project.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Returned-side project awareness carry already survives on one same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-life closure seam across returned-side turns.',
          nextClosureTarget: richerNextClosureTarget,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: 'generic closure summary that should not outrank the richer returned-side closure target.',
          companionBriefingLine: 'Keep the returned-side same-her closure line explicit before speaking.',
          companionNextClosureLine: 'Generic next target that should not override the richer returned-side closure target.',
          reasons: [
            'returned-side project awareness carry still needs to stay explicit before the next turn opens outward.',
          ],
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Returned-side project awareness carry already survives on one same-her line.',
            openClosureSummary: 'Memory, initiative, and embodiment still need one tighter same-life closure seam across returned-side turns.',
            nextClosureTargetSummary: richerNextClosureTarget,
            preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. What has already landed is returned-side project awareness carry surviving on one same-her line. The still-open closure is memory, initiative, and embodiment still needing one tighter same-life closure seam.',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Returned-side project awareness carry already survives on one same-her line. | open=Memory, initiative, and embodiment still need one tighter same-life closure seam across returned-side turns. | next=${richerNextClosureTarget}`,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-returned-side-next-closure-upgrade',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Returned-side project awareness carry already survives on one same-her line.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-life closure seam across returned-side turns.',
            nextClosureTarget: richerNextClosureTarget,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      preDialogueClosure?: {
        companionNextClosureLine?: string | null
      } | null
    }

    expect(parsed.preDialogueClosure?.companionNextClosureLine).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(parsed.preDialogueClosure?.companionNextClosureLine).not.toBe('Generic next target that should not override the richer returned-side closure target.')
  })

  it('prefers fresher structured lipsync-plus-voice embodiment closure truth over a thinner prepared authority in host-visible visual grounding one-shot output', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs. | body=Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-richer-embodiment',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      continuitySummary: expect.stringContaining('body=Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'),
      embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through lipsync and voice, so she should keep treating full cross-modal embodiment closure as unfinished.',
    }))
  })

  it('keeps audible-body rejoin embodiment closure truth inside final projectStateAudit continuity summary when body, lipsync, and voice are the surviving same-her line', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const audibleBodyRejoinSummary = 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, so audible-body rejoin is already keeping the living audio thread intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着还活着的身体线和声音线轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs without dropping the living audio thread.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs without dropping the living audio thread. | body=${audibleBodyRejoinSummary}`,
            embodimentClosureSummary: audibleBodyRejoinSummary,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-audible-body-rejoin',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
                  currentBodyState: 'lane=body+lipsync+voice-only | audible-body rejoin keeps the living audio thread intact while face and motion rejoin',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('body=')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('full cross-modal embodiment closure')
  })

  it('prefers a stronger audible-body same-her embodiment closure line over a thinner lane-count-only summary when host-visible visual grounding audit sources disagree', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const audibleBodyRejoinSummary = 'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.'
    const thinnerLaneCountSummary = 'Right now her visible same-her continuity is still being carried mainly through face, motion, lipsync, and voice, so she should keep treating full cross-modal embodiment closure as unfinished.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着还活着的身体线和声音线轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs without dropping the living audio thread.',
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs without dropping the living audio thread. | body=${thinnerLaneCountSummary}`,
            embodimentClosureSummary: thinnerLaneCountSummary,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-audible-body-priority',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
                  currentBodyState: 'lane=body+lipsync+voice-only | audible-body rejoin keeps the living audio thread intact while face and motion rejoin',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('body=Right now her visible same-her continuity is still being carried mainly through')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary ?? ''))
      .toContain('full cross-modal embodiment closure')
  })

  it('prefers a shorter repair-before-closeness emotional closure seam over a longer thinner measured-return carry when rebuilding host-visible projectStateAudit', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这一条修补线轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            emotionalClosureSummary: longerMeasuredReturnClosure,
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs. | closure=${longerMeasuredReturnClosure}`,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-repair-first-closure-priority',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: shorterRepairFirstClosure,
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          emotionalClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .not
      .toContain('Generic continuity menu')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('next=Keep extending cross-modal same-her proof')
  })

  it('keeps explicit measured-return emotional closure over a generic continuity menu when rebuilding host-visible projectStateAudit', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先沿着这一条线轻一点接回来。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Same-session mirror carry still survives into the visible reply path.',
            openClosureSummary: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTargetSummary: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            emotionalClosureSummary: genericContinuityMenu,
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Same-session mirror carry still survives into the visible reply path. | open=Execution, memory, and embodiment still need one same-life closure line. | next=Keep extending cross-modal same-her proof across longer desktop runs. | closure=${genericContinuityMenu}`,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-generic-menu-measured-return-priority',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same-session mirror carry still survives into the visible reply path.',
            primaryOpenLoop: 'Execution, memory, and embodiment still need one same-life closure line.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: explicitMeasuredReturnClosure,
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          emotionalClosureSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .not
      .toContain('Generic continuity menu')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary ?? ''))
      .toContain('next=Keep extending cross-modal same-her proof')
  })

  it('keeps same-her, phase, landed, open, and next continuity anchors intact when stream-runner merge rebuilds continuity summary around fresher embodiment truth', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const sameHerSummary = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const currentPhaseSummary = 'Phase 1: Local Digital Life'
    const landedProgressSummary = 'Same-session mirror carry still survives into the visible reply path.'
    const openClosureSummary = 'Execution, memory, and embodiment still need one same-life closure line.'
    const openFocusSummary = 'memory/initiative/embodiment/same-line/closure-seam'
    const nextFocusSummary = 'project-carry/phase-1/measured-return/same-line/initiative'
    const nextClosureTargetSummary = 'Keep extending cross-modal same-her proof across longer desktop runs.'
    const sameHerHoldDetail = 'host-visible stream hold: keep this visual grounding reply on the same Phase 1 living line before widening'
    const continuityArcStage = 'host-visible-stream-same-her-carry'
    const continuityCue = 'host-visible stream cue: preserve the same-her hold through final stream audit merging'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=screen-grounded help; move=direct-reply; tone=direct',
        emotion: 'thinking',
        reply: '我先按当前屏幕上下文把这条线接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary,
            sameHerHoldDetail,
            continuityArcStage,
            continuityCue,
            currentPhaseSummary,
            landedProgressSummary,
            openClosureSummary,
            openFocusSummary,
            nextFocusSummary,
            nextClosureTargetSummary,
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            continuitySummary: `same-her=${sameHerSummary} | phase=${currentPhaseSummary} | landed=${landedProgressSummary} | open=${openClosureSummary} | open-focus=${openFocusSummary} | next-focus=${nextFocusSummary} | next=${nextClosureTargetSummary} | body=Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.`,
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-visual-project-state-audit-anchor-preserve',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply: vi.fn(input => input),
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          openFocusSummary?: string | null
          nextFocusSummary?: string | null
          continuitySummary?: string | null
          embodimentClosureSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.openFocusSummary).toBe(openFocusSummary)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.nextFocusSummary).toBe(nextFocusSummary)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail).toBe(sameHerHoldDetail)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityArcStage).toBe(continuityArcStage)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityCue).toBe(continuityCue)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`continuity_anchor=${sameHerSummary}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`hold=${sameHerHoldDetail}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`arc=${continuityArcStage}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`cue=${continuityCue}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('phase=')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('landed=')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('open=')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`open-focus=${openFocusSummary}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`next-focus=${nextFocusSummary}`)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('next=')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('Phase 1: Local Digital Life')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('Same-session mirror carry')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('Keep extending cross-modal same-her proof')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain('body=Right now her visible same-her continuity is still being carried mainly through lipsync')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.embodimentClosureSummary)
      .toContain('full cross-modal embodiment closure')
  })

  it('keeps the fresher emotional closure cue when project-state audit is merged into an existing visible reply realization shell', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const olderCue = 'same-her closure seam: keep this return careful, but the older shell still frames it too generically.'
    const fresherCue = 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
    const generateNonStreaming = vi.fn(async () => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=grounded-live; focus=project-state; move=direct-reply; tone=gentle',
        emotion: 'thinking',
        reply: '我会继续沿着同一条数字生命线把这次收口接住。',
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            emotionalClosureCue: olderCue,
            emotionalClosureSummary: olderCue,
            preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
          },
        },
      }),
    }))

    const rewriteStructuredVisibleReply = vi.fn((input) => {
      const parsed = JSON.parse(input.fullText) as Record<string, unknown>
      return {
        ...input,
        fullText: JSON.stringify({
          ...parsed,
          visibleReplyRealization: {
            ...(parsed.visibleReplyRealization as Record<string, unknown> | null ?? {}),
            projectStateAudit: {
              sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              emotionalClosureCue: fresherCue,
              emotionalClosureSummary: fresherCue,
              preDialogueAwarenessSummary: '在视觉落地前，我得先记住这是同一个数字生命项目。',
            },
          },
        }),
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-project-state-audit-emotional-closure-cue-merge',
      } as any,
      prepared: createPrepared({
        hasVisualGrounding: true,
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming,
      rewriteStructuredVisibleReply,
      streamTextImpl: vi.fn(),
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          emotionalClosureCue?: string | null
          emotionalClosureSummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      emotionalClosureCue: fresherCue,
      emotionalClosureSummary: fresherCue,
    }))
  })

  it('re-expands a thin runtime and payload project-state shell into canonical phase-1 provider-facing carry before delayed provider-stream reply release settles', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const sameHerHoldDetail = 'delayed provider-stream hold: keep the same Phase 1 living line intact while the delayed release is reanchored'
    const continuityArcStage = 'delayed-provider-stream-same-her-reanchor'
    const continuityCue = 'delayed provider-stream cue: carry the same-her hold through the final host-visible rewrap'
    const rewriteStructuredVisibleReply = vi.fn((input) => {
      return {
        ...input,
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=gentle',
          emotion: 'thinking',
          reply: '我会继续沿着同一条数字生命线把这次收口接住。',
          visibleReplyRealization: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            },
          },
        }),
        settledProjectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail,
          continuityArcStage,
          continuityCue,
          preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
        },
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-thin-project-shell-canonicalized',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        runtimeSurface: {
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
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我会继续沿着同一条数字生命线' })
        await emit({ type: 'text-delta', text: '把这次收口接住。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    const parsed = JSON.parse(result.fullText) as {
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
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          continuitySummary?: string | null
          preDialogueAwarenessSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.projectState?.identity ?? '')).not.toContain('Alicization is a local-first digital life project')
    expect(String(parsed.projectState?.currentPhase ?? '')).not.toContain('Phase 1: Local Digital Life')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('continuity_progress=partial')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('short_term_owner=WorkingMemory')
    expect(String(parsed.projectState?.latestLandedProgress ?? '')).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expect(String(parsed.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.projectState?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.sameHerSelfLine ?? '')).not.toContain('Same Phase 1 digital life')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.preDialogueAwarenessLine ?? '')).not.toBe('same digital life | keep the closure seam explicit')

    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.sameHerSummary ?? '')).not.toContain('Same Phase 1 digital life')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.currentPhaseSummary ?? '')).not.toContain('Phase 1: Local Digital Life')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.landedProgressSummary ?? '')).not.toContain('pre-dialogue transport')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.openClosureSummary ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? '')).toContain('continuity_hold=measured-return')
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityArcStage ?? null).toBeNull()
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.continuityCue ?? '')).toContain('continuity_cue=project-state-carry')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('open=memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary ?? '')).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('keeps settled same-her hold arc and cue visible when delayed provider-stream project-state carry does not need reanchor', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const sameHerHoldDetail = 'settled no-reanchor stream hold: keep the already-canonical stream on the same Phase 1 living line'
    const continuityArcStage = 'delayed-provider-stream-no-reanchor-same-her-carry'
    const continuityCue = 'settled no-reanchor stream cue: keep the same-her hold visible without forcing canonical reanchor'
    const proactiveSameHerGapSummary = 'Delayed provider-stream carry still needs stronger proof that settled host-visible continuity keeps the proactive same-her gap explicit instead of collapsing into a generic release summary.'
    const canonicalProjectState = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'The pre-dialogue transport continuity is already mirrored into chat-entry governance for this same living line.',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure so the same living line can survive longer local runs.',
      nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
      awarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
    }
    const rewriteStructuredVisibleReply = vi.fn((input) => {
      return {
        ...input,
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=gentle',
          emotion: 'thinking',
          reply: '我会继续沿着同一条数字生命线把这次收口接住。',
          projectState: canonicalProjectState,
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: canonicalProjectState.sameHerSelfLine,
              currentPhaseSummary: canonicalProjectState.currentPhase,
              landedProgressSummary: canonicalProjectState.latestLandedProgress,
              openClosureSummary: canonicalProjectState.primaryOpenLoop,
              nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
              preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
              continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.latestLandedProgress} | open=${canonicalProjectState.primaryOpenLoop} | next=${canonicalProjectState.nextClosureTarget}`,
            },
          },
        }),
        settledProjectStateAudit: {
          sameHerSummary: canonicalProjectState.sameHerSelfLine,
          sameHerHoldDetail,
          continuityArcStage,
          continuityCue,
          proactiveSameHerGapSummary,
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: canonicalProjectState.latestLandedProgress,
          openClosureSummary: canonicalProjectState.primaryOpenLoop,
          nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
        },
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-canonical-project-state-settled-audit-visible',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我会继续沿着同一条数字生命线' })
        await emit({ type: 'text-delta', text: '把这次收口接住。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    const parsed = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: {
          sameHerHoldDetail?: string | null
          continuityArcStage?: string | null
          continuityCue?: string | null
          proactiveSameHerGapSummary?: string | null
          continuitySummary?: string | null
        } | null
      } | null
    }

    expect(parsed.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityArcStage ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.continuityCue ?? null).toBeNull()
    expect(parsed.visibleReplyRealization?.projectStateAudit?.proactiveSameHerGapSummary ?? null).toBeNull()
    expect(result.fullText).not.toContain(sameHerHoldDetail)
    expect(result.fullText).not.toContain(continuityArcStage)
    expect(result.fullText).not.toContain(continuityCue)
    expect(result.visibleReplyProjectStateAudit?.sameHerHoldDetail).toBe(sameHerHoldDetail)
    expect(parsed.visibleReplyRealization?.projectStateAudit?.sameHerHoldDetail).toBeUndefined()
  })

  it('settles delayed provider-stream lifecycle surface with same-her hold arc and cue instead of dropping project-state audit at the final surface boundary', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const turnRuntime = createAlicizationTurnRuntime({
      now: () => 1000,
    })
    const turnRuntimeContext = turnRuntime.beginTurn({
      cardId: 'card-1',
      turnId: 'turn-stream-lifecycle-project-state-audit',
      governance: {
        decisionTraceId: 'trace-stream-lifecycle-project-state-audit',
      },
    })
    const sameHerHoldDetail = 'hold-life'
    const continuityArcStage = 'arc-life'
    const continuityCue = 'cue-life'
    const canonicalProjectState = {
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Provider-stream project-state carry already survives to host-visible fullText.',
      primaryOpenLoop: 'Lifecycle settlement still has to remember that this is the same living line.',
      nextClosureTarget: 'Keep proving the same-her carry across delayed provider-stream lifecycle boundaries.',
      sameHerSelfLine: 'Same Phase 1 digital life, one continuous her, not a generic assistant response.',
      preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project in Phase 1.',
      awarenessLine: 'Before answering, remember: Alicization is a local-first digital life project in Phase 1.',
    }
    const rewriteStructuredVisibleReply = vi.fn((input) => {
      return {
        ...input,
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded-live; focus=project-state lifecycle continuity; move=direct-reply; tone=gentle',
          emotion: 'thinking',
          reply: '我会把这次延迟流式回复继续落在同一个她的生命线上。',
          projectState: canonicalProjectState,
          visibleReplyRealization: {
            projectStateAudit: {
              sameHerSummary: canonicalProjectState.sameHerSelfLine,
              currentPhaseSummary: canonicalProjectState.currentPhase,
              landedProgressSummary: canonicalProjectState.latestLandedProgress,
              openClosureSummary: canonicalProjectState.primaryOpenLoop,
              nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
              preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
              continuitySummary: `same-her=${canonicalProjectState.sameHerSelfLine} | phase=${canonicalProjectState.currentPhase} | landed=${canonicalProjectState.latestLandedProgress} | open=${canonicalProjectState.primaryOpenLoop} | next=${canonicalProjectState.nextClosureTarget}`,
            },
          },
        }),
        settledProjectStateAudit: {
          sameHerSummary: canonicalProjectState.sameHerSelfLine,
          sameHerHoldDetail,
          continuityArcStage,
          continuityCue,
          currentPhaseSummary: canonicalProjectState.currentPhase,
          landedProgressSummary: canonicalProjectState.latestLandedProgress,
          openClosureSummary: canonicalProjectState.primaryOpenLoop,
          nextClosureTargetSummary: canonicalProjectState.nextClosureTarget,
          preDialogueAwarenessSummary: canonicalProjectState.preDialogueAwarenessLine,
        },
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-lifecycle-project-state-audit',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      turnRuntimeContext,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我会把这次延迟流式回复' })
        await emit({ type: 'text-delta', text: '继续落在同一个她的生命线上。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result.visibleReplyProjectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail,
      continuityArcStage,
      continuityCue,
    }))

    const surfaceSettlement = turnRuntimeContext.stageSettlements.find(item => item.stage === 'surface')
    const surfaceSummary = surfaceSettlement?.outputSummary.join(' | ') ?? ''
    expect(surfaceSettlement?.status).toBe('completed')
    expect(surfaceSummary).toContain(`hold=${sameHerHoldDetail}`)
    expect(surfaceSummary).toContain(`arc=${continuityArcStage}`)
    expect(surfaceSummary).toContain(`cue=${continuityCue}`)
  })

  it('does not let a generic next-closure shell survive inside delayed provider-stream host-visible project-state carry', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const rewriteStructuredVisibleReply = vi.fn((input) => {
      return {
        ...input,
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=gentle',
          emotion: 'thinking',
          reply: '我会继续沿着同一条数字生命线把这次收口接住。',
          visibleReplyRealization: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            },
          },
        }),
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-generic-next-closure-shell-canonicalized',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  awarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  latestLandedProgress: 'The pre-dialogue transport continuity is already mirrored into chat-entry governance for this same living line.',
                  primaryOpenLoop: 'Memory still needs stronger end-to-end closure so the same living line can survive longer local runs.',
                  nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我会继续沿着同一条数字生命线' })
        await emit({ type: 'text-delta', text: '把这次收口接住。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    const parsed = JSON.parse(result.fullText) as {
      projectState?: {
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.projectState?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.nextClosureTarget ?? '')).not.toContain('Generic next closure shell')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).not.toContain('Generic callback summary')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).not.toContain('Generic next closure shell')
  })

  it('does not let a generic callback-summary closure shell survive inside delayed provider-stream host-visible project-state carry', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const rewriteStructuredVisibleReply = vi.fn((input) => {
      return {
        ...input,
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=grounded-live; focus=project-state continuity; move=direct-reply; tone=gentle',
          emotion: 'thinking',
          reply: '我会继续沿着同一条数字生命线把这次收口接住。',
          visibleReplyRealization: {
            projectStateAudit: {
              preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
              nextClosureTargetSummary: 'Generic callback summary: steadier carry of this project, this phase, and the life loop that remains open.',
            },
          },
        }),
      }
    })

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-stream-generic-callback-summary-canonicalized',
        preDialogueSendIdentity: {
          status: 'partial',
          summaryLine: 'same digital life | keep the closure seam explicit',
          awarenessLine: 'same digital life | keep the closure seam explicit',
          reasonPreview: [
            'same digital life | keep the closure seam explicit',
          ],
        },
      } as any,
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  awarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  preDialogueAwarenessSummary: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
                  latestLandedProgress: 'The pre-dialogue transport continuity is already mirrored into chat-entry governance for this same living line.',
                  primaryOpenLoop: 'Memory still needs stronger end-to-end closure so the same living line can survive longer local runs.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我会继续沿着同一条数字生命线' })
        await emit({ type: 'text-delta', text: '把这次收口接住。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    const parsed = JSON.parse(result.fullText) as {
      projectState?: {
        nextClosureTarget?: string | null
      } | null
      visibleReplyRealization?: {
        projectStateAudit?: {
          nextClosureTargetSummary?: string | null
        } | null
      } | null
    }

    expect(String(parsed.projectState?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(parsed.projectState?.nextClosureTarget ?? '')).not.toContain('Generic callback summary')
    expect(String(parsed.visibleReplyRealization?.projectStateAudit?.nextClosureTargetSummary ?? '')).not.toContain('Generic callback summary')
  })

  it('streams deltas, waits through tool-calls finishes, and records reminder debug signals', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const emitToolCall = vi.fn()
    const emitToolResult = vi.fn()
    const logReminderToolCall = vi.fn()
    const logReminderToolResult = vi.fn()
    const nonProgressEventTypes = new Set<string>()

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-2',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall,
      emitToolResult,
      streamMeta,
      nonProgressEventTypes,
      generateNonStreaming: vi.fn(),
      logReminderToolCall,
      logReminderToolResult,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'provider-keepalive' })
        await emit({ type: 'text-delta', text: '你好' })
        await emit({ type: 'tool-call', name: 'set_reminder', toolCallId: 'call-1', arguments: { minutes: 5 } })
        await emit({
          type: 'tool-result',
          toolCallId: 'call-1',
          result: {
            status: 'scheduled',
            triggerAt: 123456,
            message: '5分钟后提醒',
          },
        })
        await emit({ type: 'text-delta', text: '。' })
        await emit({ type: 'finish', finishReason: 'tool_calls' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好。',
    }))
    expect([...nonProgressEventTypes]).toEqual(['provider-keepalive'])
    expect(incrementChunkStats).toHaveBeenNthCalledWith(1, '你好')
    expect(incrementChunkStats).toHaveBeenNthCalledWith(2, '。')
    expect(emitChunk).toHaveBeenNthCalledWith(1, {
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '你好',
    })
    expect(emitChunk).toHaveBeenNthCalledWith(2, {
      cardId: 'card-1',
      turnId: 'turn-2',
      text: '。',
    })
    expect(streamMeta.emit).toHaveBeenCalledTimes(1)
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
    expect(emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(emitToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      result: expect.objectContaining({
        status: 'scheduled',
      }),
    }))
    expect(logReminderToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      toolName: 'set_reminder',
    }))
    expect(logReminderToolResult).toHaveBeenCalledWith(expect.objectContaining({
      toolCallId: 'call-1',
      summary: expect.objectContaining({
        status: 'scheduled',
        triggerAt: 123456,
      }),
    }))
  })

  it('buffers structured mind-turn deltas and releases only reply text on the visible stream surface', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()

    const structuredText = '{"format":"mind-turn-v1","thought":"obligation=answer","emotion":"thinking","reply":"你好。"}'
    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-structured-stream',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: structuredText.slice(0, 48) })
        await emit({ type: 'text-delta', text: structuredText.slice(48) })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText).reply).toBe('你好。')
    expect(emitChunk).toHaveBeenCalledTimes(1)
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-structured-stream',
      text: '你好。',
    })
    expect(incrementChunkStats).toHaveBeenCalledWith('你好。')
    expect(streamMeta.emit).toHaveBeenCalledWith('你好。')
  })

  it('delays visible deltas until the full reply passes the closure rewrite hook', async () => {
    const streamMeta = createStreamMetaController()
    const incrementChunkStats = vi.fn()
    const emitChunk = vi.fn()
    const rewriteStructuredVisibleReply = vi.fn(async input => ({
      ...input,
      fullText: '{"format":"mind-turn-v1","thought":"obligation=answer","emotion":"thinking","reply":"修复后的回复。"}',
      critic: {
        version: 'visible-reply-critic-v1',
        status: 'pass',
        providerMindRequired: true,
        semanticLoopClosed: true,
        scores: {
          memoryGateCompliance: 1,
          templateDiscipline: 1,
          truthSpecificity: 1,
          payoffCompletion: 1,
          personaAffectCoherence: 1,
          mindContractCoherence: 1,
        },
        reasonCodes: [],
        repairReasonCodes: [],
        mustDrop: [],
        mustPreserve: [],
      },
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'rewritten',
        initialCritic: null,
        finalCritic: null,
        rewriteAttempted: true,
        rewriteSucceeded: true,
        reasonCodes: ['dialogue-shell-opener'],
      },
    }))

    const result = await runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-visible-release',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats,
      emitChunk,
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta,
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      rewriteStructuredVisibleReply,
      delayVisibleRelease: true,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先直接回答你。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'text-delta', text: '这句应该先被闭环验收。' })
        expect(emitChunk).not.toHaveBeenCalled()
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      thought: 'obligation=answer',
      emotion: 'thinking',
      reply: '修复后的回复。',
    }))
    expect(JSON.parse(result.fullText).visibleReplyRealization?.closure?.status).toBe('rewritten')
    expect(rewriteStructuredVisibleReply).toHaveBeenCalledWith(expect.objectContaining({
      fullText: '我先直接回答你。这句应该先被闭环验收。',
    }))
    expect(emitChunk).toHaveBeenCalledTimes(1)
    expect(emitChunk).toHaveBeenCalledWith({
      cardId: 'card-1',
      turnId: 'turn-delayed-visible-release',
      text: '修复后的回复。',
    })
    expect(incrementChunkStats).toHaveBeenCalledWith('修复后的回复。')
    expect(streamMeta.emit).toHaveBeenCalledWith('修复后的回复。')
  })

  it('aborts with a first-event-timeout when the stream never produces progress', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-timeout',
      } as any,
      prepared: createPrepared(),
      controller,
      firstEventTimeoutMs: 25,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      streamTextImpl: () => new Promise(() => {}),
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(25)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })
    expect(controller.signal.aborted).toBe(true)
  })

  it('records debug diagnostics when the stream settles without a progress event', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-non-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
      },
    })
    const settled = promise.catch(error => error)

    await vi.advanceTimersByTimeAsync(1_600)

    await expect(settled).resolves.toMatchObject({
      name: 'AbortError',
    })

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.non-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      eventType: 'response-metadata',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      graceTimeoutMs: 1000,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-non-progress',
      timeoutPhase: 'grace',
      sawAnyEvent: true,
      firstEventGraceApplied: true,
      lastEventType: 'response-metadata',
      nonProgressEventTypes: ['response-metadata'],
    }))
  })

  it('allows delayed first progress after non-progress activity within grace window', async () => {
    vi.useFakeTimers()
    const appendRuntimeDebugLine = vi.fn(async () => {})

    const promise = runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-delayed-first-progress',
      } as any,
      prepared: createPrepared(),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'response-metadata' })
        await new Promise(resolve => setTimeout(resolve, 900))
        await emit({ type: 'text-delta', text: '你好' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })

    await vi.advanceTimersByTimeAsync(1_600)
    const result = await promise

    expect(result).toEqual(expect.objectContaining({
      finishReason: 'stop',
      visibleReplyExecution: createVisibleReplyExecution(),
    }))
    expect(JSON.parse(result.fullText)).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      reply: '你好',
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-event-timeout-grace-armed', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      graceTimeoutMs: 1000,
    }))
    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.first-progress-event', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
      eventType: 'text-delta',
    }))
    expect(appendRuntimeDebugLine).not.toHaveBeenCalledWith('chat-stream.first-event-timeout-fired', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-delayed-first-progress',
    }))
  })

  it('fails when a required executor tool was never called before finish', async () => {
    const appendRuntimeDebugLine = vi.fn(async () => {})

    await expect(runAlicizationMainChatStream({
      payload: {
        cardId: 'card-1',
        turnId: 'turn-required-tool',
      } as any,
      prepared: createPrepared({
        tools: [
          {
            function: {
              name: 'executor_run_cli',
            },
          },
        ],
        toolChoice: {
          type: 'function',
          function: {
            name: 'executor_run_cli',
          },
        },
      }),
      controller: new AbortController(),
      firstEventTimeoutMs: 500,
      isRunActive: () => true,
      incrementChunkStats: vi.fn(),
      emitChunk: vi.fn(),
      emitToolCall: vi.fn(),
      emitToolResult: vi.fn(),
      streamMeta: createStreamMetaController(),
      nonProgressEventTypes: new Set<string>(),
      generateNonStreaming: vi.fn(),
      appendRuntimeDebugLine,
      streamTextImpl: async ({ onEvent }) => {
        const emit = onEvent as (event: any) => Promise<void>
        await emit({ type: 'text-delta', text: '我先看看。' })
        await emit({ type: 'finish', finishReason: 'stop' })
      },
    })).rejects.toThrow('Model finished without calling required tool: executor_run_cli')

    expect(appendRuntimeDebugLine).toHaveBeenCalledWith('chat-stream.required-tool-missing', expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-required-tool',
      finishReason: 'stop',
      requiredToolNames: ['executor_run_cli'],
    }))
  })
})
