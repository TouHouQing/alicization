import type { LifeExpressionReceipt } from '../../../shared/life-contracts'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeTurnRuntime } from './life-turn-runtime'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})

async function open() {
  const root = await mkdtemp(join(tmpdir(), 'alicization-life-state-'))
  roots.push(root)
  return { root, db: await setupAlicizationDb(root, { cardId: 'alice' }) }
}

describe('durable life state', () => {
  it('keeps idempotence beyond the view window, stores the current input durably, and keeps raw media out of life views', async () => {
    const { db } = await open()
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => 100 })
      const signal = new AbortController().signal
      const turn = { cardId: 'alice', turnId: 'old-turn', conversationId: 'session', messages: [{ role: 'assistant', content: 'private history' }, { role: 'user', content: [{ type: 'text', text: 'hello' }, { type: 'image_url', image_url: { url: 'data:image/png;base64,sensitive-media' } }] }] }
      await life.admit(turn, signal)
      expect(await db.getLifeUserInput('user:old-turn')).toEqual(turn.messages[1])
      expect(await db.hasPublishedLifeTurn('alice', turn.turnId)).toBe(false)
      expect(await db.listConversationTurnsBySession('session')).toMatchObject([{ turnId: 'old-turn', userText: 'hello', assistantText: null }])
      await db.appendConversationTurn({ sessionId: 'session', turnId: turn.turnId, assistantText: '收到' })
      expect(await db.listConversationTurnsBySession('session')).toMatchObject([{ userText: 'hello', assistantText: '收到' }])
      await life.beforeAction({ cardId: 'alice', turnId: 'old-turn', actionId: 'write', capabilityId: 'note', parameters: { target: 'note' } }, signal)
      await life.afterAction({ cardId: 'alice', id: 'action:old-turn:write', outcome: 'completed', output: { proof: 'receipt' }, interrupted: false })
      await life.settle({ cardId: 'alice', turnId: turn.turnId, status: 'completed' })
      for (let batch = 0; batch < 8; batch += 1) {
        await db.commitLifeState({ cardId: 'alice', operationKey: `history-window:${batch}`, changes: [], mutations: Array.from({ length: 15 }, (_, item) => {
          const index = batch * 15 + item
          return [
            { type: 'ingress-accept' as const, ingress: { id: `recent:${index}`, kind: 'system' as const, source: 'window-test', sourceKey: String(index), occurredAt: 200 + index, payload: {} } },
            { type: 'ingress-settle' as const, id: `recent:${index}`, status: 'settled' as const },
            { type: 'effect-prepare' as const, effect: { id: `recent-effect:${index}`, operationKey: `recent-effect:${index}`, kind: 'execute' as const, turnId: null, actionId: null, generation: 0, payload: {} } },
            { type: 'effect-transition' as const, id: `recent-effect:${index}`, expected: 'prepared' as const, status: 'cancelled' as const },
          ]
        }).flat() })
      }
      expect((await db.readLifeState()).ingress.some(item => item.id === 'user:old-turn')).toBe(false)
      expect((await db.readLifeState()).effects.some(item => item.id === 'action:old-turn:write')).toBe(false)
      const revision = (await db.readLifeState()).revision
      await life.admit({ ...turn, messages: [{ role: 'assistant', content: 'history compacted' }, turn.messages[1]] }, signal)
      expect((await db.readLifeState()).revision).toBe(revision)
      expect(await life.beforeAction({ cardId: 'alice', turnId: 'old-turn', actionId: 'write', capabilityId: 'note', parameters: { target: 'note' } }, signal)).toMatchObject({ cached: { outcome: 'completed' } })
      await expect(life.admit({ ...turn, messages: [{ role: 'user', content: 'changed' }] }, signal)).rejects.toThrow('different input')
      await expect(life.beforeAction({ cardId: 'alice', turnId: 'old-turn', actionId: 'another-write', capabilityId: 'note', parameters: { target: 'another-note' } }, signal)).rejects.toThrow('no longer active')
      expect(JSON.stringify((await db.getLifeIngress('user:old-turn'))?.payload)).not.toMatch(/private history|sensitive-media|messages/)
    }
    finally { await db.close() }
  })

  it('rejects an obsolete reminder publication and cannot resurrect cancellation through an old retry', async () => {
    const { db } = await open()
    try {
      await db.insertScheduledTask({ taskId: 'cancel-during-generation', triggerAt: 100, message: '约定提醒' })
      const [attempt] = await db.claimDueScheduledTasks(100, 1)
      const responsibility = (await db.readLifeState()).obligations[0]
      await db.commitLifeState({ cardId: 'alice', operationKey: 'cancel-generation', changes: [], mutations: [{ type: 'obligation-update', id: responsibility.id, expectedGeneration: responsibility.generation, expectedRevision: responsibility.revision, status: 'cancelled' }] })
      await expect(db.appendConversationTurn({ sessionId: 'session', turnId: 'stale-reminder', assistantText: '不应发布', reminder: { taskId: attempt.taskId, generation: attempt.obligationGeneration } })).rejects.toThrow('superseded')
      expect(await db.hasPublishedLifeTurn('alice', 'stale-reminder')).toBe(false)
      await db.requeueScheduledTask(attempt.taskId, 'old-retry', 200, { expectedGeneration: attempt.obligationGeneration })
      expect(await db.listPendingScheduledTasks()).toHaveLength(0)
      expect((await db.readLifeState()).obligations[0]).toMatchObject({ status: 'cancelled', generation: 2 })
      await db.clearConversationData()
      expect((await db.readLifeState()).obligations).toHaveLength(0)
      expect(JSON.parse((await db.readLifeState()).values['life:memory-head']).retainedSoulIdentity).toBe(true)
    }
    finally {
      await db.close()
    }
  })
  it('admits distinct equal-text turns and prevents redispatch after restart uncertainty', async () => {
    const { root, db } = await open()
    const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, read: db.readLifeState, now: () => 100 })
    const signal = new AbortController().signal
    const turn = { cardId: 'alice', turnId: 'one', conversationId: 'session', messages: [{ role: 'user', content: 'hello' }] }
    try {
      await life.admit(turn, signal)
      await life.admit(turn, signal)
      await life.admit({ ...turn, turnId: 'two' }, signal)
      expect((await db.readLifeState()).ingress).toHaveLength(2)
      const action = { cardId: 'alice', turnId: 'one', actionId: 'write', capabilityId: 'local-file', parameters: { path: 'note.txt' } }
      await life.beforeAction(action, signal)
      await expect(life.beforeAction(action, signal)).rejects.toThrow('verification')
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const life = createLifeTurnRuntime({ getIngress: restarted.getLifeIngress, getEffect: restarted.getLifeEffect, commit: restarted.commitLifeState, read: restarted.readLifeState, now: () => 200 })
      await expect(life.beforeAction({ cardId: 'alice', turnId: 'one', actionId: 'write', capabilityId: 'local-file', parameters: { path: 'note.txt' } }, signal)).rejects.toThrow('verification')
      expect((await restarted.readLifeState()).effects[0].status).toBe('dispatched')
    }
    finally { await restarted.close() }
  })

  it('separates reminder generation from proof and fences an earlier schedule generation', async () => {
    const { db } = await open()
    try {
      await db.insertScheduledTask({ taskId: 'appointment', triggerAt: 100, message: 'remember tea' })
      const before = (await db.readLifeState()).obligations[0]
      await db.claimDueScheduledTasks(100, 1)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'reschedule', changes: [], mutations: [{ type: 'obligation-update', id: before.id, expectedGeneration: 1, expectedRevision: before.revision, dueAt: 200, status: 'waiting' }] })
      await expect(db.completeScheduledTask('appointment', 'old-turn')).rejects.toThrow('rescheduled')
      const [claimed] = await db.claimDueScheduledTasks(200, 1)
      expect(claimed.obligationGeneration).toBe(2)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'new-generation', changes: [], mutations: [{ type: 'reminder-generated', taskId: 'appointment', turnId: 'new-turn', expectedGeneration: 2 }] })
      expect((await db.readLifeState()).obligations[0].status).toBe('verifying')
      const receipt: LifeExpressionReceipt = { cardId: 'alice', receiptId: 'shown', deliveryId: 'new-turn', turnId: 'new-turn', utteranceId: 'new-turn', segmentId: 'text', playbackEpoch: 'render-1', surfaceSessionId: 'surface', sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 220 }
      const request = { cardId: 'alice', operationKey: 'expression:shown', changes: [], mutations: [{ type: 'expression-record' as const, presentationVerified: true, receipt }] }
      await db.commitLifeState(request)
      expect((await db.readLifeState()).obligations[0].status).toBe('fulfilled')
      expect((await db.commitLifeState(request)).status).toBe('duplicate')
    }
    finally { await db.close() }
  })

  it('rolls domain operations back with owner failures and rejects forged audio completion', async () => {
    const { db } = await open()
    try {
      const receipt: LifeExpressionReceipt = { cardId: 'alice', receiptId: 'never-started', deliveryId: 'delivery', turnId: 'turn', utteranceId: 'utterance', segmentId: 'segment', playbackEpoch: 'epoch', surfaceSessionId: 'surface', sequence: 1, state: 'audio-ended', playedMs: 500, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 100 }
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'forged', changes: [{ owner: 'self', key: 'self', value: '{}' }], mutations: [{ type: 'expression-record', presentationVerified: true, receipt }] })).rejects.toThrow('no actual playback start')
      expect(await db.getMetaValue('self')).toBeUndefined()
      expect((await db.readLifeState()).revision).toBe(0)
    }
    finally { await db.close() }
  })
  it('atomically keeps owners and idempotent receipts across a real database restart', async () => {
    const { root, db } = await open()
    const request = { cardId: 'alice', operationKey: 'turn-1', expectedRevision: 0, changes: [
      { owner: 'self' as const, key: 'life-test-self', value: JSON.stringify({ name: 'Alice' }) },
      { owner: 'emotion' as const, key: 'life-test-emotion', value: JSON.stringify({ cause: 'turn-1', valence: 0.2 }) },
    ] }
    try {
      const receipt = await db.commitLifeState(request)
      expect(receipt.revision).toBe(1)
      expect((await db.commitLifeState(request)).status).toBe('duplicate')
      await expect(db.commitLifeState({ ...request, changes: [{ owner: 'self', key: 'life-test-self', value: '{}' }] })).rejects.toThrow('different content')
      await expect(db.commitLifeState({ ...request, operationKey: 'stale', changes: [{ owner: 'self', key: 'life-test-self', value: '{}' }] })).rejects.toThrow('stale')
      expect((await db.readLifeState()).owners).toHaveLength(2)
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      expect((await restarted.readLifeState()).revision).toBe(1)
      expect(JSON.parse((await restarted.getMetaValue('life-test-self'))!)).toEqual({ name: 'Alice' })
    }
    finally { await restarted.close() }
  })

  it('rolls all owner writes back when a later compare-and-set check fails', async () => {
    const { db } = await open()
    try {
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'failed', changes: [
        { owner: 'self', key: 'first', value: '{}' },
        { owner: 'emotion', key: 'second', value: '{}', expectedValue: 'missing-value' },
      ] })).rejects.toThrow('changed')
      expect(await db.getMetaValue('first')).toBeUndefined()
      expect((await db.readLifeState()).revision).toBe(0)
      await expect(db.commitLifeState({ cardId: 'foreign', operationKey: 'foreign', changes: [{ owner: 'self', key: 'first', value: '{}' }] })).rejects.toThrow('bound card')
    }
    finally { await db.close() }
  })
})
