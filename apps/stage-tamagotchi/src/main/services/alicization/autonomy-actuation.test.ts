import type { AlicizationDispatchTaskThreadRuntimeInput } from './task-thread-dispatcher'

import { describe, expect, it, vi } from 'vitest'

import {
  buildAutonomousObserveDispatchInput,
  buildAutonomousTaskDispatchInput,
  deriveAutonomousTaskPlan,
  deriveAutonomyExecutionProposalSurface,
  deriveAutonomyRevisitReminder,
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

function createExecutionRuntimeContext(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: 1_710_000_000_000,
    cardId: 'default',
    turnId: 'turn-autonomy-runtime',
    sessionId: 'session-runtime',
    decisionTraceId: 'mind:trace:autonomy-runtime',
    sensory: {
      collectedAt: 1_710_000_000_123,
      running: true,
      stale: false,
      ageMs: 11,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'cursor',
        title: 'airi-alice',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sourceCount: 2,
        lastUpdatedAt: 1_710_000_000_100,
        lastError: null,
        degradedReasons: [],
      },
    },
    ...overrides,
  } as any
}

describe('autonomy actuation', () => {
  it('omits retired structured context instead of replacing it with a fixed placeholder', () => {
    const retiredStructuredSummary = [
      `${['opening', 'policy'].join('_')}=memory-led`,
      `${['relationship', 'cadence'].join('_')}=lower-pressure`,
    ].join('; ')
    const dispatch = buildAutonomousObserveDispatchInput({
      threadId: 'thread-structured-context',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'observe',
        goal: 'Inspect the current task.',
      } as any,
      summary: retiredStructuredSummary,
    })

    const prompt = dispatch.codex?.prompt ?? ''
    expect(prompt).not.toContain('Task context:')
    expect(prompt).not.toContain('structured_context=')
  })

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
    expect(reminder?.message).toContain('autonomy_revisit=deferred')
    expect(reminder?.message).toContain('defer_reason=busy-host')
    expect(reminder?.message).toContain('status=awaiting_opening')
  })

  it('does not append internal continuity prose to a revisit reminder', () => {
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
              whyNow: 'structured continuity digest.',
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

    expect(reminder?.message).toContain('target=return later without crowding')
  })

  it('keeps a deferred autonomy reminder alive when a sparse spine only preserves autonomy carry', () => {
    const reminder = deriveAutonomyRevisitReminder({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
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
              deferReason: 'busy-host',
              whyNow: 'structured continuity digest.',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'return later to the unresolved runtime break',
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

    expect(reminder).toEqual(expect.objectContaining({
      minutes: 16,
      sourceTurnId: expect.stringContaining('autonomy-revisit:'),
    }))
  })

  it('does not assign special reminder timing to legacy continuity defer reasons', () => {
    const reminder = deriveAutonomyRevisitReminder({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
          perception: {
            watchMode: 'recovering',
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
              actReadiness: 0.64,
              inhibition: 0.4,
              confidence: 0.74,
              deferReason: 'corrected-same-person-settling',
              whyNow: 'finish the unresolved implementation thread persona=persona keeps corrected same-person continuity settling visible and keeps embodiment quieter while the return re-settles.',
              sourceThreadId: 'thread-runtime',
              sourceThreadSummary: 'keep tracing the unresolved runtime break',
              executionIntent: {
                kind: 'follow-through',
                summary: 'keep corrected same-person continuity settling and embodiment quieter before widening outward; re-open the unresolved runtime break and see what still blocks it',
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

    expect(reminder).toEqual(expect.objectContaining({
      minutes: 12,
      sourceTurnId: expect.stringContaining('autonomy-revisit:'),
    }))
    expect(reminder?.reasonTags).toContain('defer:corrected-same-person-settling')
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

  it('safely declines proactive task planning when sparse autonomy carry loses scene and thread context', () => {
    const taskPlan = deriveAutonomousTaskPlan({
      cardId: 'default',
      digitalLifeSpine: createSpine({
        runtimeSurface: {
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
      }),
      runtimeDigest: createRuntimeDigest(),
      capabilities: createCapabilities(['codex']),
    })

    expect(taskPlan).toBeNull()
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
    const runtimeContext = createExecutionRuntimeContext()
    const payload = buildAutonomousObserveDispatchInput({
      threadId: 'thread-runtime',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'codebase-investigation',
        goal: 'Investigate the current unresolved Alicization line without editing files: runtime break',
      } as any,
      summary: 'runtime break',
      workspaceRoot: '/repo',
      runtimeContext,
    })

    expect(payload.threadId).toBe('thread-runtime')
    expect(payload.codex).toEqual(expect.objectContaining({
      cwd: '/repo',
      sandbox: 'read-only',
      runtimeContext: expect.objectContaining({
        turnId: runtimeContext.turnId,
      }),
    }))
    expect(payload.codex?.prompt).toContain('Read-only investigation only')
  })

  it('plans and dispatches a proactive observe task through the selected channel', async () => {
    const scheduleReminder = vi.fn()
    const buildExecutionRuntimeContext = vi.fn(async ({ turnId }: { turnId: string }) => createExecutionRuntimeContext({
      turnId,
    }))
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
    const dispatchTaskThread = vi.fn(async (_payload: AlicizationDispatchTaskThreadRuntimeInput) => ({}))

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
      buildExecutionRuntimeContext,
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
        runtimeContext: expect.objectContaining({
          turnId: expect.stringContaining('autonomy-task:default:1000:'),
        }),
      }),
    }))
    expect(buildExecutionRuntimeContext).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      sessionId: 'session-runtime',
      turnId: expect.stringContaining('autonomy-task:default:1000:'),
    }))
    expect(scheduleReminder).not.toHaveBeenCalled()
  })

  it('auto-dispatches low-risk proactive code edits through workspace-write code agents', async () => {
    const dispatchTaskThread = vi.fn(async (_payload: AlicizationDispatchTaskThreadRuntimeInput) => ({}))
    const buildExecutionRuntimeContext = vi.fn(async ({ turnId }: { turnId: string }) => createExecutionRuntimeContext({
      turnId,
    }))
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
      buildExecutionRuntimeContext,
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
        prompt: expect.stringContaining('Task context:'),
        sandbox: 'workspace-write',
        runtimeContext: expect.objectContaining({
          turnId: expect.stringContaining('autonomy-task:default:1000:'),
        }),
      }),
    }))
    expect(buildExecutionRuntimeContext).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'default',
      sessionId: 'session-runtime',
      turnId: expect.stringContaining('autonomy-task:default:1000:'),
    }))
  })

  it('derives an explicit execution proposal surface when a proactive task needs affirmation', () => {
    const proposal = deriveAutonomyExecutionProposalSurface({
      digitalLifeSpine: createSpine({
        runtimeSurface: {
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
              whyNow: 'structured continuity digest.',
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
      }),
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
    expect(proposal?.reply).toContain('execution_proposal=explicit_consent')
    expect(proposal?.reply).toContain('status=awaiting_user_confirmation')
    expect(proposal?.reply).toContain('goal=Publish the current foreground draft')
    expect(proposal?.reasonTags).toContain('execution-proposal')
  })

  it('preserves task context without inserting a fixed continuity marker', () => {
    const payload = buildAutonomousTaskDispatchInput({
      threadId: 'thread-continuity-dispatch',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'codebase-edit',
        goal: 'Proactively patch the current unresolved Alicization line: patch the unresolved runtime break directly',
        origin: 'proactive',
        effect: 'mutate',
        permissionMode: 'none',
        justification: 'grounded',
        requestedChannel: 'codex',
        prefersPersistentSession: true,
      } as any,
      summary: 'patch the unresolved runtime break directly; structured continuity digest.',
      workspaceRoot: '/repo',
    })

    expect(payload.codex?.prompt).toContain('Task context:')
    expect(payload.codex?.prompt).toContain('structured continuity digest.')
    expect(payload.codex?.prompt).not.toContain('Continuity focus:')
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

    expect(proposal?.reply).toContain('execution_proposal=explicit_consent')
    expect(proposal?.reply).toContain('status=awaiting_user_confirmation')
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
    const runtimeContext = createExecutionRuntimeContext()
    const payload = buildAutonomousTaskDispatchInput({
      threadId: 'thread-runtime',
      requestedDispatchChannel: 'codex',
      task: {
        kind: 'codebase-edit',
        goal: 'Proactively patch the current unresolved Alicization line: runtime break',
      } as any,
      summary: 'runtime break',
      workspaceRoot: '/repo',
      runtimeContext,
    })

    expect(payload.threadId).toBe('thread-runtime')
    expect(payload.codex).toEqual(expect.objectContaining({
      cwd: '/repo',
      sandbox: 'workspace-write',
      runtimeContext: expect.objectContaining({
        turnId: runtimeContext.turnId,
      }),
    }))
    expect(payload.codex?.prompt).toContain('smallest safe code change')
  })

  it('keeps proactive auto-dispatch parked when execution runtime context cannot be built, so identity-continuity', async () => {
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
      scheduleReminder: vi.fn(),
      buildExecutionRuntimeContext: vi.fn(async () => null),
      planTaskThread: vi.fn(async () => ({
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
      })) as any,
      dispatchTaskThread,
    })

    expect(result.taskPlanState).toBe('routed')
    expect(result.taskDispatched).toBe(false)
    expect(result.taskDispatchChannel).toBe(null)
    expect(result.reasonTags).toContain('dispatch:missing-runtime-context')
    expect(dispatchTaskThread).not.toHaveBeenCalled()
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
