import type { LifeStateView } from '../../../../shared/life-contracts'

import { isAbsolute } from 'node:path'

import { withoutEvidenceScopeDisclaimers } from '../life-reply-claim-scope'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { executionDigest } from './acceptance-compiler'
import { executionWorkAcknowledgment, executionWorkAcknowledgmentPhaseMatches } from './work-acknowledgment'
import { workAcknowledgmentClause } from './work-acknowledgment-language'

interface Binding { kind: string, id: string, version: string }
let invocationRegistry: ReturnType<typeof createCanonicalToolRegistry> | undefined

/** An accepted method call is distinct from its later operations and goal proof. */
export function acceptedProcedureInvocations(view: LifeStateView, turnId: string) {
  const source = `user:${turnId}`
  if (!view.ingress.some(item => item.id === source && item.kind === 'user-turn' && ['accepted', 'processing'].includes(item.status)))
    return []
  return view.effects.flatMap((effect) => {
    if (effect.kind !== 'execute' || effect.turnId !== turnId || effect.status !== 'settled' || effect.receipt?.outcome !== 'success' || effect.payload.capabilityId !== 'tool.life_use_learned_procedure')
      return []
    const parameters = effect.payload.parameters as Record<string, unknown> | undefined
    const output = effect.receipt.output as Record<string, unknown> | undefined
    if (!parameters || !output || output.status !== 'accepted' || typeof parameters.id !== 'string' || !/^skill\.learned_[a-f\d]{24}$/u.test(parameters.id) || typeof parameters.version !== 'string' || typeof parameters.goal !== 'string' || !(invocationRegistry ??= createCanonicalToolRegistry()).validateInput('tool.life_use_learned_procedure', parameters).valid)
      return []
    // Read the same bounded scalar/list contract as dispatch. Upload vectors
    // are admission facts, never evidence that their files were delivered.
    const arguments_ = parameters.arguments as Array<{ name: string, value: string | string[] }>
    if (new Set(arguments_.map(item => item.name)).size !== arguments_.length)
      return []
    const plan = view.execution?.plans.find(item => item.id === output.planId && item.rootThreadId === output.rootThreadId && item.sourceEvidenceRefs.includes(source))
    const goal = plan && view.obligations.find(item => item.id === plan.rootObligationId && item.generation === plan.obligationGeneration && !item.invalidatedBy && !['cancelled', 'superseded'].includes(item.status))
    if (!plan || !goal || goal.proof.acceptance?.contractHash !== plan.acceptanceHash || !goal.proof.acceptance.sourceInputIds.includes(source) || goal.procedureSource?.candidateId !== `procedure:${parameters.version}` || goal.procedureSource.version !== parameters.version || goal.summary !== parameters.goal)
      return []
    const values = arguments_.flatMap(item => item.value)
    const paths = [...new Set(plan.steps.flatMap(step => step.capabilityId.startsWith('tool.filesystem_') && typeof step.input.path === 'string' && isAbsolute(step.input.path) ? [step.input.path] : []))]
    const contents = plan.steps.flatMap(step => step.capabilityId === 'tool.filesystem_write_file' && typeof step.input.content === 'string' ? [step.input.content] : [])
    const fileOperations = plan.steps.length > 0 && paths.length > 0 && plan.steps.every(step => typeof step.input.path === 'string' && isAbsolute(step.input.path)
      && (step.capabilityId === 'tool.filesystem_read_file' || (step.capabilityId === 'tool.filesystem_write_file' && typeof step.input.content === 'string')))
      ? { fileCount: paths.length, operations: [...new Set(plan.steps.map(step => step.capabilityId === 'tool.filesystem_write_file' ? '写入' : '读取'))] }
      : null
    return [{ binding: { kind: 'effect' as const, id: effect.id, version: String(effect.generation) }, responsibility: { kind: 'obligation' as const, id: goal.id, version: String(goal.generation) }, id: parameters.id, version: parameters.version, planId: plan.id, planRevision: plan.revision, parametersHash: executionDigest(parameters), executionAcknowledgment: executionWorkAcknowledgment(view, goal), values, paths, contents, fileOperations, scope: 'accepted-method-invocation-only-no-step-or-goal-completion' }]
  })
}

export function groundedProcedureInvocation(invocations: ReturnType<typeof acceptedProcedureInvocations>, input: { quote: string, question: string, binding: Binding | null }) {
  const clauses = withoutEvidenceScopeDisclaimers(input.quote, false).split(/[，,。.!！?？;；\n]+/u).map(part => part.trim()).filter(Boolean)
  if (!clauses.length)
    return null
  const matches = invocations.filter((invocation) => {
    if (input.binding && ![invocation.binding, invocation.responsibility].some(binding => binding.kind === input.binding!.kind && binding.id === input.binding!.id && binding.version === input.binding!.version))
      return false
    const inRequest = (value: string) => input.question.includes(value) || input.question.includes(JSON.stringify(value).slice(1, -1))
    const specified = inRequest(invocation.id) && inRequest(invocation.version)
    const suppliedParameters = specified && invocation.values.every(value => value.length > 0 && inRequest(value)) && [...invocation.paths, ...invocation.contents].every(value => invocation.values.includes(value))
    let methodReferenceSeen = false
    return clauses.every((clause) => {
      if (/^(?:我|我们)?(?:先|已|已经)?(?:查到|找到)了?指定的?(?:已启用的?)?(?:方法|技能)$/u.test(clause)) {
        methodReferenceSeen = specified
        return specified
      }
      if (/^(?:并|并且)?(?:按参数)?(?:调用|使用)了?它$/u.test(clause))
        return methodReferenceSeen && suppliedParameters
      if (/^(?:我|我们)?(?:已|已经)(?:按|按照)指定的?(?:方法|技能)和参数提交$/u.test(clause))
        return suppliedParameters
      if (/^(?:(?:方法|技能)(?:调用)?|调用)(?:已|已经)(?:受理|接受)$/u.test(clause))
        return true
      if (/^系统(?:已|已经)(?:受理|接受|接收)$/u.test(clause))
        return specified
      if (/^(?:我|我们)?(?:已|已经)(?:找到并)?(?:调用|使用)了?指定(?:方法|技能)$/u.test(clause))
        return specified
      if (/^(?:我|我们)?(?:先|已|已经)?(?:找到|查到)并(?:调用|使用)了?指定(?:版本)?的?(?:已启用的?)?(?:方法|技能)$/u.test(clause))
        return specified
      const fileWork = clause.match(/^(?:已|已经)?(?:按(?:对应|相应)字段|按要求)提交了?([一二两三四五六七八九十\d]+)个(?:测试)?文件的(写入(?:和读取)?|读取(?:和写入)?)操作$/u)
      if (fileWork) {
        const numeral: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
        const count = numeral[fileWork[1]] ?? Number(fileWork[1])
        const operations = fileWork[2].split('和')
        const expectedOperations: readonly string[] = invocation.fileOperations?.operations ?? []
        return suppliedParameters && invocation.fileOperations !== null && count === invocation.fileOperations.fileCount && operations.length === expectedOperations.length && operations.every(operation => expectedOperations.includes(operation))
      }
      const acknowledgment = invocation.executionAcknowledgment
      if (acknowledgment && executionWorkAcknowledgmentPhaseMatches(acknowledgment, workAcknowledgmentClause(clause, undefined, acknowledgment.planLabels)))
        return true
      const supplied = clause.match(/^使用[你您](?:给定|指定|提供)的([一二两三四五六七八九十\d]+)个文件路径和内容$/u)
      if (!supplied)
        return false
      const numeral: Record<string, number> = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
      const count = numeral[supplied[1]] ?? Number(supplied[1])
      return specified && count === invocation.paths.length && invocation.contents.length > 0 && invocation.values.every(value => value.length > 0 && inRequest(value)) && [...invocation.paths, ...invocation.contents].every(value => invocation.values.includes(value))
    })
  })
  if (matches.length !== 1)
    return null
  const { values: _values, paths: _paths, contents: _contents, ...evidence } = matches[0]
  return evidence
}
