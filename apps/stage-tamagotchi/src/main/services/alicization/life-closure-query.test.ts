import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('read-only life closure evidence', () => {
  it('does not certify completion of an utterance from a single completed audio segment', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-closure-partial-audio-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.appendConversationTurn({ cardId: 'alice', sessionId: 's', turnId: 'spoken', assistantText: '这段话还没有全部播放。' })
      const receipt = { cardId: 'alice', deliveryId: 'spoken', turnId: 'spoken', utteranceId: 'spoken', segmentId: 'first', playbackEpoch: 'epoch', surfaceSessionId: 'surface', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 100 }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'start', changes: [], mutations: [{ type: 'expression-record', presentationVerified: true, receipt: { ...receipt, receiptId: 'start', sequence: 0, state: 'audio-started' } }] })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'part-ended', changes: [], mutations: [{ type: 'expression-record', presentationVerified: true, receipt: { ...receipt, receiptId: 'part-end', sequence: 1, state: 'audio-ended', playedMs: 80 } }] })
      expect((await db.readLifeClosure('spoken')).nodes.find(node => node.id === 'N13')?.status).toBe('unverified')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('distinguishes admission, publication and actual delivery, retains older turns, and does not expose source text', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-closure-loop-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: () => 100 })
      await life.admit({ cardId: 'alice', turnId: 'turn', conversationId: 'session', messages: [{ role: 'user', content: '私密原始内容' }] }, signal)
      await life.recordContextUse({ cardId: 'alice', turnId: 'turn', requestHash: 'provider-request', owners: (await db.readLifeState()).owners, evidenceIds: [] }, signal)
      await db.insertScheduledTask({ taskId: 'tea', triggerAt: 100, message: '喝茶' })
      await db.claimDueScheduledTasks(100, 1)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'generate', changes: [], mutations: [{ type: 'reminder-generated', taskId: 'tea', expectedGeneration: 1, turnId: 'turn' }] })
      const owners = (await db.readLifeState()).owners
      const review = await createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => 101, generate: async () => '{"claims":[]}' })({ cardId: 'alice', turnId: 'turn', text: '喝茶时间到了。', owners, signal })
      await db.appendConversationTurn({ sessionId: 'session', turnId: 'turn', assistantText: '喝茶时间到了。', lifeReplyFence: { reviewId: review.reviewId!, owners } })
      const receipt = { cardId: 'alice', receiptId: 'hidden', deliveryId: 'turn', turnId: 'turn', utteranceId: 'turn', segmentId: 'text', playbackEpoch: 'surface', surfaceSessionId: 'surface', sequence: 0, state: 'rendered' as const, playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: 102 }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'hidden', changes: [], mutations: [{ type: 'expression-record', receipt, presentationVerified: false }] })
      const pending = await db.readLifeClosure('turn')
      expect(pending.nodes).toHaveLength(18)
      expect(pending.nodes.find(node => node.id === 'N13')?.status).toBe('unverified')
      expect(pending.nodes.find(node => node.id === 'N11')?.status).toBe('pending')
      expect(pending.nodes.find(node => node.id === 'N08')?.status).toBe('recorded')
      expect(JSON.stringify(pending)).not.toContain('私密原始内容')
      expect(await db.readLifeClosure('turn')).toEqual(pending)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'visible', changes: [], mutations: [{ type: 'expression-record', receipt: { ...receipt, receiptId: 'visible', sequence: 1 }, presentationVerified: true }] })
      await life.settle({ cardId: 'alice', turnId: 'turn', status: 'completed' })
      for (let batch = 0; batch < 4; batch += 1) {
        await db.commitLifeState({ cardId: 'alice', operationKey: `later:${batch}`, changes: [], mutations: Array.from({ length: 30 }, (_, offset) => [
          { type: 'ingress-accept' as const, ingress: { id: `later:${batch}:${offset}`, source: 'unrelated', sourceKey: `${batch}:${offset}`, kind: 'system' as const, occurredAt: 1000, payload: {} } },
          { type: 'ingress-settle' as const, id: `later:${batch}:${offset}`, status: 'settled' as const },
        ]).flat() })
      }
      expect((await db.readLifeState()).ingress.some(item => item.id === 'user:turn')).toBe(false)
      const complete = await db.readLifeClosure('turn')
      expect(complete.nodes.find(node => node.id === 'N13')?.status).toBe('recorded')
      expect(complete.nodes.find(node => node.id === 'N11')?.status).toBe('recorded')
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(await db.readLifeClosure('turn')).toEqual(complete)
      expect((await db.readLifeClosure('unknown-turn')).nodes.find(node => node.id === 'N00')?.status).toBe('not-invoked')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
