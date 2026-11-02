import type { AlicizationActivityPresence } from '@proj-alicization/stage-shared'

import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { LifeStateView } from '../../../../shared/life-contracts'
import type { executionGazeTarget } from './execution-gaze'

import { isActionAwaitingHost } from './action-approval-presence'
import { workPauseMarkers } from './work-stop-control'

export function deriveExecutionAttention(view: LifeStateView, thread: AlicizationTaskThreadRecord, resolveTarget?: (effect: LifeStateView['effects'][number]) => ReturnType<typeof executionGazeTarget>): AlicizationActivityPresence['work'] | null {
  const plan = view.execution?.plans.find(item => item.rootThreadId === thread.id)
  const goal = view.obligations.find(item => item.threadId === thread.id)
  if (!plan || !goal || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || ['cancelled', 'superseded'].includes(goal.status))
    return null
  const now = Date.now()
  const planner = goal.status === 'blocked' && !workPauseMarkers(view, plan).length
    ? view.ingress.find(item => item.source === 'work-read-repair' && item.status === 'processing' && item.payload.planId === plan.id && item.payload.planRevision === plan.revision && now - item.occurredAt >= 0 && now - item.occurredAt < 90000)
    : undefined
  if (planner)
    return { mode: 'comparing' as const, causeId: planner.id, source: 'work-step-ledger' as const }
  const slice = view.execution?.slices.find(item => item.planId === plan.id && item.planRevision === plan.revision)
  if (!slice)
    return null
  const result = view.execution?.results.find(item => item.planId === plan.id && item.planRevision === plan.revision && item.attemptId === slice.attemptId)
  const step = plan.steps.find(item => item.id === result?.stepId)
  const effect = result?.effectId ? view.effects.find(item => item.id === result.effectId) : view.effects.find(item => item.turnId === slice.ingressId && item.actionId === step?.id)
  let mode: NonNullable<AlicizationActivityPresence['work']>['mode'] = 'waiting'
  if (goal.status === 'verifying')
    mode = 'checking'
  else if (slice.state === 'running' && result?.state === 'running' && step && effect?.status === 'dispatched' && !isActionAwaitingHost(view.cardId, effect.id))
    mode = /read|list|search|inspect|locate/u.test(step.capabilityId) ? 'reading' : 'acting'
  const channel = step?.capabilityId.includes('browser') ? 'browser' : step?.capabilityId.includes('desktop') ? 'desktop' : null
  const observation = channel && slice.state === 'running' && !/open_url|navigate/u.test(step!.capabilityId)
    ? view.effects.filter(item => item.turnId === slice.ingressId && (channel === 'browser' ? item.payload.capabilityId === 'tool.browser_read_page' : ['tool.desktop_list_interactables', 'tool.desktop_locate_window'].includes(String(item.payload.capabilityId))) && item.status === 'settled').sort((a, b) => Number(b.receipt?.observedAt) - Number(a.receipt?.observedAt))[0]
    : undefined
  const target = observation && resolveTarget?.(observation)
  return { mode, causeId: effect?.id ?? `work-step:${plan.id}:${plan.revision}:${step?.id ?? slice.id}`, source: effect ? 'execution-effect' as const : 'work-step-ledger' as const, ...(target ? { target } : {}) }
}

export function executionPresenceScenario(thread: AlicizationTaskThreadRecord) {
  if (['codebase-edit', 'codebase-investigation'].includes(thread.kind))
    return 'coding' as const
  return 'general' as const
}
