import { createHash, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { compensateExecutionFile } from './compensation'
import { createExecutionResourceBroker, executionFileResources } from './resource-broker'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

async function fileIdentity(path: string) {
  const info = await stat(path, { bigint: true })
  return { device: String(info.dev), inode: String(info.ino) }
}

describe('production work composition and exclusive compensation', () => {
  it('keeps a restored file quarantined when its result audit fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-compensation-audit-failure-'))
    const broker = createExecutionResourceBroker()
    try {
      const path = join(root, 'owned.txt')
      const digest = (value: string) => createHash('sha256').update(value).digest('hex')
      await writeFile(path, 'generated')
      await expect(compensateExecutionFile({ cardId: 'alice', recoveryId: randomUUID(), effectId: 'original-write', path, ...await fileIdentity(path), writtenHash: digest('generated'), backupHash: digest('original'), backupBytes: new TextEncoder().encode('original') }, { broker, effectOwnsVersion: async () => true, audit: async (event) => {
        if (event.stage === 'observed')
          throw new Error('result audit unavailable')
      } })).rejects.toThrow('result audit unavailable')
      expect(await readFile(path, 'utf8')).toBe('original')
      expect(broker.snapshot()).toMatchObject([{ uncertain: true }])
      const resources = await executionFileResources(path)
      expect(() => broker.acquire({ owner: 'next-writer', resources })).toThrow('reconciliation')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 30000)
  it('freezes the approved compensation and rechecks its original effect and lease after audit waits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-compensation-authority-'))
    const digest = (value: string) => createHash('sha256').update(value).digest('hex')
    try {
      const path = join(root, 'original-target.txt')
      const other = join(root, 'host-target.txt')
      await writeFile(path, 'generated')
      await writeFile(other, 'generated')
      const request = { cardId: 'alice', recoveryId: randomUUID(), effectId: 'original-write', path, ...await fileIdentity(path), writtenHash: digest('generated'), backupHash: digest('original'), backupBytes: new TextEncoder().encode('original') }
      const broker = createExecutionResourceBroker()
      let checked = 0
      expect(await compensateExecutionFile(request, { broker, effectOwnsVersion: async (binding) => { checked++; expect(binding.path).toBe(path); return true }, audit: async (event) => {
        if (event.stage === 'prepared') {
          request.path = other
          request.backupBytes.fill(0)
        }
      } })).toMatchObject({ ok: true, actualHash: digest('original') })
      expect(checked).toBe(3)
      expect(await readFile(path, 'utf8')).toBe('original')
      expect(await readFile(other, 'utf8')).toBe('generated')
      expect(broker.snapshot()).toEqual([])

      const retry = { ...request, path: other, backupBytes: new TextEncoder().encode('original') }
      let owner = true
      await expect(compensateExecutionFile(retry, { broker, effectOwnsVersion: async () => owner, audit: async () => { owner = false } })).rejects.toThrow('original effect changed')
      expect(await readFile(other, 'utf8')).toBe('generated')
      expect(broker.snapshot()).toEqual([])

      let now = Date.now()
      const expiring = createExecutionResourceBroker(() => now)
      await expect(compensateExecutionFile(retry, { broker: expiring, effectOwnsVersion: async () => true, audit: async () => { now += 60001 } })).rejects.toThrow('stale')
      expect(await readFile(other, 'utf8')).toBe('generated')
      expect(expiring.snapshot()).toEqual([])
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 30000)
  it('uses the production scheduler and life action ledger for a real file and rejects duplicate/revised requests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-work-runtime-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'result.txt')
      const bytes = 'a bounded accepted result'
      await db.upsertTaskThread({ id: 'write-task', goal: 'Write the accepted file', kind: 'codebase-edit', status: 'planned', metadata: { goalProof: { kind: 'file', path, contentHash: createHash('sha256').update(bytes).digest('hex') } } })
      const broker = createExecutionResourceBroker()
      let writes = 0
      let deliveries = 0
      const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: (error) => { throw error }, onSettled: async ({ thread }) => {
        expect(broker.snapshot()).toHaveLength(0)
        expect(thread.metadata?.lifeGoalOutcome).toMatchObject({ status: 'fulfilled', independent: true, verdict: 'satisfied' })
        deliveries++
      }, tools: { 'tool.filesystem_write_file': async (input) => { writes++; await writeFile(String(input.path), String(input.content)); return { status: 'completed', ok: true } } } })
      const plan = await runtime.singleStepPlan({ cardId: 'alice', threadId: 'write-task', capabilityId: 'tool.filesystem_write_file', parameters: { path, content: bytes } })
      expect(await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'run-one' })).toMatchObject({ state: 'steps-observed', windows: 1 })
      expect(await readFile(path, 'utf8')).toBe(bytes)
      expect((await db.readLifeState()).obligations.find(goal => goal.threadId === 'write-task')?.status).toBe('fulfilled')
      expect(broker.snapshot()).toHaveLength(0)
      expect(await runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: 'run-one' })).toMatchObject({ state: 'already-recorded' })
      expect(writes).toBe(1)
      expect(deliveries).toBe(1)
      await expect(runtime.run({ cardId: 'alice', planId: plan.id, expectedRevision: 2, requestId: 'run-two' })).rejects.toThrow('changed')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('restores only its exact file version and preserves a subsequent host edit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-compensation-'))
    try {
      const path = join(root, 'owned.txt')
      const digest = (text: string) => createHash('sha256').update(text).digest('hex')
      const broker = createExecutionResourceBroker()
      const audit: unknown[] = []
      await writeFile(path, 'generated')
      const request = { cardId: 'alice', recoveryId: randomUUID(), effectId: 'write-one', path, ...await fileIdentity(path), writtenHash: digest('generated'), backupHash: digest('original'), backupBytes: new TextEncoder().encode('original') }
      const ports = { broker, effectOwnsVersion: async () => true, audit: async (event: Record<string, unknown>) => { audit.push(event) } }
      expect(await compensateExecutionFile(request, ports)).toMatchObject({ ok: true, actualHash: digest('original') })
      expect(await readFile(path, 'utf8')).toBe('original')
      await writeFile(path, 'host changed this later')
      expect(await compensateExecutionFile(request, ports)).toMatchObject({ ok: false, errorCode: 'COMPENSATION_CURRENT_VERSION_CHANGED', effectMayHaveOccurred: false })
      expect(await readFile(path, 'utf8')).toBe('host changed this later')
      expect(audit).toHaveLength(6)
      expect(broker.snapshot()).toHaveLength(0)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  }, 30_000)
})
