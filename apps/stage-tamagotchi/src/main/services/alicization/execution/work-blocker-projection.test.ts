import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { expect, it } from 'vitest'

import { executionWorkBlocker } from '../../../../shared/execution-work-blocker'

function fixture() {
  const plan = { id: 'plan', cardId: 'alice', rootObligationId: 'goal', rootThreadId: 'thread', obligationGeneration: 1, revision: 2, acceptanceHash: 'current-contract', steps: [{ id: 'menu', capabilityId: 'tool.desktop_click_element', inputHash: 'current-input' }] } as WorkPlan
  const view = { cardId: 'alice', obligations: [{ id: 'goal', cardId: 'alice', threadId: 'thread', generation: 1, status: 'blocked', proof: { acceptance: { contractHash: 'current-contract' } } }], execution: { plans: [plan], results: [{ planId: 'plan', planRevision: 2, stepId: 'menu', inputHash: 'current-input', effectId: 'effect', attemptId: 'attempt', state: 'blocked' }], slices: [{ planId: 'plan', planRevision: 2, attemptId: 'attempt', ingressId: 'task-run:current' }] }, effects: [{ id: 'effect', kind: 'execute', actionId: 'menu', turnId: 'task-run:current', status: 'settled', payload: { capabilityId: 'tool.desktop_click_element' }, receipt: { outcome: 'failure', output: { ok: false, channel: 'desktop', operation: 'desktop_click_element', errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: false, sideEffectState: 'none' } } }] } as unknown as LifeStateView
  return { view, plan, output: view.effects[0].receipt!.output as Record<string, unknown> }
}

it.each(['foreground-required', 'window-changed', 'observation-required', 'result-unknown'])('projects the committed %s state without changing its receipt or plan', (reason) => {
  const { view, plan, output } = fixture()
  if (reason === 'window-changed')
    output.errorCode = 'WINDOWS_UIA_WINDOW_CONTEXT_CHANGED'
  if (reason === 'observation-required') {
    output.errorCode = 'WINDOWS_UIA_OBSERVATION_REQUIRED'
    delete output.effectMayHaveOccurred
  }
  if (reason === 'result-unknown') {
    view.execution!.results[0].state = 'awaiting-verification'
    view.effects[0].status = 'uncertain'
    output.effectMayHaveOccurred = true
    output.sideEffectState = 'unknown'
  }
  const before = JSON.stringify(view)
  expect(executionWorkBlocker(view, plan)).toEqual({ reason, stepId: 'menu', effectId: 'effect', canResume: false })
  expect(JSON.stringify(view)).toBe(before)
})

it.each(['card', 'generation', 'contract', 'terminal', 'withdrawn', 'revision', 'input', 'attempt', 'effect', 'action', 'ingress', 'capability', 'missing-effect', 'uncertain', 'possible-effect', 'success', 'other-channel', 'other-operation', 'no-foreground-proof'])('does not present a current safe retry from a mismatched %s', (fault) => {
  const { view, plan, output } = fixture()
  const result = view.execution!.results[0]
  if (fault === 'card')
    view.cardId = 'bob'
  if (fault === 'generation')
    view.obligations[0].generation++
  if (fault === 'contract')
    plan.acceptanceHash = 'different-contract'
  if (fault === 'terminal')
    view.obligations[0].status = 'fulfilled'
  if (fault === 'withdrawn')
    view.obligations[0].invalidatedBy = { kind: 'goals', id: 'source', version: '1', cardId: 'alice' }
  if (fault === 'revision')
    result.planRevision--
  if (fault === 'input')
    result.inputHash = 'other-input'
  if (fault === 'attempt')
    result.attemptId = 'other-attempt'
  if (fault === 'effect')
    result.effectId = 'other-effect'
  if (fault === 'action')
    view.effects[0].actionId = 'other-action'
  if (fault === 'ingress')
    view.effects[0].turnId = 'other-turn'
  if (fault === 'capability')
    view.effects[0].payload.capabilityId = 'tool.browser_click_element'
  if (fault === 'missing-effect')
    view.effects = []
  if (fault === 'uncertain')
    view.effects[0].status = 'uncertain'
  if (fault === 'possible-effect')
    output.effectMayHaveOccurred = true
  if (fault === 'success')
    output.ok = true
  if (fault === 'other-channel')
    output.channel = 'browser'
  if (fault === 'other-operation')
    output.operation = 'desktop_type_text'
  if (fault === 'no-foreground-proof')
    delete output.requiresForeground
  expect(executionWorkBlocker(view, plan)).toBeNull()
})
