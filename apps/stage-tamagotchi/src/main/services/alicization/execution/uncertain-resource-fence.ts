import type { LifeEffect } from '../../../../shared/life-contracts'

import { executionDigest } from './acceptance-compiler'
import { executionFileResources } from './resource-broker'
import { executionResourcesOverlap } from './resource-overlap'
import { workAdmissionResources } from './work-admission-resource'

export async function executionOperationResources(cardId: string, capabilityId: string, input: unknown) {
  const admission = workAdmissionResources(cardId, capabilityId)
  if (admission)
    return admission
  const parameters = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  if (capabilityId.includes('filesystem') && typeof parameters.path === 'string')
    return executionFileResources(parameters.path)
  if (capabilityId.includes('desktop'))
    return ['physical-input:desktop']
  if (capabilityId.includes('browser'))
    return [`browser:${cardId}`]
  return ['host:execution']
}

/** Resource identity is captured by the host before dispatch, never by the model. */
export function recordedExecutionResources(effect: Pick<LifeEffect, 'payload'>): string[] | null {
  const snapshot = effect.payload.resourceSnapshot as { version?: number, keys?: unknown } | undefined
  if (snapshot === undefined)
    return null
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.keys) || !snapshot.keys.length || snapshot.keys.length > 128 || snapshot.keys.some(key => typeof key !== 'string' || !key || key.length > 4096) || new Set(snapshot.keys).size !== snapshot.keys.length)
    throw new Error('Execution resource snapshot is invalid')
  return [...snapshot.keys].sort()
}

export async function executionRecoveryResources(cardId: string, effect: LifeEffect) {
  const contract = effect.payload.effectContract as { sideEffect?: string, retryClass?: string } | undefined
  if (contract?.sideEffect === 'read' && contract.retryClass === 'read-only')
    return { resources: [], originalTargetMatches: true }
  const recorded = recordedExecutionResources(effect)
  // Old records have no proof of their original canonical target. Preserve
  // them without inventing a target from a possibly redirected path today.
  if (!recorded)
    return { resources: ['host:execution'], originalTargetMatches: false }
  const current = await executionOperationResources(cardId, String(effect.payload.capabilityId ?? ''), effect.payload.parameters)
  const originalPath = recorded.find(key => key.startsWith('file-path:'))
  return { resources: [...new Set([...recorded, ...current])].sort(), originalTargetMatches: originalPath ? current.includes(originalPath) : executionDigest(recorded) === executionDigest(current.sort()) }
}

/** Durable unknown effects outlive both a dialogue turn and the in-memory broker. */
export async function assertNoUncertainResourceConflict(input: { cardId: string, capabilityId: string, parameters: unknown, effects: LifeEffect[] }) {
  const resources = await executionOperationResources(input.cardId, input.capabilityId, input.parameters)
  for (const effect of input.effects) {
    if (effect.kind !== 'execute' || effect.status !== 'uncertain')
      continue
    const contract = effect.payload.effectContract as { retryClass?: string, sideEffect?: string } | undefined
    if (contract?.retryClass === 'read-only' && contract.sideEffect === 'read')
      continue
    const capabilityId = String(effect.payload.capabilityId ?? '')
    const previous = (await executionRecoveryResources(input.cardId, effect)).resources
    const overlaps = executionResourcesOverlap(previous, resources)
    const sameEffect = capabilityId === input.capabilityId && executionDigest(effect.payload.parameters ?? null) === executionDigest(input.parameters ?? null)
    if (overlaps || sameEffect)
      throw new Error(`Action ${effect.id} has an uncertain result on this resource; independent verification is required before another mutation`)
  }
  return resources
}
