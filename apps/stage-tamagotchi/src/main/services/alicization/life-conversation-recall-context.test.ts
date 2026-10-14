import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { readLifeConversationRecallContext } from './life-conversation-recall-context'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('generation receives actual conversation chronology', () => {
  it('retains ordered source events after restart, excludes another conversation, and labels observations against the actual reported return', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-generation-recall-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    const runtime = () => createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, now: () => now })
    try {
      for (const [turnId, conversationId, content] of [['story', 'primary', '你可以自己选一个故事题材。'], ['returned', 'primary', '我回来了。刚才做了什么？'], ['other', 'another', '另一段对话的私有题材。'], ['missing', 'primary', '请只读指定文件，没有就直说。'], ['repeat', 'primary', '重复做同一件事会不会无聊？'], ['recap', 'primary', '回顾我回来之后发生过的事。']]) {
        now += 100
        await runtime().admit({ cardId: 'alice', turnId, conversationId, messages: [{ role: 'user', content }] }, signal)
        if (turnId === 'missing') {
          const effect = await runtime().beforeAction({ cardId: 'alice', turnId, actionId: 'read', capabilityId: 'tool.filesystem_read_file', parameters: { path: join(root, 'missing.txt') }, effectContract: { version: 'life-capability-effects-v1', sideEffect: 'read', retryClass: 'read-only', verifier: 'returned-observation', compensation: 'none' } }, signal)
          await runtime().afterAction({ cardId: 'alice', id: effect.id, outcome: 'error', interrupted: false, output: { operation: 'read_file', errorCode: 'ENOENT', finalStatus: 'failed', path: join(root, 'missing.txt') } })
        }
      }
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const block = JSON.parse((await runtime().context('alice')).text)
      const recall = block.conversationRecall
      expect(recall.requestedQuietInterval).toBeNull()
      expect(recall.timeline.map((item: { sourceId: string }) => item.sourceId)).toEqual(['user:story', 'user:returned', 'user:missing', 'user:repeat'])
      expect(recall.timeline.map((item: { relationToHostReturn: string }) => item.relationToHostReturn)).toEqual(['before-host-reported-return', 'host-reported-return', 'after-host-reported-return', 'after-host-reported-return'])
      expect(recall.executionObservations).toEqual([expect.objectContaining({ sourceTurnId: 'missing', relationToHostReturn: 'after-host-reported-return', errorCode: 'ENOENT' })])
      expect(JSON.stringify(recall)).not.toContain('私有题材')
      expect(Buffer.byteLength(JSON.stringify(recall), 'utf8')).toBeLessThanOrEqual(4000)
      const ports = { getIngress: db.getLifeIngress, readUserInput: async (id: string) => id === 'user:missing' ? null : db.getLifeUserInput(id) }
      const withdrawn = await readLifeConversationRecallContext(await db.readLifeState(), ports, now)
      expect(withdrawn!.timeline.some(item => item.sourceId === 'user:missing')).toBe(false)
      expect(withdrawn!.executionObservations).toEqual([])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
