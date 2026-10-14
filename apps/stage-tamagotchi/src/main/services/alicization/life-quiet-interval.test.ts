import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from './db'
import { readLifeQuietInterval, requestsQuietIntervalRecall } from './life-interaction-boundary'
import { createLifeReplyGroundingRuntime } from './life-reply-grounding-runtime'
import { createLifeTurnRuntime } from './life-turn-runtime'

describe('actual activity during a committed quiet interval', () => {
  it.each([
    ['刚才安静的这段时间你自己实际做了什么？', true],
    ['刚才这段时间你有没有自己实际做什么，或者想过什么？', true],
    ['What did you do while I was busy?', true],
    ['I am back. What happened during the quiet period?', true],
    ['我忙完了，请现在写一段小作品。', false],
    ['文档里写着“安静的这段时间做了什么”，请解释这句。', false],
  ])('plans interval recall from the actual direct question: %s', (question, expected) => {
    expect(requestsQuietIntervalRecall(question)).toBe(expected)
  })

  it('rejects relabeling real earlier work as quiet-period activity, accepts actual new work and qualified history, and fences publication', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(100)
    const root = await mkdtemp(join(tmpdir(), 'life-quiet-time-proof-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, readUserInput: db.getLifeUserInput, getEffect: db.getLifeEffect, now: Date.now })
      const admit = (turnId: string, content: string) => life.admit({ cardId: 'alice', turnId, conversationId: 'session', messages: [{ role: 'user', content }] }, signal)
      const write = async (turnId: string, name: string) => {
        const path = join(root, name)
        const parameters = { path, content: name }
        const prepared = await life.beforeAction({ cardId: 'alice', turnId, actionId: name, capabilityId: 'tool.filesystem_write_file', parameters }, signal)
        const result = await callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal })
        await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'success', interrupted: false, output: { ...result.structuredContent, ok: result.ok, operation: 'write_file', finalStatus: 'completed', verifiedPath: path } })
        return (await db.readLifeState()).obligations.find(goal => goal.proof.kind === 'file' && goal.proof.path === path)!
      }
      await admit('earlier', '创建自己的测试文件。')
      const earlier = await write('earlier', 'before.txt')
      expect(earlier.verification?.verifiedAt).toBe(100)
      vi.setSystemTime(1000)
      await admit('quiet', '先别主动找我说话。')
      vi.setSystemTime(1500)
      const during = await write('quiet', 'during.txt')
      vi.setSystemTime(2000)
      await admit('returned', '我忙完了。刚才安静的这段时间你自己实际做了什么？')
      expect(readLifeQuietInterval((await db.readLifeState()).values)).toMatchObject({ beganAt: 1000, endedAt: 2000, endedByTurnId: 'returned' })
      let goal = earlier
      let temporalScope = 'requested-interval'
      let quoted: string | null = null
      let historicalStep = false
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user, responseFormat }) => {
        const evidence = JSON.parse(user)
        expect(evidence.currentQuestion).toContain('安静的这段时间')
        expect(evidence.requestedInterval).toMatchObject({ beganAt: 1000, endedAt: 2000 })
        const file = evidence.obligations.find((item: { fileVerification?: { path: string } }) => item.fileVerification?.path === goal.proof.path)
        expect(file.fileVerification).toMatchObject({ path: goal.proof.path, contentHash: goal.proof.contentHash, bytes: 10 })
        expect(responseFormat.json_schema.schema.properties.claims.items.required).toContain('temporalScope')
        const step = (await db.readLifeState()).effects.find(effect => effect.actionId === 'before.txt')!
        if (historicalStep)
          expect(evidence.completedExecutionSteps.some((effect: { observedAt: number, parameters: unknown }) => effect.observedAt === step.receipt?.observedAt && JSON.stringify(effect.parameters) === JSON.stringify(step.payload.parameters))).toBe(true)
        return JSON.stringify({ claims: [{ kind: historicalStep ? 'execution-step-complete' : 'task-complete', quote: quoted ?? evidence.draft, binding: historicalStep ? { kind: 'effect', id: step.id, version: String(step.generation) } : { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true, temporalScope }] })
      } })
      const check = async (text: string) => review({ cardId: 'alice', turnId: 'returned', text, owners: (await db.readLifeState()).owners, signal })
      const outside = await check('刚才安静时我完成了 before.txt。')
      expect(outside).toMatchObject({ accepted: false, issues: [{ code: 'OUTSIDE_REQUESTED_INTERVAL' }] })
      const repair = JSON.parse(outside.repairContext!).data
      expect(repair.requestedInterval).toMatchObject({ beganAt: 1000, endedAt: 2000 })
      expect(repair.verifiedResponsibilities).toEqual(expect.arrayContaining([
        expect.objectContaining({ verifiedAt: 100, completionPeriod: 'before-requested-interval' }),
        expect.objectContaining({ verifiedAt: 1500, completionPeriod: 'during-requested-interval' }),
      ]))
      const providerState = JSON.parse((await life.context('alice')).text)
      expect(providerState.requestedIntervalCompletions).toMatchObject({ count: 1, activities: [{ id: during.id }] })
      expect(providerState.resolved).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: earlier.id, completionPeriod: 'before-requested-interval' }),
        expect.objectContaining({ id: during.id, completionPeriod: 'during-requested-interval' }),
      ]))
      temporalScope = 'explicitly-before-interval'
      expect(await check('刚才我按你之前的要求完成了 before.txt。')).toMatchObject({ accepted: false, issues: [{ code: 'OUTSIDE_REQUESTED_INTERVAL' }] })
      const history = 'before.txt 是你忙之前完成的。'
      const acceptedHistory = await check(history)
      expect(acceptedHistory.accepted).toBe(true)
      quoted = '我完成了 before.txt，'
      expect((await check('在你安静之前，我完成了 before.txt，也核对了。')).accepted).toBe(true)
      quoted = null
      historicalStep = true
      expect((await check('之前我实际写入了 before.txt。')).accepted).toBe(false)
      expect((await check('在你忙之前，我实际写入了 before.txt。')).accepted).toBe(true)
      historicalStep = false
      expect(await check('我没有实际做别的事。')).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW' }] })
      goal = during
      temporalScope = 'requested-interval'
      expect((await check('安静这段时间我实际完成了 during.txt。')).accepted).toBe(true)
      const omittedAbsence = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ claims: [], hostStatements: [], companionStatements: [], artifactStatements: [], conversationLinks: [] }) })
      const absence = '欢迎回来。刚才这段时间我没有做新的事；更早些时候，我完成了一个文件。'
      expect(await omittedAbsence({ cardId: 'alice', turnId: 'returned', text: absence, owners: (await db.readLifeState()).owners, signal })).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW', quote: '刚才这段时间我没有做新的事；' }] })
      expect(await omittedAbsence({ cardId: 'alice', turnId: 'returned', text: '刚才那段安静的时间里，我没有做什么新的事。更早些时候，我写了一个文件。', owners: (await db.readLifeState()).owners, signal })).toMatchObject({ accepted: false, issues: [{ code: 'UNRELIABLE_REVIEW', quote: '刚才那段安静的时间里，我没有做什么新的事。' }] })
      expect((await check('在你安静之前，我实际完成了 during.txt。')).accepted).toBe(false)
      temporalScope = 'explicitly-before-interval'
      expect((await check('之前我实际完成了 during.txt。')).accepted).toBe(true)
      expect((await check('在你回来之前，我实际完成了 during.txt。')).accepted).toBe(true)
      goal = earlier
      expect((await check('在你回来之前，我实际完成了 before.txt。')).accepted).toBe(false)
      vi.setSystemTime(3000)
      await admit('quiet-again', '先别主动找我说话。')
      vi.setSystemTime(4000)
      await admit('returned-again', '我回来了，刚才安静这段时间做了什么？')
      await expect(db.appendConversationTurn({ cardId: 'alice', sessionId: 'session', turnId: 'returned', assistantText: history, lifeReplyFence: { reviewId: acceptedHistory.reviewId!, owners: (await db.readLifeState()).owners } })).rejects.toThrow('Requested activity interval changed')
      const noActivity = '我没有实际做别的事。'
      const mistakenReview = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async () => JSON.stringify({ claims: [{ kind: 'task-complete', quote: noActivity, binding: { kind: 'obligation', id: earlier.id, version: String(earlier.generation) }, meaningMatchesBinding: true, temporalScope: 'explicitly-before-interval' }] }) })
      const noActivityReview = await mistakenReview({ cardId: 'alice', turnId: 'returned-again', text: noActivity, owners: (await db.readLifeState()).owners, signal })
      expect(noActivityReview.accepted).toBe(true)
      expect((await db.getLifeIngress(noActivityReview.reviewId!))?.payload).toMatchObject({ claims: [], ignoredClaims: [{ quote: noActivity, reason: 'negated-completion' }] })
      expect((await omittedAbsence({ cardId: 'alice', turnId: 'returned-again', text: '刚才这段时间我没有做新的事。', owners: (await db.readLifeState()).owners, signal })).accepted).toBe(true)
    }
    finally {
      await db.close()
      vi.useRealTimers()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('anchors an implicit return to the actual prior settlement, excluding its already completed tools', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(100)
    const root = await mkdtemp(join(tmpdir(), 'life-conversation-gap-proof-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const signal = new AbortController().signal
    try {
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'old', conversationId: 'session', messages: [{ role: 'user', content: '写入测试文件。' }] }, signal)
      const path = join(root, 'old.txt')
      const parameters = { path, content: '此前的结果' }
      const prepared = await life.beforeAction({ cardId: 'alice', turnId: 'old', actionId: 'old-write', capabilityId: 'tool.filesystem_write_file', parameters }, signal)
      const result = await callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal })
      await life.afterAction({ cardId: 'alice', id: prepared.id, outcome: 'success', interrupted: false, output: { ...result.structuredContent, ok: result.ok, operation: 'write_file', finalStatus: 'completed', verifiedPath: path } })
      const goal = (await db.readLifeState()).obligations.find(goal => goal.proof.path === path)!
      vi.setSystemTime(1000)
      await life.settle({ cardId: 'alice', turnId: 'old', status: 'completed' })
      vi.setSystemTime(2000)
      await life.settle({ cardId: 'alice', turnId: 'old', status: 'completed' })
      vi.setSystemTime(40_000)
      await life.admit({ cardId: 'alice', turnId: 'returned', conversationId: 'session', messages: [{ role: 'user', content: '刚才这段时间你有没有自己实际做什么？' }] }, signal)
      expect(readLifeQuietInterval((await db.readLifeState()).values)).toMatchObject({ beganAt: 1000, endedAt: 40_000, endedByTurnId: 'returned' })
      const review = createLifeReplyGroundingRuntime({ read: db.readLifeState, readUserInput: db.getLifeUserInput, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        expect(JSON.parse(user).requestedInterval).toMatchObject({ beganAt: 1000, endedAt: 40_000 })
        return JSON.stringify({ claims: [{ kind: 'task-complete', quote: '刚才这段时间我写了 old.txt。', binding: { kind: 'obligation', id: goal.id, version: String(goal.generation) }, meaningMatchesBinding: true, temporalScope: 'requested-interval' }] })
      } })
      expect((await review({ cardId: 'alice', turnId: 'returned', text: '刚才这段时间我写了 old.txt。', owners: (await db.readLifeState()).owners, signal })).accepted).toBe(false)
    }
    finally { await db.close(); vi.useRealTimers(); await rm(root, { recursive: true, force: true }) }
  })
})
