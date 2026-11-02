import type { ExecutionRecoveryCommand, ExecutionRecoveryResult } from '../../../../shared/execution-recovery-contracts'
import type { LifeEffect, LifeMutation } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { ExecutionResourceBroker } from './resource-broker'

import { randomUUID } from 'node:crypto'

import { recoverExecutionEffect } from './effect-recovery-runtime'
import { hostRecoveryBinding, hostRecoveryDigest as recoveryDigest } from './host-recovery-snapshot'
import { executionRecoveryResources, recordedExecutionResources } from './uncertain-resource-fence'

type EffectCommand = Exclude<ExecutionRecoveryCommand, { action: 'list-downloads' }>

/** Local surface control, never a model tool or independent success evidence. */
export function createHostEffectControl(options: {
  database: () => AlicizationDbService
  broker: ExecutionResourceBroker
  writerStopped: (effect: LifeEffect) => boolean | Promise<boolean>
  observe?: Parameters<typeof recoverExecutionEffect>[0]['observe']
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const challenges = new Map<number, { token: string, expiresAt: number, binding: string }>()
  async function snapshot(input: EffectCommand) {
    const database = options.database()
    const effect = await database.getLifeEffect(input.effectId)
    if (effect?.kind !== 'execute' || effect.status !== 'uncertain')
      throw new Error('The operation no longer needs recovery; refresh its state')
    const source = effect.turnId ? await database.getLifeIngress(effect.turnId.startsWith('task-run:') ? effect.turnId : `user:${effect.turnId}`) : null
    const planId = source?.kind === 'task-run' && source.source === 'work-plan-scheduler' && typeof source.payload.planId === 'string' ? source.payload.planId : undefined
    const view = await database.readLifeState(planId ? { executionPlanId: planId } : undefined)
    if (view.cardId !== input.cardId)
      throw new Error('Recovery crossed the current card boundary')
    const goals = view.obligations.filter(goal => goal.id === source?.payload.rootObligationId || (effect.turnId && (goal.threadId === effect.turnId || goal.sourceTurnId === effect.turnId)))
    if (goals.filter(goal => !['fulfilled', 'cancelled', 'superseded'].includes(goal.status)).length > 32)
      throw new Error('Cancel the related responsibilities individually before taking over this operation')
    const binding = hostRecoveryBinding(view.cardId, effect, source, goals)
    return { database, effect, view, goals, source, binding }
  }
  return async (input: EffectCommand, surfaceId: number): Promise<ExecutionRecoveryResult> => {
    for (const [key, challenge] of challenges) {
      if (challenge.expiresAt <= now())
        challenges.delete(key)
    }
    const challenge = challenges.get(surfaceId)
    // Consume before any asynchronous check, including a rejected/stale click.
    if (input.action === 'takeover')
      challenges.delete(surfaceId)
    const { database, effect, view, goals, source, binding } = await snapshot(input)
    if (input.action === 'preview') {
      if (challenges.size >= 64 && !challenges.has(surfaceId))
        throw new Error('Too many open recovery confirmations')
      const token = randomUUID()
      const expiresAt = now() + 120_000
      challenges.set(surfaceId, { token, expiresAt, binding })
      const parameters = effect.payload.parameters as Record<string, unknown> | undefined
      return { state: 'preview', token, expiresAt, capabilityId: String(effect.payload.capabilityId ?? ''), target: typeof parameters?.path === 'string' ? parameters.path.slice(0, 1024) : null, goals: goals.map(goal => goal.summary.slice(0, 320)) }
    }
    if (!await options.writerStopped(effect))
      throw new Error('An execution owner is still active; stop it before recovery')
    if (input.action === 'recheck') {
      const result = await recoverExecutionEffect({ database, broker: options.broker, effect, writerStopped: options.writerStopped, observe: options.observe })
      return { state: result?.verdict ?? 'unknown' }
    }
    if (!input.confirmedStopped || !challenge || challenge.token !== input.token || challenge.expiresAt <= now() || challenge.binding !== binding)
      throw new Error('Recovery confirmation expired or changed; review the operation again')
    // Broken/redirected legacy paths remain controllable at the stronger host
    // scope. Host attestation never becomes a successful independent proof.
    const resources = await executionRecoveryResources(view.cardId, effect).then(result => result.resources).catch(() => recordedExecutionResources(effect) ?? ['host:execution'])
    const lease = options.broker.beginHostTakeover(effect.id, resources, view.cardId)
    let resolved = false
    try {
      lease.assert()
      if (!await options.writerStopped(effect))
        throw new Error('Execution ownership changed during recovery')
      const decisionId = `host-takeover:${input.token}`
      const originalId = `host-takeover-original:${input.token}`
      const observedAt = now()
      const receipt = { outcome: 'host-taken-over', observedAt, output: { ok: false, sideEffectState: 'unknown', executionStopped: true, stopEvidence: 'host-attestation' }, hostTakeover: { independent: false, effectId: effect.id, decisionId, originalReceiptId: originalId, originalReceiptHash: recoveryDigest(effect.receipt) } }
      const mutations: LifeMutation[] = [
        { type: 'execution-recovery-assert', effectId: effect.id, binding },
        { type: 'ingress-accept', ingress: { id: originalId, kind: 'tool-result', source: 'execution-host-original', sourceKey: effect.id, occurredAt: observedAt, payload: effect.receipt ?? { receipt: null } } },
        { type: 'ingress-settle', id: originalId, status: 'settled' },
        { type: 'ingress-accept', ingress: { id: decisionId, kind: 'feedback', source: 'execution-host-takeover', sourceKey: effect.id, occurredAt: observedAt, payload: { ...receipt, binding, confirmedStopped: true } } },
        { type: 'ingress-settle', id: decisionId, status: 'settled' },
        { type: 'effect-transition', id: effect.id, expected: 'uncertain', status: 'failed', receipt },
        ...goals.filter(goal => !['fulfilled', 'cancelled', 'superseded'].includes(goal.status)).map(goal => ({ type: 'obligation-update' as const, id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'cancelled' as const })),
      ]
      for (const result of view.execution?.results.filter(result => result.effectId === effect.id && ['running', 'awaiting-verification'].includes(result.state)) ?? [])
        mutations.push({ type: 'execution-step-result', expectedState: result.state, result: { ...result, state: 'cancelled', observationRefs: [decisionId], output: { hostTakenOver: true, decisionId, sideEffectState: 'unknown' } } })
      for (const slice of view.execution?.slices.filter(slice => slice.ingressId === effect.turnId && ['ready', 'running', 'stopping', 'waiting'].includes(slice.state)) ?? [])
        mutations.push({ type: 'execution-slice', expectedState: slice.state, slice: { ...slice, state: 'stopped' } })
      if (source?.kind === 'user-turn' && ['accepted', 'processing', 'held'].includes(source.status))
        mutations.push({ type: 'ingress-settle', id: source.id, expectedStatus: source.status, expectedPayloadHash: source.payloadHash, status: 'failed' })
      // Unrelated body/appraisal commits cannot exhaust a confirmation. The
      // exact reviewed scope is asserted inside this same atomic transaction.
      await database.commitLifeState({ cardId: view.cardId, operationKey: decisionId, changes: [], mutations })
      resolved = true
      return { state: 'host-taken-over' }
    }
    finally { lease.finish(resolved) }
  }
}
