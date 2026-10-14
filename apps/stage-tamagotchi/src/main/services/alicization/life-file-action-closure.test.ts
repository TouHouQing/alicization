import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { callLocalFilesystem, inspectFilesystemWritePrecondition } from '../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from './db'
import { completedLifeExecutionStep } from './life-dialogue-claim'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { buildMainGatewayTools } from './main-chat-execution-surface'
import { createCanonicalToolRegistry } from './turn-os/tool-registry'

describe('ordinary file action reaches the same durable goal and reply evidence', () => {
  it('closes a real higher-level edit through native I/O while a patch preview cannot certify a write', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-file-goal-edit-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'proof.txt')
      await writeFile(path, '旧内容')
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      await life.admit({ cardId: 'alice', turnId: 'edit-turn', conversationId: 'session', messages: [{ role: 'user', content: '修改自己的测试文件' }] }, signal)
      const tools = await buildMainGatewayTools({ toolSurface: 'complete', toolRegistry: createCanonicalToolRegistry(), context: { cardId: 'alice', turnId: 'edit-turn', sessionId: 'session' }, executionCapabilityChannels: [], buildExecutionRuntimeContext: async () => ({}), executeTaskThread: async () => null, getSensorySnapshot: () => ({ running: false, stale: true, capture: null, sample: {} }), resolveTaskPlanningCapabilities: async () => [], scheduleReminderTask: async () => null, invokeMcpListTools: async () => ({ tools: [] }), invokeMcpCallTool: async (payload: { name: string, arguments: Record<string, unknown> }) => callLocalFilesystem({ toolName: payload.name.split('::')[1], arguments: payload.arguments, workspace: root, writePrecondition: payload.name.endsWith('write_file') ? await inspectFilesystemWritePrecondition(String(payload.arguments.path)) : undefined }) } as any)
      const parameters = { path, oldText: '旧内容', newText: '新内容' }
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'edit-turn', actionId: 'edit', capabilityId: 'tool.filesystem_edit_file', parameters }, signal)
      const result = await tools.find(tool => tool.function.name === 'filesystem_edit_file')!.execute(parameters, { messages: [], toolCallId: 'edit' })
      expect(result).toMatchObject({ ok: true, finalStatus: 'completed', writeApplied: true })
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
      expect(await readFile(path, 'utf8')).toBe('新内容')
      expect((await db.readLifeState()).obligations).toMatchObject([{ status: 'fulfilled', verification: { verdict: 'satisfied', independent: true } }])
      const previewParameters = { path, changes: [{ oldText: '新内容', newText: '预览内容' }], dryRun: true }
      const previewAction = await life.beforeAction({ cardId: 'alice', turnId: 'edit-turn', actionId: 'preview', capabilityId: 'tool.filesystem_patch_file', parameters: previewParameters }, signal)
      const preview = await tools.find(tool => tool.function.name === 'filesystem_patch_file')!.execute(previewParameters, { messages: [], toolCallId: 'preview' })
      expect(preview).toMatchObject({ status: 'completed', dryRun: true, writeApplied: false })
      await life.afterAction({ cardId: 'alice', id: previewAction.id, outcome: 'success', output: preview, interrupted: false })
      expect(await readFile(path, 'utf8')).toBe('新内容')
      expect((await db.readLifeState()).obligations).toHaveLength(1)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('independently verifies actual bytes and survives a database restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-file-goal-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'proof.txt')
      const content = '雨声陪伴'
      const hash = createHash('sha256').update(content).digest('hex')
      const runtime = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      await runtime.admit({ cardId: 'alice', turnId: 'turn', conversationId: 'session', messages: [{ role: 'user', content: '创建指定文件，并核对内容' }] }, signal)
      const action = await runtime.beforeAction({ cardId: 'alice', turnId: 'turn', actionId: 'write', capabilityId: 'tool.filesystem_write_file', parameters: { path, content } }, signal)
      await writeFile(path, content)
      await runtime.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: { status: 'completed', operation: 'write_file', path, contentHash: hash, byteLength: Buffer.byteLength(content), ok: true, finalStatus: 'completed', verifiedPath: path }, interrupted: false })
      const view = await db.readLifeState()
      expect(view.obligations).toHaveLength(1)
      expect(view.obligations[0]).toMatchObject({ sourceTurnId: 'turn', status: 'fulfilled', proof: { path, contentHash: hash }, verification: { verdict: 'satisfied', independent: true } })
      expect(completedLifeExecutionStep(view.effects.find(effect => effect.id === action.id)!)).toBe(true)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await db.readLifeState()).obligations[0].status).toBe('fulfilled')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('does not certify wrong bytes, cancellation or a proposed adapter action', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-file-goal-failure-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'proof.txt')
      const content = 'expected'
      const hash = createHash('sha256').update(content).digest('hex')
      const runtime = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      const signal = new AbortController().signal
      await runtime.admit({ cardId: 'alice', turnId: 'turn', conversationId: 'session', messages: [{ role: 'user', content: 'write' }] }, signal)
      const action = await runtime.beforeAction({ cardId: 'alice', turnId: 'turn', actionId: 'wrong', capabilityId: 'tool.filesystem_write_file', parameters: { path, content } }, signal)
      await writeFile(path, 'wrong bytes')
      await runtime.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: { path, contentHash: hash, ok: true, finalStatus: 'completed', verifiedPath: path }, interrupted: false })
      expect((await db.readLifeState()).obligations[0]).toMatchObject({ status: 'blocked', verification: { verdict: 'not-satisfied' } })
      const cancelled = await runtime.beforeAction({ cardId: 'alice', turnId: 'turn', actionId: 'cancelled', capabilityId: 'tool.filesystem_write_file', parameters: { path, content } }, signal)
      await runtime.afterAction({ cardId: 'alice', id: cancelled.id, outcome: 'success', output: { path, contentHash: hash, ok: true, finalStatus: 'completed', verifiedPath: path }, interrupted: true })
      expect((await db.readLifeState()).obligations).toHaveLength(1)
      expect(completedLifeExecutionStep((await db.readLifeState()).effects.find(effect => effect.id === cancelled.id)!)).toBe(false)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
