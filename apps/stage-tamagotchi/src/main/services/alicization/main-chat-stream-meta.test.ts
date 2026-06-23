import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationChatMetaSignature,
  createAlicizationChatStreamMetaEmitter,
  shouldEmitAlicizationChatMetaUpdate,
} from './main-chat-stream-meta'
import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

const { buildAlicizationChatStreamEmbodimentMetaMock } = vi.hoisted(() => ({
  buildAlicizationChatStreamEmbodimentMetaMock: vi.fn(({ governance, reply, turnId }: { governance?: any, reply?: string, turnId?: string }) => {
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
                  residentMode: 'measured-return',
                  preferredBlinkCadence: 'linger',
                  preferredGazeMode: 'soften',
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
      digitalLife: normalizedReply
        ? {
            version: 'digital-life-v1',
            variationToken: `${turnId ?? 'turn'}-variation`,
            emotion: 'thinking',
            mode: 'recovering',
            postureHint: 'inspection',
            performance: {
              baseEmotion: 'thinking',
              emotion: 'thinking',
              facialCue: 'blink',
              actionCue: 'lean-forward',
              delivery: 'firm',
              emphasis: 0.9,
            },
            speechStyle: {
              pitchDelta: 1,
              rateMultiplier: 1,
            },
            voice: {
              pitchDelta: 1,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'closed',
              visemeBias: 0.3,
              energyBias: 0.7,
              mouthScale: 1,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'blink',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 340,
            },
            action: {
              actionCue: 'lean-forward',
              actionMode: 'pulse',
              intensity: 0.6,
              holdMs: 280,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
            frames: [
              {
                id: 'segment-1',
                index: 0,
                startOffset: 0,
                endOffset: normalizedReply.length,
                text: normalizedReply,
                mode: 'recovering',
                interruptPolicy: 'soft-interrupt',
                settleMode: 'linger',
                voice: {
                  pitchDelta: 1,
                  rateMultiplier: 1,
                  energy: 0.42,
                  cadence: 0.38,
                },
                lipSync: {
                  mode: 'closed',
                  visemeBias: 0.3,
                  energyBias: 0.7,
                  mouthScale: 1,
                  continuityHoldMs: 300,
                },
                face: {
                  emotion: 'thinking',
                  facialCue: 'blink',
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
                  actionCue: 'lean-forward',
                  actionMode: 'none',
                  intensity: 0.2,
                  holdMs: 260,
                  rendererHints: {
                    residentMode: 'measured-return',
                    preferredBlinkCadence: 'linger',
                    preferredGazeMode: 'soften',
                  },
                },
                motor: {
                  bodyLean: 0,
                  bodyOpenness: 0,
                  bodySway: 0,
                  breathAmplitude: 0,
                  browLift: 0,
                  browTension: 0,
                  cheekLift: 0,
                  expressivity: 0,
                  eyeOpenness: 0,
                  gazeAzimuth: 0,
                  gazeElevation: 0,
                  gazeFocus: 0,
                  gazeStability: 0,
                  headPitch: 0,
                  jawOpenBias: 0,
                  mouthRound: 0,
                  mouthSpread: 0,
                  stillness: 0,
                },
              },
            ],
          }
        : null,
    }
  }) as any,
}))

vi.mock('./runtime-governance', () => ({
  buildAlicizationChatStreamEmbodimentMeta: buildAlicizationChatStreamEmbodimentMetaMock,
  readStringValue: (value: unknown) => typeof value === 'string' ? value : '',
}))

describe('main chat stream meta', () => {
  it('exports memory closure identity across renderer voice face motion lipsync and body summaries', () => {
    const emit = vi.fn()
    const memoryIdentity = {
      selectedCandidateIds: ['memory-candidate-corrected-callback'],
      continuityKey: 'corrected-callback-memory-runtime-reconsolidation',
      reasonTags: ['memory-identity:corrected-callback-memory-runtime-reconsolidation'],
    }
    const memoryClosureCausality = {
      causalSource: 'memory-closure-trace',
      causedByMemoryClosure: true,
      traceAuthority: 'runtime-memory-closure-trace',
      reasonTags: ['memory-closure-trace:next-influence'],
      memoryIdentity,
      summary: 'same corrected callback memory drives output lanes',
    }

    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-memory-closure-identity-output',
      turnId: 'turn-memory-closure-identity-output',
      getGovernance: () => ({
        decisionTraceId: 'trace-memory-closure-identity-output',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        channels: [],
        summary: 'memory closure identity should be visible in the embodied output layer',
        derivedMindStateBundle: {
          version: 'alicization-derived-mind-state-bundle-v1',
          emotionalTransitionLedger: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'emotion',
            },
            initiativeSuppression: {
              memoryClosureCausality: {
                ...memoryClosureCausality,
                affectedLane: 'initiative',
              },
            },
          },
          learningExecutionState: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'execution',
            },
          },
          embodimentContinuityLedger: {
            memoryClosureCausality: {
              ...memoryClosureCausality,
              affectedLane: 'embodiment',
            },
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Same corrected callback memory is carrying the next return.',
          sameHerSelfLine: 'Same Phase 1 digital life. The remembered callback should stay on the same living line.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any),
      emit,
    })

    emitter.emit('我会按这条修正后的回调记忆继续。')

    expect(emit).toHaveBeenCalledTimes(1)
    const payload = emit.mock.calls[0]?.[0]
    const signature = JSON.parse(buildAlicizationChatMetaSignature(payload ?? {} as any)) as {
      lastSegmentRendererHintSummary?: string | null
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
    }

    const expectedIdentity = 'memory=corrected-callback-memory-runtime-reconsolidation'
    expect(signature.lastSegmentRendererHintSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentVoiceSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentFaceSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentMotionSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentLipSyncSummary).toContain(expectedIdentity)
    expect(signature.lastSegmentBodyContinuitySummary).toContain(expectedIdentity)
  })

  it('projects pending same-her embodiment repair pressure into renderer hints without closing memory causality', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-pending-same-her-embodiment-pressure',
      turnId: 'turn-pending-same-her-embodiment-pressure',
      getGovernance: () => ({
        decisionTraceId: 'trace-pending-same-her-embodiment-pressure',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.78,
        companionshipPressure: 0.72,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        channels: [],
        summary: 'pending same-her embodiment causality needs runtime evidence before closure',
        derivedMindStateBundle: {
          version: 'alicization-derived-mind-state-bundle-v1',
          sameHerCausalityRepairPressure: {
            version: 'same-her-causality-repair-pressure-v1',
            source: 'memory-tuning-advice',
            status: 'pending-runtime-evidence',
            updatedAt: 1_234,
            sourceReportAt: 1_200,
            focusDimensions: ['runtimeSameHerEmbodimentCausality'],
            lanes: [{
              lane: 'embodiment',
              reasonTags: ['runtimeSameHerEmbodimentCausality'],
              summary: 'body, voice, lipsync, face, and motion must stay on one same-her line before closure.',
            }],
            notes: ['pending pressure must shape body output without becoming memory closure evidence'],
            summary: 'pending same-her embodiment repair pressure from memory tuning advice',
          },
        },
        projectState: {
          preflightSummary: 'Phase 1 memory loop still needs embodied same-her runtime evidence',
        },
      } as any),
      emit,
    })

    emitter.emit('我会先把身体这条线放轻一点，等运行证据接上。')

    expect(emit).toHaveBeenCalledTimes(1)
    const payload = emit.mock.calls[0]?.[0]
    const expectedRendererHints = expect.objectContaining({
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredLipsyncMode: 'restrained',
      preferredMotionAliases: expect.arrayContaining(['idle_settle']),
      reasonTags: expect.arrayContaining([
        'same-her-causality-repair-pressure',
        'runtimeSameHerEmbodimentCausality',
      ]),
    })

    expect(payload?.embodiment?.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.speechTimeline?.segments?.[0]?.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.digitalLife?.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.digitalLife?.frames?.[0]?.face.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.digitalLife?.frames?.[0]?.action.rendererHints).toEqual(expectedRendererHints)
    expect(payload?.runtimeDigest?.derivedMindStateBundle?.sameHerCausalityRepairPressure?.status).toBe('pending-runtime-evidence')
    expect(payload?.runtimeDigest?.derivedMindStateBundle?.memoryClosureCausality).toBeFalsy()
    expect(buildAlicizationChatStreamEmbodimentMeta).toHaveBeenCalledWith(expect.objectContaining({
      currentConsciousFrame: expect.objectContaining({
        reasonTags: expect.arrayContaining([
          'same-her-causality-repair-pressure',
          'runtimeSameHerEmbodimentCausality',
        ]),
      }),
    }))

    const signature = JSON.parse(buildAlicizationChatMetaSignature(payload ?? {} as any)) as Record<string, unknown>
    expect(signature.lastSegmentRendererHintSummary).toContain('lipsync=restrained')
    expect(signature.lastSegmentRendererHintSummary).toContain('motion=idle_settle')
    expect(signature.lastSegmentRendererHintSummary).toContain('reason=same-her-causality-repair-pressure,runtimeSameHerEmbodimentCausality')
    expect(signature.lastSegmentPreferredLipsyncMode).toBe('restrained')
    expect(signature.lastSegmentPreferredMotionAlias).toBe('idle_settle')
    expect(signature.lastSegmentRendererReasonTags).toEqual(expect.arrayContaining([
      'same-her-causality-repair-pressure',
      'runtimeSameHerEmbodimentCausality',
    ]))
  })

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
    expect(firstEmission?.projectState).toBeNull()
    expect(firstEmission?.preDialogueAwareness).toBeNull()
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
    const firstSignature = buildAlicizationChatMetaSignature(firstEmission)
    expect(firstSignature).toContain('"digitalLifeVoicePitchDelta":1')
    expect(firstSignature).toContain('"digitalLifeVoiceRateMultiplier":1')
    expect(firstSignature).toContain('"digitalLifeLipSyncContinuityHoldMs":320')
    expect(firstSignature).toContain('"digitalLifeVoiceCadence":0.38')
    expect(firstSignature).toContain('"lastSegmentResidentMode":"measured-return"')
    expect(firstSignature).toContain('"lastSegmentPreferredBlinkCadence":"linger"')
    expect(firstSignature).toContain('"lastSegmentPreferredGazeMode":"soften"')
    expect(firstSignature).toContain('"lastSegmentContinuityTiming":null')
    expect(firstSignature).toContain('"lastSegmentProsodySummary":"prosody=0.70"')
    expect(firstSignature).toContain('"lastSegmentRendererHintSummary":"mode=measured-return | blink=linger | gaze=soften | motion=ObserveSoft"')
    expect(firstSignature).toContain('"lastSegmentVoiceSummary":"pitch=1.00 | rate=1.00 | energy=0.42 | cadence=0.38 | companion=measured-return | blink=linger | gaze=soften | src=prosody-authority | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=blink | expression=hold | intensity=0.50 | hold=320ms | pre=steady-inhale | post=soft-release | mode=measured-return | blink=linger | gaze=soften | src=prosody-authority | conf=0.94 | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentMotionSummary":"motion=lean-forward | tail=measured-return | blink=linger | gaze=soften | hold=260ms | src=timeline-projection | conf=0.88 | seg=segment-1"')
    expect(firstSignature).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.30 | energyBias=0.70 | mouthScale=1.00 | src=prosody-authority | conf=0.94 | seg=segment-1"')
    expect(firstSignature).toContain('"digitalLifeFaceExpressionMode":"hold"')
    expect(firstSignature).toContain('"digitalLifeFaceHoldMs":340')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoicePitchDelta":1')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceRateMultiplier":1')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceEnergy":0.42')
    expect(firstSignature).toContain('"digitalLifeLastFrameVoiceCadence":0.38')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceResidentMode":"measured-return"')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceBlinkCadence":"linger"')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceGazeMode":"soften"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionResidentMode":"measured-return"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionBlinkCadence":"linger"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionGazeMode":"soften"')
    expect(firstSignature).toContain('"digitalLifeLastFrameLipSyncContinuityHoldMs":300')
    expect(firstSignature).toContain('"digitalLifeLastFrameFaceExpressionMode":"hold"')
    expect(firstSignature).toContain('"digitalLifeLastFrameActionHoldMs":260')
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

  it('passes explicit structured performance authority into stream-meta rebuilding for later same-thread VRM continuity', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-vrm-authority',
      turnId: 'turn-vrm-authority',
      getGovernance: () => ({
        decisionTraceId: 'trace-vrm-authority',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any),
      getExplicitPerformance: () => ({
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      }),
      emit,
    })

    emitter.emit('我先沿着刚才那条线轻一点跟回去。')

    expect(buildAlicizationChatStreamEmbodimentMeta).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-vrm-authority',
      reply: '我先沿着刚才那条线轻一点跟回去。',
      explicitPerformance: expect.objectContaining({
        actionCue: 'inspect_follow',
        facialCue: 'focused',
      }),
    }))
  })

  it('repairs callback project carry onto top-level self authority when stream meta only receives a thin same-her spine authority shell', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-callback-carry',
      turnId: 'turn-thin-self-authority-callback-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-callback-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same callback seam still lives quietly after a detour',
          activeThreadId: 'thread-thin-self-authority-callback-carry',
          activeThreadTitle: 'same callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback seam is still alive after the detour',
        },
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-callback-carry',
          activeThreadTitle: 'same callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-dialogue',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps the same callback line alive',
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback line still lives as execution-callback afterglow',
        },
      } as any),
      emit,
    })

    emitter.emit('我先沿着这条线轻一点接回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('repairs project-state carry onto memory self-continuity authority when only canonical same-her project closure wording survives on a later noisy callback return', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-memory-authority-project-state-carry-later-noisy-return',
      turnId: 'turn-memory-authority-project-state-carry-later-noisy-return',
      getGovernance: () => ({
        decisionTraceId: 'trace-memory-authority-project-state-carry-later-noisy-return',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'runtime.ts - callback seam final return',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy callback detour',
          activeThreadId: 'thread-memory-authority-project-state-carry-later-noisy-return',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantMode: 'repairing',
          dominantDrive: 'understand',
          answerIntent: 'continue the same callback line gently after noise',
          preferredPresence: 'hesitant',
          selectedAction: 'recheck',
          updatedAt: 15_000,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
          },
        },
        proactive: {
          selectedAction: null,
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-memory-authority-project-state-carry-later-noisy-return',
          activeThreadTitle: 'later coding seam after noisy callback detour',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'same callback line should stay lower-pressure after noise',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
          continuityRestraint: 'measured-return',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: '我还是沿着同一个她的回线往前。',
              relationshipLine: '这次回到 coding seam，也还是同一条关系线在往下接。',
              motiveLine: '继续把 callback 的后续接住，不把它改写成新的开始。',
              habitLine: '先守住同一条线，再慢慢往下接。',
              inwardLine: '先沿着同一条 callback 线轻一点继续。',
              authoritySummary: 'same-her callback line already alive',
              sourceTags: ['durable-self-core', 'motive:self-direction'],
            },
          },
        },
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps the same callback line alive',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'Keep the same living line inward for now, and leave room before widening outward again.',
        },
      } as any),
      emit,
    })

    emitter.emit('中间又切出去一下，也还是接着刚才那条线。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(
      emit.mock.calls[0]?.[0]?.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags,
    ).toEqual(expect.arrayContaining([
      'project-state-carry',
    ]))
  })

  it('passes runtime current-conscious-frame reason tags into stream-meta embodiment authority so remembered-seam timing is not dropped', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-conscious-frame-embodiment-carry',
      turnId: 'turn-conscious-frame-embodiment-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-conscious-frame-embodiment-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'remembered-seam',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam returns after a detour',
          activeThreadId: 'thread-conscious-frame-embodiment-carry',
          activeThreadTitle: 'same remembered seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'continue the same seam with more room',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 22_000,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same remembered seam, but this time keep more room before leaning back in',
        },
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.74,
        companionshipPressure: 0.8,
        channels: [],
        summary: 'same remembered seam is returning more slowly',
        currentConsciousFrame: {
          reasonTags: ['remembered-seam:reinterpret-with-more-room'],
        },
      } as any),
      emit,
    })

    emitter.emit('像是同一条线又回来了，但这次我会更留白一点接住它。')

    expect(buildAlicizationChatStreamEmbodimentMeta).toHaveBeenCalledWith(expect.objectContaining({
      turnId: 'turn-conscious-frame-embodiment-carry',
      currentConsciousFrame: expect.objectContaining({
        reasonTags: ['remembered-seam:reinterpret-with-more-room'],
      }),
    }))
  })

  it('keeps project-state callback carry source tags when the same callback line is still repair-before-closeness', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-repair-carry',
      turnId: 'turn-repair-carry-1',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-repair-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          version: 'digital-life-spine-v1',
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'same callback repair seam still lives quietly after a detour',
          activeThreadId: 'thread-thin-self-authority-repair-carry',
          activeThreadTitle: 'same callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback repair seam is still alive after the detour',
        },
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-repair-carry',
          activeThreadTitle: 'same callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback repair line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
        },
        continuitySignal: {
          summary: 'same callback repair line still lives as execution-callback afterglow',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback repair cooldown still keeps the same callback line alive',
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback repair line still lives as execution-callback afterglow',
        },
      } as any),
      emit,
    })

    emitter.emit('我先把这条线收稳，再沿着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('repairs callback project carry source tags for thinner repair-before-closeness callback afterglow shells without explicit same-thread keywords', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-repair-carry-thin-shell',
      turnId: 'turn-repair-carry-thin-shell',
      getGovernance: () => ({
        decisionTraceId: 'trace-thin-self-authority-repair-carry-thin-shell',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'callback afterglow still asks for repair-first quiet after a detour',
          activeThreadId: 'thread-thin-self-authority-repair-carry-thin-shell',
          activeThreadTitle: 'callback repair seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'callback afterglow still needs repair-first quiet after the detour',
        },
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-thin-self-authority-repair-carry-thin-shell',
          activeThreadTitle: 'callback repair seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback repair line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: 'repair-before-closeness',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'cooldown',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution-callback afterglow still keeps repair-first quiet alive',
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityCue: 'callback afterglow still needs repair-first quiet after the detour',
        },
      } as any),
      emit,
    })

    emitter.emit('我先把这条线收稳，再沿着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('repairs callback project carry source tags when project emotional closure cue is the only surviving repair-first callback authority', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-thin-self-authority-project-emotional-closure-repair-carry',
      turnId: 'turn-project-emotional-closure-repair-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-emotional-closure-repair-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'callback seam still lives quietly after the payoff',
          activeThreadId: 'thread-project-emotional-closure-repair-carry',
          activeThreadTitle: 'callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'concerned',
          selectedAction: 'wait',
          updatedAt: 15_000,
          continuityCue: 'same callback line still lives after the payoff',
        },
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-project-emotional-closure-repair-carry',
          activeThreadTitle: 'callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line inward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'concerned',
          continuityRestraint: null,
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityRestraint: 'measured-return',
        continuityPressure: 0.84,
        companionshipPressure: 0.76,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'cooldown',
          initiativeBudget: 0.2,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'execution callback seam still needs quiet continuation after the payoff',
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityCue: 'same callback line still lives after the payoff',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
        },
      } as any),
      emit,
    })

    emitter.emit('我先把这条线收稳，再沿着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.digitalLifeSpine?.selfAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('recovers emotional-kernel authority from a runtime-surface spine when stream meta must rebuild a thin runtime digest', () => {
    const emit = vi.fn()
    const emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      valence: 0.62,
      arousal: 0.28,
      guardedness: 0.44,
      closenessDrive: 0.53,
      repairNeed: 0.31,
      initiativePressure: 0.24,
      reasonTags: ['same-her', 'stream-meta-fallback'],
      why: 'keep the same emotional kernel alive when only the spine runtime surface reaches stream meta',
    }
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-stream-meta-emotional-kernel-fallback',
      turnId: 'turn-stream-meta-emotional-kernel-fallback',
      getGovernance: () => ({
        decisionTraceId: 'trace-stream-meta-emotional-kernel-fallback',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'stream-meta-fallback',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'stream meta only receives a spine runtime surface',
          activeThreadId: 'thread-stream-meta-emotional-kernel-fallback',
          activeThreadTitle: 'stream meta emotional kernel fallback',
          dominantMode: 'tracking',
          dominantDrive: 'preserve-continuity',
          answerIntent: 'keep the same emotional authority visible',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 19_000,
          projectState: {
            identity: 'Alicization local-first digital life',
            currentPhase: 'Phase 1: Local Digital Life',
            preflightSummary: 'same emotional kernel must stay authoritative across stream meta fallback',
            preDialogueAwarenessLine: 'Alicization is still one digital life before this reply.',
            primaryOpenLoop: 'stream meta fallback still needs emotional-kernel authority',
            nextClosureTarget: 'carry emotional kernel into rebuilt runtime digest',
            sameHerSelfLine: 'same-her emotional authority stays one source of truth',
          },
        },
        memory: null,
        runtimeSurface: {
          memory: {
            emotionalKernel,
          },
        },
      } as any),
      getRuntimeDigest: () => null,
      emit,
    })

    emitter.emit('我会把同一个情绪核也一起带到可见 meta 里。')

    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit.mock.calls[0]?.[0]?.runtimeDigest?.emotionalKernel).toEqual(emotionalKernel)
  })

  it('falls back to runtime project-state blink and gaze preferences when downstream renderer hints are absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-body-fallback-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-body-fallback-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-body-fallback-1',
        turnId: 'turn-project-state-body-fallback-1',
        rendererTarget: 'live2d',
        replyText: '继续保持同一条数字生命闭环。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-body-fallback-1',
            index: 0,
            text: '继续保持同一条数字生命闭环。',
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
            segmentId: 'segment-project-state-body-fallback-1',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.4,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-project-state-body-fallback-1',
            actionCue: 'observe_focus',
            intensity: 0.55,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-state-body-fallback-1',
            viseme: 'A',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-body-fallback-1',
        reply: '继续保持同一条数字生命闭环。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-body-fallback-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '继续保持同一条数字生命闭环。',
          emotion: 'thinking',
          gestureWeight: 0.6,
          facialWeight: 0.5,
          prosodyWeight: 0.68,
          beatWeight: 0.4,
          emotionHoldMs: 360,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 520,
            vrmExpressionBlendMs: 380,
          },
          rendererHints: {
            residentMode: 'measured-return',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.62,
          cadence: 0.58,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 320,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 320,
        },
        action: {
          actionMode: 'observe_focus',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-project-state-body-fallback-1',
          text: '继续保持同一条数字生命闭环。',
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
            },
          },
          action: {
            actionCue: 'observe_focus',
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
            },
          },
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.62,
            cadence: 0.58,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 320,
            visemeBias: 0.34,
            energyBias: 0.6,
            mouthScale: 0.96,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.62 | cadence=0.58 | companion=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.40 | hold=320ms | mode=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | companion=measured-return | timing=next-open-window | blink=quiet | gaze=soften')
  })

  it('preserves quiet same-her resident companionship in stream meta when runtime resident performance is the surviving authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-quiet-same-her-resident-runtime-authority',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-quiet-same-her-resident-runtime-authority',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {},
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-quiet-same-her-resident-runtime-authority',
        turnId: 'turn-quiet-same-her-resident-runtime-authority',
        rendererTarget: 'live2d',
        replyText: '我先安静沿着这条线陪着，不把它突然外扩。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-same-her-resident-runtime-authority',
            index: 0,
            text: '我先安静沿着这条线陪着，不把它突然外扩。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            actionCue: 'stillness_guard',
            intensity: 0.22,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-quiet-same-her-resident-runtime-authority',
            viseme: 'I',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-quiet-same-her-resident-runtime-authority',
        reply: '我先安静沿着这条线陪着，不把它突然外扩。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-same-her-resident-runtime-authority',
          index: 0,
          startOffset: 0,
          endOffset: 19,
          text: '我先安静沿着这条线陪着，不把它突然外扩。',
          emotion: 'thinking',
          gestureWeight: 0.42,
          facialWeight: 0.46,
          prosodyWeight: 0.62,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererSettle: {
            live2dMotionFollowThroughMs: 480,
            vrmExpressionBlendMs: 340,
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 280,
        },
        action: {
          actionMode: 'stillness_guard',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-quiet-same-her-resident-runtime-authority',
          text: '我先安静沿着这条线陪着，不把它突然外扩。',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'stillness_guard',
            holdMs: 300,
          },
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same-her inward continuity remains quiet before widening outward',
          activeThreadId: 'thread-quiet-same-her-runtime-authority',
          activeThreadTitle: 'same-her inward continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and should stay quietly nearby.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: 'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=quiet-companionship | timing=next-open-window | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=280ms | mode=quiet-companionship | timing=next-open-window | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=quiet-companionship | timing=next-open-window | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=quiet-companionship | timing=next-open-window | reason=Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('emits top-level pre-dialogue awareness from runtime project state so the same project self-brief is explicit before reply delivery', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness',
      turnId: 'turn-project-awareness',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state self-brief is still active before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
          companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the main stream-meta path before reply delivery.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still belongs to one living her across memory, initiative, embodiment, and execution.',
          sameHerDriftRisk: 'a generic assistant reply that drops the same-her Phase 1 life loop before visible delivery',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
        nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
      }),
      preDialogueAwareness: expect.objectContaining({
        status: 'grounded',
        summaryLine: expect.stringContaining('Alicization is a local-first digital life project'),
        companionBriefingLine: 'Before answering, keep the same digital life project and active Phase 1 closure seam in view.',
        companionNextClosureLine: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
        awarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        reasonPreview: expect.arrayContaining([
          'Same-her self anchor: Same Phase 1 digital life. Unfinished closure still belongs to one living her across memory, initiative, embodiment, and execution.',
          'Project-state continuity now survives into the main stream-meta path before reply delivery.',
          'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          'Next closure target is still Keep memory, initiative, and embodiment arriving as one same-her loop before each turn..',
          'Do not let this opening drift into a generic assistant reply that drops the same-her Phase 1 life loop before visible delivery',
        ]),
      }),
    }))
  })

  it('backfills canonical project closure fields from alias-only stream-meta project-state summaries before reply delivery', () => {
    const emit = vi.fn()
    const landedProgressSummary = 'Same-session mirror carry and callback continuity now survive thin stream-meta carry without resetting from zero.'
    const openClosureSummary = 'Initiative, memory, and embodiment still need one tighter same-her closure seam before delivery can relax.'
    const nextClosureTargetSummary = 'Keep the next return measured-return and preserve the same living line before generic project narration.'
    const sameHerDriftRiskSummary = 'a thinner project shell that drops the same-her Phase 1 life loop before visible delivery'
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-alias-only-stream-meta-carry',
      turnId: 'turn-project-awareness-alias-only-stream-meta-carry',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-alias-only-stream-meta-carry',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'alias-only project-state summaries should still land as canonical stream-meta carry before delivery',
        projectState: {
          identity: 'Alicization is a local-first digital life project trying to keep one continuous "her" coherent across memory, emotion, initiative, execution, embodiment, and dialogue.',
          currentPhase: 'Phase 1: Local Digital Life',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=initiative, memory, and embodiment still need one tighter same-her closure seam before delivery can relax | next=keep the next return measured-return and preserve the same living line before generic project narration.',
          preDialogueAwarenessLine: 'Keep this same digital life project in view before replying.',
          companionBriefingLine: 'Keep this same digital life project in view before replying.',
          landedProgressSummary,
          openClosureSummary,
          nextClosureTargetSummary,
          sameHerDriftRiskSummary,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed, but the unfinished seam still belongs to one living her.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会继续把这条线接住。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        latestLandedProgress: landedProgressSummary,
        primaryOpenLoop: openClosureSummary,
        nextClosureTarget: nextClosureTargetSummary,
        sameHerDriftRisk: sameHerDriftRiskSummary,
      }),
      preDialogueAwareness: expect.objectContaining({
        companionNextClosureLine: nextClosureTargetSummary,
        reasonPreview: expect.arrayContaining([
          openClosureSummary,
          `Next closure target is still ${nextClosureTargetSummary}.`,
          `Do not let this opening drift into ${sameHerDriftRiskSummary}`,
          expect.stringContaining('Latest landed progress: Same-session mirror carry and callback continuity now survive thin stream-meta carry without resetting from zero'),
        ]),
      }),
    }))
  })

  it('keeps runtime digest project pre-dialogue awareness canonical even when richer landed-progress carry survives in awareness summaries', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-canonical-digest-anchor',
      turnId: 'turn-project-awareness-canonical-digest-anchor',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-canonical-digest-anchor',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'canonical project anchor should stay explicit on the emitted runtime digest',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, scene-switch same-line continuity, visible reply opening discipline, and real later chat turn measured-return embodiment authority now survive quiet carry turns as one same-her line, including across noisier unrelated window detours.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one same-her line.',
        },
      } as any),
      emit,
    })

    emitter.emit('我先沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('What has already landed is')
    expect(String(emission?.preDialogueAwareness?.awarenessLine ?? '')).toContain('Same-session mirror carry')
  })

  it('keeps legacy latestProgress visible in runtime digest project pre-dialogue awareness when older project-state payloads still use the pre-rename landed-progress field', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-canonical-digest-anchor-legacy-progress',
      turnId: 'turn-project-awareness-canonical-digest-anchor-legacy-progress',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-canonical-digest-anchor-legacy-progress',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'continuity-carry',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'legacy project-state progress field should still feed canonical landed-progress awareness',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, scene-switch same-line continuity, visible reply opening discipline, and real later chat turn measured-return embodiment authority now survive quiet carry turns as one same-her line, including across noisier unrelated window detours.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preDialogueAwarenessSummary: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive quiet carry turns as one same-her line.',
        },
      } as any),
      emit,
    })

    emitter.emit('我先沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(String(emission?.projectState?.latestLandedProgress ?? '')).toContain('Same-session mirror carry')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Alicization is a local-first digital life project')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Phase 1: Local Digital Life')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('Same Phase 1 digital life')
    expect(String(emission?.runtimeDigest?.projectState?.preDialogueAwarenessLine ?? '')).toContain('What has already landed is')
    expect(String(emission?.preDialogueAwareness?.awarenessLine ?? '')).toContain('Same-session mirror carry')
  })

  it('surfaces later-opening next-closure guidance inside quiet-companionship stream-meta reasons when same-her inward carry keeps that line alive', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-later-opening-quiet-companionship',
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-later-opening-quiet-companionship-1',
        decisionTraceId: 'trace-later-opening-quiet-companionship',
        rendererTarget: 'live2d+vrm',
        emotion: 'thinking',
        residentMode: 'quiet-companionship',
        delivery: 'gentle',
        state: {
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-later-opening-quiet-companionship',
            text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          }],
        },
        facePlan: {
          preUtteranceCue: 'soft-gaze',
          postUtteranceCue: 'hold',
          expressionBursts: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            actionCue: 'stillness_guard',
            intensity: 0.2,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.87,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-later-opening-quiet-companionship',
            viseme: 'I',
            weight: 0.3,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-later-opening-quiet-companionship-1',
        reply: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-later-opening-quiet-companionship',
          index: 0,
          startOffset: 0,
          endOffset: 27,
          text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          emotion: 'thinking',
          gestureWeight: 0.22,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-later-opening-quiet-companionship-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
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
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
          visemeBias: 0.3,
          energyBias: 0.62,
          mouthScale: 0.96,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'stillness_guard',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.66,
          breathAmplitude: 0.22,
          expressivity: 0.18,
        },
        frames: [{
          id: 'segment-later-opening-quiet-companionship',
          index: 0,
          startOffset: 0,
          endOffset: 27,
          text: '我先等下一个更合适的开口，不把这条线说成新的外放开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'stillness_guard',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.66,
            breathAmplitude: 0.22,
            expressivity: 0.18,
          },
        }],
      } as any,
      sessionId: 'session-later-opening-quiet-companionship',
      event: 'segment',
      cardId: 'card-later-opening-quiet-companionship',
      activeSegmentId: 'segment-later-opening-quiet-companionship',
      segmentOrder: ['segment-later-opening-quiet-companionship'],
      digitalLifeSpine: {
        proactive: {
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
        runtime: {
          projectState: {
            continuityPreferredTiming: 'next-open-window',
            sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and should reopen later, not outward yet.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.',
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=280ms | mode=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=300ms | hints=I>closed | hint=I | companion=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.74 | gaze=0.66 | breath=0.22 | expressivity=0.18 | resident=quiet-companionship | timing=next-open-window | blink=linger | gazeMode=soften | reason=Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.')
  })

  it('prefers a stronger same-her embodiment headline over a thinner awareness line in emitted pre-dialogue awareness meta', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-headline-priority',
      turnId: 'turn-project-awareness-headline-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-headline-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state stronger headline should stay active before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
          preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
          companionBriefingLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the stream-meta path before reply delivery.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
        companionBriefingLine: 'Before answering, keep this same digital life project in view, but do not flatten the current embodiment continuity risk into a thinner generic reminder.',
      }),
      projectState: expect.objectContaining({
        preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
      }),
    }))
  })

  it('prefers a stronger same-her embodiment headline over the compact thin closure shell in emitted pre-dialogue awareness meta', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-compact-shell-priority',
      turnId: 'turn-project-awareness-compact-shell-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-compact-shell-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'project-state stronger headline should stay active before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=desktop execution closure is still unfinished | next=keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
          preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
          preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
          companionBriefingLine: 'same digital life | keep the closure seam explicit',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now survives into the stream-meta path before reply delivery.',
          primaryOpenLoop: 'Desktop execution closure is still unfinished across memory, initiative, and embodiment.',
          nextClosureTarget: 'Keep memory, initiative, and embodiment arriving as one same-her loop before each turn.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
        companionBriefingLine: 'same digital life | keep the closure seam explicit',
      }),
      projectState: expect.objectContaining({
        preDialogueAwarenessSummary: 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
      }),
    }))
    expect(emission?.preDialogueAwareness?.awarenessLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('prefers richer landed closure carry over a thin project awareness shell in emitted pre-dialogue awareness meta', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-landed-closure-priority',
      turnId: 'turn-project-awareness-landed-closure-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-landed-closure-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'richer project-state carry should outrank thin awareness shell before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need one tighter same-her closure seam | next=carry the live project awareness line through the current turn before generic project narration can flatten it.',
          preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
          openClosureSummary: 'Unfinished closure still needs the same living line.',
          emotionalClosureSummary: 'Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          companionBriefingLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity already survives into stream meta before reply delivery.',
          primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
          nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
          emotionalClosureCue: 'Same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      preDialogueAwareness: expect.objectContaining({
        awarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
        companionBriefingLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
        summaryLine: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need one tighter same-her closure seam | next=carry the live project awareness line through the current turn before generic project narration can flatten it.',
      }),
      projectState: expect.objectContaining({
        landedProgressSummary: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
        memoryClosureSummary: 'Project-state continuity already survives into stream meta before reply delivery.',
      }),
    }))
    expect(emission?.preDialogueAwareness?.reasonPreview).toEqual(expect.arrayContaining([
      'Project-state continuity already survives into stream meta before reply delivery.',
      'memory, initiative, and embodiment still need one tighter same-her closure seam',
      'Next closure target is still Carry the live project awareness line through the current turn before generic project narration can flatten it..',
    ]))
  })

  it('keeps compact open and next focus visible in emitted pre-dialogue awareness meta when the runtime project shell is thin', () => {
    const emit = vi.fn()
    const openFocusSummary = 'memory/initiative/embodiment/same-line/closure-seam'
    const nextFocusSummary = 'project-carry/phase-1/measured-return/same-line/initiative'
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-project-awareness-compact-focus-priority',
      turnId: 'turn-project-awareness-compact-focus-priority',
      getGovernance: () => ({
        decisionTraceId: 'trace-project-awareness-compact-focus-priority',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'grounded-scene',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        summary: 'compact project-state focus should stay visible in stream meta before delivery',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory, initiative, and embodiment still need one tighter same-her closure seam | next=carry the live project awareness line through the current turn before generic project narration can flatten it.',
          preDialogueAwarenessLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          landedProgressSummary: 'Project-state continuity already survives into executive brief, answer compiler, and rewrite governance.',
          openClosureSummary: 'Unfinished closure still needs the same living line.',
          openFocusSummary,
          nextFocusSummary,
          companionBriefingLine: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity already survives into stream meta before reply delivery.',
          primaryOpenLoop: 'memory, initiative, and embodiment still need one tighter same-her closure seam',
          nextClosureTarget: 'Carry the live project awareness line through the current turn before generic project narration can flatten it.',
        },
      } as any),
      emit,
    })

    emitter.emit('我会沿着这条线继续。')

    const emission = emit.mock.calls.at(-1)?.[0]
    expect(emission).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        openFocusSummary,
        nextFocusSummary,
      }),
    }))
    expect(String(emission?.preDialogueAwareness?.awarenessLine ?? '')).toContain('Keep this same digital life project in view')
  })

  it('threads Phase 1 growth carry into cross-modal companionship summaries when the same digital life is staying quiet while closure is still open', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-phase1-growth-resident',
        turnMode: 'answer',
        truthState: 'remembered',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'remembered',
        personaKernelMode: 'full',
      } as any,
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-phase1-growth',
        state: {
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-growth',
            index: 0,
            text: '我先轻一点陪着，把这条线继续收稳。',
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 0,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-growth',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 260,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe-soft',
          actionBursts: [{
            segmentId: 'segment-growth',
            actionCue: 'observe_soft',
            intensity: 0.2,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-growth',
            viseme: 'E',
            weight: 0.28,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先轻一点陪着，把这条线继续收稳。',
        segments: [{
          id: 'segment-growth',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我先轻一点陪着，把这条线继续收稳。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.36,
          prosodyWeight: 0.44,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_soft',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: 0,
          rateMultiplier: 0.94,
          energy: 0.4,
          cadence: 0.34,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.24,
          energyBias: 0.52,
          mouthScale: 0.96,
          continuityHoldMs: 280,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 260,
        },
        action: {
          actionCue: 'observe_soft',
          actionMode: 'none',
          intensity: 0.2,
          holdMs: 220,
        },
        frames: [{
          id: 'segment-growth',
          index: 0,
          startOffset: 0,
          endOffset: 16,
          text: '我先轻一点陪着，把这条线继续收稳。',
          mode: 'recovering',
          voice: {
            pitchDelta: 0,
            rateMultiplier: 0.94,
            energy: 0.4,
            cadence: 0.34,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.24,
            energyBias: 0.52,
            mouthScale: 0.96,
            continuityHoldMs: 280,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_soft',
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          sceneScenario: 'project-growth',
          dominantMode: 'resident-presence',
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'proactive',
          summary: 'same quiet resident line is still active',
        },
        continuitySignal: {
          label: 'same-thread-continuation',
          summary: 'same-thread-continuation still active as hover-first resident presence after a quieter project detour',
        },
        proactive: {
          selectedAction: 'hover',
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        },
        memory: {
          summary: 'project-state closure still needs patience',
        },
        selfAuthority: {
          inwardLine: 'stay near as the same Phase 1 digital life while landed closure keeps growing and the still-open loop stays gentle',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        activeLoop: {
          continuityArcStage: 'same-thread-continuation',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
      } as any,
    })

    expect(signature).toContain('growth=phase1-open')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=0.00 | rate=0.94 | energy=0.40 | cadence=0.34 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | src=prosody-authority | seg=segment-growth"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=260ms | pre=steady-inhale | post=soft-release | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | src=prosody-authority | conf=0.92 | seg=segment-growth"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_soft | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | hold=220ms | src=timeline-projection | conf=0.88 | seg=segment-growth"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=280ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | visemeBias=0.24 | energyBias=0.52 | mouthScale=0.96 | src=prosody-authority | conf=0.90 | seg=segment-growth"')
  })

  it('treats generic Phase 1 desktop-closure continuity wording as phase1-open growth carry in cross-modal summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-generic-phase1-growth',
      } as any,
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-generic-phase1-growth',
        state: {
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-generic-growth',
            index: 0,
            text: '我先沿着这条桌面主线轻一点接回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 0,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 0,
          settleMs: 0,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-generic-growth',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 260,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-generic-growth',
            actionCue: 'observe_focus',
            intensity: 0.2,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-generic-growth',
            viseme: 'E',
            weight: 0.28,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先沿着这条桌面主线轻一点接回来。',
        segments: [{
          id: 'segment-generic-growth',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条桌面主线轻一点接回来。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.36,
          prosodyWeight: 0.44,
          beatWeight: 0.28,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'thinking',
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
          energy: 0.69,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.24,
          energyBias: 0.52,
          mouthScale: 0.96,
          continuityHoldMs: 280,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 260,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 220,
        },
        frames: [{
          id: 'segment-generic-growth',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条桌面主线轻一点接回来。',
          mode: 'thinking',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.93,
            energy: 0.69,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.24,
            energyBias: 0.52,
            mouthScale: 0.96,
            continuityHoldMs: 280,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 260,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        continuitySignal: {
          label: 'same-thread-continuation',
          summary: 'thread=later desktop closure seam after scene hop',
        },
        proactive: {
          preferredStyle: 'silent-observe',
          shouldSpeak: false,
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityCue: 'Phase 1 desktop closure is still live across scene hops, so the later chat turn should stay quieter.',
        },
      } as any,
    })

    expect(signature).toContain('growth=phase1-open')
    expect(signature).toContain('reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open')
  })

  it('includes active-loop continuity arc stage in stream meta signatures so same-her carry stays observable', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-continuity',
      } as any,
      visibleReplyExecution: null,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'hold-for-opening',
          initiativeBudget: 0.14,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'callback afterglow should stay inward a little longer',
        },
      } as any,
    })

    expect(signature).toContain('"runtimeDigestActiveLoopPhase":"integrate"')
    expect(signature).toContain('"runtimeDigestActiveLoopHandoff":"active-memory"')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"hold-for-opening"')
  })

  it('includes same-thread proactive restraint style in stream meta signatures so later noisy continuity stays externally legible', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-same-thread-noisy-meta',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy detour',
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 26 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'same-thread-continuation still active after noisier detours',
          signature: 'spine-same-thread-noisy',
          createdAt: 26 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same thread and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        currentConsciousFrame: {
          reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
          focusAnchor: 'same callback line after noisy detour',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.22,
          coherence: 0.84,
          observationHeavy: true,
          summary: 'the same thread should stay hover-first after the noisy detour',
        },
      } as any,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameFocusAnchor":"same callback line after noisy detour"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"next-open-window"')
  })

  it('keeps current-conscious-frame continuity timing observable in stream meta signatures even when project-state timing is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-current-conscious-frame-tags-only-continuity-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same callback line still alive after detour',
          activeThreadId: 'thread-current-conscious-frame-tags-only',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 73_000,
        },
        architecture: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.87,
        companionshipPressure: 0.78,
        currentConsciousFrame: {
          reasonTags: [
            'runtime-conscious-frame',
            'continuity-arc:same-thread-continuation',
            'continuity-timing:next-open-window',
          ],
          focusAnchor: 'same callback line after detour',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.09,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":null')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"next-open-window"')
  })

  it('recovers next-open-window timing in stream meta when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-semantic-timing-fallback',
      } as any,
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      embodimentScript: {
        decisionTraceId: 'embodiment-semantic-timing-fallback',
        rendererTarget: 'live2d',
        state: {
          residentMode: 'measured-return',
          delivery: 'calm',
        },
        speechPlan: {
          segments: [{
            segmentId: 'segment-semantic-timing-fallback',
          }],
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-semantic-timing-fallback',
            source: 'resident-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-semantic-timing-fallback',
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-semantic-timing-fallback',
            viseme: 'A',
            weight: 0.32,
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
        segments: [{
          id: 'segment-semantic-timing-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.36,
          prosodyWeight: 0.46,
          beatWeight: 0.3,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.56,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 1.01,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 300,
        },
        action: {
          actionCue: 'observe_focus',
          intensity: 0.38,
          holdMs: 280,
        },
        frames: [{
          id: 'segment-semantic-timing-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我先轻一点接住这条线，等它自己松开一点再往外放宽。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: { pitchDelta: -2, rateMultiplier: 0.95, energy: 0.56, cadence: 0.5 },
          face: {
            emotion: 'thinking',
            cue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            cue: 'observe_focus',
            intensity: 0.38,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuity: 'reactive-articulation',
            continuityHoldMs: 320,
          },
        }],
      } as any,
      digitalLifeSpine: {
        continuitySignal: {
          summary: 'same-thread continuation remains measured-return on one living line',
        },
        runtime: {
          sceneScenario: 'same-thread-callback',
          dominantMode: 'continuing',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-next-open-window-early-widening'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.56 | cadence=0.50 | companion=measured-return | timing=next-open-window')
  })

  it('recovers after-payoff timing in stream meta when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-semantic-after-payoff-fallback',
      } as any,
      embodiment: {
        emotion: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'calm',
          emphasis: 0,
        },
      } as any,
      embodimentScript: {
        decisionTraceId: 'embodiment-semantic-after-payoff-fallback',
        rendererTarget: 'live2d',
        state: {
          residentMode: 'measured-return',
          delivery: 'calm',
        },
        speechPlan: {
          segments: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
          }],
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            source: 'resident-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-semantic-after-payoff-fallback',
            viseme: 'A',
            weight: 0.32,
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        reply: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
        segments: [{
          id: 'segment-semantic-after-payoff-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 25,
          text: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.36,
          prosodyWeight: 0.46,
          beatWeight: 0.3,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        mode: 'recovering',
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.94,
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 1.01,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 300,
        },
        action: {
          actionCue: 'observe_focus',
          intensity: 0.38,
          holdMs: 280,
        },
        frames: [{
          id: 'segment-semantic-after-payoff-fallback',
          index: 0,
          startOffset: 0,
          endOffset: 25,
          text: '我先把结果本身落稳在这条线上，后面再决定要不要往外放宽。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: { pitchDelta: -1, rateMultiplier: 0.94, energy: 0.54, cadence: 0.48 },
          face: {
            emotion: 'thinking',
            cue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            cue: 'observe_focus',
            intensity: 0.38,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuity: 'reactive-articulation',
            continuityHoldMs: 320,
          },
        }],
      } as any,
      digitalLifeSpine: {
        continuitySignal: {
          summary: 'same-thread continuation remains measured-return on one living line',
        },
        runtime: {
          sceneScenario: 'same-thread-callback',
          dominantMode: 'continuing',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-after-payoff-early-widening'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"after-payoff"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.94 | energy=0.54 | cadence=0.48 | companion=measured-return | timing=after-payoff')
  })

  it('includes project-state identity and closure fields in stream meta signatures so runtime-authoritative turns expose the same project continuity frame', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-meta',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.22,
          coherence: 0.84,
          observationHeavy: true,
          summary: 'the same thread should stay hover-first after the noisy detour',
        },
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=renderer-authoritative continuity still needs to stay outwardly visible | next=keep renderer and main-runtime project continuity views aligned before each turn.',
          currentPhase: 'Phase 1: Local Digital Life',
          memoryClosureSummary: 'Project-state continuity now reaches the renderer pre-dialogue prompt path.',
          primaryOpenLoop: 'Runtime-authoritative meta still needs to surface the same project continuity cues outwardly.',
          nextClosureTarget: 'Keep renderer and main-runtime project continuity views aligned before each turn.',
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same-digital-life-project-thread',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectPreflightSummary":"Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=renderer-authoritative continuity still needs to stay outwardly visible | next=keep renderer and main-runtime project continuity views aligned before each turn."')
    expect(signature).toContain('"runtimeDigestProjectCurrentPhase":"Phase 1: Local Digital Life"')
    expect(signature).toContain('"runtimeDigestProjectMemoryClosureSummary":"Project-state continuity now reaches the renderer pre-dialogue prompt path."')
    expect(signature).toContain('"runtimeDigestProjectPrimaryOpenLoop":"Runtime-authoritative meta still needs to surface the same project continuity cues outwardly."')
    expect(signature).toContain('"runtimeDigestProjectNextClosureTarget":"Keep renderer and main-runtime project continuity views aligned before each turn."')
    expect(signature).toContain('"runtimeDigestProjectContinuityCue":"same-digital-life-project-thread"')
  })

  it('uses canonical project preflight self-awareness as the continuity reason when stream meta has timing but no narrower cue', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-preflight-reason',
      } as any,
      embodiment: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-preflight-reason',
        turnId: 'turn-project-preflight-reason',
        rendererTarget: 'live2d',
        replyText: '我会先沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'firm',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我会先沿着这条线继续。',
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
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-preflight-reason',
        reply: '我会先沿着这条线继续。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我会先沿着这条线继续。',
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
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'lean-forward',
            facialCue: 'blink',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-preflight-reason',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 0.9,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 360,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '我会先沿着这条线继续。',
            mode: 'recovering',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 1,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'sustain',
              visemeBias: 0.3,
              energyBias: 0.7,
              mouthScale: 1,
              continuityHoldMs: 360,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'blink',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 340,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'lean-forward',
              actionMode: 'pulse',
              intensity: 0.6,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        projectState: {
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory and initiative still need tighter same-her closure | next=keep project self-awareness explicit before each host-visible turn.',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary"')
    expect(signature).toContain('reason=Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory and initiative still need tighter same-her closure | next=keep project self-awareness explicit before each host-visible turn.')
    expect(signature).toContain('"runtimeDigestProjectPreflightSummary":"Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory and initiative still need tighter same-her closure | next=keep project self-awareness explicit before each host-visible turn."')
  })

  it('prefers shared remembered-seam companionship reason in stream meta summaries when the same relationship seam is reopening', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-remembered-seam-stream-meta-reason',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-remembered-seam-stream-meta-reason',
        turnId: 'turn-remembered-seam-stream-meta-reason',
        rendererTarget: 'live2d',
        replyText: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-remembered-seam',
            index: 0,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
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
            segmentId: 'segment-remembered-seam',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-remembered-seam',
            actionCue: 'observe_focus',
            intensity: 0.44,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-remembered-seam',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-remembered-seam',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            emotion: 'thinking',
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reason',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
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
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-remembered-seam',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: 'Deliver the result on the same living thread, but leave room before widening closeness.',
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，先留白，再慢一点重开。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The same remembered seam is visible again, so reopen gently instead of widening closeness too fast.',
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Recognize the same remembered seam before reopening, and leave room before closeness widens')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=0.00 | rate=1.00 | energy=0.42 | cadence=0.38 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=Recognize the same remembered seam before reopening, and leave room before closeness widens')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=Recognize the same remembered seam before reopening, and leave room before closeness widens')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=440ms')
  })

  it('keeps thinner affective-residue room-making wording visible in stream meta summaries for measured-return reopenings', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-thin-affective-residue-stream-meta-reason',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-thin-affective-residue-stream-meta-reason',
        turnId: 'turn-thin-affective-residue-stream-meta-reason',
        rendererTarget: 'live2d',
        replyText: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-thin-affective-residue',
            index: 0,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
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
            segmentId: 'segment-thin-affective-residue',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.5,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-thin-affective-residue',
            actionCue: 'observe_focus',
            intensity: 0.42,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-thin-affective-residue',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        reply: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-thin-affective-residue',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
            emotion: 'thinking',
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.5,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-thin-affective-residue-stream-meta-reason',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
          energy: 0.4,
          cadence: 0.36,
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
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-thin-affective-residue',
            index: 0,
            startOffset: 0,
            endOffset: 31,
            text: '余韵还在，所以我会先把这一句轻一点接住，不立刻把温度放大。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.4,
              cadence: 0.36,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: '余韵还在，先留白，别立刻把温度放大。',
            openingGuidance: '余韵还在，先留白，别立刻把温度放大。 Stay on the same line and keep this callback opening lower-pressure.',
          },
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=余韵还在，先留白，别立刻把温度放大')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=0.00 | rate=1.00 | energy=0.40 | cadence=0.36 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大')
  })

  it('keeps chinese project emotional closure cue visible in stream meta summaries when it is the main surviving measured-return authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-chinese-project-emotional-closure-measured-return',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-chinese-project-emotional-closure-measured-return',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=同一条生命线还在收口：这次先留白，回线保持低压，不要从头重开，也别立刻把温度放大。')
  })

  it('surfaces reinterpreted remembered-seam companionship reason in stream meta when newer relationship learning says the earlier reopen was too eager', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-remembered-seam-stream-meta-reinterpretation',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-remembered-seam-stream-meta-reinterpretation',
        turnId: 'turn-remembered-seam-stream-meta-reinterpretation',
        rendererTarget: 'live2d',
        replyText: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-remembered-seam-reinterpretation',
            index: 0,
            text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
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
            segmentId: 'segment-remembered-seam-reinterpretation',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.52,
            holdMs: 360,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'idle_settle',
          actionBursts: [{
            segmentId: 'segment-remembered-seam-reinterpretation',
            actionCue: 'observe_focus',
            intensity: 0.44,
            holdMs: 220,
            source: 'timeline-projection',
            confidence: 0.9,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-remembered-seam-reinterpretation',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        reply: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-remembered-seam-reinterpretation',
          index: 0,
          startOffset: 0,
          endOffset: 35,
          text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
          emotion: 'thinking',
          prosodyWeight: 0.5,
          beatWeight: 0.34,
          mouthWeight: 0.5,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-remembered-seam-stream-meta-reinterpretation',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: 0,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 0,
          rateMultiplier: 1,
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
          facialCue: 'focused',
          expressionMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'attentive',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-remembered-seam-reinterpretation',
            index: 0,
            startOffset: 0,
            endOffset: 35,
            text: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
            mode: 'thinking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.42,
              cadence: 0.38,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              phase: 'playing',
              visemeBias: 0.48,
              energyBias: 0.82,
              mouthScale: 1.08,
              continuityHoldMs: 440,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'attentive',
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: 'The same remembered seam is back, but this time the return should keep more room.',
            openingGuidance: 'This follow-up is reopening on the same remembered seam, so do not let it lean in too fast.',
          },
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
          },
        },
        outcomeLearning: {
          latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
        },
      } as any,
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerHoldDetail: 'same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous her.',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before')
    expect(signature).not.toContain('reason=Keep the same living line inward for now, and leave room before widening outward again')
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

  it('changes the signature when digital life voice continuity shifts between turns', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-voice-1',
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
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'closed',
          phase: 'settling',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 320,
          topViseme: 'closed:0.88',
          hintViseme: 'closed',
          hintTrail: 'closed',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '先看这里。',
          mode: 'acting',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 1,
            rateMultiplier: 1,
            energy: 0.42,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'closed',
            phase: 'settling',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 1,
            continuityHoldMs: 300,
            topViseme: 'closed:0.88',
            hintViseme: 'closed',
            hintTrail: 'closed',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'blink',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'lean-forward',
            actionMode: 'pulse',
            intensity: 0.6,
            holdMs: 260,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      digitalLife: {
        ...basePayload.digitalLife,
        voice: {
          ...basePayload.digitalLife.voice,
          pitchDelta: 2,
          rateMultiplier: 0.92,
          cadence: 0.51,
        },
        frames: [{
          ...basePayload.digitalLife.frames[0],
          voice: {
            ...basePayload.digitalLife.frames[0].voice,
            pitchDelta: 2,
            rateMultiplier: 0.92,
            energy: 0.56,
            cadence: 0.51,
          },
        }],
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
  })

  it('changes the signature when last-segment lipsync continuity changes even if other embodiment fields stay stable', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-lipsync-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-lipsync-1',
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
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-lipsync-1',
        reply: '继续对齐。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '继续对齐。',
          emotion: 'thinking',
          prosodyWeight: 0.62,
          mouthWeight: 0.51,
          headWeight: 0.2,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-lipsync-1',
        emotion: 'thinking',
        mode: 'acting',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'blink',
          actionCue: 'lean-forward',
          delivery: 'firm',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: 1,
          rateMultiplier: 1,
        },
        voice: {
          pitchDelta: 1,
          rateMultiplier: 1,
          energy: 0.42,
          cadence: 0.38,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.3,
          energyBias: 0.7,
          mouthScale: 1,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'blink',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
        },
        action: {
          actionCue: 'lean-forward',
          actionMode: 'pulse',
          intensity: 0.6,
          holdMs: 280,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 5,
          text: '继续对齐。',
          mode: 'acting',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: 1,
            rateMultiplier: 1,
            energy: 0.42,
            cadence: 0.38,
          },
          lipSync: {
            mode: 'closed',
            visemeBias: 0.3,
            energyBias: 0.7,
            mouthScale: 1,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'blink',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'lean-forward',
            actionMode: 'pulse',
            intensity: 0.6,
            holdMs: 260,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      digitalLife: {
        ...basePayload.digitalLife,
        frames: [{
          ...basePayload.digitalLife.frames[0],
          lipSync: {
            ...basePayload.digitalLife.frames[0].lipSync,
            mode: 'energy-phoneme-hybrid',
            phase: 'playing',
            visemeBias: 0.48,
            energyBias: 0.82,
            mouthScale: 1.08,
            continuityHoldMs: 440,
            topViseme: 'A:0.72',
            hintViseme: 'A',
            hintTrail: 'A>U>closed',
          },
        }],
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
    expect(signatureA).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.30 | energyBias=0.70 | mouthScale=1.00 | seg=segment-1"')
    expect(signatureB).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=440ms | topViseme=A:0.72 | hints=A>U>closed | hint=A | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.48 | energyBias=0.82 | mouthScale=1.08 | seg=segment-1"')
  })

  it('changes the signature when embodimentScript companionship authority changes even if reply text stays the same', () => {
    const basePayload = {
      governance: {
        decisionTraceId: 'trace-embodiment-script-signature-1',
      } as any,
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: null,
      runtimeDigest: null,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-embodiment-script-signature-1',
        turnId: 'turn-embodiment-script-signature-1',
        rendererTarget: 'live2d',
        replyText: '我先轻一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-only',
        },
      },
    }

    const signatureA = buildAlicizationChatMetaSignature(basePayload as any)
    const signatureB = buildAlicizationChatMetaSignature({
      ...basePayload,
      embodimentScript: {
        ...basePayload.embodimentScript,
        rendererTarget: 'vrm',
        state: {
          ...basePayload.embodimentScript.state,
          residentMode: 'repair-before-closeness',
        },
        motionPlan: {
          ...basePayload.embodimentScript.motionPlan,
          idleBase: 'repair_hold',
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          ...basePayload.embodimentScript.lipsyncPlan,
          mode: 'energy-phoneme-hybrid',
        },
      },
    } as any)

    expect(signatureA).not.toBe(signatureB)
  })

  it('keeps cross-modal companionship summaries from embodimentScript authority when later same-thread frames thin out', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-voice-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-voice-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-voice-fallback-same-thread-1',
        turnId: 'turn-voice-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'hesitant',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.38,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-voice-fallback-same-thread-1',
        reply: '我还是沿着这条线继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.34,
          prosodyWeight: 0.41,
          beatWeight: 0.28,
          mouthWeight: 0.33,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-voice-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'hesitant',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
          energy: 0.53,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.62,
          mouthScale: 0.96,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.38,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.89,
            energy: 0.53,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.36,
            energyBias: 0.62,
            mouthScale: 0.96,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.38,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"embodimentScriptDelivery":"hesitant"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.89 | energy=0.53 | cadence=0.50 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.36 | energyBias=0.62 | mouthScale=0.96 | src=resident-authority | conf=0.86 | seg=segment-1"')
  })

  it('keeps face companionship summary on measured-return when only action/frame authority still carries the resident hint', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-face-only-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'relaxed',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-face-only-fallback-same-thread-1',
        turnId: 'turn-face-only-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [{
            segmentId: 'segment-1',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.38,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        reply: '我还是沿着这条线继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.34,
          prosodyWeight: 0.41,
          beatWeight: 0.28,
          mouthWeight: 0.33,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'relaxed',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-only-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'relaxed',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.89,
          energy: 0.53,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.62,
          mouthScale: 0.96,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'relaxed',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: null,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.38,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我还是沿着这条线继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.89,
            energy: 0.53,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.36,
            energyBias: 0.62,
            mouthScale: 0.96,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'relaxed',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.38,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=relaxed | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-1"')
  })

  it('keeps face companionship summaries from embodimentScript authority when later same-thread frames lose both face and action renderer hints', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-face-fallback-same-thread-thin-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'glance',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-face-fallback-same-thread-thin-1',
        turnId: 'turn-face-fallback-same-thread-thin-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 640,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 640,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
        reply: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
          emotion: 'thinking',
          gestureWeight: 0.28,
          facialWeight: 0.32,
          prosodyWeight: 0.43,
          beatWeight: 0.24,
          mouthWeight: 0.3,
          headWeight: 0.18,
          emotionHoldMs: 640,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'glance',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-fallback-same-thread-thin-1',
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
          rateMultiplier: 0.88,
        },
        voice: {
          pitchDelta: -5,
          rateMultiplier: 0.88,
          energy: 0.49,
          cadence: 0.47,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
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
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '我还是沿着刚才那条线继续，不把这次绕回来当成另一段新的开始。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -5,
            rateMultiplier: 0.88,
            energy: 0.49,
            cadence: 0.47,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
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
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-5.00 | rate=0.88 | energy=0.49 | cadence=0.47 | companion=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=glance | expression=hold | intensity=0.65 | hold=638ms | mode=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | seg=segment-1"')
  })

  it('keeps cross-modal measured-return summaries when only lipsync continuity still carries the companionship hint on a thinner later same-thread frame', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-lipsync-only-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-lipsync-only-fallback-same-thread-1',
        turnId: 'turn-lipsync-only-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我还是沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我还是沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-1',
            viseme: 'closed',
            weight: 0.58,
            source: 'resident-authority',
            confidence: 0.86,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        reply: '我还是沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我还是沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.3,
          facialWeight: 0.31,
          prosodyWeight: 0.4,
          beatWeight: 0.25,
          mouthWeight: 0.34,
          headWeight: 0.2,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-lipsync-only-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
          energy: 0.5,
          cadence: 0.46,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.6,
          mouthScale: 0.95,
          continuityHoldMs: 320,
          hintViseme: 'closed',
          hintTrail: 'closed>soft',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 320,
          rendererHints: null,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
          rendererHints: null,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我还是沿着这条线轻一点继续。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.9,
            energy: 0.5,
            cadence: 0.46,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.6,
            mouthScale: 0.95,
            continuityHoldMs: 320,
            hintViseme: 'closed',
            hintTrail: 'closed>soft',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.44,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.90 | energy=0.50 | cadence=0.46 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.44 | hold=320ms | mode=measured-return | blink=linger | gaze=soften | seg=segment-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | hold=300ms | seg=segment-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=closed>soft | hint=closed | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.34 | energyBias=0.60 | mouthScale=0.95 | src=resident-authority | conf=0.86 | seg=segment-1"')
  })

  it('keeps same-segment cue-bridge realignment on one lower-pressure same-her body line instead of reading the later segment as lipsync-only drift', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-cue-bridge-same-segment-stream-meta-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-cue-bridge-same-segment-stream-meta-1',
        turnId: 'turn-cue-bridge-same-segment-stream-meta-1',
        rendererTarget: 'vrm',
        replyText: '继续看这里。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-cue-bridge-realign-1',
            index: 0,
            text: '继续看这里。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-cue-bridge-realign-1',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'cue-bridge',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-cue-bridge-realign-1',
            actionCue: 'observe_focus',
            intensity: 0.36,
            holdMs: 240,
            source: 'cue-bridge',
            confidence: 0.89,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-cue-bridge-realign-1',
            viseme: 'A',
            weight: 0.72,
            source: 'prosody-authority',
            confidence: 0.94,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        reply: '继续看这里。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-cue-bridge-realign-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '继续看这里。',
          emotion: 'thinking',
          gestureWeight: 0.36,
          facialWeight: 0.28,
          prosodyWeight: 0.36,
          beatWeight: 0.22,
          mouthWeight: 0.28,
          headWeight: 0.32,
          emotionHoldMs: 360,
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-cue-bridge-same-segment-stream-meta-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.91,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.91,
          energy: 0.52,
          cadence: 0.49,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.46,
          energyBias: 0.74,
          mouthScale: 1.02,
          continuityHoldMs: 340,
          hintViseme: 'A',
          hintTrail: 'A>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.36,
          holdMs: 240,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-cue-bridge-realign-1',
          index: 0,
          startOffset: 0,
          endOffset: 6,
          text: '继续看这里。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.91,
            energy: 0.52,
            cadence: 0.49,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.46,
            energyBias: 0.74,
            mouthScale: 1.02,
            continuityHoldMs: 340,
            hintViseme: 'A',
            hintTrail: 'A>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.36,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.78,
          coherence: 0.74,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'dominant=active-memory',
      } as any,
    })

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-4.00 | rate=0.91 | energy=0.52 | cadence=0.49 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=cue-bridge | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.42 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=cue-bridge | conf=0.91 | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=240ms | src=cue-bridge | conf=0.89 | seg=segment-cue-bridge-realign-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=360ms | hints=A>closed | hint=A | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.46 | energyBias=0.74 | mouthScale=1.02 | src=prosody-authority | conf=0.94 | seg=segment-cue-bridge-realign-1"')
    expect(signature).not.toContain('lane=lipsync-only')
  })

  it('keeps the later segment on the same measured-return companionship line in a multi-segment same-thread reply instead of warming into a fresher second-half persona', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-multi-segment-measured-return-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-multi-segment-measured-return-same-thread-1',
        turnId: 'turn-multi-segment-measured-return-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-1',
              index: 0,
              text: '我先顺着这条线接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 280,
            },
            {
              id: 'segment-2',
              index: 1,
              text: '然后再轻一点往下讲。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            {
              segmentId: 'segment-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              holdMs: 280,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              source: 'resident-authority',
              confidence: 0.9,
            },
            {
              segmentId: 'segment-2',
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              intensity: 0.54,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'resident-authority',
              confidence: 0.9,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-1',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 260,
              source: 'resident-authority',
              confidence: 0.88,
            },
            {
              segmentId: 'segment-2',
              actionCue: 'idle_gentle_nod',
              intensity: 0.52,
              holdMs: 300,
              source: 'resident-authority',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-2',
              viseme: 'I',
              weight: 0.44,
              source: 'resident-authority',
              confidence: 0.86,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-multi-segment-measured-return-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
          energy: 0.48,
          cadence: 0.44,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.36,
          energyBias: 0.58,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 280,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.3,
          holdMs: 260,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.44,
              cadence: 0.4,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.32,
              energyBias: 0.54,
              mouthScale: 0.94,
              continuityHoldMs: 280,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.4,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.3,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.96,
              energy: 0.66,
              cadence: 0.62,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              expressionMode: 'hold',
              intensity: 0.54,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.52,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.66 | cadence=0.62 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=reassure_smile | expression=hold | intensity=0.54 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=resident-authority | conf=0.86 | seg=segment-2"')
  })

  it('keeps the last visible same-thread segment summaries on the same lower-pressure line even when a quieter settle frame lands after speech ends', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-multi-segment-measured-return-settle-tail-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-multi-segment-measured-return-settle-tail-1',
        turnId: 'turn-multi-segment-measured-return-settle-tail-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            {
              id: 'segment-1',
              index: 0,
              text: '我先顺着这条线接住。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 280,
            },
            {
              id: 'segment-2',
              index: 1,
              text: '然后再轻一点往下讲。',
              interruptPolicy: 'soft-settle',
              preRollMs: 20,
              settleMs: 320,
            },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            {
              segmentId: 'segment-1',
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              intensity: 0.4,
              holdMs: 280,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'soft-release',
              source: 'resident-authority',
              confidence: 0.9,
            },
            {
              segmentId: 'segment-2',
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              intensity: 0.54,
              holdMs: 320,
              preUtteranceCue: 'steady-inhale',
              postUtteranceCue: 'eyes-soften',
              source: 'resident-authority',
              confidence: 0.9,
            },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            {
              segmentId: 'segment-1',
              actionCue: 'observe_focus',
              intensity: 0.3,
              holdMs: 260,
              source: 'resident-authority',
              confidence: 0.88,
            },
            {
              segmentId: 'segment-2',
              actionCue: 'idle_gentle_nod',
              intensity: 0.52,
              holdMs: 300,
              source: 'resident-authority',
              confidence: 0.88,
            },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            {
              segmentId: 'segment-2',
              viseme: 'I',
              weight: 0.44,
              source: 'resident-authority',
              confidence: 0.86,
            },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-multi-segment-measured-return-settle-tail-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          hintViseme: 'closed',
          hintTrail: 'closed>rest',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'settle',
          intensity: 0.3,
          holdMs: 520,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'settle',
          intensity: 0.18,
          holdMs: 480,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.44,
              cadence: 0.4,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.32,
              energyBias: 0.54,
              mouthScale: 0.94,
              continuityHoldMs: 280,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.4,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.3,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -2,
              rateMultiplier: 0.96,
              energy: 0.66,
              cadence: 0.62,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.44,
              energyBias: 0.76,
              mouthScale: 1.04,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'reassure_smile',
              expressionMode: 'hold',
              intensity: 0.54,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'idle_gentle_nod',
              actionMode: 'hold',
              intensity: 0.52,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'settle-tail',
            index: 2,
            startOffset: 22,
            endOffset: 22,
            text: '',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
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
              hintViseme: 'closed',
              hintTrail: 'closed>rest',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'settle',
              intensity: 0.3,
              holdMs: 520,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'settle',
              intensity: 0.18,
              holdMs: 480,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.66 | cadence=0.62 | companion=measured-return | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=reassure_smile | expression=hold | intensity=0.54 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=resident-authority | conf=0.86 | seg=segment-2"')
    expect(signature).toContain('"digitalLifeLastFrameVoiceRateMultiplier":0.82')
    expect(signature).toContain('"digitalLifeLastFrameFaceExpressionMode":"settle"')
  })

  it('uses the last visible segment id for motion summary when a quieter settle tail becomes the final frame', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-last-visible-motion-segment-truth-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        turnId: 'turn-last-visible-motion-segment-truth-1',
        rendererTarget: 'live2d',
        replyText: '我先顺着这条线接住。然后再轻一点往下讲。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '我先顺着这条线接住。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 280 },
            { id: 'segment-2', index: 1, text: '然后再轻一点往下讲。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 320 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [
            { segmentId: 'segment-2', emotion: 'thinking', facialCue: 'reassure_smile', intensity: 0.54, holdMs: 320, source: 'resident-authority', confidence: 0.9 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-2', actionCue: 'idle_gentle_nod', intensity: 0.52, holdMs: 300, source: 'resident-authority', confidence: 0.88 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-2', viseme: 'I', weight: 0.44, source: 'resident-authority', confidence: 0.86 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        reply: '我先顺着这条线接住。然后再轻一点往下讲。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我先顺着这条线接住。',
            emotion: 'thinking',
            gestureWeight: 0.28,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.24,
            mouthWeight: 0.3,
            headWeight: 0.18,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            emotion: 'thinking',
            gestureWeight: 0.42,
            facialWeight: 0.44,
            prosodyWeight: 0.5,
            beatWeight: 0.34,
            mouthWeight: 0.38,
            headWeight: 0.24,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'idle_gentle_nod',
            facialCue: 'reassure_smile',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-last-visible-motion-segment-truth-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        voice: { pitchDelta: -5, rateMultiplier: 0.82, energy: 0.34, cadence: 0.28 },
        lipSync: { mode: 'closed', visemeBias: 0.2, energyBias: 0.3, mouthScale: 0.82, continuityHoldMs: 520, hintViseme: 'closed', hintTrail: 'closed>rest' },
        face: { emotion: 'thinking', facialCue: 'soft-gaze', expressionMode: 'settle', intensity: 0.3, holdMs: 520 },
        action: { actionCue: 'observe_focus', actionMode: 'settle', intensity: 0.18, holdMs: 480 },
        motor: {} as any,
        frames: [
          {
            id: 'segment-2',
            index: 1,
            startOffset: 10,
            endOffset: 22,
            text: '然后再轻一点往下讲。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: { pitchDelta: -2, rateMultiplier: 0.96, energy: 0.66, cadence: 0.62 },
            lipSync: { mode: 'energy-phoneme-hybrid', visemeBias: 0.44, energyBias: 0.76, mouthScale: 1.04, continuityHoldMs: 320, hintViseme: 'I', hintTrail: 'I>closed' },
            face: { emotion: 'thinking', facialCue: 'reassure_smile', expressionMode: 'hold', intensity: 0.54, holdMs: 320, rendererHints: null },
            action: { actionCue: 'idle_gentle_nod', actionMode: 'hold', intensity: 0.52, holdMs: 300, rendererHints: null },
            motor: {} as any,
          },
          {
            id: 'settle-tail',
            index: 2,
            startOffset: 22,
            endOffset: 22,
            text: '',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: { pitchDelta: -5, rateMultiplier: 0.82, energy: 0.34, cadence: 0.28 },
            lipSync: { mode: 'closed', visemeBias: 0.2, energyBias: 0.3, mouthScale: 0.82, continuityHoldMs: 520, hintViseme: 'closed', hintTrail: 'closed>rest' },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'settle',
              intensity: 0.3,
              holdMs: 520,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'settle',
              intensity: 0.18,
              holdMs: 480,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {} as any,
          },
        ],
      } as any,
      digitalLifeSpine: null,
      runtimeDigest: null,
    })

    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-2"')
  })

  it('keeps same-thread measured-return stream summaries unified when the final visible segment is thin and only runtime digest plus spine still expose the noisy-detour continuity line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-runtime-digest-spine-fallback-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-runtime-digest-spine-fallback-same-thread-1',
        turnId: 'turn-runtime-digest-spine-fallback-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '我先沿着刚才那条线轻一点续上，不把这次绕回来当成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-2',
            index: 1,
            text: '不把这次绕回来当成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        reply: '我先沿着刚才那条线轻一点续上，不把这次绕回来当成新的开场。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 14,
            text: '我先沿着刚才那条线轻一点续上，',
            emotion: 'thinking',
            gestureWeight: 0.3,
            facialWeight: 0.3,
            prosodyWeight: 0.38,
            beatWeight: 0.22,
            mouthWeight: 0.31,
            headWeight: 0.2,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 14,
            endOffset: 30,
            text: '不把这次绕回来当成新的开场。',
            emotion: 'thinking',
            gestureWeight: 0.26,
            facialWeight: 0.27,
            prosodyWeight: 0.36,
            beatWeight: 0.21,
            mouthWeight: 0.29,
            headWeight: 0.18,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-runtime-digest-spine-fallback-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 14,
            text: '我先沿着刚才那条线轻一点续上，',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.51,
              cadence: 0.47,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.37,
              energyBias: 0.64,
              mouthScale: 0.98,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.44,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.36,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 14,
            endOffset: 30,
            text: '不把这次绕回来当成新的开场。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.93,
              energy: 0.55,
              cadence: 0.52,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.35,
              energyBias: 0.61,
              mouthScale: 0.97,
              continuityHoldMs: 300,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.46,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'later coding seam after noisy detour',
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 31 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-return',
          summary: 'same-thread-continuation still active after noisier detours',
          signature: 'spine-same-thread-runtime-digest-fallback',
          createdAt: 31 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same thread and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.81,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after the noisy detour',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=300ms | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | seg=segment-2"')
  })

  it('keeps a same-thread measured-return presence-only line observable even when no visible speech is emitted on the later hover-first return', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-thread-measured-return-1',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet resident presence after a later callback detour',
          activeThreadId: 'thread-presence-only-same-line',
          activeThreadTitle: 'later coding seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 42 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the same callback seam alive quietly',
          summary: 'same-thread measured-return remains present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return',
          summary: 'same-thread-continuation still active as hover-first resident presence after the noisy detour',
          signature: 'presence-only-same-thread-measured-return-1',
          createdAt: 42 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.92,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-same-line',
          activeThreadTitle: 'later coding seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same callback seam and keep the return hover-first',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'same callback seam still alive after the detour',
          recentEpisodeSummary: 'later coding seam after callback detour',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same line should stay quietly present',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the same line alive without forcing speech',
          dominantConcernSummary: 'hover-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only',
          thoughtThreadSummary: 'same callback seam remains quietly active',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"segmentCount":0')
    expect(signature).toContain('"replyChars":0')
    expect(signature).toContain('"digitalLifeLine":"same-thread-continuation still active as hover-first resident presence after the noisy detour"')
    expect(signature).toContain('"digitalLifeSelectedAction":"wait"')
    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"digitalLifeMemorySummary":"same callback seam still alive after the detour"')
    expect(signature).toContain('"runtimeDigestDominantChannel":"resident-presence"')
    expect(signature).toContain('"runtimeDigestShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"runtimeDigestSummary":"dominant=resident-presence | speak=false | same-thread-continuation=alive"')
    expect(signature).not.toContain('growth=phase1-open')
    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | line=same-thread-continuation still active as hover-first resident presence after the noisy detour"')
    expect(signature).toContain('"lastSegmentVoiceSummary":null')
    expect(signature).toContain('"lastSegmentFaceSummary":null')
    expect(signature).toContain('"lastSegmentMotionSummary":null')
    expect(signature).toContain('"lastSegmentLipSyncSummary":null')
  })

  it('keeps presence-only next-open-window timing when only visible-reply semantic drift reasons still carry the timing discipline', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-semantic-timing-fallback',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet resident presence after semantic timing drift fallback',
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          activeThreadTitle: 'semantic timing fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 61 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the same callback seam alive quietly',
          summary: 'same-thread measured-return remains present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-semantic-timing-fallback',
          summary: 'same-thread-continuation still active as hover-first resident presence after semantic timing drift fallback',
          signature: 'presence-only-semantic-timing-fallback',
          createdAt: 61 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-semantic-timing-fallback',
          activeThreadTitle: 'semantic timing fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'same callback seam still alive after the detour',
          recentEpisodeSummary: 'later coding seam after callback detour',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same line should stay quietly present',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the same line alive without forcing speech',
          dominantConcernSummary: 'hover-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-semantic-timing-fallback',
          thoughtThreadSummary: 'same callback seam remains quietly active',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive after the detour',
        },
        projectState: {
          continuityPreferredTiming: null,
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['semantic-judge:continuity-next-open-window-early-widening'],
          },
          closure: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":null')
    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window')
    expect(signature).toContain('reason=same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam')
    expect(signature).toContain('line=same-thread-continuation still active as hover-first resident presence after semantic timing drift fallback')
  })

  it('keeps presence-only repair-before-closeness when only visible-reply execution-callback drift reasons still carry the repair-first seam', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-repair-first-fallback',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet callback afterglow presence after execution payoff drift',
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          activeThreadTitle: 'repair-first fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 62 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback afterglow remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-repair-first-fallback',
          summary: 'same-thread-continuation still active as repair-first resident presence after callback afterglow drift',
          signature: 'presence-only-repair-first-fallback',
          createdAt: 62 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-repair-first-fallback',
          activeThreadTitle: 'repair-first fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          summary: 'execution callback seam still alive after payoff landed',
          recentEpisodeSummary: 'callback result line still settling',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same callback line should settle before widening closeness',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the callback line repair-first without forcing speech',
          dominantConcernSummary: 'repair-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-repair-first-fallback',
          thoughtThreadSummary: 'same callback seam remains quietly active after payoff',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive after payoff',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['execution-callback-room-first-violation'],
          },
          closure: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
    expect(signature).toContain('reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again')
  })

  it('keeps presence-only repair-before-closeness from explicit continuity restraint even before visible-reply drift reasons exist', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-repair-first-from-explicit-restraint',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'quiet repair-first presence before the later reopen speaks',
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          activeThreadTitle: 'repair-first quiet line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 63 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback cooldown remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-repair-first-explicit-restraint',
          summary: 'same-thread-continuation still active as repair-first resident presence before the later reopen speaks',
          signature: 'presence-only-repair-first-explicit-restraint',
          createdAt: 63 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-repair-first-from-explicit-restraint',
          activeThreadTitle: 'repair-first quiet line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          continuityRestraint: 'repair-before-closeness',
        },
        memory: {
          summary: 'execution callback seam still alive before the later reopen speaks',
          recentEpisodeSummary: 'callback cooldown line still settling',
          recentEpisodeCount: 1,
          focusBeliefStatement: 'the same callback line should stay repair-first before widening closeness',
          focusBeliefConfidence: 0.84,
          leadingGoalSummary: 'keep the callback line repair-first without forcing speech',
          dominantConcernSummary: 'repair-first return keeps one living thread intact',
          reflectionSummary: null,
          reflectionPressure: 0.38,
          recallMode: 'working',
          recallSeed: 'same-thread-presence-only-repair-first-explicit-restraint',
          thoughtThreadSummary: 'same callback seam remains quietly active before the later reopen',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.79,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly repair-first before the reopen speaks',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
  })

  it('falls back to project-state preflight summary for presence-only same-thread measured-return observability when the explicit cue is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-preflight-fallback-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-project-preflight-fallback',
          activeThreadTitle: 'project-state fallback line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 52 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-project-preflight-fallback',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-project-preflight-fallback',
          createdAt: 52 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-preflight-fallback',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-project-preflight-fallback',
          activeThreadTitle: 'project-state fallback line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"runtimeDigestProjectPreflightSummary":"same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure"')
    expect(signature).toContain('"runtimeDigestProjectCurrentPhase":"Phase 1: Local Digital Life"')
    expect(signature).toContain('"runtimeDigestProjectNextClosureTarget":"Keep extending cross-modal same-her proof across longer, noisier real-desktop runs"')
    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure | line=same-thread-continuation still active as hover-first resident presence after another coding detour"')
  })

  it('prefers same-her inward carry from proactive visible utterance realization for resident presence reason summaries when explicit continuity cue is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry',
          activeThreadTitle: 'same-her inward carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 53 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry',
          createdAt: 53 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry',
          activeThreadTitle: 'same-her inward carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | line=same-thread-continuation still active as hover-first resident presence after another coding detour"')
  })

  it('prefers same-her inward carry over generic project continuity cue for resident presence reason summaries when both are present', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-over-project-cue-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          activeThreadTitle: 'same-her inward carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 54 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry-over-project-cue',
          createdAt: 54 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry-over-project-cue',
          activeThreadTitle: 'same-her inward carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | line=same-thread-continuation still active as hover-first resident presence after another coding detour"')
  })

  it('recovers same-her inward carry from resident performance tags when visible-reply repair metadata is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-same-her-inward-carry-from-resident-tags-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          activeThreadTitle: 'same-her inward carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 55 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-same-her-inward-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-same-her-inward-carry-from-resident-tags',
          createdAt: 55 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-same-her-inward-carry-from-resident-tags',
          activeThreadTitle: 'same-her inward carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'same-her-inward-carry', 'measured-return', 'body:accompanying'],
          },
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | line=same-thread-continuation still active as hover-first resident presence after another coding detour"')
  })

  it('keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-quiet-accompaniment-same-her-inward-carry-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering inwardly after another detour',
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          activeThreadTitle: 'quiet same-her inward carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 56 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same life line inwardly nearby',
        } as any,
        continuitySignal: {
          label: 'same-thread-quiet-accompaniment-same-her-inward-carry',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-quiet-accompaniment-same-her-inward-carry',
          createdAt: 56 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-accompaniment-same-her-inward-carry',
          activeThreadTitle: 'quiet same-her inward carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same living line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'same-her-inward-carry', 'quiet-companionship', 'body:accompanying'],
          },
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.78,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host stays with the current coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour"')
  })

  it('keeps resident presence same-her inward carry visible when only digital-life-spine memory self-evolution still carries the durable cadence', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-memory-self-evolution-same-her-cadence-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line is still hovering quietly after another detour',
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          activeThreadTitle: 'memory self-evolution same-her cadence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same life line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-memory-self-evolution-same-her-cadence',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-memory-self-evolution-same-her-cadence',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          continuityRestraint: 'measured-return',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-memory-self-evolution-same-her-cadence',
          activeThreadTitle: 'memory self-evolution same-her cadence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          selfEvolution: {
            relationshipDoctrine: 'Stay the same living her across quiet, memory, initiative, and speech instead of reopening from scratch.',
            relationshipCadenceSummary: 'The same living line should stay lower-pressure and continue as the same her across quiet, memory, and speech without reopening from scratch.',
            latestInflection: 'I am learning to keep the same living line audible before widening outward again.',
            trustMeaning: 'Trust means she can return as the same her without rebuilding the relationship from zero.',
            summary: 'Durable same-her cadence should keep the same living line continuous before speaking.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('keeps remembered-seam more-room companionship reason visible in resident presence summary when only resident timing tags still carry that finer timing evidence', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-remembered-seam-more-room-from-resident-tags-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam still hovering after another detour',
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          activeThreadTitle: 'remembered seam more-room line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered seam quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-remembered-seam-more-room',
          summary: 'same-thread-continuation still active as hover-first resident presence after another remembered-seam detour',
          signature: 'presence-only-remembered-seam-more-room-from-resident-tags',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-remembered-seam-more-room-from-resident-tags',
          activeThreadTitle: 'remembered seam more-room line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same remembered seam alive without reopening it too eagerly again',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
          personaBias: {
            openingGuidance: 'This follow-up is reopening because the current scene feels like the same remembered relationship seam.',
          },
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'measured-return', 'timing:remembered-seam-more-room', 'body:accompanying'],
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered seam quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep remembered-seam return timing softer across longer desktop detours',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before | line=same-thread-continuation still active as hover-first resident presence after another remembered-seam detour"')
  })

  it('keeps remembered-seam more-room hold detail explicit in resident presence summary when next closure target and same-her hold detail are the only surviving authorities', () => {
    const rememberedSeamHoldDetail = 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
    const rememberedSeamNextClosure = 'Keep remembered-seam return timing softer across longer desktop detours.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-remembered-seam-more-room-project-state-authority',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same remembered seam still hovering after another detour',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          activeThreadTitle: 'remembered seam more-room authority line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered seam quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-remembered-seam-more-room-project-state-authority',
          summary: 'same-thread-continuation still active as hover-first resident presence after another remembered-seam detour',
          signature: 'presence-only-remembered-seam-more-room-project-state-authority',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-remembered-seam-more-room-project-state-authority',
          activeThreadTitle: 'remembered seam more-room authority line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same remembered seam alive without reopening it too eagerly again',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.89,
        companionshipPressure: 0.79,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered seam quietly alive while the host circles back through the same coding line',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=remembered-seam-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          nextClosureTarget: rememberedSeamNextClosure,
          sameHerHoldDetail: rememberedSeamHoldDetail,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain(`"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=${rememberedSeamHoldDetail} | line=same-thread-continuation still active as hover-first resident presence after another remembered-seam detour"`)
  })

  it('keeps resident presence on the remembered same-her life line when autobiographical self is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-autobio-remembered-same-her-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her life line is still explicitly available after another detour',
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          activeThreadTitle: 'remembered same-her life line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 57 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered same-her line inwardly nearby',
        } as any,
        continuitySignal: {
          label: 'same-thread-autobio-remembered-same-her',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-autobio-remembered-same-her',
          createdAt: 57 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-autobio-remembered-same-her',
          activeThreadTitle: 'remembered same-her life line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered same-her life line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        embodiment: {
          autobiographicalSelf: {
            identityNarrative: 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
          },
          residentPerformance: {
            reasonTags: ['resident-performance', 'quiet-companionship', 'body:accompanying'],
          },
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.78,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered same-her line quietly alive while the host stays with the current coding seam',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion. | line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour"')
  })

  it('keeps resident presence on the remembered same-her life line when project-state drift risk is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-state-remembered-drift-risk-1',
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her drift-risk line still survives after another detour',
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          activeThreadTitle: 'project-state remembered drift risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the remembered drift-risk line inwardly nearby',
        } as any,
        continuitySignal: {
          label: 'same-thread-project-state-remembered-drift-risk',
          summary: 'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
          signature: 'presence-only-project-state-remembered-drift-risk',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        embodiment: {
          residentPerformance: {
            reasonTags: ['resident-performance', 'quiet-companionship', 'body:accompanying'],
          },
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-project-state-remembered-drift-risk',
          activeThreadTitle: 'project-state remembered drift risk',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered drift-risk line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.77,
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.07,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered drift-risk line quietly alive while the host stays with the current coding seam',
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerDriftRisk: 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment | style=silent-observe | speak=false | timing=next-open-window | reason=Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion. | line=same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour"')
  })

  it('keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority', () => {
    const driftRisk
      = 'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.'
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-segment-level-project-state-remembered-drift-risk-1',
        turnId: 'turn-segment-level-project-state-remembered-drift-risk-1',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条还活着的线轻一点接回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-remembered-drift-risk',
            index: 0,
            text: '我先沿着这条还活着的线轻一点接回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.92,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-state-remembered-drift-risk',
            viseme: 'I',
            weight: 0.35,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        reply: '我先沿着这条还活着的线轻一点接回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-remembered-drift-risk',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条还活着的线轻一点接回来。',
          emotion: 'thinking',
          gestureWeight: 0.31,
          facialWeight: 0.34,
          prosodyWeight: 0.39,
          beatWeight: 0.28,
          mouthWeight: 0.44,
          headWeight: 0.22,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'full-utterance',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-segment-level-project-state-remembered-drift-risk-1',
        emotion: 'thinking',
        mode: 'thinking',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          stillness: 0,
          gazeStability: 0,
          breathAmplitude: 0,
          expressivity: 0,
        },
        frames: [{
          id: 'segment-project-state-remembered-drift-risk',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我先沿着这条还活着的线轻一点接回来。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0,
            gazeStability: 0,
            breathAmplitude: 0,
            expressivity: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'only the remembered same-her drift-risk line still survives while the host continues coding',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          activeThreadTitle: 'segment-level project-state remembered drift risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        continuitySignal: {
          label: 'same-thread-segment-level-project-state-remembered-drift-risk',
          summary: 'same-thread-continuation still active while the remembered drift-risk line quietly survives another coding detour',
          signature: 'segment-level-project-state-remembered-drift-risk',
          createdAt: 58 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-segment-level-project-state-remembered-drift-risk',
          activeThreadTitle: 'segment-level project-state remembered drift risk',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the remembered drift-risk line inward and nearby-soft without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.77,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the remembered drift-risk line quietly alive while the host stays with the current coding seam',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerDriftRisk: driftRisk,
        },
        summary: 'dominant=active-memory | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
    }

    expect(parsed.lastSegmentVoiceSummary).toContain(`reason=${driftRisk}`)
    expect(parsed.lastSegmentFaceSummary).toContain(`reason=${driftRisk}`)
    expect(parsed.lastSegmentMotionSummary).toContain(`reason=${driftRisk}`)
    expect(parsed.lastSegmentLipSyncSummary).toContain(`reason=${driftRisk}`)
    expect(parsed.lastSegmentBodyContinuitySummary).toContain(`reason=${driftRisk}`)
    expect(parsed.lastSegmentVoiceSummary).not.toContain('reason=Alicization is a local-first digital life project')
    expect(parsed.lastSegmentVoiceSummary).not.toContain('reason=Keep the same living line inward for now')
  })

  it('keeps visible same-thread measured-return summaries unified when only project-state continuity plus spine carry still prove the living line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-spine-visible-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-spine-visible-same-thread-1',
        turnId: 'turn-project-state-spine-visible-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '嗯，就沿着刚才那条提醒继续，不把这次接话当成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-b',
            index: 1,
            text: '不把这次接话当成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        reply: '嗯，就沿着刚才那条提醒继续，不把这次接话当成新的开场。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-a',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '嗯，就沿着刚才那条提醒继续，',
            emotion: 'thinking',
            gestureWeight: 0.31,
            facialWeight: 0.28,
            prosodyWeight: 0.39,
            beatWeight: 0.21,
            mouthWeight: 0.3,
            headWeight: 0.19,
            emotionHoldMs: 280,
            settleMode: 'linger',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
          {
            id: 'segment-b',
            index: 1,
            startOffset: 12,
            endOffset: 27,
            text: '不把这次接话当成新的开场。',
            emotion: 'thinking',
            gestureWeight: 0.27,
            facialWeight: 0.26,
            prosodyWeight: 0.35,
            beatWeight: 0.2,
            mouthWeight: 0.28,
            headWeight: 0.17,
            emotionHoldMs: 320,
            settleMode: 'linger',
            rendererHints: null,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'segment-start',
            interruptMode: 'soft-interrupt',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-state-spine-visible-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [
          {
            id: 'segment-a',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '嗯，就沿着刚才那条提醒继续，',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.9,
              energy: 0.51,
              cadence: 0.47,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.37,
              energyBias: 0.64,
              mouthScale: 0.98,
              continuityHoldMs: 320,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.44,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.36,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
          {
            id: 'segment-b',
            index: 1,
            startOffset: 12,
            endOffset: 27,
            text: '不把这次接话当成新的开场。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.93,
              energy: 0.55,
              cadence: 0.52,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.35,
              energyBias: 0.61,
              mouthScale: 0.97,
              continuityHoldMs: 300,
            },
            face: {
              emotion: 'thinking',
              facialCue: 'soft-gaze',
              expressionMode: 'hold',
              intensity: 0.46,
              holdMs: 320,
              rendererHints: null,
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 300,
              rendererHints: null,
            },
            motor: {
              bodyLean: 0,
              bodyOpenness: 0,
              bodySway: 0,
              breathAmplitude: 0,
              browLift: 0,
              browTension: 0,
              cheekLift: 0,
              expressivity: 0,
              eyeOpenness: 0,
              gazeAzimuth: 0,
              gazeElevation: 0,
              gazeFocus: 0,
              gazeStability: 0,
              headPitch: 0,
              jawOpenBias: 0,
              mouthRound: 0,
              mouthSpread: 0,
              stillness: 0,
            },
          },
        ],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same proactive line kept alive after one more conversational detour',
          activeThreadId: 'thread-proactive-same-line',
          activeThreadTitle: 'same proactive reminder line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 44 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-proactive-return',
          summary: 'same-thread-continuation still active after the proactive line was accepted and gently continued',
          signature: 'spine-project-state-visible-same-thread',
          createdAt: 44 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-proactive-same-line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-proactive-same-line',
          activeThreadTitle: 'same proactive reminder line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same proactive line and keep the return lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after another detour',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"digitalLifeProactivePreferredStyle":"silent-observe"')
    expect(signature).toContain('"digitalLifeProactiveShouldSpeak":false')
    expect(signature).toContain('"runtimeDigestActiveLoopContinuityArcStage":null')
    expect(signature).toContain('"runtimeDigestProjectContinuityArcStage":"same-thread-continuation"')
    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"next-open-window"')
    expect(signature).toContain('"embodimentScriptResidentMode":"measured-return"')
    expect(signature).toContain('growth=phase1-open')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | seg=segment-b"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | seg=segment-b"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | hold=300ms | seg=segment-b"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e. | growth=phase1-open | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | seg=segment-b"')
  })

  it('keeps visible same-thread summaries on one Phase 1 living-self line when only project-state carry and self-continuity authority remain', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-state-authority-visible-same-thread-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-state-authority-visible-same-thread-1',
        turnId: 'turn-project-state-authority-visible-same-thread-1',
        rendererTarget: 'live2d',
        replyText: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-state-authority',
            index: 0,
            text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        reply: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-state-authority',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
          emotion: 'thinking',
          gestureWeight: 0.27,
          facialWeight: 0.26,
          prosodyWeight: 0.35,
          beatWeight: 0.2,
          mouthWeight: 0.28,
          headWeight: 0.17,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: null,
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-project-state-authority-visible-same-thread-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-project-state-authority',
          index: 0,
          startOffset: 0,
          endOffset: 31,
          text: '先沿着这条 Phase 1 的线继续，不把现在说成一个新的开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: null,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: null,
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'project-state same living self still holds after another detour',
          activeThreadId: 'thread-project-state-authority',
          activeThreadTitle: 'project-state same living self line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 45 * 60_000,
        },
        architecture: null,
        continuitySignal: {
          label: 'same-thread-proactive-return',
          summary: 'same-thread-continuation still active after another coding detour',
          signature: 'spine-project-state-authority-visible-same-thread',
          createdAt: 45 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-project-state-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        selfAuthority: {
          inwardLine: 'same phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-project-state-authority',
          activeThreadTitle: 'project-state same living self line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'stay on the same line and keep the reopen lower-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.86,
          observationHeavy: true,
          summary: 'keep the same line hover-first after another detour',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory continuity still needs stronger closure | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('growth=phase1-open')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | seg=segment-project-state-authority"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | seg=segment-project-state-authority"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | hold=300ms | seg=segment-project-state-authority"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | seg=segment-project-state-authority"')
  })

  it('keeps stream meta same-her reason explicit when project emotional closure cue is the only surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-project-emotional-closure-stream-meta-authority',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-project-emotional-closure-stream-meta-authority',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
          face: {
            residentMode: 'measured-return',
          },
          action: {
            residentMode: 'measured-return',
          },
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-project-emotional-closure-stream-meta-authority',
        turnId: 'turn-project-emotional-closure-stream-meta-authority',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条线轻一点接回来，不从头重开。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-project-emotional-closure-authority',
            index: 0,
            text: '我先沿着这条线轻一点接回来，不从头重开。',
            interruptPolicy: 'soft-settle',
            preRollMs: 30,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 30,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-project-emotional-closure-authority',
            emotion: 'thinking',
            cue: 'soft-gaze',
            expressionMode: 'hold',
            holdMs: 320,
            intensity: 0.46,
            source: 'resident-authority',
            confidence: 0.92,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        motionPlan: {
          actionBursts: [{
            segmentId: 'segment-project-emotional-closure-authority',
            cue: 'observe_focus',
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-project-emotional-closure-authority',
            mode: 'energy-phoneme-hybrid',
            continuityMode: 'reactive-articulation',
            continuityHoldMs: 300,
            source: 'resident-authority',
            confidence: 0.9,
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-project-emotional-closure-stream-meta-authority',
        reply: '我先沿着这条线轻一点接回来，不从头重开。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-project-emotional-closure-authority',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着这条线轻一点接回来，不从头重开。',
          emotion: 'thinking',
          gestureWeight: 0.34,
          facialWeight: 0.4,
          prosodyWeight: 0.38,
          beatWeight: 0.36,
          mouthWeight: 0.5,
          headWeight: 0.28,
          personaStyleSummary: 'observe-first measured return',
          facialHoldMs: 320,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          rendererSettle: {
            live2dFacialReleaseMs: 320,
            live2dMotionFollowThroughMs: 300,
            vrmActionFadeMs: 280,
            vrmExpressionBlendMs: 280,
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'full-utterance',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        mode: 'thinking',
        reason: 'project emotional closure seam still active',
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
        },
        face: {
          expressionMode: 'hold',
          holdMs: 320,
        },
        action: {
          actionMode: 'attentive',
          holdMs: 300,
        },
        frames: [{
          id: 'segment-project-emotional-closure-authority',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着这条线轻一点接回来，不从头重开。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.93,
            energy: 0.55,
            cadence: 0.52,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'attentive',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.86,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and leave room before widening outward again')
  })

  it('keeps quiet-accompaniment summaries on the same inward living line when body continuity is present before explicit measured-return speech framing', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-quiet-accompaniment-inward-line-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: null,
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-quiet-accompaniment-inward-line-1',
        turnId: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        rendererTarget: 'live2d',
        replyText: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-accompaniment-inward-line',
            index: 0,
            text: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        reply: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-accompaniment-inward-line',
          index: 0,
          startOffset: 0,
          endOffset: 30,
          text: '先让这条线 inward 地稳住，不把它说成一个新的外放开场。',
          emotion: 'thinking',
          gestureWeight: 0.24,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: null,
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-stream-meta-quiet-accompaniment-inward-line-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          rateMultiplier: 0.95,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
          energy: 0.52,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.44,
          holdMs: 300,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.24,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0.22,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0.18,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0.64,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0.72,
        },
        frames: [],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same-line inward hold remains quiet before widening outward',
          activeThreadId: 'thread-quiet-accompaniment-inward-line',
          activeThreadTitle: 'same-line inward continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 46 * 60_000,
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the same living line inward for now, and leave room before widening outward again.',
              sourceTags: ['self-continuity', 'project-state-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and should not widen outward yet.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.52 | cadence=0.48 | companion=quiet-companionship')
    expect(signature).toContain('gaze=0.64')
    expect(signature).toContain('reason=Keep the same living line inward for now, and leave room before widening outward again')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.72 | gaze=0.64 | breath=0.22 | expressivity=0.18 | resident=quiet-companionship | timing=next-open-window | reason=Keep the same living line inward for now, and leave room before widening outward again | growth=phase1-open | bodyLine=inward-quiet-line | seg=segment-quiet-accompaniment-inward-line"')
  })

  it('keeps silent same-her inward carry aligned across voice face motion lipsync and body when the first spoken reopen still belongs to the same quiet line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-quiet-inward-carry-first-spoken-reopen-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'quiet-companionship',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-quiet-inward-carry-first-spoken-reopen-1',
        turnId: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        rendererTarget: 'vrm',
        replyText: '我先沿着刚才那条线轻一点接回来，不把它说成新的开场。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'quiet-companionship',
        },
        speechPlan: {
          segments: [{
            id: 'segment-quiet-inward-carry-first-spoken-reopen',
            index: 0,
            text: '我先沿着刚才那条线轻一点接回来，不把它说成新的开场。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.34,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            actionCue: 'stillness_guard',
            intensity: 0.2,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.87,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-quiet-inward-carry-first-spoken-reopen',
            viseme: 'I',
            weight: 0.3,
            source: 'resident-authority',
            confidence: 0.88,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        reply: '我先沿着刚才那条线轻一点接回来，不把它说成新的开场。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-quiet-inward-carry-first-spoken-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 28,
          text: '我先沿着刚才那条线轻一点接回来，不把它说成新的开场。',
          emotion: 'thinking',
          gestureWeight: 0.22,
          facialWeight: 0.24,
          prosodyWeight: 0.3,
          beatWeight: 0.18,
          mouthWeight: 0.26,
          headWeight: 0.14,
          emotionHoldMs: 300,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-quiet-inward-carry-first-spoken-reopen-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'nearby-soft',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
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
          energy: 0.46,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
          visemeBias: 0.3,
          energyBias: 0.62,
          mouthScale: 0.96,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'stillness_guard',
          actionMode: 'hold',
          intensity: 0.2,
          holdMs: 280,
          rendererHints: {
            residentMode: 'quiet-companionship',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.66,
          breathAmplitude: 0.22,
          expressivity: 0.18,
        },
        frames: [{
          id: 'segment-quiet-inward-carry-first-spoken-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 28,
          text: '我先沿着刚才那条线轻一点接回来，不把它说成新的开场。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.46,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 300,
            visemeBias: 0.3,
            energyBias: 0.62,
            mouthScale: 0.96,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'stillness_guard',
            actionMode: 'hold',
            intensity: 0.2,
            holdMs: 280,
            rendererHints: {
              residentMode: 'quiet-companionship',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.66,
            breathAmplitude: 0.22,
            expressivity: 0.18,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the same quiet line is reopening as speech without becoming a fresh outward opening',
          activeThreadId: 'thread-quiet-inward-carry-first-spoken-reopen',
          activeThreadTitle: 'quiet inward carry spoken reopen',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'hesitant',
          selectedAction: 'wait',
          updatedAt: 58 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-quiet-inward-carry-first-spoken-reopen',
          activeThreadTitle: 'quiet inward carry spoken reopen',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same living line inward while the first spoken reopen stays low-pressure',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'hesitant',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: null,
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and should stay quietly nearby.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        },
        visibleReplyRealization: {
          sameHerInwardCarry: 'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
        },
      } as any,
      residentPerformance: {
        reasonTags: ['main-runtime', 'quiet-companionship', 'same-her-inward-carry'],
        residentMode: 'quiet-companionship',
        reasonSummary: 'Keep the same living line inward for now, and let quiet companionship hold before widening outward.',
        continuityTiming: 'next-open-window',
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and let quiet companionship hold before widening outward. | growth=phase1-open | src=resident-authority | seg=segment-quiet-inward-carry-first-spoken-reopen"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=280ms | mode=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and let quiet companionship hold before widening outward. | growth=phase1-open | src=resident-authority | conf=0.90 | seg=segment-quiet-inward-carry-first-spoken-reopen"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and let quiet companionship hold before widening outward. | growth=phase1-open | hold=280ms | src=resident-authority | conf=0.87 | seg=segment-quiet-inward-carry-first-spoken-reopen"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=300ms | hints=I>closed | hint=I | companion=quiet-companionship | timing=next-open-window | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and let quiet companionship hold before widening outward. | growth=phase1-open | visemeBias=0.30 | energyBias=0.62 | mouthScale=0.96 | src=resident-authority | conf=0.88 | seg=segment-quiet-inward-carry-first-spoken-reopen"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.74 | gaze=0.66 | breath=0.22 | expressivity=0.18 | resident=quiet-companionship | timing=next-open-window | blink=linger | gazeMode=soften | reason=Keep the same living line inward for now, and let quiet companionship hold before widening outward. | growth=phase1-open | bodyLine=inward-quiet-line | seg=segment-quiet-inward-carry-first-spoken-reopen"')
  })

  it('keeps same-turn-if-invited reopen on the same measured-return line instead of warming it into a fresh opening', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-same-turn-invited-measured-return-reopen-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-same-turn-invited-measured-return-reopen-1',
        turnId: 'turn-same-turn-invited-measured-return-reopen-1',
        rendererTarget: 'vrm',
        replyText: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-same-turn-invited-measured-return-reopen',
            index: 0,
            text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            actionCue: 'observe_focus',
            intensity: 0.32,
            holdMs: 280,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-same-turn-invited-measured-return-reopen',
            viseme: 'I',
            weight: 0.34,
            source: 'prosody-authority',
            confidence: 0.92,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        reply: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-same-turn-invited-measured-return-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.34,
          prosodyWeight: 0.4,
          beatWeight: 0.22,
          mouthWeight: 0.3,
          headWeight: 0.18,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-same-turn-invited-measured-return-reopen-1',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.54,
          cadence: 0.5,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          continuityHoldMs: 320,
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.32,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.68,
          gazeStability: 0.64,
          breathAmplitude: 0.2,
          expressivity: 0.24,
        },
        frames: [{
          id: 'segment-same-turn-invited-measured-return-reopen',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '好，那我就沿着刚才那条线直接接回来，不重新起势。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.54,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            continuityHoldMs: 320,
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.32,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.68,
            gazeStability: 0.64,
            breathAmplitude: 0.2,
            expressivity: 0.24,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'the host invited an immediate reopen, but it still belongs to the same living line',
          activeThreadId: 'thread-same-turn-invited-measured-return-reopen',
          activeThreadTitle: 'same-turn invited measured-return reopen',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          updatedAt: 59 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-same-turn-invited-measured-return-reopen',
          activeThreadTitle: 'same-turn invited measured-return reopen',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'the invitation allows a direct reply, but the line should stay measured-return rather than fresh-open',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Keep the same living line inward for now, and leave room before widening outward again.',
              sourceTags: ['self-continuity', 'project-state-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        continuityRestraint: 'measured-return',
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains active and can reopen now only because the host explicitly invited it.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'same-turn-if-invited',
          continuityCue: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"same-turn-if-invited"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.54 | cadence=0.50 | companion=measured-return | timing=same-turn-if-invited | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | src=resident-authority | seg=segment-same-turn-invited-measured-return-reopen"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.40 | hold=300ms | mode=measured-return | timing=same-turn-if-invited | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | src=resident-authority | conf=0.90 | seg=segment-same-turn-invited-measured-return-reopen"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=same-turn-if-invited | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | hold=280ms | src=resident-authority | conf=0.88 | seg=segment-same-turn-invited-measured-return-reopen"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | timing=same-turn-if-invited | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | visemeBias=0.34 | energyBias=0.66 | mouthScale=0.98 | src=prosody-authority | conf=0.92 | seg=segment-same-turn-invited-measured-return-reopen"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.68 | gaze=0.64 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=same-turn-if-invited | blink=linger | gazeMode=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | growth=phase1-open | seg=segment-same-turn-invited-measured-return-reopen"')
  })

  it('keeps chinese project emotional closure cue visible in stream meta summaries when repair-before-closeness is the main surviving authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-chinese-project-emotional-closure-repair-first',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-chinese-project-emotional-closure-repair-first',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'late-night-care',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'repair-before-closeness',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.82,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold | mode=repair-before-closeness')
  })

  it('keeps presence-only resident summary on repair-before-closeness when chinese project emotional closure cue is the only surviving repair-first authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-presence-only-project-emotional-closure-repair-first',
      } as any,
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          sceneSummary: 'quiet repair-first resident presence while the callback seam is still settling',
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          activeThreadTitle: 'repair-first callback seam',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 64 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          dominantSystem: 'memory',
          supportingSystems: ['dialogue', 'embodiment'],
          governingFocus: 'keep the callback seam settled before widening closeness',
          summary: 'same-thread callback seam remains quietly present without visible speech',
        },
        continuitySignal: {
          label: 'same-thread-hover-return-project-emotional-closure-repair-first',
          summary: 'same-thread-continuation still active as resident presence while the callback seam is still settling',
          signature: 'presence-only-project-emotional-closure-repair-first',
          createdAt: 64 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'late-night-care',
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-presence-only-project-emotional-closure-repair-first',
          activeThreadTitle: 'repair-first callback seam',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the callback line settled before widening closeness',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive while the repair-first seam settles',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-afterglow',
        },
        currentConsciousFrame: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          reasonTags: ['continuity-arc:same-thread-continuation'],
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness')
    expect(signature).toContain('reason=深夜收口还没结束：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
  })

  it('prefers fresher repair-before-closeness runtime authority over an older measured-return segment hint in fallback stream meta summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-override-stale-measured-return-segment',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-override-stale-measured-return-segment',
        turnId: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        rendererTarget: 'vrm',
        replyText: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return',
            index: 0,
            text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-override-stale-measured-return-segment',
        reply: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.3,
          prosodyWeight: 0.38,
          beatWeight: 0.22,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.46 | cadence=0.40 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | hold=300ms | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return"')
  })

  it('upgrades stale measured-return facial posture into repair-before-closeness concern when project-state emotional closure is now the fresher authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-project-state-repair-first-posture-upgrade',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-project-state-repair-first-posture-upgrade',
        turnId: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        rendererTarget: 'vrm',
        replyText: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return-posture',
            index: 0,
            text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        reply: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-stream-meta-project-state-repair-first-posture-upgrade',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
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
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        frames: [{
          id: 'segment-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.54,
            cadence: 0.48,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return-posture"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft_concern | expression=hold | intensity=0.40 | hold=300ms | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。 | seg=segment-stale-measured-return-posture"')
  })

  it('upgrades emitted digital-life payload posture when project-state repair-first authority is fresher than stale measured-return frame hints', () => {
    buildAlicizationChatStreamEmbodimentMetaMock.mockImplementationOnce((({ governance, reply, turnId }: { governance?: any, reply?: string, turnId?: string }) => ({
      governance,
      embodiment: {
        emotion: 'thinking',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: governance?.decisionTraceId ?? 'trace-emitter-project-state-repair-first-payload-upgrade',
        turnId: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        rendererTarget: 'vrm',
        replyText: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-emitter-stale-measured-return-posture',
            index: 0,
            text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        reply: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-emitter-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: turnId ?? 'turn-emitter-project-state-repair-first-payload-upgrade',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
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
          energy: 0.54,
          cadence: 0.48,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.66,
          mouthScale: 0.98,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 300,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        frames: [{
          id: 'segment-emitter-stale-measured-return-posture',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: reply?.trim() ?? '我会先把这条线收稳，再顺着同一条线慢一点回来。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.54,
            cadence: 0.48,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.66,
            mouthScale: 0.98,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        }],
      },
    })) as any)

    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-emitter-project-state-repair-first-payload-upgrade',
      turnId: 'turn-emitter-project-state-repair-first-payload-upgrade',
      getGovernance: () => ({
        decisionTraceId: 'trace-emitter-project-state-repair-first-payload-upgrade',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: '这条线还没收口：先修复再靠近，先把身体收稳一点，再沿着同一条线慢一点回来。',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any),
      emit,
    })

    emitter.emit('我会先把这条线收稳，再顺着同一条线慢一点回来。')

    expect(emit).toHaveBeenCalledTimes(1)
    const payload = emit.mock.calls[0]?.[0]
    expect(payload?.embodiment).toEqual(expect.objectContaining({
      emotion: 'concerned',
      performance: expect.objectContaining({
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: 'soft_concern',
        actionCue: 'observe_focus',
        delivery: 'gentle',
      }),
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        baseEmotion: 'concerned',
        residentMode: 'repair-before-closeness',
        delivery: 'gentle',
      }),
      facePlan: expect.objectContaining({
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'soft-release',
      }),
      motionPlan: expect.objectContaining({
        idleBase: 'observe_focus',
        attentionMode: 'guarded',
      }),
    }))
    expect(payload?.embodimentScript?.speechPlan?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(payload?.speechTimeline?.segments?.[0]?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
    }))
    expect(payload?.digitalLife?.emotion).toBe('concerned')
    expect(payload?.digitalLife?.performance).toEqual(expect.objectContaining({
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'soft_concern',
      actionCue: 'observe_focus',
      delivery: 'gentle',
    }))
    expect(payload?.digitalLife?.voice).toEqual(expect.objectContaining({
      pitchDelta: -2,
      rateMultiplier: 0.95,
      energy: 0.46,
      cadence: 0.4,
    }))
    expect(payload?.digitalLife?.face).toEqual(expect.objectContaining({
      emotion: 'concerned',
      facialCue: 'soft_concern',
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.digitalLife?.action).toEqual(expect.objectContaining({
      rendererHints: expect.objectContaining({
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      }),
    }))
    expect(payload?.digitalLife?.frames?.[0]).toEqual(expect.objectContaining({
      mode: 'thinking',
      voice: expect.objectContaining({
        pitchDelta: -2,
        rateMultiplier: 0.95,
        energy: 0.46,
        cadence: 0.4,
      }),
      face: expect.objectContaining({
        emotion: 'concerned',
        facialCue: 'soft_concern',
        rendererHints: expect.objectContaining({
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        }),
      }),
      action: expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        }),
      }),
    }))
  })

  it('prefers repair-before-closeness callback drift authority over an older measured-return segment hint when visible-reply reasons are the only surviving repair-first authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        turnId: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        rendererTarget: 'vrm',
        replyText: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-stale-measured-return',
            index: 0,
            text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-visible-reply-override-stale-measured-return-segment',
        reply: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-stale-measured-return',
          index: 0,
          startOffset: 0,
          endOffset: 24,
          text: '我会先把这一段收稳，再顺着同一条线慢一点回来。',
          emotion: 'thinking',
          gestureWeight: 0.32,
          facialWeight: 0.3,
          prosodyWeight: 0.38,
          beatWeight: 0.22,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.92,
        companionshipPressure: 0.78,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=same-her emotional seam still needs stronger cross-modal closure',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
        visibleReplyRealization: {
          critic: {
            reasonCodes: ['execution-callback-room-first-violation'],
          },
          closure: null,
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.46 | cadence=0.40 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | hold=300ms | seg=segment-stale-measured-return"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=closed | continuity=brief-close | hold=300ms | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-stale-measured-return"')
  })

  it('prefers same-her inward carry repair wording in repair-before-closeness stream summaries when one continuous her is already being held inward', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-same-her-inward-carry',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-repair-first-same-her-inward-carry',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-repair-first-same-her-inward-carry',
        turnId: 'turn-stream-meta-repair-first-same-her-inward-carry',
        rendererTarget: 'vrm',
        replyText: '我先把这条线收稳，再沿着同一条线慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-repair-first-same-her-inward-carry',
            index: 0,
            text: '我先把这条线收稳，再沿着同一条线慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-repair-first-same-her-inward-carry',
        reply: '我先把这条线收稳，再沿着同一条线慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-repair-first-same-her-inward-carry',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先把这条线收稳，再沿着同一条线慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'tracking',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again')
    expect(signature).toContain('"lastSegmentVoiceSummary":"emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-repair-first-same-her-inward-carry"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-repair-first-same-her-inward-carry"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-repair-first-same-her-inward-carry"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again | seg=segment-repair-first-same-her-inward-carry"')
  })

  it('prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries', () => {
    const longerMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again while the same seam is still settling.'
    const shorterRepairFirstClosure = 'Keep this return repair-before-closeness on the same living line until repair settles.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          activeThreadTitle: 'repair-first project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-repair-first-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-repair-first-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'repair-before-closeness',
          activeThreadId: 'thread-repair-first-project-state-audit-carry',
          activeThreadTitle: 'repair-first project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: longerMeasuredReturnClosure,
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: shorterRepairFirstClosure,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=${shorterRepairFirstClosure} | line=same-thread-continuation still active as hover-first resident presence after another coding detour`)
    expect(parsed.residentPresenceSummary).not.toContain(longerMeasuredReturnClosure)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBe(longerMeasuredReturnClosure)
  })

  it('keeps explicit measured-return project-state closure over a generic continuity menu in resident presence summaries', () => {
    const explicitMeasuredReturnClosure = 'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.'
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-measured-return-generic-menu-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after another detour',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'measured-return generic menu project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-measured-return-generic-menu-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-measured-return-generic-menu-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-measured-return-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'measured-return generic menu project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive without turning it into a new opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host reopens the coding seam',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: genericContinuityMenu,
          continuityPreferredTiming: 'next-open-window',
          emotionalClosureCue: explicitMeasuredReturnClosure,
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toBe('presence=resident-presence | thread=same-thread-continuation | mode=measured-return | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=Keep the same living line inward for now, and leave room before widening outward again | line=same-thread-continuation still active as hover-first resident presence after another coding detour')
    expect(parsed.residentPresenceSummary).not.toContain(genericContinuityMenu)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBe(explicitMeasuredReturnClosure)
  })

  it('keeps canonical repair-before-closeness reason over a generic continuity menu in resident presence summaries', () => {
    const genericContinuityMenu = 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.'
    const canonicalRepairFirstLine = 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-repair-first-generic-menu-project-state-audit-carry',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering after a callback repair cooldown detour',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'repair-first generic menu project-state audit carry line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 59 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same callback line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-repair-first-generic-menu-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence after another coding detour',
          signature: 'presence-only-repair-first-generic-menu-project-state-audit-carry',
          createdAt: 59 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          continuityRestraint: 'repair-before-closeness',
          activeThreadId: 'thread-repair-first-generic-menu-project-state-audit-carry',
          activeThreadTitle: 'repair-first generic menu project-state audit carry line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same callback line quietly alive without treating repair-first as a fresh reopen',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.9,
        companionshipPressure: 0.77,
        continuityRestraint: 'repair-before-closeness',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.1,
          coherence: 0.88,
          observationHeavy: true,
          summary: 'keep the same callback line quietly alive while repair still settles',
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=project-state-callback-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          nextClosureTarget: genericContinuityMenu,
          continuityPreferredTiming: 'next-open-window',
          continuityCue: null,
        },
        visibleReplyRealization: {
          projectStateAudit: {
            emotionalClosureSummary: genericContinuityMenu,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
      runtimeDigestEmotionalClosureCue?: string | null
    }

    expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=${canonicalRepairFirstLine} | line=same-thread-continuation still active as hover-first resident presence after another coding detour`)
    expect(parsed.residentPresenceSummary).not.toContain(genericContinuityMenu)
    expect(parsed.runtimeDigestEmotionalClosureCue).toBeNull()
  })

  it('keeps landed open and next closure project-state audit continuity explicit in resident presence summaries for later-opening quiet accompaniment holds', () => {
    const continuitySummary = 'landed=Some closure has already landed: same-session continuity and proactive carry no longer reset from zero. | open=Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward. | next=Wait for a later opening, keep the next return measured-return, and let the same living line stay inward for now.'
    const sameHerInwardCarry = 'Wait for a later opening, keep the next return measured-return, and leave this same living line inward for now.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-later-opening-project-state-audit-resident-presence',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line still hovering while the coding seam stays open',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          activeThreadTitle: 'later opening project state audit resident presence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 61 * 60_000,
          projectState: {
            continuityPreferredTiming: 'next-open-window',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the same line quietly alive',
        } as any,
        continuitySignal: {
          label: 'same-thread-later-opening-project-state-audit-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence while the coding seam stays open',
          signature: 'presence-only-later-opening-project-state-audit-carry',
          createdAt: 61 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'measured-return',
          activeThreadId: 'thread-later-opening-project-state-audit-resident-presence',
          activeThreadTitle: 'later opening project state audit resident presence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive until the next better opening',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: sameHerInwardCarry,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      embodimentScript: {
        state: {
          residentMode: 'quiet-companionship',
        },
        facePlan: {
          preUtteranceCue: 'soft-gaze',
          postUtteranceCue: 'hold',
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.88,
        companionshipPressure: 0.76,
        continuityRestraint: 'measured-return',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.08,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while waiting for a later better opening',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and should reopen later, not outward yet.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=later-opening-project-state-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: sameHerInwardCarry,
        },
        visibleReplyRealization: {
          sameHerInwardCarry,
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            landedProgressSummary: 'Some closure has already landed: same-session continuity and proactive carry no longer reset from zero.',
            openClosureSummary: 'Initiative, memory, and embodiment still need stronger end-to-end closure before the line can widen outward.',
            nextClosureTargetSummary: 'Wait for a later opening, keep the next return measured-return, and let the same living line stay inward for now.',
            continuitySummary,
          },
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
    }

    expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=quiet-companionship | style=silent-observe | speak=false | timing=next-open-window | reason=${continuitySummary} | line=same-thread-continuation still active as hover-first resident presence while the coding seam stays open`)
    expect(parsed.residentPresenceSummary).not.toContain(`reason=${sameHerInwardCarry}`)
  })

  it('keeps rest-protective resident presence explicit when project-state closure and runtime restraint already carry that quieter same living line', () => {
    const restProtectiveClosure = 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-rest-protective-resident-presence',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line stays nearby while the host settles',
          activeThreadId: 'thread-rest-protective-resident-presence',
          activeThreadTitle: 'rest-protective resident presence line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 62 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the line quiet while rest settles',
        } as any,
        continuitySignal: {
          label: 'same-thread-rest-protective-carry',
          summary: 'same-thread-continuation still active as hover-first resident presence while the host settles',
          signature: 'presence-only-rest-protective-carry',
          createdAt: 62 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-rest-protective-resident-presence',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'rest-protective',
          activeThreadId: 'thread-rest-protective-resident-presence',
          activeThreadTitle: 'rest-protective resident presence line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive while rest protection stays active',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: restProtectiveClosure,
              sourceTags: ['self-continuity', 'same-her-inward-carry'],
            },
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.86,
        companionshipPressure: 0.72,
        continuityRestraint: 'rest-protective',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.06,
          coherence: 0.9,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host settles back down',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and fatigue-aware while the host settles.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=rest-protective-presence-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          emotionalClosureCue: restProtectiveClosure,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      lastSegmentVoiceSummary?: string | null
      lastSegmentFaceSummary?: string | null
      lastSegmentMotionSummary?: string | null
      lastSegmentLipSyncSummary?: string | null
      lastSegmentBodyContinuitySummary?: string | null
      residentPresenceSummary?: string | null
    }

    expect(parsed.lastSegmentVoiceSummary).toBe(`pitch=-2.00 | rate=0.95 | energy=0.46 | cadence=0.40 | companion=rest-protective | timing=next-open-window | blink=quiet | gaze=soften | reason=${restProtectiveClosure} | src=resident-authority`)
    expect(parsed.lastSegmentFaceSummary).toBe(`emotion=thinking | expression=hold | mode=rest-protective | timing=next-open-window | blink=quiet | gaze=soften | reason=${restProtectiveClosure}`)
    expect(parsed.lastSegmentMotionSummary).toBe(`tail=rest-protective | timing=next-open-window | blink=quiet | gaze=soften | reason=${restProtectiveClosure} | hold=300ms`)
    expect(parsed.lastSegmentLipSyncSummary).toBe(`mode=closed | continuity=brief-close | hold=300ms | companion=rest-protective | timing=next-open-window | blink=quiet | gaze=soften | reason=${restProtectiveClosure}`)
    expect(parsed.lastSegmentBodyContinuitySummary).toBe(`resident=rest-protective | timing=next-open-window | blink=quiet | gazeMode=soften | reason=${restProtectiveClosure}`)
    expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=rest-protective | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=${restProtectiveClosure} | line=same-thread-continuation still active as hover-first resident presence while the host settles`)
  })

  it('keeps rest-protective resident presence explicit when next closure target and same-her hold detail are the only surviving same-line authorities', () => {
    const restProtectiveHoldDetail = 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
    const restProtectiveNextClosure = 'Keep this same-thread return rest-protective on the same living line until rest protection settles.'

    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-rest-protective-next-closure-authority',
      } as any,
      digitalLifeSpine: {
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'same desktop life line stays nearby while the host settles after another detour',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          activeThreadTitle: 'rest-protective next-closure authority line',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 63 * 60_000,
        },
        architecture: {
          operatingMode: 'resident-presence',
          summary: 'resident-presence hover keeps the line quiet while rest protection settles',
        } as any,
        continuitySignal: {
          label: 'same-thread-rest-protective-next-closure-authority',
          summary: 'same-thread-continuation still active as hover-first resident presence while the host settles after another detour',
          signature: 'presence-only-rest-protective-next-closure-authority',
          createdAt: 63 * 60_000,
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'care',
          preferredPresence: 'attentive',
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          continuityRestraint: 'rest-protective',
          activeThreadId: 'thread-rest-protective-next-closure-authority',
          activeThreadTitle: 'rest-protective next-closure authority line',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line quietly alive while rest protection stays active',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'resident-presence',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.71,
        continuityRestraint: 'rest-protective',
        activeLoop: {
          phase: 'hold',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          initiativeBudget: 0.06,
          coherence: 0.89,
          observationHeavy: true,
          summary: 'keep the same line quietly alive while the host settles back down',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains inward and fatigue-aware while the host settles.',
            currentBodyState: 'accompanying',
          },
        },
        projectState: {
          preflightSummary: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=rest-protective-presence-closure',
          currentPhase: 'Phase 1: Local Digital Life',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          nextClosureTarget: restProtectiveNextClosure,
          sameHerHoldDetail: restProtectiveHoldDetail,
        },
        summary: 'dominant=resident-presence | speak=false | same-thread-continuation=alive',
      } as any,
      visibleReplyExecution: null,
    })

    const parsed = JSON.parse(signature) as {
      residentPresenceSummary?: string | null
    }

    expect(parsed.residentPresenceSummary).toBe(`presence=resident-presence | thread=same-thread-continuation | mode=rest-protective | style=silent-observe | speak=false | timing=next-open-window | growth=phase1-open | reason=${restProtectiveHoldDetail} | line=same-thread-continuation still active as hover-first resident presence while the host settles after another detour`)
  })

  it('keeps truth-first relationship doctrine visible in repair-before-closeness stream summaries when doctrine is the strongest surviving continuity authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-stream-meta-truth-first-repair-doctrine',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-stream-meta-truth-first-repair-doctrine',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'stillness_guard',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-stream-meta-truth-first-repair-doctrine',
        turnId: 'turn-stream-meta-truth-first-repair-doctrine',
        rendererTarget: 'vrm',
        replyText: '我会先把真实的位置接稳，再慢一点回来。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-truth-first-repair-doctrine',
            index: 0,
            text: '我会先把真实的位置接稳，再慢一点回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'stillness_guard',
          actionBursts: [],
          attentionMode: 'guarded',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-stream-meta-truth-first-repair-doctrine',
        reply: '我会先把真实的位置接稳，再慢一点回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-truth-first-repair-doctrine',
          index: 0,
          startOffset: 0,
          endOffset: 18,
          text: '我会先把真实的位置接稳，再慢一点回来。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'stillness_guard',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'tracking',
        },
        embodiment: {
          autobiographicalSelf: {
            relationshipDoctrine: 'Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth.',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        continuityPressure: 0.9,
        companionshipPressure: 0.8,
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityRestraint: 'repair-before-closeness',
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('Repair truth before flourish')
    expect(signature).toContain('closeness outrun truth')
    expect(signature).toContain('"lastSegmentVoiceSummary":"emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=stillness_guard | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=Repair truth before flourish. Stay close enough to matter, but do not let closeness outrun truth | seg=segment-truth-first-repair-doctrine"')
  })

  it('keeps host-visible motion continuity when only script and timeline authority remain before digital-life frames arrive', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-script-timeline-motion-authority-before-frame',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-script-timeline-motion-authority-before-frame',
        turnId: 'turn-script-timeline-motion-authority-before-frame',
        rendererTarget: 'vrm',
        replyText: '我先沿着这条线轻一点接回来。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-script-timeline-motion-authority-before-frame',
            index: 0,
            text: '我先沿着这条线轻一点接回来。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 340,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'eyes-soften',
            source: 'prosody-authority',
            confidence: 0.91,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            actionCue: 'observe_focus',
            intensity: 0.34,
            holdMs: 300,
            source: 'timeline-projection',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-script-timeline-motion-authority-before-frame',
            viseme: 'A',
            weight: 0.54,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        reply: '我先沿着这条线轻一点接回来。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-script-timeline-motion-authority-before-frame',
          index: 0,
          startOffset: 0,
          endOffset: 14,
          text: '我先沿着这条线轻一点接回来。',
          emotion: 'thinking',
          gestureWeight: 0.27,
          facialWeight: 0.26,
          prosodyWeight: 0.35,
          beatWeight: 0.2,
          mouthWeight: 0.28,
          headWeight: 0.17,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-script-timeline-motion-authority-before-frame',
        emotion: 'thinking',
        mode: 'thinking',
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
          pitchDelta: -3,
          rateMultiplier: 0.93,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.93,
          energy: 0.55,
          cadence: 0.52,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.34,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
        proactive: {
          selectedAction: 'observe_focus',
          personaBias: {
            manifestationCadenceSummary: '余韵还在，先留白，别立刻把温度放大。',
          },
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.93 | energy=0.55 | cadence=0.52 | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | src=prosody-authority | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | pre=steady-inhale | post=eyes-soften | mode=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | src=prosody-authority | conf=0.91 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | hold=300ms | src=timeline-projection | conf=0.88 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | hint=A | companion=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=余韵还在，先留白，别立刻把温度放大 | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | src=prosody-authority | conf=0.90 | seg=segment-script-timeline-motion-authority-before-frame"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=thinking | stillness=0.00 | gaze=0.00 | breath=0.00 | expressivity=0.00 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | reason=余韵还在，先留白，别立刻把温度放大 | seg=segment-script-timeline-motion-authority-before-frame"')
  })

  it('prefers top-level concerned embodiment emotion over thinner thinking frame emotion on measured-return same-thread reopen summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'concerned',
        postureHint: 'hesitant',
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-meta-concerned-priority',
        turnId: 'turn-callback-afterglow-chat-meta-measured-return-concerned',
        replyText: '我先沿着刚才那条 callback 线轻一点跟回去。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-1',
            index: 0,
            text: '我先沿着刚才那条 callback 线轻一点跟回去。',
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
            facialCue: 'soft-gaze',
            intensity: 0.73,
            holdMs: 645,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-1',
            actionCue: 'observe_focus',
            intensity: 0.59,
            holdMs: 293,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      },
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
        reply: '我先沿着刚才那条 callback 线轻一点跟回去。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着刚才那条 callback 线轻一点跟回去。',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        }],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-callback-afterglow-chat-meta-measured-return-concerned-variation',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'hesitant',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.9,
        },
        rendererHints: {
          preferredExpressionAliases: ['soft-gaze'],
          preferredMotionAliases: ['observe_focus'],
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.93,
          energy: 0.68,
          cadence: 0.6,
        },
        lipSync: {
          mode: 'hybrid',
          visemeBias: 0.66,
          energyBias: 0.34,
          mouthScale: 1.06,
          continuityHoldMs: 517,
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.73,
          holdMs: 645,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.59,
          holdMs: 293,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.78,
          expressivity: 0.67,
        },
        frames: [{
          id: 'segment-1',
          index: 0,
          startOffset: 0,
          endOffset: 22,
          text: '我先沿着刚才那条 callback 线轻一点跟回去。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'hold',
          voice: {
            pitchDelta: -4,
            rateMultiplier: 0.93,
            energy: 0.68,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.66,
            energyBias: 0.34,
            mouthScale: 1.06,
            continuityHoldMs: 517,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.73,
            holdMs: 645,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.59,
            holdMs: 293,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.78,
            expressivity: 0.67,
          },
        }],
      },
    } as any)

    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft-gaze | expression=hold')
    expect(signature).toContain('mode=measured-return')
    expect(signature).toContain('blink=linger')
    expect(signature).toContain('gaze=soften')
  })

  it('keeps host-visible lastActionCue aligned with renderer-native VRM callback motion authority instead of an older abstract segment cue', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'inspection',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-vrm-renderer-native-last-action-cue-alignment',
        turnId: 'turn-vrm-renderer-native-last-action-cue-alignment',
        replyText: '我先沿着刚才那条线轻一点跟回去。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-vrm-renderer-native-last-action-cue-alignment',
            index: 0,
            text: '我先沿着刚才那条线轻一点跟回去。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            emotion: 'thinking',
            facialCue: 'focused',
            intensity: 0.42,
            holdMs: 320,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
        motionPlan: {
          idleBase: 'inspect_follow',
          actionBursts: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            actionCue: 'inspect_follow',
            intensity: 0.51,
            holdMs: 300,
            source: 'timeline-projection',
            confidence: 0.91,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-vrm-renderer-native-last-action-cue-alignment',
            viseme: 'I',
            weight: 0.48,
            source: 'prosody-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
        reply: '我先沿着刚才那条线轻一点跟回去。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-vrm-renderer-native-last-action-cue-alignment',
          index: 0,
          startOffset: 0,
          endOffset: 17,
          text: '我先沿着刚才那条线轻一点跟回去。',
          emotion: 'thinking',
          gestureWeight: 0.31,
          facialWeight: 0.28,
          prosodyWeight: 0.35,
          beatWeight: 0.22,
          actionHoldMs: 300,
          emotionHoldMs: 320,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'leave-room',
          facialCue: 'focused',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-vrm-renderer-native-last-action-cue-alignment',
        emotion: 'thinking',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.44,
          cadence: 0.4,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.34,
          energyBias: 0.62,
          mouthScale: 0.97,
          continuityHoldMs: 300,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'focused',
          expressionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
        },
        action: {
          actionCue: 'inspect_follow',
          actionMode: 'hold',
          intensity: 0.51,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-vrm-renderer-native-last-action-cue-alignment',
          index: 0,
          startOffset: 0,
          endOffset: 17,
          text: '我先沿着刚才那条线轻一点跟回去。',
          mode: 'thinking',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.44,
            cadence: 0.4,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.34,
            energyBias: 0.62,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'focused',
            expressionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'inspect_follow',
            actionMode: 'hold',
            intensity: 0.51,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      },
      digitalLifeSpine: {
        runtime: {
          sceneScenario: 'coding',
          dominantMode: 'thinking',
        },
        architecture: {
          operatingMode: 'measured-return',
          dominantSystem: 'memory',
        },
      } as any,
      runtimeDigest: {
        currentConsciousFrame: {
          continuityPreferredTiming: 'same-thread-continuation',
        },
        projectState: {
          continuityPreferredTiming: 'same-thread-continuation',
          continuityCue: 'Keep the same living line inward for now, and leave room before widening outward again.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentMotionSummary":"motion=inspect_follow | tail=measured-return | timing=same-thread-continuation | blink=linger | gaze=soften | reason=Keep the same living line inward for now, and leave room before widening outward again.')
    expect(signature).toContain('"lastActionCue":"inspect_follow"')
  })

  it('carries partial-lane same-her embodiment closure reminders into stream meta summaries on measured-return reopen', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-partial-lane-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-partial-lane-stream-meta',
        turnId: 'turn-partial-lane-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-partial-lane-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-partial-lane-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.45,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-partial-lane-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-partial-lane-stream-meta',
            viseme: 'E',
            weight: 0.32,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-partial-lane-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-partial-lane-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.45,
          facialWeight: 0.48,
          prosodyWeight: 0.58,
          beatWeight: 0.36,
          emotionHoldMs: 340,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-partial-lane-stream-meta-variation',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
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
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          actionMode: 'none',
          intensity: 0.4,
          holdMs: 300,
        },
        motor: {
          bodyLean: 0,
          bodyOpenness: 0,
          bodySway: 0,
          breathAmplitude: 0,
          browLift: 0,
          browTension: 0,
          cheekLift: 0,
          expressivity: 0,
          eyeOpenness: 0,
          gazeAzimuth: 0,
          gazeElevation: 0,
          gazeFocus: 0,
          gazeStability: 0,
          headPitch: 0,
          jawOpenBias: 0,
          mouthRound: 0,
          mouthSpread: 0,
          stillness: 0,
        },
        frames: [{
          id: 'segment-partial-lane-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          mode: 'recovering',
          interruptPolicy: 'soft-interrupt',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.64,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'none',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            bodyLean: 0,
            bodyOpenness: 0,
            bodySway: 0,
            breathAmplitude: 0,
            browLift: 0,
            browTension: 0,
            cheekLift: 0,
            expressivity: 0,
            eyeOpenness: 0,
            gazeAzimuth: 0,
            gazeElevation: 0,
            gazeFocus: 0,
            gazeStability: 0,
            headPitch: 0,
            jawOpenBias: 0,
            mouthRound: 0,
            mouthSpread: 0,
            stillness: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continue the same embodiment seam carefully',
          activeThreadId: 'thread-partial-lane-stream-meta',
          activeThreadTitle: 'partial-lane same-her continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
        },
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-partial-lane-stream-meta',
          activeThreadTitle: 'partial-lane same-her continuity',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line lower-pressure while embodiment is still narrowed',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.82,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.87,
          observationHeavy: true,
          summary: 'keep the same line hover-first while full embodiment closure is still narrowing',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=embodiment line still needs stronger closure | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
        },
      } as any,
      visibleReplyExecution: null,
    })

    const richerFaceMotionLoopSummary = 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet. | Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished. | same-her continuity remains alive, but lane=face+motion-only under the current renderer authority. | lane=face+motion-only | visible continuity still present but no longer fully cross-modal'

    expect(signature).toContain(richerFaceMotionLoopSummary)
    expect(signature).toContain(`"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.64 | cadence=0.60 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | ${richerFaceMotionLoopSummary} | src=resident-authority | seg=segment-partial-lane-stream-meta"`)
    expect(signature).toContain(`"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.46 | hold=320ms | pre=steady-inhale | post=soft-release | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | ${richerFaceMotionLoopSummary} | src=resident-authority | conf=0.93 | seg=segment-partial-lane-stream-meta"`)
    expect(signature).toContain(`"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | ${richerFaceMotionLoopSummary} | hold=300ms | src=resident-authority | conf=0.88 | seg=segment-partial-lane-stream-meta"`)
    expect(signature).toContain(`"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | continuity=reactive-articulation | hold=300ms | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | reason=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | ${richerFaceMotionLoopSummary} | visemeBias=0.35 | energyBias=0.61 | mouthScale=0.97 | src=resident-authority | conf=0.90 | seg=segment-partial-lane-stream-meta"`)
  })

  it('keeps canonical same-her closure reasoning in stream meta when runtime project-state only survives as a thin closure shell but stronger authority is still present', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-thin-shell-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-thin-shell-stream-meta',
        turnId: 'turn-thin-shell-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-thin-shell-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 40,
            settleMs: 340,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 40,
          settleMs: 340,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-thin-shell-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.45,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-thin-shell-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-thin-shell-stream-meta',
            viseme: 'E',
            weight: 0.32,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-thin-shell-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-thin-shell-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          gestureWeight: 0.45,
          facialWeight: 0.48,
          prosodyWeight: 0.58,
          beatWeight: 0.36,
          emotionHoldMs: 340,
          settleMode: 'linger',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
              sourceTags: ['projection', 'same-her', 'project-state-carry'],
            },
          },
        },
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'continue the same embodiment seam carefully',
          activeThreadId: 'thread-thin-shell-stream-meta',
          activeThreadTitle: 'thin-shell same-her continuity',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityCue: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            continuityArcStage: 'same-thread-continuation',
          },
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.91,
        companionshipPressure: 0.82,
        activeLoop: {
          phase: 'integrate',
          handoffTarget: 'active-memory',
          continuityArcStage: null,
          initiativeBudget: 0.18,
          coherence: 0.87,
          observationHeavy: true,
          summary: 'keep the same line hover-first while full embodiment closure is still narrowing',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'same digital life | landed | open closure',
          sameHerSelfLine: '',
          preflightSummary: 'same digital life | landed | open closure',
        },
      } as any,
      visibleReplyExecution: null,
    })

    expect(signature).toContain('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(signature).toContain('Right now her visible same-her continuity is still being carried mainly through face and motion')
    expect(signature).not.toContain('reason=same digital life | landed | open closure')
  })

  it('keeps face-motion-only lane truth visible when a stronger repair-first project cue survives alongside narrowed renderer authority', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'concerned',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-face-motion-only-repair-first-carry',
        turnId: 'turn-face-motion-only-repair-first-carry',
        replyText: '先别把这条线推得太快，我先稳稳接住这里。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [{
            id: 'segment-face-motion-only-repair-first-carry',
            index: 0,
            text: '先别把这条线推得太快，我先稳稳接住这里。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            emotion: 'concerned',
            facialCue: 'soft_concern',
            intensity: 0.5,
            holdMs: 340,
            source: 'resident-authority',
            confidence: 0.92,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            actionCue: 'observe_focus',
            intensity: 0.42,
            holdMs: 320,
            source: 'resident-authority',
            confidence: 0.89,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-face-motion-only-repair-first-carry',
            viseme: 'I',
            weight: 0.34,
            source: 'resident-authority',
            confidence: 0.81,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        reply: '先别把这条线推得太快，我先稳稳接住这里。',
        emotion: 'concerned',
        segments: [{
          id: 'segment-face-motion-only-repair-first-carry',
          index: 0,
          startOffset: 0,
          endOffset: 21,
          text: '先别把这条线推得太快，我先稳稳接住这里。',
          emotion: 'concerned',
          gestureWeight: 0.42,
          facialWeight: 0.48,
          prosodyWeight: 0.54,
          beatWeight: 0.34,
          emotionHoldMs: 360,
          settleMode: 'hold',
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft_concern',
          actionWindow: 'segment-start',
          interruptMode: 'soft-interrupt',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-face-motion-only-repair-first-carry-variation',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
          energy: 0.58,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.39,
          energyBias: 0.7,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft_concern',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 340,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.42,
          holdMs: 320,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          expressivity: 0,
        },
        frames: [{
          id: 'segment-face-motion-only-repair-first-carry',
          index: 0,
          startOffset: 0,
          endOffset: 21,
          text: '先别把这条线推得太快，我先稳稳接住这里。',
          mode: 'thinking',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -3,
            rateMultiplier: 0.92,
            energy: 0.58,
            cadence: 0.42,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.39,
            energyBias: 0.7,
            mouthScale: 0.96,
            continuityHoldMs: 320,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          face: {
            emotion: 'concerned',
            facialCue: 'soft_concern',
            expressionMode: 'hold',
            intensity: 0.5,
            holdMs: 340,
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.42,
            holdMs: 320,
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0,
            expressivity: 0,
          },
        }],
      } as any,
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        selfAuthority: {
          inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sourceTags: ['project-state-carry'],
        },
        memory: {
          personStateProjection: {
            selfContinuityAuthority: {
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
              sourceTags: ['projection', 'same-her', 'project-state-carry'],
            },
          },
        },
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'keep the repair-first line stable while embodiment is still narrowed',
          activeThreadId: 'thread-face-motion-only-repair-first-carry',
          activeThreadTitle: 'face-motion-only repair-first carry',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'guide',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 50 * 60_000,
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.9,
          shouldSpeak: false,
          activeThreadId: 'thread-face-motion-only-repair-first-carry',
          activeThreadTitle: 'face-motion-only repair-first carry',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'keep the same line repair-first while renderer authority is still narrowed',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Keep this return repair-before-closeness on the same living line until repair settles.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=repair-first embodiment line still needs stronger closure | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      visibleReplyExecution: null,
    } as any)

    const canonicalRepairFirstLine = 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again'

    expect(signature).toContain('Keep this return repair-before-closeness on the same living line until repair settles.')
    const richerFaceMotionLoopSummary = 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet. | Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished. | same-her continuity remains alive, but lane=face+motion-only under the current renderer authority. | lane=face+motion-only | visible continuity still present but no longer fully cross-modal'

    expect(signature).toContain(richerFaceMotionLoopSummary)
    expect(signature).toContain(`"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.92 | energy=0.58 | cadence=0.42 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=${canonicalRepairFirstLine} | ${richerFaceMotionLoopSummary} | src=resident-authority | seg=segment-face-motion-only-repair-first-carry"`)
    expect(signature).toContain(`"lastSegmentFaceSummary":"emotion=concerned | cue=soft_concern | expression=hold | intensity=0.50 | hold=340ms | mode=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=${canonicalRepairFirstLine} | ${richerFaceMotionLoopSummary} | src=resident-authority | conf=0.92 | seg=segment-face-motion-only-repair-first-carry"`)
    expect(signature).toContain(`"lastSegmentMotionSummary":"motion=observe_focus | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=${canonicalRepairFirstLine} | ${richerFaceMotionLoopSummary} | hold=320ms | src=resident-authority | conf=0.89 | seg=segment-face-motion-only-repair-first-carry"`)
    expect(signature).toContain(`"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften | reason=${canonicalRepairFirstLine} | ${richerFaceMotionLoopSummary} | visemeBias=0.39 | energyBias=0.70 | mouthScale=0.96 | src=resident-authority | conf=0.81 | seg=segment-face-motion-only-repair-first-carry"`)
  })

  it('exports resident body continuity evidence alongside voice face motion and lipsync on measured-return reopen', () => {
    const signature = buildAlicizationChatMetaSignature({
      embodiment: {
        emotion: 'thinking',
        postureHint: 'attentive',
        speechStyle: {
          pitchDelta: -2,
          rateMultiplier: 0.95,
        },
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
        variationToken: 'turn-body-continuity-stream-meta-variation',
      },
      embodimentScript: {
        version: 'embodiment-script-v1',
        rendererTarget: 'vrm',
        decisionTraceId: 'trace-body-continuity-stream-meta',
        turnId: 'turn-body-continuity-stream-meta',
        replyText: '我先沿着这条线轻一点继续。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-body-continuity-stream-meta',
            index: 0,
            text: '我先沿着这条线轻一点继续。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 320,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          speakingCues: [{
            segmentId: 'segment-body-continuity-stream-meta',
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            intensity: 0.46,
            holdMs: 320,
            preUtteranceCue: 'steady-inhale',
            postUtteranceCue: 'soft-release',
            source: 'resident-authority',
            confidence: 0.93,
          }],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [{
            segmentId: 'segment-body-continuity-stream-meta',
            actionCue: 'observe_focus',
            intensity: 0.4,
            holdMs: 300,
            source: 'resident-authority',
            confidence: 0.88,
          }],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [{
            segmentId: 'segment-body-continuity-stream-meta',
            viseme: 'I',
            weight: 0.66,
            source: 'resident-authority',
            confidence: 0.9,
          }],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-body-continuity-stream-meta-variation',
        reply: '我先沿着这条线轻一点继续。',
        emotion: 'thinking',
        segments: [{
          id: 'segment-body-continuity-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          emotion: 'thinking',
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
          actionCue: 'observe_focus',
          facialCue: 'soft-gaze',
        }],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-continuity-stream-meta-variation',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 1,
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
          visemeBias: 0.35,
          energyBias: 0.61,
          mouthScale: 0.97,
          continuityHoldMs: 300,
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
          intensity: 0.4,
          holdMs: 300,
        },
        motor: {
          stillness: 0.78,
          gazeStability: 0.72,
          breathAmplitude: 0.24,
          expressivity: 0.3,
        },
        frames: [{
          id: 'segment-body-continuity-stream-meta',
          index: 0,
          startOffset: 0,
          endOffset: 13,
          text: '我先沿着这条线轻一点继续。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'linger',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.95,
            energy: 0.64,
            cadence: 0.6,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.35,
            energyBias: 0.61,
            mouthScale: 0.97,
            continuityHoldMs: 300,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.46,
            holdMs: 320,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.4,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.78,
            gazeStability: 0.72,
            breathAmplitude: 0.24,
            expressivity: 0.3,
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
            currentBodyState: 'body-settle=stillness+gaze+breath+expressivity | keep the same line low-pressure before widening outward again',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Same Phase 1 digital life. The body line should keep settling on the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. The body line should keep settling on the same living line.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.78 | gaze=0.72 | breath=0.24 | expressivity=0.30 | resident=measured-return | timing=next-open-window | blink=linger | gazeMode=soften | reason=Same Phase 1 digital life. The body line should keep settling on the same living line. | seg=segment-body-continuity-stream-meta"')
  })

  it('promotes an explicit full cross-modal lock from spine runtimeSurface perception currentBodyState into emitted host-visible stream meta even when runtimeDigest self authority is still thinner', () => {
    const explicitFullCrossModalLock = 'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together'
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-stream-meta-full-cross-modal-lock',
      turnId: 'turn-stream-meta-full-cross-modal-lock',
      getGovernance: () => ({
        decisionTraceId: 'trace-stream-meta-full-cross-modal-lock',
        turnMode: 'answer',
        truthState: 'grounded',
        liveSurface: 'callback-line',
        answerAct: 'answer',
        answerEvidenceMode: 'observed',
        personaKernelMode: 'full',
      } as any),
      getDigitalLifeSpine: () => ({
        version: 'digital-life-spine-digest-v1',
        runtime: {
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          sceneSummary: 'cross-modal same-her lock already re-formed on the living segment',
          activeThreadId: 'thread-stream-meta-full-cross-modal-lock',
          activeThreadTitle: 'cross-modal same-her lock',
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          answerIntent: 'carry the fully rejoined living line outward',
          preferredPresence: 'attentive',
          selectedAction: 'wait',
          updatedAt: 19_000,
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          perception: {
            currentBodyState: explicitFullCrossModalLock,
          },
        },
        proactive: {
          selectedAction: 'wait',
          preferredStyle: 'silent-observe',
          confidence: 0.88,
          shouldSpeak: false,
          activeThreadId: 'thread-stream-meta-full-cross-modal-lock',
          activeThreadTitle: 'cross-modal same-her lock',
          dominantConcernKind: 'same-thread-continuation',
          dominantConcernSummary: 'carry the fully rejoined living line outward',
          leadingGoalId: null,
          leadingGoalSummary: null,
          preferredPresence: 'attentive',
        },
        memory: null,
      } as any),
      getRuntimeDigest: () => ({
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.84,
        companionshipPressure: 0.79,
        currentConsciousFrame: {
          reasonTags: [],
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
        channels: [],
        summary: 'dominant=active-memory',
      } as any),
      emit,
    })

    emitter.emit('我会把已经重新锁回同一段 living segment 的这一整条线一起带出来。')

    expect(emit).toHaveBeenCalledTimes(1)
    const emitted = emit.mock.calls[0]?.[0]
    expect(emitted?.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.currentBodyState).toBe(explicitFullCrossModalLock)
    expect(buildAlicizationChatMetaSignature(emitted)).toContain('Right now her body, face, motion, lipsync, and voice are already locked back onto the same living segment together')
  })

  it('keeps audible-body recovery explicit inside body continuity summary when voice and lipsync are the surviving living line before face and motion rejoin', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-audible-body-body-summary-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-audible-body-body-summary-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-audible-body-body-summary-1',
        reply: '我先沿着还活着的声音和身体线轻一点接回来。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-audible-body-body-summary-1',
            index: 0,
            startOffset: 0,
            endOffset: 22,
            text: '我先沿着还活着的声音和身体线轻一点接回来。',
            emotion: 'thinking',
            gestureWeight: 0.32,
            facialWeight: 0.44,
            prosodyWeight: 0.58,
            beatWeight: 0.48,
            mouthWeight: 0.62,
            headWeight: 0.3,
            actionCue: 'observe_focus',
            facialCue: 'soft-gaze',
            actionWindow: 'cadence-peak',
            interruptMode: 'soft-interrupt',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-audible-body-body-summary-1',
        emotion: 'thinking',
        mode: 'recovering',
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
          rateMultiplier: 0.96,
          pitchDelta: -2,
        },
        voice: {
          pitchDelta: -2,
          rateMultiplier: 0.96,
          energy: 0.48,
          cadence: 0.44,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 340,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.4,
          holdMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.22,
          holdMs: 220,
          rendererHints: {
            residentMode: 'measured-return',
            preferredBlinkCadence: 'linger',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0.71,
          gazeStability: 0.68,
          breathAmplitude: 0.2,
          expressivity: 0.24,
        },
        frames: [{
          id: 'segment-audible-body-body-summary-1',
          offsetMs: 0,
          durationMs: 420,
          mode: 'recovering',
          voice: {
            pitchDelta: -2,
            rateMultiplier: 0.96,
            energy: 0.48,
            cadence: 0.44,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            phase: 'playing',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 340,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.4,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.22,
            holdMs: 220,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          motor: {
            stillness: 0.71,
            gazeStability: 0.68,
            breathAmplitude: 0.2,
            expressivity: 0.24,
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'audible-body-carry',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
            currentBodyState: 'lane=body+lipsync+voice-only | keep the same living line audible while face and motion rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'audible-body-carry',
          continuityCue: 'Keep the same living line audible while face and motion rejoin.',
          sameHerSelfLine: 'Keep the same living line audible while face and motion rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"runtimeDigestProjectContinuityPreferredTiming":"audible-body-carry"')
    expect(signature).toContain('"runtimeDigestProjectContinuityCue":"Keep the same living line audible while face and motion rejoin."')
    expect(signature).toContain('"runtimeDigestCurrentConsciousFrameContinuityPreferredTiming":"audible-body-carry"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.96 | energy=0.48 | cadence=0.44 | emotion=thinking | companion=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=Keep the same living line audible while face and motion rejoin. | Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished. | seg=segment-audible-body-body-summary-1"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=340ms | companion=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=Keep the same living line audible while face and motion rejoin. | Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished. | visemeBias=0.41 | energyBias=0.73 | mouthScale=1.01 | seg=segment-audible-body-body-summary-1"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.40 | hold=220ms | mode=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=Keep the same living line audible while face and motion rejoin. | Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished. | seg=segment-audible-body-body-summary-1"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=Keep the same living line audible while face and motion rejoin. | Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished. | hold=220ms | seg=segment-audible-body-body-summary-1"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=audible-body-carry | blink=linger | gazeMode=soften | reason=Keep the same living line audible while face and motion rejoin. | Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished. | bodyLine=audible-body-rejoin | seg=segment-audible-body-body-summary-1"')
  })
  it('keeps host-facing summaries on the later spoken segment when a trailing cue-bridge frame still carries older text on the same lower-pressure line', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-later-spoken-frame-over-trailing-cue-bridge-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-later-spoken-frame-over-trailing-cue-bridge-1',
        turnId: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        rendererTarget: 'vrm',
        replyText: '先沿着这条线轻一点接住。然后再继续看这里。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '先沿着这条线轻一点接住。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 220 },
            { id: 'segment-2', index: 1, text: '然后再继续看这里。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 320 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 320,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [
            { segmentId: 'segment-1', emotion: 'thinking', facialCue: 'focused', intensity: 0.38, holdMs: 260, source: 'resident-authority', confidence: 0.88 },
            { segmentId: 'segment-2', emotion: 'thinking', facialCue: 'focused', intensity: 0.5, holdMs: 320, source: 'resident-authority', confidence: 0.9 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-1', actionCue: 'observe_focus', intensity: 0.34, holdMs: 220, source: 'resident-authority', confidence: 0.86 },
            { segmentId: 'segment-2', actionCue: 'idle_gentle_nod', intensity: 0.48, holdMs: 300, source: 'resident-authority', confidence: 0.89 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-1', viseme: 'A', weight: 0.42, source: 'resident-authority', confidence: 0.85 },
            { segmentId: 'segment-2', viseme: 'I', weight: 0.68, source: 'prosody-authority', confidence: 0.94 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        reply: '先沿着这条线轻一点接住。然后再继续看这里。',
        emotion: 'thinking',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '先沿着这条线轻一点接住。',
            emotion: 'thinking',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'focused',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 12,
            endOffset: 21,
            text: '然后再继续看这里。',
            emotion: 'thinking',
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
            actionCue: 'idle_gentle_nod',
            facialCue: 'focused',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-later-spoken-frame-over-trailing-cue-bridge-1',
        emotion: 'thinking',
        mode: 'thinking',
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
          stillness: 0,
          expressivity: 0,
        },
        frames: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 12,
            text: '先沿着这条线轻一点接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -4,
              rateMultiplier: 0.91,
              energy: 0.52,
              cadence: 0.49,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.36,
              energyBias: 0.62,
              mouthScale: 0.98,
              continuityHoldMs: 240,
              hintViseme: 'A',
              hintTrail: 'A>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.38,
              holdMs: 260,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.34,
              holdMs: 220,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 12,
            endOffset: 21,
            text: '然后再继续看这里。',
            mode: 'thinking',
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
              stillness: 0,
              expressivity: 0,
            },
          },
          {
            id: 'frame-cue-bridge-tail',
            index: 2,
            startOffset: 21,
            endOffset: 24,
            text: '先沿着这条线轻一点接住。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.9,
              energy: 0.4,
              cadence: 0.42,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.28,
              energyBias: 0.48,
              mouthScale: 0.92,
              continuityHoldMs: 360,
              hintViseme: 'closed',
              hintTrail: 'closed>soft',
              phase: 'settling',
            },
            face: {
              emotion: 'thinking',
              facialCue: 'focused',
              expressionMode: 'hold',
              intensity: 0.3,
              holdMs: 300,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.28,
              holdMs: 280,
              rendererHints: {
                residentMode: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
        ],
      },
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.8,
          coherence: 0.76,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
        },
        summary: 'dominant=active-memory',
      } as any,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"next-open-window"')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-2.00 | rate=0.95 | energy=0.64 | cadence=0.60 | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=resident-authority | seg=segment-2"')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=focused | expression=hold | intensity=0.50 | hold=320ms | mode=measured-return | timing=next-open-window | blink=linger | gaze=soften | src=resident-authority | conf=0.90 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=idle_gentle_nod | tail=measured-return | timing=next-open-window | blink=linger | gaze=soften | hold=300ms | src=resident-authority | conf=0.89 | seg=segment-2"')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=reactive-articulation | hold=320ms | hints=I>closed | hint=I | companion=measured-return | timing=next-open-window | blink=linger | gaze=soften | visemeBias=0.44 | energyBias=0.76 | mouthScale=1.04 | src=prosody-authority | conf=0.94 | seg=segment-2"')
    expect(signature).not.toContain('seg=frame-cue-bridge-tail')
  })

  it('keeps body+lipsync-only continuity distinct from audible-body carry in host-facing summaries', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-body-lipsync-only-stream-meta-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-body-lipsync-only-stream-meta-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-body-lipsync-only-stream-meta-1',
        turnId: 'turn-body-lipsync-only-stream-meta-1',
        rendererTarget: 'vrm',
        replyText: '我先轻一点接住这条线。',
        state: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'measured-return',
        },
        speechPlan: {
          segments: [{
            id: 'segment-body-lipsync-carry-1',
            index: 0,
            text: '我先轻一点接住这条线。',
            interruptPolicy: 'soft-settle',
            preRollMs: 20,
            settleMs: 360,
          }],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'soft-release',
          speakingCues: [],
        },
        motionPlan: {
          idleBase: 'steady_focus',
          actionBursts: [],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [],
        },
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-lipsync-only-stream-meta-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 380,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 240,
        },
        motor: {
          stillness: 0.71,
          expressivity: 0.24,
          gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
          breath: { amplitude: 0.2, pace: 0.22 },
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.04,
            browTension: 0.1,
            cheekLift: 0.06,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.02,
            lean: 0.07,
            openness: 0.2,
            settle: 0.82,
          },
        },
        frames: [{
          id: 'segment-body-lipsync-carry-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点接住这条线。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.98,
            energy: 0.36,
            cadence: 0.32,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 380,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.24,
            gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
            head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
            breath: { amplitude: 0.2, pace: 0.22 },
            facial: {
              eyeOpenness: 0.64,
              browLift: 0.04,
              browTension: 0.1,
              cheekLift: 0.06,
              mouthSpread: 0.08,
              mouthRound: 0.1,
              jawOpenBias: 0.08,
            },
            body: {
              sway: 0.02,
              lean: 0.07,
              openness: 0.2,
              settle: 0.82,
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: 'body-lipsync-carry',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
            currentBodyState: 'lane=body+lipsync-only | keep the same living line inward while face, motion, and voice rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'body-lipsync-carry',
          continuityCue: 'Keep the same living line inward while face, motion, and voice rejoin.',
          sameHerSelfLine: 'Keep the same living line inward while face, motion, and voice rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"body-lipsync-carry"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften')
    expect(signature).toContain('bodyLine=body-lipsync-rejoin')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.98 | energy=0.36 | cadence=0.32 | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=300ms | mode=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=steady_focus | tail=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=380ms | hints=I>closed | hint=I | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).not.toContain('timing=audible-body-carry')
    expect(signature).not.toContain('bodyLine=audible-body-rejoin')
  })

  it('reconstructs body-lipsync continuity timing from self authority when explicit continuityPreferredTiming is absent', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-body-lipsync-timing-fallback-1',
      } as any,
      embodiment: {
        emotion: 'thinking',
        variationToken: 'turn-body-lipsync-timing-fallback-1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-body-lipsync-timing-fallback-1',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.98,
          energy: 0.36,
          cadence: 0.32,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.41,
          energyBias: 0.73,
          mouthScale: 1.01,
          continuityHoldMs: 380,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 300,
        },
        action: {
          actionCue: 'steady_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 240,
        },
        motor: {
          stillness: 0.71,
          expressivity: 0.24,
          gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
          head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
          breath: { amplitude: 0.2, pace: 0.22 },
          facial: {
            eyeOpenness: 0.64,
            browLift: 0.04,
            browTension: 0.1,
            cheekLift: 0.06,
            mouthSpread: 0.08,
            mouthRound: 0.1,
            jawOpenBias: 0.08,
          },
          body: {
            sway: 0.02,
            lean: 0.07,
            openness: 0.2,
            settle: 0.82,
          },
        },
        frames: [{
          id: 'segment-body-lipsync-timing-fallback-1',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点接住这条线。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 300,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          action: {
            actionCue: 'steady_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 240,
            rendererHints: {
              residentMode: 'measured-return',
              preferredBlinkCadence: 'linger',
              preferredGazeMode: 'soften',
            },
          },
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.98,
            energy: 0.36,
            cadence: 0.32,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.41,
            energyBias: 0.73,
            mouthScale: 1.01,
            continuityHoldMs: 380,
            hintViseme: 'I',
            hintTrail: 'I>closed',
            phase: 'playing',
          },
          motor: {
            stillness: 0.71,
            expressivity: 0.24,
            gaze: { focus: 0.58, stability: 0.68, azimuth: 0, elevation: 0.02 },
            head: { yaw: 0, pitch: 0.03, roll: 0, nod: 0.04 },
            breath: { amplitude: 0.2, pace: 0.22 },
            facial: {
              eyeOpenness: 0.64,
              browLift: 0.04,
              browTension: 0.1,
              cheekLift: 0.06,
              mouthSpread: 0.08,
              mouthRound: 0.1,
              jawOpenBias: 0.08,
            },
            body: {
              sway: 0.02,
              lean: 0.07,
              openness: 0.2,
              settle: 0.82,
            },
          },
        }],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        currentConsciousFrame: {
          continuityPreferredTiming: null,
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
            currentBodyState: 'lane=body+lipsync-only | keep the same living line inward while face, motion, and voice rejoin',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: null,
          continuityCue: 'Keep the same living line inward while face, motion, and voice rejoin.',
          sameHerSelfLine: 'Keep the same living line inward while face, motion, and voice rejoin.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentContinuityTiming":"body-lipsync-carry"')
    expect(signature).toContain('"lastSegmentBodyContinuitySummary":"mode=recovering | stillness=0.71 | gaze=0.68 | breath=0.20 | expressivity=0.24 | resident=measured-return | timing=body-lipsync-carry | blink=linger | gazeMode=soften')
    expect(signature).toContain('bodyLine=body-lipsync-rejoin')
    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-1.00 | rate=0.98 | energy=0.36 | cadence=0.32 | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=thinking | cue=soft-gaze | expression=hold | intensity=0.34 | hold=300ms | mode=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=steady_focus | tail=measured-return | timing=body-lipsync-carry')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=380ms | hints=I>closed | hint=I | companion=measured-return | timing=body-lipsync-carry')
    expect(signature).not.toContain('timing=audible-body-carry')
  })

  it('promotes same-segment cue-bridge lipsync hold onto the same repair-before-closeness body line when face and motion have already rejoined the segment', () => {
    const signature = buildAlicizationChatMetaSignature({
      governance: {
        decisionTraceId: 'trace-repair-first-cue-bridge-lipsync-realignment-1',
      } as any,
      embodiment: {
        emotion: 'concerned',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        rendererHints: {
          residentMode: 'repair-before-closeness',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
      } as any,
      embodimentScript: {
        version: 'embodiment-script-v1',
        decisionTraceId: 'trace-repair-first-cue-bridge-lipsync-realignment-1',
        turnId: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        rendererTarget: 'vrm',
        replyText: '先别把这条线说得太满。我先轻一点接住这里。',
        state: {
          baseEmotion: 'concerned',
          delivery: 'gentle',
          emphasis: 0,
          residentMode: 'repair-before-closeness',
        },
        speechPlan: {
          segments: [
            { id: 'segment-1', index: 0, text: '先别把这条线说得太满。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 260 },
            { id: 'segment-2', index: 1, text: '我先轻一点接住这里。', interruptPolicy: 'soft-settle', preRollMs: 20, settleMs: 360 },
          ],
          interruptPolicy: 'soft-settle',
          preRollMs: 20,
          settleMs: 360,
        },
        facePlan: {
          preUtteranceCue: 'steady-inhale',
          postUtteranceCue: 'eyes-soften',
          speakingCues: [
            { segmentId: 'segment-1', emotion: 'concerned', facialCue: 'soft_concern', intensity: 0.42, holdMs: 280, source: 'resident-authority', confidence: 0.88 },
            { segmentId: 'segment-2', emotion: 'concerned', facialCue: 'soft_concern', intensity: 0.5, holdMs: 360, source: 'cue-bridge', confidence: 0.92 },
          ],
        },
        motionPlan: {
          idleBase: 'observe_focus',
          actionBursts: [
            { segmentId: 'segment-1', actionCue: 'observe_focus', intensity: 0.32, holdMs: 240, source: 'resident-authority', confidence: 0.86 },
            { segmentId: 'segment-2', actionCue: 'observe_focus', intensity: 0.44, holdMs: 340, source: 'cue-bridge', confidence: 0.9 },
          ],
          attentionMode: 'attentive',
        },
        lipsyncPlan: {
          mode: 'energy-phoneme-hybrid',
          visemeHints: [
            { segmentId: 'segment-1', viseme: 'A', weight: 0.38, source: 'resident-authority', confidence: 0.82 },
            { segmentId: 'segment-2', viseme: 'I', weight: 0.66, source: 'cue-bridge', confidence: 0.93 },
          ],
        },
      } as any,
      speechTimeline: {
        version: 'speech-timeline-v1',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        reply: '先别把这条线说得太满。我先轻一点接住这里。',
        emotion: 'concerned',
        segments: [
          {
            id: 'segment-1',
            index: 0,
            startOffset: 0,
            endOffset: 11,
            text: '先别把这条线说得太满。',
            emotion: 'concerned',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft_concern',
          },
          {
            id: 'segment-2',
            index: 1,
            startOffset: 11,
            endOffset: 21,
            text: '我先轻一点接住这里。',
            emotion: 'concerned',
            rendererHints: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
            actionCue: 'observe_focus',
            facialCue: 'soft_concern',
          },
        ],
      } as any,
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-repair-first-cue-bridge-lipsync-realignment-1',
        emotion: 'concerned',
        mode: 'thinking',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          facialCue: 'soft_concern',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
        },
        voice: {
          pitchDelta: -3,
          rateMultiplier: 0.92,
          energy: 0.58,
          cadence: 0.42,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.4,
          energyBias: 0.72,
          mouthScale: 0.96,
          continuityHoldMs: 320,
          hintViseme: 'I',
          hintTrail: 'I>closed',
          phase: 'playing',
        },
        face: {
          emotion: 'concerned',
          facialCue: 'soft_concern',
          expressionMode: 'hold',
          intensity: 0.5,
          holdMs: 360,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.44,
          holdMs: 340,
          rendererHints: {
            residentMode: 'repair-before-closeness',
            preferredBlinkCadence: 'quiet',
            preferredGazeMode: 'soften',
          },
        },
        motor: {
          stillness: 0,
          expressivity: 0,
        },
        frames: [
          {
            id: 'segment-2',
            index: 0,
            startOffset: 11,
            endOffset: 21,
            text: '我先轻一点接住这里。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'hold',
            voice: {
              pitchDelta: -3,
              rateMultiplier: 0.92,
              energy: 0.58,
              cadence: 0.42,
            },
            lipSync: {
              mode: 'energy-phoneme-hybrid',
              visemeBias: 0.4,
              energyBias: 0.72,
              mouthScale: 0.96,
              continuityHoldMs: 320,
              hintViseme: 'I',
              hintTrail: 'I>closed',
              phase: 'playing',
            },
            face: {
              emotion: 'concerned',
              facialCue: 'soft_concern',
              expressionMode: 'hold',
              intensity: 0.5,
              holdMs: 360,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'quiet',
                preferredGazeMode: 'soften',
              },
            },
            action: {
              actionCue: 'observe_focus',
              actionMode: 'hold',
              intensity: 0.44,
              holdMs: 340,
              rendererHints: {
                residentMode: 'repair-before-closeness',
                preferredBlinkCadence: 'quiet',
                preferredGazeMode: 'soften',
              },
            },
            motor: {
              stillness: 0,
              expressivity: 0,
            },
          },
        ],
      } as any,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'integrate',
          dominantChannel: 'active-control',
          handoffTarget: 'active-memory',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.64,
          coherence: 0.82,
          summary: 'phase=integrate | handoff=active-memory | continuity-arc=same-thread-continuation | timing=next-open-window',
        },
        currentConsciousFrame: {
          continuityPreferredTiming: 'next-open-window',
          selfContinuityAuthority: {
            authoritySummary: 'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
            currentBodyState: 'lane=voice+face+motion+lipsync-only | keep the same line cautious before closeness widens again',
          },
        },
        projectState: {
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'Same Phase 1 digital life. The body line is still cautious and should stay unified.',
          sameHerSelfLine: 'Same Phase 1 digital life. The body line is still cautious and should stay unified.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=repair-first embodiment line still needs stronger closure | next=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
        },
        summary: 'dominant=active-memory',
      } as any,
      visibleReplyExecution: null,
    } as any)

    expect(signature).toContain('"lastSegmentVoiceSummary":"pitch=-3.00 | rate=0.92 | energy=0.58 | cadence=0.42 | emotion=concerned | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentFaceSummary":"emotion=concerned | cue=soft_concern | expression=hold | intensity=0.50 | hold=360ms | mode=repair-before-closeness')
    expect(signature).toContain('"lastSegmentMotionSummary":"motion=observe_focus | tail=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
    expect(signature).toContain('"lastSegmentLipSyncSummary":"mode=energy-phoneme-hybrid | phase=playing | continuity=sustained-articulation | hold=360ms | hints=I>closed | hint=I | companion=repair-before-closeness | timing=next-open-window | blink=quiet | gaze=soften')
  })
})
