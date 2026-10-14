import { createHash } from 'node:crypto'
import { access, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('task source fences before physical dispatch', () => {
  it('registers sources at task creation and prevents a withdrawn source from being revived by a new attempt', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-task-source-fence-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const evidence = [{ cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }]
      await db.upsertTaskThread({ id: 'owned-task', goal: '保存本地札记', kind: 'codebase-edit', status: 'planned', selectedChannel: 'cli', proposedChannel: 'cli', metadata: { sourceEvidence: evidence } })
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [fact.factId] })
      expect((await db.readLifeState()).obligations[0]).toMatchObject({ status: 'blocked', invalidationMode: 'forget' })
      await expect(db.upsertTaskThread({ id: 'owned-task', goal: '重新使用已撤销来源', kind: 'codebase-edit', status: 'running', attemptId: 'new-attempt', metadata: { sourceEvidence: evidence } })).rejects.toMatchObject({ code: 'TASK_SOURCE_INVALIDATED' })
      const content = 'A withdrawn plan must not create this file.'
      const name = `${createHash('sha256').update(content).digest('hex')}.md`
      const result = await dispatchTaskThread(db, { threadId: 'owned-task', workspaceRoot: root, ownedNoteRoot: root, cli: { command: 'alicization:owned-note', ownedNote: { name, content, contentHash: createHash('sha256').update(content).digest('hex') }, runtimeContext: { cardId: 'alice', turnId: 'request', generatedAt: Date.now(), sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } })
      expect(result).toMatchObject({ ok: false, finalStatus: 'blocked', errorCode: 'TASK_SOURCE_INVALIDATED', createdEventKinds: [] })
      await expect(access(join(root, name))).rejects.toMatchObject({ code: 'ENOENT' })
      expect((await db.getTaskThread('owned-task'))?.status).toBe('blocked')
      await expect(db.upsertTaskThread({ id: 'fresh-task', goal: '使用旧记忆', kind: 'codebase-edit', status: 'planned', metadata: { sourceEvidence: evidence } })).rejects.toThrow('withdrawn')
      expect(await db.getTaskThread('fresh-task')).toBeUndefined()
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
