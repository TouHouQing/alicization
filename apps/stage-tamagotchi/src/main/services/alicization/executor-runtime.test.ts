import type { AlicizationTaskThreadRecord } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationExecutorRuntime, inferPreferredProcedureChannel } from './executor-runtime'

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
      execution: {
        runtimeContext: {
          projectBriefing: {
            identity: 'Legacy project identity prompt.',
            currentPhase: 'Legacy phase prompt.',
            continuityCue: 'opening_policy=legacy',
            continuityCadence: 'relationship_cadence=legacy',
            preferredVoiceMode: 'lower-pressure',
          },
        },
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: 100,
    completedAt: null,
  }
}

function createDbState(initialThread: AlicizationTaskThreadRecord) {
  let currentThread = initialThread
  const appendExecutionEvents = vi.fn(async () => {})
  const getTaskThread = vi.fn(async (id: string) => id === currentThread.id ? { ...currentThread } : undefined)
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadRecord) => {
    currentThread = {
      ...currentThread,
      ...input,
      metadata: input.metadata ?? currentThread.metadata,
    }
    return { ...currentThread }
  })

  return {
    appendExecutionEvents,
    getCurrentThread: () => currentThread,
    upsertTaskThread,
    db: {
      appendExecutionEvents,
      getTaskThread,
      getLatestRelationshipDynamics: vi.fn(async () => null),
      listChannelCapabilityManifests: vi.fn(async () => []),
      listExecutionEvents: vi.fn(async () => []),
      listRecentEpisodicEvents: vi.fn(async () => []),
      listExecutorSessions: vi.fn(async () => []),
      listTaskThreads: vi.fn(async () => []),
      searchMemoryConsolidations: vi.fn(async () => []),
      upsertChannelCapabilityManifest: vi.fn(async () => {}),
      upsertExecutorSession: vi.fn(async () => {}),
      upsertTaskThread,
    },
  }
}

function createRuntime(input: {
  dbState: ReturnType<typeof createDbState>
  dispatchTaskThread: ReturnType<typeof vi.fn>
  localCapabilities?: Array<Record<string, unknown>>
}) {
  return createAlicizationExecutorRuntime({
    appendAuditLog: vi.fn(async () => {}),
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

describe('executor runtime inferPreferredProcedureChannel', () => {
  it('prefers browser for remembered webpage procedures', () => {
    expect(inferPreferredProcedureChannel('Open the browser page, search, and click the compose button.'))
      .toEqual({
        channel: 'browser',
        reason: 'remembered-procedure-browser-shape',
      })
  })

  it('prefers desktop for remembered native window procedures', () => {
    expect(inferPreferredProcedureChannel('Switch to the desktop window and confirm the file chooser dialog.'))
      .toEqual({
        channel: 'desktop',
        reason: 'remembered-procedure-desktop-shape',
      })
  })
})

describe('executor runtime capability resolution', () => {
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
})

describe('executor runtime resumeMainGatewayTaskThread', () => {
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
    })

    expect(result.ok).toBe(true)
    expect(dispatchedPrompt).toContain('Goal: Patch the current runtime after host approval.')
    expect(dispatchedPrompt).toContain('Summary: Waiting for explicit host approval before applying the patch.')
    expect(dispatchedPrompt).toContain('Report execution blockers, tool failures, and uncertainty directly')
    expect(dispatchedPrompt).not.toMatch(/runtime_context=|project_|continuity_|same_her|opening_policy=|relationship_cadence=|preferred_(?:blink|gaze|voice|pacing)/iu)
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
    expect(JSON.stringify(event?.payload ?? {})).not.toMatch(/project|sameHer|continuity|preferredBlink|preferredGaze|preferredVoice|opening_policy=|relationship_cadence=/iu)
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
        execution: {
          runtimeContext: {
            projectBriefing: {
              identity: 'Legacy project identity prompt.',
              continuityCue: 'opening_policy=legacy',
            },
          },
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
    })

    expect(result.ok).toBe(true)
    expect(instruction).toContain('Goal: Continue submitting the visible browser form.')
    expect(instruction).toContain('Summary: Continue from the visible form step.')
    expect(instruction).not.toMatch(/runtime_context=|project_|continuity_|same_her|opening_policy=/iu)
  })
})
