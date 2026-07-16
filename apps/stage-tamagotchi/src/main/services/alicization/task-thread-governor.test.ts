import type { AlicizationChannelCapability, AlicizationExecutionChannel } from './claw-fabric'

import { describe, expect, it, vi } from 'vitest'

import { alicizationExecutionChannels } from './claw-fabric'
import { buildTaskThreadPlanningDraft, persistTaskThreadPlanningDraft } from './task-thread-governor'

function createCapabilities(
  availableChannels: AlicizationExecutionChannel[],
  overrides: Partial<Record<AlicizationExecutionChannel, Partial<AlicizationChannelCapability>>> = {},
) {
  return alicizationExecutionChannels.map(channel => ({
    channel,
    available: availableChannels.includes(channel),
    enabled: availableChannels.includes(channel),
    ready: availableChannels.includes(channel),
    ...overrides[channel],
  })) satisfies AlicizationChannelCapability[]
}

describe('task-thread governor', () => {
  it('maps routed plans into planned task threads and plan events', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-routed-1',
      now: 1_710_000_000_000,
      trace: {
        decisionTraceId: 'mind:trace:routed',
        turnId: 'turn-routed-1',
        sessionId: 'session-routed-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime regression.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
    })

    expect(draft.plan).toEqual(expect.objectContaining({
      state: 'routed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
    }))
    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-routed-1',
      decisionTraceId: 'mind:trace:routed',
      status: 'planned',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
    }))
    expect(draft.thread.metadata).toEqual(expect.objectContaining({
      fabric: expect.objectContaining({
        state: 'routed',
      }),
    }))
    expect(draft.events).toEqual([
      expect.objectContaining({
        threadId: 'thread-routed-1',
        kind: 'plan',
        channel: 'codex',
        threadStatus: 'planned',
      }),
    ])
  })

  it('maps affirmation holds into waiting task-thread state', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-affirmation-1',
      task: {
        kind: 'software-automation',
        goal: 'Publish the current foreground draft.',
        origin: 'proactive',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['software', 'desktop']),
    })

    expect(draft.plan).toEqual(expect.objectContaining({
      state: 'needs-affirmation',
      selectedChannel: null,
      proposedChannel: 'software',
    }))
    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-affirmation-1',
      status: 'needs-affirmation',
      selectedChannel: null,
      proposedChannel: 'software',
    }))
    expect(draft.events).toEqual([
      expect.objectContaining({
        threadId: 'thread-affirmation-1',
        kind: 'plan',
        threadStatus: 'needs-affirmation',
        payload: expect.objectContaining({
          affirmationReasonCodes: expect.arrayContaining(['medium-risk-proactive-action-requires-affirmation']),
        }),
      }),
    ])
  })

  it('persists proactive task origin into task-thread metadata so downstream execution ownership can survive non-subconscious turn ids', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-proactive-metadata-1',
      now: 1_710_000_000_001,
      trace: {
        decisionTraceId: 'mind:trace:proactive-metadata',
        turnId: 'autonomy-task:callback-1',
        sessionId: 'session-proactive-metadata-1',
        origin: 'subconscious-proactive',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Keep execution-result feedback on the same proactive line.',
        origin: 'proactive',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['codex', 'cli']),
    })

    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-proactive-metadata-1',
      turnId: 'autonomy-task:callback-1',
      origin: 'subconscious-proactive',
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          origin: 'proactive',
        }),
      }),
    }))
  })

  it('rejects origin-only proactive trace shells when planning task threads without subconscious turn-id ownership', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-proactive-trace-1',
      now: 1_710_000_000_005,
      trace: {
        decisionTraceId: 'mind:trace:proactive',
        turnId: 'turn-proactive-trace-1',
        sessionId: 'session-proactive-trace-1',
        origin: ' SubConscious-Proactive ' as any,
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Keep the same proactive execution line alive.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['codex', 'cli']),
    })

    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-proactive-trace-1',
      origin: 'user-turn',
    }))
    expect(draft.events).toEqual([
      expect.objectContaining({
        threadId: 'thread-proactive-trace-1',
        origin: 'user-turn',
        kind: 'plan',
      }),
    ])
  })

  it('preserves origin-lost autonomous trace ownership when the planning turn id still carries subconscious family markers', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-proactive-trace-originless-1',
      now: 1_710_000_000_006,
      trace: {
        decisionTraceId: 'mind:trace:proactive-originless',
        turnId: 'subconscious:turn-proactive-trace-originless-1',
        sessionId: 'session-proactive-trace-originless-1',
      } as any,
      task: {
        kind: 'codebase-edit',
        goal: 'Keep the same proactive execution line alive even when origin thins out.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['codex', 'cli']),
    })

    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-proactive-trace-originless-1',
      turnId: 'subconscious:turn-proactive-trace-originless-1',
      origin: 'subconscious-proactive',
    }))
    expect(draft.events).toEqual([
      expect.objectContaining({
        threadId: 'thread-proactive-trace-originless-1',
        turnId: 'subconscious:turn-proactive-trace-originless-1',
        origin: 'subconscious-proactive',
        kind: 'plan',
      }),
    ])
  })

  it('keeps channel experience hints in metadata and uses them for route choice', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-experience-1',
      now: 1_710_000_000_010,
      trace: {
        decisionTraceId: 'mind:trace:experience',
        turnId: 'turn-experience-1',
        sessionId: 'session-experience-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Fix the task-thread planner regressions.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
      experience: {
        sessionResumeChannel: 'claude-code',
        activeChannels: ['claude-code'],
        goalAffinityChannel: 'claude-code',
        goalAffinityScore: 0.82,
        goalAffinityReason: 'similar-goal-history:claude-code:2',
        advisorChannel: 'claude-code',
        advisorConfidence: 0.94,
        advisorReason: 'llm-assessor:prefers-claude-code',
        rememberedProcedures: [{
          id: 'procedural:runtime-seam',
          sourceKind: 'procedural',
          facet: null,
          label: 'runtime seam repair',
          approach: 'Use Claude Code first for the patch, then verify before branching.',
          pitfalls: ['Do not branch before verify.'],
          situation: 'channel=claude-code | codebase-edit | completed',
          steps: ['Use Claude Code first for the patch.', 'Verify before branching.'],
          failurePoints: [],
          repairMoves: [],
          result: 'Verified before reporting back.',
          traceSummary: 'runtime seam repair | steps: Use Claude Code first for the patch. -> Verify before branching.',
          lastExperiencedAt: 120,
          confidence: 0.92,
          cues: ['patch', 'verify'],
          preferredChannel: 'claude-code',
          preferredChannelReason: 'remembered-procedure-mentioned-channel:claude-code',
        }],
        channelOutcomes: {
          'codex': { completed: 1, failed: 3 },
          'claude-code': { completed: 2, running: 1 },
        },
      },
    })

    expect(draft.plan.state).toBe('routed')
    expect(draft.plan.selectedChannel).toBe('claude-code')
    expect(draft.thread.metadata).toEqual(expect.objectContaining({
      fabric: expect.objectContaining({
        experience: expect.objectContaining({
          sessionResumeChannel: 'claude-code',
          activeChannels: ['claude-code'],
          goalAffinityChannel: 'claude-code',
          goalAffinityScore: 0.82,
          goalAffinityReason: 'similar-goal-history:claude-code:2',
          advisorChannel: 'claude-code',
          advisorConfidence: 0.94,
          advisorReason: 'llm-assessor:prefers-claude-code',
          rememberedProcedures: [
            expect.objectContaining({
              id: 'procedural:runtime-seam',
              preferredChannel: 'claude-code',
              steps: expect.arrayContaining(['Use Claude Code first for the patch.', 'Verify before branching.']),
              traceSummary: expect.stringContaining('steps:'),
            }),
          ],
        }),
      }),
    }))
    expect(draft.events[0]?.payload).toEqual(expect.objectContaining({
      experience: expect.objectContaining({
        advisorChannel: 'claude-code',
        rememberedProcedures: expect.arrayContaining([
          expect.objectContaining({
            id: 'procedural:runtime-seam',
          }),
        ]),
      }),
    }))
  })

  it('persists project briefing into execution runtime context when planning first-dispatch task threads', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-project-briefing-1',
      now: 1_710_000_000_020,
      trace: {
        decisionTraceId: 'mind:trace:project-briefing',
        turnId: 'turn-project-briefing-1',
        sessionId: 'session-project-briefing-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the execution preflight project carry.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'cli']),
      experience: {
        projectBriefing: {
          identity: 'Alicization is a local-first digital life project growing identity continuity on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life.',
          latestLandedProgress: 'First-dispatch execution planning already keeps live project progress in the runtime context.',
          primaryOpenLoop: 'Execution still needs first-dispatch project briefing persistence before resume and feedback can stay continuous.',
          nextClosureTarget: 'Keep first-dispatch execution, resume, and feedback on one same-her Phase 1 line.',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: 'If first-dispatch project briefing only appears in routing prose, treat that as execution continuity drift.',
          proactiveSameHerGap: 'First-dispatch planning still needs stronger proof that proactive carry survives into execution runtime context instead of collapsing into generic routing guidance.',
          preflightSummary: 'Alicization execution planning still belongs to the same Phase 1 life loop.',
          preDialogueAwarenessLine: 'Before dispatch, remember this is still the same local-first digital life project.',
        },
      },
    })

    expect(draft.thread.metadata).toEqual(expect.objectContaining({
      fabric: expect.objectContaining({
        experience: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            latestLandedProgress: 'First-dispatch execution planning already keeps live project progress in the runtime context.',
            primaryOpenLoop: 'Execution still needs first-dispatch project briefing persistence before resume and feedback can stay continuous.',
          }),
        }),
      }),
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            latestLandedProgress: 'First-dispatch execution planning already keeps live project progress in the runtime context.',
            primaryOpenLoop: 'Execution still needs first-dispatch project briefing persistence before resume and feedback can stay continuous.',
            sameHerSelfLine: 'structured continuity digest.',
            proactiveSameHerGap: 'First-dispatch planning still needs stronger proof that proactive carry survives into execution runtime context instead of collapsing into generic routing guidance.',
          }),
        }),
      }),
    }))
    expect(draft.events[0]?.payload).toEqual(expect.objectContaining({
      experience: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          latestLandedProgress: 'First-dispatch execution planning already keeps live project progress in the runtime context.',
        }),
      }),
    }))
  })

  it('hydrates alias-only project briefing closure summaries into first-dispatch execution runtime context metadata', () => {
    const aliasLandedProgress = 'Alias landed progress keeps first-dispatch planning aware of what already landed before execution starts.'
    const aliasOpenClosure = 'Alias open closure keeps the still-open Phase 1 seam explicit before the first execution turn leaves planning.'
    const aliasNextClosure = 'Alias next closure keeps execution, feedback, and return on one same-her Phase 1 line.'
    const aliasDriftRisk = 'Alias drift risk: if planning loses these closure summaries before dispatch, execution can flatten into generic routing prose.'

    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-project-briefing-alias-1',
      now: 1_710_000_000_021,
      trace: {
        decisionTraceId: 'mind:trace:project-briefing-alias',
        turnId: 'turn-project-briefing-alias-1',
        sessionId: 'session-project-briefing-alias-1',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-edit',
        goal: 'Keep alias-only project closure state alive before first dispatch.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'cli']),
      experience: {
        projectBriefing: {
          identity: 'Alicization is a local-first digital life project growing identity continuity on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life.',
          latestLandedProgress: ' ',
          primaryOpenLoop: '',
          nextClosureTarget: ' ',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerDriftRisk: '',
          landedProgressSummary: aliasLandedProgress,
          openClosureSummary: aliasOpenClosure,
          nextClosureTargetSummary: aliasNextClosure,
          sameHerDriftRiskSummary: aliasDriftRisk,
          preDialogueAwarenessLine: 'Before dispatch, remember this is still the same local-first digital life project.',
        } as any,
      },
    })

    expect(draft.thread.metadata).toEqual(expect.objectContaining({
      fabric: expect.objectContaining({
        experience: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            latestLandedProgress: aliasLandedProgress,
            primaryOpenLoop: aliasOpenClosure,
            nextClosureTarget: aliasNextClosure,
            sameHerDriftRisk: aliasDriftRisk,
          }),
        }),
      }),
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            latestLandedProgress: aliasLandedProgress,
            primaryOpenLoop: aliasOpenClosure,
            nextClosureTarget: aliasNextClosure,
            sameHerDriftRisk: aliasDriftRisk,
          }),
        }),
      }),
    }))
    expect(draft.events[0]?.payload).toEqual(expect.objectContaining({
      experience: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          latestLandedProgress: aliasLandedProgress,
          primaryOpenLoop: aliasOpenClosure,
          nextClosureTarget: aliasNextClosure,
          sameHerDriftRisk: aliasDriftRisk,
        }),
      }),
    }))
  })

  it('keeps planning blocked while the kill switch is suspended', () => {
    const draft = buildTaskThreadPlanningDraft({
      threadId: 'thread-blocked-1',
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['cli']),
      killSwitchSuspended: true,
    })

    expect(draft.plan).toEqual(expect.objectContaining({
      state: 'blocked',
      blockedReasonCodes: expect.arrayContaining(['kill-switch-suspended']),
    }))
    expect(draft.thread).toEqual(expect.objectContaining({
      id: 'thread-blocked-1',
      status: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
    }))
    expect(draft.events).toEqual([
      expect.objectContaining({
        threadId: 'thread-blocked-1',
        kind: 'plan',
        threadStatus: 'blocked',
        payload: expect.objectContaining({
          blockedReasonCodes: expect.arrayContaining(['kill-switch-suspended']),
        }),
      }),
    ])
  })

  it('persists the planning draft through the db port', async () => {
    const upsertTaskThread = vi.fn(async (input: any) => ({
      id: input.id,
      decisionTraceId: input.decisionTraceId ?? null,
      turnId: input.turnId ?? null,
      sessionId: input.sessionId ?? null,
      origin: input.origin ?? 'user-turn',
      goal: input.goal,
      kind: input.kind,
      status: input.status,
      selectedChannel: input.selectedChannel ?? null,
      proposedChannel: input.proposedChannel ?? null,
      summary: input.summary ?? null,
      metadata: input.metadata ?? null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      lastEventAt: input.lastEventAt ?? null,
      completedAt: input.completedAt ?? null,
    }))
    const appendExecutionEvents = vi.fn().mockResolvedValue(undefined)

    const result = await persistTaskThreadPlanningDraft({
      upsertTaskThread,
      appendExecutionEvents,
    }, {
      threadId: 'thread-persist-1',
      now: 1_710_000_000_123,
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['cli']),
    })

    expect(upsertTaskThread).toBeCalledWith(expect.objectContaining({
      id: 'thread-persist-1',
      status: 'planned',
      selectedChannel: 'cli',
    }))
    expect(appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        threadId: 'thread-persist-1',
        kind: 'plan',
        channel: 'cli',
      }),
    ])
    expect(result).toEqual(expect.objectContaining({
      createdEventKinds: ['plan'],
      plan: expect.objectContaining({
        state: 'routed',
        selectedChannel: 'cli',
      }),
      thread: expect.objectContaining({
        id: 'thread-persist-1',
        status: 'planned',
      }),
    }))
  })
})
