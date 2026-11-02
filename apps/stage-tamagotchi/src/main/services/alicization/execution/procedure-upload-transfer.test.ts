import type { ExecutionCriterion, WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { procedureBrowserInteraction } from './procedure-browser-interaction'
import { compileProcedureTemplate, instantiateProcedureTemplate, procedureInputSchema } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion, procedureRequiredPermissions } from './procedure-transfer-operations'

function source() {
  const path = join(tmpdir(), 'private-upload-receipt.txt')
  const steps: WorkPlan['steps'] = []
  const add = (id: string, capabilityId: string, input: Record<string, unknown>, inputBindings?: WorkPlan['steps'][number]['inputBindings']) => {
    steps.push({ id, capabilityId, input, inputBindings, dependsOn: steps.length ? [steps.at(-1)!.id] : [], acceptanceCriterionIds: id === 'save' ? ['bytes'] : [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'unused' })
  }
  add('open', 'tool.browser_open_url', { url: 'https://example.test/private-upload?secret=original' })
  add('controls', 'tool.browser_read_page', { format: 'interactables' })
  add('select', 'tool.browser_upload_files', { selector: 'private-element', files: [join(tmpdir(), 'private-customer-document.txt')] }, [{ parameter: 'selector', stepId: 'controls', path: ['elements'], select: { field: 'text', equals: '私人附件', valueField: 'selector' } }])
  add('submit-controls', 'tool.browser_read_page', { format: 'interactables' })
  add('submit', 'tool.browser_click_element', { selector: 'private-submit' }, [{ parameter: 'selector', stepId: 'submit-controls', path: ['elements'], select: { field: 'text', equals: '私人提交', valueField: 'selector' } }])
  add('wait', 'tool.browser_wait', { text: '私人回执', state: 'complete', timeoutMs: 10_000 })
  add('receipt', 'tool.browser_read_page', { format: 'text' })
  add('save', 'tool.filesystem_write_file', { path }, [{ parameter: 'content', stepId: 'receipt', path: ['content'] }])
  const plan: WorkPlan = { id: 'source', cardId: 'alice', rootThreadId: 'source-thread', rootObligationId: 'source-goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'source-hash', sourceEvidenceRefs: ['source-input'], browserBinding: { kind: 'managed', id: 'private-session' }, steps }
  const criteria: ExecutionCriterion[] = [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update('private source receipt').digest('hex') } }]
  return { plan, criteria }
}

describe('learned upload transaction', () => {
  it('requires fresh file arguments and an independent server receipt without retaining private examples', () => {
    const registry = createCanonicalToolRegistry()
    const original = source()
    const template = compileProcedureTemplate(original.plan, original.criteria, registry)
    const interaction = procedureBrowserInteraction(template)!
    expect(procedureEvaluatorVersion(template)).toBe('browser-upload-replay-v1')
    expect(procedureEvaluationCases(template)).toContain('upload-changed-bytes')
    expect(procedureRequiredPermissions(template, registry)).toContain('network.write')
    expect(JSON.stringify(template)).not.toMatch(/private|私人|customer/u)
    expect(interaction.uploads).toHaveLength(1)
    const upload = interaction.uploads[0]
    const args = { [interaction.urlParameter]: 'https://example.org/new-upload', [upload.labelParameter]: '新的附件', [upload.filesParameter]: [join(tmpdir(), 'fresh-one.txt'), join(tmpdir(), 'fresh-two.txt')], [interaction.submitLabelParameter]: '发送', [interaction.waitTextParameter]: '收到', [interaction.pathParameter]: join(tmpdir(), 'fresh-receipt.txt'), [interaction.hashParameter]: 'a'.repeat(64) }
    const expanded = instantiateProcedureTemplate(template, args, registry, 'Submit fresh files and verify the received bytes')
    expect(expanded.steps[2].input.files).toEqual(args[upload.filesParameter])
    expect(expanded.steps[2].inputBindings![0].select!.equals).toBe('新的附件')
    expect((procedureInputSchema(template).properties as Record<string, unknown>)[upload.filesParameter]).toMatchObject({ type: 'array', minItems: 1, maxItems: 4 })
    for (const files of [[], ['relative.txt'], Array.from({ length: 5 }, () => join(tmpdir(), 'too-many.txt')), [join(tmpdir(), 'same.txt'), join(tmpdir(), 'same.txt')]])
      expect(() => instantiateProcedureTemplate(template, { ...args, [upload.filesParameter]: files }, registry, 'invalid upload')).toThrow()
  })

  it.each(['retained-selector', 'old-observation', 'no-server-receipt', 'file-list-from-page'] as const)('refuses %s', (fault) => {
    const original = source()
    if (fault === 'retained-selector')
      original.plan.steps[2].inputBindings = []
    if (fault === 'old-observation')
      original.plan.steps[4].inputBindings![0].stepId = 'controls'
    if (fault === 'no-server-receipt')
      original.plan.steps.splice(3, 4)
    if (fault === 'file-list-from-page')
      original.plan.steps[2].inputBindings!.push({ parameter: 'files', stepId: 'controls', path: ['files'] })
    expect(() => compileProcedureTemplate(original.plan, original.criteria, createCanonicalToolRegistry())).toThrow()
  })
})
