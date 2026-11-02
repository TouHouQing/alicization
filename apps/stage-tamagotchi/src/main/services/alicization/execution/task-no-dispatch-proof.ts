import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

type Identity = Pick<AlicizationTaskThreadRecord, 'id' | 'attemptId' | 'selectedChannel' | 'turnId'>
const proofs = new WeakMap<object, Identity>()

/** Main-only adapter/dispatcher branch; provider claims and JSON cannot attest this. */
export function markTaskNotStarted<T extends object>(payload: T, thread: Identity): T {
  proofs.set(payload, { id: thread.id, attemptId: thread.attemptId ?? null, selectedChannel: thread.selectedChannel, turnId: thread.turnId })
  return Object.freeze(payload)
}

export function taskDidNotStart(payload: unknown, thread: Identity) {
  const proof = payload && typeof payload === 'object' ? proofs.get(payload) : undefined
  return proof?.id === thread.id && (proof.attemptId ?? null) === (thread.attemptId ?? null)
    && proof.selectedChannel === thread.selectedChannel && proof.turnId === thread.turnId
}
