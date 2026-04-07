import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeClaudeCodeTaskThread } from './claude-code'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

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

describe('claude-code executor adapter', () => {
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
    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)claude$/),
      expect.arrayContaining([
        '--print',
        '--permission-mode',
        'plan',
        '--tools',
        '',
        '--',
        expect.stringContaining('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]'),
      ]),
      expect.anything(),
      expect.any(Function),
    )
    const [, args] = execFileMock.mock.calls[0] ?? []
    expect(args.at(-2)).toBe('--')
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
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLAUDE_CODE_EFFECT_MISMATCH')
    expect(execFileMock).not.toBeCalled()
  })
})
