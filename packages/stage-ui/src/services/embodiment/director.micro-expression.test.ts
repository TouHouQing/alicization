import { describe, expect, it } from 'vitest'

import { buildAlicizationEmbodimentScript } from './director'

describe('director micro-expression timing', () => {
  it('adds pre-utterance and post-utterance cues for gentle chinese guidance turns', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        replyText: '先看这里，然后点保存。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-1',
          reply: '先看这里，然后点保存。',
          emotion: 'thinking',
          segments: [],
        },
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.preUtteranceCue).toBeTruthy()
    expect(script.facePlan.postUtteranceCue).toBeTruthy()
  })

  it('preserves timeline facial hold windows on segment speaking cues', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-hold',
        turnId: 'turn-hold',
        replyText: '先看这里，然后点保存。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-hold',
          reply: '先看这里，然后点保存。',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-1',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里，',
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.76,
              beatWeight: 0.52,
              facialHoldMs: 360,
              actionHoldMs: 140,
              actionCue: 'point_screen',
              facialCue: 'focused',
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      segmentId: 'segment-1',
      facialCue: 'focused',
      holdMs: 360,
    }))
  })

  it('derives segment-level face enter and release cues from chinese prosody timing', () => {
    const script = buildAlicizationEmbodimentScript({
      seed: {
        decisionTraceId: 'trace-segment-face-timing',
        turnId: 'turn-segment-face-timing',
        replyText: '先看这里，然后确认了吗？',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
        embodiment: null,
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-segment-face-timing',
          reply: '先看这里，然后确认了吗？',
          emotion: 'thinking',
          segments: [
            {
              id: 'segment-comma',
              index: 0,
              startOffset: 0,
              endOffset: 5,
              text: '先看这里，',
              emotion: 'thinking',
              gestureWeight: 0.24,
              facialWeight: 0.38,
              prosodyWeight: 0.76,
              beatWeight: 0.52,
              facialHoldMs: 360,
              actionHoldMs: 140,
              actionCue: 'point_screen',
              facialCue: 'focused',
              actionWindow: 'segment-start',
              interruptMode: 'soft-interrupt',
            },
            {
              id: 'segment-question',
              index: 1,
              startOffset: 5,
              endOffset: 13,
              text: '然后确认了吗？',
              emotion: 'thinking',
              gestureWeight: 0.32,
              facialWeight: 0.46,
              prosodyWeight: 0.82,
              beatWeight: 0.58,
              facialHoldMs: 420,
              actionHoldMs: 180,
              actionCue: 'idle_gentle_nod',
              facialCue: 'focused',
              actionWindow: 'cadence-peak',
              interruptMode: 'soft-interrupt',
            },
          ],
        },
        digitalLife: null,
        digitalLifeSpine: null,
      },
      manifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
      residentPerformance: null,
      rendererTarget: 'live2d',
    })

    expect(script.facePlan.speakingCues).toEqual([
      expect.objectContaining({
        segmentId: 'segment-comma',
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
      }),
      expect.objectContaining({
        segmentId: 'segment-question',
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
      }),
    ])
  })
})
