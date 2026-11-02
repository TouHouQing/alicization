import type { FileMutationRecovery } from './file-mutation-recovery'
import type { ResourceLease } from './resource-broker'

import { AsyncLocalStorage } from 'node:async_hooks'

export interface ActionDispatchAuthority { expiresAt: number | null, effectId?: string, cardId?: string, turnId?: string, capabilityId?: string, fileRecovery?: FileMutationRecovery, resourceLease?: ResourceLease }
export interface ActionDispatchBinding { capabilityId: string, parameters: unknown, projection?: 'main-filesystem-read-v1' | { kind: 'main-filesystem-mutation-v1', sourceContent: string } }
export type ActionDispatchCheck = (options?: { target?: boolean } & Partial<ActionDispatchBinding>) => Promise<ActionDispatchAuthority>

interface DispatchLifetime { closed: boolean, authority: ActionDispatchAuthority | null }
interface DispatchContext { check: ActionDispatchCheck, lifetime: DispatchLifetime, projection?: ActionDispatchBinding['projection'] }
const dispatches = new AsyncLocalStorage<DispatchContext>()
const noDispatchReceipt = Symbol('alicization-action-not-started')
const noDispatchOwners = new WeakMap<object, { cardId: string, effectId: string }>()
const noDispatchErrors = new WeakMap<object, object>()

function noDispatchToken(value: object) {
  return (value as Record<symbol, unknown>)[noDispatchReceipt] ?? noDispatchErrors.get(value)
}

/** Only a local adapter can attest that this exact action never started. */
export function markActionNotStarted<T extends { sideEffectState: 'none', effectMayHaveOccurred: false }>(receipt: T): T {
  const context = dispatches.getStore()
  const authority = context?.lifetime.authority
  if (!context?.lifetime.closed && authority?.cardId && authority.effectId) {
    const token = Object.freeze({})
    noDispatchOwners.set(token, { cardId: authority.cardId, effectId: authority.effectId })
    // A private symbol survives local result spreads, but JSON and IPC cannot
    // turn an external "none" claim into an authoritative no-dispatch receipt.
    Object.assign(receipt, { [noDispatchReceipt]: token })
  }
  return receipt
}

export function actionDidNotStart(receipt: unknown, cardId: string, effectId: string) {
  if (!receipt || typeof receipt !== 'object')
    return false
  const token = noDispatchToken(receipt)
  const owner = token && typeof token === 'object' ? noDispatchOwners.get(token) : null
  return owner?.cardId === cardId && owner.effectId === effectId
}

/** Preserve the original error, including frozen validation errors. */
export function markActionNotStartedError(error: unknown) {
  const receipt = markActionNotStarted({ sideEffectState: 'none', effectMayHaveOccurred: false } as const)
  const token = noDispatchToken(receipt)
  if (error !== null && typeof error === 'object' && token && typeof token === 'object')
    noDispatchErrors.set(error, token)
  return error
}

/** Preserve existing local provenance through an internal result normalizer. */
export function inheritActionNotStarted<T extends object>(source: unknown, target: T): T {
  const token = source && typeof source === 'object' ? noDispatchToken(source) : null
  if (token && typeof token === 'object' && noDispatchOwners.has(token))
    Object.assign(target, { [noDispatchReceipt]: token, effectMayHaveOccurred: false, sideEffectState: 'none' })
  return target
}

/** Keep the main-owned authority out of model arguments and renderer IPC. */
export async function withActionDispatch<T>(check: ActionDispatchCheck, task: () => T | Promise<T>): Promise<T> {
  const context: DispatchContext = { check, lifetime: { closed: false, authority: null } }
  return dispatches.run(context, async () => {
    try {
      context.lifetime.authority = await assertActionDispatchCurrent()
      return await task()
    }
    finally { context.lifetime.closed = true }
  })
}

/** Host controls without an agent action retain their own adapter risk policy. */
export async function assertActionDispatchCurrent(target = true, binding?: ActionDispatchBinding) {
  const context = dispatches.getStore()
  if (!context)
    return null
  if (context.lifetime.closed)
    throw new Error('Action dispatch context has already closed')
  const current = await context.check({ target, ...binding })
  if (context.lifetime.closed)
    throw new Error('Action dispatch context closed during its authority check')
  return current
}

/** An adapter's real operation and arguments must match the admitted action. */
export function assertActionDispatchOperation(capabilityIds: readonly string[], parameters: unknown, target = true) {
  const context = dispatches.getStore()
  if (!context)
    return Promise.resolve(null)
  const capabilityId = context.lifetime.authority?.capabilityId
  const composite = capabilityId === 'tool.filesystem_edit_file' || capabilityId === 'tool.filesystem_patch_file'
  const readProjection = context.projection === 'main-filesystem-read-v1' && capabilityIds.includes('tool.filesystem_read_file')
  const writeProjection = typeof context.projection === 'object' && context.projection.kind === 'main-filesystem-mutation-v1' && capabilityIds.includes('tool.filesystem_write_file')
  const lowered = composite && (readProjection || writeProjection)
  if (!capabilityId || (!capabilityIds.includes(capabilityId) && !lowered))
    throw new Error('Action capability changed before adapter dispatch')
  return assertActionDispatchCurrent(target, { capabilityId, parameters, ...(context.projection ? { projection: context.projection } : {}) })
}

/** Only the main read facade opts into lowering; native task steps stay exact. */
export async function withMainFilesystemReadDispatch<T>(task: () => T | Promise<T>): Promise<T> {
  const context = dispatches.getStore()
  if (!context)
    return await task()
  if (context.lifetime.closed)
    throw new Error('Action dispatch context has already closed')
  // Nested scopes share the parent's close fence, including delayed callbacks.
  return dispatches.run({ ...context, projection: 'main-filesystem-read-v1' }, task)
}

/** Only a deterministic main edit/patch can carry its private read snapshot. */
export async function withMainFilesystemMutationDispatch<T>(sourceContent: string, task: () => T | Promise<T>): Promise<T> {
  const context = dispatches.getStore()
  if (!context)
    return await task()
  if (context.lifetime.closed)
    throw new Error('Action dispatch context has already closed')
  return dispatches.run({ ...context, projection: Object.freeze({ kind: 'main-filesystem-mutation-v1' as const, sourceContent }) }, task)
}
