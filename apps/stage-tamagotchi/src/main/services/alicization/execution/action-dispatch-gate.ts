import type { BrowserWorkBinding } from '../../../../shared/execution-contracts'
import type { LifeEffect, LifeIngress, LifeStateView } from '../../../../shared/life-contracts'
import type { ActionDispatchBinding } from './action-dispatch-context'
import type { ActionResponsibility } from './action-responsibility'
import type { FileMutationRecovery } from './file-mutation-recovery'
import type { ExecutionResourceBroker, ResourceLease } from './resource-broker'

import { executionDigest } from './acceptance-compiler'
import { actionResponsibility } from './action-responsibility'
import { mainFilesystemDispatchInput } from './filesystem-dispatch-input'
import { mainFilesystemMutationDispatchInput } from './filesystem-mutation-input'
import { executionOperationResources, recordedExecutionResources } from './uncertain-resource-fence'
import { assertWorkSchedule } from './work-schedule'

/** A main-owned, single-use dispatch gate; target-specific approval remains in each adapter. */
export function createActionDispatchGate(options: {
  cardId: string
  effectId: string
  turnId: string
  capabilityId: string
  parameters: unknown
  actionId: string
  responsibility: ActionResponsibility
  fileRecovery?: FileMutationRecovery
  browserBinding?: BrowserWorkBinding
  signal: AbortSignal
  lease?: ResourceLease
  broker?: ExecutionResourceBroker
  read: () => Promise<LifeStateView>
  getEffect: (id: string) => Promise<LifeEffect | null>
  getIngress: (id: string) => Promise<LifeIngress | null>
  now?: () => number
}) {
  const identity = (capabilityId: unknown, parameters: unknown, browserBinding: unknown) => executionDigest({ capabilityId, parameters, ...(browserBinding ? { browserBinding } : {}) })
  const binding = identity(options.capabilityId, options.parameters, options.browserBinding)
  const sourceParameters = structuredClone(options.parameters)
  const sourceBrowserBinding = structuredClone(options.browserBinding)
  const responsibilityHash = executionDigest(options.responsibility)
  let consumed = false
  const check = async (parameters: unknown, target = true, projection?: ActionDispatchBinding['projection']) => {
    if (!consumed)
      throw new Error('Action dispatch permission has not been admitted')
    options.signal.throwIfAborted()
    // Lower only an immutable copy of the bound source. A caller retaining the
    // original object must not change the authorized operation after admission.
    const lowered = projection === 'main-filesystem-read-v1' ? mainFilesystemDispatchInput(options.capabilityId, sourceParameters) : typeof projection === 'object' && projection.kind === 'main-filesystem-mutation-v1' ? mainFilesystemMutationDispatchInput(options.capabilityId, sourceParameters, projection.sourceContent) : null
    const expected = lowered ? identity(options.capabilityId, lowered, sourceBrowserBinding) : binding
    if (expected !== identity(options.capabilityId, parameters, sourceBrowserBinding))
      throw new Error('Action input changed after its dispatch was prepared')
    const effect = await options.getEffect(options.effectId)
    if (effect?.status !== 'dispatched' || binding !== identity(effect.payload.capabilityId, effect.payload.parameters, effect.payload.browserBinding) || responsibilityHash !== executionDigest(effect.payload.actionResponsibility))
      throw new Error('Action effect ownership changed before adapter dispatch')
    const view = await options.read()
    if (view.cardId !== options.cardId)
      throw new Error('Action card changed before adapter dispatch')
    const ingress = await options.getIngress(`user:${options.turnId}`)
    if (ingress && !['accepted', 'processing'].includes(ingress.status))
      throw new Error('Action source was ended or withdrawn before adapter dispatch')
    const currentResponsibility = actionResponsibility({ view, ingress: ingress ?? await options.getIngress(options.turnId), turnId: options.turnId, actionId: options.actionId })
    if (currentResponsibility.kind === 'work-step') {
      const plan = view.execution?.plans.find(plan => plan.id === currentResponsibility.planId)
      if (plan)
        await assertWorkSchedule(options.getIngress, plan, (options.now ?? Date.now)())
    }
    if (responsibilityHash !== executionDigest(currentResponsibility))
      throw new Error('Action responsibility changed before adapter dispatch')
    options.signal.throwIfAborted()
    if (options.lease)
      options.broker!.assert(options.lease)
    if (effect.leaseUntil !== null && effect.leaseUntil <= (options.now ?? Date.now)())
      throw new Error('Action effect lease has expired before adapter dispatch')
    const resources = recordedExecutionResources(effect)
    if (target && resources && executionDigest(resources) !== executionDigest((await executionOperationResources(options.cardId, options.capabilityId, parameters)).sort()))
      throw new Error('Action resource target changed before adapter dispatch')
    options.signal.throwIfAborted()
    if (options.lease)
      options.broker!.assert(options.lease)
    if (effect.leaseUntil !== null && effect.leaseUntil <= (options.now ?? Date.now)())
      throw new Error('Action effect lease has expired before adapter dispatch')
    return { ...(options.fileRecovery ? { fileRecovery: options.fileRecovery } : {}), ...(options.lease ? { resourceLease: options.lease } : {}), capabilityId: options.capabilityId, effectId: options.effectId, cardId: options.cardId, turnId: options.turnId, expiresAt: effect.leaseUntil === null ? options.lease?.expiresAt ?? null : Math.min(effect.leaseUntil, options.lease?.expiresAt ?? Number.POSITIVE_INFINITY) }
  }
  const authorize = async (parameters: unknown) => {
    if (consumed)
      throw new Error('Action dispatch permission was already consumed')
    // Burn even a rejected attempt; a new dispatch needs ledger reconciliation.
    consumed = true
    await check(parameters)
  }
  return Object.assign(authorize, { assertCurrent: (input?: { target?: boolean } & Partial<ActionDispatchBinding>) => {
    if (input?.capabilityId !== undefined && input.capabilityId !== options.capabilityId)
      throw new Error('Action capability changed before adapter dispatch')
    return check(input && 'parameters' in input ? input.parameters : options.parameters, input?.target !== false, input?.projection)
  } })
}
