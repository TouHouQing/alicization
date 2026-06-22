import type { AlicizationVisualPresenceStateSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationPresenceExpression,
  guardAlicizationPresenceExpressionText,
} from './presence-expression'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createGroundedState(now = 10_000): AlicizationVisualPresenceStateSnapshot {
  return {
    ...createDefaultVisualPresenceState(now),
    currentBodyState: 'recovering',
    continuityMode: 'protective-watch',
    quietLineMs: 180_000,
    currentInwardPreoccupation: 'repair-before-closeness carry is holding the return lower-pressure',
    watchMode: 'recovering',
    privateThought: {
      stance: 'care',
      confidence: 0.84,
      rationaleTags: ['repair-before-closeness', 'quiet-companionship'],
      thoughtText: 'The return should stay lower-pressure until repair settles.',
      shouldSpeak: false,
      suggestedStyle: 'gentle-care',
      embodiedPresence: 'concerned',
      expiresAt: now + 5_000,
      emotionalTension: 'soft-covision',
    },
    emotionalKernel: {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      valence: -0.18,
      arousal: 0.35,
      guardedness: 0.72,
      closenessDrive: 0.24,
      repairNeed: 0.78,
      initiativePressure: 0.2,
      reasonTags: ['repair-before-closeness'],
      why: 'Repair should settle before closeness expands.',
    },
    initiative: {
      shouldSpeak: false,
      selectedAction: 'recheck',
      preferredStyle: 'silent-observe',
      preferredPresence: 'concerned',
      confidence: 0.81,
      why: 'Hold the opening inward because repair-before-closeness is still active.',
      reasonTags: ['presence-only-hold'],
      continuityRestraint: 'repair-before-closeness',
    } as any,
    runtimeDigest: {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'resident',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'presence-only',
        dominantChannel: 'resident',
        handoffTarget: null,
        continuityArcStage: 'presence-hold',
        continuityPreferredTiming: null,
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.32,
        coherence: 0.75,
        summary: 'holding presence in repair tone',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.83,
      companionshipPressure: 0.55,
      channels: [],
      autonomy: {
        selectedMode: 'resident',
        visibleAction: null,
        shouldSpeak: false,
        shouldAct: false,
        speakReadiness: 0.4,
        actReadiness: 0.2,
        inhibition: 0.2,
        confidence: 0.66,
        executionIntentKind: null,
        executionIntentSummary: null,
        deferReason: null,
        whyNow: null,
      },
      summary: 'resident presence hold',
    } as any,
  } as any
}

function createLowConfidenceGroundedState(now = 10_000): AlicizationVisualPresenceStateSnapshot {
  const state = createGroundedState(now)
  return {
    ...state,
    privateThought: {
      ...state.privateThought!,
      confidence: 0.42,
    },
    emotionalKernel: {
      ...state.emotionalKernel!,
      guardedness: 0.38,
    },
    initiative: {
      ...state.initiative!,
      confidence: 0.4,
    },
    runtimeDigest: {
      ...state.runtimeDigest!,
      continuityPressure: 0.36,
    },
  } as AlicizationVisualPresenceStateSnapshot
}

describe('presence expression builder', () => {
  it('builds a grounded runtime-authored near-body expression', async () => {
    const now = 10_000
    const generate = vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。' }))

    const expression = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: createDefaultVisualPresenceState(now - 1_000),
      state: createGroundedState(now),
      generate,
    })

    expect(generate).toHaveBeenCalledOnce()
    expect(expression).toEqual(expect.objectContaining({
      version: 'presence-expression-v1',
      text: '嗯，先让这里慢下来一点。',
      trigger: 'presence-only-hold',
    }))
    expect(expression?.display).toEqual(expect.objectContaining({
      mode: 'near-body-whisper',
      allowAutoShow: true,
      expiresAt: 16_000,
    }))
    expect(expression?.grounding.sourceRefs).toEqual(expect.arrayContaining([
      'privateThought',
      'emotionalKernel',
      'initiative',
      'runtimeDigest',
    ]))
    expect(expression?.display.intensity).toBe('soft')
  })

  it('withholds when state is too thin', async () => {
    const now = 10_000
    const thin = await buildAlicizationPresenceExpression({
      now,
      trigger: 'startup-restore',
      previousState: null,
      state: createDefaultVisualPresenceState(now),
      generate: vi.fn(async () => ({ text: 'anything' })),
    })

    expect(thin).toBeNull()
  })

  it('rejects banned template text with quality flag', () => {
    const result = guardAlicizationPresenceExpressionText({
      text: '我在旁边，先不打扰你。',
    })
    expect(result.accepted).toBe(false)
    expect(result.qualityFlags).toContain('banned-template')
  })

  it('rejects rejected wording and command-like patterns', () => {
    const groundingText = 'privateThought repair-before-closeness emotionalKernel initiative presence-only-hold'
    const chineseRuntimeWording = guardAlicizationPresenceExpressionText({
      text: '这个项目的运行时状态快照还在调试模块里',
      groundingText,
    })

    expect(guardAlicizationPresenceExpressionText({ text: '这条线我还记着，先轻一点。' }).accepted).toBe(false)
    expect(guardAlicizationPresenceExpressionText({ text: '请执行命令' }).accepted).toBe(false)
    expect(guardAlicizationPresenceExpressionText({ text: 'project 里有 phase 1 的 module debug 记录' }).accepted).toBe(false)
    expect(chineseRuntimeWording.accepted).toBe(false)
    expect(chineseRuntimeWording.qualityFlags).toContain('banned-template')
  })

  it('rejects host-action ask forms even when they have grounding', () => {
    const groundingText = 'privateThought repair-before-closeness emotionalKernel initiative presence-only-hold'

    const politeAsk = guardAlicizationPresenceExpressionText({
      text: '请帮我打开文件',
      groundingText,
    })
    const abilityAsk = guardAlicizationPresenceExpressionText({
      text: '你能帮我打开文件吗',
      groundingText,
    })
    const politeYouAsk = guardAlicizationPresenceExpressionText({
      text: '请你帮我打开文件',
      groundingText,
    })
    const canYouAsk = guardAlicizationPresenceExpressionText({
      text: '你可以帮我打开文件吗',
      groundingText,
    })
    const botherYouAsk = guardAlicizationPresenceExpressionText({
      text: '麻烦你帮我打开文件',
      groundingText,
    })
    const shouldAsk = guardAlicizationPresenceExpressionText({
      text: '你应该打开文件',
      groundingText,
    })
    const needAsk = guardAlicizationPresenceExpressionText({
      text: '你需要执行命令',
      groundingText,
    })

    expect(politeAsk.accepted).toBe(false)
    expect(politeAsk.qualityFlags).toContain('host-action')
    expect(abilityAsk.accepted).toBe(false)
    expect(abilityAsk.qualityFlags).toContain('host-action')
    expect(politeYouAsk.accepted).toBe(false)
    expect(politeYouAsk.qualityFlags).toContain('host-action')
    expect(canYouAsk.accepted).toBe(false)
    expect(canYouAsk.qualityFlags).toContain('host-action')
    expect(botherYouAsk.accepted).toBe(false)
    expect(botherYouAsk.qualityFlags).toContain('host-action')
    expect(shouldAsk.accepted).toBe(false)
    expect(shouldAsk.qualityFlags).toContain('host-action')
    expect(needAsk.accepted).toBe(false)
    expect(needAsk.qualityFlags).toContain('host-action')
  })

  it('requires separate grounding instead of treating a fluent sentence as evidence', () => {
    const ungrounded = guardAlicizationPresenceExpressionText({
      text: '嗯，先让这里慢下来一点。',
    })
    const grounded = guardAlicizationPresenceExpressionText({
      text: '嗯，先让这里慢下来一点。',
      groundingText: 'privateThought repair-before-closeness emotionalKernel initiative presence-only-hold',
    })

    expect(ungrounded.accepted).toBe(false)
    expect(ungrounded.qualityFlags).toContain('thin-grounding')
    expect(grounded.accepted).toBe(true)
  })

  it('uses grounding confidence for string generator results', async () => {
    const now = 10_000
    const expressionFromString = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: createLowConfidenceGroundedState(now),
      generate: vi.fn(async () => '嗯，先让这里慢下来一点。'),
    })
    const expressionFromHighConfidenceObject = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: createLowConfidenceGroundedState(now),
      generate: vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。', confidence: 0.95 })),
    })

    expect(expressionFromString).toBeNull()
    expect(expressionFromHighConfidenceObject).toBeNull()
  })

  it('preserves generated internal spacing and only trims the edges', async () => {
    const now = 10_000
    const expression = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: createGroundedState(now),
      generate: vi.fn(async () => ({
        text: '  嗯，  先让这里\n慢下来一点。  ',
      })),
    })

    expect(expression?.text).toBe('嗯，  先让这里\n慢下来一点。')
  })

  it('returns null for malformed generator results instead of throwing', async () => {
    const now = 10_000
    const malformedResults = [
      null,
      undefined,
      {},
      { text: 42 },
    ]

    for (const result of malformedResults) {
      await expect(buildAlicizationPresenceExpression({
        now,
        trigger: 'presence-only-hold',
        previousState: null,
        state: createGroundedState(now),
        generate: vi.fn(async () => result),
      })).resolves.toBeNull()
    }
  })

  it('keeps state fingerprint stable across previous timestamp churn', async () => {
    const now = 10_000
    const previousA = {
      ...createDefaultVisualPresenceState(now - 1_000),
      updatedAt: now - 1_000,
    }
    const previousB = {
      ...createDefaultVisualPresenceState(now - 2_000),
      updatedAt: now - 2_000,
    }

    const expressionA = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: previousA,
      state: createGroundedState(now),
      generate: vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。' })),
    })
    const expressionB = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: previousB,
      state: createGroundedState(now),
      generate: vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。' })),
    })

    expect(expressionA?.grounding.stateFingerprint).toBe(expressionB?.grounding.stateFingerprint)
  })

  it('returns null when generator throws, text has no grounding, or private thought is speaking directive', async () => {
    const now = 10_000

    const generatorThrows = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: createGroundedState(now),
      generate: vi.fn(async () => {
        throw new Error('boom')
      }),
    })

    const thinGrounding = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: createDefaultVisualPresenceState(now - 1000),
      state: {
        ...createGroundedState(now),
        privateThought: null,
        currentInwardPreoccupation: null,
        initiative: null,
        affectiveResidue: null,
        emotionalKernel: null,
      },
      generate: vi.fn(async () => ({ text: '短句' })),
    })

    const shouldSpeak = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: {
        ...createGroundedState(now),
        privateThought: {
          ...createGroundedState(now).privateThought!,
          shouldSpeak: true,
        },
      },
      generate: vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。' })),
    })

    const lowConfidence = await buildAlicizationPresenceExpression({
      now,
      trigger: 'presence-only-hold',
      previousState: null,
      state: createGroundedState(now),
      generate: vi.fn(async () => ({ text: '嗯，先让这里慢下来一点。', confidence: 0.54 })),
    })

    expect(generatorThrows).toBeNull()
    expect(thinGrounding).toBeNull()
    expect(shouldSpeak).toBeNull()
    expect(lowConfidence).toBeNull()
  })
})
