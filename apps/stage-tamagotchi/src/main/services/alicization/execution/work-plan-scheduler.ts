import type { WorkPlan, WorkSlice, WorkStep, WorkStepResult } from '../../../../shared/execution-contracts'
import type { LifeCommitInput, LifeStateView } from '../../../../shared/life-contracts'

import { randomUUID } from 'node:crypto'

export function createWorkPlanScheduler(ports: {
  read: () => Promise<LifeStateView>
  commit: (input: LifeCommitInput) => Promise<unknown>
  execute: (input: { plan: WorkPlan, step: WorkStep, slice: WorkSlice, signal: AbortSignal }) => Promise<Pick<WorkStepResult, 'effectId' | 'observationRefs' | 'output' | 'state'>>
  shouldYield?: () => boolean
  now?: () => number
}) {
  const now = ports.now ?? Date.now
  const running = new Set<string>()
  async function runSlice(planId: string, signal: AbortSignal) {
    if (running.has(planId))
      throw new Error('Work plan already has an execution window')
    running.add(planId)
    let slice: WorkSlice | null = null
    let cardId = ''
    async function transition(state: WorkSlice['state']) {
      if (!slice)
        return
      const actual = (await ports.read()).execution?.slices.find(item => item.id === slice!.id)
      if (actual)
        slice = actual
      if (slice.state === state)
        return
      if (slice.state === 'stopping' && state !== 'stopped')
        throw new DOMException('Work slice stop was requested', 'AbortError')
      const previous = slice.state
      const next = { ...slice, state, updatedAt: now() }
      await ports.commit({ cardId, operationKey: `slice:${slice.id}:${previous}:${state}`, changes: [], mutations: [{ type: 'execution-slice', slice: next, expectedState: previous }] })
      slice = next
    }
    try {
      signal.throwIfAborted()
      const view = await ports.read()
      cardId = view.cardId
      const plan = view.execution?.plans.find(item => item.id === planId)
      if (!plan)
        throw new Error('Work plan is absent')
      // A stopped process is not evidence that its last mutation did not happen.
      const unresolved = view.execution?.results.some(item => item.planId === planId && item.planRevision === plan.revision && ['running', 'awaiting-verification'].includes(item.state))
      if (unresolved)
        return { state: 'reconciliation-required' as const, steps: 0 }
      const completed = new Set(view.execution?.results.filter(item => item.planId === planId && item.planRevision === plan.revision && item.state === 'verified').map(item => item.stepId))
      const id = randomUUID()
      slice = { id, planId, planRevision: plan.revision, rootObligationId: plan.rootObligationId, obligationGeneration: plan.obligationGeneration, ingressId: `task-run:${id}`, state: 'ready', cursor: completed.size, budget: 16, attemptId: randomUUID(), updatedAt: now() }
      await ports.commit({ cardId, operationKey: `slice:${id}:admit`, changes: [], mutations: [{ type: 'execution-slice', slice, expectedState: null }] })
      await transition('running')
      let count = 0
      while (count < slice.budget && completed.size < plan.steps.length) {
        signal.throwIfAborted()
        if (ports.shouldYield?.()) {
          await transition('yielded')
          return { state: 'yielded' as const, steps: count }
        }
        const step = plan.steps.find(item => !completed.has(item.id) && item.dependsOn.every(id => completed.has(id)))
        if (!step) { await transition('waiting'); return { state: 'waiting' as const, steps: count } }
        const before = { planId, planRevision: plan.revision, stepId: step.id, attemptId: slice.attemptId, inputHash: step.inputHash, effectId: null, observationRefs: [], output: {}, state: 'running' as const, createdAt: now() }
        const previous = view.execution?.results.find(item => item.planId === planId && item.planRevision === plan.revision && item.stepId === step.id)
        await ports.commit({ cardId, operationKey: `step:${id}:${step.id}:start`, changes: [], mutations: [{ type: 'execution-step-result', result: before, expectedState: previous?.state ?? 'pending' }] })
        let result: Awaited<ReturnType<typeof ports.execute>>
        try { result = await ports.execute({ plan, step, slice, signal }) }
        catch (error) {
          const actual = await ports.read()
          const effect = actual.effects.find(item => item.turnId === slice!.ingressId && item.actionId === step.id)
          const uncertain = effect && ['dispatched', 'uncertain'].includes(effect.status)
          await ports.commit({ cardId, operationKey: `step:${id}:${step.id}:exception`, changes: [], mutations: [{ type: 'execution-step-result', result: { ...before, effectId: effect?.id ?? null, observationRefs: effect?.receipt ? [`observation:${effect.id}`] : [], output: { reason: uncertain ? 'operation-requires-reconciliation' : 'operation-did-not-complete' }, state: uncertain ? 'awaiting-verification' : 'blocked' }, expectedState: 'running' }] })
          throw error
        }
        await ports.commit({ cardId, operationKey: `step:${id}:${step.id}:result`, changes: [], mutations: [{ type: 'execution-step-result', result: { ...before, ...result }, expectedState: 'running' }] })
        count++
        if (result.state !== 'verified') { await transition('waiting'); return { state: 'waiting' as const, steps: count } }
        completed.add(step.id)
        slice = { ...slice, cursor: completed.size }
      }
      const done = completed.size === plan.steps.length
      await transition(done ? 'stopped' : 'yielded')
      return { state: done ? 'steps-observed' as const : 'yielded' as const, steps: count }
    }
    catch (error) {
      if (slice) {
        const actual = (await ports.read()).execution?.slices.find(item => item.id === slice!.id)
        if (actual)
          slice = actual
      }
      if (slice && ['running', 'stopping'].includes(slice.state)) {
        if (slice.state === 'running')
          await transition('stopping')
        const run = slice.ingressId
        const current = await ports.read()
        const uncertain = current.effects.some(effect => effect.turnId === run && ['dispatched', 'uncertain'].includes(effect.status))
        if (!uncertain)
          await transition('stopped')
      }
      throw error
    }
    finally { running.delete(planId) }
  }
  return { runSlice }
}
