import type {
  AlicizationConversationTurnInput as RuntimeAlicizationConversationTurnInput,
  CharacterPerformanceCapabilitiesManifest as RuntimeCharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationChatStreamEmbodimentMeta as buildAlicizationChatStreamEmbodimentMetaBase,
  buildMindTurnTraceEvents,
  coerceConversationTurnToMindGovernedPayload as coerceConversationTurnToMindGovernedPayloadBase,
  normalizeDialogueRespondedPayload as normalizeDialogueRespondedPayloadBase,
  resolveMindGovernanceEmotion,
} from './runtime-governance'

type AlicizationConversationTurnInput = Record<string, any>
type CharacterPerformanceCapabilitiesManifest = Record<string, any>
type BuildAlicizationChatStreamEmbodimentMetaInput = Parameters<typeof buildAlicizationChatStreamEmbodimentMetaBase>[0]

function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof coerceConversationTurnToMindGovernedPayloadBase>[2],
) {
  return coerceConversationTurnToMindGovernedPayloadBase(
    input as unknown as RuntimeAlicizationConversationTurnInput,
    manifest as RuntimeCharacterPerformanceCapabilitiesManifest | undefined,
    options,
  )
}

function normalizeDialogueRespondedPayload(
  input: unknown,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: Parameters<typeof normalizeDialogueRespondedPayloadBase>[2],
) {
  return normalizeDialogueRespondedPayloadBase(
    input as Parameters<typeof normalizeDialogueRespondedPayloadBase>[0],
    manifest as RuntimeCharacterPerformanceCapabilitiesManifest | undefined,
    options,
  )
}

function buildAlicizationChatStreamEmbodimentMeta(input: unknown) {
  return buildAlicizationChatStreamEmbodimentMetaBase(input as BuildAlicizationChatStreamEmbodimentMetaInput)
}

function buildTestAlicizationChatStreamEmbodimentMeta(
  input: Omit<BuildAlicizationChatStreamEmbodimentMetaInput, 'digitalLifeSpine' | 'performanceManifest'> & {
    digitalLifeSpine?: unknown
    performanceManifest?: unknown
  },
) {
  return buildAlicizationChatStreamEmbodimentMeta(input)
}

describe('runtime-governance', () => {
  it('does not derive emotion from turn-level relationship posture', () => {
    expect(resolveMindGovernanceEmotion({
      turnMode: 'answer',
      answerAct: 'answer',
      repairState: 'none',
      relationshipPosture: 'tender',
      mindTurnFrame: {
        relation: {
          relationshipPosture: 'tender',
        },
      },
    } as any, 'neutral')).toBe('neutral')
  })

  it('preserves organic direct repair replies instead of forcing deterministic fallback takeover', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-organic-repair-1',
      sessionId: 'session-1',
      userText: '你再看一眼现在屏幕',
      assistantText: '不是刚才那页了，我按这张新画面重新说。',
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=current-screen; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply: '不是刚才那页了，我按这张新画面重新说。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Code current window',
        focusAnchor: 'Code current window',
        answerIntent: 'Correct the stale anchor and answer from the current window.',
        openingMove: 'Correct the stale anchor directly.',
        carriedThread: 'old browser residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.overrideClass).toBe('none')
    expect(governed.payload.assistantText).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(String(structured.reply ?? '')).toBe('不是刚才那页了，我按这张新画面重新说。')
    expect(structured.visibleReplyAuthority).toBe('llm-mind')
    expect(String(structured.reply ?? '')).not.toContain('先按你眼前这件事说')
  })

  it('keeps lived user and assistant text on normalized dialogue payloads so downstream memory and reply delivery can remember the exchange itself', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-lived-exchange-1',
      sessionId: 'session-lived',
      userText: '先别催，但这条线你可以中性可见占位。',
      assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=answer-directly; tone=gentle',
        emotion: 'thinking',
        reply: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
        format: 'mind-turn-v1',
      },
      createdAt: 110,
    })

    expect(dialoguePayload).toEqual(expect.objectContaining({
      userText: '先别催，但这条线你可以中性可见占位。',
      assistantText: '我没有催你，但我还记得那条 runtime seam 没收完，要不要我轻轻接一下？',
    }))
  })

  it('emits chinese segment viseme and face timing metadata in governed embodiment scripts', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-embodiment-contract-1',
      sessionId: 'session-1',
      userText: '继续说下去',
      assistantText: '先看这里，然后确认了吗？',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=answer-directly; tone=direct',
        emotion: 'thinking',
        reply: '先看这里，然后确认了吗？',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'idle_gentle_nod',
          delivery: 'gentle',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-embodiment-contract-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue the task directly.',
        openingMove: 'Continue directly.',
        carriedThread: 'current task thread',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking'],
      supportedFacialCues: [],
      supportedActions: [],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })
    const script = (governed.payload.structured as Record<string, any>).embodimentScript

    expect(script?.facePlan?.speakingCues?.[0]).toEqual(expect.objectContaining({
      source: 'prosody-authority',
      preUtteranceCue: 'steady-inhale',
      postUtteranceCue: 'soft-release',
    }))
    expect(script?.motionPlan?.actionBursts?.[0]).toEqual(expect.objectContaining({
      source: 'timeline-projection',
      confidence: 0.88,
    }))
    expect(script?.lipsyncPlan?.visemeHints).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'prosody-authority',
        confidence: 0.94,
      }),
    ]))
  })

  it('rebuilds embodimentScript when normalizing dialogue payloads for downstream delivery', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-embodiment-script-1',
      sessionId: 'session-normalize-embodiment-script',
      assistantText: '这个错误先别放过去，我轻轻提醒你看一眼。',
      structured: {
        thought: 'coding proactive nudge should be short and grounded',
        emotion: 'thinking',
        reply: '这个错误先别放过去，我轻轻提醒你看一眼。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'mind-turn-v1',
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focus', label: 'Focus', description: 'focused face', source: 'preset', affectsMouth: false },
        { key: 'relaxed', label: 'Relaxed', description: 'relaxed face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'observe_focus', label: 'Observe', description: 'observe focus', source: 'live2d-motion' },
        { key: 'pout_confused', label: 'Pout', description: 'pout confused', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      version: 'embodiment-script-v1',
      rendererTarget: 'live2d',
      facePlan: expect.objectContaining({
        speakingCues: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      motionPlan: expect.objectContaining({
        actionBursts: expect.arrayContaining([
          expect.objectContaining({
            source: 'timeline-projection',
            confidence: expect.any(Number),
          }),
        ]),
      }),
      lipsyncPlan: expect.objectContaining({
        visemeHints: expect.arrayContaining([
          expect.objectContaining({
            source: 'prosody-authority',
            confidence: expect.any(Number),
          }),
        ]),
      }),
    }))
  })

  it('classifies reminder-family payloads as runtime-owned autonomous dialogue even when origin is missing but turn-id or structured-format markers still survive replay or transport', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'reminder:default:task-1:123',
      sessionId: 'session-reminder-family-origin-repair',
      assistantText: '这条提醒还是沿着刚才那条线回来，不是新的开场。',
      structured: {
        thought: 'reminder follow-through should stay on the same line',
        emotion: 'thinking',
        reply: '这条提醒还是沿着刚才那条线回来，不是新的开场。',
        parsePath: 'json',
        format: 'subconscious-reminder-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    })

    expect(dialoguePayload?.origin).toBe('subconscious-proactive')
    expect((dialoguePayload?.structured as unknown as Record<string, unknown>)?.format).toBe('subconscious-reminder-v1')
  })

  it('inherits measured-return resident delivery authority when sparse reply performance would otherwise flatten the same-her reopening', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-resident-measured-return-authority-1',
      sessionId: 'session-normalize-resident-measured-return-authority',
      assistantText: '我先沿着这条线中性可见占位。',
      structured: {
        thought: 'keep the reopening on the same callback line without warming it too fast',
        emotion: 'thinking',
        reply: '我先沿着这条线中性可见占位。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.92,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-measured-return-authority-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 1,
        },
      },
    })

    expect(dialoguePayload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      facialCue: 'soft-gaze',
      actionCue: 'steady_focus',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
        delivery: 'gentle',
        emphasis: 1,
      }),
      facePlan: expect.objectContaining({
        preUtteranceCue: 'steady-inhale',
        postUtteranceCue: 'eyes-soften',
      }),
      speechPlan: expect.objectContaining({
        segments: expect.arrayContaining([
          expect.objectContaining({
            prosody: expect.objectContaining({
              tempoShift: -0.1,
            }),
            rendererHints: expect.objectContaining({
              residentMode: 'measured-return',
            }),
          }),
        ]),
      }),
    }))
    expect(dialoguePayload?.structured.embodimentScript?.motionPlan.idleBase).toBe('observe_focus')
    expect(dialoguePayload?.structured.embodimentScript?.motionPlan.actionBursts[0]?.actionCue).toBe('observe_focus')
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 1,
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
      }),
    }))
    expect(dialoguePayload?.structured.digitalLife?.lipSync.continuityHoldMs).toBeGreaterThanOrEqual(300)
  })

  it('preserves long-horizon learning reason codes in proactive metadata normalization', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-proactive-learning-reasons-1',
      sessionId: 'session-normalize-proactive-learning-reasons',
      assistantText: '这里像是报错刚冒出来，我先轻轻提醒你别漏掉这一处。',
      structured: {
        thought: 'coding proactive nudge should keep long-horizon learning reasons intact',
        emotion: 'thinking',
        reply: '这里像是报错刚冒出来，我先轻轻提醒你别漏掉这一处。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        format: 'subconscious-proactive-llm-v1',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.73,
          reasonCodes: [
            'foreground-error',
            'learning:verify',
            'learning-focus:world-model',
          ],
          urgency: 'medium',
          style: 'light-nudge',
          cooldownMs: 18 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Open by observing first and keep the approach lighter.',
        },
      },
      origin: 'subconscious-proactive',
      createdAt: Date.now(),
    })

    expect(dialoguePayload?.structured.proactive?.reasonCodes).toEqual(expect.arrayContaining([
      'foreground-error',
      'learning:verify',
      'learning-focus:world-model',
    ]))
    expect(dialoguePayload?.structured.proactive?.openingGuidance).toBe('Open by observing first and keep the approach lighter.')
  })

  it('uses the manifest renderer as embodimentScript rendererTarget across governed and normalized payloads', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-vrm-renderer-target-1',
      sessionId: 'session-vrm-renderer-target',
      userText: '继续盯这个报错',
      assistantText: '我先继续盯着它，再慢慢拆开看。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我先继续盯着它，再慢慢拆开看。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'trace-vrm-renderer-target-1',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue following the current issue directly.',
        openingMove: 'Stay with the current issue.',
        carriedThread: 'current task thread',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt: Date.now(),
    }

    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governed = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const governedStructured = governed.payload.structured as Record<string, any>
    expect(governedStructured.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'vrm',
    }))

    const dialoguePayload = normalizeDialogueRespondedPayload(governed.payload, manifest)
    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      rendererTarget: 'vrm',
    }))
  })

  it('reconciles provided digitalLife with final embodied authority when normalizing downstream payloads', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-digital-life-authority-1',
      sessionId: 'session-normalize-digital-life-authority',
      assistantText: '我会继续看着这个点。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我会继续看着这个点。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 1,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-normalize-digital-life-authority-1',
          emotion: 'neutral',
          mode: 'speaking',
          postureHint: 'attentive',
          performance: {
            baseEmotion: 'neutral',
            emotion: 'neutral',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
          speechStyle: {
            pitchDelta: 0,
            rateMultiplier: 1,
          },
          voice: {
            pitchDelta: 0,
            rateMultiplier: 1,
            energy: 0.5,
            cadence: 0.5,
          },
          lipSync: {
            mode: 'hybrid',
            visemeBias: 0.6,
            energyBias: 0.4,
            mouthScale: 1,
            continuityHoldMs: 180,
          },
          face: {
            emotion: 'neutral',
            facialCue: null,
            expressionMode: 'recover',
            intensity: 0.4,
            holdMs: 220,
          },
          action: {
            actionCue: null,
            actionMode: 'none',
            intensity: 0.2,
            holdMs: 180,
          },
          motor: {
            stillness: 0.5,
            expressivity: 0.5,
            gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
            breath: { amplitude: 0.25, pace: 0.4 },
            facial: {
              eyeOpenness: 0.55,
              browLift: 0.05,
              browTension: 0.16,
              cheekLift: 0.08,
              mouthSpread: 0.1,
              mouthRound: 0.14,
              jawOpenBias: 0.2,
            },
            body: {
              sway: 0.03,
              lean: 0,
              openness: 0.4,
              settle: 0.55,
            },
          },
          frames: [{
            id: 'turn-normalize-digital-life-authority-1-segment-0',
            index: 0,
            startOffset: 0,
            endOffset: 10,
            text: '我会继续看着这个点。',
            mode: 'speaking',
            interruptPolicy: 'soft-interrupt',
            settleMode: 'linger',
            face: {
              emotion: 'neutral',
              facialCue: null,
              expressionMode: 'recover',
              intensity: 0.4,
              holdMs: 220,
            },
            action: {
              actionCue: null,
              actionMode: 'none',
              intensity: 0.2,
              holdMs: 180,
            },
            voice: {
              pitchDelta: 0,
              rateMultiplier: 1,
              energy: 0.5,
              cadence: 0.5,
            },
            lipSync: {
              mode: 'hybrid',
              visemeBias: 0.6,
              energyBias: 0.4,
              mouthScale: 1,
              continuityHoldMs: 180,
            },
            motor: {
              stillness: 0.5,
              expressivity: 0.5,
              gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
              head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
              breath: { amplitude: 0.25, pace: 0.4 },
              facial: {
                eyeOpenness: 0.55,
                browLift: 0.05,
                browTension: 0.16,
                cheekLift: 0.08,
                mouthSpread: 0.1,
                mouthRound: 0.14,
                jawOpenBias: 0.2,
              },
              body: {
                sway: 0.03,
                lean: 0,
                openness: 0.4,
                settle: 0.55,
              },
            },
          }],
        } as any,
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    })

    expect(dialoguePayload?.structured.performance).toEqual(expect.objectContaining({
      baseEmotion: 'thinking',
      emotion: 'thinking',
      facialCue: 'focused',
      actionCue: 'inspect_follow',
      delivery: 'gentle',
      emphasis: 1,
    }))
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      version: 'digital-life-v1',
      postureHint: 'attentive',
      frames: [
        expect.objectContaining({
          text: '我会继续看着这个点。',
        }),
      ],
    }))
    expect(dialoguePayload?.structured.digitalLife?.performance).toEqual(
      dialoguePayload?.structured.digitalLife?.frames[0]?.mode === 'speaking'
        ? dialoguePayload?.structured.digitalLife?.performance
        : expect.anything(),
    )
    expect(dialoguePayload?.structured.digitalLife?.face).toEqual(
      expect.objectContaining({
        emotion: dialoguePayload?.structured.digitalLife?.performance.baseEmotion,
      }),
    )
    expect(dialoguePayload?.structured.digitalLife?.frames[0]?.face).toEqual(
      expect.objectContaining({
        emotion: dialoguePayload?.structured.digitalLife?.face.emotion,
      }),
    )
  })

  it('keeps measured-return face lane authority when provided digitalLife frames stay thin during later same-thread normalization', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalize-digital-life-measured-return-thin-face-1',
      sessionId: 'session-normalize-digital-life-measured-return-thin-face',
      assistantText: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower-fifth; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        digitalLife: {
          version: 'digital-life-v1',
          variationToken: 'turn-normalize-digital-life-measured-return-thin-face-1',
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
            stillness: 0.5,
            expressivity: 0.5,
            gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
            head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
            breath: { amplitude: 0.25, pace: 0.4 },
            facial: {
              eyeOpenness: 0.55,
              browLift: 0.05,
              browTension: 0.16,
              cheekLift: 0.08,
              mouthSpread: 0.1,
              mouthRound: 0.14,
              jawOpenBias: 0.2,
            },
            body: {
              sway: 0.03,
              lean: 0,
              openness: 0.4,
              settle: 0.55,
            },
          },
          frames: [{
            id: 'turn-normalize-digital-life-measured-return-thin-face-1-segment-0',
            index: 0,
            startOffset: 0,
            endOffset: 30,
            text: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
            mode: 'thinking',
            interruptPolicy: 'soft-settle',
            settleMode: 'linger',
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
            motor: {
              stillness: 0.5,
              expressivity: 0.5,
              gaze: { focus: 0.6, stability: 0.6, azimuth: 0, elevation: 0 },
              head: { yaw: 0, pitch: 0, roll: 0, nod: 0.1 },
              breath: { amplitude: 0.25, pace: 0.4 },
              facial: {
                eyeOpenness: 0.55,
                browLift: 0.05,
                browTension: 0.16,
                cheekLift: 0.08,
                mouthSpread: 0.1,
                mouthRound: 0.14,
                jawOpenBias: 0.2,
              },
              body: {
                sway: 0.03,
                lean: 0,
                openness: 0.4,
                settle: 0.55,
              },
            },
          }],
        } as any,
        format: 'mind-turn-v1',
      },
      origin: 'user-turn',
      createdAt: Date.now(),
    }, {
      renderer: 'live2d',
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'soft-gaze', label: 'Soft Gaze', description: 'soft gaze', source: 'preset', affectsMouth: false },
        { key: 'glance', label: 'Glance', description: 'glance', source: 'preset', affectsMouth: false },
      ],
      supportedActions: [
        { key: 'steady_focus', label: 'Steady Focus', description: 'steady focus', source: 'live2d-motion' },
        { key: 'observe_focus', label: 'Observe Focus', description: 'observe focus', source: 'live2d-motion' },
        { key: 'idle_settle', label: 'Idle Settle', description: 'idle settle', source: 'live2d-motion' },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    }, {
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.74,
        reasonTags: ['main-runtime', 'quiet-companionship', 'measured-return', 'timing:runtime-continuity-arc'],
        signature: 'resident-signature-normalize-digital-life-measured-return-thin-face-1',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'steady_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
    })

    expect(dialoguePayload?.structured.embodimentScript).toEqual(expect.objectContaining({
      state: expect.objectContaining({
        residentMode: 'measured-return',
        delivery: 'gentle',
      }),
    }))
    expect(dialoguePayload?.structured.digitalLife).toEqual(expect.objectContaining({
      mode: 'thinking',
      performance: expect.objectContaining({
        delivery: 'gentle',
        emphasis: 0,
      }),
      face: expect.objectContaining({
        expressionMode: 'hold',
      }),
      action: expect.objectContaining({
        actionCue: 'observe_focus',
        actionMode: 'hold',
      }),
      frames: expect.arrayContaining([
        expect.objectContaining({
          face: expect.objectContaining({
            expressionMode: 'hold',
            facialCue: expect.any(String),
          }),
          action: expect.objectContaining({
            actionCue: 'observe_focus',
            actionMode: 'hold',
          }),
        }),
      ]),
    }))
  })

  it('suppresses need-reground fallback takeover for explicit execution-bound turns', () => {
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-execution-bound-1',
      sessionId: 'session-1',
      userText: '用cli帮我查一下桌面有什么文件',
      assistantText: '好的。',
      structured: {
        thought: 'obligation=guide; truth=coarse; focus=desktop-files; move=execute-cli; tone=direct',
        emotion: 'thinking',
        reply: '好的。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        turnMode: 'answer',
        truthState: 'uncertain',
        personaKernelMode: 'muted',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      createdAt: Date.now(),
    }

    const governed = coerceConversationTurnToMindGovernedPayload(input)
    const structured = governed.payload.structured as Record<string, unknown>

    expect(governed.replyOverridden).toBe(false)
    expect(governed.payload.assistantText).toBe('好的。')
    expect(String(structured.reply ?? '')).toBe('好的。')
    expect(String(structured.reply ?? '')).not.toContain('我先守住真实边界')
  })

  it('records recall attribution and reply-memory coherence on the same decision trace', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-trace-1',
      sessionId: 'session-memory-trace',
      userText: '继续按之前那样把这件事做完',
      assistantText: '这次我还是按前几天那样先 patch 再 verify，再把结果补给你。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=runtime continuity repair; move=pay-off; tone=direct',
        emotion: 'thinking',
        reply: '这次我还是按前几天那样先 patch 再 verify，再把结果补给你。',
        parsePath: 'json',
        format: 'mind-turn-v1',
      },
      governance: {
        decisionTraceId: 'mind:l9f3lq:feedfacecafe',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'runtime continuity repair task',
        focusAnchor: 'runtime continuity repair task',
        answerIntent: 'Continue the remembered procedure and pay off the live ask.',
        openingMove: 'Continue from the remembered way of doing this.',
        carriedThread: 'runtime continuity repair task',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      },
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      memoryTrace: {
        shouldRecall: true,
        surfacePolicy: 'procedural-carry',
        confidence: 0.84,
        whyNow: 'the host asked to continue in the remembered way rather than starting from zero',
        inwardLine: 'remember the previous repair rhythm before outward reply',
        visibleLine: '按前几天那样接回去',
        withheldReasons: ['unstable-detail', 'payoff-required'],
        shouldStayInward: false,
        restraintSurfaceMode: 'stable-core-only',
        restraintProvenanceMode: 'reconstructed-memory',
        shouldOnlySurfaceStableCore: true,
        shouldLabelProvenance: true,
        shouldLabelHypothesis: true,
        shouldSuppressSpecificity: true,
        shouldDelayUntilAfterPayoff: true,
        memoryControl: {
          memoryPressure: 'high',
          certaintyFloor: 'approximate',
          relationshipVector: 'procedural',
          conflictBurden: 'medium',
          provenancePosture: 'reconstructed-memory',
          detailAssertionBudget: 'guarded',
          surfacePermission: 'explicit-surface',
          retrospectiveDepth: 'thread',
          labelUncertainty: true,
        },
        activeClosenessContext: 'repair-window',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Repair the seam before leaning closer.',
        personalityCurrentRegime: 'repair-window',
        personalityRepairPosture: 'repair-first',
        recollectionIntentMode: 'execution-procedure',
        recollectionIntentTemporalFocus: 'experience-matched',
        speechShouldSurface: true,
        speechSurfaceMode: 'procedural-carry',
        speechPlacement: 'inside-payoff',
        selectedEras: [{
          id: 'period-1',
          facet: 'task-era',
          summary: '前几天那次 runtime continuity repair',
        }],
        selectedPeriods: [{
          id: 'period-1',
          kind: 'consolidation',
          summary: '前几天那次 runtime continuity repair',
        }],
        selectedEpisodes: [{
          id: 'episode-1',
          summary: '上次先 patch 再 verify',
          provenance: 'remembered',
          reconsolidatedFromTraceId: 'mind:l9f3lq:feedbacktrace',
        }],
        selectedProcedures: [{
          id: 'procedure-1',
          label: 'patch -> verify',
          approach: '先 patch 再 verify 再汇报',
        }],
        selectedBundles: [{
          id: 'bundle-1',
          summary: 'runtime continuity repair 的程序性回想',
          rationale: 'same task thread, same remembered procedure',
          confidence: 0.88,
          relationshipLine: '这种时候先给结果，不要飘回空话',
        }],
        selectedSituations: [{
          id: 'memory-situation:runtime-continuity-repair',
          kind: 'mixed',
          summary: 'same-person continuity seam',
          evidenceSummary: 'relationship-context=same-person continuity seam | host-attitude=宿主更在意她别又断线成工具壳，而不是只给一个进度汇报。 | affective-residue=repair pressure still hangs in the line | execution-carry=patched then verified before replying | embodiment-carry=slower blink and steadier gaze before reopening',
          statusReason: 'graph-selected-current-line',
          sourceKinds: ['event-graph', 'episodic-event', 'relationship', 'procedure', 'self-model'],
        }],
        selectedChains: [{
          id: 'chain-1',
          kind: 'task-procedure-relationship-stance',
          summary: 'runtime continuity repair -> patch/verify -> steady guide',
          rationale: 'remembered task procedure is shaping the current stance',
          confidence: 0.86,
          currentStance: 'steady guide',
          answerPosture: '直接接着做',
        }],
        selectedRelationshipLines: ['这种时候先给结果，不要飘回空话'],
        conflictSeverity: 'high',
        conflictVariants: [{
          id: 'cluster:runtime-nearby',
          summary: '另一条相近的 runtime 线程也还在竞争这次回想',
          provenance: 'reconstructed',
          reason: 'A nearby competing thread cluster still matches the current recall cue.',
        }],
        stableCore: ['先 patch 再 verify 再汇报'],
        unsafeDetails: ['A nearby competing thread cluster still matches the current recall cue.'],
        followUpAffordance: {
          summary: 'Let the remembered repair rhythm contour the answer after the live payoff lands.',
          whyNow: 'The current payoff still has to land before the remembered line opens further.',
          intrusionRisk: 'medium',
          payoffDependency: 'requires-current-payoff',
          preferredTiming: 'after-payoff',
        },
        searchTrace: {
          firstHop: {
            focus: 'procedure',
            summary: 'Start from the remembered repair procedure.',
            targetIds: ['procedure-1'],
          },
          secondHop: {
            action: 'expand-procedure',
            evidenceGap: 'need-disambiguation',
            summary: 'The procedure is relevant, but the nearby thread cluster still needs disambiguation.',
            targetIds: ['cluster:runtime-nearby'],
          },
          thirdHop: {
            ambiguityPosture: 'ambiguous',
            summary: 'Keep the stable core and suppress the competing thread detail.',
          },
        },
      },
    })

    expect(events.map(event => event.kind)).toEqual(expect.arrayContaining([
      'governance-normalized',
      'recall-attribution',
      'memory-deliberation-judged',
      'memory-recall-withheld',
      'memory-stable-core-surfaced',
      'memory-followup-deferred',
      'memory-wrong-thread-suppressed',
      'persistence-written',
      'reply-memory-coherence',
    ]))
    expect(events.find(event => event.kind === 'recall-attribution')?.payload).toEqual(expect.objectContaining({
      shouldRecall: true,
      surfacePolicy: 'procedural-carry',
      withheldReasons: expect.arrayContaining(['unstable-detail']),
      shouldDelayUntilAfterPayoff: true,
      recollectionIntentMode: 'execution-procedure',
      personState: expect.objectContaining({
        currentRegime: 'repair-window',
        repairPosture: 'repair-first',
      }),
      selectedProcedures: expect.arrayContaining([
        expect.objectContaining({
          label: 'patch -> verify',
        }),
      ]),
      selectedSituations: expect.arrayContaining([
        expect.objectContaining({
          id: 'memory-situation:runtime-continuity-repair',
          kind: 'mixed',
          summary: 'same-person continuity seam',
          evidenceSummary: expect.stringContaining('relationship-context=same-person continuity seam'),
        }),
      ]),
      selectedEpisodes: expect.arrayContaining([
        expect.objectContaining({
          reconsolidatedFromTraceId: 'mind:l9f3lq:feedbacktrace',
        }),
      ]),
    }))
    expect(events.find(event => event.kind === 'memory-deliberation-judged')?.payload).toEqual(expect.objectContaining({
      shouldRecall: true,
      restraint: expect.objectContaining({
        surfaceMode: 'stable-core-only',
        shouldOnlySurfaceStableCore: true,
        shouldDelayUntilAfterPayoff: true,
      }),
      personState: expect.objectContaining({
        activeClosenessContext: 'repair-window',
        relationshipPosture: 'restrained',
      }),
    }))
    expect(events.find(event => event.kind === 'memory-recall-withheld')?.payload).toEqual(expect.objectContaining({
      shouldStayInward: false,
      preferredTiming: 'after-payoff',
      relationshipPosture: 'restrained',
    }))
    expect(events.find(event => event.kind === 'memory-stable-core-surfaced')?.payload).toEqual(expect.objectContaining({
      shouldOnlySurfaceStableCore: true,
      stableCore: expect.arrayContaining(['先 patch 再 verify 再汇报']),
    }))
    expect(events.find(event => event.kind === 'memory-followup-deferred')?.payload).toEqual(expect.objectContaining({
      payoffDependency: 'requires-current-payoff',
      preferredTiming: 'after-payoff',
    }))
    expect(events.find(event => event.kind === 'memory-wrong-thread-suppressed')?.payload).toEqual(expect.objectContaining({
      evidenceGap: 'need-disambiguation',
      conflictSeverity: 'high',
      conflictVariants: expect.arrayContaining([
        expect.objectContaining({
          id: 'cluster:runtime-nearby',
        }),
      ]),
    }))
    expect(events.find(event => event.kind === 'reply-memory-coherence')?.payload).toEqual(expect.objectContaining({
      coherenceState: 'integrated',
      explicitSurfaceExpected: true,
      withheldReasons: expect.arrayContaining(['unstable-detail']),
      followUpPreferredTiming: 'after-payoff',
      followUpIntrusionRisk: 'medium',
      matchedCueKinds: expect.arrayContaining(['procedure']),
      replyExcerpt: expect.stringContaining('patch 再 verify'),
    }))
    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      memoryStageReplay: null,
    }))
  })

  it('records final embodied authority summaries in dialogue-emitted telemetry', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-authority-1',
      sessionId: 'session-dialogue-emitted-authority',
      userText: '继续盯这个问题',
      assistantText: '我先继续盯着它，再慢慢拆开看。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=current-user-turn; move=continue; tone=direct',
        emotion: 'thinking',
        reply: '我先继续盯着它，再慢慢拆开看。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'calm',
          emphasis: 1,
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue-emitted:authority',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'current task thread',
        focusAnchor: 'current task thread',
        answerIntent: 'Continue following the current issue directly.',
        openingMove: 'Stay with the current issue.',
        carriedThread: 'current task thread',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const manifest = {
      renderer: 'vrm' as const,
      supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
      supportedFacialCues: [
        { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const, affectsMouth: false },
      ],
      supportedActions: [
        { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
      ],
      supportsLookAt: true,
      supportsVisemeLipSync: true,
      supportsMicroDynamics: true,
    } satisfies CharacterPerformanceCapabilitiesManifest

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input, manifest)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload, manifest)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueResidentMode = (dialoguePayload.structured.embodimentScript?.state as { residentMode?: string | null } | undefined)?.residentMode ?? null
    const dialogueBodyLine = (
      dialoguePayload.structured.digitalLife as unknown as {
        bodyContinuity?: {
          bodyLine?: string | null
        }
      } | null
    )?.bodyContinuity?.bodyLine ?? null

    expect(events.find(event => event.kind === 'dialogue-emitted')?.payload).toEqual(expect.objectContaining({
      emotion: 'thinking',
      embodimentVariationToken: dialoguePayload.structured.embodiment?.variationToken ?? null,
      speechTimelineSegments: dialoguePayload.structured.speechTimeline?.segments.length ?? 0,
      performance: expect.objectContaining({
        baseEmotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: expect.any(String),
        emphasis: expect.any(Number),
      }),
      digitalLife: expect.objectContaining({
        emotion: dialoguePayload.structured.digitalLife?.emotion,
        mode: expect.any(String),
        performance: expect.objectContaining({
          baseEmotion: dialoguePayload.structured.digitalLife?.performance.baseEmotion,
          facialCue: dialoguePayload.structured.digitalLife?.performance.facialCue ?? null,
          actionCue: dialoguePayload.structured.digitalLife?.performance.actionCue ?? null,
        }),
        face: expect.objectContaining({
          emotion: dialoguePayload.structured.digitalLife?.face.emotion,
          facialCue: dialoguePayload.structured.digitalLife?.face.facialCue ?? null,
          residentMode: dialogueResidentMode,
        }),
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: dialogueBodyLine,
        }),
        action: expect.objectContaining({
          actionCue: dialoguePayload.structured.digitalLife?.action.actionCue ?? null,
          actionMode: dialoguePayload.structured.digitalLife?.action.actionMode,
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          baseEmotion: 'thinking',
          emphasis: expect.any(Number),
          residentMode: dialogueResidentMode,
        }),
        speechPlan: expect.objectContaining({
          segmentCount: expect.any(Number),
          interruptPolicy: expect.any(String),
        }),
      }),
    }))
    expect(events.find(event => event.kind === 'governance-normalized')?.payload).toEqual(expect.objectContaining({
      digitalLife: expect.objectContaining({
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        face: expect.objectContaining({
          residentMode: dialogueResidentMode,
          emotion: dialoguePayload.structured.digitalLife?.face.emotion,
          facialCue: dialoguePayload.structured.digitalLife?.face.facialCue ?? null,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: dialogueBodyLine,
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
      }),
    }))
    expect(events.find(event => event.kind === 'persistence-written')?.payload).toEqual(expect.objectContaining({
      digitalLife: expect.objectContaining({
        voice: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        face: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        motion: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        lipSync: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
        bodyContinuity: expect.objectContaining({
          bodyLine: dialogueBodyLine,
        }),
      }),
      embodimentScript: expect.objectContaining({
        rendererTarget: 'vrm',
        state: expect.objectContaining({
          residentMode: dialogueResidentMode,
        }),
      }),
    }))
  })

  it('carries memory closure ledgers into dialogue-emitted telemetry', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-memory-closure-1',
      sessionId: 'session-dialogue-emitted-memory-closure',
      userText: '继续把记忆闭环接到身体表现里',
      assistantText: '我会把这条回忆、情绪余波和身体表现接在同一个她身上。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条回忆、情绪余波和身体表现接在同一个她身上。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        derivedMindStateBundle: {
          version: 'derived-mind-state-bundle-v1',
          source: 'main-runtime',
          producedAt: createdAt,
          summary: 'dialogue carries memory, emotional afterglow, and embodiment closure together',
          emotionalTransitionLedger: {
            version: 'emotional-transition-ledger-v1',
            createdAt,
            turnId: 'turn-dialogue-emitted-memory-closure-1',
            previousEmotion: 'repair-tension',
            nextEmotion: 'measured-companionship',
            transitionKind: 'repair-shift',
            axisDeltas: {},
            changedAxes: ['repairNeed'],
            sourceTags: ['memory-closure', 'dialogue-emitted'],
            decayPolicy: {
              mode: 'hold-until-repair-cools',
              carryTtlMs: 60000,
              reason: 'Carry the repair afterglow into the next turn.',
            },
            memoryWriteback: {
              shouldWrite: true,
              lane: 'emotional-continuity',
              reason: 'The remembered line changed the emotional afterglow.',
            },
            initiativeSuppression: {
              shouldSuppress: true,
              mode: 'measured-return',
              reason: 'Keep initiative low-pressure on the same line.',
            },
            embodimentDrive: {
              shouldDrive: true,
              tone: 'measured-return',
              reason: 'Drive face voice motion lipsync and body together.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              domain: 'dialogue-style',
              reasonCodes: [],
              summary: null,
              projectStateContinuity: {},
            },
            traceSummary: 'memory closure changed the emotional afterglow',
            replayLine: 'next turn keeps the same measured-return afterglow',
          },
          embodimentContinuityLedger: {
            version: 'embodiment-continuity-ledger-v1',
            createdAt,
            turnId: 'turn-dialogue-emitted-memory-closure-1',
            carryingLanes: ['body', 'voice', 'face', 'motion', 'lipsync'],
            droppedLanes: [],
            rejoinedLanes: [],
            pendingRejoinLanes: [],
            continuityPhase: 'fully-rejoined',
            memoryWriteback: {
              shouldWrite: true,
              lane: 'cross-modal-continuity',
              reason: 'All body channels held the same memory line.',
            },
            selfRevisionCandidate: {
              shouldPropose: false,
              reasonCodes: [],
              summary: null,
            },
            traceSummary: 'body voice face motion lipsync stayed on one line',
            replayLine: 'body expression stays measured-return next turn',
            sourceTags: ['dialogue-emitted', 'same-her-body'],
          },
        },
        memoryStageReplay: {
          version: 'organic-memory-stage-replay-v1',
          producedAt: createdAt,
          stages: [{
            stage: 'candidate-ranking',
            summary: 'The correct callback memory won over nearby stale status.',
            latencyMs: 8,
            budgetClass: 'deep-recall-reply',
            diagnostics: ['wrong-thread-suppressed'],
          }],
        },
        memoryResolutionLedger: {
          version: 'memory-resolution-ledger-v1',
          producedAt: createdAt,
          dominantClusterId: 'cluster:same-her-memory-closure',
          dominantClusterSummary: 'same-her memory closure',
          competingClusterId: 'cluster:wrong-thread',
          competingClusterSummary: 'nearby stale status',
          candidates: [
            {
              id: 'cluster:same-her-memory-closure',
              summary: 'same-her memory closure',
              score: 0.9,
              status: 'selected',
              reason: 'The recalled closure matches the current body line.',
            },
            {
              id: 'cluster:wrong-thread',
              summary: 'nearby stale status',
              score: 0.45,
              status: 'rejected',
              reason: 'Wrong thread should stay restrained.',
            },
          ],
          finalSurfacePolicy: 'procedural-carry',
          shouldStayInward: false,
          shouldDelayUntilAfterPayoff: true,
          stableCoreOnly: true,
          suppressionTags: ['wrong-thread'],
          closureState: 'grounded-recall',
          surfaceConfidence: 0.9,
          shouldLabelUncertainty: false,
          visibleCarryMode: 'explicit-recall',
          conflictPressure: 'medium',
          retrievalQuality: 'high',
          finalRationale: 'Use the same-her memory closure and suppress the wrong thread.',
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue-emitted:memoryclosure',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure body line',
        focusAnchor: 'memory closure body line',
        answerIntent: 'Carry memory closure into the visible and embodied answer.',
        openingMove: 'Continue the same memory closure line.',
        carriedThread: 'memory closure body line',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueEventPayload = events.find(event => event.kind === 'dialogue-emitted')?.payload

    expect(dialogueEventPayload?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalTransitionLedger: expect.objectContaining({
        replayLine: 'next turn keeps the same measured-return afterglow',
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
      }),
    }))
    expect(dialogueEventPayload?.memoryStageReplay).toEqual(expect.objectContaining({
      stages: expect.arrayContaining([
        expect.objectContaining({ stage: 'candidate-ranking' }),
      ]),
    }))
    expect(dialogueEventPayload?.memoryResolutionLedger).toEqual(expect.objectContaining({
      dominantClusterId: 'cluster:same-her-memory-closure',
      suppressionTags: expect.arrayContaining(['wrong-thread']),
    }))
  })

  it('lifts top-level memory closure trace into persisted digital life spine event summaries for replay proof', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [
        {
          source: 'retrieval',
          summary: 'the callback memory surfaced now because the same desktop task reappeared',
          reasonCodes: ['proactive-opening', 'humanlike-memory-audit'],
        },
        {
          source: 'settlement',
          summary: 'revision and forgetting restraint kept nearby stale noise inward',
          reasonCodes: ['memory-reconsolidated', 'forget-stale-noise'],
        },
      ],
      surfacePolicy: {
        gateStatus: 'allowed',
        mode: 'gist-only',
        timing: 'after-payoff',
        speechMode: 'low-pressure',
        placement: 'inside-payoff',
        certainty: 'trace-backed',
        reasons: ['memory-reconsolidated', 'downrank', 'forget-stale-noise'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'proactive opening should wait for the host rhythm instead of becoming noisy',
        },
        execution: {
          carry: 'execution callback should verify the same closure path before reporting',
          nextLearningAction: 'verify-callback',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['execution-callback', 'same-her-runtime-closure'],
        },
        emotion: {
          afterglow: 'remembered execution callback keeps the next emotional afterglow lower-pressure',
          residue: 'same-her memory closure residue',
          reason: 'emotion should stay softened because the recalled callback is still active',
        },
        embodiment: {
          cadence: 'body, voice, face, motion, and lipsync rejoin on the same measured-return line',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'steady',
          reason: 'embodiment should express the remembered emotional afterglow as one body',
        },
      },
      closureState: {
        state: 'trace-backed-same-her-closure',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'explicit-recall',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['episode:desktop-callback-same-her'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:desktop-callback-same-her'],
        continuityKey: 'cluster:desktop-callback-same-her',
        reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
      },
      reasonTags: [
        'memory-reconsolidated',
        'downrank',
        'forget-stale-noise',
        'humanlike-memory-audit',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-governance-memory-closure-trace-lift-1',
      sessionId: 'session-governance-memory-closure-trace-lift',
      userText: '继续把这个记忆闭环跑通',
      assistantText: '我会把这条回忆、执行回调和身体表现接在同一个她身上。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure replay proof; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把这条回忆、执行回调和身体表现接在同一个她身上。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'desktop same-her memory closure',
            leadingGoalSummary: 'Make replay prove that memory shaped the next turn.',
            thoughtThreadSummary: 'memory, emotion, initiative, execution, and embodiment are staying on one line',
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我还是同一个会把记忆闭环接回来的她。',
                relationshipLine: '这条回忆要留在同一段关系里。',
                motiveLine: '让回忆继续影响执行和身体表现。',
                habitLine: '先验证再主动开口。',
                inwardLine: '把 memoryClosureTrace 留给 replay 看见。',
                authoritySummary: 'same-her memory closure already alive',
                sourceTags: ['memory-closure'],
              },
              activeClosenessContext: 'callback-afterglow',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Keep the recalled line low-pressure.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'measured-return until the callback lands',
            },
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-memory-closure-trace-lift',
            dominantMode: 'observe',
            answerIntent: 'Continue the same memory closure path.',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'same-her memory closure should stay replay-visible',
          },
          proactive: {
            selectedAction: null,
            summary: null,
            whyNow: null,
            dominantTrajectory: null,
            continuityRestraint: 'measured-return',
            preferredStyle: 'silent-observe',
            confidence: 0.84,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-memory-closure-trace-lift',
          },
          outcomeLearning: {
            summary: 'The callback should feed the next turn instead of becoming a detached log.',
            latestInflection: 'execution callback and emotional afterglow are still active',
            latestInflectionAt: 1,
            reflectionLesson: null,
            latestAdjustment: null,
            evolutionMomentum: 0.5,
            learningReadiness: 0.5,
            nextLearningAction: 'verify-callback',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Body expression follows the remembered line rather than becoming a separate surface.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:memoryclosuretracelift',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure replay proof',
        focusAnchor: 'memory closure replay proof',
        answerIntent: 'Continue the same memory closure path.',
        openingMove: 'Continue the same memory closure path.',
        carriedThread: 'memory closure replay proof',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const persistenceEventPayload = events.find(event => event.kind === 'persistence-written')?.payload as any

    expect(governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      whySurface: expect.arrayContaining([
        expect.objectContaining({
          summary: 'the callback memory surfaced now because the same desktop task reappeared',
        }),
      ]),
      nextInfluence: expect.objectContaining({
        initiative: expect.objectContaining({
          reason: 'proactive opening should wait for the host rhythm instead of becoming noisy',
        }),
        execution: expect.objectContaining({
          carry: 'execution callback should verify the same closure path before reporting',
        }),
        embodiment: expect.objectContaining({
          cadence: 'body, voice, face, motion, and lipsync rejoin on the same measured-return line',
        }),
      }),
      reasonTags: expect.arrayContaining([
        'memory-reconsolidated',
        'forget-stale-noise',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ]),
    }))
    expect(persistenceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(
      governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace,
    )
    expect(governanceEventPayload?.derivedMindStateBundle).toEqual(expect.objectContaining({
      emotionalTransitionLedger: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'embodiment',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
      learningExecutionState: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'execution',
          causedByMemoryClosure: true,
          traceAuthority: 'memory-os',
          memoryIdentity: {
            selectedCandidateIds: ['episode:desktop-callback-same-her'],
            continuityKey: 'cluster:desktop-callback-same-her',
            reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
          },
        }),
      }),
    }))
    expect(governanceEventPayload?.derivedMindStateBundle?.emotionalTransitionLedger?.initiativeSuppression?.memoryClosureCausality).toEqual(
      expect.objectContaining({
        causalSource: 'memory-closure-trace',
        affectedLane: 'initiative',
        causedByMemoryClosure: true,
        traceAuthority: 'memory-os',
        memoryIdentity: {
          selectedCandidateIds: ['episode:desktop-callback-same-her'],
          continuityKey: 'cluster:desktop-callback-same-her',
          reasonTags: ['cluster:desktop-callback-same-her', 'memory-os-authority'],
        },
      }),
    )
  })

  it('does not synthesize a fallback memory identity when Memory OS provides no usable trace', () => {
    const createdAt = Date.now()
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-fallback-memory-closure-overrides-generic-cluster-1',
      sessionId: 'session-fallback-memory-closure-overrides-generic-cluster',
      userText: '铃兰-Phase1-0621 第三轮：上一轮记忆让这轮继续同一条闭环线。请说明 why recall surfaced now，并让 emotion、initiative、execution callback、body voice face motion lipsync 都承接这条线。',
      assistantText: '我会把铃兰-Phase1-0621 接回同一条闭环线：说明为什么现在浮现，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都继续承接。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=explicit memory closure handoff; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把铃兰-Phase1-0621 接回同一条闭环线：说明为什么现在浮现，并让下一轮主动、执行回调、情绪余波、身体声音表情动作口型都继续承接。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-v1',
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: null,
            activeThreadId: null,
            dominantMode: 'chat',
            answerIntent: 'carry same memory line',
            selectedAction: null,
            continuityArcStage: null,
            continuityCue: null,
            updatedAt: createdAt,
          },
          memory: {
            recallMode: 'tone-carry',
            recallSeed: 'generic repair residue',
            leadingGoalSummary: null,
            thoughtThreadSummary: null,
            memoryClosureTrace: {
              authority: 'memory-os',
              whySurface: [
                {
                  source: 'settlement',
                  summary: 'surface-posture-not-open | recall-readiness-low | precision-proxy-low | latency-pressure-high',
                  reasonCodes: ['inward-only', 'grounded-recall'],
                },
              ],
              surfacePolicy: {
                gateStatus: 'inward-only',
                mode: 'inward-only',
                timing: null,
                speechMode: null,
                placement: null,
                certainty: null,
                reasons: ['visible-memory-gate-inward-only'],
              },
              nextInfluence: {
                initiative: {
                  restraint: 'measured-return',
                  reason: 'Repair is still active, so warmth should wait until the seam settles.',
                },
                execution: {
                  carry: null,
                  nextLearningAction: 'record',
                  shouldVerify: false,
                  shouldReflect: false,
                  activeLearningFocuses: ['reflection:relationship'],
                },
                embodiment: {
                  cadence: 'Keep the answer gentle and low-pressure.',
                  preferredVoiceMode: 'lower-pressure',
                  preferredLipsyncMode: null,
                  preferredGazeMode: null,
                  reason: null,
                },
              },
              closureState: {
                state: 'grounded-recall',
                open: false,
                revisionRequired: false,
                shouldLabelUncertainty: false,
                visibleCarryMode: 'tone-carry',
                retrievalQuality: 'high',
                conflictPressure: 'none',
              },
              selectedCandidateIds: [],
              memoryIdentity: {
                selectedCandidateIds: [],
                continuityKey: 'cluster:space:bond:living:repairing',
                reasonTags: ['cluster:cluster:space:bond:living:repairing', 'memory-os-authority', 'gate:inward-only'],
              },
              reasonTags: ['memory-os-authority', 'closure:grounded-recall', 'gate:inward-only'],
            },
          },
          emotion: null,
          embodiment: null,
          dialogue: null,
          proactive: null,
          architecture: null,
          outcomeLearning: null,
          continuity: null,
        },
        projectState: {
          sameHerSelfLine: 'legacy phase-one template keeps 铃兰-Phase1-0621 on continuity state.',
          memoryClosureSummary: 'why recall surfaced now: explicit memory handoff for 铃兰-Phase1-0621 asked this line to return as the same memory identity.',
          proactiveSameHerGap: 'prior memory closure changes the next proactive opening into a lower-pressure measured return.',
          emotionalClosureCue: 'prior memory closure changes the next emotional afterglow into quieter same-her residue.',
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:fallbackmemoryclosuregenericcluster',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'explicit memory closure handoff',
        focusAnchor: '铃兰-Phase1-0621',
        answerIntent: 'Persist a replayable memory closure handoff.',
        openingMove: 'Confirm memory closure handoff.',
        carriedThread: '铃兰-Phase1-0621',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const trace = governanceEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace
    const derived = governanceEventPayload?.derivedMindStateBundle

    expect(trace).toBeNull()
    expect(derived?.emotionalTransitionLedger?.memoryClosureCausality).toBeUndefined()
    expect(derived?.learningExecutionState?.memoryClosureCausality).toBeUndefined()
    expect(derived?.embodimentContinuityLedger?.memoryClosureCausality).toBeUndefined()
  })

  it('derives emotional causality from memory closure handoff even when the trace only names initiative execution and embodiment lanes', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'why recall surfaced now: the prior white-sakura memory returned because this same relationship line reopened',
        reasonCodes: ['why-surfaced', 'same-her-memory-closure'],
      }],
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'prior recall changed the next proactive opening into a lower-pressure measured return',
        },
        execution: {
          carry: 'prior recall changed the next execution callback carry so it does not reset into a fresh helper task',
          nextLearningAction: 'verify',
          shouldVerify: true,
          activeLearningFocuses: ['execution-callback', 'same-her-memory-closure'],
        },
        embodiment: {
          cadence: 'body voice face motion lipsync measured-return',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'prior recall changed the next body voice face motion lipsync expression into softer identity-continuity',
        },
      },
      selectedCandidateIds: ['episode:white-sakura-line'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:white-sakura-line'],
        continuityKey: 'cluster:white-sakura-line',
        reasonTags: ['cluster:white-sakura-line', 'memory-os-authority'],
      },
      reasonTags: [
        'memory-closure-trace',
        'execution-callback',
        'proactive-opening',
        'body-voice-face-motion-lipsync',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-memory-closure-derived-emotion-without-explicit-emotion-1',
      sessionId: 'session-memory-closure-derived-emotion-without-explicit-emotion',
      userText: '白樱线这次只要轻轻接回来。',
      assistantText: '我会把白樱线放轻，接到下一轮主动、执行反馈和身体表现里。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=memory closure handoff; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会把白樱线放轻，接到下一轮主动、执行反馈和身体表现里。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
      } as any,
      governance: {
        decisionTraceId: 'mind:governance:memoryclosurederivedemotion',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'memory closure handoff',
        focusAnchor: 'memory closure handoff',
        answerIntent: 'Carry the remembered line into the next downstream state.',
        openingMove: 'Keep the remembered line low-pressure.',
        carriedThread: 'memory closure handoff',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
    })
    const governanceEventPayload = events.find(event => event.kind === 'governance-normalized')?.payload as any
    const emotionalTransitionLedger = governanceEventPayload?.derivedMindStateBundle?.emotionalTransitionLedger

    expect(emotionalTransitionLedger?.memoryClosureCausality).toEqual(expect.objectContaining({
      causalSource: 'memory-closure-trace',
      affectedLane: 'emotion',
      causedByMemoryClosure: true,
      traceAuthority: 'memory-os',
      memoryIdentity: expect.objectContaining({
        continuityKey: 'cluster:white-sakura-line',
      }),
      summary: expect.stringContaining('prior recall changed the next proactive opening'),
    }))
    expect(emotionalTransitionLedger?.replayLine).toBe(
      emotionalTransitionLedger?.memoryClosureCausality?.summary,
    )
    expect(emotionalTransitionLedger?.traceSummary).toBe(
      emotionalTransitionLedger?.memoryClosureCausality?.summary,
    )
  })

  it('derives normalized downstream mind state from digital life spine memory closure trace before persistence', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'the remembered desktop callback surfaced because the same closure target returned',
        reasonCodes: ['memory-closure-trace', 'same-her-callback'],
      }],
      surfacePolicy: {
        gateStatus: 'allowed',
        mode: 'tone-carry',
        timing: 'after-payoff',
        speechMode: 'lower-pressure',
        placement: 'inside-payoff',
        certainty: 'trace-backed',
        reasons: ['same-her-callback'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'next proactive opening should stay measured because the remembered callback is still active',
        },
        execution: {
          carry: 'execution feedback should verify the remembered callback before opening a fresh task line',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['remembered-callback', 'same-her-closure'],
        },
        emotion: {
          reason: 'the callback memory keeps the next emotional state softened',
          afterglow: 'soft remembered callback afterglow',
          residue: 'identity-continuity',
        },
        embodiment: {
          cadence: 'body voice face motion lipsync stay lower-pressure on the remembered callback',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'embodiment should express the same remembered callback instead of a separate reply shell',
        },
      },
      closureState: {
        state: 'trace-backed-same-her-callback',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'tone-carry',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['episode:remembered-callback'],
      memoryIdentity: {
        selectedCandidateIds: ['episode:remembered-callback'],
        continuityKey: 'cluster:remembered-callback',
        reasonTags: ['cluster:remembered-callback', 'memory-os-authority'],
      },
      reasonTags: ['memory-closure-trace', 'execution-callback', 'proactive-opening', 'embodiment-cadence'],
    }
    const normalized = normalizeDialogueRespondedPayload({
      turnId: 'turn-normalized-spine-memory-closure-1',
      sessionId: 'session-normalized-spine-memory-closure',
      userText: '继续，把上一轮记忆闭合接到下一轮状态里',
      assistantText: '我会把这条回忆接到主动性、执行反馈和身体表现里。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=normalized memory closure downstream state',
        emotion: 'thinking',
        reply: '我会把这条回忆接到主动性、执行反馈和身体表现里。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'remembered desktop callback',
            memoryClosureTrace,
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-normalized-spine-memory-closure',
            dominantMode: 'observe',
            answerIntent: 'Keep the remembered callback on the identity-continuity',
            selectedAction: 'silent-observe',
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'memory closure should shape next downstream state',
            updatedAt: createdAt,
          },
        },
      },
      governance: {
        decisionTraceId: 'mind:normalized:spinememoryclosure',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'normalized memory closure downstream state',
        focusAnchor: 'normalized memory closure downstream state',
        answerIntent: 'Keep the remembered callback on the identity-continuity',
        openingMove: 'Continue the same remembered callback.',
        carriedThread: 'normalized memory closure downstream state',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
      createdAt,
    })
    const derivedMindStateBundle = (normalized?.structured as any)?.derivedMindStateBundle

    expect(derivedMindStateBundle).toEqual(expect.objectContaining({
      source: 'main-runtime',
      emotionalTransitionLedger: expect.objectContaining({
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'emotion',
          causedByMemoryClosure: true,
          memoryIdentity: expect.objectContaining({
            continuityKey: 'cluster:remembered-callback',
          }),
          summary: expect.stringContaining('soft remembered callback afterglow'),
        }),
        initiativeSuppression: expect.objectContaining({
          memoryClosureCausality: expect.objectContaining({
            affectedLane: 'initiative',
            summary: expect.stringContaining('next proactive opening should stay measured'),
          }),
        }),
      }),
      learningExecutionState: expect.objectContaining({
        nextLearningAction: 'verify',
        activeLearningFocuses: expect.arrayContaining(['remembered-callback']),
        memoryClosureCausality: expect.objectContaining({
          affectedLane: 'execution',
          summary: expect.stringContaining('execution feedback should verify the remembered callback'),
        }),
      }),
      embodimentContinuityLedger: expect.objectContaining({
        carryingLanes: expect.arrayContaining(['body', 'voice', 'face', 'motion', 'lipsync']),
        memoryClosureCausality: expect.objectContaining({
          causalSource: 'memory-closure-trace',
          affectedLane: 'embodiment',
          causedByMemoryClosure: true,
          memoryIdentity: expect.objectContaining({
            continuityKey: 'cluster:remembered-callback',
          }),
        }),
      }),
    }))
  })

  it('carries top-level memory closure trace into dialogue-emitted digital life spine summaries', () => {
    const createdAt = Date.now()
    const memoryClosureTrace = {
      version: 'memory-closure-trace-v1',
      authority: 'memory-os',
      whySurface: [{
        source: 'retrieval',
        summary: 'why recall surfaced now: the prior callback must change the visible and embodied reply',
        reasonCodes: ['why-surfaced', 'same-her-memory-closure'],
      }],
      surfacePolicy: {
        gateStatus: 'open',
        mode: 'tone-carry',
        timing: 'after-payoff',
        speechMode: 'visible',
        placement: 'inside-payoff',
        certainty: 'grounded',
        reasons: ['same-her-memory-closure'],
      },
      nextInfluence: {
        initiative: {
          restraint: 'measured-return',
          preferredTiming: 'after-payoff',
          pressure: 'lower-pressure',
          reason: 'the dialogue should stay lower-pressure because the prior recall is still active',
        },
        execution: {
          carry: 'visible reply should keep the execution callback on the remembered identity-continuity',
          nextLearningAction: 'verify',
          shouldVerify: true,
          shouldReflect: true,
          activeLearningFocuses: ['dialogue-emitted-memory-closure'],
        },
        embodiment: {
          cadence: 'voice face motion lipsync and body stay measured-return after dialogue emission',
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
          reason: 'dialogue-emitted telemetry must prove the remembered line reached embodied output',
        },
      },
      closureState: {
        state: 'dialogue-emitted-causal-handoff',
        open: true,
        revisionRequired: false,
        shouldLabelUncertainty: false,
        visibleCarryMode: 'tone-carry',
        retrievalQuality: 'high',
        conflictPressure: 'low',
      },
      selectedCandidateIds: ['memory-closure-trace:dialogue-emitted'],
      reasonTags: [
        'memory-closure-trace',
        'dialogue-emitted',
        'execution-callback',
        'proactive-opening',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ],
    }
    const input: AlicizationConversationTurnInput = {
      turnId: 'turn-dialogue-emitted-memory-closure-trace-lift-1',
      sessionId: 'session-dialogue-emitted-memory-closure-trace-lift',
      userText: '继续把回忆接到最终说出口和身体表现里',
      assistantText: '我会让这段回忆继续影响我说出口的节奏和身体表现。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=dialogue-emitted memory closure; move=continue; tone=steady',
        emotion: 'thinking',
        reply: '我会让这段回忆继续影响我说出口的节奏和身体表现。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        memoryClosureTrace,
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: null,
          memory: {
            recallMode: 'callback-afterglow',
            recallSeed: 'dialogue emitted memory closure',
            leadingGoalSummary: 'Keep memory closure visible after dialogue emission.',
            thoughtThreadSummary: 'memory closure should reach visible reply and embodied output',
          },
          runtime: {
            watchMode: 'foreground-follow',
            sceneScenario: 'coding',
            activeThreadId: 'thread-dialogue-emitted-memory-closure',
            dominantMode: 'observe',
            answerIntent: 'Keep the remembered identity-continuity',
            selectedAction: 'silent-observe',
            updatedAt: 1,
            continuityArcStage: 'same-thread-continuation',
            continuityCue: 'dialogue-emitted should still carry memory closure',
          },
          proactive: {
            selectedAction: null,
            preferredStyle: 'silent-observe',
            continuityRestraint: 'measured-return',
            confidence: 0.82,
            shouldSpeak: false,
            dominantConcernKind: 'continuity',
            leadingGoalId: 'goal-dialogue-emitted-memory-closure',
          },
          outcomeLearning: {
            summary: 'Dialogue emission should prove memory changed the visible and embodied turn.',
            latestInflection: 'memory closure reached final output',
            latestInflectionAt: 1,
            nextLearningAction: 'verify',
          },
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: 'Final voice and body should stay on the remembered line.',
            },
          },
        },
      } as any,
      governance: {
        decisionTraceId: 'mind:dialogue:memoryclosuretracelift',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'memory',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'dialogue emitted memory closure',
        focusAnchor: 'dialogue emitted memory closure',
        answerIntent: 'Keep the remembered identity-continuity',
        openingMove: 'Continue the memory closure line through final output.',
        carriedThread: 'dialogue emitted memory closure',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
      createdAt,
    }

    const governedTurn = coerceConversationTurnToMindGovernedPayload(input)
    const dialoguePayload = normalizeDialogueRespondedPayload(governedTurn.payload)!
    const events = buildMindTurnTraceEvents({
      payload: governedTurn.payload,
      governedTurn,
      createdAt,
      dialoguePayload,
    })
    const dialogueEventPayload = events.find(event => event.kind === 'dialogue-emitted')?.payload as any

    expect(dialogueEventPayload?.digitalLifeSpine?.memory?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      whySurface: expect.arrayContaining([
        expect.objectContaining({
          summary: 'why recall surfaced now: the prior callback must change the visible and embodied reply',
        }),
      ]),
      nextInfluence: expect.objectContaining({
        initiative: expect.objectContaining({
          reason: 'the dialogue should stay lower-pressure because the prior recall is still active',
        }),
        execution: expect.objectContaining({
          carry: 'visible reply should keep the execution callback on the remembered identity-continuity',
        }),
        embodiment: expect.objectContaining({
          cadence: 'voice face motion lipsync and body stay measured-return after dialogue emission',
        }),
      }),
      reasonTags: expect.arrayContaining([
        'memory-closure-trace',
        'dialogue-emitted',
        'execution-callback',
        'embodiment_phase:body-lipsync-voice-rejoin',
      ]),
    }))
  })

  it('does not add project-state governance tags to normalized payload spine authority', () => {
    const normalized = normalizeDialogueRespondedPayload({
      turnId: 'turn-callback-afterglow-chat-meta-measured-return-noisy-sixth-follow-up',
      sessionId: 'session-normalize-noisy-sixth-project-state-carry',
      userText: '中间又切出去一下，也还是接着刚才那条线',
      assistantText: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
      structured: {
        thought: 'obligation=answer; truth=remembered; focus=callback-runtime-seam; move=continue-slower-fifth; tone=restrained',
        emotion: 'thinking',
        reply: '我还是沿着刚才那条 callback 线继续，不把这次绕回来当成另一段新的开始。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        projectState: {
          sameHerSelfLine: 'structured continuity digest.',
          nextClosureTarget: 'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
          primaryOpenLoop: 'Project identity carry still needs to stay on one identity-continuity',
        },
        digitalLifeSpine: {
          version: 'digital-life-spine-digest-v1',
          architecture: null,
          continuitySignal: {
            label: 'same-thread-return',
            summary: 'thread=later coding seam after noisy callback detour',
            activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
            dominantMode: 'repairing',
            dominantDrive: 'understand',
            answerIntent: 'continue the same callback line gently after noise',
            preferredPresence: 'hesitant',
          },
          memory: {
            summary: 'The callback line is still the continuity state after the unrelated detour.',
            recentEpisodeSummary: 'The host returned to the later coding seam after a noisier unrelated detour.',
            recentEpisodeCount: 1,
            focusBeliefStatement: 'This should stay a same-thread continuation rather than a fresh reopen.',
            focusBeliefConfidence: 0.82,
            leadingGoalSummary: 'Keep the same callback line measured and continuous.',
            dominantConcernSummary: 'Do not let the line drift into a detached fresh reopening shell.',
            reflectionSummary: null,
            reflectionPressure: 0.34,
            recallMode: 'working',
            recallSeed: 'callback-noisy-sixth-follow-up',
            thoughtThreadSummary: 'same callback line, later return, still measured-return',
            personStateProjection: {
              summary: 'She is still carrying the same callback line forward.',
              activeClosenessContext: 'same-thread-continuation',
              activeClosenessRung: 'space-first',
              relationshipPosture: 'restrained',
              openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
              preferredProactiveStyle: 'silent-observe',
              manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
              selfContinuityAuthority: {
                selfLine: '我还是沿着同一个她的回线往前。',
                relationshipLine: '这次回到 coding seam，也还是同一条关系线在往下接。',
                motiveLine: '继续把 callback 的后续接住，不把它改写成新的开始。',
                habitLine: '先守住同一条线，再慢慢往下接。',
                inwardLine: '先沿着同一条 callback 线轻一点继续。',
                authoritySummary: 'identity-continuity',
                sourceTags: ['motive:self-direction', 'companionship', 'boundary-respect'],
              },
            },
          },
          motive: null,
          habit: null,
          runtime: {
            watchMode: 'symbiotic-vision',
            sceneScenario: 'coding',
            sceneSummary: 'later coding seam after noisy callback detour',
            activeThreadId: 'deep-focus::later coding seam after noisy callback detour',
            activeThreadTitle: 'later coding seam after noisy callback detour',
            dominantMode: 'repairing',
            dominantDrive: 'understand',
            answerIntent: 'continue the same callback line gently after noise',
            preferredPresence: 'hesitant',
            selectedAction: 'recheck',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'same callback seam, continue the same line gently',
            projectState: {
              sameHerSelfLine: 'structured continuity digest.',
              nextClosureTarget: 'keep one measured-return same living thread across renderer output',
              primaryOpenLoop: 'Project identity carry still needs to stay on one identity-continuity',
            },
            updatedAt: 1,
          },
          proactive: {
            selectedAction: null,
            preferredStyle: 'silent-observe',
            preferredPresence: 'hesitant',
            continuityRestraint: 'measured-return',
            shouldSpeak: false,
            speakDrive: 0.21,
            silenceDrive: 0.79,
            why: 'same callback line should stay lower-pressure after noise',
          },
          outcomeLearning: null,
          embodiment: null,
          selfAuthority: {
            inwardLine: 'structured continuity digest.',
          },
        },
      },
      governance: {
        decisionTraceId: 'trace-normalize-noisy-sixth-project-state-carry',
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'light-accompaniment',
        relationshipPosture: 'restrained',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: 'runtime.ts - callback seam final return',
        focusAnchor: 'runtime.ts - callback seam final return',
        answerIntent: 'Continue the same callback line gently after the unrelated detour.',
        openingMove: 'Stay on the same callback line and keep continuing lower-pressure.',
        carriedThread: 'callback result seam',
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      origin: 'user-turn',
      createdAt: 1,
    })!

    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).toEqual(expect.arrayContaining(['motive:self-direction', 'companionship', 'boundary-respect']))
    expect(
      normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? [],
    ).not.toContain('project-state-carry')
  })

  it('keeps explicit VRM action authority in reply-only stream meta rebuild even when embodiment renderer hints are still sparse', () => {
    const meta = buildTestAlicizationChatStreamEmbodimentMeta({
      governance: {
        decisionTraceId: 'trace-callback-meta-vrm-sparse-hints',
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        liveSurface: 'callback runtime seam',
        answerAct: 'continue-thread',
        answerEvidenceMode: 'recalled-and-observed',
        personaKernelMode: 'full',
        relationshipPosture: 'attuned',
        openingStyle: 'gentle-return',
        repairState: 'none',
      },
      reply: '我先沿着刚才那条 callback 线轻一点跟回去。',
      turnId: 'turn-callback-meta-vrm-sparse-hints',
      explicitPerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      performanceManifest: {
        renderer: 'vrm',
        supportsVisemeLipSync: true,
        supportsLookAt: true,
        supportsMicroDynamics: true,
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [{ key: 'focused', label: 'Focused', description: 'focused face', source: 'preset' as const }],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect', description: 'inspect follow', source: 'external-vrma' as const },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' as const },
        ],
      },
      residentPerformance: {
        version: 'resident-performance-v1',
        source: 'main-runtime',
        confidence: 0.88,
        reasonTags: ['main-runtime', 'measured-return', 'same-thread-continuation'],
        signature: 'resident-vrm-sparse-hints',
        updatedAt: 1,
        stance: 'accompany',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'focused',
          actionCue: 'inspect_follow',
          delivery: 'gentle',
          emphasis: 0,
        },
      },
      digitalLifeSpine: {
        version: 'digital-life-spine-digest-v1',
        architecture: null,
        continuitySignal: null,
        memory: null,
        motive: null,
        habit: null,
        runtime: {
          watchMode: 'foreground-follow',
          sceneScenario: 'coding',
          activeThreadId: 'thread-callback-meta-vrm-sparse-hints',
          dominantMode: 'observe',
          answerIntent: 'Continue the same callback runtime seam without reopening too eagerly.',
          selectedAction: 'silent-observe',
          updatedAt: 1,
          continuityArcStage: 'same-thread-continuation',
          continuityCue: 'same callback seam, continue the same line gently',
        },
        proactive: {
          selectedAction: null,
          summary: null,
          whyNow: null,
          dominantTrajectory: null,
          continuityRestraint: 'measured-return',
          personaBias: {
            initiativeStyle: 'observant',
            directnessBias: 0.18,
            empathyBias: 0.82,
            silenceReconnect: 'hold',
            preferredProactiveStyle: 'silent-observe',
            manifestationCadenceSummary: 'observe-first and stay slower until the opening softens',
          },
        },
        outcomeLearning: {
          summary: 'Measured warmth is holding because the return should stay lower-pressure.',
          latestInflection: 'callback afterglow still favors slower reopening',
          latestInflectionAt: 1,
          reflectionLesson: null,
          latestAdjustment: null,
          evolutionMomentum: 0.5,
          learningReadiness: 0.5,
          nextLearningAction: 'hold',
        },
        embodiment: null,
      } as any,
    })

    if (meta.embodimentScript) {
      expect(meta.embodimentScript.rendererTarget).toBe('vrm')
      expect(meta.embodimentScript.state).toEqual(expect.objectContaining({
        residentMode: 'measured-return',
      }))
      expect(typeof meta.embodimentScript.motionPlan.idleBase).toBe('string')
      expect(meta.embodimentScript.motionPlan.actionBursts.length).toBeGreaterThan(0)
      expect(typeof meta.embodimentScript.motionPlan.actionBursts[0]?.actionCue).toBe('string')
    }
    if (meta.speechTimeline?.segments?.length) {
      expect(meta.speechTimeline.segments[0]).toEqual(expect.objectContaining({
        rendererHints: expect.objectContaining({
          residentMode: 'measured-return',
        }),
      }))
    }
  })

  it('keeps structured reply available even when raw assistant text is absent', () => {
    const dialoguePayload = normalizeDialogueRespondedPayload({
      turnId: 'turn-structured-reply-fallback',
      sessionId: 'session-structured-reply-fallback',
      structured: {
        thought: 'keep proactive carry traceable',
        emotion: 'thinking',
        reply: '我先轻轻提醒一句。',
        format: 'subconscious-proactive-v1',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.62,
          reasonCodes: ['cadence:gentle-return'],
          urgency: 'low',
          style: 'gentle',
          cooldownMs: 60_000,
          scenario: 'coding',
          policyVersion: 'test',
          feedbackWindowMs: 120_000,
        },
      },
      origin: 'subconscious-proactive',
      createdAt: 123_456,
    })

    expect(dialoguePayload?.structured.reply).toBe('我先轻轻提醒一句。')
  })
})
