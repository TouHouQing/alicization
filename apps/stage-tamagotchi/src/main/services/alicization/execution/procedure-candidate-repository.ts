import type { LifeIngress, LifeMutation, LifeStateView } from '../../../../shared/life-contracts'
import type { ProcedureRepairNotice } from '../../../../shared/procedure-contracts'
import type { AlicizationDbService } from '../db'
import type { ToolRegistry } from '../turn-os/tool-registry'
import type { ProcedureTemplate } from './procedure-template'

import { randomUUID } from 'node:crypto'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { admitVerifiedExecutionProcedure } from './procedure-admission'
import { readProcedureRepair } from './procedure-failure-repository'
import { maxProcedureCandidates, planProcedureIndex, readProcedureIndex } from './procedure-index'
import { compareProcedureSamples, procedureComparisonFamily, procedureComparisonSchema, procedureSampleSchema } from './procedure-performance'
import { isAcceptedProcedureInput } from './procedure-source-input'
import { compileProcedureTemplate, procedureToolInterface } from './procedure-template'
import { procedureEvaluationCases, procedureEvaluatorVersion } from './procedure-transfer-operations'
import { assertExecutionJson } from './work-plan-schema'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const positive = v.pipe(v.number(), v.integer(), v.minValue(1))
const sourceSchema = v.strictObject({ threadId: id, goalId: id, generation: positive, attemptId: id, verificationId: id, planId: id, planRevision: positive, acceptanceHash: hash, inputIds: v.pipe(v.array(id), v.minLength(1), v.maxLength(64)), inputHashes: v.pipe(v.array(hash), v.minLength(1), v.maxLength(64)) })
const candidateSchema = v.strictObject({ id, version: hash, templateHash: hash, template: v.unknown(), source: sourceSchema })
const replaySchema = v.strictObject({ candidateId: id, candidateHash: hash, evaluatorVersion: v.picklist(['file-procedure-replay-v1', 'browser-procedure-replay-v1', 'browser-procedure-replay-v2', 'browser-interaction-replay-v1', 'browser-upload-replay-v1', 'computer-procedure-replay-v2', 'windows-desktop-replay-v1']), status: v.picklist(['passed', 'failed']), cases: v.pipe(v.array(v.strictObject({ name: id, passed: v.boolean(), evidenceHash: hash, diagnostic: v.optional(v.pipe(v.string(), v.maxLength(512))), sample: v.optional(procedureSampleSchema) })), v.minLength(1), v.maxLength(16)), completedAt: positive })
const evaluationSchema = v.strictObject({ ...replaySchema.entries, comparison: v.optional(v.strictObject({ ...procedureComparisonSchema.entries, baselineEvaluation: replaySchema })), comparisonFailure: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(512))) })

export type ProcedureSource = v.InferOutput<typeof sourceSchema>
export interface ProcedureCandidate extends Omit<v.InferOutput<typeof candidateSchema>, 'template'> { template: ProcedureTemplate }
export type ProcedureEvaluation = v.InferOutput<typeof evaluationSchema>
export interface ProcedureCandidateItem { candidateId: string, candidate: ProcedureCandidate, evaluation: ProcedureEvaluation | null, sourceValid: boolean, repair?: ProcedureRepairNotice | null }

function settled(id: string, source: string, payload: Record<string, unknown>): LifeMutation[] {
  return [{ type: 'ingress-accept', ingress: { id, kind: 'system', source, sourceKey: id, occurredAt: Date.now(), payload } }, { type: 'ingress-settle', id, status: 'settled' }]
}
function requireIngress(record: LifeIngress | null, source: string) {
  if (!record || record.status !== 'settled' || record.kind !== 'system' || record.source !== source)
    throw new Error('Procedure evidence is missing or has the wrong journal identity')
  return record.payload
}

/** Immutable templates/evaluations plus a small index, all in the existing life writer. */
export function createProcedureCandidateRepository(database: AlicizationDbService, cardId: string, registry: ToolRegistry) {
  let tail: Promise<unknown> = Promise.resolve()
  function serialize<T>(task: () => Promise<T>) {
    const result = tail.then(async () => {
      for (let attempt = 0; ; attempt++) {
        try { return await task() }
        catch (error) {
          if (!(error instanceof Error) || !('code' in error) || error.code !== 'LIFE_STATE_CONFLICT' || attempt >= 4)
            throw error
          // Re-read proof and index together; never retry a stale write snapshot.
          await new Promise(resolve => setTimeout(resolve, 5 * (attempt + 1)))
        }
      }
    })
    tail = result.catch(() => {})
    return result
  }
  async function state() {
    const view = await database.readLifeState()
    if (view.cardId !== cardId)
      throw new Error('Procedure crossed its life owner')
    const latest = view.ingress.find(item => item.source === 'execution-procedure-index' && item.status === 'settled')
    if (latest && !Object.hasOwn(latest.payload, 'index'))
      throw new Error('Procedure index head is missing its index; existing methods were preserved')
    const index = await readProcedureIndex(latest?.payload.index, async (id) => {
      const record = await database.getLifeIngress(id)
      // getLifeIngress is scoped by the database's card_id, as is the view above.
      return requireIngress(record, 'execution-procedure-index-page').page
    })
    return { view, index }
  }
  async function sourceValid(source: ProcedureSource, view?: LifeStateView) {
    const current = view?.execution?.plans.some(plan => plan.id === source.planId) ? view : await database.readLifeState({ executionPlanId: source.planId })
    const thread = await database.getTaskThread(source.threadId)
    const goal = current.obligations.find(goal => goal.id === source.goalId)
    const plan = current.execution?.plans.find(plan => plan.id === source.planId)
    if (current.cardId !== cardId || !thread || !admitVerifiedExecutionProcedure(thread, current) || !goal || goal.generation !== source.generation || goal.sourceAttemptId !== source.attemptId || goal.verification?.id !== source.verificationId || plan?.revision !== source.planRevision || plan.acceptanceHash !== source.acceptanceHash)
      return false
    if (await database.hasWithdrawnLifeEvidence([{ cardId, kind: 'goals', id: goal.id, version: String(goal.generation) }]))
      return false
    if (source.inputIds.length !== source.inputHashes.length || await database.hasWithdrawnLifeEvidence(source.inputIds.map(id => ({ cardId, kind: 'life_ingress', id, version: '*' }))))
      return false
    for (const [index, inputId] of source.inputIds.entries()) {
      const input = await database.getLifeIngress(inputId)
      // A reply can fail after independently fulfilled work. Historical user
      // authorization remains evidence until its body or responsibility is withdrawn.
      if (!input || input.payloadHash !== source.inputHashes[index] || !isAcceptedProcedureInput(input, source))
        return false
    }
    return true
  }
  async function get(candidateId: string): Promise<ProcedureCandidate> {
    const parsed = v.parse(candidateSchema, requireIngress(await database.getLifeIngress(candidateId), 'execution-procedure-candidate').candidate)
    assertExecutionJson(parsed.template)
    if (JSON.stringify(parsed.template).length > 32_000 || executionDigest(parsed.template) !== parsed.templateHash || executionDigest({ templateHash: parsed.templateHash, source: parsed.source }) !== parsed.version || parsed.id !== `skill.learned_${parsed.templateHash.slice(0, 24)}` || candidateId !== `procedure:${parsed.version}`)
      throw new Error('Procedure template or source proof changed')
    return parsed as ProcedureCandidate
  }
  async function list(candidateIds?: readonly string[]): Promise<ProcedureCandidateItem[]> {
    if (candidateIds && (candidateIds.length > 32 || candidateIds.some(id => !/^procedure:[a-f\d]{64}$/u.test(id))))
      throw new Error('Procedure selection must contain bounded exact version identities')
    const { view, index } = await state()
    const result: ProcedureCandidateItem[] = []
    for (const item of index.items) {
      if (candidateIds && !candidateIds.includes(item.candidateId))
        continue
      const candidate = await get(item.candidateId)
      const evaluation = item.evaluationId ? v.parse(evaluationSchema, requireIngress(await database.getLifeIngress(item.evaluationId), 'execution-procedure-evaluation').evaluation) : null
      if (evaluation && (evaluation.candidateId !== item.candidateId || evaluation.candidateHash !== candidate.version || evaluation.evaluatorVersion !== procedureEvaluatorVersion(candidate.template) || (evaluation.status === 'passed' && evaluation.cases.some(item => !item.passed))))
        throw new Error('Procedure replay proof does not match its source version')
      let currentInterfaces = true
      try { currentInterfaces = candidate.template.tools.every(tool => executionDigest(tool) === executionDigest(procedureToolInterface(registry, tool.id))) }
      catch { currentInterfaces = false }
      const withdrawn = await database.hasWithdrawnLifeEvidence([{ cardId, kind: 'execution-procedure', id: item.candidateId, version: candidate.version }])
      const repair = await readProcedureRepair(database, candidate)
      result.push({ ...item, candidate, evaluation, repair, sourceValid: !repair && !withdrawn && currentInterfaces && await sourceValid(candidate.source, view) })
    }
    return result
  }
  async function getAvailable(candidateId: string): Promise<ProcedureCandidate | null> {
    const { view, index } = await state()
    if (!index.items.some(item => item.candidateId === candidateId))
      return null
    const candidate = await get(candidateId)
    if (!await sourceValid(candidate.source, view) || await readProcedureRepair(database, candidate) || await database.hasWithdrawnLifeEvidence([{ cardId, kind: 'execution-procedure', id: candidateId, version: candidate.version }]))
      return null
    try {
      return candidate.template.tools.every(tool => executionDigest(tool) === executionDigest(procedureToolInterface(registry, tool.id))) ? candidate : null
    }
    catch { return null }
  }
  async function capture(threadId: string) {
    return serialize(async () => {
      const thread = await database.getTaskThread(threadId)
      const planId = thread?.metadata?.workPlanId
      if (typeof planId !== 'string')
        throw new Error('Learning requires an accepted persistent work plan')
      const view = await database.readLifeState({ executionPlanId: planId })
      if (view.cardId !== cardId || !thread || !admitVerifiedExecutionProcedure(thread, view))
        throw new Error('Only current independently fulfilled work may teach a procedure')
      const goal = view.obligations.find(item => item.threadId === threadId)!
      const plan = view.execution?.plans.find(item => item.id === planId)
      const contract = view.execution?.contracts.find(item => item.contractHash === plan?.acceptanceHash)
      if (!plan || !contract || plan.rootObligationId !== goal.id || plan.obligationGeneration !== goal.generation)
        throw new Error('Learning lost its exact accepted work version')
      const inputHashes = await Promise.all(contract.sourceInputIds.map(async id => (await database.getLifeIngress(id))?.payloadHash))
      const source = v.parse(sourceSchema, { threadId, goalId: goal.id, generation: goal.generation, attemptId: thread.attemptId, verificationId: goal.verification!.id, planId, planRevision: plan.revision, acceptanceHash: plan.acceptanceHash, inputIds: contract.sourceInputIds, inputHashes })
      if (!await sourceValid(source, view))
        throw new Error('Learning source has been withdrawn')
      const template = compileProcedureTemplate(plan, contract.criteria, registry)
      const templateHash = executionDigest(template)
      const version = executionDigest({ templateHash, source })
      const candidate: ProcedureCandidate = { id: `skill.learned_${templateHash.slice(0, 24)}`, version, templateHash, template, source }
      const candidateId = `procedure:${version}`
      const current = await state()
      if (current.index.items.some(item => item.candidateId === candidateId))
        return candidateId
      for (const item of current.index.items) {
        const previous = await get(item.candidateId)
        if (previous.templateHash === templateHash && !await database.hasWithdrawnLifeEvidence([{ cardId, kind: 'execution-procedure', id: item.candidateId, version: previous.version }]) && await sourceValid(previous.source, view))
          return item.candidateId
      }
      if (current.index.items.length >= maxProcedureCandidates)
        throw new Error('Procedure candidate budget is full; existing versions were preserved')
      const indexId = `procedure-index:${randomUUID()}`
      const update = planProcedureIndex(current.index, [...current.index.items, { candidateId, evaluationId: null }])
      await database.commitLifeState({ cardId, expectedRevision: view.revision, operationKey: candidateId, changes: [], mutations: [
        ...settled(candidateId, 'execution-procedure-candidate', { candidate }),
        ...update.writes.flatMap(page => settled(page.id, 'execution-procedure-index-page', { page: page.page })),
        ...settled(indexId, 'execution-procedure-index', { index: update.root }),
      ] })
      return candidateId
    })
  }
  async function recordEvaluation(evaluation: ProcedureEvaluation) {
    return serialize(async () => {
      const parsed = v.parse(evaluationSchema, evaluation)
      const { view, index } = await state()
      const candidate = await get(parsed.candidateId)
      if (parsed.evaluatorVersion !== procedureEvaluatorVersion(candidate.template))
        throw new Error('Procedure approval requires its dedicated evaluator version')
      if (!index.items.some(item => item.candidateId === parsed.candidateId) || parsed.candidateHash !== candidate.version || !await sourceValid(candidate.source, view))
        throw new Error('Replay source changed before its proof could be committed')
      if (await database.hasWithdrawnLifeEvidence([{ cardId, kind: 'execution-procedure', id: parsed.candidateId, version: candidate.version }]) || candidate.template.tools.some(tool => executionDigest(tool) !== executionDigest(procedureToolInterface(registry, tool.id))))
        throw new Error('Procedure version was withdrawn or changed during evaluation')
      const requiredCases = procedureEvaluationCases(candidate.template)
      if (parsed.status === 'passed' && (parsed.cases.some(item => !item.passed) || parsed.cases.length !== requiredCases.length || new Set(parsed.cases.map(item => item.name)).size !== parsed.cases.length || !requiredCases.every(name => parsed.cases.some(item => item.name === name))))
        throw new Error('Procedure approval requires independent replays and counterexamples')
      if (parsed.comparison) {
        const comparison = parsed.comparison
        const baseline = await get(comparison.baselineCandidateId)
        const baselineEvaluation = comparison.baselineEvaluation
        const samples = (value: typeof baselineEvaluation) => value.cases.filter(item => /^different-input-[12]$/u.test(item.name)).map(item => item.sample).filter(item => item !== undefined)
        if (baseline.version === candidate.version || baseline.version !== comparison.baselineHash || baselineEvaluation.candidateId !== comparison.baselineCandidateId || baselineEvaluation.candidateHash !== baseline.version
          || executionDigest(baselineEvaluation) !== comparison.baselineEvidenceHash || procedureComparisonFamily(baseline.template) !== comparison.familyHash || procedureComparisonFamily(candidate.template) !== comparison.familyHash
          || executionDigest(samples(baselineEvaluation)) !== executionDigest(comparison.baseline) || executionDigest(samples(parsed)) !== executionDigest(comparison.candidate)
          || compareProcedureSamples(comparison.baseline, comparison.candidate) !== comparison.verdict) {
          throw new Error('Method version comparison lost its paired replay evidence')
        }
        if (parsed.status === 'passed' && !['improved', 'non-regressing'].includes(comparison.verdict))
          throw new Error('A regressing or incomparable method version cannot be approved')
      }
      if (parsed.status === 'passed') {
        if (parsed.comparisonFailure)
          throw new Error('An incomplete method comparison cannot approve a version')
        const previousVersions = []
        for (const item of index.items) {
          if (item.candidateId === parsed.candidateId)
            continue
          const previous = await get(item.candidateId)
          const priorEvaluation = item.evaluationId ? v.parse(evaluationSchema, requireIngress(await database.getLifeIngress(item.evaluationId), 'execution-procedure-evaluation').evaluation) : null
          if (procedureComparisonFamily(previous.template) === procedureComparisonFamily(candidate.template) && (priorEvaluation?.status === 'passed' || await readProcedureRepair(database, previous)))
            previousVersions.push(item.candidateId)
        }
        if (previousVersions.length && parsed.comparison?.baselineCandidateId !== previousVersions.at(-1))
          throw new Error('A new method version requires comparison with its latest established version')
      }
      const evaluationId = `procedure-evaluation:${randomUUID()}`
      const indexId = `procedure-index:${randomUUID()}`
      const update = planProcedureIndex(index, index.items.map(item => item.candidateId === parsed.candidateId ? { ...item, evaluationId } : item))
      await database.commitLifeState({ cardId, expectedRevision: view.revision, operationKey: evaluationId, changes: [], mutations: [
        ...settled(evaluationId, 'execution-procedure-evaluation', { evaluation: parsed }),
        ...update.writes.flatMap(page => settled(page.id, 'execution-procedure-index-page', { page: page.page })),
        ...settled(indexId, 'execution-procedure-index', { index: update.root }),
      ] })
      return evaluationId
    })
  }
  return { capture, get, getAvailable, list, sourceValid, recordEvaluation }
}
