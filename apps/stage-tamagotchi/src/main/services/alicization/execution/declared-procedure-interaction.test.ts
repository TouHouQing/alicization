import type { ExecutionCriterion, WorkPlan } from '../../../../shared/execution-contracts'

import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { restoreDeclaredProcedureInvocation } from './declared-procedure-content'
import { procedureBrowserInteraction } from './procedure-browser-interaction'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'

const registry = createCanonicalToolRegistry()
const identity = { id: `skill.learned_${'a'.repeat(24)}`, version: 'b'.repeat(64) }

function fixture(uploading = true) {
  const path = join(tmpdir(), 'fresh-owned-form-receipt.txt')
  const steps: WorkPlan['steps'] = []
  const add = (id: string, capabilityId: string, input: Record<string, unknown>, inputBindings?: WorkPlan['steps'][number]['inputBindings']) => steps.push({ id, capabilityId, input, inputBindings, dependsOn: steps.length ? [steps.at(-1)!.id] : [], acceptanceCriterionIds: id === 'save' ? ['bytes'] : [], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null, inputHash: 'source' })
  const binding = (stepId: string, label: string) => [{ parameter: 'selector', stepId, path: ['elements'], select: { field: 'text', equals: label, valueField: 'selector' } }]
  add('open', 'tool.browser_open_url', { url: 'https://example.test/private-source' })
  add('read-field', 'tool.browser_read_page', { format: 'interactables' })
  add('fill', 'tool.browser_type_text', { selector: 'unused', text: 'Source-private text', clearExisting: true }, binding('read-field', 'Source field'))
  if (uploading) {
    add('read-upload', 'tool.browser_read_page', { format: 'interactables' })
    add('upload', 'tool.browser_upload_files', { selector: 'unused', files: [join(tmpdir(), 'source-private.txt')] }, binding('read-upload', 'Source upload'))
  }
  add('read-submit', 'tool.browser_read_page', { format: 'interactables' })
  add('submit', 'tool.browser_click_element', { selector: 'unused' }, binding('read-submit', 'Source submit'))
  add('wait', 'tool.browser_wait', { text: 'Source receipt', state: 'complete', timeoutMs: 10_000 })
  add('receipt', 'tool.browser_read_page', { format: 'text' })
  add('save', 'tool.filesystem_write_file', { path }, [{ parameter: 'content', stepId: 'receipt', path: ['content'] }])
  const plan: WorkPlan = { id: 'source', cardId: 'alice', rootThreadId: 'source-thread', rootObligationId: 'source-goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'source', sourceEvidenceRefs: [], steps }
  const criteria: ExecutionCriterion[] = [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: 'c'.repeat(64) } }]
  const template = compileProcedureTemplate(plan, criteria, registry)
  const profile = procedureBrowserInteraction(template)!
  const mapping = { url: 'http://127.0.0.1:50309/c09f6150-27fe-4017-9e36-72e4b34eb12e/fresh-1/form', targetPath: path, expectedSha256: 'd'.repeat(64), fields: [{ label: '第一栏 fresh 中文🙂', text: '原样的正文\r\n第二行 "引号"；。{} [0]' }], submitLabel: '记录本次选择', waitText: '本次回执', ...(uploading ? { uploadLabel: '本次附件', files: [join(tmpdir(), 'fresh-one.txt'), join(tmpdir(), 'fresh-two.txt')] } : {}) }
  const args: Record<string, unknown> = { [profile.urlParameter]: mapping.url, [profile.pathParameter]: path, [profile.hashParameter]: mapping.expectedSha256, [profile.fields[0].labelParameter]: mapping.fields[0].label, [profile.fields[0].textParameter]: mapping.fields[0].text, [profile.submitLabelParameter]: mapping.submitLabel, [profile.waitTextParameter]: mapping.waitText }
  if (uploading) {
    args[profile.uploads[0].labelParameter] = mapping.uploadLabel
    args[profile.uploads[0].filesParameter] = mapping.files
  }
  const request = (value: unknown = mapping, owner = identity) => `请找到 id=${owner.id}、version=${owner.version} 的已启用方法，再调用 life_use_learned_procedure，goal 必须为本次目标。根据公开参数的 kind、role 和 uses 填入下列本次参数。step3 的标签与正文用 fields[0]，文件路径取 files。\n${JSON.stringify(value)}`
  const resolve = (arguments_: Record<string, unknown>, text = request()) => restoreDeclaredProcedureInvocation(template, { goal: '本次目标', arguments: arguments_ }, text, identity)
  return { template, profile, mapping, args, request, resolve }
}

describe('explicit current interactive method mappings', () => {
  it.each([true, false])('restores the actual nonce transposition before browser dispatch, upload=%s', (uploading) => {
    const f = fixture(uploading)
    const changed = { ...f.args, [f.profile.urlParameter]: f.mapping.url.replace('9e36-72e4b34eb12e', '9e2e-7e18d46fb574') }
    const restored = f.resolve(changed)
    expect(restored.arguments[f.profile.urlParameter]).toBe(f.mapping.url)
    expect(restored.projection).toMatchObject({ fields: [`arguments.${f.profile.urlParameter}`], actionAdmitted: false })
    const proposal = instantiateProcedureTemplate(f.template, restored.arguments, registry, restored.goal)
    expect(proposal.steps[0].input.url).toBe(f.mapping.url)
    expect(proposal.steps[2].inputBindings![0].select!.equals).toBe(f.mapping.fields[0].label)
    expect(proposal.steps[2].input.selector).toBe('from-current-observation')
    expect(JSON.stringify(restored.projection)).not.toContain(f.mapping.url)
    expect(changed[f.profile.urlParameter]).not.toBe(f.mapping.url)
  })

  it('restores only complete explicit literal fields and attachment vectors while retaining the chosen destination', () => {
    const f = fixture()
    const changed = Object.fromEntries(Object.entries(f.args).map(([key, value]) => [key, key === f.profile.pathParameter ? value : Array.isArray(value) ? [join(tmpdir(), 'wrong-transcription.txt')] : key === f.profile.hashParameter ? 'e'.repeat(64) : key === f.profile.urlParameter ? 'https://example.test/mistyped' : 'Mistyped']))
    const restored = f.resolve(changed)
    expect(restored.arguments).toEqual(f.args)
    expect(f.resolve(restored.arguments).projection).toBeNull()
    expect(JSON.stringify(restored.projection)).not.toContain(f.mapping.fields[0].text)
  })

  it.each(['destination', 'field-count', 'method', 'version', 'extra-upload', 'duplicate-files', 'relative-file', 'extra-property', 'ambiguous'] as const)('refuses an explicit mapping with %s disagreement', (fault) => {
    const f = fixture(fault !== 'extra-upload')
    const mapping: Record<string, unknown> = structuredClone(f.mapping)
    if (fault === 'destination')
      mapping.targetPath = `${f.mapping.targetPath}.different`
    if (fault === 'field-count')
      mapping.fields = []
    if (fault === 'extra-upload') {
      mapping.uploadLabel = 'Unexpected upload'
      mapping.files = [join(tmpdir(), 'extra.txt')]
    }
    if (fault === 'duplicate-files')
      mapping.files = [join(tmpdir(), 'same.txt'), join(tmpdir(), 'same.txt')]
    if (fault === 'relative-file')
      mapping.files = ['relative.txt']
    if (fault === 'extra-property')
      mapping.script = 'not a supported mapping'
    const owner = { ...identity, ...(fault === 'method' ? { id: `skill.learned_${'f'.repeat(24)}` } : {}), ...(fault === 'version' ? { version: 'f'.repeat(64) } : {}) }
    const text = f.request(mapping, owner) + (fault === 'ambiguous' ? `\n${JSON.stringify(mapping)}` : '')
    expect(() => f.resolve(f.args, text)).toThrow(/PROCEDURE_INTERACTION_DECLARATION/u)
  })

  it('does not interpret quoted examples, nested objects or ordinary file content as a current mapping', () => {
    const f = fixture()
    const changed = { ...f.args, [f.profile.urlParameter]: 'https://example.test/keep-proposal' }
    for (const text of [f.request(JSON.stringify(f.mapping)), f.request({ quotedExample: f.mapping }), f.request([f.mapping]), f.request().replace('下列本次参数', '普通说明')])
      expect(f.resolve(changed, text)).toEqual({ goal: '本次目标', arguments: changed, projection: null })
  })
})
