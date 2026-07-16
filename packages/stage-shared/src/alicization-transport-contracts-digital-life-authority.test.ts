import { describe, expect, it } from 'vitest'

import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

function buildScriptDigitalLifeOnlyBundle() {
  return {
    source: 'main-runtime',
    producedAt: 1,
    structured: {
      thought: 'same-thread continuation should keep the continuity state gentle and measured',
      emotion: 'thinking',
      reply: '我先沿着这条线轻一点接住。',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      digitalLife: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-transport-script-digital-life-authority',
        turnId: 'turn-transport-script-digital-life-authority',
        rendererTarget: 'live2d',
        replyText: '我先沿着这条线轻一点接住。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-script-digital-life-1',
            index: 0,
            text: '我先沿着这条线轻一点接住。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [{
            segmentId: 'segment-script-digital-life-1',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.5,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'digital-life-projection',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'idle_gentle_nod',
          actionBursts: [{
            segmentId: 'segment-script-digital-life-1',
            actionCue: 'idle_gentle_nod',
            intensity: 0.48,
            holdMs: 300,
            source: 'digital-life-projection',
            confidence: 0.89,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-script-digital-life-1',
            viseme: 'I',
            weight: 0.68,
            source: 'digital-life-projection',
            confidence: 0.94,
          }],
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-transport-script-digital-life-authority',
          emotion: 'thinking',
          mode: 'recovering',
          postureHint: 'inspection',
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'focused',
            actionCue: 'idle_gentle_nod',
            delivery: 'gentle',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
          },
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.64,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.44,
            energyBias: 0.76,
            mouthScale: 1.04,
            continuityHoldMs: 320,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'idle_gentle_nod',
            actionMode: 'hold',
            intensity: 0.48,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.24,
            gaze: { focus: 0.56, stability: 0.68, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.02 },
            breath: { amplitude: 0.2, pace: 0.24 },
            facial: {
              eyeOpenness: 0.48,
              browLift: 0.02,
              browTension: 0.1,
              cheekLift: 0.05,
              mouthSpread: 0.03,
              mouthRound: 0.08,
              jawOpenBias: 0.1,
            },
            body: {
              sway: 0.02,
              lean: 0,
              openness: 0.34,
              settle: 0.72,
            },
          },
          frames: [{
            id: 'segment-script-digital-life-1',
            index: 0,
            startOffset: 0,
            endOffset: 13,
            text: '我先沿着这条线轻一点接住。',
            mode: 'recovering',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.95,
              energy: 0.64,
              cadence: 0.6,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 320,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.48,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0.71,
              expressivity: 0.24,
              gaze: { focus: 0.56, stability: 0.68, azimuth: 0, elevation: 0 },
              head: { yaw: 0, pitch: 0, roll: 0, nod: 0.02 },
              breath: { amplitude: 0.2, pace: 0.24 },
              facial: {
                eyeOpenness: 0.48,
                browLift: 0.02,
                browTension: 0.1,
                cheekLift: 0.05,
                mouthSpread: 0.03,
                mouthRound: 0.08,
                jawOpenBias: 0.1,
              },
              body: {
                sway: 0.02,
                lean: 0,
                openness: 0.34,
                settle: 0.72,
              },
            },
          }],
        },
      },
    },
  } as const
}

describe('alicization transport contracts digital-life authority', () => {
  it('hydrates structured digitalLife from embodiment-script authority when top-level digitalLife is absent', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle(
      buildScriptDigitalLifeOnlyBundle(),
    )

    expect(bundle?.structured?.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      variationToken: 'turn-transport-script-digital-life-authority',
      mode: 'recovering',
      voice: expect.objectContaining({
        pitchDelta: -2,
        rateMultiplier: 0.95,
        energy: 0.64,
        cadence: 0.6,
      }),
      lipSync: expect.objectContaining({
        mode: 'energy-phoneme-hybrid',
        continuityHoldMs: 320,
      }),
      face: expect.objectContaining({
        facialCue: 'focused',
        expressionMode: 'hold',
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
      action: expect.objectContaining({
        actionCue: 'idle_gentle_nod',
        actionMode: 'hold',
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-script-digital-life-1',
          mode: 'recovering',
          text: '我先沿着这条线轻一点接住。',
          voice: expect.objectContaining({
            pitchDelta: -2,
            rateMultiplier: 0.95,
          }),
          lipSync: expect.objectContaining({
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 320,
          }),
          face: expect.objectContaining({
            facialCue: 'focused',
            expressionMode: 'hold',
          }),
          action: expect.objectContaining({
            actionCue: 'idle_gentle_nod',
            actionMode: 'hold',
          }),
        }),
      ],
    }))
  })
})
