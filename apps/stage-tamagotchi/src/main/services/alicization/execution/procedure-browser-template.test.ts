import type { WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { describeProcedureParameters } from './procedure-parameters'
import { compileProcedureTemplate, instantiateProcedureTemplate, procedureInputSchema } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion } from './procedure-transfer-operations'

function example(url: string, text: string) {
  const path = join(tmpdir(), 'private-browser-copy.txt')
  const plan: WorkPlan = {
    id: 'private-plan',
    cardId: 'alice',
    rootThreadId: 'private-task',
    rootObligationId: 'task:private-task',
    obligationGeneration: 1,
    revision: 1,
    acceptanceHash: 'unused-by-template',
    sourceEvidenceRefs: ['private-input'],
    browserBinding: { kind: 'managed', id: 'private-browser-session' },
    steps: [
      { id: 'open', capabilityId: 'tool.browser_open_url', input: { url }, dependsOn: [], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'source-admission' },
      { id: 'read', capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: ['open'], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'source-admission' },
      { id: 'save', capabilityId: 'tool.filesystem_write_file', input: { path }, inputBindings: [{ parameter: 'content', stepId: 'read', path: ['content'] }], dependsOn: ['read'], acceptanceCriterionIds: ['bytes'], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'source-admission' },
    ],
  }
  const criteria = [{ id: 'bytes', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path, sha256: createHash('sha256').update(text).digest('hex') } }]
  return { plan, criteria }
}

function twoPages() {
  const first = example('https://example.com/private-page-a', 'Private first page')
  const second = example('https://example.org/private-page-b', 'Private second page')
  const target = join(tmpdir(), 'private-second-copy.txt')
  second.plan.steps = second.plan.steps.map(step => ({ ...step, id: `${step.id}-two`, dependsOn: step.dependsOn.map(id => `${id}-two`), acceptanceCriterionIds: step.acceptanceCriterionIds.map(id => `${id}-two`), ...(step.capabilityId === 'tool.filesystem_write_file' ? { input: { path: target } } : {}), ...(step.inputBindings ? { inputBindings: step.inputBindings.map(binding => ({ ...binding, stepId: `${binding.stepId}-two` })) } : {}) }))
  second.plan.steps[0].dependsOn = ['save']
  first.plan.steps.push(...second.plan.steps)
  first.criteria.push({ ...second.criteria[0], id: 'bytes-two', predicate: { ...second.criteria[0].predicate, path: target } })
  return first
}

describe('browser procedure transfer boundaries', () => {
  it('transfers two ordered page copies with separate fresh page, file and byte expectations', () => {
    const source = twoPages()
    const registry = createCanonicalToolRegistry()
    const template = compileProcedureTemplate(source.plan, source.criteria, registry)
    expect(procedureEvaluatorVersion(template)).toBe('browser-procedure-replay-v2')
    expect(procedureEvaluationCases(template)).toEqual(['different-input-1', 'different-input-2', 'invalid-arguments', 'interface-change', 'cancellation', 'page-1-changed', 'page-1-missing', 'page-2-changed', 'page-2-missing', 'page-results-swapped'])
    expect(template.parameters.filter(item => item.kind === 'url')).toHaveLength(2)
    expect(template.parameters.filter(item => item.kind === 'sha256')).toHaveLength(2)
    const described = describeProcedureParameters(template)
    const urls = described.filter(item => item.kind === 'url')
    expect(urls.map(item => item.uses)).toEqual([[{ kind: 'step', stepId: 'step1', operation: 'tool.browser_open_url', field: 'url' }], [{ kind: 'step', stepId: 'step4', operation: 'tool.browser_open_url', field: 'url' }]])
    const paths = described.filter(item => item.kind === 'path')
    expect(described.filter(item => item.kind === 'sha256').map(item => item.uses)).toEqual(paths.map((item, index) => [{ kind: 'criterion', criterionId: `result${index + 1}`, predicate: 'file-bytes', field: 'sha256', pathParameter: item.name, transform: 'value' }]))
    const schema = procedureInputSchema(template).properties as Record<string, { description: string }>
    expect(schema[urls[1].name].description).toContain('step4: tool.browser_open_url.url')
    expect(schema[described.filter(item => item.kind === 'sha256')[1].name].description).toContain(`result2: file-bytes.sha256 for file argument ${paths[1].name}`)
    urls[0].uses.splice(0)
    expect(describeProcedureParameters(template).find(item => item.name === urls[0].name)?.uses).toHaveLength(1)
    expect(JSON.stringify(template)).not.toMatch(/private-page|private-second|Private first|Private second/u)
    const args = Object.fromEntries(template.parameters.map(item => [item.name, item.kind === 'url' ? `https://example.net/${item.name}` : item.kind === 'path' ? join(tmpdir(), `fresh-${item.name}.txt`) : 'a'.repeat(64)]))
    const accepted = instantiateProcedureTemplate(template, args, registry, 'Copy these two fresh current pages')
    expect(accepted.steps.map(step => step.capabilityId)).toEqual(['tool.browser_open_url', 'tool.browser_read_page', 'tool.filesystem_write_file', 'tool.browser_open_url', 'tool.browser_read_page', 'tool.filesystem_write_file'])
    expect(accepted.steps[3].dependsOn).toEqual(['step3'])
    expect(accepted.steps[5].inputBindings).toEqual([{ parameter: 'content', stepId: 'step5', path: ['content'] }])
  })

  it('refuses ambiguous page order and missing or optional independent byte checks', () => {
    const registry = createCanonicalToolRegistry()
    const unordered = twoPages()
    unordered.plan.steps[3].dependsOn = []
    expect(() => compileProcedureTemplate(unordered.plan, unordered.criteria, registry)).toThrow('ordered')
    const missing = twoPages()
    missing.criteria.pop()
    missing.plan.steps[5].acceptanceCriterionIds = []
    expect(() => compileProcedureTemplate(missing.plan, missing.criteria, registry)).toThrow('independent byte')
    const optional = twoPages()
    optional.criteria[1].required = false
    expect(() => compileProcedureTemplate(optional.plan, optional.criteria, registry)).toThrow('independent byte')
  })

  it('keeps independent page and byte parameters when the source happened to reuse the same URL and bytes', () => {
    const registry = createCanonicalToolRegistry()
    const distinct = twoPages()
    const coincident = twoPages()
    coincident.plan.steps[3].input.url = coincident.plan.steps[0].input.url
    coincident.criteria[1].predicate.sha256 = coincident.criteria[0].predicate.sha256
    expect(compileProcedureTemplate(coincident.plan, coincident.criteria, registry)).toEqual(compileProcedureTemplate(distinct.plan, distinct.criteria, registry))
  })
  it('transfers an observed page-to-file workflow without retaining its private URL, session, text or target', () => {
    const registry = createCanonicalToolRegistry()
    const first = example('https://example.com/private-account?ticket=private-token', 'private page text')
    const second = example('https://example.org/different-page', 'a different page')
    const template = compileProcedureTemplate(first.plan, first.criteria, registry)
    expect(compileProcedureTemplate(second.plan, second.criteria, registry)).toEqual(template)
    for (const value of ['private-account', 'private-token', 'private-browser-session', 'private page text', 'private-browser-copy'])
      expect(JSON.stringify(template)).not.toContain(value)
    expect(template.parameters.map(parameter => parameter.kind)).toEqual(['url', 'path', 'sha256'])
    const proposal = instantiateProcedureTemplate(template, { input1: 'https://example.net/fresh', input2: join(tmpdir(), 'fresh-output.txt'), input3: 'a'.repeat(64) }, registry, 'Copy a currently requested page')
    expect(proposal.steps[0].input).toEqual({ url: 'https://example.net/fresh' })
    expect(proposal.steps[2].inputBindings).toEqual([{ parameter: 'content', stepId: 'step2', path: ['content'] }])
    expect(proposal).not.toHaveProperty('browserBinding')
    for (const url of ['file:///C:/private.txt', 'https://user:password@example.com/', 'https://example.com/\nheader'])
      expect(() => instantiateProcedureTemplate(template, { input1: url, input2: join(tmpdir(), 'fresh-output.txt'), input3: 'a'.repeat(64) }, registry, 'counterexample')).toThrow('input domain')
  })

  it.each([
    { format: 'html' },
    { format: 'interactables' },
    { format: 'text', maxChars: 1_000_000 },
    { format: 'text', browser: 'chrome' },
  ])('does not learn a read with unsupported selectors or oversized output: %j', (input) => {
    const source = example('https://example.com/', 'text')
    source.plan.steps[1].input = input
    expect(() => compileProcedureTemplate(source.plan, source.criteria, createCanonicalToolRegistry())).toThrow()
  })

  it('does not reinterpret an observation as authority for a future navigation target', () => {
    const source = example('https://example.com/', 'text')
    source.plan.steps[0].inputBindings = [{ parameter: 'url', stepId: 'read', path: ['content'] }]
    expect(() => compileProcedureTemplate(source.plan, source.criteria, createCanonicalToolRegistry())).toThrow()
  })
})
