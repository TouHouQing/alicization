import type { ExecutionCriterion, WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { restoreDeclaredProcedureContent, restoreDeclaredProcedureInvocation } from './declared-procedure-content'
import { compileProcedureTemplate, instantiateProcedureTemplate } from './procedure-template'

const registry = createCanonicalToolRegistry()
const methodIdentity = { id: 'skill.learned_owned', version: 'a'.repeat(64) }
const target = join(tmpdir(), 'declared-procedure-output.txt')
const source = join(tmpdir(), 'declared-procedure-input.txt')
const original = 'Original source-private example'
const plan: WorkPlan = { id: 'plan', cardId: 'alice', rootThreadId: 'source', rootObligationId: 'task:source', obligationGeneration: 1, revision: 1, acceptanceHash: 'not-used-by-compiler', sourceEvidenceRefs: [], steps: [
  { id: 'write', capabilityId: 'tool.filesystem_write_file', input: { path: target, content: original }, inputHash: 'source-hash', dependsOn: [], acceptanceCriterionIds: ['bytes'], resourceIds: [], retryMode: 'reconcile-first', state: 'pending', attemptId: null },
  { id: 'read', capabilityId: 'tool.filesystem_read_file', input: { path: source }, inputHash: 'source-hash', dependsOn: ['write'], acceptanceCriterionIds: [], resourceIds: [], retryMode: 'read-only', state: 'pending', attemptId: null },
] }
const criteria: ExecutionCriterion[] = [{ id: 'bytes', required: true, proofScope: 'bytes', predicate: { kind: 'file-bytes', path: target, sha256: createHash('sha256').update(original).digest('hex') } }]
const template = compileProcedureTemplate(plan, criteria, registry)
const arguments_ = (content: string) => Object.fromEntries(template.parameters.map(parameter => [parameter.name, parameter.role === 'content' ? content : parameter.name === (template.steps[0].input as { path: { $parameter: string } }).path.$parameter ? target : source]))
const requested = (content: string) => `write_file 的 path=${target}、content=${JSON.stringify(content)}；read_file 的 path=${source}。`

describe('declared learned-method content at the provider boundary', () => {
  it('restores the actually observed identifier transposition without changing targets, goal, operations or proof scope', () => {
    const expected = 'Fresh learned request 3 ef044e9b-bea2-4137-b1f9-e033460cfb09 中文🙂'
    const proposed = expected.replace('-bea2-', '-be2a-')
    const args = arguments_(proposed)
    const resolved = restoreDeclaredProcedureContent(template, args, requested(expected))
    expect(resolved.projection).toMatchObject({ version: 'declared-procedure-literal-content-v1', actionAdmitted: false })
    const result = instantiateProcedureTemplate(template, resolved.arguments, registry, 'The same goal')
    expect(result.steps[0].input).toEqual({ path: target, content: expected })
    expect(result.steps[1].input.path).toBe(source)
    expect(result.goal).toBe('The same goal')
    expect(result.criteria[0].predicate).toMatchObject({ kind: 'file-bytes', path: target, sha256: createHash('sha256').update(expected).digest('hex') })
    expect(args).toEqual(arguments_(proposed))
    expect(JSON.stringify(resolved.projection)).not.toContain(expected)
  })

  it.each(['', '中文🙂\n  trailing spaces  ', 'Quoted "value"; 路径。and punctuation、inside content', '\\literal\nnot a newline'])('copies exact quoted bytes for %j', (expected) => {
    const resolved = restoreDeclaredProcedureContent(template, arguments_('model transcription'), requested(expected))
    expect(instantiateProcedureTemplate(template, resolved.arguments, registry, 'Goal').steps[0].input.content).toBe(expected)
  })

  it.each(['wrong-write-target', 'wrong-read-target', 'ambiguous-content', 'unqualified-content', 'unquoted-content'] as const)('does not infer or rewrite %s requests', (fault) => {
    const content = 'New requested content'
    let request = requested(content)
    if (fault === 'wrong-write-target')
      request = request.replace(target, `${target}.other`)
    if (fault === 'wrong-read-target')
      request = request.replace(source, `${source}.other`)
    if (fault === 'ambiguous-content')
      request += `write_file 的 path=${target}、content="Different content"。`
    if (fault === 'unqualified-content')
      request = `path=${target}; content=${JSON.stringify(content)}; path=${source}`
    if (fault === 'unquoted-content')
      request = request.replace(JSON.stringify(content), content)
    const args = arguments_('Model content')
    expect(restoreDeclaredProcedureContent(template, args, request)).toEqual({ arguments: args, projection: null })
  })

  it('deduplicates identical declarations and preserves a matching invocation', () => {
    const args = arguments_('Correct')
    expect(restoreDeclaredProcedureContent(template, args, requested('Correct') + requested('Correct'))).toEqual({ arguments: args, projection: null })
  })

  it('keeps a literal mapping word inside ordinary file content', () => {
    const content = '保留这段文本。映射：这只是文件正文，不能当成网页参数。'
    const input = { goal: 'Keep the literal file', arguments: arguments_(content) }
    expect(restoreDeclaredProcedureInvocation(template, input, requested(content), methodIdentity)).toEqual({ ...input, projection: null })
  })

  it('restores the observed task-name transposition before the responsibility and its admission receipt exist', () => {
    const goal = 'QA 学习方法复用 06f37a0c-eec9-4314-9fd5-cf46c9f9903c'
    const input = { goal: goal.replace('-cf46c9f9903c', '-ccf46c9f9903'), arguments: arguments_('Correct') }
    const source = `${requested('Correct')}调用 life_use_learned_procedure，goal 必须为 ${goal}。只允许两个测试文件。`
    const restored = restoreDeclaredProcedureInvocation(template, input, source, methodIdentity)
    expect(restored.goal).toBe(goal)
    expect(restored.arguments).toEqual(input.arguments)
    expect(restored.projection).toMatchObject({ fields: ['goal'], actionAdmitted: false })
    expect(input.goal).not.toBe(goal)
    expect(restoreDeclaredProcedureInvocation(template, { goal, arguments: restored.arguments }, source, methodIdentity).projection).toBeNull()
  })

  it('restores a quoted goal with punctuation together with exact content and retains only hash metadata', () => {
    const goal = '整理：中文🙂；章节。和 "引号"'
    const source = `${requested('New bytes')}life_use_learned_procedure，goal=${JSON.stringify(goal)}。`
    const input = { goal: 'Paraphrased', arguments: arguments_('Wrong bytes') }
    const restored = restoreDeclaredProcedureInvocation(template, input, source, methodIdentity)
    expect(restored.goal).toBe(goal)
    expect(instantiateProcedureTemplate(template, restored.arguments, registry, restored.goal).steps[0].input.content).toBe('New bytes')
    expect(restored.projection?.fields).toEqual([expect.stringMatching(/^arguments\./u), 'goal'])
    expect(JSON.stringify(restored.projection)).not.toContain(goal)
  })

  it.each(['goal 必须为 different。', 'life_use_learned_procedure，goal="unterminated。', 'life_use_learned_procedure，goal 必须为 first。life_use_learned_procedure，goal 必须为 second。'])('preserves the supplied goal without one unambiguous qualified assignment: %s', (source) => {
    const input = { goal: 'Keep this goal', arguments: arguments_('Correct') }
    expect(restoreDeclaredProcedureInvocation(template, input, requested('Correct') + source, methodIdentity)).toEqual({ ...input, projection: null })
  })
})
