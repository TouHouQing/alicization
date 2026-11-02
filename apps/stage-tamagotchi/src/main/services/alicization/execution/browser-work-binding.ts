import type { BrowserWorkBinding, ExecutionStateView, WorkPlan, WorkStep } from '../../../../shared/execution-contracts'

import { executionDigest } from './acceptance-compiler'
import { workInputHash } from './work-input-bindings'

export function pendingBrowserWork(plan: WorkPlan, results: ExecutionStateView['results']) {
  return plan.steps.some(step => step.capabilityId.startsWith('tool.browser_') && !results.some(result => result.planId === plan.id && result.planRevision === plan.revision && result.stepId === step.id && result.inputHash === step.inputHash && result.state === 'verified'))
}

/** Preserve observed effects; refresh only future opaque control references. */
export function reobserveBrowserWork(plan: WorkPlan, results: ExecutionStateView['results'], binding: BrowserWorkBinding, sourceId: string): WorkPlan {
  const current = results.filter(result => result.planId === plan.id && result.planRevision === plan.revision)
  if (current.some(result => ['running', 'awaiting-verification'].includes(result.state)))
    throw new Error('Reconcile unfinished browser operations before reconnecting this work')
  const verified = new Set(current.filter(result => result.state === 'verified' && plan.steps.some(step => step.id === result.stepId && step.inputHash === result.inputHash)).map(result => result.stepId))
  const steps: WorkStep[] = []
  for (const original of plan.steps) {
    let step = original
    if (!verified.has(step.id) && ['tool.browser_click_element', 'tool.browser_type_text', 'tool.browser_upload_files'].includes(step.capabilityId)) {
      const selector = step.inputBindings?.find(input => input.parameter === 'selector')
      if (!selector)
        throw new Error('This browser action needs an observation binding before it can reconnect')
      if (verified.has(selector.stepId)) {
        const id = `reobserve:${plan.revision + 1}:${executionDigest(step.id).slice(0, 16)}`
        const fresh: WorkStep = { id, capabilityId: 'tool.browser_read_page', input: { format: 'interactables', maxChars: 24000 }, inputHash: '', dependsOn: [...step.dependsOn], resourceIds: [], acceptanceCriterionIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }
        fresh.inputHash = workInputHash(fresh)
        steps.push(fresh)
        step = { ...step, dependsOn: [...new Set([...step.dependsOn, id])], inputBindings: step.inputBindings!.map(input => input.parameter === 'selector' ? { ...input, stepId: id } : input) }
        step = { ...step, inputHash: workInputHash(step) }
      }
    }
    steps.push(step)
  }
  if (steps.length > 256 || plan.sourceEvidenceRefs.length >= 64)
    throw new Error('Browser reconnection exceeds the accepted work history budget')
  return { ...plan, revision: plan.revision + 1, steps, browserBinding: binding, sourceEvidenceRefs: [...plan.sourceEvidenceRefs, sourceId] }
}
