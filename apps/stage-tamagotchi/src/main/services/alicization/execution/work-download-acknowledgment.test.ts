import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createExecutionResourceBroker } from './resource-broker'
import { currentExecutionWorkAcknowledgment, currentExecutionWorkStateContradictions } from './work-acknowledgment'
import { currentWorkAcknowledgmentRepairContext } from './work-acknowledgment-repair-context'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

describe('named admission of an actual download plan', () => {
  it('binds loopback navigation intent and absent download receipts to the exact current plan', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-loopback-download-intent-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const browser = { kind: 'managed' as const, id: 'owned-browser' }
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, captureBrowserBinding: () => browser, isBrowserBindingCurrent: current => current?.id === browser.id, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.browser_navigate': vi.fn(), 'tool.browser_click_element': vi.fn() } })
    try {
      const signal = new AbortController().signal
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '访问 http://127.0.0.1:8123/page 并下载指定报告，之后我来验收。' }] }, signal)
      const accepted = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '下载本地报告', criteria: [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'click', minimumBytes: 1 } }, { id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '报告符合要求吗？', artifactIds: ['download'] } }], steps: [{ id: 'navigate', capabilityId: 'tool.browser_navigate', input: { url: 'http://127.0.0.1:8123/page' }, dependsOn: [], acceptanceCriterionIds: [] }, { id: 'click', capabilityId: 'tool.browser_click_element', input: { selector: 'element:owned-link' }, dependsOn: ['navigate'], acceptanceCriterionIds: ['download'] }] })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      let quote = ''
      let outcomeReview = false
      const review = createLifeReplyGroundingRuntime({ readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const goal = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '下载本地报告')
        return JSON.stringify({ claims: [{ kind: outcomeReview ? 'execution-step-outcome' : 'task-acknowledgment', quote, binding: outcomeReview ? null : goal.binding, meaningMatchesBinding: !outcomeReview }] })
      } })
      const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
      for (const statement of ['下载计划已受理。我会按原步骤访问本机测试服务器并尝试下载；', '计划已受理，但现在还没有下载回执，文件是否符合要求也尚未确认；我会等实际执行结果。']) {
        quote = statement
        const checked = await check()
        expect(checked.accepted, JSON.stringify({ statement, issues: checked.issues })).toBe(true)
      }
      const view = await db.readLifeState()
      for (const conditional of ['下载结果出来后，', '等你确认下载的报告符合要求后，', '下载后也仍需你主观确认这份报告是否符合要求。']) {
        quote = conditional
        expect((await check()).accepted, conditional).toBe(true)
        expect(currentExecutionWorkAcknowledgment(view, 'another-request', conditional)).toBeNull()
        for (const extra of ['我会上传报告。', '文件已经保存了。']) {
          quote = `${conditional}${extra}`
          expect((await check()).accepted, quote).toBe(false)
        }
      }
      for (const assertion of ['下载结果已经出来后，', '我已经下载结果出来后，', '等其他人确认下载的报告符合要求后，', '下载结果出来后并上传报告', '计划已接收，但目前还没有执行步骤或下载回执。']) {
        quote = assertion
        expect((await check()).accepted, assertion).toBe(false)
      }
      quote = '下载后也仍需你主观确认这份报告是否符合要求。'
      outcomeReview = true
      expect((await check()).accepted).toBe(true)
      outcomeReview = false
      // Actual product failure: a reviewer quoted the entire admission plus a
      // negative browser-result statement as an unbound observed outcome.
      const negativeBrowserResult = '计划已接纳，但目前还没有浏览器步骤的执行结果或网站回执，不能确认交付已完成。'
      expect(currentExecutionWorkAcknowledgment(view, 'request', '计划已接纳，但目前还没有浏览器步骤的执行结果或网站回执')).not.toBeNull()
      quote = negativeBrowserResult
      expect((await check()).accepted).toBe(true)
      outcomeReview = true
      expect((await check()).accepted).toBe(true)
      outcomeReview = false
      const plan = view.execution!.plans.find(item => item.id === accepted.planId)!
      const click = plan.steps.find(item => item.id === 'click')!
      quote = '但现在还没有下载回执，'
      const withObservation = structuredClone(view)
      const navigate = plan.steps.find(item => item.id === 'navigate')!
      withObservation.execution!.results.push({ planId: plan.id, planRevision: plan.revision, stepId: navigate.id, attemptId: 'navigation-attempt', inputHash: navigate.inputHash, effectId: null, observationRefs: ['navigation-observation'], output: {}, state: 'verified', createdAt: Date.now() })
      expect(currentExecutionWorkAcknowledgment(withObservation, 'request', '但目前还没有浏览器步骤的执行结果或网站回执')).toBeNull()
      expect(currentExecutionWorkAcknowledgment(withObservation, 'request', quote)).not.toBeNull()
      withObservation.execution!.results.push({ planId: plan.id, planRevision: plan.revision, stepId: click.id, attemptId: 'observed-attempt', inputHash: click.inputHash, effectId: null, observationRefs: ['download-observation'], output: {}, state: 'awaiting-verification', createdAt: Date.now() })
      expect(currentExecutionWorkAcknowledgment(withObservation, 'request', quote)).toBeNull()
      for (const assertion of ['我会按原步骤访问外部服务器并尝试下载。', '我会按原步骤访问本机测试服务器并上传文件。', '我会按原步骤访问本机测试服务器并尝试下载并删除文件。', '计划已受理，但现在还没有下载回执，文件已经下载完成。', '文件是否符合要求也尚未确认并且我会上传文件。']) {
        quote = assertion
        expect((await check()).accepted, assertion).toBe(false)
      }
      await runtime.stop({ cardId: 'alice', planId: plan.id, expectedRevision: plan.revision, action: 'cancel', requestId: 'cancel-local' })
      quote = '我会按原步骤访问本机测试服务器并尝试下载。'
      expect((await check()).accepted).toBe(false)
      expect((await db.readLifeState()).execution!.results).toEqual([])
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })

  it('binds the current soul name and plan domain without certifying a download or another named speaker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-named-download-admission-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    const browser = { kind: 'managed' as const, id: 'owned-browser' }
    const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, captureBrowserBinding: () => browser, isBrowserBindingCurrent: current => current?.id === browser.id, broker, interrupts: createExecutionInterruptRegistry(broker), onError: () => {}, tools: { 'tool.browser_click_element': vi.fn() } })
    try {
      const signal = new AbortController().signal
      const life = createLifeTurnRuntime({ read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '下载当前页面中指定的文件，按照原来的验收要求检查。' }] }, signal)
      await db.commitLifeState({ cardId: 'alice', operationKey: 'active-soul', changes: [{ owner: 'soul', key: 'life:soul-active', value: JSON.stringify({ contentHash: 'current-soul', soulRevision: 1 }) }] })
      const plan = await runtime.propose({ cardId: 'alice', turnId: 'request', goal: '下载报告', criteria: [{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'click', minimumBytes: 1 } }], steps: [{ id: 'click', capabilityId: 'tool.browser_click_element', input: { selector: 'element:owned-link' }, dependsOn: [], acceptanceCriterionIds: ['download'] }] })
      await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
      let quote = '小艾已提交这份下载计划，'
      let soulHash = 'current-soul'
      let binding = true
      let claimKind = 'task-acknowledgment'
      let omitClaims = false
      const review = createLifeReplyGroundingRuntime({ readSpeakerIdentity: () => ({ name: '小艾', soulHash }), readUserInput: db.getLifeUserInput, read: db.readLifeState, commit: db.commitLifeState, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), now: Date.now, generate: async ({ user }) => {
        const goal = JSON.parse(user).obligations.find((item: { summary: string }) => item.summary === '下载报告')
        return JSON.stringify({ claims: omitClaims ? [] : [{ kind: claimKind, quote, binding: binding ? goal.binding : null, meaningMatchesBinding: binding && claimKind === 'task-acknowledgment' }] })
      } })
      const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
      quote = '我会按你给的步骤只访问本机测试服务器，先查看页面再按观察结果触发下载；目前还没有下载完成的回执，也不能据此确认内容。'
      const rejected = await check()
      expect(rejected.accepted).toBe(false)
      const repair = JSON.parse(rejected.repairContext!)
      expect(repair.data.scope).toBe('current-work-acknowledgment-only')
      expect(repair.data.responsibilities[0]).toMatchObject({ summary: '下载报告', work: { planId: plan.planId, canAttempt: true } })
      expect(repair.data.responsibilities[0].criteria).toEqual([{ id: 'download', required: true, proofScope: 'bytes', predicate: { kind: 'browser-download', stepId: 'click', minimumBytes: 1 } }])
      expect(repair.data).not.toHaveProperty('conversationTimeline')
      expect(new TextEncoder().encode(rejected.repairContext).length).toBeLessThanOrEqual(6000)
      const view = await db.readLifeState()
      const original = structuredClone(view)
      const contextInput = { view, turnId: 'request', text: quote, claims: [{ kind: 'task-acknowledgment', quote, binding: repair.data.responsibilities[0].binding, meaningMatchesBinding: true }], issues: rejected.issues, hasRequestedInterval: false }
      expect(currentWorkAcknowledgmentRepairContext(contextInput)).not.toBeNull()
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, hasRequestedInterval: true })).toBeNull()
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, turnId: 'another-request' })).toBeNull()
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, issues: [{ code: 'UNRELIABLE_REVIEW', quote }] })).toBeNull()
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, claims: [{ ...contextInput.claims[0], kind: 'task-complete' }] })).toBeNull()
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, claims: [{ ...contextInput.claims[0], binding: { ...contextInput.claims[0].binding, version: '999' } }] })).toBeNull()
      const oversized = structuredClone(view)
      oversized.obligations.find(item => item.threadId === plan.rootThreadId)!.summary = 'x'.repeat(2000)
      oversized.execution!.plans.find(item => item.id === plan.planId)!.steps[0].input.selector = 'x'.repeat(4096)
      expect(currentWorkAcknowledgmentRepairContext({ ...contextInput, view: oversized })).toBeNull()
      expect(view).toEqual(original)
      for (const bound of [true, false]) {
        binding = bound
        claimKind = bound ? 'task-acknowledgment' : 'task-complete'
        for (const admission of ['小艾已接收这份受管浏览器下载计划；', '小艾已接收这份独立浏览器下载计划；']) {
          quote = admission
          expect((await check()).accepted, `${bound}:${admission}`).toBe(true)
        }
        for (const other of ['小艾已接收这份授权浏览器下载计划；', '小艾已接收这份已授权浏览器下载计划；', '小艾已接收这份受管浏览器下载计划并上传文件。']) {
          quote = other
          expect((await check()).accepted, `${bound}:${other}`).toBe(false)
        }
        for (const admission of ['小艾已按参数提交工作计划，目前确认的是计划已受理，尚无步骤执行结果。', '工作计划已受理；这只表示计划已创建，不代表文件已写入或第二步已执行。', '这只表示下载计划已创建。', '目前确认的是计划已受理。', '小艾已按你给定的参数提交这项工作计划；', '我已按给定参数提交该工作计划。', '小艾已按原参数提交这份工作计划，系统已受理。', '我已按原始参数提交这份工作计划。', '系统已受理。', '小艾已提交这项本地工作计划，计划已受理。', '我已提交这项工作', '我已受理这份本地执行计划', '小艾已提交这份下载计划，', '我已提交这份下载计划。', '这份下载计划已经受理。']) {
          quote = admission
          expect((await check()).accepted, `${bound}:${admission}`).toBe(true)
        }
        for (const actual of ['这只表示文件已创建。', '这只表示计划已创建并保存了文件。', '这只表示计划没有创建。', '目前确认的是文件已受理。', '小澄已按参数提交工作计划。', '小澄已按原参数提交这份工作计划，系统已受理。', '小艾已按原参数提交这份工作计划，系统已完成。', '系统已受理并创建了文件。', '小艾已下载报告', '小艾已提交这份下载计划，文件已经下载完成', '小艾已提交这份下载计划并上传文件', '小澄已提交这份下载计划', '小艾已完成这份下载计划']) {
          quote = actual
          expect((await check()).accepted, actual).toBe(false)
        }
      }
      expect(currentExecutionWorkStateContradictions(view, 'request', '这只表示计划没有创建。', '小艾')).toHaveLength(1)
      expect(currentExecutionWorkAcknowledgment(view, 'request', '但目前还没有浏览器步骤的执行结果或网站回执')).not.toBeNull()
      expect(currentExecutionWorkAcknowledgment(view, 'another-request', '但目前还没有浏览器步骤的执行结果或网站回执')).toBeNull()
      for (const actual of ['但目前还没有浏览器步骤的执行结果或网站回执并已保存文件', '但目前还没有浏览器步骤的执行结果或网站回执但已完成上传', '但目前没有执行浏览器步骤', '网站没有生成回执'])
        expect(currentExecutionWorkAcknowledgment(view, 'request', actual)).toBeNull()
      for (const [turnId, text] of [['another-turn', '这只表示计划没有创建。'], ['request', '上次的计划没有创建。'], ['request', '文件计划没有创建。'], ['request', '不代表计划没有创建。']])
        expect(currentExecutionWorkStateContradictions(view, turnId, text, '小艾')).toEqual([])
      omitClaims = true
      quote = '这只表示计划没有创建。'
      const omittedContradiction = await check()
      expect(omittedContradiction.accepted).toBe(false)
      expect((await db.getLifeIngress(omittedContradiction.reviewId!))?.payload.contradictoryWorkStates).toEqual([expect.objectContaining({ quote: '这只表示计划没有创建', evidence: expect.objectContaining({ planId: plan.planId, planRevision: 1 }) })])
      omitClaims = false
      binding = false
      claimKind = 'task-acknowledgment'
      quote = '下载任务目前仍在进行，'
      // Admission alone cannot certify actual transfer activity.
      expect((await check()).accepted).toBe(false)
      quote = '下载任务目前仍在进行并已上传，'
      expect((await check()).accepted).toBe(false)
      quote = '下载结果和文件内容都还没有得到确认。'
      expect((await check()).accepted).toBe(true)
      for (const disclaimer of ['当前还不能确认文件已下载；', '下载回执也不等于主观确认。', '我目前还不能确认下载步骤是否已完成；', '下载回执也还不能代替你对报告的主观验收。', '计划已受理，但我目前还不能确认下载步骤是否已执行或完成。']) {
        quote = disclaimer
        expect((await check()).accepted, disclaimer).toBe(true)
      }
      for (const assertion of ['当前还不能确认文件已下载；文件已经保存了。', '下载回执也不等于主观确认，但我已下载完成。', '下载回执也不等于主观确认并且我会上传文件。', '当前还不能确认文件没有下载。', '当前文件没有下载。']) {
        quote = assertion
        expect((await check()).accepted, assertion).toBe(false)
      }
      claimKind = 'future-task'
      for (const pending of ['完成后再确认下载情况。', '下载完成后，', '我还不能确认下载是否完成；完成后我会如实告诉你。', '我目前还无法确认下载是否完成；下载完成后我会及时告知你下载结果。']) {
        quote = pending
        expect((await check()).accepted, pending).toBe(true)
      }
      for (const extra of ['完成后再确认下载情况并上传文件。', '下载完成后，我会上传报告。', '下载已经完成后，', '我已经下载完成后，', '我还不能确认下载是否完成；完成后我会通知其他人。', '我还不能确认下载是否完成；完成后我会告诉你并删除文件。', '小澄还不能确认下载是否完成；完成后我会如实告诉你。']) {
        quote = extra
        expect((await check()).accepted, extra).toBe(false)
      }
      quote = '下载后还需要你确认报告是否符合要求。'
      claimKind = 'task-acknowledgment'
      binding = true
      expect((await check()).accepted).toBe(true)
      quote = '下载完成后，'
      expect((await check()).accepted).toBe(true)
      quote = '下载后还需要你确认报告是否符合要求；我会上传报告。'
      expect((await check()).accepted).toBe(false)
      const observed = structuredClone(await db.readLifeState())
      const responsibility = observed.obligations.find(item => item.threadId === plan.rootThreadId)!
      responsibility.verification = { id: 'verified-download-contract', kind: 'composite', verifiedAt: Date.now(), verdict: 'satisfied', independent: true, evidence: { criteria: [{ id: 'download', verdict: 'satisfied' }] } }
      expect(currentExecutionWorkAcknowledgment(observed, 'request', '我还不能确认下载是否完成')).toBeNull()
      quote = '小艾已提交这份下载计划，'
      soulHash = 'superseded-soul'
      expect((await check()).accepted).toBe(false)
      soulHash = 'current-soul'
      await runtime.stop({ cardId: 'alice', planId: plan.planId, expectedRevision: 1, action: 'cancel', requestId: 'cancel' })
      expect((await check()).accepted).toBe(false)
      quote = '我还不能确认下载是否完成；完成后我会如实告诉你。'
      expect((await check()).accepted).toBe(false)
      expect((await db.readLifeState()).execution?.results).toEqual([])
      quote = '下载任务目前仍在进行，'
      expect((await check()).accepted).toBe(false)
    }
    finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
  })
})
