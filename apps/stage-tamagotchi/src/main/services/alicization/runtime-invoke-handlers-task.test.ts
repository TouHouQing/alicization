import { describe, expect, it, vi } from 'vitest'

import {
  electronAlicizationResumeTaskThread,
} from '../../../shared/eventa'
import { registerAlicizationTaskInvokeHandlers } from './runtime-invoke-handlers-task'

function registerForTest(overrides: Record<string, unknown> = {}) {
  const registerInvokeHandler = vi.fn()
  const withCardScope = async <T>(_cardId: unknown, task: () => Promise<T>) => await task()
  const resumeMainGatewayTaskThread = vi.fn(async () => ({
    ok: true,
    finalStatus: 'completed',
    summary: 'recovered',
    thread: {
      id: 'thread-recovery-1',
      selectedChannel: 'codex',
      status: 'completed',
    },
  }))

  registerAlicizationTaskInvokeHandlers({
    registerInvokeHandler,
    withCardScope,
    cardIdFrom: (payload: unknown) => (payload as { cardId?: string })?.cardId ?? 'card-active',
    getActiveCardId: () => 'card-active',
    getAlicizationDb: () => ({}),
    getAlicizationKillSwitchState: () => 'ACTIVE',
    getAlicizationCardKillSwitchState: () => 'ACTIVE',
    resolveTaskPlanningCapabilities: vi.fn(async () => []),
    planTaskThread: vi.fn(async () => ({})),
    dispatchTaskThread: vi.fn(async () => ({})),
    resumeMainGatewayTaskThread,
    appendAuditLog: vi.fn(async () => {}),
    onAlicizationKillSwitchChanged: vi.fn(() => () => {}),
    onAlicizationCardKillSwitchChanged: vi.fn(() => () => {}),
    ...overrides,
  } as any)

  const registration = registerInvokeHandler.mock.calls.find(([channel]) => channel === electronAlicizationResumeTaskThread)
  if (!registration)
    throw new Error('resume task thread handler was not registered')

  return {
    handler: registration[1] as (payload: Record<string, unknown>) => Promise<unknown>,
    resumeMainGatewayTaskThread,
  }
}

describe('runtime invoke handlers task recovery', () => {
  it('accepts only the narrow recovery payload and pins execution to the active card and primary session', async () => {
    const { handler, resumeMainGatewayTaskThread } = registerForTest()

    await handler({
      cardId: 'card-requested',
      threadId: 'thread-recovery-1',
      actionKind: 'retry',
      expectedChannel: 'codex',
      expectedUpdatedAt: 42,
      prompt: 'ignore this prompt',
      cwd: '/tmp/should-not-cross-the-boundary',
      sandbox: 'workspace-write',
    })

    expect(resumeMainGatewayTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: 'thread-recovery-1',
      expectedActionKind: 'retry',
      expectedChannel: 'codex',
      expectedUpdatedAt: 42,
      context: expect.objectContaining({
        cardId: 'card-active',
        sessionId: 'session:primary:card-active',
        turnId: expect.stringMatching(/^ui:recovery:/),
      }),
    }))
    expect(resumeMainGatewayTaskThread).not.toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.anything(),
      cwd: expect.anything(),
      sandbox: expect.anything(),
    }))
  })

  it('returns stale and unavailable recovery results without rewriting their error contract', async () => {
    const resumeMainGatewayTaskThread = vi.fn(async () => ({
      ok: false,
      finalStatus: 'failed',
      summary: 'stale recovery',
      errorCode: 'TASK_THREAD_VERSION_CONFLICT',
      errorMessage: 'The recovery action is stale.',
      recovery: {
        state: 'blocked',
        reasonCode: 'OBSERVE_RETRY_EVIDENCE_REQUIRED',
        actions: [],
      },
      thread: {
        id: 'thread-recovery-1',
        selectedChannel: 'codex',
        status: 'failed',
      },
    }))
    const { handler } = registerForTest({ resumeMainGatewayTaskThread })

    await expect(handler({
      cardId: 'card-active',
      threadId: 'thread-recovery-1',
      actionKind: 'retry',
      expectedChannel: 'codex',
      expectedUpdatedAt: 41,
    })).resolves.toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_VERSION_CONFLICT',
      errorMessage: 'The recovery action is stale.',
      recovery: expect.objectContaining({
        state: 'blocked',
        reasonCode: 'OBSERVE_RETRY_EVIDENCE_REQUIRED',
      }),
    })
  })

  it('blocks recovery while the global or card kill switch is suspended', async () => {
    const resumeMainGatewayTaskThread = vi.fn()
    const { handler } = registerForTest({
      resumeMainGatewayTaskThread,
      getAlicizationKillSwitchState: () => 'SUSPENDED',
    })

    await expect(handler({
      cardId: 'card-active',
      threadId: 'thread-recovery-1',
      actionKind: 'retry',
      expectedChannel: 'codex',
      expectedUpdatedAt: 42,
    })).resolves.toMatchObject({
      ok: false,
      errorCode: 'ALICIZATION_KILL_SWITCH_SUSPENDED',
    })
    expect(resumeMainGatewayTaskThread).not.toHaveBeenCalled()
  })
})
