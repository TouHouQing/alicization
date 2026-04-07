import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeEnvelope,
} from './alicization-digital-life'

describe('alicization digital life', () => {
  it('builds a unified embodiment envelope with aligned segment frames', () => {
    const envelope = buildAlicizationDigitalLifeEnvelope({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'inspection',
        variationToken: 'turn-digital-life-1',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.93,
        },
        rendererHints: {
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'observe_focus',
          delivery: 'firm',
          emphasis: 1,
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-digital-life-1',
        reply: '先看这里，然后继续。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里，',
            emotion: 'thinking',
            gestureWeight: 0.7,
            facialWeight: 0.62,
            prosodyWeight: 0.66,
            beatWeight: 0.44,
            mouthWeight: 0.72,
            headWeight: 0.58,
            facialHoldMs: 180,
            actionHoldMs: 240,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dFacialReleaseMs: 320,
              live2dMotionFollowThroughMs: 540,
              vrmActionFadeMs: 240,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'observe_focus',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 5,
            endOffset: 10,
            text: '然后继续。',
            emotion: 'thinking',
            gestureWeight: 0.38,
            facialWeight: 0.48,
            prosodyWeight: 0.57,
            beatWeight: 0.36,
            mouthWeight: 0.52,
            headWeight: 0.42,
            facialHoldMs: 140,
            actionHoldMs: 120,
            emotionHoldMs: 240,
            settleMode: 'hold',
            rendererSettle: {
              live2dFacialReleaseMs: 220,
              live2dMotionFollowThroughMs: 360,
              vrmActionFadeMs: 200,
              vrmExpressionBlendMs: 260,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: null,
            facialCue: 'focused',
            actionWindow: 'none',
            interruptMode: 'continue',
          },
        ],
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

    expect(envelope).not.toBeNull()
    expect(envelope).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      variationToken: 'turn-digital-life-1',
      emotion: 'thinking',
      postureHint: 'inspection',
      voice: expect.objectContaining({
        pitchDelta: -2,
        rateMultiplier: 0.93,
        energy: expect.any(Number),
        cadence: expect.any(Number),
      }),
      lipSync: expect.objectContaining({
        mode: 'hybrid',
        continuityHoldMs: expect.any(Number),
      }),
      face: expect.objectContaining({
        emotion: 'thinking',
        facialCue: 'blink',
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'pulse',
      }),
    }))
    expect(envelope?.frames).toHaveLength(2)
    expect(envelope?.frames.map(frame => frame.id)).toEqual(['segment-1', 'segment-2'])
    expect(envelope?.frames[0]).toEqual(expect.objectContaining({
      id: 'segment-1',
      mode: 'acting',
      lipSync: expect.objectContaining({
        mode: 'hybrid',
      }),
      face: expect.objectContaining({
        facialCue: 'blink',
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'pulse',
      }),
    }))
    expect(envelope?.frames[1]).toEqual(expect.objectContaining({
      id: 'segment-2',
      interruptPolicy: 'continue',
      settleMode: 'hold',
      face: expect.objectContaining({
        facialCue: 'focused',
      }),
      action: expect.objectContaining({
        actionCue: null,
        actionMode: 'none',
      }),
    }))

    expect(normalizeAlicizationDigitalLifeEnvelope(envelope)).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      variationToken: 'turn-digital-life-1',
      lipSync: expect.objectContaining({
        mode: 'hybrid',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({ id: 'segment-1' }),
        expect.objectContaining({ id: 'segment-2' }),
      ]),
    }))
  })
})
