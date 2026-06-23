import { describe, expect, it } from 'vitest'

import {
  buildAlicizationChatMetaPayload,
  buildAlicizationChatMetaSignature,
} from './main-chat-stream-meta'

function buildScriptDigitalLifeAuthorityBody() {
  return {
    cardId: 'card-script-digital-life-authority',
    turnId: 'turn-script-digital-life-authority',
    governance: {
      decisionTraceId: 'trace-script-digital-life-authority',
    },
    visibleReplyExecution: null,
    embodiment: {
      emotion: 'thinking',
      variationToken: 'turn-script-digital-life-authority',
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
      rendererHints: {
        residentMode: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
    },
    embodimentScript: {
      version: 'embodiment-script-v1',
      decisionTraceId: 'trace-script-digital-life-authority',
      turnId: 'turn-script-digital-life-authority',
      rendererTarget: 'vrm',
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
          source: 'resident-authority',
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
          source: 'resident-authority',
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
          source: 'resident-authority',
          confidence: 0.94,
        }],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-script-digital-life-authority',
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
          gaze: { stability: 0.68 },
          breath: { amplitude: 0.2 },
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
            gaze: { stability: 0.68 },
            breath: { amplitude: 0.2 },
          },
        }],
      },
    },
    speechTimeline: {
      version: 'speech-timeline-v1',
      variationToken: 'turn-script-digital-life-authority',
      reply: '我先沿着这条线轻一点接住。',
      emotion: 'thinking',
      segments: [{
        id: 'segment-script-digital-life-1',
        index: 0,
        startOffset: 0,
        endOffset: 13,
        text: '我先沿着这条线轻一点接住。',
        emotion: 'thinking',
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        actionCue: 'idle_gentle_nod',
        facialCue: 'focused',
      }],
    },
    digitalLife: null,
    digitalLifeSpine: {
      continuitySignal: {
        summary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      runtime: {
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Keep the same living line inward for now.',
        },
      },
    },
    residentPerformance: null,
    runtimeDigest: {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.6,
      companionshipPressure: 0.5,
      projectState: {
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCue: 'Keep the same living line inward for now.',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
      },
      activeLoop: {
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      currentConsciousFrame: {
        continuityPreferredTiming: 'next-open-window',
      },
      summary: 'dominant=active-memory',
    },
  } as any
}

describe('main chat stream meta digital-life authority', () => {
  it('reuses embodiment-script digital-life authority in direct host-facing signatures when top-level digitalLife is absent', () => {
    const signature = JSON.parse(buildAlicizationChatMetaSignature(buildScriptDigitalLifeAuthorityBody()))

    expect(signature.digitalLifeFrameCount).toBe(1)
    expect(signature.digitalLifeMode).toBe('recovering')
    expect(signature.lastSegmentVoiceSummary).toContain('pitch=-2.00 | rate=0.95 | energy=0.64 | cadence=0.60')
    expect(signature.lastSegmentVoiceSummary).toContain('companion=measured-return')
    expect(signature.lastSegmentFaceSummary).toContain('emotion=thinking | cue=focused | expression=hold | intensity=0.50 | hold=320ms | mode=measured-return')
    expect(signature.lastSegmentMotionSummary).toContain('motion=idle_gentle_nod | tail=measured-return')
    expect(signature.lastSegmentLipSyncSummary).toContain('mode=energy-phoneme-hybrid')
    expect(signature.lastSegmentBodyContinuitySummary).toContain('mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24')
  })

  it('hydrates emitted chat-meta payload digitalLife from embodiment-script authority when top-level digitalLife is absent', () => {
    const payload = buildAlicizationChatMetaPayload(buildScriptDigitalLifeAuthorityBody())

    expect(payload.digitalLife?.frames).toHaveLength(1)
    expect(payload.digitalLife?.voice.pitchDelta).toBe(-2)
    expect(payload.digitalLife?.face.rendererHints?.residentMode).toBe('measured-return')
    expect(payload.digitalLife?.action.rendererHints?.preferredBlinkCadence).toBe('linger')
  })
})
