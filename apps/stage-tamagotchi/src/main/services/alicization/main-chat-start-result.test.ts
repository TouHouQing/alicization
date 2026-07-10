import type { AlicizationEmbodimentScriptV1 } from '../../../shared/eventa'

import {
  containsAlicizationFixedTemplateResidue,
  createIdleStageEmbodimentMotorState,
} from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

function expectNoFixedTemplateResidue(value: unknown) {
  expect(containsAlicizationFixedTemplateResidue(JSON.stringify(value ?? ''))).toBe(false)
}

function createInput(overrides?: Partial<Parameters<typeof resolveAlicizationMainChatStartResult>[0]>) {
  return {
    cardId: 'default',
    turnId: 'turn-1',
    preludePromise: Promise.resolve({
      perceptionAugmentation: {
        digitalLifeRuntimeSurface: null,
        chatGovernance: {
          mindTurnGovernance: {
            decisionTraceId: 'prelude-trace',
          },
        },
      },
    } as any),
    preparationPromise: Promise.resolve({
      governance: {
        decisionTraceId: 'prepared-trace',
      },
      runtimeSurface: {
        digitalLifeSpine: {
          version: 'digital-life-spine-v1',
          runtimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'inspect the current line',
              },
              updatedAt: 1_000,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-1',
                  kind: 'problem',
                  title: 'current line',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'silent-observe',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.7,
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'guide',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'silent-observe',
              },
            },
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
            metadata: {
              source: 'digital-life-runtime',
              watchMode: 'symbiotic-vision',
              sceneScenario: 'coding',
              activeThreadId: 'thread-1',
              dominantMode: 'tracking',
              dominantDrive: 'understand',
              answerIntent: 'guide',
              preferredPresence: 'attentive',
            },
          },
          proactiveSelection: {
            activeThread: {
              id: 'thread-1',
              kind: 'problem',
              title: 'current line',
            },
            leadingGoal: null,
            dominantConcern: null,
          },
        },
      },
    } as any),
    eagerPreparationBudgetMs: 1,
    buildEmbodimentMeta: vi.fn(() => ({
      embodiment: null,
      embodimentScript: null,
      speechTimeline: null,
      digitalLife: null,
    })),
    ...overrides,
  }
}

describe('main chat start result', () => {
  it('prefers prepared governance when preparation wins the race', async () => {
    const input = createInput()

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result).toEqual(expect.objectContaining({
      accepted: true,
      turnId: 'turn-1',
      state: 'accepted',
      governance: {
        decisionTraceId: 'prepared-trace',
      },
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
      digitalLifeSpine: expect.objectContaining({
        version: 'digital-life-spine-digest-v1',
        runtime: expect.objectContaining({
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
        }),
        architecture: expect.objectContaining({
          operatingMode: 'speaking',
          dominantSystem: 'dialogue',
        }),
        continuitySignal: expect.objectContaining({
          summary: expect.stringContaining('scene=coding'),
        }),
        proactive: expect.objectContaining({
          selectedAction: 'wait',
          preferredPresence: 'attentive',
        }),
        embodiment: expect.objectContaining({
          privateThought: expect.objectContaining({
            embodiedPresence: 'attentive',
          }),
          mindEcology: expect.objectContaining({
            moodLabel: expect.any(String),
          }),
          initiative: expect.objectContaining({
            selectedAction: 'wait',
            preferredStyle: 'silent-observe',
          }),
        }),
        memory: expect.objectContaining({
          recentEpisodeCount: 0,
        }),
      }),
    }))
    expect(input.buildEmbodimentMeta).toHaveBeenCalledWith({
      governance: {
        decisionTraceId: 'prepared-trace',
      },
      digitalLifeSpine: expect.objectContaining({
        runtime: expect.objectContaining({
          activeThreadId: 'thread-1',
        }),
      }),
      turnId: 'turn-1',
    })
  })

  it('falls back to prelude governance when preparation fails after prelude settles', async () => {
    const input = createInput({
      preparationPromise: Promise.reject(new Error('prepare failed')),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toEqual({
      decisionTraceId: 'prelude-trace',
    })
  })

  it('carries prelude project-state awareness into accepted start results before the first outward reply opens', async () => {
    const input = createInput({
      preludePromise: Promise.resolve({
        perceptionAugmentation: {
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'remember what this same digital life project still is before speaking',
              },
              updatedAt: 1_500,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-project-awareness-start',
                  kind: 'problem',
                  title: 'same digital life line',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'steady',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.76,
              },
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.68,
                companionshipPressure: 0.42,
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Accepted-start continuity already keeps the same digital life line visible before reply delivery begins.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                  nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one same living line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                  preflightSummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                  awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'same-her-project-awareness-start',
                  reasonTags: ['project-state', 'phase1'],
                  projectState: {
                    preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                    awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  },
                },
                summary: 'same-her project awareness is already alive before the first outward reply opens',
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'keep project continuity explicit before speaking',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
              },
            },
            raw: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.68,
                companionshipPressure: 0.42,
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Accepted-start continuity already keeps the same digital life line visible before reply delivery begins.',
                  primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                  nextClosureTarget: 'Keep project identity, landed progress, and still-open closure on one same living line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  companionBriefingLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                  preflightSummary: 'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                  awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'same-her-project-awareness-start',
                  reasonTags: ['project-state', 'phase1'],
                  projectState: {
                    preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is Memory, initiative, and embodiment still need one tighter same-her closure seam.',
                    awarenessLine: 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.',
                    sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  },
                },
                summary: 'same-her project awareness is already alive before the first outward reply opens',
              },
            },
          },
          chatGovernance: {
            mindTurnGovernance: {
              decisionTraceId: 'prelude-project-awareness-trace',
            },
          },
        },
      } as any),
      preparationPromise: Promise.reject(new Error('prepare failed')),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect((result as any).projectState).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local_desktop_life_loop'),
      currentPhase: expect.stringContaining('local_desktop_life_loop'),
      primaryOpenLoop: expect.stringContaining('continuity_closure'),
      nextClosureTarget: expect.stringContaining('continuity_line'),
    }))
    expect((result as any).preDialogueAwareness).toEqual(expect.objectContaining({
      status: 'grounded',
      summaryLine: expect.stringContaining('local_desktop_life_loop'),
      companionNextClosureLine: expect.stringContaining('continuity_line'),
      awarenessLine: expect.stringContaining('visibility=internal-structured'),
    }))
    expect((result as any).runtimeDigest).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        sameHerSelfLine: expect.stringContaining('local_desktop_life_loop'),
        preDialogueAwarenessLine: expect.stringContaining('local_desktop_life_loop'),
      }),
    }))
    expectNoFixedTemplateResidue((result as any).projectState)
    expectNoFixedTemplateResidue((result as any).preDialogueAwareness)
    expectNoFixedTemplateResidue((result as any).runtimeDigest?.projectState)
  })

  it('keeps embodimentScript authority in accepted start results when top-level digitalLife is still absent', async () => {
    const embodimentScript: AlicizationEmbodimentScriptV1 = {
      version: 'embodiment-script-v1' as const,
      turnId: 'turn-1',
      rendererTarget: 'live2d' as const,
      replyText: '先把这条身体线稳住。',
      state: {
        baseEmotion: 'thinking' as const,
        delivery: 'gentle' as const,
        emphasis: 0 as const,
        residentMode: 'measured-return' as const,
      },
      speechPlan: {
        segments: [{
          id: 'segment-start-result-script-authority',
          index: 0,
          text: '先把这条身体线稳住。',
          interruptPolicy: 'soft-settle' as const,
          preRollMs: 24,
          settleMs: 260,
        }],
        interruptPolicy: 'soft-settle' as const,
        preRollMs: 24,
        settleMs: 260,
      },
      facePlan: {
        preUtteranceCue: null,
        postUtteranceCue: null,
        speakingCues: [],
      },
      motionPlan: {
        idleBase: 'observe_soft',
        actionBursts: [],
        attentionMode: 'attentive' as const,
      },
      lipsyncPlan: {
        mode: 'energy-phoneme-hybrid' as const,
        visemeHints: [],
      },
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'start-result-script-digital-life-authority',
        emotion: 'thinking',
        mode: 'recovering',
        postureHint: 'inspection',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'idle_settle',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -4,
          rateMultiplier: 0.92,
        },
        rendererHints: {
          residentMode: 'measured-return',
          signature: 'embodiment:start-result-script-digital-life-authority',
        },
        voice: {
          pitchDelta: -4,
          rateMultiplier: 0.92,
          energy: 0.26,
          cadence: 0.22,
        },
        lipSync: {
          mode: 'closed',
          visemeBias: 0.2,
          energyBias: 0.16,
          mouthScale: 0.74,
          continuityHoldMs: 420,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.24,
          holdMs: 360,
        },
        action: {
          actionCue: 'idle_settle',
          actionMode: 'hold',
          intensity: 0.1,
          holdMs: 320,
        },
        motor: createIdleStageEmbodimentMotorState(),
        frames: [],
      },
    }
    const input = createInput({
      buildEmbodimentMeta: vi.fn(() => ({
        embodiment: null,
        embodimentScript,
        speechTimeline: null,
        digitalLife: null,
      }) as ReturnType<NonNullable<Parameters<typeof resolveAlicizationMainChatStartResult>[0]['buildEmbodimentMeta']>>),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.embodimentScript).toEqual(embodimentScript)
    expect(result.digitalLife).toBeNull()
  })

  it('keeps prelude-derived digital life spine when preparation fails after richer prelude runtime state already settled', async () => {
    const input = createInput({
      preludePromise: Promise.resolve({
        perceptionAugmentation: {
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'keep the same digital life project line explicit before speaking',
              },
              updatedAt: 1_500,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-prelude-project-line',
                  kind: 'problem',
                  title: 'same project line',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'steady',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.74,
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'keep project continuity explicit',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
              },
            },
          },
          chatGovernance: {
            mindTurnGovernance: {
              decisionTraceId: 'prelude-rich-spine-trace',
            },
          },
        },
      } as any),
      preparationPromise: Promise.reject(new Error('prepare failed')),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toEqual({
      decisionTraceId: 'prelude-rich-spine-trace',
    })
    expect(result.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-digest-v1',
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-prelude-project-line',
      }),
      proactive: expect.objectContaining({
        selectedAction: 'wait',
        preferredPresence: 'attentive',
      }),
    }))
    expect(input.buildEmbodimentMeta).toHaveBeenCalledWith({
      governance: {
        decisionTraceId: 'prelude-rich-spine-trace',
      },
      digitalLifeSpine: expect.objectContaining({
        runtime: expect.objectContaining({
          activeThreadId: 'thread-prelude-project-line',
        }),
      }),
      turnId: 'turn-1',
    })
  })

  it('preserves richer prelude same-her project continuity when prepared runtime digest is thinner at accepted-start', async () => {
    const richerPreludeHoldDetail = 'same-her hold: keep this reopen on the same living line before widening outward again.'
    const input = createInput({
      preludePromise: Promise.resolve({
        perceptionAugmentation: {
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'carry the same-her reopen line into the next accepted start',
              },
              updatedAt: 1_800,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-richer-prelude-reopen',
                  kind: 'problem',
                  title: 'same-her reopen carry',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'steady',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.8,
              },
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.74,
                companionshipPressure: 0.44,
                projectState: {
                  identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
                  currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
                  latestLandedProgress: 'Accepted-start reopen continuity already keeps the same living line visible before the next outward turn.',
                  primaryOpenLoop: 'Reopen carry still needs stronger same-her closure across memory initiative and embodiment.',
                  nextClosureTarget: 'Keep the next accepted-start reopen on one same living line.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerHoldDetail: richerPreludeHoldDetail,
                  continuityArcStage: 'same-thread-continuation',
                  continuityCue: 'the reopen is still continuing on one same-her line',
                  preferredVoiceMode: 'lower-pressure',
                  preferredPacingMode: 'slower',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is still one local-first digital life and this reopen should not start from scratch.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'same-her-reopen-start',
                  reasonTags: ['project-state', 'same-thread'],
                  continuityArcStage: 'same-thread-continuation',
                },
                summary: 'richer prelude same-her reopen continuity is already alive before the outward turn resumes',
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'continue the same-her reopen gently',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
              },
            },
            raw: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.74,
                companionshipPressure: 0.44,
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  sameHerHoldDetail: richerPreludeHoldDetail,
                  continuityArcStage: 'same-thread-continuation',
                  continuityCue: 'the reopen is still continuing on one same-her line',
                  preferredVoiceMode: 'lower-pressure',
                  preferredPacingMode: 'slower',
                  preDialogueAwarenessLine: 'Before answering, remember: Alicization is still one local-first digital life and this reopen should not start from scratch.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'same-her-reopen-start',
                  reasonTags: ['project-state', 'same-thread'],
                  continuityArcStage: 'same-thread-continuation',
                },
                summary: 'richer prelude same-her reopen continuity is already alive before the outward turn resumes',
              },
            },
          },
          chatGovernance: {
            mindTurnGovernance: {
              decisionTraceId: 'prelude-richer-reopen-trace',
            },
          },
        },
      } as any),
      preparationPromise: Promise.resolve({
        governance: {
          decisionTraceId: 'prepared-thin-reopen-trace',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            perception: {
              watchMode: 'symbiotic-vision',
              currentScene: {
                scenario: 'coding',
                summary: 'prepared path won but only has a thinner reopen shell',
              },
              updatedAt: 1_900,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-richer-prelude-reopen',
                  kind: 'problem',
                  title: 'same-her reopen carry',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'steady',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.7,
              },
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.48,
                companionshipPressure: 0.28,
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life.',
                  continuityArcStage: null,
                  continuityCue: 'thin prepared reopen shell',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'prepared-thin-reopen-start',
                  reasonTags: ['project-state'],
                  continuityArcStage: null,
                },
                summary: 'prepared reopen shell is thinner than the already-settled prelude continuity',
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'continue the same-her reopen gently',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
              },
            },
            raw: {
              runtimeDigest: {
                version: 'alicization-runtime-digest-v1',
                dominantChannel: 'dialogue',
                shouldProactivelySpeak: false,
                shouldProactivelyAct: false,
                continuityPressure: 0.48,
                companionshipPressure: 0.28,
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life.',
                  continuityArcStage: null,
                  continuityCue: 'thin prepared reopen shell',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                },
                currentConsciousFrame: {
                  focusAnchor: 'prepared-thin-reopen-start',
                  reasonTags: ['project-state'],
                  continuityArcStage: null,
                },
                summary: 'prepared reopen shell is thinner than the already-settled prelude continuity',
              },
            },
          },
        },
      } as any),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toEqual({
      decisionTraceId: 'prepared-thin-reopen-trace',
    })
    expect((result as any).projectState).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preDialogueAwarenessLine: expect.stringContaining('visibility=internal-structured'),
    }))
    expect((result as any).runtimeDigest).toEqual(expect.objectContaining({
      projectState: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      }),
      currentConsciousFrame: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
      }),
    }))
    expectNoFixedTemplateResidue((result as any).projectState)
    expectNoFixedTemplateResidue((result as any).runtimeDigest?.projectState)
  })

  it('returns null governance when neither preparation nor prelude settle within budget', async () => {
    const pendingPrelude = deferred<any>()
    const pendingPreparation = deferred<any>()
    const input = createInput({
      preludePromise: pendingPrelude.promise,
      preparationPromise: pendingPreparation.promise,
      eagerPreparationBudgetMs: 1,
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toBeNull()
    expect(input.buildEmbodimentMeta).toHaveBeenCalledWith({
      governance: null,
      digitalLifeSpine: null,
      turnId: 'turn-1',
    })
  })

  it('keeps accepted-start digital life spine available when prepared spine is thinner than the runtime surface snapshot', async () => {
    const input = createInput({
      preparationPromise: Promise.resolve({
        governance: {
          decisionTraceId: 'prepared-thin-spine-trace',
        },
        runtimeSurface: {
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
                  id: 'thread-thin-spine',
                  kind: 'problem',
                  title: 'same-her project line',
                },
              },
            },
            cognition: {
              mindKernel: {
                dominantMode: 'tracking',
                dominantDrive: 'understand',
              },
              privateThought: {
                suggestedStyle: 'steady',
                embodiedPresence: 'attentive',
                shouldSpeak: false,
                confidence: 0.72,
              },
            },
            dialogue: {
              answerPlanner: {
                answerIntent: 'keep project continuity explicit',
              },
            },
            memory: {
              workingMemoryEpisodes: [],
              goalStack: null,
              concerns: [],
              concernContinuity: null,
              selfContinuity: null,
              threadRuntime: null,
              commitmentLedger: null,
              inquiryPlanner: null,
              repairLedger: null,
              intentionStream: null,
              reflectionLedger: null,
              executiveCycle: null,
              thoughtThreads: null,
              desireMemory: null,
              recallGovernor: null,
            },
            agency: {
              initiative: {
                selectedAction: 'wait',
                preferredStyle: 'steady',
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
      } as any),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toEqual({
      decisionTraceId: 'prepared-thin-spine-trace',
    })
    expect(result.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-digest-v1',
      runtime: expect.objectContaining({
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-thin-spine',
      }),
      proactive: expect.objectContaining({
        selectedAction: 'wait',
        preferredPresence: 'attentive',
      }),
    }))
    expect(input.buildEmbodimentMeta).toHaveBeenCalledWith({
      governance: {
        decisionTraceId: 'prepared-thin-spine-trace',
      },
      digitalLifeSpine: expect.objectContaining({
        runtime: expect.objectContaining({
          activeThreadId: 'thread-thin-spine',
        }),
      }),
      turnId: 'turn-1',
    })
  })
})
