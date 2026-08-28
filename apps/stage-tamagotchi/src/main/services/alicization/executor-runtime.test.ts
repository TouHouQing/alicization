import type { AlicizationExecutionEventInput, AlicizationExecutionEventRecord, AlicizationTaskThreadRecord, AlicizationTaskThreadUpsertInput } from '../../../shared/eventa'

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

function createPausedThread(): AlicizationTaskThreadRecord {
  return {
    ...createNeedsAffirmationThread(),
    id: 'thread-resume-paused-1',
    decisionTraceId: 'mind:trace:resume-paused-1',
    turnId: 'subconscious:resume-paused-1',
    sessionId: 'session-resume-paused-1',
    status: 'paused',
    selectedChannel: 'codex',
    summary: 'Execution paused until side effects can be reconciled.',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
        riskBudget: 'medium',
        justification: 'grounded',
      },
    },
  }
}

function createFailedObserveThread(): AlicizationTaskThreadRecord {
  return {
    ...createNeedsAffirmationThread(),
    id: 'thread-retry-observe-1',
    decisionTraceId: 'mind:trace:retry-observe-1',
    turnId: 'turn-retry-observe-1',
    sessionId: 'session-retry-observe-1',
    origin: 'user-turn',
    goal: 'Inspect the repository after the Codex process timed out.',
    kind: 'codebase-investigation',
    status: 'failed',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'Codex timed out before returning the investigation result.',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'observe',
        riskBudget: 'low',
        justification: 'grounded',
      },
    },
    createdAt: 100,
    updatedAt: 240,
    lastEventAt: 240,
    completedAt: 240,
  }
}

function createFailedMutatingThread(): AlicizationTaskThreadRecord {
  return {
    ...createNeedsAffirmationThread(),
    id: 'thread-failed-mutation-1',
    decisionTraceId: 'mind:trace:failed-mutation-1',
    turnId: 'turn-failed-mutation-1',
    sessionId: 'session-failed-mutation-1',
    origin: 'user-turn',
    goal: 'Apply the repository patch exactly once.',
    kind: 'codebase-edit',
    status: 'failed',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'Codex failed after mutation dispatch state became unclear.',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
        riskBudget: 'medium',
        justification: 'grounded',
      },
    },
    createdAt: 100,
    updatedAt: 260,
    lastEventAt: 260,
    completedAt: 260,
  }
}

function createFailureEvent(
  thread: AlicizationTaskThreadRecord,
  overrides: Record<string, unknown> = {},
): AlicizationExecutionEventRecord {
  return {
    id: `${thread.id}:failure`,
    threadId: thread.id,
    decisionTraceId: thread.decisionTraceId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    origin: thread.origin,
    channel: thread.selectedChannel,
    kind: 'result',
    threadStatus: thread.status,
    payload: {
      failureKind: 'tool-execution',
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: thread.summary,
      sideEffectState: 'none',
      effect: 'observe',
      ...overrides,
    },
    createdAt: thread.updatedAt,
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
  initialExecutionEvents: AlicizationExecutionEventRecord[] = [],
) {
  let currentThread = initialThread
  const capabilityManifests = [...initialCapabilityManifests]
  const executionEvents = [...initialExecutionEvents]
  const appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
    executionEvents.push(...events.map(event => ({
      id: event.id ?? `${event.threadId}:${event.kind}:${event.createdAt ?? Date.now()}`,
      threadId: event.threadId,
      decisionTraceId: event.decisionTraceId ?? null,
      turnId: event.turnId ?? null,
      sessionId: event.sessionId ?? null,
      origin: event.origin ?? 'user-turn',
      channel: event.channel ?? null,
      kind: event.kind,
      threadStatus: event.threadStatus ?? null,
      payload: event.payload ?? null,
      createdAt: event.createdAt ?? Date.now(),
    })))
  })
  const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
    currentThread = {
      ...currentThread,
      ...input,
      id: input.id ?? currentThread.id,
      metadata: input.metadata ?? currentThread.metadata,
    }
    return { ...currentThread }
  })
  const resumeTaskThread = vi.fn(async (input: {
    event: AlicizationExecutionEventInput
    expectedChannel: string
    expectedStatus: string
    expectedUpdatedAt: number
    metadata: Record<string, unknown> | null
    selectedChannel: string
    threadId: string
    updatedAt: number
  }) => {
    if (
      input.threadId !== currentThread.id
      || input.expectedUpdatedAt !== currentThread.updatedAt
      || input.expectedStatus !== currentThread.status
      || input.expectedChannel !== (currentThread.selectedChannel ?? currentThread.proposedChannel)
    ) {
      throw Object.assign(new Error('Task thread changed before resume.'), {
        code: 'TASK_THREAD_VERSION_CONFLICT',
      })
    }
    await upsertTaskThread({
      ...currentThread,
      status: 'planned',
      selectedChannel: input.selectedChannel as AlicizationTaskThreadRecord['selectedChannel'],
      metadata: input.metadata,
      updatedAt: input.updatedAt,
      completedAt: null,
      expectedUpdatedAt: currentThread.updatedAt,
    })
    await appendExecutionEvents([input.event])
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
    resumeTaskThread,
    upsertChannelCapabilityManifest,
    upsertTaskThread,
    db: {
      appendExecutionEvents,
      getTaskThread,
      getLatestRelationshipDynamics: vi.fn(async () => null),
      listChannelCapabilityManifests,
      listExecutionEvents: vi.fn(async (input?: { threadId?: string, limit?: number }) => {
        const threadId = typeof input?.threadId === 'string' ? input.threadId : ''
        const limit = typeof input?.limit === 'number' && Number.isFinite(input.limit)
          ? Math.max(1, Math.floor(input.limit))
          : executionEvents.length
        return executionEvents
          .filter(event => !threadId || event.threadId === threadId)
          .slice(-limit)
      }),
      listRecentEpisodicEvents: vi.fn(async () => []),
      listExecutorSessions: vi.fn(async () => []),
      listTaskThreads: vi.fn(async () => []),
      resumeTaskThread,
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

describe('executor runtime remembered execution procedures', () => {
  beforeEach(() => {
    resetCapabilityProbeMocks()
  })

  it('admits only completed execution threads into reusable planning memory', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const statuses = ['completed', 'failed', 'cancelled', 'blocked', 'running', 'paused'] as const
    const executionThreads = statuses.map((status, index): AlicizationTaskThreadRecord => ({
      id: `thread-procedure-${status}`,
      decisionTraceId: `mind:trace:procedure-${status}`,
      turnId: `turn-procedure-${status}`,
      sessionId: `session-procedure-${status}`,
      origin: 'user-turn',
      goal: 'Inspect repository memory planner regression.',
      kind: 'codebase-investigation',
      status,
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      summary: `${status} repository memory planner inspection`,
      metadata: null,
      createdAt: 100 + index,
      updatedAt: 200 + index,
      lastEventAt: 200 + index,
      completedAt: status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'blocked'
        ? 200 + index
        : null,
    }))
    dbState.db.listTaskThreads = vi.fn(async (input?: { status?: unknown }) => (
      input?.status ? [] : executionThreads
    )) as any
    dbState.db.listExecutionEvents = vi.fn(async (input?: { threadId?: string }) => {
      const thread = executionThreads.find(candidate => candidate.id === input?.threadId)
      if (!thread)
        return []
      return [{
        id: `event-${thread.id}`,
        threadId: thread.id,
        decisionTraceId: thread.decisionTraceId,
        turnId: thread.turnId,
        sessionId: thread.sessionId,
        origin: thread.origin,
        channel: thread.selectedChannel,
        kind: thread.status === 'cancelled' ? 'cancel' : 'result',
        threadStatus: thread.status,
        payload: {
          summary: thread.summary,
        },
        createdAt: thread.updatedAt,
      }]
    }) as any
    const runtime = createRuntime({
      dbState,
      dispatchTaskThread: vi.fn(),
    })

    const planning = await runtime.planTaskThread({
      threadId: 'thread-current-planning',
      trace: {
        decisionTraceId: 'mind:trace:current-planning',
        turnId: 'turn-current-planning',
        sessionId: 'session-current-planning',
        origin: 'user-turn',
      },
      task: {
        kind: 'codebase-investigation',
        goal: 'Inspect repository memory planner regression.',
        origin: 'user',
        effect: 'observe',
        requestedChannel: 'codex',
      },
      capabilities: [{
        channel: 'codex',
        available: true,
        enabled: true,
        ready: true,
        sessionAffinity: true,
      }],
      now: 1_710_000_000_000,
    })

    const metadata = planning.thread.metadata as {
      fabric?: {
        experience?: {
          rememberedProcedures?: Array<{ id?: string }>
        }
      }
    } | null
    const rememberedIds = metadata?.fabric?.experience?.rememberedProcedures
      ?.map(item => item.id)
      ?? []

    expect(rememberedIds).toEqual(['execution-trace:thread-procedure-completed'])
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
  beforeEach(() => {
    resetCapabilityProbeMocks()
  })

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

  it('projects observe-only recovery after an inline dispatch fails', async () => {
    const dbState = createDbState(createNeedsAffirmationThread())
    const dispatchTaskThread = vi.fn(async (invocation: any) => {
      const plannedThread = await invocation.port.getTaskThread(invocation.input.threadId)
      await invocation.port.appendExecutionEvents([{
        id: `${plannedThread.id}:inline-failure`,
        attemptId: plannedThread.attemptId,
        threadId: plannedThread.id,
        decisionTraceId: plannedThread.decisionTraceId,
        turnId: plannedThread.turnId,
        sessionId: plannedThread.sessionId,
        origin: plannedThread.origin,
        channel: plannedThread.selectedChannel,
        kind: 'result',
        threadStatus: 'failed',
        payload: {
          failureKind: 'tool-execution',
          errorCode: 'CODEX_TIMEOUT',
          errorMessage: 'The inline inspection timed out.',
          sideEffectState: 'none',
        },
        createdAt: 300,
      }])
      const failedThread = {
        ...await invocation.port.getTaskThread(invocation.input.threadId),
        status: 'failed',
        summary: 'The inline inspection timed out.',
        updatedAt: 300,
        lastEventAt: 300,
        completedAt: 300,
        metadata: {
          task: {
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
      }
      return {
        ok: false,
        summary: 'Codex inspection timed out.',
        thread: failedThread,
        createdEventKinds: ['dispatch', 'result'],
        finalStatus: 'failed',
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'The inline inspection timed out.',
      }
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

    const result = await runtime.executeMainGatewayTaskThread({
      context: {
        cardId: 'default',
        turnId: 'turn-inline-failure',
        decisionTraceId: 'trace-inline-failure',
        sessionId: 'session-inline-failure',
        toolCallId: 'codex-inline-failure-call-1',
      },
      task: {
        kind: 'codebase-investigation',
        goal: 'Inspect the repository inline and report failures honestly.',
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

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_TIMEOUT',
      recovery: {
        state: 'available',
        reasonCode: 'OBSERVE_RETRY_SAFE',
        actions: [expect.objectContaining({
          kind: 'retry',
          expectedChannel: 'codex',
          expectedUpdatedAt: expect.any(Number),
        })],
      },
    })
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

  it('does not regress a newer completed thread when an older background dispatch rejects', async () => {
    resetCapabilityProbeMocks()
    const dbState = createDbState(createNeedsAffirmationThread())
    const appendAuditLog = vi.fn(async () => {})
    const dispatchTaskThread = vi.fn(async () => {
      throw Object.assign(
        new Error('background dispatch rejected after completion'),
        {
          code: 'TASK_THREAD_BACKGROUND_DISPATCH_FAILED',
        },
      )
    })
    dbState.appendExecutionEvents.mockImplementation(async (events: any[]) => {
      if (!events.some(event => event.payload?.backgroundDispatch === true))
        return
      const currentThread = dbState.getCurrentThread()
      await dbState.upsertTaskThread({
        ...currentThread,
        status: 'completed',
        summary: 'newer owner completed the task',
        updatedAt: currentThread.updatedAt + 1,
        completedAt: currentThread.updatedAt + 1,
      })
    })
    const runtime = createRuntime({
      appendAuditLog,
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
        turnId: 'turn-background-late-rejection',
        decisionTraceId: 'trace-background-late-rejection',
        sessionId: 'session-background-late-rejection',
        toolCallId: 'codex-background-late-rejection-call-1',
      },
      dispatchMode: 'background',
      task: {
        kind: 'codebase-investigation',
        goal: 'Keep the newer completion authoritative.',
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
    })
    for (let attempt = 0; attempt < 50 && dbState.getCurrentThread().status !== 'completed'; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))

    expect(dbState.getCurrentThread()).toMatchObject({
      status: 'completed',
      summary: 'newer owner completed the task',
    })
    expect(dbState.upsertTaskThread).not.toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'dispatch-failed-already-settled',
      payload: expect.objectContaining({
        threadStatus: 'completed',
      }),
    }))
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

  it('atomically resumes a paused recovery thread before redispatch', async () => {
    const pausedThread = createPausedThread()
    const dbState = createDbState(pausedThread)
    const dispatchTaskThread = vi.fn(async () => ({
      ok: true,
      summary: 'Recovered Codex task completed.',
      thread: {
        ...dbState.getCurrentThread(),
        status: 'completed',
        completedAt: 300,
      },
      createdEventKinds: ['resume', 'result'],
      finalStatus: 'completed',
      output: 'completed',
    }))
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: pausedThread.id,
      expectedChannel: 'codex',
    })

    expect(dbState.resumeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      threadId: pausedThread.id,
      expectedStatus: 'paused',
      expectedChannel: 'codex',
      expectedUpdatedAt: pausedThread.updatedAt,
      selectedChannel: 'codex',
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          effect: 'observe',
          permissionMode: 'implicit',
        }),
        execution: expect.objectContaining({
          recovery: expect.objectContaining({
            mode: 'reconcile-before-replay',
            originalEffect: 'mutate',
            state: 'reconciling',
          }),
        }),
      }),
    }))
    expect(dbState.appendExecutionEvents).toHaveBeenCalledWith([
      expect.objectContaining({
        threadId: pausedThread.id,
        kind: 'resume',
        threadStatus: 'planned',
        payload: expect.objectContaining({
          previousStatus: 'paused',
          resumedStatus: 'planned',
          resumeMode: 'recovery',
          effect: 'observe',
          previousEffect: 'mutate',
        }),
      }),
    ])
    const resumeEvent = dbState.appendExecutionEvents.mock.calls[0]?.[0]?.[0] as any
    expect(resumeEvent.payload).not.toHaveProperty('approval')
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        codex: expect.objectContaining({
          sandbox: 'read-only',
          prompt: expect.stringContaining('Reconcile the paused task without repeating its mutation.'),
        }),
      }),
    }))
    const dispatchedPrompt = ((dispatchTaskThread.mock.calls as any[][])[0]?.[0] as any)?.input?.codex?.prompt ?? ''
    expect(dispatchedPrompt).not.toContain('already-confirmed')
    expect(dispatchedPrompt).not.toContain('Make the code change now')
    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
  })

  it('retries a failed observe-only Codex task from persisted failure evidence', async () => {
    const failedThread = createFailedObserveThread()
    const dbState = createDbState(
      failedThread,
      [],
      [createFailureEvent(failedThread)],
    )
    let dispatchedPrompt = ''
    const dispatchTaskThread = vi.fn(async ({ input }: any) => {
      dispatchedPrompt = String(input.codex?.prompt ?? '')
      return {
        ok: true,
        summary: 'Codex retry completed.',
        thread: {
          ...dbState.getCurrentThread(),
          status: 'completed',
          completedAt: 320,
        },
        createdEventKinds: ['resume', 'dispatch', 'result'],
        finalStatus: 'completed',
        output: 'inspection completed',
      }
    })
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: failedThread.id,
      expectedChannel: 'codex',
    })

    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
    expect(dbState.getCurrentThread()).toMatchObject({
      id: failedThread.id,
      status: 'planned',
      completedAt: null,
      metadata: expect.objectContaining({
        task: expect.objectContaining({
          effect: 'observe',
        }),
        execution: expect.objectContaining({
          recovery: expect.objectContaining({
            mode: 'retry-observe',
            previousStatus: 'failed',
            replaySafety: 'safe',
          }),
        }),
      }),
    })
    expect(dbState.appendExecutionEvents.mock.calls.flatMap(([events]) => events)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          threadId: failedThread.id,
          kind: 'resume',
          threadStatus: 'planned',
          payload: expect.objectContaining({
            resumeMode: 'retry',
            retryBoundary: 'observe-only-retry',
            previousStatus: 'failed',
            effect: 'observe',
            sideEffectState: 'none',
          }),
        }),
      ]),
    )
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)
    expect(dispatchTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        codex: expect.objectContaining({
          sandbox: 'read-only',
        }),
      }),
    }))
    expect(dispatchedPrompt).toContain('Retry the failed read-only task.')
    expect(dispatchedPrompt).not.toContain('Make the code change now')
  })

  it('rejects a stale recovery action before redispatch', async () => {
    const failedThread = createFailedObserveThread()
    const dbState = createDbState(
      failedThread,
      [],
      [createFailureEvent(failedThread)],
    )
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default', sessionId: failedThread.sessionId } as any,
      threadId: failedThread.id,
      expectedActionKind: 'retry',
      expectedChannel: 'codex',
      expectedUpdatedAt: failedThread.updatedAt - 1,
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'TASK_THREAD_VERSION_CONFLICT',
      recovery: {
        state: 'available',
        actions: [expect.objectContaining({
          kind: 'retry',
          expectedUpdatedAt: failedThread.updatedAt,
        })],
      },
    })
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.resumeTaskThread).not.toHaveBeenCalled()
  })

  it('blocks a failed observe-only retry when no persisted failure event exists', async () => {
    const failedThread = createFailedObserveThread()
    const dbState = createDbState(failedThread)
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: failedThread.id,
      expectedChannel: 'codex',
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
      recovery: {
        state: 'blocked',
        reasonCode: 'OBSERVE_RETRY_EVIDENCE_REQUIRED',
        actions: [],
      },
    })
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.resumeTaskThread).not.toHaveBeenCalled()
  })

  it('keeps a failed mutating Codex task terminal instead of automatically replaying it', async () => {
    const failedThread = createFailedMutatingThread()
    const dbState = createDbState(
      failedThread,
      [],
      [createFailureEvent(failedThread, {
        effect: 'mutate',
        sideEffectState: 'unknown',
        failureDisposition: {
          kind: 'recover',
          reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
        },
      })],
    )
    const dispatchTaskThread = vi.fn()
    const runtime = createRuntime({ dbState, dispatchTaskThread })

    const result = await runtime.resumeMainGatewayTaskThread({
      context: { cardId: 'default' } as any,
      threadId: failedThread.id,
      expectedChannel: 'codex',
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
      recovery: {
        state: 'blocked',
        reasonCode: 'MUTATION_REPLAY_BLOCKED',
        actions: [],
      },
    })
    expect(dispatchTaskThread).not.toHaveBeenCalled()
    expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
  })

  it('shares one persisted failed-task retry dispatch across concurrent resume calls', async () => {
    const failedThread = createFailedObserveThread()
    const dbState = createDbState(
      failedThread,
      [],
      [createFailureEvent(failedThread)],
    )
    const deferredDispatch = createDeferred<any>()
    const dispatchTaskThread = vi.fn(() => deferredDispatch.promise)
    const runtime = createRuntime({ dbState, dispatchTaskThread })
    const input = {
      context: { cardId: 'default' } as any,
      threadId: failedThread.id,
      expectedChannel: 'codex' as const,
    }

    const first = runtime.resumeMainGatewayTaskThread(input)
    const second = runtime.resumeMainGatewayTaskThread(input)

    for (let attempt = 0; attempt < 50 && dispatchTaskThread.mock.calls.length === 0; attempt++)
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(first).toBe(second)
    expect(dispatchTaskThread).toHaveBeenCalledTimes(1)

    deferredDispatch.resolve({
      ok: true,
      summary: 'Concurrent retry completed once.',
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
    const resumeEvents = dbState.appendExecutionEvents.mock.calls
      .flatMap(([events]) => events)
      .filter(event => event.kind === 'resume')
    expect(resumeEvents).toHaveLength(1)
  })

  it.each(['blocked', 'completed', 'failed', 'cancelled', 'dead-lettered'] as const)(
    'rejects background resume for an already %s task thread before dispatch',
    async (status) => {
      const terminalThread: AlicizationTaskThreadRecord = {
        ...createNeedsAffirmationThread(),
        status,
        summary: `Task thread is already ${status}.`,
        updatedAt: 240,
        lastEventAt: 240,
        completedAt: 240,
      }
      const dbState = createDbState(terminalThread)
      const dispatchTaskThread = vi.fn()
      const runtime = createRuntime({ dbState, dispatchTaskThread })

      const result = await runtime.resumeMainGatewayTaskThread({
        context: { cardId: 'default' } as any,
        threadId: terminalThread.id,
        expectedChannel: 'codex',
        dispatchMode: 'background',
      })

      expect(result).toMatchObject({
        ok: false,
        finalStatus: status,
        errorCode: 'TASK_THREAD_ALREADY_TERMINAL',
        thread: {
          id: terminalThread.id,
          status,
        },
      })
      expect(dispatchTaskThread).not.toHaveBeenCalled()
      expect(dbState.upsertTaskThread).not.toHaveBeenCalled()
      expect(dbState.appendExecutionEvents).not.toHaveBeenCalled()
    },
  )

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
