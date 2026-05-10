import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeEnvelope,
} from './alicization-digital-life'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

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
