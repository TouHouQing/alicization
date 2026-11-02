import { assertActionDispatchCurrent } from './action-dispatch-context'

interface ApprovalOwner { cardId: string, effectId: string }

// This is the transient wait owned by the actual permission promise. It is not
// an emotion, another task owner, or a persisted claim that input was dispatched.
const waiting = new Map<string, Set<symbol>>()
const listeners = new Set<(owner: ApprovalOwner) => void>()
const key = (owner: ApprovalOwner) => JSON.stringify([owner.cardId, owner.effectId])

function changed(owner: ApprovalOwner) {
  for (const listener of listeners) {
    try {
      listener(owner)
    }
    catch { /* Presentation cannot change permission or execution. */ }
  }
}

export function isActionAwaitingHost(cardId: string, effectId: string) {
  return Boolean(waiting.get(key({ cardId, effectId }))?.size)
}

export function onActionApprovalWaitChanged(listener: (owner: ApprovalOwner) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function withActionApprovalWait<T>(cardId: string, task: () => Promise<T>) {
  const authority = await assertActionDispatchCurrent(false)
  if (!authority?.cardId || !authority.effectId)
    return task()
  if (authority.cardId !== cardId)
    throw new Error('Approval wait crossed its main-owned action card')
  const owner = { cardId, effectId: authority.effectId }
  const ownerKey = key(owner)
  const token = Symbol('permission-wait')
  const owned = waiting.get(ownerKey) ?? new Set<symbol>()
  const first = owned.size === 0
  owned.add(token)
  waiting.set(ownerKey, owned)
  if (first)
    changed(owner)
  try {
    return await task()
  }
  finally {
    owned.delete(token)
    if (owned.size === 0) {
      waiting.delete(ownerKey)
      changed(owner)
    }
  }
}
