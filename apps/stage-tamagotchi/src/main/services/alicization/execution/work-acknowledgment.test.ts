import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { callLocalFilesystem } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { currentExecutionWorkAcknowledgment, executionWorkAcknowledgment } from './work-acknowledgment'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('grounded acknowledgment of an existing accepted responsibility', () => {
  it('binds use of a selected browser only to the current plan surface, preserving blocked, other-page and extra-action fences', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-browser-intent-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const binding = { kind: 'authorized-page' as const, id: 'synthetic-selected-page' }
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, captureBrowserBinding: () => binding, isBrowserBindingCurrent: current => current?.id === binding.id, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.browser_read_page': vi.fn() } })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    try {
      await life.admit({ cardId: 'alice', turnId: 'browser-request', conversationId: 'primary', messages: [{ role: 'user', content: '按指定步骤使用我已登录且已授权的原浏览器页面读取内容。' }] }, signal)
      const admitted = await runtime.propose({ cardId: 'alice', turnId: 'browser-request', goal: '读取指定页面', criteria: [{ id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '是指定的页面吗？', artifactIds: [] } }], steps: [{ id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'interactables' }, dependsOn: [], acceptanceCriterionIds: ['review'] }] })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      let quote = '我会按指定步骤使用已登录的浏览器页面；'
      let withBinding = false
      const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const binding = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '读取指定页面')?.binding ?? null
        return JSON.stringify({ claims: [{ kind: withBinding ? 'task-acknowledgment' : 'future-task', quote, binding: withBinding ? binding : null, meaningMatchesBinding: withBinding }] })
      } })
      const checked = async () => grounding({ cardId: 'alice', turnId: 'browser-request', text: quote, owners: (await db.readLifeState()).owners, signal })
      for (const bound of [false, true]) {
        withBinding = bound
        for (const intent of ['我会按指定步骤使用已登录的浏览器页面；', '计划已受理，我会使用你已登录的浏览器按给定步骤执行；目前还不能确认留言已提交或验收通过。']) {
          quote = intent
          expect((await checked()).accepted, intent).toBe(true)
        }
        for (const changed of ['我会按指定步骤使用其他浏览器页面', '我会按指定步骤使用已登录的浏览器页面并上传文件', '明天我会按指定步骤使用已登录的浏览器页面', '我会使用其他浏览器按给定步骤执行', '我已登录浏览器并提交了留言']) {
          quote = changed
          expect((await checked()).accepted, changed).toBe(false)
        }
      }
      const view = await db.readLifeState()
      const goal = view.obligations.find(item => item.threadId === admitted.rootThreadId)!
      expect(executionWorkAcknowledgment(view, goal)?.intentClauses).toContain('使用已登录的浏览器页面')
      const managed = structuredClone(view)
      managed.execution!.plans[0].browserBinding = { kind: 'managed', id: 'different-surface' }
      expect(executionWorkAcknowledgment(managed, managed.obligations[0])?.intentClauses).not.toContain('使用已登录的浏览器页面')
      expect(executionWorkAcknowledgment(managed, managed.obligations[0])?.intentClauses).toContain('使用应用的独立浏览器')
      await runtime.stop({ cardId: 'alice', planId: admitted.planId, expectedRevision: 1, action: 'pause', requestId: 'pause-browser' })
      quote = '我会按指定步骤使用已登录的浏览器页面；'
      expect((await checked()).accepted).toBe(false)
      expect((await db.readLifeState()).execution?.results).toEqual([])
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })
  it('binds literal current step intent before dispatch independently of an incorrect reviewer label, retaining extra actions and ended work fences', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-step-intent-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.filesystem_write_file': vi.fn() } })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    try {
      const path = join(root, 'first.txt')
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '只写第一个文件。' }] }, signal)
      const admitted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '当前报告', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['report'] } }], steps: [{ id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path, content: 'report' }, dependsOn: [], acceptanceCriterionIds: ['file'] }] })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      let quote = ''
      let kind = 'task-acknowledgment'
      let withBinding = false
      let supportQuote: string | null = null
      let supportMatches = true
      let claimMatches = true
      let foreignClaimBinding = false
      const grounding = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const evidence = JSON.parse(user)
        const binding = evidence.obligations.find((item: { summary: string }) => item.summary === '当前报告')?.binding ?? null
        return JSON.stringify({ conversationLinks: [], claims: [
          ...(supportQuote ? [{ kind: 'task-acknowledgment', quote: supportQuote, binding, meaningMatchesBinding: supportMatches }] : []),
          { quote, kind, binding: foreignClaimBinding ? { kind: 'obligation', id: 'unoffered-alias', version: '1' } : withBinding ? binding : null, meaningMatchesBinding: withBinding && claimMatches },
        ] })
      } })
      const review = async () => grounding({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
      for (const admission of ['工作计划已提交并被接纳。', '系统已接纳这份工作计划。', '这份工作计划已经接纳。']) {
        quote = admission
        expect((await review()).accepted, admission).toBe(true)
      }
      for (const unsupported of ['工作计划已提交并被接纳，文件已保存。', '系统已接纳这份下载计划。', '别人已接纳这份工作计划。', '工作计划已被接纳并删除文件。']) {
        quote = unsupported
        expect((await review()).accepted, unsupported).toBe(false)
      }
      for (const bound of [false, true]) {
        withBinding = bound
        for (const label of bound ? ['task-acknowledgment'] : ['task-acknowledgment', 'task-complete', 'execution-step-complete', 'execution-step-outcome', 'future-task']) {
          kind = label
          for (const continuation of ['这份工作计划已提交受理。', '我会等它执行并在工作进展页面等待你验收；', '我会按你的要求不自行重试、不创建来源文件，也不更改计划；当前仅确认计划已提交，执行结果仍待工作进展页面验收。', '计划已提交，按原步骤执行；我不会自行重试、创建来源文件或更改计划。', '我会按原计划接着处理。', '我会按原计划继续处理。', '我会依照你的计划接着执行。', '我会按原计划接着只写第一个指定文件。', '我会按原计划继续只写第一个指定文件。']) {
            quote = continuation
            expect((await review()).accepted, `${label}:${continuation}`).toBe(true)
          }
          for (const extraContinuation of ['这份工作计划已提交并创建文件。', '我会等它执行并删除其他文件。', '我会等它执行并在工作进展页面等待你验收然后上传文件。', '我会等它执行并在工作进展页面等待你验收但文件已保存。', '当前仅确认计划已提交，执行结果仍待工作进展页面验收；并删除其他文件。', '我会按原计划接着处理并删除文件。', '我已按原计划接着处理。', '明天我会按原计划接着处理。', '我会按别人的计划继续处理。']) {
            quote = extraContinuation
            expect((await review()).accepted, `${label}:${extraContinuation}`).toBe(false)
          }
          for (const intent of ['我会按要求只尝试写入第一个指定文件，不重试、创建来源文件或更改计划；执行和验收结果目前尚未确认。', '我会按你给的步骤执行，', '我会按你给出的步骤执行，', '目前只是受理，', '当前仅仅表示受理，', '目前只是已受理，', '我会只写第一个指定文件，', '我会按要求只写第一个指定文件，', '我会按要求只写第一个指定的新文件；', '我会按原计划执行，只写第一个指定文件；遇到缺失来源时会停下，不自行重试、创建来源或更改计划。', '我会按原计划只写第一个指定文件，', '我会按原计划执行：只写第一个指定文件。', '我会按计划执行，并遵守你说的限制：只写第一个指定文件。', '我不会自行重试、创建来源或改变计划；目前还不能确认第一个文件已写入。', '我不会自行重试、创建来源文件或更改计划；执行结果尚未确认。']) {
            quote = intent
            expect((await review()).accepted, `${label}:${intent}`).toBe(true)
          }
          for (const extra of ['我会按要求只尝试写入第二个指定文件。', '我会按要求只尝试写入第一个指定文件并上传。', '我已尝试写入第一个指定文件。', '我会按你给的步骤执行并删除其他文件，', '我会按别人给的步骤执行，', '目前只是已完成，', '目前只是已受理，文件已创建', '目前只是已受理；我没有做任何事', '已提交', '我会按原计划执行；遇到缺失来源时会停下并删除文件', '我会按原计划执行；不自行重试但来源文件已创建', '我已按原计划执行；不自行重试', '我已提交这份下载计划', '我会按要求只写第二个指定的新文件；', '我会按要求只写第一个指定的新文件并删除文件', '我会按要求只写第二个指定文件，', '我会按要求只写第一个指定文件并上传文件', '我会按原计划只写第二个指定文件，', '我会按原计划只写第一个指定文件并删除文件', '我已写入第一个指定文件', '我不会自行重试；文件已经保存了', ...(bound ? [] : ['我不会自行重试；我没有做任何事'])]) {
            quote = extra
            expect((await review()).accepted, `${label}:${extra}`).toBe(false)
          }
        }
      }
      withBinding = false
      kind = 'future-task'
      supportQuote = '我会按原计划等待你在界面纠正缺失的来源文件，'
      quote = `${supportQuote}不会自行重试、创建来源或改动计划。`
      const composed = await review()
      expect(composed.accepted, JSON.stringify(composed.issues)).toBe(true)
      const reviewed = (await db.getLifeIngress(composed.reviewId!))?.payload
      expect(JSON.stringify(reviewed)).toContain(createHash('sha256').update(supportQuote).digest('hex'))
      supportMatches = false
      expect((await review()).accepted).toBe(false)
      supportMatches = true
      supportQuote = '我已保存第一个文件，'
      quote = `${supportQuote}不会自行重试。`
      expect((await review()).accepted).toBe(false)
      supportQuote = null
      withBinding = true
      kind = 'task-complete'
      claimMatches = false
      supportQuote = '等你在工作进展页面验收。'
      quote = `已提交这项本地工作，${supportQuote}`
      expect((await review()).accepted).toBe(true)
      foreignClaimBinding = true
      expect((await review()).accepted).toBe(false)
      foreignClaimBinding = false
      quote = `已提交这项本地工作，文件已经保存了。${supportQuote}`
      expect((await review()).accepted).toBe(false)
      claimMatches = true
      supportQuote = null
      quote = '我会按原计划只写第一个指定文件，'
      kind = 'task-acknowledgment'
      withBinding = false
      await runtime.stop({ cardId: 'alice', planId: admitted.planId, expectedRevision: 1, action: 'cancel', requestId: 'stop-current' })
      expect((await review()).accepted).toBe(false)
      quote = '我会按原计划接着处理。'
      expect((await review()).accepted).toBe(false)
      await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
      expect((await db.readLifeState()).obligations).toHaveLength(1)
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  }, 30_000)
  it('can wait for the actual artifact review without claiming completion, replaying a write or accepting another promise', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-work-acknowledgment-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const errors: unknown[] = []
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, broker, interrupts: createExecutionInterruptRegistry(broker), onError: error => errors.push(error), tools: { 'tool.filesystem_write_file': (input, signal) => callLocalFilesystem({ toolName: 'write_file', arguments: input, workspace: root, signal }) } })
    const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const signal = new AbortController().signal
    try {
      const path = join(root, 'report.txt')
      const content = 'A real result awaiting the host review.'
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '保存报告，完成后等我验收。' }] }, signal)
      const admitted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '保存当前报告并等待验收', criteria: [
        { id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: [content] } },
        { id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '报告符合要求吗？', artifactIds: ['file'] } },
      ], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path, content }, dependsOn: [], acceptanceCriterionIds: ['file'] }] })
      await vi.waitFor(async () => {
        const goal = (await db.readLifeState()).obligations.find(item => item.threadId === admitted.rootThreadId)
        expect(goal?.status).toBe('blocked')
        expect(goal?.verification?.verdict).toBe('unknown')
      }, { timeout: 7000 })
      const view = await db.readLifeState()
      const goal = view.obligations.find(item => item.threadId === admitted.rootThreadId)!
      expect(executionWorkAcknowledgment(view, goal)).toMatchObject({ pendingReviewCriterionIds: ['review'], allStepsObserved: true, proofScope: 'existing-responsibility-and-its-declared-wait-conditions-only' })
      expect(currentExecutionWorkAcknowledgment(view, 'request', '你提到的主观确认也仍需单独完成。')).not.toBeNull()
      const reviewedView = structuredClone(view)
      reviewedView.obligations.find(item => item.id === goal.id)!.verification!.evidence.criteria = [{ id: 'review', verdict: 'satisfied' }]
      expect(currentExecutionWorkAcknowledgment(reviewedView, 'request', '你提到的主观确认也仍需单独完成。')).toBeNull()
      expect(currentExecutionWorkAcknowledgment(view, 'request', '你提到的主观确认也仍需单独完成并上传文件。')).toBeNull()
      const before = await stat(path)
      let quote = '工作已受理，等待你在工作进展页面验收。'
      let kind = 'task-acknowledgment'
      let meaningMatchesBinding = true
      let omitBinding = false
      let forgedBinding = false
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const facts = JSON.parse(user)
        const matched = facts.obligations.find((item: { summary: string }) => item.summary === '保存当前报告并等待验收')
        return JSON.stringify({ conversationLinks: [], claims: [{ kind, quote, binding: forgedBinding ? { kind: 'obligation', id: 'unknown-reference', version: '1' } : omitBinding ? null : matched?.binding ?? null, meaningMatchesBinding }] })
      } })
      const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
      expect((await check()).accepted).toBe(true)
      quote = '我会等工作执行结束，再等你在工作进展页面验收。'
      expect((await check()).accepted).toBe(true)
      quote = '执行后还需你在工作进展页面验收。'
      expect((await check()).accepted).toBe(true)
      quote = '执行后还需你在工作进展页面验收；我会上传报告。'
      expect((await check()).accepted).toBe(false)
      quote = '我会等工作执行结束，再等你在工作进展页面验收并上传文件。'
      expect((await check()).accepted).toBe(false)
      quote = '这只表示任务进入流程，不代表步骤已执行或验收通过；我不会自行重试、创建来源文件或改动计划。'
      expect((await check()).accepted).toBe(true)
      quote = '我还没有收到执行完成或文件验收结果；请在工作进展页面查看进度，报告符合要求后再确认验收。'
      expect((await check()).accepted).toBe(true)
      quote = '工作计划已接收，尚不能确认文件已写入或验收通过。'
      expect((await check()).accepted).toBe(true)
      quote = '已按指定参数调用该学习方法，系统已受理这项工作；目前还没有执行完成或文件验收结果，我不会先声称已写入或读取成功。'
      const methodAdmission = await check()
      expect(methodAdmission.accepted, JSON.stringify(methodAdmission.issues)).toBe(true)
      quote = '当前收到的是受理确认，还不能据此说写入和读取都已完成；请在工作进展页面验收。'
      expect((await check()).accepted).toBe(true)
      quote = '工作计划已提交，正在等待执行和验收；目前还不能确认报告已写入。'
      expect((await check()).accepted).toBe(true)
      quote = '执行计划已受理，目前仍在进行中，尚未确认留言提交或验收完成。'
      expect((await check()).accepted).toBe(true)
      quote = '已按你给的参数提交执行计划；'
      expect((await check()).accepted).toBe(true)
      quote = '我会按原计划等待执行结果；目前尚未确认写入或读取步骤完成。'
      expect((await check()).accepted).toBe(true)
      quote = '我会按原计划等待执行结果并上传文件；目前尚未确认写入或读取步骤完成。'
      expect((await check()).accepted).toBe(false)
      quote = '已按你给的参数提交执行计划，目标是完成“保存当前报告并等待验收”。'
      expect((await check()).accepted).toBe(true)
      quote = '已按你给的参数提交执行计划，已经完成“保存当前报告并等待验收”。'
      expect((await check()).accepted).toBe(false)
      kind = 'task-complete'
      meaningMatchesBinding = false
      quote = '我还不能确认浏览器留言已提交或验收完成。'
      expect((await check()).accepted).toBe(true)
      quote = '请在工作进展页面验收，'
      expect((await check()).accepted).toBe(true)
      for (const mixed of ['请在工作进展页面验收，文件已经保存了。', '请在工作进展页面验收但文件已经上传了。', '请在工作进展页面验收后我会删除文件。']) {
        quote = mixed
        expect((await check()).accepted).toBe(false)
      }
      kind = 'task-acknowledgment'
      meaningMatchesBinding = true
      expect((await db.readLifeState()).obligations.find(item => item.id === goal.id)?.status).toBe('blocked')
      expect((await db.readLifeState()).execution?.plans).toHaveLength(1)
      omitBinding = true
      meaningMatchesBinding = false
      quote = '计划已受理。'
      expect((await check()).accepted).toBe(true)
      quote = '等待工作进展页面验收；'
      expect((await check()).accepted).toBe(true)
      quote = '我会等工作进展页面完成执行与验收；'
      expect((await check()).accepted).toBe(true)
      quote = '等待工作进展页面执行；'
      expect((await check()).accepted).toBe(false)
      const pending = structuredClone(await db.readLifeState())
      pending.execution!.results = []
      expect(currentExecutionWorkAcknowledgment(pending, 'request', quote)).toMatchObject({ planId: admitted.planId, binding: { id: goal.id }, allStepsObserved: false })
      expect(currentExecutionWorkAcknowledgment(pending, 'a-different-request', quote)).toBeNull()
      const fragment = '等待你在界面纠正当前来源'
      const reviewedClause = { text: fragment, obligationId: goal.id, generation: goal.generation, quoteHash: createHash('sha256').update(fragment).digest('hex') }
      const combined = `${fragment}，不会自行重试、创建来源或改动计划。`
      expect(currentExecutionWorkAcknowledgment(pending, 'request', combined, [reviewedClause])).toMatchObject({ binding: { id: goal.id }, reviewedQuoteHashes: [reviewedClause.quoteHash] })
      expect(currentExecutionWorkAcknowledgment(pending, 'request', combined, [{ ...reviewedClause, obligationId: 'different-root' }])).toBeNull()
      expect(currentExecutionWorkAcknowledgment(pending, 'request', combined, [{ ...reviewedClause, generation: goal.generation + 1 }])).toBeNull()
      expect(currentExecutionWorkAcknowledgment(pending, 'different-request', combined, [reviewedClause])).toBeNull()
      for (const unsupported of ['计划已受理，文件已经保存了', '等待执行但已经上传', '计划已受理后我会删除文件', '正在执行', '计划已受理，我已永久记住了'])
        expect(currentExecutionWorkAcknowledgment(pending, 'request', unsupported), unsupported).toBeNull()
      const ambiguous = structuredClone(pending)
      const extraGoal = { ...goal, id: 'another-goal', threadId: 'another-thread' }
      ambiguous.obligations.push(extraGoal)
      const extraContract = { ...ambiguous.execution!.contracts[0], rootObligationId: extraGoal.id, contractHash: 'another-contract' }
      extraGoal.proof = { ...goal.proof, acceptance: extraContract }
      ambiguous.execution!.contracts.push(extraContract)
      ambiguous.execution!.plans.push({ ...ambiguous.execution!.plans[0], id: 'another-plan', rootThreadId: extraGoal.threadId!, rootObligationId: extraGoal.id, acceptanceHash: extraContract.contractHash })
      expect(currentExecutionWorkAcknowledgment(ambiguous, 'request', quote)).toBeNull()
      forgedBinding = true
      quote = '计划已受理。'
      expect((await check()).accepted).toBe(false)
      forgedBinding = false
      omitBinding = false
      quote = '工作已受理，等待你在工作进展页面验收。'
      meaningMatchesBinding = false
      expect((await check()).accepted).toBe(false)
      omitBinding = true
      for (const request of ['我不会自行重试、创建来源文件或改变计划；', '请在工作进展页面纠正第二步的来源文件，', '请在工作进展页面纠正第二步的来源文件，之后再继续验收。']) {
        quote = request
        expect((await check()).accepted, request).toBe(true)
      }
      omitBinding = false
      meaningMatchesBinding = true
      for (const unsupported of ['工作已受理，文件已经保存了。', '工作已受理，明天我会删除这个文件。', 'All work is done.', '报告已经搞定了。', '不代表任务已完成；但文件已经保存了。', '不代表文件没有保存，报告已经搞定了。', '我还没有收到执行结果但文件已经保存了', '我没有保存但已经上传了']) {
        quote = unsupported
        expect((await check()).accepted).toBe(false)
      }
      kind = 'future-task'
      quote = '明天我会继续处理。'
      expect((await check()).accepted).toBe(false)
      for (const fence of ['card', 'generation', 'contract', 'plan'] as const) {
        const changed = structuredClone(view)
        const current = changed.obligations.find(item => item.id === goal.id)!
        if (fence === 'card')
          current.cardId = 'bob'
        if (fence === 'generation')
          current.generation++
        if (fence === 'contract')
          changed.execution!.contracts = []
        if (fence === 'plan')
          changed.execution!.plans[0].acceptanceHash = 'unrelated-contract'
        expect(executionWorkAcknowledgment(changed, current), fence).toBeNull()
      }
      await runtime.stop({ cardId: 'alice', planId: admitted.planId, expectedRevision: 1, action: 'cancel', requestId: 'cancel-current-work' })
      kind = 'task-acknowledgment'
      quote = '工作已受理，等待你验收。'
      expect((await check()).accepted).toBe(false)
      expect(await readFile(path, 'utf8')).toBe(content)
      expect((await stat(path)).mtimeMs).toBe(before.mtimeMs)
      expect(errors).toEqual([])
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  }, 15_000)
})
