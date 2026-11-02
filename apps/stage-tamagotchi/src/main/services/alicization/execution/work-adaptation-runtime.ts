import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'
import type { ToolRegistry } from '../turn-os/tool-registry'

import { randomUUID } from 'node:crypto'

import { errorMessageFrom } from '@moeru/std'

import { awaitAlicizationPromiseWithAbort } from '../main-chat-stream-primitives'
import { executionDigest } from './acceptance-compiler'
import { compileWorkAdaptation, readWorkAdaptationContext, workAdaptationPrompt } from './work-adaptation-context'

export interface WorkAdaptationProvider {
  (input: { cardId: string, system: string, user: string, signal: AbortSignal, claimAttempt: () => Promise<void> }): Promise<string | null>
}

const rejectedProposals = new WeakSet<object>()
export const isRejectedWorkAdaptation = (error: unknown) => error !== null && typeof error === 'object' && rejectedProposals.has(error)

/** Read repair proposes a new revision of the same responsibility, never a new goal. */
export async function adaptExecutionWork(options: {
  database: AlicizationDbService
  registry: () => ToolRegistry
  tools: ReadonlySet<string>
  generate: WorkAdaptationProvider
  canApply: () => boolean
  onAdmitted?: (plan: WorkPlan) => Promise<void>
}, input: { cardId: string, planId: string, signal: AbortSignal }) {
  const db = options.database
  const initial = await readWorkAdaptationContext(db, input)
  if (initial.state !== 'ready' || !options.canApply())
    return { state: 'held', reason: initial.state === 'held' ? initial.reason : 'foreground-busy' }
  const context = initial.context
  const prefix = executionDigest({ cardId: input.cardId, root: context.plan.rootObligationId, generation: context.plan.obligationGeneration }).slice(0, 40)
  context.previousRejections = []
  let attempt = 0
  for (; attempt < 3; attempt++) {
    const id = `work-replan:${prefix}:${attempt}`
    const previous = await db.getLifeIngress(id)
    if (!previous)
      break
    if (previous.status === 'processing') {
      if (Date.now() - previous.occurredAt < 90000)
        return { state: 'held', reason: 'adaptation-already-active' }
      // A planning owner can expire: it holds no adapter or execution authority.
      // Its later response cannot settle the original processing CAS or apply.
      await db.commitLifeState({ cardId: input.cardId, operationKey: `${id}:expired`, changes: [], mutations: [
        { type: 'ingress-settle', id, status: 'failed', expectedStatus: 'processing', expectedPayloadHash: previous.payloadHash },
      ] })
      return { state: 'held', reason: 'expired-planning-owner-cleared' }
    }
    const result = await db.getLifeIngress(`${id}:result`)
    if (result?.source === 'work-read-repair-result' && result.status === 'settled' && result.payload.reason === 'proposal-rejected' && typeof result.payload.errorMessage === 'string')
      context.previousRejections.push({ attempt, errorMessage: result.payload.errorMessage.slice(0, 512) })
  }
  if (attempt === 3)
    return { state: 'held', reason: 'adaptation-budget-exhausted' }
  const markerId = `work-replan:${prefix}:${attempt}`
  const owner = randomUUID()
  let claimed: Awaited<ReturnType<typeof db.getLifeIngress>> | undefined
  let claimOpen = true
  let claimStarted = false
  let pendingClaim: Promise<void> | undefined
  const plannerSignal = AbortSignal.any([input.signal, AbortSignal.timeout(45000)])
  async function claimAttempt() {
    plannerSignal.throwIfAborted()
    if (!claimOpen || claimStarted)
      throw new DOMException('Planning admission is closed or already claimed', 'AbortError')
    claimStarted = true
    pendingClaim = commitClaim()
    return pendingClaim
  }
  async function commitClaim() {
    const latest = await readWorkAdaptationContext(db, input)
    plannerSignal.throwIfAborted()
    if (!claimOpen || latest.state !== 'ready' || latest.context.bindingHash !== context.bindingHash || !options.canApply())
      throw new DOMException('Planning context changed before provider admission', 'AbortError')
    // The gateway invokes this only after acquiring a provider lease. Busy or
    // backed-off scheduling never consumes a durable model-attempt slot.
    await db.commitLifeState({ cardId: input.cardId, operationKey: markerId, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id: markerId, kind: 'system', source: 'work-read-repair', sourceKey: `${prefix}:${attempt}`, occurredAt: Date.now(), payload: { owner, planId: context.plan.id, planRevision: context.plan.revision, bindingHash: context.bindingHash } } },
      { type: 'ingress-settle', id: markerId, status: 'processing' },
    ] })
    const actual = await db.getLifeIngress(markerId)
    // Idempotent receipts alone do not establish ownership of a model call.
    if (actual?.payload.owner !== owner || actual.status !== 'processing')
      throw new DOMException('Another planner owns this model attempt', 'AbortError')
    claimed = actual
    plannerSignal.throwIfAborted()
    if (!claimOpen)
      throw new DOMException('Planning admission closed while claiming', 'AbortError')
    await options.onAdmitted?.(context.plan)
    plannerSignal.throwIfAborted()
  }
  let settled = false
  async function finish(reason: string, detail: Record<string, unknown> = {}) {
    if (!claimed)
      return
    if ((await db.getLifeIngress(markerId))?.status !== 'processing') {
      settled = true
      return
    }
    await db.commitLifeState({ cardId: input.cardId, operationKey: `${markerId}:finish`, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id: `${markerId}:result`, kind: 'system', source: 'work-read-repair-result', sourceKey: `${prefix}:${attempt}`, occurredAt: Date.now(), payload: { owner, reason, ...detail } } },
      { type: 'ingress-settle', id: `${markerId}:result`, status: 'settled' },
      { type: 'ingress-settle', id: markerId, status: 'settled', expectedStatus: 'processing', expectedPayloadHash: claimed!.payloadHash },
    ] })
    settled = true
  }
  try {
    const latest = await readWorkAdaptationContext(db, input)
    if (latest.state !== 'ready' || latest.context.bindingHash !== context.bindingHash || !options.canApply()) {
      await finish('context-changed-before-provider')
      return { state: 'held', reason: 'context-changed' }
    }
    const prompt = workAdaptationPrompt(context, options.registry(), options.tools)
    const raw = await awaitAlicizationPromiseWithAbort(options.generate({ cardId: input.cardId, system: prompt.system, user: prompt.user, signal: plannerSignal, claimAttempt }), plannerSignal)
    input.signal.throwIfAborted()
    if (!claimed) {
      if (raw)
        throw new Error('A planning response requires an admitted model attempt')
      return { state: 'held', reason: 'provider-deferred' }
    }
    if (!raw) {
      await finish('provider-unavailable')
      return { state: 'held', reason: 'provider-unavailable' }
    }
    let compiled: ReturnType<typeof compileWorkAdaptation>
    try { compiled = compileWorkAdaptation(context, raw, options.registry(), options.tools, prompt.interfaces) }
    catch (error) {
      await finish('proposal-rejected', { proposalHash: executionDigest(raw), errorMessage: (errorMessageFrom(error) ?? 'Unknown proposal validation failure').slice(0, 512) })
      if (error !== null && typeof error === 'object')
        rejectedProposals.add(error)
      throw error
    }
    // Rebase only unrelated life-clock commits. Any plan, source, result, goal or
    // interface change invalidates the proposal before the one writer applies it.
    for (let rebase = 0; rebase < 3; rebase++) {
      const current = await readWorkAdaptationContext(db, input)
      if (current.state !== 'ready' || current.context.bindingHash !== context.bindingHash || !options.canApply()) {
        await finish('context-changed', { proposalHash: executionDigest(raw) })
        return { state: 'held', reason: 'context-changed' }
      }
      compileWorkAdaptation(current.context, raw, options.registry(), options.tools, prompt.interfaces)
      input.signal.throwIfAborted()
      try {
        await db.commitLifeState({ cardId: input.cardId, operationKey: `${markerId}:apply`, expectedRevision: current.revision, changes: [], mutations: [
          { type: 'execution-plan', plan: compiled.plan, expectedRevision: context.plan.revision },
          { type: 'obligation-update', id: context.goal.id, expectedGeneration: context.goal.generation, expectedRevision: context.goal.revision, status: 'in-progress' },
          { type: 'ingress-accept', ingress: { id: `${markerId}:result`, kind: 'system', source: 'work-read-repair-result', sourceKey: `${prefix}:${attempt}`, occurredAt: Date.now(), payload: { owner, reason: compiled.reason, proposalHash: executionDigest(raw), previousPlanRevision: context.plan.revision, planRevision: compiled.plan.revision, acceptanceHash: context.plan.acceptanceHash, verifiedStepIds: context.verifiedStepIds, failedReads: context.failedReads } } },
          { type: 'ingress-settle', id: `${markerId}:result`, status: 'settled' },
          { type: 'ingress-settle', id: markerId, status: 'settled', expectedStatus: 'processing', expectedPayloadHash: claimed.payloadHash },
        ] })
        settled = true
        return { state: 'revised', planId: compiled.plan.id, revision: compiled.plan.revision }
      }
      catch (error) {
        if (rebase === 2 || (await db.readLifeState()).revision === current.revision)
          throw error
      }
    }
    return { state: 'held', reason: 'life-clock-busy' }
  }
  finally {
    claimOpen = false
    // An abort may win while the SQLite writer is admitting this attempt. Wait
    // for that exact commit before settling it or allowing the database to close.
    await pendingClaim?.catch(() => {})
    if (!settled)
      await finish(input.signal.aborted ? 'cancelled' : 'proposal-not-applied')
  }
}
