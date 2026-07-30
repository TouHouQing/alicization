import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentSpeechPlan } from './speech-planner'

describe('embodiment speech planner', () => {
  it('upgrades a descriptive speech timeline into executable segment policies', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-1',
      replyText: '你好，我们慢慢来。',
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '你好，我们慢慢来。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 8,
          text: '你好，我们慢慢来。',
          gestureWeight: 0.44,
          facialWeight: 0.52,
          prosodyWeight: 0.48,
          beatWeight: 0.36,
          actionCue: 'idle_gentle_nod',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: null,
    })

    expect(plan.segments[0]?.interruptPolicy).toBe('soft-settle')
    expect(plan.segments[0]?.settleMs).toBeGreaterThan(0)
    expect(plan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'full-stop',
      phraseBoundary: 'hard',
      contour: 'falling',
      emphasisWord: '慢慢',
      emphasisStrength: 0.48,
      tempoShift: -0.08,
    })
  })

  it('derives neutral chinese-first prosody for fallback segments without a speech timeline', () => {
    const plan = buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-fallback',
      replyText: '先继续',
      speechTimeline: null,
      digitalLife: null,
    })

    expect(plan.segments).toHaveLength(1)
    expect(plan.segments[0]?.prosody).toEqual({
      language: 'zh-CN',
      pauseClass: 'none',
      phraseBoundary: 'none',
      contour: 'flat',
      emphasisWord: '继续',
      emphasisStrength: 0.49,
      tempoShift: 0,
    })
  })

  it('keeps legacy resident and voice hints from changing executable speech behavior', () => {
    const text = '我会按当前语音数据继续。'
    const buildPlan = (poisoned: boolean) => buildAlicizationEmbodimentSpeechPlan({
      turnId: 'turn-legacy-speech-planner-cue-isolation',
      replyText: text,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-legacy-speech-planner-cue-isolation',
        reply: text,
        emotion: 'thinking',
        segments: [{
          id: 'segment-legacy-speech-planner-cue-isolation',
          index: 0,
          startOffset: 0,
          endOffset: text.length,
          text,
          gestureWeight: 0.3,
          facialWeight: 0.4,
          prosodyWeight: 0.52,
          beatWeight: 0.36,
          actionCue: 'steady_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          settleMode: 'linger',
          facialHoldMs: 260,
          actionHoldMs: 220,
          emotionHoldMs: 280,
          ...(poisoned
            ? {
                rendererHints: {
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
                  preferredPauseMode: 'longer',
                  preferredLipsyncMode: 'restrained',
                  preferredVoiceMode: 'lower-pressure',
                  preferredPacingMode: 'slower',
                } as const,
              }
            : {}),
        }],
      },
      digitalLife: null,
    })
    const projectBehavior = (plan: ReturnType<typeof buildAlicizationEmbodimentSpeechPlan>) => ({
      interruptPolicy: plan.interruptPolicy,
      preRollMs: plan.preRollMs,
      settleMs: plan.settleMs,
      segments: plan.segments.map(segment => ({
        interruptPolicy: segment.interruptPolicy,
        preRollMs: segment.preRollMs,
        prosody: segment.prosody,
        settleMs: segment.settleMs,
      })),
    })

    expect(projectBehavior(buildPlan(true))).toEqual(projectBehavior(buildPlan(false)))
  })
})
