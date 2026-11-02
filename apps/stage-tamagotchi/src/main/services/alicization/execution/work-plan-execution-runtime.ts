import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { BrowserWorkBinding, ExecutionCriteriaChange, ExecutionWorkProposal, WorkPlan, WorkStep } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'
import type { createExecutionInterruptRegistry } from '../execution-interrupt-registry'
import type { DeclaredWorkReference } from './declared-work-reference'
import type { reconcileExecutionEffect } from './effect-reconciler'
import type { ExecutionResourceBroker } from './resource-broker'
import type { WorkAdaptationProvider } from './work-adaptation-runtime'

import { randomUUID } from 'node:crypto'

import { readLifeInputText } from '../life-input-preview'
import { verifyLifeTaskCompletion } from '../life-task-verification-runtime'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { compileTaskAcceptance, executionDigest } from './acceptance-compiler'
import { markActionNotStartedError, withActionDispatch } from './action-dispatch-context'
import { pendingBrowserWork, reobserveBrowserWork } from './browser-work-binding'
import { executionReviewArtifacts } from './criterion-receipts'
import { declaredWorkProposal, matchesDeclaredWorkProposal } from './declared-work-proposal'
import { isDeclaredWorkReference } from './declared-work-reference'
import { recheckDownloadGoals } from './download-goal-runtime'
import { verifyExecutionDownload } from './download-goal-verifier'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { applyExplicitWorkRevision } from './explicit-work-revision'
import { reobserveNativeWork, sameNativeWindow } from './native-work-binding'
import { observeProcedureFailure } from './procedure-failure-repository'
import { adaptExecutionWork, isRejectedWorkAdaptation } from './work-adaptation-runtime'
import { resolveWorkInput, workInputHash } from './work-input-bindings'
import { validPlannedWorkInput } from './work-input-validation'
import { recoverExecutionWork } from './work-plan-recovery'
import { validateWorkPlan } from './work-plan-repository'
import { createWorkPlanScheduler } from './work-plan-scheduler'
import { assertExecutionJson } from './work-plan-schema'
import { inspectWorkProposalCoherence } from './work-proposal-coherence'
import { workReadBindingFailure } from './work-read-binding-failure'
import { recordWorkResult } from './work-result-delivery'
import { reviseExecutionWorkStep } from './work-step-revision'
import { commitWorkStop, workPauseMarkers } from './work-stop-control'

/**
 * Composition of the persistent scheduler with the same governed tool ports
 * used by desktop dialogue. It creates no second goal or personhood store.
 */
export function createWorkPlanExecutionRuntime(options: {
  fileRecovery?: (database: AlicizationDbService) => { forEffect: NonNullable<Parameters<typeof createLifeTurnRuntime>[0]['fileRecovery']> }
  getDatabase: () => AlicizationDbService
  enabled: (cardId: string) => boolean
  canContinue?: () => boolean
  withBrowserSession?: <T>(task: () => Promise<T>) => Promise<T>
  captureBrowserBinding?: () => BrowserWorkBinding | null
  isBrowserBindingCurrent?: (binding: BrowserWorkBinding | undefined) => boolean
  broker: ExecutionResourceBroker
  toolRegistry?: () => ReturnType<typeof createCanonicalToolRegistry>
  refreshCapabilities?: () => Promise<void>
  planReadRepair?: WorkAdaptationProvider
  interrupts: ReturnType<typeof createExecutionInterruptRegistry>
  tools: Record<string, (input: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>>
  recoveryReaders?: Parameters<typeof reconcileExecutionEffect>[1]['observe']
  stopChildEffects?: (cardId: string, effectIds: readonly string[]) => Promise<{ requested: number, stopped: boolean, state: string }>
  onError: (error: unknown) => void
  onVerified?: (input: { database: AlicizationDbService, registry: ReturnType<typeof createCanonicalToolRegistry>, plan: WorkPlan, thread: AlicizationTaskThreadRecord }) => Promise<void>
  onSettled?: (input: { cardId: string, thread: AlicizationTaskThreadRecord }) => Promise<void>
  observe?: (input: { database: AlicizationDbService, plan: WorkPlan, attemptId: string | null }) => { refresh: () => void, finish: () => Promise<void> }
}) {
  const defaultRegistry = createCanonicalToolRegistry()
  const registry = () => options.toolRegistry?.() ?? defaultRegistry
  const report = (error: unknown) => {
    try { options.onError(error) }
    catch { /* Diagnostics cannot change an execution result. */ }
  }
  const tasks = new Map<string, { cardId: string, browser: Promise<boolean>, classify: (browser: boolean) => void, writerStopped: Promise<void>, isWriting: () => boolean, controller: AbortController, promise: Promise<unknown> }>()
  const adaptations = new Map<string, { cardId: string, controller: AbortController, promise: Promise<unknown> }>()
  const pendingStops = new Set<string>()
  let closed = false
  function browserBinding(steps: Array<{ capabilityId: string }>) {
    if (!steps.some(step => step.capabilityId.startsWith('tool.browser_')))
      return undefined
    const binding = options.captureBrowserBinding?.()
    if (!binding || !options.isBrowserBindingCurrent?.(binding))
      throw new Error('An available browser surface must be explicitly bound before accepting browser work')
    return binding
  }
  async function browserAvailable(database: AlicizationDbService, plan: WorkPlan, view: Awaited<ReturnType<AlicizationDbService['readLifeState']>>) {
    if (!pendingBrowserWork(plan, view.execution?.results ?? []) || options.isBrowserBindingCurrent?.(plan.browserBinding))
      return true
    const goal = view.obligations.find(goal => goal.id === plan.rootObligationId)
    const thread = await database.getTaskThread(plan.rootThreadId)
    if (goal && !goal.invalidatedBy && goal.generation === plan.obligationGeneration && !['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status) && thread && thread.status !== 'paused')
      await database.upsertTaskThread({ ...thread, status: 'paused', summary: '浏览器连接或授权已变化，请在当前已授权页面重新观察后继续。', expectedUpdatedAt: thread.updatedAt })
    return false
  }
  function recover(database: AlicizationDbService, cardId: string, planId?: string) {
    const isOwned = (id: string) => closed || tasks.has(`${cardId}:${id}`)
    return recoverExecutionWork(database, isOwned, {
      planId,
      reconcile: (effect, id) => recoverExecutionEffect({ database, broker: options.broker, effect, writerStopped: () => !isOwned(id), observe: options.recoveryReaders }),
    })
  }
  async function proposeDeclared(input: DeclaredWorkReference & { cardId: string, turnId: string, abortSignal?: AbortSignal }) {
    input.abortSignal?.throwIfAborted()
    const reference = { sourceInputId: input.sourceInputId, proposalHash: input.proposalHash }
    if (!isDeclaredWorkReference(reference) || reference.sourceInputId !== `user:${input.turnId}`)
      throw new Error('Declared work reference must select the current user request')
    const database = options.getDatabase()
    const view = await database.readLifeState()
    const ingress = await database.getLifeIngress(reference.sourceInputId)
    if (view.cardId !== input.cardId || !options.enabled(input.cardId) || ingress?.kind !== 'user-turn' || !['accepted', 'processing'].includes(ingress.status))
      throw new Error('Declared work requires an active current user request')
    const request = await database.getLifeUserInput(reference.sourceInputId)
    const declared = request && declaredWorkProposal(readLifeInputText(request).text ?? '')
    if (!declared || declared.hash !== reference.proposalHash)
      throw new Error('The original declared work is unavailable or its hash changed')
    input.abortSignal?.throwIfAborted()
    // The ordinary admission rechecks the source and all capability/risk rules.
    return propose({ ...declared.proposal, cardId: input.cardId, turnId: input.turnId, abortSignal: input.abortSignal })
  }
  async function propose(input: ExecutionWorkProposal & { cardId: string, turnId: string, abortSignal?: AbortSignal, procedureSource?: { candidateId: string, version: string } }) {
    let admissionMayHaveChanged = false
    try {
      await options.refreshCapabilities?.()
      input.abortSignal?.throwIfAborted()
      const db = options.getDatabase()
      const admission = await db.getLifeIngress(`user:${input.turnId}`)
      const view = await db.readLifeState()
      if (view.cardId !== input.cardId || !options.enabled(input.cardId) || admission?.kind !== 'user-turn' || !['accepted', 'processing'].includes(admission.status))
        throw new Error('A new work responsibility requires its current user request')
      if (!input.goal.trim() || input.goal.length > 2000 || input.steps.length > 256)
        throw new TypeError('Work proposal exceeds its bounded shape')
      assertExecutionJson({ goal: input.goal, criteria: input.criteria, steps: input.steps })
      if (inspectWorkProposalCoherence({ goal: input.goal, criteria: input.criteria, steps: input.steps }).length)
        throw new Error('The proposed literal file content contradicts its required acceptance criteria')
      const currentRequest = await db.getLifeUserInput(admission.id)
      if (!currentRequest)
        throw new Error('The current work request is unavailable for independent parameter validation')
      const declared = declaredWorkProposal(readLifeInputText(currentRequest).text ?? '')
      if (declared && !matchesDeclaredWorkProposal(input, declared))
        throw new Error('The proposed work changed the exact parameters supplied in the current user request')
      const identity = executionDigest({ cardId: input.cardId, turnId: input.turnId, goal: input.goal })
      const threadId = `work:${identity}`
      const planId = `plan:${identity}`
      const contract = compileTaskAcceptance({ cardId: input.cardId, rootObligationId: `task:${threadId}`, obligationGeneration: 1, revision: 1, sourceInputIds: [admission.id], criteria: input.criteria, permittedResourceIds: [], permittedEffectPolicyId: 'local-default-risk-v1', stopConditions: ['source-withdrawn', 'user-cancelled', 'unknown-consequential-effect'] })
      const steps: WorkStep[] = input.steps.map((step) => {
        const manifest = registry().resolveActive(step.capabilityId)
        if (!manifest || !options.tools[step.capabilityId] || !validPlannedWorkInput(registry(), step))
          throw new Error('The proposed work contains an unavailable or invalid operation')
        return { ...step, inputHash: workInputHash(step), resourceIds: [], state: 'pending', attemptId: null, retryMode: manifest.effects?.retryClass === 'read-only' ? 'read-only' : 'reconcile-first' }
      })
      const surface = browserBinding(steps)
      const plan: WorkPlan = { id: planId, cardId: input.cardId, rootThreadId: threadId, rootObligationId: contract.rootObligationId, obligationGeneration: 1, revision: 1, acceptanceHash: contract.contractHash, readRepairPolicy: 'grounded-read-v1', steps, sourceEvidenceRefs: [admission.id], ...(surface ? { browserBinding: surface } : {}) }
      validateWorkPlan(plan, contract)
      const previous = view.execution?.plans.find(item => item.id === planId)
      if (previous) {
        if (executionDigest(previous) !== executionDigest(plan))
          throw new Error('Revise the accepted work explicitly instead of changing its original proposal')
        return { status: 'accepted', planId, rootThreadId: threadId, reused: true }
      }
      const thread = await db.getTaskThread(threadId)
      if (!thread) {
        admissionMayHaveChanged = true
        await db.upsertTaskThread({ id: threadId, createOnly: true, turnId: input.turnId, sessionId: String(admission.payload.conversationId ?? ''), origin: 'user-turn', goal: input.goal, kind: 'mixed', status: 'planned', metadata: { acceptanceCriteria: contract.criteria, workPlanId: planId, acceptanceMode: 'explicit-contract-v1' } })
      }
      admissionMayHaveChanged = true
      try { await savePlan({ cardId: input.cardId, plan, expectedRevision: 0, requestId: `proposal:${identity}` }, input.procedureSource) }
      catch (error) {
        if (input.procedureSource) {
          const rejected = await db.getTaskThread(threadId)
          if (rejected?.status === 'planned')
            await db.upsertTaskThread({ ...rejected, status: 'cancelled', summary: '学习来源已失效，这次复用没有开始执行。', expectedUpdatedAt: rejected.updatedAt })
        }
        throw error
      }
      input.abortSignal?.throwIfAborted()
      const result = await start({ cardId: input.cardId, planId, expectedRevision: 1, requestId: `initial:${identity}` })
      return { status: result.state, planId, rootThreadId: threadId, goal: input.goal, acceptance: contract.criteria.map(item => ({ id: item.id, scope: item.proofScope, required: item.required })) }
    }
    catch (error) {
      if (!admissionMayHaveChanged)
        throw markActionNotStartedError(error)
      throw error
    }
  }
  async function save(input: { cardId: string, plan: WorkPlan, expectedRevision: number, requestId: string }) {
    return savePlan(input)
  }
  async function savePlan(input: Parameters<typeof save>[0], procedureSource?: { candidateId: string, version: string }, rebind?: { id: string, source: 'execution-browser-rebind' | 'execution-native-reobserve', payload: Record<string, unknown> }) {
    await options.refreshCapabilities?.()
    const db = options.getDatabase()
    const view = await db.readLifeState({ executionPlanId: input.plan.id })
    if (view.cardId !== input.cardId || input.plan.cardId !== input.cardId)
      throw new Error('Work plan command crossed the active card boundary')
    if (input.plan.steps.some(step => step.capabilityId.startsWith('tool.browser_')) && !options.isBrowserBindingCurrent?.(input.plan.browserBinding))
      throw new Error('Work plan browser access is no longer current')
    for (const step of input.plan.steps) {
      const manifest = registry().resolveActive(step.capabilityId)
      if (!manifest || !options.tools[manifest.capabilityId] || !validPlannedWorkInput(registry(), step))
        throw new Error('Work plan contains an unavailable or invalid operation')
      if (step.retryMode === 'read-only' && manifest.effects?.sideEffect !== 'read')
        throw new Error('A mutating operation cannot declare read-only retries')
    }
    return db.commitLifeState({ cardId: input.cardId, operationKey: `work-plan-save:${input.requestId}`, changes: [], mutations: [...(rebind ? [{ type: 'ingress-accept' as const, ingress: { id: rebind.id, kind: 'feedback' as const, source: rebind.source, sourceKey: input.requestId, occurredAt: Date.now(), payload: rebind.payload } }, { type: 'ingress-settle' as const, id: rebind.id, status: 'settled' as const }] : []), { type: 'execution-plan', plan: input.plan, expectedRevision: input.expectedRevision }, ...(procedureSource ? [{ type: 'execution-procedure-bind' as const, threadId: input.plan.rootThreadId, ...procedureSource }] : [])] })
  }
  interface RunInput { cardId: string, planId: string, expectedRevision: number, requestId: string, signal?: AbortSignal }
  async function executeRun(input: RunInput, writerStopped: () => void, completed: (thread: AlicizationTaskThreadRecord) => void) {
    input.signal?.throwIfAborted()
    if (!options.enabled(input.cardId))
      throw new Error('Execution is suspended or belongs to an inactive card')
    const db = options.getDatabase()
    const read = () => db.readLifeState({ executionPlanId: input.planId })
    const view = await read()
    const plan = view.execution?.plans.find(item => item.id === input.planId)
    if (view.cardId !== input.cardId || !plan || plan.revision !== input.expectedRevision)
      throw new Error('Work plan changed; reload before resuming it')
    const executionRegistry = registry()
    const task = tasks.get(`${input.cardId}:${input.planId}`)
    task?.classify(plan.steps.some(step => step.capabilityId.startsWith('tool.browser_')))
    if (!await browserAvailable(db, plan, view))
      throw new Error('EXECUTION_BROWSER_BINDING_CHANGED')
    const markerId = `work-run-request:${input.requestId}`
    const existing = await db.getLifeIngress(markerId)
    const binding = { cardId: input.cardId, planId: plan.id, revision: plan.revision }
    if (existing) {
      if (existing.payload.bindingHash !== executionDigest(binding))
        throw new Error('Work request identifier was reused with different parameters')
      return { state: existing.status === 'settled' ? 'already-recorded' : 'reconciliation-required' }
    }
    await db.commitLifeState({ cardId: input.cardId, operationKey: `work-run-admit:${input.requestId}`, changes: [], mutations: [{ type: 'ingress-accept', ingress: { id: markerId, source: 'work-run-request', sourceKey: input.requestId, kind: 'system', occurredAt: Date.now(), payload: { bindingHash: executionDigest(binding), planId: plan.id } } }] })
    input.signal?.throwIfAborted()
    const life = createLifeTurnRuntime({ fileRecovery: options.fileRecovery?.(db).forEffect, resourceBroker: options.broker, read, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
    const observedThread = await db.getTaskThread(plan.rootThreadId)
    const observer = options.observe?.({ database: db, plan, attemptId: observedThread?.attemptId ?? null })
    let delivery: AlicizationTaskThreadRecord | null = null
    observer?.refresh()
    const scheduler = createWorkPlanScheduler({
      read,
      shouldYield: () => options.canContinue?.() === false,
      commit: async (input) => { const receipt = await db.commitLifeState(input); observer?.refresh(); return receipt },
      execute: async ({ step, slice, signal }) => {
        await options.refreshCapabilities?.()
        if (!options.enabled(input.cardId))
          throw new Error('Work responsibility is suspended or inactive')
        const manifest = registry().resolveActive(step.capabilityId)
        const execute = options.tools[step.capabilityId]
        if (!manifest || !execute)
          throw new Error('The planned operation is no longer available')
        const observationRefs: string[] = []
        let parameters: Record<string, unknown>
        let nativeWindowSource: unknown
        try {
          const readObservation = async (stepId: string) => {
            const view = await read()
            const result = view.execution?.results.find(item => item.planId === plan.id && item.planRevision === plan.revision && item.stepId === stepId && item.state === 'verified')
            const effect = result?.effectId ? await db.getLifeEffect(result.effectId) : null
            if (effect?.status !== 'settled' || effect.receipt?.outcome !== 'success')
              throw new Error('The dependency observation is no longer available')
            observationRefs.push(`observation:${effect.id}`)
            return effect.receipt.output
          }
          parameters = await resolveWorkInput(step, readObservation)
          if (step.nativeWindowSourceStepId) {
            nativeWindowSource = await readObservation(step.nativeWindowSourceStepId)
            if (!sameNativeWindow(nativeWindowSource, nativeWindowSource))
              throw new Error('The original native window identity is unavailable')
          }
          if (!registry().validateInput(step.capabilityId, parameters).valid)
            throw new Error('The observed operation input does not match its active interface')
        }
        catch (error) {
          signal.throwIfAborted()
          const failure = manifest.effects?.sideEffect === 'read' && manifest.effects.retryClass === 'read-only' && workReadBindingFailure(step, observationRefs, error)
          if (failure)
            return failure
          throw error
        }
        const browser = step.capabilityId.startsWith('tool.browser_')
        if (browser && !options.isBrowserBindingCurrent?.(plan.browserBinding))
          throw new Error('EXECUTION_BROWSER_BINDING_CHANGED')
        const action = await life.beforeAction({ cardId: input.cardId, turnId: slice.ingressId, actionId: step.id, capabilityId: step.capabilityId, parameters, effectContract: manifest.effects, ...(browser ? { browserBinding: plan.browserBinding } : {}) }, signal)
        observer?.refresh()
        let output: unknown
        let adapterStarted = false
        try {
          signal.throwIfAborted()
          if (!options.enabled(input.cardId))
            throw new Error('Work owner changed before adapter dispatch')
          if (!action.cached)
            await action.authorizeDispatch(parameters)
          output = action.cached
            ? action.cached.output
            : await withActionDispatch(action.assertDispatchCurrent, () => {
                adapterStarted = true
                return execute(parameters, signal)
              })
        }
        catch (error) {
          if (!action.cached)
            await life.afterAction({ cardId: input.cardId, id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: adapterStarted && manifest.effects?.sideEffect !== 'read' }, interrupted: adapterStarted && signal.aborted })
          throw error
        }
        if (step.nativeWindowSourceStepId && !sameNativeWindow(nativeWindowSource, output))
          output = { ok: false, channel: 'desktop', operation: 'desktop_list_interactables', errorCode: 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED', requiresReadback: true, effectMayHaveOccurred: false, sideEffectState: 'none', observed: output ?? null }
        const value = output && typeof output === 'object' ? output as Record<string, unknown> : {}
        const success = (value.ok === true || ['completed', 'succeeded', 'success'].includes(String(value.status))) && value.ok !== false && value.status !== 'failed' && value.isError !== true && value.effectMayHaveOccurred !== true
        if (!action.cached)
          await life.afterAction({ cardId: input.cardId, id: action.id, outcome: success ? 'success' : 'failure', output, interrupted: signal.aborted })
        const effect = await db.getLifeEffect(action.id)
        const uncertain = effect?.status === 'uncertain' || effect?.status === 'dispatched'
        return { effectId: action.id, observationRefs: [`observation:${action.id}`], output: { operation: step.capabilityId, resultHash: executionDigest(output ?? null), observedAt: Date.now() }, state: uncertain ? 'awaiting-verification' : success ? 'verified' : 'blocked' }
      },
    })
    return options.interrupts.run({
      coordinateSteps: true,
      cardId: input.cardId,
      threadId: plan.rootThreadId,
      signal: input.signal,
      confirmStopped: async () => {
        const current = await read()
        const runs = new Set(current.execution?.slices.map(item => item.ingressId))
        return !current.effects.some(effect => effect.turnId && runs.has(effect.turnId) && ['dispatched', 'uncertain', 'claimed'].includes(effect.status))
      },
    }, async (signal) => {
      const rootThread = await db.getTaskThread(plan.rootThreadId)
      if (!rootThread)
        throw new Error('Root task disappeared before the work window started')
      await db.upsertTaskThread({ ...rootThread, status: 'running', expectedUpdatedAt: rootThread.updatedAt })
      observer?.refresh()
      let outcome: Awaited<ReturnType<typeof scheduler.runSlice>>
      let windows = 0
      do {
        outcome = await scheduler.runSlice(plan.id, signal)
        windows++
      } while (outcome.state === 'yielded' && windows < 16 && options.enabled(input.cardId) && options.canContinue?.() !== false)
      if (outcome.state === 'steps-observed') {
        const thread = await db.getTaskThread(plan.rootThreadId)
        if (!thread)
          throw new Error('The root execution thread disappeared')
        await db.upsertTaskThread({ ...thread, status: 'completed', expectedUpdatedAt: thread.updatedAt })
        observer?.refresh()
        await verifyLifeTaskCompletion({ cardId: input.cardId, threadId: plan.rootThreadId, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue, database: db })
        try {
          const settled = await recordWorkResult(db, plan)
          delivery = settled
          const goal = (await read()).obligations.find(item => item.id === plan.rootObligationId)
          // Learning is a deterministic commit of verified work. A foreground
          // dialogue may defer delivery without deferring this evidence.
          if (settled && goal?.status === 'fulfilled' && goal.verification?.independent && !goal.invalidatedBy)
            await options.onVerified?.({ database: db, registry: executionRegistry, plan, thread: settled })
          await observeProcedureFailure(db, plan)
        }
        catch (error) { report(error) }
      }
      else if (outcome.state !== 'yielded') {
        const thread = await db.getTaskThread(plan.rootThreadId)
        const goal = (await db.readLifeState()).obligations.find(item => item.id === plan.rootObligationId)
        if (thread && goal && !goal.invalidatedBy && !['cancelled', 'fulfilled', 'superseded'].includes(goal.status))
          await db.upsertTaskThread({ ...thread, status: 'paused', summary: '进展已保存，等待核对或继续处理。', expectedUpdatedAt: thread.updatedAt })
      }
      await db.commitLifeState({ cardId: input.cardId, operationKey: `work-run-settle:${input.requestId}`, changes: [], mutations: [{ type: 'ingress-settle', id: markerId, status: 'settled' }] })
      return { ...outcome, windows }
    }).catch(async (error) => {
      const thread = await db.getTaskThread(plan.rootThreadId)
      const goal = (await db.readLifeState()).obligations.find(item => item.id === plan.rootObligationId)
      if (thread && goal && !goal.invalidatedBy && !['cancelled', 'fulfilled', 'superseded'].includes(goal.status))
        await db.upsertTaskThread({ ...thread, status: 'paused', summary: '任务已暂停，已发生的操作会保留并核对。', expectedUpdatedAt: thread.updatedAt })
      throw error
    }).finally(async () => {
      try { await observer?.finish() }
      finally { writerStopped() }
    }).then((result) => {
      if (delivery)
        completed(delivery)
      return result
    })
  }
  function run(input: RunInput) {
    if (closed)
      return Promise.reject(new Error('Execution runtime is closing'))
    const key = `${input.cardId}:${input.planId}`
    if (pendingStops.has(key))
      return Promise.reject(new Error('Work plan has a pending host stop'))
    if (tasks.has(key))
      return Promise.reject(new Error('Work plan already has an active owner'))
    const controller = new AbortController()
    let classify!: (browser: boolean) => void
    const browser = new Promise<boolean>((resolve) => { classify = resolve })
    const stopped = Promise.withResolvers<void>()
    let writing = true
    const finishWriter = () => { writing = false; stopped.resolve() }
    const signal = input.signal ? AbortSignal.any([input.signal, controller.signal]) : controller.signal
    let delivery: AlicizationTaskThreadRecord | null = null
    const execute = () => executeRun({ ...input, signal }, finishWriter, (thread) => { delivery = thread })
    const promise = (options.withBrowserSession ? options.withBrowserSession(execute) : execute()).finally(() => {
      finishWriter()
      classify(false)
      tasks.delete(key)
      // Notification can reenter this plan or wait for a foreground card scope.
      // Its durable result is committed; release execution ownership first.
      if (delivery)
        queueCompletionNotification({ cardId: input.cardId, thread: delivery })
      // Cancellation can finish after the foreground stop command's wake. Now
      // the adapter owner is gone, reconcile its actual effects without needing
      // another user interaction. Terminal roots are never resumed by recovery.
      wakeReady()
    })
    tasks.set(key, { cardId: input.cardId, browser, classify, writerStopped: stopped.promise, isWriting: () => writing, controller, promise })
    return promise
  }
  async function singleStepPlan(input: { cardId: string, threadId: string, capabilityId: string, parameters: Record<string, unknown> }) {
    await options.refreshCapabilities?.()
    const view = await options.getDatabase().readLifeState()
    const root = view.obligations.find(item => item.threadId === input.threadId)
    const contract = view.execution?.contracts.find(item => item.rootObligationId === root?.id && item.obligationGeneration === root.generation)
    if (!root || !contract || view.cardId !== input.cardId)
      throw new Error('Task has no current acceptance contract')
    const manifest = registry().resolveActive(input.capabilityId)
    if (!manifest)
      throw new Error('Task operation is unavailable')
    const step: WorkStep = { id: 'perform', dependsOn: [], capabilityId: input.capabilityId, input: input.parameters, inputHash: executionDigest(input.parameters), acceptanceCriterionIds: contract.criteria.map(item => item.id), resourceIds: [], retryMode: manifest.effects?.retryClass === 'read-only' ? 'read-only' : 'reconcile-first', state: 'pending', attemptId: null }
    const surface = browserBinding([step])
    const plan: WorkPlan = { id: randomUUID(), cardId: view.cardId, rootThreadId: input.threadId, rootObligationId: root.id, obligationGeneration: root.generation, revision: 1, acceptanceHash: contract.contractHash, steps: [step], sourceEvidenceRefs: [], ...(surface ? { browserBinding: surface } : {}) }
    await save({ cardId: input.cardId, plan, expectedRevision: 0, requestId: randomUUID() })
    return plan
  }
  const starts = new Map<string, string>()
  const startAdmissions = new Map<string, { hash: string, promise: Promise<{ state: string }> }>()
  function start(input: { cardId: string, planId: string, expectedRevision: number, requestId: string }) {
    input = structuredClone(input)
    const key = `${input.cardId}:${input.requestId}`
    const hash = executionDigest(input)
    const existing = startAdmissions.get(key)
    if (existing)
      return existing.hash === hash ? existing.promise : Promise.reject(new Error('Work request identifier was reused with different parameters'))
    const promise = acceptStart(input).finally(() => startAdmissions.delete(key))
    startAdmissions.set(key, { hash, promise })
    return promise
  }
  async function acceptStart(input: { cardId: string, planId: string, expectedRevision: number, requestId: string }) {
    const db = options.getDatabase()
    const nativeId = `work-native-reobserve:${input.requestId}`
    const previousNative = await db.getLifeIngress(nativeId)
    if (previousNative) {
      if (previousNative.payload.bindingHash !== executionDigest(input))
        throw new Error('Work request identifier was reused with different parameters')
      return { state: 'already-accepted' }
    }
    if (!tasks.has(`${input.cardId}:${input.planId}`))
      await recover(options.getDatabase(), input.cardId, input.planId)
    const view = await options.getDatabase().readLifeState({ executionPlanId: input.planId })
    const plan = view.execution?.plans.find(item => item.id === input.planId)
    const goal = plan && view.obligations.find(item => item.id === plan.rootObligationId)
    if (view.cardId !== input.cardId || !options.enabled(input.cardId) || !plan || plan.revision !== input.expectedRevision || !goal || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || ['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status))
      throw new Error('Reload the current accepted responsibility before starting this plan')
    if (!await browserAvailable(options.getDatabase(), plan, view))
      return { state: 'browser-access-changed' }
    if (view.execution?.slices.some(item => item.planId === plan.id && ['ready', 'running', 'stopping'].includes(item.state)))
      return { state: 'reconciliation-required' }
    if (view.execution?.results.some(item => item.planId === plan.id && item.planRevision === plan.revision && ['running', 'awaiting-verification'].includes(item.state)))
      return { state: 'reconciliation-required' }
    const refreshed = await reobserveNativeWork(plan, view.execution?.results ?? [], db.getLifeEffect, nativeId)
    const paused = workPauseMarkers(view, plan)
    if (paused.length) {
      await options.getDatabase().commitLifeState({ cardId: input.cardId, expectedRevision: view.revision, operationKey: `work-resume:${input.requestId}`, changes: [], mutations: paused.map(ingress => ({ type: 'ingress-settle', id: ingress.id, status: 'settled', expectedStatus: 'held', expectedPayloadHash: ingress.payloadHash })) })
    }
    if (refreshed)
      await savePlan({ ...input, plan: refreshed }, undefined, { id: nativeId, source: 'execution-native-reobserve', payload: { bindingHash: executionDigest(input), planId: plan.id, previousRevision: plan.revision, revision: refreshed.revision, rootObligationId: plan.rootObligationId, reobserveStepIds: refreshed.steps.filter(step => !plan.steps.some(previous => previous.id === step.id)).map(step => step.id) } })
    pendingStops.delete(`${input.cardId}:${input.planId}`)
    const key = `${input.cardId}:${input.requestId}`
    const digest = executionDigest(input)
    const previous = starts.get(key)
    if (previous && previous !== digest)
      throw new Error('Work request identifier was reused with different parameters')
    if (previous)
      return { state: 'already-accepted' }
    starts.set(key, digest)
    void run(refreshed ? { ...input, expectedRevision: refreshed.revision, requestId: `native-reobserve-start:${input.requestId}` } : input).catch(report).finally(() => starts.delete(key))
    return { state: 'accepted' }
  }
  const rebinds = new Map<string, { hash: string, promise: Promise<{ state: string }> }>()
  function reobserve(input: { cardId: string, planId: string, expectedRevision: number, requestId: string }) {
    const hash = executionDigest(input)
    const key = `${input.cardId}:${input.requestId}`
    const pending = rebinds.get(key)
    if (pending)
      return pending.hash === hash ? pending.promise : Promise.reject(new Error('Browser reconnection request ID changed its parameters'))
    const promise = (async () => {
      if (closed || !options.enabled(input.cardId))
        throw new Error('Browser work cannot reconnect while execution is suspended')
      const db = options.getDatabase()
      const id = `work-browser-rebind:${input.requestId}`
      const previous = await db.getLifeIngress(id)
      if (previous) {
        if (previous.payload.bindingHash !== hash)
          throw new Error('Browser reconnection request ID changed its parameters')
        return { state: 'browser-rebound' }
      }
      if (tasks.has(`${input.cardId}:${input.planId}`))
        throw new Error('Stop the active browser work before reconnecting it')
      await recover(db, input.cardId, input.planId)
      const view = await db.readLifeState({ executionPlanId: input.planId })
      const plan = view.execution?.plans.find(plan => plan.id === input.planId)
      const goal = plan && view.obligations.find(goal => goal.id === plan.rootObligationId)
      if (view.cardId !== input.cardId || !plan || plan.revision !== input.expectedRevision || !goal || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || ['fulfilled', 'cancelled', 'superseded', 'failed'].includes(goal.status))
        throw new Error('Reload the same accepted responsibility before reconnecting it')
      const binding = options.captureBrowserBinding?.()
      if (!binding || !options.isBrowserBindingCurrent?.(binding))
        return { state: 'browser-access-changed' }
      if (!pendingBrowserWork(plan, view.execution?.results ?? []))
        throw new Error('This work has no unfinished browser operation to reconnect')
      const next = reobserveBrowserWork(plan, view.execution?.results ?? [], binding, id)
      await savePlan({ ...input, plan: next }, undefined, { id, source: 'execution-browser-rebind', payload: { bindingHash: hash, planId: plan.id, previousRevision: plan.revision, revision: next.revision, rootObligationId: plan.rootObligationId, previousBrowserBinding: plan.browserBinding ?? null, browserBinding: binding, reobserveStepIds: next.steps.filter(step => !plan.steps.some(previous => previous.id === step.id)).map(step => step.id) } })
      const result = await start({ ...input, expectedRevision: next.revision, requestId: `browser-rebind-start:${input.requestId}` })
      return result.state === 'browser-access-changed' ? result : { state: 'browser-rebound' }
    })().finally(() => rebinds.delete(key))
    rebinds.set(key, { hash, promise })
    return promise
  }
  const criteriaChanges = new Map<string, { hash: string, promise: Promise<{ state: string }> }>()
  function changeCriteria(raw: ExecutionCriteriaChange) {
    const input = structuredClone(raw)
    const hash = executionDigest(input)
    const key = `${input.cardId}:${input.requestId}`
    const pending = criteriaChanges.get(key)
    if (pending)
      return pending.hash === hash ? pending.promise : Promise.reject(new Error('Criteria request ID changed its parameters'))
    const promise = (async () => {
      if (closed || !options.enabled(input.cardId) || tasks.get(`${input.cardId}:${input.planId}`)?.isWriting())
        throw new Error('Pause active work before changing its acceptance requirements')
      const db = options.getDatabase()
      const id = `work-criteria-change:${input.requestId}`
      const previous = await db.getLifeIngress(id)
      if (previous) {
        if (previous.payload.bindingHash !== hash)
          throw new Error('Criteria request ID changed its parameters')
        return { state: 'criteria-revised' }
      }
      if (input.stepChanges || input.graphChanges) {
        await options.refreshCapabilities?.()
        const current = await db.readLifeState({ executionPlanId: input.planId })
        const plan = current.execution?.plans.find(plan => plan.id === input.planId)
        if (current.cardId !== input.cardId || !plan || plan.revision !== input.expectedRevision)
          throw new Error('Reload the accepted work before changing its unfinished steps')
        const protectedIds = current.execution!.results.filter(result => result.planId === plan.id && result.planRevision === plan.revision && result.state === 'verified').map(result => result.stepId)
        const next = applyExplicitWorkRevision(plan, input, protectedIds)
        for (const step of next.steps) {
          if (protectedIds.includes(step.id))
            continue
          if (!registry().resolveActive(step.capabilityId) || !options.tools[step.capabilityId] || !validPlannedWorkInput(registry(), step))
            throw new Error('The revised requirements contain an unavailable or invalid operation')
        }
        if (plan.browserBinding && !options.isBrowserBindingCurrent?.(plan.browserBinding))
          throw new Error('The browser surface changed before the requirement revision')
      }
      await db.commitLifeState({ cardId: input.cardId, operationKey: id, changes: [], mutations: [{ type: 'execution-criteria-revise', command: input }] })
      const view = await db.readLifeState({ executionPlanId: input.planId })
      const plan = view.execution?.plans.find(plan => plan.id === input.planId)
      const thread = plan && await db.getTaskThread(plan.rootThreadId)
      if (plan && thread && options.observe) {
        try { await options.observe({ database: db, plan, attemptId: thread.attemptId ?? null }).finish() }
        catch (error) { report(error) }
      }
      return { state: 'criteria-revised' }
    })().finally(() => criteriaChanges.delete(key))
    criteriaChanges.set(key, { hash, promise })
    return promise
  }
  async function stop(input: { cardId: string, planId: string, expectedRevision: number, requestId: string, action: 'pause' | 'cancel' }) {
    const db = options.getDatabase()
    const markerId = `work-stop:${input.requestId}`
    const digest = executionDigest(input)
    const existing = await db.getLifeIngress(markerId)
    if (existing) {
      if (existing.payload.bindingHash !== digest)
        throw new Error('Stop request ID was reused with different parameters')
      return { state: 'already-requested' }
    }
    const key = `${input.cardId}:${input.planId}`
    const { plan, childEffects, terminal } = await commitWorkStop(db, input, () => {
      // Fence future owners immediately while the writer records the stop.
      // A persistence failure keeps this fence until an explicit Continue.
      pendingStops.add(key)
      tasks.get(key)?.controller.abort(new DOMException('User stopped this work plan', 'AbortError'))
      adaptations.get(key)?.controller.abort(new DOMException('User stopped work planning', 'AbortError'))
    })
    pendingStops.delete(key)
    const result = options.interrupts.cancel(input.cardId, plan.rootThreadId)
    const thread = await db.getTaskThread(plan.rootThreadId)
    if (!terminal && thread && thread.status !== 'completed')
      await db.upsertTaskThread({ ...thread, status: input.action === 'cancel' ? 'cancelled' : 'paused', expectedUpdatedAt: thread.updatedAt })
    // A paused window may already have no writer. Still settle its durable
    // stopping cursor from actual receipts, without relying on a later tick.
    void wakeReady()
    if (options.stopChildEffects) {
      try {
        const children = await options.stopChildEffects(input.cardId, childEffects)
        return { ...result, stopped: result.stopped && children.stopped, state: result.stopped && children.stopped ? terminal ? 'already-settled' : 'stopped' : 'stopping', childResources: children }
      }
      catch (error) {
        report(error)
        return { ...result, stopped: false, state: 'stopping' }
      }
    }
    return terminal && result.stopped ? { ...result, state: 'already-settled' } : result
  }
  async function refreshOutcome(input: { cardId: string, obligationId: string }) {
    if (closed || !options.enabled(input.cardId))
      return
    const database = options.getDatabase()
    const view = await database.readLifeState()
    if (view.cardId !== input.cardId)
      throw new Error('Execution outcome crossed the current card')
    const goal = view.obligations.find(item => item.id === input.obligationId)
    const plan = view.execution?.plans.find(item => item.rootObligationId === goal?.id && item.obligationGeneration === goal?.generation)
    const thread = plan && await database.getTaskThread(plan.rootThreadId)
    if (plan && thread && options.observe) {
      try { await options.observe({ database, plan, attemptId: thread.attemptId ?? null }).finish() }
      catch (error) { report(error) }
    }
  }
  async function review(input: { cardId: string, obligationId: string, expectedGeneration: number, contractHash: string, criterionId: string, approved: boolean, requestId: string }) {
    const db = options.getDatabase()
    const view = await db.readLifeState()
    const goal = view.obligations.find(item => item.id === input.obligationId)
    const id = `work-review:${input.requestId}`
    const bindingHash = executionDigest(input)
    const existing = await db.getLifeIngress(id)
    if (existing) {
      if (view.cardId !== input.cardId || existing.payload.bindingHash !== bindingHash)
        throw new Error('Review request ID was reused with different parameters')
      return { state: goal?.generation === input.expectedGeneration ? goal.verification?.verdict ?? 'unknown' : 'unknown' }
    }
    const contract = goal?.proof.acceptance
    if (view.cardId !== input.cardId || !goal || goal.invalidatedBy || goal.generation !== input.expectedGeneration || !contract || contract.contractHash !== input.contractHash || !['blocked', 'verifying'].includes(goal.status))
      throw new Error('Reload the current delivered artifacts before reviewing this work')
    const criterion = contract.criteria.find(item => item.id === input.criterionId)
    if (criterion?.predicate.kind !== 'user-review')
      throw new Error('This criterion requires an independent verifier')
    const artifacts = await executionReviewArtifacts(contract, criterion.id, predicate => verifyExecutionDownload({ database: db, view, contract, predicate }))
    await db.commitLifeState({ cardId: input.cardId, operationKey: id, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id, source: 'execution-user-review', sourceKey: input.requestId, kind: 'feedback', occurredAt: Date.now(), payload: { bindingHash, contractHash: contract.contractHash, obligationId: goal.id, obligationGeneration: goal.generation, criterionId: criterion.id, criterionHash: artifacts.criterionHash, artifactFingerprint: artifacts.fingerprint, approved: input.approved } } },
      { type: 'ingress-settle', id, status: 'settled' },
      ...(goal.status === 'blocked' ? [{ type: 'obligation-update' as const, id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' as const }] : []),
    ] })
    const result = await verifyLifeTaskCompletion({ cardId: input.cardId, threadId: goal.threadId!, read: db.readLifeState, commit: db.commitLifeState, readSetting: db.getMetaValue, database: db })
    await refreshOutcome(input)
    return { state: result?.verdict ?? 'unknown' }
  }
  async function downloadArtifact(input: { cardId: string, obligationId: string, expectedGeneration: number, criterionId: string }) {
    const db = options.getDatabase()
    const view = await db.readLifeState()
    const goal = view.obligations.find(item => item.id === input.obligationId && item.generation === input.expectedGeneration && !item.invalidatedBy)
    const contract = goal?.proof.acceptance
    const predicate = contract?.criteria.find(item => item.id === input.criterionId)?.predicate
    if (view.cardId !== input.cardId || !contract || predicate?.kind !== 'browser-download')
      throw new Error('The accepted download artifact is no longer available')
    const checked = await verifyExecutionDownload({ database: db, view, contract, predicate })
    if (checked.verdict !== 'satisfied' || typeof checked.evidence.path !== 'string')
      throw new Error('The downloaded artifact no longer matches its verified bytes')
    const current = (await db.readLifeState()).obligations.find(item => item.id === goal!.id)
    if (current?.invalidatedBy || current?.generation !== goal!.generation || current.proof.acceptance?.contractHash !== contract.contractHash)
      throw new Error('The accepted download changed before opening its artifact')
    return checked.evidence.path
  }
  function suspend(cardId?: string) {
    for (const task of [...tasks.values(), ...adaptations.values()]) {
      if (cardId === undefined || task.cardId === cardId)
        task.controller.abort(new DOMException('Execution work was suspended', 'AbortError'))
    }
  }
  async function suspendBrowser(cardId: string) {
    const matching = [...tasks.values()].filter(task => task.cardId === cardId)
    await Promise.all(matching.map(async (task) => {
      if (await task.browser) {
        task.controller.abort(new DOMException('Browser access was revoked or taken over', 'AbortError'))
        // A delivery notification may wait for a Provider/card scope after the
        // adapter lease has closed. It must not delay actual input takeover.
        await task.writerStopped
      }
    }))
  }
  async function dispose() {
    closed = true
    suspend()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([Promise.allSettled([...tasks.values(), ...adaptations.values()].map(task => task.promise).concat(draining ? [draining] : [], checkingDownloads ? [checkingDownloads] : [], [...completionNotifications])), new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000) })])
    }
    finally { clearTimeout(timer) }
    return { pending: tasks.size + adaptations.size }
  }
  let draining: Promise<void> | null = null
  let checkingDownloads: Promise<void> | null = null
  const completionNotifications = new Set<Promise<void>>()
  function queueCompletionNotification(input: { cardId: string, thread: AlicizationTaskThreadRecord }, observe?: () => Promise<void>) {
    if (closed)
      return
    if (completionNotifications.size >= 64) {
      report(new Error('Completion notification budget exceeded; durable task results remain available for reconciliation'))
      return
    }
    const notification = Promise.resolve().then(async () => {
      if (closed)
        return
      try { await observe?.() }
      catch (error) { report(error) }
      if (!closed) {
        try { await options.onSettled?.(input) }
        catch (error) { report(error) }
      }
    }).catch(report).finally(() => completionNotifications.delete(notification))
    completionNotifications.add(notification)
  }
  let downloadWakePending = false
  async function notifyDownload(cardId: string) {
    if (closed || !options.enabled(cardId))
      return
    if (checkingDownloads) {
      downloadWakePending = true
      return checkingDownloads
    }
    checkingDownloads = (async () => {
      do {
        downloadWakePending = false
        if (closed || !options.enabled(cardId))
          return
        const db = options.getDatabase()
        // An unrelated browser may still await host input. Do not hold other
        // accepted work behind it; this plan's writer closure wakes us again.
        for (const delivered of await recheckDownloadGoals(db, cardId, id => tasks.get(`${cardId}:${id}`)?.isWriting() === true)) {
          // A callback can enter another card scope or request this same check.
          // Never hold the verification gate while waiting for its consumers.
          // The already committed result also survives a missing notification.
          queueCompletionNotification({ cardId, thread: delivered.thread }, async () => {
            await options.observe?.({ database: db, plan: delivered.plan, attemptId: delivered.thread.attemptId ?? null }).finish()
          })
        }
      } while (downloadWakePending)
    })().catch(report).finally(() => { checkingDownloads = null })
    return checkingDownloads
  }
  let wakePending = false
  function queueReadRepair(cardId: string, planId: string) {
    const generate = options.planReadRepair
    const key = `${cardId}:${planId}`
    if (!generate || closed || tasks.has(key) || adaptations.has(key) || pendingStops.has(key) || options.canContinue?.() === false)
      return
    const controller = new AbortController()
    let observer: ReturnType<NonNullable<typeof options.observe>> | undefined
    const promise = adaptExecutionWork({ database: options.getDatabase(), registry, tools: new Set(Object.keys(options.tools)), generate, canApply: () => !closed && options.enabled(cardId) && options.canContinue?.() !== false && !tasks.has(key) && !pendingStops.has(key), onAdmitted: async (plan) => {
      try {
        const database = options.getDatabase()
        const thread = await database.getTaskThread(plan.rootThreadId)
        if (!thread || controller.signal.aborted)
          return
        observer = options.observe?.({ database, plan, attemptId: thread.attemptId ?? null })
        observer?.refresh()
      }
      catch (error) { report(error) }
    } }, { cardId, planId, signal: controller.signal }).then((result) => {
      // Resume a valid revision after this planner releases ownership. A held
      // attempt waits for another real runtime event, avoiding a retry spinner.
      return result.state === 'revised' && !controller.signal.aborted
    }).catch((error) => {
      if (!controller.signal.aborted)
        report(error)
      return !controller.signal.aborted && isRejectedWorkAdaptation(error)
    }).then(async (resume) => {
      try { await observer?.finish() }
      catch (error) { report(error) }
      adaptations.delete(key)
      if (resume)
        void wakeReady()
    })
    adaptations.set(key, { cardId, controller, promise })
  }
  function wakeReady() {
    if (closed)
      return Promise.resolve()
    wakePending = true
    if (draining || options.canContinue?.() === false)
      return draining ?? Promise.resolve()
    wakePending = false
    const database = options.getDatabase()
    draining = (async () => {
      const cardId = (await database.readLifeState()).cardId
      if (closed || !options.enabled(cardId))
        return
      await notifyDownload(cardId)
      const candidates = await recover(database, cardId)
      for (const candidate of candidates) {
        if (closed || !options.enabled(cardId) || options.canContinue?.() === false)
          break
        if (tasks.has(`${cardId}:${candidate.planId}`) || adaptations.has(`${cardId}:${candidate.planId}`) || pendingStops.has(`${cardId}:${candidate.planId}`))
          continue
        try {
          // The result is already journaled before notification. A busy card
          // may delay its delivery while another accepted responsibility runs.
          void run({ cardId, planId: candidate.planId, expectedRevision: candidate.revision, requestId: `continue:${randomUUID()}` }).catch(report)
          await tasks.get(`${cardId}:${candidate.planId}`)?.writerStopped
        }
        catch (error) { report(error) }
      }
      const current = await database.readLifeState()
      if (!closed && options.enabled(cardId) && options.canContinue?.() !== false) {
        for (const plan of current.execution?.plans ?? []) {
          if (plan.readRepairPolicy === 'grounded-read-v1' && !workPauseMarkers(current, plan).length && current.obligations.some(goal => goal.id === plan.rootObligationId && goal.status === 'blocked'))
            queueReadRepair(cardId, plan.id)
        }
      }
    })().catch(report).finally(() => {
      draining = null
      if (wakePending)
        void wakeReady()
    })
    return draining
  }
  return { save, run, singleStepPlan, start, stop, propose, proposeDeclared, reobserve, review, refreshOutcome, downloadArtifact, changeCriteria, dispose, wakeReady, notifyDownload, suspend, suspendBrowser, isActive: () => tasks.size + adaptations.size > 0, isWriting: () => [...tasks.values()].some(task => task.isWriting()), revise: (input: Parameters<typeof reviseExecutionWorkStep>[1]) => reviseExecutionWorkStep({ database: options.getDatabase(), save }, input) }
}
