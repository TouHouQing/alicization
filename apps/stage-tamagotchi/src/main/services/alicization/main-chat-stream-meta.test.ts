import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationChatMetaSignature,
  createAlicizationChatStreamMetaEmitter,
  shouldEmitAlicizationChatMetaUpdate,
} from './main-chat-stream-meta'

vi.mock('./runtime-governance', () => ({
  buildAlicizationChatStreamEmbodimentMeta: ({ governance, reply, turnId }: { governance?: any, reply?: string, turnId?: string }) => {
    if (!governance) {
      return {
        governance: null,
        embodiment: null,
        speechTimeline: null,
      }
    }

    const normalizedReply = typeof reply === 'string' ? reply.trim() : ''
    return {
      governance,
      embodiment: {
        emotion: 'thinking',
        variationToken: `${turnId ?? 'turn'}-variation`,
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      },
      speechTimeline: normalizedReply
        ? {
            version: 'speech-timeline-v1',
            variationToken: `${turnId ?? 'turn'}-variation`,
            reply: normalizedReply,
            emotion: 'thinking',
            segments: [
              {
                id: 'segment-1',
                index: 0,
                startOffset: 0,
                endOffset: normalizedReply.length,
                text: normalizedReply,
                emotion: 'thinking',
                gestureWeight: 0.6,
                facialWeight: 0.5,
                prosodyWeight: 0.7,
                beatWeight: 0.4,
                emotionHoldMs: 360,
                settleMode: 'linger',
                rendererSettle: {
                  live2dMotionFollowThroughMs: 520,
                  vrmExpressionBlendMs: 380,
                },
                rendererHints: {
                  preferredExpressionAliases: ['CalmInspect'],
                  preferredMotionAliases: ['ObserveSoft'],
                },
                actionCue: 'lean-forward',
                facialCue: 'blink',
                actionWindow: 'segment-start',
                interruptMode: 'soft-interrupt',
              },
            ],
          }
        : null,
      embodimentScript: normalizedReply
        ? {
            version: 'embodiment-script-v1',
            decisionTraceId: governance?.decisionTraceId ?? null,
            turnId: turnId ?? 'turn',
            rendererTarget: 'live2d',
            replyText: normalizedReply,
            state: {
              baseEmotion: 'thinking',
              delivery: 'firm',
              emphasis: 0,
              residentMode: 'dialogue',
            },
            speechPlan: {
              segments: [{
                id: 'segment-1',
                index: 0,
                text: normalizedReply,
                interruptPolicy: 'soft-settle',
                preRollMs: 40,
                settleMs: 360,
              }],
              interruptPolicy: 'soft-settle',
              preRollMs: 40,
              settleMs: 360,
            },
            facePlan: {
              speakingCues: [{
                segmentId: 'segment-1',
                emotion: 'thinking',
                facialCue: 'blink',
                intensity: 0.5,
                holdMs: 360,
                preUtteranceCue: 'steady-inhale',
                postUtteranceCue: 'soft-release',
                source: 'prosody-authority',
                confidence: 0.94,
              }],
            },
            motionPlan: {
              idleBase: 'lean-forward',
              actionBursts: [{
                segmentId: 'segment-1',
                actionCue: 'lean-forward',
                intensity: 0.6,
                holdMs: 360,
                source: 'timeline-projection',
                confidence: 0.88,
              }],
              attentionMode: 'attentive',
            },
            lipsyncPlan: {
              mode: 'energy-phoneme-hybrid',
              visemeHints: [
                {
                  segmentId: 'segment-1',
                  viseme: 'closed',
                  weight: 0.62,
                  source: 'prosody-authority',
                  confidence: 0.94,
                },
                {
                  segmentId: 'segment-1',
                  viseme: 'E',
                  weight: 0.29,
                  source: 'prosody-authority',
                  confidence: 0.94,
                },
              ],
            },
          }
        : null,
    }
  },
  readStringValue: (value: unknown) => typeof value === 'string' ? value : '',
}))

describe('main chat stream meta', () => {
  it('dedupes unchanged embodiment meta signatures and tracks the last emitted reply', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-1',
      turnId: 'turn-1',
      getGovernance: () => ({
        decisionTraceId: 'trace-1',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      }),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.7,
        companionshipPressure: 0.76,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.84,
            focus: 'nudge',
            summary: 'active dialogue is hot',
          },
        ],
        summary: 'dominant=active-dialogue | speak=true',
      }),
      emit,
    })

    emitter.emit('先看这里')
    emitter.emit('先看这里')
    emitter.emit('先看这里。')

    expect(emit).toHaveBeenCalledTimes(2)
    const firstEmission = emit.mock.calls[0]?.[0]
    expect(firstEmission).toEqual(expect.objectContaining({
      cardId: 'card-1',
      turnId: 'turn-1',
      speechTimeline: expect.objectContaining({
        reply: '先看这里',
      }),
      digitalLifeSpine: expect.objectContaining({
        continuitySignal: expect.objectContaining({
          summary: expect.stringContaining('scene=coding'),
        }),
      }),
      runtimeDigest: expect.objectContaining({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
      }),
    }))
    expect(firstEmission?.embodimentScript?.version).toBe('embodiment-script-v1')
    expect(firstEmission?.embodimentScript?.turnId).toBe('turn-1')
    expect(firstEmission?.embodimentScript?.facePlan.speakingCues[0]).toEqual(expect.objectContaining({
      holdMs: 360,
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(firstEmission?.embodimentScript?.motionPlan.actionBursts[0]).toEqual(expect.objectContaining({
      holdMs: 360,
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(firstEmission?.embodimentScript?.lipsyncPlan.mode).toBe('energy-phoneme-hybrid')
    expect(firstEmission?.embodimentScript?.lipsyncPlan.visemeHints?.[0]).toEqual(expect.objectContaining({
      viseme: 'closed',
      source: 'prosody-authority',
      confidence: 0.94,
    }))
    expect(emit).toHaveBeenNthCalledWith(2, expect.objectContaining({
      embodimentScript: expect.objectContaining({
        version: 'embodiment-script-v1',
      }),
      speechTimeline: expect.objectContaining({
        reply: '先看这里。',
      }),
    }))
    expect(emitter.getLastReply()).toBe('先看这里。')
    expect(emitter.snapshot()).toEqual(expect.objectContaining({
      lastReply: '先看这里。',
      lastSignature: expect.any(String),
    }))
  })

  it('emits early for short openers and later only on stronger boundaries or growth', () => {
    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '你好呀',
      reply: '你好呀',
      previousReply: '',
    })).toBe(false)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '你好呀。',
      reply: '你好呀。',
      previousReply: '',
    })).toBe(true)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '，然后继续看这里',
      reply: '我先看着你操作，然后继续看这里',
      previousReply: '我先看着你操作',
    })).toBe(true)

    expect(shouldEmitAlicizationChatMetaUpdate({
      delta: '再补一点',
      reply: '我先看着你操作再补一点',
      previousReply: '我先看着你操作',
    })).toBe(false)
  })

  it('builds stable signatures from the dialogue-visible embodiment surface', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里。',
            emotion: 'thinking',
            gestureWeight: 0.6,
            facialWeight: 0.5,
            prosodyWeight: 0.7,
            beatWeight: 0.4,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dMotionFollowThroughMs: 520,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      } as any,
    })

    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 5,
            text: '先看这里。',
            emotion: 'thinking',
            gestureWeight: 0.6,
            facialWeight: 0.5,
            prosodyWeight: 0.7,
            beatWeight: 0.4,
            emotionHoldMs: 360,
            settleMode: 'linger',
            rendererSettle: {
              live2dMotionFollowThroughMs: 520,
              vrmExpressionBlendMs: 380,
            },
            rendererHints: {
              preferredExpressionAliases: ['CalmInspect'],
              preferredMotionAliases: ['ObserveSoft'],
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'inspect the current line',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: {
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
          supportingSystems: ['perception'],
          governingFocus: 'guide the current line',
          summary: 'dialogue leads while perception stays warm',
        },
        continuitySignal: {
          label: 'digital-life-line',
          summary: 'watch=symbiotic-vision | scene=coding | mode=tracking',
          signature: 'spine-1',
          createdAt: 1_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.7,
          shouldSpeak: false,
          activeThreadId: 'thread-1',
          activeThreadTitle: 'current line',
          dominantConcernKind: null,
          dominantConcernSummary: null,
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'recent=current line | goal=guide the current line',
          recentEpisodeSummary: 'current line',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the current line needs guidance',
          focusBeliefConfidence: 0.72,
          leadingGoalSummary: 'guide the current line',
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: 0.2,
          recallMode: 'working',
          recallSeed: 'current-line',
          thoughtThreadSummary: 'current line',
        },
      } as any,
    })

    expect(signatureA).toBe(signatureB)
  })

  it('treats extended renderer settle fields as signature-relevant', () => {
    const buildSignature = (rendererSettle: Record<string, number>) => buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-settle-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-settle-1',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-settle-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-settle-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle,
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(buildSignature({
      live2dFacialReleaseMs: 360,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 240,
      vrmExpressionBlendMs: 380,
    })).not.toBe(buildSignature({
      live2dFacialReleaseMs: 520,
      live2dMotionFollowThroughMs: 520,
      vrmActionFadeMs: 320,
      vrmExpressionBlendMs: 380,
    }))
  })

  it('changes the signature when the last segment renderer intent changes', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          rendererHints: {
            preferredExpressionAliases: ['CalmInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 200,
          settleMode: 'release',
          rendererSettle: {
            live2dMotionFollowThroughMs: 120,
            vrmExpressionBlendMs: 160,
          },
          rendererHints: {
            preferredExpressionAliases: ['SharperInspect'],
            preferredMotionAliases: ['ObserveSoft'],
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when Alicization runtime projection changes', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-1',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.72,
        companionshipPressure: 0.78,
        channels: [
          {
            id: 'active-dialogue',
            state: 'hot',
            readiness: 0.86,
            focus: 'nudge',
            summary: 'active dialogue hot',
          },
        ],
        summary: 'dominant=active-dialogue',
      },
    })
    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-1',
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-perception',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.44,
        companionshipPressure: 0.38,
        channels: [
          {
            id: 'active-perception',
            state: 'hot',
            readiness: 0.9,
            focus: 'editor',
            summary: 'active perception hot',
          },
        ],
        summary: 'dominant=active-perception',
      },
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when durable memory digest changes', () => {
    const signatureA = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-memory-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'mnemonic-passive',
          sceneScenario: 'coding',
          sceneSummary: 'runtime diff',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'runtime diff',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: {
          summary: 'durable=Remembered open loop: return to the runtime diff',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          thoughtThreadSummary: null,
          longHorizonSummary: 'Remembered open loop: return to the runtime diff',
          rememberedPreferenceSummary: 'Remembered preference: keep answers direct.',
          rememberedConstraintSummary: 'Remembered boundary: do not crowd the host while focused.',
          rememberedPlanSummary: 'Remembered open loop: return to the runtime diff',
          longHorizonCueCount: 2,
        },
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-memory-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'mnemonic-passive',
          sceneScenario: 'coding',
          sceneSummary: 'runtime diff',
          activeThreadId: 'thread-1',
          activeThreadTitle: 'runtime diff',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 1_000,
        },
        architecture: null,
        continuitySignal: null,
        proactive: null,
        embodiment: null,
        memory: {
          summary: 'durable=Remembered boundary: stay quiet while the host is focused',
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          thoughtThreadSummary: null,
          longHorizonSummary: 'Remembered boundary: stay quiet while the host is focused',
          rememberedPreferenceSummary: 'Remembered preference: keep answers direct.',
          rememberedConstraintSummary: 'Remembered boundary: stay quiet while the host is focused',
          rememberedPlanSummary: null,
          longHorizonCueCount: 1,
        },
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when the last segment settle window changes', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-1',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-1',
        reply: '先看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.7,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 120,
            vrmExpressionBlendMs: 180,
          },
          actionCue: 'lean-forward',
          facialCue: 'blink',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
    })

    expect(signatureA).not.toBe(signatureB)
  })
})
