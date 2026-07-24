import { describe, expect, it } from 'vitest'

import { adjustProactiveReplyFromLongHorizonLearning, adjustProactiveStyleFromHostPersonModel, buildHostSocialContexts, buildHostSocialGuidance } from './host-social-guidance'

const hostPersonModel = {
  summary: 'Focused work windows need more room before closeness.',
  routines: ['Focused work windows usually need space first, then precise follow-up.'],
  sensitivities: ['Pressure and over-close timing become intrusive quickly.'],
  repairTriggers: ['If closeness feels heavy, back off first and reopen with lighter presence.'],
  trustLadder: {
    stage: 'cautious-open' as const,
    score: 0.48,
    rationale: 'Trust is warming, but the host still needs clear room while focused.',
  },
  preferredClosenessByContext: [{
    context: 'focused-work',
    preference: 'Lighter touch, more room, less interruption pressure.',
    confidence: 0.86,
  }],
  recurrentBurdens: ['Focused work gets overloaded quickly by extra conversational pressure.'],
  narrative: [],
  updatedAt: 1,
}

describe('host social guidance', () => {
  it('builds social policy contexts only from structured inputs', () => {
    expect(buildHostSocialContexts({
      scenario: 'general',
      workloadKind: 'unknown',
      extraContexts: ['focused-work'],
    })).toEqual(['general', 'focused-work'])
  })

  it('extracts cautious focused-work social guidance from host person model', () => {
    const contexts = buildHostSocialContexts({
      scenario: 'coding',
      workloadKind: 'terminal',
    })
    const guidance = buildHostSocialGuidance({
      hostPersonModel,
      contexts,
    })

    expect(guidance.cautious).toBe(true)
    expect(guidance.restrained).toBe(true)
    expect(guidance.preferenceText).toContain('Lighter touch')
    expect(guidance.sensitivityText).toContain('intrusive')
  })

  it('keeps policy stable when host-authored prose changes', () => {
    const contexts = buildHostSocialContexts({
      scenario: 'coding',
      workloadKind: 'terminal',
    })
    const first = buildHostSocialGuidance({
      hostPersonModel,
      contexts,
    })
    const second = buildHostSocialGuidance({
      hostPersonModel: {
        ...hostPersonModel,
        summary: 'different summary',
        sensitivities: ['different sensitivity'],
        repairTriggers: ['different repair note'],
        recurrentBurdens: ['different burden note'],
        preferredClosenessByContext: [{
          ...hostPersonModel.preferredClosenessByContext[0],
          preference: 'different preference',
        }],
      },
      contexts,
    })

    expect({
      cautious: first.cautious,
      restrained: first.restrained,
      preferredProactiveStyle: first.preferredProactiveStyle,
    }).toEqual({
      cautious: second.cautious,
      restrained: second.restrained,
      preferredProactiveStyle: second.preferredProactiveStyle,
    })
  })

  it('tilts proactive style lighter for focused-work cautious contexts', () => {
    const contexts = buildHostSocialContexts({
      scenario: 'coding',
      workloadKind: 'terminal',
    })
    const style = adjustProactiveStyleFromHostPersonModel({
      currentStyle: 'gentle-care',
      hostPersonModel,
      contexts,
    })

    expect(style).toBe('light-nudge')
  })

  it('suppresses proactive warmth while learning stays in verify-first revalidation posture', () => {
    const contexts = buildHostSocialContexts({
      scenario: 'coding',
      workloadKind: 'terminal',
    })
    const style = adjustProactiveStyleFromHostPersonModel({
      currentStyle: 'gentle-care',
      hostPersonModel,
      contexts,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 1,
        evolutionMomentum: 0.52,
        learningReadiness: 0.68,
        contradictionPressure: 0.42,
        revisionPressure: 0.5,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'world-model revalidation',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'World-model carry is still under revalidation.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['world-model'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'World-model carry remains verify-first.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      } as any,
    })

    expect(style).toBe('silent-observe')
  })

  it('keeps gentle-care available when long-horizon learning has moved into internalize posture', () => {
    const contexts = buildHostSocialContexts({
      scenario: 'late-night-care',
      workloadKind: 'unknown',
    })
    const style = adjustProactiveStyleFromHostPersonModel({
      currentStyle: 'gentle-care',
      hostPersonModel: {
        ...hostPersonModel,
        preferredClosenessByContext: [{
          context: 'late-night',
          preference: 'Keep it gentle when the host is tired.',
          confidence: 0.88,
        }],
      } as any,
      contexts,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 1,
        evolutionMomentum: 0.72,
        learningReadiness: 0.78,
        contradictionPressure: 0.08,
        revisionPressure: 0.18,
        autobiographicalStability: 0.8,
        dominantTrajectory: 'validated procedure internalization',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'internalize',
        nextLearningReason: 'Validated carry is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-procedure'],
        sourceSignals: ['validated-procedure-carry'],
        summary: 'Validated procedure carry is ready to internalize.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['internalize-procedure'],
      } as any,
    })

    expect(style).toBe('gentle-care')
  })

  it('does not inject fixed copy while long-horizon learning is revalidating', () => {
    const reply = adjustProactiveReplyFromLongHorizonLearning({
      currentReply: '这个窗口里像是报错了。要不要先回头看一眼？',
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 1,
        evolutionMomentum: 0.52,
        learningReadiness: 0.68,
        contradictionPressure: 0.42,
        revisionPressure: 0.5,
        autobiographicalStability: 0.72,
        dominantTrajectory: 'world-model revalidation',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'verify',
        nextLearningReason: 'World-model carry is still under revalidation.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: true,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['world-model'],
        sourceSignals: ['self-revision-policy-feedback'],
        summary: 'World-model carry remains verify-first.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'verify',
        activeLearningFocuses: ['world-model'],
      } as any,
    })

    expect(reply).toBe('这个窗口里像是报错了。要不要先回头看一眼？')
  })

  it('keeps the original proactive copy when long-horizon learning is already internalizing', () => {
    const reply = adjustProactiveReplyFromLongHorizonLearning({
      currentReply: '我先轻轻提醒一句，你可以回头确认一下。',
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 1,
        evolutionMomentum: 0.72,
        learningReadiness: 0.78,
        contradictionPressure: 0.08,
        revisionPressure: 0.18,
        autobiographicalStability: 0.8,
        dominantTrajectory: 'validated procedure internalization',
        relationshipDoctrine: null,
        latestInflection: null,
        burdenLine: null,
        trustMeaning: null,
        nextLearningAction: 'internalize',
        nextLearningReason: 'Validated carry is stable enough to become durable.',
        shouldRecord: false,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: true,
        activeLearningFocuses: ['internalize-procedure'],
        sourceSignals: ['validated-procedure-carry'],
        summary: 'Validated procedure carry is ready to internalize.',
      } as any,
      learningExecutionState: {
        nextLearningAction: 'internalize',
        activeLearningFocuses: ['internalize-procedure'],
      } as any,
    })

    expect(reply).toBe('我先轻轻提醒一句，你可以回头确认一下。')
  })
})
