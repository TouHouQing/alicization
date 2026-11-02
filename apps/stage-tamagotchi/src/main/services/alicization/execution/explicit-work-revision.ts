import type { ExecutionCriteriaChange, WorkPlan, WorkStep } from '../../../../shared/execution-contracts'

import { applyWorkGraphChanges, duplicateWorkMutationError } from '../../../../shared/work-graph-editing'
import { executionDigest } from './acceptance-compiler'
import { applyExplicitWorkStepEdits } from './explicit-work-step-edits'

function ordered(value: unknown): unknown {
  if (Array.isArray(value))
    return value.map(ordered)
  return value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, entry]) => [key, ordered(entry)])) : value
}
// Parameter key order is not a new action, even when its approval hash differs.
const mutationIdentity = (step: WorkStep) => executionDigest(ordered({ capabilityId: step.capabilityId, input: step.input, bindings: [...(step.inputBindings ?? [])].sort((a, b) => a.parameter < b.parameter ? -1 : a.parameter > b.parameter ? 1 : 0) }))

/** Rebuild only host-declared future work from existing operation templates. */
export function applyExplicitWorkRevision(plan: WorkPlan, command: Pick<ExecutionCriteriaChange, 'stepChanges' | 'graphChanges'>, protectedStepIds: string[] = []) {
  const graph = applyWorkGraphChanges(plan.steps, command.graphChanges, protectedStepIds)
  const edited = applyExplicitWorkStepEdits({ ...plan, steps: graph.steps }, command.stepChanges)
  const previous = new Set(plan.steps.map(mutationIdentity))
  const identities = new Map(edited.steps.map(step => [step.id, mutationIdentity(step)]))
  for (const item of graph.inserted) {
    const added = edited.steps.find(step => step.id === item.stepId)
    const identity = added && identities.get(added.id)
    if (added && added.retryMode !== 'read-only' && (previous.has(identity!) || [...identities].some(([id, value]) => id !== added.id && value === identity)))
      throw new Error(duplicateWorkMutationError)
  }
  return { ...edited, graph }
}
