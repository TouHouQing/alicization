import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { env } from 'node:process'

import { expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { withActionDispatch } from '../execution/action-dispatch-context'
import { executeCodexTaskThread } from '../executor-adapters/codex'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { withExternalAgentUsage } from './external-agent-usage'
import { createProviderUsageLedger } from './provider-usage-ledger'

it.skipIf(env.ALICIZATION_RUN_REAL_CODEX !== '1')('persists an actual native Codex terminal usage report in the owning life ledger', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-native-usage-'))
  const workspace = join(root, 'workspace')
  const database = await setupAlicizationDb(root, { cardId: 'alice' })
  const signal = new AbortController().signal
  let completed = false
  try {
    await mkdir(workspace)
    const life = createLifeTurnRuntime({ read: database.readLifeState, commit: database.commitLifeState, getIngress: database.getLifeIngress, getEffect: database.getLifeEffect, now: Date.now })
    const turnId = 'native-usage'
    const marker = `usage-check-${randomUUID()}`
    const command = { prompt: `Only reply with ${marker}. Do not use tools or change any files.`, cwd: workspace, effect: 'observe' as const, sandbox: 'read-only' as const, timeoutMs: 90000, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId, sensory: { collectedAt: null, running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } }
    await life.admit({ cardId: 'alice', turnId, conversationId: 'usage-test', messages: [{ role: 'user', content: command.prompt }] }, signal)
    const thread: AlicizationTaskThreadRecord = { id: `native-usage:${randomUUID()}`, decisionTraceId: null, turnId, sessionId: 'usage-test', origin: 'user-turn', goal: 'Observe actual native provider metering', kind: 'codebase-investigation', status: 'planned', selectedChannel: 'codex', proposedChannel: 'codex', summary: null, metadata: { task: { permissionMode: 'implicit', effect: 'observe' } }, createdAt: Date.now(), updatedAt: Date.now(), lastEventAt: null, completedAt: null }
    await database.upsertTaskThread(thread)
    const action = await life.beforeAction({ cardId: 'alice', turnId, actionId: 'codex', capabilityId: 'coding_agent.codex', parameters: command, effectContract: { version: 'life-capability-effects-v1', sideEffect: 'read', retryClass: 'read-only', verifier: 'returned-observation', compensation: 'none' } }, signal)
    const ledger = createProviderUsageLedger(database, 'alice')
    const request = { requestId: randomUUID(), cardId: 'alice', turnId, rootTurnId: turnId, parentRequestId: null, providerId: 'codex', model: 'external-cli-managed', measurement: 'external-agent-aggregate' as const, requestHash: createHash('sha256').update(JSON.stringify(command)).digest('hex'), providerAttempt: 1, startedAt: Date.now() }
    await action.authorizeDispatch(command)
    const result = await withExternalAgentUsage({ accounting: ledger, request, signal, task: observe => withActionDispatch(action.assertDispatchCurrent, async () => {
      const adapter = await executeCodexTaskThread({ thread, command, workspaceRoot: workspace, processJobsRoot: join(root, 'owned-processes'), abortSignal: signal, onExecutionEvent: async (event) => {
        await database.appendExecutionEvents([event])
        observe([event])
      } })
      observe(adapter.events)
      return { thread: { status: adapter.finalStatus }, adapter }
    }) })
    await life.afterAction({ cardId: 'alice', id: action.id, interrupted: false, outcome: result.adapter.ok ? 'success' : 'failure', output: result.adapter })
    expect(result.adapter.ok, result.adapter.errorMessage).toBe(true)
    expect(result.adapter.output).toContain(marker)
    const page = await ledger.read({ rootTurnId: turnId })
    expect(page.entries).toHaveLength(1)
    expect(page.entries[0]!.usage!.inputTokens).toBeGreaterThan(0)
    expect(page.entries[0]!.usage!.outputTokens).toBeGreaterThan(0)
    expect(page.summary.requestCount).toBe(0)
    expect(page.external).toMatchObject({ invocationCount: 1, usageReported: 1 })
    expect(await ledger.recoverInterrupted()).toBe(0)
    completed = true
  }
  finally {
    await database.close()
    if (completed) {
      await rm(root, { recursive: true, force: true })
    }
    else {
      const output = resolve(env.ALICIZATION_AGENT_ACCEPTANCE_OUTPUT || 'output/agent-runtime-20261104')
      await mkdir(output, { recursive: true })
      await writeFile(join(output, `native-usage-failure-${createHash('sha256').update(root).digest('hex')}.json`), JSON.stringify({ root, cardId: 'alice', preservedForInspection: true }))
    }
  }
}, 120000)
