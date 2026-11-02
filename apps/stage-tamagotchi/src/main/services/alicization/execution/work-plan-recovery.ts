import type { LifeEffect, LifeMutation } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'

/** Boot recovery consumes receipts; it never reruns an adapter to find its outcome. */
export async function recoverExecutionWork(database: AlicizationDbService, isOwned: (planId: string) => boolean, options: {
  reconcile?: (effect: LifeEffect, planId: string) => Promise<unknown>
  planId?: string
} = {}) {
  const initial = await database.readLifeState()
  const candidates: Array<{ planId: string, revision: number }> = []
  for (const entry of initial.execution?.plans ?? []) {
    if (isOwned(entry.id) || options.planId && options.planId !== entry.id)
      continue
    const view = await database.readLifeState({ executionPlanId: entry.id })
    const plan = view.execution?.plans[0]
    const goal = plan && view.obligations.find(item => item.id === plan.rootObligationId)
    if (!plan || !goal)
      continue
    let unresolved = false
    for (const slice of view.execution?.slices.filter(item => item.planRevision === plan.revision && ['ready', 'running', 'stopping', 'waiting'].includes(item.state)) ?? []) {
      let effects = await database.readLifeTurnExecutionEffects(slice.ingressId)
      // An inactive card is scanned read-only at boot. When it becomes current,
      // only this stopped plan's writer may classify its interrupted dispatch.
      for (const effect of effects.filter(item => ['claimed', 'dispatched'].includes(item.status))) {
        if (isOwned(plan.id))
          break
        await database.commitLifeState({ cardId: view.cardId, operationKey: `work-owner-ended:${effect.id}:${effect.status}`, changes: [], mutations: [
          { type: 'effect-transition', id: effect.id, expected: effect.status, status: effect.status === 'dispatched' ? 'uncertain' : 'cancelled', receipt: { reason: 'work-owner-ended', requiresVerification: effect.status === 'dispatched' } },
        ] })
      }
      effects = await database.readLifeTurnExecutionEffects(slice.ingressId)
      for (const effect of effects.filter(item => item.status === 'uncertain')) {
        if (!isOwned(plan.id))
          await options.reconcile?.(effect, plan.id)
      }
      effects = await database.readLifeTurnExecutionEffects(slice.ingressId)
      const mutations: LifeMutation[] = []
      let unknown = effects.some(effect => ['dispatched', 'uncertain'].includes(effect.status))
      for (const result of view.execution?.results.filter(item => item.attemptId === slice.attemptId && ['running', 'awaiting-verification'].includes(item.state)) ?? []) {
        const effect = effects.find(item => item.actionId === result.stepId)
        const reconciliation = effect?.receipt?.reconciliation as { observationId?: string } | undefined
        const observation = effect ? await database.getLifeIngress(reconciliation?.observationId ?? `observation:${effect.id}`) : null
        const observed = effect?.status === 'settled' && effect.receipt?.outcome === 'success' && observation?.status === 'settled' && observation.sourceKey === effect.id
        const pending = effect && ['dispatched', 'uncertain'].includes(effect.status)
        unknown ||= Boolean(pending)
        if (result.state === 'awaiting-verification' && !observed && effect?.receipt?.outcome !== 'not-applied')
          continue
        mutations.push({ type: 'execution-step-result', expectedState: result.state, result: {
          ...result,
          state: observed ? 'verified' : pending ? 'awaiting-verification' : 'blocked',
          effectId: effect?.id ?? null,
          observationRefs: observed ? [observation.id] : [],
          output: { reason: observed ? 'recovered-settled-action-receipt' : pending ? 'reconciliation-required' : 'no-dispatched-operation', ...(reconciliation ? { recoveredFromReality: true } : {}) },
        } })
      }
      if (!unknown || slice.state !== 'stopping')
        mutations.push({ type: 'execution-slice', slice: { ...slice, state: unknown ? 'stopping' : 'stopped' }, expectedState: slice.state })
      // Each slice has at most sixteen actions, keeping recovery in one writer transaction.
      if (mutations.length)
        await database.commitLifeState({ cardId: view.cardId, operationKey: `work-recover:${slice.id}:${view.revision}`, changes: [], mutations })
      unresolved ||= unknown
    }
    const current = await database.readLifeState({ executionPlanId: plan.id })
    unresolved ||= current.execution?.results.some(item => item.state === 'awaiting-verification') ?? false
    if (unresolved) {
      const thread = await database.getTaskThread(plan.rootThreadId)
      if (thread && goal.generation === plan.obligationGeneration && !goal.invalidatedBy && !['cancelled', 'fulfilled', 'superseded', 'failed'].includes(goal.status))
        await database.upsertTaskThread({ ...thread, status: 'paused', summary: '上次操作的结果还需要核对，已保留进度和产物。', expectedUpdatedAt: thread.updatedAt })
      continue
    }
    if (goal.generation === plan.obligationGeneration && !goal.invalidatedBy && ['accepted', 'in-progress'].includes(goal.status))
      candidates.push({ planId: plan.id, revision: plan.revision })
  }
  return candidates
}
