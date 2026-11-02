import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import process from 'node:process'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { actionDidNotStart, withActionDispatch } from '../execution/action-dispatch-context'
import { executeClaudeCodeTaskThread } from './claude-code'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

// These callback-port unit tests exercise the POSIX transport. Windows Job
// admission, real descendants and signed receipts have native integration tests.
vi.mock('node:process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:process')>()
  return { ...actual, platform: 'darwin' }
})

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-claude-code-1',
    decisionTraceId: 'mind:trace:claude-code-1',
    turnId: 'turn-claude-code-1',
    sessionId: 'session-claude-code-1',
    origin: 'user-turn',
    goal: 'Investigate the current task via claude code.',
    kind: 'agent-delegation',
    status: 'planned',
    selectedChannel: 'claude-code',
    proposedChannel: 'claude-code',
    summary: 'planned claude code body',
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

function parseProviderFact(raw: string) {
  expect(() => JSON.parse(raw)).not.toThrow()
  return JSON.parse(raw) as {
    type: string
    data: Record<string, unknown>
  }
}

describe('claude-code executor adapter', () => {
  it.skipIf(process.platform !== 'win32')('refuses a different-drive working directory before native dispatch', async () => {
    execFileMock.mockImplementation(() => {
      throw new Error('No child may start for a cross-drive refusal')
    })
    const result = await withActionDispatch(async () => ({ cardId: 'alice', effectId: 'owned-refusal', expiresAt: null }), () => executeClaudeCodeTaskThread({ thread: createThread(), command: { prompt: 'Owned boundary test; never run', cwd: 'D:\\private-outside' }, workspaceRoot: 'C:\\owned-fixture' }))
    expect(result).toMatchObject({ ok: false, errorCode: 'CLAUDE_CODE_CWD_OUTSIDE_BOUNDARY' })
    expect(execFileMock).not.toHaveBeenCalled()
    expect(actionDidNotStart(result, 'alice', 'owned-refusal')).toBe(true)
    expect(actionDidNotStart(result, 'bob', 'owned-refusal')).toBe(false)
  })
  it('rechecks the current action after binary resolution and refuses revoked authority before spawning', async () => {
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      queueMicrotask(() => callback(null, 'inert mocked provider output', ''))
      return { kill: vi.fn() }
    })
    let checks = 0
    const check = vi.fn(async () => {
      if (++checks > 1)
        throw new Error('source withdrawn after admission')
      return { expiresAt: Date.now() + 60000 }
    })
    const result = await withActionDispatch(check, () => executeClaudeCodeTaskThread({ thread: createThread(), command: { prompt: 'Inspect the owned fixture without tools.' }, workspaceRoot: process.cwd() }))
    expect(result).toMatchObject({ ok: false, errorCode: 'CLAUDE_CODE_DISPATCH_REVOKED', effectMayHaveOccurred: false, sideEffectState: 'none' })
    expect(check).toHaveBeenCalledTimes(2)
    expect(execFileMock).not.toHaveBeenCalled()
  })

  it('does not spawn a process for an already cancelled request', async () => {
    execFileMock.mockImplementation((_command, _args, _options, callback) => {
      queueMicrotask(() => callback(null, 'inert cancelled output', ''))
      return { kill: vi.fn() }
    })
    const controller = new AbortController()
    controller.abort()
    const result = await executeClaudeCodeTaskThread({ thread: createThread(), command: { prompt: 'Inspect only the inert fixture.' }, workspaceRoot: process.cwd(), abortSignal: controller.signal })
    expect(result).toMatchObject({ ok: false, finalStatus: 'cancelled' })
    expect(execFileMock).not.toHaveBeenCalled()
  })
  it.each(['bypassPermissions', 'dontAsk', 'delegate'] as const)('blocks unapproved delegated permission override %s before starting a process', async (permissionMode) => {
    const result = await executeClaudeCodeTaskThread({ thread: createThread({ metadata: { task: { effect: 'mutate', permissionMode: 'implicit' } } }), command: { prompt: 'Make an ordinary workspace edit.', allowTools: true, permissionMode } })
    expect(result).toMatchObject({ ok: false, errorCode: 'CLAUDE_CODE_PERMISSION_REQUIRED' })
    expect(execFileMock).not.toHaveBeenCalled()
  })

  beforeEach(() => {
    execFileMock.mockReset()
  })

  it('dispatches claude code execution and records dispatch, step, and result events', async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      setTimeout(() => {
        callback(null, 'claude assistant output', '')
      }, 0)
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeClaudeCodeTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current patch and summarize risks.',
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-claude-code-1',
          decisionTraceId: 'mind:trace:claude-code-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 18,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
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
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('claude assistant output')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    const [, args] = execFileMock.mock.calls[0] ?? []
    const prompt = String(args.at(-1) ?? '')
    const [runtimeFactRaw, taskFactRaw] = prompt.split('\n\n')
    const runtimeFact = parseProviderFact(runtimeFactRaw)
    const taskFact = parseProviderFact(taskFactRaw)

    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)claude$/),
      expect.arrayContaining([
        '--print',
        '--permission-mode',
        'plan',
        '--tools',
        '',
        '--',
      ]),
      expect.anything(),
      expect.any(Function),
    )
    expect(args.at(-2)).toBe('--')
    expect(runtimeFact).toEqual(expect.objectContaining({
      type: 'alicization-execution-runtime-context',
      data: expect.objectContaining({
        owners: {
          shortTerm: 'WorkingMemory',
          longTermRecall: 'LongTermMemoryRecall',
        },
        failureSurface: 'transparent',
        identifiers: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-claude-code-1',
        }),
      }),
    }))
    expect(runtimeFact.data).not.toHaveProperty('execution')
    expect(taskFact).toEqual({
      type: 'alicization-execution-task',
      data: {
        instruction: 'Inspect the current patch and summarize risks.',
      },
    })
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-claude-code-1',
      }),
    }))
  })

  it('blocks observe-only thread when claude code tools are enabled', async () => {
    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Use tools to modify files directly.',
        allowTools: true,
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-claude-code-1',
          decisionTraceId: 'mind:trace:claude-code-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 24,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLAUDE_CODE_EFFECT_MISMATCH')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      adapter: 'claude-code',
      safetyGate: expect.objectContaining({
        effect: 'observe',
        permissionMode: 'implicit',
        confirmationRequired: true,
        riskPolicy: 'observe-only-tools-blocked',
        auditability: 'blocked-before-dispatch',
        interruptibility: 'no-process-started',
      }),
      hasRuntimeContext: true,
    }))
    expect(execFileMock).not.toBeCalled()
  })

  it('allows low-risk autonomous code edits to self-start on claude-code when task policy marks them low-risk', async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      setTimeout(() => {
        callback(null, 'claude autonomous patch output', '')
      }, 0)
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        turnId: 'subconscious:claude-self-start-1',
        origin: 'subconscious-proactive',
        kind: 'codebase-edit',
        metadata: {
          task: {
            permissionMode: 'none',
            effect: 'mutate',
            riskBudget: 'low',
            justification: 'grounded',
          },
        },
      }),
      command: {
        prompt: 'Patch the current runtime seam directly with the smallest safe change.',
        allowTools: true,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('claude autonomous patch output')
    expect(execFileMock).toBeCalled()
  })

  it('blocks medium-risk autonomous code edits when old stored threads lost explicit permission metadata even if origin thinned back to user-turn', async () => {
    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        turnId: 'subconscious:claude-origin-thin-medium-risk-1',
        origin: 'user-turn',
        kind: 'codebase-edit',
        metadata: {
          task: {
            effect: 'mutate',
            riskBudget: 'medium',
            justification: 'grounded',
          },
        },
      }),
      command: {
        prompt: 'Refactor the current runtime knot more aggressively.',
        allowTools: true,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLAUDE_CODE_PERMISSION_REQUIRED')
    expect(execFileMock).not.toBeCalled()
  })
})
