import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'

import { randomUUID } from 'node:crypto'

import { executionDigest } from './acceptance-compiler'

export interface ActionPermit {
  id: string
  cardId: string
  rootObligationId: string
  obligationGeneration: number
  planId: string
  planRevision: number
  stepId: string
  attemptId: string
  capabilityId: string
  inputHash: string
  targetObservationId: string
  targetFingerprint: string
  effectDigest: string
  approvalRef: string | null
  brokerEpoch: string
  fencingToken: number
  expiresAt: number
}

/** Tokens are opaque handles. A model-authored JSON object cannot authorize an action. */
export function createActionPermitAuthority(broker: ExecutionResourceBroker, now: () => number = Date.now) {
  const issued = new Map<string, { permit: ActionPermit, lease: ResourceLease, bindingHash: string }>()
  type Binding = Omit<ActionPermit, 'id' | 'brokerEpoch' | 'fencingToken' | 'expiresAt'>
  function issue(binding: Binding, lease: ResourceLease) {
    broker.assert(lease)
    const permit: ActionPermit = { ...binding, id: randomUUID(), brokerEpoch: lease.epoch, fencingToken: lease.fencingToken, expiresAt: Math.min(lease.expiresAt, now() + 30_000) }
    issued.set(permit.id, { permit, lease, bindingHash: executionDigest(binding) })
    return { ...permit }
  }
  function consume(id: string, binding: Binding) {
    const owned = issued.get(id)
    if (!owned || owned.permit.expiresAt <= now() || owned.bindingHash !== executionDigest(binding))
      throw new Error('Action permit is absent, expired, or bound to a different effect')
    broker.assert(owned.lease)
    issued.delete(id)
    return { ...owned.permit }
  }
  function revokeRoot(cardId: string, rootObligationId: string) {
    for (const [id, entry] of issued) {
      if (entry.permit.cardId === cardId && entry.permit.rootObligationId === rootObligationId)
        issued.delete(id)
    }
  }
  return { issue, consume, revokeRoot }
}
