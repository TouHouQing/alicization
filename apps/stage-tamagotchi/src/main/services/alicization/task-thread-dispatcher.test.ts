import type {
  AlicizationExecutionEventInput,
  AlicizationExecutionRuntimeContext,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { dispatchTaskThread } from './task-thread-dispatcher'

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(/Before (?:answering|speaking|acting)|Right now I am|legacy phase-one template|same[- ]her|continuity state|one living her|identity continuity|local-first digital life project|Phase 1: Local Digital Life|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu)
  expect(containsAlicizationFixedTemplateResidue(String(value ?? ''))).toBe(false)
}

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-dispatch-1',
    decisionTraceId: 'mind:trace:dispatch-1',
    turnId: 'turn-dispatch-1',
    sessionId: 'session-dispatch-1',
    origin: 'user-turn',
    goal: 'Execute the current CLI body.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'planned cli body',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

function createPort(initialThread: AlicizationTaskThreadRecord) {
  let currentThread = { ...initialThread }

  const getTaskThread = vi.fn(async (id: string) => {
    if (id !== currentThread.id)
      return undefined
    return { ...currentThread }
  })
  const appendExecutionEvents = vi.fn(async (events: AlicizationExecutionEventInput[]) => {
    const latest = [...events].sort((left, right) => (left.createdAt ?? 0) - (right.createdAt ?? 0)).at(-1)
    if (!latest)
      return

    currentThread = {
      ...currentThread,
      status: latest.threadStatus ?? currentThread.status,
      lastEventAt: latest.createdAt ?? currentThread.lastEventAt,
      updatedAt: latest.createdAt ?? currentThread.updatedAt,
      completedAt: latest.threadStatus === 'completed' || latest.threadStatus === 'failed' || latest.threadStatus === 'cancelled'
        ? (latest.createdAt ?? currentThread.completedAt ?? currentThread.updatedAt)
        : currentThread.completedAt,
    }
  })
  const upsertTaskThread = vi.fn(async (input: AlicizationTaskThreadUpsertInput) => {
    currentThread = {
      ...currentThread,
      ...input,
      id: input.id ?? currentThread.id,
    }
    return { ...currentThread }
  })
  const upsertExecutorSession = vi.fn().mockResolvedValue(undefined)
  const appendAuditLog = vi.fn().mockResolvedValue(undefined)

  return {
    getTaskThread,
    appendExecutionEvents,
    upsertTaskThread,
    upsertExecutorSession,
    appendAuditLog,
    readThread: () => ({ ...currentThread }),
  }
}

function createExecutionRuntimeContext(
  overrides: Omit<Partial<AlicizationExecutionRuntimeContext>, 'projectBriefing'> & {
    projectBriefing?: Partial<NonNullable<AlicizationExecutionRuntimeContext['projectBriefing']>> | null
  } = {},
): AlicizationExecutionRuntimeContext {
  const {
    projectBriefing: projectBriefingOverrides,
    ...restOverrides
  } = overrides

  return {
    generatedAt: 1_710_000_000_000,
    cardId: 'default',
    turnId: 'turn-dispatch-1',
    decisionTraceId: 'mind:trace:dispatch-1',
    sessionId: 'session-dispatch-1',
    projectBriefing: projectBriefingOverrides === null
      ? null
      : {
          identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
          nextClosureTarget: 'Keep extending identity-continuity',
          sameHerSelfLine: 'structured continuity digest.',
          sameHerHoldDetail: 'identity-continuity',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
          companionBriefingLine: 'pre_turn_context_digest',
          emotionalClosureSummary: 'Keep the return low-pressure so the continuity state does not restart from scratch.',
          continuityCue: 'Keep this execution return on the same project-aware living line before widening outward.',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory still needs stronger identity-continuity',
          preDialogueAwarenessLine: 'pre_turn_context_digest',
          ...projectBriefingOverrides,
        },
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
    ...restOverrides,
  }
}

describe('task-thread dispatcher', () => {
  it('dispatches a planned CLI thread into completed state', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher ok")'],
        runtimeContext: createExecutionRuntimeContext(),
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
    expect(result.summary).toContain('dispatcher ok')
    expect(port.appendExecutionEvents).toBeCalledTimes(1)
    expect(port.upsertTaskThread).toBeCalled()
  })

  it('requires execution runtime context before dispatch begins when neither payload nor stored thread metadata carries one', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("should not run without runtime context")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_RUNTIME_CONTEXT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(result.summary).toContain('runtime context')
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('preserves richer pre-dialogue project awareness summary when dispatch merges payload and stored runtime context', async () => {
    const richerStoredSummary = 'pre_turn_context_digest'
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: createExecutionRuntimeContext({
            projectBriefing: {
              ...createExecutionRuntimeContext().projectBriefing!,
              preDialogueAwarenessLine: 'template-residue-shell',
              preDialogueAwarenessSummary: richerStoredSummary,
            },
          }),
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher summary merge ok")'],
        runtimeContext: createExecutionRuntimeContext({
          projectBriefing: {
            ...createExecutionRuntimeContext().projectBriefing!,
            preDialogueAwarenessLine: 'template-residue-shell',
            preDialogueAwarenessSummary: 'template-residue-shell',
          },
        }),
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    const persistedRuntimeContext = ((port.readThread().metadata?.execution as Record<string, any> | undefined)?.runtimeContext ?? null) as AlicizationExecutionRuntimeContext | null
    expectNoFixedTemplateResidue(persistedRuntimeContext?.projectBriefing)
    expect(persistedRuntimeContext?.projectBriefing?.preDialogueAwarenessSummary).toContain('visibility=redacted_internal')
    expect(persistedRuntimeContext?.projectBriefing?.preDialogueAwarenessSummary).toContain('open_loop=')
  })

  it('keeps non-planned threads from dispatching', async () => {
    const port = createPort(createThread({
      status: 'needs-affirmation',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("no run")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_NOT_DISPATCHABLE')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('marks threads blocked when dispatch is attempted under kill-switch suspension', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("blocked")'],
      },
      killSwitchSuspended: true,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.thread.status).toBe('blocked')
    expect(result.createdEventKinds).toEqual(['cancel'])
    expect(port.appendExecutionEvents).toBeCalledWith([
      expect.objectContaining({
        kind: 'cancel',
        threadStatus: 'blocked',
      }),
    ])
  })

  it('requires codex payload when the planned thread selects codex', async () => {
    const port = createPort(createThread({
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      kind: 'codebase-investigation',
      goal: 'Inspect the current codebase task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CODEX_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('requires claude-code payload when the planned thread selects claude-code', async () => {
    const port = createPort(createThread({
      selectedChannel: 'claude-code',
      proposedChannel: 'claude-code',
      kind: 'agent-delegation',
      goal: 'Delegate the current coding task.',
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe('TASK_THREAD_CLAUDE_CODE_INPUT_REQUIRED')
    expect(result.createdEventKinds).toEqual([])
    expect(port.appendExecutionEvents).not.toBeCalled()
  })

  it('dispatches openclaw payloads through the embodied executor channel', async () => {
    const port = createPort(createThread({
      selectedChannel: 'openclaw',
      proposedChannel: 'openclaw',
      kind: 'desktop-automation',
      goal: 'Close the foreground popup.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'popup closed',
        session_id: 'openclaw-dispatch-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Close the popup that is blocking the current screen.',
          runtimeContext: {
            generatedAt: 1_710_000_000_000,
            cardId: 'default',
            turnId: 'turn-dispatch-1',
            decisionTraceId: 'mind:trace:dispatch-1',
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
          },
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('popup closed')
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'openclaw',
          transportChannel: 'openclaw',
          execution: expect.objectContaining({
            runtimeContext: expect.objectContaining({
              cardId: 'default',
              turnId: 'turn-dispatch-1',
              sensory: expect.objectContaining({
                foregroundWindow: expect.objectContaining({
                  appName: 'Cursor',
                }),
              }),
            }),
          }),
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('dispatches browser facade threads through openclaw while keeping browser execution events', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        reply: 'browser form submitted',
        session_id: 'openclaw-browser-session',
      }),
    }))
    const previousUrl = process.env.ALICIZATION_OPENCLAW_URL
    const previousToken = process.env.ALICIZATION_OPENCLAW_TOKEN
    process.env.ALICIZATION_OPENCLAW_URL = 'http://127.0.0.1:9311'
    process.env.ALICIZATION_OPENCLAW_TOKEN = 'test-token'
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread(port, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
      expect(result.summary).toContain('browser form submitted')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).toBeCalledWith(expect.objectContaining({
        channel: 'openclaw',
        metadata: expect.objectContaining({
          selectedChannel: 'browser',
          transportChannel: 'openclaw',
        }),
      }))
      expect(fetchMock).toBeCalledTimes(1)
    }
    finally {
      vi.unstubAllGlobals()
      if (typeof previousUrl === 'string')
        process.env.ALICIZATION_OPENCLAW_URL = previousUrl
      else
        delete process.env.ALICIZATION_OPENCLAW_URL
      if (typeof previousToken === 'string')
        process.env.ALICIZATION_OPENCLAW_TOKEN = previousToken
      else
        delete process.env.ALICIZATION_OPENCLAW_TOKEN
    }
  })

  it('prefers local visual dispatch for browser threads when the runtime exposes local GUI handlers', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread({
        ...port,
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Local browser workflow inspection completed.',
            output: 'local browser workflow inspection completed',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      }, {
        threadId: 'thread-dispatch-1',
        openclaw: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      })

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
      expect(result.summary).toContain('local browser workflow inspection completed')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).not.toBeCalled()
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('dispatches browser local visual payloads through the local GUI handler without requiring openclaw input', async () => {
    const port = createPort(createThread({
      selectedChannel: 'browser',
      proposedChannel: 'browser',
      kind: 'browser-automation',
      goal: 'Submit the visible browser form.',
    }))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    try {
      const result = await dispatchTaskThread({
        ...port,
        localVisualSurface: {
          desktopInspectScene: vi.fn(async () => ({
            channel: 'desktop',
            status: 'completed',
            operation: 'desktop_inspect_scene',
            summary: 'Dedicated local visual payload dispatched through the runtime local GUI bridge.',
            output: 'local visual payload dispatcher ok',
            pagePhase: 'form-entry',
            workflowPlan: {
              continuationMode: 'ready-to-act',
            },
            suggestedActions: [],
            blockingSignals: [],
          })),
        },
      }, {
        threadId: 'thread-dispatch-1',
        localVisual: {
          instruction: 'Submit the visible browser form in the focused tab.',
          runtimeContext: createExecutionRuntimeContext(),
        },
      } as any)

      expect(result.ok).toBe(true)
      expect(result.thread.status).toBe('completed')
      expect(result.createdEventKinds).toEqual(expect.arrayContaining(['dispatch', 'result']))
      expect(result.summary).toContain('Dedicated local visual payload')
      expect(port.appendExecutionEvents).toBeCalledWith(expect.arrayContaining([
        expect.objectContaining({
          channel: 'browser',
          kind: 'dispatch',
        }),
        expect.objectContaining({
          channel: 'browser',
          kind: 'result',
        }),
      ]))
      expect(port.upsertExecutorSession).not.toBeCalled()
      expect(fetchMock).not.toBeCalled()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('persists execution runtime context onto the task thread metadata before dispatch', async () => {
    const port = createPort(createThread())

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log("dispatcher context ok")'],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-dispatch-1',
          decisionTraceId: 'mind:trace:dispatch-1',
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
            nextClosureTarget: 'Keep extending identity-continuity',
            sameHerSelfLine: 'structured continuity digest.',
            sameHerHoldDetail: 'identity-continuity',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
            continuityCue: 'Keep this execution return on the same project-aware living line before widening outward.',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=memory still needs stronger identity-continuity',
            preDialogueAwarenessLine: 'pre_turn_context_digest',
          },
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
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('project_continuity=')
    expect(result.summary).toContain('Project identity carry')
    expectNoFixedTemplateResidue(port.readThread().metadata)
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-dispatch-1',
          projectBriefing: expect.objectContaining({
            identity: expect.stringContaining('phase1_local_digital_life'),
            currentPhase: expect.stringContaining('phase1_local_digital_life'),
            latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
            primaryOpenLoop: expect.stringContaining('Project identity carry'),
            nextClosureTarget: expect.stringContaining('life_loop_continuity'),
            sameHerSelfLine: expect.stringContaining('phase1_local_digital_life'),
            sameHerDriftRisk: expect.stringContaining('generic_guidance'),
            preDialogueAwarenessLine: expect.stringContaining('visibility=redacted_internal'),
          }),
        }),
      }),
    }))
  })

  it('reuses stored execution runtime context when dispatch payload omits it', async () => {
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: createExecutionRuntimeContext(),
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'console.log(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON ? "stored runtime context reused" : "missing runtime context")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.thread.status).toBe('completed')
    expect(result.summary).toContain('stored runtime context reused')
    expect(result.summary).toContain('project_continuity=')
    expectNoFixedTemplateResidue(result.summary)
  })

  it('keeps stored project briefing when dispatch payload refreshes sensory context without project briefing', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext()
    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_500,
      projectBriefing: null,
      sensory: {
        collectedAt: 1_710_000_000_555,
        running: true,
        stale: false,
        ageMs: 3,
        foregroundWindow: {
          appName: 'Terminal',
          processName: 'zsh',
          title: 'dispatch refreshed sensory',
        },
        capture: null,
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(`${ctx.sensory?.foregroundWindow?.appName || "missing-sensory"}:${ctx.projectBriefing?.currentPhase || "missing-project"}`)'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('Terminal:phase1_local_digital_life')
    expect(result.summary).toContain('project_continuity=')
    expectNoFixedTemplateResidue(port.readThread().metadata)
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          generatedAt: 1_710_000_000_500,
          projectBriefing: expect.objectContaining({
            identity: expect.stringContaining('phase1_local_digital_life'),
            currentPhase: expect.stringContaining('phase1_local_digital_life'),
            primaryOpenLoop: expect.stringContaining('Project identity carry'),
          }),
          sensory: expect.objectContaining({
            foregroundWindow: expect.objectContaining({
              appName: 'Terminal',
            }),
          }),
        }),
      }),
    }))
  })

  it('keeps stored affective residue when dispatch payload refreshes sensory context without structured execution emotion carry', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext() as AlicizationExecutionRuntimeContext & {
      affectiveResidue?: Record<string, unknown>
    }
    storedRuntimeContext.affectiveResidue = {
      version: 'affective-residue-memory-v1',
      updatedAt: 1_710_000_000_490,
      residues: [{
        kind: 'afterglow',
        intensity: 0.72,
        persistence: 0.67,
        confidence: 0.85,
        polarity: 'warm',
        releaseMode: 'delay-until-open-window',
        summary: 'Dispatch should reopen on the continuity state.',
        sourceSignals: ['dispatch-same-line'],
        lastUpdatedAt: 1_710_000_000_490,
      }],
      dominantResidueKind: 'afterglow',
      afterglowPressure: 0.71,
      repairPressure: 0.18,
      burdenPressure: 0.06,
      trustPressure: 0.45,
      restProtectivePressure: 0.12,
      relationshipCadence: {
        cadenceMode: 'measured-return',
        distancePosture: 'measured-room',
        companionshipDensity: 0.49,
        repairRecovery: 0.26,
        overreachRisk: 0.33,
        fatigueGuard: 0.17,
        afterglowCarry: 0.65,
        shouldDelayWarmth: true,
        shouldProtectRest: false,
        reasonTags: ['dispatch-same-line'],
        summary: 'Leave measured room before reopening execution.',
      },
      sourceSignals: ['dispatch-same-line'],
      summary: 'Dispatch still carries afterglow.',
    }

    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_510,
      projectBriefing: null,
      sensory: {
        collectedAt: 1_710_000_000_566,
        running: true,
        stale: false,
        ageMs: 4,
        foregroundWindow: {
          appName: 'Terminal',
          processName: 'zsh',
          title: 'dispatch refreshed sensory without residue',
        },
        capture: null,
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(`${ctx.affectiveResidue?.dominantResidueKind || "missing-residue"}:${ctx.affectiveResidue?.relationshipCadence?.cadenceMode || "missing-cadence"}`)'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.summary).toContain('afterglow:measured-return')
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          affectiveResidue: expect.objectContaining({
            dominantResidueKind: 'afterglow',
            relationshipCadence: expect.objectContaining({
              cadenceMode: 'measured-return',
            }),
          }),
          sensory: expect.objectContaining({
            foregroundWindow: expect.objectContaining({
              appName: 'Terminal',
            }),
          }),
        }),
      }),
    }))
  })

  it('fills missing payload project briefing fields from stored execution project briefing', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext()
    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_600,
      projectBriefing: {
        identity: null,
        currentPhase: 'Phase 1: Local Digital Life. Payload refreshed phase wording.',
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: 'Payload asks dispatcher to keep the refreshed closure target.',
        sameHerSelfLine: null,
        sameHerHoldDetail: null,
        sameHerDriftRisk: null,
        continuityCue: null,
        preflightSummary: null,
        preDialogueAwarenessLine: null,
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(`${ctx.projectBriefing?.identity || "missing-identity"} | ${ctx.projectBriefing?.currentPhase || "missing-phase"} | ${ctx.projectBriefing?.primaryOpenLoop || "missing-open-loop"} | ${ctx.projectBriefing?.nextClosureTarget || "missing-next"}`)'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expectNoFixedTemplateResidue(result.summary)
    expect(result.summary).toContain('phase1_local_digital_life')
    expect(result.summary).toContain('Project identity carry')
    expect(result.summary).toContain('Payload asks dispatcher to keep the refreshed closure target')
    expectNoFixedTemplateResidue(port.readThread().metadata)
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          projectBriefing: expect.objectContaining({
            identity: expect.stringContaining('phase1_local_digital_life'),
            currentPhase: 'phase1_local_digital_life',
            latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
            primaryOpenLoop: expect.stringContaining('Project identity carry'),
            nextClosureTarget: 'Payload asks dispatcher to keep the refreshed closure target.',
            sameHerSelfLine: expect.stringContaining('phase1_local_digital_life'),
          }),
        }),
      }),
    }))
  })

  it('does not let a generic payload project-state hold detail erase richer stored same-her execution briefing during dispatch runtime-context merging', async () => {
    const storedRuntimeContext = createExecutionRuntimeContext()
    const payloadRuntimeContext = createExecutionRuntimeContext({
      generatedAt: 1_710_000_000_700,
      projectBriefing: {
        ...createExecutionRuntimeContext().projectBriefing!,
        sameHerHoldDetail: 'identity-continuity"her".',
        continuityCue: 'continuity state: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
      },
    })
    const port = createPort(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
          effect: 'mutate',
        },
        execution: {
          runtimeContext: storedRuntimeContext,
        },
      },
    }))

    const result = await dispatchTaskThread(port, {
      threadId: 'thread-dispatch-1',
      cli: {
        command: 'node',
        args: ['-e', 'const ctx = JSON.parse(process.env.ALICIZATION_EXECUTION_RUNTIME_CONTEXT_JSON || "{}"); console.log(`${ctx.projectBriefing?.sameHerHoldDetail || "missing-hold"} | ${ctx.projectBriefing?.continuityCue || "missing-continuity"}`)'],
        runtimeContext: payloadRuntimeContext,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expectNoFixedTemplateResidue(result.summary)
    expect(result.summary).toContain('project_continuity=')
    expect(port.readThread().metadata).toEqual(expect.objectContaining({
      execution: expect.objectContaining({
        runtimeContext: expect.objectContaining({
          generatedAt: 1_710_000_000_700,
          projectBriefing: expect.objectContaining({
            sameHerHoldDetail: expect.stringContaining('continuity_line'),
            continuityCue: expect.stringContaining('continuity_line'),
          }),
        }),
      }),
    }))
  })
})
