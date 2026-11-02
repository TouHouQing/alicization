import type { ExecutionWorkGraphChange, WorkStep } from './execution-contracts'

import * as v from 'valibot'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
export const duplicateWorkMutationError = 'WORK_GRAPH_DUPLICATE_MUTATION'
export const workGraphChangesSchema = v.pipe(v.array(v.variant('kind', [
  v.strictObject({ kind: v.literal('insert-after'), stepId: id, templateStepId: id, afterStepId: id }),
  v.strictObject({ kind: v.literal('remove'), stepId: id }),
  v.strictObject({ kind: v.literal('dependencies'), stepId: id, dependsOn: v.pipe(v.array(id), v.maxLength(256)) }),
])), v.minLength(1), v.maxLength(256))

/** Shared draft projection; the writer supplies authoritative protected IDs. */
export function applyWorkGraphChanges(original: WorkStep[], changes?: ExecutionWorkGraphChange[], protectedStepIds: string[] = []) {
  let steps = original
  const protectedIds = new Set(protectedStepIds)
  const inserted: Array<{ stepId: string, templateStepId: string }> = []
  const removed: string[] = []
  const dependencies: string[] = []
  for (const change of changes ? v.parse(workGraphChangesSchema, changes) : []) {
    const current = steps.find(step => step.id === change.stepId)
    if (change.kind === 'insert-after') {
      const template = steps.find(step => step.id === change.templateStepId)
      const after = steps.findIndex(step => step.id === change.afterStepId)
      if (current || !template || after < 0 || steps.length >= 256)
        throw new Error('New work steps require a unique ID, an existing operation and bounded placement')
      const added: WorkStep = { ...structuredClone(template), id: change.stepId, dependsOn: [...new Set([change.afterStepId, ...(template.inputBindings?.map(binding => binding.stepId) ?? [])])], acceptanceCriterionIds: [], state: 'pending', attemptId: null }
      // Insert before unfinished successors, retaining their receipt bindings.
      steps = steps.map(step => !protectedIds.has(step.id) && step.dependsOn.includes(change.afterStepId) ? { ...step, dependsOn: [...new Set([...step.dependsOn, change.stepId])] } : step)
      steps = [...steps.slice(0, after + 1), added, ...steps.slice(after + 1)]
      inserted.push({ stepId: change.stepId, templateStepId: change.templateStepId })
    }
    else {
      if (!current || protectedIds.has(current.id))
        throw new Error('Already observed work cannot be removed or rewired')
      if (change.kind === 'remove') {
        if (steps.some(step => step.id !== current.id && step.inputBindings?.some(binding => binding.stepId === current.id)))
          throw new Error('A work step supplying a retained observation cannot be removed')
        steps = steps.filter(step => step.id !== current.id).map(step => protectedIds.has(step.id) ? step : { ...step, dependsOn: [...new Set(step.dependsOn.flatMap(parent => parent === current.id ? current.dependsOn : [parent]))] })
        removed.push(current.id)
      }
      else {
        if (new Set(change.dependsOn).size !== change.dependsOn.length || JSON.stringify([...change.dependsOn].sort()) === JSON.stringify([...current.dependsOn].sort()))
          throw new Error('Dependency changes require a new unambiguous order')
        steps = steps.map(step => step.id === current.id ? { ...step, dependsOn: [...change.dependsOn] } : step)
        dependencies.push(current.id)
      }
    }
  }
  if (!changes)
    return { steps, inserted, removed, dependencies, changed: false }
  if (!steps.length || steps.length > 256)
    throw new Error('The revised work graph must keep a bounded set of steps')
  const visited = new Set<string>()
  const visiting = new Set<string>()
  function walk(step: WorkStep) {
    if (visited.has(step.id))
      return
    if (visiting.has(step.id))
      throw new Error('The revised work graph contains a dependency cycle')
    visiting.add(step.id)
    for (const parentId of step.dependsOn) {
      const parent = steps.find(item => item.id === parentId)
      if (!parent || parent.id === step.id)
        throw new Error('The revised work graph has an absent or self dependency')
      walk(parent)
    }
    if (step.inputBindings?.some(binding => !step.dependsOn.includes(binding.stepId)))
      throw new Error('Retained input observations must remain direct dependencies')
    visiting.delete(step.id)
    visited.add(step.id)
  }
  for (const step of steps) walk(step)
  return { steps, inserted, removed, dependencies, changed: JSON.stringify(steps) !== JSON.stringify(original) }
}
