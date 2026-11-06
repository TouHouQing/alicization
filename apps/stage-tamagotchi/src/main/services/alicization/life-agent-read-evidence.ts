import type { LifeEffect, LifeStateView } from '../../../shared/life-contracts'

import { completedLifeExecutionStep } from './life-dialogue-claim'

/** Actual adapter snapshots/compute results; never independent business proof. */
export function lifeAgentReadEvidence(effect: LifeEffect, view: LifeStateView) {
  if (!completedLifeExecutionStep(effect) || !effect.payload.effectContract || (effect.payload.effectContract as { sideEffect?: string }).sideEffect !== 'read')
    return null
  const output = effect.receipt!.output as Record<string, unknown>
  let value: unknown
  let scope: string
  if (effect.payload.capabilityId === 'tool.life_language_query' && output.type === 'life-language-query' && output.nativeProcessTreeStopped === true && typeof output.sourceHash === 'string' && /^[a-f\d]{64}$/u.test(output.sourceHash)) {
    value = { operation: output.operation, sourceHash: output.sourceHash, filePath: output.filePath, result: output.result }
    scope = 'language-server-document-snapshot'
  }
  else if ((effect.payload.capabilityId === 'tool.life_programmatic_read' && output.type === 'life-programmatic-read') || (String(effect.payload.capabilityId).startsWith('extension.') && output.type === 'life-extension-result')) {
    const references = output.effectRefs ?? output.readEffectRefs
    if (!Array.isArray(references) || references.length > 32 || new Set(references).size !== references.length || references.some(id => typeof id !== 'string' || !view.effects.some(child => child.id === id && child.turnId === effect.turnId && child.kind === 'execute' && child.id.startsWith(`${effect.id}:read:`) && child.status === 'settled' && child.receipt?.outcome === 'success' && child.payload.effectContract && (child.payload.effectContract as { sideEffect?: string }).sideEffect === 'read')))
      return null
    if (output.type === 'life-programmatic-read' && output.calls !== references.length)
      return null
    value = { result: output.result, readEffectRefs: references }
    scope = 'isolated-program-return-and-actual-read-sources'
  }
  else { return null }
  const encoded = JSON.stringify(value)
  return { returnedValue: encoded.slice(0, 4000), excerptTruncated: encoded.length > 4000, evidenceScope: scope, independentGoalProof: false }
}
