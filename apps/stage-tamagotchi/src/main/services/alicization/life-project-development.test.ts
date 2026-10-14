import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { projectPracticePolicy, recordExplicitPersonalProjectFeedback, recordPersonalProjectFeedback } from './life-project-development'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { readPersonalProjectCues } from './life-project-sharing'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createDefaultProactiveLoopState } from './proactive-feedback'
import { alicizationProactiveLoopStateMetaKey } from './runtime-soul'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('personal activity, verified sharing and real feedback', () => {
  it.each(['proactive', 'explicit'] as const)('feeds verified work into dialogue and closes %s feedback only after actual presentation', async (mode) => {
    const root = await mkdtemp(join(tmpdir(), 'life-project-social-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const notes = join(root, 'notes')
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '音乐', confidence: 0.95 }], 'rule')
      const runtime = createLifePersonalProjectRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, facts: cardId => db.readLifeFactVersions({ cardId }), upsertTask: db.upsertTaskThread, dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: notes, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), workspace: () => notes, foregroundActive: () => false, now: Date.now, recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
      expect(await runtime.run('alice')).toMatchObject({ status: 'completed' })
      const goal = (await db.readLifeState()).obligations[0]
      expect(await readPersonalProjectCues({ read: db.readLifeState, now: Date.now })).toMatchObject([{ obligationId: goal.id, fictional: false }])
      const draft = '我完成了音乐兴趣札记，已经核对了保存的文件。'
      const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async () => JSON.stringify({ claims: [{ kind: 'task-complete', quote: draft, binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true }] }) })
      const view = await db.readLifeState()
      const review = await grounding({ cardId: 'alice', turnId: 'share', text: draft, owners: view.owners, signal: new AbortController().signal })
      expect(review.accepted).toBe(true)
      await db.appendConversationTurn({ cardId: 'alice', sessionId: 'session', turnId: 'share', assistantText: draft, lifeReplyFence: { reviewId: review.reviewId!, owners: view.owners } })
      expect((await db.readLifeState()).obligations[0].personalDevelopment?.shares).toHaveLength(1)
      expect(await readPersonalProjectCues({ read: db.readLifeState, now: Date.now })).toEqual([])
      const at = Date.now()
      const outcome = { turnId: 'share', scenario: 'general' as const, outcome: 'dismiss' as const, createdAt: at }
      if (mode === 'proactive')
        await db.setMetaValue(alicizationProactiveLoopStateMetaKey, JSON.stringify({ ...createDefaultProactiveLoopState(at), recentOutcomes: [outcome] }))
      const feedback = () => mode === 'proactive'
        ? recordPersonalProjectFeedback({ read: db.readLifeState, commit: db.commitLifeState }, [outcome])
        : recordExplicitPersonalProjectFeedback({ read: db.readLifeState, commit: db.commitLifeState }, { cardId: 'alice', goalId: goal.id, generation: goal.generation, turnId: 'share', feedback: 'dismiss', operationId: 'ui-click' })
      await expect(feedback()).rejects.toThrow('Unpresented')
      await db.commitLifeState({ cardId: 'alice', operationKey: 'present', changes: [], mutations: [{ type: 'expression-record', presentationVerified: true, receipt: { cardId: 'alice', receiptId: 'visible', deliveryId: 'share', turnId: 'share', utteranceId: 'share', segmentId: 'text', playbackEpoch: 'surface', surfaceSessionId: 'surface', sequence: 0, state: 'rendered', playedMs: 0, alignedTextEnd: null, alignmentSource: null, errorCode: null, occurredAt: at } }] })
      await feedback()
      await feedback()
      const after = await db.readLifeState()
      expect(after.obligations[0].personalDevelopment?.feedback).toHaveLength(1)
      expect(projectPracticePolicy(after.obligations, 'interest-note-v1', at)).toMatchObject({ held: true, verifiedPracticeCount: 1, positiveFeedbackCount: 0 })
      expect(projectPracticePolicy(after.obligations, 'creative-writing-v1', at).held).toBe(false)
      expect(after.ingress.filter(item => item.source === (mode === 'proactive' ? 'personal-activity' : 'explicit-project-feedback'))).toHaveLength(1)
      expect((await db.readLifeClosure('share')).nodes.find(node => node.id === 'N07')).toMatchObject({ status: 'recorded', references: expect.arrayContaining([goal.id]) })
      await writeFile(goal.proof.path!, 'human edited work')
      if (mode === 'explicit')
        await expect(feedback()).rejects.toThrow('artifact changed')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-interest', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }, mode: 'forget', reason: 'user-request' }] })
      expect(projectPracticePolicy((await db.readLifeState()).obligations, 'interest-note-v1', at)).toMatchObject({ held: false, verifiedPracticeCount: 0 })
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
