import type { LifeStateView } from '../../../../shared/life-contracts'
import type { ProcedureTemplate } from './procedure-template'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'

const count = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1_000_000))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
export const procedureSampleSchema = v.strictObject({ inputHash: hash, fulfilled: v.boolean(), operations: count, rework: count, approvals: count, elapsedMs: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(3_600_000)) })
export type ProcedureSample = v.InferOutput<typeof procedureSampleSchema>
export const procedureComparisonSchema = v.strictObject({
  baselineCandidateId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  baselineHash: hash,
  baselineEvidenceHash: hash,
  familyHash: hash,
  baseline: v.pipe(v.array(procedureSampleSchema), v.length(2)),
  candidate: v.pipe(v.array(procedureSampleSchema), v.length(2)),
  verdict: v.picklist(['improved', 'non-regressing', 'regressed', 'incomparable']),
})
export type ProcedureComparison = v.InferOutput<typeof procedureComparisonSchema>

/** Match logical input/output domains, never source paths or private examples. */
export function procedureComparisonFamily(template: ProcedureTemplate) {
  const criteria = template.criteria.map((item) => {
    const predicate = item.predicate
    if (!predicate || typeof predicate !== 'object' || !('kind' in predicate) || typeof predicate.kind !== 'string')
      throw new Error('Method comparison requires typed acceptance predicates')
    return predicate.kind
  }).sort()
  return executionDigest({ parameters: template.parameters.map(item => ({ kind: item.kind, role: item.role })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))), criteria, tools: [...template.tools].sort((a, b) => a.id.localeCompare(b.id)) })
}

export function readProcedureSample(input: { view: LifeStateView, planId: string, inputHash: string, elapsedMs: number, approvals: number }): ProcedureSample {
  const plan = input.view.execution?.plans.find(item => item.id === input.planId)
  if (!plan)
    throw new Error('Replay performance lost its accepted plan')
  const results = input.view.execution!.results.filter(item => item.planId === plan.id)
  const ids = new Set(results.flatMap(item => item.effectId ? [item.effectId] : []))
  const effects = input.view.effects.filter(item => ids.has(item.id))
  const goal = input.view.obligations.find(item => item.id === plan.rootObligationId)
  const attempts = new Set(results.map(item => JSON.stringify([item.stepId, item.attemptId])))
  const steps = new Set(results.map(item => item.stepId))
  return v.parse(procedureSampleSchema, { inputHash: input.inputHash, fulfilled: goal?.status === 'fulfilled' && goal.verification?.independent === true && goal.verification.verdict === 'satisfied', operations: effects.length, rework: attempts.size - steps.size, approvals: input.approvals, elapsedMs: Math.max(0, Math.round(input.elapsedMs)) })
}

/** Latency is recorded, but host scheduling noise cannot by itself approve a version. */
export function compareProcedureSamples(baseline: ProcedureSample[], candidate: ProcedureSample[]): ProcedureComparison['verdict'] {
  if (baseline.length !== 2 || candidate.length !== 2 || baseline.some((item, index) => item.inputHash !== candidate[index]?.inputHash))
    return 'incomparable'
  const sum = (items: ProcedureSample[], field: 'operations' | 'rework' | 'approvals') => items.reduce((total, item) => total + item[field], 0)
  const before = baseline.filter(item => item.fulfilled).length
  const after = candidate.filter(item => item.fulfilled).length
  if (after < before)
    return 'regressed'
  if (after > before)
    return 'improved'
  if (['operations', 'rework', 'approvals'].some(field => sum(candidate, field as 'operations' | 'rework' | 'approvals') > sum(baseline, field as 'operations' | 'rework' | 'approvals')))
    return 'regressed'
  return 'non-regressing'
}
