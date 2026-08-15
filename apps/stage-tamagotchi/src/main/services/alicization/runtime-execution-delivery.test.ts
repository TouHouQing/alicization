import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createAlicizationExecutionDeliveryRuntime } from './execution-delivery-runtime'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createExecutionSelfRevisionStatePatch(input: {
  id: string
  sourceEventId?: string
  sourceTurnId?: string | null
  decisionTraceId?: string | null
  lanes?: AlicizationSelfRevisionStatePatch['lanes']
  memoryPolicy?: Partial<AlicizationSelfRevisionStatePatch['memoryPolicy']>
  relationshipPosture?: Partial<AlicizationSelfRevisionStatePatch['relationshipPosture']>
  responsePosture?: Partial<AlicizationSelfRevisionStatePatch['responsePosture']>
  proactivePolicy?: Partial<AlicizationSelfRevisionStatePatch['proactivePolicy']>
  validation?: Partial<AlicizationSelfRevisionStatePatch['validation']>
  reasonCodes?: string[]
  summary?: string | null
}): AlicizationSelfRevisionStatePatch {
  return {
    version: 'self-revision-state-patch-v1',
    id: input.id,
    sourceEventId: input.sourceEventId ?? input.id.replace(/^patch-/, 'event-'),
    sourceTurnId: input.sourceTurnId ?? input.id.replace(/^patch-/, 'turn-'),
    decisionTraceId: input.decisionTraceId ?? input.id.replace(/^patch-/, 'trace-'),
    domain: 'relationship',
    action: 'internalize',
    resultStatus: 'completed',
    lanes: input.lanes ?? ['relationship-posture'],
    memoryPolicy: {
      strictnessBias: 0,
      wrongThreadSuppressionBias: 0,
      provenanceLabelBias: 0,
      recallExpansionBias: 0,
      shouldQuarantineUnsupportedCarry: false,
      ...input.memoryPolicy,
    },
    relationshipPosture: {
      repairWindowBias: 0.18,
      closenessCapBias: 0.22,
      warmthReleaseBias: 0.04,
      ...input.relationshipPosture,
    },
    responsePosture: {
      hypothesisLabelBias: 0,
      specificityClampBias: 0,
      ...input.responsePosture,
    },
    proactivePolicy: {
      restraintBias: 0.08,
      learningProposalBias: 0,
      actuationCooldownBias: 0.06,
      ...input.proactivePolicy,
    },
    validation: {
      requiresRollbackCheck: false,
      requiresRevalidation: false,
      rollbackPlan: [],
      ...input.validation,
    },
    reasonCodes: input.reasonCodes ?? ['domain:relationship', 'runtime-owner'],
    summary: input.summary ?? null,
  }
}

const retiredOpeningPolicyCue = `opening_${'policy'}=legacy`
const retiredRelationshipCadenceCue = `relationship_${'cadence'}=legacy`
const retiredRedactedInternalCue = `visibility=${'redacted'}_internal`

describe('runtime execution delivery', () => {
  it('does not select execution project briefing text by historical persona phrasing', () => {
    const source = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /looksLikeThinExecutionDeliveryProject(?:Identity|Phase|Preflight|Awareness)|preferStrongerPersistedContinuitySelfLine|preferStrongerContinuityDriftRisk/u,
    )
    expect(source).not.toContain(['template', 'residue', 'shell'].join('-'))
    expect(source).not.toContain(['same', 'living', 'line'].join(' '))
    expect(source).not.toMatch(/normalizeExecutionDeliveryProject|mergeExecutionDeliveryProject|readExecutionDeliveryProject/u)
  })

  it('does not retain execution callback governance cue prose', () => {
    const source = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/callback_context=|runtime_context=|failure_surface=|callback_delivery=|trust_condition=|relationship_doctrine=/iu)
    expect(source).not.toContain('buildMinimalActiveContinuityProjection')
    expect(source).not.toContain('buildExecutionCallbackProjectSelfBriefSystemBlock')
    expect(source).not.toContain('Execution callback self brief.')
  })

  it('persists and restores execution delivery state through runtime meta wiring', async () => {
    const meta = new Map<string, string>()
    const queueSubconsciousWake = vi.fn()
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    executionDeliveryRuntime.enqueue({
      cardId: 'default',
      sessionId: 'session-1',
      threadId: 'thread-1',
      channel: 'cli',
      status: 'completed',
      goal: 'run the command',
      summary: 'summary',
      outcome: 'ok',
      signature: 'thread-1:event',
      completedAt: 9_000,
    })

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      getActiveSessionId: () => 'session-reconcile-1',
      getNow: () => 10_000,
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async (key: string) => meta.get(key),
        setMetaValue: async (key, value) => {
          meta.set(key, value)
        },
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    await runtime.persistExecutionDeliveryState('default')
    expect(meta.get('execution_delivery_state_v1')).toContain('thread-1')

    const restoredRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const restored = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async (key: string) => meta.get(key),
        setMetaValue: async (key, value) => {
          meta.set(key, value)
        },
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: restoredRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const restoredState = await restored.restoreExecutionDeliveryState('default')
    expect(restoredState.pending).toHaveLength(1)
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery-restore', 240)
  })

  it('surfaces delivery state persistence failures instead of swallowing them', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {
          throw new Error('sqlite delivery state write failed')
        },
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime(),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: (raw: unknown) => raw,
      clampAlicizationPerformancePayloadToManifest: (raw: unknown) => raw,
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    await expect(runtime.persistExecutionDeliveryState('default')).rejects.toThrow(
      'sqlite delivery state write failed',
    )
  })

  it('reconciles terminal task threads into the delivery queue during restore', async () => {
    const meta = new Map<string, string>()
    const queueSubconsciousWake = vi.fn()
    const setMetaValue = vi.fn(async (key: string, value: string) => {
      meta.set(key, value)
    })
    const terminalThread = {
      id: 'thread-reconcile-1',
      decisionTraceId: 'trace-reconcile-1',
      turnId: 'turn-reconcile-1',
      sessionId: 'session-reconcile-1',
      origin: 'user-turn',
      goal: 'Inspect the repository.',
      kind: 'codebase-investigation',
      status: 'failed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      summary: 'Codex timed out.',
      metadata: null,
      createdAt: 9_000,
      updatedAt: 9_500,
      lastEventAt: 9_500,
      completedAt: 9_500,
    } as any
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      getActiveSessionId: () => 'session-reconcile-1',
      getNow: () => 10_000,
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake,
      appendAuditLog: vi.fn(async () => {}),
      syncSessionMirrorFromCurrentCardState: vi.fn(async () => {}),
      alicizationDb: {
        getMetaValue: async (key: string) => meta.get(key),
        setMetaValue,
        listExecutionEvents: async () => [{
          id: 'event-reconcile-1',
          createdAt: 9_500,
          kind: 'result',
          threadStatus: 'failed',
          payload: {
            errorCode: 'CODEX_TIMEOUT',
            errorMessage: 'Codex produced no semantic progress for 180000ms.',
          },
        }],
        listTaskThreads: vi.fn(async () => [terminalThread]),
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: (raw: unknown) => raw,
      clampAlicizationPerformancePayloadToManifest: (raw: unknown) => raw,
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    } as any)

    const restored = await runtime.restoreExecutionDeliveryState('default')

    expect(restored.pending).toEqual([
      expect.objectContaining({
        threadId: 'thread-reconcile-1',
        status: 'failed',
        errorCode: 'CODEX_TIMEOUT',
        errorMessage: 'Codex produced no semantic progress for 180000ms.',
      }),
    ])
    expect(setMetaValue).toHaveBeenCalled()
    expect(queueSubconsciousWake).toHaveBeenCalledWith(
      'default',
      'execution-delivery:thread-reconcile-1',
      240,
    )
  })

  it('does not rebuild historical terminal tasks from an unrelated session during restore', async () => {
    const meta = new Map<string, string>()
    const appendAuditLog = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const oldThread = {
      id: 'thread-old-session',
      decisionTraceId: 'trace-old-session',
      turnId: 'turn-old-session',
      sessionId: 'session-old',
      origin: 'user-turn',
      goal: 'old Codex task',
      kind: 'task',
      status: 'failed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      summary: 'old failure',
      metadata: null,
      createdAt: 99_500,
      updatedAt: 99_500,
      lastEventAt: 99_500,
      completedAt: 99_500,
    } as any
    const listTaskThreads = vi.fn(async () => [oldThread])
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      getActiveSessionId: () => 'session-current',
      getNow: () => 100_000,
      executionDeliveryRecoveryWindowMs: 10_000,
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake,
      appendAuditLog,
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async (key: string) => meta.get(key),
        setMetaValue: async (key: string, value: string) => {
          meta.set(key, value)
        },
        listExecutionEvents: async () => [],
        listTaskThreads,
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 100_000,
        maxAgeMs: 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: (raw: unknown) => raw,
      clampAlicizationPerformancePayloadToManifest: (raw: unknown) => raw,
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    } as any)

    const restored = await runtime.restoreExecutionDeliveryState('default')

    expect(listTaskThreads).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'session-current',
      limit: 32,
    }))
    expect(restored.pending).toEqual([])
    expect(queueSubconsciousWake).not.toHaveBeenCalled()
    expect(meta.get('execution_delivery_state_v1')).toBe('')
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'reconcile-history-skipped',
    }), 'default')
  })

  it('persists an empty delivery state after restoring and pruning stale persisted entries', async () => {
    const staleState = JSON.stringify({
      version: 2,
      pending: [{
        key: 'default::session-current::thread-stale::1000::failed',
        cardId: 'default',
        sessionId: 'session-current',
        threadId: 'thread-stale',
        decisionTraceId: null,
        turnId: null,
        channel: 'codex',
        status: 'failed',
        goal: 'stale task',
        summary: 'stale',
        outcome: '',
        signature: 'thread-stale:1000',
        queuedAt: 1000,
        completedAt: 1000,
      }],
      delivered: [],
      surfaced: [],
    })
    const meta = new Map([['execution_delivery_state_v1', staleState]])
    const setMetaValue = vi.fn(async (key: string, value: string) => {
      meta.set(key, value)
    })
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      getActiveSessionId: () => 'session-current',
      getNow: () => 100_000,
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async (key: string) => meta.get(key),
        setMetaValue,
        listExecutionEvents: async () => [],
        listTaskThreads: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 100_000,
        maxAgeMs: 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: (raw: unknown) => raw,
      clampAlicizationPerformancePayloadToManifest: (raw: unknown) => raw,
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    } as any)

    const restored = await runtime.restoreExecutionDeliveryState('default')

    expect(restored.pending).toEqual([])
    expect(setMetaValue).toHaveBeenLastCalledWith('execution_delivery_state_v1', '')
  })

  it('does not overwrite persisted delivery state when the restore read fails', async () => {
    const appendAuditLog = vi.fn(async () => {})
    const setMetaValue = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      getActiveSessionId: () => 'session-current',
      getNow: () => 100_000,
      normalizeCardId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: (raw: unknown) => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async <T>(_cardId: unknown, task: () => Promise<T>) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog,
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => {
          throw new Error('sqlite read unavailable')
        },
        setMetaValue,
        listExecutionEvents: async () => [],
        listTaskThreads: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 100_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: (raw: unknown) => raw,
      clampAlicizationPerformancePayloadToManifest: (raw: unknown) => raw,
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    } as any)

    await runtime.restoreExecutionDeliveryState('default')

    expect(setMetaValue).not.toHaveBeenCalled()
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'restore-state-read-failed',
    }), 'default')
  })

  it('queues a settled execution callback candidate and emits audit/sync hooks', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const syncSessionMirrorFromCurrentCardState = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const queueSubconsciousWake = vi.fn()
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog,
      syncSessionMirrorFromCurrentCardState,
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            stdout: 'all tests passed',
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const thread = {
      id: 'thread-1',
      decisionTraceId: 'trace-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      origin: 'user-turn',
      goal: 'run the command',
      kind: 'task',
      status: 'completed',
      selectedChannel: 'cli',
      proposedChannel: 'cli',
      summary: 'summary',
      metadata: null,
      createdAt: 9_000,
      updatedAt: 9_500,
      lastEventAt: 9_500,
      completedAt: 9_500,
    } as any
    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread,
    })
    const duplicate = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread,
    })

    expect(queued?.threadId).toBe('thread-1')
    expect(duplicate).toBeNull()
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledWith(expect.objectContaining({
      source: 'execution-delivery-queued',
    }))
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledTimes(1)
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'queued',
    }), 'default')
    const queuedAudit = ((appendAuditLog.mock.calls as unknown[][]).at(0)?.[0]) as any
    expect(queuedAudit?.payload).not.toHaveProperty('projectContinuity')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery:thread-1', 240)
    expect(queueSubconsciousWake).toHaveBeenCalledTimes(1)
  })

  it('marks an inline Provider-owned execution as surfaced instead of queuing a second callback', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const queueSubconsciousWake = vi.fn()
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-inline-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            stdout: 'inline result',
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-inline-1',
        decisionTraceId: 'trace-inline-1',
        turnId: 'turn-inline-1',
        sessionId: 'session-inline-1',
        origin: 'user-turn',
        goal: 'inspect inline',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'inline summary',
        metadata: {
          execution: {
            runtimeContext: {
              generatedAt: 9_000,
              cardId: 'default',
              turnId: 'turn-inline-1',
              sessionId: 'session-inline-1',
              resultDeliveryMode: 'inline',
              sensory: {
                collectedAt: 9_000,
                running: true,
                stale: false,
                ageMs: 0,
                foregroundWindow: null,
                capture: null,
              },
            },
          },
        },
        createdAt: 9_000,
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued).toBeNull()
    expect(queueSubconsciousWake).not.toHaveBeenCalled()
    expect(executionDeliveryRuntime.snapshot('default')).toMatchObject({
      pending: [],
      surfaced: [expect.objectContaining({
        identity: expect.stringContaining('thread-inline-1'),
      })],
    })
  })

  it('uses the latest execution event timestamp as delivery identity even when thread summary refresh makes updatedAt newer', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            stdout: 'all tests passed',
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'run the command',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'summary',
        metadata: null,
        createdAt: 9_000,
        updatedAt: 10_000,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued?.completedAt).toBe(9_500)
  })

  it('does not add non-owner continuity fields to queued delivery audits', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog,
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            stdout: 'memory loop still under repair',
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-1',
        decisionTraceId: 'trace-1',
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'Return the completed execution result.',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'The execution result is ready.',
        metadata: null,
        createdAt: 9_000,
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'queued',
    }), 'default')
    const queuedAudit = ((appendAuditLog.mock.calls as unknown[][]).at(0)?.[0]) as any
    expect(queuedAudit?.payload).not.toHaveProperty('projectContinuity')
  })

  it('keeps a blocked execution fact without synthesizing project prose', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [{
          id: 'event-blocked-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            error: 'Blocked before dispatch.',
            safetyGate: {
              effect: 'mutate',
              permissionMode: 'none',
              confirmationRequired: true,
              riskPolicy: 'implicit-or-explicit-confirmation-required',
              auditability: 'blocked-before-dispatch',
              interruptibility: 'no-process-started',
            },
          },
        }],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-blocked-1',
        decisionTraceId: 'trace-blocked-1',
        turnId: 'turn-blocked-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'Edit local files without explicit confirmation.',
        kind: 'codebase-edit',
        status: 'blocked',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'Blocked before dispatch.',
        metadata: null,
        createdAt: 9_000,
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued).toEqual(expect.objectContaining({
      threadId: 'thread-blocked-1',
      status: 'blocked',
      summary: 'Blocked before dispatch.',
    }))
    expect(executionDeliveryRuntime.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-blocked-1',
        summary: 'Blocked before dispatch.',
      })],
    }))
  })

  it('keeps a confirmed execution result without synthesizing project prose', async () => {
    const executionDeliveryRuntime = createAlicizationExecutionDeliveryRuntime({
      getNow: () => 10_000,
    })
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [
          {
            id: 'event-resume-1',
            createdAt: 9_200,
            kind: 'resume',
            payload: {
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
              affirmationReasonCodes: ['medium-risk-proactive-action-requires-affirmation'],
            },
          },
          {
            id: 'event-result-1',
            createdAt: 9_500,
            kind: 'result',
            payload: {
              summary: 'resumed execution completed after host confirmation',
            },
          },
        ],
      },
      executionDeliveryRuntime,
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const queued = await runtime.queueExecutionDeliveryCandidate({
      cardId: 'default',
      thread: {
        id: 'thread-resume-1',
        decisionTraceId: 'trace-resume-1',
        turnId: 'turn-resume-1',
        sessionId: 'session-1',
        origin: 'subconscious-proactive',
        goal: 'resume confirmed local execution',
        kind: 'codebase-edit',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'Resumed execution completed after host confirmation.',
        metadata: null,
        createdAt: 9_000,
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued).toEqual(expect.objectContaining({
      threadId: 'thread-resume-1',
      status: 'completed',
      summary: 'Resumed execution completed after host confirmation.',
      outcome: 'resumed execution completed after host confirmation',
    }))
    expect(executionDeliveryRuntime.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-resume-1',
        summary: 'Resumed execution completed after host confirmation.',
      })],
    }))
  })

  it('prefers fresher live callback-afterglow hold policy when the session snapshot stays on an older deliver-now line', async () => {
    const liveState = createDefaultVisualPresenceState(10_000)
    liveState.currentConsciousFrame = {
      summary: 'continuity arc still holds for a quieter callback reopening',
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
    } as any
    liveState.derivedMindStateBundle = {
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
      },
      personStateProjection: {
        activeClosenessContext: 'execution-callback',
        trustRationale: 'Trust holds when the callback return stays measured.',
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          rhythmState: {
            cadenceMode: 'cooldown',
          },
        },
      },
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => null,
    })

    const policy = await runtime.resolveExecutionResultDeliveryPolicyForRuntime({
      cardId: 'default',
      status: 'completed',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 9_000,
              },
              world: {
                worldModel: {
                  hostState: {
                    availability: 'open',
                  },
                },
              },
              memory: {
                personStateProjection: {
                  activeClosenessContext: 'execution-callback',
                  trustRationale: 'Immediate closeness lands well here.',
                  personalityContinuityState: {
                    currentRegime: 'execution-callback',
                    rhythmState: {
                      cadenceMode: 'ready-return',
                    },
                  },
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: [],
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(policy.mode).toBe('hold-for-opening')
    expect(policy.reasonTags).toContain('callback-afterglow-hold')
  })

  it('reuses the existing person-state projection from the current execution session snapshot', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Patch the runtime line.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=restrained',
                  relationshipPosture: 'restrained',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: true,
                  restrained: true,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                    continuitySummary: `${retiredOpeningPolicyCue}_continuity`,
                    regimeModel: {
                      primaryReason: `${retiredRelationshipCadenceCue}_regime`,
                      carryReason: null,
                      signals: [retiredRedactedInternalCue],
                    },
                    rhythmState: {
                      summary: `${retiredOpeningPolicyCue}_rhythm`,
                      rationale: [`${retiredRelationshipCadenceCue}_rationale`],
                    },
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('restrained')
  })

  it('drops legacy governance cues from persisted execution person-state projections', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Patch the runtime line.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: `${retiredRelationshipCadenceCue}_summary`,
                  relationshipPosture: 'restrained',
                  preferredProactiveStyle: 'silent-observe',
                  preferenceText: 'clean preference owner text',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: retiredRedactedInternalCue,
                  relationshipDoctrine: `${retiredRelationshipCadenceCue}_doctrine`,
                  cautious: true,
                  restrained: true,
                  selfContinuityAuthority: {
                    selfLine: 'clean self owner text',
                    relationshipLine: `${retiredRelationshipCadenceCue}_authority`,
                    motiveLine: null,
                    habitLine: null,
                    inwardLine: 'clean inward owner text',
                    authoritySummary: retiredRedactedInternalCue,
                    closenessPosture: 'space-first',
                    sourceTags: ['runtime'],
                  },
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    const serialized = JSON.stringify(projection)

    expect(serialized).not.toContain(retiredOpeningPolicyCue)
    expect(serialized).not.toContain(retiredRelationshipCadenceCue)
    expect(serialized).not.toContain(retiredRedactedInternalCue)
    expect(projection?.preferenceText).toBe('clean preference owner text')
    expect(projection?.selfContinuityAuthority?.selfLine).toBe('clean self owner text')
    expect(projection?.selfContinuityAuthority?.inwardLine).toBe('clean inward owner text')
  })

  it('prefers richer canonical runtime projection over thinner derived carry on the same execution session surface', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Patch the runtime line and bring the callback back gently.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                derivedMindStateBundle: {
                  personStateProjection: {
                    activeClosenessContext: 'general',
                    activeClosenessRung: 'nearby-soft',
                    relationshipPosture: 'warm',
                    summary: 'legacy carry drifted back toward generic warmth.',
                  },
                },
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
                  activeClosenessContext: 'focused-work',
                  activeClosenessRung: 'space-first',
                  closenessLadder: [{
                    context: 'focused-work',
                    rung: 'space-first',
                    preference: 'Lighter touch, more room, less interruption pressure.',
                    rationale: 'context=focused-work | regime=focused-work | posture=restrained',
                    confidence: 0.86,
                  }],
                  relationshipPosture: 'restrained',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: 'Lighter touch, more room, less interruption pressure.',
                  sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
                  repairTriggerText: 'If callback warmth jumps too fast, back off and reopen lighter.',
                  burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
                  routineText: 'Focused work windows usually need space first, then precise follow-up.',
                  trustRationale: 'The host trusts bounded continuity more than pushy warmth.',
                  relationshipDoctrine: 'Room first, then closeness.',
                  cautious: true,
                  restrained: true,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(projection?.activeClosenessContext).toBe('focused-work')
    expect(projection?.activeClosenessRung).toBe('space-first')
    expect(projection?.relationshipPosture).toBe('restrained')
  })

  it('reuses the projected self authority from the current execution session snapshot', async () => {
    const selfContinuityAuthority = {
      selfLine: '我保持同一条生命线，先把回调说准确，再慢慢变暖。',
      relationshipLine: 'Leave room first and only widen closeness after the seam settles.',
      motiveLine: 'Keep the execution payoff grounded enough that it helps without crowding.',
      habitLine: 'Exactness first, warmth second.',
      inwardLine: 'Hold the line without sounding like a different, more eager version of me.',
      authoritySummary: '我保持同一条生命线，先把回调说准确，再慢慢变暖。 | Leave room first and only widen closeness after the seam settles.',
      sourceTags: ['projection', 'execution-callback'],
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const authority = await runtime.resolveExecutionSelfContinuityAuthorityForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['execution-callback', 'focused-work'],
                  summary: 'regime=execution-callback | posture=restrained',
                  selfContinuityAuthority,
                  relationshipPosture: 'restrained',
                  preferredProactiveStyle: 'silent-observe',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: true,
                  restrained: true,
                  personalityContinuityState: {
                    currentRegime: 'execution-callback',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(authority).toBe(selfContinuityAuthority)
  })

  it('prefers richer canonical runtime self authority over thinner derived carry on the same execution session surface', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const authority = await runtime.resolveExecutionSelfContinuityAuthorityForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                derivedMindStateBundle: {
                  personStateProjection: {
                    selfContinuityAuthority: {
                      selfLine: 'I warm the callback immediately.',
                      relationshipLine: 'Close the gap as soon as the result is ready.',
                      authoritySummary: 'Warmth first callback line.',
                    },
                  },
                },
                personStateProjection: {
                  contexts: ['execution-callback', 'focused-work'],
                  summary: 'regime=execution-callback | posture=restrained',
                  selfContinuityAuthority: {
                    selfLine: 'session self owner text',
                    relationshipLine: 'session relationship owner text',
                    motiveLine: 'session motive owner text',
                    habitLine: 'session habit owner text',
                    inwardLine: 'session inward owner text',
                    authoritySummary: 'session authority summary',
                    sourceTags: ['runtime-projection', 'execution-callback'],
                  },
                  relationshipPosture: 'restrained',
                  preferredProactiveStyle: 'silent-observe',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: 'Trust holds better when the callback stays lower-pressure and leaves room first.',
                  relationshipDoctrine: 'Room first, then closeness.',
                  cautious: true,
                  restrained: true,
                  personalityContinuityState: {
                    currentRegime: 'execution-callback',
                    closenessPosture: 'space-first',
                    repairPosture: 'repair-first',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(authority?.authoritySummary).toBe('session authority summary')
    expect(authority?.relationshipLine).toBe('session relationship owner text')
    expect(authority?.habitLine).toBe('session habit owner text')
  })

  it('does not let authority wording make live state outrank the session owner', async () => {
    const sessionAuthority = {
      selfLine: 'session self line',
      relationshipLine: 'session relationship line',
      motiveLine: 'session motive line',
      habitLine: 'session habit line',
      inwardLine: 'session inward line',
      authoritySummary: 'session authority summary',
      sourceTags: ['session-owner', 'execution-callback'],
    } as any
    const liveAuthority = {
      selfLine: 'live self line with more words',
      relationshipLine: 'live relationship line with more words',
      motiveLine: 'live motive line with more words',
      habitLine: 'live habit line with more words',
      inwardLine: 'live inward line with more words',
      authoritySummary: 'live authority summary with more words',
      sourceTags: ['live-runtime', 'execution-callback', 'recent-snapshot'],
    } as any
    const liveState = createDefaultVisualPresenceState(10_000)
    liveState.currentConsciousFrame = {
      summary: 'live runtime summary',
      reasonTags: ['recent-snapshot'],
    } as any
    liveState.derivedMindStateBundle = {
      affectiveResidue: {
        valence: 'steady',
      },
      personStateProjection: {
        selfContinuityAuthority: liveAuthority,
      },
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => null,
    })

    const authority = await runtime.resolveExecutionSelfContinuityAuthorityForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 9_000,
              },
              memory: {
                personStateProjection: {
                  contexts: ['execution-callback', 'focused-work'],
                  selfContinuityAuthority: sessionAuthority,
                },
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: [],
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(authority?.selfLine).toBe(sessionAuthority.selfLine)
    expect(authority?.relationshipLine).toBe(sessionAuthority.relationshipLine)
    expect(authority?.authoritySummary).toBe(sessionAuthority.authoritySummary)
    expect(authority?.sourceTags ?? []).toEqual(expect.arrayContaining([
      'session-owner',
      'execution-callback',
    ]))
  })

  it('keeps richer callback doctrine and authority summary when fresher live self authority is thinner', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => String(raw ?? 'default'),
      normalizeSessionId: raw => String(raw ?? 'session'),
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: () => {},
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      } as any,
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime(),
      executionDeliveryStateMetaKey: 'meta',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: raw => ({ emotion: String(raw ?? 'thinking'), downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => createDefaultVisualPresenceState(12_000),
      buildHostPersonModel: async () => null,
    })

    const authority = await runtime.resolveExecutionSelfContinuityAuthorityForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                derivedMindStateBundle: {
                  personStateProjection: {
                    selfContinuityAuthority: {
                      selfLine: 'derived self owner text',
                      relationshipLine: 'derived relationship owner text',
                      motiveLine: 'derived motive owner text',
                      inwardLine: 'derived inward owner text',
                      authoritySummary: 'derived authority summary',
                    },
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(authority?.selfLine).not.toBeNull()
    expect(authority?.relationshipLine).toBe('derived relationship owner text')
    expect(authority?.authoritySummary).toBe('derived authority summary')
  })

  it('prefers a freshly rebuilt host relationship model when the session snapshot stays on an older warmer callback line', async () => {
    const sessionHostPersonModel = {
      summary: 'The host feels immediately receptive to warmer callback closeness.',
      sensitivities: ['Distance feels colder than necessary here.'],
      repairTriggers: ['If warmth is delayed, close the distance quickly.'],
      trustLadder: {
        stage: 'warming',
        rationale: 'Quick callback warmth usually lands well.',
      },
      preferredClosenessByContext: [{
        context: 'execution-callback',
        preference: 'Lean closer as soon as the result is ready.',
        confidence: 0.92,
      }],
      recurrentBurdens: ['Too much distance makes the callback feel detached.'],
      routines: ['Warm callback pacing usually feels natural here.'],
    } as any
    const liveHostPersonModel = {
      summary: 'The host currently needs execution callbacks to stay room-first and measured.',
      sensitivities: ['Pushy callback warmth becomes intrusive while the seam is still cooling.'],
      repairTriggers: ['If the callback widens too fast, back off and reopen with more room.'],
      trustLadder: {
        stage: 'cautious-open',
        rationale: 'Trust holds better when the callback stays lower-pressure and leaves room first.',
      },
      preferredClosenessByContext: [{
        context: 'execution-callback',
        preference: 'Deliver the result cleanly, leave room, and only widen closeness after the opening loosens.',
        confidence: 0.95,
      }],
      recurrentBurdens: ['Execution callbacks become burdensome when they turn into extra companionship too quickly.'],
      routines: ['Measured callback returns land better than immediate warmth right now.'],
    } as any
    const liveState = createDefaultVisualPresenceState(10_000)
    liveState.currentConsciousFrame = {
      summary: 'continuity arc still holds for a quieter opening',
      reasonTags: ['continuity-arc:hold-for-opening'],
    } as any
    liveState.derivedMindStateBundle = {
      affectiveResidue: {
        valence: 'steady',
      },
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => liveHostPersonModel,
    })

    const hostPersonModel = await runtime.resolveExecutionHostPersonModelForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 9_000,
              },
              memory: {
                hostPersonModel: sessionHostPersonModel,
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: [],
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(hostPersonModel).toBe(liveHostPersonModel)
  })

  it('prefers fresher live knowledge evidence when the session snapshot keeps an older callback proof line', async () => {
    const staleSessionKnowledgeEvidence = {
      validationCount: 0,
      contradictionCount: 3,
      stronglyValidatedProcedureCount: 0,
      contradictionHeavyFactCount: 1,
    }
    const liveKnowledgeEvidence = {
      validationCount: 4,
      contradictionCount: 0,
      stronglyValidatedProcedureCount: 2,
      contradictionHeavyFactCount: 0,
    }
    const liveState = createDefaultVisualPresenceState(10_000)
    liveState.currentConsciousFrame = {
      summary: 'continuity arc still holds for the same quieter callback reopening',
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
    } as any
    liveState.derivedMindStateBundle = {
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
      },
      knowledgeEvidence: liveKnowledgeEvidence,
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => null,
    })

    const knowledgeEvidence = await runtime.resolveExecutionKnowledgeEvidenceForRuntime({
      cardId: 'default',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              perception: {
                updatedAt: 9_000,
              },
              memory: {
                knowledgeEvidence: staleSessionKnowledgeEvidence,
              },
              dialogue: {
                currentConsciousFrame: {
                  reasonTags: [],
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(knowledgeEvidence).toBe(liveKnowledgeEvidence)
  })

  it('keeps the current execution session projection when a live state also exists', async () => {
    const liveState = createDefaultVisualPresenceState(10_000)
    const liveSelfRevisionPatch = createExecutionSelfRevisionStatePatch({
      id: 'patch-live-owner',
      sourceEventId: 'event-live-owner',
      sourceTurnId: 'turn-live-owner',
      decisionTraceId: 'trace-live-owner',
      summary: 'live owner state',
    })
    liveState.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      activeCandidateId: 'candidate-live-owner',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      relationshipDoctrine: 'steadiness before closeness',
      candidates: [{
        version: 'self-evolution-candidate-v1',
        id: 'candidate-live-owner',
        status: 'active',
        sourceEventId: 'event-live-owner',
        decisionTraceId: 'trace-live-owner',
        sourceTurnId: 'turn-live-owner',
        patch: liveSelfRevisionPatch,
        validation: {
          replayRequired: true,
          replayPassed: true,
          rollbackSupported: true,
          activationBlockedReasons: [],
          finalReplayGatePassed: true,
          productionGoldSampleCount: 6,
          productionGoldCoverage: 1,
        },
        activatedAt: 120,
        rolledBackAt: null,
        createdAt: 100,
      }],
      reasonCodes: ['self-evolution:active-version-present'],
    } as any

    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => liveState,
      buildHostPersonModel: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=warm',
                  relationshipPosture: 'warm',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: null,
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('warm')
    expect(projection?.preferredProactiveStyle).toBe('light-nudge')
    expect(JSON.stringify(projection)).not.toContain('continuity=repair-before-closeness')
  })

  it('preserves the current execution session person-state projection when an active patch exists', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-active-owner',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-active-owner',
        sourceEventId: 'event-active-owner',
        sourceTurnId: 'turn-active-owner',
        decisionTraceId: 'trace-active-owner',
        summary: 'active owner state',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=warm',
                  relationshipPosture: 'warm',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: {
                  version: 'self-evolution-kernel-v1',
                  updatedAt: 9_000,
                  evolutionMomentum: 0.22,
                  learningReadiness: 0.18,
                  contradictionPressure: 0.04,
                  revisionPressure: 0.12,
                  autobiographicalStability: 0.66,
                  dominantTrajectory: 'stay close',
                  relationshipDoctrine: 'warmth first',
                  latestInflection: 'warmth first',
                  burdenLine: null,
                  trustMeaning: 'closer and quicker feels natural here',
                  nextLearningAction: 'hold',
                  nextLearningReason: 'hold',
                  shouldRecord: false,
                  shouldReflect: false,
                  shouldVerify: false,
                  shouldRevise: false,
                  shouldInternalize: false,
                  activeLearningFocuses: [],
                  sourceSignals: [],
                  summary: 'warmth first',
                },
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('warm')
    expect(projection?.preferredProactiveStyle).toBe('light-nudge')
  })

  it('does not turn an active repair patch into a fixed execution callback posture', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-repair-before-closeness-explicit',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-repair-before-closeness-explicit',
        sourceEventId: 'event-repair-before-closeness-explicit',
        sourceTurnId: 'turn-repair-before-closeness-explicit',
        decisionTraceId: 'trace-repair-before-closeness-explicit',
        relationshipPosture: {
          repairWindowBias: 0.04,
          closenessCapBias: 0.06,
          warmthReleaseBias: 0.02,
        },
        proactivePolicy: {
          restraintBias: 0.02,
          actuationCooldownBias: 0.01,
        },
        reasonCodes: ['domain:relationship', 'repair-before-closeness'],
        summary: 'continuity=repair-before-closeness | let repair settle before reopening closeness on the same callback line',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['focused-work', 'execution-callback', 'execution'],
                  summary: 'regime=focused-work | posture=warm',
                  relationshipPosture: 'warm',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'focused-work',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: null,
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('warm')
    expect(projection?.preferredProactiveStyle).toBe('light-nudge')
  })

  it('does not synthesize a person-state projection without a runtime surface', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-without-surface',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-without-surface',
        sourceEventId: 'event-without-surface',
        sourceTurnId: 'turn-without-surface',
        decisionTraceId: 'trace-without-surface',
        summary: 'active patch without a runtime surface',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: null,
    })

    expect(projection).toBeNull()
  })

  it('does not synthesize a person-state projection from execution goal text', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => null,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: () => ({
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
      }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfRevisionStatePatch: async () => null,
      getActiveSelfEvolutionCandidateId: async () => null,
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Return the completed execution result.',
      agentTurn: null,
    })

    expect(projection).toBeNull()
  })

  it('forwards runtime state to the gateway without extra system blocks', async () => {
    const generateMainGatewayText = vi.fn(async () => JSON.stringify({
      thought: 'execution result is ready',
      emotion: 'thinking',
      reply: '执行结果已返回。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: raw => ({ performance: raw }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const structured = await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-runtime-state',
      goal: 'Patch the runtime line.',
      outcome: 'patched runtime line',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched runtime line',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep callback timing lower-pressure.',
        sensitivityText: 'Over-close callback warmth becomes pressure.',
        repairTriggerText: 'If closeness jumps too fast, reopen lighter.',
        burdenText: 'Focused work is crowded by extra callback warmth.',
        routineText: 'Execution callbacks land better when they stay exact and measured.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        },
      } as any,
    })

    expect(structured?.format).toBe('mind-turn-v1')
    const structuredText = JSON.stringify(structured)
    expect(structuredText).not.toContain('open_focus=')
    expect(structuredText).not.toContain('next_focus=')
    expect(structuredText).not.toContain(retiredOpeningPolicyCue)
    expect(structuredText).not.toContain(retiredRelationshipCadenceCue)
    expect(structuredText).not.toContain(retiredRedactedInternalCue)
    expect((structured as any)?.performance?.delivery).toBe('calm')
    expect((structured as any)?.delivery).toBe('calm')
    const gatewayInput = (generateMainGatewayText.mock.calls as unknown[][]).at(0)?.[0] as any
    expect(gatewayInput?.extraSystemBlocks ?? []).toEqual([])
  })

  it('passes the execution session digital-life runtime surface into execution-callback provider prompts', async () => {
    const generateMainGatewayText = vi.fn(async () => JSON.stringify({
      thought: 'execution callback remains inside the same emotional kernel',
      emotion: 'thinking',
      reply: '这条执行结果我沿着同一个状态接回来。',
      performance: {
        baseEmotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
    }))
    const state = createDefaultVisualPresenceState(10_000)
    state.emotionalKernel = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'focused-relief',
      valence: 0.42,
      arousal: 0.31,
      guardedness: 0.2,
      closenessDrive: 0.38,
      repairNeed: 0.1,
      initiativePressure: 0.35,
      memoryRecallMode: 'execution-continuity',
      initiativeMode: 'deliver-result',
      embodimentTone: 'calm-return',
      why: 'The completed task should return through the same living execution state.',
      reasonTags: ['execution-callback', 'same-emotional-kernel'],
    } as any
    const sessionRuntimeSurface = buildAlicizationDigitalLifeRuntimeSurface(state)
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText,
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: raw => ({ performance: raw }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-emotional-kernel',
      goal: 'Return a completed execution result without splitting the life loop.',
      outcome: 'execution completed',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'execution completed',
      threadId: 'thread-1',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: sessionRuntimeSurface,
          },
        }),
      } as any,
    })

    expect(generateMainGatewayText).toHaveBeenCalledWith(expect.objectContaining({
      source: 'execution-callback',
      digitalLifeRuntimeSurface: sessionRuntimeSurface,
    }))
    const gatewayInput = (generateMainGatewayText.mock.calls as unknown[][]).at(0)?.[0] as any
    expect(gatewayInput?.digitalLifeRuntimeSurface?.memory?.emotionalKernel).toEqual(
      state.emotionalKernel,
    )
  })

  it('preserves gateway-authored execution callback delivery cadence', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => JSON.stringify({
        thought: 'execution result is ready',
        emotion: 'thinking',
        reply: '我先把这条结果接回来给你。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'firm',
          emphasis: 0,
        },
      }),
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: raw => ({ performance: raw }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
    })

    const structured = await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-cadence-clamp',
      goal: 'Patch the runtime line.',
      outcome: 'patched runtime line',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched runtime line',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work'],
        summary: 'regime=execution-callback | posture=restrained',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        preferredProactiveStyle: 'silent-observe',
        preferenceText: 'Keep callback timing lower-pressure.',
        sensitivityText: 'Over-close callback warmth becomes pressure.',
        repairTriggerText: 'If closeness jumps too fast, reopen lighter.',
        burdenText: 'Focused work is crowded by extra callback warmth.',
        routineText: 'Execution callbacks land better when they stay exact and measured.',
        trustRationale: 'Trust holds when callback timing stays measured.',
        relationshipDoctrine: 'Stay exact, bounded, and lower-pressure before widening closeness.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        },
      } as any,
      selfContinuityAuthority: {
        relationshipLine: 'Lower-pressure callback returns keep the same life-line steadier.',
        habitLine: 'Leave room before widening closeness again.',
      } as any,
    })

    expect((structured as any)?.performance?.delivery).toBe('firm')
    expect((structured as any)?.delivery).toBe('firm')
  })

  it('does not rewrite gateway-authored delivery for relationship cadence reconfirmation', async () => {
    const runtime = createAlicizationRuntimeExecutionDelivery({
      getActiveCardId: () => 'default',
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake: vi.fn(),
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async () => undefined,
        setMetaValue: async () => {},
        listExecutionEvents: async () => [],
      },
      executionDeliveryRuntime: createAlicizationExecutionDeliveryRuntime({
        getNow: () => 10_000,
      }),
      executionDeliveryStateMetaKey: 'execution_delivery_state_v1',
      generateMainGatewayText: async () => JSON.stringify({
        thought: 'relationship cadence stayed on the same bounded-return line after reconfirmation',
        emotion: 'thinking',
        reply: '我把这次结果稳稳接回来给你。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'gentle',
          emphasis: 0,
        },
      }),
      getPerformanceManifest: async () => null,
      normalizeAlicizationEmotion: () => ({ emotion: 'thinking', downgraded: false }),
      normalizeAlicizationPerformancePayload: raw => raw,
      clampAlicizationPerformancePayloadToManifest: raw => ({ performance: raw }),
      ensureVisualPresenceState: async () => null,
      buildHostPersonModel: async () => null,
      getActiveSelfEvolutionCandidateId: async () => 'candidate-cadence-reconfirmed',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-cadence-reconfirmed',
        sourceEventId: 'event-cadence-reconfirmed',
        sourceTurnId: 'turn-cadence-reconfirmed',
        decisionTraceId: 'trace-cadence-reconfirmed',
        relationshipPosture: {
          repairWindowBias: 0.17,
          closenessCapBias: 0.14,
          warmthReleaseBias: 0.04,
        },
        proactivePolicy: {
          restraintBias: 0.05,
          actuationCooldownBias: 0.03,
        },
        reasonCodes: ['domain:relationship', 'relationship-cadence-reconfirmation', 'bounded-return'],
        summary: 'relationship cadence stayed on the same bounded-return line after reconfirmation | keep the relationship return measured until the surface fully cools',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Report the execution result without crowding the host.',
      agentTurn: {
        getSessionSnapshot: () => ({
          digitalLifeSpine: {
            runtimeSurface: {
              memory: {
                personStateProjection: {
                  contexts: ['execution-callback', 'focused-work'],
                  summary: 'regime=execution-callback | posture=warm',
                  activeClosenessContext: 'execution-callback',
                  activeClosenessRung: 'easy-close',
                  relationshipPosture: 'warm',
                  preferredProactiveStyle: 'light-nudge',
                  preferenceText: '',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: '',
                  relationshipDoctrine: '',
                  cautious: false,
                  restrained: false,
                  personalityContinuityState: {
                    currentRegime: 'execution-callback',
                    closenessPosture: 'warmth-first',
                    repairPosture: 'soften-first',
                  },
                },
                selfEvolution: null,
                derivedMindStateBundle: null,
              },
              agency: {},
              cognition: {},
            },
          },
        }),
      } as any,
    })

    expect(projection?.relationshipPosture).toBe('warm')

    const structured = await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-cadence-reconfirmed',
      goal: 'Report the execution result without crowding the host.',
      outcome: 'patched runtime line',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched runtime line',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: projection as any,
      selfContinuityAuthority: {
        relationshipLine: 'Keep the relationship return measured until the surface fully cools.',
        habitLine: 'Stay on the same bounded-return line after reconfirmation.',
      } as any,
    })

    expect((structured as any)?.performance?.delivery).toBe('gentle')
    expect((structured as any)?.delivery).toBe('gentle')
  })
})
