import type { LifeStateView } from '../../../../shared/life-contracts'

import process from 'node:process'

import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { compileTaskAcceptance } from './acceptance-compiler'
import { acceptedProcedureInvocations, groundedProcedureInvocation } from './procedure-invocation-acknowledgment'
import { currentWorkAdmissionRepairContext } from './work-acknowledgment-repair-context'

function fixture() {
  const files = [join(process.cwd(), 'owned-first.txt'), join(process.cwd(), 'owned-second.txt')]
  const target = join(process.cwd(), 'owned-receipt.txt')
  const version = 'b'.repeat(64)
  const parameters = { id: `skill.learned_${'a'.repeat(24)}`, version, goal: 'Save the independently verified upload receipt', arguments: [{ name: 'input1', value: files }, { name: 'input2', value: target }] }
  const acceptance = compileTaskAcceptance({ cardId: 'alice', rootObligationId: 'current-goal', obligationGeneration: 1, revision: 1, sourceInputIds: ['user:current'], criteria: [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: target, sha256: 'c'.repeat(64) } }], permittedResourceIds: [], permittedEffectPolicyId: 'local-default-risk-v1', stopConditions: ['source-withdrawn'] })
  const view: LifeStateView = {
    cardId: 'alice',
    revision: 1,
    owners: [],
    values: {},
    soulActivations: [],
    ingress: [{ id: 'user:current', kind: 'user-turn', source: 'chat', sourceKey: 'current', payloadHash: 'input-hash', payload: {}, occurredAt: 1, observedAt: 1, status: 'processing' }],
    effects: [{ id: 'current-method-effect', operationKey: 'current', kind: 'execute', turnId: 'current', actionId: 'use', generation: 0, status: 'settled', payload: { capabilityId: 'tool.life_use_learned_procedure', parameters }, receipt: { outcome: 'success', output: { status: 'accepted', planId: 'current-plan', rootThreadId: 'current-thread' } }, leaseUntil: null }],
    obligations: [{ cardId: 'alice', id: 'current-goal', generation: 1, revision: 1, kind: 'task', summary: parameters.goal, status: 'accepted', sourceTurnId: 'current', deliveryTurnId: null, dueAt: null, timezone: null, threadId: 'current-thread', scheduledTaskId: null, proof: { kind: 'composite', acceptance }, receiptId: null, createdAt: 1, updatedAt: 1, procedureSource: { candidateId: `procedure:${version}`, version } }],
    execution: { contracts: [acceptance], plans: [{ id: 'current-plan', cardId: 'alice', rootThreadId: 'current-thread', rootObligationId: 'current-goal', obligationGeneration: 1, revision: 1, acceptanceHash: acceptance.contractHash, sourceEvidenceRefs: ['user:current'], steps: [{ id: 'upload', capabilityId: 'tool.browser_upload_files', input: { files }, dependsOn: [], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'upload-hash' }] }], results: [], slices: [] },
  }
  return { view, parameters, question: JSON.stringify(parameters) }
}

describe('list-valued method admission evidence', () => {
  it('retains an accepted upload vector as admission evidence and offers repair without certifying delivery', () => {
    const f = fixture()
    const invocations = acceptedProcedureInvocations(f.view, 'current')
    expect(invocations).toHaveLength(1)
    expect(invocations[0].values).toEqual([...f.parameters.arguments[0].value, f.parameters.arguments[1].value])
    expect(groundedProcedureInvocation(invocations, { question: f.question, quote: '方法调用已受理。', binding: invocations[0].binding })?.scope).toBe('accepted-method-invocation-only-no-step-or-goal-completion')
    const quote = '已按指定方法提交参数，相关工作已接受。'
    const repair = currentWorkAdmissionRepairContext({ view: f.view, turnId: 'current', text: quote, claims: [{ kind: 'task-acknowledgment', quote, binding: invocations[0].binding, meaningMatchesBinding: true }], issues: [{ code: 'UNBOUND_OBLIGATION', quote }], hasRequestedInterval: false })
    expect(repair).toContain('方法调用已受理。')
    expect(repair).not.toContain(f.parameters.arguments[0].value[0])
    for (const unsafe of ['文件已经上传。', '方法调用已受理，网站已经收到附件。', '方法调用已受理，我会删除文件。'])
      expect(groundedProcedureInvocation(invocations, { question: f.question, quote: unsafe, binding: invocations[0].binding })).toBeNull()
    expect(f.view.execution?.results).toEqual([])
    expect(f.view.obligations[0].status).toBe('accepted')
  })

  it.each(['source', 'effect', 'plan', 'version', 'generation', 'cancelled'] as const)('refuses a list invocation with changed %s ownership', (fault) => {
    const { view, parameters } = fixture()
    if (fault === 'source')
      view.ingress[0].status = 'held'
    if (fault === 'effect')
      view.effects[0].turnId = 'another-turn'
    if (fault === 'plan')
      view.execution!.plans[0].sourceEvidenceRefs = []
    if (fault === 'version')
      parameters.version = 'd'.repeat(64)
    if (fault === 'generation')
      view.obligations[0].generation++
    if (fault === 'cancelled')
      view.obligations[0].status = 'cancelled'
    expect(acceptedProcedureInvocations(view, 'current')).toEqual([])
  })

  it.each([42, {}, [['nested']], ['x'.repeat(4097)], Array.from({ length: 513 }, () => 'x')])('refuses values outside the public bounded list contract: %j', (value) => {
    const { view } = fixture()
    const parameters = view.effects[0].payload.parameters as Record<string, unknown>
    parameters.arguments = [{ name: 'input1', value }]
    expect(acceptedProcedureInvocations(view, 'current')).toEqual([])
  })

  it('keeps public argument-count bounds and refuses duplicate names', () => {
    const { view } = fixture()
    const parameters = view.effects[0].payload.parameters as Record<string, unknown>
    parameters.arguments = Array.from({ length: 64 }, (_, index) => ({ name: `input${index + 1}`, value: ['current'] }))
    expect(acceptedProcedureInvocations(view, 'current')).toHaveLength(1)
    parameters.arguments = Array.from({ length: 65 }, (_, index) => ({ name: `input${index + 1}`, value: ['current'] }))
    expect(acceptedProcedureInvocations(view, 'current')).toEqual([])
    parameters.arguments = [{ name: 'input1', value: ['current'] }, { name: 'input1', value: 'duplicate' }]
    expect(acceptedProcedureInvocations(view, 'current')).toEqual([])
  })
})
