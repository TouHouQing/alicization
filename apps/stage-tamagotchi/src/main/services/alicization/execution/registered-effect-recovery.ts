import type { LifeEffect } from '../../../../shared/life-contracts'
import type { EffectReconciliation } from './effect-reconciler'
import type { ExecutionVerificationContext } from './verification-recipes'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { executionReconciliationOutputContradicts } from './effect-reconciler'
import { executionVerificationRegistryKey, readExecutionVerificationRegistry, readSignedExecutionReceipt } from './verification-recipes'
import { assertExecutionJson } from './work-plan-schema'

export type ExecutionRecoveryChannel = 'cli' | 'coding-agent' | 'browser' | 'desktop' | 'external'
export const externalEffectReceiptDomain = 'alicization.execution.effect-receipt.v1'
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const timestamp = v.pipe(v.number(), v.integer(), v.minValue(0))
const payloadSchema = v.strictObject({
  domain: v.literal(externalEffectReceiptDomain),
  receiptId: id,
  cardId: id,
  channel: v.picklist(['cli', 'coding-agent', 'browser', 'desktop', 'external']),
  effectId: id,
  effectHash: v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u)),
  verdict: v.picklist(['applied', 'not-applied', 'unknown']),
  observedAt: timestamp,
  expiresAt: timestamp,
  output: v.pipe(v.record(v.string(), v.unknown()), v.check((value) => {
    assertExecutionJson(value)
    return true
  })),
})

export function executionEffectIdentityHash(effect: LifeEffect) {
  return executionDigest({ id: effect.id, operationKey: effect.operationKey, kind: effect.kind, turnId: effect.turnId, actionId: effect.actionId, generation: effect.generation, payload: effect.payload })
}

/** No executor/submit port exists here: recovery only reads signed service state. */
export function createRegisteredEffectRecovery(options: {
  readSetting: ExecutionVerificationContext['readSetting']
  cardId: () => string
  now?: () => number
}) {
  return async (channel: ExecutionRecoveryChannel, effect: LifeEffect): Promise<EffectReconciliation> => {
    const unknown = (reason: string): EffectReconciliation => ({ effectId: effect.id, verdict: 'unknown', independent: true, evidence: { reason } })
    if (effect.status !== 'uncertain' || effect.kind !== 'execute')
      return unknown('effect-is-not-awaiting-reconciliation')
    try {
      const cardId = options.cardId()
      const { raw, registry } = await readExecutionVerificationRegistry(options.readSetting)
      const recipes = registry.reconciliation.filter(item => item.channel === channel && item.capabilityIds.includes(String(effect.payload.capabilityId)))
      if (recipes.length !== 1)
        return unknown('effect-receipt-recipe-unavailable-or-ambiguous')
      const actual = await readSignedExecutionReceipt(recipes[0])
      const payload = v.parse(payloadSchema, actual.payload)
      if (payload.cardId !== cardId || payload.channel !== channel || payload.effectId !== effect.id || payload.effectHash !== executionEffectIdentityHash(effect))
        return unknown('effect-receipt-binding-mismatch')
      const now = (options.now ?? Date.now)()
      if (payload.observedAt > now || payload.expiresAt <= now || payload.expiresAt <= payload.observedAt || payload.expiresAt - payload.observedAt > 86_400_000)
        return unknown('effect-receipt-expired-or-invalid-time')
      if ((payload.verdict === 'applied' && payload.output.ok !== true) || executionReconciliationOutputContradicts(payload.verdict, payload.output))
        return unknown('effect-receipt-output-contradicts-verdict')
      if (options.cardId() !== cardId || await options.readSetting(executionVerificationRegistryKey) !== raw)
        return unknown('effect-receipt-authority-changed')
      return {
        effectId: effect.id,
        verdict: payload.verdict,
        independent: true,
        evidence: { scope: 'signed-external-state', recipeId: recipes[0].id, recipeVersion: recipes[0].version, receiptId: payload.receiptId, receiptHash: actual.receiptHash, effectHash: payload.effectHash, observedAt: payload.observedAt, expiresAt: payload.expiresAt },
        ...(payload.verdict === 'applied' ? { output: { ...payload.output, recovered: true, proofScope: 'signed-external-state' } } : {}),
      }
    }
    catch { return unknown('independent-effect-receipt-unavailable-or-invalid') }
  }
}
