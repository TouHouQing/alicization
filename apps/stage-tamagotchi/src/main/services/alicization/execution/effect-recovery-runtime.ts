import type { LifeEffect } from '../../../../shared/life-contracts'
import type { AlicizationDbService } from '../db'
import type { ExecutionResourceBroker } from './resource-broker'

import { randomUUID } from 'node:crypto'

import { verifyLifeFileProof } from '../life-goal-verifier'
import { executionDigest } from './acceptance-compiler'
import { reconcileExecutionEffect } from './effect-reconciler'
import { executionRecoveryResources } from './uncertain-resource-fence'

/** Read reality, commit the result, then release the exact effect's quarantine. */
export async function recoverExecutionEffect(options: {
  database: AlicizationDbService
  broker: ExecutionResourceBroker
  effect: LifeEffect
  writerStopped: (effect: LifeEffect) => boolean | Promise<boolean>
  observe?: Parameters<typeof reconcileExecutionEffect>[1]['observe']
}) {
  const { database, effect, broker } = options
  const view = await database.readLifeState()
  if (effect.status !== 'uncertain' || !await options.writerStopped(effect))
    return null
  if ((effect.receipt?.output as Record<string, unknown> | undefined)?.executionStopped === false)
    return null
  const { resources, originalTargetMatches } = await executionRecoveryResources(view.cardId, effect)
  if (!originalTargetMatches)
    return null
  let lease: ReturnType<ExecutionResourceBroker['beginReconciliation']>
  try { lease = broker.beginReconciliation(effect.id, resources, view.cardId) }
  catch (error) {
    // Continue must retain an unknown result while another writer owns its
    // resources. It must neither displace that owner nor repeat the action.
    if (error instanceof Error && 'code' in error && error.code === 'EXECUTION_RESOURCE_BUSY')
      return null
    throw error
  }
  let resolved = false
  try {
    const before = await database.getLifeEffect(effect.id)
    if (before?.status !== 'uncertain' || before.generation !== effect.generation || executionDigest(before.payload) !== executionDigest(effect.payload) || executionDigest(before.receipt) !== executionDigest(effect.receipt))
      return null
    const expectedSnapshot = { generation: before.generation, payloadHash: executionDigest(before.payload), receiptHash: executionDigest(before.receipt) }
    const result = await reconcileExecutionEffect(before, { writerStopped: await options.writerStopped(before), verifyFile: verifyLifeFileProof, observe: options.observe })
    if (result.verdict === 'unknown' || (result.verdict === 'applied' && !result.output))
      return null
    lease.assert()
    if (!await options.writerStopped(before) || (await database.readLifeState()).cardId !== view.cardId)
      throw new Error('Effect recovery lost its stopped writer or card fence')
    const observedAt = Date.now()
    const id = `reconciliation:${effect.id}:${randomUUID()}`
    const outcome = result.verdict === 'applied' ? 'success' : 'not-applied'
    const receipt = { outcome, output: result.output ?? { ok: false, effectMayHaveOccurred: false }, observedAt, reconciliation: { ...result, observationId: id, originalReceiptHash: executionDigest(before.receipt) } }
    // One transaction prevents a crash from leaving a settled effect without its
    // independent observation. Original action observations remain immutable.
    await database.commitLifeState({ cardId: view.cardId, operationKey: id, changes: [], mutations: [
      { type: 'ingress-accept', ingress: { id, kind: 'tool-result', source: 'execution-reconciliation', sourceKey: effect.id, occurredAt: observedAt, payload: receipt } },
      { type: 'ingress-settle', id, status: 'settled' },
      { type: 'effect-transition', id: effect.id, expected: 'uncertain', expectedSnapshot, status: result.verdict === 'applied' ? 'settled' : 'failed', receipt },
    ] })
    resolved = true
    return { ...result, observationId: id }
  }
  finally { lease.finish(resolved) }
}
