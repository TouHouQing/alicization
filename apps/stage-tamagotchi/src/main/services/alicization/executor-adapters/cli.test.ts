import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { executeCliTaskThread } from './cli'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-cli-1',
    decisionTraceId: 'mind:trace:cli-1',
    turnId: 'turn-cli-1',
    sessionId: 'session-cli-1',
    origin: 'user-turn',
    goal: 'Run the local command body.',
    kind: 'run-command',
    status: 'planned',
    selectedChannel: 'cli',
    proposedChannel: 'cli',
    summary: 'initial plan',
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

describe('cli executor adapter', () => {
  it('dispatches a safe CLI command and records dispatch, step, and result events', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'console.log("hello cli"); console.error("stderr cli")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('hello cli')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    expect(result.events.at(-1)).toEqual(expect.objectContaining({
      kind: 'result',
      threadStatus: 'completed',
    }))
  })

  it('blocks dangerous CLI commands without explicit permission', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'rm',
        args: ['-rf', 'dist'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLI_PERMISSION_REQUIRED')
    expect(result.events).toEqual([
      expect.objectContaining({
        kind: 'result',
        threadStatus: 'failed',
      }),
    ])
  })

  it('normalizes inline command strings when args are omitted', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "console.log(\'inline cli\')"',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('inline cli')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('node -e'),
      }),
    }))
  })

  it('supports shell-mode compound commands passed as a single command string', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "process.stdout.write(\'abc\')" | wc -c',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('3')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('| wc -c'),
      }),
    }))
  })

  it('auto-normalizes to shell mode when args contain shell operators', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write("1")', '&&', 'node', '-e', 'process.stdout.write("2")'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('12')
    expect(result.events.at(0)).toEqual(expect.objectContaining({
      kind: 'dispatch',
      payload: expect.objectContaining({
        command: expect.stringContaining('&&'),
        args: [],
      }),
    }))
  })

  it('expands home-directory aliases in CLI args before process spawn', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write(process.argv[1] || "")', '~/Desktop'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      aliasExpansionCount: expect.any(Number),
    }))
    expect(Number((result.events[0]?.payload as { aliasExpansionCount?: unknown }).aliasExpansionCount ?? 0)).toBeGreaterThan(0)
  })

  it('expands home-directory aliases inside option assignments', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write(process.argv[1] || "")', '--', '--target=~/Desktop'],
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.output).toContain('--target=')
    expect(result.output).toMatch(/--target=.+(Desktop|桌面)/u)
  })

  it('expands home-directory aliases from inline command strings', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node -e "process.stdout.write(process.argv[1] || \'\')" ~/Desktop',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).not.toContain('~/Desktop')
    expect(result.output).toMatch(/(Desktop|桌面)/u)
  })

  it('builds callback-friendly summaries for ls listings and keeps decoded hints', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'alicization-cli-ls-'))
    const encodedName = '%E5%B0%8F%E7%A0%96%E7%8C%BF'
    const chineseName = '小砖猿'

    try {
      await Promise.all([
        mkdir(join(tempRoot, encodedName)),
        mkdir(join(tempRoot, chineseName)),
      ])

      const result = await executeCliTaskThread({
        thread: createThread(),
        command: {
          command: 'ls',
          args: ['-la', tempRoot],
        },
        workspaceRoot: process.cwd(),
      })

      expect(result.ok).toBe(true)
      expect(result.finalStatus).toBe('completed')
      expect(result.summary).toContain('Listed entries')
      expect(result.summary).toContain(`${encodedName} (${chineseName})`)
      expect(result.summary).not.toContain('drwx')
      expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
        summary: expect.stringContaining('Listed entries'),
      }))
    }
    finally {
      await rm(tempRoot, {
        recursive: true,
        force: true,
      })
    }
  })

  it('cancels a running CLI command when the abort signal fires', async () => {
    const controller = new AbortController()
    const execution = executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'setTimeout(() => console.log("late output"), 3000)'],
        timeoutMs: 5_000,
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    setTimeout(() => {
      controller.abort('kill-switch-suspended')
    }, 80)

    const result = await execution

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('cancelled')
    expect(result.errorCode).toBe('CLI_ABORTED')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'cancel']))
  })

  it('injects runtime context into the CLI environment and execution events', async () => {
    const result = await executeCliTaskThread({
      thread: createThread(),
      command: {
        command: 'node',
        args: ['-e', 'process.stdout.write(process.env.ALICIZATION_EXECUTION_FOREGROUND_WINDOW || "")'],
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-cli-1',
          decisionTraceId: 'mind:trace:cli-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 17,
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
    expect(result.output).toContain('Cursor | cursor | airi-alice')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-cli-1',
      }),
    }))
  })
})
