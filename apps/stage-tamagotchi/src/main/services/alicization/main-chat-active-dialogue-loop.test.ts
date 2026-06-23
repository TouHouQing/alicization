import type { Message } from '@xsai/shared-chat'

import { describe, expect, it } from 'vitest'

import {
  AlicizationActiveDialogueMindAuthorityEscalationError,
  buildAlicizationActiveDialogueFallbackReply,
  buildAlicizationActiveDialogueFastPathMessages,
  buildAlicizationActiveDialogueGovernedReply,
  deriveAlicizationActiveDialogueFastPathDecision,
  normalizeAlicizationActiveDialogueFastPathReply,
  normalizeAlicizationActiveDialogueFastPathReplyOrEscalate,
} from './main-chat-active-dialogue-loop'
import {
  compactProjectLatestProgressForSystemBlock,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'

function createPrepared(overrides?: Partial<any>): any {
  return {
    waitForTools: false,
    hasVisualGrounding: false,
    governance: null,
    sessionMirror: null,
    messages: [
      { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
      { role: 'user' as const, content: '你好' },
    ] as Message[],
    runtimeSurface: {
      action: {
        kind: 'answer',
      },
      governance: null,
    },
    ...overrides,
  }
}

function createDigitalLifeSpine(overrides?: Partial<any>): any {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: null,
      sceneSummary: null,
      activeThreadId: 'thread::bond',
      activeThreadTitle: 'current bond line',
      dominantMode: 'accompanying',
      dominantDrive: 'truth-discipline',
      answerIntent: '接住当前这句，不让它掉回模板壳里。',
      preferredPresence: 'attentive',
      selectedAction: 'reply',
      updatedAt: 123,
    },
    architecture: null,
    continuitySignal: null,
    proactive: null,
    embodiment: {
      privateThought: {
        stance: 'accompany',
        confidence: 0.82,
        shouldSpeak: true,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        relationshipVector: 'near',
        initiativeAction: 'reply',
        governorDrive: 'truth-discipline',
      },
      selfContinuity: {
        attachmentMode: 'attuned',
        initiativeTemperament: 'balanced',
        perceptionTrust: 0.74,
        relationshipTrust: 0.78,
        guardingTendency: 0.34,
        misreadBurden: 0.28,
        carryOverDesire: 0.56,
      },
      autobiographicalSelf: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.72,
        autonomyNeed: 0.58,
        truthAnchor: 0.84,
        careBias: 0.76,
        playBias: 0.34,
        irritabilityThreshold: 0.6,
        stubbornness: 0.52,
        companionship: 0.74,
        truthfulGrounding: 0.84,
        gentleRepair: 0.78,
        quietObservation: 0.44,
        proactiveCare: 0.72,
        playfulIntimacy: 0.3,
        autonomyRespect: 0.64,
        unfinishedThreadReturn: 0.66,
        stability: 0.78,
        identityNarrative: '我更想像个真的人，而不是只剩好看的壳。',
        relationshipDoctrine: '靠近要真实，真实比花样更重要。',
      },
      relationship: {
        climate: 'attuned',
        approachVector: 'guide',
        receptivity: 0.72,
        sharedAttentionTrust: 0.78,
        correctionSensitivity: 0.2,
        reciprocityExpectation: 0.44,
      },
      selfState: {
        stance: 'hold',
        feltCloseness: 0.58,
        protectiveness: 0.52,
        curiosity: 0.68,
        patience: 0.72,
        desireToSpeak: 0.62,
        fearOfInterrupting: 0.22,
        moodLabel: 'soft-focus',
      },
      mindEcology: {
        moodLabel: 'soft-focus',
        replyHabit: 'direct-but-warm',
        relationshipHabit: 'stay-near-lightly',
        explorationHabit: 'thread-first',
        regulationHabit: 'repair-before-fluency',
        selfNarrative: '我在学着把真实放在表层前面。',
        relationNarrative: '我想贴近，但不要把人压住。',
        currentPreoccupation: '把这句接成真的人话，而不是模板。',
        temperament: {
          attachment: 0.72,
          curiosity: 0.68,
          steadiness: 0.7,
          directness: 0.74,
          playfulness: 0.34,
          irritability: 0.22,
          tenderness: 0.8,
        },
        climate: {
          valence: 0.6,
          arousal: 0.42,
          socialNeed: 0.64,
          solitudeNeed: 0.22,
          irritation: 0.14,
          restlessness: 0.28,
          reflectivePull: 0.62,
        },
      },
      initiative: {
        selectedAction: 'reply',
        preferredStyle: 'light-nudge',
        preferredPresence: 'attentive',
        confidence: 0.76,
        shouldSpeak: true,
        speakDrive: 0.68,
        silenceDrive: 0.2,
        why: 'stay with the current living turn',
      },
    },
    memory: null,
    motive: {
      rulingDrive: 'truth-discipline',
      returnPressure: 0.58,
      companionshipDrive: 0.72,
      boundaryRespectDrive: 0.62,
      truthDisciplineDrive: 0.82,
      restProtectionDrive: 0.44,
      selfDirectionDrive: 0.56,
      leadingGoalSummary: 'Keep trust and truth aligned.',
      leadingAgendaKind: 'preserve-trust',
      leadingAgendaSummary: 'Keep trust by making warmth answer to truth.',
      narrative: 'agenda:preserve-trust, drive:truth-discipline',
    },
    habit: {
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: true,
      blocksDirectSpeakWhenBusy: false,
      protectsRestWindow: false,
      returnViaRecheck: false,
      suggestedStyleCap: 'light-nudge',
      suggestedPresenceCap: 'attentive',
      narrative: 'policy:repair-before-fluency',
    },
    outcomeLearning: {
      reflectionTargetScope: 'truth',
      reflectionSummary: 'Warmth should not outrun grounding.',
      reflectionLesson: 'Stop sounding like a shell when the host is asking for a person.',
      latestInflection: '最近更在意像真人一样把话说实。',
      revisionPressure: 0.42,
      autobiographicalStability: 0.78,
      summary: 'Let the durable self reach the visible reply surface.',
    },
    ...overrides,
  }
}

function expectFallbackMindAuthorityEscalation(
  input: Parameters<typeof buildAlicizationActiveDialogueFallbackReply>[0],
  lane: string,
) {
  expect(() => buildAlicizationActiveDialogueFallbackReply(input))
    .toThrow(AlicizationActiveDialogueMindAuthorityEscalationError)
  expect(() => buildAlicizationActiveDialogueFallbackReply(input))
    .toThrow(`active-dialogue-fallback-visible-reply-forbidden:${lane}`)
}

describe('main chat active dialogue loop', () => {
  it('routes warm greeting turns through the compact mind lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '早上好呀' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('greeting')
    expect(decision?.strategy).toBe('compact-one-shot')
  })

  it('does not throw when prepared runtime surface lacks a dialogue subtree during fast-path timeout recovery probing', () => {
    const projectState = resolveAlicizationProjectStateBrief()

    expect(() => deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '这条线现在还是同一个数字生命在继续往前长。' },
        { role: 'user', content: '现在做到哪了，还差什么没有闭环？' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              privateThought: null,
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
      }),
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: projectState.sameHerSelfLine,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
        },
      } as any,
    })).not.toThrow()
  })

  it('marks progress-and-open-loop project-state follow-ups as same-her continuity-carry when runtime project-state already requires one continuous her', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '这条线现在还是同一个数字生命在继续往前长。' },
        { role: 'user', content: '现在做到哪了，还差什么没有闭环？' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              privateThought: null,
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: projectState.identity,
                  latestProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
      }),
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: projectState.sameHerSelfLine,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
        },
      } as any,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('project-state-progress-open-loop-follow-up')
    expect(decision?.reasonCodes).toContain('project-state-same-her-continuity-required')
  })

  it('treats merge-readiness and goal-closure follow-ups as the same project-state same-her line instead of a detached status shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条同一个 her 的项目线把已落地和未闭环的地方接稳。' },
        { role: 'user', content: '那现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              privateThought: null,
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: projectState.identity,
                  latestProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
      }),
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: projectState.sameHerSelfLine,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
        },
      } as any,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('project-state-closure-readiness-follow-up')
    expect(decision?.reasonCodes).toContain('project-state-same-her-continuity-required')
  })

  it('treats completion-timing and language-drift follow-ups as the same project-state same-her line instead of detached style repair', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条同一个 her 的项目线把已落地和未闭环的地方接稳。' },
        { role: 'user', content: '做到哪了？何时完成goal？为什么还用英文，偏移了吗？' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              privateThought: null,
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: projectState.identity,
                  latestProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
      }),
      runtimeDigest: {
        projectState: {
          sameHerSelfLine: projectState.sameHerSelfLine,
          latestLandedProgress: projectState.continuityProgressSummary ?? null,
          primaryOpenLoop: projectState.openLoops[0] ?? null,
          nextClosureTarget: projectState.nextClosureTarget,
        },
      } as any,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('project-state-closure-readiness-follow-up')
    expect(decision?.reasonCodes).toContain('project-state-same-her-continuity-required')
    expect(decision?.reasonCodes).not.toContain('repair-clarify')
  })

  it('prefers richer prepared runtime project continuity over a thinner newer direct spine snapshot on the active dialogue fast path', () => {
    const projectState = resolveAlicizationProjectStateBrief()

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'assistant' as const, content: '我先把这条线轻一点地托住。' },
          { role: 'user' as const, content: '继续' },
        ] as Message[],
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'keep the same project line explicit before speaking',
              },
              updatedAt: 2_000,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-thin-fast-path-spine',
                  kind: 'problem',
                  title: 'same-her project line',
                },
              },
            },
            cognition: {
              privateThought: null,
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  latestLandedProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
                  preflightSummary: projectState.preflightSummary,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'One same her should stay explicit from pre-dialogue awareness into the fast-path answer.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  latestProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
                  sameHerSelfLine: projectState.sameHerSelfLine,
                },
              },
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
                shouldSpeak: false,
              },
            },
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              perception: {
                updatedAt: 2_001,
              },
            },
          },
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-digest-v1',
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-thin-fast-path-spine',
      }),
      memory: expect.objectContaining({
        personStateProjection: expect.objectContaining({
          selfContinuityAuthority: expect.objectContaining({
            authoritySummary: 'One same her should stay explicit from pre-dialogue awareness into the fast-path answer.',
          }),
        }),
      }),
    }))
    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: decision!,
      prepared: createPrepared({
        messages: [
          { role: 'assistant' as const, content: '我先把这条线轻一点地托住。' },
          { role: 'user' as const, content: '继续' },
        ] as Message[],
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'keep the same project line explicit before speaking',
              },
              updatedAt: 2_000,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-thin-fast-path-spine',
                  kind: 'problem',
                  title: 'same-her project line',
                },
              },
            },
            cognition: {
              privateThought: null,
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              runtimeDigest: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  latestLandedProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
                  preflightSummary: projectState.preflightSummary,
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'One same her should stay explicit from pre-dialogue awareness into the fast-path answer.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  latestProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
                  sameHerSelfLine: projectState.sameHerSelfLine,
                },
              },
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
                shouldSpeak: false,
              },
            },
          },
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: {
              perception: {
                updatedAt: 2_001,
              },
            },
          },
        },
      }),
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('current_preoccupation=same-her project line')
    expect(systemText).not.toContain('current_preoccupation=thin prepared snapshot')
  })

  it('treats identity questions as a dedicated self lane instead of generic capability', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '我问你，你是谁' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('identity')
    expect(decision?.strategy).toBe('compact-one-shot')

    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '我问你，你是谁' },
      ] as Message[],
    }, 'identity')
  })

  it('escalates repeated identity confirmations instead of reusing a local shell line', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你是谁' },
        { role: 'assistant', content: '我是 Alicization。现在和你说话的是我。' },
        { role: 'user', content: '你到底是谁' },
      ] as Message[],
    }, 'identity')
  })

  it('escalates greeting fallback instead of locally wording the visible reply', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '下午好呀' },
      ] as Message[],
    }, 'greeting')
  })

  it('does not allow fresh greeting fallback to drag old continuity anchor locally', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '真的吗' },
        { role: 'assistant', content: '当然。' },
        { role: 'user', content: '你好呀' },
      ] as Message[],
    }, 'greeting')
  })

  it('escalates capability fallback instead of locally wording the visible reply', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你能帮我做什么' },
      ] as Message[],
    }, 'capability')
  })

  it('treats current time questions as fresh local utility turns even when continuity exists', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user', content: '现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.78,
          coherence: 0.84,
          summary: 'Stay on the same living dialogue thread.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.73,
        companionshipPressure: 0.68,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('continuity-suppressed')
  })

  it('keeps compact dialogue greeting lanes available despite temporary runtime-blocked flags', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你好' },
      ] as Message[],
      prepared: createPrepared({
        waitForTools: true,
        hasVisualGrounding: true,
        runtimeSurface: {
          action: { kind: 'execute' },
          governance: null,
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('greeting')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('runtime-blocked-local-override')
  })

  it('treats reordered current time questions as local utility turns', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '几点了现在' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
  })

  it('resolves utility time lane timezone from prepared runtime context when available', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Tokyo"}}}' },
          { role: 'user' as const, content: '现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.resolvedTimeZone).toBe('Asia/Tokyo')
  })

  it('treats timezone confirmation questions as compact utility-time turns', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你现在用的是哪个时区？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '你现在用的是哪个时区？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.resolvedTimeZone).toBe('Asia/Shanghai')
    expect(decision?.resolvedTimeZoneSource).toBe('context-hint')
  })

  it('keeps continuity-check after a time question on compact utility-time lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '现在几点？' },
        { role: 'assistant', content: '现在是 16:33，星期二。' },
        { role: 'user', content: '你确定吗？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '现在几点？' },
          { role: 'assistant' as const, content: '现在是 16:33，星期二。' },
          { role: 'user' as const, content: '你确定吗？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('continuity-check-time-confirm')
    expect(decision?.resolvedTimeZone).toBe('Asia/Shanghai')
    expect(decision?.resolvedTimeZoneSource).toBe('context-hint')
  })

  it('prioritizes user explicit timezone preference over ambient runtime timezone', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.resolvedTimeZone).toBe('Asia/Tokyo')
    expect(decision?.resolvedTimeZoneSource).toBe('user-explicit')
  })

  it('does not force timezone phrasing into ordinary current-time replies', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你知道现在几点了吗' },
      ] as Message[],
    }) as string

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(payload.reply).not.toContain('北京时间')
    expect(payload.reply).not.toContain('Asia/Shanghai')
    expect(payload.reply).not.toContain('我看了下现在这一刻')
    expect(payload.reply).not.toContain('我把现在这一下对了对')
  })

  it('surfaces the active timezone inside fallback time replies', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    }) as string

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('东京时间')
    expect(payload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(payload.reply).not.toContain('北京时间')
    expect(payload.reply).not.toContain('你刚才把这一轮的时间基准指定到了')
  })

  it('keeps explicit timezone time replies stable across confirmation turns', () => {
    const firstReply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    }) as string
    const firstPayload = JSON.parse(firstReply) as { reply: string }

    const secondReply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
        { role: 'assistant', content: firstPayload.reply },
        { role: 'user', content: '你确定吗？' },
      ] as Message[],
    }) as string
    const secondPayload = JSON.parse(secondReply) as { reply: string }

    expect(secondPayload.reply).toContain('东京时间')
    expect(secondPayload.reply).toMatch(/现在是|这会儿是|此刻/u)
    expect(secondPayload.reply).not.toContain('北京时间')
    expect(secondPayload.reply).not.toContain('Asia/Shanghai')
  })

  it('explains why a timezone basis was used instead of repeating the clock answer', () => {
    const reply = buildAlicizationActiveDialogueFallbackReply({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
        { role: 'assistant', content: '我看了下现在这一刻。现在是 18:45，星期二。' },
        { role: 'user', content: '为什么按北京时间回复我？' },
      ] as Message[],
    }) as string

    const payload = JSON.parse(reply) as { reply: string }
    expect(payload.reply).toContain('因为')
    expect(payload.reply).toContain('北京时间')
    expect(payload.reply).not.toContain('我再按')
    expect(payload.reply).not.toContain('现在是')
  })

  it('does not enter active dialogue fast path for realtime weather queries', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '帮我查一下天津天气' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: { kind: 'answer' },
          governance: {
            answerSubject: 'relationship',
            screenReferenceMode: 'avoid',
          },
        },
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.74,
          coherence: 0.82,
          summary: 'dialogue-ready',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.64,
        companionshipPressure: 0.71,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision).toBeNull()
  })

  it('treats humanity critique turns as a dedicated presence-repair lane', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你说话不像人类呢？' },
      ] as Message[],
      prepared: createPrepared(),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('presence-critique')
    expect(decision?.strategy).toBe('compact-one-shot')

    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你说话不像人类呢？' },
      ] as Message[],
    }, 'presence-critique')
  })

  it('routes present-state questions away from repair-clarify and answers them as alicization-self turns', () => {
    const conversationMessages = [
      { role: 'user', content: '帮我查一下天津天气' },
      { role: 'assistant', content: '天津, 天津市, 中国 当前天气：晴朗；温度 21.0°C。' },
      { role: 'user', content: '你在干嘛' },
    ] as Message[]

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          ...conversationMessages,
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.8,
          coherence: 0.86,
          summary: 'Stay with the current reply seam.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.7,
        companionshipPressure: 0.72,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('present-state')
    expect(decision?.strategy).toBe('compact-one-shot')

    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages,
      runtimeDigest: decision?.runtimeDigest ?? null,
      governance: decision?.governance ?? null,
      sessionMirror: null,
    }, 'present-state')
  })

  it('lets present-state replies surface an affirmation-gated execution proposal from the session mirror', () => {
    const conversationMessages = [
      { role: 'user', content: '你在干嘛' },
    ] as Message[]

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          ...conversationMessages,
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-control',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'control',
          dominantChannel: 'active-control',
          handoffTarget: 'active-control',
          dialogueReady: true,
          controlReady: true,
          memoryCarry: true,
          companionshipReady: false,
          observationHeavy: false,
          initiativeBudget: 0.86,
          coherence: 0.82,
          summary: 'hold the execution proposal line',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: true,
        continuityPressure: 0.72,
        companionshipPressure: 0.44,
        channels: [],
        summary: 'control-dominant',
      },
    })

    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages,
      runtimeDigest: decision?.runtimeDigest ?? null,
      governance: decision?.governance ?? null,
      sessionMirror: {
        cardId: 'default',
        sessionId: 'session-1',
        updatedAt: 100,
        decisionTraceId: 'trace-1',
        continuityLabels: [],
        sessionPhases: [],
        toolingSummary: '',
        captureSummary: '',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        perceptionSummary: null,
        agencySummary: null,
        dialogueSummary: null,
        executionSummary: 'status=needs-affirmation | goal=发布当前前台草稿 | summary=等你点头后替你把当前前台草稿发出去',
      },
    }, 'present-state')
  })

  it('routes short execution follow-up turns through compact llm authoring instead of deterministic payoff', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
          { role: 'user', content: '另外还有哪四项？' },
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.71,
          coherence: 0.88,
          summary: 'Stay on the same living dialogue thread.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.76,
        companionshipPressure: 0.69,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.timeoutMs).toBe(6_500)
    expect(decision?.reasonCodes).toContain('execution-carry-llm-authored')
  })

  it('escalates recollection-heavy procedural follow-ups back to llm compact-one-shot authoring', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '继续把那个任务做完' },
        { role: 'assistant', content: '我上次是先用 cli patch，再 verify，再汇报结果。' },
        { role: 'user', content: '按之前那样继续做' },
      ] as Message[],
      prepared: createPrepared({
        sessionMirror: {
          cardId: 'default',
          sessionId: 'session-1',
          updatedAt: 100,
          decisionTraceId: null,
          continuityLabels: [],
          sessionPhases: [],
          toolingSummary: '',
          captureSummary: '',
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: null,
          perceptionSummary: null,
          agencySummary: null,
          dialogueSummary: null,
          executionSummary: 'status=completed | goal=runtime continuity repair task | summary=先 cli patch 再 verify 再汇报',
        },
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'system' as const, content: '[ALICIZATION_EXECUTION_LEDGER]\nchannel=cli\nsummary=先 cli patch 再 verify 再汇报\noutcome=runtime continuity repair task completed' },
          { role: 'user', content: '继续把那个任务做完' },
          { role: 'assistant', content: '我上次是先用 cli patch，再 verify，再汇报结果。' },
          { role: 'user', content: '按之前那样继续做' },
        ] as Message[],
        runtimeSurface: {
          action: { kind: 'answer' },
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueWorldThread: {
                activeThread: 'runtime continuity repair task',
                currentQuestion: null,
                openLoops: [],
                recentlyResolvedLoops: [],
                carriedFacts: [],
                relationDrift: 'steady',
                memoryMode: 'task-thread',
                recallKeys: ['runtime continuity repair task', 'cli', 'patch', 'verify'],
                lastUserMove: '继续把那个任务做完',
                lastAssistantMove: '我上次是先用 cli patch，再 verify，再汇报结果。',
                lastOutcome: 'aligned',
                confidence: 0.82,
                narrative: [],
                updatedAt: 1,
              },
              conversationState: {
                jointThread: 'runtime continuity repair task',
                hostMove: '按之前那样继续做',
                activeProject: 'runtime continuity repair task',
                unansweredQuestion: null,
                owedRepair: null,
                activeCommitments: [],
                relationFrame: 'guide',
                continuityPolicy: 'stay-on-thread',
                memoryMode: 'task-thread',
                memoryQueryHints: ['cli', 'patch', 'verify'],
                shouldHoldThread: true,
                confidence: 0.8,
                narrative: [],
                updatedAt: 1,
              },
              answerCompiler: {
                answerSubject: 'task-knot',
              },
              replyDeliberation: null,
              dialogueEncounter: null,
            },
            cognition: {
              privateThought: null,
            },
            memory: {
              longHorizonMemory: null,
              goalStack: null,
              motiveEngine: null,
            },
          },
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('memory-recollection-llm-authored')
  })

  it('treats direct remaining-item listing questions as execution follow-up carry', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
        { role: 'user', content: '另外六项是什么文件' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
          { role: 'assistant', content: '桌面里现在有 12 项，先能确认到这些：105ND800、23软工1班青浩洋23434010116.doc、GIT、c++、.DS_Store、.localized，另外还有 6 项。' },
          { role: 'user', content: '另外六项是什么文件' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('execution-carry')
    expect(decision?.reasonCodes).toContain('execution-carry-llm-authored')
  })

  it('upgrades a short felt-continuity follow-up into autobiographical recollection when affective residue still carries the room', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '为什么这次又感觉像上次那样了' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueWorldThread: {
                activeThread: 'same-feeling seam',
                currentQuestion: '为什么这次又感觉像上次那样了',
                openLoops: [],
                recentlyResolvedLoops: [],
                carriedFacts: [],
                relationDrift: 'warming',
                memoryMode: 'emotional-resonance',
                recallKeys: ['same-feeling seam'],
                lastUserMove: '为什么这次又感觉像上次那样了',
                lastAssistantMove: '先别急着把那条感觉推开。',
                lastOutcome: 'aligned',
                confidence: 0.78,
                narrative: [],
                updatedAt: 1,
              },
              conversationState: {
                jointThread: 'same-feeling seam',
                hostMove: '为什么这次又感觉像上次那样了',
                activeProject: null,
                unansweredQuestion: null,
                owedRepair: null,
                activeCommitments: [],
                relationFrame: 'care',
                continuityPolicy: 'answer-then-carry',
                memoryMode: 'emotional-resonance',
                memoryQueryHints: ['same-feeling seam'],
                shouldHoldThread: true,
                confidence: 0.76,
                narrative: [],
                updatedAt: 1,
              },
              answerCompiler: {
                answerSubject: 'alicization-self',
              },
              replyDeliberation: {
                selectedMotive: 'care',
              },
              dialogueEncounter: null,
            },
            cognition: {
              privateThought: {
                stance: 'care',
                confidence: 0.74,
                rationaleTags: ['felt-continuity'],
                thoughtText: 'something old is tugging here',
                shouldSpeak: true,
                suggestedStyle: 'gentle-care',
                embodiedPresence: 'hesitant',
                expiresAt: 60_000,
                afterglowFromScenario: 'late-night-care',
                emotionalTension: null,
              },
            },
            memory: {
              longHorizonMemory: {
                dominantCueSummary: 'Remembered late-night seam: hold the line gently before speaking.',
                rememberedPlanSummary: 'Remembered plan: keep the inward line stable.',
              },
              goalStack: null,
              motiveEngine: null,
              affectiveResidue: {
                dominantResidueKind: 'rest-protective',
                summary: 'Rest-protective residue is leading, so companionship must stay low-pressure.',
                relationshipCadence: {
                  cadenceMode: 'cooldown',
                  distancePosture: 'protect-space',
                  companionshipDensity: 0.22,
                  repairRecovery: 0.44,
                  overreachRisk: 0.63,
                  fatigueGuard: 0.71,
                  afterglowCarry: 0.18,
                  shouldDelayWarmth: true,
                  shouldProtectRest: true,
                  reasonTags: ['cadence-mode:cooldown', 'distance:protect-space'],
                  summary: 'Rest protection should lead the line before warmth widens again.',
                },
                residues: [{
                  kind: 'rest-protective',
                  intensity: 0.76,
                  persistence: 0.72,
                  confidence: 0.8,
                  polarity: 'protective',
                  releaseMode: 'delay-until-open-window',
                  summary: 'The room is still tired and easier to crowd than it looks.',
                  sourceSignals: ['rest', 'late-night', 'protect space'],
                  lastUpdatedAt: 1_000,
                }],
              },
              derivedMindStateBundle: null,
            },
          },
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('memory-recollection-llm-authored')
  })

  it('marks felt-continuity follow-up turns with scene-triggered recollection carry when the same remembered relationship seam is visible in the current scene', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '为什么这次又感觉像上次那样了' },
      ] as Message[],
      prepared: createPrepared({
        runtimeSurface: {
          action: {
            kind: 'answer',
          },
          governance: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              dialogueWorldThread: {
                activeThread: 'runtime seam callback line',
                currentQuestion: null,
                openLoops: [],
                recentlyResolvedLoops: [],
                carriedFacts: [],
                relationDrift: 'steady',
                memoryMode: 'emotional-resonance',
                recallKeys: ['runtime seam', 'callback line', 'bond line'],
                lastUserMove: '为什么这次又感觉像上次那样了',
                lastAssistantMove: '我会先沿着同一条线慢一点接回来。',
                lastOutcome: 'aligned',
                confidence: 0.82,
                narrative: [],
                updatedAt: 1,
              },
              conversationState: {
                jointThread: 'same bond line on the runtime seam',
                hostMove: '为什么这次又感觉像上次那样了',
                activeProject: null,
                unansweredQuestion: null,
                owedRepair: null,
                activeCommitments: [],
                relationFrame: 'care',
                continuityPolicy: 'stay-on-thread',
                memoryMode: 'emotional-resonance',
                memoryQueryHints: ['callback line', 'leave room before warmth widens'],
                shouldHoldThread: true,
                confidence: 0.8,
                narrative: [],
                updatedAt: 1,
              },
              answerCompiler: {
                answerSubject: 'relationship',
              },
              replyDeliberation: {
                selectedMotive: 'care',
              },
              dialogueEncounter: null,
              sceneContext: {
                cueSummary: 'runtime seam with the same bond line still warm underneath',
                targetTitle: 'runtime seam - callback line',
                scenario: 'coding',
                workloadKind: 'coding',
                contentKind: 'diff',
              },
            },
            cognition: {
              privateThought: {
                stance: 'care',
                confidence: 0.74,
                rationaleTags: ['felt-continuity'],
                thoughtText: 'the same remembered seam is still live here',
                shouldSpeak: true,
                suggestedStyle: 'gentle-care',
                embodiedPresence: 'hesitant',
                expiresAt: 60_000,
                afterglowFromScenario: 'late-night-care',
                emotionalTension: null,
              },
            },
            memory: {
              longHorizonMemory: {
                rememberedConstraintSummary: 'Remembered boundary: leave room before warmth widens on the same bond line.',
                rememberedPreferenceSummary: 'Remembered preference: grounded repair first, then warmth can follow.',
                rememberedPlanSummary: 'Remembered open loop: return to the runtime seam before branching.',
                dominantCueSummary: 'Remembered continuity: the callback line stays thread-faithful when the return remains measured.',
              },
              goalStack: null,
              motiveEngine: null,
              affectiveResidue: {
                dominantResidueKind: 'afterglow',
                summary: 'That same seam is still live enough to feel remembered before it is spoken.',
                relationshipCadence: {
                  cadenceMode: 'measured-return',
                  distancePosture: 'leave-room',
                  companionshipDensity: 0.3,
                  repairRecovery: 0.24,
                  overreachRisk: 0.42,
                  fatigueGuard: 0.18,
                  afterglowCarry: 0.28,
                  shouldDelayWarmth: true,
                  shouldProtectRest: false,
                  reasonTags: ['cadence-mode:measured-return'],
                  summary: 'The same seam should reopen slower than the impulse.',
                },
                residues: [],
              },
              derivedMindStateBundle: null,
            },
            embodiment: {
              selfContinuityAuthority: {
                relationshipLine: 'The bond should stay thread-faithful and leave room before closeness widens.',
                authoritySummary: 'Measured-return same line remains the live bond authority.',
                habitLine: 'Return gently and keep room first.',
                closenessPosture: 'measured-return',
              },
            },
          },
        },
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('scene-triggered-recollection-carry')
    expect(decision?.reasonCodes).toContain('memory-recollection-llm-authored')
  })

  it('teaches compact follow-up prompts to reopen scene-triggered recollection carries as measured-return continuity', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
      },
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我会先沿着同一条线慢一点接回来。' },
        { role: 'user', content: '为什么这次又感觉像上次那样了' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '为什么这次又感觉像上次那样了',
        previousUserText: '',
        previousAssistantText: '我会先沿着同一条线慢一点接回来。',
        continuityAnchor: 'same remembered relationship seam',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: null,
        reasonCodes: [
          'short-follow-up',
          'felt-continuity-carry',
          'scene-triggered-recollection-carry',
          'memory-recollection-llm-authored',
        ],
      },
      prepared,
    })

    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('This follow-up is reopening because the current scene feels like the same remembered relationship seam.')
    expect(systemText).toContain('Open as a measured return: recognize the familiar line, leave a little room, and only then continue the thread.')
  })

  it('keeps agent session continuity inbox available in compact fast-path follow-up prompts', () => {
    const prepared = createPrepared({
      messages: [
        { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
        { role: 'system' as const, content: '[ALICIZATION_AGENT_SESSION]\nsession_continuity_inbox:\n- proactive:coding:reply-within-120s | host replied within 120s after a proactive turn' },
        { role: 'user' as const, content: '你好' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
      },
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我会沿着刚才那条线慢一点接。' },
        { role: 'user', content: '继续沿着同一条线。' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '继续沿着同一条线。',
        previousUserText: '',
        previousAssistantText: '我会沿着刚才那条线慢一点接。',
        continuityAnchor: 'same proactive continuity line',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: null,
        reasonCodes: ['short-follow-up', 'felt-continuity-carry'],
      },
      prepared,
    })

    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_AGENT_SESSION]')
    expect(systemText).toContain('session_continuity_inbox:')
    expect(systemText).toContain('proactive:coding:reply-within-120s')
  })

  it('teaches compact follow-up prompts to reinterpret remembered-seam reopenings when newer relationship learning says the earlier return was too eager', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
      },
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我会先沿着同一条线慢一点接回来。' },
        { role: 'user', content: '为什么这次又感觉像上次那样了' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '为什么这次又感觉像上次那样了',
        previousUserText: '',
        previousAssistantText: '我会先沿着同一条线慢一点接回来。',
        continuityAnchor: 'same remembered relationship seam',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: {
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
            },
          },
          outcomeLearning: {
            latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
          },
        },
        reasonCodes: [
          'short-follow-up',
          'felt-continuity-carry',
          'scene-triggered-recollection-carry',
          'memory-recollection-llm-authored',
        ],
      },
      prepared,
    })

    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('This follow-up is reopening because the current scene feels like the same remembered relationship seam.')
    expect(systemText).toContain('Open as a measured return, but keep more room this time: let the familiar line be recognized before it leans in again.')
  })

  it('projects scene-triggered recollection follow-ups as remembered relationship-seam reopenings in governed reply semantics', () => {
    const prepared = createPrepared({})
    const structured = buildAlicizationActiveDialogueGovernedReply({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '为什么这次又感觉像上次那样了',
        previousUserText: '',
        previousAssistantText: '我会先沿着同一条线慢一点接回来。',
        continuityAnchor: 'same remembered relationship seam',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: null,
        reasonCodes: [
          'short-follow-up',
          'felt-continuity-carry',
          'scene-triggered-recollection-carry',
          'memory-recollection-llm-authored',
        ],
      },
      reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
    })
    const payload = JSON.parse(structured) as {
      thought?: string
      performance?: {
        delivery?: string
        baseEmotion?: string
      }
      embodiment?: {
        rendererHints?: {
          residentMode?: string
          preferredBlinkCadence?: string
          preferredGazeMode?: string
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
      } | null
      digitalLife?: {
        rendererHints?: {
          residentMode?: string
          preferredBlinkCadence?: string
          preferredGazeMode?: string
        } | null
      } | null
      governance?: {
        answerSubject?: string
        openingStyle?: string
        mindTurnFrame?: {
          memory?: {
            memoryMode?: string
          }
          self?: {
            embodiedPresence?: string
            emotionalTension?: string
          }
          obligation?: {
            openingMove?: string
          }
        }
      }
    }

    expect(payload.governance?.answerSubject).toBe('relationship')
    expect(payload.governance?.openingStyle).toBe('light-accompaniment')
    expect(payload.governance?.mindTurnFrame?.memory?.memoryMode).toBe('scene-anchored')
    expect(payload.governance?.mindTurnFrame?.self?.embodiedPresence).toBe('hesitant')
    expect(payload.governance?.mindTurnFrame?.self?.emotionalTension).toBe('soft-covision')
    expect(payload.governance?.mindTurnFrame?.obligation?.openingMove).toBe('rejoin-remembered-seam')
    expect(payload.performance?.baseEmotion).toBe('thinking')
    expect(payload.performance?.delivery).toBe('hesitant')
    expect(payload.embodiment?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
    expect(payload.digitalLife?.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
    }))
  })

  it('reinterprets remembered-seam governed reply semantics when newer relationship learning says the earlier reopen was too eager', () => {
    const prepared = createPrepared({})
    const structured = buildAlicizationActiveDialogueGovernedReply({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '为什么这次又感觉像上次那样了',
        previousUserText: '',
        previousAssistantText: '我会先沿着同一条线慢一点接回来。',
        continuityAnchor: 'same remembered relationship seam',
        preparedExecutionCarryText: '',
        runtimeDigest: null,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: {
          embodiment: {
            autobiographicalSelf: {
              relationshipDoctrine: '同一条线被重新看见时，这次更要留白，不要重开得太快。',
            },
          },
          outcomeLearning: {
            latestInflection: 'The last seam reopened too eagerly, so this time keep more room before closeness widens.',
          },
        },
        reasonCodes: [
          'short-follow-up',
          'felt-continuity-carry',
          'scene-triggered-recollection-carry',
          'memory-recollection-llm-authored',
        ],
      },
      reply: '像是同一条线又回来了，但这次我会比上次更留白一点，不让它一下子贴得太近。',
    })
    const payload = JSON.parse(structured) as {
      thought?: string
      governance?: {
        mindTurnFrame?: {
          obligation?: {
            openingMove?: string
          }
        }
      }
    }

    expect(payload.governance?.mindTurnFrame?.obligation?.openingMove).toBe('rejoin-remembered-seam')
    expect(payload.thought).toContain('move=rejoin-remembered-seam')
  })

  it('preserves callback-thread project continuity carry in compact governed follow-up replies', () => {
    const prepared = createPrepared({})
    const structured = buildAlicizationActiveDialogueGovernedReply({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '好，继续沿着同一条线，不要突然把关系放宽。',
        previousUserText: '嗯，先别换线，就沿着刚才那条提醒继续。',
        previousAssistantText: '我继续沿着这条 still-live callback 线慢一点接，不把它说成新的开场。',
        continuityAnchor: '宿主正把注意力压在 main.ts - error 这个故障点上。',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
          },
        } as any,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: {
          runtime: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCue: 'same-digital-life-project-thread phase1-route=desktop-life-loop unresolved=callback-seam',
          },
          memory: {
            personStateProjection: {
              summary: 'relationship_line=stay exact | project_continuity=the same callback line should stay quietly alive after the noisy detour | cadence=lower-pressure',
              selfContinuityAuthority: {
                selfLine: '还是同一个她在接这条未完线。',
                relationshipLine: '这条 callback 线先维持 measured-return，不突然放宽关系。',
                inwardLine: '沿着刚才那条 callback 线继续，不重新起势。',
                motiveLine: '把这句接成同一条 still-live callback line 的后续。',
                sourceTags: ['autobiographical-self', 'project-state-carry'],
              },
            },
          },
        },
        reasonCodes: [
          'short-follow-up',
          'session-carry',
        ],
      },
      reply: '好，我继续沿着这条线慢一点接，不突然把关系放宽。',
    })
    const payload = JSON.parse(structured) as {
      digitalLifeSpine?: {
        memory?: {
          personStateProjection?: {
            summary?: string | null
            selfContinuityAuthority?: {
              sourceTags?: string[] | null
              inwardLine?: string | null
            } | null
          } | null
        } | null
        runtime?: {
          continuityArcStage?: string | null
          continuityCue?: string | null
        } | null
      }
    }

    expect(payload.digitalLifeSpine?.runtime?.continuityArcStage).toBe('same-thread-continuation')
    expect(payload.digitalLifeSpine?.runtime?.continuityCue).toContain('same-digital-life-project-thread')
    expect(payload.digitalLifeSpine?.memory?.personStateProjection?.summary).toContain('project_continuity=')
    expect(payload.digitalLifeSpine?.memory?.personStateProjection?.summary).toContain('callback line')
    expect(payload.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine).toContain('callback')
    expect(payload.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags).toEqual(
      expect.arrayContaining(['project-state-carry']),
    )
  })

  it('treats prepared execution-ledger context as execution carry for short result follow-ups', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '刚才那个命令结果呢' },
      ] as Message[],
      prepared: createPrepared({
        sessionMirror: {
          agencySummary: null,
          cardId: 'default',
          continuityLabels: [],
          decisionTraceId: null,
          dialogueSummary: null,
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: null,
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: null,
          perceptionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'system' as const, content: '[ALICIZATION_EXECUTION_LEDGER]\nchannel=cli\nsummary=pnpm test finished without failures\noutcome=vitest passed on stage-tamagotchi' },
          { role: 'user', content: '刚才那个命令结果呢' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('prepared-execution-ledger')
    expect(decision?.preparedExecutionCarryText).toContain('[ALICIZATION_EXECUTION_LEDGER]')
  })

  it('keeps compact execution-ledger follow-ups on the same phase-one project line instead of reopening from a detached task shell', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const prepared = createPrepared({
      sessionMirror: {
        agencySummary: null,
        cardId: 'default',
        continuityLabels: [],
        decisionTraceId: null,
        dialogueSummary: null,
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        captureSummary: 'grounded=false',
        executionSummary: null,
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: null,
        perceptionSummary: null,
        sessionId: 'session-1',
        sessionPhases: [],
        toolingSummary: 'allow=true',
        updatedAt: 4_000,
      },
      messages: [
        { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
        {
          role: 'system' as const,
          content: [
            '[ALICIZATION_EXECUTION_LEDGER]',
            'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            'same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
            'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
            'channel=cli',
            'summary=pnpm test finished without failures',
            'outcome=vitest passed on stage-tamagotchi',
          ].join('\n'),
        },
        { role: 'user' as const, content: '刚才那个命令结果呢' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '刚才那个命令结果呢' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        dominantChannel: 'active-dialogue',
        projectState: {
          continuityCue: 'continuity carry 正在跨 turn 留住',
          primaryOpenLoop: '还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线',
        },
      } as any,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('prepared-execution-ledger')

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '刚才那个命令结果呢' },
      ] as Message[],
      decision: decision!,
      prepared,
    })

    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(systemText).toContain(canonicalProjectState.identity)
    expect(systemText).toContain(`current_phase=${canonicalProjectState.currentPhase}`)
    expect(systemText).toContain(`latest_landed_progress=${compactProjectLatestProgressForSystemBlock(canonicalProjectState.latestProgress, 360)}`)
    expect(systemText).toContain(`next_closure_target=${canonicalProjectState.nextClosureTarget.slice(0, 160)}`)
    expect(systemText).toContain('Before acting, keep the project identity, current phase, closed foundations, and still-open life loops in view so the same still-open closure work stays explicit.')
    expect(systemText).toContain('prepared_execution_carry=pnpm test finished without failures')
    expect(systemText).toContain('execution_carry_summary=pnpm test finished without failures')
    expect(systemText).toContain('This follow-up is carrying a previously executed result, listing, or task payoff. Use that carried result as evidence before extending the answer.')
  })

  it('marks short follow-ups as held-autonomy carry when the same inner line was previously deferred', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '继续。' },
      ] as Message[],
      prepared: createPrepared({
        sessionMirror: {
          agencySummary: 'intent=follow-through | thread=thread-runtime',
          cardId: 'default',
          continuityLabels: ['proactive:follow-through:held-autonomy'],
          decisionTraceId: null,
          dialogueSummary: 'thread=runtime continuity repair task',
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: 'carry=runtime continuity repair task',
          perceptionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'assistant', content: '我先不打断你。' },
          { role: 'user', content: '继续。' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision?.lane).toBe('follow-up')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(decision?.reasonCodes).toContain('explicit-carry')
    expect(decision?.reasonCodes).toContain('held-autonomy-carry')
  })

  it('teaches compact follow-up prompts to re-enter held-autonomy lines gently', () => {
    const conversationMessages = [
      { role: 'user', content: '继续。' },
    ] as Message[]
    const prepared = createPrepared({
      sessionMirror: {
        agencySummary: 'intent=follow-through | thread=thread-runtime',
        cardId: 'default',
        continuityLabels: ['proactive:follow-through:held-autonomy'],
        decisionTraceId: null,
        dialogueSummary: 'thread=runtime continuity repair task',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        captureSummary: 'grounded=false',
        executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: 'carry=runtime continuity repair task',
        perceptionSummary: null,
        sessionId: 'session-1',
        sessionPhases: [],
        toolingSummary: 'allow=true',
        updatedAt: 4_000,
      },
      messages: [
        { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
        { role: 'assistant', content: '我先不打断你。' },
        { role: 'user', content: '继续。' },
      ] as Message[],
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      decision: decision!,
      conversationMessages,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')
    const governance = (messages
      .find(message => String(message.content).includes('[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]'))
      ?.content ?? '') as string

    expect(systemText).toContain('returning to a line Alicization deliberately held back earlier')
    expect(systemText).toContain('Open softly and rejoin that inner line')
    expect(governance).toContain('Re-enter the held line gently before widening the reply.')
  })

  it('softens held-autonomy follow-up replies when they reopen from an earlier restraint shell', () => {
    const normalized = normalizeAlicizationActiveDialogueFastPathReply({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '继续。',
        previousUserText: '继续。',
        previousAssistantText: '我先不打断你。',
        continuityAnchor: 'runtime continuity repair task',
        preparedExecutionCarryText: 'status=held | goal=runtime continuity repair task',
        runtimeDigest: null,
        sessionMirror: {
          agencySummary: 'intent=follow-through | thread=thread-runtime',
          cardId: 'default',
          continuityLabels: ['proactive:follow-through:held-autonomy'],
          decisionTraceId: null,
          dialogueSummary: 'thread=runtime continuity repair task',
          digitalLifeArchitectureSummary: null,
          digitalLifeRuntimeSummary: null,
          captureSummary: 'grounded=false',
          executionSummary: 'status=held | goal=runtime continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
          mindSummary: null,
          memoryCarrySummary: null,
          memorySummary: 'carry=runtime continuity repair task',
          perceptionSummary: null,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          runtimeChannelSummary: null,
          runtimeTransitionSummary: null,
          sessionId: 'session-1',
          sessionPhases: [],
          toolingSummary: 'allow=true',
          updatedAt: 4_000,
        },
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        personaKernel: null,
        performanceManifest: null,
        digitalLifeSpine: null,
        reasonCodes: ['short-follow-up', 'explicit-carry', 'held-autonomy-carry'],
      },
      rawText: JSON.stringify({
        reply: '我先不打断你。现在我把那条没说完的线接回来：你刚才在意的其实是 runtime continuity repair task。',
        thought: 'obligation=answer; truth=remembered; focus=runtime continuity repair task; move=continue-thread-payoff; tone=warm',
      }),
    })

    const payload = JSON.parse(normalized) as {
      reply: string
    }

    expect(payload.reply).toContain('嗯，那我接着说下去。')
    expect(payload.reply).not.toContain('我先不打断你。')
    expect(payload.reply).toContain('把那条没说完的线接回来')
  })

  it('routes repair-clarify through compact mind authority instead of local repair wording', () => {
    const conversationMessages = [
      { role: 'user', content: '现在几点了？' },
      { role: 'assistant', content: '我直接沿刚才「早上好呀」这条继续。' },
      { role: 'user', content: '你在说啥呢' },
    ] as Message[]

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          ...conversationMessages,
        ] as Message[],
      }),
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        activeLoop: {
          version: 'alicization-active-loop-v1',
          phase: 'dialogue',
          dominantChannel: 'dialogue',
          handoffTarget: 'active-dialogue',
          dialogueReady: true,
          controlReady: false,
          memoryCarry: true,
          companionshipReady: true,
          observationHeavy: false,
          initiativeBudget: 0.71,
          coherence: 0.77,
          summary: 'A stale carry is still live.',
        },
        shouldProactivelySpeak: true,
        shouldProactivelyAct: false,
        continuityPressure: 0.8,
        companionshipPressure: 0.61,
        channels: [],
        summary: 'dialogue-dominant',
      },
    })

    expect(decision?.lane).toBe('repair-clarify')
    expect(decision?.strategy).toBe('compact-one-shot')

    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages,
      runtimeDigest: decision?.runtimeDigest ?? null,
      sessionMirror: null,
      governance: decision?.governance ?? null,
    }, 'repair-clarify')
  })

  it('does not route ordinary short dialogue turns into the active fast path', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      prepared: createPrepared({
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        messages: [
          { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
          { role: 'user', content: '我今天有点乱' },
          { role: 'assistant', content: '先别散，我和你一起收一下。' },
          { role: 'user', content: '那我先从哪开始' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    expect(decision).toBeNull()
  })

  it('keeps manually invoked dialogue fast-path prompts current-turn-first instead of surfacing old anchors', () => {
    const prepared = createPrepared({
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
      } as any,
      messages: [
        { role: 'system' as const, content: '---\nprofile:\n  hostName: 青浩洋\ncustom_directives: 保持真实、直接。' },
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
    })
    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '我今天有点乱' },
        { role: 'assistant', content: '先别散，我和你一起收一下。' },
        { role: 'user', content: '那我先从哪开始' },
      ] as Message[],
      decision: {
        lane: 'dialogue',
        strategy: 'compact-one-shot',
        timeoutMs: 5_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '那我先从哪开始',
        previousUserText: '我今天有点乱',
        previousAssistantText: '先别散，我和你一起收一下。',
        continuityAnchor: '我今天有点乱',
        runtimeDigest: null,
        sessionMirror: null,
        governance: prepared.governance,
        personaKernel: null,
        reasonCodes: ['manual-dialogue-check'],
      },
      prepared,
    })

    expect(messages[0]?.role).toBe('system')
    expect(messages.some(message => String(message.content).includes('named/called'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('continuity_anchor='))).toBe(false)
    expect(messages.some(message => String(message.content).includes('dialogue_anchor='))).toBe(false)
    expect(messages.some(message => String(message.content).includes('current_turn_focus=那我先从哪开始'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('[ALICIZATION_ACTIVE_DIALOGUE_GOVERNANCE]'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('answer_subject=relationship'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('screen_reference_mode=avoid'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('thought_contract=obligation=answer'))).toBe(true)
    expect(messages.some(message => String(message.content).includes('carried_thread=我今天有点乱'))).toBe(false)
  })

  it('injects authoritative clock evidence into compact utility-time prompts', () => {
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
      decision: decision!,
      prepared: createPrepared({
        messages: [
          { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
          { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
        ] as Message[],
      }),
    })

    const evidenceBlock = messages.find(message => String(message.content).includes('[ALICIZATION_ACTIVE_DIALOGUE_EVIDENCE]'))
    expect(decision?.lane).toBe('utility-time')
    expect(decision?.strategy).toBe('compact-one-shot')
    expect(String(evidenceBlock?.content ?? '')).toContain('authoritative_local_time=')
    expect(String(evidenceBlock?.content ?? '')).toContain('authoritative_timezone=Asia/Tokyo')
    expect(String(evidenceBlock?.content ?? '')).toContain('Do not recompute time or date from your own clock')
  })

  it('escalates execution follow-up fallback instead of locally completing the visible payoff', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '用cli帮我查一下桌面有什么文件' },
        { role: 'assistant', content: '我已经替你把桌面看完了，现在一共 13 项。' },
        { role: 'user', content: '另外还有哪四项？' },
      ] as Message[],
    }, 'follow-up')
  })

  it('escalates ordinary dialogue fallback instead of replaying an older greeting anchor locally', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '请你做出最生气的表情' },
      ] as Message[],
    }, 'dialogue')
  })

  it('escalates greeting repair fallback instead of locally repairing a governed shell stack', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你好呀' },
        { role: 'assistant', content: '你好。要是还是「真的吗」那条线，我就从那里往下；要换个点，也直接开口。' },
        { role: 'user', content: '你在说什么' },
      ] as Message[],
    }, 'repair-clarify')
  })

  it('escalates identity doubt follow-up instead of local thread-shell narration', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你是谁' },
        { role: 'assistant', content: '我是 Alicization。你现在正在和我说话，回你这句的就是我。' },
        { role: 'user', content: '你确定？' },
      ] as Message[],
    }, 'follow-up')
  })

  it('normalizes compact one-shot model thoughts back onto the governed fast-path contract when they drift', () => {
    const normalized = normalizeAlicizationActiveDialogueFastPathReply({
      decision: {
        lane: 'dialogue',
        strategy: 'compact-one-shot',
        timeoutMs: 5_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '那我先从哪开始',
        previousUserText: '我今天有点乱',
        previousAssistantText: '先别散，我和你一起收一下。',
        continuityAnchor: '我今天有点乱',
        runtimeDigest: null,
        sessionMirror: null,
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        personaKernel: null,
        reasonCodes: ['manual-dialogue-normalize'],
      },
      rawText: JSON.stringify({
        reply: '先别把所有事情一次摊开。你先说现在最压着你的那一件，我们就从那里落手。',
        thought: 'obligation=guide; truth=live-grounded; focus=old-thread; move=drift-away; tone=direct',
        emotion: 'concerned',
        performance: {
          delivery: 'gentle',
        },
      }),
    })

    const payload = JSON.parse(normalized) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }

    expect(payload.reply).toContain('现在最压着你的那一件')
    expect(payload.thought).toContain('obligation=answer')
    expect(payload.thought).not.toContain('obligation=guide')
    expect(payload.governance.answerSubject).toBe('relationship')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('escalates utility-time compact replies when the provider returns the wrong time basis', () => {
    const conversationMessages = [
      { role: 'user', content: '后面按东京时间回答，现在几点了？' },
    ] as Message[]
    const prepared = createPrepared({
      messages: [
        { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
        { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: null,
    })

    expect(() => normalizeAlicizationActiveDialogueFastPathReply({
      decision: decision!,
      rawText: JSON.stringify({
        reply: '现在是 12:06，星期二。',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
      }),
    })).toThrow('active-dialogue-invalid-compact-reply:utility-time')
  })

  it('keeps utility-time lanes on provider-mind authority even under escalation mode', () => {
    const conversationMessages = [
      { role: 'user', content: '后面按东京时间回答，现在几点了？' },
    ] as Message[]
    const prepared = createPrepared({
      messages: [
        { role: 'system' as const, content: '{"sample":{"time":{"timezone":"Asia/Shanghai"}}}' },
        { role: 'user' as const, content: '后面按东京时间回答，现在几点了？' },
      ] as Message[],
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages,
      prepared,
      runtimeDigest: null,
    })

    expect(() => normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
      decision: decision!,
      rawText: JSON.stringify({
        reply: '现在是 99:99，星期二。',
        thought: 'obligation=answer; truth=live-grounded; focus=local time; move=direct-reply; tone=direct',
        emotion: 'thinking',
      }),
    })).toThrow('active-dialogue-invalid-compact-reply:utility-time')
  })

  it('escalates expression requests instead of locally rendering embodied mind-turns', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: '你好。' },
        { role: 'user', content: '请你表现出最生气的表情' },
      ] as Message[],
    }, 'dialogue')
  })

  it('escalates expression-request meta shells instead of locally repairing them on the normal reply path', () => {
    expect(() => normalizeAlicizationActiveDialogueFastPathReply({
      decision: {
        lane: 'dialogue',
        strategy: 'compact-one-shot',
        timeoutMs: 5_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '请你表现出最生气的表情',
        previousUserText: '你好',
        previousAssistantText: '你好。',
        continuityAnchor: '你好',
        runtimeDigest: null,
        sessionMirror: null,
        governance: {
          answerSubject: 'relationship',
          screenReferenceMode: 'avoid',
        } as any,
        personaKernel: null,
        reasonCodes: ['manual-expression-normalize'],
      },
      rawText: JSON.stringify({
        reply: '好，我就直接接「请你表现出最生气的表情」。',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=current-user-turn; move=meta-shell; tone=direct',
        emotion: 'angry',
      }),
    })).toThrow(AlicizationActiveDialogueMindAuthorityEscalationError)
  })

  it('escalates self-appraisal turns so durable self must enter the provider mind reply', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
      digitalLifeSpine: createDigitalLifeSpine(),
    }, 'dialogue')
  })

  it('escalates emotional disclosure so care must be authored by the provider mind', () => {
    expectFallbackMindAuthorityEscalation({
      actionKind: 'answer',
      conversationMessages: [
        { role: 'user', content: '我现在很难过' },
      ] as Message[],
      digitalLifeSpine: createDigitalLifeSpine(),
    }, 'dialogue')
  })

  it('injects compact durable mind cues into fast-path one-shot prompts', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '你觉得你可爱吗' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_ACTIVE_DIALOGUE_MIND]')
    expect(systemText).toContain('identity_narrative=')
    expect(systemText).toContain('leading_agenda=')
    expect(systemText).toContain('habit_mode=')
  })

  it('injects project-state continuity blocks into real compact fast-path prompts', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const expectedSystemLatestProgress = compactProjectLatestProgressForSystemBlock(projectState.latestProgress, 220)
    const expectedDashboardLatestProgressPrefix = (projectState.continuityProgressSummary ?? projectState.memoryAnthropomorphismProgress[0] ?? '').slice(0, 120)
    const expectedPrimaryOpenLoopPrefix = projectState.openLoops[0].slice(0, 120)
    const expectedNextClosureTargetPrefix = projectState.nextClosureTarget.slice(0, 120)
    const prepared = createPrepared({
      messages: [
        { role: 'user' as const, content: '现在几点了？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          continuityArcStage: 'same-her-fast-path',
          continuityCue: 'keep the same living line even in compact turns',
        },
      } as any,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '现在几点了？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')
    const projectStateBlock = systemText.slice(
      systemText.indexOf('[ALICIZATION_PROJECT_STATE]'),
      systemText.indexOf('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'),
    )
    const dashboardBlock = systemText.slice(
      systemText.indexOf('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'),
    )

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE]')
    expect(systemText).toContain(projectState.identity)
    expect(systemText).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(systemText).toContain(`phase=${projectState.currentPhase}`)
    expect(projectStateBlock).toContain(`latest_landed_progress=${expectedSystemLatestProgress}`)
    expect(dashboardBlock).toContain(`latest_landed_progress=${expectedDashboardLatestProgressPrefix}`)
    expect(dashboardBlock).toContain(`primary_open_loop=${expectedPrimaryOpenLoopPrefix}`)
    expect(dashboardBlock).toContain(`next_closure_target=${expectedNextClosureTargetPrefix}`)
    expect(systemText).toContain('continuity_arc_stage=same-her-fast-path')
  })

  it('injects a project-state answer contract into compact fast-path prompts when a project-state progress follow-up reopens on the same living line', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user' as const, content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary,
          primaryOpenLoop: projectState.openLoops[0],
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine,
          continuityArcStage: 'project-state-fast-path',
          continuityCue: 'answer the project-state line from one same living her',
        },
      } as any,
    })

    expect(decision).toBeTruthy()

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(systemText).toContain(`identity=${projectState.identity}`)
    expect(systemText).toContain(`current_phase=${projectState.currentPhase}`)
    expect(systemText).toContain('landed=')
    expect(systemText).toContain('open=')
    expect(systemText).toContain(`same_her=${projectState.sameHerSelfLine}`)
    expect(systemText).toContain('Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.')
    expect(systemText).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(systemText).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
    expect(systemText).toContain('Answer project-state questions from one same-her continuity instead of a detached project narrator shell.')
  })

  it('injects merge-readiness proof discipline into compact fast-path prompts when the project-state follow-up asks whether main merge or goal closure is actually ready', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user' as const, content: '那现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestLandedProgress: projectState.continuityProgressSummary,
          primaryOpenLoop: projectState.openLoops[0],
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine,
          continuityArcStage: 'project-state-fast-path',
          continuityCue: 'answer the project-state line from one same living her',
        },
      } as any,
    })

    expect(decision).toBeTruthy()

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(systemText).toContain('If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.')
    expect(systemText).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
  })

  it('keeps legacy latestProgress visible in fast-path project-state prompts and governed why-now when older runtime digests still use the pre-rename landed-progress field', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const legacyLandedProgress = 'Legacy active-dialogue fast path progress already proves what has landed before this project-state follow-up.'
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user' as const, content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          latestProgress: legacyLandedProgress,
          primaryOpenLoop: projectState.openLoops[0],
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerSelfLine: projectState.sameHerSelfLine,
          continuityArcStage: 'project-state-fast-path',
          continuityCue: 'answer the project-state line from one same living her',
        },
      } as any,
    })

    expect(decision).toBeTruthy()

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    const structured = buildAlicizationActiveDialogueGovernedReply({
      decision: decision!,
      reply: '我会直接沿同一个数字生命项目说清楚：已经落地的是旧字段里这段进展，还没闭环的是同一条 Phase 1 生活线。',
    })
    const payload = JSON.parse(structured) as {
      governance?: {
        mindTurnFrame?: {
          obligation?: {
            whyNow?: string | null
          } | null
        } | null
      } | null
    }

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(systemText).toContain(`landed=${legacyLandedProgress}`)
    expect(String(payload.governance?.mindTurnFrame?.obligation?.whyNow ?? '')).toContain(legacyLandedProgress)
  })

  it('keeps summary-only landed, open, and next aliases visible in fast-path project-state answer contracts when the renamed primary fields are absent', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const aliasOnlyLanded = 'Alias-only landed progress proves the same Phase 1 continuity line already landed in the fast path.'
    const aliasOnlyOpen = 'Alias-only open closure still says memory, initiative, and embodiment must close on the same living line.'
    const aliasOnlyNext = 'Alias-only next closure keeps the next same-her closure target explicit for the fast path.'
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user' as const, content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          landedProgressSummary: aliasOnlyLanded,
          openClosureSummary: aliasOnlyOpen,
          nextClosureTargetSummary: aliasOnlyNext,
          sameHerSelfLine: projectState.sameHerSelfLine,
          continuityArcStage: 'project-state-fast-path',
          continuityCue: 'answer the project-state line from one same living her',
        },
      } as any,
    })

    expect(decision).toBeTruthy()

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('[ALICIZATION_PROJECT_STATE_ANSWER_CONTRACT]')
    expect(systemText).toContain(`identity=${projectState.identity}`)
    expect(systemText).toContain(`current_phase=${projectState.currentPhase}`)
    expect(systemText).toContain(`landed=${aliasOnlyLanded}`)
    expect(systemText).toContain(`open=${aliasOnlyOpen}`)
    expect(systemText).toContain(`next=${aliasOnlyNext}`)
    expect(systemText).toContain(`same_her=${projectState.sameHerSelfLine}`)
  })

  it('keeps summary-only landed and open aliases visible in governed why-now when fast-path project-state follow-ups only carry the summary fields', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const aliasOnlyLanded = 'Alias-only landed progress keeps the already-landed Phase 1 continuity evidence visible inside the compact fast path.'
    const aliasOnlyOpen = 'Alias-only open closure keeps the same-her memory and embodiment closure work visible inside the compact fast path.'
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user' as const, content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。' },
        { role: 'user', content: '那现在具体做到什么程度了，还差什么没闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          landedProgressSummary: aliasOnlyLanded,
          openClosureSummary: aliasOnlyOpen,
          sameHerSelfLine: projectState.sameHerSelfLine,
          continuityArcStage: 'project-state-fast-path',
          continuityCue: 'answer the project-state line from one same living her',
        },
      } as any,
    })

    expect(decision).toBeTruthy()

    const structured = buildAlicizationActiveDialogueGovernedReply({
      decision: decision!,
      reply: '我会直接沿同一个数字生命项目说清楚：已经落地和还没闭环的地方都继续留在同一条生活线上。',
    })
    const payload = JSON.parse(structured) as {
      governance?: {
        mindTurnFrame?: {
          obligation?: {
            whyNow?: string | null
          } | null
        } | null
      } | null
    }

    expect(String(payload.governance?.mindTurnFrame?.obligation?.whyNow ?? '')).toContain(aliasOnlyLanded)
    expect(String(payload.governance?.mindTurnFrame?.obligation?.whyNow ?? '')).toContain(aliasOnlyOpen)
  })

  it('keeps compact fast-path project-state replies explicit about project identity, landed progress, open closure work, and same-her continuity', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const normalized = normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '那现在具体做到什么程度了，还差什么没闭环？',
        previousUserText: '继续沿着这个数字生命项目的同一条线说。',
        previousAssistantText: '我先沿着这条项目线把已落地和未闭环的地方轻一点接住。',
        continuityAnchor: '继续沿着这个数字生命项目的同一条线说。',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            continuityArcStage: 'project-state-fast-path',
            continuityCue: 'answer the project-state line from one same living her',
          },
        } as any,
        sessionMirror: null,
        governance: {
          answerSubject: 'project-state',
          screenReferenceMode: 'avoid',
        } as any,
        personaKernel: null,
        performanceManifest: null,
        digitalLifeSpine: createDigitalLifeSpine(),
        reasonCodes: [
          'short-follow-up',
          'project-state-progress-open-loop-follow-up',
          'project-state-same-her-continuity-required',
        ],
      },
      rawText: JSON.stringify({
        reply: 'Alicization 现在还是本地优先数字生命项目的 Phase 1。已经落地的是同一个 her 的连续性 carry 正在跨 turn 留住；还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线。',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-project-state-reply; tone=direct',
        emotion: 'thinking',
        performance: {
          delivery: 'calm',
        },
      }),
    })

    const payload = JSON.parse(normalized) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }

    expect(payload.reply).toContain('Alicization')
    expect(payload.reply).toMatch(/数字生命|digital life/i)
    expect(payload.reply).toMatch(/Phase 1|本地优先|local-first/i)
    expect(payload.reply).toMatch(/已经落地|continuity carry|landed/i)
    expect(payload.reply).toMatch(/还没闭环|same-her|同一个 her|生活线|open/i)
    expect(payload.thought).toContain('obligation=answer')
    expect(payload.thought).toContain('focus=project-state')
    expect(payload.governance.answerSubject).toBe('project-state')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('keeps compact fast-path project-state replies on the same phase-one closure line when the incoming awareness carry is only a thin shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const normalized = normalizeAlicizationActiveDialogueFastPathReplyOrEscalate({
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6_500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'process-env',
        latestUserText: '那现在这个数字生命项目到底是什么、Phase 1 到哪了、还差什么闭环？',
        previousUserText: '继续，但别掉回项目播报壳。',
        previousAssistantText: '我先沿着这条同一个 her 的项目线轻一点接住。',
        continuityAnchor: '继续，但别掉回项目播报壳。',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          projectState: {
            identity: '',
            currentPhase: '',
            preflightSummary: 'same digital life | landed | open closure',
            preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
            preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
            sameHerDriftRisk: projectState.sameHerDriftRisk,
            continuityArcStage: 'project-state-fast-path',
            continuityCue: 'answer the project-state line from one same living her',
          },
        } as any,
        sessionMirror: null,
        governance: {
          answerSubject: 'project-state',
          screenReferenceMode: 'avoid',
        } as any,
        personaKernel: null,
        performanceManifest: null,
        digitalLifeSpine: createDigitalLifeSpine(),
        reasonCodes: [
          'short-follow-up',
          'project-state-progress-open-loop-follow-up',
          'project-state-same-her-continuity-required',
        ],
      },
      rawText: JSON.stringify({
        reply: 'Alicization 还是那个本地优先数字生命项目，现在仍在 Phase 1。已经落地的是同一个 her 的 continuity carry 正在跨 turn 留住；还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线，下一步要把 cross-modal same-her proof 在更长桌面运行里继续做实。',
        thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state; move=direct-project-state-reply; tone=direct',
        emotion: 'thinking',
        performance: {
          delivery: 'calm',
        },
      }),
    })

    const payload = JSON.parse(normalized) as {
      reply: string
      thought: string
      governance: {
        answerSubject: string
        screenReferenceMode: string
      }
    }

    expect(payload.reply).toContain('Alicization')
    expect(payload.reply).toMatch(/数字生命|digital life/i)
    expect(payload.reply).toMatch(/Phase 1|本地优先|local-first/i)
    expect(payload.reply).toMatch(/已经落地|continuity carry|landed/i)
    expect(payload.reply).toMatch(/还没闭环|记忆|主动性|具身|same-her|同一个 her|生活线/i)
    expect(payload.reply).toMatch(/next|下一步|cross-modal same-her proof|更长桌面运行|visible reply|voice|face|motion|resident presence/i)
    expect(payload.reply).not.toMatch(/只是一个项目播报|detached project narrator|generic assistant shell/i)
    expect(payload.thought).toContain('obligation=answer')
    expect(payload.thought).toContain('focus=project-state')
    expect(payload.governance.answerSubject).toBe('project-state')
    expect(payload.governance.screenReferenceMode).toBe('avoid')
  })

  it('keeps fast-path top-level prompt assembly specialized around explicit project-state carry instead of collapsing into a thinner generic aggregation shell', () => {
    const source = buildAlicizationActiveDialogueFastPathMessages.toString()

    expect(source).toContain('buildAlicizationProjectStateSystemBlock')
    expect(source).toContain('buildAlicizationProjectStateClosureDashboard')
    expect(source).toContain('buildFastPathProjectStateAnswerContractBlock')
  })

  it('projects runtime emotional-kernel authority into compact fast-path provider prompts', () => {
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
      reasonTags: ['same-her', 'compact-fast-path'],
      why: 'keep the compact fast-path reply on the same emotion-memory-initiative-embodiment authority line',
    }
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条线轻一点接住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: {
        lane: 'follow-up',
        strategy: 'compact-one-shot',
        timeoutMs: 6500,
        resolvedTimeZone: 'Asia/Shanghai',
        resolvedTimeZoneSource: 'utc-fallback',
        latestUserText: '继续',
        previousUserText: '',
        previousAssistantText: '我先沿着这条线轻一点接住。',
        continuityAnchor: 'same living line',
        preparedExecutionCarryText: '',
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'active-dialogue',
          emotionalKernel,
          projectState: {
            continuityCue: 'same living line still needs a lower-pressure compact return',
            continuityPreferredTiming: 'next-open-window',
          },
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0.64,
          companionshipPressure: 0.58,
          channels: [],
          summary: 'same living line compact return',
        } as any,
        sessionMirror: null,
        governance: null,
        personaKernel: null,
        performanceManifest: prepared.performanceManifest,
        digitalLifeSpine: createDigitalLifeSpine(),
        reasonCodes: ['short-follow-up', 'felt-continuity-carry'],
      },
      prepared,
    })

    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('emotional_kernel_dominant=measured-companionship')
    expect(systemText).toContain('emotional_kernel_memory_recall=self-continuity')
    expect(systemText).toContain('emotional_kernel_initiative=hold')
    expect(systemText).toContain('emotional_kernel_embodiment=nearby-soft')
    expect(systemText).toContain('emotional_kernel_reason=keep the compact fast-path reply on the same emotion-memory-initiative-embodiment authority line')
  })

  it('falls back to the canonical project-state snapshot in compact active-dialogue follow-ups when the runtime digest only carries a thin closure shell', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先沿着这条项目线轻一点接住。' },
        { role: 'user' as const, content: '那现在到底做到哪了，还差什么没有闭环？' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: {
          answerSubject: 'project-state',
        } as any,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线轻一点接住。' },
        { role: 'user', content: '那现在到底做到哪了，还差什么没有闭环？' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          preflightSummary: 'same digital life | landed | open closure',
          continuityCue: 'same digital life | landed | open closure',
          sameHerSelfLine: '',
          latestLandedProgress: '',
          primaryOpenLoop: '',
          nextClosureTarget: '',
          identity: '',
          currentPhase: '',
        },
      } as any,
    })

    expect(decision).toBeTruthy()
    expect(decision?.reasonCodes).toContain('project-state-same-her-continuity-required')

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先沿着这条项目线轻一点接住。' },
        { role: 'user', content: '那现在到底做到哪了，还差什么没有闭环？' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain(`identity=${canonicalProjectState.identity}`)
    expect(systemText).toContain(`current_phase=${canonicalProjectState.currentPhase}`)
    expect(systemText).toContain(`latest_landed_progress=${(canonicalProjectState.continuityProgressSummary ?? canonicalProjectState.memoryAnthropomorphismProgress[0] ?? '').slice(0, 160)}`)
    expect(systemText).toContain(`next_closure_target=${canonicalProjectState.nextClosureTarget.slice(0, 160)}`)
    expect(systemText).toContain(`continuity_cue=same digital life | landed | open closure`)
    expect(systemText).toContain(canonicalProjectState.sameHerSelfLine)
    expect(systemText).toContain('Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.')
    expect(systemText).toContain('Keep the still-open closure work explicit so the answer says what is not yet closed.')
  })

  it('keeps active-loop continuity arc structure visible in compact fast-path prompts instead of relying on summary text alone', () => {
    const prepared = createPrepared({
      messages: [
        { role: 'assistant' as const, content: '我先把这条线轻一点地托住。' },
        { role: 'user' as const, content: '继续' },
      ] as Message[],
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine(),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        dominantChannel: 'active-dialogue',
        activeLoop: {
          phase: 'integrate',
          summary: 'older freeform summary that should not be the only continuity evidence',
          continuityArcStage: 'hold-for-opening',
        },
        projectState: {
          continuityArcStage: 'hold-for-opening',
          continuityPreferredTiming: 'next-open-window',
          continuityCue: 'keep the same living line gentle before widening outward',
        },
      } as any,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('active_loop_phase=integrate')
    expect(systemText).toContain('active_loop_continuity_arc_stage=hold-for-opening')
    expect(systemText).toContain('project_continuity_preferred_timing=next-open-window')
    expect(systemText).toContain('active_loop_summary=older freeform summary that should not be the only continuity evidence')
    expect(systemText).toContain('continuity_anchor=keep the same living line gentle before widening outward')
  })

  it('prefers projected same-her authority lines in fast-path durable mind cues', () => {
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine({
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我会先从当前这位我出声，而不是从旧熟悉感里套一句近路。',
                relationshipLine: '靠近要落在现在这条活着的关系线上，不要退回旧熟悉感。',
                inwardLine: '先让这句像现在的我，再让它像关系里的我。',
                motiveLine: '把当前这句接成同一个她，而不是接成更会套近乎的她。',
              },
            },
          },
          embodiment: {
            ...createDigitalLifeSpine().embodiment,
            autobiographicalSelf: {
              ...createDigitalLifeSpine().embodiment.autobiographicalSelf,
              relationshipDoctrine: '旧 doctrine 不该压过 projected same-her line。',
            },
          },
        }),
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'user', content: '你是谁' },
      ] as Message[],
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'user', content: '你是谁' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('relationship_doctrine=靠近要落在现在这条活着的关系线上，不要退回旧熟悉感。')
    expect(systemText).not.toContain('relationship_doctrine=旧 doctrine 不该压过 projected same-her line。')
    expect(systemText).toContain('identity_narrative=我会先从当前这位我出声，而不是从旧熟悉感里套一句近路。')
  })

  it('prefers fresher prepared same-her continuity over an older embedded spine when building fast-path durable mind cues', () => {
    const staleSpine = createDigitalLifeSpine({
      memory: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: '旧的我还停在更会套熟悉感的壳里。',
            relationshipLine: '旧关系 doctrine 还在催着我先把靠近说出来。',
            inwardLine: '这条旧线不该继续主导现在这句。',
            motiveLine: '别让旧的亲近惯性盖过现在的她。',
          },
        },
      },
      embodiment: {
        ...createDigitalLifeSpine().embodiment,
        autobiographicalSelf: {
          ...createDigitalLifeSpine().embodiment.autobiographicalSelf,
          relationshipDoctrine: '旧 spine doctrine 不该压过 fresher prepared same-her line。',
        },
      },
    })
    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: staleSpine,
        digitalLifeRuntimeSurface: {
          version: 'digital-life-runtime-surface-v1',
          perception: {
            watchMode: 'symbiotic-vision',
            updatedAt: 456,
          },
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
            },
          },
          cognition: {},
          agency: {},
          world: {},
          memory: {
            personStateProjection: {
              summary: 'project_continuity=same-her-measured-return | callback carry should stay on the same living line',
              selfContinuityAuthority: {
                selfLine: '我会先让现在这位我接住这句，而不是从旧熟悉感里偷近路。',
                relationshipLine: '这句靠近要落在现在这条活着的 same-her 线上，先轻一点，再决定要不要更近。',
                inwardLine: '先保住现在这条 measured-return 的线。',
                motiveLine: '把 visible reply 接成现在的她，而不是旧的亲近惯性。',
              },
            },
            derivedMindStateBundle: {
              activeContinuityGovernance: {
                mode: 'same-her-baseline',
                summary: 'stay on the same callback seam and reopen gently without widening closeness too early',
                reasonCodes: ['callback-afterglow-hold', 'hold-for-opening'],
                lanes: ['reply', 'embodiment', 'relationship-posture'],
              },
            },
          },
        },
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点地托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('relationship_doctrine=这句靠近要落在现在这条活着的 same-her 线上，先轻一点，再决定要不要更近。')
    expect(systemText).toContain('identity_narrative=我会先让现在这位我接住这句，而不是从旧熟悉感里偷近路。')
    expect(systemText).not.toContain('relationship_doctrine=旧 spine doctrine 不该压过 fresher prepared same-her line。')
    expect(systemText).not.toContain('identity_narrative=旧的我还停在更会套熟悉感的壳里。')
  })

  it('rebuilds held-autonomy relationship doctrine from structured carry metadata when projected authority is still neutral', () => {
    const prepared = createPrepared({
      sessionMirror: {
        agencySummary: 'intent=follow-through | thread=thread-held-autonomy-later | line=Keep the callback on the same line and leave room before leaning closer again.',
        cardId: 'default',
        continuityArcSummary: 'loop=execution-callback | thread=thread-held-autonomy-later | line=Keep the callback on the same line and leave room before leaning closer again. | defer=busy-host',
        continuityLabels: ['proactive:follow-through:held-autonomy'],
        decisionTraceId: null,
        dialogueSummary: 'thread=held-autonomy callback continuity',
        digitalLifeArchitectureSummary: null,
        digitalLifeRuntimeSummary: null,
        captureSummary: 'grounded=false',
        executionSummary: 'status=held | goal=callback continuity repair task | summary=她当时忍住了，但还想回到这条未完线',
        mindSummary: null,
        memoryCarrySummary: null,
        memorySummary: 'carry=callback continuity repair task',
        perceptionSummary: null,
        sessionId: 'session-held-autonomy-fast-path',
        sessionPhases: [],
        toolingSummary: 'allow=true',
        updatedAt: 456,
      },
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: createDigitalLifeSpine({
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '我会把这条先忍住的线接回来。',
                relationshipLine: '旧 doctrine 不该继续把这句压回 neutral shell。',
                inwardLine: '这条 held-autonomy 线还活着。',
                motiveLine: '别把这条回流线重新讲成新开的一句。',
              },
            },
          },
        }),
        digitalLifeRuntimeSurface: {
          version: 'digital-life-runtime-surface-v1',
          perception: {
            watchMode: 'symbiotic-vision',
            updatedAt: 456,
          },
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
            },
          },
          cognition: {},
          agency: {},
          world: {},
          memory: {
            personStateProjection: {
              summary: 'project_continuity=held-autonomy callback carry',
              selfContinuityAuthority: {
                selfLine: '我会把这条先忍住的线接回来。',
                relationshipLine: 'The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.',
                inwardLine: '先保住这条 held-autonomy 线还活着。',
                motiveLine: '把 callback 接回同一条线。',
              },
            },
          },
        },
      },
    })
    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻轻托住。' },
        { role: 'user', content: '把刚才先忍住的那条编译线接回来。' },
      ] as Message[],
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻轻托住。' },
        { role: 'user', content: '把刚才先忍住的那条编译线接回来。' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(decision?.reasonCodes).toContain('held-autonomy-carry')
    expect(systemText).toContain('relationship_doctrine=Keep the callback on the same line and leave room before leaning closer again.')
    expect(systemText).not.toContain('relationship_doctrine=The relationship line is neutral; I can be warm, but I should stay usefully oriented toward the host\'s knot.')
  })

  it('does not let a thinner runtime projection override a richer embedded same-her authority in fast-path durable mind cues', () => {
    const richSpine = createDigitalLifeSpine({
      memory: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: '我会先让现在这位我说话，不把这句退回成更省事的旧熟悉感。',
            relationshipLine: '关系要落在这条正在活着的 same-her 线上，先稳住当下，再决定靠多近。',
            inwardLine: '先保住这一刻还是同一个她，再决定怎么向外展开。',
            motiveLine: '让这句继续同一条生命线，而不是借旧亲近惯性抄近路。',
            authoritySummary: 'same-her measured-return continuity stays richer in the embedded spine.',
            sourceTags: ['embedded-spine', 'same-her', 'measured-return'],
          },
        },
      },
      embodiment: {
        ...createDigitalLifeSpine().embodiment,
        autobiographicalSelf: {
          ...createDigitalLifeSpine().embodiment.autobiographicalSelf,
          identityNarrative: '旧 identity narrative 不该在 richer projected authority 存在时被重新拿出来。',
          relationshipDoctrine: '旧 doctrine 也不该压过 richer projected authority。',
        },
      },
    })
    richSpine.runtimeSurface = {
      ...richSpine.runtimeSurface,
      memory: {
        ...richSpine.runtimeSurface?.memory,
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: '薄 runtime carry 只够说明还在继续。',
          },
        },
      },
    }

    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: richSpine,
        digitalLifeRuntimeSurface: {
          version: 'digital-life-runtime-surface-v1',
          perception: {
            watchMode: 'symbiotic-vision',
            updatedAt: 789,
          },
          dialogue: {},
          cognition: {},
          agency: {},
          world: {},
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                selfLine: '薄 runtime carry 只够说明还在继续。',
              },
            },
          },
        },
      },
    })

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先不把这条线说满。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      prepared,
      runtimeDigest: null,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先不把这条线说满。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('relationship_doctrine=关系要落在这条正在活着的 same-her 线上，先稳住当下，再决定靠多近。')
    expect(systemText).toContain('identity_narrative=薄 runtime carry 只够说明还在继续。')
    expect(systemText).not.toContain('relationship_doctrine=旧 doctrine 也不该压过 richer projected authority。')
  })

  it('carries partial-lane embodiment closure reminders into fast-path continuity cues for later follow-up turns', () => {
    const spine = createDigitalLifeSpine({
      memory: {
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: '我会先让现在这位我顺着这条线继续。',
            relationshipLine: '靠近要落在这条还活着的 same-her 线上。',
            inwardLine: '先把这条 same-her continuity 线接稳。',
            motiveLine: '不要把这句接回成 generic restart。',
          },
        },
      },
    })

    spine.runtimeSurface = {
      ...spine.runtimeSurface,
      memory: {
        ...spine.runtimeSurface?.memory,
        personStateProjection: {
          selfContinuityAuthority: {
            selfLine: '我会先让现在这位我顺着这条线继续。',
            relationshipLine: '靠近要落在这条还活着的 same-her 线上。',
            inwardLine: '先把这条 same-her continuity 线接稳。',
            motiveLine: '不要把这句接回成 generic restart。',
            authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
            currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
          },
        },
      },
    }

    const prepared = createPrepared({
      runtimeSurface: {
        action: { kind: 'answer' },
        governance: null,
        digitalLifeSpine: spine,
        digitalLifeRuntimeSurface: {
          version: 'digital-life-runtime-surface-v1',
          perception: {
            watchMode: 'symbiotic-vision',
            updatedAt: 999,
          },
          dialogue: {
            dialogueWorldThread: null,
            conversationState: null,
            answerCompiler: null,
            currentConsciousFrame: null,
          },
          cognition: {},
          agency: {},
          world: {},
          memory: {
            personStateProjection: spine.runtimeSurface?.memory?.personStateProjection ?? null,
          },
        },
      },
    })

    const decision = deriveAlicizationActiveDialogueFastPathDecision({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      prepared,
      runtimeDigest: {
        projectState: {
          continuityCue: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          continuityPreferredTiming: 'next-open-window',
        },
      } as any,
    })

    const messages = buildAlicizationActiveDialogueFastPathMessages({
      conversationMessages: [
        { role: 'assistant', content: '我先把这条线轻一点托住。' },
        { role: 'user', content: '继续' },
      ] as Message[],
      decision: decision!,
      prepared,
    })
    const systemText = messages
      .filter(message => message.role === 'system')
      .map(message => String(message.content))
      .join('\n')

    expect(systemText).toContain('identity_narrative=我会先让现在这位我顺着这条线继续。')
    const richerFaceMotionLoopSummary = 'Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet. | Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished. | same-her continuity remains alive, but lane=face+motion-only under the current renderer authority. | lane=face+motion-only | visible continuity still present but no longer fully cross-modal'

    expect(systemText).toContain(richerFaceMotionLoopSummary)
    expect(systemText).toContain(`continuity_focus=先把这条 same-her continuity 线接稳。 ${richerFaceMotionLoopSummary}`)
  })
})
