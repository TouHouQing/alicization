import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { readLifeQuietBoundary, requestsQuietCompanionship } from './life-interaction-boundary'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('host-requested quiet companionship', () => {
  it.each([
    ['接下来我要忙一分钟，先别主动找我说话。你可以自己安静待着。', true],
    ['我在写文档，先不要打扰我。', true],
    ['Please stay quiet while I work.', true],
    ['Don\'t interrupt me for now.', true],
    ['如果我说先别主动找我，你会怎么样？', false],
    ['文档里写着“不要打扰我”，这句话什么意思？', false],
    ['陪我聊一会儿，不用给我建议。', false],
  ])('recognizes the actual host directive: %s', (content, expected) => {
    expect(requestsQuietCompanionship({ role: 'user', content })).toBe(expected)
  })

  it('holds ordinary publication in daytime across restart, permits its acknowledgment, and resumes on the next host turn', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-host-quiet-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const makeLife = () => createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    try {
      await db.commitLifeState({ cardId: 'alice', operationKey: 'no-night-protection', changes: [], mutations: [{ type: 'outreach-policy', policy: { maximumPerDay: 3, minimumIntervalMinutes: 15, quietStartHour: 22, quietEndHour: 8, quietEnabled: false, timezone: 'UTC' } }] })
      await makeLife().admit({ cardId: 'alice', turnId: 'busy', conversationId: 'session', messages: [{ role: 'user', content: '先别主动找我说话，等我回来。' }] }, signal)
      await db.insertScheduledTask({ taskId: 'explicit-reminder', triggerAt: Date.now() - 1, message: '明确约定的提醒' })
      const [reminder] = await db.claimDueScheduledTasks(Date.now(), 1)
      await db.appendConversationTurn({ cardId: 'alice', turnId: 'reminder:agreed', sessionId: 'session', assistantText: '明确约定的提醒', reminder: { taskId: reminder.taskId, generation: reminder.obligationGeneration } })
      expect(await db.hasPublishedLifeTurn('alice', 'reminder:agreed')).toBe(true)
      const before = await db.readLifeState()
      const boundary = readLifeQuietBoundary(before.values)!
      expect(boundary.release).toBe('next-host-turn')
      const text = '好，我会安静待着，等你回来。'
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const evidence = JSON.parse(user)
        expect(evidence.interactionBoundaries[0].active).toBe(true)
        expect(evidence.interactionBoundaries[0].binding.id).toMatch(/^local-review-binding:\d+$/u)
        return JSON.stringify({ claims: [{ kind: 'interaction-boundary', quote: text, binding: evidence.interactionBoundaries[0].binding, meaningMatchesBinding: true }] })
      } })
      const accepted = await review({ cardId: 'alice', turnId: 'quiet-ack', text, owners: before.owners, signal })
      expect(accepted.accepted).toBe(true)
      expect(await db.getLifeIngress(accepted.reviewId!)).toMatchObject({ payload: { claims: [{ binding: { kind: 'boundary', id: boundary.id, version: boundary.inputHash } }] } })
      const publication = { cardId: 'alice', sessionId: 'session', turnId: 'quiet-ack', assistantText: text, lifeReplyFence: { reviewId: accepted.reviewId!, owners: before.owners } }
      await db.appendConversationTurn(publication)
      const staleOwners = (await db.readLifeState()).owners
      const staleApproved = await review({ cardId: 'alice', turnId: 'stale-quiet-ack', text, owners: staleOwners, signal })
      const stalePublication = { ...publication, turnId: 'stale-quiet-ack', lifeReplyFence: { reviewId: staleApproved.reviewId!, owners: staleOwners } }
      await expect(db.appendConversationTurn({ cardId: 'alice', sessionId: 'session', turnId: 'subconscious:noisy', assistantText: '主动打断', outreach: { evidenceKey: 'new-event' } })).rejects.toThrow('host-quiet-boundary')
      expect(await db.hasPublishedLifeTurn('alice', 'subconscious:noisy')).toBe(false)
      expect((await db.readLifeState()).owners.find(owner => owner.owner === 'relationship')).toEqual(before.owners.find(owner => owner.owner === 'relationship'))
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect(readLifeQuietBoundary((await db.readLifeState()).values)).toEqual(boundary)
      await makeLife().admit({ cardId: 'alice', turnId: 'return', conversationId: 'new-session', messages: [{ role: 'user', content: '我忙完了，我们继续聊。' }] }, signal)
      expect(readLifeQuietBoundary((await db.readLifeState()).values)).toBeNull()
      await expect(db.appendConversationTurn(stalePublication)).rejects.toThrow('Interaction boundary changed')
      await db.appendConversationTurn({ cardId: 'alice', sessionId: 'new-session', turnId: 'subconscious:resumed', assistantText: '有新证据的交流', outreach: { evidenceKey: 'new-event' } })
      expect(await db.hasPublishedLifeTurn('alice', 'subconscious:resumed')).toBe(true)
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'forged-quiet', changes: [], mutations: [{ type: 'outreach-boundary', turnId: 'return', quiet: true }] })).rejects.toThrow('differs')
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
