import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeObligation, LifeStateView } from '../../../../shared/life-contracts'

import { executionWorkBlocker } from '../../../../shared/execution-work-blocker'
import { workAcknowledgmentClause, workPlanAbsenceClause, workStepConditionClause, workStepIntentClause, workStepResultAbsenceClause } from './work-acknowledgment-language'
import { matchesDeclaredBrowserWorkIntent } from './work-browser-intent'

function matchesStepCondition(plan: WorkPlan, condition: NonNullable<ReturnType<typeof workStepConditionClause>>) {
  return plan.steps[condition.stepIndex]?.capabilityId === 'tool.filesystem_read_file' && condition.operation === '读取' && condition.target === '来源文件'
}

/** An explicit existing responsibility can describe its plan in later turns. */
export function executionWorkStepConditionsMatch(view: LifeStateView, goal: LifeObligation, quote: string) {
  const acknowledgment = executionWorkAcknowledgment(view, goal)
  const plan = acknowledgment && view.execution?.plans.find(item => item.id === acknowledgment.planId && item.revision === acknowledgment.planRevision)
  const conditions = quote.split(/[，,。.!！?？;；\n]+/u).map(workStepConditionClause).filter((condition): condition is NonNullable<typeof condition> => condition !== null)
  return Boolean(plan && conditions.length && conditions.every(condition => matchesStepCondition(plan, condition)))
}

/** Evidence of accepting/waiting on existing work, never evidence of doing it. */
export function executionWorkAcknowledgment(view: LifeStateView, goal: LifeObligation) {
  if (goal.cardId !== view.cardId || goal.invalidatedBy || !['accepted', 'waiting', 'in-progress', 'verifying', 'blocked'].includes(goal.status))
    return null
  const plan = view.execution?.plans.find(item => item.rootObligationId === goal.id)
  const contract = view.execution?.contracts.find(item => item.contractHash === plan?.acceptanceHash)
  if (!plan || !contract || plan.cardId !== view.cardId || contract.cardId !== view.cardId || plan.rootThreadId !== goal.threadId || plan.obligationGeneration !== goal.generation || contract.rootObligationId !== goal.id || contract.obligationGeneration !== goal.generation || goal.proof.acceptance?.contractHash !== contract.contractHash || !contract.sourceInputIds.length)
    return null
  const results = plan.steps.map(step => view.execution?.results.find(item => item.planId === plan.id && item.planRevision === plan.revision && item.stepId === step.id && item.inputHash === step.inputHash))
  const verification = goal.verification?.evidence.criteria
  const reviewed = Array.isArray(verification) ? verification.filter(item => item && typeof item === 'object' && item.verdict === 'satisfied').map(item => item.id) : []
  const pendingReviewCriterionIds = contract.criteria.filter(item => item.required && item.predicate.kind === 'user-review' && !reviewed.includes(item.id)).map(item => item.id)
  const pendingDownloadCriterionIds = contract.criteria.filter(item => item.required && item.predicate.kind === 'browser-download' && !reviewed.includes(item.id)).map(item => item.id)
  const downloadStepIndexes = contract.criteria.flatMap(item => item.predicate.kind === 'browser-download' ? [plan.steps.findIndex(step => item.predicate.kind === 'browser-download' && step.id === item.predicate.stepId)] : [])
  const blockedStepIds = plan.steps.filter((_step, index) => results[index]?.state === 'blocked').map(step => step.id)
  const unknownStepIds = plan.steps.filter((_step, index) => results[index]?.state === 'awaiting-verification').map(step => step.id)
  const allStepsObserved = results.every(item => item?.state === 'verified')
  // Literal ordinal references are tied to the current unfinished write, not
  // inferred from prose. Another file, completed step or extra verb cannot match.
  const nextExecutable = plan.steps.find((step, index) => results[index]?.state !== 'verified' && step.dependsOn.every(id => results[plan.steps.findIndex(dependency => dependency.id === id)]?.state === 'verified'))
  const singleWrite = plan.steps.filter(step => step.capabilityId === 'tool.filesystem_write_file').length === 1
  const stepIntentClauses = singleWrite
    ? plan.steps.flatMap((step, index) => {
        if (step.capabilityId !== 'tool.filesystem_write_file' || results[index]?.state === 'verified')
          return []
        const ordinals = [`第${index + 1}个`, ...('一二三四五六七八九十'[index] ? [`第${'一二三四五六七八九十'[index]}个`] : [])]
        const qualifiers = step.id === nextExecutable?.id ? ['只', '先'] : ['只']
        return ordinals.flatMap(ordinal => qualifiers.flatMap(qualifier => ['写', '写入', '保存'].flatMap(verb => ['指定文件', '指定的文件', '指定的新文件', '指定新文件'].map(file => `${qualifier}${verb}${ordinal}${file}`))))
      })
    : []
  // A deictic reference has one writable target only. It describes the intended
  // new artifact, not an observation that the path was created or is absent.
  const uniqueFileIntentClauses = singleWrite && plan.steps.some((step, index) => step.capabilityId === 'tool.filesystem_write_file' && results[index]?.state !== 'verified')
    ? ['只处理这个新文件', '只写这个新文件', '只写入这个新文件', '只保存这个新文件']
    : []
  // Describes the already-bound surface as the target of this plan. It does
  // not certify a login, a successful interaction or access to another page.
  const browserWork = plan.steps.some(step => step.capabilityId.startsWith('tool.browser_'))
  const fileLookup = plan.steps.some(step => step.capabilityId === 'tool.filesystem_search_files')
    && plan.steps.some(step => step.capabilityId === 'tool.filesystem_read_file')
    && plan.steps.every(step => ['tool.filesystem_search_files', 'tool.filesystem_read_file', 'tool.filesystem_list_directory'].includes(step.capabilityId))
  const downloadWork = contract.criteria.some(item => item.predicate.kind === 'browser-download')
  const blocker = executionWorkBlocker(view, plan)
  const surfaceIntentClauses = !browserWork
    ? []
    : plan.browserBinding?.kind === 'authorized-page'
      ? ['使用已登录的浏览器页面', '使用你已登录的浏览器页面', '使用已登录的浏览器', '使用你已登录的浏览器', '使用你授权的浏览器页面', '使用当前授权的浏览器页面', '使用你指定的浏览器页面']
      : plan.browserBinding?.kind === 'managed' ? ['使用应用的独立浏览器页面', '使用应用的独立浏览器'] : []
  return {
    planId: plan.id,
    planRevision: plan.revision,
    acceptanceHash: contract.contractHash,
    status: goal.status,
    pendingReviewCriterionIds,
    pendingDownloadCriterionIds,
    blockedStepIds,
    unknownStepIds,
    ...(blocker ? { blocker } : {}),
    allStepsObserved,
    nextExecutableStepId: nextExecutable?.id ?? null,
    noStepResults: results.every(item => !item),
    noDownloadStepResults: downloadStepIndexes.length > 0 && downloadStepIndexes.every(index => index >= 0 && !results[index]),
    intentClauses: [...stepIntentClauses, ...uniqueFileIntentClauses, ...surfaceIntentClauses],
    planLabels: [...(pendingReviewCriterionIds.length ? ['pending-user-review'] : []), ...(downloadWork ? ['下载计划', ...(browserWork && plan.browserBinding?.kind === 'managed' ? ['受管浏览器下载计划', '独立浏览器下载计划'] : browserWork && plan.browserBinding?.kind === 'authorized-page' ? ['授权浏览器下载计划', '已授权浏览器下载计划'] : [])] : []), ...(browserWork ? ['浏览器计划'] : []), ...(plan.steps.some(step => step.capabilityId.startsWith('tool.filesystem_')) ? ['文件计划'] : []), ...(fileLookup ? ['file-lookup'] : [])],
    canAttempt: ['accepted', 'waiting', 'in-progress'].includes(goal.status) && !allStepsObserved && !blockedStepIds.length && !unknownStepIds.length,
    proofScope: 'existing-responsibility-and-its-declared-wait-conditions-only',
  }
}

/** Resolve only literal current-admission/wait states from their actual owner. */
export interface ReviewedWorkAcknowledgmentClause {
  text: string
  obligationId: string
  generation: number
  quoteHash: string
}

/** Share the same declared-step matcher with the claim classifier. */
export function executionWorkStepIntentMatches(view: LifeStateView, acknowledgment: NonNullable<ReturnType<typeof executionWorkAcknowledgment>>, text: string) {
  if (!acknowledgment.canAttempt)
    return false
  const plan = view.execution?.plans.find(item => item.id === acknowledgment.planId && item.revision === acknowledgment.planRevision && item.acceptanceHash === acknowledgment.acceptanceHash)
  const contract = view.execution?.contracts.find(item => item.contractHash === acknowledgment.acceptanceHash)
  return Boolean(plan && contract && (acknowledgment.intentClauses.includes(text) || matchesDeclaredBrowserWorkIntent(text, plan.steps, contract.criteria)))
}

/** Plan and learned-method acknowledgments use the same observed phase gates. */
export function executionWorkAcknowledgmentPhaseMatches(acknowledgment: NonNullable<ReturnType<typeof executionWorkAcknowledgment>>, phase: string | null) {
  return phase !== null
    && (!acknowledgment.allStepsObserved || !['execution-wait', 'phase-end-wait'].includes(phase))
    && (acknowledgment.pendingDownloadCriterionIds.length || phase !== 'download-verification-pending')
    && (acknowledgment.canAttempt || phase !== 'execution-intent')
    && (acknowledgment.noStepResults || phase !== 'no-step-result')
    && (acknowledgment.noDownloadStepResults || phase !== 'no-download-receipt')
}

export function currentExecutionWorkAcknowledgment(view: LifeStateView, turnId: string, quote: string, reviewedClauses: readonly ReviewedWorkAcknowledgmentClause[] = [], speakerName?: string) {
  const rawClauses = quote.split(/[，,。.!！?？;；\n]+/u).map(part => part.trim()).filter(Boolean)
  if (!rawClauses.length)
    return null
  const source = `user:${turnId}`
  if (!view.ingress.some(item => item.id === source && item.kind === 'user-turn' && ['accepted', 'processing'].includes(item.status)))
    return null
  const matches = view.obligations.flatMap((goal) => {
    const acknowledgment = executionWorkAcknowledgment(view, goal)
    const plan = acknowledgment && view.execution?.plans.find(item => item.id === acknowledgment.planId)
    const contract = plan && view.execution?.contracts.find(item => item.contractHash === plan.acceptanceHash)
    if (!acknowledgment || !plan?.sourceEvidenceRefs.includes(source) || !contract?.sourceInputIds.includes(source))
      return []
    const usedReviewQuotes = new Set<string>()
    let explicitIntent = false
    const clauses = rawClauses.map((raw) => {
      const condition = workStepConditionClause(raw)
      if (condition)
        return matchesStepCondition(plan, condition) ? 'step-condition' : null
      const absentOperations = workStepResultAbsenceClause(raw)
      if (absentOperations)
        return absentOperations.every(capability => plan.steps.some(step => capability === 'browser-operation' ? step.capabilityId.startsWith('tool.browser_') : step.capabilityId === capability)) ? 'no-step-result' : null
      const simple = workAcknowledgmentClause(raw, speakerName, acknowledgment.planLabels)
      if (simple) {
        if (simple === 'execution-intent')
          explicitIntent = true
        return simple
      }
      const step = workStepIntentClause(raw, speakerName, explicitIntent)
      if (step && executionWorkStepIntentMatches(view, acknowledgment, step))
        return 'execution-intent'
      const reviewed = reviewedClauses.find(item => item.text === raw && item.obligationId === goal.id && item.generation === goal.generation)
      if (reviewed) {
        usedReviewQuotes.add(reviewed.quoteHash)
        return 'reviewed-current-acknowledgment'
      }
      return null
    })
    if (!clauses.every(phase => executionWorkAcknowledgmentPhaseMatches(acknowledgment, phase)))
      return []
    return [{ ...acknowledgment, reviewedQuoteHashes: [...usedReviewQuotes], literalNegativeState: clauses.every(clause => clause === 'restraint' || clause === 'no-step-result'), binding: { kind: 'obligation' as const, id: goal.id, version: String(goal.generation) } }]
  })
  return matches.length === 1 ? matches[0] : null
}

/** Current committed plan existence remains true even if a reviewer omits its denial. */
export function currentExecutionWorkStateContradictions(view: LifeStateView, turnId: string, draft: string, speakerName?: string) {
  const evidence = currentExecutionWorkAcknowledgment(view, turnId, '计划已受理', [], speakerName)
  if (!evidence)
    return []
  const { planId, planRevision, acceptanceHash, binding } = evidence
  return draft.split(/[，,。.!！?？;；\n]+/u).map(clause => clause.trim()).filter(clause => workPlanAbsenceClause(clause, speakerName, evidence.planLabels)).map(quote => ({ quote, evidence: { planId, planRevision, acceptanceHash, binding } }))
}
