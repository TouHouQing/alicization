import type { AlicizationDbService } from '../db'
import type { AlicizationSkillLoader } from '../turn-os/skill-loader'
import type { ToolRegistry } from '../turn-os/tool-registry'
import type { ProcedureBrowserReplayFactory } from './procedure-browser-replay-types'
import type { createProcedureCandidateRepository } from './procedure-candidate-repository'
import type { ProcedureDelegatedReplayFactory } from './procedure-delegated-replay-types'
import type { ProcedureDesktopReplayFactory } from './procedure-desktop-replay-types'
import type { createWorkPlanExecutionRuntime } from './work-plan-execution-runtime'

import { randomUUID } from 'node:crypto'

import { readLifeInputText } from '../life-input-preview'
import { executionDigest } from './acceptance-compiler'
import { restoreDeclaredProcedureInvocation } from './declared-procedure-content'
import { evaluateProcedureCandidate } from './procedure-evaluator'
import { observeProcedureFailure } from './procedure-failure-repository'
import { describeProcedureParameters } from './procedure-parameters'
import { compareProcedureSamples, procedureComparisonFamily } from './procedure-performance'
import { instantiateProcedureTemplate, procedureInputSchema } from './procedure-template'
import { procedureRequiredPermissions } from './procedure-transfer-operations'

export function createLearnedProcedureRuntime(options: {
  cardId: string
  database: AlicizationDbService
  registry: ToolRegistry
  repository: ReturnType<typeof createProcedureCandidateRepository>
  loader: AlicizationSkillLoader
  work: () => ReturnType<typeof createWorkPlanExecutionRuntime>
  enabled: () => boolean
  browserReplay?: ProcedureBrowserReplayFactory
  delegatedReplay?: ProcedureDelegatedReplayFactory
  desktopReplay?: ProcedureDesktopReplayFactory
}) {
  const evaluations = new Map<string, AbortController>()
  const pendingEvaluations = new Set<Promise<unknown>>()
  async function reconcileFailedUses() {
    const view = await options.database.readLifeState()
    if (view.cardId !== options.cardId)
      throw new Error('Method outcome review crossed its life owner')
    for (const goal of view.obligations) {
      if (!goal.procedureSource || goal.invalidatedBy || !goal.threadId || !goal.verification?.independent || goal.verification.verdict !== 'not-satisfied')
        continue
      const thread = await options.database.getTaskThread(goal.threadId)
      const planId = thread?.metadata?.workPlanId
      if (typeof planId !== 'string')
        throw new Error('Failed method use lost its accepted plan')
      const current = await options.database.readLifeState({ executionPlanId: planId })
      const plan = current.execution?.plans.find(item => item.id === planId)
      if (plan)
        await observeProcedureFailure(options.database, plan)
    }
  }
  async function prepareInput(input: { cardId: string, turnId: string, input: Record<string, unknown>, signal: AbortSignal }) {
    input.signal.throwIfAborted()
    if (input.cardId !== options.cardId || !options.enabled())
      throw new Error('Procedure argument preparation crossed its life owner')
    await reconcileFailedUses()
    const raw = input.input
    if (typeof raw.id !== 'string' || typeof raw.version !== 'string' || typeof raw.goal !== 'string' || !Array.isArray(raw.arguments))
      return { input: raw, projection: null }
    const arguments_: Record<string, unknown> = {}
    for (const entry of raw.arguments) {
      if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !/^input\d+$/u.test(entry.name) || Object.hasOwn(arguments_, entry.name))
        return { input: raw, projection: null }
      arguments_[entry.name] = entry.value
    }
    const item = (await options.repository.list([`procedure:${raw.version}`])).find(item => item.candidate.id === raw.id && item.candidate.version === raw.version && item.sourceValid && item.evaluation?.status === 'passed')
    if (!item)
      return { input: raw, projection: null }
    instantiateProcedureTemplate(item.candidate.template, arguments_, options.registry, raw.goal)
    const current = await options.database.getLifeUserInput(`user:${input.turnId}`)
    input.signal.throwIfAborted()
    const restored = restoreDeclaredProcedureInvocation(item.candidate.template, { goal: raw.goal, arguments: arguments_ }, readLifeInputText(current).text ?? '', { id: raw.id, version: raw.version })
    instantiateProcedureTemplate(item.candidate.template, restored.arguments, options.registry, restored.goal)
    return restored.projection ? { input: { ...raw, goal: restored.goal, arguments: raw.arguments.map(entry => ({ ...entry, value: restored.arguments[entry.name] })) }, projection: restored.projection } : { input: raw, projection: null }
  }
  async function list() {
    await reconcileFailedUses()
    const candidates = await options.repository.list()
    const skills = await options.loader.discover({ productionOnly: false })
    return candidates.map(item => ({
      candidateId: item.candidateId,
      id: item.candidate.id,
      version: item.candidate.version,
      parameters: describeProcedureParameters(item.candidate.template),
      inputSchema: procedureInputSchema(item.candidate.template),
      operations: item.candidate.template.tools.map(tool => tool.id),
      sourceThreadId: item.candidate.source.threadId,
      sourceValid: item.sourceValid,
      comparisonFamily: procedureComparisonFamily(item.candidate.template),
      repair: item.repair ?? null,
      evaluation: item.evaluation ? { status: item.evaluation.status, cases: item.evaluation.cases, completedAt: item.evaluation.completedAt, comparison: item.evaluation.comparison ? { baselineCandidateId: item.evaluation.comparison.baselineCandidateId, baselineHash: item.evaluation.comparison.baselineHash, verdict: item.evaluation.comparison.verdict, baseline: item.evaluation.comparison.baseline, candidate: item.evaluation.comparison.candidate } : undefined, comparisonFailure: item.evaluation.comparisonFailure } : null,
      status: skills.find(skill => skill.id === item.candidate.id && skill.version === item.candidate.version)?.activationStatus ?? 'candidate',
      evaluating: evaluations.has(item.candidateId),
    }))
  }
  async function evaluate(candidateId: string, signal?: AbortSignal, baselineCandidateId?: string) {
    if (!options.enabled() || evaluations.size)
      throw new Error('A procedure evaluation is already running or this owner is suspended')
    const controller = new AbortController()
    evaluations.set(candidateId, controller)
    try {
      const candidates = await options.repository.list()
      const item = candidates.find(item => item.candidateId === candidateId && item.sourceValid)
      if (!item)
        throw new Error('Procedure evaluation has no current source')
      const current = (await options.loader.discover({ productionOnly: false })).find(skill => skill.id === item.candidate.id && skill.version === item.candidate.version)
      if (current?.activationStatus === 'active')
        throw new Error('An active procedure cannot change its evaluation during execution')
      const established = candidates.filter(previous => previous.candidateId !== candidateId && procedureComparisonFamily(previous.candidate.template) === procedureComparisonFamily(item.candidate.template) && (previous.evaluation?.status === 'passed' || previous.repair)).at(-1)
      const baseline = baselineCandidateId ? candidates.find(previous => previous.candidateId === baselineCandidateId && previous.candidateId !== candidateId) : established
      if (baselineCandidateId && !baseline)
        throw new Error('The selected comparison method no longer exists')
      if (established && baseline?.candidateId !== established.candidateId)
        throw new Error('The current method must be compared with its latest established version')
      if (baseline && procedureComparisonFamily(baseline.candidate.template) !== procedureComparisonFamily(item.candidate.template))
        throw new Error('Method comparison requires the same logical inputs and acceptance domains')
      signal?.throwIfAborted()
      controller.signal.throwIfAborted()
      await options.loader.markEvaluation(item.candidate.id, item.candidate.version, 'unvalidated')
      const evaluationSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal
      const prior = baseline ? await evaluateProcedureCandidate(baseline.candidateId, baseline.candidate, options.registry, evaluationSignal, options.browserReplay, options.delegatedReplay, options.desktopReplay) : null
      evaluationSignal.throwIfAborted()
      const result = await evaluateProcedureCandidate(candidateId, item.candidate, options.registry, evaluationSignal, options.browserReplay, options.delegatedReplay, options.desktopReplay)
      if (prior && baseline) {
        const samples = (value: typeof result) => value.cases.filter(test => /^different-input-[12]$/u.test(test.name)).map(test => test.sample).filter(sample => sample !== undefined)
        const before = samples(prior); const after = samples(result)
        const verdict = compareProcedureSamples(before, after)
        if (before.length === 2 && after.length === 2) {
          result.comparison = { baselineCandidateId: baseline.candidateId, baselineHash: baseline.candidate.version, baselineEvidenceHash: executionDigest(prior), baselineEvaluation: prior, familyHash: procedureComparisonFamily(item.candidate.template), baseline: before, candidate: after, verdict }
          if (!['improved', 'non-regressing'].includes(verdict))
            result.status = 'failed'
        }
        else {
          result.status = 'failed'
          result.comparisonFailure = 'Paired replay did not produce two independently observed inputs for both versions.'
        }
      }
      await options.repository.recordEvaluation(result)
      await options.loader.markEvaluation(item.candidate.id, item.candidate.version, result.status === 'passed' && options.enabled() ? 'approved' : 'failed')
      await options.loader.projectProduction()
      return result.cases.some(item => item.name === 'interrupted') ? 'cancelled' : result.status
    }
    finally { evaluations.delete(candidateId) }
  }
  function startEvaluation(candidateId: string, signal?: AbortSignal, baselineCandidateId?: string) {
    const pending = evaluate(candidateId, signal, baselineCandidateId).finally(() => pendingEvaluations.delete(pending))
    pendingEvaluations.add(pending)
    return pending
  }
  async function use(input: { cardId: string, turnId: string, id: string, version: string, goal: string, arguments: Record<string, unknown>, abortSignal?: AbortSignal }) {
    input.abortSignal?.throwIfAborted()
    if (input.cardId !== options.cardId || !options.enabled())
      throw new Error('Procedure execution crossed its life owner')
    const prepared = await prepareInput({ cardId: input.cardId, turnId: input.turnId, input: { id: input.id, version: input.version, goal: input.goal, arguments: Object.entries(input.arguments).map(([name, value]) => ({ name, value })) }, signal: input.abortSignal ?? new AbortController().signal })
    if (prepared.projection)
      throw new Error('Procedure literal content must be prepared from the current request before dispatch')
    const item = (await options.repository.list([`procedure:${input.version}`])).find(item => item.candidate.id === input.id && item.candidate.version === input.version && item.sourceValid && item.evaluation?.status === 'passed')
    if (!item)
      throw new Error('Procedure has no current independent replay proof')
    await options.loader.load({ id: input.id, version: input.version, tools: options.registry.list().filter(tool => tool.activationStatus === 'active').map(tool => tool.capabilityId), permissions: procedureRequiredPermissions(item.candidate.template, options.registry) })
    const skill = (await options.loader.discover()).find(skill => skill.id === input.id && skill.version === input.version)
    if (!skill)
      throw new Error('Procedure is not an approved active skill')
    const proposal = instantiateProcedureTemplate(item.candidate.template, input.arguments, options.registry, input.goal)
    return options.work().propose({ ...proposal, cardId: input.cardId, turnId: input.turnId, abortSignal: input.abortSignal, procedureSource: { candidateId: item.candidateId, version: input.version } })
  }
  async function withdraw(id: string, version: string) {
    const item = (await options.repository.list()).find(item => item.candidate.id === id && item.candidate.version === version)
    if (!item)
      return
    evaluations.get(item.candidateId)?.abort()
    await options.database.commitLifeState({ cardId: options.cardId, operationKey: `procedure-withdraw:${randomUUID()}`, changes: [], mutations: [{ type: 'evidence-invalidate', source: { cardId: options.cardId, kind: 'execution-procedure', id: item.candidateId, version }, mode: 'correction', reason: 'skill-version-withdrawn' }] })
  }
  const cancel = () => { for (const controller of evaluations.values()) controller.abort() }
  return { list, prepareInput, evaluate: startEvaluation, use, withdraw, capture: options.repository.capture, cancel, dispose: async () => { cancel(); await Promise.allSettled(pendingEvaluations) } }
}
