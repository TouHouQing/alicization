import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDialogueSpeechTimeline,
  normalizeAlicizationDialogueSpeechTimeline,
} from './alicization-dialogue-speech-timeline'

describe('alicization dialogue speech timeline', () => {
  it('builds micro-dynamic cues for mouth, head, and hold windows', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '先看这里，然后点保存！',
      candidateEmotion: 'happy',
      candidatePerformance: {
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: 'smile',
        actionCue: 'point_screen',
        delivery: 'energetic',
        emphasis: 2,
      },
    })

    expect(timeline).not.toBeNull()
    expect(timeline?.segments.length).toBeGreaterThan(0)
    expect(timeline?.segments.every(segment => (segment.mouthWeight ?? 0) > 0)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.headWeight ?? 0) > 0)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.facialHoldMs ?? 0) >= 90)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.actionHoldMs ?? 0) >= 70)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.emotionHoldMs ?? 0) >= 80)).toBe(true)
    expect(timeline?.segments.every(segment => segment.settleMode)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.live2dFacialReleaseMs ?? 0) >= 80)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.vrmExpressionBlendMs ?? 0) >= 60)).toBe(true)
    expect(timeline?.segments.every(segment => (segment.rendererSettle?.vrmActionFadeMs ?? 0) >= 80)).toBe(true)
    expect(
      timeline?.segments.some(segment =>
        (segment.mouthWeight ?? 0) >= 0.6 || (segment.headWeight ?? 0) >= 0.6,
      ),
    ).toBe(true)
    expect(timeline?.segments.every(segment => segment.emotion)).toBe(true)
    expect(
      timeline?.segments.every(segment => (segment.rendererHints?.preferredExpressionAliases?.length ?? 0) > 0),
    ).toBe(true)
    expect(
      timeline?.segments.every(segment => (segment.rendererHints?.preferredMotionAliases?.length ?? 0) > 0),
    ).toBe(true)
  })

  it('biases segment cue and renderer intent from manifest embodiment hints', () => {
    const timeline = buildAlicizationDialogueSpeechTimeline({
      reply: '你先看这里，好吗？',
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'firm',
        emphasis: 1,
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: {
          thinking: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
            preferredFacialCues: ['focused'],
            preferredActionCues: ['observe_focus'],
          },
        },
      },
    })

    expect(timeline?.segments[0]).toEqual(expect.objectContaining({
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'observe_focus',
      rendererHints: expect.objectContaining({
        preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
        preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
      }),
      rendererSettle: expect.objectContaining({
        live2dFacialReleaseMs: expect.any(Number),
        live2dMotionFollowThroughMs: expect.any(Number),
        vrmActionFadeMs: expect.any(Number),
        vrmExpressionBlendMs: expect.any(Number),
      }),
      settleMode: expect.any(String),
      emotionHoldMs: expect.any(Number),
    }))
  })

  it('normalizes and clamps extended micro-dynamic fields from transport payloads', () => {
    const timeline = normalizeAlicizationDialogueSpeechTimeline({
      version: 'speech-timeline-v1',
      reply: '测试一下！',
      emotion: 'surprised',
      segments: [
        {
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '测试一下！',
          emotion: 'thinking',
          gestureWeight: 1.5,
          facialWeight: -1,
          prosodyWeight: 2,
          beatWeight: 0.6,
          mouthWeight: 5,
          headWeight: -3,
          facialHoldMs: 5000,
          actionHoldMs: -12,
          emotionHoldMs: 5000,
          settleMode: 'linger',
          rendererSettle: {
            live2dFacialReleaseMs: 5000,
            live2dMotionFollowThroughMs: 5000,
            vrmActionFadeMs: 5000,
            vrmExpressionBlendMs: 5000,
          },
          rendererHints: {
            preferredExpressionAliases: [' CalmInspect ', 'CalmInspect'],
            preferredMotionAliases: [' ObserveSoft '],
          },
          actionCue: 'point_screen',
          facialCue: 'wide-eye',
          actionWindow: 'cadence-peak',
          interruptMode: 'hard-interrupt',
        },
      ],
    })

    expect(timeline).not.toBeNull()
    expect(timeline?.segments[0]).toMatchObject({
      emotion: 'thinking',
      mouthWeight: 1,
      headWeight: 0,
      facialHoldMs: 920,
      actionHoldMs: 70,
      emotionHoldMs: 960,
      settleMode: 'linger',
      rendererSettle: {
        live2dFacialReleaseMs: 1600,
        live2dMotionFollowThroughMs: 1200,
        vrmActionFadeMs: 1200,
        vrmExpressionBlendMs: 960,
      },
      rendererHints: {
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
      },
    })
  })
})
