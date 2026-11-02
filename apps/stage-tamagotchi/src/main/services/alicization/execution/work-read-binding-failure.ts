import type { WorkPlan, WorkStep, WorkStepResult } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'

import { errorMessageFrom } from '@moeru/std'

const reads = new Set(['tool.filesystem_read_file', 'tool.filesystem_list_directory', 'tool.filesystem_search_files'])

/** This is a scheduler result written before beforeAction, never a tool receipt. */
export function workReadBindingFailure(step: WorkStep, observationRefs: string[], error: unknown) {
  if (!reads.has(step.capabilityId) || !step.inputBindings?.length || !observationRefs.length)
    return null
  return {
    effectId: null,
    observationRefs: [...new Set(observationRefs)],
    state: 'blocked' as const,
    output: { operation: step.capabilityId, failureStage: 'binding-resolution', inputHash: step.inputHash, errorCode: 'WORK_INPUT_BINDING_FAILED', errorMessage: (errorMessageFrom(error) ?? 'Unknown input binding failure').slice(0, 512) },
  }
}

/** Only actual dependency receipts can ground a revision of this unstarted read. */
export async function readWorkBindingFailure(database: AlicizationDbService, plan: WorkPlan, step: WorkStep, result: WorkStepResult, results: WorkStepResult[]) {
  const output = result.output
  if (!reads.has(step.capabilityId) || !step.inputBindings?.length || result.state !== 'blocked' || result.effectId !== null || result.inputHash !== step.inputHash
    || output.operation !== step.capabilityId || output.inputHash !== step.inputHash || output.failureStage !== 'binding-resolution' || output.errorCode !== 'WORK_INPUT_BINDING_FAILED'
    || typeof output.errorMessage !== 'string' || output.errorMessage.length > 512 || !result.observationRefs.length || result.observationRefs.length > 32) {
    return null
  }
  const allowed = new Set<string>()
  for (const dependency of new Set(step.inputBindings.map(binding => binding.stepId))) {
    if (!step.dependsOn.includes(dependency))
      return null
    const observed = results.find(candidate => candidate.planId === plan.id && candidate.planRevision === plan.revision && candidate.stepId === dependency && candidate.state === 'verified')
    const effect = observed?.effectId ? await database.getLifeEffect(observed.effectId) : null
    const policy = effect?.payload.effectContract as { sideEffect?: string, retryClass?: string } | undefined
    if (effect?.status === 'settled' && effect.actionId === dependency && effect.receipt?.outcome === 'success' && policy?.sideEffect === 'read' && policy.retryClass === 'read-only')
      allowed.add(`observation:${effect.id}`)
  }
  return result.observationRefs.every(ref => allowed.has(ref)) ? { stepId: step.id, effectId: null, errorCode: 'WORK_INPUT_BINDING_FAILED', errorMessage: output.errorMessage, observationRefs: result.observationRefs } : null
}
