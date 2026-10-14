import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { lifeArtifactDescriptionQuotes, readLifePersonalArtifactContents } from './life-personal-artifact-content'
import { createLifePersonalProjectRuntime } from './life-personal-project-runtime'
import { createLifeProjectExperienceRecorder } from './life-project-experience-runtime'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'
import { dispatchTaskThread } from './task-thread-dispatcher'

describe('completed authored content rather than proposed plot', () => {
  it('uses independently verified actual bytes after restart, rejects mismatched plot, forged excerpts and incomplete review, and withdraws with its source', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-authored-content-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const workspace = join(root, 'notes')
    const signal = new AbortController().signal
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'interest', object: '雨夜车站', confidence: 0.95 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const project = createLifePersonalProjectRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, facts: (cardId, factIds) => db.readLifeFactVersions({ cardId, ...(factIds ? { factIds, history: true } : {}) }), upsertTask: db.upsertTaskThread, workspace: () => workspace, foregroundActive: () => false, now: Date.now, preferCreative: true, compose: async () => ({ title: '雨夜候车室', body: '这是一段虚构作品。雨夜的旧车站里，一个老人收好女人的旧车票。她希望等到不再惩罚自己时取回它。天亮时她带走一把伞，回头只看见安静的青苔。' }), dispatch: input => dispatchTaskThread(db, { ...input, ownedNoteRoot: workspace, cli: { ...input.cli, runtimeContext: { generatedAt: Date.now(), cardId: 'alice', turnId: input.threadId, sensory: { collectedAt: Date.now(), running: false, stale: true, ageMs: 0, foregroundWindow: null, capture: null } } } }), recordExperience: createLifeProjectExperienceRecorder({ read: db.readLifeState, commit: db.commitLifeState, readMeta: db.getMetaValue, appendEpisodes: db.appendEpisodicEvents }) })
      expect(await project.run('alice')).toMatchObject({ status: 'completed' })
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, readUserInput: db.getLifeUserInput, now: Date.now })
      const view = await db.readLifeState()
      const [content] = await readLifePersonalArtifactContents(view, db.getLifeEffect)
      expect(content).toBeDefined()
      expect(content.text).toBe(await readFile(view.obligations.find(goal => goal.id === content.binding.id)!.proof.path!, 'utf8'))
      expect(content.text).not.toContain('站员发现写着自己名字的信')
      expect(JSON.parse((await life.context('alice')).text).personalArtifactContents).toEqual([content])
      await life.admit({ cardId: 'alice', turnId: 'recall', conversationId: 'session', messages: [{ role: 'user', content: '你实际写成的故事讲了什么？' }] }, signal)
      let quote = '故事里有一个保管旧车票的老人。'
      let sourceExcerpt = '雨夜的旧车站里，一个老人收好女人的旧车票。'
      let matches = true
      let empty = false
      let invalidExcerpt: number | boolean | undefined
      let version: string | undefined
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, commit: db.commitLifeState, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user, responseFormat }) => {
        const evidence = JSON.parse(user)
        expect(evidence.personalArtifactContents[0].text).toBe(content.text)
        expect(evidence.artifactContentReviewRequired).toBe(true)
        expect(responseFormat.json_schema.schema.properties.artifactStatements.minItems).toBe(1)
        expect(responseFormat.json_schema.schema.properties.artifactStatements.items.properties.quote.enum).toEqual(lifeArtifactDescriptionQuotes(evidence.draft, view.obligations))
        const allowedExcerpts = responseFormat.json_schema.schema.properties.artifactStatements.items.properties.sourceExcerpt.enum
        expect(allowedExcerpts).toContain('雨夜的旧车站里，一个老人收好女人的旧车票。')
        expect(allowedExcerpts.filter(text => text).every(text => content.text.includes(text))).toBe(true)
        expect(allowedExcerpts.every(text => !/[\r\n\t]/u.test(text))).toBe(true)
        expect(allowedExcerpts).not.toContain('站员发现写着自己名字的信。')
        const binding = { ...evidence.personalArtifactContents[0].binding, ...(version ? { version } : {}) }
        return JSON.stringify({ claims: [], hostStatements: [], companionStatements: [], artifactStatements: empty ? [] : [{ quote, binding, sourceExcerpt: invalidExcerpt ?? sourceExcerpt, meaningMatchesText: matches }], conversationLinks: [] })
      } })
      const check = async (text = quote) => review({ cardId: 'alice', turnId: 'recall', text, owners: (await db.readLifeState()).owners, signal })
      const acceptedOwners = (await db.readLifeState()).owners
      const accepted = await check()
      expect(accepted.accepted).toBe(true)
      const mixedRecall = `我在想一些事情；${quote}另一个想法是换个题材写新故事；那只是当时说过的打算，并没有证据表明我后来实际写了。`
      expect(lifeArtifactDescriptionQuotes(mixedRecall, view.obligations)).toEqual([quote])
      expect((await check(mixedRecall)).accepted).toBe(true)
      quote = '故事里有一个站员，发现写着自己名字的信。'
      matches = false
      const mismatch = await check()
      expect(mismatch).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW' }] })
      expect(JSON.parse(mismatch.repairContext!).data.personalArtifactContents[0].text).toBe(content.text)
      matches = true
      sourceExcerpt = '站员发现写着自己名字的信。'
      expect((await check()).accepted).toBe(false)
      quote = '故事里有一个保管旧车票的老人。'
      sourceExcerpt = '雨夜的旧车站里，一个老人收好女人的旧车票。'
      const incomplete = `${quote}故事里还有一个站员找到自己的信。`
      expect(lifeArtifactDescriptionQuotes(incomplete, view.obligations)).toHaveLength(2)
      expect((await check(incomplete)).accepted).toBe(false)
      empty = true
      expect((await check()).accepted).toBe(false)
      empty = false
      version = 'wrong-version'
      expect((await check()).accepted).toBe(false)
      version = undefined
      invalidExcerpt = 32
      const malformedNumber = await check()
      expect(malformedNumber.accepted).toBe(false)
      const invalidAudit = await db.getLifeIngress(malformedNumber.reviewId!)
      expect(invalidAudit?.payload.reviewWireValidation).toMatchObject({ jsonParsed: true, issues: [{ path: ['artifactStatements', '0', 'sourceExcerpt'] }] })
      invalidExcerpt = false
      const malformedBoolean = await check()
      expect(malformedBoolean.accepted).toBe(false)
      expect(malformedBoolean.reviewId).not.toBe(malformedNumber.reviewId)
      invalidExcerpt = undefined
      const effect = await db.getLifeEffect(content.effectId)
      expect(await readLifePersonalArtifactContents(view, async () => ({ ...effect!, payload: { ...effect!.payload, parameters: { ownedNote: { content: 'tampered', contentHash: content.contentHash } } } }))).toEqual([])
      expect(await readLifePersonalArtifactContents(view, async () => ({ ...effect!, turnId: 'other' }))).toEqual([])
      expect(await readLifePersonalArtifactContents(view, async () => ({ ...effect!, payload: { ...effect!.payload, sourceWithdrawn: true } }))).toEqual([])
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-original-source', changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }, mode: 'forget', reason: 'host withdrew source' }] })
      expect(await readLifePersonalArtifactContents(await db.readLifeState(), db.getLifeEffect)).toEqual([])
      await expect(db.appendConversationTurn({ cardId: 'alice', sessionId: 'session', turnId: 'recall', assistantText: '故事里有一个保管旧车票的老人。', lifeReplyFence: { reviewId: accepted.reviewId!, owners: acceptedOwners } })).rejects.toThrow()
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
