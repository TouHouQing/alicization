import type { LifeStateView } from '../../../../shared/life-contracts'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import { createLifeReplyGroundingRuntime } from '../life-reply-grounding-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { withActionDispatch } from './action-dispatch-context'
import { declaredWorkProposal } from './declared-work-proposal'
import { createExecutionResourceBroker } from './resource-broker'
import { acceptedWorkPlanAdmissions } from './work-plan-admission'
import { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'
import { createWorkPlanToolSpec } from './work-plan-tool'

it.each(['inline', 'reference', 'literal'])('binds the actual dispatched plan-tool receipt to its current responsibility without certifying its steps: %s', async (mode) => {
  const root = await mkdtemp(join(tmpdir(), 'life-plan-admission-'))
  const db = await setupAlicizationDb(root, { cardId: 'alice' })
  const broker = createExecutionResourceBroker()
  const write = vi.fn()
  const runtime = createWorkPlanExecutionRuntime({ getDatabase: () => db, enabled: () => true, canContinue: () => false, broker, interrupts: createExecutionInterruptRegistry(broker), tools: { 'tool.filesystem_write_file': write }, onError: () => {} })
  try {
    const signal = new AbortController().signal
    const life = createLifeTurnRuntime({ read: db.readLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, commit: db.commitLifeState, now: Date.now })
    await db.commitLifeState({ cardId: 'alice', operationKey: 'current-soul', changes: [{ owner: 'soul', key: 'life:soul-active', value: JSON.stringify({ contentHash: 'current-soul', soulRevision: 1 }) }] })
    const spec = createWorkPlanToolSpec(input => runtime.propose({ ...input, cardId: 'alice', turnId: 'request' }))
    const parameters = spec.parameters.parse({ goal: '保存报告', criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: join(root, 'report.txt'), includes: ['报告'] } }, { id: 'review', required: true, proofScope: 'user-reported', predicate: { kind: 'user-review', question: '报告符合要求吗？', artifactIds: ['file'] } }], steps: [{ id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path: join(root, 'report.txt'), content: '报告' }, dependsOn: [], acceptanceCriterionIds: ['file'] }] })
    if (mode === 'literal') {
      Object.assign(parameters.criteria[0], { predicate: { kind: 'file-content', path: join(root, 'report.txt'), content: '报告' }, proofScope: 'bytes' })
    }
    const source = JSON.stringify(parameters)
    await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: source }] }, signal)
    const reference = { sourceInputId: 'user:request', proposalHash: declaredWorkProposal(source)!.hash }
    const invocation = mode === 'reference' ? reference : parameters
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'actual-tool-call', capabilityId: `tool.${spec.name}`, parameters: invocation, effectContract: createCanonicalToolRegistry().resolveActive(`tool.${spec.name}`)!.effects }, signal)
    await action.authorizeDispatch(invocation)
    const output = await withActionDispatch(action.assertDispatchCurrent, () => mode === 'reference' ? runtime.proposeDeclared({ ...reference, cardId: 'alice', turnId: 'request', abortSignal: signal }) : spec.execute(parameters, { abortSignal: signal })) as { planId: string }
    await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output, interrupted: false })
    await vi.waitFor(() => expect(runtime.isActive()).toBe(false))
    const current = await db.readLifeState()
    expect(acceptedWorkPlanAdmissions(current, 'request')).toHaveLength(1)
    const reject = (mutate: (view: LifeStateView) => void) => {
      const view = structuredClone(current)
      mutate(view)
      expect(acceptedWorkPlanAdmissions(view, 'request')).toEqual([])
    }
    const effect = (view: LifeStateView) => view.effects.find(item => item.id === action.id)!
    reject(view => effect(view).status = 'uncertain')
    reject(view => effect(view).turnId = 'foreign-turn')
    reject(view => effect(view).payload.capabilityId = 'tool.filesystem_write_file')
    reject(view => (effect(view).payload.parameters as Record<string, unknown>).goal = 'another goal')
    reject(view => (effect(view).payload.parameters as Record<string, unknown>).steps = [])
    reject(view => (effect(view).receipt!.output as Record<string, unknown>).status = 'completed')
    reject(view => (effect(view).receipt!.output as Record<string, unknown>).planId = 'another-plan')
    reject(view => view.execution!.plans[0].sourceEvidenceRefs = [])
    reject(view => view.execution!.contracts[0].sourceInputIds = [])
    reject(view => view.obligations[0].generation++)
    reject(view => view.cardId = 'another-card')
    reject(view => view.ingress.find(item => item.id === 'user:request')!.status = 'held')
    let quote = '小艾已按你给定的参数提交工作计划，目前只是已受理，尚不能确认文件已写入或步骤已完成。'
    let bindingMode = 'actual'
    let matches = true
    let claimKind = 'task-acknowledgment'
    const review = createLifeReplyGroundingRuntime({ readSpeakerIdentity: () => ({ name: '小艾', soulHash: 'current-soul' }), read: db.readLifeState, getEffect: db.getLifeEffect, readUserInput: db.getLifeUserInput, readMemoryEvidence: cardId => db.readLifeFactVersions({ cardId }), commit: db.commitLifeState, now: Date.now, generate: async ({ user }) => {
      const offered = JSON.parse(user).acceptedWorkPlanAdmissions[0]
      const binding = bindingMode === 'actual' ? offered?.binding ?? { kind: 'effect', id: action.id, version: '1' } : bindingMode === 'wrong-version' ? { ...offered.binding, version: '999' } : { kind: 'effect', id: 'foreign-effect', version: '1' }
      expect(JSON.stringify(offered ?? {})).not.toContain(root)
      return JSON.stringify({ claims: [{ kind: claimKind, quote, binding, meaningMatchesBinding: matches }] })
    } })
    const check = async () => review({ cardId: 'alice', turnId: 'request', text: quote, owners: (await db.readLifeState()).owners, signal })
    const accepted = await check()
    expect(accepted.accepted).toBe(true)
    expect(JSON.stringify((await db.getLifeIngress(accepted.reviewId!))?.payload.locallyBoundWorkPlanAdmissions)).toContain(action.id)
    for (const kind of ['execution-step-outcome', 'task-complete', 'execution-step-complete']) {
      claimKind = kind
      quote = '小艾已提交这份工作计划；'
      expect((await check()).accepted, kind).toBe(true)
      quote = '小艾已提交这份工作计划并创建文件；'
      expect((await check()).accepted, kind).toBe(false)
      quote = '小艾已提交这份工作计划；'
      bindingMode = 'wrong-version'
      expect((await check()).accepted, kind).toBe(false)
      bindingMode = 'actual'
    }
    claimKind = 'task-acknowledgment'
    quote = '已按给定参数提交本地工作计划，计划已受理。'
    expect((await check()).accepted).toBe(true)
    quote = '小澄已按给定参数提交本地工作计划，计划已受理。'
    expect((await check()).accepted).toBe(false)
    quote = '我会等工作进展页面的执行结果和验收；'
    expect((await check()).accepted).toBe(true)
    for (const mode of ['foreign', 'wrong-version']) {
      bindingMode = mode
      expect((await check()).accepted).toBe(false)
    }
    bindingMode = 'actual'
    matches = false
    expect((await check()).accepted).toBe(false)
    matches = true
    for (const extra of ['文件已写入', '我已完成所有步骤', '我会上传文件', '小澄已按你给定的参数提交工作计划']) {
      quote = `我已提交工作计划，${extra}。`
      expect((await check()).accepted, quote).toBe(false)
    }
    await runtime.stop({ cardId: 'alice', planId: output.planId, expectedRevision: 1, action: 'cancel', requestId: 'host-cancel' })
    quote = '我已提交工作计划。'
    expect((await check()).accepted).toBe(false)
    expect(write).not.toHaveBeenCalled()
    expect((await db.readLifeState()).execution!.results).toEqual([])
  }
  finally { await runtime.dispose(); await db.close(); await rm(root, { recursive: true, force: true }) }
})
