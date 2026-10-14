import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeInputResume } from './life-input-resume'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('reviewed held input continuation', () => {
  async function fixture(task: (db: Awaited<ReturnType<typeof setupAlicizationDb>>, life: ReturnType<typeof createLifeTurnRuntime>) => Promise<void>) {
    const root = await mkdtemp(join(tmpdir(), 'life-held-resume-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    try { await task(db, life) }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  }

  it('atomically hands the full original message to one new turn despite duplicate clicks', async () => fixture(async (db, life) => {
    const message = { role: 'user', content: [{ type: 'text', text: '完整请求'.repeat(1200) }, { type: 'image_url', image_url: { url: 'data:image/png;base64,cWE=' } }] }
    await life.admit({ cardId: 'alice', turnId: 'old', conversationId: 'session', messages: [message] }, new AbortController().signal)
    await life.recover('alice')
    const parent = (await db.getLifeIngress('user:old'))!
    const start = vi.fn(async (input) => {
      await life.admit({ ...input, conversationId: input.sessionId }, new AbortController().signal)
      return { accepted: true, turnId: input.turnId }
    })
    const resume = createLifeInputResume({ getIngress: db.getLifeIngress, getUserInput: db.getLifeUserInput, commit: db.commitLifeState, session: async () => 'session:primary:alice', binding: () => ({ providerId: 'fixture', model: 'fixture-model', providerConfig: {} }), start })
    const input = { cardId: 'alice', ingressId: parent.id, expectedPayloadHash: parent.payloadHash }
    const results = await Promise.all([resume(input), resume(input)])
    expect(results[0].turnId).toBe(results[1].turnId)
    expect(start).toHaveBeenCalledTimes(1)
    expect(start.mock.calls[0][0].messages).toEqual([message])
    expect(start.mock.calls[0][0].sessionId).toBe('session:primary:alice')
    expect((await db.getLifeIngress(parent.id))?.status).toBe('failed')
    expect(await db.getLifeUserInput(parent.id)).toEqual(message)
    expect((await db.getLifeIngress(`user:${results[0].turnId}`))?.payload.recoveryParent).toBe(parent.id)
    expect((await db.getLifeIngress(`user:${results[0].turnId}`))?.payload).toMatchObject({ conversationId: 'session:primary:alice', originalConversationId: 'session' })
    await life.recover('alice')
    await expect(resume(input)).rejects.toThrow('pending list')
    expect(start).toHaveBeenCalledTimes(1)
  }))

  it('keeps a rejected new request held and refuses replay when an old action may have happened', async () => fixture(async (db, life) => {
    const signal = new AbortController().signal
    await life.admit({ cardId: 'alice', turnId: 'no-action', conversationId: 's', messages: [{ role: 'user', content: '继续聊聊' }] }, signal)
    await life.recover('alice')
    const parent = (await db.getLifeIngress('user:no-action'))!
    const start = vi.fn(async input => ({ accepted: false, turnId: input.turnId, reason: 'provider unavailable' }))
    const resume = createLifeInputResume({ getIngress: db.getLifeIngress, getUserInput: db.getLifeUserInput, commit: db.commitLifeState, session: async () => 'session:primary:alice', binding: () => ({ providerId: 'fixture', model: 'fixture', providerConfig: {} }), start })
    await expect(resume({ cardId: 'alice', ingressId: parent.id, expectedPayloadHash: 'wrong' })).rejects.toThrow('changed')
    expect(start).not.toHaveBeenCalled()
    await expect(resume({ cardId: 'alice', ingressId: parent.id, expectedPayloadHash: parent.payloadHash })).rejects.toThrow('provider unavailable')
    expect((await db.readLifeState()).ingress.filter(item => item.kind === 'user-turn' && item.status === 'held')).toHaveLength(1)
    await life.admit({ cardId: 'alice', turnId: 'mutated', conversationId: 's', messages: [{ role: 'user', content: '保存文件' }] }, signal)
    await life.beforeAction({ cardId: 'alice', turnId: 'mutated', actionId: 'write', capabilityId: 'file', parameters: {} }, signal)
    await life.recover('alice')
    const mutated = (await db.getLifeIngress('user:mutated'))!
    await expect(resume({ cardId: 'alice', ingressId: mutated.id, expectedPayloadHash: mutated.payloadHash })).rejects.toThrow('independent reconciliation')
    expect(start).toHaveBeenCalledTimes(1)
    expect((await db.getLifeIngress(mutated.id))?.status).toBe('held')
  }))
})
