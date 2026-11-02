import type { ExecutionCriterion, WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { restoreDeclaredProcedureInvocation } from './declared-procedure-content'
import { procedurePageRoutes } from './procedure-page-routes'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'

const identity = { id: 'skill.learned_owned', version: 'a'.repeat(64) }
function fixture(count: number) {
  const criteria: ExecutionCriterion[] = []
  const plan: WorkPlan = { id: 'source', cardId: 'alice', rootThreadId: 'source-thread', rootObligationId: 'source-goal', obligationGeneration: 1, revision: 1, acceptanceHash: 'source', sourceEvidenceRefs: [], steps: [] }
  for (let index = 0; index < count; index++) {
    const path = join(tmpdir(), `original-page-${index}.txt`)
    criteria.push({ id: `bytes-${index}`, required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path, sha256: createHash('sha256').update(`Source ${index}`).digest('hex') } })
    const common = { resourceIds: [], retryMode: 'reconcile-first' as const, state: 'pending' as const, attemptId: null, inputHash: 'source' }
    plan.steps.push(
      { ...common, id: `open-${index}`, capabilityId: 'tool.browser_open_url', input: { url: `https://example.com/source-${index}` }, dependsOn: index ? [`save-${index - 1}`] : [], acceptanceCriterionIds: [] },
      { ...common, id: `read-${index}`, capabilityId: 'tool.browser_read_page', input: { format: 'text', maxChars: 12000 }, dependsOn: [`open-${index}`], acceptanceCriterionIds: [] },
      { ...common, id: `save-${index}`, capabilityId: 'tool.filesystem_write_file', input: { path }, inputBindings: [{ parameter: 'content', stepId: `read-${index}`, path: ['content'] }], dependsOn: [`read-${index}`], acceptanceCriterionIds: [`bytes-${index}`] },
    )
  }
  const registry = createCanonicalToolRegistry()
  const template = compileProcedureTemplate(plan, criteria, registry)
  const routes = procedurePageRoutes(template)!
  const mapping = routes.map((route, index) => ({ page: index + 1, navigationStep: route.openStepId, writeStep: route.writeStepId, criterion: `result${index + 1}`, url: `http://127.0.0.1:12345/7dff79b9-a265-44ce-9c90-23a66c0ca5b7/fresh-${index}`, path: join(tmpdir(), `fresh-page-${index}.txt`), sha256: createHash('sha256').update(`Fresh ${index}`).digest('hex') }))
  const arguments_: Record<string, unknown> = {}
  routes.forEach((route, index) => Object.assign(arguments_, { [route.urlParameter]: mapping[index].url.replace('-9c90-', '-9c-90-'), [route.pathParameter]: mapping[index].path, [route.hashParameter]: 'f'.repeat(64) }))
  const request = (rows: unknown = mapping, owner = identity) => `请调用已启用 id=${owner.id}、version=${owner.version}。映射：${JSON.stringify(rows)}。调用 life_use_learned_procedure，goal必须为新的明确任务。`
  return { registry, template, routes, mapping, arguments_, request }
}

describe('current host page mappings before learned-method admission', () => {
  it.each([2, 4])('restores an observed UUID transposition and each exact expected hash for %i independent pages', (count) => {
    const f = fixture(count)
    const original = structuredClone(f.arguments_)
    const input = { goal: '新的明确任务', arguments: f.arguments_ }
    const restored = restoreDeclaredProcedureInvocation(f.template, input, f.request(), identity)
    const proposal = instantiateProcedureTemplate(f.template, restored.arguments, f.registry, restored.goal)
    for (let index = 0; index < count; index++) {
      expect(proposal.steps[index * 3].input.url).toBe(f.mapping[index].url)
      expect(proposal.steps[index * 3 + 2].input.path).toBe(f.mapping[index].path)
      expect(proposal.criteria[index].predicate).toMatchObject({ sha256: f.mapping[index].sha256, path: f.mapping[index].path })
    }
    expect(f.arguments_).toEqual(original)
    expect(restored.projection?.fields).toHaveLength(count * 2)
    expect(restored.projection).toMatchObject({ actionAdmitted: false })
    expect(JSON.stringify(restored.projection)).not.toContain(f.mapping[0].url)
    expect(restoreDeclaredProcedureInvocation(f.template, { ...input, arguments: restored.arguments }, f.request(), identity).projection).toBeNull()
  })

  it.each(['foreign-method', 'foreign-version', 'wrong-target', 'wrong-navigation', 'wrong-criterion', 'missing-page', 'duplicate-page', 'extra-field', 'multiple-mappings', 'bad-json'] as const)('refuses %s without changing any proposed field', (fault) => {
    const f = fixture(2)
    let rows = structuredClone(f.mapping)
    let owner = identity
    if (fault === 'foreign-method')
      owner = { ...identity, id: 'skill.foreign' }
    if (fault === 'foreign-version')
      owner = { ...identity, version: 'b'.repeat(64) }
    if (fault === 'wrong-target')
      rows[0].path += '.unapproved'
    if (fault === 'wrong-navigation')
      rows[0].navigationStep = rows[1].navigationStep
    if (fault === 'wrong-criterion')
      rows[0].criterion = rows[1].criterion
    if (fault === 'missing-page')
      rows = rows.slice(0, 1)
    if (fault === 'duplicate-page')
      rows[1].page = rows[0].page
    let source = f.request(rows, owner)
    if (fault === 'extra-field')
      source = f.request([{ ...rows[0], content: 'Unbound page text' }, rows[1]])
    if (fault === 'multiple-mappings')
      source += f.request()
    if (fault === 'bad-json')
      source = source.replace('映射：[', '映射：[BROKEN')
    const original = structuredClone(f.arguments_)
    expect(() => restoreDeclaredProcedureInvocation(f.template, { goal: '新的明确任务', arguments: f.arguments_ }, source, identity)).toThrow('PROCEDURE_PAGE_DECLARATION')
    expect(f.arguments_).toEqual(original)
  })
})
