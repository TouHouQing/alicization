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
    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)codex$/),
      expect.arrayContaining([
        'exec',
        '--sandbox',
        'workspace-write',
        expect.stringContaining('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]'),
      ]),
      expect.anything(),
      expect.any(Function),
    )
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
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CODEX_PERMISSION_REQUIRED')
    expect(execFileMock).not.toBeCalled()
  })
})
