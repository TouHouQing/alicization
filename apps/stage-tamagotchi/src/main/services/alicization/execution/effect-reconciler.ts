import type { LifeEffect, LifeGoalVerification } from '../../../../shared/life-contracts'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

const receiptObject = v.pipe(
  v.custom<Record<string, unknown>>(value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype),
  v.record(v.string(), v.unknown()),
)
const reconciliationSchema = v.pipe(receiptObject, v.strictObject({
  verdict: v.picklist(['applied', 'not-applied', 'unknown']),
  independent: v.literal(true),
  effectId: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
  evidence: receiptObject,
  output: v.optional(receiptObject),
}))

export interface EffectReconciliation {
  verdict: 'applied' | 'not-applied' | 'unknown'
  independent: boolean
  effectId: string
  evidence: Record<string, unknown>
  output?: Record<string, unknown>
}

/** An independent observation cannot certify two incompatible action states. */
export function executionReconciliationOutputContradicts(verdict: EffectReconciliation['verdict'], output?: Record<string, unknown>) {
  if (verdict === 'unknown')
    return false
  return output?.executionStopped === false || (verdict === 'applied'
    ? output?.ok === false || output?.effectMayHaveOccurred === false
    : output?.ok === true || output?.effectMayHaveOccurred === true)
}

/**
 * A missing receipt is never permission to repeat a mutation. Adapter readers
 * must inspect the environment and cannot invoke the original action.
 */
export async function reconcileExecutionEffect(effect: LifeEffect, ports: {
  writerStopped: boolean
  verifyFile: (proof: { path: string, contentHash: string }) => Promise<LifeGoalVerification>
  observe?: Partial<Record<'cli' | 'coding-agent' | 'browser' | 'desktop' | 'external', (effect: LifeEffect) => Promise<EffectReconciliation>>>
}): Promise<EffectReconciliation> {
  const unknown = (reason: string): EffectReconciliation => ({ verdict: 'unknown', independent: true, effectId: effect.id, evidence: { reason } })
  if (effect.status !== 'uncertain')
    return unknown('effect-is-not-awaiting-reconciliation')
  if (!ports.writerStopped)
    return unknown('old-writer-not-confirmed-stopped')
  const capability = String(effect.payload.capabilityId ?? '')
  const parameters = effect.payload.parameters && typeof effect.payload.parameters === 'object' ? effect.payload.parameters as Record<string, unknown> : {}
  const contract = effect.payload.effectContract as { sideEffect?: string, retryClass?: string } | undefined
  if (contract?.sideEffect === 'read' && contract.retryClass === 'read-only')
    return { verdict: 'not-applied', independent: true, effectId: effect.id, evidence: { scope: 'no-consequential-effect', reason: 'read-only-writer-confirmed-stopped' } }
  if (capability.endsWith('filesystem_write_file') && typeof parameters.path === 'string' && typeof parameters.content === 'string') {
    const result = await ports.verifyFile({ path: parameters.path, contentHash: createHash('sha256').update(parameters.content).digest('hex') })
    return result.verdict === 'satisfied' && result.independent
      ? { verdict: 'applied', independent: true, effectId: effect.id, evidence: { ...result.evidence, scope: 'current-file-bytes-only', verificationId: result.id }, output: { ok: true, operation: 'write_file', path: parameters.path, contentHash: result.evidence.actualHash, bytes: result.evidence.bytes, recovered: true, proofScope: 'current-file-bytes-only' } }
      : unknown('file-state-does-not-prove-whether-the-original-write-occurred')
  }
  const channel = capability.includes('browser') ? 'browser' : capability.includes('desktop') ? 'desktop' : capability.includes('cli') ? 'cli' : capability.includes('coding_agent') || capability.includes('codex') || capability.includes('claude') ? 'coding-agent' : 'external'
  const reader = ports.observe?.[channel]
  if (!reader)
    return unknown(`${channel}-independent-receipt-reader-unavailable`)
  // Readers receive an observation snapshot, not the mutable ledger object.
  let result: EffectReconciliation
  try { result = await reader(structuredClone(effect)) }
  catch { return unknown('independent-receipt-observation-failed') }
  if (!result || result.effectId !== effect.id || result.independent !== true)
    return unknown('reconciliation-reader-returned-an-unbound-or-self-reported-result')
  let snapshot: unknown
  try {
    snapshot = structuredClone(result)
  }
  catch { return unknown('reconciliation-reader-returned-unserializable-evidence') }
  const parsed = v.safeParse(reconciliationSchema, snapshot)
  if (!parsed.success)
    return unknown('reconciliation-reader-returned-invalid-evidence')
  if (executionReconciliationOutputContradicts(parsed.output.verdict, parsed.output.output))
    return unknown('reconciliation-reader-returned-contradictory-action-state')
  return parsed.output
}
