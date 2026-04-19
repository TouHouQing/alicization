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

function createInput(overrides?: Partial<Parameters<typeof resolveAlicizationMainChatStartResult>[0]>) {
  return {
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
})
