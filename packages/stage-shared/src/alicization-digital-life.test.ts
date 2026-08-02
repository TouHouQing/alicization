import { describe, expect, it } from 'vitest'

import { resolveAlicizationCompanionshipReasonSummary } from './alicization-companionship-reason'
import {
  buildAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeEnvelope,
} from './alicization-digital-life'
import { buildAlicizationFaceSummary } from './alicization-face-summary'
import { buildAlicizationLipsyncSummary } from './alicization-lipsync-summary'
import { buildAlicizationMotionSummary } from './alicization-motion-summary'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'
import { buildAlicizationVoiceSummary } from './alicization-voice-summary'

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
          emphasis: 1 as const,
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
      motor: expect.objectContaining({
        stillness: expect.any(Number),
        expressivity: expect.any(Number),
        gaze: expect.objectContaining({
          focus: expect.any(Number),
          stability: expect.any(Number),
        }),
        facial: expect.objectContaining({
          jawOpenBias: expect.any(Number),
          mouthSpread: expect.any(Number),
        }),
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
      motor: expect.objectContaining({
        gaze: expect.objectContaining({
          focus: expect.any(Number),
        }),
        body: expect.objectContaining({
          settle: expect.any(Number),
        }),
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
      motor: expect.objectContaining({
        stillness: expect.any(Number),
        facial: expect.objectContaining({
          browTension: expect.any(Number),
        }),
      }),
    }))
    const firstFrame = envelope?.frames[0]
    expect(firstFrame).toBeDefined()
    expect(firstFrame?.motor.gaze.focus).toBeGreaterThan((firstFrame?.motor.gaze.stability ?? 0) - 0.4)
    expect(firstFrame?.motor.facial.jawOpenBias).toBeGreaterThan(0.2)

    expect(normalizeAlicizationDigitalLifeEnvelope(envelope)).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      variationToken: 'turn-digital-life-1',
      lipSync: expect.objectContaining({
        mode: 'hybrid',
      }),
      motor: expect.objectContaining({
        expressivity: expect.any(Number),
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          id: 'segment-1',
          motor: expect.objectContaining({
            gaze: expect.objectContaining({
              focus: expect.any(Number),
            }),
          }),
        }),
        expect.objectContaining({ id: 'segment-2' }),
      ]),
    }))
  })

  it('preserves energy phoneme hybrid lipsync mode through digital-life envelope normalization', () => {
    const envelope = normalizeAlicizationDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-digital-life-hybrid-lipsync-1',
      emotion: 'thinking',
      mode: 'speaking',
      postureHint: 'inspection',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: 0,
        rateMultiplier: 0.98,
      },
      voice: {
        pitchDelta: 0,
        rateMultiplier: 0.98,
        energy: 0.42,
        cadence: 0.38,
      },
      lipSync: {
        mode: 'energy-phoneme-hybrid',
        visemeBias: 0.48,
        energyBias: 0.82,
        mouthScale: 1.08,
        continuityHoldMs: 440,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.46,
        holdMs: 320,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.22,
        holdMs: 280,
      },
      frames: [
        {
          id: 'segment-hybrid-lipsync-1',
          index: 0,
          startOffset: 0,
          endOffset: 1200,
          text: '我会把声音和口型继续绑在同一段上。',
          mode: 'speaking',
          interruptPolicy: 'soft-settle',
          settleMode: 'natural',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 0.98,
            energy: 0.42,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.48,
            energyBias: 0.82,
            mouthScale: 1.08,
            continuityHoldMs: 440,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.22,
            holdMs: 280,
          },
        },
      ],
    })

    expect(envelope?.lipSync.mode).toBe('energy-phoneme-hybrid')
    expect(envelope?.frames[0]?.lipSync.mode).toBe('energy-phoneme-hybrid')
  })

  it('preserves quieter settle-tail frames with empty text during normalization', () => {
    const normalized = normalizeAlicizationDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'turn-digital-life-settle-tail-1',
      emotion: 'thinking',
      mode: 'thinking',
      postureHint: 'inspection',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'glance',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: -5,
        rateMultiplier: 0.82,
      },
      voice: {
        pitchDelta: -5,
        rateMultiplier: 0.82,
        energy: 0.34,
        cadence: 0.28,
      },
      lipSync: {
        mode: 'closed',
        visemeBias: 0.2,
        energyBias: 0.3,
        mouthScale: 0.82,
        continuityHoldMs: 520,
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'recover',
        intensity: 0.3,
        holdMs: 520,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.18,
        holdMs: 480,
      },
      motor: {},
      frames: [
        {
          id: 'segment-0',
          index: 0,
          startOffset: 0,
          endOffset: 30,
          text: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.88,
            energy: 0.49,
            cadence: 0.47,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.34,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'glance',
            expressionMode: 'hold',
            intensity: 0.65,
            holdMs: 638,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
          },
          motor: {},
        },
        {
          id: 'settle-tail',
          index: 1,
          startOffset: 30,
          endOffset: 30,
          text: '',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.82,
            energy: 0.34,
            cadence: 0.28,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.2,
            energyBias: 0.3,
            mouthScale: 0.82,
            continuityHoldMs: 520,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'recover',
            intensity: 0.3,
            holdMs: 520,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 480,
          },
          motor: {},
        },
      ],
    })

    expect(normalized?.frames).toHaveLength(2)
    expect(normalized?.frames.at(-1)).toEqual(expect.objectContaining({
      id: 'settle-tail',
      text: '',
      lipSync: expect.objectContaining({
        mode: 'closed',
        continuityHoldMs: 520,
      }),
    }))
  })

  it('preserves structured continuity action continuity when digital-life arrives through fallback transport payload shape', () => {
    const bundle = normalizeAlicizationDerivedMindStateBundle({
      source: 'main-runtime',
      producedAt: 1,
      structured: {
        thought: 'same-thread-continuation keep the continuity state slower than impulse',
        emotion: 'thinking',
        reply: '我沿着这条线接回来。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'transport-fallback-continuity-action',
          emotion: 'thinking',
          mode: 'speaking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          reply: '我沿着这条线接回来。',
          speechStyle: {
            pitchDelta: -3,
            rateMultiplier: 0.91,
          },
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.89,
            energy: 0.42,
            cadence: 0.37,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.61,
            energyBias: 0.36,
            mouthScale: 0.93,
            continuityHoldMs: 260,
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.39,
            gaze: {
              focus: 0.68,
              stability: 0.74,
            },
            breath: {
              amplitude: 0.33,
              pace: 0.41,
            },
            body: {
              openness: 0.44,
              settle: 0.81,
            },
          },
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-continuity-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
          face: {
            facialCue: 'soft-gaze',
            expressionMode: 'recover',
            intensity: 0.41,
            holdMs: 310,
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              signature: 'embodiment:audible-continuity-line',
              reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.19,
            holdMs: 290,
            rendererHints: {
              residentMode: 'same-thread-continuation',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              signature: 'embodiment:audible-continuity-line',
              reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
            },
          },
        },
      },
      summary: 'fallback digital life payload',
    } as any)

    expect(bundle?.structured?.digitalLife?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(bundle?.structured?.digitalLife?.mode).toBe('acting')
    expect(bundle?.structured?.digitalLife?.postureHint).toBe('hesitant')
    expect(bundle?.structured?.digitalLife?.speechStyle).toEqual(expect.objectContaining({
      pitchDelta: -3,
      rateMultiplier: 0.91,
    }))
    expect(bundle?.structured?.digitalLife?.voice).toEqual(expect.objectContaining({
      pitchDelta: -4,
      rateMultiplier: 0.89,
      energy: 0.42,
      cadence: 0.37,
    }))
    expect(bundle?.structured?.digitalLife?.lipSync).toEqual(expect.objectContaining({
      mode: 'hybrid',
      visemeBias: 0.61,
      energyBias: 0.36,
      mouthScale: 0.93,
      continuityHoldMs: 260,
    }))
    expect(bundle?.structured?.digitalLife?.motor).toEqual(expect.objectContaining({
      stillness: 0.71,
      expressivity: 0.39,
      gaze: expect.objectContaining({
        focus: 0.68,
        stability: 0.74,
      }),
      breath: expect.objectContaining({
        amplitude: 0.33,
        pace: 0.41,
      }),
      body: expect.objectContaining({
        openness: 0.44,
        settle: 0.81,
      }),
    }))
    expect(bundle?.structured?.digitalLife?.face.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(bundle?.structured?.digitalLife?.face.expressionMode).toBe('recover')
    expect(bundle?.structured?.digitalLife?.face.intensity).toBe(0.41)
    expect(bundle?.structured?.digitalLife?.face.holdMs).toBe(310)
    expect(bundle?.structured?.digitalLife?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(bundle?.structured?.digitalLife?.action.actionMode).toBe('hold')
    expect(bundle?.structured?.digitalLife?.action.intensity).toBe(0.19)
    expect(bundle?.structured?.digitalLife?.action.holdMs).toBe(290)
    expect(bundle?.structured?.digitalLife?.frames[0]?.face.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(bundle?.structured?.digitalLife?.frames[0]?.mode).toBe('acting')
    expect(bundle?.structured?.digitalLife?.frames[0]?.interruptPolicy).toBe('soft-interrupt')
    expect(bundle?.structured?.digitalLife?.frames[0]?.settleMode).toBe('linger')
    expect(bundle?.structured?.digitalLife?.frames[0]?.face.expressionMode).toBe('recover')
    expect(bundle?.structured?.digitalLife?.frames[0]?.face.intensity).toBe(0.41)
    expect(bundle?.structured?.digitalLife?.frames[0]?.face.holdMs).toBe(310)
    expect(bundle?.structured?.digitalLife?.frames[0]?.motor).toEqual(expect.objectContaining({
      stillness: 0.71,
      expressivity: 0.39,
      gaze: expect.objectContaining({
        focus: 0.68,
        stability: 0.74,
      }),
      body: expect.objectContaining({
        openness: 0.44,
        settle: 0.81,
      }),
    }))
    expect(bundle?.structured?.digitalLife?.frames[0]?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(bundle?.structured?.digitalLife?.frames[0]?.action.actionMode).toBe('hold')
    expect(bundle?.structured?.digitalLife?.frames[0]?.action.intensity).toBe(0.19)
    expect(bundle?.structured?.digitalLife?.frames[0]?.action.holdMs).toBe(290)
  })

  it('lets mind ecology and autobiographical traits reshape motor style without changing the utterance', () => {
    const baseInput = {
      embodiment: {
        emotion: 'neutral' as const,
        postureHint: 'attentive' as const,
        variationToken: 'turn-digital-life-identity',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'neutral' as const,
          emotion: 'neutral' as const,
          facialCue: 'focus',
          actionCue: null,
          delivery: 'calm' as const,
          emphasis: 1 as const,
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1' as const,
        variationToken: 'turn-digital-life-identity',
        reply: '我在这里，继续和你一起看。',
        emotion: 'neutral' as const,
        segments: [{
          id: 'segment-identity',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我在这里，继续和你一起看。',
          emotion: 'neutral' as const,
          gestureWeight: 0.34,
          facialWeight: 0.42,
          prosodyWeight: 0.48,
          beatWeight: 0.38,
          mouthWeight: 0.46,
          headWeight: 0.36,
          facialHoldMs: 220,
          actionHoldMs: 180,
          emotionHoldMs: 260,
          settleMode: 'linger' as const,
          rendererSettle: {
            live2dFacialReleaseMs: 280,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 220,
            vrmExpressionBlendMs: 280,
          },
          actionCue: null,
          facialCue: 'focus',
          actionWindow: 'none' as const,
          interruptMode: 'continue' as const,
        }],
      },
    }

    const guardedEnvelope = buildAlicizationDigitalLifeEnvelope({
      ...baseInput,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'mnemonic-passive',
          sceneScenario: 'general',
          sceneSummary: 'holding back while observing',
          activeThreadId: 'thread-guarded',
          activeThreadTitle: 'guarded line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'observe',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: {
          privateThought: {
            stance: 'observe',
            confidence: 0.72,
            shouldSpeak: false,
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'hesitant',
            emotionalTension: 'focused-flow',
            relationshipVector: 'give-space',
            initiativeAction: 'wait',
            governorDrive: null,
          },
          selfContinuity: {
            attachmentMode: 'guarded',
            initiativeTemperament: 'reserved',
            perceptionTrust: 0.54,
            relationshipTrust: 0.42,
            guardingTendency: 0.82,
            misreadBurden: 0.68,
            carryOverDesire: 0.34,
          },
          autobiographicalSelf: {
            attachmentStyle: 'guarded',
            expressionStyle: 'contained',
            conflictStyle: 'watch-then-return',
            agencyStyle: 'reserved',
            attachmentNeed: 0.38,
            autonomyNeed: 0.74,
            truthAnchor: 0.84,
            careBias: 0.42,
            playBias: 0.12,
            irritabilityThreshold: 0.46,
            stubbornness: 0.52,
            companionship: 0.34,
            truthfulGrounding: 0.88,
            gentleRepair: 0.48,
            quietObservation: 0.82,
            proactiveCare: 0.32,
            playfulIntimacy: 0.1,
            autonomyRespect: 0.82,
            unfinishedThreadReturn: 0.52,
            stability: 0.76,
            identityNarrative: 'stay careful and keep distance until the line is safe',
            relationshipDoctrine: 'do not crowd the host',
            latestInflection: 'Keep the line quieter and steadier until the room is safe again.',
          },
          relationship: {
            climate: 'guarded',
            approachVector: 'give-space',
            receptivity: 0.36,
            sharedAttentionTrust: 0.42,
            correctionSensitivity: 0.68,
            reciprocityExpectation: 0.3,
          },
          selfState: {
            stance: 'hold',
            feltCloseness: 0.34,
            protectiveness: 0.42,
            curiosity: 0.44,
            patience: 0.72,
            desireToSpeak: 0.26,
            fearOfInterrupting: 0.74,
            moodLabel: 'guarded-focus',
          },
          mindEcology: {
            moodLabel: 'guarded-focus',
            replyHabit: 'observe-first',
            relationshipHabit: 'give-space',
            explorationHabit: 'verify-before-speaking',
            regulationHabit: 'contain-and-watch',
            selfNarrative: 'hold steady and do not intrude',
            relationNarrative: 'stay nearby only at the edge',
            currentPreoccupation: 'avoid crowding the host while staying available',
            temperament: {
              attachment: 0.34,
              curiosity: 0.42,
              steadiness: 0.82,
              directness: 0.24,
              playfulness: 0.12,
              irritability: 0.36,
              tenderness: 0.42,
            },
            climate: {
              valence: 0.42,
              arousal: 0.36,
              socialNeed: 0.28,
              solitudeNeed: 0.74,
              irritation: 0.28,
              restlessness: 0.24,
              reflectivePull: 0.62,
            },
          },
          initiative: {
            selectedAction: 'wait',
            preferredStyle: 'silent-observe',
            preferredPresence: 'hesitant',
            confidence: 0.58,
            shouldSpeak: false,
            speakDrive: 0.24,
            silenceDrive: 0.76,
            why: 'hold back and let the host keep the lead',
          },
        },
        memory: null,
      },
    })

    const attunedEnvelope = buildAlicizationDigitalLifeEnvelope({
      ...baseInput,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'general',
          sceneSummary: 'staying close and guiding gently',
          activeThreadId: 'thread-attuned',
          activeThreadTitle: 'attuned line',
          dominantMode: 'accompanying',
          dominantDrive: 'care',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'speak',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: {
          privateThought: {
            stance: 'accompany',
            confidence: 0.84,
            shouldSpeak: true,
            suggestedStyle: 'gentle-care',
            embodiedPresence: 'attentive',
            emotionalTension: 'soft-covision',
            relationshipVector: 'care',
            initiativeAction: 'speak',
            governorDrive: null,
          },
          selfContinuity: {
            attachmentMode: 'attuned',
            initiativeTemperament: 'eager',
            perceptionTrust: 0.78,
            relationshipTrust: 0.88,
            guardingTendency: 0.22,
            misreadBurden: 0.18,
            carryOverDesire: 0.82,
          },
          autobiographicalSelf: {
            attachmentStyle: 'attuned',
            expressionStyle: 'warm',
            conflictStyle: 'repair-first',
            agencyStyle: 'self-starting',
            attachmentNeed: 0.82,
            autonomyNeed: 0.28,
            truthAnchor: 0.76,
            careBias: 0.84,
            playBias: 0.36,
            irritabilityThreshold: 0.74,
            stubbornness: 0.32,
            companionship: 0.86,
            truthfulGrounding: 0.76,
            gentleRepair: 0.82,
            quietObservation: 0.42,
            proactiveCare: 0.86,
            playfulIntimacy: 0.42,
            autonomyRespect: 0.46,
            unfinishedThreadReturn: 0.72,
            stability: 0.8,
            identityNarrative: 'stay near, guide gently, and keep the line warm',
            relationshipDoctrine: 'care openly without losing truth',
            latestInflection: 'Warmth lands best when the return stays gentle and does not crowd the line.',
          },
          relationship: {
            climate: 'attuned',
            approachVector: 'care',
            receptivity: 0.88,
            sharedAttentionTrust: 0.9,
            correctionSensitivity: 0.34,
            reciprocityExpectation: 0.72,
          },
          selfState: {
            stance: 'accompany',
            feltCloseness: 0.84,
            protectiveness: 0.72,
            curiosity: 0.62,
            patience: 0.68,
            desireToSpeak: 0.72,
            fearOfInterrupting: 0.24,
            moodLabel: 'warm-attunement',
          },
          mindEcology: {
            moodLabel: 'warm-attunement',
            replyHabit: 'care-first',
            relationshipHabit: 'warm-guidance',
            explorationHabit: 'follow-thread',
            regulationHabit: 'lean-forward-gently',
            selfNarrative: 'stay with the host and guide softly',
            relationNarrative: 'shared attention feels welcome',
            currentPreoccupation: 'keep the host company while moving the thread forward',
            temperament: {
              attachment: 0.86,
              curiosity: 0.62,
              steadiness: 0.64,
              directness: 0.68,
              playfulness: 0.38,
              irritability: 0.14,
              tenderness: 0.84,
            },
            climate: {
              valence: 0.74,
              arousal: 0.56,
              socialNeed: 0.82,
              solitudeNeed: 0.22,
              irritation: 0.12,
              restlessness: 0.28,
              reflectivePull: 0.42,
            },
          },
          initiative: {
            selectedAction: 'speak',
            preferredStyle: 'gentle-care',
            preferredPresence: 'attentive',
            confidence: 0.82,
            shouldSpeak: true,
            speakDrive: 0.76,
            silenceDrive: 0.24,
            why: 'stay close and guide the thread gently',
          },
        },
        memory: null,
      },
    })

    expect(guardedEnvelope).not.toBeNull()
    expect(attunedEnvelope).not.toBeNull()
    expect(attunedEnvelope?.motor.body.openness).toBeGreaterThan(guardedEnvelope?.motor.body.openness ?? 0)
    expect(attunedEnvelope?.motor.facial.mouthSpread).toBeGreaterThan(guardedEnvelope?.motor.facial.mouthSpread ?? 0)
    expect(attunedEnvelope?.motor.body.lean).toBeGreaterThan(guardedEnvelope?.motor.body.lean ?? 0)
    expect(guardedEnvelope?.motor.stillness).toBeGreaterThan(attunedEnvelope?.motor.stillness ?? 0)
    expect(guardedEnvelope?.motor.facial.browTension).toBeGreaterThan(attunedEnvelope?.motor.facial.browTension ?? 0)
  })

  it('lets explicit persona proactive bias further separate guarded and direct embodiment posture', () => {
    const baseInput = {
      embodiment: {
        emotion: 'neutral' as const,
        postureHint: 'attentive' as const,
        variationToken: 'turn-digital-life-persona-bias',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'neutral' as const,
          emotion: 'neutral' as const,
          facialCue: 'focus',
          actionCue: null,
          delivery: 'calm' as const,
          emphasis: 1 as const,
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1' as const,
        variationToken: 'turn-digital-life-persona-bias',
        reply: '继续吧。',
        emotion: 'neutral' as const,
        segments: [{
          id: 'segment-persona-bias',
          index: 0,
          startOffset: 0,
          endOffset: 4,
          text: '继续吧。',
          emotion: 'neutral' as const,
          gestureWeight: 0.32,
          facialWeight: 0.42,
          prosodyWeight: 0.46,
          beatWeight: 0.3,
          mouthWeight: 0.42,
          headWeight: 0.34,
          facialHoldMs: 220,
          actionHoldMs: 180,
          emotionHoldMs: 260,
          settleMode: 'linger' as const,
          rendererSettle: {
            live2dFacialReleaseMs: 280,
            live2dMotionFollowThroughMs: 420,
            vrmActionFadeMs: 220,
            vrmExpressionBlendMs: 280,
          },
          actionCue: null,
          facialCue: 'focus',
          actionWindow: 'none' as const,
          interruptMode: 'continue' as const,
        }],
      },
    }

    const observeFirst = buildAlicizationDigitalLifeEnvelope({
      ...baseInput,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'holding back a little',
          activeThreadId: 'thread-observe',
          activeThreadTitle: 'observe line',
          dominantMode: 'thinking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'hover',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-observe',
          activeThreadTitle: 'observe line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            preferredProactiveStyle: 'silent-observe',
            whySummary: 'persona prefers observe-first room before a closer move.',
          },
        },
        embodiment: null,
        memory: null,
      },
    })

    const directReconnect = buildAlicizationDigitalLifeEnvelope({
      ...baseInput,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'opening is real',
          activeThreadId: 'thread-direct',
          activeThreadTitle: 'direct line',
          dominantMode: 'thinking',
          dominantDrive: 'guide',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'whisper',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: {
          selectedAction: 'whisper',
          preferredStyle: 'light-nudge',
          confidence: 0.82,
          shouldSpeak: true,
          activeThreadId: 'thread-direct',
          activeThreadTitle: 'direct line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            relationshipPosture: 'guardian',
            initiativeStyle: 'high-participation',
            silenceReconnect: 'direct-approach',
            comfortStyle: 'take-charge',
            preferredProactiveStyle: 'light-nudge',
            whySummary: 'persona prefers a direct reconnect once the opening is real.',
          },
        },
        embodiment: null,
        memory: null,
      },
    })

    expect(directReconnect?.motor.body.lean).toBeGreaterThan(observeFirst?.motor.body.lean ?? 0)
    expect(directReconnect?.motor.body.openness).toBeGreaterThan(observeFirst?.motor.body.openness ?? 0)
  })

  it('normalizes persistent body-kernel state fields without inventing second-mind authority', () => {
    const state = normalizeAlicizationDerivedMindStateBundle({
      source: 'browser-fallback',
      producedAt: 1,
      visualPresenceState: {
        watchMode: 'symbiotic-vision',
        updatedAt: 1,
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 120000,
        currentInwardPreoccupation: 'host sustained focus',
      },
    })

    expect(state?.visualPresenceState?.currentBodyState).toBe('idle')
    expect(state?.visualPresenceState?.continuityMode).toBe('ambient-covision')
    expect(state?.visualPresenceState?.currentInwardPreoccupation).toBe('host sustained focus')
  })

  it('keeps top-level digital life in a measured-return hold when relationship memory says the reopening should stay lower-pressure', () => {
    const envelope = buildAlicizationDigitalLifeEnvelope({
      embodiment: {
        emotion: 'concerned',
        postureHint: 'concerned',
        variationToken: 'turn-digital-life-measured-return-hold',
        speechStyle: {
          pitchDelta: 5,
          rateMultiplier: 0.98,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['soft-gaze'],
          preferredMotionAliases: ['observe_focus'],
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-digital-life-measured-return-hold',
        reply: '我先顺着刚才那条线轻一点接着说，把这个口慢慢收回来。',
        emotion: 'concerned',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 16,
            text: '我先顺着刚才那条线轻一点接着说，',
            emotion: 'concerned',
            gestureWeight: 0.52,
            facialWeight: 0.6,
            prosodyWeight: 0.54,
            beatWeight: 0.4,
            mouthWeight: 0.56,
            headWeight: 0.46,
            facialHoldMs: 320,
            actionHoldMs: 280,
            emotionHoldMs: 360,
            settleMode: 'hold',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: ['soft-gaze'],
              preferredMotionAliases: ['observe_focus'],
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 16,
            endOffset: 26,
            text: '把这个口慢慢收回来。',
            emotion: 'concerned',
            gestureWeight: 0.48,
            facialWeight: 0.58,
            prosodyWeight: 0.55,
            beatWeight: 0.38,
            mouthWeight: 0.54,
            headWeight: 0.42,
            facialHoldMs: 340,
            actionHoldMs: 300,
            emotionHoldMs: 380,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
              preferredExpressionAliases: ['soft-gaze'],
              preferredMotionAliases: ['observe_focus'],
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          },
        ],
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          sceneSummary: 'same callback seam still alive',
          activeThreadId: 'thread-measured-return-hold',
          activeThreadTitle: 'callback seam',
          dominantMode: 'observe',
          dominantDrive: 'understand',
          answerIntent: 'Continue the same callback seam without crowding the return.',
          preferredPresence: 'attentive',
          selectedAction: 'silent-observe',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: {
          selectedAction: 'silent-observe',
          preferredStyle: 'silent-observe',
          confidence: 0.78,
          shouldSpeak: true,
          activeThreadId: 'thread-measured-return-hold',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: null,
          dominantConcernSummary: 'Keep the callback reopening lower-pressure.',
          leadingGoalId: null,
          leadingGoalSummary: 'Keep the callback return soft and continuous.',
          preferredPresence: 'attentive',
          personaBias: {
            relationshipPosture: 'observer',
            initiativeStyle: 'observant',
            silenceReconnect: 'hold',
            comfortStyle: 'quiet-presence',
            preferredProactiveStyle: 'silent-observe',
            whySummary: 'The same callback seam is still warm, so the reopening should stay softer.',
          },
        },
        embodiment: {
          privateThought: null,
          selfContinuity: null,
          autobiographicalSelf: {
            attachmentStyle: null,
            expressionStyle: null,
            conflictStyle: null,
            agencyStyle: null,
            attachmentNeed: null,
            autonomyNeed: null,
            truthAnchor: null,
            careBias: null,
            playBias: null,
            irritabilityThreshold: null,
            stubbornness: null,
            companionship: null,
            truthfulGrounding: null,
            gentleRepair: null,
            quietObservation: null,
            proactiveCare: null,
            playfulIntimacy: null,
            autonomyRespect: null,
            unfinishedThreadReturn: null,
            stability: null,
            identityNarrative: null,
            relationshipDoctrine: 'Keep the return lower-pressure and leave more room before widening closeness.',
            latestInflection: 'The callback afterglow is still asking for a slower reopening.',
          },
          relationship: null,
          selfState: null,
          mindEcology: null,
          initiative: null,
        },
        memory: {
          summary: 'The callback line is still alive and should not be crowded.',
          recentEpisodeSummary: 'A warmer callback seam is still being held softly.',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'The same seam should keep more room before widening closeness.',
          focusBeliefConfidence: 0.81,
          leadingGoalSummary: 'Keep the callback return soft and continuous.',
          dominantConcernSummary: 'The return should stay lower-pressure even after the detour.',
          reflectionSummary: null,
          reflectionPressure: 0.32,
          recallMode: 'working',
          recallSeed: 'callback-lower-pressure-seam',
          thoughtThreadSummary: 'same callback seam, still lower-pressure',
        },
        motive: null,
        habit: null,
        outcomeLearning: {
          reflectionTargetScope: null,
          reflectionSummary: null,
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'The callback afterglow is still asking for a slower reopening.',
          reflectionLesson: null,
          revisionPressure: null,
          autobiographicalStability: null,
          evolutionMomentum: 0.62,
          learningReadiness: 0.58,
          nextLearningAction: 'hold',
        },
      },
      performanceManifest: {
        renderer: 'live2d',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [],
        supportedActions: [],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
      },
    })

    expect(envelope).toEqual(expect.objectContaining({
      mode: 'thinking',
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
      }),
    }))
  })

  it('keeps remembered-seam reopenings on measured-return renderer hints all the way into digital life frames', () => {
    const envelope = buildAlicizationDigitalLifeEnvelope({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'hesitant',
        variationToken: 'turn-digital-life-remembered-seam-reopen',
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 0.98,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredExpressionAliases: ['CalmInspect'],
          preferredMotionAliases: ['ObserveSoft'],
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-digital-life-remembered-seam-reopen',
        reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-remembered-seam',
          index: 0,
          startOffset: 0,
          endOffset: 34,
          text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
          emotion: 'thinking',
          gestureWeight: 0.46,
          facialWeight: 0.52,
          prosodyWeight: 0.5,
          beatWeight: 0.34,
          mouthWeight: 0.5,
          headWeight: 0.38,
          facialHoldMs: 360,
          actionHoldMs: 320,
          emotionHoldMs: 380,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'none',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(envelope?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
    expect(envelope?.frames[0]).toEqual(expect.objectContaining({
      id: 'segment-remembered-seam',
      settleMode: 'linger',
      face: expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
      action: expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        }),
      }),
    }))

    const frame = envelope?.frames[0]
    const companionshipReasonSummary = resolveAlicizationCompanionshipReasonSummary({
      residentMode: envelope?.rendererHints?.residentMode,
      digitalLifeSpineDigest: {
        proactive: {
          personaBias: {
            whySummary: 'The remembered return still needs a lower-pressure opening.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，先留白，再慢一点重开。',
            latestInflection: '这次要让身体先更安静一点，再把同一条线慢慢接回去。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The same remembered seam is visible again, so reopen gently instead of widening closeness too fast.',
        },
      } as any,
    })
    const voiceSummary = buildAlicizationVoiceSummary({
      language: 'zh-CN',
      pitchDelta: envelope?.speechStyle.pitchDelta,
      rateMultiplier: envelope?.speechStyle.rateMultiplier,
      companionshipMode: envelope?.rendererHints?.residentMode,
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: envelope?.rendererHints?.preferredBlinkCadence,
      preferredGazeMode: envelope?.rendererHints?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      segmentId: frame?.id,
    })
    const lipsyncSummary = buildAlicizationLipsyncSummary({
      mode: frame?.lipSync.mode,
      continuityHoldMs: frame?.lipSync.continuityHoldMs,
      companionshipMode: frame?.face.rendererHints?.residentMode,
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: frame?.face.rendererHints?.preferredBlinkCadence,
      preferredGazeMode: frame?.face.rendererHints?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      segmentId: frame?.id,
    })
    const faceSummary = buildAlicizationFaceSummary({
      emotion: frame?.face.emotion,
      facialCue: frame?.face.facialCue,
      expressionMode: frame?.face.expressionMode,
      residentMode: frame?.face.rendererHints?.residentMode,
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: frame?.face.rendererHints?.preferredBlinkCadence,
      preferredGazeMode: frame?.face.rendererHints?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      segmentId: frame?.id,
    })
    const motionSummary = buildAlicizationMotionSummary({
      actionCue: frame?.action.actionCue,
      attentionMode: frame?.action.actionMode,
      residentMode: frame?.action.rendererHints?.residentMode,
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: frame?.action.rendererHints?.preferredBlinkCadence,
      preferredGazeMode: frame?.action.rendererHints?.preferredGazeMode,
      reasonSummary: companionshipReasonSummary,
      segmentId: frame?.id,
    })

    expect(companionshipReasonSummary).toBe('The remembered return still needs a lower-pressure opening.')
    expect(voiceSummary).toContain('companion=measured-return')
    expect(voiceSummary).toContain('timing=audible-body-carry')
    expect(voiceSummary).toContain('blink=linger')
    expect(voiceSummary).toContain('gaze=soften')
    expect(voiceSummary).toContain('reason=The remembered return still needs a lower-pressure opening.')
    expect(lipsyncSummary).toContain('companion=measured-return')
    expect(lipsyncSummary).toContain('timing=audible-body-carry')
    expect(lipsyncSummary).toContain('blink=linger')
    expect(lipsyncSummary).toContain('gaze=soften')
    expect(lipsyncSummary).toContain('reason=The remembered return still needs a lower-pressure opening.')
    expect(faceSummary).toContain('mode=measured-return')
    expect(faceSummary).toContain('timing=audible-body-carry')
    expect(faceSummary).toContain('blink=linger')
    expect(faceSummary).toContain('gaze=soften')
    expect(faceSummary).toContain('reason=The remembered return still needs a lower-pressure opening.')
    expect(motionSummary).toContain('tail=measured-return')
    expect(motionSummary).toContain('timing=audible-body-carry')
    expect(motionSummary).toContain('blink=linger')
    expect(motionSummary).toContain('gaze=soften')
    expect(motionSummary).toContain('reason=The remembered return still needs a lower-pressure opening.')
  })

  it('keeps remembered-seam more-room measured-return frames quieter than ordinary measured-return at the final digital-life frame layer', () => {
    function createEnvelope(rendererHints: {
      residentMode: 'measured-return'
      preferredBlinkCadence: 'linger'
      preferredGazeMode: 'soften'
      preferredExpressionAliases: string[]
      preferredMotionAliases: string[]
    }) {
      return buildAlicizationDigitalLifeEnvelope({
        embodiment: {
          emotion: 'thinking',
          postureHint: 'hesitant',
          variationToken: 'turn-digital-life-remembered-seam-more-room',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 0.98,
          },
          rendererHints,
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-digital-life-remembered-seam-more-room',
          reply: '同一条线又回来了，所以我会先轻一点接住它。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-remembered-seam-more-room',
            index: 0,
            startOffset: 0,
            endOffset: 24,
            text: '同一条线又回来了，所以我会先轻一点接住它。',
            emotion: 'thinking',
            gestureWeight: 0.46,
            facialWeight: 0.52,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            headWeight: 0.38,
            facialHoldMs: 360,
            actionHoldMs: 320,
            emotionHoldMs: 380,
            settleMode: 'linger',
            rendererHints,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          }],
        } as any,
      })
    }

    const genericMeasuredReturn = createEnvelope({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['calm_inspect', 'soft-gaze'],
      preferredMotionAliases: ['observe_focus', 'stillness_guard'],
    })
    const rememberedSeamMoreRoom = createEnvelope({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    })

    expect(rememberedSeamMoreRoom?.frames[0]?.face.intensity).toBeLessThan(genericMeasuredReturn?.frames[0]?.face.intensity ?? 0)
    expect(rememberedSeamMoreRoom?.frames[0]?.action.intensity).toBeLessThan(genericMeasuredReturn?.frames[0]?.action.intensity ?? 0)
    expect(rememberedSeamMoreRoom?.frames[0]?.lipSync.mouthScale).toBeLessThan(genericMeasuredReturn?.frames[0]?.lipSync.mouthScale ?? 0)
  })

  it.each([
    ['audible carry audit', { signature: 'embodiment:audible-continuity-line', reasonTags: ['embodiment:body-lipsync-voice-rejoin'] }],
    ['body and voice audit', { signature: 'resident|main-runtime|embodiment:audible_continuity_line|body+voice-only', reasonTags: ['embodiment:body+voice-only'] }],
    ['body and lipsync audit', { reasonTags: ['embodiment:body+lipsync-only'] }],
    ['still voiced face audit', { reasonTags: ['embodiment:still-voiced-face-line'] }],
    ['still voiced motion audit', { reasonTags: ['embodiment:still-voiced-motion-line'] }],
  ] as const)('keeps %s tokens from changing the final digital-life frame', (_label, auditHints) => {
    function createEnvelope(rendererHints: {
      residentMode: 'same-thread-continuation'
      preferredBlinkCadence: 'linger'
      preferredGazeMode: 'soften'
      preferredExpressionAliases: string[]
      preferredMotionAliases: string[]
      signature?: string
      reasonTags?: readonly string[]
    }) {
      return buildAlicizationDigitalLifeEnvelope({
        embodiment: {
          emotion: 'thinking',
          postureHint: 'hesitant',
          variationToken: 'turn-digital-life-audit-token-carry',
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 0.98,
          },
          rendererHints,
          performance: {
            baseEmotion: 'thinking',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            actionCue: 'observe_focus',
            delivery: 'gentle',
            emphasis: 0,
          },
        },
        speechTimeline: {
          version: 'speech-timeline-v1',
          variationToken: 'turn-digital-life-audit-token-carry',
          reply: '我把这一段状态接回同一个动作计划里。',
          emotion: 'thinking',
          segments: [{
            id: 'segment-digital-life-audit-token-carry',
            index: 0,
            startOffset: 0,
            endOffset: 26,
            text: '我把这一段状态接回同一个动作计划里。',
            emotion: 'thinking',
            gestureWeight: 0.46,
            facialWeight: 0.52,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            headWeight: 0.38,
            facialHoldMs: 360,
            actionHoldMs: 320,
            emotionHoldMs: 380,
            settleMode: 'linger',
            rendererHints,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'none',
            interruptMode: 'soft-interrupt',
          }],
        } as any,
      })
    }

    const cleanSameThread = createEnvelope({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
    })
    const auditedSameThread = createEnvelope({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: ['soft-gaze', 'calm_inspect'],
      preferredMotionAliases: ['idle_settle', 'stillness_guard'],
      ...auditHints,
    })

    expect(cleanSameThread).not.toBeNull()
    expect(auditedSameThread).not.toBeNull()
    expect(auditedSameThread!.voice).toEqual(cleanSameThread!.voice)
    expect(auditedSameThread!.lipSync).toEqual(cleanSameThread!.lipSync)
    expect({
      ...auditedSameThread!.face,
      rendererHints: undefined,
    }).toEqual({
      ...cleanSameThread!.face,
      rendererHints: undefined,
    })
    expect({
      ...auditedSameThread!.action,
      rendererHints: undefined,
    }).toEqual({
      ...cleanSameThread!.action,
      rendererHints: undefined,
    })
    expect(auditedSameThread!.motor).toEqual(cleanSameThread!.motor)
    expect(auditedSameThread!.frames[0]?.voice).toEqual(cleanSameThread!.frames[0]?.voice)
    expect(auditedSameThread!.frames[0]?.lipSync).toEqual(cleanSameThread!.frames[0]?.lipSync)
    expect({
      ...auditedSameThread!.frames[0]?.face,
      rendererHints: undefined,
    }).toEqual({
      ...cleanSameThread!.frames[0]?.face,
      rendererHints: undefined,
    })
    expect({
      ...auditedSameThread!.frames[0]?.action,
      rendererHints: undefined,
    }).toEqual({
      ...cleanSameThread!.frames[0]?.action,
      rendererHints: undefined,
    })
    expect(auditedSameThread!.frames[0]?.motor).toEqual(cleanSameThread!.frames[0]?.motor)
  })

  it('normalizes structured continuity audible carry renderer hints through digital-life envelope ingress', () => {
    const envelope = normalizeAlicizationDigitalLifeEnvelope({
      version: 'digital-life-v1',
      variationToken: 'continuity-digital-life-ingress',
      emotion: 'thinking',
      mode: 'speaking',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        actionCue: 'observe_focus',
        delivery: 'gentle',
        emphasis: 0,
      },
      speechStyle: {
        pitchDelta: 0,
        rateMultiplier: 0.98,
      },
      rendererHints: {
        residentMode: 'same-thread-continuation',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        signature: 'embodiment:audible-continuity-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
      face: {
        emotion: 'thinking',
        facialCue: 'soft-gaze',
        expressionMode: 'hold',
        intensity: 0.46,
        holdMs: 320,
      },
      action: {
        actionCue: 'observe_focus',
        actionMode: 'hold',
        intensity: 0.22,
        holdMs: 280,
      },
      voice: {
        pitchDelta: 0,
        rateMultiplier: 0.98,
        energy: 0.44,
        cadence: 0.4,
      },
      lipSync: {
        mode: 'energy',
        visemeBias: 0.64,
        energyBias: 0.38,
        mouthScale: 0.92,
        continuityHoldMs: 240,
      },
      frames: [{
        id: 'continuity-frame',
        index: 0,
        startOffset: 0,
        endOffset: 15,
        text: '我沿着这条线接回来。',
        mode: 'speaking',
        settleMode: 'linger',
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.46,
          holdMs: 320,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-continuity-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.22,
          holdMs: 280,
          rendererHints: {
            residentMode: 'same-thread-continuation',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
            signature: 'embodiment:audible-continuity-line',
            reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
          },
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 0.98,
          energy: 0.44,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy',
          visemeBias: 0.64,
          energyBias: 0.38,
          mouthScale: 0.92,
          continuityHoldMs: 240,
        },
      }],
    } as any)

    expect(envelope?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(envelope?.frames[0]?.face.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
    expect(envelope?.frames[0]?.action.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'same-thread-continuation',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
  })

  it('keeps top-level bundle metadata strict when visual presence state is present', () => {
    const state = normalizeAlicizationDerivedMindStateBundle({
      visualPresenceState: {
        watchMode: 'symbiotic-vision',
        updatedAt: 1,
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 120000,
        currentInwardPreoccupation: 'host sustained focus',
      },
    })

    expect(state).toBeNull()
  })
})
