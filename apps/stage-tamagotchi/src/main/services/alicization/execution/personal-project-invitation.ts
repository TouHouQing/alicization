import type { ExecutionResourceBroker } from './resource-broker'

import { assertActionDispatchOperation } from './action-dispatch-context'

/** Only a live main-owned tool invocation can lend its foreground ownership. */
export async function withPersonalProjectInvitation<T>(input: {
  cardId: string
  turnId: string
  signal?: AbortSignal
  broker: ExecutionResourceBroker
  foregroundOwnerCurrent: () => boolean
}, task: (assertCurrent: () => Promise<void>) => Promise<T>) {
  const authority = await assertActionDispatchOperation(['tool.life_create_personal_piece'], {}, false)
  const lease = authority?.resourceLease
  if (!authority || authority.cardId !== input.cardId || authority.turnId !== input.turnId
    || authority.capabilityId !== 'tool.life_create_personal_piece' || !authority.effectId
    || !lease || lease.effectCardId !== input.cardId || lease.effectId !== authority.effectId
    || lease.resources.length !== 1 || lease.resources[0] !== 'host:execution') {
    throw new Error('Personal creation requires its exact current human action and execution lease')
  }
  input.broker.assert(lease)
  const binding = { id: lease.id, effectId: authority.effectId, owner: lease.owner }
  const assertCurrent = async () => {
    input.signal?.throwIfAborted()
    if (!input.foregroundOwnerCurrent())
      throw new DOMException('Personal invitation yielded to the current foreground owner', 'AbortError')
    const current = await assertActionDispatchOperation(['tool.life_create_personal_piece'], {}, false)
    if (!current || current.cardId !== input.cardId || current.turnId !== input.turnId
      || current.effectId !== binding.effectId || current.resourceLease?.id !== binding.id
      || current.resourceLease.owner !== binding.owner) {
      throw new Error('Personal invitation action ownership changed')
    }
    input.broker.assert(current.resourceLease)
    input.signal?.throwIfAborted()
    if (!input.foregroundOwnerCurrent())
      throw new DOMException('Personal invitation yielded during admission', 'AbortError')
  }
  await assertCurrent()
  // This child writes only its existing governed owned-note artifact. Inherit
  // the issued owner so it does not wait on the parent tool's own global lock.
  return input.broker.withOwner(binding.owner, () => task(assertCurrent))
}
