import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'

import { isWorkStepEditableField, parseWorkStepEdit } from '../../../../shared/work-step-editing'
import { workInputHash } from './work-input-bindings'

export async function reviseExecutionWorkStep(options: {
  database: AlicizationDbService
  save: (input: { cardId: string, plan: WorkPlan, expectedRevision: number, requestId: string }) => Promise<unknown>
}, input: { cardId: string, planId: string, expectedRevision: number, stepId: string, changes: Record<string, string>, requestId: string }) {
  const view = await options.database.readLifeState({ executionPlanId: input.planId })
  const plan = view.execution?.plans.find(item => item.id === input.planId)
  const step = plan?.steps.find(item => item.id === input.stepId)
  const result = view.execution?.results.find(item => item.planId === plan?.id && item.planRevision === plan.revision && item.stepId === step?.id)
  if (view.cardId !== input.cardId || !plan || plan.revision !== input.expectedRevision || !step || (result && ['verified', 'running', 'awaiting-verification'].includes(result.state)))
    throw new Error('This work step changed, already ran, or requires reconciliation')
  const changes = Object.entries(input.changes)
  if (!changes.length || changes.length > 6 || changes.some(([key, value]) => !Object.hasOwn(step.input, key) || !isWorkStepEditableField(key, step.input[key]) || typeof value !== 'string' || step.inputBindings?.some(binding => binding.parameter === key)))
    throw new Error('Only the unfinished step’s existing unbound text and paths can be revised')
  const parameters = { ...step.input, ...Object.fromEntries(changes.map(([key, value]) => [key, parseWorkStepEdit(key, value)])) }
  const next: WorkPlan = { ...plan, revision: plan.revision + 1, steps: plan.steps.map(item => item.id === step.id ? { ...item, input: parameters, inputHash: workInputHash({ ...item, input: parameters }) } : item) }
  await options.save({ cardId: input.cardId, plan: next, expectedRevision: plan.revision, requestId: input.requestId })
  return { state: 'revised' }
}
