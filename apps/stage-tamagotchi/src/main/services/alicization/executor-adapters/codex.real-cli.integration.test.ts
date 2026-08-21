import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { describe, expect, it } from 'vitest'

import { locateAlicizationExecutionBinary } from '../execution-command-env'
import { executeCodexTaskThread } from './codex'

function createRealCliThread(): AlicizationTaskThreadRecord {
  return {
    id: 'real-cli-replay',
    sessionId: 'real-cli-replay-session',
    turnId: 'real-cli-replay-turn',
    decisionTraceId: 'real-cli-replay-trace',
    origin: 'user-turn',
    kind: 'codebase-investigation',
    goal: '验证 Codex 真实 CLI 回放链路',
    proposedChannel: 'codex',
    selectedChannel: 'codex',
    status: 'planned',
    summary: null,
    metadata: {
      task: {
        effect: 'observe',
        permissionMode: 'none',
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastEventAt: null,
    completedAt: null,
  }
}

const runRealCodex = process.env.ALICIZATION_RUN_REAL_CODEX === '1'
const runRealCodexSoak = process.env.ALICIZATION_RUN_REAL_CODEX_SOAK === '1'

async function persistSoakReport(report: Record<string, unknown>) {
  const reportPath = process.env.ALICIZATION_CODEX_SOAK_REPORT_PATH?.trim()
  if (!reportPath)
    return null

  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  return reportPath
}

function readCodexStepPayloads(result: Awaited<ReturnType<typeof executeCodexTaskThread>>) {
  return result.events
    .filter(event => event.kind === 'step')
    .map(event => event.payload)
    .filter((payload): payload is Record<string, unknown> => (
      payload != null
      && typeof payload === 'object'
      && (payload as Record<string, unknown>).stream === 'codex-jsonl'
    ))
}

describe('codex real CLI replay', () => {
  it.skipIf(!runRealCodex)(
    'completes a real provider turn with semantic progress and a terminal result',
    async () => {
      const events: Array<{ payload?: Record<string, unknown> }> = []
      const result = await executeCodexTaskThread({
        thread: createRealCliThread(),
        command: {
          prompt: '只回复 OK，不执行任何工具，不修改文件。',
          sandbox: 'read-only',
          timeoutMs: 60_000,
        },
        lifecycle: {
          startupTimeoutMs: 30_000,
          activeStepTimeoutMs: 30_000,
          providerRecoveryTimeoutMs: 10_000,
          totalTimeoutMs: 60_000,
        },
        onExecutionEvent: (event) => {
          events.push({
            payload: event.payload && typeof event.payload === 'object'
              ? event.payload as Record<string, unknown>
              : undefined,
          })
        },
        workspaceRoot: process.cwd(),
      })

      expect(result.errorMessage ?? '').not.toContain('no semantic progress')
      expect(result.events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          kind: 'step',
          payload: expect.objectContaining({
            codexEventType: 'turn.started',
          }),
        }),
      ]))
      expect(events.some(event => event.payload?.codexEventType === 'turn.completed')).toBe(true)
      expect(result).toMatchObject({
        ok: true,
        finalStatus: 'completed',
      })
      expect(result.output?.trim()).toBeTruthy()
    },
    90_000,
  )

  it.skipIf(!runRealCodex)(
    'executes a real read-only coding-agent command and exposes its progress',
    async () => {
      const events: Array<{ payload?: Record<string, unknown> }> = []
      const result = await executeCodexTaskThread({
        thread: createRealCliThread(),
        command: {
          prompt: '使用终端读取仓库根目录下 apps/stage-tamagotchi/package.json，找到 name 字段。只回答这个 name 的值，不修改任何文件。',
          sandbox: 'read-only',
          timeoutMs: 60_000,
        },
        lifecycle: {
          startupTimeoutMs: 30_000,
          activeStepTimeoutMs: 30_000,
          providerRecoveryTimeoutMs: 10_000,
          totalTimeoutMs: 60_000,
        },
        onExecutionEvent: (event) => {
          events.push({
            payload: event.payload && typeof event.payload === 'object'
              ? event.payload as Record<string, unknown>
              : undefined,
          })
        },
        workspaceRoot: process.cwd(),
      })

      const commandProgress = events.filter((event) => {
        const payload = event.payload
        return payload?.codexEventType === 'item.started'
          || payload?.codexEventType === 'item.completed'
      }).filter(event => event.payload?.itemType === 'command_execution')

      expect(commandProgress.length).toBeGreaterThan(0)
      expect(commandProgress.some(event => event.payload?.semanticProgress === true)).toBe(true)
      expect(result).toMatchObject({
        ok: true,
        finalStatus: 'completed',
      })
      expect(result.output).toContain('@proj-alicization/stage-tamagotchi')
      expect(result.errorMessage ?? '').not.toContain('no semantic progress')
    },
    120_000,
  )

  it.skipIf(!runRealCodexSoak)(
    'runs a real multi-step long task and persists a replayable heartbeat report',
    async () => {
      const binaryPath = await locateAlicizationExecutionBinary('codex', {
        platform: process.platform,
      })
      expect(binaryPath).toBeTruthy()

      const observedAt = Date.now()
      const result = await executeCodexTaskThread({
        thread: {
          ...createRealCliThread(),
          id: 'real-cli-long-task-soak',
          sessionId: 'real-cli-long-task-soak-session',
          turnId: 'real-cli-long-task-soak-turn',
          decisionTraceId: 'real-cli-long-task-soak-trace',
          goal: '验证真实 Codex 长任务的 JSONL 心跳和终态闭环',
        },
        command: {
          prompt: [
            '只读执行，不修改任何文件。',
            '请在当前仓库根目录使用终端运行下面的 Node 命令，等待命令完整结束后再回复：',
            `node -e 'const wait = new Int32Array(new SharedArrayBuffer(4)); for (let i = 1; i <= 4; i++) { console.log("alicization-long-task-phase-" + i); Atomics.wait(wait, 0, 0, 3500); }'`,
            '命令结束后只需说明长任务已完成，并保留终端实际执行结果。',
          ].join('\n'),
          sandbox: 'read-only',
          timeoutMs: 120_000,
        },
        lifecycle: {
          startupTimeoutMs: 30_000,
          activeStepTimeoutMs: 60_000,
          providerRecoveryTimeoutMs: 15_000,
          totalTimeoutMs: 120_000,
        },
        workspaceRoot: process.cwd(),
      })

      const stepPayloads = readCodexStepPayloads(result)
      const eventTypes = stepPayloads.map(payload => String(payload.codexEventType ?? ''))
      const heartbeats = stepPayloads.filter(payload => payload.codexEventType === 'heartbeat')
      const semanticEvents = stepPayloads.filter(payload => payload.semanticProgress === true)
      const terminalEvents = stepPayloads.filter(payload => payload.terminal === true)
      const commandEvents = stepPayloads.filter(payload => payload.itemType === 'command_execution')
      const turnTerminalEvents = stepPayloads.filter(payload => (
        payload.codexEventType === 'turn.completed' || payload.codexEventType === 'turn.failed'
      ))
      const report = {
        version: 'codex-long-task-soak-report-v1',
        id: 'real-cli-long-task-soak',
        observedAt,
        finishedAt: Date.now(),
        binaryPath,
        result: {
          ok: result.ok,
          finalStatus: result.finalStatus,
          errorCode: result.errorCode ?? null,
          errorMessage: result.errorMessage ?? null,
          externalSessionId: result.externalSessionId ?? null,
        },
        metrics: {
          stepEventCount: stepPayloads.length,
          semanticEventCount: semanticEvents.length,
          heartbeatCount: heartbeats.length,
          commandEventCount: commandEvents.length,
          terminalEventCount: terminalEvents.length,
          turnTerminalEventCount: turnTerminalEvents.length,
          eventTypes,
        },
        retry: {
          adapterProcessAttemptCount: 1,
          automaticAdapterRetry: false,
          note: 'Codex adapter owns one process lifecycle; safe outer retry remains a dispatcher concern.',
        },
        continuation: {
          externalSessionCaptured: Boolean(result.externalSessionId),
          terminalSettlementCount: turnTerminalEvents.length,
          automaticContinuation: false,
        },
      }
      await persistSoakReport(report)

      expect(result).toMatchObject({
        ok: true,
        finalStatus: 'completed',
      })
      expect(result.errorMessage ?? '').not.toContain('timeout')
      expect(result.errorMessage ?? '').not.toContain('no semantic progress')
      expect(result.externalSessionId).toBeTruthy()
      expect(eventTypes).toEqual(expect.arrayContaining([
        'thread.started',
        'turn.started',
        'item.started',
        'item.completed',
        'turn.completed',
      ]))
      expect(commandEvents.length).toBeGreaterThan(0)
      expect(semanticEvents.length).toBeGreaterThan(0)
      expect(heartbeats.length).toBeGreaterThan(0)
      expect(heartbeats.every(payload => payload.semanticProgress === false)).toBe(true)
      expect(terminalEvents).toHaveLength(1)
      expect(turnTerminalEvents).toEqual([
        expect.objectContaining({
          codexEventType: 'turn.completed',
          terminal: true,
          terminalStatus: 'completed',
        }),
      ])
    },
    180_000,
  )
})
