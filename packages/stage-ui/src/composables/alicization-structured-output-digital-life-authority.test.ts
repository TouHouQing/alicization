import { describe, expect, it } from 'vitest'

import { normalizeStructuredOutput } from './alicization-structured-output'

function createScriptOnlyDigitalLife() {
  return {
    version: 'digital-life-v1',
    variationToken: 'turn-script-only-digital-life-authority',
    mode: 'thinking',
    emotion: 'thinking',
    postureHint: 'attentive',
    performance: {
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'observe_focus',
      delivery: 'gentle',
      emphasis: 0,
    },
    speechStyle: {
      pitchDelta: -1,
      rateMultiplier: 0.97,
    },
    voice: {
      pitchDelta: -1,
      rateMultiplier: 0.97,
      energy: 0.42,
      cadence: 0.36,
    },
    lipSync: {
      mode: 'energy-phoneme-hybrid',
      visemeBias: 0.44,
      energyBias: 0.58,
      mouthScale: 0.94,
      continuityHoldMs: 320,
    },
    face: {
      emotion: 'thinking',
      facialCue: 'soft-gaze',
      expressionMode: 'hold',
      intensity: 0.34,
      holdMs: 280,
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
      },
    },
    action: {
      actionCue: 'observe_focus',
      actionMode: 'hold',
      intensity: 0.18,
      holdMs: 220,
      rendererHints: {
        residentMode: 'measured-return',
        preferredGazeMode: 'soften',
      },
    },
    motor: {
      stillness: 0.74,
      gazeStability: 0.62,
      breathAmplitude: 0.21,
      expressivity: 0.16,
    },
    frames: [{
      id: 'segment-script-only-digital-life-authority',
      index: 0,
      startOffset: 0,
      endOffset: 9,
      text: '我先轻一点接住。',
      mode: 'recovering',
      interruptPolicy: 'soft-interrupt',
      settleMode: 'hold',
      voice: {
        pitchDelta: -1,
        rateMultiplier: 0.97,
        energy: 0.42,
        cadence: 0.36,
      },
      lipSync: {
        mode: 'energy-phoneme-hybrid',
        visemeBias: 0.44,
        energyBias: 0.58,
        mouthScale: 0.94,
        continuityHoldMs: 320,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.34,
        holdMs: 280,
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
        },
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.18,
        holdMs: 220,
        rendererHints: {
          residentMode: 'measured-return',
          preferredGazeMode: 'soften',
        },
      },
      motor: {
        stillness: 0.74,
        gazeStability: 0.62,
        breathAmplitude: 0.21,
        expressivity: 0.16,
      },
    }],
  }
}

function createEmbodimentScriptWithDigitalLife() {
  return {
    version: 'embodiment-script-v1',
    turnId: 'turn-script-only-digital-life-authority',
    rendererTarget: 'live2d',
    replyText: '我先轻一点接住。',
    state: {
      baseEmotion: 'thinking',
      delivery: 'gentle',
      emphasis: 0,
      residentMode: 'measured-return',
    },
    speechPlan: {
      segments: [{
        id: 'segment-script-only-digital-life-authority',
        index: 0,
        text: '我先轻一点接住。',
        interruptPolicy: 'soft-settle',
        preRollMs: 20,
        settleMs: 260,
      }],
      interruptPolicy: 'soft-settle',
      preRollMs: 20,
      settleMs: 260,
    },
    facePlan: {
      speakingCues: [{
        segmentId: 'segment-script-only-digital-life-authority',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        intensity: 0.34,
        holdMs: 280,
        source: 'digital-life-projection',
        confidence: 0.92,
      }],
    },
    motionPlan: {
      idleBase: 'idle_settle',
      actionBursts: [{
        segmentId: 'segment-script-only-digital-life-authority',
        actionCue: 'observe_focus',
        intensity: 0.18,
        holdMs: 220,
        source: 'digital-life-projection',
        confidence: 0.88,
      }],
      attentionMode: 'attentive',
    },
    lipsyncPlan: {
      mode: 'energy-phoneme-hybrid',
    },
    digitalLife: createScriptOnlyDigitalLife(),
  }
}

describe('alicization structured output digital life authority', () => {
  it('falls back to embodimentScript digitalLife when structured json omits top-level digitalLife authority', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer; tone=gentle',
        emotion: 'thinking',
        reply: '我先轻一点接住。',
        digitalLife: null,
        embodimentScript: createEmbodimentScriptWithDigitalLife(),
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.digitalLife).toEqual(expect.objectContaining({
      variationToken: 'turn-script-only-digital-life-authority',
      mode: 'thinking',
      voice: expect.objectContaining({
        pitchDelta: -1,
        cadence: 0.36,
      }),
      face: expect.objectContaining({
        facialCue: 'soft-gaze',
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-script-only-digital-life-authority',
          mode: 'recovering',
          face: expect.objectContaining({
            rendererHints: expect.objectContaining({
              residentMode: 'measured-return',
            }),
          }),
        }),
      ],
    }))
  })

  it('keeps top-level digitalLife as the first authority when both channels are present', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'obligation=answer; truth=grounded; focus=current-user-turn; move=answer; tone=gentle',
        emotion: 'thinking',
        reply: '我先轻一点接住。',
        digitalLife: {
          ...createScriptOnlyDigitalLife(),
          variationToken: 'turn-top-level-digital-life-authority',
          frames: [{
            ...createScriptOnlyDigitalLife().frames[0],
            id: 'segment-top-level-digital-life-authority',
          }],
        },
        embodimentScript: createEmbodimentScriptWithDigitalLife(),
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.digitalLife?.variationToken).toBe('turn-top-level-digital-life-authority')
    expect(result.digitalLife?.frames?.[0]?.id).toBe('segment-top-level-digital-life-authority')
  })
})
