import type {
  AlicizationExecutionEventInput,
  AlicizationTaskThreadRecord,
} from '@proj-alicization/stage-shared'

import process from 'node:process'

import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildCodexAcceptanceTaskState,
  buildRealPrompt,
  calculateFirstSemanticProgressMs,
  classifyCodexAcceptanceOutcome,
  createCodexAcceptanceTaskStore,
  isCodexAcceptanceActiveCommandEvent,
  parseCodexAcceptanceArgs,
} from '../../../../scripts/codex-real-acceptance'

describe('codex real acceptance runner', () => {
  it('verifies five provider retries through real fixture process lifecycles', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'alicization-codex-runner-test-'))
    const reportPath = resolve(root, 'retry-report.json')
    const scriptPath = resolve(
      process.cwd(),
      'apps/stage-tamagotchi/scripts/codex-real-acceptance.ts',
    )
    const tsxCliPath = resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs')

    try {
      const child = spawn(
        process.execPath,
        [
          tsxCliPath,
          scriptPath,
          '--scenario',
          'retry',
          '--report',
          reportPath,
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      const output = await new Promise<{
        code: number | null
        signal: NodeJS.Signals | null
        stdout: string
        stderr: string
      }>((resolveResult, reject) => {
        let stdout = ''
        let stderr = ''
        child.stdout?.on('data', chunk => stdout += String(chunk))
        child.stderr?.on('data', chunk => stderr += String(chunk))
        child.once('error', reject)
        child.once('close', (code, signal) => {
          resolveResult({ code, signal, stdout, stderr })
        })
      })

      const report = JSON.parse(await readFile(reportPath, 'utf8')) as {
        passed: boolean
        scenarios: Array<{
          scenario: string
          status: string
          observations: {
            attemptCount: number
            retryEventCount: number
            threadStartCount: number
            turnStartCount: number
            failedTurnCount: number
            completedTurnCount: number
          }
        }>
      }
      expect(output.signal).toBeNull()
      expect(output.code).toBe(0)
      expect(output.stdout + output.stderr).toContain('provider.retry')
      expect(report).toMatchObject({
        passed: true,
        scenarios: [{
          scenario: 'retry',
          status: 'passed',
          observations: {
            attemptCount: 6,
            retryEventCount: 5,
            threadStartCount: 6,
            turnStartCount: 6,
            failedTurnCount: 5,
            completedTurnCount: 1,
          },
        }],
      })
    }
    finally {
      await rm(dirname(reportPath), { recursive: true, force: true })
    }
  }, 45_000)

  it('measures first semantic progress from the event timestamp, not the settled timestamp', () => {
    expect(calculateFirstSemanticProgressMs({
      startedAt: 1_000,
      firstSemanticProgressAt: 1_230,
      settledAt: 8_000,
    })).toBe(230)
  })

  it('recognizes only command item.started as reliable active work', () => {
    expect(isCodexAcceptanceActiveCommandEvent({
      kind: 'step',
      payload: {
        codexEventType: 'turn.started',
        semanticProgress: true,
      },
    })).toBe(false)
    expect(isCodexAcceptanceActiveCommandEvent({
      kind: 'step',
      payload: {
        codexEventType: 'item.started',
        itemType: 'agent_message',
        semanticProgress: true,
      },
    })).toBe(false)
    expect(isCodexAcceptanceActiveCommandEvent({
      kind: 'step',
      payload: {
        codexEventType: 'item.started',
        itemType: 'command_execution',
        semanticProgress: true,
      },
    })).toBe(true)
  })

  it('uses one immediate sleep command for the real cancel target', () => {
    const prompt = buildRealPrompt('cancel', 2_000)

    expect(prompt).toBe(
      'Immediately run exactly this terminal command and do nothing before it: /bin/sleep 600\n'
      + 'Do not explain, inspect files, or call any other tool. Keep the command running until the external cancellation arrives.',
    )
  })

  it('parses a controlled all-scenarios run without enabling real execution implicitly', () => {
    expect(parseCodexAcceptanceArgs([])).toEqual(expect.objectContaining({
      scenarios: [
        'long-task',
        'cancel',
        'timeout',
        'retry',
        'failure-isolation',
        'background',
        'restart-recovery',
      ],
      allowRealCli: false,
    }))
  })

  it('does not offer a fallback cancellation before command-level active work', () => {
    expect(() => parseCodexAcceptanceArgs([
      '--cancel-fallback-ms',
      '30_000',
    ])).toThrow('未知参数：--cancel-fallback-ms')
  })

  it('requires semantic progress, terminal settlement, and an unchanged workspace for a long task', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'long-task',
      mode: 'real-cli',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'item.started', semanticProgress: true } },
        { kind: 'step', payload: { codexEventType: 'heartbeat', semanticProgress: false } },
        { kind: 'step', payload: { codexEventType: 'turn.completed', terminal: true } },
      ],
      cancelTargetObserved: true,
      workspaceChanged: false,
    })

    expect(outcome).toEqual({
      status: 'passed',
      failures: [],
      assertions: {
        semanticProgressObserved: true,
        terminalSettlementObserved: true,
        workspaceUnchanged: true,
      },
    })
  })

  it('rejects a completed result when the real CLI only emitted a failed terminal event', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'long-task',
      mode: 'real-cli',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'item.started', semanticProgress: true } },
        { kind: 'step', payload: { codexEventType: 'turn.failed', terminal: true } },
      ],
      workspaceChanged: false,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.terminalSettlementObserved).toBe(false)
    expect(outcome.failures).toContain('长任务没有以成功终态完成。')
  })

  it('rejects adapter success when the task-thread owner did not persist the running/completed lifecycle', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'long-task',
      mode: 'real-cli',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'item.started', semanticProgress: true } },
        { kind: 'step', payload: { codexEventType: 'turn.completed', terminal: true } },
      ],
      workspaceChanged: false,
      taskState: buildCodexAcceptanceTaskState({
        persistedThread: null,
        persistedThreads: [],
        persistedEvents: [],
        transitions: [],
      }),
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.taskThreadLifecyclePersisted).toBe(false)
    expect(outcome.failures).toContain('任务线程没有持久化 planned -> running -> completed 生命周期。')
  })

  it('requires persisted progress and an observable task thread for a successful long task', () => {
    const thread: AlicizationTaskThreadRecord = {
      id: 'acceptance-thread-observable',
      attemptId: 'attempt-1',
      decisionTraceId: 'trace-observable',
      turnId: 'turn-observable',
      sessionId: 'session-observable',
      origin: 'user-turn',
      goal: 'Observe a long task.',
      kind: 'codebase-investigation',
      status: 'completed',
      selectedChannel: 'codex',
      proposedChannel: 'codex',
      summary: 'completed',
      metadata: null,
      createdAt: 1,
      updatedAt: 4,
      lastEventAt: 4,
      completedAt: 4,
    }
    const persistedEvents: AlicizationExecutionEventInput[] = [
      {
        id: 'event-dispatch',
        attemptId: 'attempt-1',
        threadId: thread.id,
        kind: 'dispatch',
        threadStatus: 'running',
        payload: { codexEventType: 'dispatch' },
        createdAt: 2,
      },
      {
        id: 'event-progress',
        attemptId: 'attempt-1',
        threadId: thread.id,
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'item.started',
          itemType: 'command_execution',
          semanticProgress: true,
        },
        createdAt: 3,
      },
      {
        id: 'event-result',
        attemptId: 'attempt-1',
        threadId: thread.id,
        kind: 'result',
        threadStatus: 'completed',
        payload: { codexEventType: 'turn.completed' },
        createdAt: 4,
      },
    ]

    const taskState = buildCodexAcceptanceTaskState({
      persistedThread: thread,
      persistedThreads: [thread],
      persistedEvents,
      transitions: ['planned', 'running', 'completed'],
    })
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'long-task',
      mode: 'real-cli',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'item.started', semanticProgress: true } },
        { kind: 'step', payload: { codexEventType: 'turn.completed', terminal: true } },
      ],
      workspaceChanged: false,
      taskState,
    })

    expect(outcome).toEqual(expect.objectContaining({
      status: 'passed',
      assertions: expect.objectContaining({
        taskThreadLifecyclePersisted: true,
        progressPersisted: true,
        observableTaskThread: true,
      }),
    }))
  })

  it('accepts cancellation only when the adapter returns a cancelled result without workspace changes', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'cancel',
      mode: 'real-cli',
      result: {
        ok: false,
        finalStatus: 'cancelled',
        aborted: true,
        timedOut: false,
        errorCode: 'CODEX_ABORTED',
      },
      events: [
        {
          kind: 'step',
          payload: {
            codexEventType: 'item.started',
            itemType: 'command_execution',
            semanticProgress: true,
          },
        },
        { kind: 'cancel', payload: { errorCode: 'CODEX_ABORTED' } },
      ],
      cancelTargetObserved: true,
      workspaceChanged: false,
    })

    expect(outcome).toEqual({
      status: 'passed',
      failures: [],
      assertions: {
        cancellationObserved: true,
        cancelTargetObserved: true,
        workspaceUnchanged: true,
      },
    })
  })

  it('rejects cancellation when only turn-level progress was observed before abort', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'cancel',
      mode: 'real-cli',
      result: {
        ok: false,
        finalStatus: 'cancelled',
        aborted: true,
        timedOut: false,
        errorCode: 'CODEX_ABORTED',
      },
      events: [
        {
          kind: 'step',
          payload: {
            codexEventType: 'turn.started',
            semanticProgress: true,
          },
        },
        { kind: 'cancel', payload: { errorCode: 'CODEX_ABORTED' } },
      ],
      cancelTargetObserved: true,
      workspaceChanged: false,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.cancelTargetObserved).toBe(false)
    expect(outcome.failures).toContain('取消发生前没有观察到正在执行的命令步骤。')
  })

  it('requires cancellation to be visible in both the persisted thread and event ledger', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'cancel',
      mode: 'local-fixture',
      result: {
        ok: false,
        finalStatus: 'cancelled',
        aborted: true,
        timedOut: false,
        errorCode: 'CODEX_ABORTED',
      },
      events: [
        { kind: 'cancel', payload: { errorCode: 'CODEX_ABORTED' } },
      ],
      cancelTargetObserved: true,
      workspaceChanged: false,
      taskState: buildCodexAcceptanceTaskState({
        persistedThread: {
          id: 'cancelled-thread',
          status: 'running',
        } as AlicizationTaskThreadRecord,
        persistedThreads: [],
        persistedEvents: [],
        transitions: ['planned', 'running'],
      }),
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.cancelledThreadPersisted).toBe(false)
    expect(outcome.failures).toContain('取消后的任务线程状态没有持久化为 cancelled。')
  })

  it('accepts a timeout only when no completed terminal is emitted', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'timeout',
      mode: 'real-cli',
      result: {
        ok: false,
        finalStatus: 'failed',
        aborted: false,
        timedOut: true,
        errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'item.started', semanticProgress: true } },
        { kind: 'result', payload: { timedOut: true, timeoutKind: 'active-step' } },
      ],
      workspaceChanged: false,
    })

    expect(outcome).toEqual({
      status: 'passed',
      failures: [],
      assertions: {
        timeoutObserved: true,
        noFalseSuccess: true,
        workspaceUnchanged: true,
      },
    })
  })

  it('requires timeout evidence to remain terminal and observable after dispatch settlement', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'timeout',
      mode: 'local-fixture',
      result: {
        ok: false,
        finalStatus: 'failed',
        aborted: false,
        timedOut: true,
        errorCode: 'CODEX_ACTIVE_STEP_TIMEOUT',
      },
      events: [
        { kind: 'result', payload: { timedOut: true, timeoutKind: 'active-step' } },
      ],
      workspaceChanged: false,
      taskState: buildCodexAcceptanceTaskState({
        persistedThread: {
          id: 'timed-out-thread',
          status: 'completed',
        } as AlicizationTaskThreadRecord,
        persistedThreads: [],
        persistedEvents: [],
        transitions: ['planned', 'running', 'completed'],
      }),
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.timeoutThreadTerminalPersisted).toBe(false)
    expect(outcome.failures).toContain('超时后的任务线程没有保持失败或暂停终态。')
  })

  it('requires a real adapter retry event and a later successful attempt for retry', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'retry',
      mode: 'local-fixture',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.completed', terminal: true } },
      ],
      attemptCount: 6,
      workspaceChanged: false,
    })

    expect(outcome).toEqual({
      status: 'passed',
      failures: [],
      assertions: {
        retryObserved: true,
        retryAttemptLifecyclesObserved: true,
        laterAttemptCompleted: true,
        workspaceUnchanged: true,
      },
    })
  })

  it('fails retry acceptance when the real process lifecycle has fewer than five retries', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'retry',
      mode: 'local-fixture',
      result: {
        ok: true,
        finalStatus: 'completed',
        aborted: false,
        timedOut: false,
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.failed' } },
        { kind: 'step', payload: { codexEventType: 'provider.retry' } },
        { kind: 'step', payload: { codexEventType: 'thread.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.started' } },
        { kind: 'step', payload: { codexEventType: 'turn.completed', terminal: true } },
      ],
      attemptCount: 2,
      workspaceChanged: false,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.retryObserved).toBe(false)
    expect(outcome.assertions.retryAttemptLifecyclesObserved).toBe(false)
    expect(outcome.failures).toContain('没有观察到 5 次适配器发出的 Provider retry 事件。')
  })

  it('keeps failed execution isolated from assistant success and workspace mutation', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'failure-isolation',
      mode: 'local-fixture',
      result: {
        ok: false,
        finalStatus: 'failed',
        aborted: false,
        timedOut: false,
        errorCode: 'CODEX_EXECUTE_FAILED',
      },
      events: [
        { kind: 'step', payload: { codexEventType: 'turn.failed', terminal: true } },
        { kind: 'result', payload: { assistant: '', errorCode: 'CODEX_EXECUTE_FAILED' } },
      ],
      workspaceChanged: false,
    })

    expect(outcome).toEqual({
      status: 'passed',
      failures: [],
      assertions: {
        failedResultObserved: true,
        noAssistantSuccess: true,
        workspaceUnchanged: true,
      },
    })
  })

  it('persists a background task and makes its completion observable after the foreground caller leaves', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'alicization-codex-store-test-'))
    const storePath = resolve(root, 'task-state.json')
    try {
      const store = await createCodexAcceptanceTaskStore(storePath)
      const thread = await store.upsertTaskThread({
        id: 'background-thread',
        attemptId: 'attempt-background',
        decisionTraceId: 'trace-background',
        turnId: 'turn-background',
        sessionId: 'session-background',
        origin: 'user-turn',
        goal: 'Complete after foreground detaches.',
        kind: 'codebase-investigation',
        status: 'planned',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'planned',
        metadata: null,
        createdAt: 1,
        updatedAt: 1,
        lastEventAt: null,
        completedAt: null,
        createOnly: true,
      })
      await store.upsertTaskThread({
        ...thread,
        status: 'running',
        updatedAt: 2,
        lastEventAt: 2,
        completedAt: null,
      })
      const acceptedAt = await store.snapshot()
      expect(acceptedAt.thread).toMatchObject({
        status: 'running',
      })
      expect(acceptedAt.foregroundDetached).toBe(false)

      await store.markForegroundDetached()
      await store.appendExecutionEvents([{
        threadId: thread.id,
        attemptId: thread.attemptId,
        kind: 'step',
        threadStatus: 'running',
        payload: {
          codexEventType: 'item.started',
          semanticProgress: true,
        },
        createdAt: 3,
      }])
      await store.upsertTaskThread({
        ...thread,
        status: 'completed',
        updatedAt: 4,
        lastEventAt: 4,
        completedAt: 4,
        summary: 'completed after foreground detached',
      })

      const completed = await store.snapshot()
      expect(completed).toMatchObject({
        thread: {
          status: 'completed',
        },
        foregroundDetached: true,
        completedAfterForegroundDetached: true,
      })
      expect(completed.events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'step',
          threadStatus: 'running',
        }),
      ]))
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('reopens the persisted task ledger after a process restart and preserves recovery evidence', async () => {
    const root = await mkdtemp(resolve(tmpdir(), 'alicization-codex-restart-test-'))
    const storePath = resolve(root, 'task-state.json')
    try {
      const firstStore = await createCodexAcceptanceTaskStore(storePath)
      const thread = await firstStore.upsertTaskThread({
        id: 'restart-thread',
        attemptId: 'attempt-before-restart',
        decisionTraceId: 'trace-restart',
        turnId: 'turn-restart',
        sessionId: 'session-restart',
        origin: 'user-turn',
        goal: 'Recover after process restart.',
        kind: 'codebase-investigation',
        status: 'running',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'running before restart',
        metadata: null,
        createdAt: 1,
        updatedAt: 2,
        lastEventAt: 2,
        completedAt: null,
        createOnly: true,
      })
      await firstStore.appendExecutionEvents([{
        threadId: thread.id,
        attemptId: thread.attemptId,
        kind: 'step',
        threadStatus: 'running',
        payload: { codexEventType: 'heartbeat', semanticProgress: false },
        createdAt: 2,
      }])
      await firstStore.markProcessRestarted()

      const restartedStore = await createCodexAcceptanceTaskStore(storePath)
      const reopened = await restartedStore.snapshot()
      expect(reopened).toMatchObject({
        restarted: true,
        thread: {
          id: 'restart-thread',
          status: 'running',
        },
        recoveryEvidence: {
          persistedBeforeRestart: true,
          eventCount: 1,
        },
      })
    }
    finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects failed isolation when the CLI did not emit a failed terminal event', () => {
    const outcome = classifyCodexAcceptanceOutcome({
      scenario: 'failure-isolation',
      mode: 'local-fixture',
      result: {
        ok: false,
        finalStatus: 'failed',
        aborted: false,
        timedOut: false,
        errorCode: 'CODEX_EXECUTE_FAILED',
      },
      events: [
        { kind: 'result', payload: { assistant: '', errorCode: 'CODEX_EXECUTE_FAILED' } },
      ],
      workspaceChanged: false,
    })

    expect(outcome.status).toBe('failed')
    expect(outcome.assertions.failedResultObserved).toBe(false)
    expect(outcome.failures).toContain('失败 fixture 没有以 failed 终态结束。')
  })
})
