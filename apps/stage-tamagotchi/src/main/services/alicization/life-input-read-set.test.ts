import { createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifeInputReadSet, lifeInputReadAssertion } from './life-input-read-set'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('current user input through semantic review and publication', () => {
  it('rejects a source held during review or after review without archiving or certifying the late text', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-input-read-set-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    try {
      for (const timing of ['during-review', 'after-review']) {
        const turnId = `pause-${timing}`
        const text = '我在这里陪你。'
        await life.admit({ cardId: 'alice', turnId, conversationId: 'qa', messages: [{ role: 'user', content: '先陪我待一会。' }] }, signal)
        const owners = (await db.readLifeState()).owners
        const hold = () => db.commitLifeState({ cardId: 'alice', operationKey: `hold:${turnId}`, changes: [], mutations: [{ type: 'ingress-settle', id: `user:${turnId}`, status: 'held' }] })
        const generate = vi.fn(async () => {
          if (timing === 'during-review')
            await hold()
          return JSON.stringify({ claims: [] })
        })
        const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate })
        if (timing === 'during-review') {
          await expect(grounding({ cardId: 'alice', turnId, text, owners, signal })).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
          expect((await db.readLifeState()).ingress.filter(item => item.source === 'reply-grounding' && item.payload.turnId === turnId)).toEqual([])
        }
        else {
          const review = await grounding({ cardId: 'alice', turnId, text, owners, signal })
          expect(review.accepted).toBe(true)
          await hold()
          await expect(db.appendConversationTurn({ cardId: 'alice', turnId, sessionId: 'qa', assistantText: text, lifeReplyFence: { reviewId: review.reviewId!, owners } })).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
        }
        const publicationId = `publication:${createHash('sha256').update(JSON.stringify({ cardId: 'alice', turnId })).digest('hex')}`
        expect(await db.getLifeIngress(publicationId)).toBeNull()
        const calls = generate.mock.calls.length
        await expect(grounding({ cardId: 'alice', turnId, text, owners: (await db.readLifeState()).owners, signal })).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
        expect(generate).toHaveBeenCalledTimes(calls)
      }
    }
    finally {
      await db.close()
      expect(resolve(root).startsWith(`${resolve(tmpdir())}${sep}life-input-read-set-`)).toBe(true)
      await rm(root, { recursive: true, force: true })
    }
  })

  it('allows ordinary processing and unrelated ingress, fences an absent input appearing, and keeps publication idempotency under the live source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-input-fences-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    try {
      const absent = createLifeInputReadSet(await db.readLifeState(), 'appeared')
      await life.admit({ cardId: 'alice', turnId: 'appeared', conversationId: 'qa', messages: [{ role: 'user', content: '现在有新的请求。' }] }, signal)
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'stale-absence', changes: [], mutations: [lifeInputReadAssertion(absent)] })).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
      const owners = (await db.readLifeState()).owners
      const text = '嗯，我在。'
      const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => {
        await db.commitLifeState({ cardId: 'alice', operationKey: 'normal-processing-and-unrelated-event', changes: [], mutations: [
          { type: 'ingress-settle', id: 'user:appeared', status: 'processing' },
          { type: 'ingress-accept', ingress: { id: 'unrelated-native-status', source: 'native-status', sourceKey: 'unrelated', kind: 'tool-result', occurredAt: Date.now(), payload: { state: 'cancelled' } } },
        ] })
        return JSON.stringify({ claims: [] })
      } })
      const review = await grounding({ cardId: 'alice', turnId: 'appeared', text, owners, signal })
      expect(review.accepted).toBe(true)
      const publication = { cardId: 'alice', turnId: 'appeared', sessionId: 'qa', assistantText: text, createdAt: Date.now(), lifeReplyFence: { reviewId: review.reviewId!, owners } }
      await db.appendConversationTurn(publication)
      await db.appendConversationTurn(publication)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'held-after-first-publication', changes: [], mutations: [{ type: 'ingress-settle', id: 'user:appeared', status: 'held' }] })
      await expect(db.appendConversationTurn(publication)).rejects.toMatchObject({ code: 'LIFE_STATE_CONFLICT' })
    }
    finally {
      await db.close()
      expect(resolve(root).startsWith(`${resolve(tmpdir())}${sep}life-input-fences-`)).toBe(true)
      await rm(root, { recursive: true, force: true })
    }
  })
})
