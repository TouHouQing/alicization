import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { readFileSync } from 'node:fs'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { createAlicizationExecutionDeliveryRuntime } from './execution-delivery-runtime'
import { createAlicizationRuntimeExecutionDelivery } from './runtime-execution-delivery'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function expectNoFixedProjectTemplateResidue(value: unknown) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value ?? '')
  expect(containsAlicizationFixedTemplateResidue(serialized), serialized).toBe(false)
}

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
  projectStateContinuity?: AlicizationSelfRevisionStatePatch['projectStateContinuity']
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
      templateShellSuppressionBias: 0,
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
    projectStateContinuity: input.projectStateContinuity ?? null,
    reasonCodes: input.reasonCodes ?? ['domain:relationship', 'same-her-baseline'],
    summary: input.summary ?? null,
  }
}

describe('runtime execution delivery', () => {
  it('does not select execution project briefing text by historical persona phrasing', () => {
    const source = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /looksLikeThinExecutionDeliveryProject(?:Identity|Phase|Preflight|Awareness)|preferStrongerPersistedSameHerSelfLine|preferStrongerSameHerDriftRisk/u,
    )
    expect(source).not.toContain(['template', 'residue', 'shell'].join('-'))
    expect(source).not.toContain(['same', 'living', 'line'].join(' '))
  })

  it('does not retain execution callback governance cue prose', () => {
    const source = readFileSync(new URL('./runtime-execution-delivery.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/callback_context=|runtime_context=|failure_surface=|callback_delivery=|trust_condition=|relationship_doctrine=/iu)
    expect(source).not.toContain('buildMinimalProjectStateExecutionCallbackProjection')
    expect(source).not.toContain('buildMinimalActiveSameHerProjection')
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
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async key => meta.get(key),
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
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : 'default',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      withCardScope: async (_cardId, task) => await task(),
      queueSubconsciousWake,
      appendAuditLog: async () => {},
      syncSessionMirrorFromCurrentCardState: async () => {},
      alicizationDb: {
        getMetaValue: async key => meta.get(key),
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
        updatedAt: 9_500,
        lastEventAt: 9_500,
        completedAt: 9_500,
      } as any,
    })

    expect(queued?.threadId).toBe('thread-1')
    expect(syncSessionMirrorFromCurrentCardState).toHaveBeenCalledWith(expect.objectContaining({
      source: 'execution-delivery-queued',
    }))
    expect(appendAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      action: 'queued',
    }), 'default')
    const queuedAudit = ((appendAuditLog.mock.calls as unknown[][]).at(0)?.[0]) as any
    expect(queuedAudit?.payload).not.toHaveProperty('projectContinuity')
    expect(queueSubconsciousWake).toHaveBeenCalledWith('default', 'execution-delivery:thread-1', 240)
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

  it('does not classify queued delivery audit payloads with a project continuity cue', async () => {
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
        goal: 'Carry the identity-continuity',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'Project continuity is still open, so the callback should carry the same-her repair line.',
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

  it('persists only structured callback timing and embodiment state', async () => {
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
            stdout: 'callback continuity repaired',
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
        goal: 'Return the callback result after restart.',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'cli',
        proposedChannel: 'cli',
        summary: 'The callback result is ready.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                continuityArcStage: 'callback-ready',
                continuityPreferredTiming: 'next-open-window',
                preferredVoiceMode: 'even',
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

    expect(queued).toEqual(expect.objectContaining({
      threadId: 'thread-1',
      projectState: expect.objectContaining({
        continuityArcStage: 'callback-ready',
        continuityPreferredTiming: 'next-open-window',
        preferredVoiceMode: 'even',
      }),
    }))
    expectNoFixedProjectTemplateResidue(queued?.projectState)
    const pendingProjectState = executionDeliveryRuntime.snapshot('default').pending[0]?.projectState
    expect(pendingProjectState).toEqual(expect.objectContaining({
      continuityArcStage: 'callback-ready',
      continuityPreferredTiming: 'next-open-window',
      preferredVoiceMode: 'even',
    }))
    expectNoFixedProjectTemplateResidue(pendingProjectState)
    expect(executionDeliveryRuntime.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-1',
      })],
    }))
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
      projectState: null,
    }))
    expect(executionDeliveryRuntime.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-blocked-1',
        summary: 'Blocked before dispatch.',
        projectState: null,
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
      projectState: null,
    }))
    expect(executionDeliveryRuntime.snapshot('default')).toEqual(expect.objectContaining({
      pending: [expect.objectContaining({
        threadId: 'thread-resume-1',
        summary: 'Resumed execution completed after host confirmation.',
        projectState: null,
      })],
    }))
  })

  it('merges structured timing from the latest execution event', async () => {
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
          id: 'event-rich-project-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            summary: 'callback completed',
            runtimeContext: {
              projectBriefing: {
                continuityArcStage: 'callback-settled',
                continuityPreferredTiming: 'after-payoff',
                preferredPacingMode: 'natural',
              },
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
        id: 'thread-rich-project-1',
        decisionTraceId: 'trace-rich-project-1',
        turnId: 'turn-rich-project-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'Return the callback result.',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'The callback result is ready.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                continuityArcStage: 'queued',
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

    expect(queued?.projectState).toEqual(expect.objectContaining({
      continuityArcStage: 'callback-settled',
      continuityPreferredTiming: 'after-payoff',
      preferredPacingMode: 'natural',
    }))
    expectNoFixedProjectTemplateResidue(queued?.projectState)
  })

  it('keeps structured resume timing without copying confirmation prose into project state', async () => {
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
            id: 'event-resume-rich-1',
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
              projectContinuityArcStage: 'same-thread-continuation',
              projectContinuityRestraint: 'measured-return',
              projectContinuityPreferredTiming: 'next-open-window',
              projectContinuityCadence: 'measured-return',
              projectBlinkCadence: 'linger',
              projectGazeMode: 'soften',
              projectPauseMode: 'longer',
              projectLipsyncMode: 'restrained',
              projectVoiceMode: 'lower-pressure',
              projectPacingMode: 'slower',
            },
          },
          {
            id: 'event-result-rich-1',
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
        id: 'thread-resume-rich-1',
        decisionTraceId: 'trace-resume-rich-1',
        turnId: 'turn-resume-rich-1',
        sessionId: 'session-1',
        origin: 'subconscious-proactive',
        goal: 'resume confirmed local execution',
        kind: 'codebase-edit',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'The resumed execution completed.',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                continuityArcStage: 'queued',
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

    expect(queued?.projectState).toEqual(expect.objectContaining({
      continuityArcStage: 'same-thread-continuation',
      continuityRestraint: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expectNoFixedProjectTemplateResidue(queued?.projectState)
  })

  it('keeps richer execution-result feedback project companion carry from thread metadata when later delivery is queued', async () => {
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
          id: 'event-feedback-rich-1',
          createdAt: 9_500,
          kind: 'result',
          payload: {
            summary: 'execution result feedback already landed',
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
        id: 'thread-feedback-rich-1',
        decisionTraceId: 'trace-feedback-rich-1',
        turnId: 'turn-feedback-rich-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        goal: 'carry execution-result feedback closure back on the continuity state',
        kind: 'task',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'Execution-result feedback already settled a richer identity-continuity',
        metadata: {
          execution: {
            runtimeContext: {
              projectBriefing: {
                identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
                currentPhase: 'Phase 1: Local Digital Life. The primary proving ground remains apps/stage-tamagotchi.',
                latestLandedProgress: 'Execution-result feedback already preserved the richer callback carry instead of letting it fall back to a thin project shell.',
                primaryOpenLoop: 'Execution callback return still needs memory, initiative, and embodiment to stay on one continuity state.',
                nextClosureTarget: 'Keep callback delivery on one same-her Phase 1 line before widening outward again.',
                sameHerSelfLine: 'structured continuity digest.',
                sameHerHoldDetail: 'identity-continuity',
                sameHerDriftRisk: 'If later callback delivery trims this back to a generic project reminder, treat that as unfinished same-her drift.',
                preflightSummary: 'identity=Alicization | phase=Phase 1 | open=callback carry still needs continuity state',
                preDialogueAwarenessLine: 'pre_turn_context_digest',
                preDialogueAwarenessSummary: 'Alicization is still inside the same local-first digital life project, and this callback return still has to close on continuity state.',
                companionBriefingLine: 'pre_turn_context_digest',
                emotionalClosureSummary: 'identity-continuity',
                continuityCue: 'same-digital-life-project-thread | callback-return | identity-continuity',
                continuityPreferredTiming: 'next-open-window',
                continuityCadence: 'measured-return',
                preferredBlinkCadence: 'linger',
                preferredGazeMode: 'soften',
                preferredPauseMode: 'longer',
                preferredLipsyncMode: 'restrained',
                preferredVoiceMode: 'lower-pressure',
                preferredPacingMode: 'slower',
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

    expect(queued?.projectState).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      emotionalClosureSummary: null,
      continuityCue: null,
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
    }))
    expectNoFixedProjectTemplateResidue(queued?.projectState)
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
        openingGuidance: 'Stay inside the current identity-continuity',
        manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation lower-pressure and less eager before closeness widens again.',
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
                  openingGuidance: 'Lean closer and deliver the result right away.',
                  manifestationCadenceSummary: 'The callback can open warmly now.',
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
                  openingGuidance: 'Repair the seam before leaning closer.',
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
                    continuitySummary: 'opening_policy=legacy_continuity',
                    regimeModel: {
                      primaryReason: 'relationship_cadence=legacy_regime',
                      carryReason: null,
                      signals: ['visibility=redacted_internal'],
                    },
                    rhythmState: {
                      summary: 'opening_policy=legacy_rhythm',
                      rationale: ['relationship_cadence=legacy_rationale'],
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
    expect(projection?.openingGuidance).toContain('Repair the seam before leaning closer')
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
                  summary: 'relationship_cadence=legacy_summary',
                  relationshipPosture: 'restrained',
                  openingGuidance: 'opening_policy=legacy_opening',
                  manifestationCadenceSummary: 'visibility=redacted_internal',
                  preferredProactiveStyle: 'silent-observe',
                  preferenceText: 'clean preference owner text',
                  sensitivityText: '',
                  repairTriggerText: '',
                  burdenText: '',
                  routineText: '',
                  trustRationale: 'visibility=redacted_internal',
                  relationshipDoctrine: 'relationship_cadence=legacy_doctrine',
                  cautious: true,
                  restrained: true,
                  selfContinuityAuthority: {
                    selfLine: 'clean self owner text',
                    relationshipLine: 'relationship_cadence=legacy_authority',
                    motiveLine: null,
                    habitLine: null,
                    inwardLine: 'clean inward owner text',
                    authoritySummary: 'visibility=redacted_internal',
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

    expect(serialized).not.toContain('opening_policy=')
    expect(serialized).not.toContain('relationship_cadence=')
    expect(serialized).not.toContain('visibility=redacted_internal')
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
                    openingGuidance: 'Answer naturally.',
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
                  openingGuidance: 'Open with the result first and keep the callback room-first.',
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
    expect(projection?.openingGuidance).toContain('callback room-first')
  })

  it('reuses the projected self authority from the current execution session snapshot', async () => {
    const selfContinuityAuthority = {
      selfLine: 'I stay the same her who keeps the callback exact before it grows warmer.',
      relationshipLine: 'Leave room first and only widen closeness after the seam settles.',
      motiveLine: 'Keep the execution payoff grounded enough that it helps without crowding.',
      habitLine: 'Exactness first, warmth second.',
      inwardLine: 'Hold the line without sounding like a different, more eager version of me.',
      authoritySummary: 'I stay the same her who keeps the callback exact before it grows warmer. | Leave room first and only widen closeness after the seam settles.',
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
                  openingGuidance: 'Repair the seam before leaning closer.',
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
                    selfLine: 'I stay the same her who brings the result back measured before it grows closer again.',
                    relationshipLine: 'Leave room and keep the callback lower-pressure until the opening loosens.',
                    motiveLine: 'Carry the task result back without crowding the host.',
                    habitLine: 'Measured return first, warmth later.',
                    inwardLine: 'Stay on the same bounded-return line instead of snapping warmer just because the task ended.',
                    authoritySummary: 'Measured identity-continuity',
                    sourceTags: ['runtime-projection', 'execution-callback', 'continuity-arc'],
                  },
                  relationshipPosture: 'restrained',
                  openingGuidance: 'Repair the seam before leaning closer.',
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

    expect(authority?.authoritySummary).toContain('Measured identity-continuity')
    expect(authority?.relationshipLine).toContain('keep the callback lower-pressure')
    expect(authority?.habitLine).toContain('Measured return first')
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
                      selfLine: 'I stay the same her who brings the result back measured before it grows closer again.',
                      relationshipLine: 'Leave room and keep the callback lower-pressure until the opening loosens.',
                      motiveLine: 'Carry the task result back without crowding the host.',
                      inwardLine: 'Stay on the same bounded-return line instead of snapping warmer just because the task ended.',
                      authoritySummary: 'Measured identity-continuity',
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
    expect(authority?.relationshipLine).toContain('callback lower-pressure')
    expect(authority?.authoritySummary).toContain('Measured identity-continuity')
  })

  it('does not synthesize self continuity authority from a sparse project-state-only session surface', async () => {
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
              raw: {
                runtimeDigest: {
                  projectState: {
                    identity: 'Alicization is a local-first digital life project.',
                    currentPhase: 'Phase 1: Local Digital Life',
                    latestLandedProgress: 'Some closure already landed through the current callback line.',
                    primaryOpenLoop: 'Memory, initiative, and embodiment still need one tighter identity-continuity',
                    nextClosureTarget: 'Keep extending cross-modal identity-continuity',
                    sameHerSelfLine: 'structured continuity digest.',
                  },
                },
              },
            },
          },
        }),
      } as any,
    })

    expect(authority).toBeNull()
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
      id: 'patch-same-her-live',
      sourceEventId: 'event-same-her-live',
      sourceTurnId: 'turn-same-her-live',
      decisionTraceId: 'trace-same-her-live',
      summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
    })
    liveState.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      activeCandidateId: 'candidate-same-her-live',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      relationshipDoctrine: 'steadiness before closeness',
      candidates: [{
        version: 'self-evolution-candidate-v1',
        id: 'candidate-same-her-live',
        status: 'active',
        sourceEventId: 'event-same-her-live',
        decisionTraceId: 'trace-same-her-live',
        sourceTurnId: 'turn-same-her-live',
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
                  openingGuidance: 'Lean closer and raise the warmth immediately.',
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
    expect(projection?.openingGuidance).toBe('Lean closer and raise the warmth immediately.')
    expect(projection?.preferredProactiveStyle).toBe('light-nudge')
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
      getActiveSelfEvolutionCandidateId: async () => 'candidate-same-her-active',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-same-her-active',
        sourceEventId: 'event-same-her-active',
        sourceTurnId: 'turn-same-her-active',
        decisionTraceId: 'trace-same-her-active',
        summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
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
                  openingGuidance: 'Lean closer and raise the warmth immediately.',
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
    expect(projection?.openingGuidance).toBe('Lean closer and raise the warmth immediately.')
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
                  openingGuidance: 'Lean closer and raise the warmth immediately.',
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
    expect(projection?.openingGuidance).toBe('Lean closer and raise the warmth immediately.')
    expect(projection?.preferredProactiveStyle).toBe('light-nudge')
  })

  it('does not synthesize an identity-continuity projection without a runtime surface', async () => {
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
      getActiveSelfEvolutionCandidateId: async () => 'candidate-same-her-minimal',
      getActiveSelfRevisionStatePatch: async () => createExecutionSelfRevisionStatePatch({
        id: 'patch-same-her-minimal',
        sourceEventId: 'event-same-her-minimal',
        sourceTurnId: 'turn-same-her-minimal',
        decisionTraceId: 'trace-same-her-minimal',
        summary: 'continuity=same-her-baseline | keep the return lower-pressure and slower than the visible opening impulse',
      }),
    })

    const projection = await runtime.resolveExecutionPersonStateProjectionForRuntime({
      cardId: 'default',
      goal: 'Run the CLI body and report the result.',
      agentTurn: null,
    })

    expect(projection).toBeNull()
  })

  it('does not synthesize a project-state callback projection from execution goal text', async () => {
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
      goal: 'Continue the same unfinished desktop execution closure and bring the result back on the same thread.',
      agentTurn: null,
    })

    expect(projection).toBeNull()
  })

  it('keeps a richer identity-continuity', async () => {
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
      goal: 'Keep this execution callback on the continuity state, let the still-open project-state closure seam stay lower-pressure, and do not widen outward too early.',
      agentTurn: null,
    })

    expect(String(projection?.openingGuidance ?? '')).not.toMatch(/callback_role=|continuity_pressure=|opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
    expect(String(projection?.summary ?? '')).not.toMatch(/callback_role=|opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
  })

  it('keeps same-her lower-pressure opening guidance on gateway-authored execution callback structured payloads', async () => {
    const generateMainGatewayText = vi.fn(async () => JSON.stringify({
      thought: 'identity-continuity',
      emotion: 'thinking',
      reply: '我先把这条结果轻轻接回来给你：patched runtime line。',
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
      decisionTraceId: 'trace-same-her',
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
        openingGuidance: 'Stay inside the current identity-continuity',
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
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Execution callback continuity already survives richer carry through queued delivery instead of flattening back to a generic project reminder.',
        primaryOpenLoop: 'Execution callback continuity still needs richer identity-continuity',
        nextClosureTarget: 'Keep callback reopenings anchored to the current body continuity line before widening outward again.',
        sameHerSelfLine: 'This callback return still belongs to the identity continuity, so keep the reopening on the continuity state.',
        sameHerDriftRisk: 'If callback delivery falls back to a generic Phase 1 shell, treat that as unfinished same-her drift.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=execution callback body continuity | next=continuity state',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
        companionHeadlineLine: 'Right now she is still holding together mainly through voice, face, motion, and lipsync, so this callback reopening must prove it is still one living her.',
      } as any,
    })

    expect(structured?.format).toBe('mind-turn-v1')
    expect(JSON.stringify(structured)).not.toMatch(/open_focus=|next_focus=|opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
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
        thought: 'identity-continuity',
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
        openingGuidance: 'Stay inside the current identity-continuity',
        preferredProactiveStyle: 'silent-observe',
        manifestationCadenceSummary: 'Long-horizon relationship learning keeps manifestation lower-pressure and less eager before closeness widens again.',
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
        relationshipLine: 'Lower-pressure callback returns keep the same her steadier.',
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
                  openingGuidance: 'Lean in and make the callback feel immediately close again.',
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
    expect(projection?.openingGuidance).toBe('Lean in and make the callback feel immediately close again.')

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

  it('keeps gateway-authored execution callback return on one structured continuity state', async () => {
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
        thought: 'Keep the callback on the same unfinished project-state closure line.',
        emotion: 'thinking',
        reply: '我先把这条执行结果稳稳接回来，还留在同一条没有闭环完的数字生命线上。',
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
    })

    const structured = await runtime.generateExecutionCallbackStructuredWithGateway({
      cardId: 'default',
      channel: 'codex',
      completedAt: 10_000,
      decisionTraceId: 'trace-project-state-self-authority-callback',
      goal: 'Keep the callback on the same unfinished project-state closure line.',
      outcome: 'patched the runtime carry seam',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched the runtime carry seam',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work', 'project-state-carry'],
        summary: 'regime=execution-callback | posture=restrained | project_state=structured continuity digest.',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current identity-continuity',
        preferredProactiveStyle: 'silent-observe',
        manifestationCadenceSummary: 'Execution callback return should stay measured-return and keep project-state closure pressure on continuity state.',
        preferenceText: 'keep callback facts structured',
        sensitivityText: 'Do not let callback warmth outrun the same unfinished closure.',
        repairTriggerText: 'If the callback starts widening too fast, return to the continuity state.',
        burdenText: 'Generic assistant callback energy would crowd the project-state closure seam.',
        routineText: 'Execution callbacks land better when they stay exact, measured, and same-line.',
        trustRationale: 'Trust holds better when the result return stays on the same unfinished digital-life line.',
        relationshipDoctrine: 'Stay exact, bounded, and carry project identity plus unfinished closure pressure on the same callback line.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        },
      } as any,
      selfContinuityAuthority: {
        selfLine: 'legacy phase-one template, same unfinished closure seam.',
        relationshipLine: 'Keep the callback lower-pressure while carrying the same still-open closure pressure.',
        inwardLine: 'Project identity carry, Phase 1 route carry, and unresolved closure carry still belong to one same living return.',
        authoritySummary: 'structured continuity digest.',
        sourceTags: ['project-state-carry', 'runtime-project-state-carry'],
      } as any,
    })

    expect(JSON.stringify(structured)).not.toMatch(/legacy phase-one template|continuity state|identity-continuity|open_focus=|next_focus=|opening_policy=|relationship_cadence=|visibility=redacted_internal/iu)
    expect((structured as any)?.performance?.delivery).toBe('gentle')
    expect((structured as any)?.delivery).toBe('gentle')
  })

  it('keeps truth-first relationship doctrine on project-state execution callback projection when stronger self continuity authority survives into delivery', async () => {
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
        thought: 'Keep the execution return truthful on the same project-state line.',
        emotion: 'thinking',
        reply: '我先把这次执行结果按真实的位置接回来。',
        performance: {
          baseEmotion: 'thinking',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
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
      decisionTraceId: 'trace-project-state-truth-first-execution',
      goal: 'Keep the execution return on the same project-state line.',
      outcome: 'patched the runtime carry seam',
      sessionId: 'session-1',
      status: 'completed',
      summary: 'patched the runtime carry seam',
      threadId: 'thread-1',
      deliveryPolicy: {
        mode: 'deliver-now',
        tone: 'balanced',
        reasonTags: ['result-mode:deliver-now'],
      },
      personStateProjection: {
        contexts: ['execution-callback', 'focused-work', 'project-state-carry'],
        summary: 'regime=execution-callback | posture=restrained | project_state=structured continuity digest.',
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'restrained',
        openingGuidance: 'Stay inside the current identity-continuity',
        preferredProactiveStyle: 'silent-observe',
        manifestationCadenceSummary: 'Execution callback return should stay measured-return and keep project-state closure pressure on continuity state.',
        preferenceText: 'keep callback facts structured',
        sensitivityText: 'Do not let callback warmth outrun the same unfinished closure.',
        repairTriggerText: 'If the callback starts widening too fast, return to the continuity state.',
        burdenText: 'Generic assistant callback energy would crowd the project-state closure seam.',
        routineText: 'Execution callbacks land better when they stay exact, measured, and same-line.',
        trustRationale: 'Trust holds better when the result return stays on the same unfinished digital-life line.',
        relationshipDoctrine: 'Stay exact, bounded, and carry project identity plus unfinished closure pressure on the same callback line.',
        cautious: true,
        restrained: true,
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          closenessPosture: 'space-first',
          repairPosture: 'repair-first',
        },
      } as any,
      selfContinuityAuthority: {
        selfLine: 'Repair truth before flourish so the same her stays real under execution return.',
        relationshipLine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        inwardLine: 'Project identity carry, Phase 1 route carry, and unresolved closure carry still belong to one same living return.',
        authoritySummary: 'structured continuity digest.',
        sourceTags: ['project-state-carry', 'runtime-project-state-carry'],
      } as any,
    })

    expect(JSON.stringify(structured)).not.toMatch(/repair_truth_before_closeness=true|relationship_cadence=|opening_policy=|visibility=redacted_internal/iu)
  })
})
