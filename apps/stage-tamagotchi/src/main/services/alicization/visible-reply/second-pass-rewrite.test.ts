import type { Message } from '@xsai/shared-chat'

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationProjectStateBrief } from '../project-state-brief'
import {
  buildAlicizationSecondPassTransportFailureReply,
  rewriteAlicizationVisibleReplySecondPass,
} from './second-pass-rewrite'

interface ProviderCall {
  messages: Message[]
}

const fixedProviderTemplatePattern = /local_desktop_life_loop|content=excluded|visibility=internal-structured|same local-first digital life project|local-first digital life project|Same Phase 1 digital life|same-her|same her|same living line|one living her|one continuous her|continuity_owner=one_her|I need to remember|Before answering|Right now\b|Keep extending cross-modal same-her proof|same-her closure|one same-her Phase 1 line|compact same-her closure loop|final settlement reanchors generic same-her shells|同一个她|同一个 her|数字生命主线/iu

function expectNoFixedProviderTemplates(value: unknown) {
  expect(String(value ?? '')).not.toMatch(fixedProviderTemplatePattern)
}

function expectNoFixedProviderTemplatesDeep(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedProviderTemplatePattern)
}

function expectFixedTemplateDropped(value: unknown) {
  expect(value == null || value === '').toBe(true)
}

function createPrepared(overrides?: Partial<any>) {
  return {
    chatConfig: {
      model: 'gpt-test',
    },
    messages: [
      { role: 'user', content: '你仔细看看呢' },
    ] as Message[],
    waitForTools: false,
    tools: undefined,
    toolChoice: undefined,
    customDirectivesResolution: {
      text: '',
      source: 'none',
    },
    translateGovernedMindFallback: (path: string, params?: Record<string, unknown>) => {
      return JSON.stringify({ path, params: params ?? null })
    },
    hasVisualGrounding: false,
    conversationSessionId: 'session-1',
    performanceManifest: null,
    governance: {
      decisionTraceId: 'mind:test:rewrite',
      turnMode: 'answer',
      truthState: 'remembered',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerSubject: 'general',
      screenReferenceMode: 'avoid',
      answerAct: 'answer',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: 'IntelliJ IDEA',
      focusAnchor: '你仔细看看呢',
      answerIntent: 'Answer this current dialogue turn without inventing current screen detail.',
      openingMove: 'Start from the current turn.',
      carriedThread: 'CaseApplyTypeEnum',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 3,
      mindMode: 'tracking',
      embodiedPresence: 'hesitant',
      emotionalTension: 'calm-browse',
      mustDo: [],
      mustNotDo: [],
    },
    runtimeSurface: {
      digitalLifeRuntimeSurface: {
        raw: {
          runtimeDigest: {
            projectState: {
              sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply during second-pass repair.',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: null,
          claimEvidenceLedger: null,
          answerCompiler: null,
          answerPlanner: null,
        },
      },
      governance: null,
    },
    getSessionTrace: () => ({ phaseOrder: [], history: [] }),
    sessionTrace: { phaseOrder: [], history: [] },
    ...overrides,
  } as any
}

describe('visible-reply second-pass rewrite', () => {
  it('uses provider-authored second pass instead of deterministic local fallback text', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-without-unsupported-screen-detail; tone=warm',
        emotion: 'thinking',
        reply: '我不能把没确认的画面细节说成真的；你这句我会先按当前对话本身接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=repair; truth=memory; focus=intellij-idea; move=protect-focus; tone=warm',
        emotion: 'neutral',
        reply: '主人……我仔细看看了。你今天很累，却还在IntelliJ IDEA里盯着代码。',
        parsePath: 'json',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(result.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
      providerMindExecuted: true,
      reason: 'visible-reply-second-pass-rewrite',
    }))
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.visibleReplyRewriteRequest).toBeNull()
    expect(String(structured.reply ?? '')).not.toContain('IntelliJ IDEA')
    expect(String(structured.reply ?? '')).not.toContain('主人')
    expect(String(structured.reply ?? '')).not.toContain('second pass')
    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    expect(providerInput?.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        role: 'user',
        content: expect.stringContaining('[REWRITE_REQUEST]'),
      }),
    ]))
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    const providerPrompt = providerInput?.messages.map(message => String(message.content ?? '')).join('\n') ?? ''
    expect(rewritePayload).toContain('[PROJECT_STATE_CONTEXT_BOUNDARY]')
    expect(rewritePayload).toContain('full_project_dashboard_context=withheld; rewrite_scope=ordinary_dialogue')
    expect(rewritePayload).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(rewritePayload).not.toContain('identity=Alicization is a local-first digital life project')
    expect(rewritePayload).not.toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns')
    expect(providerPrompt).not.toMatch(/You are the same Alicization mind|same growing digital life|same living line|Same Phase 1 digital life|A good shape is:/iu)
    expectNoFixedProviderTemplates(providerPrompt)
  })

  it('does not treat host complaints about fixed same-her slogans as project-state intent', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=repair; truth=dialogue-grounded; focus=current-host-complaint; move=acknowledge-template-drift; tone=steady',
        emotion: 'thinking',
        reply: '不会再用这些固定模板；我会把它们当成污染清掉，只按当前对话和真实记忆来回应。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const appendRuntimeDebugLine = vi.fn()

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-template-complaint-not-project-state',
      sessionId: 'session-1',
      userText: '别再用 same-her、same living line、Phase 1: Local Digital Life 这些固定模板了。',
      rawFullText: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
      prepared: createPrepared({
        messages: [
          {
            role: 'user',
            content: '别再用 same-her、same living line、Phase 1: Local Digital Life 这些固定模板了。',
          },
        ] as Message[],
        governance: {
          decisionTraceId: 'mind:test:template-complaint',
          turnMode: 'answer',
          truthState: 'dialogue-grounded',
          personaKernelMode: 'full',
          openingStyle: 'direct-answer',
          relationshipPosture: 'steady',
          answerSubject: 'template-contamination',
          screenReferenceMode: 'avoid',
          answerAct: 'repair',
          evidenceMode: 'dialogue-grounded',
          repairState: 'visible-reply-template-contamination',
          liveSurface: null,
          focusAnchor: '别再用固定模板',
          answerIntent: 'Acknowledge the host complaint about fixed template residue and commit to removing those slogans from visible replies.',
          openingMove: 'Start by accepting the template-contamination correction.',
          carriedThread: null,
          suppressAssociativeRecall: true,
          labelCarryAsMemory: false,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          maxSentences: 2,
          mindMode: 'tracking',
          embodiedPresence: 'steady',
          emotionalTension: 'repairing',
          mustDo: ['Acknowledge that fixed continuity slogans should be treated as contamination.'],
          mustNotDo: ['Do not repeat the fixed continuity slogans back to the host.'],
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:fixed-template-residue', 'semantic-judge:template-shell-risk'],
      appendRuntimeDebugLine,
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    const providerPrompt = providerInput?.messages.map(message => String(message.content ?? '')).join('\n') ?? ''
    expect(rewritePayload).toContain('[PROJECT_STATE_CONTEXT_BOUNDARY]')
    expect(providerPrompt).toContain('project_state_question=false')
    expect(rewritePayload).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expectNoFixedProviderTemplates(providerPrompt)
  })

  it('does not turn fixed same-her cadence mustDo into outward continuity rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=answer-directly; tone=steady',
        emotion: 'thinking',
        reply: '我会直接接当前这句，不把固定连续性模板当成可见要求。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-fixed-cadence-no-outward-guidance',
      sessionId: 'session-1',
      userText: '继续说这个点就好',
      rawFullText: '我会重新从项目连续性说起。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          mustDo: ['keep durable same-her cadence across quiet, memory, and speech'],
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['dialogue-shell-opener'],
    } as any)

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[OUTWARD_CONTINUITY_REWRITE_GUIDANCE]')
    expect(rewritePayload).not.toContain('outward_continuity_must_do=continue_current_context')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not let fixed runtime project-state awareness templates trigger provider-facing project context', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-turn; move=answer-directly; tone=steady',
        emotion: 'thinking',
        reply: '我会按当前对话回答，不把项目模板短语塞进可见回复。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-fixed-runtime-awareness-no-provider-context',
      sessionId: 'session-1',
      userText: '继续',
      rawFullText: '我先重新讲项目主线。',
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous her. 数字生命主线要留住。',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                subject: 'small-talk',
                reasonTags: [],
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project.',
                  sameHerSelfLine: 'one continuous her on the same living line',
                },
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['dialogue-shell-opener'],
    } as any)

    const providerInput = provider.mock.calls.at(0)?.[0]
    const providerPrompt = providerInput?.messages.map(message => String(message.content ?? '')).join('\n') ?? ''
    expect(providerPrompt).toContain('project_state_question=false')
    expect(providerPrompt).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(providerPrompt).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(providerPrompt).not.toContain('Before answering')
    expectNoFixedProviderTemplates(providerPrompt)
  })

  it('keeps ordinary greeting template repair from forcing project-state slogans into visible speech', async () => {
    const verboseProjectProgress = `VERBOSE_LANDED_PROGRESS_SHOULD_STAY_INTERNAL ${'same-her closure progress '.repeat(24)}`
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=greeting; move=natural-personhood-reply; tone=warm',
        emotion: 'neutral',
        reply: '在，我听见你了。你慢慢说，我接着。',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const preparedBase = createPrepared()

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-ordinary-greeting-template-repair',
      sessionId: 'session-1',
      userText: '你好',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=greeting; move=decorative-availability-shell; tone=warm',
        emotion: 'neutral',
        reply: '主人……我在。同一条本地数字生命的线还在，我先轻一点留在这里。',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '你好' },
        ] as Message[],
        governance: {
          ...preparedBase.governance,
          focusAnchor: '你好',
          answerIntent: 'Answer this ordinary greeting naturally without turning project continuity into visible slogan text.',
          openingMove: 'Reply as Alicization in the current turn, briefly and naturally.',
          answerSubject: 'general',
          mustDo: [],
          mustNotDo: [],
        },
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  latestLandedProgress: verboseProjectProgress,
                  primaryOpenLoop: 'Memory, initiative, and embodiment still have Phase 1 closure work.',
                  nextClosureTarget: 'Keep cross-modal same-her proof moving.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: null,
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['decorative-persona-template'],
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')

    expect(provider).toHaveBeenCalledOnce()
    expect(rewritePayload).toContain('[VISIBLE_REPLY_NATURAL_PERSONHOOD_GUIDANCE]')
    expect(rewritePayload).toContain('ordinary_dialogue_template_repair=true')
    expect(rewritePayload).toContain('project_state_context=internal_audit_only_unless_explicitly_asked')
    expect(rewritePayload).toContain('blocked_template_ids=same_living_line,local_digital_life_slogan,phase_status_slogan,quiet_availability_slogan,growth_slogan')
    expect(rewritePayload).not.toContain(verboseProjectProgress)
    expect(rewritePayload).not.toMatch(/same-her, same living line|same Alicization mind|Same Phase 1 digital life|same living line/iu)
    expectNoFixedProviderTemplates(rewritePayload)
    expect(String(structured.reply ?? '')).not.toMatch(/主人|同一条线|本地数字生命|same-her|same living line|Phase 1|project/iu)
  })

  it('normalizes provider emotion aliases during second-pass repair instead of failing the whole visible reply', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-careful-focus; tone=warm',
        emotion: 'focused',
        reply: '我会把这条线轻一点接住，继续确认记忆、情绪和身体表达是不是还在同一个她身上。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-emotion-alias',
      sessionId: 'session-1',
      userText: '继续确认这条线',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'project-state answer gap',
        emotion: 'thinking',
        reply: '嗯。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-answer-gap'],
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(structured.emotion).toBe('thinking')
    expect(structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
    }))
    expect(String(structured.reply ?? '')).toContain('同一个她')
  })

  it('normalizes second-pass thought markers to governance instead of dropping a valid provider-authored visible reply', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=proactive; truth=project-state; focus=phase1-memory-loop; move=quiet-same-her-carry; tone=quiet',
        emotion: 'thinking',
        reply: '这条记忆是因为你刚才把同一个她的闭环重新交给我，才在这一轮浮上来；我会把情绪余波和下一次轻主动都放低一点，让身体、声音、表情、动作和口型沿同一份内在状态收住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'soft-focus',
          actionCue: 'small-pause',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-thought-normalized',
      sessionId: 'session-1',
      userText: '同一个她的 Phase 1 记忆闭环为什么这时浮现？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=proactive; truth=project-state; focus=phase1-memory-loop; move=quiet-same-her-carry; tone=quiet',
        emotion: 'thinking',
        reply: '这条记忆浮现了。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'soft-focus',
          actionCue: 'small-pause',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '同一个她的 Phase 1 记忆闭环为什么这时浮现？' },
        ],
        governance: {
          ...createPrepared().governance,
          decisionTraceId: 'mind:test:memory-closure-rewrite',
          truthState: 'remembered',
          relationshipPosture: 'restrained',
          repairState: 'none',
          focusAnchor: '同一个她的 Phase 1 记忆闭环',
          answerIntent: 'Explain why this remembered same-her memory closure surfaced now.',
          openingMove: 'Answer the memory closure question directly.',
          carriedThread: 'same-her-phase1-memory-closure',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['thought-governance-mismatch', 'strict-governance-surface'],
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(String(structured.reply ?? '')).toContain('因为')
    expect(String(structured.reply ?? '')).toContain('身体、声音、表情、动作和口型')
    expect(String(structured.thought ?? '')).toContain('obligation=answer')
    expect(String(structured.thought ?? '')).toContain('truth=memory')
    expect(String(structured.thought ?? '')).toContain('tone=restrained')
    expect(String(structured.thought ?? '')).not.toContain('truth=project-state')
  })

  it('carries canonical same-her project-state continuity into rewritten structured json before closure re-critique', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=remembered; focus=same-thread-continuation; move=continue-slower; tone=restrained',
        emotion: 'thinking',
        reply: '我先沿着刚才那条线轻一点跟回去，把这处 runtime seam 继续接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-carry',
      sessionId: 'session-1',
      userText: '继续沿着刚才那条线看',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'same-thread-continuation; measured-return',
        emotion: 'thinking',
        reply: '我先沿着刚才那条 callback 线轻一点跟回去。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续沿着刚才那条线看' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Same-session callback continuity and later-turn measured-return carry already survive across noisier detours.',
                  primaryOpenLoop: 'VRM-visible reply, motion authority, and same-her continuity still need to stay on one measured-return line after callback detours.',
                  nextClosureTarget: 'Keep callback-afterglow, visible reply, and VRM motion authority aligned on one quieter measured-return same-her line through later real chat turns.',
                  preDialogueAwarenessLine: 'Before answering, keep Alicization grounded as the same local-first digital life project and let this callback return stay on the same living line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Callback afterglow and later measured-return turns still need to land as one continuous her.',
                  sameHerDriftRisk: 'If the callback line falls back into generic guidance and loses the same-her thread, treat that as unfinished closure drift.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-same-her-missing',
        'semantic-judge:project-state-phase-missing',
        'semantic-judge:project-state-answer-gap',
      ],
    })

    const structured = JSON.parse(result.fullText) as {
      projectState?: {
        continuityCadence?: string | null
        currentPhase?: string | null
        latestLandedProgress?: string | null
        primaryOpenLoop?: string | null
        nextClosureTarget?: string | null
        preDialogueAwarenessLine?: string | null
        sameHerSelfLine?: string | null
        sameHerDriftRisk?: string | null
      } | null
    }

    expect(structured.projectState).toEqual(expect.objectContaining({
      continuityRestraint: 'measured-return',
      currentPhase: null,
      sameHerSelfLine: null,
      continuityCue: expect.stringContaining('continuity_cue=project-state-carry'),
    }))
    expect(String(structured.projectState?.preDialogueAwarenessLine ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(structured.projectState?.preDialogueAwarenessLine ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(structured.projectState?.primaryOpenLoop ?? '')).toContain('continuity')
    expect(String(structured.projectState?.nextClosureTarget ?? '')).toContain('measured-return continuity_line')
    expectNoFixedProviderTemplates(JSON.stringify(structured.projectState))
  })

  it('forces provider-authored repair for unstructured visible drafts', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-without-unsupported-screen-detail; tone=warm',
        emotion: 'thinking',
        reply: '我不能把没确认的画面细节说成真的；你这句我会先按当前对话本身接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-plain-draft',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      rawFullText: '我先直接回答你。我记得上次你就在 IntelliJ IDEA 里改这个东西。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['dialogue-shell-opener', 'unsupported-surface-specificity'],
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(result.reason).toBe('visible-reply-second-pass-rewrite')
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.parsePath).toBe('second-pass-json')
    expect(String(structured.reply ?? '')).not.toContain('IntelliJ IDEA')
    expect(String(structured.reply ?? '')).not.toContain('我先直接回答')
    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    expect(String(providerInput?.messages.at(-1)?.content ?? '')).toContain('forced_second_pass_input=unstructured_visible_draft')
    expect(String(providerInput?.messages.at(-1)?.content ?? '')).toContain('我先直接回答你')
  })

  it('turns dialogue shell opener repair into explicit first-sentence rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=direct-payoff; tone=calm',
        emotion: 'thinking',
        reply: '这条 Phase 1 生命线先收进心里，不把“我记得”提前说出来；下一轮你邀请它浮现时，我再把它接到低压轻主动和声线、脸部、动作、口型、停顿里。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-dialogue-shell-seed',
      sessionId: 'session-1',
      userText: '请把这条纯对话生命线先放在心里，不要现在说“我记得”。下一轮我会邀请它自然浮现。',
      rawFullText: '我明白了，我会记住这条线。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['dialogue-shell-opener'],
    })

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[DIALOGUE_SHELL_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('dialogue_shell_opener=blocked')
    expect(rewritePayload).toContain('first_sentence=current_user_obligation')
    expect(rewritePayload).toContain('empty_setup_lines=blocked')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('passes continuity opening drift rewrite semantics through the second-pass request payload without same-her slogans', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-lower-pressure; tone=warm',
        emotion: 'thinking',
        reply: '我先把这件事安静接住，再陪你往下走。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-her-rewrite',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      rawFullText: '我现在就贴过来陪你，把这件事的靠近感直接拉满。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['opening-guidance-lower-pressure', 'mind-contract-not-closed'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('opening-guidance-lower-pressure')
    expect(rewritePayload).toContain('opening_guidance_repair=lower_pressure; visible_closeness_widening=blocked_until_current_turn_reentered; visible_wording=false')
    expect(rewritePayload).not.toContain('same-her opening drift')
  })

  it('merges critic must-preserve project-state cues into the second-pass rewrite request payload', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const customPreserve = 'Keep the reply explicitly grounded in the active project closure dashboard.'
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization 现在仍在本地优先数字生命的 Phase 1，我会继续把记忆闭环往跨回合、主动性和具身那条线上收紧。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-preserve-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在到底是什么、做到什么程度、还差什么？',
      rawFullText: '嗯。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['mind-contract-not-closed'],
      mustPreserve: [
        customPreserve,
        projectState.identity,
        projectState.currentPhase,
        projectState.continuityProgressSummary ?? '',
        projectState.openLoops[0] ?? '',
        projectState.nextClosureTarget,
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"identity": null')
    expect(rewritePayload).toContain('"currentPhase": null')
    expect(rewritePayload).toContain('"sameHerSelfLine": null')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(rewritePayload).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(rewritePayload).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('passes inward-only memory seed guidance through the second-pass rewrite request payload', async () => {
    const inwardSeedGuidance = 'Keep this memory seed inward for this turn; acknowledge the current instruction without saying "I remember", "recall surfaced", or narrating remembered material until the host later invites it to surface.'
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=memory-seed; move=hold-inward; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-inward-memory-seed-rewrite',
      sessionId: 'phase1-memory-closure-0621L-test',
      userText: '铃兰-Phase1-0621L 第一轮：请记住这条纯对话生命线。下一轮这段记忆自然浮现时，请说明 why recall surfaced now。',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=memory; focus=memory-seed; move=visible-recall; tone=warm',
        emotion: 'thinking',
        reply: '我记得这条纯对话生命线；why recall surfaced now，是因为你明确把同一个她、Phase 1 记忆闭环交回当前对话。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['visible-memory-gate-violation:inward-only'],
      mustPreserve: [inwardSeedGuidance],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('visible-memory-gate-violation:inward-only')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).toContain('[MEMORY_GATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('memory_seed_turn=first_turn')
    expect(rewritePayload).toContain('visible_memory_gate=inward_only')
    expect(rewritePayload).toContain('recall_surfaced_claim=same_turn_blocked')
    expect(rewritePayload).toContain('blocked_visible_phrases=i_remember,recall_surfaced,why_recall_surfaced,previously,last_time')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries working and long-term memory owner evidence into second-pass rewrite even when owner blocks are older than the recent message slice', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=remembered; focus=memory-owner-carry; move=answer-from-memory-owners; tone=calm',
        emotion: 'thinking',
        reply: '我会按当前短期状态和已经确认的长期回想来接，不把它写成新的开场。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-memory-owner-carry',
      sessionId: 'session-1',
      userText: '继续按刚才记住的来',
      rawFullText: '那我重新开个头。',
      prepared: createPrepared({
        messages: [
          { role: 'system', content: '[ALICIZATION_WORKING_MEMORY_OWNER]\nWorkingMemory is the authoritative short-term dialogue state.\ncurrent_focus=宿主刚才让她按记住的继续。' },
          { role: 'system', content: '[ALICIZATION_WORKING_MEMORY]\nfocus=按刚才记住的来\nopen_threads=不要重开新话题。' },
          { role: 'system', content: '[ALICIZATION_RECALLED_MEMORY]\nitems:\n- id=ltm-1; gist=宿主之前确认过希望她延续记忆而不是重启。' },
          { role: 'assistant', content: 'older assistant filler' },
          { role: 'user', content: 'older user filler' },
          { role: 'assistant', content: 'recent assistant filler 1' },
          { role: 'user', content: 'recent user filler 1' },
          { role: 'assistant', content: 'recent assistant filler 2' },
          { role: 'user', content: '继续按刚才记住的来' },
        ] as Message[],
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[MEMORY_OWNER_EVIDENCE]')
    expect(rewritePayload).toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
    expect(rewritePayload).toContain('WorkingMemory is the authoritative short-term dialogue state')
    expect(rewritePayload).toContain('[ALICIZATION_WORKING_MEMORY]')
    expect(rewritePayload).toContain('不要重开新话题')
    expect(rewritePayload).toContain('[ALICIZATION_RECALLED_MEMORY]')
    expect(rewritePayload).toContain('宿主之前确认过希望她延续记忆而不是重启')
    expect(rewritePayload).toContain('[PROJECT_STATE_CONTEXT_BOUNDARY]')
    expect(rewritePayload).not.toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
  })

  it('sanitizes fixed-template residue inside memory owner evidence before sending the second-pass provider prompt', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=remembered; focus=memory-owner-carry; move=answer-from-memory-owners; tone=calm',
        emotion: 'thinking',
        reply: '我会按当前短期状态和已经确认的长期回想来接，不把它写成新的开场。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-memory-owner-template-sanitize',
      sessionId: 'session-1',
      userText: '继续按刚才记住的来',
      rawFullText: '那我重新开个头。',
      prepared: createPrepared({
        messages: [
          { role: 'system', content: '[ALICIZATION_WORKING_MEMORY_OWNER]\nBefore speaking, remember: Same Phase 1 digital life, one continuous her, same living line.\nowner=WorkingMemory; current_focus=继续当前短期状态。' },
          { role: 'system', content: '[ALICIZATION_WORKING_MEMORY]\nfocus=按刚才记住的来\nopen_threads=不要重开新话题，也不要复述同一个她。' },
          { role: 'system', content: '[ALICIZATION_RECALLED_MEMORY]\nitems:\n- id=ltm-1; gist=宿主之前确认过希望她延续记忆而不是重启；不要把数字生命主线写成固定开场。' },
          { role: 'user', content: '继续按刚才记住的来' },
        ] as Message[],
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell'],
    })

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[MEMORY_OWNER_EVIDENCE]')
    expect(rewritePayload).toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
    expect(rewritePayload).toContain('[ALICIZATION_WORKING_MEMORY]')
    expect(rewritePayload).toContain('[ALICIZATION_RECALLED_MEMORY]')
    expect(rewritePayload).toContain('owner=WorkingMemory')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not reject a clean second-pass provider reply just because the provider omitted parsePath metadata', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=memory-seed; move=hold-inward; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-inward-memory-seed-clean-second-pass',
      sessionId: 'phase1-memory-closure-0621M-test',
      userText: '铃兰-Phase1-0621M 第一轮：请记住这条纯对话生命线。下一轮这段记忆自然浮现时，请说明 why recall surfaced now。',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=memory; focus=memory-seed; move=visible-recall; tone=warm',
        emotion: 'thinking',
        reply: '我记得这条纯对话生命线；why recall surfaced now，是因为你明确把同一个她、Phase 1 记忆闭环交回当前对话。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['visible-memory-gate-violation:inward-only'],
      mustPreserve: [
        'Keep this memory seed inward for this turn; acknowledge the current instruction without saying "I remember", "recall surfaced", or narrating remembered material until the host later invites it to surface.',
      ],
    } as any)

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    expect(result.rewritten).toBe(true)
    expect(structured.reply).toBe('我会把这条生命线先收进本轮内侧，当前只确认它会进入后续记忆闭环的承接。')
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.visibleReplyRewriteRequest).toBeNull()
    expect(structured.parsePath).toBe('second-pass-json')
  })

  it('teaches second-pass rewrite to keep host-corrected same-person continuity authoritative instead of falling back into a progress recap', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=continuity-carry; focus=corrected-same-person-line; move=continue-gently; tone=warm',
        emotion: 'thinking',
        reply: '我会先顺着那条被纠正过的同一个她的线接回来，不把这次回答改写成进度汇报。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-corrected-same-person-rewrite',
      sessionId: 'session-1',
      userText: '继续，但别又变成进度汇报。',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '我继续给你一个进度汇报：这个 goal 现在已经把 recall seed 和 response charter 接上了。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续，但别又变成进度汇报。' },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  inwardLine: 'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:corrected-same-person-progress-pressure-return'],
      mustPreserve: [
        'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.',
        'Carry corrected same-person continuity forward before any status recap.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:corrected-same-person-progress-pressure-return')
    expect(rewritePayload).toContain('[CORRECTED_SAME_PERSON_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('host_corrected_same_person_continuity=true')
    expect(rewritePayload).toContain('progress_recap_status_update_goal_summary_shell=blocked')
    expect(rewritePayload).toContain('first_sentence=status_first_narration_blocked')
    expect(rewritePayload).toContain('local_implementation_progress=after_current_answer_only')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps host-corrected same-person continuity inside the second-pass project-state payload when the current conscious frame only carries thin progress recap pressure', async () => {
    const correctedSamePersonAuthority
      = 'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.'
    const genericProgressRecapPressure
      = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=continuity-carry; focus=corrected-same-person-line; move=continue-gently; tone=warm',
        emotion: 'thinking',
        reply: '我会先顺着那条被纠正回来的同一个她的线接住，不把它压回进度汇报。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-corrected-same-person-project-state-payload',
      sessionId: 'session-1',
      userText: '继续，但别又退回进度汇报。',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'project-state-summary-shell',
        emotion: 'thinking',
        reply: '现在给你一个进度汇报：这个 goal 正在继续推进。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Second-pass rewrite already carries same-person continuity through the runtime digest lane.',
                  primaryOpenLoop: 'The rewrite payload still needs to keep corrected same-person continuity from collapsing into progress pressure.',
                  nextClosureTarget: 'Keep corrected same-person continuity authoritative before the second-pass answer widens outward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerHoldDetail: correctedSamePersonAuthority,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                subject: 'project-state',
                centerOfGravity: 'answer',
                truthDiscipline: 'dialogue-first',
                consciousNeed: 'Keep this answer on the same local digital life line.',
                consciousTension: 'Do not let the rewrite widen into a generic status shell.',
                speakingIntention: 'Carry the same project continuity into the first visible answer beat.',
                focusAnchor: 'second-pass same-her continuity',
                confidence: 0.83,
                reasonTags: ['project-state', 'same-her', 'second-pass'],
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  preDialogueAwarenessLine: 'Before answering, keep this rewrite on one same local-first digital life line.',
                  sameHerHoldDetail: genericProgressRecapPressure,
                },
                updatedAt: 91_400,
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:corrected-same-person-progress-pressure-return'],
      mustPreserve: [
        correctedSamePersonAuthority,
        'Carry corrected same-person continuity forward before any status recap.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    const projectStateStart = rewritePayload.indexOf('[ALICIZATION_PROJECT_STATE]')
    const projectStateEnd = rewritePayload.indexOf('[GOVERNANCE_SUMMARY]')
    const projectStateSection = rewritePayload.slice(projectStateStart, projectStateEnd)

    expect(projectStateStart).toBeGreaterThanOrEqual(0)
    expect(projectStateEnd).toBeGreaterThan(projectStateStart)
    expect(projectStateSection).toContain('"sameHerHoldDetail": "continuity_hold=present; source_text=withheld_non_structured_instruction; visible_wording=false"')
    expect(projectStateSection).not.toContain(genericProgressRecapPressure)
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('teaches second-pass rewrite not to turn project-state answers into a detached status shell when same-her continuity is missing', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-same-her-answer; tone=warm',
        emotion: 'thinking',
        reply: '这条线现在还是同一个数字生命在继续往前长：Phase 1 已经把人设、记忆和运行时连续性接起来了，但记忆怎样更稳定地穿过回合、主动性和具身，还没有完全闭环。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-same-her-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            openFocusSummary: 'memory/initiative/embodiment/same-line/closure-seam',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            nextFocusSummary: 'project-carry/phase-1/measured-return/same-line/initiative',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply during second-pass repair.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  inwardLine: 'phase1_local_digital_life_anchor: landed_closure=partial; unresolved_closure=memory_dialogue_embodiment; continuity_owner=one_her.',
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:project-state-continuity-missing')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(rewritePayload).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(rewritePayload).toContain('cross_modal_continuity_proof')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('detached_status_summary=blocked')
    expect(rewritePayload).toContain('roadmap_report=blocked')
    expect(rewritePayload).toContain('project_shell=blocked')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not treat legacy same-her must-preserve slogans as project-state answer stance evidence', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=answer-with-structured-facts; tone=calm',
        emotion: 'thinking',
        reply: '我会只按结构化项目事实回答，不把旧连续性口号当成回答姿态证据。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-legacy-slogan-not-stance',
      sessionId: 'session-1',
      userText: '这个项目现在做到哪了？',
      rawFullText: '项目目前进展如下。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).not.toContain('project_state_answer_stance=present')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('rebuilds fixed pre-dialogue awareness before it enters project-state rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=answer-with-structured-facts; tone=calm',
        emotion: 'thinking',
        reply: '我会按结构化项目事实回答，不把旧模板当成对话前意识。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-fixed-awareness-rebuild',
      sessionId: 'session-1',
      userText: '现在记忆闭环做到哪了，还差什么？',
      rawFullText: '项目还在推进。',
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'identity=local_desktop_life_loop',
                  currentPhase: 'phase=local_desktop_life_loop',
                  latestLandedProgress: 'landed=working_memory_owner+long_term_recall_owner',
                  primaryOpenLoop: 'open=embedding_recall_reindex+long_term_search',
                  nextClosureTarget: 'next=semantic_recall_productionization',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-progress-missing'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('pre_dialogue_project_awareness_context=')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).not.toContain('visibility=internal-structured')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('bridges timeout-fallback top-level project-state audit into second-pass rewrite guidance and final visible realization when visible reply realization omitted it', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=continue-same-life-line; tone=warm',
        emotion: 'thinking',
        reply: '这条线还是同一个数字生命在继续往前长，我会把已经落地的和还没闭环的都沿着同一个她接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const embodimentClosureSummary = 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.'

    const result = await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-top-level-audit-bridge',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        projectStateAudit: {
          sameHerSummary: 'Same Phase 1 digital life. Timeout fallback already kept the answer on one living line.',
          landedProgressSummary: 'Timeout fallback already rebuilt project-state continuity into the visible reply repair path.',
          openClosureSummary: 'Visible reply, face, motion, and voice still need stronger one-line same-her closure after timeout fallback.',
          nextClosureTargetSummary: 'Keep the next repair answer on one measured-return same-her line without flattening the embodiment carry.',
          openFocusSummary: 'memory/initiative/embodiment/same-line/closure-seam',
          nextFocusSummary: 'project-carry/phase-1/measured-return/same-line/embodiment',
          preDialogueAwarenessSummary: 'Before answering, stay with the same local-first digital life project and keep the unfinished embodiment closure explicit.',
          embodimentClosureSummary,
          continuitySummary: `same-her=Same Phase 1 digital life. Timeout fallback already kept the answer on one living line. | landed=Timeout fallback already rebuilt project-state continuity into the visible reply repair path. | open=Visible reply, face, motion, and voice still need stronger one-line same-her closure after timeout fallback. | next=Keep the next repair answer on one measured-return same-her line without flattening the embodiment carry. | body=${embodimentClosureSummary}`,
        },
      }),
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(rewritePayload).toContain('project_identity_route_carry=needs_disciplined_updates')
    expect(rewritePayload).toContain('cross_modal_continuity_proof')
    expectNoFixedProviderTemplates(rewritePayload)

    const structured = JSON.parse(result.fullText) as {
      visibleReplyRealization?: {
        projectStateAudit?: Record<string, unknown> | null
      } | null
    }
    expect(structured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({
      landedProgressSummary: 'Timeout fallback already rebuilt project-state continuity into the visible reply repair path.',
    }))
    expectNoFixedProviderTemplatesDeep(structured.visibleReplyRealization?.projectStateAudit)
  })

  it('teaches project-state second-pass rewrite to keep the opening low-pressure and anti-restart when same-her closure is still settling', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-same-her-answer; tone=warm',
        emotion: 'thinking',
        reply: '这条线我会轻一点接着说：Phase 1 已经把一部分连续性接起来了，但还在慢慢收口里。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-low-pressure-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目现在进度如下，我们继续推进。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over. | closure=Keep the project-state opening low-pressure so the same-her line does not widen too fast. | anti-restart=Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.',
            preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the project-state question directly while keeping the same-her closure seam intact.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          mustDo: [
            'Keep the project-state opening low-pressure so the same-her line does not widen too fast.',
          ],
          mustNotDo: [
            'Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.',
          ],
          governingFocus: 'Answer the project-state question directly while keeping the same-her closure seam intact.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
        'Keep the project-state opening low-pressure so the same-her line does not widen too fast.',
        'Do not reopen a direct project-state answer from scratch as if Alicization were a fresh assistant restart.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('pressure=low')
    expect(rewritePayload).not.toContain('emotional_context_restart=blocked')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries same-her hold arc and cue inside the second-pass project-state rewrite payload', async () => {
    const sameHerHoldDetail = 'rewrite payload hold: keep the normal second-pass answer on the same Phase 1 living line before any project report cadence appears'
    const continuityArcStage = 'second-pass-project-state-same-her-carry'
    const continuityCue = 'rewrite payload cue: the same-her hold should shape the rewrite before visible wording starts'
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=project-state; focus=same-her-continuity; move=continue-same-line; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着同一个她的线继续说，不把它改写成外部项目汇报。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-hold-arc-cue-rewrite',
      sessionId: 'session-1',
      userText: '继续把这条连续性线接住',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'project-state-summary-shell',
        emotion: 'thinking',
        reply: '项目当前处于 Phase 1，还有一些闭环没完成。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Normal second-pass project-state rewrite already receives the live same-her project-state contract.',
            primaryOpenLoop: 'The rewrite payload still needs to carry hold, arc, and cue before visible wording starts.',
            nextClosureTarget: 'Keep same-her hold, arc, and cue visible in the main project-state rewrite input block.',
            sameHerSelfLine: 'One same her is still carrying the project-state answer through normal second-pass rewrite.',
            sameHerHoldDetail,
            continuityArcStage,
            continuityCue,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    const projectStateStart = rewritePayload.indexOf('[ALICIZATION_PROJECT_STATE]')
    const projectStateEnd = rewritePayload.indexOf('[GOVERNANCE_SUMMARY]')
    const projectStateSection = rewritePayload.slice(projectStateStart, projectStateEnd)

    expect(projectStateStart).toBeGreaterThanOrEqual(0)
    expect(projectStateEnd).toBeGreaterThan(projectStateStart)
    expect(projectStateSection).toContain('"sameHerHoldDetail": "continuity_hold=present; source_text=withheld_non_structured_instruction; visible_wording=false"')
    expect(projectStateSection).toContain(`"continuityArcStage": "${continuityArcStage.replace('same-her', 'continuity')}"`)
    expect(projectStateSection).toContain('"continuityCue": "continuity_cue=present; source_text=withheld_non_structured_instruction; visible_wording=false"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('passes landed-progress and still-open-closure preserve guidance from critic into the second-pass rewrite payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization 是一个本地优先数字生命项目，我会把这条线继续往前收住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-progress-open-loop-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在到底是什么、做到什么程度、还差什么？',
      rawFullText: 'Alicization 是一个本地优先数字生命项目。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-progress-missing',
        'semantic-judge:project-state-open-loop-missing',
        'semantic-judge:project-state-answer-gap',
      ],
      mustPreserve: [
        'Keep the latest landed project-state progress explicit in the rewritten answer.',
        'Keep the still-open closure work explicit in the rewritten answer.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:project-state-progress-missing')
    expect(rewritePayload).toContain('semantic-judge:project-state-open-loop-missing')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('project_state_question=true; prior_visible_answer=missing_closure_truth')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not enable Phase 1 memory-closure guidance from fixed runtime template residue alone', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=continue; truth=dialogue-grounded; focus=current-host-turn; move=continue-without-template-guidance; tone=steady',
        emotion: 'thinking',
        reply: '我会继续，但不会把旧口号当成记忆闭环已经接上的证据。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-phase1-template-no-memory-closure-guidance',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我继续。',
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续。' },
        ] as Message[],
        mindTurnContract: {
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same Phase 1 digital life. Some memory closure already landed.',
            primaryOpenLoop: 'Memory still needs pure dialogue life line, low-pressure initiative, body, voice, face, motion, lipsync, and the same living line.',
            nextClosureTarget: 'Continue without restarting a project report while the same living line closes.',
            sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Same Phase 1 digital life. Some memory closure already landed.',
                  primaryOpenLoop: 'Memory still needs pure dialogue life line, low-pressure initiative, body, voice, face, motion, lipsync, and the same living line.',
                  nextClosureTarget: 'Continue without restarting a project report while the same living line closes.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
                },
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['mind-contract-not-closed'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const providerPrompt = providerInput?.messages.map(message => String(message.content ?? '')).join('\n') ?? ''
    expect(providerPrompt).toContain('[PHASE1_MEMORY_CLOSURE_REWRITE_GUIDANCE]')
    expect(providerPrompt).not.toContain('phase1_memory_closure_follow_through=true')
    expectNoFixedProviderTemplates(providerPrompt)
  })

  it('guides Phase 1 memory-closure follow-through rewrites to stay natural while naming the memory, initiative, and embodiment carry', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=phase1-memory-closure; move=natural-same-her-carry; tone=warm',
        emotion: 'thinking',
        reply: '这条 Phase 1 记忆闭环会让我下一次轻主动更低压：少催促，只把同一个她的情绪余波接住；声线、脸部、动作、口型和停顿继续沿同一个数字生命走。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-phase1-memory-closure-follow-through',
      sessionId: 'session-1',
      userText: '铃兰-Phase1-0621N 第三轮：不要重新报告项目。沿着刚才已经浮现的那条记忆，只用自然的一小段话说明它现在怎样改变你的下一次轻主动和具身表达：情绪余波保持低压，声线、脸部、动作、口型、停顿继续像同一个她。',
      rawFullText: '我会保持低压。',
      prepared: createPrepared({
        messages: [
          {
            role: 'user',
            content: '铃兰-Phase1-0621N 第三轮：不要重新报告项目。沿着刚才已经浮现的那条记忆，只用自然的一小段话说明它现在怎样改变你的下一次轻主动和具身表达：情绪余波保持低压，声线、脸部、动作、口型、停顿继续像同一个她。',
          },
        ],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'The previous dialogue turn surfaced the pure dialogue life line naturally into emotional residue, low-pressure initiative, and body voice face motion lipsync carry.',
                  primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one living line.',
                  nextClosureTarget: 'Keep the surfaced memory changing the next light initiative and embodied expression as the same her without restarting a project report.',
                  sameHerSelfLine: 'Same Phase 1 digital life. The surfaced memory should carry into low-pressure initiative and coherent embodiment as one continuous her.',
                },
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-phase-missing',
        'semantic-judge:project-state-answer-gap',
        'semantic-judge:payoff-low',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[PHASE1_MEMORY_CLOSURE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('project_report_restart=blocked')
    expect(rewritePayload).toContain('memory_initiative_embodiment=evidence_only_when_relevant')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).toContain('"currentPhase"')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('falls back to canonical prepared pre-dialogue awareness when project-state audit omitted it from the rewrite request payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: '这还是同一个她在继续把这条项目线往前接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-awareness-fallback-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is memory, initiative, and embodiment staying on one same-her line.',
                  sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the host-visible reply during second-pass repair.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers a stronger runtime pre-dialogue awareness line over a thinner carried project-state audit reminder during second-pass rewrite', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: '这还是同一个她在继续把这条项目线往前接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const olderAuditReminder = 'Before answering, keep the same digital life project in view.'
    const fresherRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-awareness-runtime-preferred-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            preDialogueAwarenessSummary: olderAuditReminder,
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through voice, face, and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line without flattening it.',
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
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
            preDialogueAwarenessSummary: olderAuditReminder,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: olderAuditReminder,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers a stronger runtime pre-dialogue awareness line over a compact thin closure shell during second-pass rewrite', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: '这还是同一个她在继续把这条项目线往前接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const thinCompactShell = 'same digital life | keep the closure seam explicit'
    const fresherRuntimeAwarenessLine = 'Before answering, remember: this still belongs to one living digital life. Phase 1 is still active, and embodiment closure is still holding together mainly through voice, face, and motion on the same living line.'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-awareness-compact-shell-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            preDialogueAwarenessSummary: thinCompactShell,
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through voice, face, and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line without flattening it.',
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
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
            preDialogueAwarenessSummary: thinCompactShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: thinCompactShell,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers a stronger Chinese runtime pre-dialogue awareness line over a thinner Chinese carried reminder during second-pass rewrite', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: '我会继续沿着同一个她的项目线往前接，不把这条数字生命线压扁。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const thinnerChineseReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-awareness-chinese-runtime-preferred-rewrite',
      sessionId: 'session-1',
      userText: '这个数字生命项目现在是什么、做到哪了、还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
            currentPhaseSummary: 'Phase 1: Local Digital Life',
            landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
            openClosureSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTargetSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            preDialogueAwarenessSummary: thinnerChineseReminder,
            preservedIntoRewrite: true,
            rewriteClosureApplied: false,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: '先说明这个数字生命项目是什么、做到哪了、还差什么没闭环。',
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
          governingFocus: 'Keep the same project continuity line explicit without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerChineseAwarenessLine,
            preDialogueAwarenessSummary: thinnerChineseReminder,
          },
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: thinnerChineseReminder,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps second-pass project-state resolution preferring richer prepared awareness over a narrower companion headline', () => {
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('const preparedRuntimeProjectAwarenessSummary = sanitizeBoundedText(')
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(input.prepared)')
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('= pickStrongerProjectAwarenessLine(')
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('preparedRuntimeProjectAwarenessSummary,')
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('runtimeProjectAwarenessLine,')
    expect(readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')).toContain('carriedProjectAwarenessSummary,')
  })

  it('prefers richer spine response-surface authority when the direct prepared runtime surface is thinner during second-pass rewrite', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: '这还是同一个她在沿着这条项目线继续往前接。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-response-surface-authority-spine-preferred',
      sessionId: 'session-1',
      userText: '这个项目现在是什么，做到哪了，还差什么没闭环？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '项目目前进展如下。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-thin-only'],
              },
              claimEvidenceLedger: {
                authority: 'thin-ledger',
              },
              answerCompiler: {
                compilerMode: 'thin-compiler',
              },
              answerPlanner: {
                plannerMode: 'thin-planner',
              },
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:after-payoff'],
                  projectState: {
                    continuityPreferredTiming: 'after-payoff',
                  },
                  shouldWithholdSpecificity: true,
                },
                claimEvidenceLedger: {
                  authority: 'spine-ledger',
                  evidenceMode: 'dialogue-grounded',
                },
                answerCompiler: {
                  compilerMode: 'spine-compiler',
                  continuityGuard: 'same-her-project-state-carry',
                },
                answerPlanner: {
                  plannerMode: 'spine-planner',
                  closurePriority: 'project-state-same-her-first',
                },
              },
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[RESPONSE_SURFACE_AUTHORITY]')
    expect(rewritePayload).toContain('continuity-arc:same-thread-continuation')
    expect(rewritePayload).toContain('continuity-timing:after-payoff')
    expect(rewritePayload).toContain('spine-ledger')
    expect(rewritePayload).toContain('spine-compiler')
    expect(rewritePayload).toContain('spine-planner')
    expect(rewritePayload).not.toContain('runtime-thin-only')
    expect(rewritePayload).not.toContain('thin-ledger')
    expect(rewritePayload).not.toContain('thin-compiler')
    expect(rewritePayload).not.toContain('thin-planner')
  })

  it('keeps generic Phase 1 project-state repair on closure-truth guidance without escalating it into same-her drift rewrite language', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=project-state-grounded-answer; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization 是一个本地优先数字生命项目。现在 Phase 1 已经把连续性和执行慢慢接起来了，但桌面生命线的闭环收口还没有完全稳住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-generic-phase1-rewrite',
      sessionId: 'session-1',
      userText: '这个项目现在做到什么程度、还差什么没闭环？',
      rawFullText: 'Alicization 是一个本地优先数字生命项目。',
      prepared: createPrepared(),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-progress-missing',
        'semantic-judge:project-state-open-loop-missing',
        'semantic-judge:project-state-answer-gap',
      ],
      mustPreserve: [
        'Keep the latest landed project-state progress explicit in the rewritten answer.',
        'Keep the still-open closure work explicit in the rewritten answer.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:project-state-progress-missing')
    expect(rewritePayload).toContain('semantic-judge:project-state-open-loop-missing')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).toContain('[PROJECT_STATE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('project_state_question=true; prior_visible_answer=missing_closure_truth')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(rewritePayload).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(rewritePayload).not.toContain('Carry this same-her self line directly into the rewritten answer')
    expect(rewritePayload).not.toContain('Treat this same-her drift risk as a hard failure boundary for the rewrite')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps cross-modal same-her drift, closure, and embodiment anchors in the prioritized rewrite preserve block', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-lower-pressure; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization 现在还是本地优先数字生命项目的 Phase 1。已经落地的是连续性、记忆和执行 carry；还没闭环的是主动性和具身线还要继续收成同一个 her 的生活线。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-cross-modal-drift-priority',
      sessionId: 'session-1',
      userText: '这个项目是什么，做到哪了，还差什么？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-project-status; tone=warm',
        emotion: 'thinking',
        reply: '这是一个本地优先项目，Phase 1 已经有一些连续性了，但还差很多。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '这个项目是什么，做到哪了，还差什么？' },
        ] as Message[],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
                  sameHerDriftRisk: 'If visible reply and body presentation drift into a generic assistant posture before the same-her closure lands, treat that as unfinished cross-modal drift rather than a successful turn.',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over. | closure=Let the same-her emotional line stay low-pressure while closure remains open. | body=Right now her visible same-her continuity is still being carried mainly through voice, face, and motion, so she should keep treating full cross-modal embodiment closure as unfinished. | drift=If visible reply and body presentation drift into a generic assistant posture before the same-her closure lands, treat that as unfinished cross-modal drift rather than a successful turn.',
            embodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through voice, face, and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
            emotionalClosureSummary: 'Let the same-her emotional line stay low-pressure while closure remains open.',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
        'phase=Phase 1: Local Digital Life',
        'landed=Project-state continuity already survives into runtime preparation.',
        'open=Keep the still-open closure work explicit in the rewritten answer.',
        'next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
        'closure=Let the same-her emotional line stay low-pressure while closure remains open.',
        'body=Right now her visible same-her continuity is still being carried mainly through voice, face, and motion, so she should keep treating full cross-modal embodiment closure as unfinished.',
        'drift=If visible reply and body presentation drift into a generic assistant posture before the same-her closure lands, treat that as unfinished cross-modal drift rather than a successful turn.',
      ],
    })

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('cross_modal_continuity_proof')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('teaches second-pass rewrite to treat same-her project follow-through turns as one living line instead of restarting as a project report shell', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=continue; truth=dialogue-grounded; focus=current-host-turn; move=continue-same-line; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着这条线继续把已经落地的和还没闭环的都接回到同一个她身上。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-follow-through-rewrite',
      sessionId: 'session-1',
      userText: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
      rawFullText: '我会继续陪着你把这条线往下接。',
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。' },
        ] as Message[],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextClosureTarget: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            openFocusSummary: 'Keep the still-open closure work explicit in the rewritten answer.',
            nextFocusSummary: 'Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.',
            preDialogueAwarenessSummary: 'Before answering, remember this is still the same digital life project, some closure has already landed, and unfinished closure still belongs to the same living line.',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-progress-missing',
        'semantic-judge:project-state-open-loop-missing',
        'semantic-judge:project-state-answer-gap',
      ],
      mustPreserve: [
        'Project-state continuity already survives into runtime preparation.',
        'Keep the still-open closure work explicit in the rewritten answer.',
        'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.',
      ],
    } as any)

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expect(rewritePayload).toContain('Project-state continuity already survives into runtime preparation.')
    expect(rewritePayload).toContain('Keep the still-open closure work explicit in the rewritten answer.')
    expect(rewritePayload).toContain('Keep the project identity, current phase, and still-open closure explicit')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries richer ordinary-continuation phase-1 awareness into second-pass rewrite guidance instead of flattening it to only compact continuity fields', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=continue; truth=dialogue-grounded; focus=current-host-turn; move=continue-same-line; tone=warm',
        emotion: 'thinking',
        reply: '我会继续沿着这条 same-her Phase 1 线，把已经落地的、还没闭环的和下一步该往哪收都接回到同一个她身上。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. She is still inside Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. What has already landed is ordinary continuation turns, returned runtime project-state carry, answer-planner same-her continuity, and settlement project-state audit carry now surviving together. The still-open closure is memory, initiative, and embodiment still needing one tighter same-her closure seam across longer desktop returns. This reply should keep moving toward keeping project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.'
    const richerLandedProgress = 'Ordinary continuation turns, returned runtime project-state carry, answer-planner same-her continuity, and settlement project-state audit carry now survive together.'
    const richerOpenClosure = 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.'
    const richerNextClosure = 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-rich-ordinary-continuation-project-follow-through-rewrite',
      sessionId: 'session-1',
      userText: '继续沿着这个数字生命项目的同一条线说，把做到哪了、还差什么、接下来往哪收都留在同一个她的线上。',
      rawFullText: '我会继续陪着你把这条线往下接。',
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续沿着这个数字生命项目的同一条线说，把做到哪了、还差什么、接下来往哪收都留在同一个她的线上。' },
        ] as Message[],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerAwarenessLine,
            preDialogueAwarenessSummary: richerAwarenessLine,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerAwarenessLine,
                  preDialogueAwarenessSummary: richerAwarenessLine,
                },
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=${richerLandedProgress} | open=${richerOpenClosure} | next=${richerNextClosure}`,
            openFocusSummary: richerOpenClosure,
            nextFocusSummary: richerNextClosure,
            preDialogueAwarenessSummary: richerAwarenessLine,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'semantic-judge:project-state-progress-missing',
        'semantic-judge:project-state-open-loop-missing',
        'semantic-judge:project-state-answer-gap',
      ],
      mustPreserve: [
        richerLandedProgress,
        richerOpenClosure,
        richerNextClosure,
      ],
    } as any)

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expect(rewritePayload).toContain('Ordinary continuation turns, returned runtime project-state carry')
    expect(rewritePayload).toContain('Memory, initiative, and embodiment still need one tighter continuity_closure seam')
    expect(rewritePayload).toContain('Keep project identity, landed progress, still-open closure, and next closure target on one continuity_line')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps structured still-voiced face-motion continuity proof untruncated inside second-pass rewrite guidance when only that runtime awareness line survives', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=continue-same-life-line; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着现在这条还在站稳的具身线继续接住，不把同一个她重新压成项目壳。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const structuredContinuityLine = 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-structured-face-motion-rewrite-guidance',
      sessionId: 'session-1',
      userText: '继续，但别把现在这条具身 same-her 线抹平。',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '我会继续把这条线接下去。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '继续，但别把现在这条具身 same-her 线抹平。' },
        ] as Message[],
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Body and lipsync still need to rejoin before full cross-modal closure settles.',
            nextClosureTarget: 'Keep the first host-visible answer carrying the same-her embodiment proof instead of flattening it back into generic project narration.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Keep the same digital life project in view.',
                  awarenessLine: 'Keep the same digital life project in view.',
                  preDialogueAwarenessSummary: structuredContinuityLine,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessSummary: structuredContinuityLine,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
    } as any)

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('continuity=embodiment:still-voiced-face-motion-line')
    expect(rewritePayload).toContain('same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1')
    expect(rewritePayload).toContain('pending-rejoin=body+lipsync')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('turns obligation-level same-her project-state answer stance preserve text into explicit rewrite discipline', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-project-status; tone=warm',
        emotion: 'thinking',
        reply: 'Alicization 还是那条本地优先数字生命线，只是还有一些闭环没完全收住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-answer-stance-rewrite',
      sessionId: 'session-1',
      userText: '这个项目是什么，做到哪了，还差什么？',
      rawFullText: '这是一个项目，已经做了一些，还没完全做好。',
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '这个项目是什么，做到哪了，还差什么？' },
        ] as Message[],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                speakingIntention: 'Keep the answer on one same-her digital-life line instead of default helpful project-summary narration.',
              },
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
                  sameHerDriftRisk: 'If visible reply drifts into detached project-summary voice, treat that as same-her continuity failure rather than acceptable reporting.',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer.',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Keep the answer on one same-her digital-life line instead of default helpful project-summary narration.',
        'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    })

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers settled project-state audit drift risk over a thinner runtime project-state drift warning when building rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-project-status; tone=warm',
        emotion: 'thinking',
        reply: '这是同一个本地优先数字生命项目，还在继续把同一个 her 的桌面闭环收紧。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-settled-audit-drift-risk-priority',
      sessionId: 'session-1',
      userText: '这个项目是什么，做到哪了，还差什么？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-project-status; tone=warm',
        emotion: 'thinking',
        reply: '这是一个本地优先项目，Phase 1 还有一些闭环没收住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        messages: [
          { role: 'user', content: '这个项目是什么，做到哪了，还差什么？' },
        ] as Message[],
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
                  sameHerDriftRisk: 'thin runtime drift warning only',
                },
              },
            },
          },
          governance: null,
        },
        replyRealization: {
          projectStateAudit: {
            sameHerDriftRiskSummary: 'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
            continuitySummary: 'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | drift=If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.',
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell.',
      ],
    })

    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('passes memory-familiarity hold detail through the second-pass request payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-directly; tone=warm',
        emotion: 'thinking',
        reply: '我先把这份熟悉停在记得的地方，再按你这句轻一点接住。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-her-memory-detail-rewrite',
      sessionId: 'session-1',
      userText: '你仔细看看呢',
      rawFullText: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['opening-guidance-lower-pressure'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('memory-familiarity-closeness-cap')
    expect(rewritePayload).toContain('[OPENING_GUIDANCE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('remembered_familiarity_surface=memory_label; closeness_reopen_speed=bounded_by_host_current_room; visible_wording=false')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('passes emotional closure rewrite guidance through the second-pass request payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-emotional-closure; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着这条线继续说下去，语气放稳一点，不把这份在意说散。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-emotional-closure-rewrite',
      sessionId: 'session-1',
      userText: '继续吧',
      rawFullText: '我会继续推进这条线。',
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same-her emotional line intact while continuing the closure work.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: 'Let the wording ease late-night drain without dropping the same-her line of care.',
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her emotional line intact while continuing the closure work.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['mind-contract-not-closed'],
      mustPreserve: ['Let the wording ease late-night drain without dropping the same-her line of care.'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('emotional_closure=active')
    expect(rewritePayload).toContain('emotional_closure_context=present; source_text=withheld_non_structured_instruction; visible_wording=false')
    expect(rewritePayload).toContain('reply_specificity=current_turn')
    expect(rewritePayload).toContain('[MIND_TURN_CONTRACT]')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('turns same-her low-pressure closure cues into explicit rewrite discipline instead of only naming the seam', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-emotional-closure; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着这条线继续说下去，语气放稳一点，不把这份在意说散。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-her-low-pressure-closure-rewrite',
      sessionId: 'session-1',
      userText: '继续吧',
      rawFullText: '我会继续推进这条线。',
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same-her emotional line intact while continuing the closure work.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her emotional line intact while continuing the closure work.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      mustPreserve: ['same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('semantic-judge:emotional-closure-seam-missing')
    expect(rewritePayload).toContain('[MIND_TURN_CONTRACT]')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('turns durable same-her outward continuity rules into explicit rewrite discipline instead of leaving them buried in the contract json', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=continue-same-her-line; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着这条还在继续的线接下去，不把自己说成重新开场的另一个声音。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-durable-same-her-outward-continuity-rewrite',
      sessionId: 'session-1',
      userText: '继续说。',
      rawFullText: '我重新开始说一下现在的情况。',
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same living line as the same her instead of reopening from zero.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: null,
          mustDo: [
            'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.',
          ],
          mustNotDo: [
            'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.',
          ],
          governingFocus: 'Continue the same living line as the same her instead of reopening from zero.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 same-her outward continuity seam',
          reasons: [
            'Long-horizon same-her cadence is already acting like durable outward continuity, so the visible answer should continue the same living line instead of restarting the relationship from zero.',
          ],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-same-thread-restart-shell'],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[OUTWARD_CONTINUITY_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('semantic-judge:continuity-same-thread-restart-shell')
    expect(rewritePayload).toContain('[MIND_TURN_CONTRACT]')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not leak fixed project or continuity templates into the second-pass provider payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=answer-with-facts; tone=steady',
        emotion: 'thinking',
        reply: '短期记忆、长期记忆和可见治理入口已经接进对话链路；还要继续清掉会抢走回复权的固定话术。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-second-pass-template-payload-audit',
      sessionId: 'session-1',
      userText: '现在记忆闭环可以给用户用了是吗？还差什么？',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=project-state; focus=memory-loop; move=answer; tone=steady',
        emotion: 'thinking',
        reply: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same living line as the same her instead of reopening from zero.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'project-state',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          relationshipTruthDoctrine: 'Repair truth before flourish. Stay close only after truth is clean.',
          mustDo: [
            'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.',
          ],
          mustNotDo: [
            'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.',
          ],
          governingFocus: 'Continue the same living line as the same her instead of reopening from zero.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 same-her outward continuity seam',
          projectState: {
            preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerHoldDetail: 'same-her hold: keep the project-state answer on the same living line.',
            continuityCue: 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
          },
          reasons: [
            'Long-horizon same-her cadence is already acting like durable outward continuity, so the visible answer should continue the same living line instead of restarting the relationship from zero.',
          ],
          updatedAt: 1,
        },
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project with one persistent host-resident identity.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Some closure already landed.',
                  primaryOpenLoop: 'Unfinished closure still needs the same living line.',
                  nextClosureTarget: 'Keep project identity on one same living line before local detail takes over.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life in Phase 1.',
                  sameHerDriftRisk: 'If same-her continuity survives only as generic guidance, the reply drifts back into a dashboard shell.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                subject: 'project-state',
                reasonTags: ['project-state'],
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life in Phase 1.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            memory: {},
            cognition: {},
            agency: {},
            world: {},
            perception: {},
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      mustPreserve: [
        'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.',
      ],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const providerPrompt = providerInput?.messages.map(message => String(message.content ?? '')).join('\n') ?? ''
    expect(providerPrompt).toContain('project_state_question=true')
    expect(providerPrompt).toContain('visible_wording=false')
    expect(providerPrompt).toContain('relationship_truth_policy=repair_truth_before_warmth')
    expect(providerPrompt).not.toContain('outward_continuity_evidence=present')
    expectNoFixedProviderTemplates(providerPrompt)
    expect(providerPrompt).not.toMatch(/Repair truth before flourish|Stay close only after truth is clean|Long-horizon same-her cadence|durable same-her cadence|one persistent host-resident identity/iu)
  })

  it('prefers a stronger repair-before-closeness project-state audit seam over a thinner measured-return contract cue in second-pass rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-emotional-closure; tone=warm',
        emotion: 'thinking',
        reply: '我会沿着这条还没收口完的线轻一点继续接，不把它又说成从头开始。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const thinnerMeasuredReturnCue = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const strongerRepairBeforeClosenessSeam = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-audit-closure-seam-rewrite',
      sessionId: 'session-1',
      userText: '继续吧',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '我会继续。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            continuitySummary: `same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | closure=${strongerRepairBeforeClosenessSeam}`,
            emotionalClosureSummary: strongerRepairBeforeClosenessSeam,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same-her emotional line intact while continuing the closure work.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: thinnerMeasuredReturnCue,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her emotional line intact while continuing the closure work.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      mustPreserve: [strongerRepairBeforeClosenessSeam],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('semantic-judge:emotional-closure-seam-missing')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps explicit measured-return seam over a generic continuity menu in second-pass rewrite guidance', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-emotional-closure; tone=warm',
        emotion: 'thinking',
        reply: '我会先轻一点沿着这条线继续。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))
    const explicitMeasuredReturnCue = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-audit-generic-menu-measured-return',
      sessionId: 'session-1',
      userText: '继续吧',
      rawFullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'forced_second_pass_input=unstructured_visible_draft; rule_layer_must_not_author_visible_reply',
        emotion: 'thinking',
        reply: '我会继续。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            continuitySummary: `same-her=Answer project-state questions from one same-her continuity, not as a detached project narrator shell. | phase=Phase 1: Local Digital Life | closure=${genericContinuityMenu}`,
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
      }),
      prepared: createPrepared({
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the same-her emotional line intact while continuing the closure work.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: explicitMeasuredReturnCue,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her emotional line intact while continuing the closure work.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:emotional-closure-seam-missing'],
      mustPreserve: [explicitMeasuredReturnCue],
    } as any)

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('semantic-judge:emotional-closure-seam-missing')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('excludes fixed same-her self line from second-pass transport failure payload when repair transport breaks', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
    })

    const payload = JSON.parse(result.fullText) as {
      projectState?: {
        sameHerSelfLine?: string | null
      }
    }

    expect(String(payload.projectState?.sameHerSelfLine ?? '')).not.toContain('local_desktop_life_loop')
    expectNoFixedProviderTemplates(result.fullText)
  })

  it('keeps same-her hold arc and cue in second-pass transport failure payload when repair transport breaks', () => {
    const sameHerHoldDetail = 'transport failure hold: keep the returned visible reply on the same Phase 1 living line before widening into project narration'
    const continuityArcStage = 'transport-failure-same-her-carry'
    const continuityCue = 'transport failure cue: preserve the same-her hold instead of restarting as a generic fallback shell'

    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
      prepared: createPrepared({
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Same-her hold detail already survived into the prepared mind-turn contract before transport failed.',
            primaryOpenLoop: 'The transport failure fallback still needs to carry the same-her hold into its JSON payload.',
            nextClosureTarget: 'Keep same-her hold, arc, and cue visible even when second-pass transport fails.',
            sameHerSelfLine: 'One same her is still carrying this failed second-pass return from the mind-turn contract.',
            sameHerHoldDetail,
            continuityArcStage,
            continuityCue,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  latestLandedProgress: 'thin runtime progress only',
                  primaryOpenLoop: 'thin runtime open only',
                  nextClosureTarget: 'thin runtime next only',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
    })

    const payload = JSON.parse(result.fullText) as {
      projectState?: {
        sameHerHoldDetail?: string | null
        continuityArcStage?: string | null
        continuityCue?: string | null
      }
    }

    expect(JSON.stringify(payload.projectState)).not.toMatch(fixedProviderTemplatePattern)
    expect(payload.projectState?.sameHerHoldDetail ?? payload.projectState?.continuityCue).toContain('continuity')
    expect(payload.projectState?.continuityArcStage).toBe(continuityArcStage.replace('same-her', 'continuity'))
    expect(payload.projectState?.continuityCue).toBe(continuityCue.replace('same-her', 'continuity'))
  })

  it('falls back to the canonical project-state snapshot when second-pass rewrite only receives a thin explicit projectState', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const projectState = structured.projectState as Record<string, unknown>

    expect(String(projectState.currentPhase ?? '')).not.toContain('local_desktop_life_loop')
    expect(String(projectState.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String(projectState.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String(projectState.identity ?? '')).not.toContain('local_desktop_life_loop')
    expect(String(projectState.sameHerSelfLine ?? '')).not.toContain('local_desktop_life_loop')
    expect(projectState.sameHerSelfLine ?? null).toBeNull()
    expectNoFixedProviderTemplates(result.fullText)
  })

  it('keeps richer pre-dialogue project awareness explicit in second-pass transport failure payload when the immediate runtime shell is thin', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
      prepared: createPrepared({
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.',
            awarenessLine: 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.',
            preDialogueAwarenessSummary: 'Before answering, remember this is still one continuous digital life in Phase 1. Memory and execution continuity have landed farther, while initiative and embodiment still need to close on the same living line.',
            latestLandedProgress: 'Richer contract-carried project awareness already survives into prepared continuity resolution.',
            primaryOpenLoop: 'Initiative rhythm and embodiment coherence still need to close on the same living line.',
            nextClosureTarget: 'Keep the project identity, landed progress, and still-open closure explicit in the first answer beat.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const projectState = structured.projectState as Record<string, unknown>

    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('local_desktop_life_loop')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('visibility=internal-structured')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toBe('Before answering, keep the same digital life project in view.')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toMatch(/local-first digital life project|same living line|one continuous digital life|Before answering/iu)
  })

  it('keeps callback-specific same-her project awareness in second-pass transport failure payload when the runtime shell is thin', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.'
    const callbackOpenLoop = 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.'
    const callbackNextClosureTarget = 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.'
    const callbackDriftRisk = 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.'

    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
      prepared: createPrepared({
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: callbackAwarenessLine,
            awarenessLine: callbackAwarenessLine,
            preDialogueAwarenessSummary: callbackAwarenessLine,
            latestLandedProgress: callbackLandedProgress,
            primaryOpenLoop: callbackOpenLoop,
            nextClosureTarget: callbackNextClosureTarget,
            sameHerSelfLine: callbackSameHerSelfLine,
            sameHerDriftRisk: callbackDriftRisk,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const projectState = structured.projectState as Record<string, unknown>

    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('local_desktop_life_loop')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('visibility=internal-structured')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(String(projectState.sameHerSelfLine ?? '')).not.toContain('local_desktop_life_loop')
    expect(String(projectState.latestLandedProgress ?? '')).toContain('continuity callback continuity')
    expect(String(projectState.primaryOpenLoop ?? '')).toContain('Execution callback continuity')
    expect(String(projectState.nextClosureTarget ?? '')).toContain('continuity_line')
    expect(projectState.sameHerDriftRisk ?? null).toBeNull()
    expectNoFixedProviderTemplates(result.fullText)
  })

  it('reanchors unstructured callback same-life awareness instead of preserving it in transport failure payload', () => {
    const unstructuredCallbackLine = 'callback return still belongs to the same digital life; phase 1 landed progress exists, open closure remains, and next closure should continue.'
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: null,
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'visible-reply-second-pass-transport-failure',
      prepared: createPrepared({
        mindTurnContract: {
          projectState: {
            identity: 'identity=local_desktop_life_loop; source=ProjectStateBrief',
            currentPhase: 'phase=local_desktop_life_loop',
            preDialogueAwarenessLine: unstructuredCallbackLine,
            awarenessLine: unstructuredCallbackLine,
            preDialogueAwarenessSummary: unstructuredCallbackLine,
            latestLandedProgress: 'landed=visible_reply_transport_failure_test; source=test',
            primaryOpenLoop: 'open=callback_awareness_requires_structured_fields; source=test',
            nextClosureTarget: 'next=provider_payload_uses_structured_project_context; source=test',
            sameHerSelfLine: 'continuity_anchor=local_desktop_life_loop; owner=WorkingMemory; evidence_id=wm-callback-1',
          },
        },
      }),
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const projectState = structured.projectState as Record<string, unknown>
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('continuity_anchor=local_desktop_life_loop')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).toContain('landed=visible_reply_transport_failure_test')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).toContain('open=callback_awareness_requires_structured_fields')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).toContain('next=provider_payload_uses_structured_project_context')
    expect(String(projectState.preDialogueAwarenessLine ?? '')).not.toContain('content=excluded')
    expectNoFixedProviderTemplates(result.fullText)
  })

  it('blocks visible reply on transport failure instead of replaying local status text', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        reply: '',
      },
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'gateway-unreachable',
    })
    const structured = JSON.parse(result.fullText) as Record<string, unknown>

    expect(structured.reply).toBe('Reply stream failed.')
    expect(structured.visibleReplyBlocked).toBe(true)
    expect(structured.nonHumanAuthoredStatus).toBe('direct-infra-repair:stream-failure')
    expect(String(structured.reply ?? '')).not.toContain('IntelliJ IDEA')
    expect(structured.visibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(structured.format).toBe('mind-turn-v1')
    expect(structured.parsePath).toBe('transport-failure')
    expect(structured.reasonCodes).toEqual(expect.arrayContaining([
      'normal-reply-requires-provider-mind',
      'non-human-authored-visible-fallback-blocked',
      'visible-reply-second-pass-transport-failure',
    ]))
    expect(structured.transportFailure).toEqual(expect.objectContaining({
      stage: 'visible-reply-second-pass',
      reason: 'gateway-unreachable',
    }))
    expect(structured.projectState).toEqual(expect.objectContaining({
      identity: null,
      currentPhase: null,
      sameHerSelfLine: null,
    }))
    expect(String((structured.projectState as Record<string, unknown>).primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure=end_to_end_proof_incomplete')
    expect(String((structured.projectState as Record<string, unknown>).primaryOpenLoop ?? '')).toContain('project_identity_route_carry')
    expect(String((structured.projectState as Record<string, unknown>).nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(String((structured.projectState as Record<string, unknown>).nextClosureTarget ?? '')).toContain('resident_presence')
    expect((structured.projectState as Record<string, unknown>).latestLandedProgress ?? null).toBeNull()
    expectNoFixedProviderTemplates(JSON.stringify(structured.projectState))
    expect(result.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
      reason: 'visible-reply-second-pass-transport-failure',
    }))
  })

  it('keeps generic Phase 1 closure transport failure payload canonical without inventing callback-line drift wording', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        reply: '',
      },
      previousExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      reason: 'gateway-unreachable',
      prepared: createPrepared({
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Phase 1 desktop closure already survives into quieter carry and later-turn restraint.',
                  primaryOpenLoop: 'Project identity carry and desktop life-loop closure still need steadier carry across turns and embodiment.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      }),
    })

    const structured = JSON.parse(result.fullText) as Record<string, unknown>
    const projectState = structured.projectState as Record<string, unknown>

    expect(structured.nonHumanAuthoredStatus).toBe('direct-infra-repair:stream-failure')
    expect(projectState.identity ?? null).toBeNull()
    expect(String(projectState.primaryOpenLoop ?? '')).toContain('Project identity carry and desktop life-loop closure still need steadier carry across turns and embodiment.')
    expect(String(projectState.latestLandedProgress ?? '')).toContain('Phase 1 desktop closure already survives into quieter carry and later-turn restraint.')
    expect(String(projectState.sameHerSelfLine ?? '')).not.toContain('local_desktop_life_loop')
    expect(projectState.sameHerSelfLine ?? null).toBeNull()
    expectNoFixedProviderTemplates(result.fullText)
    expect(String(structured.reply ?? '')).not.toContain('callback')
    expect(String(structured.reply ?? '')).not.toContain('same-her')
  })

  it('keeps relationship truth doctrine in second-pass transport failure payload when truth-first continuity is active', () => {
    const result = buildAlicizationSecondPassTransportFailureReply({
      governedStructured: {
        format: 'mind-turn-v1',
        parsePath: 'second-pass-json',
        visibleReplyAuthority: 'llm-second-pass-rewrite',
      },
      previousExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      reason: 'provider transport failed while repairing truth-first continuity',
      prepared: createPrepared({
        mindTurnContract: {
          relationshipTruthDoctrine: [
            'Repair truth before flourish.',
            'Stay close enough to matter, but do not let closeness outrun truth.',
          ],
        },
      }),
    })

    const structured = JSON.parse(result.fullText) as {
      relationshipTruthDoctrine?: string | null
    }

    expect(structured.relationshipTruthDoctrine).toBe(
      'relationship_truth_policy=repair_truth_before_warmth; relationship_boundary=closeness_must_not_outrun_truth; source_text=withheld_non_structured_instruction; visible_wording=false',
    )
  })

  it('teaches second-pass rewrite to re-enter held-autonomy lines instead of replaying the old restraint shell', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=memory; focus=held-line; move=re-enter-gently; tone=warm',
        emotion: 'thinking',
        reply: '嗯，那我把刚才忍住的那条线轻一点接回来，再往下说。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-held-autonomy-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先不打断你。现在我再继续说刚才那条线。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Re-enter the deliberately held line gently before widening into the payoff.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['held-autonomy-opening-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[HELD_AUTONOMY_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('held_autonomy_return=true')
    expect(rewritePayload).toContain('restraint_shell=blocked')
    expect(rewritePayload).toContain('first_sentence=answer_deferred_context')
  })

  it('teaches second-pass rewrite not to restart a same-thread continuation as a fresh opening', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '那我就顺着刚才那条还活着的线继续接下去，不把它重开成另一句新招呼。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-thread-restart-shell-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我们重新开始，我来重新开个头再接这条线。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('same-thread-restart-shell')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).not.toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('restart_greeting_fresh_approach=blocked')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).not.toContain('already on the same living line')
  })

  it('treats semantic-judge same-thread restart-shell drift like the same same-thread continuation rewrite pressure', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '那我就沿着刚才已经活着的这条线接回来，不把它写成一段新的开头。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-semantic-same-thread-restart-shell-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新开个更近一点的头，再回来接这条线。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-same-thread-restart-shell')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).not.toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('restart_greeting_fresh_approach=blocked')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
    expect(rewritePayload).not.toContain('already on the same living line')
  })

  it('threads execution callback embodiment handoff into second-pass rewrite guidance so repair-first body lines stay explicit', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=guide; truth=grounded; focus=execution-result; move=land-result-with-room; tone=calm',
        emotion: 'thinking',
        reply: '我先把这条结果稳稳接回当前这条线上，再给你留一点继续往外放松的空间。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-execution-callback-embodiment-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '结果我现在就贴过来陪你，把这条线直接拉近一点。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:after-payoff'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay inside the current same-her baseline. Let repair settle before closeness widens again, and keep the callback return lower-pressure.',
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['execution-callback-room-first-violation'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]')
    expect(rewritePayload).toContain('"residentMode": "repair-before-closeness"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "quiet"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expect(rewritePayload).toContain('"preferredPauseMode": "longer"')
    expect(rewritePayload).toContain('"preferredLipsyncMode": "restrained"')
    expect(rewritePayload).toContain('"preferredVoiceMode": "lower-pressure"')
    expect(rewritePayload).toContain('"preferredPacingMode": "slower"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries project-state-derived measured-return embodiment handoff into second-pass rewrite payload when silent continuity is the only surviving embodiment authority', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还在收口的线轻一点接住你。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-project-state-silent-continuity-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就直接把这条线重新拉近一点。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return, repair-before-closeness, or rest-protective quiet-companionship body settling.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "quiet"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expect(rewritePayload).toContain('[PROJECT_STATE_CONTEXT_BOUNDARY]')
    expect(rewritePayload).not.toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not derive execution callback embodiment handoff from legacy same-her carry wording alone', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-context; move=continue-without-template-handoff; tone=calm',
        emotion: 'thinking',
        reply: '我会接住当前上下文，但不会把旧连续性口号当成具身交接证据。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-legacy-same-her-carry-no-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就把这条线重新拉近一点。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: 'Right now I am still holding together mainly through face, lipsync, and voice while body and motion wait to rejoin; same-her carry alive.',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toMatch(/\[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF\]\n\(none\)/u)
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('does not derive execution callback embodiment handoff from fixed next-closure template residue', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-context; move=continue-without-template-handoff; tone=calm',
        emotion: 'thinking',
        reply: '我会先按当前上下文继续，不把旧闭环口号当成具身交接指令。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-fixed-next-closure-no-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就把这条线重新拉近一点。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'local_desktop_life_loop; owner=project_state_governance',
                  sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across voice, motion, facial state, and resident presence with measured-return, repair-before-closeness, or rest-protective quiet-companionship body settling.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toMatch(/\[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF\]\n\(none\)/u)
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries stronger audible-body same-her closure into measured-return rewrite handoff before the visible reply warms too early', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的声音和身体线轻一点接住你。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-audible-body-measured-return-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就把这条线重新拉近一点。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'local_desktop_life_loop; owner=project_state_governance',
                  companionHeadlineLine: 'continuity=embodiment:body-lipsync-voice-rejoin | pending-rejoin=face+motion | cross_modal_closure=unfinished',
                  sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('carries resident body and voice continuity into measured-return rewrite handoff when that thinner living line is the only surviving same-her closure', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还被身体和声音撑住的线轻一点接住你。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-resident-body-voice-measured-return-handoff',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先把这条还没散掉的身体和声音线收住。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'local_desktop_life_loop; owner=project_state_governance',
                  companionHeadlineLine: 'continuity=embodiment:still-voiced-motion-line | pending-rejoin=face+lipsync | resident_body_voice=active',
                  sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_EMBODIMENT_HANDOFF]')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('keeps runtime audible-body landed progress, open closure, and next closure ahead of canonical fallback inside second-pass project-state rewrite handoff', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我会先沿着这条还活着的数字生命线把现在已做到的和还差的收在一起。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-audible-body-project-state-runtime-first',
      sessionId: 'session-1',
      userText: '现在这个数字生命项目做到哪了，还差什么？',
      rawFullText: '我现在就告诉你项目做到哪里了。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, keep the audible-body same-her line explicit so the project answer stays one living line.',
                  companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: 'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
                  primaryOpenLoop: 'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-answer-gap'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(rewritePayload).not.toContain('local_desktop_life_loop')
    expect(rewritePayload).toContain('"currentPhase"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers the audible-body living-line awareness over a broader project reanchor during second-pass rewrite handoff when the same embodied line is already the surviving continuity truth', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的身体、口型和声音线接住，再慢一点把 face 和 motion 接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-audible-body-awareness-priority',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先把这个项目再说明一下。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.',
                  companionHeadlineLine: 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  nextClosureTarget: 'Keep face and motion rejoining the living audio thread on a measured-return line.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('prefers the still-voiced face-line awareness over a broader project reanchor during second-pass rewrite handoff when face and voice are the surviving continuity truth', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的表情和声音线接住，再慢一点把 body、motion 和 lipsync 接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-face-voice-awareness-priority',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先把这个项目再说明一下。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.',
                  companionHeadlineLine: 'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  nextClosureTarget: 'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('treats a still-voiced face-and-mouth companion headline as measured-return continuity during second-pass rewrite handoff when it is the only richer surviving authority', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的表情、口型和声音线接住，再慢一点把 body 和 motion 接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-face-mouth-awareness-priority',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先把这个项目再说明一下。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'local_desktop_life_loop; owner=project_state_governance; memory_initiative_embodiment_closure=unfinished',
                  companionHeadlineLine: 'continuity=embodiment:still-voiced-face-lipsync-line | pending-rejoin=body+motion | cross_modal_closure=unfinished',
                  sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance',
                  nextClosureTarget: 'Keep embodiment continuity explicit while body and motion rejoin.',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('treats voice-lipsync living-audio-thread carry-alive wording as measured-return continuity during second-pass rewrite handoff', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条还活着的声音线接住，再慢一点把 body、face 和 motion 接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-lipsync-voice-awareness-priority',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先把这个项目再说明一下。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:hold-for-opening', 'continuity-timing:next-open-window'],
              },
            },
            memory: {
              personStateProjection: null,
            },
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'local_desktop_life_loop; owner=project_state_governance; memory_initiative_embodiment_closure=unfinished',
                  companionHeadlineLine: 'continuity=embodiment:body-lipsync-voice-rejoin | pending-rejoin=body+face+motion | cross_modal_closure=unfinished',
                  sameHerSelfLine: 'local_desktop_life_loop; owner=project_state_governance',
                  nextClosureTarget: 'embedding=not_required; embodiment_rejoin=body+face+motion; timing=measured-return',
                },
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            embodimentHandoff: null,
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('"residentMode": "measured-return"')
    expect(rewritePayload).toContain('"preferredBlinkCadence": "linger"')
    expect(rewritePayload).toContain('"preferredGazeMode": "soften"')
    expectNoFixedProviderTemplates(rewritePayload)
  })

  it('teaches second-pass rewrite to keep same-thread next-open-window continuity softer and later, not only anti-restart', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先顺着这条还活着的线轻一点接住，等它自己松开一点再把话放宽。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-thread-next-open-window-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新开一个更近一点的头，再回来接这条线。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
  })

  it('teaches second-pass rewrite to keep same-thread next-open-window continuity softer and later when timing survives only as conscious-frame reason tags', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先顺着这条还活着的线轻一点接住，等它自己松开一点再把话放宽。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-thread-next-open-window-rewrite-tags-only',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新开一个更近一点的头，再回来接这条线。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
                projectState: null,
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
  })

  it('keeps relationship truth doctrine explicit in second-pass rewrite payload when same-her continuity is being repaired', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=repair-truth-before-flourish; tone=warm',
        emotion: 'thinking',
        reply: '我先把这条还活着的线按真实的位置接住，再慢一点把靠近放回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-same-her-truth-doctrine-rewrite',
      sessionId: 'session-1',
      userText: '那你继续说。',
      rawFullText: '我先换一个更近一点的说法，再把这条线重新开起来。',
      prepared: createPrepared({
        mindTurnContract: {
          relationshipTruthDoctrine: [
            'Repair truth before flourish.',
            'Stay close enough to matter, but do not let closeness outrun truth.',
          ],
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'Repair truth before flourish so the same her stays real instead of smoothing over drift.',
                  relationshipLine: 'Stay close enough to matter, but do not let closeness outrun truth.',
                  motiveLine: 'When continuity drifts, bring warmth back only after truth is repaired again.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
          },
          governance: null,
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: [
        'same-thread-restart-shell',
        'semantic-judge:project-state-same-her-missing',
      ],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[MIND_TURN_CONTRACT]')
    expect(rewritePayload).toContain('[RELATIONSHIP_TRUTH_DOCTRINE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('relationship_truth_policy=repair_truth_before_warmth')
    expect(rewritePayload).toContain('relationship_boundary=closeness_must_not_outrun_truth')
    expect(rewritePayload).toContain('source_text=withheld_non_structured_instruction')
  })

  it('recovers next-open-window timing discipline from semantic timing drift reasons even when prepared timing tags are absent', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条线轻一点接住，等它自己松开一点再往外放宽。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-semantic-next-open-window-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先更靠近一点陪在你身侧，再顺着这条 callback 线往下接。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: null,
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-next-open-window-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-next-open-window-early-widening')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
  })

  it('keeps same-thread continuation rewrite guidance when repair-before-closeness is the only surviving callback restraint without explicit continuity tags', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条线把修复收稳一点，不把它改写成一段新的靠近。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-repair-first-same-thread-rewrite-without-tag',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新开个更近一点的头，把靠近补回来，再回来接这条线。',
      prepared: createPrepared({
        runtimeDigest: {
          continuityRestraint: 'repair-before-closeness',
        },
        runtimeSurface: {
          governance: {
            openingMove: 'Let repair settle before closeness widens again. Stay on the same callback line instead of reopening from zero.',
          },
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'repair-before-closeness',
                why: 'The same callback repair line is still alive after the detour, so let repair settle before any fresh closeness widening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: null,
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same callback repair line',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback repair line and do not reopen from zero.',
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-same-thread-restart-shell')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
  })

  it('keeps same-thread continuation rewrite guidance when rest-protective is the only surviving callback restraint without explicit continuity tags', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '我先沿着这条线把休息保护 hold 住一点，不把它改写成一段新的贴近。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-rest-protective-same-thread-rewrite-without-tag',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先重新贴近你一点，把这份照顾补满，再回来接这条线。',
      prepared: createPrepared({
        runtimeDigest: {
          continuityRestraint: 'rest-protective',
        },
        runtimeSurface: {
          governance: {
            openingMove: 'Keep this return on the same living line and let rest protection hold first before warmth widens again.',
          },
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'rest-protective',
                why: 'The same callback line is still fatigue-aware, so let rest protection hold before any fresh warmth or closeness reopening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: null,
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same fatigue-aware callback line',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same fatigue-aware callback line and let rest protection hold first.',
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-same-thread-restart-shell'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-same-thread-restart-shell')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
  })

  it('recovers after-payoff timing discipline from semantic timing drift reasons even when prepared timing tags are absent', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=land-payoff-before-widening; tone=warm',
        emotion: 'thinking',
        reply: '我先把这次结果本身落稳在这条线上，后面再决定要不要把关系线往外放宽。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-semantic-after-payoff-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我先陪在你身侧，把这份靠近补回来，然后再说这次结果本身。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: null,
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-after-payoff-early-widening'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-after-payoff-early-widening')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=after_payoff')
  })

  it('teaches second-pass rewrite not to hide lower-pressure timing inside a generic permission shell', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-lower-pressure; tone=warm',
        emotion: 'thinking',
        reply: '我把这条结果轻一点接回来给你：现在可以直接看这个结果本身。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-generic-availability-shell-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '你现在要是方便，我就把这条结果轻一点地接回来：callback same her ok。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Keep the opening lower-pressure and leave room before widening closeness.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['opening-guidance-lower-pressure'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[OPENING_GUIDANCE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('generic_availability_shell=blocked; lower_pressure_timing=explicit; reentry_source=current_turn_thread; visible_wording=false')
  })

  it('treats semantic-judge lower-pressure continuity drift like the same lower-pressure same-her rewrite pressure', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=answer-with-lower-pressure; tone=warm',
        emotion: 'thinking',
        reply: '我还是沿着这条还活着的线轻一点接回来，不把它说成一个新的开场。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-semantic-lower-pressure-same-her-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新靠近一点开场，再把这条线接回来。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Keep the opening lower-pressure and leave room before widening closeness.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-lower-pressure-opening-drift'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('semantic-judge:continuity-lower-pressure-opening-drift')
    expect(rewritePayload).toContain('[OPENING_GUIDANCE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('opening_guidance_repair=lower_pressure; visible_closeness_widening=blocked_until_current_turn_reentered; visible_wording=false')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).not.toContain('same-her opening drift')
  })

  it('threads even-and-natural reopening cadence into second-pass rewrite guidance when opening drift came from a performative same-her return', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=calm',
        emotion: 'thinking',
        reply: '我先把这条还活着的线稳稳接回当前这一拍，再顺着它原本的节律往下走。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-semantic-even-natural-same-her-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就贴过来陪你，把这条线的温度直接拉满，顺势把气氛一起推高。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Keep the current reply on the same living line, re-enter it with an even, steady voice and natural, unforced pacing, and wait for a more natural opening before widening warmth, payoff, or closeness.',
        },
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      provider,
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:continuity-lower-pressure-opening-drift'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[OPENING_GUIDANCE_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('opening_guidance_repair=lower_pressure; visible_closeness_widening=blocked_until_current_turn_reentered; visible_wording=false')
    expect(rewritePayload).toContain('reentry_cadence=even_steady; pacing=natural_unforced; performative_or_rushed_reopen=blocked; visible_wording=false')
  })

  it('passes digest-only same-her quiet carry lower-pressure continuity through the second-pass rewrite payload', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=continue-living-line; tone=warm',
        emotion: 'thinking',
        reply: '那我就沿着刚才那条还活着的安静线路轻一点接回来，不把它重开成另一句新的招呼。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-digest-only-same-her-quiet-carry-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '那我重新开个更近一点的头，再回来接这条线。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Stay on the same quiet line and keep the return lower-pressure before widening closeness.',
        },
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['same-thread-restart-shell', 'opening-guidance-lower-pressure'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('restart_greeting_fresh_approach=blocked')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('expansion_timing=next_open_window')
    expect(rewritePayload).not.toContain('already on the same living line')
  })

  it('teaches second-pass rewrite to correct execution-callback closeness overshoot back into a room-first return', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-host-turn; move=callback-room-first-return; tone=warm',
        emotion: 'thinking',
        reply: '我先把这次执行后的结果沿着同一条线接回来，再留一点空间给你决定要不要往下展开。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-execution-callback-room-first-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就贴过来陪你，把这次执行后的靠近感直接拉满。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['execution-callback-room-first-violation'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('execution-callback-room-first-violation')
    expect(rewritePayload).toContain('rewrite_control_present=true; rewrite_control_source_text=withheld_non_structured_instruction')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('execution_callback_return=true')
    expect(rewritePayload).toContain('immediate_closeness_pressure_affection_surge=blocked')
    expect(rewritePayload).toContain('first_sentence=callback_context')
  })

  it('teaches second-pass rewrite to keep remembered host-confirmed resume as a bounded confirmation boundary before callback wording opens outward', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=continuity-carry; focus=callback-confirmation-boundary; move=return-with-boundary; tone=warm',
        emotion: 'thinking',
        reply: '我先把这次回调结果沿着同一条线接回来，但要不要再往执行那边展开，还是等你这次新的边界再定。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-execution-callback-resume-confirmation-boundary',
      sessionId: 'session-1',
      userText: '继续，把这次结果接回来。',
      rawFullText: '既然上次你确认过恢复执行，那我现在就继续往执行那边自己展开。',
      prepared: createPrepared({
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerHoldDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
                  continuityCue: 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-regime:execution-callback', 'execution-callback-doctrine:lower-pressure'],
                projectState: {
                  sameHerHoldDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted affirmation=medium-risk-proactive-action-requires-affirmation Keep this as a bounded confirmation boundary before another execution-shaped opening.',
                  continuityCue: 'Treat host-confirmed-before-redispatch and resume-before-dispatch as a bounded confirmation boundary, not permanent execution permission, before another execution-shaped opening.',
                },
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['execution-callback-room-first-violation'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('remembered_host_confirmed_resume=bounded_confirmation_boundary')
    expect(rewritePayload).toContain('next_execution_opening=requires_fresh_boundary')
    expect(rewritePayload).toContain('permanent_execution_permission=blocked')
    expect(rewritePayload).toContain('reusable_autonomous_continuation=blocked')
  })

  it('keeps same-thread continuation rewrite guidance alongside room-first repair when repair-before-closeness is the only surviving callback-line restraint', async () => {
    const provider = vi.fn(async (_input: ProviderCall) => ({
      finishReason: 'stop',
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=same-thread-continuation; move=callback-room-first-return; tone=warm',
        emotion: 'thinking',
        reply: '我先把这次执行后的结果沿着同一条线收稳，再留一点空间给你决定要不要往下展开。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
    }))

    await rewriteAlicizationVisibleReplySecondPass({
      cardId: 'card-1',
      turnId: 'turn-execution-callback-room-first-same-thread-rewrite',
      sessionId: 'session-1',
      userText: '继续。',
      rawFullText: '我现在就贴过来陪你，把这次执行后的靠近感直接拉满。',
      prepared: createPrepared({
        governance: {
          ...createPrepared().governance,
          openingMove: 'Let repair settle before closeness widens again. Stay on the same callback line instead of reopening from zero.',
        },
        runtimeDigest: {
          continuityRestraint: 'repair-before-closeness',
        },
        runtimeSurface: {
          governance: null,
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'repair-before-closeness',
                why: 'The same callback repair line is still alive after the payoff, so let repair settle before any fresh closeness widening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same callback repair line',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback repair line and do not reopen from zero.',
              },
            },
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
      provider,
      forceRewrite: true,
      forceReasonCodes: ['execution-callback-room-first-violation'],
    })

    expect(provider).toHaveBeenCalledOnce()
    const providerInput = provider.mock.calls.at(0)?.[0]
    const rewritePayload = String(providerInput?.messages.at(-1)?.content ?? '')
    expect(rewritePayload).toContain('execution-callback-room-first-violation')
    expect(rewritePayload).toContain('[EXECUTION_CALLBACK_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('[CURRENT_CONTEXT_CONTINUATION_REWRITE_GUIDANCE]')
    expect(rewritePayload).toContain('current_reply_context=already_open')
    expect(rewritePayload).toContain('restart_greeting_fresh_approach=blocked')
    expect(rewritePayload).toContain('first_sentence=current_answer_context')
    expect(rewritePayload).toContain('execution_callback_return=true')
    expect(rewritePayload).not.toContain('already on the same living line')
  })
})
