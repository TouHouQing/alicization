import type { ExecutionWorkStepEdit, WorkPlan } from '../../../../shared/execution-contracts'

import * as v from 'valibot'

import { isWorkStepEditableField, parseWorkStepEdit } from '../../../../shared/work-step-editing'
import { executionDigest } from './acceptance-compiler'
import { workInputHash } from './work-input-bindings'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
export const explicitWorkStepEditsSchema = v.pipe(v.array(v.strictObject({ stepId: id, changes: v.pipe(v.record(v.string(), v.pipe(v.string(), v.maxLength(64000))), v.check(value => Object.keys(value).length > 0 && Object.keys(value).length <= 6)) })), v.minLength(1), v.maxLength(256))

/** Explicit host edits change existing unbound fields; observed effects stay immutable. */
export function applyExplicitWorkStepEdits(plan: WorkPlan, edits?: ExecutionWorkStepEdit[]) {
  if (!edits)
    return { steps: plan.steps, changed: [] as Array<{ stepId: string, fields: string[], previousInputHash: string, inputHash: string }> }
  const parsed = v.parse(explicitWorkStepEditsSchema, edits)
  if (new Set(parsed.map(item => item.stepId)).size !== parsed.length)
    throw new Error('A requirement change cannot edit one step twice')
  const changed: Array<{ stepId: string, fields: string[], previousInputHash: string, inputHash: string }> = []
  const steps = plan.steps.map((step) => {
    const edit = parsed.find(item => item.stepId === step.id)
    if (!edit)
      return step
    const entries = Object.entries(edit.changes)
    if (entries.some(([key]) => !Object.hasOwn(step.input, key) || !isWorkStepEditableField(key, step.input[key]) || step.inputBindings?.some(binding => binding.parameter === key)))
      throw new Error('Requirement changes may edit only existing unbound text, paths and program arguments')
    const input = { ...step.input, ...Object.fromEntries(entries.map(([key, text]) => [key, parseWorkStepEdit(key, text)])) }
    if (executionDigest(input) === executionDigest(step.input))
      throw new Error('The selected work step has not changed')
    const inputHash = workInputHash({ ...step, input })
    changed.push({ stepId: step.id, fields: entries.map(([key]) => key), previousInputHash: step.inputHash, inputHash })
    return { ...step, input, inputHash }
  })
  if (changed.length !== parsed.length)
    throw new Error('The requirement change refers to an absent work step')
  return { steps, changed }
}
