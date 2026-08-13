import type { AlicizationTaskThreadRecord } from '../../../shared/eventa'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { locateAlicizationExecutionBinary } from './execution-command-env'
import { createAlicizationExecutorRuntime, inferPreferredProcedureChannel } from './executor-runtime'

const { probeOpenClawCapabilityMock, readOpenClawCapabilitySnapshotMock } = vi.hoisted(() => ({
  probeOpenClawCapabilityMock: vi.fn(),
  readOpenClawCapabilitySnapshotMock: vi.fn(),
}))

vi.mock('./executor-adapters/openclaw', () => ({
  probeOpenClawCapability: probeOpenClawCapabilityMock,
  readOpenClawCapabilitySnapshot: readOpenClawCapabilitySnapshotMock,
}))

vi.mock('./execution-command-env', () => ({
  locateAlicizationExecutionBinary: vi.fn(),
}))

function createNeedsAffirmationThread(): AlicizationTaskThreadRecord {
  return {
    id: 'thread-resume-affirmation-1',
    decisionTraceId: 'mind:trace:resume-affirmation-1',
    turnId: 'subconscious:resume-affirmation-1',
    sessionId: 'session-resume-affirmation-1',
    origin: 'subconscious-proactive',
    goal: 'Patch the current runtime after host approval.',
    kind: 'codebase-edit',
    status: 'needs-affirmation',
    selectedChannel: null,
    proposedChannel: 'codex',
    summary: 'Waiting for explicit host approval before applying the patch.',
    metadata: {
      task: {
        permissionMode: 'none',
        effect: 'mutate',
        riskBudget: 'medium',
        justification: 'grounded',
      },
      fabric: {
        affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: 100,
    completedAt: null,
  }
}

function createCapabilityManifest(overrides: Record<string, unknown> = {}) {
  return {
    channel: 'codex',
    available: true,
    enabled: true,
    ready: true,
    sessionAffinity: true,
    reason: null,
    metadata: {
      source: 'runtime-default-probe',
    },
    createdAt: 1,
    updatedAt: 1,
    lastCheckedAt: 1,
    ...overrides,
  }
}

function createDbState(
  initialThread: AlicizationTaskThreadRecord,
  initialCapabilityManifests: Array<Record<string, unknown>> = [],
) {
  let currentThread = initialThread
  const capabilityManifests = [...initialCapabilityManifests]
  const appendExecutionEvents = vi.fn(async (_events: unknown[]) => {})
  const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
    currentThread = {
      ...currentThread,
      ...input,
      metadata: input.metadata ?? currentThread.metadata,
    }
    return { ...currentThread }
  })
  const listChannelCapabilityManifests = vi.fn(async () => capabilityManifests.map(manifest => ({ ...manifest })))
  const upsertChannelCapabilityManifest = vi.fn(async (input: Record<string, unknown>) => {
    const index = capabilityManifests.findIndex(manifest => manifest.channel === input.channel)
    const existing = index >= 0 ? capabilityManifests[index] : null
    const row = {
      channel: input.channel,
      available: input.available !== false,
      enabled: input.enabled !== false,
      ready: input.ready !== false,
      sessionAffinity: input.sessionAffinity === true,
      reason: typeof input.reason === 'string' ? input.reason : null,
      metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : null,
      createdAt: existing?.createdAt ?? input.createdAt ?? Date.now(),
      updatedAt: input.updatedAt ?? Date.now(),
      lastCheckedAt: input.lastCheckedAt ?? input.updatedAt ?? Date.now(),
    }
    if (index >= 0)
      capabilityManifests[index] = row
    else
      capabilityManifests.push(row)
    return { ...row }
  })

  return {
    appendExecutionEvents,
    capabilityManifests,
    getCurrentThread: () => currentThread,
    listChannelCapabilityManifests,
    upsertChannelCapabilityManifest,
    upsertTaskThread,
    db: {
      appendExecutionEvents,
      getTaskThread,
      getLatestRelationshipDynamics: vi.fn(async () => null),
      listChannelCapabilityManifests,
      listExecutionEvents: vi.fn(async () => []),
      listRecentEpisodicEvents: vi.fn(async () => []),
      listExecutorSessions: vi.fn(async () => []),
      listTaskThreads: vi.fn(async () => []),
      searchMemoryConsolidations: vi.fn(async () => []),
      upsertChannelCapabilityManifest,
      upsertExecutorSession: vi.fn(async () => {}),
      upsertTaskThread,
    },
  }
}

function createRuntime(input: {
  appendAuditLog?: ReturnType<typeof vi.fn>
  dbState: ReturnType<typeof createDbState>
  dispatchTaskThread: ReturnType<typeof vi.fn>
  localCapabilities?: Array<Record<string, unknown>>
}) {
  return createAlicizationExecutorRuntime({
    appendAuditLog: input.appendAuditLog ?? vi.fn(async () => {}),
    dispatchTaskThread: input.dispatchTaskThread,
    ensureSessionId: async () => 'session-resume-affirmation-1',
    getAlicizationDb: () => input.dbState.db,
    getCardKillSwitchState: () => 'ACTIVE',
    getGlobalKillSwitchState: () => 'ACTIVE',
    normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
    resolveLocalCapabilityChannels: input.localCapabilities
      ? async () => input.localCapabilities as any
      : undefined,
    sanitizeText: (raw: unknown, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
  } as any)
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return {
    promise,
    reject,
    resolve,
  }
}

function resetCapabilityProbeMocks() {
  vi.mocked(locateAlicizationExecutionBinary).mockReset()
  probeOpenClawCapabilityMock.mockReset()
  readOpenClawCapabilitySnapshotMock.mockReset()
  vi.mocked(locateAlicizationExecutionBinary).mockResolvedValue(null)
  probeOpenClawCapabilityMock.mockResolvedValue({
    channel: 'openclaw',
    available: false,
    enabled: false,
    ready: false,
    sessionAffinity: true,
    reason: 'openclaw-not-configured',
  })
  readOpenClawCapabilitySnapshotMock.mockReturnValue({
    channel: 'openclaw',
    available: false,
    enabled: false,
    ready: false,
    sessionAffinity: true,
    reason: 'openclaw-not-configured',
  })
}

afterEach(() => {
  vi.useRealTimers()
  resetCapabilityProbeMocks()
})

describe('executor runtime inferPreferredProcedureChannel', () => {
  it('uses a typed selected channel for remembered procedures', () => {
    expect(inferPreferredProcedureChannel({
      selectedChannel: 'browser',
      proposedChannel: 'desktop',
    }))
      .toEqual({
        channel: 'browser',
        reason: 'remembered-procedure-selected-channel',
      })
  })

  it('uses typed metadata instead of procedure prose', () => {
    expect(inferPreferredProcedureChannel({
      metadata: {
        preferredChannel: 'desktop',
      },
    }))
      .toEqual({
        channel: 'desktop',
        reason: 'remembered-procedure-metadata-channel',
      })

    expect(inferPreferredProcedureChannel({
      summary: 'Open the browser page with Codex, then switch to the desktop window.',
    })).toBeNull()
  })
})

describe('executor runtime capability resolution', () => {
  beforeEach(() => {
    vi.useRealTimers()
    resetCapabilityProbeMocks()
  })

  it('merges local visual capabilities into planning and prompt probes', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const localCapabilities = [
      { channel: 'browser', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'software', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'desktop', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
    ]
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread: vi.fn(),
      localCapabilities,
    })

    const planningCapabilities = await runtime.resolveTaskPlanningCapabilities()
    const promptCapabilities = await runtime.resolveExecutionCapabilitiesForPrompt()

    expect(planningCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'browser', ready: true }),
      expect.objectContaining({ channel: 'software', ready: true }),
      expect.objectContaining({ channel: 'desktop', ready: true }),
    ]))
    expect(promptCapabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'browser', ready: true }),
      expect.objectContaining({ channel: 'software', ready: true }),
      expect.objectContaining({ channel: 'desktop', ready: true }),
    ]))
  })

  it('reuses fresh persisted manifests without probing executors again', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'))
    const dbState = createDbState(createNeedsAffirmationThread(), [
      createCapabilityManifest({
        lastCheckedAt: Date.now() - 45_000,
        updatedAt: Date.now() - 45_000,
      }),
    ])
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread: vi.fn(),
    })

    const capabilities = await runtime.resolveTaskPlanningCapabilities()

    expect(capabilities).toEqual([
      expect.objectContaining({
        channel: 'codex',
        ready: true,
      }),
    ])
    expect(locateAlicizationExecutionBinary).not.toHaveBeenCalled()
    expect(dbState.upsertChannelCapabilityManifest).not.toHaveBeenCalled()
  })

  it('re-probes and persists an expired manifest snapshot', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'))
    vi.mocked(locateAlicizationExecutionBinary).mockImplementation(async binary => `/usr/local/bin/${binary}`)
    const dbState = createDbState(createNeedsAffirmationThread(), [
      createCapabilityManifest({
        available: false,
        enabled: false,
        ready: false,
        reason: 'codex-binary-missing',
        lastCheckedAt: Date.now() - 45_001,
        updatedAt: Date.now() - 45_001,
      }),
    ])
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread: vi.fn(),
    })

    const capabilities = await runtime.resolveTaskPlanningCapabilities()

    expect(locateAlicizationExecutionBinary).toHaveBeenCalledTimes(2)
    expect(capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'codex',
        ready: true,
      }),
    ]))
    expect(dbState.upsertChannelCapabilityManifest).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'codex',
      ready: true,
      lastCheckedAt: Date.now(),
      metadata: {
        source: 'runtime-default-probe',
      },
    }))
  })

  it('persists and audits a transparent diagnostic when an expired capability probe fails', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'))
    vi.mocked(locateAlicizationExecutionBinary).mockImplementation(async (binary) => {
      if (binary === 'codex')
        throw new Error('probe permission denied')
      return `/usr/local/bin/${binary}`
    })
    const appendAuditLog = vi.fn(async () => {})
    const dbState = createDbState(createNeedsAffirmationThread(), [
      createCapabilityManifest({
        lastCheckedAt: Date.now() - 45_001,
        updatedAt: Date.now() - 45_001,
      }),
    ])
    const runtime = createRuntime({
      appendAuditLog,
      dbState,
      dispatchTaskThread: vi.fn(),
    })

    const capabilities = await runtime.resolveTaskPlanningCapabilities()

    expect(capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        channel: 'codex',
        available: false,
        enabled: false,
        ready: false,
        reason: 'codex-capability-probe-failed: probe permission denied',
      }),
    ]))
    expect(dbState.upsertChannelCapabilityManifest).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'codex',
      ready: false,
      reason: 'codex-capability-probe-failed: probe permission denied',
      lastCheckedAt: Date.now(),
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      category: 'alicization.executor.capability-manifest',
      action: 'probe-failed',
      payload: expect.objectContaining({
        channel: 'codex',
        reason: 'probe permission denied',
      }),
    }))
  })
})

describe('executor runtime executeMainGatewayTaskThread', () => {
  it('marks synchronous Provider-owned dispatches as inline result delivery', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn(async (invocation: any) => ({
      ok: true,
      summary: 'inline Codex completed',
      thread: {
        ...await invocation.port.getTaskThread(invocation.input.threadId),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['dispatch', 'result'],
      finalStatus: 'completed',
      output: 'completed inline',
    }))
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread,
      localCapabilities: [{
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
        reason: null,
      }],
    })

    await runtime.executeMainGatewayTaskThread({
      context: {
        cardId: 'default',
        turnId: 'turn-inline-codex',
        decisionTraceId: 'trace-inline-codex',
        sessionId: 'session-inline-codex',
        toolCallId: 'codex-inline-call-1',
      },
      task: {
        kind: 'codebase-investigation',
        goal: 'Inspect the repository inline.',
        origin: 'user',
        effect: 'observe',
        permissionMode: 'implicit',
        justification: 'grounded',
        riskBudget: 'low',
        requestedChannel: 'codex',
        prefersPersistentSession: true,
        requiresVisualGrounding: false,
      },
      dispatch: {
        codex: {
          prompt: 'Inspect the repository without modifying files.',
          sandbox: 'read-only',
        },
      },
    } as any)

    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      resultDeliveryMode: 'inline',
    }))
  })

  it('returns an accepted Codex task without synchronously waiting for background dispatch', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const providerController = new AbortController()
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread,
      localCapabilities: [{
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
        reason: null,
      }],
    })

    const resultPromise = runtime.executeMainGatewayTaskThread({
      context: {
        cardId: 'default',
        turnId: 'turn-background-codex',
        decisionTraceId: 'trace-background-codex',
        sessionId: 'session-background-codex',
        toolCallId: 'codex-background-call-1',
      },
      abortSignal: providerController.signal,
      dispatchMode: 'background',
      task: {
        kind: 'codebase-investigation',
        goal: 'Inspect disk usage without blocking the dialogue turn.',
        origin: 'user',
        effect: 'observe',
        permissionMode: 'implicit',
        justification: 'grounded',
        riskBudget: 'low',
        requestedChannel: 'codex',
        prefersPersistentSession: true,
        requiresVisualGrounding: false,
      },
      dispatch: {
        codex: {
          prompt: 'Inspect disk usage without modifying files.',
          sandbox: 'read-only',
        },
      },
    } as any)

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)

    const earlyResult = await Promise.race([
      resultPromise,
      new Promise<'still-waiting'>(resolve => setTimeout(() => resolve('still-waiting'), 20)),
    ])
    expect(earlyResult).not.toBe('still-waiting')
    expect(earlyResult).toMatchObject({
      accepted: true,
      ok: true,
      stage: 'dispatch',
      thread: {
        selectedChannel: 'codex',
        status: 'planned',
        metadata: {
          governor: expect.objectContaining({
            canonicalToolCallId: 'codex-background-call-1',
          }),
        },
      },
    })
    providerController.abort('provider-turn-ended')
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      resultDeliveryMode: 'callback',
      input: expect.not.objectContaining({
        abortSignal: expect.anything(),
        onExecutionEvent: expect.anything(),
      }),
    }))

    const plannedThread = await dbState.db.getTaskThread(
      (earlyResult as any).thread.id,
    )
    deferredDispatch.resolve({
      ok: true,
      summary: 'background Codex completed',
      thread: {
        ...plannedThread,
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['dispatch', 'result'],
      output: 'completed later',
    })
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  })

  it('persists a failed terminal thread when an accepted background dispatch rejects', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn(async () => {
      throw Object.assign(
        new Error('Task-thread orchestrator stopped before dispatch began.'),
        {
          code: 'TASK_THREAD_ORCHESTRATOR_DISPOSED',
        },
      )
    })
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread,
      localCapabilities: [{
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
        reason: null,
      }],
    })

    const accepted = await runtime.executeMainGatewayTaskThread({
      context: {
        cardId: 'default',
        turnId: 'turn-background-reject',
        decisionTraceId: 'trace-background-reject',
        sessionId: 'session-background-reject',
        toolCallId: 'codex-background-reject-call-1',
      },
      dispatchMode: 'background',
      task: {
        kind: 'codebase-investigation',
        goal: 'Inspect the repository in the background.',
        origin: 'user',
        effect: 'observe',
        permissionMode: 'implicit',
        justification: 'grounded',
        riskBudget: 'low',
        requestedChannel: 'codex',
        prefersPersistentSession: true,
        requiresVisualGrounding: false,
      },
      dispatch: {
        codex: {
          prompt: 'Inspect the repository.',
          sandbox: 'read-only',
        },
      },
    } as any)

    expect(accepted).toMatchObject({
      accepted: true,
      ok: true,
      thread: {
        status: 'planned',
      },
    })
    for (let attempt = 0; attempt < 50 && dbState.getCurrentThread().status !== 'failed'; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))

    expect(dbState.getCurrentThread()).toMatchObject({
      id: accepted.thread.id,
      status: 'failed',
      completedAt: expect.any(Number),
    })
    expect(dbState.appendExecutionEvents.mock.calls.flatMap(([events]) => events)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threadId: accepted.thread.id,
          kind: 'result',
          threadStatus: 'failed',
          payload: expect.objectContaining({
            failureKind: 'tool-execution',
            errorCode: 'TASK_THREAD_ORCHESTRATOR_DISPOSED',
            errorMessage: 'Task-thread orchestrator stopped before dispatch began.',
          }),
        }),
      ]),
    )
  })
})

describe('executor runtime resumeMainGatewayTaskThread', () => {
  it('rejects a resume without an expected channel before changing the persisted task thread', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
    } as any)

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_RESUME_CHANNEL_REQUIRED',
      errorMessage: 'Task thread resume requires an expected execution channel.',
    })
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
    expect(dbState.appendExecutionEvents).not.toHaveBeenCalled()
  })

  it('rejects cross-channel resume before changing the persisted task thread', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'cli',
    } as any)

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_RESUME_CHANNEL_MISMATCH',
      errorMessage: 'This task thread belongs to codex and cannot be resumed through cli.',
    })
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
    expect(dbState.appendExecutionEvents).not.toHaveBeenCalled()
  })

  it('rejects an unsupported resume channel without recording host approval', async () => {
    const unsupportedThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      id: 'thread-resume-openfang-unsupported',
      proposedChannel: 'openfang',
    }
    const dbState = createDbState(unsupportedThread)
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: unsupportedThread.id,
      expectedChannel: 'openfang',
    })

    expect(result).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_RESUME_UNSUPPORTED_CHANNEL',
      thread: {
        id: unsupportedThread.id,
        status: 'needs-affirmation',
      },
    })
    expect(dbState.getCurrentThread()).toEqual(unsupportedThread)
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
    expect(dbState.appendExecutionEvents).not.toHaveBeenCalled()
  })

  it('returns a stable cancellation without recording approval when abort wins during thread lookup', async () => {
    const originalThread = createNeedsAffirmationThread()
    const dbState = createDbState(originalThread)
    const deferredThreadRead = createDeferred<AlicizationTaskThreadRecord | undefined>()
    dbState.db.getTaskThread = vi.fn(async () => await deferredThreadRead.promise)
    const dispatchTaskThread = vi.fn()
    const abortController = new AbortController()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const resultPromise = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: originalThread.id,
      expectedChannel: 'codex',
      abortSignal: abortController.signal,
    })
    abortController.abort('host-cancelled-resume')
    deferredThreadRead.resolve(originalThread)

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'cancelled',
      errorCode: 'TASK_THREAD_RESUME_ABORTED',
      errorMessage: 'host-cancelled-resume',
      thread: {
        id: originalThread.id,
        status: 'needs-affirmation',
      },
      plan: {
        state: 'blocked',
        proposedChannel: 'codex',
      },
    })
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(dbState.getCurrentThread()).toEqual(originalThread)
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
    expect(dbState.appendExecutionEvents).not.toHaveBeenCalled()
  })

  it('forwards the Codex progress observer during inline resume dispatch', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const onExecutionEvent = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const resultPromise = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
      onExecutionEvent,
    } as any)

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        onExecutionEvent,
      }),
    }))

    deferredDispatch.resolve({
      ok: true,
      summary: 'resumed Codex completed',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['resume', 'result'],
      finalStatus: 'completed',
      output: 'completed',
    })
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
  })

  it('accepts a resumed Codex task in the background without inheriting the Provider abort signal', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const providerController = new AbortController()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const resultPromise = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
      abortSignal: providerController.signal,
      dispatchMode: 'background',
    } as any)

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)

    const earlyResult = await Promise.race([
      resultPromise,
      new Promise<'still-waiting'>(resolve => setTimeout(() => resolve('still-waiting'), 20)),
    ])
    expect(earlyResult).not.toBe('still-waiting')
    expect(earlyResult).toMatchObject({
      accepted: true,
      ok: true,
      finalStatus: null,
      stage: 'dispatch',
      thread: {
        id: 'thread-resume-affirmation-1',
        selectedChannel: 'codex',
        status: 'planned',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'codex',
      },
    })

    providerController.abort('provider-turn-ended')
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.not.objectContaining({
        abortSignal: expect.anything(),
      }),
    }))

    deferredDispatch.resolve({
      ok: true,
      summary: 'resumed Codex completed later',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['dispatch', 'result'],
      output: 'completed later',
    })
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  })

  it('persists a failed terminal thread when an accepted background resume rejects', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn(async () => {
      throw Object.assign(
        new Error('Codex resume dispatch was rejected by the orchestrator.'),
        {
          code: 'TASK_THREAD_RESUME_DISPATCH_REJECTED',
        },
      )
    })
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const accepted = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
      dispatchMode: 'background',
    } as any)

    expect(accepted).toMatchObject({
      accepted: true,
      ok: true,
      thread: {
        status: 'planned',
      },
    })
    for (let attempt = 0; attempt < 50 && dbState.getCurrentThread().status !== 'failed'; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))

    expect(dbState.getCurrentThread()).toMatchObject({
      id: accepted.thread.id,
      status: 'failed',
      completedAt: expect.any(Number),
    })
    expect(dbState.appendExecutionEvents.mock.calls.flatMap(([events]) => events)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threadId: accepted.thread.id,
          kind: 'result',
          threadStatus: 'failed',
          payload: expect.objectContaining({
            failureKind: 'tool-execution',
            errorCode: 'TASK_THREAD_RESUME_DISPATCH_REJECTED',
            errorMessage: 'Codex resume dispatch was rejected by the orchestrator.',
          }),
        }),
      ]),
    )
  })

  it('shares one dispatch and one resume event across concurrent resume calls', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const runtime = createRuntime({ dbState, dispatchTaskThread })
    const input = {
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex' as const,
    }

    const first = runtime.resumeMainGatewayTaskThread(input)
    const second = runtime.resumeMainGatewayTaskThread(input)

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(first).toBe(second)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    expect(dbState.appendExecutionEvents).toHaveBeenCalledTimes(1)

    deferredDispatch.resolve({
      ok: true,
      summary: 'Concurrent resume completed once.',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['resume', 'result'],
      finalStatus: 'completed',
      output: 'completed',
    })

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({
        ok: true,
        finalStatus: 'completed',
      }),
      expect.objectContaining({
        ok: true,
        finalStatus: 'completed',
      }),
    ])
  })

  it('does not reuse an in-flight Codex resume for a concurrent CLI resume', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const codexResume = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
    })

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))

    const cliResume = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'cli',
    })
    const cliResult = await Promise.race([
      cliResume,
      new Promise<'still-waiting'>(resolve => setTimeout(() => resolve('still-waiting'), 20)),
    ])

    deferredDispatch.resolve({
      ok: true,
      summary: 'Codex resume completed.',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['resume', 'result'],
      finalStatus: 'completed',
      output: 'completed',
    })

    expect(cliResume).not.toBe(codexResume)
    expect(cliResult).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_RESUME_CHANNEL_MISMATCH',
    })
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    await expect(codexResume).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
  })

  it('rejects a missing expected channel before consulting an in-flight resume or the database', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const codexResume = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
    })

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    const getTaskThreadCallsBeforeMissingChannel = dbState.db.getTaskThread.mock.calls.length

    const missingChannelResume = runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
    } as any)
    const missingChannelResult = await Promise.race([
      missingChannelResume,
      new Promise<'still-waiting'>(resolve => setTimeout(() => resolve('still-waiting'), 20)),
    ])

    deferredDispatch.resolve({
      ok: true,
      summary: 'Codex resume completed.',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: Date.now(),
      },
      createdEventKinds: ['resume', 'result'],
      finalStatus: 'completed',
      output: 'completed',
    })

    expect(missingChannelResume).not.toBe(codexResume)
    expect(missingChannelResult).toMatchObject({
      ok: false,
      errorCode: 'TASK_THREAD_RESUME_CHANNEL_REQUIRED',
    })
    expect(dbState.db.getTaskThread).toHaveBeenCalledTimes(getTaskThreadCallsBeforeMissingChannel)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    await expect(codexResume).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
  })

  it('promotes permission and redispatches a clean Codex task prompt', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    let dispatchedPrompt = ''
    const dispatchTaskThread = vi.fn(async ({ port, input }: any) => {
      const resumedThread = await port.getTaskThread(input.threadId)
      dispatchedPrompt = String(input.codex?.prompt ?? '')
      expect((resumedThread?.metadata as any)?.task?.permissionMode).toBe('explicit')
      return {
        ok: true,
        summary: 'Codex resumed after explicit host approval.',
        thread: {
          ...resumedThread,
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'patched',
      }
    })
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
    })

    expect(result.ok).toBe(true)
    expect(dispatchedPrompt).toContain('Goal: Patch the current runtime after host approval.')
    expect(dispatchedPrompt).toContain('Summary: Waiting for explicit host approval before applying the patch.')
    expect(dispatchedPrompt).toContain('failure-transparency:required')
    expect(dbState.upsertTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      status: 'planned',
      selectedChannel: 'codex',
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          permissionMode: 'explicit',
        }),
      }),
    }))
  })

  it('records only confirmation, permission, risk, and audit facts in the resume event', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn(async () => ({
      ok: true,
      summary: 'Codex resumed after explicit host approval.',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
      },
      createdEventKinds: ['dispatch', 'result'],
      output: 'patched',
    }))
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: dbState.getCurrentThread().id,
      expectedChannel: 'codex',
    })

    const events = (dbState.appendExecutionEvents.mock.calls as unknown[][]).at(0)?.[0] as any[]
    const event = events?.[0]
    expect(event).toEqual(expect.objectContaining({
      kind: 'resume',
      channel: 'codex',
      payload: expect.objectContaining({
        approval: 'host-confirmed',
        previousStatus: 'needs-affirmation',
        resumedStatus: 'planned',
        previousPermissionMode: 'none',
        permissionMode: 'explicit',
        effect: 'mutate',
        riskBudget: 'medium',
        confirmationBoundary: 'host-confirmed-before-redispatch',
        auditability: 'resume-before-dispatch',
        interruptibility: 'process-not-yet-restarted',
      }),
    }))
  })

  it('redispatches browser threads through local visual instructions without project governance cues', async () => {
    const browserThread: AlicizationTaskThreadRecord = {
      ...createNeedsAffirmationThread(),
      id: 'thread-resume-browser-1',
      goal: 'Continue submitting the visible browser form.',
      kind: 'browser-automation',
      status: 'planned',
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      summary: 'Continue from the visible form step.',
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
          riskBudget: 'medium',
          justification: 'grounded',
        },
      },
    }
    const dbState = createDbState(browserThread)
    let instruction = ''
    const dispatchTaskThread = vi.fn(async ({ input }: any) => {
      instruction = String(input.localVisual?.instruction ?? '')
      expect(input.openclaw).toBeUndefined()
      return {
        ok: true,
        summary: 'Browser execution resumed locally.',
        thread: {
          ...dbState.getCurrentThread(),
          status: 'completed',
        },
        createdEventKinds: ['dispatch', 'result'],
        output: 'submitted',
      }
    })
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: browserThread.id,
      expectedChannel: 'browser',
    })

    expect(result.ok).toBe(true)
    expect(instruction).toContain('Goal: Continue submitting the visible browser form.')
    expect(instruction).toContain('Summary: Continue from the visible form step.')
  })
})
