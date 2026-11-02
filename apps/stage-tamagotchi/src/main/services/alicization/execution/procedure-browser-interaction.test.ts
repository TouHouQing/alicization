import type { ExecutionCriterion, WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { procedureBrowserInteraction } from './procedure-browser-interaction'
import { describeProcedureParameters } from './procedure-parameters'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion } from './procedure-transfer-operations'

function example() {
  const steps: WorkPlan['steps'] = []
  function add(id: string, capabilityId: string, input: Record<string, unknown>, inputBindings?: WorkPlan['steps'][number]['inputBindings']) {
    steps.push({ id, capabilityId, input, dependsOn: steps.length ? [steps.at(-1)!.id] : [], inputBindings, acceptanceCriterionIds: id === 'save' ? ['bytes'] : [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'unused' })
  }
  add('open', 'tool.browser_open_url', { url: 'https://example.com/private-account?secret=source-only' })
  add('controls', 'tool.browser_read_page', { format: 'interactables' })
  add('fill', 'tool.browser_type_text', { selector: 'element:old-private-id', text: '私人原始输入', clearExisting: true }, [{ parameter: 'selector', stepId: 'controls', path: ['elements'], select: { field: 'text', equals: '私人输入标签', valueField: 'selector' } }])
  add('submit-controls', 'tool.browser_read_page', { format: 'interactables' })
  add('submit', 'tool.browser_click_element', { selector: 'element:another-old-id' }, [{ parameter: 'selector', stepId: 'submit-controls', path: ['elements'], select: { field: 'text', equals: '私人提交标签', valueField: 'selector' } }])
  add('wait', 'tool.browser_wait', { text: '私人回执内容', state: 'complete', timeoutMs: 10_000 })
  add('receipt', 'tool.browser_read_page', { format: 'text' })
  const path = join(tmpdir(), 'private-form-receipt.txt')
  add('save', 'tool.filesystem_write_file', { path }, [{ parameter: 'content', stepId: 'receipt', path: ['content'] }])
  const plan: WorkPlan = { id: 'source', cardId: 'alice', rootThreadId: 'source-thread', rootObligationId: 'source-goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'source-hash', sourceEvidenceRefs: ['source-input'], browserBinding: { kind: 'managed', id: 'private-session' }, steps }
  const criteria: ExecutionCriterion[] = [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update('私人回执内容').digest('hex') } }]
  return { plan, criteria }
}

describe('interactive method transfer boundaries', () => {
  it('compiles fresh label/input/page/result arguments without keeping private examples or element IDs', () => {
    const source = example()
    const registry = createCanonicalToolRegistry()
    const template = compileProcedureTemplate(source.plan, source.criteria, registry)
    expect(procedureEvaluatorVersion(template)).toBe('browser-interaction-replay-v1')
    expect(procedureEvaluationCases(template)).toEqual(['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation', 'page-changed', 'page-missing', 'control-missing', 'control-ambiguous', 'submission-refused'])
    const profile = procedureBrowserInteraction(template)!
    expect(profile.fields).toHaveLength(1)
    const serialized = JSON.stringify(template)
    expect(serialized).not.toMatch(/private-account|source-only|私人|old-private|another-old|private-session|private-form/u)
    const args = { [profile.urlParameter]: 'https://example.org/new-form', [profile.fields[0].labelParameter]: '新的字段', [profile.fields[0].textParameter]: '新值 中文🙂', [profile.submitLabelParameter]: '提交新任务', [profile.waitTextParameter]: '新回执', [profile.pathParameter]: join(tmpdir(), 'new-receipt.txt'), [profile.hashParameter]: 'a'.repeat(64) }
    const proposal = instantiateProcedureTemplate(template, args, registry, 'Fill the fresh form and save its observed receipt')
    expect(proposal.steps[2].input).toEqual({ text: '新值 中文🙂', clearExisting: true, selector: 'from-current-observation' })
    expect(proposal.steps[2].inputBindings).toEqual([{ parameter: 'selector', stepId: 'step2', path: ['elements'], select: { field: 'text', equals: '新的字段', valueField: 'selector' } }])
    expect(describeProcedureParameters(template).find(item => item.name === profile.fields[0].labelParameter)?.uses).toEqual([{ kind: 'step', stepId: 'step3', operation: 'tool.browser_type_text', field: 'inputBindings.selector.select.equals' }])
    expect(proposal).not.toHaveProperty('browserBinding')
  })

  it.each(['authored-selector', 'stale-observation', 'ambiguous-binding', 'implicit-submit', 'unbounded-wait', 'unordered', 'optional-result', 'wrong-output-source'] as const)('refuses %s before candidate admission', (fault) => {
    const source = example()
    if (fault === 'authored-selector')
      source.plan.steps[2].inputBindings = []
    if (fault === 'stale-observation')
      source.plan.steps[4].inputBindings![0].stepId = 'controls'
    if (fault === 'ambiguous-binding')
      source.plan.steps[2].inputBindings![0].select!.field = 'role'
    if (fault === 'implicit-submit')
      source.plan.steps[2].input.submit = true
    if (fault === 'unbounded-wait')
      source.plan.steps[5].input.timeoutMs = 60_000
    if (fault === 'unordered')
      source.plan.steps[3].dependsOn = []
    if (fault === 'optional-result')
      source.criteria[0].required = false
    if (fault === 'wrong-output-source')
      source.plan.steps[7].inputBindings![0].stepId = 'controls'
    expect(() => compileProcedureTemplate(source.plan, source.criteria, createCanonicalToolRegistry())).toThrow()
  })
})
