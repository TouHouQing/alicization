import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { lifeEmotionParameterVersion } from './life-appraisal-repository'
import { discardLifeConversationPreferences, lifeRelationshipKey, readLifeConversationPreferences } from './life-conversation-preferences'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('source correction across cognition, emotion and responsibility', () => {
  it('withdraws an appraisal without erasing an independently sourced current conversation requirement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-relationship-independent-sources-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    const ports = { getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput }
    const life = createLifeTurnRuntime({ ...ports, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: Date.now })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }], 'rule')
      const [fact] = await db.readLifeFactVersions({ cardId: 'alice' })
      await db.commitLifeState({ cardId: 'alice', operationKey: 'relationship-appraisal', changes: [], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey: 'music-appraisal', turnId: null, occurredAt: Date.now(), parameterVersion: lifeEmotionParameterVersion, dimensions: { valence: 0.7 }, snapshot: { valence: 0.7 }, baseline: null, evidence: [{ cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }], relationship: { snapshot: { relationshipModel: { reason: 'music' } }, baseline: null } } }] })
      await life.admit({ cardId: 'alice', turnId: 'independent-requirement', conversationId: 'qa', messages: [{ role: 'user', content: '今天不用每次都问我问题。' }] }, signal)
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [fact.factId], reason: 'withdrawn' })
      await db.resumeLifeEvidenceCleanup()
      const view = await db.readLifeState()
      expect(JSON.parse(view.values['life:emotion'])).toBeNull()
      expect(JSON.parse(view.values[lifeRelationshipKey]).relationshipModel).toBeUndefined()
      expect(await readLifeConversationPreferences(view, ports, Date.now(), 'qa')).toEqual([expect.objectContaining({ sourceId: 'user:independent-requirement', kind: 'fewer-questions' })])
      const discard = discardLifeConversationPreferences(view.values[lifeRelationshipKey], 'user:independent-requirement')!
      await db.commitLifeState({ cardId: 'alice', operationKey: 'withdraw-requirement', changes: [discard] })
      expect(await readLifeConversationPreferences(await db.readLifeState(), ports, Date.now(), 'qa')).toEqual([])
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('withdraws a mixed relationship appraisal, preserves other grounded evidence and permits a fresh appraisal', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-relationship-causality-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }, { subject: 'user', predicate: 'likes', object: '摄影', confidence: 0.95 }], 'rule')
      const [first, second] = await db.readLifeFactVersions({ cardId: 'alice' })
      const evidence = [first, second].map(fact => ({ cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) }))
      const relationship = { relationshipModel: { posture: 'warm', reason: 'shared-interests' }, personStateProjection: { context: 'music-and-photo' } }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'mixed-appraisal', changes: [{ owner: 'presence', key: 'visual_presence_state_v1', value: JSON.stringify({ ...relationship, emotionalKernel: { valence: 0.8 }, derivedMindStateBundle: { ...relationship } }) }], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey: 'mixed', turnId: null, occurredAt: Date.now(), parameterVersion: lifeEmotionParameterVersion, dimensions: { valence: 0.8 }, snapshot: { valence: 0.8 }, baseline: null, evidence, relationship: { snapshot: relationship, baseline: null } } }] })
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [first.factId], reason: 'withdrawn' })
      await db.resumeLifeEvidenceCleanup()
      const withdrawn = await db.readLifeState()
      expect(JSON.parse(withdrawn.values['life:relationship'])).toBeNull()
      expect(JSON.parse(withdrawn.values.visual_presence_state_v1).relationshipModel).toBeNull()
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).find(fact => fact.factId === second.factId)?.lifecycle).toBe('active')
      const next = { relationshipModel: { posture: 'measured', reason: 'remaining-photography' }, personStateProjection: null }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'fresh-relationship', changes: [], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey: 'remaining', turnId: null, occurredAt: Date.now(), parameterVersion: lifeEmotionParameterVersion, dimensions: { valence: 0.2 }, snapshot: { valence: 0.2 }, baseline: null, evidence: [evidence[1]], relationship: { snapshot: next, baseline: null } } }] })
      expect(JSON.parse((await db.readLifeState()).values['life:relationship'])).toEqual(next)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('invalidates carried emotion causality, rejects reuse of the withdrawn source, and can appraise remaining grounded evidence', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-carry-causality-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'likes', object: '音乐', confidence: 0.95 }, { subject: 'user', predicate: 'likes', object: '摄影', confidence: 0.95 }], 'rule')
      const [first, second] = await db.readLifeFactVersions({ cardId: 'alice' })
      const ref = (fact: typeof first) => ({ cardId: 'alice', kind: 'memory_facts', id: fact.factId, version: String(fact.version) })
      const appraise = async (key: string, evidence: ReturnType<typeof ref>[], baseline: Record<string, unknown> | null, snapshot: Record<string, number>) => db.commitLifeState({ cardId: 'alice', operationKey: key, changes: [], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey: key, turnId: null, occurredAt: Date.now(), parameterVersion: lifeEmotionParameterVersion, dimensions: snapshot, snapshot, baseline, evidence } }] })
      await appraise('first-source', [ref(first)], null, { valence: 0.7 })
      await appraise('carried-second-source', [ref(second)], { valence: 0.7 }, { valence: 0.8 })
      await db.tombstoneLongTermMemorySources({ cardId: 'alice', source: 'memory_facts', sourceIds: [first.factId], reason: 'withdrawn' })
      await db.resumeLifeEvidenceCleanup()
      expect(JSON.parse((await db.readLifeState()).values['life:emotion'])).toBeNull()
      await expect(appraise('stale-source-reuse', [ref(first)], null, { valence: 0.9 })).rejects.toThrow('withdrawn')
      await appraise('remaining-second-source', [ref(second)], null, { valence: 0.2 })
      expect(JSON.parse((await db.readLifeState()).values['life:emotion'])).toEqual({ valence: 0.2 })
      expect((await db.readLifeFactVersions({ cardId: 'alice' })).some(fact => fact.factId === second.factId)).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('atomically removes an invalid emotion cause and blocks its old plan while preserving identity across restart', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-evidence-loop-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await db.upsertMemoryFacts([{ subject: 'user', predicate: 'preferred_drink', object: '咖啡', confidence: 0.9 }], 'rule')
      const fact = (await db.readLifeFactVersions({ cardId: 'alice' }))[0]
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, read: db.readLifeState, now: Date.now })
      const signal = new AbortController().signal
      await life.admit({ cardId: 'alice', turnId: 'interpretation', conversationId: 'session', messages: [{ role: 'user', content: '陪我做一份计划' }] }, signal)
      await life.recordContextUse({ cardId: 'alice', turnId: 'interpretation', requestHash: 'actual-provider-request', evidenceIds: [fact.factId], owners: (await life.context('alice')).owners }, signal)
      await db.upsertTaskThread({ id: 'coffee-plan', goal: '按已记住的偏好准备计划', kind: 'codebase-investigation', status: 'running', turnId: 'interpretation', attemptId: 'attempt-1' })
      const snapshot = { valence: 0.7, arousal: 0.2, guardedness: 0.1, closenessDrive: 0.5, repairNeed: 0, initiativePressure: 0.2 }
      await db.commitLifeState({ cardId: 'alice', operationKey: 'appraise', changes: [{ owner: 'self', key: 'mind-head:alice:autobiographical-self', value: JSON.stringify({ name: 'Alice' }) }, { owner: 'presence', key: 'visual_presence_state_v1', value: JSON.stringify({ emotionalKernel: snapshot, appraisal: { inferredHostGoal: 'coffee' }, derivedMindStateBundle: { emotionalKernel: snapshot } }) }], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey: 'interpretation', turnId: 'interpretation', occurredAt: Date.now(), parameterVersion: lifeEmotionParameterVersion, dimensions: snapshot, snapshot, baseline: null, evidence: [] } }] })
      const receipts: string[][] = []
      db.onLifeCommitted(receipt => receipts.push(receipt.owners.map(owner => owner.owner)))
      await db.applyMemoryFactCorrections([{ targetFactId: fact.factId, nextValidationStatus: 'superseded', sourceLabel: 'explicit correction' }])
      const view = await db.readLifeState()
      expect(view.obligations[0]).toMatchObject({ status: 'blocked', generation: 2 })
      expect(JSON.parse(view.values['life:emotion'])).toBeNull()
      expect(JSON.parse(view.values.visual_presence_state_v1).emotionalKernel).toBeNull()
      expect(JSON.parse(view.values['mind-head:alice:autobiographical-self'])).toEqual({ name: 'Alice' })
      expect(receipts).toContainEqual(expect.arrayContaining(['memory', 'emotion', 'presence', 'goals']))
      await db.resumeLifeEvidenceCleanup()
    }
    finally { await db.close() }
    const restarted = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await restarted.resumeLifeEvidenceCleanup()
      const view = await restarted.readLifeState()
      expect(view.obligations[0]).toMatchObject({ status: 'blocked', generation: 2 })
      expect(JSON.parse(view.values['life:emotion'])).toBeNull()
    }
    finally {
      await restarted.close()
      await rm(root, { recursive: true, force: true })
    }
  })
})
