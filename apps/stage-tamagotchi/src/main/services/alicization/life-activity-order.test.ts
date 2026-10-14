import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from './db'
import { lifeVerifiedActivityChronology } from './life-activity-order'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('actual completion ordering in self recall', () => {
  it('rejects an inverted first-completion claim despite valid individual proofs, while allowing plain lists and flashback presentation', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const root = await mkdtemp(join(tmpdir(), 'life-completion-order-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, now: Date.now })
      const write = async (turnId: string, at: number) => {
        vi.setSystemTime(at)
        await life.admit({ cardId: 'alice', turnId, conversationId: 'session', messages: [{ role: 'user', content: `Write ${turnId}.txt` }] }, signal)
        const parameters = { path: join(root, `${turnId}.txt`), content: turnId }
        const prepared = await life.beforeAction({ cardId: 'alice', turnId, actionId: turnId, capabilityId: 'tool.filesystem_write_file', parameters }, signal)
        const result = await callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal })
        await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'success', interrupted: false, output: { ...result.structuredContent, ok: result.ok, operation: 'write_file', finalStatus: 'completed', verifiedPath: parameters.path } })
        return (await db.readLifeState()).obligations.find(goal => goal.proof.path === parameters.path)!
      }
      const earlier = await write('alpha', 100)
      const later = await write('beta', 200)
      vi.setSystemTime(300)
      await life.admit({ cardId: 'alice', turnId: 'recall', conversationId: 'session', messages: [{ role: 'user', content: 'Which local activities did you actually complete before restarting?' }] }, signal)
      expect(lifeVerifiedActivityChronology(await db.readLifeState()).map(item => item.verifiedAt), JSON.stringify({ earlier, later })).toEqual([100, 200])
      expect(JSON.parse((await life.context('alice')).text).actualActivityChronology.map((item: { id: string }) => item.id)).toEqual([earlier.id, later.id])
      let quotes = [{ quote: '我先完成了 beta.txt；', goal: later }, { quote: '还完成了 alpha.txt。', goal: earlier }]
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ conversationLinks: [], claims: quotes.map(({ quote, goal }) => ({ kind: 'task-complete', quote, binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true })) }) })
      const check = async (text = quotes.map(item => item.quote).join('')) => review({ cardId: 'alice', turnId: 'recall', text, owners: (await db.readLifeState()).owners, signal })
      const inversion = await check()
      expect(inversion, JSON.stringify(inversion)).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW', quote: '我先完成了 beta.txt；' }] })
      expect(JSON.parse(inversion.repairContext!).data.activityChronology.map((item: { verifiedAt: number }) => item.verifiedAt)).toEqual([100, 200])
      quotes = [{ quote: '我先完成了 alpha.txt；', goal: earlier }, { quote: '还完成了 beta.txt。', goal: later }]
      expect((await check()).accepted).toBe(true)
      quotes = [{ quote: '我完成了 beta.txt；', goal: later }, { quote: '也完成了 alpha.txt。', goal: earlier }]
      expect((await check()).accepted).toBe(true)
      expect((await check(`先说说最近的一件事：${quotes.map(item => item.quote).join('')}`)).accepted).toBe(true)
      quotes = [{ quote: '我完成了 beta.txt；', goal: later }, { quote: '随后完成了 alpha.txt。', goal: earlier }]
      expect((await check()).accepted).toBe(false)
      quotes = [{ quote: '我完成了 alpha.txt；', goal: earlier }, { quote: '随后完成了 beta.txt。', goal: later }]
      expect((await check()).accepted).toBe(true)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
      vi.useRealTimers()
    }
  })
})
