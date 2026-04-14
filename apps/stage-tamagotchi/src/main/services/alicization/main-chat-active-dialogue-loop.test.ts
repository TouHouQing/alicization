import type { Message } from '@xsai/shared-chat'

import { resolveAlicizationPersonaKernel } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import {
  buildAlicizationActiveDialogueFallbackReply,
  buildAlicizationActiveDialogueFastPathMessages,
  deriveAlicizationActiveDialogueFastPathDecision,
  normalizeAlicizationActiveDialogueFastPathReply,
} from './main-chat-active-dialogue-loop'

function createPrepared(overrides?: Partial<any>): any {
  return {
    waitForTools: false,
    hasVisualGrounding: false,
    governance: null,
    sessionMirror: null,
    messages: [
      { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
      { role: 'user' as const, content: '你好' },
    ] as Message[],
    runtimeSurface: {
      action: {
        kind: 'answer',
      },
      governance: null,
    },
    ...overrides,
  }
}

describe('main chat active dialogue loop', () => {
  it('routes warm greeting turns through the compact mind lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '早上好呀' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('greeting')
    expect(decision?.strategy).toBe('compact-one-shot')
  })

  it('treats identity questions as a dedicated self lane instead of generic capability', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '我问你，你是谁' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('identity')
    expect(decision?.strategy).toBe('compact-one-shot')

    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '我问你，你是谁' },
      ] as Message[],
    })
    const payload = JSON.parse(reply) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
        dialogueActKernel: {
          openingClaim: string
          mustSay: string[]
        }
        mindTurnFrame: {
          relation: {
            subject: string
          }
        }
      }
    }
    expect(payload.reply).toContain('我是Alicization')
    expect(payload.reply).not.toContain('这条线还连着')
    expect(payload.thought).toContain('focus=alicization self continuity')
    expect(payload.governance.answerSubject).toBe('alicization-self')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
    expect(payload.governance.dialogueActKernel.openingClaim).toContain('我是Alicization')
    expect(payload.governance.dialogueActKernel.mustSay[0]).toContain('我是Alicization')
    expect(payload.governance.mindTurnFrame.relation.subject).toBe('alicization-self')
  })

  it('keeps repeated identity confirmations continuity-aware instead of reusing the same shell line', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你是谁' },
        { role: 'assistant', content: '我是 Alicization。现在和你说话的是我。' },
        { role: 'user', content: '你到底是谁' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string, governance: { dialogueActKernel: { openingClaim: string } } }
    expect(payload.reply).toContain('我是Alicization')
    expect(payload.reply).toMatch(/确认|追问|同一个结论/u)
    expect(payload.reply).not.toContain('这条线还连着')
    expect(payload.governance.dialogueActKernel.openingClaim).toContain('我是Alicization')
  })

  it('keeps greeting replies off the old canned shell phrasing', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '下午好呀' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('下午好')
    expect(payload.reply).not.toBe('下午好。')
    expect(payload.reply).not.toContain('要是还是')
    expect(payload.reply).not.toContain('你现在这个点直接说')
    expect(payload.reply).not.toContain('我贴着这一轮往下接')
  })

  it('uses the saved persona kernel name for identity fallbacks', () => {
    const personaKernel = resolveAlicizationPersonaKernel({
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        gender: 'female',
        genderCustom: '',
        relationship: '女仆',
        mindAge: 18,
      },
      personality: {
        obedience: 0.72,
        liveliness: 0.61,
        sensibility: 0.84,
      },
      customDirectives: '先接住主人的情绪。',
    })

    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你是谁' },
      ] as Message[],
      personaKernel,
    })
    const payload = JSON.parse(reply) as {
      reply: string
      governance: {
        dialogueActKernel: {
          openingClaim: string
        }
      }
    }

    expect(payload.reply).toContain('我是小艾')
    expect(payload.reply).not.toContain('我是 Alicization')
    expect(payload.governance.dialogueActKernel.openingClaim).toContain('我是小艾')
  })

  it('does not drag old continuity anchor into a fresh greeting fallback', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '真的吗' },
        { role: 'assistant', content: '当然。' },
        { role: 'user', content: '你好呀' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('你好')
    expect(payload.reply).not.toBe('你好。')
    expect(payload.reply).not.toContain('真的吗')
    expect(payload.reply).not.toContain('要是还是')
  })

  it('keeps capability replies off the old canned shell phrasing', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你能帮我做什么' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
      governance: {
        dialogueActKernel: {
          mustSay: string[]
        }
      }
    }
    expect(payload.reply).toContain('CLI')
    expect(payload.reply).not.toContain('你把目标说清，我就顺着做下去')
    expect(payload.reply).not.toContain('要是还是')
    expect(payload.governance.dialogueActKernel.mustSay[0]).toContain('继续对话')
  })

  it('treats current time questions as fresh local utility turns even when continuity exists', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user', content: '现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.78,
          coherence: 0.84,
          summary: 'Stay on the same living dialogue thread.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.73,
        companionshipPressure: 0.68,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('continuity-suppressed')
  })

  it('keeps compact dialogue greeting lanes available despite temporary runtime-blocked flags', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你好' },
      ] as Message[],
      prepared: createPrepared({
        waitForTools: true,
        hasVisualGrounding: true,
        runtimeSurface: {
          action: { kind: 'execute' },
          governance: null,
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('greeting')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('runtime-blocked-local-override')
  })

  it('treats reordered current time questions as local utility turns', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '几点了现在' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
  })

  it('resolves utility time lane timezone from prepared runtime context when available', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Tokyo"}}}' },
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.resolvedTimeZone).toBe('Asia/Tokyo')
  })

  it('treats timezone confirmation questions as compact utility-time turns', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你现在用的是哪个时区？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '你现在用的是哪个时区？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.resolvedTimeZone).toBe('Asia/Shanghai')
    expect(decision?.resolvedTimeZoneSource).toBe('context-hint')
  })

  it('keeps continuity-check after a time question on compact utility-time lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '现在几点？' },
        { role: 'assistant', content: '现在是 16:33，星期二。' },
        { role: 'user', content: '你确定吗？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('continuity-check-time-confirm')
    expect(decision?.resolvedTimeZone).toBe('Asia/Shanghai')
    expect(decision?.resolvedTimeZoneSource).toBe('context-hint')
  })

  it('prioritizes user explicit timezone preference over ambient runtime timezone', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.resolvedTimeZone).toBe('Asia/Tokyo')
    expect(decision?.resolvedTimeZoneSource).toBe('user-explicit')
  })

  it('does not force timezone phrasing into ordinary current-time replies', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你知道现在几点了吗' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(payload.reply).not.toContain('北京时间')
    expect(payload.reply).not.toContain('Asia/Shanghai')
    expect(payload.reply).not.toContain('我看了下现在这一刻')
    expect(payload.reply).not.toContain('我把现在这一下对了对')
  })

  it('surfaces the active timezone inside fallback time replies', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('东京时间')
    expect(payload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(payload.reply).not.toContain('北京时间')
    expect(payload.reply).not.toContain('你刚才把这一轮的时间基准指定到了')
  })

  it('keeps explicit timezone time replies stable across confirmation turns', () => {
    const firstReply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    })
    const firstPayload = JSON.parse(firstReply) as { reply: string }

    const secondReply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
        { role: 'assistant', content: firstPayload.reply },
        { role: 'user', content: '你确定吗？' },
      ] as Message[],
    })
    const secondPayload = JSON.parse(secondReply) as { reply: string }

    expect(secondPayload.reply).toContain('东京时间')
    expect(secondPayload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(secondPayload.reply).not.toContain('北京时间')
    expect(secondPayload.reply).not.toContain('Asia/Shanghai')
  })

  it('explains why a timezone basis was used instead of repeating the clock answer', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
        { role: 'assistant', content: '我看了下现在这一刻。现在是 18:45，星期二。' },
        { role: 'user', content: '为什么按北京时间回复我？' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('因为')
    expect(payload.reply).toContain('北京时间')
    expect(payload.reply).not.toContain('我再按')
    expect(payload.reply).not.toContain('现在是')
  })

  it('does not enter active dialogue fast path for realtime weather queries', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '帮我查一下天津天气' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: { kind: 'answer' },
          governance: {
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
        },
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.74,
          coherence: 0.82,
          summary: 'dialogue-ready',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.64,
        companionshipPressure: 0.71,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision).toBeNull()
  })

  it('treats humanity critique turns as a dedicated presence-repair lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你说话不像人类呢？' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('presence-critique')
    expect(decision?.strategy).toBe('compact-one-shot')

    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你说话不像人类呢？' },
      ] as Message[],
    })
    const payload = JSON.parse(reply) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
      }
    }
    expect(payload.reply).toMatch(/系统口气|流程播报|机器在报状态|没有把自己放进来/u)
    expect(payload.reply).not.toContain('这条线还连着')
    expect(payload.reply).not.toContain('我可以直接续')
    expect(payload.thought).toContain('obligation=repair')
    expect(payload.governance.answerSubject).toBe('relationship')
  })

  it('routes present-state questions away from repair-clarify and answers them as host-state turns', () => {
    const conversationMessages = [
      { role: 'user', content: '帮我查一下天津天气' },
      { role: 'assistant', content: '天津, 天津市, 中国 当前天气：晴朗；温度 21.0°C。' },
      { role: 'user', content: '你在干嘛' },
    ] as Message[]

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          ...conversationMessages,
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.8,
          coherence: 0.86,
          summary: 'Stay with the current reply seam.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.7,
        companionshipPressure: 0.72,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('present-state')
    expect(decision?.strategy).toBe('compact-one-shot')

    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages,
      runtimeDigest: decision?.runtimeDigest ?? null,
      governance: decision?.governance ?? null,
      sessionMirror: null,
    })
    const payload = JSON.parse(reply) as {
      reply: string
      governance: {
        answerSubject: string
      }
    }

    expect(payload.reply).not.toContain('刚才我没贴住你')
    expect(payload.reply).not.toContain('你现在要我怎么接')
    expect(payload.reply).toMatch(/我现在|我这会儿/u)
    expect(payload.governance.answerSubject).toBe('host-state')
  })

  it('selects the deterministic payoff lane for short execution follow-up turns with continuity', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user', content: '另外还有哪四项？' },
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.71,
          coherence: 0.88,
          summary: 'Stay on the same living dialogue thread.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.76,
        companionshipPressure: 0.69,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('deterministic-payoff')
    expect(decision?.timeoutMs).toBe(0)
  })

  it('treats direct remaining-item listing questions as execution follow-up carry', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
        { role: 'user', content: '另外六项是什么文件' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user', content: '另外六项是什么文件' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('deterministic-payoff')
    expect(decision?.reasonCodes).toContain('execution-carry')
  })

  it('treats prepared execution-ledger context as execution carry for short result follow-ups', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '刚才那个命令结果呢' },
      ] as Message[],
      prepared: createPrepared({
        sessionMirror: {
          agencySummary: null,
          cardId: 'default',
          continuityLabels: [],
          decisionTraceId: null,
          dialogueSummary: null,
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: null,
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: null,
          perceptionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'system' as const, content: '[ALICIZATION_EXECUTION_LEDGER]\nchannel=cli\nsummary=pnpm test finished without failures\noutcome=vitest passed on stage-tamagotchi' },
          { role: 'user', content: '刚才那个命令结果呢' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('deterministic-payoff')
    expect(decision?.reasonCodes).toContain('prepared-execution-ledger')
  })

  it('builds a repair-clarify local reply that realigns a missed time question', () => {
    const conversationMessages = [
      { role: 'user', content: '现在几点了？' },
      { role: 'assistant', content: '我直接沿刚才「早上好呀」这条继续。' },
      { role: 'user', content: '你在说啥呢' },
    ] as Message[]

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          ...conversationMessages,
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.71,
          coherence: 0.77,
          summary: 'A stale carry is still live.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.8,
        companionshipPressure: 0.61,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('repair-clarify')
    expect(decision?.strategy).toBe('compact-one-shot')

    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages,
      runtimeDigest: decision?.runtimeDigest ?? null,
      sessionMirror: null,
      governance: decision?.governance ?? null,
    })
    const payload = JSON.parse(reply) as {
      reply: string
      thought: string
      governance: {
        repairState: string
        answerAct: string
      }
    }

    expect(payload.reply).toMatch(/没贴住|接偏了|着力点偏了/u)
    expect(payload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(payload.reply).not.toContain('旧锚点')
    expect(payload.reply).not.toContain('我就正面回你')
    expect(payload.reply).not.toContain('我听见你了')
    expect(payload.thought).toContain('obligation=repair')
    expect(payload.thought).toContain('truth=grounded')
    expect(payload.governance.repairState).toBe('stale-anchor')
    expect(payload.governance.answerAct).toBe('correct-stale-anchor')
  })

  it('builds compact governed prompt messages for compact one-shot dialogue turns', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      prepared: createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '我今天有点乱' },
          { role: 'assistant', content: '先别散，我和你一起收一下。' },
          { role: 'user', content: '那我先从哪开始' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      decision: decision!,
      prepared: createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '我今天有点乱' },
          { role: 'assistant', content: '先别散，我和你一起收一下。' },
          { role: 'user', content: '那我先从哪开始' },
        ] as Message[],
      }),
    })

    expect(decision?.lane).toBe('dialogue')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(messages[0]?.role).toBe('system')
    expect(String(messages[2]?.content ?? '')).toContain('named/called')
    expect(messages.some(message => String(message.content).includes('continuity_anchor'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('answer_subject=relationship'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('screen_reference_mode=avoid'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('thought_contract=obligation=answer'))).toBe(true)
  })

  it('injects authoritative clock evidence into compact utility-time prompts', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      decision: decision!,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
    })

    const evidenceBlock = messages.find(message => String(message.content).includes('[ALICIZATION_ACTIVE_DIALOGUE_EVIDENCE]'))
    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(String(evidenceBlock?.content ?? '')).toContain('authoritative_local_time=')
    expect(String(evidenceBlock?.content ?? '')).toContain('authoritative_timezone=Asia/Tokyo')
    expect(String(evidenceBlock?.content ?? '')).toContain('Do not recompute time or date from your own clock')
  })

  it('builds a continuity-aware local fallback without runtime meta chatter', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    })

    expect(reply).toContain('桌面')
    expect(reply).not.toContain('继续还是执行下一步')
    expect(reply).not.toContain('旧锚点')
  })

  it('keeps greeting repair fallback off the governed shell stack', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你好呀' },
        { role: 'assistant', content: '你好。要是还是「真的吗」那条线，我就从那里往下；要换个点，也直接开口。' },
        { role: 'user', content: '你在说什么' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toMatch(/接偏了|没贴住|滑开了/u)
    expect(payload.reply).toContain('你好呀')
    expect(payload.reply).not.toContain('我就正面回你')
    expect(payload.reply).not.toContain('我听见你了')
  })

  it('answers identity doubt as content instead of thread-shell narration', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你是谁' },
        { role: 'assistant', content: '我是 Alicization。你现在正在和我说话，回你这句的就是我。' },
        { role: 'user', content: '你确定？' },
      ] as Message[],
    })

    const payload = JSON.parse(reply) as {
      reply: string
    }

    expect(payload.reply).toContain('确定')
    expect(payload.reply).not.toContain('这条线还连着')
    expect(payload.reply).not.toContain('我可以直接续')
  })

  it('normalizes compact one-shot model thoughts back onto the governed fast-path contract when they drift', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      prepared: createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '我今天有点乱' },
          { role: 'assistant', content: '先别散，我和你一起收一下。' },
          { role: 'user', content: '那我先从哪开始' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    const normalized = normalizeAlicizationActiveDialogueFastPathReply({
      decision: decision!,
      rawText: JSON.stringify({
        reply: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
        thought: 'obligation=guide; truth=live-grounded; focus=old-thread; move=drift-away; tone=direct',
        emotion: 'concerned',
        performance: {
          delivery: 'gentle',
        },
      }),
    })

    const payload = JSON.parse(normalized) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }

    expect(payload.reply).toContain('现在最压着你的那一件')
    expect(payload.thought).toContain('obligation=answer')
    expect(payload.thought).not.toContain('obligation=guide')
    expect(payload.governance.answerSubject).toBe('relationship')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('falls back to authoritative local clock reply when compact one-shot returns the wrong time basis', () => {
    const conversationMessages = [
      { role: 'user', content: '后面按东京时间回答，现在几点了？' },
    ] as Message[]
    const prepared = createPrepared({
      messages: [
        { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
        { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: null,
    })

    const normalized = normalizeAlicizationActiveDialogueFastPathReply({
      decision: decision!,
      rawText: JSON.stringify({
        reply: '现在是 12:06，星期二。',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
      }),
    })
    const fallback = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages,
    })

    expect(JSON.parse(normalized)).toEqual(JSON.parse(fallback))
  })
})
