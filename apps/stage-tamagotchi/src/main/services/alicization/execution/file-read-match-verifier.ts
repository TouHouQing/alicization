import type { ExecutionPredicate, TaskAcceptance, WorkPlan } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification, LifeIngress, LifeStateView } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'

import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'

import { verifyLifeFileProof } from '../life-goal-verifier'

async function originMatchesContract(database: AlicizationDbService, origin: LifeIngress, plan: WorkPlan, contract: TaskAcceptance) {
  let hash = contract.contractHash
  let generation = contract.obligationGeneration
  const matches = () => origin.payload.acceptanceHash === hash && origin.payload.obligationGeneration === generation
  if (matches())
    return true
  if (plan.sourceEvidenceRefs.length > 64)
    return false
  const sources = await Promise.all(plan.sourceEvidenceRefs.map(id => database.getLifeIngress(id)))
  // Explicit host requirement changes carry verified steps forward. Walk only
  // their settled main-owned lineage, never a model-provided predecessor hash.
  for (let index = 0; index < 64; index++) {
    const changes = sources.filter(item => item?.kind === 'feedback' && item.source === 'execution-criteria-change' && item.status === 'settled' && item.payload.planId === plan.id && item.payload.rootObligationId === plan.rootObligationId && item.payload.contractHash === hash && item.payload.generation === generation)
    if (changes.length !== 1)
      return false
    const previous = changes[0]!.payload
    if (typeof previous.previousContractHash !== 'string' || !/^[a-f\d]{64}$/u.test(previous.previousContractHash) || typeof previous.previousGeneration !== 'number' || !Number.isSafeInteger(previous.previousGeneration) || previous.previousGeneration < 1 || previous.previousGeneration >= generation)
      return false
    hash = previous.previousContractHash
    generation = previous.previousGeneration
    if (matches())
      return true
  }
  return false
}

/** Compare current target bytes with an actual complete authorized read snapshot. */
export async function verifyExecutionFileReadMatch(input: {
  database: AlicizationDbService
  view: LifeStateView
  contract: TaskAcceptance
  predicate: Extract<ExecutionPredicate, { kind: 'file-matches-read' }>
}): Promise<LifeGoalVerification> {
  const { database, view, contract, predicate } = input
  const base = { id: randomUUID(), kind: 'file' as const, independent: true, verifiedAt: Date.now() }
  const unknown = (reason: string): LifeGoalVerification => ({ ...base, verdict: 'unknown', evidence: { reason, scope: 'observed-source-bytes' } })
  const goal = view.obligations.find(item => item.id === contract.rootObligationId)
  const plans = view.execution?.plans.filter(item => item.rootObligationId === contract.rootObligationId && item.acceptanceHash === contract.contractHash) ?? []
  const plan = plans.length === 1 ? plans[0] : undefined
  const step = plan?.steps.find(item => item.id === predicate.stepId)
  const result = view.execution?.results.find(item => item.planId === plan?.id && item.planRevision === plan?.revision && item.stepId === step?.id && item.inputHash === step?.inputHash && item.state === 'verified')
  if (view.cardId !== contract.cardId || goal?.invalidatedBy || goal?.generation !== contract.obligationGeneration || !plan || plan.obligationGeneration !== contract.obligationGeneration || step?.capabilityId !== 'tool.filesystem_read_file' || !result?.effectId)
    return unknown('source-read-not-current-and-verified')
  const effect = await database.getLifeEffect(result.effectId)
  const origin = effect?.turnId ? await database.getLifeIngress(effect.turnId) : null
  const policy = effect?.payload.effectContract as { sideEffect?: string, retryClass?: string } | undefined
  const output = effect?.receipt?.output as Record<string, unknown> | undefined
  if (effect?.status !== 'settled' || effect.receipt?.outcome !== 'success' || effect.actionId !== step.id || effect.payload.capabilityId !== step.capabilityId || policy?.sideEffect !== 'read' || policy.retryClass !== 'read-only'
    || origin?.kind !== 'task-run' || origin.source !== 'work-plan-scheduler' || origin.status !== 'settled' || origin.payload.planId !== plan.id || origin.payload.rootObligationId !== goal?.id || origin.payload.attemptId !== result.attemptId
    || !output || output.ok !== true || output.isError === true || output.recovered === true) {
    return unknown('source-read-receipt-not-bound-to-accepted-work')
  }
  if (!await originMatchesContract(database, origin, plan, contract))
    return unknown('source-read-contract-lineage-unavailable')
  const metadata = output.structuredContent as Record<string, unknown> | undefined
  const blocks = output.content
  if (!metadata || metadata.readVerified !== true || typeof metadata.path !== 'string' || !isAbsolute(metadata.path) || typeof metadata.contentHash !== 'string' || !/^[a-f\d]{64}$/u.test(metadata.contentHash)
    || typeof metadata.device !== 'string' || !/^\d{1,32}$/u.test(metadata.device) || typeof metadata.inode !== 'string' || !/^\d{1,32}$/u.test(metadata.inode)
    || typeof metadata.byteLength !== 'number' || !Number.isSafeInteger(metadata.byteLength) || metadata.byteLength < 0 || metadata.byteLength > 2_097_152 || !Array.isArray(blocks) || blocks.length !== 1 || blocks[0]?.type !== 'text' || typeof blocks[0]?.text !== 'string' || blocks[0].text.length > 2_097_152) {
    return unknown('source-read-lacks-complete-byte-evidence')
  }
  const bytes = Buffer.from(blocks[0].text, 'utf8')
  if (bytes.toString('utf8') !== blocks[0].text || bytes.length !== metadata.byteLength || createHash('sha256').update(bytes).digest('hex') !== metadata.contentHash)
    return unknown('source-read-byte-evidence-inconsistent')
  const actual = await verifyLifeFileProof({ path: predicate.path, contentHash: metadata.contentHash })
  if (actual.evidence.device === metadata.device && actual.evidence.inode === metadata.inode)
    return unknown('source-and-target-are-the-same-file')
  return { ...actual, evidence: { ...actual.evidence, planId: plan.id, planRevision: plan.revision, stepId: step.id, sourceEffectId: effect.id, sourcePath: metadata.path, sourceBytes: metadata.byteLength, scope: 'observed-source-bytes' } }
}
