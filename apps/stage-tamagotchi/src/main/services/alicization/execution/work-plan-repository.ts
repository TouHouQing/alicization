import type { ExecutionStateView, TaskAcceptance, WorkPlan, WorkSlice, WorkStep, WorkStepResult } from '../../../../shared/execution-contracts'
import type { LifeEffect, LifeMutation } from '../../../../shared/life-contracts'
import type { LifeTransaction } from '../life-transaction'

import { normalize } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

import { applyLifeIngress } from '../life-ingress-repository'
import { assertLifeId, boundedJson } from '../life-transaction'
import { executionDigest } from './acceptance-compiler'
import { resolveWorkInput, workInputHash } from './work-input-bindings'
import { carryForwardVerifiedWork } from './work-plan-revision'
import { workPlanSchema } from './work-plan-schema'
import { assertWorkScheduleInside } from './work-schedule'

export function validateWorkPlan(plan: WorkPlan, acceptance: TaskAcceptance) {
  v.parse(workPlanSchema, plan)
  if (plan.steps.some(step => step.capabilityId.startsWith('tool.browser_')) && !plan.browserBinding)
    throw new Error('Browser work requires an explicit current surface binding')
  if (plan.cardId !== acceptance.cardId || plan.rootObligationId !== acceptance.rootObligationId || plan.obligationGeneration !== acceptance.obligationGeneration || plan.acceptanceHash !== acceptance.contractHash)
    throw new Error('Work plan crossed its accepted responsibility fence')
  if (!Number.isSafeInteger(plan.revision) || plan.revision < 1 || plan.steps.length < 1 || plan.steps.length > 256 || plan.sourceEvidenceRefs.length > 64)
    throw new TypeError('Work plan exceeds its bounded shape')
  const ids = new Set(plan.steps.map(step => step.id))
  if (ids.size !== plan.steps.length)
    throw new Error('Work plan step IDs must be unique')
  const criteria = new Set(acceptance.criteria.map(item => item.id))
  for (const criterion of acceptance.criteria) {
    if (criterion.predicate.kind === 'file-matches-read') {
      const sourceId = criterion.predicate.stepId
      const source = plan.steps.find(step => step.id === sourceId && step.capabilityId === 'tool.filesystem_read_file')
      if (!source)
        throw new Error('File comparison requires its exact accepted filesystem read step')
      const key = (path: string) => platform === 'win32' ? normalize(path).toLowerCase() : normalize(path)
      if (typeof source.input.path === 'string' && !source.inputBindings?.some(binding => binding.parameter === 'path') && key(source.input.path) === key(criterion.predicate.path))
        throw new Error('A file copy cannot use its target as the source read')
    }
    if (criterion.predicate.kind !== 'browser-download')
      continue
    const predicate = criterion.predicate
    const source = plan.steps.find(step => step.id === predicate.stepId)
    if (!source || source.capabilityId !== 'tool.browser_click_element' || !source.acceptanceCriterionIds.includes(criterion.id) || plan.browserBinding?.kind !== 'managed')
      throw new Error('Download acceptance requires its exact managed-browser activation step')
  }
  const visited = new Set<string>()
  const visiting = new Set<string>()
  function walk(id: string) {
    if (visited.has(id))
      return
    if (visiting.has(id))
      throw new Error('Work plan has a dependency cycle')
    const step = plan.steps.find(item => item.id === id)
    if (!step)
      throw new Error('Work plan has an absent dependency')
    visiting.add(id)
    for (const parent of step.dependsOn) walk(parent)
    visiting.delete(id)
    visited.add(id)
  }
  for (const step of plan.steps) {
    for (const id of [step.id, step.capabilityId, ...step.resourceIds]) assertLifeId(id)
    if (step.inputHash !== workInputHash(step) || step.acceptanceCriterionIds.some(id => !criteria.has(id)) || !['read-only', 'reconcile-first', 'manual-only'].includes(step.retryMode) || step.state !== 'pending' || step.attemptId !== null)
      throw new Error('New work steps require unchanged inputs and unexecuted state')
    if (step.inputBindings?.some(binding => !step.dependsOn.includes(binding.stepId) || ['__proto__', 'prototype', 'constructor'].includes(binding.parameter)) || new Set(step.inputBindings?.map(binding => binding.parameter)).size !== (step.inputBindings?.length ?? 0))
      throw new Error('Work bindings require unique accepted input parameters and direct dependencies')
    if (step.nativeWindowSourceStepId && (step.capabilityId !== 'tool.desktop_list_interactables' || !step.dependsOn.includes(step.nativeWindowSourceStepId) || !plan.steps.some(source => source.id === step.nativeWindowSourceStepId && source.capabilityId === 'tool.desktop_list_interactables')))
      throw new Error('Native window continuity requires its exact accepted observation dependency')
    walk(step.id)
  }
}

async function currentPlan(tx: LifeTransaction, id: string) {
  const row = await tx.get<{ body_json: string }>('SELECT body_json FROM life_work_plans WHERE card_id = ? AND plan_id = ? ORDER BY revision DESC LIMIT 1', [tx.cardId, id])
  return row ? JSON.parse(row.body_json) as WorkPlan : null
}

async function assertRoot(tx: LifeTransaction, plan: Pick<WorkPlan, 'rootObligationId' | 'obligationGeneration' | 'acceptanceHash'>) {
  const root = await tx.get<{ generation: number, status: string, source_ref_json: string }>('SELECT generation, status, source_ref_json FROM life_obligations WHERE card_id = ? AND obligation_id = ?', [tx.cardId, plan.rootObligationId])
  const contract = await tx.get<{ body_json: string }>('SELECT body_json FROM life_execution_contracts WHERE card_id = ? AND obligation_id = ? AND active = 1', [tx.cardId, plan.rootObligationId])
  const acceptance = contract ? JSON.parse(contract.body_json) as TaskAcceptance : null
  if (!root || !acceptance || root.generation !== plan.obligationGeneration || acceptance.contractHash !== plan.acceptanceHash || JSON.parse(root.source_ref_json).invalidatedBy || ['cancelled', 'superseded', 'fulfilled', 'failed'].includes(root.status))
    throw new Error('Work plan responsibility is stale, terminal, or withdrawn')
  return acceptance
}

export async function applyExecutionWork(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'execution-plan' | 'execution-step-result' | 'execution-slice' }>, criteriaRevised = false) {
  if (mutation.type === 'execution-plan') {
    const plan = mutation.plan
    if (plan.cardId !== tx.cardId)
      throw new Error('Work plan crossed the card boundary')
    assertLifeId(plan.id)
    const acceptance = await assertRoot(tx, plan)
    const previous = await currentPlan(tx, plan.id)
    if ((previous?.revision ?? 0) !== mutation.expectedRevision || plan.revision !== mutation.expectedRevision + 1)
      throw new Error('Work plan revision CAS conflict')
    if (previous && (previous.rootObligationId !== plan.rootObligationId || previous.rootThreadId !== plan.rootThreadId || previous.readRepairPolicy !== plan.readRepairPolicy || executionDigest(previous.schedule ?? null) !== executionDigest(plan.schedule ?? null)))
      throw new Error('Work plan cannot change its root identity or read-repair policy')
    if (await tx.get('SELECT 1 FROM life_work_slices WHERE card_id = ? AND plan_id = ? AND state IN (\'running\',\'stopping\')', [tx.cardId, plan.id]))
      throw new Error('Stop the old work slice before revising its plan')
    validateWorkPlan(plan, acceptance)
    if (previous)
      await carryForwardVerifiedWork(tx, previous, plan, criteriaRevised)
    await tx.run('INSERT INTO life_work_plans(card_id, plan_id, revision, root_thread_id, root_obligation_id, obligation_generation, contract_hash, body_json, event_cursor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [tx.cardId, plan.id, plan.revision, plan.rootThreadId, plan.rootObligationId, plan.obligationGeneration, plan.acceptanceHash, boundedJson(plan), tx.revision, tx.now])
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ planId: plan.id, revision: plan.revision }) })
    return
  }
  const reference = mutation.type === 'execution-slice' ? mutation.slice : mutation.result
  const plan = await currentPlan(tx, reference.planId)
  if (!plan || plan.revision !== reference.planRevision)
    throw new Error('Work window refers to an obsolete plan')
  // Stopping and cancellation acknowledgements must still be recordable after withdrawal.
  const stopping = mutation.type === 'execution-slice' && ['stopping', 'stopped'].includes(mutation.slice.state)
  const reconciling = mutation.type === 'execution-step-result' && mutation.expectedState === 'awaiting-verification'
  const settling = mutation.type === 'execution-step-result' && (mutation.expectedState === 'running' && mutation.result.state !== 'running' || reconciling)
  if (!stopping && !settling)
    await assertRoot(tx, plan)
  if (mutation.type === 'execution-slice') {
    const slice = mutation.slice
    for (const id of [slice.id, slice.ingressId, slice.attemptId]) assertLifeId(id)
    if (slice.rootObligationId !== plan.rootObligationId || slice.obligationGeneration !== plan.obligationGeneration || !Number.isSafeInteger(slice.cursor) || slice.cursor < 0 || slice.cursor > plan.steps.length || !Number.isSafeInteger(slice.budget) || slice.budget < 1 || slice.budget > 16)
      throw new Error('Work slice has invalid responsibility or budget')
    const previous = await tx.get<{ state: WorkSlice['state'], attempt_id: string, plan_revision: number }>('SELECT state, attempt_id, plan_revision FROM life_work_slices WHERE card_id = ? AND slice_id = ?', [tx.cardId, slice.id])
    if ((previous?.state ?? null) !== mutation.expectedState || previous && (previous.attempt_id !== slice.attemptId || previous.plan_revision !== slice.planRevision))
      throw new Error('Work slice state CAS conflict')
    const allowed: Record<string, string[]> = { ready: ['running', 'stopping', 'stopped'], running: ['yielded', 'waiting', 'stopping', 'stopped'], yielded: ['stopped'], waiting: ['stopping', 'stopped'], stopping: ['stopped'], stopped: [] }
    if (previous && !allowed[previous.state].includes(slice.state) || !previous && slice.state !== 'ready')
      throw new Error('Invalid work slice transition')
    if (!previous) {
      if (await tx.get('SELECT 1 FROM life_work_slices WHERE card_id = ? AND plan_id = ? AND state IN (\'ready\',\'running\',\'stopping\')', [tx.cardId, slice.planId]))
        throw new Error('Work plan already has a live slice')
      await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id: slice.ingressId, kind: 'task-run', source: 'work-plan-scheduler', sourceKey: slice.id, occurredAt: tx.now, payload: { planId: plan.id, planRevision: plan.revision, rootObligationId: plan.rootObligationId, obligationGeneration: plan.obligationGeneration, acceptanceHash: plan.acceptanceHash, sliceId: slice.id, attemptId: slice.attemptId, budget: slice.budget } } })
    }
    await tx.run('INSERT INTO life_work_slices(card_id, slice_id, plan_id, plan_revision, root_obligation_id, obligation_generation, ingress_id, state, cursor, budget, attempt_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(card_id, slice_id) DO UPDATE SET state = excluded.state, cursor = excluded.cursor, updated_at = excluded.updated_at', [tx.cardId, slice.id, slice.planId, slice.planRevision, slice.rootObligationId, slice.obligationGeneration, slice.ingressId, slice.state, slice.cursor, slice.budget, slice.attemptId, tx.now])
    if (!['ready', 'running'].includes(slice.state)) {
      const ingress = await tx.get<{ status: string }>('SELECT status FROM life_ingress WHERE card_id = ? AND ingress_id = ?', [tx.cardId, slice.ingressId])
      // A waiting window already relinquished dispatch authority. Recovery or
      // host cancellation may mark its unknown effect as stopping without
      // resurrecting that settled ingress as an active/held request.
      if (slice.state !== 'stopping' || previous?.state !== 'waiting' || ingress?.status !== 'settled')
        await applyLifeIngress(tx, { type: 'ingress-settle', id: slice.ingressId, status: slice.state === 'stopping' ? 'held' : 'settled' })
    }
    await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ planId: plan.id, revision: plan.revision, sliceId: slice.id, state: slice.state }) })
    return
  }
  const result = mutation.result
  const step = plan.steps.find(item => item.id === result.stepId)
  if (!step || result.inputHash !== step.inputHash || result.observationRefs.length > 64)
    throw new Error('Step result does not match the accepted input')
  const prior = await tx.get<{ state: string, attempt_id: string, effect_id: string | null }>('SELECT state, attempt_id, effect_id FROM life_work_step_results WHERE card_id = ? AND plan_id = ? AND plan_revision = ? AND step_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', [tx.cardId, plan.id, plan.revision, result.stepId])
  if ((prior?.state ?? 'pending') !== mutation.expectedState)
    throw new Error('Step result state CAS conflict')
  const states = reconciling ? '(\'running\',\'stopping\',\'waiting\')' : settling ? '(\'running\',\'stopping\')' : '(\'running\')'
  if (settling && prior?.attempt_id !== result.attemptId)
    throw new Error('An old work attempt cannot settle another attempt')
  const allowedResults: Record<string, string[]> = { 'pending': ['running'], 'blocked': ['running'], 'waiting': ['running'], 'running': ['verified', 'blocked', 'awaiting-verification', 'cancelled'], 'awaiting-verification': ['verified', 'blocked', 'cancelled'], 'verified': [], 'cancelled': [] }
  if (!allowedResults[mutation.expectedState]?.includes(result.state))
    throw new Error('Invalid work step result transition')
  if (!await tx.get(`SELECT 1 FROM life_work_slices WHERE card_id = ? AND plan_id = ? AND plan_revision = ? AND attempt_id = ? AND state IN ${states}`, [tx.cardId, plan.id, plan.revision, result.attemptId]))
    throw new Error('Step result has no active work slice')
  if (result.output.hostTakenOver === true || reconciling && result.state === 'cancelled') {
    const row = result.effectId ? await tx.get<{ status: string, receipt_ref_json: string }>('SELECT status, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, result.effectId]) : null
    const receipt = row?.receipt_ref_json ? JSON.parse(row.receipt_ref_json) : null
    const decision = receipt?.hostTakeover
    const feedback = decision?.decisionId ? await tx.get<{ payload_ref_json: string }>('SELECT payload_ref_json FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND source = \'execution-host-takeover\' AND kind = \'feedback\' AND status = \'settled\' AND source_key = ?', [tx.cardId, decision.decisionId, result.effectId]) : null
    const recorded = feedback ? JSON.parse(feedback.payload_ref_json) : null
    if (result.state !== 'cancelled' || prior?.effect_id !== result.effectId || row?.status !== 'failed' || receipt?.outcome !== 'host-taken-over' || decision?.effectId !== result.effectId || decision.independent !== false || result.output.decisionId !== decision.decisionId || recorded?.confirmedStopped !== true || recorded.hostTakeover?.effectId !== result.effectId || !result.observationRefs.includes(decision.decisionId))
      throw new Error('Host takeover requires its exact local decision and cannot verify success')
  }
  else if (reconciling) {
    const row = result.effectId ? await tx.get<{ status: string, receipt_ref_json: string }>('SELECT status, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, result.effectId]) : null
    const receipt = row?.receipt_ref_json ? JSON.parse(row.receipt_ref_json) : null
    const proof = receipt?.reconciliation
    const expected = result.state === 'verified' ? 'applied' : 'not-applied'
    if (prior?.effect_id !== result.effectId || proof?.effectId !== result.effectId || proof?.independent !== true || proof.verdict !== expected || row?.status !== (result.state === 'verified' ? 'settled' : 'failed'))
      throw new Error('An unresolved step requires its exact independently reconciled effect')
    if (!await tx.get('SELECT 1 FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND source = \'execution-reconciliation\' AND kind = \'tool-result\' AND status = \'settled\' AND source_key = ?', [tx.cardId, proof.observationId, result.effectId]))
      throw new Error('Reconciliation observation is absent or unclosed')
  }
  if (result.state === 'verified') {
    const parameters = await resolveCommittedWorkInput(tx, plan, step)
    const effect = result.effectId ? await tx.get<{ status: string, turn_id: string, action_id: string, payload_ref_json: string, receipt_ref_json: string }>('SELECT status, turn_id, action_id, payload_ref_json, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, result.effectId]) : null
    const run = await tx.get<{ ingress_id: string }>('SELECT ingress_id FROM life_work_slices WHERE card_id = ? AND plan_id = ? AND plan_revision = ? AND attempt_id = ?', [tx.cardId, plan.id, plan.revision, result.attemptId])
    const payload = effect ? JSON.parse(effect.payload_ref_json) : null
    const receipt = effect?.receipt_ref_json ? JSON.parse(effect.receipt_ref_json) : null
    if (effect?.status !== 'settled' || effect.turn_id !== run?.ingress_id || effect.action_id !== step.id || payload?.capabilityId !== step.capabilityId || executionDigest(payload.parameters) !== executionDigest(parameters) || receipt?.outcome !== 'success' || !result.observationRefs.length)
      throw new Error('A verified work step requires a settled effect and observation evidence')
    for (const ref of result.observationRefs) {
      if (!await tx.get('SELECT 1 FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND kind = \'tool-result\' AND status = \'settled\' AND source_key = ?', [tx.cardId, ref, result.effectId]))
        throw new Error('Step observation evidence is absent or unclosed')
    }
  }
  await tx.run('INSERT INTO life_work_step_results(card_id, plan_id, plan_revision, step_id, attempt_id, input_hash, effect_id, observation_refs_json, result_json, state, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(card_id, plan_id, plan_revision, step_id, attempt_id) DO UPDATE SET effect_id = excluded.effect_id, observation_refs_json = excluded.observation_refs_json, result_json = excluded.result_json, state = excluded.state', [tx.cardId, plan.id, plan.revision, result.stepId, result.attemptId, result.inputHash, result.effectId, boundedJson(result.observationRefs), boundedJson(result.output), result.state, tx.now])
  await tx.updateOwner({ owner: 'goals', key: 'life:goals-head', value: boundedJson({ planId: plan.id, revision: plan.revision, stepId: result.stepId, attemptId: result.attemptId, state: result.state }) })
}

/** Enforced inside the same writer transaction as effect preparation. */
export async function assertWorkAction(tx: LifeTransaction, effect: Pick<LifeEffect, 'turnId' | 'actionId' | 'payload'>) {
  if (!effect.turnId?.startsWith('task-run:'))
    return
  const slice = await tx.get<{ plan_id: string, plan_revision: number, budget: number, state: string }>('SELECT plan_id, plan_revision, budget, state FROM life_work_slices WHERE card_id = ? AND ingress_id = ?', [tx.cardId, effect.turnId])
  const ingress = await tx.get<{ status: string }>('SELECT status FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND kind = \'task-run\' AND source = \'work-plan-scheduler\'', [tx.cardId, effect.turnId])
  const plan = slice ? await currentPlan(tx, slice.plan_id) : null
  if (!slice || slice.state !== 'running' || !ingress || !['accepted', 'processing'].includes(ingress.status) || !plan || plan.revision !== slice.plan_revision)
    throw new Error('Task-run authorization is absent, ended, or obsolete')
  await assertRoot(tx, plan)
  await assertWorkScheduleInside(tx, plan)
  const step = plan.steps.find(item => item.id === effect.actionId)
  if (!step || step.capabilityId !== effect.payload.capabilityId)
    throw new Error('Task-run action differs from its accepted work step')
  const input = await resolveCommittedWorkInput(tx, plan, step)
  if (executionDigest(input) !== executionDigest(effect.payload.parameters))
    throw new Error('Task-run action differs from its committed observation bindings')
  const count = await tx.get<{ count: number }>('SELECT COUNT(*) AS count FROM life_effect_intents WHERE card_id = ? AND turn_id = ? AND kind = \'execute\'', [tx.cardId, effect.turnId])
  if ((count?.count ?? 0) >= slice.budget)
    throw new Error('Task-run action budget exhausted; yield before continuing')
}

async function resolveCommittedWorkInput(tx: LifeTransaction, plan: WorkPlan, step: WorkStep) {
  return resolveWorkInput(step, async (stepId) => {
    const source = await tx.get<{ state: string, effect_id: string }>('SELECT state, effect_id FROM life_work_step_results WHERE card_id = ? AND plan_id = ? AND plan_revision = ? AND step_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1', [tx.cardId, plan.id, plan.revision, stepId])
    const receipt = source?.state === 'verified' && source.effect_id ? await tx.get<{ status: string, receipt_ref_json: string }>('SELECT status, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND effect_id = ?', [tx.cardId, source.effect_id]) : null
    const body = receipt?.status === 'settled' && receipt.receipt_ref_json ? JSON.parse(receipt.receipt_ref_json) : null
    if (body?.outcome !== 'success')
      throw new Error('Work input source has no successful settled observation')
    return body.output
  })
}

export async function readExecutionWork(tx: Pick<LifeTransaction, 'all' | 'cardId'>, planId?: string, requestedRoots: string[] = []): Promise<ExecutionStateView> {
  const selection = planId ? 'p.plan_id = ?' : `EXISTS (SELECT 1 FROM life_obligations o WHERE o.card_id=p.card_id AND o.obligation_id=p.root_obligation_id AND o.status NOT IN ('fulfilled','cancelled','superseded')) OR p.rowid IN (SELECT r.rowid FROM life_work_plans r WHERE r.card_id=p.card_id AND r.revision=(SELECT MAX(s.revision) FROM life_work_plans s WHERE s.card_id=r.card_id AND s.plan_id=r.plan_id) ORDER BY r.created_at DESC,r.plan_id DESC LIMIT 128)`
  const requested = requestedRoots.length ? ` OR p.root_obligation_id IN (${requestedRoots.map(() => '?').join(',')})` : ''
  const plans = await tx.all<{ body_json: string }>(`SELECT p.body_json FROM life_work_plans p WHERE p.card_id=? AND (${selection}${requested}) AND p.revision=(SELECT MAX(q.revision) FROM life_work_plans q WHERE q.card_id=p.card_id AND q.plan_id=p.plan_id) ORDER BY p.created_at DESC,p.plan_id DESC`, [tx.cardId, ...(planId ? [planId] : []), ...requestedRoots])
  const selected = plans.map(row => JSON.parse(row.body_json) as WorkPlan)
  const roots = [...new Set([...selected.map(plan => plan.rootObligationId), ...requestedRoots])]
  const contractSelection = roots.length ? [`c.obligation_id IN (${roots.map(() => '?').join(',')})`] : []
  if (!planId)
    contractSelection.push(`EXISTS (SELECT 1 FROM life_obligations o WHERE o.card_id=c.card_id AND o.obligation_id=c.obligation_id AND o.status NOT IN ('fulfilled','cancelled','superseded'))`, 'c.rowid IN (SELECT r.rowid FROM life_execution_contracts r WHERE r.card_id=c.card_id AND r.active=1 ORDER BY r.created_at DESC,r.rowid DESC LIMIT 128)')
  const contracts = contractSelection.length ? await tx.all<{ body_json: string }>(`SELECT c.body_json FROM life_execution_contracts c WHERE c.card_id=? AND c.active=1 AND (${contractSelection.join(' OR ')}) ORDER BY c.created_at DESC,c.rowid DESC`, [tx.cardId, ...roots]) : []
  if (!selected.length)
    return { contracts: contracts.map(row => JSON.parse(row.body_json)), plans: [], slices: [], results: [] }
  const ids = selected.map(plan => plan.id)
  const placeholders = ids.map(() => '?').join(',')
  // Read one latest result per step, not a global recent-event tail. A busy
  // unrelated task must never evict the cursor and cause old work to run again.
  const slices = await tx.all<WorkSlice>(`SELECT s.slice_id AS id, s.plan_id AS planId, s.plan_revision AS planRevision, s.root_obligation_id AS rootObligationId, s.obligation_generation AS obligationGeneration, s.ingress_id AS ingressId, s.state, s.cursor, s.budget, s.attempt_id AS attemptId, s.updated_at AS updatedAt FROM life_work_slices s WHERE s.card_id = ? AND s.plan_id IN (${placeholders}) AND (s.state IN ('ready','running','stopping') OR s.rowid IN (SELECT t.rowid FROM life_work_slices t WHERE t.card_id=s.card_id AND t.plan_id=s.plan_id ORDER BY t.updated_at DESC,t.rowid DESC LIMIT 32)) ORDER BY s.updated_at DESC,s.rowid DESC`, [tx.cardId, ...ids])
  const results = await tx.all<WorkStepResult & { observations: string, result: string }>(`SELECT r.plan_id AS planId, r.plan_revision AS planRevision, r.step_id AS stepId, r.attempt_id AS attemptId, r.input_hash AS inputHash, r.effect_id AS effectId, r.observation_refs_json AS observations, r.result_json AS result, r.state, r.created_at AS createdAt FROM life_work_step_results r WHERE r.card_id = ? AND r.plan_id IN (${placeholders}) AND r.plan_revision = (SELECT MAX(p.revision) FROM life_work_plans p WHERE p.card_id=r.card_id AND p.plan_id=r.plan_id) AND r.rowid = (SELECT q.rowid FROM life_work_step_results q WHERE q.card_id=r.card_id AND q.plan_id=r.plan_id AND q.plan_revision=r.plan_revision AND q.step_id=r.step_id ORDER BY q.created_at DESC,q.rowid DESC LIMIT 1) ORDER BY r.created_at DESC,r.rowid DESC`, [tx.cardId, ...ids])
  return { contracts: contracts.map(row => JSON.parse(row.body_json)), plans: selected, slices, results: results.map(({ observations, result, ...row }) => ({ ...row, observationRefs: JSON.parse(observations), output: JSON.parse(result) })) }
}
