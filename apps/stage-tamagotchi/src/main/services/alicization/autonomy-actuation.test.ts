import { describe, expect, it, vi } from 'vitest'

import {
  buildAutonomousTaskDispatchInput,
  buildAutonomousObserveDispatchInput,
  deriveAutonomyExecutionProposalSurface,
  deriveAutonomyRevisitReminder,
  deriveAutonomousTaskPlan,
  runAutonomyActuation,
} from './autonomy-actuation'

function createCapabilities(channels: string[]) {
  return channels.map(channel => ({
    channel,
    available: true,
    enabled: true,
    ready: true,
  })) as any
}

function createSpine(overrides: Record<string, unknown> = {}) {
  return {
    runtimeSurface: {
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          scenario: 'coding',
          workloadKind: 'coding',
          contentKind: 'diff',
        },
      },
      world: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime',
            kind: 'problem',
            summary: 'keep tracing the unresolved runtime break',
            title: 'runtime break',
            unresolved: true,
          },
        },
      },
      agency: {
        autonomy: {
          selectedMode: 'prepare-act',
          visibleAction: 'hover',
          shouldSurface: true,
          shouldSpeak: false,
          shouldAct: false,
          speakReadiness: 0.18,
          actReadiness: 0.82,
          inhibition: 0.34,
          confidence: 0.8,
          deferReason: 'busy-host',
          whyNow: 'keep the unresolved line alive quietly',
          sourceThreadId: 'thread-runtime',
          sourceThreadSummary: 'keep tracing the unresolved runtime break',
          executionIntent: {
            kind: 'follow-through',
            summary: 're-open the unresolved runtime break and see what still blocks it',
            targetThreadId: 'thread-runtime',
          },
        },
      },
    },
    ...overrides,
  } as any
}

function createRuntimeDigest(overrides: Record<string, unknown> = {}) {
  return {
    shouldProactivelyAct: true,
    autonomy: {
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSpeak: false,
      shouldAct: false,
      speakReadiness: 0.18,
      actReadiness: 0.82,
      inhibition: 0.34,
      confidence: 0.8,
      executionIntentKind: 'follow-through',
      executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
      deferReason: 'busy-host',
      whyNow: 'keep the unresolved line alive quietly',
    },
    ...overrides,
  } as any
}

describe('autonomy actuation', () => {
  it('derives a revisit reminder from deferred act readiness', () => {
    const reminder = deriveAutonomyRevisitReminder({
      cardId: 'default',
      digitalLifeSpine: createSpine(),
      runtimeDigest: createRuntimeDigest(),
    })

    expect(reminder).toEqual(expect.objectContaining({
      minutes: 12,
      sourceTurnId: expect.stringContaining('autonomy-revisit:'),
    }))
    expect(reminder?.message).toContain('Return when the host has more room')
  })

  it('derives a proactive observe task when coding-like actuation is ripe', () => {
    const taskPlan = deriveAutonomousTaskPlan({
      cardId: 'default',
      digitalLifeSpine: createSpine(),
      runtimeDigest: createRuntimeDigest(),
      capabilities: createCapabilities(['codex']),
    })

    expect(taskPlan).toEqual(expect.objectContaining({
      requestedDispatchChannel: 'codex',
      summary: 're-open the unresolved runtime break and see what still blocks it',
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        origin: 'proactive',
        effect: 'observe',
        requestedChannel: 'codex',
      }),
    }))
  })

  it('derives a proactive mutate proposal when act mode is mature enough', () => {
    const taskPlan = deriveAutonomousTaskPlan({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'symbiotic-vision',
            currentScene: {
              scenario: 'coding',
              workloadKind: 'coding',
              contentKind: 'diff',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
            },
          },
          agency: {
            autonomy: {
              selectedMode: 'act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: true,
              speakReadiness: 0.18,
              actReadiness: 0.86,
              inhibition: 0.22,
              confidence: 0.84,
              deferReason: null,
              whyNow: 'the fix line is ready to be pushed further',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'patch the unresolved runtime break directly',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: true,
      }),
      capabilities: createCapabilities(['codex']),
    })

    expect(taskPlan).toEqual(expect.objectContaining({
      requestedDispatchChannel: 'codex',
      task: expect.objectContaining({
        kind: 'codebase-edit',
        origin: 'proactive',
        effect: 'mutate',
      }),
    }))
    expect(taskPlan?.reasonTags).toContain('task:mutate-proposal')
  })

  it('raises mutate proposal threshold when long-horizon learning says to be more cautious', () => {
    const taskPlan = deriveAutonomousTaskPlan({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'symbiotic-vision',
            currentScene: {
              scenario: 'coding',
              workloadKind: 'coding',
              contentKind: 'diff',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              personaDrift: {
                agencyStyle: 'reserved',
                expressionStyle: 'measured',
                conflictStyle: 'repair-first',
              },
              preferenceEvolution: {
                autonomyRespect: 0.86,
                truthfulGrounding: 0.82,
                companionship: 0.42,
                gentleRepair: 0.74,
                quietObservation: 0.72,
                proactiveCare: 0.4,
                playfulIntimacy: 0.16,
                unfinishedThreadReturn: 0.54,
              },
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.78,
                truthfulGrounding: 0.76,
              },
              identityBias: {
                directness: 0.12,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'reserved',
              guardingTendency: 0.72,
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: true,
            },
            autonomy: {
              selectedMode: 'act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: true,
              speakReadiness: 0.18,
              actReadiness: 0.84,
              inhibition: 0.2,
              confidence: 0.82,
              deferReason: null,
              whyNow: 'the fix line is ready to be pushed further',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'patch the unresolved runtime break directly',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: true,
      }),
      capabilities: createCapabilities(['codex']),
    })

    expect(taskPlan?.task.kind).toBe('codebase-investigation')
    expect(taskPlan?.reasonTags).toContain('proposal-tone:cautious')
  })

  it('builds a read-only dispatch payload for proactive observe tasks', () => {
    const payload = buildAutonomousObserveDispatchInput({
      threadId: 'thread-runtime',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'codebase-investigation',
        goal: 'Investigate the current unresolved Alicization line without editing files: runtime break',
      } as any,
      summary: 'runtime break',
      workspaceRoot: '/repo',
    })

    expect(payload.threadId).toBe('thread-runtime')
    expect(payload.codex).toEqual(expect.objectContaining({
      cwd: '/repo',
      sandbox: 'read-only',
    }))
    expect(payload.codex?.prompt).toContain('Read-only investigation only')
  })

  it('plans and dispatches a proactive observe task through the selected channel', async () => {
    const scheduleReminder = vi.fn()
    const planTaskThread = vi.fn(async () => ({
      thread: {
        id: 'thread-runtime',
        selectedChannel: 'codex',
      },
      plan: {
        state: 'routed',
      },
      createdEventKinds: [],
      governor: {
        disposition: 'planned',
      },
    })) as any
    const dispatchTaskThread = vi.fn(async () => ({}))

    const result = await runAutonomyActuation({
      now: 1_000,
      cardId: 'default',
      sessionId: 'session-runtime',
      digitalLifeSpine: createSpine(),
      runtimeDigest: createRuntimeDigest(),
      capabilities: createCapabilities(['codex']),
      workspaceRoot: '/repo',
      listPendingReminders: async () => [],
      scheduleReminder,
      planTaskThread,
      dispatchTaskThread,
    })

    expect(result.taskPlanned).toBe(true)
    expect(result.taskPlanState).toBe('routed')
    expect(result.taskDispatched).toBe(true)
    expect(result.taskDispatchChannel).toBe('codex')
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-runtime',
      codex: expect.objectContaining({
        sandbox: 'read-only',
      }),
    }))
    expect(scheduleReminder).not.toHaveBeenCalled()
  })

  it('auto-dispatches low-risk proactive code edits through workspace-write code agents', async () => {
    const dispatchTaskThread = vi.fn(async () => ({}))
    const result = await runAutonomyActuation({
      now: 1_000,
      cardId: 'default',
      sessionId: 'session-runtime',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'symbiotic-vision',
            currentScene: {
              scenario: 'coding',
              workloadKind: 'coding',
              contentKind: 'diff',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
              hostState: {
                availability: 'open',
              },
              epistemicState: {
                certainty: 'grounded',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              personaDrift: {
                agencyStyle: 'self-starting',
                expressionStyle: 'sharp',
                conflictStyle: 'direct-when-certain',
              },
              preferenceEvolution: {
                autonomyRespect: 0.34,
                truthfulGrounding: 0.82,
                companionship: 0.56,
                gentleRepair: 0.54,
                quietObservation: 0.22,
                proactiveCare: 0.42,
                playfulIntimacy: 0.2,
                unfinishedThreadReturn: 0.78,
              },
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.28,
                truthfulGrounding: 0.76,
              },
              identityBias: {
                directness: 0.72,
              },
            },
          },
          agency: {
            autonomy: {
              selectedMode: 'act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: true,
              speakReadiness: 0.18,
              actReadiness: 0.9,
              inhibition: 0.18,
              confidence: 0.88,
              deferReason: null,
              whyNow: 'patch the unresolved runtime break directly',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'runtime break',
              executionIntent: {
                kind: 'repair',
                summary: 'patch the unresolved runtime break directly',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: true,
      }),
      capabilities: createCapabilities(['codex']),
      workspaceRoot: '/repo',
      listPendingReminders: async () => [],
      scheduleReminder: vi.fn(),
      planTaskThread: vi.fn(async () => ({
        thread: {
          id: 'thread-low-risk-edit',
          selectedChannel: 'codex',
          summary: 'Execution planned codex for Proactively patch the current unresolved Alicization line: patch the unresolved runtime break directly.',
        },
        plan: {
          state: 'routed',
          proposedChannel: 'codex',
          affirmationReasonCodes: [],
        },
        createdEventKinds: [],
        governor: {
          disposition: 'planned',
        },
      })) as any,
      dispatchTaskThread,
    })

    expect(result.taskPlanState).toBe('routed')
    expect(result.taskDispatched).toBe(true)
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-low-risk-edit',
      codex: expect.objectContaining({
        sandbox: 'workspace-write',
      }),
    }))
  })

  it('derives an explicit execution proposal surface when a proactive task needs affirmation', () => {
    const proposal = deriveAutonomyExecutionProposalSurface({
      digitalLifeSpine: createSpine(),
      actuationResult: {
        reminderScheduled: false,
        reminderSourceTurnId: null,
        taskPlanned: true,
        taskKind: 'software-automation',
        taskGoal: 'Publish the current foreground draft',
        taskPlanState: 'needs-affirmation',
        taskProposedChannel: 'software',
        taskSelectedChannel: null,
        taskSummary: 'Execution is waiting for affirmation before software can act on Publish the current foreground draft.',
        taskThreadId: 'thread-proposal',
        taskAffirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
        taskDispatched: false,
        taskDispatchChannel: null,
        reasonTags: ['task:observe'],
      },
    })

    expect(proposal).toEqual(expect.objectContaining({
      emotion: 'concerned',
    }))
    expect(proposal?.reply).toContain('你要是愿意')
    expect(proposal?.reply).toContain('做完把改动摊给你看')
    expect(proposal?.reasonTags).toContain('execution-proposal')
  })

  it('makes proposal copy more direct after learning drifts toward directness and successful execution', () => {
    const proposal = deriveAutonomyExecutionProposalSurface({
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          memory: {
            autobiographicalSelf: {
              personaDrift: {
                agencyStyle: 'self-starting',
                expressionStyle: 'sharp',
                conflictStyle: 'direct-when-certain',
              },
              preferenceEvolution: {
                autonomyRespect: 0.42,
                truthfulGrounding: 0.78,
                companionship: 0.54,
                gentleRepair: 0.48,
                quietObservation: 0.28,
                proactiveCare: 0.44,
                playfulIntimacy: 0.2,
                unfinishedThreadReturn: 0.72,
              },
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.32,
                truthfulGrounding: 0.7,
              },
              identityBias: {
                directness: 0.82,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'eager',
              guardingTendency: 0.26,
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: false,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
            },
            autonomy: {
              selectedMode: 'act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: true,
              speakReadiness: 0.18,
              actReadiness: 0.9,
              inhibition: 0.18,
              confidence: 0.86,
              deferReason: null,
              whyNow: 'patch the unresolved runtime break directly',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'patch the unresolved runtime break directly',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      actuationResult: {
        reminderScheduled: false,
        reminderSourceTurnId: null,
        taskPlanned: true,
        taskKind: 'codebase-edit',
        taskGoal: 'Proactively patch the current unresolved Alicization line: patch the unresolved runtime break directly',
        taskPlanState: 'needs-affirmation',
        taskProposedChannel: 'codex',
        taskSelectedChannel: null,
        taskSummary: 'Execution is waiting for affirmation before codex can act.',
        taskThreadId: 'thread-proposal',
        taskAffirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
        taskDispatched: false,
        taskDispatchChannel: null,
        reasonTags: [],
      },
    })

    expect(proposal?.reply).toContain('我想直接把')
    expect(proposal?.reasonTags).toContain('tone:direct')
  })

  it('captures needs-affirmation planning results for proactive mutate proposals', async () => {
    const scheduleReminder = vi.fn()
    const dispatchTaskThread = vi.fn(async () => {
      throw new Error('mutate proposal should not auto-dispatch')
    })
    const result = await runAutonomyActuation({
      now: 1_000,
      cardId: 'default',
      sessionId: 'session-runtime',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'symbiotic-vision',
            currentScene: {
              scenario: 'coding',
              workloadKind: 'coding',
              contentKind: 'diff',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
            },
          },
          agency: {
            autonomy: {
              selectedMode: 'act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: true,
              speakReadiness: 0.18,
              actReadiness: 0.86,
              inhibition: 0.22,
              confidence: 0.84,
              deferReason: null,
              whyNow: 'the fix line is ready to be pushed further',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'patch the unresolved runtime break directly',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: true,
      }),
      capabilities: createCapabilities(['codex']),
      workspaceRoot: '/repo',
      listPendingReminders: async () => [],
      scheduleReminder,
      planTaskThread: vi.fn(async () => ({
        thread: {
          id: 'thread-proposal',
          selectedChannel: null,
          summary: 'Execution is waiting for affirmation before codex can act on Proactively patch the current unresolved Alicization line: patch the unresolved runtime break directly',
        },
        plan: {
          state: 'needs-affirmation',
          proposedChannel: 'codex',
          affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
        },
        createdEventKinds: [],
        governor: {
          disposition: 'planned',
        },
      })) as any,
      dispatchTaskThread,
    })

    expect(result.taskPlanned).toBe(true)
    expect(result.taskPlanState).toBe('needs-affirmation')
    expect(result.taskKind).toBe('codebase-edit')
    expect(result.taskAffirmationReasonCodes).toContain('proactive-side-effects-require-explicit-consent')
    expect(result.taskDispatched).toBe(false)
    expect(scheduleReminder).not.toHaveBeenCalled()
    expect(dispatchTaskThread).not.toHaveBeenCalled()
  })

  it('builds a workspace-write dispatch payload for proactive code edits', () => {
    const payload = buildAutonomousTaskDispatchInput({
      threadId: 'thread-runtime',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'codebase-edit',
        goal: 'Proactively patch the current unresolved Alicization line: runtime break',
      } as any,
      summary: 'runtime break',
      workspaceRoot: '/repo',
    })

    expect(payload.threadId).toBe('thread-runtime')
    expect(payload.codex).toEqual(expect.objectContaining({
      cwd: '/repo',
      sandbox: 'workspace-write',
    }))
    expect(payload.codex?.prompt).toContain('smallest safe code change')
  })

  it('skips duplicate revisit reminders that are already pending', async () => {
    const reminder = deriveAutonomyRevisitReminder({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'recovering',
            currentScene: {
              scenario: 'general',
              workloadKind: 'general',
              contentKind: 'general',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
            },
          },
          agency: {
            autonomy: {
              selectedMode: 'prepare-act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: false,
              speakReadiness: 0.18,
              actReadiness: 0.62,
              inhibition: 0.34,
              confidence: 0.72,
              deferReason: 'respect-boundary',
              whyNow: 'return later without crowding',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'companionship',
                summary: 'return later without crowding',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: false,
      }),
    })
    const scheduleReminder = vi.fn()

    const result = await runAutonomyActuation({
      now: 1_000,
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'recovering',
            currentScene: {
              scenario: 'general',
              workloadKind: 'general',
              contentKind: 'general',
            },
          },
          world: {
            worldModel: {
              activeThread: {
                id: 'thread-runtime',
                kind: 'problem',
                summary: 'keep tracing the unresolved runtime break',
                title: 'runtime break',
                unresolved: true,
              },
            },
          },
          agency: {
            autonomy: {
              selectedMode: 'prepare-act',
              visibleAction: 'hover',
              shouldSurface: true,
              shouldSpeak: false,
              shouldAct: false,
              speakReadiness: 0.18,
              actReadiness: 0.62,
              inhibition: 0.34,
              confidence: 0.72,
              deferReason: 'respect-boundary',
              whyNow: 'return later without crowding',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'companionship',
                summary: 'return later without crowding',
                targetThreadId: 'thread-runtime',
              },
            },
          },
        },
      }),
      runtimeDigest: createRuntimeDigest({
        shouldProactivelyAct: false,
      }),
      capabilities: [],
      listPendingReminders: async () => [{ sourceTurnId: reminder?.sourceTurnId ?? null }],
      scheduleReminder,
      planTaskThread: vi.fn(async () => {
        throw new Error('task planning should not run')
      }),
      dispatchTaskThread: vi.fn(async () => {
        throw new Error('dispatch should not run')
      }),
    })

    expect(result.reminderScheduled).toBe(false)
    expect(scheduleReminder).not.toHaveBeenCalled()
  })
})
