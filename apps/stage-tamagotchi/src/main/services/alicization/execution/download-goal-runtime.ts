import type { WorkPlan } from '../../../../shared/execution-contracts'
import type { AlicizationDbService } from '../db'

import { verifyLifeTaskCompletion } from '../life-task-verification-runtime'
import { executionDigest } from './acceptance-compiler'
import { recordWorkResult } from './work-result-delivery'

/** Native transfer events may wake verification; they can never replay input. */
export async function recheckDownloadGoals(database: AlicizationDbService, cardId: string, isWritingPlan: (id: string) => boolean = () => false) {
  const initial = await database.readLifeState()
  if (initial.cardId !== cardId)
    throw new Error('Download verification crossed its active card owner')
  const delivered: Array<{ plan: WorkPlan, thread: NonNullable<Awaited<ReturnType<typeof recordWorkResult>>> }> = []
  for (const current of initial.obligations) {
    if (current.invalidatedBy || !current.threadId || current.status !== 'blocked' || current.verification?.verdict !== 'unknown' || current.revision !== current.verification.evidence.verifiedObligationRevision || !current.proof.acceptance?.criteria.some(item => item.predicate.kind === 'browser-download'))
      continue
    const view = await database.readLifeState()
    const goal = view.obligations.find(item => item.id === current.id)
    if (view.cardId !== cardId || !goal || goal.revision !== current.revision || goal.generation !== current.generation || goal.invalidatedBy)
      continue
    const plan = view.execution?.plans.find(item => item.rootObligationId === goal.id && item.obligationGeneration === goal.generation && item.acceptanceHash === goal.proof.acceptance?.contractHash)
    const thread = await database.getTaskThread(current.threadId)
    if (!plan || isWritingPlan(plan.id) || thread?.status !== 'completed')
      continue
    const results = plan.steps.map(step => view.execution?.results.find(item => item.planId === plan.id && item.planRevision === plan.revision && item.stepId === step.id && item.inputHash === step.inputHash && item.state === 'verified'))
    if (results.some(result => !result))
      continue
    const terminalHashes: string[] = []
    for (const result of results) {
      if (!result?.effectId)
        continue
      const effect = await database.getLifeEffect(result.effectId)
      const output = effect?.receipt?.output as Record<string, unknown> | undefined
      if (typeof output?.downloadReservationId !== 'string')
        continue
      const terminal = await database.getLifeIngress(`browser-download-result:${output.downloadReservationId}`)
      if (terminal?.source === 'browser-download-result' && terminal.status === 'settled')
        terminalHashes.push(terminal.payloadHash)
    }
    if (!terminalHashes.length)
      continue
    const id = `download-goal-check:${executionDigest({ cardId, planId: plan.id, revision: plan.revision, contractHash: plan.acceptanceHash, terminalHashes })}`
    if (await database.getLifeIngress(id))
      continue
    await database.commitLifeState({ cardId, operationKey: `${id}:begin`, changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' }] })
    const verification = await verifyLifeTaskCompletion({ cardId, threadId: thread.id, read: database.readLifeState, commit: database.commitLifeState, readSetting: database.getMetaValue, database })
    if (!verification)
      continue
    await database.commitLifeState({ cardId, operationKey: id, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id, kind: 'tool-result', source: 'download-goal-check', sourceKey: id, occurredAt: Date.now(), payload: { planId: plan.id, revision: plan.revision, verificationId: verification.id, terminalHashes, scope: 'verification-only-no-execution' } } },
      { type: 'ingress-settle', id, status: 'settled' },
    ] })
    const result = await recordWorkResult(database, plan)
    if (result)
      delivered.push({ plan, thread: result })
  }
  return delivered
}
