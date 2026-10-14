import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { lifeEmotionParameterVersion } from './life-appraisal-repository'
import { companionChoicePolicy } from './life-companion-choice'
import { conversationPreferenceChange, discardLifeConversationPreferences, lifeRelationshipKey, readLifeConversationPreferences } from './life-conversation-preferences'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('sourced current conversation requirements', () => {
  it.each(['active', 'corrected', 'discarded', 'expired'])('rechecks an acknowledged current requirement during actual publication: %s', async (state) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let now = Date.now()
    const root = await mkdtemp(join(tmpdir(), 'life-preference-publication-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => now })
      await life.admit({ cardId: 'alice', turnId: 'requirement', conversationId: 'qa', messages: [{ role: 'user', content: '今天不用每次都问我问题。' }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => now, generate: async ({ user }) => {
        const facts = JSON.parse(user)
        return JSON.stringify({ claims: [{ kind: 'interaction-boundary', quote: facts.draft, binding: facts.interactionBoundaries[0].binding, meaningMatchesBinding: true }] })
      } })
      const text = '今天我就少追问一点。'
      const accepted = await review({ cardId: 'alice', turnId: 'requirement', text, owners: (await db.readLifeState()).owners, signal })
      expect(accepted.accepted).toBe(true)
      if (state === 'corrected') {
        now += 10
        vi.setSystemTime(now)
        await life.admit({ cardId: 'alice', turnId: 'correction', conversationId: 'qa', messages: [{ role: 'user', content: '现在可以多问我几个问题。' }] }, signal)
      }
      if (state === 'discarded') {
        const change = discardLifeConversationPreferences((await db.readLifeState()).values[lifeRelationshipKey], 'user:requirement')!
        await db.commitLifeState({ cardId: 'alice', operationKey: 'discard-rule', changes: [change] })
      }
      if (state === 'expired')
        vi.setSystemTime(now + 24 * 60 * 60 * 1000)
      // Refresh the owner fence to test the semantic requirement check itself.
      const payload = { cardId: 'alice', sessionId: 'qa', turnId: 'requirement', assistantText: text, lifeReplyFence: { reviewId: accepted.reviewId!, owners: (await db.readLifeState()).owners } }
      if (state === 'active') {
        await expect(db.appendConversationTurn(payload)).resolves.toBeUndefined()
        expect(await db.listConversationTurnsBySession('qa', { cardId: 'alice' })).toEqual(expect.arrayContaining([expect.objectContaining({ assistantText: text })]))
      }
      else {
        await expect(db.appendConversationTurn(payload)).rejects.toThrow('Interaction boundary changed')
        const turns = await db.listConversationTurnsBySession('qa', { cardId: 'alice' })
        expect(turns.some(turn => turn.assistantText !== null)).toBe(false)
        expect(turns).toEqual(expect.arrayContaining([expect.objectContaining({ userText: '今天不用每次都问我问题。' })]))
      }
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
      vi.useRealTimers()
    }
  })

  it('excludes a present welcome from boundary grammar and binds a no-plan acknowledgment only to the plan rule', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-welcome-boundary-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    let now = Date.now()
    let text = '回来啦，欢迎你。想聊什么都可以，我听着。'
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => ++now })
      await life.admit({ cardId: 'alice', turnId: 'welcome', conversationId: 'primary', messages: [{ role: 'user', content: '我回来了，今天只想轻松随便聊几句。别替我安排计划，也别每句话都追问。' }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user, responseFormat }) => {
        const facts = JSON.parse(user)
        const claimSchema = responseFormat.json_schema.schema.properties.claims
        if (text.startsWith('回来')) {
          expect(claimSchema.maxItems).toBe(0)
          return JSON.stringify({ claims: [{ kind: 'interaction-boundary', quote: text, binding: null, meaningMatchesBinding: true }] })
        }
        const plan = facts.interactionBoundaries.find((item: { kind: string }) => item.kind === 'no-unrequested-plans')
        expect(claimSchema.items.properties.kind.enum).toContain('interaction-boundary')
        expect(claimSchema.items.properties.quote.enum).toContain(text)
        return JSON.stringify({ claims: [{ kind: 'interaction-boundary', quote: text, binding: plan.binding, meaningMatchesBinding: true }] })
      } })
      expect((await review({ cardId: 'alice', turnId: 'welcome', text, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(true)
      text = '那我们就轻轻松松待一会儿，不安排什么；我也挺高兴又见到你。'
      expect((await review({ cardId: 'alice', turnId: 'welcome', text, owners: (await db.readLifeState()).owners, signal })).accepted).toBe(true)
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it.each([true, false])('shares initialized relationship authority across appraisal and dialogue, appraisal first: %s', async (appraisalFirst) => {
    const root = await mkdtemp(join(tmpdir(), 'life-relationship-authority-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    const ports = { getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput }
    const life = createLifeTurnRuntime({ ...ports, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => ++now })
    const appraise = (causeKey: string, trust: number) => db.commitLifeState({ cardId: 'alice', operationKey: causeKey, changes: [], mutations: [{ type: 'appraisal-apply', appraisal: { causeKey, turnId: null, occurredAt: ++now, parameterVersion: lifeEmotionParameterVersion, dimensions: { valence: 0.2 }, snapshot: { valence: 0.2 }, baseline: null, evidence: [], relationship: { snapshot: { relationshipModel: { trust }, personStateProjection: { posture: 'warm' } }, baseline: null } } }] })
    try {
      if (appraisalFirst)
        await appraise('initial-appraisal', 0.6)
      await life.admit({ cardId: 'alice', turnId: 'requirement', conversationId: 'qa', messages: [{ role: 'user', content: '今天不用给我安排计划，也不用每次都问我问题。' }] }, signal)
      await appraise('later-appraisal', 0.72)
      const view = await db.readLifeState()
      expect(view.owners.filter(owner => owner.owner === 'relationship')).toEqual([expect.objectContaining({ metaKey: lifeRelationshipKey })])
      expect(JSON.parse(view.values[lifeRelationshipKey])).toMatchObject({ relationshipModel: { trust: 0.72 }, personStateProjection: { posture: 'warm' }, conversationPreferences: expect.any(Array) })
      expect(await readLifeConversationPreferences(view, ports, now, 'qa')).toHaveLength(2)
      await life.admit({ cardId: 'alice', turnId: 'correction', conversationId: 'qa', messages: [{ role: 'user', content: '现在可以多问我几个问题。' }] }, signal)
      expect(JSON.parse((await db.readLifeState()).values[lifeRelationshipKey]).relationshipModel).toEqual({ trust: 0.72 })
      expect(companionChoicePolicy([], 'alice', now, undefined, await readLifeConversationPreferences(await db.readLifeState(), ports, now, 'qa'))).toMatchObject({ askLess: false, avoidUnrequestedPlans: true })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('retains today requirements beyond recent dialogue and restart, then releases expiry and discarded sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-preferences-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    const morning = new Date()
    morning.setHours(10, 0, 0, 0)
    let now = morning.getTime()
    const signal = new AbortController().signal
    const ports = () => ({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput })
    const runtime = () => createLifeTurnRuntime({ ...ports(), getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => now })
    const admit = async (id: string, content: string) => {
      now += 10
      await runtime().admit({ cardId: 'alice', turnId: id, conversationId: 'qa', messages: [{ role: 'user', content }] }, signal)
    }
    const preferences = async (at = now) => readLifeConversationPreferences(await db.readLifeState(), ports(), at, 'qa')
    try {
      await admit('first', '今天随便聊，不用给我安排计划，也不用每次都问我问题。')
      for (let index = 0; index < 20; index++)
        await admit(`later-${index}`, `这是一条普通聊天消息 ${index}。`)
      await runtime().settle({ cardId: 'alice', turnId: 'first', status: 'failed' })
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      const context = JSON.parse((await runtime().context('alice')).text)
      expect(context.conversationPreferences).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'fewer-questions', quote: '也不用每次都问我问题' }), expect.objectContaining({ kind: 'no-unrequested-plans' })]))
      expect(companionChoicePolicy([], 'alice', now, undefined, await preferences())).toMatchObject({ askLess: true, avoidUnrequestedPlans: true, permitSilentPersonalActivity: true })
      expect(await db.readLifeFactVersions({ cardId: 'alice' })).toEqual([])
      expect(await preferences(morning.getTime() + 24 * 60 * 60 * 1000)).toEqual([])
      const discard = discardLifeConversationPreferences((await db.readLifeState()).values[lifeRelationshipKey], 'user:first')!
      await db.commitLifeState({ cardId: 'alice', operationKey: 'discard-requirement-source', changes: [discard] })
      expect(await preferences()).toEqual([])
      expect(companionChoicePolicy([], 'alice', now, undefined, await preferences())).toMatchObject({ askLess: false, avoidUnrequestedPlans: false })
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('accepts bounded style acknowledgment and rejects an operation smuggled into the same boundary', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-boundary-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let now = Date.now()
    const signal = new AbortController().signal
    let bound = true
    try {
      const life = createLifeTurnRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, read: db.readLifeState, commit: db.commitLifeState, now: () => ++now })
      await life.admit({ cardId: 'alice', turnId: 'preference', conversationId: 'qa', messages: [{ role: 'user', content: '今天不用每次都问我。' }] }, signal)
      const review = createLifeReplyGroundingRuntime({ getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, read: db.readLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: () => ++now, generate: async ({ user }) => {
        const context = JSON.parse(user)
        expect(context.interactionBoundaries[0].kind).toBe('fewer-questions')
        return JSON.stringify({ claims: [{ kind: 'interaction-boundary', quote: context.draft, binding: bound ? context.interactionBoundaries[0].binding : null, meaningMatchesBinding: true }] })
      } })
      const check = async (text: string) => review({ cardId: 'alice', turnId: 'preference', text, owners: (await db.readLifeState()).owners, signal })
      expect((await check('今天我就少追问一点。')).accepted).toBe(true)
      bound = false
      expect((await check('今天我就少追问一点。')).accepted).toBe(false)
      bound = true
      expect((await check('今天我少追问，并删除那个文件。')).accepted).toBe(false)
      expect((await check('我永远不会追问你。')).accepted).toBe(false)
      await life.admit({ cardId: 'alice', turnId: 'change', conversationId: 'qa', messages: [{ role: 'user', content: '现在可以多问我几个问题。' }] }, signal)
      const updated = await readLifeConversationPreferences(await db.readLifeState(), { getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput }, now, 'qa')
      expect(companionChoicePolicy([], 'alice', now, undefined, updated)).toMatchObject({ askLess: false })
      expect(updated[0].sourceId).toBe('user:change')
    }
    finally { await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it.each(['文档里写着“不要每次都问我”，请解释。', '如果我说不要每次问我，你会怎么理解？', '我不是要你不要每次问我。'])('does not flatten quotation, hypothetical or negated directions: %s', (text) => {
    expect(conversationPreferenceChange(undefined, { cardId: 'alice', conversationId: 'qa', sourceId: 'user:test', inputHash: 'a'.repeat(64), message: { role: 'user', content: text }, now: Date.now() })).toBeNull()
  })
})
