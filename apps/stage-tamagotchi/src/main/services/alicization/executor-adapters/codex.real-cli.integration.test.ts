import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

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
})
