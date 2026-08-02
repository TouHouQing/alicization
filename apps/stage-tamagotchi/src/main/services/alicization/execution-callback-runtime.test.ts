import type {
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import {
  createAlicizationExecutionCallbackRuntime,
  emptyAlicizationExecutionCallbackContext,
} from './execution-callback-runtime'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    goal: 'Run the CLI check command',
    kind: 'run-command',
    status: 'completed',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'pnpm test completed successfully',
    metadata: null,
    createdAt: 1_000,
    updatedAt: 2_000,
    lastEventAt: 2_500,
    completedAt: 2_500,
    ...overrides,
  }
}

function createEvent(overrides: Partial<AlicizationExecutionEventRecord> = {}): AlicizationExecutionEventRecord {
  return {
    id: 'event-1',
    threadId: 'thread-1',
    decisionTraceId: 'trace-1',
    turnId: 'turn-1',
    sessionId: 'session-1',
    origin: 'user-turn',
    channel: 'cli',
    kind: 'result',
    threadStatus: 'completed',
    payload: {
      stdout: 'all tests passed',
    },
    createdAt: 2_500,
    ...overrides,
  }
}

function parseSystemBlock(value: string) {
  return JSON.parse(value) as {
    type: string
    data: {
      alreadyExecuted: boolean
      callbacks: Array<Record<string, unknown>>
    }
  }
}

function createRuntime(input: {
  threads?: AlicizationTaskThreadRecord[]
  events?: AlicizationExecutionEventRecord[]
  now?: number
}) {
  return createAlicizationExecutionCallbackRuntime({
    getNow: () => input.now ?? 10_000,
    listTaskThreads: vi.fn(async () => input.threads ?? [createThread()]),
    listExecutionEvents: vi.fn(async () => input.events ?? [createEvent()]),
  })
}

describe('execution callback runtime', () => {
  it('surfaces fresh terminal task facts once per session window', async () => {
    const runtime = createRuntime({})

    const first = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const second = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    const system = parseSystemBlock(first.systemBlock)
    expect(system.type).toBe('alicization-execution-callbacks')
    expect(system.data.alreadyExecuted).toBe(true)
    expect(system.data.callbacks[0]).toEqual(expect.objectContaining({
      channel: 'cli',
      goal: 'Run the CLI check command',
      outcome: 'all tests passed',
      status: 'completed',
      summary: 'Completed Run the CLI check command: all tests passed',
    }))
    expect(first.recallText).toContain('execution_callback_channel:cli')
    expect(first.recallText).toContain('execution_callback_outcome:all tests passed')
    expect(second).toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('ignores stale or non-terminal task threads', async () => {
    const runtime = createRuntime({
      now: 60 * 60 * 1000,
      threads: [
        createThread({
          status: 'running',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: null,
        }),
        createThread({
          id: 'thread-stale',
          updatedAt: 1_000,
          lastEventAt: 1_000,
          completedAt: 1_000,
        }),
      ],
    })

    await expect(runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('supports marking a callback surfaced and non-consuming previews', async () => {
    const runtime = createRuntime({})

    const preview = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
      consume: false,
    })
    const consumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const afterConsumed = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(consumed.callbacks[0]).toEqual(preview.callbacks[0])
    expect(afterConsumed).toEqual(emptyAlicizationExecutionCallbackContext)

    const nextRuntime = createRuntime({})
    nextRuntime.markSurfaced({
      sessionId: 'session-1',
      createdAt: 2_500,
    })
    await expect(nextRuntime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })).resolves.toEqual(emptyAlicizationExecutionCallbackContext)
  })

  it('prefers event summary over raw stdout in recall facts', async () => {
    const runtime = createRuntime({
      events: [createEvent({
        payload: {
          stdout: 'total 12 drwxr-xr-x ...',
          summary: 'Listed desktop entries (2): 小砖猿, GIT',
        },
      })],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })

    expect(context.callbacks[0]?.outcome).toBe('Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).toContain('execution_callback_outcome:Listed desktop entries (2): 小砖猿, GIT')
    expect(context.recallText).not.toContain('drwxr-xr-x')
  })

  it('preserves blocked execution safety facts without persona cover', async () => {
    const runtime = createRuntime({
      threads: [createThread({
        status: 'blocked',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Edit local files without explicit confirmation',
        summary: 'Codex dispatch was blocked before process launch.',
      })],
      events: [createEvent({
        channel: 'codex',
        threadStatus: 'blocked',
        payload: {
          errorCode: 'CODEX_PERMISSION_REQUIRED',
          errorMessage: 'Mutating Codex dispatch requires permission before execution.',
          safetyGate: {
            effect: 'mutate',
            permissionMode: 'none',
            confirmationRequired: true,
            riskPolicy: 'implicit-or-explicit-confirmation-required',
            auditability: 'blocked-before-dispatch',
            interruptibility: 'no-process-started',
          },
        },
      })],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const system = parseSystemBlock(context.systemBlock)
    const callback = system.data.callbacks[0]

    expect(context.recallText).toContain('execution_callback_safety_gate:')
    expect(context.recallText).toContain('risk=implicit-or-explicit-confirmation-required')
    expect(context.recallText).toContain('confirmation=required')
    expect(callback.safetyGate).toEqual(expect.objectContaining({
      auditability: 'blocked-before-dispatch',
      confirmationRequired: true,
      interruptibility: 'no-process-started',
    }))
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      safetyGateSummary: expect.stringContaining('risk=implicit-or-explicit-confirmation-required'),
    }))
    expect(context.continuitySignals[0]?.metadata).toEqual(expect.objectContaining({
      safetyGateSummary: expect.stringContaining('interrupt=no-process-started'),
    }))
  })

  it('preserves host-confirmed resume facts without project-state cue text', async () => {
    const runtime = createRuntime({
      threads: [createThread({
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        goal: 'Resume confirmed local execution',
      })],
      events: [
        createEvent({
          id: 'event-resume-1',
          kind: 'resume',
          threadStatus: 'planned',
          createdAt: 2_300,
          payload: {
            approval: 'host-confirmed',
            previousStatus: 'needs-affirmation',
            resumedStatus: 'planned',
            previousPermissionMode: 'none',
            permissionMode: 'explicit',
            effect: 'mutate',
            riskBudget: 'medium',
            affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
            confirmationBoundary: 'host-confirmed-before-redispatch',
            auditability: 'resume-before-dispatch',
            interruptibility: 'process-not-yet-restarted',
            projectIdentity: 'legacy project identity',
            projectContinuityCue: 'retired_policy=legacy',
          },
        }),
        createEvent({
          id: 'event-result-1',
          kind: 'result',
          threadStatus: 'completed',
          createdAt: 2_500,
          payload: {
            summary: 'Resumed execution completed after host confirmation.',
          },
        }),
      ],
    })

    const context = await runtime.buildPendingExecutionCallbackContext({
      sessionId: 'session-1',
    })
    const system = parseSystemBlock(context.systemBlock)
    const callback = system.data.callbacks[0]

    expect(context.recallText).toContain('execution_callback_resume_confirmation:')
    expect(context.recallText).toContain('host-confirmed-before-redispatch')
    expect(context.recallText).toContain('resume-before-dispatch')
    expect(callback.resumeConfirmation).toEqual(expect.objectContaining({
      approval: 'host-confirmed',
      confirmationBoundary: 'host-confirmed-before-redispatch',
      interruptibility: 'process-not-yet-restarted',
    }))
    expect(JSON.stringify(callback)).not.toMatch(/legacy project identity|retired provider policy cue/iu)
    expect(context.actions[0]?.metadata).toEqual(expect.objectContaining({
      resumeConfirmationSummary: expect.stringContaining('host-confirmed-before-redispatch'),
    }))
  })
})
