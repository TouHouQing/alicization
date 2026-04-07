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
          affirmationReasonCodes: expect.arrayContaining(['proactive-side-effects-require-explicit-consent']),
        }),
      }),
    ])
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
