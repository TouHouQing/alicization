import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { writeFile } from 'node:fs/promises'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeCodexTaskThread } from './codex'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-codex-1',
    decisionTraceId: 'mind:trace:codex-1',
    turnId: 'turn-codex-1',
    sessionId: 'session-codex-1',
    origin: 'user-turn',
    goal: 'Investigate the current codebase issue.',
    kind: 'codebase-investigation',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'planned codex body',
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

describe('codex executor adapter', () => {
  beforeEach(() => {
    execFileMock.mockReset()
  })

  it('dispatches codex execution and records dispatch, step, and result events', async () => {
    execFileMock.mockImplementation((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1]
      void Promise.resolve()
        .then(async () => {
          await writeFile(outputPath, 'codex assistant output', 'utf8')
        })
        .then(() => {
          callback(null, 'codex stdout', '')
        })
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect runtime dispatch and summarize findings.',
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-codex-1',
          decisionTraceId: 'mind:trace:codex-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 22,
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
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('codex assistant output')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    const [, args] = execFileMock.mock.calls[0] ?? []
    const prompt = String(args.at(-1) ?? '')
    const [runtimeFactRaw, taskFactRaw] = prompt.split('\n\n')
    const runtimeFact = parseProviderFact(runtimeFactRaw)
    const taskFact = parseProviderFact(taskFactRaw)

    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)codex$/),
      expect.arrayContaining([
        'exec',
        '--sandbox',
        'workspace-write',
      ]),
      expect.anything(),
      expect.any(Function),
    )
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
          turnId: 'turn-codex-1',
        }),
      }),
    }))
    expect(runtimeFact.data).not.toHaveProperty('execution')
    expect(taskFact).toEqual({
      type: 'alicization-execution-task',
      data: {
        instruction: 'Inspect runtime dispatch and summarize findings.',
      },
    })
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-codex-1',
      }),
    }))
  })

  it('blocks high-impact codex dispatch without explicit permission', async () => {
    const result = await executeCodexTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'high-impact',
          },
        },
      }),
      command: {
        prompt: 'Apply a high-impact irreversible change.',
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-codex-1',
          decisionTraceId: 'mind:trace:codex-1',
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
    expect(result.errorCode).toBe('CODEX_PERMISSION_REQUIRED')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      adapter: 'codex',
      safetyGate: expect.objectContaining({
        effect: 'high-impact',
        permissionMode: 'implicit',
        confirmationRequired: true,
        riskPolicy: 'explicit-confirmation-required',
        auditability: 'blocked-before-dispatch',
        interruptibility: 'no-process-started',
      }),
      hasRuntimeContext: true,
    }))
    expect(execFileMock).not.toBeCalled()
  })

  it('allows low-risk autonomous code edits to self-start on codex when task policy marks them low-risk', async () => {
    execFileMock.mockImplementation((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1]
      void Promise.resolve()
        .then(async () => {
          await writeFile(outputPath, 'codex autonomous patch output', 'utf8')
        })
        .then(() => {
          callback(null, 'codex stdout', '')
        })
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeCodexTaskThread({
      thread: createThread({
        turnId: 'subconscious:codex-self-start-1',
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
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('codex autonomous patch output')
    expect(execFileMock).toBeCalled()
  })

  it('blocks medium-risk autonomous code edits when old stored threads lost explicit permission metadata even if origin thinned back to user-turn', async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      callback(new Error('unexpected codex spawn'), '', '')
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeCodexTaskThread({
      thread: createThread({
        turnId: 'subconscious:codex-origin-thin-medium-risk-1',
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
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CODEX_PERMISSION_REQUIRED')
    expect(execFileMock).not.toBeCalled()
  })
})
