import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { pendingLifePersonalProposal, presentCreativeChoice, readLifePersonalProposals, withdrawLifePersonalProposal } from './life-personal-proposals'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('sourced present wishes become real personal actions', () => {
  it('persists a choice without inventing a preference and independently proves its artifact after restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-personal-proposal-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const workspace = join(root, 'notes')
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'choice', conversationId: 'test', messages: [{ role: 'user', content: '你自己想做点什么？' }] }, new AbortController().signal)
      await life.settle({ cardId: 'alice', turnId: 'choice', status: 'completed', committedText: '从一个迷路的小灯笼开始吧。', personalIntent: { scope: 'present-choice', activity: 'creative-writing-v1', topic: '迷路的小灯笼找到家的故事' } })
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toHaveLength(0)
      expect(readLifePersonalProposals(await db.readLifeState())).toHaveLength(1)
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const project = createLifePersonalProjectRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, workspace: () => workspace, foregroundActive: () => false, now: Date.now, compose: async ({ topic }) => ({ title: topic, body: '小灯笼停在山坡上，看见远处窗户里的一点暖光。它沿着细细的小路走过去，发现等着它的不是答案，而是一扇一直没有关上的门。这是一段虚构的小故事。' }), dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), recordExperience: async () => {} })
      expect(await project.run('alice')).toMatchObject({ status: 'completed' })
      const goal = (await db.readLifeState()).obligations.find(item => item.kind === 'personal-project')!
      expect(goal.verification).toMatchObject({ independent: true, verdict: 'satisfied' })
      expect(await readFile(goal.proof.path!, 'utf8')).toContain('小灯笼停在山坡上')
      expect(await project.run('alice')).toMatchObject({ status: 'held' })
      const choice = readLifePersonalProposals(await db.readLifeState())[0]
      await withdrawLifePersonalProposal({ read: db.readLifeState, commit: db.commitLifeState }, { cardId: 'alice', proposalId: choice.id, expectedReplyHash: choice.sourceReplyHash })
      const withdrawn = await db.readLifeState()
      expect(pendingLifePersonalProposal(withdrawn, Date.now())).toBeNull()
      expect(withdrawn.obligations.find(item => item.id === goal.id)?.invalidatedBy?.id).toBe(choice.id)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('excludes quoted host wishes, executable commands and future promises', () => {
    for (const text of ['你说“我想写故事”。', '我想写一个脚本删除文件。', '我想写一首诗，明天一定给你。', '如果有空我想写一个童话。'])
      expect(presentCreativeChoice(text)).toBeNull()
  })
})
