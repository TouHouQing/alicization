import type { AlicizationEmbodimentScriptV1 } from '../../../shared/eventa'

import { createIdleStageEmbodimentMotorState } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationMainChatStartResult } from './main-chat-start-result'

const unknownContinuityMarker = 'unknown-continuity-marker'
const unknownGovernanceMarker = 'unknown-governance-marker'

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
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
          watchMode: 'symbiotic-vision',
          sceneScenario: 'coding',
          activeThreadId: 'thread-1',
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

  it('sanitizes accepted-start governance and spine before embodiment projection', async () => {
    const input = createInput({
      preparationPromise: Promise.resolve({
        governance: {
          decisionTraceId: 'prepared-sanitized-trace',
          governingFocus: unknownGovernanceMarker,
          openingStyle: 'light-accompaniment',
          relationshipPosture: 'tender',
          reasons: [],
        },
        runtimeSurface: {
          digitalLifeSpine: {
            version: 'digital-life-spine-v1',
            runtimeSurface: null,
            architecture: {
              operatingMode: 'speaking',
              dominantSystem: 'dialogue',
              supportingSystems: [],
              governingFocus: unknownGovernanceMarker,
              summary: unknownGovernanceMarker,
            },
            continuitySignal: {
              label: 'digital-life-line',
              summary: unknownContinuityMarker,
              signature: 'unknown-continuity-signature',
              createdAt: 1,
            },
          },
          digitalLifeRuntimeSurface: null,
        },
      } as any),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    const embodimentInput = vi.mocked(input.buildEmbodimentMeta).mock.calls[0]?.[0]
    expect(embodimentInput).toMatchObject({
      governance: {
        decisionTraceId: 'prepared-sanitized-trace',
        reasons: [],
      },
      digitalLifeSpine: null,
      turnId: 'turn-1',
    })
    expect(embodimentInput?.digitalLifeSpine).toBeNull()
    expect(result.governance).toEqual({
      decisionTraceId: 'prepared-sanitized-trace',
      reasons: [],
    })
    const spineText = JSON.stringify(result.digitalLifeSpine)
    expect(spineText).not.toContain(unknownGovernanceMarker)
    expect(spineText).not.toContain(unknownContinuityMarker)
  })

  it('sanitizes prepared runtime metadata without promoting unknown sidecars', async () => {
    const preludeRuntimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.7,
      companionshipPressure: 0.4,
      unknownSidecar: {
        marker: 'prelude-sidecar',
      },
      summary: 'prelude runtime digest',
    } as const
    const preparedRuntimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.2,
      companionshipPressure: 0.3,
      unknownSidecar: {
        marker: 'prepared-sidecar',
      },
      summary: 'prepared runtime digest',
    } as const
    const input = createInput({
      preludePromise: Promise.resolve({
        perceptionAugmentation: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: preludeRuntimeDigest,
            },
          },
          chatGovernance: {
            mindTurnGovernance: {
              decisionTraceId: 'prelude-runtime-trace',
            },
          },
        },
      } as any),
      preparationPromise: Promise.resolve({
        governance: {
          decisionTraceId: 'prepared-runtime-trace',
        },
        runtimeSurface: {
          digitalLifeSpine: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: preparedRuntimeDigest,
            },
          },
        },
      } as any),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.runtimeDigest).toMatchObject({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      continuityPressure: 0.2,
      summary: 'prepared runtime digest',
    })
    expect(result.runtimeDigest).not.toHaveProperty('unknownSidecar')
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

    expect(result.embodimentScript).toMatchObject({
      ...embodimentScript,
      facePlan: {
        speakingCues: embodimentScript.facePlan.speakingCues,
      },
    })
    expect(result.embodimentScript?.facePlan).not.toHaveProperty('preUtteranceCue')
    expect(result.embodimentScript?.facePlan).not.toHaveProperty('postUtteranceCue')
    expect(result.digitalLife).toEqual(result.embodimentScript?.digitalLife)
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
                summary: 'keep the same digital life project line explicit before outward reply',
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

  it('sanitizes unknown sidecars from the settled prelude runtime digest when preparation fails', async () => {
    const preludeRuntimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.5,
      companionshipPressure: 0.6,
      unknownSidecar: {
        marker: 'settled-prelude-sidecar',
      },
      summary: 'settled prelude runtime digest',
    } as const
    const input = createInput({
      preludePromise: Promise.resolve({
        perceptionAugmentation: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: preludeRuntimeDigest,
            },
          },
          chatGovernance: {
            mindTurnGovernance: {
              decisionTraceId: 'prelude-fallback-trace',
            },
          },
        },
      } as any),
      preparationPromise: Promise.reject(new Error('prepare failed')),
    })

    const result = await resolveAlicizationMainChatStartResult(input)

    expect(result.governance).toEqual({
      decisionTraceId: 'prelude-fallback-trace',
    })
    expect(result.runtimeDigest).toMatchObject({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      continuityPressure: 0.5,
      summary: 'settled prelude runtime digest',
    })
    expect(result.runtimeDigest).not.toHaveProperty('unknownSidecar')
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
                summary: 'keep the same project line explicit before outward reply',
              },
              updatedAt: 2_000,
            },
            world: {
              worldModel: {
                activeThread: {
                  id: 'thread-thin-spine',
                  kind: 'problem',
                  title: 'identity-continuity',
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
