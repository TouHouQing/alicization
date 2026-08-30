import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { Buffer } from 'node:buffer'
import { EventEmitter } from 'node:events'
import { access, mkdir, mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { executeCodexTaskThread } from './codex'

const { homedirMock, processKillMock, spawnMock } = vi.hoisted(() => ({
  homedirMock: vi.fn(),
  processKillMock: vi.fn(),
  spawnMock: vi.fn(),
}))
const originalCodexHome = process.env.CODEX_HOME
const createdCodexHomes: string[] = []
const nativeSetTimeout = globalThis.setTimeout

async function createCodexHome(prefix = 'alicization-codex-home-') {
  const codexHome = await mkdtemp(resolve(tmpdir(), prefix))
  createdCodexHomes.push(codexHome)
  await writeFile(resolve(codexHome, 'auth.json'), '{"test":"credential"}\n')
  return codexHome
}

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}))
vi.mock('node:process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:process')>()
  return {
    ...actual,
    kill: processKillMock,
  }
})
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    homedir: homedirMock,
  }
})

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

function createMockCodexChild(stdinEnd = vi.fn(), pid?: number) {
  const child = new EventEmitter() as EventEmitter & {
    kill: ReturnType<typeof vi.fn>
    pid?: number
    stdin: { end: ReturnType<typeof vi.fn> }
    stdout: EventEmitter
    stderr: EventEmitter
  }
  child.kill = vi.fn()
  child.pid = pid
  child.stdin = { end: stdinEnd }
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  return child
}

function emitCodexTurnCompleted(child: ReturnType<typeof createMockCodexChild>) {
  child.stdout.emit('data', Buffer.from(`\n${JSON.stringify({
    type: 'turn.completed',
  })}\n`))
}

function emitCodexAssistantResult(
  child: ReturnType<typeof createMockCodexChild>,
  text: string,
) {
  child.stdout.emit('data', Buffer.from([
    JSON.stringify({
      type: 'item.completed',
      item: {
        id: `agent-message-${text.length}`,
        type: 'agent_message',
        text,
      },
    }),
    JSON.stringify({
      type: 'turn.completed',
    }),
    '',
  ].join('\n')))
}

async function flushNativeIo() {
  await new Promise<void>(resolve => nativeSetTimeout(resolve, 0))
  await new Promise<void>(resolve => nativeSetTimeout(resolve, 0))
}

async function waitForSpawnMock() {
  for (let attempt = 0; attempt < 50 && !spawnMock.mock.calls.length; attempt++)
    await flushNativeIo()
}

async function advanceFakeTimersAndFlush(milliseconds: number) {
  await vi.advanceTimersByTimeAsync(milliseconds)
  await flushNativeIo()
}

describe('codex executor adapter', () => {
  beforeEach(async () => {
    spawnMock.mockReset()
    processKillMock.mockReset()
    processKillMock.mockImplementation(() => {
      const error = Object.assign(new Error('process group not found'), {
        code: 'ESRCH',
      })
      throw error
    })
    homedirMock.mockReset()
    homedirMock.mockReturnValue(resolve(tmpdir(), 'alicization-codex-tests-home'))
    const codexHome = await createCodexHome('alicization-codex-tests-home-')
    process.env.CODEX_HOME = codexHome
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    if (originalCodexHome === undefined)
      delete process.env.CODEX_HOME
    else
      process.env.CODEX_HOME = originalCodexHome
    await Promise.all(createdCodexHomes.splice(0).map(path => rm(path, {
      force: true,
      recursive: true,
    })))
  })

  it('uses JSONL as the only Codex assistant-output protocol', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'protocol-agent-message',
              type: 'agent_message',
              text: 'JSONL assistant result',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n')))
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).not.toContain('--output-last-message')
    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'JSONL assistant result',
    })
  })

  it('runs each Codex task in an isolated home with only user authentication copied', async () => {
    const sourceCodexHome = process.env.CODEX_HOME!
    await writeFile(resolve(sourceCodexHome, 'state_5.sqlite'), 'shared-state')
    await mkdir(resolve(sourceCodexHome, 'sessions'), { recursive: true })
    await writeFile(resolve(sourceCodexHome, 'sessions', 'shared.jsonl'), 'shared-session')

    let child: ReturnType<typeof createMockCodexChild> | undefined
    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    const [, , options] = spawnMock.mock.calls[0] ?? []
    const isolatedCodexHome = options?.env?.CODEX_HOME as string
    expect(isolatedCodexHome).toBeTruthy()
    expect(isolatedCodexHome).not.toBe(sourceCodexHome)
    await expect(
      readFile(resolve(isolatedCodexHome, 'auth.json'), 'utf8'),
    ).resolves.toBe('{"test":"credential"}\n')
    await expect(access(resolve(isolatedCodexHome, 'state_5.sqlite'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(resolve(isolatedCodexHome, 'sessions'))).rejects.toMatchObject({
      code: 'ENOENT',
    })

    emitCodexAssistantResult(child!, 'isolated Codex result')
    child!.emit('close', 0, null)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      output: 'isolated Codex result',
    })
    await expect(access(isolatedCodexHome)).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('scavenges expired dead-owner Codex homes without deleting active, fresh, or unrelated directories', async () => {
    const now = Date.now()
    const staleAgeMs = 6 * 60 * 60_000
    const ownerFileName = '.alicization-owner.json'
    const expiredDeadHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-home-'))
    const expiredActiveHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-home-'))
    const freshDeadHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-home-'))
    const unownedPrefixedHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-home-'))
    const unrelatedHome = await mkdtemp(resolve(tmpdir(), 'other-codex-home-'))
    createdCodexHomes.push(expiredDeadHome, expiredActiveHome, freshDeadHome, unownedPrefixedHome, unrelatedHome)
    await Promise.all([
      writeFile(resolve(expiredDeadHome, ownerFileName), JSON.stringify({
        pid: 410_001,
        createdAt: now - staleAgeMs - 1,
      })),
      writeFile(resolve(expiredActiveHome, ownerFileName), JSON.stringify({
        pid: 410_002,
        createdAt: now - staleAgeMs - 1,
      })),
      writeFile(resolve(freshDeadHome, ownerFileName), JSON.stringify({
        pid: 410_003,
        createdAt: now,
      })),
      writeFile(resolve(unrelatedHome, ownerFileName), JSON.stringify({
        pid: 410_004,
        createdAt: now - staleAgeMs - 1,
      })),
    ])
    const staleUnownedAt = new Date(now - staleAgeMs - 1)
    await utimes(unownedPrefixedHome, staleUnownedAt, staleUnownedAt)
    processKillMock.mockImplementation((pid: number, signal: NodeJS.Signals | number) => {
      if (pid === 410_002 && signal === 0)
        return true
      const error = Object.assign(new Error('process not found'), {
        code: 'ESRCH',
      })
      throw error
    })
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        emitCodexAssistantResult(child, 'scavenger completed')
        child.emit('close', 0, null)
      })
      return child
    })

    await expect(executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the workspace after startup cleanup.',
      },
      workspaceRoot: process.cwd(),
    })).resolves.toMatchObject({
      ok: true,
      output: 'scavenger completed',
    })

    await expect(access(expiredDeadHome)).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(expiredActiveHome)).resolves.toBeUndefined()
    await expect(access(freshDeadHome)).resolves.toBeUndefined()
    await expect(access(unownedPrefixedHome)).resolves.toBeUndefined()
    await expect(access(unrelatedHome)).resolves.toBeUndefined()
  })

  it('fails transparently before spawn when Codex authentication is unavailable', async () => {
    const codexHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-no-auth-'))
    createdCodexHomes.push(codexHome)
    process.env.CODEX_HOME = codexHome

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(spawnMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_AUTH_FAILED',
    })
  })

  it('allows an explicitly unauthenticated local Codex provider without auth.json', async () => {
    const codexHome = await mkdtemp(resolve(tmpdir(), 'alicization-codex-local-provider-'))
    createdCodexHomes.push(codexHome)
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), [
      'model_provider = "local-provider"',
      'model = "local-model"',
      '',
      '[model_providers.local-provider]',
      'name = "local-provider"',
      'wire_api = "responses"',
      'base_url = "http://127.0.0.1:8080/v1"',
      'requires_openai_auth = false',
    ].join('\n'))
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        emitCodexAssistantResult(child, 'local provider output')
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: true,
      output: 'local provider output',
    })
    const [, , options] = spawnMock.mock.calls[0] ?? []
    await expect(access(resolve(options.env.CODEX_HOME, 'auth.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('dispatches codex execution and records dispatch, step, and result events', async () => {
    let child: ReturnType<typeof createMockCodexChild> | undefined
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          child?.stdout.emit('data', Buffer.from('codex stdout\n'))
          emitCodexAssistantResult(child!, 'codex assistant output')
          child?.emit('exit', 0, null)
        })
      return child
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
    const [, args] = spawnMock.mock.calls[0] ?? []
    const prompt = String(args.at(-1) ?? '')
    const [runtimeFactRaw, taskFactRaw] = prompt.split('\n\n')
    const runtimeFact = parseProviderFact(runtimeFactRaw)
    const taskFact = parseProviderFact(taskFactRaw)

    expect(spawnMock).toBeCalledWith(
      '/bin/sh',
      expect.arrayContaining([
        '-c',
        'exec "$0" "$@"',
        'exec',
        '--ignore-user-config',
        '--ephemeral',
        '--disable',
        'plugins',
        '--disable',
        'apps',
        '--sandbox',
        'workspace-write',
      ]),
      expect.objectContaining({
        detached: process.platform !== 'win32',
        stdio: ['pipe', 'pipe', 'pipe'],
      }),
    )
    expect(child?.stdin.end).toHaveBeenCalledOnce()
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

  it('registers cleanup for a spawned Codex process group with a real pid', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild(vi.fn(), 987_654_321)
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'codex process group output')
        child.emit('exit', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.output).toContain('codex process group output')
  })

  it('keeps successful tool output limited to the final assistant message', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          child.stdout.emit('data', Buffer.from('duplicate stdout result\n'))
          child.stderr.emit('data', Buffer.from('diagnostic warning'))
          emitCodexAssistantResult(child, 'clean assistant result')
          child.emit('exit', 0, null)
        })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.output).toBe('clean assistant result')
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          stream: 'stderr',
          text: 'diagnostic warning',
        }),
      }),
    ]))
  })

  it('uses a one-hour total execution budget for mutating work', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          emitCodexAssistantResult(child, 'codex completed within its execution budget')
          child.emit('exit', 0, null)
        })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      timeoutMs: 60 * 60_000,
    }))
  })

  it('uses a thirty-minute total execution budget for observe-only work', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          emitCodexAssistantResult(child, 'observe-only result')
          child.emit('exit', 0, null)
        })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      timeoutMs: 30 * 60_000,
    }))
  })

  it('refreshes the idle budget only from parsed Codex semantic progress', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      const progressAt = (delay: number, event: Record<string, unknown>) => {
        setTimeout(() => child.stdout.emit('data', Buffer.from(`${JSON.stringify(event)}\n`)), delay)
      }
      progressAt(150, {
        type: 'thread.started',
        thread_id: 'codex-thread-1',
      })
      progressAt(300, {
        type: 'turn.started',
      })
      progressAt(450, {
        type: 'item.started',
        item: {
          id: 'command-1',
          type: 'command_execution',
          command: 'git status --short',
        },
      })
      progressAt(600, {
        type: 'item.completed',
        item: {
          id: 'command-1',
          type: 'command_execution',
          command: 'git status --short',
          exit_code: 0,
        },
      })
      setTimeout(() => {
        emitCodexAssistantResult(child, 'long-running assistant result')
        child.emit('exit', 0, null)
      }, 850)
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.output).toBe('long-running assistant result')
    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toContain('--json')
  })

  it('keeps cold startup outside the semantic idle budget until the Codex turn begins', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      setTimeout(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'thread.started',
          thread_id: 'codex-thread-cold-start',
        })}\n`))
      }, 200)
      setTimeout(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      }, 500)
      setTimeout(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'cold-start result')
        child.emit('close', 0, null)
      }, 700)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(400)
    expect(child?.kill).not.toHaveBeenCalled()

    await advanceFakeTimersAndFlush(400)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'cold-start result',
    })
  })

  it('does not kill Codex while a command execution item is still active', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-active-command',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'long-command',
              type: 'command_execution',
              command: 'du -k -d 1 ~',
            },
          }),
          '',
        ].join('\n')))
      })
      setTimeout(() => {
        if (!child)
          return
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: 'long-command',
            type: 'command_execution',
            command: 'du -k -d 1 ~',
            status: 'completed',
            exit_code: 0,
          },
        })}\n`))
        emitCodexAssistantResult(child, 'active command completed')
        child.emit('close', 0, null)
      }, 400)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(400)

    expect(child?.kill).not.toHaveBeenCalled()
    const result = await resultPromise
    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'active command completed',
    })
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      activeStepTimeoutMs: 1_800_000,
    }))
  })

  it('publishes a liveness heartbeat with the active command without resetting semantic progress', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-heartbeat',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'heartbeat-command',
              type: 'command_execution',
              command: 'du -k -d 1 ~',
            },
          }),
          '',
        ].join('\n')))
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
          timeoutMs: 300,
        },
        lifecycle: {
          startupTimeoutMs: 1_000,
          activeStepTimeoutMs: 20_000,
          totalTimeoutMs: 30_000,
        },
        onExecutionEvent,
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await flushNativeIo()
      await advanceFakeTimersAndFlush(10_000)

      expect(child?.kill).not.toHaveBeenCalled()
      expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
        payload: expect.objectContaining({
          codexEventType: 'heartbeat',
          semanticProgress: false,
          itemType: 'command_execution',
          summary: expect.stringContaining('du -k -d 1 ~'),
        }),
      }))

      if (child) {
        emitCodexAssistantResult(child, 'heartbeat command completed')
        child.emit('close', 0, null)
      }
      await expect(resultPromise).resolves.toMatchObject({
        ok: true,
        output: 'heartbeat command completed',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('waits for stream drain when exit is observed before a late turn.completed event', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let settled = false

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.emit('exit', 0, null)
        setTimeout(() => {
          if (!child)
            return
          emitCodexAssistantResult(child, 'late drained Codex result')
          child.stdout.emit('end')
          child.stderr.emit('end')
          child.emit('close', 0, null)
        }, 400)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    }).finally(() => {
      settled = true
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(300)
    expect(settled).toBe(false)

    await advanceFakeTimersAndFlush(200)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'late drained Codex result',
    })
  })

  it('keeps a connection-reset reconnect event recoverable when the turn later completes', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-connection-reset',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'error',
            message: 'Reconnecting... 1/5 (connection reset by peer)',
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'connection-reset-recovered-message',
              type: 'agent_message',
              text: 'Codex recovered after reconnecting',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n')))
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'Codex recovered after reconnecting',
    })
  })

  it('preserves Codex command status, exit code, and output preview in progress events', async () => {
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'command-with-output',
              type: 'command_execution',
              command: 'printf ready',
              aggregated_output: 'ready\n',
              status: 'completed',
              exit_code: 0,
            },
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'command-output-message',
              type: 'agent_message',
              text: 'Command completed',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n')))
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        codexEventType: 'item.completed',
        itemType: 'command_execution',
        command: 'printf ready',
        status: 'completed',
        exitCode: 0,
        outputPreview: 'ready',
      }),
    }))
  })

  it('ignores Codex events that arrive after the turn has reached a terminal state', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', 0, null))
      })
      queueMicrotask(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'terminal Codex result')
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.started',
          item: {
            id: 'late-command',
            type: 'command_execution',
            command: 'printf late-event',
          },
        })}\n`))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(300)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'terminal Codex result',
    })
    const eventTypes = onExecutionEvent.mock.calls
      .map(call => call[0]?.payload?.codexEventType)
    expect(eventTypes).toContain('turn.completed')
    expect(eventTypes).not.toContain('item.started')
    expect(eventTypes).not.toContain('heartbeat')
  })

  it('keeps semantic idle paused until all concurrent tool items complete', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'thread.started' }),
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'command-one',
              type: 'command_execution',
              command: 'du -k -d 1 ~/Library',
            },
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'command-two',
              type: 'command_execution',
              command: 'du -k -d 1 ~',
            },
          }),
          '',
        ].join('\n')))
      })
      setTimeout(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: 'command-one',
            type: 'command_execution',
            command: 'du -k -d 1 ~/Library',
            exit_code: 0,
          },
        })}\n`))
      }, 350)
      setTimeout(() => {
        if (!child)
          return
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: 'command-two',
            type: 'command_execution',
            command: 'du -k -d 1 ~',
            exit_code: 0,
          },
        })}\n`))
        emitCodexAssistantResult(child, 'concurrent commands completed')
        child.emit('close', 0, null)
      }, 550)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        activeStepTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(400)
    expect(child?.kill).not.toHaveBeenCalled()
    await advanceFakeTimersAndFlush(200)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'concurrent commands completed',
    })
  })

  it('fails with a startup-specific error when Codex never begins a turn', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'thread.started',
          thread_id: 'codex-thread-startup-timeout',
        })}\n`))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 5_000,
      },
      lifecycle: {
        startupTimeoutMs: 300,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(400)
    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_STARTUP_TIMEOUT',
    })
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('does not extend the active-step deadline for duplicate Codex item updates', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let repeatedProgressTimer: ReturnType<typeof setInterval> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'stuck-command',
              type: 'command_execution',
              command: 'long-running-command',
            },
          }),
          '',
        ].join('\n')))
      })
      repeatedProgressTimer = setInterval(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.updated',
          timestamp: Date.now(),
          item: {
            id: 'stuck-command',
            type: 'command_execution',
            command: 'long-running-command',
            status: 'in_progress',
            aggregated_output: 'unchanged output',
          },
        })}\n`))
      }, 100)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
        activeStepTimeoutMs: 300,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(450)

    if (repeatedProgressTimer)
      clearInterval(repeatedProgressTimer)

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
    })
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('refreshes the active-step deadline when long aggregated output only changes after its preview prefix', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let progressTimer: ReturnType<typeof setInterval> | undefined
    let updateCount = 0
    const stablePrefix = 'x'.repeat(1_200)

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'long-output-command',
              type: 'command_execution',
              command: 'stream-long-output',
            },
          }),
          '',
        ].join('\n')))
      })
      progressTimer = setInterval(() => {
        updateCount += 1
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.updated',
          item: {
            id: 'long-output-command',
            type: 'command_execution',
            command: 'stream-long-output',
            status: 'in_progress',
            aggregated_output: `${stablePrefix}tail-${updateCount}`,
          },
        })}\n`))
        if (updateCount < 6)
          return
        clearInterval(progressTimer)
        progressTimer = undefined
        emitCodexAssistantResult(child!, 'long output completed')
        child?.emit('close', 0, null)
      }, 100)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Run a command that produces long incremental output.',
        timeoutMs: 2_000,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        activeStepTimeoutMs: 300,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    try {
      await advanceFakeTimersAndFlush(800)
      await expect(resultPromise).resolves.toMatchObject({
        ok: true,
        finalStatus: 'completed',
        output: 'long output completed',
      })
      expect(child?.kill).not.toHaveBeenCalledWith('SIGTERM')
    }
    finally {
      if (progressTimer)
        clearInterval(progressTimer)
    }
  })

  it('bounds semantic-key history and treats an evicted old key as fresh progress', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const retainedSemanticKeyCapacity = 256

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'bounded-history-command',
              type: 'command_execution',
              command: 'stream-many-updates',
            },
          }),
          '',
        ].join('\n')))
      })
      setTimeout(() => {
        const updates = Array.from({ length: retainedSemanticKeyCapacity + 1 }, (_, index) => JSON.stringify({
          type: 'item.updated',
          item: {
            id: 'bounded-history-command',
            type: 'command_execution',
            command: 'stream-many-updates',
            status: 'in_progress',
            aggregated_output: `unique-progress-${index}`,
          },
        }))
        child?.stdout.emit('data', Buffer.from(`${updates.join('\n')}\n`))
      }, 100)
      setTimeout(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.updated',
          item: {
            id: 'bounded-history-command',
            type: 'command_execution',
            command: 'stream-many-updates',
            status: 'in_progress',
            aggregated_output: 'unique-progress-0',
          },
        })}\n`))
      }, 250)
      setTimeout(() => {
        emitCodexAssistantResult(child!, 'bounded semantic history completed')
        child?.emit('close', 0, null)
      }, 500)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Process a large stream of distinct command updates.',
        timeoutMs: 2_000,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        activeStepTimeoutMs: 300,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(700)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'bounded semantic history completed',
    })
    expect(child?.kill).not.toHaveBeenCalledWith('SIGTERM')
  })

  it('enforces a total execution deadline even while distinct semantic events continue', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let progressTimer: ReturnType<typeof setInterval> | undefined
    let sequence = 0

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      progressTimer = setInterval(() => {
        sequence += 1
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: `command-${sequence}`,
            type: 'command_execution',
            command: `printf ${sequence}`,
            exit_code: 0,
          },
        })}\n`))
      }, 100)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 500,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 800,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    try {
      await advanceFakeTimersAndFlush(900)
      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_EXECUTION_TIMEOUT',
      })
      expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    }
    finally {
      if (progressTimer)
        clearInterval(progressTimer)
    }
  })

  it('preserves the Provider failure cause when the total execution deadline expires during reconnect diagnostics', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let diagnosticTimer: ReturnType<typeof setInterval> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', 1, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      diagnosticTimer = setInterval(() => {
        child?.stderr.emit('data', Buffer.from('state db discrepancy during find_thread_path_by_id_str_in_subdir\n'))
        child?.stdout.emit('data', Buffer.from('not-json keepalive\n'))
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'error',
          message: 'Reconnecting... 1/5 (unexpected status 503 Service Unavailable)',
        })}\n`))
      }, 100)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    try {
      await advanceFakeTimersAndFlush(2_000)
      expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
      child?.emit('close', null, 'SIGTERM')
      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      })
    }
    finally {
      if (diagnosticTimer)
        clearInterval(diagnosticTimer)
    }
  })

  it('classifies the real Codex request-timeout reconnect sequence as Provider unavailable', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-request-timeout',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'skill-description-diagnostic',
              type: 'error',
              message: 'Skill descriptions were shortened before the request.',
            },
          }),
          JSON.stringify({
            type: 'error',
            message: 'Reconnecting... 2/5 (request timed out)',
          }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'transport-fallback-diagnostic',
              type: 'error',
              message: 'Falling back from WebSockets to HTTPS transport. request timed out',
            },
          }),
          '',
        ].join('\n')))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 600,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(600)
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    child?.emit('close', null, 'SIGTERM')

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      errorMessage: expect.stringContaining('request timed out'),
    })
    await expect(resultPromise).resolves.toEqual(expect.objectContaining({
      events: expect.arrayContaining([
        expect.objectContaining({
          kind: 'step',
          payload: expect.objectContaining({
            codexEventType: 'item.completed',
            itemType: 'error',
            summary: expect.stringContaining('request timed out'),
          }),
        }),
      ]),
    }))
  })

  it('classifies the final SSE idle-timeout disconnect as Provider unavailable', async () => {
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'turn.failed',
            error: {
              message: 'stream disconnected before completion: idle timeout waiting for SSE',
            },
          }),
          '',
        ].join('\n')))
        child?.emit('close', 1, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Run a harmless workspace inspection.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      errorMessage: 'stream disconnected before completion: idle timeout waiting for SSE',
    })
  })

  it('retries an observe-only Codex Provider disconnect up to five attempts and returns the later success', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let attempt = 0
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      attempt += 1
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', attempt === 1 ? 1 : 0, signal))
      })
      queueMicrotask(() => {
        if (attempt === 1) {
          child?.stdout.emit('data', Buffer.from([
            JSON.stringify({
              type: 'turn.failed',
              error: {
                message: 'stream disconnected before completion: idle timeout waiting for SSE',
              },
            }),
            '',
          ].join('\n')))
          return
        }
        emitCodexAssistantResult(child!, `observe retry success ${attempt}`)
        child?.emit('close', 0, null)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Run a harmless workspace inspection.',
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 5_000,
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await vi.advanceTimersByTimeAsync(1_000)
    await flushNativeIo()
    for (let index = 0; index < 50 && !onExecutionEvent.mock.calls.some(([event]) => (
      event?.payload
      && typeof event.payload === 'object'
      && (event.payload as Record<string, unknown>).codexEventType === 'provider.retry'
    )); index++) {
      await flushNativeIo()
    }
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        codexEventType: 'provider.retry',
      }),
    }))
    await vi.advanceTimersByTimeAsync(500)
    for (let index = 0; index < 50 && spawnMock.mock.calls.length < 2; index++)
      await flushNativeIo()

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'observe retry success 2',
    })
    expect(spawnMock).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['command_execution', { command: 'curl https://example.test/action' }],
    ['mcp_tool_call', { tool: 'remote_action' }],
    ['file_change', { changes: [{ path: 'changed.txt', kind: 'update' }] }],
    ['web_search', { query: 'provider status' }],
    ['collab_tool_call', { tool: 'delegate_task' }],
  ])('does not retry an observe-only Provider failure after %s activity', async (itemType, itemPayload) => {
    let attempt = 0

    spawnMock.mockImplementation(() => {
      attempt += 1
      const child = createMockCodexChild()
      queueMicrotask(() => {
        if (attempt === 1) {
          child.stdout.emit('data', Buffer.from([
            JSON.stringify({ type: 'turn.started' }),
            JSON.stringify({
              type: 'item.completed',
              item: {
                id: `unsafe-${itemType}`,
                type: itemType,
                status: 'completed',
                ...itemPayload,
              },
            }),
            JSON.stringify({
              type: 'turn.failed',
              error: {
                message: 'stream disconnected before completion: idle timeout waiting for SSE',
              },
            }),
            '',
          ].join('\n')))
          child.emit('close', 1, null)
          return
        }
        emitCodexAssistantResult(child, 'unexpected retry result')
        child.emit('close', 0, null)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Inspect without repeating completed external activity.',
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 5_000,
      },
      workspaceRoot: process.cwd(),
    })

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
    })
    expect(spawnMock).toHaveBeenCalledTimes(1)
  })

  it('parses stderr transport diagnostics and enters Provider recovery before the total timeout', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stderr.emit(
          'data',
          Buffer.from('2026-08-08T00:00:00Z WARN responses_retry: stream disconnected - retrying sampling request (1/5)\n'),
        )
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 2_000,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        providerRecoveryTimeoutMs: 500,
        totalTimeoutMs: 2_000,
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'step',
      payload: expect.objectContaining({
        codexEventType: 'provider.diagnostic',
        itemType: 'error',
        semanticProgress: false,
        message: expect.stringContaining('stream disconnected'),
      }),
    }))

    await advanceFakeTimersAndFlush(500)
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      errorMessage: expect.stringContaining('stream disconnected'),
    })
  })

  it('uses the command timeout as the total execution budget when lifecycle overrides are absent', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', 1, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 500,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(550)

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_EXECUTION_TIMEOUT',
    })
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('settles provider recovery diagnostics as Provider unavailable before the total deadline', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const onExecutionEvent = vi.fn()

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'error',
            message: 'Reconnecting... 1/5 (request timed out)',
          }),
          '',
        ].join('\n')))
      })
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent,
      lifecycle: {
        startupTimeoutMs: 1_000,
        providerRecoveryTimeoutMs: 500,
        totalTimeoutMs: 5_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        codexEventType: 'error',
        message: 'Reconnecting... 1/5 (request timed out)',
      }),
    }))
    await advanceFakeTimersAndFlush(500)

    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      errorMessage: expect.stringContaining('request timed out'),
    })
  })

  it('disables nested custom-provider reconnect retries when the user has not configured them', async () => {
    const codexHome = await createCodexHome('alicization-codex-default-retry-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), [
      'model_provider = "custom"',
      '',
      '[model_providers.custom]',
      'name = "custom"',
      'wire_api = "responses"',
      'requires_openai_auth = true',
      'base_url = "https://api.example.com/v1"',
    ].join('\n'))
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'custom provider output')
        child.emit('close', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toEqual(expect.arrayContaining([
      'model_providers.custom.supports_websockets=false',
      'model_providers.custom.request_max_retries=0',
      'model_providers.custom.stream_max_retries=0',
      'model_providers.custom.stream_idle_timeout_ms=45000',
    ]))
  })

  it('publishes parsed Codex semantic events before the process exits', async () => {
    let child: ReturnType<typeof createMockCodexChild> | undefined
    const onExecutionEvent = vi.fn(async () => {})

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-live-1',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'command-live-1',
              type: 'command_execution',
              command: 'git status --short',
            },
          }),
          '',
        ].join('\n')))
      })
      setTimeout(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'live semantic output')
        child.emit('close', 0, null)
      }, 50)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'step',
      payload: expect.objectContaining({
        codexEventType: 'thread.started',
        semanticProgress: false,
      }),
    }))
    expect(onExecutionEvent).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'step',
      payload: expect.objectContaining({
        codexEventType: 'item.started',
        semanticProgress: true,
      }),
    }))

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      output: 'live semantic output',
    })
  })

  it('waits for accepted progress callbacks to drain before settling', async () => {
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let releaseCallbacks!: () => void
    let settled = false
    const callbacksReleased = new Promise<void>((resolve) => {
      releaseCallbacks = resolve
    })

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'callback-drained result')
        child.emit('close', 0, null)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent: async () => await callbacksReleased,
      lifecycle: {
        executionEventDrainTimeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    }).then((result) => {
      settled = true
      return result
    })

    await waitForSpawnMock()
    await flushNativeIo()
    expect(settled).toBe(false)

    releaseCallbacks()
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      output: 'callback-drained result',
    })
  })

  it('isolates rejected progress callbacks as diagnostics without changing the tool result', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        emitCodexAssistantResult(child, 'observer-rejection-independent result')
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent: async () => {
        throw new Error('progress observer rejected')
      },
      lifecycle: {
        executionEventDrainTimeoutMs: 100,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'observer-rejection-independent result',
    })
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          diagnosticType: 'execution-event-observer',
          status: 'degraded',
          message: expect.stringContaining('progress observer rejected'),
        }),
      }),
    ]))
  })

  it('bounds progress callback drain when an observer never settles', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let settled = false

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'observer-independent result')
        child.emit('close', 0, null)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      onExecutionEvent: () => new Promise<void>(() => {}),
      lifecycle: {
        executionEventDrainTimeoutMs: 10,
      },
      workspaceRoot: process.cwd(),
    }).then((result) => {
      settled = true
      return result
    })

    await waitForSpawnMock()
    await flushNativeIo()
    expect(settled).toBe(false)

    await advanceFakeTimersAndFlush(10)
    const result = await resultPromise
    expect(result).toMatchObject({
      ok: true,
      output: 'observer-independent result',
    })
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          diagnosticType: 'execution-event-observer',
          status: 'degraded',
          message: expect.stringContaining('timed out'),
        }),
      }),
    ]))
  })

  it('surfaces a terminal Codex Provider failure without waiting for the idle deadline', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'thread.started',
            thread_id: 'codex-thread-provider-failure',
          }),
          JSON.stringify({
            type: 'turn.started',
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'provider-failed-command',
              type: 'command_execution',
              command: 'provider-dependent-command',
            },
          }),
          JSON.stringify({
            type: 'error',
            message: 'Reconnecting... 5/5 (unexpected status 503 Service Unavailable)',
          }),
          JSON.stringify({
            type: 'turn.failed',
            error: {
              message: 'unexpected status 503 Service Unavailable',
            },
          }),
          '',
        ].join('\n')))
        child.emit('close', 1, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 600_000,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
    })
    expect(result.errorMessage).toContain('503 Service Unavailable')
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          codexEventType: 'turn.failed',
          semanticProgress: true,
          terminal: true,
        }),
      }),
    ]))
  })

  it('settles a fatal top-level Codex error immediately instead of waiting for startup timeout', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', 1, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'error',
          message: 'Authentication failed for the configured Codex Provider.',
        })}\n`))
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
          timeoutMs: 600_000,
        },
        lifecycle: {
          startupTimeoutMs: 120_000,
          providerRecoveryTimeoutMs: 45_000,
          totalTimeoutMs: 600_000,
        },
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await flushNativeIo()
      await advanceFakeTimersAndFlush(300)
      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_PROVIDER_AUTH_FAILED',
      })
      expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
      expect(vi.getTimerCount()).toBeLessThan(3)
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not restart active work tracking for items arriving after a terminal event', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        if (!child)
          return
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'terminal-agent-message',
              type: 'agent_message',
              text: 'terminal result',
            },
          }),
          JSON.stringify({ type: 'turn.completed' }),
          '',
        ].join('\n')))
        setTimeout(() => {
          child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
            type: 'item.started',
            item: {
              id: 'late-command',
              type: 'command_execution',
              command: 'late-command',
            },
          })}\n`))
          child?.emit('close', 0, null)
        }, 100)
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        activeStepTimeoutMs: 300,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(400)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
    })
    expect(child?.kill).not.toHaveBeenCalled()
  })

  it('keeps refreshed active work alive after a transient Provider reconnect recovers', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let updateTimer: ReturnType<typeof setInterval> | undefined
    let updateCount = 0

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({ type: 'turn.started' }),
          JSON.stringify({
            type: 'error',
            message: 'Reconnecting... 1/5 (unexpected status 503 Service Unavailable)',
          }),
          JSON.stringify({
            type: 'item.started',
            item: {
              id: 'recovered-command',
              type: 'command_execution',
              command: 'recovered-command',
            },
          }),
          '',
        ].join('\n')))
      })
      updateTimer = setInterval(() => {
        updateCount += 1
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.updated',
          item: {
            id: 'recovered-command',
            type: 'command_execution',
            command: 'recovered-command',
            status: 'in_progress',
            aggregated_output: `progress-${updateCount}`,
          },
        })}\n`))
      }, 100)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        activeStepTimeoutMs: 300,
        totalTimeoutMs: 2_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await advanceFakeTimersAndFlush(450)
    expect(child?.kill).not.toHaveBeenCalledWith('SIGTERM')

    if (updateTimer)
      clearInterval(updateTimer)
    emitCodexAssistantResult(child!, 'recovered command completed')
    child?.emit('close', 0, null)

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'recovered command completed',
    })
  })

  it('inherits the user Codex model runtime without loading user MCP or plugin configuration', async () => {
    const codexHome = await createCodexHome()
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), [
      'model_provider = "custom"',
      'model = "gpt-5.6-terra"',
      'model_reasoning_effort = "high"',
      'model_catalog_json = "/tmp/codex-model-catalog.json"',
      'model_context_window = 272000',
      'model_auto_compact_token_limit = 220000',
      'approval_policy = "never"',
      'disable_response_storage = true',
      'api_key = "must-not-leak"',
      '',
      '[model_providers.custom]',
      'name = "custom"',
      'wire_api = "responses"',
      'requires_openai_auth = true',
      'base_url = "https://api.example.com/v1"',
      'env_key = "CUSTOM_PROVIDER_API_KEY"',
      'supports_websockets = false',
      'request_max_retries = 2',
      'stream_max_retries = 3',
      'stream_idle_timeout_ms = 45000',
      'api_key = "must-not-leak-either"',
      '',
      '[mcp_servers.serena]',
      'command = "uvx"',
      '',
      '[plugins.browser]',
      'enabled = true',
    ].join('\n'))
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          emitCodexAssistantResult(child, 'codex provider-aware output')
          child.emit('exit', 0, null)
        })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toEqual(expect.arrayContaining([
      '--ignore-user-config',
      '--model',
      'gpt-5.6-terra',
      '-c',
      'model_provider="custom"',
      '-c',
      'model_reasoning_effort="high"',
      '-c',
      'model_catalog_json="/tmp/codex-model-catalog.json"',
      '-c',
      'model_context_window=272000',
      '-c',
      'model_auto_compact_token_limit=220000',
      '-c',
      'approval_policy="never"',
      '-c',
      'disable_response_storage=true',
      '-c',
      'model_providers.custom.name="custom"',
      '-c',
      'model_providers.custom.wire_api="responses"',
      '-c',
      'model_providers.custom.requires_openai_auth=true',
      '-c',
      'model_providers.custom.base_url="https://api.example.com/v1"',
      '-c',
      'model_providers.custom.env_key="CUSTOM_PROVIDER_API_KEY"',
      '-c',
      'model_providers.custom.supports_websockets=false',
      '-c',
      'model_providers.custom.request_max_retries=2',
      '-c',
      'model_providers.custom.stream_max_retries=3',
      '-c',
      'model_providers.custom.stream_idle_timeout_ms=45000',
    ]))
    expect(args.join(' ')).not.toContain('mcp_servers')
    expect(args.join(' ')).not.toContain('plugins.browser')
    expect(args.join(' ')).not.toContain('must-not-leak')
  })

  it('preserves the configured reasoning effort for observe-only work', async () => {
    const codexHome = await createCodexHome('alicization-codex-observe-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), [
      'model_provider = "custom"',
      'model_reasoning_effort = "max"',
      '',
      '[model_providers.custom]',
      'name = "custom"',
      'wire_api = "responses"',
      'requires_openai_auth = true',
      'base_url = "https://api.example.com/v1"',
    ].join('\n'))
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'observe output')
        child.emit('close', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread({
        kind: 'codebase-investigation',
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Inspect without modifying anything.',
        sandbox: 'read-only',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toContain('model_reasoning_effort="max"')
  })

  it('reads the default user configuration from ~/.codex when CODEX_HOME is unset', async () => {
    const homeDir = await mkdtemp(resolve(tmpdir(), 'alicization-user-home-'))
    createdCodexHomes.push(homeDir)
    homedirMock.mockReturnValue(homeDir)
    delete process.env.CODEX_HOME
    await mkdir(resolve(homeDir, '.codex'), { recursive: true })
    await writeFile(resolve(homeDir, '.codex', 'auth.json'), '{"test":"credential"}\n')
    await writeFile(resolve(homeDir, '.codex', 'config.toml'), [
      'model_provider = "home-provider"',
      'model = "home-model"',
      '',
      '[model_providers.home-provider]',
      'name = "home-provider"',
      'wire_api = "responses"',
      'base_url = "https://home.example.com/v1"',
    ].join('\n'))
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'home provider output')
        child.emit('exit', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toEqual(expect.arrayContaining([
      '-c',
      'model_provider="home-provider"',
      '--model',
      'home-model',
    ]))
  })

  it('applies only whitelisted model settings from an explicit profile', async () => {
    const codexHome = await createCodexHome('alicization-codex-profile-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), 'model = "base-model"\n')
    await writeFile(resolve(codexHome, 'fast.config.toml'), [
      'model_provider = "profile-provider"',
      'model = "profile-model"',
      '',
      '[model_providers.profile-provider]',
      'name = "profile-provider"',
      'wire_api = "responses"',
      'base_url = "https://profile.example.com/v1"',
      'supports_websockets = false',
      '',
      '[mcp_servers.profile_server]',
      'command = "must-not-run"',
      '',
      '[plugins.profile_plugin]',
      'enabled = true',
    ].join('\n'))
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'profile provider output')
        child.emit('exit', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        profile: 'fast',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args).toEqual(expect.arrayContaining([
      '--model',
      'profile-model',
      '-c',
      'model_provider="profile-provider"',
      '-c',
      'model_providers.profile-provider.supports_websockets=false',
    ]))
    expect(args).not.toContain('--profile')
    expect(args.join(' ')).not.toContain('mcp_servers')
    expect(args.join(' ')).not.toContain('profile_plugin')
    expect(args.join(' ')).not.toContain('must-not-run')
  })

  it('keeps an explicit command model ahead of the inherited default', async () => {
    const codexHome = await createCodexHome('alicization-codex-explicit-model-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), 'model = "inherited-model"\n')
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'explicit model output')
        child.emit('exit', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        model: 'explicit-model',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args[args.indexOf('--model') + 1]).toBe('explicit-model')
    expect(args).not.toContain('inherited-model')
  })

  it('does not copy credentials embedded in a provider base URL into argv', async () => {
    const codexHome = await createCodexHome('alicization-codex-credential-url-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), [
      'model_provider = "credential-provider"',
      '',
      '[model_providers.credential-provider]',
      'name = "credential-provider"',
      'base_url = "https://user:password@example.com/v1?token=secret#fragment"',
    ].join('\n'))
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => {
        emitCodexAssistantResult(child, 'credential-safe output')
        child.emit('exit', 0, null)
      })
      return child
    })

    await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    const [, args] = spawnMock.mock.calls[0] ?? []
    expect(args.join(' ')).not.toContain('password')
    expect(args.join(' ')).not.toContain('token=secret')
    expect(args.some((arg: string) => arg.includes('.base_url='))).toBe(false)
  })

  it('fails transparently before spawn when the user TOML is invalid', async () => {
    const codexHome = await createCodexHome('alicization-codex-invalid-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), 'model_provider = [invalid')

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(spawnMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_CONFIG_INVALID',
    })
  })

  it('fails transparently before spawn when an explicit profile is missing', async () => {
    const codexHome = await createCodexHome('alicization-codex-missing-profile-home-')
    process.env.CODEX_HOME = codexHome
    await writeFile(resolve(codexHome, 'config.toml'), 'model = "base-model"\n')

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        profile: 'missing-profile',
      },
      workspaceRoot: process.cwd(),
    })

    expect(spawnMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROFILE_INVALID',
    })
  })

  it('does not spawn Codex when the task was already cancelled', async () => {
    const controller = new AbortController()
    controller.abort(new DOMException('cancelled before dispatch', 'AbortError'))

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    expect(spawnMock).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'cancelled',
      errorCode: 'CODEX_ABORTED',
    })
  })

  it('does not report success when codex exits without an assistant result', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stderr.emit('data', Buffer.from('Reading additional input from stdin...'))
        emitCodexTurnCompleted(child)
        child.emit('exit', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CODEX_EMPTY_OUTPUT')
    expect(result.errorMessage).toContain('without producing an assistant response')
  })

  it('does not treat diagnostic stdout as the assistant result', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from('MCP shutdown warning'))
        emitCodexTurnCompleted(child)
        child.emit('exit', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CODEX_EMPTY_OUTPUT')
    expect(result.errorMessage).toContain('without producing an assistant response')
  })

  it('surfaces a structured Codex model availability failure from JSONL stdout', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'error',
          message: 'unexpected status 404 Not Found: Model "gpt-5.6-terra" is not supported by any configured account in this group',
        })}\n`))
        child.emit('exit', 1, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_MODEL_UNAVAILABLE',
    })
    expect(result.errorMessage).toContain('gpt-5.6-terra')
    expect(result.errorMessage).toContain('not supported')
  })

  it('settles from the child exit event when inherited pipes keep the execFile callback open', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          child.stdout.emit('data', Buffer.from('codex diagnostic stdout\n'))
          emitCodexAssistantResult(child, 'codex exit fallback output')
          child.emit('exit', 0, null)
        })

      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.output).toContain('codex exit fallback output')
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          stream: 'stdout',
          text: expect.stringContaining('codex diagnostic stdout'),
        }),
      }),
    ]))
  })

  it('reaps the process only after turn.completed and waits for close before settling', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          setTimeout(() => child.emit('close', 0, null), 10)
      })
      setTimeout(() => {
        emitCodexAssistantResult(child, 'codex output before shutdown')
      }, 10)
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('codex output before shutdown')
    expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
      outputReady: true,
      exitCode: 0,
    }))
  })

  it('continues reaping the detached process group after the direct child exits', async () => {
    vi.useFakeTimers()
    const processGroupPid = 987_654_320
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let groupAlive = true

    processKillMock.mockImplementation((pid: number, signal?: NodeJS.Signals | number) => {
      if (pid !== -processGroupPid)
        throw Object.assign(new Error('unexpected process group'), { code: 'ESRCH' })
      if (signal === 0) {
        if (groupAlive)
          return true
        throw Object.assign(new Error('process group not found'), { code: 'ESRCH' })
      }
      if (signal === 'SIGTERM') {
        setTimeout(() => child?.emit('exit', 0, null), 10)
        return true
      }
      if (signal === 'SIGKILL') {
        groupAlive = false
        setTimeout(() => child?.emit('close', 0, null), 10)
        return true
      }
      return true
    })

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild(vi.fn(), processGroupPid)
      void Promise.resolve().then(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'codex output with a lingering descendant')
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(300)
    await advanceFakeTimersAndFlush(300)
    expect(processKillMock).toHaveBeenCalledWith(-processGroupPid, 'SIGTERM')

    await advanceFakeTimersAndFlush(750)
    expect(processKillMock).toHaveBeenCalledWith(-processGroupPid, 'SIGKILL')

    await advanceFakeTimersAndFlush(20)
    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'codex output with a lingering descendant',
    })
  })

  it('does not treat output-last-message changes as progress or completion, while the total deadline remains authoritative', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(999)
    expect(child?.kill).not.toHaveBeenCalled()

    await advanceFakeTimersAndFlush(1)
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    child?.emit('close', null, 'SIGTERM')
    const result = await resultPromise
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_EXECUTION_TIMEOUT',
    })
    expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
      timeoutKind: 'execution',
    }))
  })

  it('keeps turn.failed terminal even after a partial assistant message and zero exit code', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      void Promise.resolve().then(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'partial-agent-message',
              type: 'agent_message',
              text: 'partial assistant output',
            },
          }),
          JSON.stringify({
            type: 'turn.failed',
            error: {
              message: 'unexpected status 503 Service Unavailable',
            },
          }),
          '',
        ].join('\n')))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(250)
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')

    child?.emit('close', 0, null)
    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROVIDER_UNAVAILABLE',
      errorMessage: 'unexpected status 503 Service Unavailable',
    })
  })

  it('settles a fatal item.completed error before startup timeout', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: 'provider-model-error',
            type: 'error',
            message: 'Model "gpt-5.6-terra" is not supported by any configured account.',
          },
        })}\n`))
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
        },
        lifecycle: {
          startupTimeoutMs: 1_000,
          totalTimeoutMs: 5_000,
        },
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await flushNativeIo()
      await advanceFakeTimersAndFlush(250)

      expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_MODEL_UNAVAILABLE',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('does not replace a received turn.completed result with a process-reap failure', async () => {
    vi.useFakeTimers()
    const processGroupPid = 987_654_321
    let child: ReturnType<typeof createMockCodexChild> | undefined

    processKillMock.mockImplementation((pid: number, signal?: NodeJS.Signals | number) => {
      if (pid === -processGroupPid && (signal === 0 || signal === 'SIGTERM' || signal === 'SIGKILL'))
        return true
      throw Object.assign(new Error('unexpected process group'), { code: 'ESRCH' })
    })
    spawnMock.mockImplementation(() => {
      child = createMockCodexChild(vi.fn(), processGroupPid)
      queueMicrotask(() => {
        if (!child)
          return
        emitCodexAssistantResult(child, 'completed before reap failure')
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
        },
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await flushNativeIo()
      await advanceFakeTimersAndFlush(250)
      await advanceFakeTimersAndFlush(750)
      await advanceFakeTimersAndFlush(750)

      await expect(resultPromise).resolves.toMatchObject({
        ok: true,
        finalStatus: 'completed',
        output: 'completed before reap failure',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('treats an initial item.failed event as started work instead of startup timeout', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.failed',
          item: {
            id: 'failed-command-before-turn',
            type: 'command_execution',
            command: 'git status --short',
            status: 'failed',
          },
        })}\n`))
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
        },
        lifecycle: {
          startupTimeoutMs: 300,
          totalTimeoutMs: 1_000,
        },
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await flushNativeIo()
      await advanceFakeTimersAndFlush(400)
      expect(child?.kill).not.toHaveBeenCalled()

      child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
        type: 'turn.failed',
        error: {
          message: 'command failed before the turn completed',
        },
      })}\n`))
      child?.emit('close', 1, null)

      await expect(resultPromise).resolves.toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_EXECUTE_FAILED',
      })
    }
    finally {
      vi.useRealTimers()
    }
  })

  it('decodes JSONL correctly when a UTF-8 assistant message is split across chunks', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        const payload = Buffer.from([
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'utf8-agent-message',
              type: 'agent_message',
              text: '你好，正在检查。',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n'))
        const splitAt = payload.indexOf(Buffer.from('你')) + 1
        child.stdout.emit('data', payload.subarray(0, splitAt))
        child.stdout.emit('data', payload.subarray(splitAt))
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: '你好，正在检查。',
    })
  })

  it('keeps turn.completed authoritative when process reaping ends with SIGTERM', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'completed-agent-message',
              type: 'agent_message',
              text: 'completed before process reap',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n')))
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'completed before process reap',
    })
  })

  it('does not let abort after turn.completed replace the completed result', async () => {
    const controller = new AbortController()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from([
          JSON.stringify({
            type: 'item.completed',
            item: {
              id: 'completed-before-abort',
              type: 'agent_message',
              text: 'completed result',
            },
          }),
          JSON.stringify({
            type: 'turn.completed',
          }),
          '',
        ].join('\n')))
      })
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    controller.abort(new DOMException('cancelled after terminal', 'AbortError'))
    expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    child?.emit('close', null, 'SIGTERM')

    await expect(resultPromise).resolves.toMatchObject({
      ok: true,
      finalStatus: 'completed',
      output: 'completed result',
    })
  })

  it('keeps the hard cap terminal even while stdout continues to report activity', async () => {
    vi.useFakeTimers()
    const hardCapMs = 60 * 60_000
    let nowCalls = 0
    const now = vi.fn(() => {
      nowCalls += 1
      return nowCalls >= 3 ? hardCapMs - 500 : 0
    })
    let child: ReturnType<typeof createMockCodexChild> | undefined
    let progressTimer: ReturnType<typeof setInterval> | undefined
    let progressCount = 0

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      progressTimer = setInterval(() => {
        progressCount += 1
        child?.stdout.emit('data', Buffer.from('codex is still working'))
      }, 200)
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      lifecycle: {
        totalTimeoutMs: hardCapMs,
      },
      now,
      workspaceRoot: process.cwd(),
    })

    await waitForSpawnMock()
    await flushNativeIo()
    await advanceFakeTimersAndFlush(2_000)
    expect(progressCount).toBeGreaterThan(0)
    try {
      const result = await resultPromise
      expect(result).toMatchObject({
        ok: false,
        finalStatus: 'failed',
        errorCode: 'CODEX_EXECUTION_TIMEOUT',
      })
      expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
        timeoutKind: 'execution',
      }))
      expect(child?.kill).toHaveBeenCalledWith('SIGTERM')
    }
    finally {
      if (progressTimer)
        clearInterval(progressTimer)
    }
  })

  it('does not let abort be replaced by early-reap success', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      child = createMockCodexChild()
      return child
    })

    const resultPromise = executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      abortSignal: controller.signal,
      workspaceRoot: process.cwd(),
    })

    await vi.advanceTimersByTimeAsync(500)
    controller.abort(new DOMException('cancelled while reaping', 'AbortError'))
    child?.emit('close', null, 'SIGTERM')

    const result = await resultPromise
    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'cancelled',
      errorCode: 'CODEX_ABORTED',
    })
  })

  it('rejects a zero exit with output when Codex omits the JSONL turn terminal', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve().then(() => child.emit('close', 0, null))
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 1_000,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_PROTOCOL_INCOMPLETE',
    })
    expect(result.errorMessage).toContain('turn.completed')
  })

  it('classifies an interrupted command without a turn terminal as Codex interruption', async () => {
    spawnMock.mockImplementation(() => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'item.completed',
          item: {
            id: 'interrupted-command',
            type: 'command_execution',
            command: 'du -sh ~/Library',
            exit_code: 130,
            status: 'failed',
          },
        })}\n`))
        child.emit('close', 0, null)
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_INTERRUPTED',
    })
    expect(result.errorMessage).toContain('interrupted')
  })

  it('drains stderr through close after exit before settling', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          emitCodexAssistantResult(child, 'codex output with trailing diagnostics')
          child.emit('exit', 0, null)
          setTimeout(() => {
            child.stderr.emit('data', Buffer.from('late stderr diagnostic'))
            child.emit('close', 0, null)
          }, 10)
        })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.output).toContain('codex output with trailing diagnostics')
    expect(result.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'step',
        payload: expect.objectContaining({
          stream: 'stderr',
          text: 'late stderr diagnostic',
        }),
      }),
    ]))
  })

  it('does not let output arriving after the total deadline reverse a timeout', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      queueMicrotask(() => {
        child.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      return child
    })

    const result = await executeCodexTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current codebase issue.',
        timeoutMs: 300,
      },
      lifecycle: {
        startupTimeoutMs: 1_000,
        totalTimeoutMs: 300,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result).toMatchObject({
      ok: false,
      finalStatus: 'failed',
      errorCode: 'CODEX_EXECUTION_TIMEOUT',
    })
    expect(result.events.at(-1)?.payload).toEqual(expect.objectContaining({
      timeoutKind: 'execution',
    }))
  })

  it('keeps a live protocol-ready Codex process alive past the semantic idle budget', async () => {
    vi.useFakeTimers()
    let child: ReturnType<typeof createMockCodexChild> | undefined

    spawnMock.mockImplementation(() => {
      child = createMockCodexChild()
      child.kill.mockImplementation((signal) => {
        if (signal === 'SIGTERM')
          queueMicrotask(() => child?.emit('close', null, 'SIGTERM'))
      })
      queueMicrotask(() => {
        child?.stdout.emit('data', Buffer.from(`${JSON.stringify({
          type: 'turn.started',
        })}\n`))
      })
      return child
    })

    try {
      const resultPromise = executeCodexTaskThread({
        thread: createThread(),
        command: {
          prompt: 'Inspect the current codebase issue.',
          timeoutMs: 300,
        },
        lifecycle: {
          startupTimeoutMs: 1_000,
          totalTimeoutMs: 2_000,
        },
        workspaceRoot: process.cwd(),
      })

      await waitForSpawnMock()
      await advanceFakeTimersAndFlush(400)
      expect(child?.kill).not.toHaveBeenCalled()

      if (child) {
        emitCodexAssistantResult(child, 'late but valid assistant result')
        child.emit('close', 0, null)
      }
      await expect(resultPromise).resolves.toMatchObject({
        ok: true,
        finalStatus: 'completed',
        output: 'late but valid assistant result',
      })
    }
    finally {
      vi.useRealTimers()
    }
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
    expect(spawnMock).not.toBeCalled()
  })

  it('allows low-risk autonomous code edits to self-start on codex when task policy marks them low-risk', async () => {
    spawnMock.mockImplementation((_command: string, _args: string[]) => {
      const child = createMockCodexChild()
      void Promise.resolve()
        .then(() => {
          child.stdout.emit('data', Buffer.from('codex stdout\n'))
          emitCodexAssistantResult(child, 'codex autonomous patch output')
          child.emit('exit', 0, null)
        })
      return child
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
    expect(spawnMock).toBeCalled()
  })

  it('blocks medium-risk autonomous code edits when old stored threads lost explicit permission metadata even if origin thinned back to user-turn', async () => {
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
    expect(spawnMock).not.toBeCalled()
  })
})
