import type { AlicizationTaskThreadRecord } from '../../../../shared/eventa'
import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'

import { projectLifeTaskOutcome } from '../life-task-outcome'

/** The existing quiet-delivery queue receives committed, scope-qualified results. */
export async function recordWorkResult(database: AlicizationDbService, plan: WorkPlan) {
  const view = await database.readLifeState({ executionPlanId: plan.id })
  const goal = view.obligations.find(item => item.id === plan.rootObligationId)
  const thread = await database.getTaskThread(plan.rootThreadId)
  if (!goal || !thread || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || thread.status !== 'completed' || !goal.verification)
    return null
  const outcome = projectLifeTaskOutcome(view, thread.id)
  const summary = goal.status === 'fulfilled'
    ? goal.verification.independent ? '交付结果已按约定核对。' : '已收到你对这份交付结果的验收确认。'
    : '操作已结束，交付结果还需要检查或补充确认。'
  const delivered: AlicizationTaskThreadRecord = { ...thread, summary, metadata: { ...thread.metadata, lifeGoalOutcome: outcome } }
  await database.appendExecutionEvents([{
    id: `work-result:${plan.id}:${plan.revision}:${goal.verification.id}`,
    threadId: thread.id,
    attemptId: thread.attemptId,
    turnId: thread.turnId,
    sessionId: thread.sessionId,
    kind: 'result',
    threadStatus: thread.status,
    createdAt: goal.verification.verifiedAt,
    payload: { summary, planId: plan.id, planRevision: plan.revision, goalVerification: outcome, source: 'committed-work-result' },
  }])
  return delivered
}
