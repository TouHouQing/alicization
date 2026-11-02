import type { WorkPlan } from './execution-contracts'
import type { LifeObligation } from './life-contracts'

/** Display projection only; opening a download independently resolves it again. */
export function projectExecutionArtifacts(goal: LifeObligation | undefined, plan: WorkPlan) {
  const contract = goal?.proof.acceptance
  if (!goal || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || contract?.contractHash !== plan.acceptanceHash)
    return []
  const checked = goal.verification?.evidence.criteria
  return contract.criteria.flatMap((item) => {
    if ('path' in item.predicate && item.predicate.kind !== 'directory-members')
      return [{ id: item.id, path: item.predicate.path, name: item.predicate.path.split(/[/\\]/u).at(-1) }]
    if (item.predicate.kind !== 'browser-download' || !Array.isArray(checked))
      return []
    const predicate = item.predicate
    const result = checked.find(entry => entry && typeof entry === 'object' && entry.id === item.id && entry.verdict === 'satisfied' && entry.independent === true && entry.scope === 'bytes')
    const evidence = result?.evidence
    if (!evidence || typeof evidence.path !== 'string' || evidence.planId !== plan.id || evidence.planRevision !== plan.revision || evidence.stepId !== predicate.stepId)
      return []
    return [{ id: item.id, path: evidence.path, name: evidence.path.split(/[/\\]/u).at(-1) }]
  }).filter((item, index, all) => all.findIndex(candidate => candidate.path === item.path) === index)
}
